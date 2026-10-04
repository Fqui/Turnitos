import React, { useMemo, useState } from 'react';
import serviceAdapter from '../../../services/serviceAdapter';
import { useNotification } from '../../../contexts/NotificationContext';

const OPEN_STATES = ['pending', 'confirmed', 'deposit_paid'];

function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(date) {
    const [y, m, d] = String(date || '').substring(0, 10).split('-');
    return d && m ? `${d}/${m}${y ? `/${y}` : ''}` : '';
}

/**
 * Bookings whose date already passed but were never closed (still pending/confirmed).
 * Closing them keeps analytics, reviews and customer history accurate.
 */
export default function PortalPastBookingsCard({ bookings = [], onResolved, isMobile = false }) {
    const { showToast } = useNotification();
    const [expanded, setExpanded] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const pastOpen = useMemo(() => {
        const today = todayIso();
        return bookings
            .filter(b => b && !b.is_blocked && OPEN_STATES.includes(b.status))
            .filter(b => b.date && String(b.date).substring(0, 10) < today)
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }, [bookings]);

    if (pastOpen.length === 0) return null;

    const close = async (booking, attended) => {
        setProcessingId(booking.id);
        try {
            const history = Array.isArray(booking.history) ? [...booking.history] : [];
            history.push(attended
                ? { action: 'completed', label: 'Servicio Finalizado', timestamp: new Date().toISOString(), status: 'completed' }
                : { action: 'cancelled', label: 'No se presentó', timestamp: new Date().toISOString(), status: 'cancelled', reason: 'No se presentó' });

            await serviceAdapter.updateBookingStatus(
                booking.id,
                attended ? 'completed' : 'cancelled',
                attended ? { history } : { history, reason: 'No se presentó' }
            );
            if (onResolved) await onResolved();
        } catch (err) {
            console.error('Error closing past booking:', err);
            showToast(`No se pudo actualizar el turno: ${err.message}`, 'error');
        } finally {
            setProcessingId(null);
        }
    };

    // Short preview so the calendar stays visible (one row on phones)
    const previewCount = isMobile ? 1 : 3;
    const visible = expanded ? pastOpen : pastOpen.slice(0, previewCount);

    return (
        <div style={{
            marginBottom: '12px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                        🗂️ Tenés {pastOpen.length} {pastOpen.length === 1 ? 'turno pasado' : 'turnos pasados'} sin cerrar
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Marcá si el cliente vino para que tus métricas y reseñas estén al día.
                    </div>
                </div>
                {pastOpen.length > previewCount && (
                    <button
                        type="button"
                        onClick={() => setExpanded(prev => !prev)}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                        {expanded ? 'Ver menos' : `Ver los ${pastOpen.length}`}
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {visible.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-main)' }}>
                        <div style={{ flex: 1, minWidth: '160px', fontSize: '13px', color: 'var(--text-primary)' }}>
                            <strong>{formatDate(b.date)}{b.time ? ` · ${String(b.time).substring(0, 5)}` : ''}</strong>
                            {' · '}{b.customer_name || b.customerName || 'Cliente'}
                            {(b.services?.name || b.service_name) ? ` · ${b.services?.name || b.service_name}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                type="button"
                                disabled={processingId === b.id}
                                onClick={() => close(b, true)}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--primary-paddle, #10b981)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                            >
                                ✓ Asistió
                            </button>
                            <button
                                type="button"
                                disabled={processingId === b.id}
                                onClick={() => close(b, false)}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                            >
                                No vino
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
