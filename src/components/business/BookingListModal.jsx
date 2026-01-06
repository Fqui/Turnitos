import React from 'react';

const BookingListModal = ({ isOpen, onClose, bookings, title, onBookingClick, onUnblock }) => {
    if (!isOpen) return null;

    // Helper to get status label and color matching DashboardCalendar
    const getStatusInfo = (booking) => {
        const status = booking.status;
        const label = (booking.court?.name || booking.service?.name || '').toLowerCase(); // For confirmed logic

        switch (status) {
            case 'confirmed':
                if (label.includes('padel') || label.includes('tenis')) {
                    return { label: 'Confirmada', color: '#fff', bg: '#059669' }; // Emerald-600
                }
                return { label: 'Confirmada', color: '#fff', bg: '#2563EB' }; // Blue-600
            case 'pending': return { label: 'Pendiente', color: '#fff', bg: '#F59E0B' }; // Amber-500 ("Señado" usually maps to deposit_paid, pending often distinct)
            case 'deposit_paid': return { label: 'Señado', color: '#fff', bg: '#F59E0B' }; // Amber-500
            case 'attended':
            case 'completed': return { label: 'Finalizado', color: '#fff', bg: '#10B981' }; // Emerald-500
            case 'cancelled': return { label: 'Cancelada', color: '#fff', bg: '#DC2626' }; // Red-600
            case 'absent': return { label: 'Ausente', color: '#fff', bg: '#6B7280' }; // Gray-500
            case 'blocked': return { label: 'BLOQUEADO', color: '#fff', bg: '#374151' }; // Gray-700
            default: return { label: status, color: '#fff', bg: '#9CA3AF' }; // Gray-400
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {title || 'Reservas'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* List */}
                <div style={{ padding: '16px', overflowY: 'auto' }}>
                    {bookings.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay reservas para mostrar.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {bookings.map((booking, index) => {
                                const statusInfo = getStatusInfo(booking);
                                const isBlocked = booking.status === 'blocked';

                                return (
                                    <div
                                        key={index}
                                        onClick={() => !isBlocked && onBookingClick && onBookingClick(booking)}
                                        style={{
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            cursor: isBlocked ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: isBlocked ? 'rgba(0,0,0,0.02)' : 'var(--bg-main)',
                                            opacity: isBlocked ? 0.9 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isBlocked) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isBlocked) {
                                                e.currentTarget.style.transform = 'none';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                            {/* Avatar Placeholder */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: isBlocked ? '#666' : 'var(--primary-paddle)',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '18px'
                                            }}>
                                                {isBlocked ? '🔒' : (booking.customer_name ? booking.customer_name.charAt(0).toUpperCase() : 'C')}
                                            </div>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {isBlocked ? 'BLOQUEADO' : (booking.customer_name || 'Sin nombre')}
                                                </h4>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                    {isBlocked
                                                        ? 'Restringido por administrador'
                                                        : (booking.court?.name || booking.courts?.name || booking.service?.name || booking.services?.name || 'Recurso no especificado')
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            {isBlocked ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUnblock && onUnblock(booking);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        background: 'transparent',
                                                        color: '#ff4444',
                                                        border: '1px solid #ff4444',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Desbloquear
                                                </button>
                                            ) : (
                                                <div style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    background: statusInfo.bg,
                                                    color: statusInfo.color
                                                }}>
                                                    {statusInfo.label}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingListModal;
