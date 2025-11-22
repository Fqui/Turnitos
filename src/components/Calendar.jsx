import React from 'react';

export default function Calendar({ selectedDate, onDateSelect, sportColor = '#00E676' }) {
    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                textAlign: 'center'
            }}>
                {dates.map((date) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayName = days[date.getDay()];
                    const dayNumber = date.getDate();

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onDateSelect(date)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '12px 4px',
                                borderRadius: '16px',
                                border: isSelected ? 'none' : '1px solid transparent',
                                backgroundColor: isSelected ? sportColor : 'transparent',
                                color: isSelected ? '#fff' : 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 8px 16px ${sportColor}40` : 'none',
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6, marginBottom: '4px' }}>
                                {dayName}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {dayNumber}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
