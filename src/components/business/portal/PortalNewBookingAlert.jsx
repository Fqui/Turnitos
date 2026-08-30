import React from 'react';

export default function PortalNewBookingAlert({
    newBookingAlert,
    onClose,
    onViewBooking,
    isMobile
}) {
    if (!newBookingAlert) return null;

    return (
        <div style={{
            position: 'fixed',
            top: isMobile ? '70px' : '24px',
            right: isMobile ? '12px' : '24px',
            left: isMobile ? '12px' : 'auto',
            maxWidth: isMobile ? 'none' : '400px',
            zIndex: 99999,
            background: 'var(--bg-card)',
            border: '2px solid var(--primary-paddle, #00E676)',
            borderRadius: '16px',
            padding: '16px 18px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>🔔</span>
                    <div>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block', fontWeight: '800' }}>
                            ¡Nueva Reserva Web!
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Ingresó una nueva reserva por la web
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                    }}
                    title="Cerrar"
                >
                    ✕
                </button>
            </div>

            <div style={{
                background: 'var(--bg-main)',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }}>
                <div style={{ color: 'var(--text-primary)' }}>
                    <strong>Cliente:</strong> {newBookingAlert.customer_name || newBookingAlert.customerName || 'Cliente'}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                    <strong>Fecha:</strong> {newBookingAlert.date}
                </div>
                {(newBookingAlert.start_time || newBookingAlert.startTime) && (
                    <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Horario:</strong> {newBookingAlert.start_time || newBookingAlert.startTime}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        color: 'var(--text-secondary)',
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    Ignorar
                </button>
                <button
                    onClick={() => {
                        onViewBooking(newBookingAlert);
                        onClose();
                    }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--primary-paddle, #00E676), #00B0FF)',
                        color: '#000000',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)'
                    }}
                >
                    Ver Reserva ➔
                </button>
            </div>
        </div>
    );
}
