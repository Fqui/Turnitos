import React from 'react';

const DurationSelector = ({
    court,
    timeSlot,
    availableDurations,
    onSelectDuration,
    onClose,
    sportColor,
    getPrice: customGetPrice // 🆕 Optional custom price calculator
}) => {
    // Use custom getPrice or default calculation
    const getPrice = customGetPrice || ((duration) => {
        const basePrice = court.price || 0;

        switch (duration) {
            case 60:
                return basePrice;
            case 90:
                return Math.round(basePrice * 1.5); // Changed from 1.4 to 1.5
            case 120:
                return Math.round(basePrice * 2); // Changed from 1.8 to 2
            default:
                return basePrice;
        }
    });

    const getDurationLabel = (duration) => {
        if (duration === 60) return '1 hora';
        if (duration === 90) return '1 hora 30 min';
        if (duration === 120) return '2 horas';
        return `${duration} min`;
    };

    return (
        <>
            {/* Overlay oscuro */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease'
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '400px',
                width: '90%',
                zIndex: 1001,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--border)',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: `${sportColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '28px'
                    }}>
                        🎾
                    </div>
                    <h3 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                    }}>
                        {court.name}
                    </h3>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '16px'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                        <span style={{ fontWeight: '600' }}>{timeSlot}</span>
                    </div>
                </div>

                {/* Durations */}
                <div style={{ marginBottom: '20px' }}>
                    <p style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        Selecciona la duración
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[60, 90, 120].map(duration => {
                            const isAvailable = availableDurations.includes(duration);
                            const price = getPrice(duration);

                            return (
                                <button
                                    key={duration}
                                    onClick={() => isAvailable && onSelectDuration(duration, price)}
                                    disabled={!isAvailable}
                                    style={{
                                        padding: '16px 20px',
                                        borderRadius: '16px',
                                        border: isAvailable
                                            ? `2px solid ${sportColor}`
                                            : '2px solid var(--border)',
                                        backgroundColor: isAvailable
                                            ? `${sportColor}08`
                                            : 'var(--bg-main)',
                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s ease',
                                        opacity: isAvailable ? 1 : 0.5
                                    }}
                                    onMouseEnter={(e) => {
                                        if (isAvailable) {
                                            e.currentTarget.style.backgroundColor = `${sportColor}15`;
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (isAvailable) {
                                            e.currentTarget.style.backgroundColor = `${sportColor}08`;
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: '700',
                                            color: isAvailable ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            marginBottom: '4px'
                                        }}>
                                            {getDurationLabel(duration)}
                                        </div>
                                        {!isAvailable && (
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                No disponible
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: isAvailable ? sportColor : 'var(--text-secondary)'
                                    }}>
                                        ${price.toLocaleString()}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Info message */}
                {availableDurations.length === 0 && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: '#FFF3CD',
                        border: '1px solid #FFC107',
                        marginBottom: '16px'
                    }}>
                        <p style={{
                            fontSize: '13px',
                            color: '#856404',
                            margin: 0,
                            textAlign: 'center'
                        }}>
                            No hay duraciones disponibles para este horario
                        </p>
                    </div>
                )}

                {/* Cancel button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '2px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                        e.currentTarget.style.borderColor = 'var(--text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                >
                    Cancelar
                </button>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
            `}</style>
        </>
    );
};

export default DurationSelector;
