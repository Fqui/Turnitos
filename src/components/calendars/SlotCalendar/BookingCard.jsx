import React from 'react';
import { getBookingColor } from '../shared/config';
import { calculateSlotSpan } from '../shared/utils';

export default function BookingCard({
    booking,
    onClick,
    slotSize = 30,
    showDuration = true,
    showTimeRange = true,
    isRescheduling = false,
    isSelected = false,
    isDark = false
}) {
    const color = getBookingColor(booking.status, isDark);
    const slotSpan = calculateSlotSpan(booking.duration || 60, slotSize);

    // Calcular tiempo de fin
    const [startH, startM] = booking.time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = startMinutes + (booking.duration || 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const isCompact = slotSpan <= 1;

    // Label de la reserva
    const getLabel = () => {
        if (booking.status === 'blocked') return 'BLOQUEADO';
        return booking.customer_name || booking.customerName || 'Reserva';
    };

    // Sublabel (servicio/cancha)
    const getSubLabel = () => {
        if (booking.status === 'blocked') return null;
        if (booking.service_id && booking.services?.name) return booking.services.name;
        if (booking.court_id && booking.courts?.name) return booking.courts.name;
        return booking.service || null;
    };

    return (
        <div
            onClick={onClick}
            style={{
                height: '100%',
                width: '100%',
                background: color,
                color: '#fff',
                minHeight: isCompact ? 'auto' : '50px',
                borderRadius: '6px',
                padding: isCompact ? '2px 6px' : '8px 10px',
                fontSize: isCompact ? '11px' : '12px',
                overflow: 'hidden',
                cursor: booking.status === 'blocked' ? 'default' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                borderLeft: '3px solid rgba(0,0,0,0.3)',
                opacity: booking.status === 'cancelled' || (isRescheduling && !isSelected) ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: isCompact ? 'center' : 'center',
                alignItems: 'flex-start',
                gap: isCompact ? '0px' : '3px',
                border: isSelected ? '2px solid white' : 'none',
                position: 'relative',
                zIndex: isSelected ? 5 : 1,
                transition: 'all 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: isCompact ? '1.1' : '1.2'
            }}
            title={booking.status === 'blocked' ? 'BLOQUEADO' : `${getLabel()} - ${getSubLabel() || ''}`}
            onMouseEnter={(e) => {
                if (booking.status !== 'blocked') {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }}
        >
            {/* Contenedor flexible para modo compacto y normal */}
            <div style={{
                display: 'flex',
                flexDirection: isCompact ? 'row' : 'column',
                flexWrap: isCompact ? 'wrap' : 'nowrap',
                alignItems: isCompact ? 'center' : 'flex-start',
                gap: isCompact ? '4px' : '0px',
                width: '100%'
            }}>
                {/* Nombre del cliente */}
                <span style={{
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%', // Asegura que no rompa el layout
                    fontSize: isCompact ? '12px' : '13px',
                    letterSpacing: '-0.01em'
                }}>
                    {getLabel()}
                </span>

                {/* Sublabel (servicio/cancha) */}
                {getSubLabel() && (
                    <span style={{
                        opacity: 0.95,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        fontSize: isCompact ? '10px' : '11px',
                        fontWeight: '500'
                    }}>
                        {isCompact && getLabel() ? '• ' : ''}{getSubLabel()}
                    </span>
                )}
            </div>

            {/* Duración y Hora - Ocultar en muy compacto si es necesario, o mostrar inline */}
            {!isCompact && (
                <>
                    {showDuration && booking.status !== 'blocked' && (
                        <span style={{ opacity: 0.9, fontSize: '11px', fontWeight: '700' }}>
                            {booking.duration} min
                        </span>
                    )}
                    {showTimeRange && booking.status !== 'blocked' && (
                        <span style={{ opacity: 0.85, fontSize: '10px', fontWeight: '600' }}>
                            {booking.time} - {endTime}
                        </span>
                    )}
                </>
            )}

            {/* Modo compacto: Mostrar duración/hora solo si hay espacio o simplificado */}
            {isCompact && booking.status !== 'blocked' && (
                <div style={{ display: 'flex', gap: '4px', opacity: 0.9, fontSize: '10px' }}>
                    {showDuration && <span>{booking.duration}m</span>}
                    {showTimeRange && <span>{booking.time}</span>}
                </div>
            )}
        </div>
    );
}
