import React, { useState, useEffect } from 'react';
import BookingCard from './BookingCard';
import { generateTimeSlots, formatDateKey, getBookingsForSlot, timeToMinutes } from '../shared/utils';
import ConfirmModal from '../../common/ConfirmModal';

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
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

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

    // Auto-scroll to current time on mount (only for today)
    useEffect(() => {
        const scrollToCurrentTime = () => {
            const now = new Date();
            const isToday = formatDateKey(now) === formatDateKey(currentDate);

            if (isToday) {
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                // Find closest previous slot
                // Assuming slots are ordered, string comparison works well enough for "HH:MM"
                // but let's be more robust if possible.
                // Simple approach: Construct "HH:MM" and find match. 
                // Since slots are generated based on start/end, we might not match exact minute if it's 10:17

                // Round down to nearest slot
                const slotMinutes = config.slotSize;
                const roundedMinutes = Math.floor(currentMinute / slotMinutes) * slotMinutes;
                const timeString = `${String(currentHour).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;

                // Try to find exact match
                let element = document.getElementById(`time-slot-${timeString}`);

                // If not found (maybe outside business hours?), try fallback or just closest valid slot
                if (!element) {
                    // Find first slot that is AFTER current time? No, we want to see current time.
                    // Just filtering timeSlots to find closest?
                    // Let's just try the constructed string. If it fails, maybe user is outside execution hours.
                }

                if (element) {
                    // Scroll with a bit of offset so it's not at the very top edge
                    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            }
        };

        // Small timeout to ensure rendering is complete
        setTimeout(scrollToCurrentTime, 100);
    }, [currentDate, config.slotSize]);

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

        const slotMin = timeToMinutes(time);

        // Verificar si es horario cortado (con open/close/open2/close2)
        if (dayConfig?.isSplit) {
            const start1 = timeToMinutes(dayConfig.open);
            let close1 = timeToMinutes(dayConfig.close);
            if (close1 < start1) close1 += 1440; // Cruzado a medianoche

            const inFirstShift = slotMin >= start1 && slotMin < close1;

            let inSecondShift = false;
            if (dayConfig.open2 && dayConfig.close2) {
                const start2 = timeToMinutes(dayConfig.open2);
                let close2 = timeToMinutes(dayConfig.close2);
                if (close2 < start2) close2 += 1440; // Cruzado a medianoche
                inSecondShift = slotMin >= start2 && slotMin < close2;
            }

            return inFirstShift || inSecondShift;
        }

        // Horario continuo
        if (dayConfig?.open && dayConfig?.close) {
            const start = timeToMinutes(dayConfig.open);
            let close = timeToMinutes(dayConfig.close);
            if (close < start) close += 1440; // Cruzado a medianoche
            return slotMin >= start && slotMin < close;
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
                ? `70px repeat(${resources.length}, minmax(0, 1fr))`
                : '70px minmax(0, 1fr)',
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

                // Check if this slot corresponds to current time
                const isCurrentSlot = (() => {
                    if (formatDateKey(currentDate) !== formatDateKey(new Date())) return false;
                    const [slotHour, slotMinute] = time.split(':').map(Number);
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();

                    if (slotHour !== currentHour) return false;

                    // Check if current minute falls within this slot
                    return currentMinute >= slotMinute && currentMinute < slotMinute + config.slotSize;
                })();

                return (
                    <React.Fragment key={time}>
                        {/* Time Column */}
                        <div
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    title: 'Bloquear Horario Global',
                                    message: `¿Deseas bloquear TODAS las canchas/especialistas para las ${time} hs de hoy?`,
                                    confirmText: 'Sí, bloquear todos',
                                    isDanger: true,
                                    onConfirm: () => onBlockSlot && onBlockSlot(currentDate, time, null)
                                });
                            }}
                            title="Click para bloquear todos los recursos a esta hora"
                            style={{
                                padding: '10px',
                                textAlign: 'center',
                                fontSize: '12px',
                                borderBottom: isCurrentSlot ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                position: 'sticky',
                                left: 0,
                                background: isCurrentSlot ? 'var(--primary-paddle)' : 'var(--bg-card)',
                                color: isCurrentSlot ? '#ffffff' : 'var(--text-secondary)',
                                fontWeight: isCurrentSlot ? '700' : '500',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!isCurrentSlot) e.currentTarget.style.background = 'var(--bg-main)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isCurrentSlot) e.currentTarget.style.background = 'var(--bg-card)';
                            }}
                            id={`time-slot-${time}`}
                        >
                            {time}
                        </div>

                        {/* Resource Columns */}
                        {config.showResourceColumns ? (
                            resources.map((resource, j) => {
                                // Filter bookings for this specific resource
                                const slotBookings = getBookingsForSlot(
                                    bookings.filter(b => {
                                        // Global blocks (apply to all resources)
                                        if (b.status === 'blocked' && !b.court_id && !b.service_id && !b.resource_id) return true;

                                        // Match by court_id (for sports)
                                        if (b.court_id === resource.id) return true;

                                        // Match by specialist_id (for services with assigned specialist)
                                        if (b.specialist_id === resource.id) return true;

                                        // Match by resource_id (generic)
                                        if (b.resource_id === resource.id) return true;

                                        return false;
                                    }),
                                    currentDate,
                                    time,
                                    config.slotSize
                                );

                                return (
                                    <div
                                        key={`${resource.id}-${time}`}
                                        style={{
                                            borderBottom: isCurrentSlot ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                            borderTop: isCurrentSlot ? '2px solid var(--primary-paddle)' : 'none',
                                            borderRight: j < resources.length - 1 ? '1px solid var(--border)' : 'none',
                                            minHeight: `${config.gridRowHeight}px`,
                                            padding: '4px',
                                            position: 'relative',
                                            background: isCurrentSlot ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                                            cursor: 'default',
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
                                    borderBottom: isCurrentSlot ? '2px solid var(--primary-paddle)' : '1px solid var(--border)',
                                    borderTop: isCurrentSlot ? '2px solid var(--primary-paddle)' : 'none',
                                    position: 'relative',
                                    background: !isOpen
                                        ? 'repeating-linear-gradient(45deg, var(--bg-main), var(--bg-main) 10px, var(--border) 10px, var(--border) 11px)'
                                        : isCurrentSlot ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                                    opacity: !isOpen ? 0.6 : 1
                                }}
                            >
                                {(() => {
                                    const slotBookings = getBookingsForSlot(
                                        bookings,
                                        currentDate,
                                        time,
                                        config.slotSize
                                    );

                                    if (slotBookings.length > 0) {
                                        return slotBookings.map((booking, idx) => {
                                            if (!isFirstSlotOfBooking(booking, time)) return null;

                                            const slotSpan = calculateSlotSpan(booking);
                                            const cardHeight = (config.gridRowHeight * slotSpan) - 8;

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
                                                        showTimeRange={true}
                                                        isRescheduling={isRescheduling}
                                                        isSelected={reschedulingBooking?.id === booking.id}
                                                    />
                                                </div>
                                            );
                                        });
                                    }

                                    if (isOpen) {
                                        return (
                                            <div
                                                onClick={(e) => {
                                                    if (isRescheduling) {
                                                        // No resource ID for single column? Pass null or handle in parent
                                                        onMoveBooking && onMoveBooking(
                                                            reschedulingBooking.id,
                                                            formatDateKey(currentDate),
                                                            time,
                                                            null
                                                        );
                                                    } else {
                                                        handleSlotClick(e, time, null);
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
                                        );
                                    }
                                    return null;
                                })()}
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
        }
      `}</style>
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                isDanger={confirmModal.isDanger}
                onConfirm={() => confirmModal.onConfirm && confirmModal.onConfirm()}
                onClose={() => setConfirmModal({ isOpen: false })}
            />
        </div>
    );
}
