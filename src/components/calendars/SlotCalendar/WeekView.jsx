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

    const COURT_COLORS = [
        { bg: 'rgba(0, 230, 118, 0.12)', text: '#00e676', border: 'rgba(0, 230, 118, 0.3)' },
        { bg: 'rgba(0, 229, 255, 0.12)', text: '#00e5ff', border: 'rgba(0, 229, 255, 0.3)' },
        { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
        { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
        { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' }
    ];

    const getResourceColor = (index) => {
        return COURT_COLORS[index % COURT_COLORS.length];
    };

    return (
        <div style={{ width: '100%' }}>
            {resources && resources.length > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    padding: '10px 16px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🏟️ Vista Semanal:
                    </span>
                    <button
                        onClick={() => setSelectedResourceId('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: selectedResourceId === 'all' ? '1px solid var(--primary-paddle)' : '1px solid transparent',
                            background: selectedResourceId === 'all' ? 'var(--primary-paddle)' : 'rgba(255,255,255,0.05)',
                            color: selectedResourceId === 'all' ? '#000000' : 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: selectedResourceId === 'all' ? '0 2px 10px rgba(0, 230, 118, 0.3)' : 'none'
                        }}
                    >
                        Todas las Canchas ({resources.length})
                    </button>
                    {resources.map((r, idx) => {
                        const colorInfo = getResourceColor(idx);
                        const isSelected = String(selectedResourceId) === String(r.id);
                        return (
                            <button
                                key={r.id}
                                onClick={() => setSelectedResourceId(r.id)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: `1px solid ${isSelected ? colorInfo.text : 'rgba(255,255,255,0.08)'}`,
                                    background: isSelected ? colorInfo.text : 'rgba(255,255,255,0.04)',
                                    color: isSelected ? '#000000' : 'var(--text-primary)',
                                    fontWeight: '700',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                ⚽ {r.name}
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ width: '100%', overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `70px repeat(${displayDays.length}, 1fr)`,
                    gridAutoRows: `${config.gridRowHeight}px`,
                    minWidth: '750px',
                    width: '100%'
                }}>
                    {/* Empty corner (Top-Left 70px x 56px) */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        zIndex: 30,
                        background: 'var(--bg-card)',
                        borderBottom: '2px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        height: '56px'
                    }} />

                    {/* Day Headers - 7 columnas exactas (LUN a DOM) */}
                    {displayDays.map((day, dayIdx) => {
                        const isToday = formatDateKey(day) === formatDateKey(new Date());

                        return (
                            <div
                                key={dayIdx}
                                style={{
                                    padding: '8px 4px',
                                    textAlign: 'center',
                                    borderBottom: '2px solid var(--border)',
                                    borderRight: dayIdx < displayDays.length - 1 ? '1px solid var(--border)' : 'none',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 25,
                                    background: isToday ? 'rgba(0, 230, 118, 0.06)' : 'var(--bg-card)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '56px'
                                }}
                            >
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: isToday ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                    marginBottom: '2px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px'
                                }}>
                                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    color: isToday ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                    width: '30px',
                                    height: '30px',
                                    lineHeight: '30px',
                                    borderRadius: '50%',
                                    background: isToday ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isToday ? '0 0 12px rgba(0, 230, 118, 0.3)' : 'none'
                                }}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}

                    {/* Time Slots */}
                    {timeSlots.map((time) => (
                        <React.Fragment key={time}>
                            {/* Time Column */}
                            <div
                                onClick={() => {
                                    if (window.confirm(`¿Deseas bloquear TODAS las canchas para las ${time} hs en este día?`)) {
                                        onBlockSlot && onBlockSlot(currentDate, time, null);
                                    }
                                }}
                                title="Click para bloquear todas las canchas a esta hora"
                                style={{
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
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                            >
                                {time}
                            </div>

                            {/* 7 Day Columns */}
                            {displayDays.map((day, dayIdx) => {
                                // Filter bookings for this day + selected active resources
                                const dayBookings = bookings.filter(b => {
                                    if (selectedResourceId !== 'all') {
                                        const matchesResource = String(b.court_id) === String(selectedResourceId) ||
                                            String(b.specialist_id) === String(selectedResourceId) ||
                                            String(b.resource_id) === String(selectedResourceId);
                                        if (!matchesResource) return false;
                                    }
                                    return true;
                                });

                                const slotBookings = getBookingsForSlot(
                                    dayBookings,
                                    day,
                                    time,
                                    config.slotSize
                                );

                                const isToday = formatDateKey(day) === formatDateKey(new Date());
                                const isLastDay = dayIdx === displayDays.length - 1;

                                return (
                                    <div
                                        key={`${day}-${time}`}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            borderRight: !isLastDay ? '1px solid var(--border)' : 'none',
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
                                                if (!isFirstSlotOfBooking(booking, time)) {
                                                    return null;
                                                }

                                                const slotSpan = calculateSlotSpan(booking);
                                                const cardHeight = (config.gridRowHeight * slotSpan) - 8;

                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            position: 'relative',
                                                            minHeight: `${cardHeight}px`,
                                                            zIndex: 2,
                                                            marginBottom: '2px'
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
                                                    const targetResource = selectedResourceId !== 'all'
                                                        ? resources.find(r => String(r.id) === String(selectedResourceId)) || resources[0]
                                                        : resources[0];

                                                    if (isRescheduling) {
                                                        onMoveBooking && onMoveBooking(
                                                            reschedulingBooking.id,
                                                            formatDateKey(day),
                                                            time,
                                                            targetResource?.id
                                                        );
                                                    } else {
                                                        handleSlotClick(e, day, time, targetResource);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    minHeight: `${config.gridRowHeight - 8}px`,
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
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
