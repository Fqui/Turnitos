import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import DurationSelector from './DurationSelector';

const PadelMobileTimeline = ({
    courts,
    selectedDate,
    existingBookings,
    openingTime,
    closingTime,
    onSlotSelect,
    sportColor = '#00e676'
}) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showDurationModal, setShowDurationModal] = useState(false);

    // Helpers (reused logic)
    const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const calculateEndTime = (startTime, durationMinutes) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes;
        return minutesToTime(endMinutes);
    };

    const isTimeSlotOccupied = (courtId, startTime, endTime) => {
        if (!selectedDate || !existingBookings) return false;

        const slotDate = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        return existingBookings.some(booking => {
            const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;
            if (!matchesResource) return false;

            if (booking.status === 'cancelled') return false;

            const bookingDateObj = new Date(booking.date + 'T00:00:00');
            const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
            if (bookingDate !== slotDate) return false;

            const bookingStartMinutes = timeToMinutes(booking.time);
            const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);

            return (startMinutes < bookingEndMinutes) && (endMinutes > bookingStartMinutes);
        });
    };

    const getAvailableDurations = (courtId, startTime) => {
        const durations = [60, 90, 120];
        const availableDurations = [];

        let closeMinutes = timeToMinutes(closingTime);
        const startMinutes = timeToMinutes(startTime);
        const openMinutes = timeToMinutes(openingTime);

        if (closeMinutes < openMinutes) {
            closeMinutes += 1440;
        }

        durations.forEach(duration => {
            const endTime = calculateEndTime(startTime, duration);
            let endMinutes = timeToMinutes(endTime);
            if (endMinutes < startMinutes) endMinutes += 1440;
            if (endMinutes > closeMinutes) return;

            const hasConflict = isTimeSlotOccupied(courtId, startTime, endTime);
            if (!hasConflict) availableDurations.push(duration);
        });

        return availableDurations;
    };

    const hours = useMemo(() => {
        const startMinutes = timeToMinutes(openingTime);
        let endMinutes = timeToMinutes(closingTime);
        if (endMinutes < startMinutes) endMinutes += 1440;

        const hoursArray = [];
        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            hoursArray.push(minutesToTime(minutes % 1440));
        }
        return hoursArray;
    }, [openingTime, closingTime]);

    const getCourtBookings = (courtId) => {
        if (!selectedDate || !existingBookings) return [];
        const slotDate = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;

        return existingBookings.filter(booking => {
            const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;
            if (!matchesResource) return false;
            if (booking.status === 'cancelled') return false;
            const bookingDateObj = new Date(booking.date + 'T00:00:00');
            const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
            return bookingDate === slotDate;
        });
    };

    const handleSlotClick = (court, hour) => {
        const availableDurations = getAvailableDurations(court.id, hour);
        if (availableDurations.length === 0) return;
        setSelectedSlot({ court, hour });
        setShowDurationModal(true);
    };

    const handleDurationSelect = (duration, price) => {
        if (selectedSlot) {
            onSlotSelect({
                courtId: selectedSlot.court.id,
                courtName: selectedSlot.court.name,
                time: selectedSlot.hour,
                duration,
                price
            });
        }
        setShowDurationModal(false);
        setSelectedSlot(null);
    };

    const getPrice = (court, duration) => {
        const basePrice = court.price || 0;
        switch (duration) {
            case 60: return basePrice;
            case 90: return Math.round(basePrice * 1.5);
            case 120: return Math.round(basePrice * 2);
            default: return basePrice;
        }
    };

    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '12px', // Less padding for mobile to maximize space
            marginTop: '20px'
        }}>
            <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '12px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>📱</span> Selecciona tu turno
            </h3>

            {/* Vertical Timeline Container with Scroll */}
            <div style={{
                position: 'relative',
                maxHeight: '65vh', // Constrain height for vertical scroll
                overflow: 'auto', // Enable TWO-WAY scrolling
                border: '1px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-main)',

            }}>
                <div style={{
                    display: 'grid',
                    // Grid: Time Column (Fixed 45px) + Dynamic Columns for Courts (min 80px each)
                    gridTemplateColumns: `45px repeat(${courts.length}, minmax(80px, 1fr))`,
                    minWidth: 'fit-content' // Allow growing wider than container
                }}>

                    {/* 1. Sticky Header Row (Court Names) */}
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        backgroundColor: 'var(--bg-card)',
                        gridColumn: '1 / -1', // Span all header
                        display: 'grid',
                        gridTemplateColumns: `45px repeat(${courts.length}, minmax(80px, 1fr))`, // Match parent grid!
                        borderBottom: '1px solid var(--border)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        {/* Empty corner cell - STICKY CORNER */}
                        <div style={{
                            padding: '8px',
                            borderRight: '1px solid var(--border)',
                            position: 'sticky',
                            left: 0,
                            zIndex: 25, // Higher than header body
                            backgroundColor: 'var(--bg-card)'
                        }}></div>

                        {/* Court Names */}
                        {courts.map((court, i) => (
                            <div key={court.id} style={{
                                padding: '12px 4px',
                                textAlign: 'center',
                                fontWeight: '600',
                                fontSize: '11px',
                                color: 'var(--text-primary)',
                                // Remove border right for last item
                                borderRight: i === courts.length - 1 ? 'none' : '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                }}>{court.name}</div>
                                {court.features && (
                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {court.features[0]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 2. Time Body */}
                    {hours.map((hour, timeIndex) => {
                        const isFullHour = hour.endsWith(':00');
                        // Only show scale text for full hours to reduce clutter
                        const showLabel = isFullHour;

                        return (
                            <React.Fragment key={hour}>
                                {/* Time Label Column - STICKY LEFT */}
                                <div style={{
                                    gridColumn: '1 / 2',
                                    padding: '8px 2px',
                                    textAlign: 'center',
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    color: 'var(--text-secondary)',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'start',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--bg-card)',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 10
                                }}>
                                    {showLabel ? hour : ''}
                                </div>

                                {/* Slots for each Court */}
                                {courts.map((court, courtIndex) => {
                                    const courtBookings = getCourtBookings(court.id);
                                    const hourMinutes = timeToMinutes(hour);

                                    // Check Occupation
                                    const booking = courtBookings.find(b => {
                                        const bookingStart = timeToMinutes(b.time);
                                        const bookingEnd = bookingStart + (b.duration || 60);
                                        return hourMinutes >= bookingStart && hourMinutes < bookingEnd;
                                    });

                                    const isOccupied = !!booking;
                                    const isAvailable = !isOccupied && getAvailableDurations(court.id, hour).length > 0;

                                    // Styles
                                    let bg = 'transparent';
                                    let borderBottom = '1px solid var(--border)';
                                    let borderRight = courtIndex === courts.length - 1 ? 'none' : '1px solid var(--border)';
                                    let cursor = 'not-allowed';
                                    let borderRadius = '0';

                                    if (isOccupied) {
                                        bg = '#4A5568';
                                        borderBottom = '1px solid #4A5568'; // Melted look
                                        // Vertical separator between different bookings should persist?
                                        // If adjacent courts have bookings, separate them with grid gap or border?
                                        // Current logic has 1px solid var(--border).
                                        // To "melt" vertically, but separate horizontally:

                                        if (booking) {
                                            const bookingStart = timeToMinutes(booking.time);
                                            const bookingEnd = bookingStart + (booking.duration || 60);
                                            const isStart = hourMinutes === bookingStart;
                                            const isEnd = (hourMinutes + 30) === bookingEnd;

                                            // Vertical radius
                                            if (isStart) borderRadius = '6px 6px 0 0';
                                            if (isEnd && !isStart) borderRadius = '0 0 6px 6px';
                                            if (isStart && isEnd) borderRadius = '6px';

                                            // Hide internal horizontal border
                                            if (!isEnd) borderBottom = 'none';
                                        }
                                    } else if (isAvailable) {
                                        cursor = 'pointer';
                                    }

                                    return (
                                        <div
                                            key={`${court.id}-${hour}`}
                                            onClick={() => isAvailable && handleSlotClick(court, hour)}
                                            style={{
                                                height: '40px',
                                                backgroundColor: bg,
                                                borderBottom,
                                                borderRight,
                                                borderRadius,
                                                cursor,
                                                zIndex: 1,
                                                position: 'relative'
                                            }}
                                        />
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Duration Selector Modal (Reused) */}
            {showDurationModal && selectedSlot && (
                <DurationSelector
                    court={selectedSlot.court}
                    timeSlot={selectedSlot.hour}
                    availableDurations={getAvailableDurations(selectedSlot.court.id, selectedSlot.hour)}
                    onSelectDuration={handleDurationSelect}
                    onClose={() => {
                        setShowDurationModal(false);
                        setSelectedSlot(null);
                    }}
                    sportColor={sportColor}
                    getPrice={(duration) => getPrice(selectedSlot.court, duration)}
                />
            )}
        </div>
    );
};

export default PadelMobileTimeline;
