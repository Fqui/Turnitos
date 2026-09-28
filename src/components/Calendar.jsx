import React from 'react';

export default function Calendar({ selectedDate, onDateSelect, sportColor = '#00E676', maxDays = 30, specialDays = [] }) {
    const count = Math.min(Math.max(Number(maxDays) || 7, 1), 90);
    const dates = Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const isScrollable = count > 7;

    return (
        <div>
            <div style={{
                display: isScrollable ? 'flex' : 'grid',
                gridTemplateColumns: isScrollable ? undefined : `repeat(${count}, 1fr)`,
                overflowX: isScrollable ? 'auto' : 'visible',
                gap: '8px',
                paddingBottom: isScrollable ? '6px' : '0px',
                textAlign: 'center',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {dates.map((date) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayName = days[date.getDay()];
                    const dayNumber = date.getDate();

                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const special = (specialDays || []).find(sd => sd.date === dateStr);

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => onDateSelect(date)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px 4px 8px 4px',
                                minWidth: isScrollable ? '56px' : 'auto',
                                flex: isScrollable ? '0 0 auto' : '1',
                                borderRadius: '16px',
                                border: isSelected ? 'none' : '1px solid var(--border, transparent)',
                                backgroundColor: isSelected ? sportColor : 'transparent',
                                color: isSelected ? '#fff' : 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 8px 16px ${sportColor}40` : 'none',
                                position: 'relative'
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
                            <span style={{ fontSize: '11px', fontWeight: '500', opacity: isSelected ? 0.9 : 0.6, marginBottom: '2px' }}>
                                {dayName}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                {dayNumber}
                            </span>

                            {/* Badge for Special Days */}
                            {special && special.type === 'special_price' && (
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: '800',
                                    background: isSelected ? '#ffffff' : '#10b981',
                                    color: isSelected ? '#059669' : '#ffffff',
                                    padding: '1px 5px',
                                    borderRadius: '6px',
                                    marginTop: '3px',
                                    letterSpacing: '0.2px',
                                    lineHeight: '1.2'
                                }}>
                                    {special.priceMode === 'discount_percent' && special.priceVal ? `-${special.priceVal}%` : 'PROMO'}
                                </span>
                            )}

                            {special && (special.type === 'closed' || special.type === 'holiday') && (
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    color: isSelected ? '#fff' : '#ef4444',
                                    opacity: 0.85,
                                    marginTop: '3px',
                                    lineHeight: '1.2'
                                }}>
                                    Cerrado
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
