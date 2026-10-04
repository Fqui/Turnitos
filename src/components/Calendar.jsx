import React from 'react';
import HorizontalScroller from './HorizontalScroller';

export default function Calendar({ selectedDate, onDateSelect, sportColor = '#00E676', maxDays = 30, specialDays = [], isDateClosed }) {
    const count = Math.min(Math.max(Number(maxDays) || 7, 1), 90);
    const dates = Array.from({ length: count }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const isScrollable = count > 7;

    const renderDays = () => dates.map((date) => {
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayName = days[date.getDay()];
                    const dayNumber = date.getDate();

                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const special = (specialDays || []).find(sd => sd.date === dateStr);
                    const isClosed = typeof isDateClosed === 'function' && isDateClosed(date);

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => { if (!isClosed) onDateSelect(date); }}
                            disabled={isClosed}
                            aria-label={isClosed ? `${dayName} ${dayNumber}: cerrado` : undefined}
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
                                cursor: isClosed ? 'not-allowed' : 'pointer',
                                opacity: isClosed ? 0.4 : 1,
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 8px 16px ${sportColor}40` : 'none',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected && !isClosed) {
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

                            {/* Badge for Special Days — Discount/Promo */}
                            {special && special.type === 'special_price' && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '800',
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.95)'
                                        : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: isSelected ? '#059669' : '#ffffff',
                                    padding: '2px 6px',
                                    borderRadius: '20px',
                                    marginTop: '4px',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1.3',
                                    textTransform: 'uppercase',
                                    boxShadow: isSelected ? 'none' : '0 2px 6px rgba(16,185,129,0.35)',
                                    animation: 'badgePulse 2s ease-in-out infinite',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {special.priceMode === 'discount_percent' && special.priceVal ? `${special.priceVal}% OFF` : special.priceMode === 'fixed' ? '💰 OFERTA' : '🔥 PROMO'}
                                </span>
                            )}

                            {/* Badge for Closed / Holiday */}
                            {isClosed && !(special && (special.type === 'closed' || special.type === 'holiday')) && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: 'var(--text-secondary)',
                                    marginTop: '3px',
                                    lineHeight: '1.2',
                                    textTransform: 'uppercase'
                                }}>
                                    Cerrado
                                </span>
                            )}

                            {special && (special.type === 'closed' || special.type === 'holiday') && (
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: '700',
                                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#ef4444',
                                    opacity: 0.9,
                                    marginTop: '3px',
                                    lineHeight: '1.2',
                                    letterSpacing: '0.2px'
                                }}>
                                    {special.type === 'holiday' ? '🎉' : '✕'}
                                </span>
                            )}
                        </button>
                    );
                });

    if (isScrollable) {
        return (
            <HorizontalScroller gap="8px" innerStyle={{ paddingBottom: '6px', textAlign: 'center' }}>
                {renderDays()}
            </HorizontalScroller>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${count}, 1fr)`,
            gap: '8px',
            textAlign: 'center'
        }}>
            {renderDays()}
        </div>
    );
}
