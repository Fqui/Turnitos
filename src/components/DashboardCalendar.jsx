import React, { useState, useMemo, useEffect } from 'react';

export default function DashboardCalendar({
    bookings,
    business,
    onCreateBooking,
    onBookingClick,
    onBlockSlot,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    isMobile: isMobileProp = false
}) {
    const isMobile = isMobileProp;
    const [showSlotMenu, setShowSlotMenu] = useState(null); // { date, time, x, y }

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showSlotMenu && !e.target.closest('.slot-menu')) {
                setShowSlotMenu(null);
            }
        };

        if (showSlotMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showSlotMenu]);

    // Helper to format date as YYYY-MM-DD
    const formatDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Parse business hours
    const getBusinessHours = () => {
        if (!business?.hours) return { start: 8, end: 23 };

        // Assuming hours format like "08:00-23:00" or similar
        const hoursStr = business.hours;
        if (typeof hoursStr === 'string' && hoursStr.includes('-')) {
            const [start, end] = hoursStr.split('-').map(h => parseInt(h.split(':')[0]));
            return { start: start || 8, end: end || 23 };
        }

        return { start: 8, end: 23 };
    };

    const businessHours = getBusinessHours();

    // Generate days based on view mode
    const displayDays = useMemo(() => {
        const days = [];
        const start = new Date(currentDate);

        if (viewMode === 'day') {
            days.push(new Date(start));
        } else if (viewMode === 'week') {
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                days.push(d);
            }
        } else if (viewMode === 'month') {
            // Get first day of month
            const firstDay = new Date(start.getFullYear(), start.getMonth(), 1);

            // Start from Monday of the week containing the first day
            const startDay = new Date(firstDay);
            const dayOfWeek = firstDay.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startDay.setDate(firstDay.getDate() + diff);

            // Generate 42 days (6 weeks) to fill the calendar completely
            const totalDays = 42;
            for (let i = 0; i < totalDays; i++) {
                const d = new Date(startDay);
                d.setDate(startDay.getDate() + i);
                days.push(d);
            }
        }

        return days;
    }, [currentDate, viewMode]);

    // Generate time slots based on business hours
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = businessHours.start; i <= businessHours.end; i++) {
            slots.push(`${i.toString().padStart(2, '0')}:00`);
            if (i < businessHours.end) {
                slots.push(`${i.toString().padStart(2, '0')}:30`);
            }
        }
        return slots;
    }, [businessHours]);

    const getBookingForSlot = (date, time) => {
        const dateKey = formatDateKey(date);

        const slotBookings = bookings.filter(b => {
            if (b.time !== time) return false;

            // Normalize booking date to YYYY-MM-DD
            let bDateKey = b.date;
            if (b.date.includes('/')) {
                // Handle DD/MM/YYYY legacy format
                const [day, month, year] = b.date.split('/');
                bDateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            return bDateKey === dateKey;
        });

        if (slotBookings.length === 0) return null;

        // Prioritize non-cancelled bookings
        const activeBooking = slotBookings.find(b => b.status !== 'cancelled');
        return activeBooking || slotBookings[0];
    };

    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() - 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + 1);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setCurrentDate(d);
    };

    const handleSlotClick = (e, date, time) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setShowSlotMenu({
            date,
            time,
            x: rect.left + rect.width / 2,
            y: rect.top
        });
    };

    const handleCreateBooking = () => {
        if (showSlotMenu) {
            onCreateBooking(showSlotMenu.date, showSlotMenu.time);
            setShowSlotMenu(null);
        }
    };

    const handleBlockSlot = () => {
        if (showSlotMenu && onBlockSlot) {
            onBlockSlot(showSlotMenu.date, showSlotMenu.time);
            setShowSlotMenu(null);
        }
    };

    const getBookingLabel = (booking) => {
        if (booking.service_id && booking.services?.name) return booking.services.name;
        if (booking.court_id && booking.courts?.name) return booking.courts.name;
        return booking.service || 'Reserva';
    };

    const getStatusColor = (booking) => {
        if (booking.status === 'blocked') return '#374151'; // Gray-700
        if (booking.status === 'cancelled') return '#DC2626'; // Red-600
        if (booking.status === 'deposit_paid') return '#F59E0B'; // Amber-500
        if (booking.status === 'attended') return '#10B981'; // Emerald-500
        if (booking.status === 'completed') return '#10B981'; // Emerald-500 (Verde)
        if (booking.status === 'confirmed') {
            const label = getBookingLabel(booking).toLowerCase();
            if (label.includes('padel') || label.includes('tenis')) return '#059669'; // Emerald-600
            return '#2563EB'; // Blue-600
        }
        return '#9CA3AF';
    };

    const getDateRangeText = () => {
        if (viewMode === 'day') {
            return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } else if (viewMode === 'week') {
            const endDate = new Date(currentDate);
            endDate.setDate(endDate.getDate() + 6);
            return `${currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
    };



    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            {/* Header */}
            <div style={{
                padding: isMobile ? '12px' : '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                background: 'var(--bg-card)',
                gap: isMobile ? '12px' : '0'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '16px',
                    flexWrap: 'wrap'
                }}>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Calendario</h3>

                    {/* View Mode Selector */}
                    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main)', padding: '2px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setViewMode('day')}
                            style={{
                                border: 'none',
                                background: viewMode === 'day' ? 'white' : 'transparent',
                                padding: isMobile ? '4px 8px' : '6px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontWeight: viewMode === 'day' ? '600' : '500',
                                fontSize: '11px',
                                color: viewMode === 'day' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'day' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            style={{
                                border: 'none',
                                background: viewMode === 'week' ? 'white' : 'transparent',
                                padding: isMobile ? '4px 8px' : '6px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontWeight: viewMode === 'week' ? '600' : '500',
                                fontSize: '11px',
                                color: viewMode === 'week' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            style={{
                                border: 'none',
                                background: viewMode === 'month' ? 'white' : 'transparent',
                                padding: isMobile ? '4px 8px' : '6px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                fontWeight: viewMode === 'month' ? '600' : '500',
                                fontSize: '11px',
                                color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'month' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Mes
                        </button>
                    </div>

                    {/* Navigation Controls */}
                    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-main)', padding: '2px', borderRadius: '8px' }}>
                        <button onClick={handlePrevious} style={{ border: 'none', background: 'transparent', padding: '4px 6px', cursor: 'pointer', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '10px' }}>◀</button>
                        <button onClick={handleToday} style={{ border: 'none', background: 'white', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', fontWeight: '600', fontSize: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Hoy</button>
                        <button onClick={handleNext} style={{ border: 'none', background: 'transparent', padding: '4px 6px', cursor: 'pointer', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '10px' }}>▶</button>
                    </div>
                </div>
                <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: '600', color: 'var(--text-primary)', textAlign: isMobile ? 'center' : 'right' }}>
                    {getDateRangeText()}
                </span>
            </div>

            {/* Calendar Grid */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {viewMode !== 'month' ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `70px repeat(${displayDays.length}, 1fr)`,
                        minWidth: viewMode === 'day' ? 'auto' : '900px',
                        width: '100%'
                    }}>

                        {/* Header Row */}
                        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}></div>
                        {displayDays.map((day, i) => {
                            const isToday = formatDateKey(day) === formatDateKey(new Date());
                            return (
                                <div key={i} style={{
                                    padding: viewMode === 'day' ? '20px 16px' : '16px 8px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid var(--border)',
                                    borderRight: i < displayDays.length - 1 ? '1px solid var(--border)' : 'none',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 20,
                                    background: 'var(--bg-card)',
                                }}>
                                    {viewMode === 'day' ? (
                                        // Vista de día: mostrar nombre completo del día
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            color: 'var(--text-primary)',
                                            textTransform: 'capitalize'
                                        }}>
                                            {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </div>
                                    ) : (
                                        // Vista de semana: diseño original
                                        <>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: isToday ? 'var(--primary-paddle)' : 'var(--text-secondary)',
                                                marginBottom: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                            </div>
                                            <div style={{
                                                fontSize: '24px',
                                                fontWeight: '800',
                                                color: isToday ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                                width: '40px',
                                                height: '40px',
                                                lineHeight: '40px',
                                                borderRadius: '50%',
                                                background: isToday ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                                margin: '0 auto'
                                            }}>
                                                {day.getDate()}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Time Slots */}
                        {timeSlots.map((time, i) => (
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

                                {/* Day Columns */}
                                {displayDays.map((day, j) => {
                                    const booking = getBookingForSlot(day, time);
                                    const isToday = formatDateKey(day) === formatDateKey(new Date());

                                    return (
                                        <div
                                            key={`${day}-${time}`}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                borderRight: j < displayDays.length - 1 ? '1px solid var(--border)' : 'none',
                                                height: '80px',
                                                padding: '4px',
                                                position: 'relative',
                                                background: isToday ? 'rgba(0,0,0,0.01)' : 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            className="calendar-slot"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (booking) {
                                                    onBookingClick && onBookingClick(booking);
                                                } else {
                                                    handleSlotClick(e, day, time);
                                                }
                                            }}
                                        >
                                            {booking ? (
                                                <div style={{
                                                    background: getStatusColor(booking),
                                                    color: '#fff',
                                                    height: '100%',
                                                    borderRadius: '8px',
                                                    padding: '6px 10px',
                                                    fontSize: '12px',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                    borderLeft: '4px solid rgba(0,0,0,0.2)',
                                                    opacity: booking.status === 'cancelled' ? 0.7 : 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    gap: '2px'
                                                }}
                                                    title={`${booking.customer_name || booking.customerName} - ${getBookingLabel(booking)}`}
                                                >
                                                    <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: (booking.status === 'cancelled' || booking.status === 'blocked') ? 'center' : 'left' }}>
                                                        {booking.status === 'blocked' ? '🚫 BLOQUEADO' :
                                                            booking.status === 'cancelled' ? '❌ CANCELADO' :
                                                                booking.customer_name || booking.customerName}
                                                    </div>
                                                    {booking.status !== 'cancelled' && booking.status !== 'blocked' && (
                                                        <>
                                                            <div style={{ fontSize: '10px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {booking.customer_phone || booking.customerPhone || ''}
                                                            </div>
                                                            <div style={{ fontSize: '11px', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {getBookingLabel(booking)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="slot-add-btn">
                                                    +
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        minHeight: '100%',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg-main)',
                        gap: '1px'
                    }}>
                        {/* Day Names Header */}
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                            <div key={day} style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                backgroundColor: 'var(--bg-card)',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: 'var(--text-secondary)',
                                borderBottom: '1px solid var(--border)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                position: 'sticky',
                                top: 0,
                                zIndex: 10
                            }}>
                                {day}
                            </div>
                        ))}

                        {/* Month Days */}
                        {displayDays.map((day, i) => {
                            const dateKey = formatDateKey(day);
                            const dayBookings = bookings.filter(b => {
                                let bDateKey = b.date;
                                if (b.date.includes('/')) {
                                    const [d, m, y] = b.date.split('/');
                                    bDateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                                }
                                return bDateKey === dateKey && b.status !== 'cancelled';
                            });

                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isToday = dateKey === formatDateKey(new Date());

                            return (
                                <div
                                    key={i}
                                    onClick={() => {
                                        setCurrentDate(new Date(day));
                                        setViewMode('day');
                                    }}
                                    style={{
                                        backgroundColor: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)',
                                        padding: '12px 8px',
                                        minHeight: isMobile ? '80px' : '120px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: isCurrentMonth ? 1 : 0.5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        position: 'relative',
                                        borderBottom: '1px solid var(--border)',
                                        borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isCurrentMonth ? 'rgba(0, 230, 118, 0.03)' : 'rgba(0,0,0,0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)';
                                    }}
                                >
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: isToday ? '800' : '600',
                                        color: isToday ? 'var(--primary-paddle)' : 'var(--text-primary)',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '50%',
                                        background: isToday ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                                    }}>
                                        {day.getDate()}
                                    </div>

                                    {/* Booking Indicators */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '4px' }}>
                                        {dayBookings.slice(0, 5).map((b, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: getStatusColor(b)
                                                }}
                                            />
                                        ))}
                                        {dayBookings.length > 5 && (
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                +{dayBookings.length - 5}
                                            </span>
                                        )}
                                    </div>

                                    {/* Summary text if space allowed */}
                                    {!isMobile && dayBookings.length > 0 && (
                                        <div style={{
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)',
                                            marginTop: 'auto',
                                            fontWeight: '500'
                                        }}>
                                            {dayBookings.length} {dayBookings.length === 1 ? 'reserva' : 'reservas'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Slot Action Menu */}
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
                            top: showSlotMenu.y - 120, // Move up a bit to show above the slot
                            width: '200px',
                            background: 'var(--bg-card)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            border: '1px solid var(--border)',
                            zIndex: 1000,
                            overflow: 'hidden',
                            animation: 'slideDown 0.2s ease-out'
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
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{showSlotMenu.time} hs</span>
                            <button
                                onClick={() => setShowSlotMenu(null)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

            <style>{`
                .calendar-slot:hover {
                    background-color: rgba(0,0,0,0.03) !important;
                }
                .slot-add-btn {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: var(--primary-paddle);
                    opacity: 0;
                    transition: opacity 0.2s;
                    cursor: pointer;
                    border-radius: 8px;
                }
                .calendar-slot:hover .slot-add-btn {
                    opacity: 0.5;
                    background-color: rgba(0, 230, 118, 0.05);
                }
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
