import React from 'react';

export default function VenueCalendarSection({
    calendarRef,
    currentMonth,
    setCurrentMonth,
    daysInMonth,
    selectedDate,
    handleDateSelect,
    isDateBlocked,
    isDatePast,
    handleContinue,
    windowWidth,
    cardBg,
    subCardBg,
    btnBg,
    textColor,
    secondaryTextColor,
    borderColor,
    primaryColor,
    isDark
}) {
    return (
        <div ref={calendarRef} style={{
            background: cardBg,
            borderRadius: '24px',
            padding: windowWidth < 768 ? '16px' : '32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: `1px solid ${borderColor}`
        }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '20px' }}>
                Disponibilidad
            </h2>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
            }}>
                <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    style={{
                        background: subCardBg,
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: textColor
                    }}
                >
                    ‹
                </button>
                <div style={{ fontSize: '16px', fontWeight: '700', color: textColor }}>
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </div>
                <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    style={{
                        background: subCardBg,
                        border: 'none',
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: textColor
                    }}
                >
                    ›
                </button>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: windowWidth < 768 ? '4px' : '8px'
            }}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} style={{
                        textAlign: 'center',
                        fontSize: windowWidth < 768 ? '11px' : '12px',
                        fontWeight: '700',
                        color: secondaryTextColor,
                        padding: windowWidth < 768 ? '4px 2px' : '8px'
                    }}>
                        {day}
                    </div>
                ))}
                {daysInMonth.map((date, idx) => {
                    if (!date) {
                        return <div key={`empty-${idx}`} />;
                    }

                    const isBlocked = isDateBlocked(date);
                    const isPast = isDatePast(date);
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isDisabled = isBlocked || isPast;

                    return (
                        <button
                            key={idx}
                            onClick={() => handleDateSelect(date)}
                            disabled={isDisabled}
                            style={{
                                padding: windowWidth < 768 ? '8px 2px' : '12px',
                                borderRadius: '12px',
                                background: isSelected ? primaryColor : isBlocked ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : isPast ? subCardBg : btnBg,
                                color: isSelected ? 'white' : isBlocked ? (isDark ? '#EF4444' : '#DC2626') : isDisabled ? '#CBD5E1' : textColor,
                                fontSize: windowWidth < 768 ? '13px' : '14px',
                                fontWeight: isSelected ? '700' : '500',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                border: isSelected ? 'none' : `1px solid ${borderColor}`
                            }}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {selectedDate && windowWidth <= 1200 && (
                <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <button
                        onClick={handleContinue}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: primaryColor,
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span>Continuar</span>
                        <span>→</span>
                    </button>
                </div>
            )}
        </div>
    );
}
