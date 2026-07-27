import React, { useState, useEffect } from 'react';
import BookingCard from './BookingCard';
import { generateTimeSlots, formatDateKey, getBookingsForSlot } from '../shared/utils';

export default function WeekView({
    type,
    config,
    business,
    businessHours,
    resources,
    bookings,
    displayDays,
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
    const [selectedResourceId, setSelectedResourceId] = useState('all');

    const activeResources = (resources && resources.length > 0)
        ? (selectedResourceId === 'all' ? resources : resources.filter(r => String(r.id) === String(selectedResourceId)))
        : [{ id: 'default', name: 'General' }];

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

    const handleSlotClick = (e, day, time, resource = null) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setShowSlotMenu({
            date: day,
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

    // Calcular cuántos slots ocupa una reserva
    const calculateSlotSpan = (booking) => {
        const duration = booking.duration || 60;
        return Math.ceil(duration / config.slotSize);
    };

    // Verificar si este es el primer slot de una reserva
    const isFirstSlotOfBooking = (booking, currentTime) => {
        return booking.time === currentTime;
    };

    return (
        <div style={{ width: '100%' }}>
            {resources && resources.length > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        🏟️ Canchas en Vista Semanal:
                    </span>
                    <button
                        onClick={() => setSelectedResourceId('all')}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: selectedResourceId === 'all' ? 'var(--primary-paddle)' : 'rgba(255,255,255,0.05)',
                            color: selectedResourceId === 'all' ? '#000' : 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        Todas las Canchas ({resources.length})
                    </button>
                    {resources.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedResourceId(r.id)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: String(selectedResourceId) === String(r.id) ? 'var(--primary-paddle)' : 'rgba(255,255,255,0.05)',
                                color: String(selectedResourceId) === String(r.id) ? '#000' : 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `70px repeat(${displayDays.length * activeResources.length}, minmax(${activeResources.length > 1 ? '110px' : '100px'}, 1fr))`,
                    gridAutoRows: `${config.gridRowHeight}px`,
                    minWidth: `${Math.max(800, 70 + displayDays.length * activeResources.length * 110)}px`,
                    width: '100%'
                }}>
                    {/* Empty corner (Top-Left) */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        zIndex: 30,
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        height: activeResources.length > 1 ? '56px' : '64px'
                    }} />

                    {/* Day Headers - cada día ocupa múltiples columnas (una por cancha) */}
                    {displayDays.map((day, dayIdx) => {
                        const isToday = formatDateKey(day) === formatDateKey(new Date());

                        return (
                            <div
                                key={dayIdx}
                                style={{
                                    gridColumn: `span ${activeResources.length}`,
                                    padding: '6px 4px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid var(--border)',
                                    borderRight: dayIdx < displayDays.length - 1 ? '1px solid var(--border)' : 'none',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 25,
                                    background: isToday ? 'rgba(0, 230, 118, 0.05)' : 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: activeResources.length > 1 ? '56px' : '64px'
                                }}
                            >
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: isToday ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                    marginBottom: '1px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    color: isToday ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                    width: '28px',
                                    height: '28px',
                                    lineHeight: '28px',
                                    borderRadius: '50%',
                                    background: isToday ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}

                    {/* Sub-header row showing court names if multiple resources */}
                    {activeResources.length > 1 && (
                        <>
                            <div style={{
                                position: 'sticky',
                                top: '56px',
                                left: 0,
                                zIndex: 30,
                                background: 'var(--bg-card)',
                                borderBottom: '2px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                height: '28px'
                            }} />
                            {displayDays.map((day, dayIdx) => (
                                activeResources.map((res, resIdx) => {
                                    const shortName = (res.name || '').split('(')[0].trim() || res.name;
                                    return (
                                        <div
                                            key={`sub-header-${dayIdx}-${resIdx}`}
                                            style={{
                                                position: 'sticky',
                                                top: '56px',
                                                zIndex: 24,
                                                background: 'var(--bg-card)',
                                                borderBottom: '2px solid var(--border)',
                                                borderRight: (resIdx === activeResources.length - 1 && dayIdx < displayDays.length - 1) ? '1px solid var(--border)' : '0.5px solid rgba(0,0,0,0.05)',
                                                padding: '4px 2px',
                                                textAlign: 'center',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: 'var(--primary-paddle)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                height: '28px',
                                                lineHeight: '20px'
                                            }}
                                            title={res.name}
                                        >
                                            {shortName}
                                        </div>
                                    );
                                })
                            ))}
                        </>
                    )}

                    {/* Time Slots */}
                    {timeSlots.map((time) => (
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

                            {/* Día × Cancha Columns */}
                            {displayDays.map((day, dayIdx) => (
                                activeResources.map((resource, resourceIdx) => {
                                    // Filter bookings for this specific resource
                                    const slotBookings = getBookingsForSlot(
                                        bookings.filter(b => {
                                            if (b.court_id === resource.id) return true;
                                            if (b.specialist_id === resource.id) return true;
                                            if (b.resource_id === resource.id) return true;
                                            return false;
                                        }),
                                        day,
                                        time,
                                        config.slotSize
                                    );

                                    const isToday = formatDateKey(day) === formatDateKey(new Date());
                                    const isLastResourceOfDay = resourceIdx === activeResources.length - 1;
                                    const isLastDay = dayIdx === displayDays.length - 1;

                            return (
                                <div
                                    key={`${day}-${resource.id}-${time}`}
                                    style={{
                                        borderBottom: '1px solid var(--border)',
                                        borderRight: (isLastResourceOfDay && !isLastDay) ? '1px solid var(--border)' : '0.5px solid rgba(0,0,0,0.05)',
                                        minHeight: `${config.gridRowHeight}px`,
                                        padding: '4px',
                                        position: 'relative',
                                        background: isToday ? 'rgba(0, 230, 118, 0.02)' : 'transparent',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    {slotBookings.length > 0 ? (
                                        slotBookings.map((booking, idx) => {
                                            // Solo renderizar en el primer slot
                                            if (!isFirstSlotOfBooking(booking, time)) {
                                                return null;
                                            }

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
                                                        showDuration={false}
                                                        showTimeRange={false}
                                                        isRescheduling={isRescheduling}
                                                        isSelected={reschedulingBooking?.id === booking.id}
                                                    />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div
                                            onClick={(e) => {
                                                if (isRescheduling) {
                                                    onMoveBooking && onMoveBooking(
                                                        reschedulingBooking.id,
                                                        formatDateKey(day),
                                                        time,
                                                        resource.id
                                                    );
                                                } else {
                                                    handleSlotClick(e, day, time, resource);
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
                    ))}
                </React.Fragment>
            ))}
            </div>

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
            </div>

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
