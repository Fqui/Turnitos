import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import DurationSelector from './DurationSelector';

const PadelTimeline = ({
    courts,
    selectedDate,
    existingBookings,
    openingTime,
    closingTime,
    timeRanges, // 🆕 Add timeRanges for split shifts
    onSlotSelect,
    sportColor = '#00e676'
}) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showDurationModal, setShowDurationModal] = useState(false);

    // Helper: Convert "HH:MM" to minutes
    const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper: Convert minutes to "HH:MM"
    const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // 🆕 Helper: Check if a time slot falls within operating hours (respects split shifts)
    const isWithinOperatingHours = (slotMinutes) => {
        if (!timeRanges || timeRanges.length === 0) {
            // Simple continuous hours
            const start = timeToMinutes(openingTime);
            const close = timeToMinutes(closingTime);
            const end = close < start ? close + 1440 : close;
            return slotMinutes >= start && slotMinutes < end;
        }

        // Check if slot falls within any of the time ranges (for split shifts)
        return timeRanges.some(range => {
            const rangeStart = timeToMinutes(range.open);
            const rangeClose = timeToMinutes(range.close);
            const rangeEnd = rangeClose < rangeStart ? rangeClose + 1440 : rangeClose;
            return slotMinutes >= rangeStart && slotMinutes < rangeEnd;
        });
    };

    // Helper: Calculate end time
    const calculateEndTime = (startTime, durationMinutes) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes;
        return minutesToTime(endMinutes);
    };

    // Helper: Check if time slot is occupied
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

    // Helper: Get available durations for a slot
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

            if (endMinutes < startMinutes) {
                endMinutes += 1440;
            }

            if (endMinutes > closeMinutes) {
                return;
            }

            const hasConflict = isTimeSlotOccupied(courtId, startTime, endTime);

            if (!hasConflict) {
                availableDurations.push(duration);
            }
        });

        return availableDurations;
    };

    // Generate time slots array (every 30 minutes) - 🆕 Now filters by timeRanges
    const hours = useMemo(() => {
        const startMinutes = timeToMinutes(openingTime);
        let endMinutes = timeToMinutes(closingTime);

        if (endMinutes < startMinutes) {
            endMinutes += 1440;
        }

        const hoursArray = [];
        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            const normalizedMinutes = minutes % 1440;

            // 🆕 Skip if not within operating hours (handles split shifts)
            if (!isWithinOperatingHours(normalizedMinutes)) {
                continue;
            }

            hoursArray.push(minutesToTime(normalizedMinutes));
        }
        return hoursArray;
    }, [openingTime, closingTime, timeRanges]);

    // Get bookings for a specific court
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

    // Handle slot click
    const handleSlotClick = (court, hour) => {
        const availableDurations = getAvailableDurations(court.id, hour);

        if (availableDurations.length === 0) {
            return; // Slot not available
        }

        setSelectedSlot({ court, hour });
        setShowDurationModal(true);
    };

    // Handle duration selection
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

    // Calculate price for duration
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
            padding: '20px',
            marginTop: '20px'
        }}>
            <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>📅</span> Selecciona tu turno
            </h3>

            {/* Timeline Container with Custom Scrollbar */}
            <div
                className="custom-scrollbar"
                style={{
                    overflowX: 'auto',
                    overflowY: 'visible',
                    marginBottom: '12px',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: '8px'
                }}
            >
                <style>
                    {`
                        .custom-scrollbar::-webkit-scrollbar {
                            height: 6px;
                            background-color: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background-color: rgba(0,0,0,0.05); /* Very subtle track */
                            border-radius: 3px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: rgba(156, 163, 175, 0.4); /* Subtle grey thumb */
                            border-radius: 3px;
                            border: 1px solid transparent;
                            background-clip: content-box;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background-color: rgba(156, 163, 175, 0.6);
                        }
                    `}
                </style>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `140px repeat(${hours.length}, 40px)`,
                    rowGap: '0',
                    columnGap: '0',
                    minWidth: 'fit-content'
                }}>
                    {/* Header Row - Hours */}
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}></div>
                    {hours.map((hour, index) => {
                        const isFullHour = hour.endsWith(':00');

                        if (isFullHour) {
                            return (
                                <div key={hour} style={{
                                    padding: '8px 4px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: 'var(--text-secondary)',
                                    gridColumn: 'span 2',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    {hour.split(':')[0]}
                                </div>
                            );
                        }

                        // First slot placeholder logic
                        if (index === 0 && !isFullHour) {
                            return <div key={hour} style={{
                                borderBottom: '1px solid var(--border)'
                            }} />;
                        }

                        return null;
                    })}

                    {/* Court Rows */}
                    {courts.map(court => {
                        const courtBookings = getCourtBookings(court.id);

                        return (
                            <React.Fragment key={court.id}>
                                {/* Court Name */}
                                <div style={{
                                    padding: '12px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: '1px solid var(--border)',
                                    position: 'sticky',
                                    left: 0,
                                    background: 'var(--bg-card)',
                                    zIndex: 10
                                }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        marginBottom: '2px'
                                    }}>
                                        {court.name}
                                    </div>
                                    {court.features && court.features.length > 0 && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {court.features.join(' | ')}
                                        </div>
                                    )}
                                </div>

                                {/* Time Slots */}
                                {hours.map((hour, index) => {
                                    const hourMinutes = timeToMinutes(hour);

                                    // Find booking
                                    const booking = courtBookings.find(b => {
                                        const bookingStart = timeToMinutes(b.time);
                                        const bookingEnd = bookingStart + (b.duration || 60);
                                        return hourMinutes >= bookingStart && hourMinutes < bookingEnd;
                                    });

                                    const isOccupied = !!booking;
                                    const isAvailable = !isOccupied && getAvailableDurations(court.id, hour).length > 0;

                                    // Borders: Only bottom and right. No top border to avoid double lines.
                                    let borderBottom = '1px solid var(--border)';
                                    let borderLeft = 'none';
                                    let borderRight = '1px solid var(--border)';

                                    // Left border for first column only
                                    if (index === 0) borderLeft = '1px solid var(--border)';

                                    let borderRadius = '0';
                                    let bg = 'var(--bg-main)';
                                    let cursor = 'not-allowed';

                                    if (isOccupied) {
                                        // Occupied style
                                        bg = '#4A5568'; // Darker grey for better contrast
                                        // Match borders to bg to hide them, or keep them consistent?
                                        // The user wants "melted", so internal borders should be hidden.
                                        borderBottom = '1px solid #4A5568';
                                        borderRight = '1px solid #4A5568';
                                        if (index === 0) borderLeft = '1px solid #4A5568';

                                        if (booking) {
                                            const bookingStart = timeToMinutes(booking.time);
                                            const bookingEnd = bookingStart + (booking.duration || 60);

                                            const isStart = hourMinutes === bookingStart;
                                            const isEnd = (hourMinutes + 30) === bookingEnd;

                                            if (isStart) borderRadius = '6px 0 0 6px';
                                            if (isEnd && !isStart) borderRadius = '0 6px 6px 0';
                                            if (isStart && isEnd) borderRadius = '6px';

                                            // Ensure internal borders are definitely hidden
                                            if (!isEnd) borderRight = 'none';
                                        }
                                    } else if (isAvailable) {
                                        bg = 'transparent';
                                        cursor = 'pointer';
                                        borderRight = '1px dashed var(--border)';
                                        if (index === 0) borderLeft = '1px dashed var(--border)';
                                    }

                                    return (
                                        <motion.div
                                            key={hour}
                                            onClick={() => isAvailable && handleSlotClick(court, hour)}
                                            whileHover={isAvailable ? { backgroundColor: `${sportColor}10` } : {}}
                                            style={{
                                                height: '45px',
                                                backgroundColor: bg,
                                                borderBottom,
                                                borderLeft,
                                                borderRight,
                                                borderRadius,
                                                cursor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                opacity: isOccupied ? 1 : 1, // Full opacity for bolder look
                                                zIndex: isOccupied ? 2 : 1
                                            }}
                                        />
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#4A5568',
                        borderRadius: '4px'
                    }}></div>
                    <span>Ocupado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        border: `2px dashed ${sportColor}40`,
                        borderRadius: '4px'
                    }}></div>
                    <span>Disponible</span>
                </div>
            </div>

            {/* Duration Selector Modal */}
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

export default PadelTimeline;
