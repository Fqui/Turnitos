import React from 'react';

export default function VenueBookingPanel({
    pricePerHour,
    guestCount,
    setGuestCount,
    duration,
    setDuration,
    rawBasePrice,
    durationDiscountPct,
    durationDiscountAmount,
    basePrice,
    totalPrice,
    onContinue,
    business,
    selectedDate,
    onSelectDateClick
}) {
    const primaryColor = business?.primary_color || business?.button_color || '#84CC16';
    const isDark = business?.theme === 'dark';
    const cardBg = isDark ? '#1E1E1E' : 'white';
    const textColor = isDark ? '#FFFFFF' : '#1a1a1a';
    const secondaryTextColor = isDark ? '#A0A0A0' : '#64748B';
    const subCardBg = isDark ? '#2A2A2A' : '#F8F9FA';
    const btnBg = isDark ? '#333333' : 'white';
    const dividerColor = isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB';
    const borderColor = isDark ? '#333333' : '#E2E8F0';
    const durationOptions = business?.rental_duration_options || [4, 6, 8, 12, 24];
    const maxCapacity = Number(business?.capacity_limit || business?.capacity || 100);

    return (
        <div style={{
            background: cardBg,
            borderRadius: '24px',
            padding: '32px',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`,
            color: textColor
        }}>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: secondaryTextColor, marginBottom: '4px' }}>Desde</div>
                <div>
                    <span style={{ fontSize: '32px', fontWeight: '900', color: textColor }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '16px', color: secondaryTextColor, marginLeft: '4px' }}>/hora</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Guest Counter */}
                <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: secondaryTextColor, marginBottom: '8px' }}>
                        Invitados
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: subCardBg,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                        <button
                            onClick={() => setGuestCount(prev => Math.max(5, (Number(prev) || 30) - 5))}
                            disabled={guestCount <= 5}
                            style={{
                                background: btnBg,
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: guestCount <= 5 ? 'not-allowed' : 'pointer',
                                opacity: guestCount <= 5 ? 0.3 : 1,
                                fontSize: '18px',
                                fontWeight: '700',
                                color: textColor
                            }}
                        >
                            −
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: textColor }}>
                                {guestCount}
                            </div>
                            <div style={{ fontSize: '11px', color: secondaryTextColor }}>personas</div>
                        </div>
                        <button
                            onClick={() => setGuestCount(prev => Math.min(maxCapacity, (Number(prev) || 30) + 5))}
                            disabled={guestCount >= maxCapacity}
                            style={{
                                background: btnBg,
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: guestCount >= maxCapacity ? 'not-allowed' : 'pointer',
                                opacity: guestCount >= maxCapacity ? 0.3 : 1,
                                fontSize: '18px',
                                fontWeight: '700',
                                color: textColor
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Duration Selector */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: secondaryTextColor }}>Duración</span>
                        {durationDiscountPct > 0 && (
                            <span style={{
                                fontSize: '10px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                fontWeight: '700'
                            }}>
                                🔥 {durationDiscountPct}% OFF
                            </span>
                        )}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: subCardBg,
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                        <button
                            onClick={() => {
                                const currentIdx = durationOptions.indexOf(duration);
                                if (currentIdx > 0) setDuration(durationOptions[currentIdx - 1]);
                            }}
                            disabled={durationOptions.indexOf(duration) === 0}
                            style={{
                                background: btnBg,
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: durationOptions.indexOf(duration) === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: textColor,
                                opacity: durationOptions.indexOf(duration) === 0 ? 0.3 : 1
                            }}
                        >
                            −
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '900', color: textColor }}>
                                {duration}
                            </div>
                            <div style={{ fontSize: '11px', color: secondaryTextColor }}>horas</div>
                        </div>
                        <button
                            onClick={() => {
                                const currentIdx = durationOptions.indexOf(duration);
                                if (currentIdx < durationOptions.length - 1) setDuration(durationOptions[currentIdx + 1]);
                            }}
                            disabled={durationOptions.indexOf(duration) === durationOptions.length - 1}
                            style={{
                                background: btnBg,
                                border: 'none',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                cursor: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: textColor,
                                opacity: durationOptions.indexOf(duration) === durationOptions.length - 1 ? 0.3 : 1
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Price Breakdown */}
            <div style={{
                background: subCardBg,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: secondaryTextColor }}>Precio por hora</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>
                        ${pricePerHour.toLocaleString()}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: secondaryTextColor }}>Duración ({duration} horas)</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>
                        ${(rawBasePrice || (pricePerHour * duration)).toLocaleString()}
                    </span>
                </div>
                {durationDiscountPct > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#10B981', fontWeight: '600', fontSize: '14px' }}>
                        <span>Descuento por {duration}hs ({durationDiscountPct}% OFF)</span>
                        <span>-${durationDiscountAmount?.toLocaleString()}</span>
                    </div>
                )}
                <div style={{
                    borderTop: `2px solid ${dividerColor}`,
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: textColor }}>Total</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: business?.primary_color || business?.button_color || '#84CC16' }}>
                        ${totalPrice.toLocaleString()}
                    </span>
                </div>
            </div>

            <button
                onClick={() => {
                    if (!selectedDate) {
                        if (onSelectDateClick) onSelectDateClick();
                    } else {
                        if (onContinue) onContinue();
                    }
                }}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: primaryColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '12px',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                }}
            >
                {!selectedDate ? 'Ver fechas disponibles' : 'Continuar'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '13px', color: secondaryTextColor }}>
                No se realizará ningún cargo todavía
            </div>
        </div>
    );
}
