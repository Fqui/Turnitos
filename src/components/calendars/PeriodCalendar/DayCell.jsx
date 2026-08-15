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

    const statusStyles = {
        pending: {
            bg: 'rgba(156, 163, 175, 0.18)',
            border: 'var(--status-pending, #9CA3AF)',
            color: 'var(--status-pending, #4B5563)',
            label: 'Pendiente'
        },
        deposit_paid: {
            bg: 'rgba(245, 158, 11, 0.22)',
            border: 'var(--status-deposit, #F59E0B)',
            color: '#B45309',
            label: 'Señado'
        },
        confirmed: {
            bg: 'rgba(62, 207, 142, 0.25)',
            border: 'var(--status-confirmed, #3ECF8E)',
            color: '#047857',
            label: 'Confirmado'
        },
        completed: {
            bg: 'rgba(16, 185, 129, 0.22)',
            border: 'var(--status-completed, #10B981)',
            color: '#065F46',
            label: 'Finalizado'
        },
        attended: {
            bg: 'rgba(5, 150, 105, 0.22)',
            border: 'var(--status-attended, #059669)',
            color: '#065F46',
            label: 'Asistido'
        },
        cancelled: {
            bg: 'rgba(239, 68, 68, 0.18)',
            border: 'var(--status-cancelled, #EF4444)',
            color: '#DC2626',
            label: 'Cancelado'
        },
        blocked: {
            bg: 'rgba(55, 65, 81, 0.22)',
            border: 'var(--status-blocked, #374151)',
            color: '#1F2937',
            label: 'Bloqueado'
        }
    };

    const booking = bookings[0];
    const status = booking ? booking.status : null;
    const config = status ? (statusStyles[status] || statusStyles.pending) : null;

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
                backgroundColor: isCurrentMonth
                    ? (isBooked && config ? config.bg : 'var(--bg-card)')
                    : 'rgba(0,0,0,0.02)',
                padding: '8px 6px',
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
                borderColor: (isCurrentMonth && isBooked && config)
                    ? config.border
                    : (isTodayDay ? 'var(--primary-paddle)' : 'var(--border)'),
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
                    fontWeight: isTodayDay || isBooked ? '800' : '700',
                    color: (isBooked && config) ? config.color : (isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)'),
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isTodayDay ? 'rgba(0, 230, 118, 0.2)' : 'transparent'
                }}>
                    {day.getDate()}
                </div>
            </div>

            {/* Estado de disponibilidad / Nombre de cliente */}
            {isCurrentMonth && (
                <div style={{ width: '100%' }}>
                    {isBooked && config ? (
                        <div style={{
                            width: '100%',
                            textAlign: 'center',
                            padding: '2px 0'
                        }}>
                            <div style={{
                                fontSize: isMobile ? '10.5px' : '11.5px',
                                fontWeight: '800',
                                color: config.color,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                letterSpacing: '-0.01em'
                            }}>
                                {booking.customer_name || config.label}
                            </div>
                        </div>
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
