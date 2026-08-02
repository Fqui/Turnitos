import React from 'react';

const BookingDetailsModal = ({
    isOpen,
    onClose,
    isMobile,
    booking,
    businesses,
    selectedBusinessId,
    onAction,
    formatDisplayDate,
    getStatusLabel
}) => {
    if (!isOpen || !booking) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: isMobile ? '0' : '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card)',
                padding: isMobile ? '20px 16px 28px 16px' : '24px',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '460px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
                maxHeight: isMobile ? '92vh' : '95vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '750', color: 'var(--text-primary)' }}>Detalles de la Reserva</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {/* Compact Date, Time & Resource Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr' : '1.1fr 0.8fr 1.3fr',
                        gap: '12px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Fecha</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDisplayDate(booking.date)}</div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Hora</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{booking.time} hs</div>
                        </div>
                        <div style={{ gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Recurso / Servicio</label>
                            <div style={{
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {booking.services?.name || booking.courts?.name || booking.service || '-'}
                            </div>
                        </div>
                    </div>

                    {/* Customer Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Cliente</label>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>{booking.customer_name || booking.customerName || '-'}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{booking.customer_phone || booking.customerPhone || '-'}</div>
                        </div>
                        {booking.status !== 'blocked' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <button
                                onClick={() => {
                                    if (booking.status === 'confirmed') return;
                                    const name = booking.customer_name || booking.customerName;
                                    const phone = booking.customer_phone || booking.customerPhone;
                                    const date = formatDisplayDate(booking.date);
                                    const time = booking.time;
                                    const biz = businesses.find(b => b.id === selectedBusinessId);
                                    const businessName = biz?.name || 'nuestro local';

                                    let message = '';
                                    if (booking.status === 'pending') {
                                        const paymentSettings = biz?.payment_settings || biz?.paymentSettings || {};
                                        const deposit = paymentSettings.deposit || { enabled: false, type: 'percentage', percentage: 30, fixed_amount: 0 };
                                        const bankDetails = paymentSettings.bank_details || { bank_name: '', account_holder: '', cbu: '', alias: '' };
                                        const whatsappTemplate = paymentSettings.whatsapp_template || '';

                                        let depositAmountText = '';
                                        if (deposit && deposit.enabled) {
                                            let amount = 0;
                                            if (deposit.type === 'percentage') {
                                                amount = Math.round((booking.price * (deposit.percentage || 0)) / 100);
                                            } else {
                                                amount = deposit.fixed_amount || deposit.fixedAmount || 0;
                                            }
                                            if (amount > 0) {
                                                depositAmountText = `*$${amount}*`;
                                            }
                                        }
                                        const señaLabel = depositAmountText ? depositAmountText : 'la seña';

                                        const bankName = bankDetails?.bank_name || bankDetails?.bankName || '';
                                        const accountHolder = bankDetails?.account_holder || bankDetails?.accountHolder || '';
                                        const cbu = bankDetails?.cbu || '';
                                        const alias = bankDetails?.alias || '';

                                        let bankText = '';
                                        if (alias || cbu) {
                                            bankText = `\n\n*Datos para la transferencia:*`;
                                            if (bankName) bankText += `\nBanco: ${bankName}`;
                                            if (accountHolder) bankText += `\nTitular: ${accountHolder}`;
                                            if (cbu) bankText += `\nCBU: *${cbu}*`;
                                            if (alias) bankText += `\nAlias: *${alias}*`;
                                        }

                                        if (whatsappTemplate) {
                                            message = whatsappTemplate
                                                .replace(/{cliente}/g, name)
                                                .replace(/{fecha}/g, date)
                                                .replace(/{hora}/g, time)
                                                .replace(/{negocio}/g, businessName)
                                                .replace(/{seña}/g, señaLabel)
                                                .replace(/{datos_bancarios}/g, bankText);
                                        } else {
                                            message = `Hola ${name}, te recordamos que para confirmar tu reserva del día ${date} a las ${time} hs en ${businessName} es necesario realizar ${señaLabel}.${bankText}\n\nUna vez realizada, por favor envíanos el comprobante por este medio. ¡Muchas gracias!`;
                                        }
                                    } else {
                                        message = `Hola ${name}, te recordamos tu turno para el día ${date} a las ${time} hs en ${businessName}. ¿Confirmas tu asistencia?`;
                                    }

                                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                disabled={booking.status === 'confirmed'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    border: booking.status === 'confirmed' ? '1px solid var(--border)' : '1px solid #25D366',
                                    background: booking.status === 'confirmed' ? 'transparent' : 'rgba(37, 211, 102, 0.1)',
                                    color: booking.status === 'confirmed' ? 'var(--text-secondary)' : '#25D366',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    cursor: booking.status === 'confirmed' ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: booking.status === 'confirmed' ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (booking.status !== 'confirmed') {
                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (booking.status !== 'confirmed') {
                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                                    }
                                }}
                            >
                                <span>📲</span> {booking.status === 'confirmed' ? 'Asistencia Confirmada' : (booking.status === 'pending' ? 'Pedir Seña' : 'Recordar')}
                            </button>
                        )}
                    </div>

                    {/* Status & Price Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Estado</label>
                            <div style={{
                                fontWeight: '800',
                                color: booking.status === 'confirmed' ? '#00E676' :
                                    (booking.status === 'cancelled' ? '#ff4444' :
                                        (booking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-primary)')),
                                textTransform: 'uppercase',
                                fontSize: '13px',
                                letterSpacing: '0.3px'
                            }}>
                                {getStatusLabel(booking.status)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Precio</label>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '16px' }}>${booking.price}</div>
                        </div>
                    </div>

                    {/* Compact Shift History */}
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.01)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        border: '1px dashed var(--border)'
                    }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Historial del Turno</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ borderLeft: '2px solid var(--primary-paddle)', paddingLeft: '8px', marginBottom: '2px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Turno Creado</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                        {booking.created_at ? new Date(booking.created_at).toLocaleString('es-AR') :
                                            (booking.history?.find(h => h.action === 'creation')?.timestamp ?
                                                new Date(booking.history.find(h => h.action === 'creation').timestamp).toLocaleString('es-AR') : '-')}
                                    </span>
                                </div>
                            </div>

                            {booking.history && booking.history.filter(h => h.action !== 'creation').map((log, idx) => (
                                <div key={idx} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '8px', marginBottom: '2px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{log.label}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
                                            {new Date(log.timestamp).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    {log.reason && (
                                        <div style={{ color: '#ff4444', fontStyle: 'italic', fontSize: '10px' }}>
                                            Motivo: {log.reason}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {(!booking.history || booking.history.length === 0) && (
                                <>
                                    {booking.confirmed_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Confirmado:</span>
                                            <span style={{ color: '#00E676', fontWeight: '500' }}>
                                                {new Date(booking.confirmed_at).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    )}
                                    {booking.cancelled_at && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Cancelado:</span>
                                            <span style={{ color: '#ff4444', fontWeight: '500' }}>
                                                {new Date(booking.cancelled_at).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        {booking.status === 'blocked' ? (
                            <button
                                onClick={() => onAction('unblock')}
                                style={{
                                    gridColumn: 'span 2',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle)',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Desbloquear Horario
                            </button>
                        ) : (
                            <>
                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => booking.status === 'pending' && onAction('confirm_deposit')}
                                        disabled={booking.status === 'deposit_paid'}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#F59E0B',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'deposit_paid' ? 'default' : 'pointer',
                                            opacity: booking.status === 'deposit_paid' ? 0.5 : 1,
                                            fontSize: '14px'
                                        }}
                                    >
                                        {booking.status === 'deposit_paid' ? 'Seña Confirmada' : 'Confirmar Seña'}
                                    </button>
                                )}
                                {(booking.status === 'pending' || booking.status === 'deposit_paid') && (
                                    <button
                                        onClick={() => onAction('confirm_booking')}
                                        disabled={booking.status === 'pending'}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'pending' ? 'default' : 'pointer',
                                            opacity: booking.status === 'pending' ? 0.5 : 1,
                                            fontSize: '14px'
                                        }}
                                    >
                                        Confirmar Turno
                                    </button>
                                )}
                                {(booking.status === 'confirmed' || booking.status === 'attended') && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction('complete_booking');
                                        }}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#000',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Finalizar
                                    </button>
                                )}
                                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAction('cancel');
                                        }}
                                        style={{
                                            gridColumn: 'span 2',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#ff4444',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: '4px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Cancelar Reserva
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetailsModal;
