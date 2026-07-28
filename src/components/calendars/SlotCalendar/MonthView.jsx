import React from 'react';
import { formatDateKey, isInCurrentMonth, isToday } from '../shared/utils';
import { getBookingColor } from '../shared/config';

export default function MonthView({
    type,
    config,
    business,
    bookings,
    displayDays,
    currentDate,
    setCurrentDate,
    setViewMode,
    isMobile
}) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            minHeight: '100%',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-main)',
            gap: '1px'
        }}>
            {/* Day Names Header */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    {day}
                </div>
            ))}

            {/* Month Days */}
            {displayDays.map((day, i) => {
                const dateKey = formatDateKey(day);
                const dayBookings = bookings.filter(b => {
                    let bDateKey = b.date;
                    if (b.date.includes('/')) {
                        const [d, m, y] = b.date.split('/');
                        bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    return bDateKey === dateKey && b.status !== 'cancelled' && b.status !== 'blocked';
                });

                const isCurrentMonth = isInCurrentMonth(day, currentDate);
                const isTodayDay = isToday(day);

                return (
                    <div
                        key={i}
                        onClick={() => {
                            setCurrentDate(new Date(day));
                            setViewMode('day');
                        }}
                        style={{
                            backgroundColor: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                            padding: '12px 8px',
                            minHeight: isMobile ? '80px' : '120px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: isCurrentMonth ? 1 : 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            position: 'relative',
                            borderBottom: '1px solid var(--border)',
                            borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isCurrentMonth ? 'rgba(0, 230, 118, 0.03)' : 'rgba(0,0,0,0.04)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)';
                        }}
                    >
                        <div style={{
                            fontSize: '14px',
                            fontWeight: isTodayDay ? '800' : '600',
                            color: isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: isTodayDay ? 'rgba(0, 230, 118, 0.1)' : 'transparent'
                        }}>
                            {day.getDate()}
                        </div>

                        {/* Booking Indicators */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px' }}>
                            {dayBookings.slice(0, 5).map((b, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: getBookingColor(b.status)
                                    }}
                                />
                            ))}
                            {dayBookings.length > 5 && (
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                    +{dayBookings.length - 5}
                                </span>
                            )}
                        </div>

                        {/* Summary text if space allowed */}
                        {!isMobile && dayBookings.length > 0 && (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                marginTop: 'auto',
                                fontWeight: '500'
                            }}>
                                {dayBookings.length} {dayBookings.length === 1 ? 'reserva' : 'reservas'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
