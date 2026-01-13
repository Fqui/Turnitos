import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PadelMobileATC = ({
    courts,
    selectedDate,
    existingBookings,
    openingTime,
    closingTime,
    onSlotSelect,
    sportColor = '#00e676'
}) => {
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
    const [selectedSelection, setSelectedSelection] = useState(null); // { court, duration, price }

    // --- Helpers (Shared) ---
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

    // --- Availability Logic ---
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

    // Check if a specific time is available for AT LEAST ONE duration (60min min) on a specific court
    const isCourtAvailableAtTime = (courtId, time) => {
        const endTime60 = calculateEndTime(time, 60);

        let closeMinutes = timeToMinutes(closingTime);
        const startMinutes = timeToMinutes(time);
        const endMinutes60 = timeToMinutes(endTime60);

        if (closeMinutes < timeToMinutes(openingTime)) closeMinutes += 1440;

        // If 60 min slots goes beyond closing time, it's not available
        if (endMinutes60 > closeMinutes && closeMinutes > startMinutes) return false;

        return !isTimeSlotOccupied(courtId, time, endTime60);
    };

    // --- Data Prep ---

    // 1. Generate all possible time slots
    const allTimeSlots = useMemo(() => {
        const slots = [];
        const startMinutes = timeToMinutes(openingTime);
        let endMinutes = timeToMinutes(closingTime);
        if (endMinutes < startMinutes) endMinutes += 1440;

        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            slots.push(minutesToTime(minutes % 1440));
        }
        return slots;
    }, [openingTime, closingTime]);

    // 2. Filter slots that have at least one court available
    const availableTimeSlots = useMemo(() => {
        return allTimeSlots.filter(time => {
            // Check if ANY court is free at this time for at least 60 mins
            return courts.some(court => isCourtAvailableAtTime(court.id, time));
        });
    }, [allTimeSlots, courts, existingBookings, selectedDate]);

    // 3. Effect: If selected time becomes unavailable (e.g. date change), reset
    useEffect(() => {
        if (selectedTimeSlot && !availableTimeSlots.includes(selectedTimeSlot)) {
            setSelectedTimeSlot(null);
            setSelectedSelection(null);
        }
    }, [availableTimeSlots, selectedTimeSlot]);


    // --- Price Calculation ---
    const getPrice = (court, duration) => {
        const basePrice = court.price || 0;
        switch (duration) {
            case 60: return basePrice;
            case 90: return Math.round(basePrice * 1.5);
            case 120: return Math.round(basePrice * 2);
            default: return basePrice;
        }
    };

    // --- Interaction ---
    const handleDurationClick = (court, duration, price) => {
        // Toggle selection or select new
        if (selectedSelection?.court.id === court.id && selectedSelection?.duration === duration) {
            setSelectedSelection(null); // Deselect if same clicked
        } else {
            const newSelection = { court, duration, price };
            setSelectedSelection(newSelection);

            // Immediately trigger onSlotSelect to show the main Continue button
            if (selectedTimeSlot) {
                onSlotSelect({
                    courtId: court.id,
                    courtName: court.name,
                    time: selectedTimeSlot,
                    duration: duration,
                    price: price
                });
            }
        }
    };

    // --- Render ---
    return (
        <div style={{ marginTop: '20px', paddingBottom: '20px' }}>
            {/* Step 1: Time Grid */}
            <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '12px',
                color: 'var(--text-primary)'
            }}>
                1. Selección de Horario
            </h3>

            {availableTimeSlots.length === 0 ? (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '12px',
                    color: 'var(--text-secondary)'
                }}>
                    No hay horarios disponibles para esta fecha.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)', // 4 cols like screenshots
                    gap: '8px',
                    marginBottom: '24px'
                }}>
                    {availableTimeSlots.map(time => {
                        const isSelected = selectedTimeSlot === time;
                        return (
                            <motion.button
                                key={time}
                                onClick={() => setSelectedTimeSlot(time)}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    padding: '10px 4px',
                                    borderRadius: '8px',
                                    border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                    backgroundColor: isSelected ? `${sportColor}15` : 'var(--bg-card)',
                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontSize: '14px',
                                    fontWeight: isSelected ? '700' : '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {time}
                            </motion.button>
                        );
                    })}
                </div>
            )}

            {/* Step 2: Courts List (Only if time selected) */}
            <AnimatePresence mode='wait'>
                {selectedTimeSlot && (
                    <motion.div
                        key="court-list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        <h3 style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            marginBottom: '12px',
                            color: 'var(--text-primary)'
                        }}>
                            2. Selección de Cancha
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {courts.map(court => {
                                // Calculate available durations for THIS court at SELECTED time
                                const durations = [60, 90, 120];
                                const validDurations = durations.filter(d => {
                                    const endTime = calculateEndTime(selectedTimeSlot, d);

                                    // Check closing time logic
                                    let closeMinutes = timeToMinutes(closingTime);
                                    const startMinutes = timeToMinutes(selectedTimeSlot);
                                    const endMinutes = timeToMinutes(endTime);
                                    if (closeMinutes < timeToMinutes(openingTime)) closeMinutes += 1440;
                                    if (endMinutes > closeMinutes && closeMinutes > startMinutes) return false;

                                    return !isTimeSlotOccupied(court.id, selectedTimeSlot, endTime);
                                });

                                // Ensure at least 60 min is available to show the court
                                if (!validDurations.includes(60)) return null;

                                return (
                                    <div key={court.id} style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}>
                                        {/* Court Header */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
                                                {court.name}
                                            </div>
                                            {court.features && court.features.length > 0 && (
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    {court.features.join(' | ')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Duration Buttons Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '8px'
                                        }}>
                                            {[60, 90, 120].map(duration => {
                                                const isAvailable = validDurations.includes(duration);
                                                const price = getPrice(court, duration);
                                                const isSelected = selectedSelection?.court.id === court.id && selectedSelection?.duration === duration;

                                                if (!isAvailable) {
                                                    return (
                                                        <div key={duration} style={{
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            backgroundColor: 'var(--bg-main)',
                                                            border: '1px solid transparent',
                                                            textAlign: 'center',
                                                            opacity: 0.5,
                                                            fontSize: '11px',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            <div style={{ marginBottom: '2px' }}>🔒</div>
                                                            {duration} min
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <motion.button
                                                        key={duration}
                                                        onClick={() => handleDurationClick(court, duration, price)}
                                                        whileTap={{ scale: 0.95 }}
                                                        style={{
                                                            padding: '10px 4px',
                                                            borderRadius: '8px',
                                                            // Match calendar time slot styling
                                                            border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                                            backgroundColor: isSelected ? `${sportColor}15` : 'var(--bg-card)',
                                                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            fontWeight: isSelected ? '700' : '500',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontSize: '13px',
                                                            fontWeight: '700'
                                                        }}>
                                                            ${price.toLocaleString()}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {duration} min
                                                        </span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PadelMobileATC;
