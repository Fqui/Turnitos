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
            bg: '#6B7280',
            border: '#4B5563',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.92)',
            icon: '⏳',
            label: 'Pendiente'
        },
        deposit_paid: {
            bg: '#D97706',
            border: '#B45309',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.95)',
            icon: '💰',
            label: 'Señado'
        },
        confirmed: {
            bg: '#059669',
            border: '#047857',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.95)',
            icon: '✓',
            label: 'Confirmado'
        },
        completed: {
            bg: '#2563EB',
            border: '#1D4ED8',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.95)',
            icon: '✓',
            label: 'Finalizado'
        },
        attended: {
            bg: '#2563EB',
            border: '#1D4ED8',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.95)',
            icon: '✓',
            label: 'Asistido'
        },
        cancelled: {
            bg: '#DC2626',
            border: '#B91C1C',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.92)',
            icon: '✕',
            label: 'Cancelado'
        },
        blocked: {
            bg: '#374151',
            border: '#1F2937',
            color: '#FFFFFF',
            subColor: 'rgba(255, 255, 255, 0.88)',
            icon: '🔒',
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
                padding: isMobile ? '8px 4px' : '8px 8px',
                minHeight: isMobile ? '70px' : '78px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isCurrentMonth ? 1 : 0.35,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '4px',
                borderRadius: isMobile ? '10px' : '12px',
                border: (isCurrentMonth && isBooked && config)
                    ? `1px solid ${config.border}`
                    : (isTodayDay ? '2px solid var(--primary-paddle)' : '1px solid var(--border)'),
                boxShadow: (isCurrentMonth && isBooked && config)
                    ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                    : 'none',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif)'
            }}
            onMouseEnter={(e) => {
                if (isCurrentMonth) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = (isCurrentMonth && isBooked && config)
                    ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                    : 'none';
            }}
        >
            {/* Top row: Date Number */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: isMobile ? '13px' : '14px',
                    fontWeight: isTodayDay || isBooked ? '800' : '700',
                    color: isBooked ? '#FFFFFF' : (isTodayDay ? 'var(--primary-paddle)' : 'var(--text-primary)'),
                    minWidth: isMobile ? '20px' : '24px',
                    height: isMobile ? '20px' : '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    background: isTodayDay
                        ? (isBooked ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 230, 118, 0.18)')
                        : 'transparent',
                    letterSpacing: '-0.02em'
                }}>
                    {day.getDate()}
                </span>
            </div>

            {/* Estado / Nombre */}
            {isCurrentMonth && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isBooked && config ? (
                        <div style={{
                            width: '100%',
                            textAlign: 'center',
                            padding: '2px 0'
                        }}>
                            {isMobile ? (
                                <>
                                    <div style={{ fontSize: '14px', lineHeight: 1, marginBottom: '2px' }}>
                                        {config.icon}
                                    </div>
                                    <div style={{
                                        fontSize: '9.5px',
                                        fontWeight: '800',
                                        color: config.subColor || '#FFFFFF',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: 1
                                    }}>
                                        {booking.status === 'blocked' || booking.is_blocked
                                            ? 'BLOQ'
                                            : (formatName(booking.customer_name)?.split(' ')[0] || config.label)}
                                    </div>
                                </>
                            ) : (
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: config.subColor || '#FFFFFF',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    letterSpacing: '-0.01em',
                                    lineHeight: '1.2',
                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                                }} title={booking.status === 'blocked' || booking.is_blocked ? (booking.customer_name || 'BLOQUEADO') : (booking.customer_name || config.label)}>
                                    {booking.status === 'blocked' || booking.is_blocked
                                        ? 'BLOQUEADO'
                                        : (formatName(booking.customer_name) || config.label)}
                                </div>
                            )}
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
                                width: isMobile ? '18px' : '20px',
                                height: isMobile ? '18px' : '20px',
                                borderRadius: '50%',
                                border: '1.5px dashed var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isMobile ? '11px' : '13px',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                opacity: 0.45,
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
