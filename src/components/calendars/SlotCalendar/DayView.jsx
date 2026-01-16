import React, { useState, useEffect } from 'react';
import BookingCard from './BookingCard';
import { generateTimeSlots, formatDateKey, getBookingsForSlot } from '../shared/utils';

export default function DayView({
    type,
    config,
    business,
    businessHours,
    resources,
    bookings,
    currentDate,
    onCreateBooking,
    onBookingClick,
    onBlockSlot,
    onUnblockSlot,
    onMoveBooking,
    isRescheduling,
    reschedulingBooking,
    onStartReschedule,
    isMobile
}) {
    const [showSlotMenu, setShowSlotMenu] = useState(null);
    const [showBookingMenu, setShowBookingMenu] = useState(null);

    // Generar slots de tiempo
    const timeSlots = generateTimeSlots(businessHours.start, businessHours.end, config.slotSize);

    // Cerrar menús al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showSlotMenu && !e.target.closest('.slot-menu')) {
                setShowSlotMenu(null);
            }
            if (showBookingMenu && !e.target.closest('.booking-menu')) {
                setShowBookingMenu(null);
            }
        };

        if (showSlotMenu || showBookingMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showSlotMenu, showBookingMenu]);

    const handleSlotClick = (e, time, resource = null) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setShowSlotMenu({
            date: currentDate,
            time,
            resource,
            x: rect.left + rect.width / 2,
            y: rect.top
        });
    };

    const handleCreateBooking = () => {
        if (showSlotMenu) {
            onCreateBooking(showSlotMenu.date, showSlotMenu.time, showSlotMenu.resource);
            setShowSlotMenu(null);
        }
    };

    const handleBlockSlot = () => {
        if (showSlotMenu && onBlockSlot) {
            onBlockSlot(showSlotMenu.date, showSlotMenu.time, showSlotMenu.resource);
            setShowSlotMenu(null);
        }
    };

    // Verificar si el negocio está abierto en un día/hora específico
    const isBusinessOpen = (time) => {
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = daysMap[currentDate.getDay()];
        const dayConfig = business?.hours?.[dayKey];

        if (dayConfig?.isOpen === false) return false;

        // Verificar si es horario cortado
        if (dayConfig?.isSplit) {
            const breakStart = dayConfig.breakStart || '13:00';
            const breakEnd = dayConfig.breakEnd || '16:00';
            if (time >= breakStart && time < breakEnd) {
                return false; // Cerrado en el descanso
            }
        }

        return true;
    };

    // Calcular cuántos slots ocupa una reserva
    const calculateSlotSpan = (booking) => {
        const duration = booking.duration || 60;
        return Math.ceil(duration / config.slotSize);
    };

    // Verificar si este es el primer slot de una reserva (para renderizar la tarjeta)
    const isFirstSlotOfBooking = (booking, currentTime) => {
        return booking.time === currentTime;
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: config.showResourceColumns
                ? `70px repeat(${resources.length}, 1fr)`
                : '70px 1fr',
            gridAutoRows: `${config.gridRowHeight}px`,
            minWidth: isMobile ? 'auto' : '900px',
            width: '100%'
        }}>
            {/* Header Row */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                borderRight: '1px solid var(--border)'
            }}></div>

            {/* Resource Headers (Canchas/Especialistas) */}
            {config.showResourceColumns && resources.map((resource, i) => (
                <div key={resource.id} style={{
                    padding: '16px 12px',
                    textAlign: 'center',
                    borderBottom: '2px solid var(--border)',
                    borderRight: i < resources.length - 1 ? '1px solid var(--border)' : 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background: 'linear-gradient(to bottom, var(--bg-card) 0%, var(--bg-card) 90%, rgba(0,0,0,0.02) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    {type === 'padel' && (
                        <span style={{ fontSize: '24px', lineHeight: '1' }}>🎾</span>
                    )}
                    {type === 'futbol' && (
                        <span style={{ fontSize: '24px', lineHeight: '1' }}>⚽</span>
                    )}
                    <span style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        lineHeight: '1.2',
                        letterSpacing: '-0.02em'
                    }}>
                        {resource.name}
                    </span>
                </div>
            ))}
            {/* Time Slots */}
            {timeSlots.map((time) => {
                const isOpen = isBusinessOpen(time);

                return (
                    <React.Fragment key={time}>
                        {/* Time Column */}
                        <div style={{
                            padding: '10px',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            position: 'sticky',
                            left: 0,
                            background: 'var(--bg-card)',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {time}
                        </div>

                        {/* Resource Columns */}
                        {config.showResourceColumns ? (
                            resources.map((resource, j) => {
                                const slotBookings = getBookingsForSlot(
                                    bookings.filter(b => b.court_id === resource.id || b.specialist_id === resource.id),
                                    currentDate,
                                    time,
                                    config.slotSize
                                );

                                return (
                                    <div
                                        key={`${resource.id}-${time}`}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            borderRight: j < resources.length - 1 ? '1px solid var(--border)' : 'none',
                                            minHeight: `${config.gridRowHeight}px`,
                                            padding: '4px',
                                            position: 'relative',
                                            background: !isOpen
                                                ? 'repeating-linear-gradient(45deg, var(--bg-main), var(--bg-main) 10px, var(--border) 10px, var(--border) 11px)'
                                                : 'transparent',
                                            opacity: !isOpen ? 0.6 : 1,
                                            cursor: !isOpen ? 'not-allowed' : 'default',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                    >
                                        {slotBookings.length > 0 ? (
                                            slotBookings.map((booking, idx) => {
                                                // Solo renderizar la tarjeta en el primer slot de la reserva
                                                if (!isFirstSlotOfBooking(booking, time)) {
                                                    return null;
                                                }

                                                const slotSpan = calculateSlotSpan(booking);
                                                const cardHeight = (config.gridRowHeight * slotSpan) - 8; // -8 por padding

                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            left: '4px',
                                                            right: '4px',
                                                            height: `${cardHeight}px`,
                                                            zIndex: 2
                                                        }}
                                                    >
                                                        <BookingCard
                                                            booking={booking}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isRescheduling) return;
                                                                if (booking.status === 'pending' || booking.status === 'deposit_paid') {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setShowBookingMenu({
                                                                        booking,
                                                                        x: rect.left + rect.width / 2,
                                                                        y: rect.top
                                                                    });
                                                                } else {
                                                                    onBookingClick && onBookingClick(booking);
                                                                }
                                                            }}
                                                            slotSize={config.slotSize}
                                                            showDuration={type !== 'futbol'}
                                                            showTimeRange={type === 'padel'}
                                                            isRescheduling={isRescheduling}
                                                            isSelected={reschedulingBooking?.id === booking.id}
                                                        />
                                                    </div>
                                                );
                                            })
                                        ) : isOpen && (
                                            <div
                                                onClick={(e) => {
                                                    if (isRescheduling) {
                                                        onMoveBooking && onMoveBooking(
                                                            reschedulingBooking.id,
                                                            formatDateKey(currentDate),
                                                            time,
                                                            resource.id
                                                        );
                                                    } else {
                                                        handleSlotClick(e, time, resource);
                                                    }
                                                }}
                                                style={{
                                                    flex: 1,
                                                    minHeight: '100%',
                                                    borderRadius: '8px',
                                                    border: '1.5px dashed rgba(0,0,0,0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: 'rgba(0,0,0,0.15)',
                                                    fontSize: '20px',
                                                    fontWeight: '300',
                                                    transition: 'all 0.2s',
                                                    background: 'transparent'
                                                }}
                                                className="slot-add-area"
                                            >
                                                +
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            // Single column (no resources)
                            <div
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                    minHeight: `${config.gridRowHeight}px`,
                                    padding: '4px',
                                    background: !isOpen
                                        ? 'repeating-linear-gradient(45deg, var(--bg-main), var(--bg-main) 10px, var(--border) 10px, var(--border) 11px)'
                                        : 'transparent',
                                    opacity: !isOpen ? 0.6 : 1
                                }}
                            >
                                {/* Single column logic */}
                            </div>
                        )}
                    </React.Fragment>
                );
            })}

            {/* Slot Menu */}
            {showSlotMenu && (
                <>
                    <div
                        className="slot-menu-overlay"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                            background: 'transparent'
                        }}
                        onClick={() => setShowSlotMenu(null)}
                    />
                    <div
                        className="slot-menu"
                        style={{
                            position: 'fixed',
                            left: showSlotMenu.x - 75,
                            top: showSlotMenu.y - 120,
                            width: '200px',
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.02)'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                {showSlotMenu.time} hs
                            </span>
                            <button
                                onClick={() => setShowSlotMenu(null)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <button
                            onClick={handleCreateBooking}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-main)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontSize: '18px' }}>📝</span>
                            Crear Reserva
                        </button>
                        <button
                            onClick={handleBlockSlot}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-main)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontSize: '18px' }}>🚫</span>
                            Bloquear Horario
                        </button>
                    </div>
                </>
            )}

            {/* Booking Menu */}
            {showBookingMenu && (
                <>
                    <div
                        className="booking-menu-overlay"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                            background: 'transparent'
                        }}
                        onClick={() => setShowBookingMenu(null)}
                    />
                    <div
                        className="booking-menu"
                        style={{
                            position: 'fixed',
                            left: showBookingMenu.x - 75,
                            top: showBookingMenu.y - 120,
                            width: '200px',
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.02)'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Opciones
                            </span>
                            <button
                                onClick={() => setShowBookingMenu(null)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                onStartReschedule && onStartReschedule(showBookingMenu.booking);
                                setShowBookingMenu(null);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--primary-paddle)',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-main)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontSize: '18px' }}>🔄</span>
                            Reprogramar
                        </button>
                        <button
                            onClick={() => {
                                onBookingClick && onBookingClick(showBookingMenu.booking);
                                setShowBookingMenu(null);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                width: '100%',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-main)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontSize: '18px' }}>ℹ️</span>
                            Información
                        </button>
                    </div>
                </>
            )}

            <style>{`
        .slot-add-area:hover {
          background-color: rgba(0, 230, 118, 0.04) !important;
          border-color: rgba(0, 230, 118, 0.3) !important;
          border-style: solid !important;
          color: rgba(0, 230, 118, 0.6) !important;
        }
      `}</style>
        </div>
    );
}
