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
            bg: 'rgba(156, 163, 175, 0.16)',
            border: 'rgba(156, 163, 175, 0.6)',
            color: '#E5E7EB',
            dot: '#9CA3AF',
            label: 'Pendiente'
        },
        deposit_paid: {
            bg: 'rgba(245, 158, 11, 0.20)',
            border: 'rgba(245, 158, 11, 0.7)',
            color: '#FDE68A',
            dot: '#F59E0B',
            label: 'Señado'
        },
        confirmed: {
            bg: 'rgba(16, 185, 129, 0.20)',
            border: 'rgba(16, 185, 129, 0.7)',
            color: '#A7F3D0',
            dot: '#10B981',
            label: 'Confirmado'
        },
        completed: {
            bg: 'rgba(37, 99, 235, 0.22)',
            border: 'rgba(59, 130, 246, 0.7)',
            color: '#BFDBFE',
            dot: '#3B82F6',
            label: 'Finalizado'
        },
        attended: {
            bg: 'rgba(37, 99, 235, 0.22)',
            border: 'rgba(59, 130, 246, 0.7)',
            color: '#BFDBFE',
            dot: '#3B82F6',
            label: 'Asistido'
        },
        cancelled: {
            bg: 'rgba(239, 68, 68, 0.18)',
            border: 'rgba(239, 68, 68, 0.6)',
            color: '#FECACA',
            dot: '#EF4444',
            label: 'Cancelado'
        },
        blocked: {
            bg: 'rgba(75, 85, 99, 0.28)',
            border: 'rgba(107, 114, 128, 0.6)',
            color: '#E5E7EB',
            dot: '#9CA3AF',
            label: 'Bloqueado'
        }
    };

    const booking = bookings[0];
    const status = booking ? booking.status : null;
    const config = status ? (statusStyles[status] || statusStyles.pending) : null;

    // Format customer name nicely to Title Case if all caps or lowercase
    const formatName = (text) => {
        if (!text) return '';
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

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
                padding: '8px 8px',
                minHeight: isMobile ? '68px' : '78px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isCurrentMonth ? 1 : 0.35,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px',
                borderRadius: '12px',
                border: '1.5px solid',
                borderColor: (isCurrentMonth && isBooked && config)
                    ? config.border
                    : (isTodayDay ? 'var(--primary-paddle)' : 'var(--border)'),
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif)'
            }}
            onMouseEnter={(e) => {
                if (isCurrentMonth) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Top row: Date Number & Status Indicator */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: '14px',
                    fontWeight: isTodayDay || isBooked ? '800' : '700',
                    color: isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)',
                    minWidth: '24px',
                    height: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    background: isTodayDay ? 'rgba(0, 230, 118, 0.18)' : 'transparent',
                    letterSpacing: '-0.02em'
                }}>
                    {day.getDate()}
                </span>

                {isBooked && config && (
                    <div style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: config.dot,
                        boxShadow: `0 0 6px ${config.dot}`
                    }} />
                )}
            </div>

            {/* Estado / Nombre de cliente */}
            {isCurrentMonth && (
                <div style={{ width: '100%' }}>
                    {isBooked && config ? (
                        <div style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '2px 0'
                        }}>
                            <div style={{
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: '700',
                                color: config.color,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                letterSpacing: '-0.01em',
                                lineHeight: '1.2'
                            }} title={booking.customer_name || config.label}>
                                {formatName(booking.customer_name) || config.label}
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
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: '1.5px dashed var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                opacity: 0.5,
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
