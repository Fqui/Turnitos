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
                padding: '16px',
                minHeight: isMobile ? '100px' : '140px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isCurrentMonth ? 1 : 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderRadius: '12px',
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
            {/* Día del mes */}
            <div style={{
                fontSize: '18px',
                fontWeight: isTodayDay ? '800' : '600',
                color: isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: isTodayDay ? 'rgba(0, 230, 118, 0.1)' : 'transparent'
            }}>
                {day.getDate()}
            </div>

            {/* Estado de disponibilidad */}
            {isCurrentMonth && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1
                }}>
                    {isBooked ? (
                        (() => {
                            const booking = bookings[0];
                            const status = booking.status;

                            // Definir colores y etiquetas según el estado
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
                                    label: 'Seña Pagada'
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
                                    borderRadius: '8px',
                                    padding: '12px 8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '24px',
                                        marginBottom: '4px'
                                    }}>{config.icon}</div>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: config.color,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {config.label}
                                    </div>
                                    {booking.customer_name && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: config.color,
                                            marginTop: '2px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            opacity: 0.8
                                        }}>
                                            {booking.customer_name}
                                        </div>
                                    )}
                                    {booking.metadata?.eventName && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: config.color,
                                            marginTop: '2px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            opacity: 0.7
                                        }}>
                                            {booking.metadata.eventName}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div style={{
                            width: '100%',
                            background: '#D1FAE5',
                            borderRadius: '8px',
                            padding: '12px 8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '24px',
                                marginBottom: '4px'
                            }}>✓</div>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#059669'
                            }}>
                                Disponible
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
