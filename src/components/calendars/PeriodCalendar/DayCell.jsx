import React from 'react';
import { isToday } from '../shared/utils';

export default function DayCell({
    day,
    bookings,
    crossDayBookings,
    isCurrentMonth,
    onCreateBooking,
    onBookingClick,
    isMobile
}) {
    const isTodayDay = isToday(day);
    const isBooked = bookings.length > 0;
    const hasCrossDayBooking = crossDayBookings.length > 0;

    // Determinar si es inicio o fin de reserva que cruza días
    const crossDayStart = crossDayBookings.find(b => {
        let bDateKey = b.date;
        if (b.date.includes('/')) {
            const [d, m, y] = b.date.split('/');
            bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        return bDateKey === dayKey;
    });

    const crossDayEnd = crossDayBookings.find(b => {
        const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        return b.metadata?.endDate === dayKey;
    });

    return (
        <div
            onClick={() => {
                if (isBooked) {
                    onBookingClick && onBookingClick(bookings[0]);
                } else {
                    onCreateBooking && onCreateBooking();
                }
            }}
            style={{
                backgroundColor: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                padding: '8px 10px',
                minHeight: isMobile ? '65px' : '72px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isCurrentMonth ? 1 : 0.4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '4px',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: isTodayDay ? 'var(--primary-paddle)' : 'var(--border)',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                if (isCurrentMonth) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Top row: Date Number */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '14px',
                    fontWeight: isTodayDay ? '800' : '700',
                    color: isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isTodayDay ? 'rgba(0, 230, 118, 0.15)' : 'transparent'
                }}>
                    {day.getDate()}
                </div>
            </div>

            {/* Estado de disponibilidad */}
            {isCurrentMonth && (
                <div style={{ width: '100%' }}>
                    {isBooked ? (
                        (() => {
                            const booking = bookings[0];
                            const status = booking.status;

                            const statusConfig = {
                                pending: {
                                    bg: '#FEF3C7',
                                    color: '#D97706',
                                    icon: '⏳',
                                    label: 'Pendiente'
                                },
                                confirmed: {
                                    bg: '#DBEAFE',
                                    color: '#1D4ED8',
                                    icon: '✓',
                                    label: 'Confirmado'
                                },
                                deposit_paid: {
                                    bg: '#FED7AA',
                                    color: '#EA580C',
                                    icon: '💰',
                                    label: 'Señado'
                                },
                                cancelled: {
                                    bg: '#FEE2E2',
                                    color: '#DC2626',
                                    icon: '✗',
                                    label: 'Cancelado'
                                },
                                completed: {
                                    bg: '#D1FAE5',
                                    color: '#059669',
                                    icon: '✓',
                                    label: 'Completado'
                                },
                                blocked: {
                                    bg: '#E5E7EB',
                                    color: '#374151',
                                    icon: '🚫',
                                    label: 'Bloqueado'
                                }
                            };

                            const config = statusConfig[status] || statusConfig.pending;

                            return (
                                <div style={{
                                    width: '100%',
                                    background: config.bg,
                                    borderRadius: '6px',
                                    padding: '5px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    <span style={{ fontSize: '11px' }}>{config.icon}</span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: config.color,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {booking.customer_name || config.label}
                                    </span>
                                </div>
                            );
                        })()
                    ) : (
                        <div style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 0'
                        }}>
                            <div style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: '1.5px dashed var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                opacity: 0.6,
                                transition: 'all 0.2s ease'
                            }}>
                                +
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Indicador de reserva que cruza días */}
            {hasCrossDayBooking && crossDayStart && (
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    fontSize: '16px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} title={`Desde ${crossDayStart.time || '19:00'}`}>
                    🌙
                </div>
            )}

            {hasCrossDayBooking && crossDayEnd && (
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    fontSize: '16px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} title={`Hasta ${crossDayEnd.metadata?.endTime || '15:00'}`}>
                    🌅
                </div>
            )}
        </div>
    );
}
