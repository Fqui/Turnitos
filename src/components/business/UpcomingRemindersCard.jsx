import React, { useState, useMemo } from 'react';
import serviceAdapter from '../../services/serviceAdapter';
import { useNotification } from '../../contexts/NotificationContext';

export default function UpcomingRemindersCard({
    bookings = [],
    currentBusiness,
    onBookingUpdated,
    isMobile = false
}) {
    const { showToast } = useNotification();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'deposits' | 'events'

    // Separate and filter reminders
    const { depositReminders, eventReminders, totalReminders } = useMemo(() => {
        if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
            return { depositReminders: [], eventReminders: [], totalReminders: [] };
        }

        const now = new Date();
        const nowTime = now.getTime();

        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        const dayAfter = new Date(now);
        dayAfter.setDate(dayAfter.getDate() + 2);
        const dayAfterStr = `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, '0')}-${String(dayAfter.getDate()).padStart(2, '0')}`;

        const deposits = [];
        const events = [];

        bookings.forEach(b => {
            if (!b || b.status === 'cancelled' || b.status === 'blocked' || b.is_blocked) return;

            const bDate = b.date ? String(b.date).substring(0, 10) : '';
            const reminderSent = b.metadata?.reminder_sent_at || b.reminder_sent_at || b.metadata?.reminderSent;

            // 1. RECLAMO DE SEÑA: Reserva Pendiente creada hace más de 1 hora
            if (b.status === 'pending') {
                const createdAtTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                const hoursElapsed = createdAtTime > 0 ? (nowTime - createdAtTime) / (1000 * 60 * 60) : 2;

                // If created more than 1 hour ago (or no created_at timestamp available) and reminder not sent recently
                if (hoursElapsed >= 1 && !reminderSent) {
                    const totalPrice = Number(b.price || b.total_price || b.totalPrice || 0);
                    const depositReq = Number(b.deposit_amount || b.depositAmount || b.metadata?.deposit_amount || b.metadata?.depositAmount || Math.round(totalPrice * 0.3));
                    
                    deposits.push({
                        ...b,
                        type: 'deposit_pending',
                        hoursElapsed: Math.round(hoursElapsed),
                        depositReq,
                        totalPrice
                    });
                }
                return;
            }

            // 2. RECORDATORIO DE EVENTO: Reserva Confirmada / Señada para Hoy, Mañana o en 48hs
            const isUpcoming = bDate === todayStr || bDate === tomorrowStr || bDate === dayAfterStr;
            if (isUpcoming && !reminderSent) {
                let urgencyLabel = 'Próximo';
                let urgencyColor = '#3B82F6';
                if (bDate === todayStr) {
                    urgencyLabel = '🚨 HOY';
                    urgencyColor = '#EF4444';
                } else if (bDate === tomorrowStr) {
                    urgencyLabel = '⚡ MAÑANA';
                    urgencyColor = '#F59E0B';
                } else if (bDate === dayAfterStr) {
                    urgencyLabel = '📅 En 2 Días';
                    urgencyColor = '#84CC16';
                }

                const totalPrice = Number(b.price || b.total_price || b.totalPrice || 0);
                const depositPaid = Number(b.deposit_amount || b.depositAmount || b.metadata?.deposit_amount || b.metadata?.depositAmount || 0);
                const remainingBalance = Math.max(0, totalPrice - depositPaid);

                events.push({
                    ...b,
                    type: 'event_upcoming',
                    urgencyLabel,
                    urgencyColor,
                    remainingBalance,
                    depositPaid,
                    totalPrice
                });
            }
        });

        return {
            depositReminders: deposits,
            eventReminders: events,
            totalReminders: [...deposits, ...events]
        };
    }, [bookings]);

    if (totalReminders.length === 0) return null;

    const displayedList = activeTab === 'deposits' 
        ? depositReminders 
        : activeTab === 'events' 
            ? eventReminders 
            : totalReminders;

    const handleSendWhatsApp = (item) => {
        const phone = item.customer_phone || item.customerPhone || '';
        const cleanPhone = phone.replace(/\D/g, '');

        if (!cleanPhone) {
            showToast('⚠️ La reserva no tiene un teléfono válido registrado', 'warning');
            return;
        }

        const clientName = item.customer_name || item.customerName || 'Cliente';
        const bizName = currentBusiness?.name || 'el establecimiento';
        const dateStr = item.date || '';
        const [y, m, d] = dateStr.split('-');
        const formattedDate = `${d}/${m}/${y}`;
        const timeStr = item.time && item.time !== '00:00' && item.time !== '00:00:00' ? ` a las ${item.time} hs` : '';

        let message = '';

        if (item.type === 'deposit_pending') {
            // Mensaje de Reclamo de Seña por pasar más de 1 hora
            message = `¡Hola ${clientName}! 👋 Te escribimos de *${bizName}* para coordinar tu solicitud de reserva del *${formattedDate}*${timeStr}.\n\nPara asegurar y reservar la fecha en el calendario antes de que se libere, solicitamos enviar el comprobante de la seña de *$${item.depositReq.toLocaleString('es-AR')}* (Total: $${item.totalPrice.toLocaleString('es-AR')}).\n\n¿Precisás que te reenviemos los datos de transferencia o Alias? Quedamos a tu disposición.`;
        } else {
            // Mensaje de Recordatorio de Evento Próximo
            const guests = item.guest_count || item.guestCount || item.metadata?.guestCount || item.guests || '';
            const guestsInfo = guests ? ` (${guests} personas)` : '';
            const balanceText = item.remainingBalance > 0
                ? ` Recordá que el saldo restante a abonar al ingresar es de *$${item.remainingBalance.toLocaleString('es-AR')}*.`
                : ' Tu reserva ya se encuentra abonada en su totalidad.';

            const locationLink = currentBusiness?.google_maps_url || currentBusiness?.address
                ? `\n📍 *Ubicación:* ${currentBusiness.google_maps_url || currentBusiness.address}`
                : '';

            message = `¡Hola ${clientName}! 👋 Te escribimos de *${bizName}* para recordarte tu evento de ${item.urgencyLabel.toLowerCase().includes('hoy') ? '*HOY*' : item.urgencyLabel.toLowerCase().includes('mañana') ? '*MAÑANA*' : `el *${formattedDate}*`}${timeStr}${guestsInfo}.${balanceText}${locationLink}\n\n¡Cualquier duda o consulta avisanos!`;
        }

        // Mark as sent in DB
        markReminderAsSent(item, false);

        // Open WhatsApp
        const fullPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
        const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const markReminderAsSent = async (item, notify = true) => {
        try {
            setProcessingId(item.id);
            const nowIso = new Date().toISOString();
            const updatedMetadata = {
                ...(item.metadata || {}),
                reminder_sent_at: nowIso,
                reminderSent: true
            };

            await serviceAdapter.updateBooking(item.id, {
                metadata: updatedMetadata
            });

            if (onBookingUpdated) {
                onBookingUpdated({
                    ...item,
                    metadata: updatedMetadata,
                    reminder_sent_at: nowIso
                });
            }

            if (notify) {
                showToast('✓ Recordatorio marcado como enviado', 'success');
            }
        } catch (error) {
            console.error('Error marking reminder as sent:', error);
            if (notify) {
                showToast('Error al actualizar recordatorio', 'error');
            }
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(28, 28, 28, 0.98))',
            border: depositReminders.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: isMobile ? '14px 16px' : '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
        }}>
            {/* Card Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
            }} onClick={() => setIsCollapsed(prev => !prev)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: depositReminders.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        border: depositReminders.length > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                    }}>
                        {depositReminders.length > 0 ? '⏳' : '🔔'}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: isMobile ? '14px' : '15px', fontWeight: '800', color: 'var(--text-primary, #FFF)' }}>
                                Recordatorios y Señas Pendientes
                            </h4>
                            <span style={{
                                background: depositReminders.length > 0 ? '#EF4444' : '#F59E0B',
                                color: '#FFF',
                                fontSize: '11px',
                                fontWeight: '900',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>
                                {totalReminders.length}
                            </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary, #A0A0A0)' }}>
                            {depositReminders.length > 0 ? `⚠️ ${depositReminders.length} cliente(s) llevan +1h sin enviar comprobante de seña` : 'Avisa a los clientes con fecha próxima por WhatsApp'}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border, #333)',
                        borderRadius: '8px',
                        color: 'var(--text-primary, #FFF)',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                    }}
                >
                    {isCollapsed ? 'Mostrar ▼' : 'Ocultar ▲'}
                </button>
            </div>

            {/* Filter Tabs if both types exist */}
            {!isCollapsed && (depositReminders.length > 0 && eventReminders.length > 0) && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTab('all'); }}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeTab === 'all' ? 'var(--primary-paddle, #84CC16)' : 'rgba(255, 255, 255, 0.06)',
                            color: activeTab === 'all' ? '#000' : 'var(--text-secondary, #AAA)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Todos ({totalReminders.length})
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTab('deposits'); }}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeTab === 'deposits' ? '#EF4444' : 'rgba(255, 255, 255, 0.06)',
                            color: activeTab === 'deposits' ? '#FFF' : 'var(--text-secondary, #AAA)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        ⏳ Señas (+1h) ({depositReminders.length})
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveTab('events'); }}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: activeTab === 'events' ? '#F59E0B' : 'rgba(255, 255, 255, 0.06)',
                            color: activeTab === 'events' ? '#000' : 'var(--text-secondary, #AAA)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        📅 Eventos Próximos ({eventReminders.length})
                    </button>
                </div>
            )}

            {/* List of Reminders */}
            {!isCollapsed && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '12px',
                    marginTop: (depositReminders.length > 0 && eventReminders.length > 0) ? '10px' : '14px',
                    borderTop: (depositReminders.length > 0 && eventReminders.length > 0) ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: (depositReminders.length > 0 && eventReminders.length > 0) ? 0 : '14px'
                }}>
                    {displayedList.map((item) => {
                        const clientName = item.customer_name || item.customerName || 'Cliente';
                        const [y, m, d] = (item.date || '').split('-');
                        const formattedDate = `${d}/${m}/${y}`;
                        const isProcessing = processingId === item.id;
                        const isDepositType = item.type === 'deposit_pending';

                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: 'var(--bg-main, #141414)',
                                    border: isDepositType ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border, #2A2A2A)',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '10px'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                        {isDepositType ? (
                                            <span style={{
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#EF4444',
                                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                                fontSize: '10.5px',
                                                fontWeight: '800',
                                                padding: '2px 8px',
                                                borderRadius: '6px'
                                            }}>
                                                ⏳ Seña sin pagar (+{item.hoursElapsed || 1}h)
                                            </span>
                                        ) : (
                                            <span style={{
                                                background: `${item.urgencyColor}20`,
                                                color: item.urgencyColor,
                                                border: `1px solid ${item.urgencyColor}50`,
                                                fontSize: '10.5px',
                                                fontWeight: '800',
                                                padding: '2px 8px',
                                                borderRadius: '6px'
                                            }}>
                                                {item.urgencyLabel} • {formattedDate}
                                            </span>
                                        )}

                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #888)', fontWeight: '600' }}>
                                            {isDepositType ? `Fecha: ${formattedDate}` : (item.time && item.time !== '00:00' && item.time !== '00:00:00' ? `🕒 ${item.time} hs` : '📅 Jornada')}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary, #FFF)' }}>
                                        👤 {clientName}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary, #A0A0A0)' }}>
                                        {isDepositType ? (
                                            <span style={{ color: '#EF4444', fontWeight: '700' }}>
                                                💳 Seña Requerida: ${item.depositReq.toLocaleString('es-AR')} (Total: ${item.totalPrice.toLocaleString('es-AR')})
                                            </span>
                                        ) : (
                                            <>
                                                {item.guest_count && (
                                                    <span>👥 {item.guest_count} invitados</span>
                                                )}
                                                {item.remainingBalance > 0 ? (
                                                    <span style={{ color: '#F59E0B', fontWeight: '700' }}>
                                                        💵 Saldo restante: ${item.remainingBalance.toLocaleString('es-AR')}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#10B981', fontWeight: '700' }}>
                                                        ✓ Totalmente Pagado
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleSendWhatsApp(item)}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            background: isDepositType ? '#EF4444' : '#25D366',
                                            color: isDepositType ? '#FFF' : '#000',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            fontSize: '12.5px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            transition: 'opacity 0.15s'
                                        }}
                                        title={isDepositType ? "Reclamar seña por WhatsApp" : "Enviar recordatorio de evento"}
                                    >
                                        <span>💬</span> {isDepositType ? 'Reclamar Seña' : 'Enviar Recordatorio'}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => markReminderAsSent(item, true)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid var(--border, #333)',
                                            color: 'var(--text-secondary, #AAA)',
                                            borderRadius: '8px',
                                            padding: '8px 10px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title="Marcar como enviado sin abrir WhatsApp"
                                    >
                                        ✓ Listo
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
