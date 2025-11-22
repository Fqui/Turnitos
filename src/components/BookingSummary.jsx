import React from 'react';

export default function BookingSummary({ bookingDetails, sportColor, onClose, onConfirm, isSubmitting }) {
    const [customerName, setCustomerName] = React.useState('');
    const [customerPhone, setCustomerPhone] = React.useState('');

    if (!bookingDetails) return null;

    const { date, time, courtName, serviceName, price } = bookingDetails;

    const handleConfirm = () => {
        if (!customerName || !customerPhone) {
            alert('Por favor completa tu nombre y teléfono');
            return;
        }
        onConfirm({ ...bookingDetails, customerName, customerPhone });
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                animation: 'fadeIn 0.3s ease'
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '24px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s ease',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, ${sportColor}15 0%, ${sportColor}05 100%)`,
                    padding: '24px',
                    borderBottom: '1px solid var(--border)',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        ✕
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            marginBottom: '4px'
                        }}>
                            Confirmar Reserva
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                            Completa tus datos para finalizar
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    {/* Details Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {/* Service/Court */}
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                {courtName ? 'Cancha' : 'Servicio'}
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {courtName || serviceName}
                            </span>
                        </div>

                        {/* Date & Time */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--bg-main)',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Fecha</div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                            </div>
                            <div style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--bg-main)',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hora</div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {time}
                                </div>
                            </div>
                        </div>

                        {/* Price */}
                        {price && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '12px',
                                backgroundColor: `${sportColor}10`,
                                border: `1px solid ${sportColor}30`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total a pagar</span>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: sportColor }}>
                                    ${price.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* User Inputs */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                            Nombre completo
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '16px',
                                marginBottom: '16px',
                                outline: 'none'
                            }}
                        />

                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Ej: 3804123456"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-primary)',
                                fontSize: '16px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.5 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting || !customerName || !customerPhone}
                            style={{
                                flex: 2,
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: (isSubmitting || !customerName || !customerPhone) ? '#9E9E9E' : sportColor,
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: (isSubmitting || !customerName || !customerPhone) ? 'not-allowed' : 'pointer',
                                opacity: 1,
                                boxShadow: (isSubmitting || !customerName || !customerPhone) ? 'none' : `0 8px 20px ${sportColor}40`,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSubmitting && customerName && customerPhone) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = `0 12px 28px ${sportColor}50`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSubmitting && customerName && customerPhone) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 8px 20px ${sportColor}40`;
                                }
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <span style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid #fff',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 0.6s linear infinite'
                                    }}></span>
                                    Procesando...
                                </>
                            ) : (
                                'Confirmar Reserva'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
