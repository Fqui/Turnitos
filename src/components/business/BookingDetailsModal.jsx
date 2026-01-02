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
                padding: isMobile ? '24px 20px 40px 20px' : '32px',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '500px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                border: '1px solid var(--border)',
                maxHeight: isMobile ? '90vh' : '95vh',
                overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Detalles de la Reserva</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatDisplayDate(booking.date)}</div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hora</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{booking.time} hs</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cliente</label>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '18px' }}>{booking.customer_name || booking.customerName || '-'}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{booking.customer_phone || booking.customerPhone || '-'}</div>
                        </div>
                        {booking.status !== 'blocked' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <button
                                onClick={() => {
                                    if (booking.status === 'confirmed' || booking.status === 'pending') return;
                                    const name = booking.customer_name || booking.customerName;
                                    const phone = booking.customer_phone || booking.customerPhone;
                                    const date = formatDisplayDate(booking.date);
                                    const time = booking.time;
                                    const biz = businesses.find(b => b.id === selectedBusinessId);
                                    const businessName = biz?.name || 'nuestro local';
                                    const message = `Hola ${name}, te recordamos tu turno para el día ${date} a las ${time} hs en ${businessName}. ¿Confirmas tu asistencia?`;
                                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                disabled={booking.status === 'confirmed' || booking.status === 'pending'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: (booking.status === 'confirmed' || booking.status === 'pending') ? '1px solid var(--border)' : '1px solid #25D366',
                                    background: (booking.status === 'confirmed' || booking.status === 'pending') ? 'transparent' : 'rgba(37, 211, 102, 0.1)',
                                    color: (booking.status === 'confirmed' || booking.status === 'pending') ? 'var(--text-secondary)' : '#25D366',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: (booking.status === 'confirmed' || booking.status === 'pending') ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: (booking.status === 'confirmed' || booking.status === 'pending') ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
                                        e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                                    }
                                }}
                            >
                                <span>📲</span> {booking.status === 'confirmed' ? 'Asistencia Confirmada' : (booking.status === 'pending' ? 'Recordar (Pendiente)' : 'Recordar')}
                            </button>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Servicio / Recurso</label>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {booking.services?.name || booking.courts?.name || booking.service || '-'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-main)', borderRadius: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estado</label>
                            <div style={{
                                fontWeight: '700',
                                color: booking.status === 'confirmed' ? '#00E676' :
                                    (booking.status === 'cancelled' ? '#ff4444' :
                                        (booking.status === 'deposit_paid' ? '#F59E0B' : 'var(--text-primary)')),
                                textTransform: 'uppercase',
                                fontSize: '14px'
                            }}>
                                {getStatusLabel(booking.status)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Precio</label>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '18px' }}>${booking.price}</div>
                        </div>
                    </div>

                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', fontSize: '12px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>Historial del Turno</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ borderLeft: '2px solid var(--primary-paddle)', paddingLeft: '12px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Turno Creado</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                                        {booking.created_at ? new Date(booking.created_at).toLocaleString('es-AR') :
                                            (booking.history?.find(h => h.action === 'creation')?.timestamp ?
                                                new Date(booking.history.find(h => h.action === 'creation').timestamp).toLocaleString('es-AR') : '-')}
                                    </span>
                                </div>
                            </div>

                            {booking.history && booking.history.filter(h => h.action !== 'creation').map((log, idx) => (
                                <div key={idx} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '12px', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{log.label}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                                            {new Date(log.timestamp).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    {log.reason && (
                                        <div style={{ color: '#ff4444', fontStyle: 'italic', fontSize: '11px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        {booking.status === 'blocked' ? (
                            <button
                                onClick={() => onAction('unblock')}
                                style={{
                                    gridColumn: 'span 2',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'var(--primary-paddle)',
                                    color: 'white',
                                    fontWeight: '700',
                                    cursor: 'pointer'
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
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#F59E0B',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'deposit_paid' ? 'default' : 'pointer',
                                            opacity: booking.status === 'deposit_paid' ? 0.5 : 1
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
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--primary-paddle)',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: booking.status === 'pending' ? 'default' : 'pointer',
                                            opacity: booking.status === 'pending' ? 0.5 : 1
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
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#000',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer'
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
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#ff4444',
                                            color: 'white',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            marginTop: '8px'
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
