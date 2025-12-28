import React, { useState } from 'react';

export default function MonthCalendar({ selectedDate, onDateSelect, sportColor = '#00E676' }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    // Get first day of month and total days
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate calendar days
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        calendarDays.push(date);
    }

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const isPastDate = (date) => {
        if (!date) return false;
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return compareDate < today;
    };

    return (
        <div>
            {/* Month Navigation */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '0 8px'
            }}>
                <button
                    onClick={goToPreviousMonth}
                    disabled={month === today.getMonth() && year === today.getFullYear()}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: month === today.getMonth() && year === today.getFullYear() ? 'not-allowed' : 'pointer',
                        color: 'var(--text-primary)',
                        opacity: month === today.getMonth() && year === today.getFullYear() ? 0.3 : 1,
                        padding: '4px 8px'
                    }}
                >
                    ‹
                </button>

                <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    {monthNames[month]} {year}
                </h3>

                <button
                    onClick={goToNextMonth}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        padding: '4px 8px'
                    }}
                >
                    ›
                </button>
            </div>

            {/* Day Names Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                marginBottom: '8px',
                textAlign: 'center'
            }}>
                {dayNames.map(day => (
                    <div key={day} style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                        padding: '8px 0'
                    }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                textAlign: 'center'
            }}>
                {calendarDays.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} />;
                    }

                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === today.toDateString();
                    const isPast = isPastDate(date);

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => !isPast && onDateSelect(date)}
                            disabled={isPast}
                            style={{
                                aspectRatio: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '12px',
                                border: isToday && !isSelected ? `2px solid ${sportColor}40` : 'none',
                                backgroundColor: isSelected
                                    ? sportColor
                                    : isPast
                                        ? 'transparent'
                                        : 'transparent',
                                color: isSelected
                                    ? '#fff'
                                    : isPast
                                        ? 'var(--text-secondary)'
                                        : 'var(--text-primary)',
                                cursor: isPast ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: isSelected || isToday ? '700' : '500',
                                opacity: isPast ? 0.3 : 1,
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 4px 12px ${sportColor}40` : 'none',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isPast) {
                                    e.currentTarget.style.backgroundColor = `${sportColor}10`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected && !isPast) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            {date.getDate()}
                            {isToday && !isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: sportColor
                                }} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
