import React from 'react';
import TimeSlotGrid from './TimeSlotGrid';
import CourtSelector from './CourtSelector';

const TimeSlotPicker = ({
    selectedTime,
    onTimeSelect,
    sportColor,
    type,
    resources: providedResources,
    openingTime,
    closingTime,
    interval = 30,
    existingBookings,
    timeRanges,
    selectedDate,
    maxCapacity,
    businessCapacity, // ✅ NEW: Total capacity of the business (number of spaces)
    serviceDuration // 🆕 Duration of the service for validation
}) => {
    // Use selectedTime.time directly from props
    const selectedTimeSlot = selectedTime?.time || null;

    // 🔍 Debug: Log resources and business capacity
    // console.log('📊 TimeSlotPicker received:', {
    //     resources: providedResources,
    //     businessCapacity,
    //     existingBookings: existingBookings?.length
    // });

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

    // Helper: Check if a time slot falls within operating hours
    const isWithinOperatingHours = (slotMinutes) => {
        if (!timeRanges || timeRanges.length === 0) {
            // Simple continuous hours
            const start = timeToMinutes(openingTime);
            const close = timeToMinutes(closingTime);
            const end = close < start ? close + 1440 : close; // Handle midnight crossing
            return slotMinutes >= start && slotMinutes < end;
        }

        // Check if slot falls within any of the time ranges (for split shifts)
        return timeRanges.some(range => {
            const rangeStart = timeToMinutes(range.open);
            const rangeClose = timeToMinutes(range.close);
            const rangeEnd = rangeClose < rangeStart ? rangeClose + 1440 : rangeClose; // Handle midnight crossing
            return slotMinutes >= rangeStart && slotMinutes < rangeEnd;
        });
    };

    // Helper: Check if a time slot is in the past (only for today)
    const isPastTime = (slotMinutes) => {
        if (!selectedDate) return false;

        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const slotDateStr = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;

        // Only filter if selected date is today
        if (slotDateStr !== currentDate) return false;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return slotMinutes < currentMinutes;
    };

    // Helper: Check if a court is booked at a specific time
    const isCourtBooked = (courtId, slotTime) => {
        if (!selectedDate || !existingBookings) return false;

        const slotDate = selectedDate.toISOString().split('T')[0];

        return existingBookings.some(booking => {
            const bookingDate = new Date(booking.date).toISOString().split('T')[0];
            const bookingTime = booking.time?.substring(0, 5); // "HH:MM"

            // Match by resource_id (new schema) or court_id (legacy)
            const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;

            return bookingDate === slotDate &&
                bookingTime === slotTime &&
                matchesResource;
        });
    };

    // 🆕 Helper: Calculate end time given start time and duration (in minutes)
    const calculateEndTime = (startTime, durationMinutes) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes;
        return minutesToTime(endMinutes);
    };

    // 🆕 Helper: Check if a time slot is occupied by any booking
    const isTimeSlotOccupied = (courtId, startTime, endTime) => {
        if (!selectedDate || !existingBookings) return false;

        const slotDate = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        const conflicts = existingBookings.filter(booking => {
            // Only check same court
            const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;
            if (!matchesResource) return false;

            // Only check active bookings
            if (booking.status === 'cancelled') return false;

            // Check date match
            const bookingDateObj = new Date(booking.date + 'T00:00:00');
            const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
            if (bookingDate !== slotDate) return false;

            // Calculate booking time range
            const bookingStartMinutes = timeToMinutes(booking.time);
            const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);

            // Check overlap: (start < bookingEnd) AND (end > bookingStart)
            const overlaps = (startMinutes < bookingEndMinutes) && (endMinutes > bookingStartMinutes);


            return overlaps;
        });

        return conflicts.length > 0;
    };

    // 🆕 Helper: Get available durations for a padel court at a specific time
    const getAvailableDurations = (courtId, startTime) => {
        const durations = [60, 90, 120];
        const availableDurations = [];

        // Get closing time in minutes
        let closeMinutes = timeToMinutes(closingTime);
        const startMinutes = timeToMinutes(startTime);
        const openMinutes = timeToMinutes(openingTime);

        // Handle midnight crossing: if close < open, it means next day
        // Example: open=18:00 (1080), close=03:00 (180) -> close should be 180+1440=1620
        if (closeMinutes < openMinutes) {
            closeMinutes += 1440; // Add 24 hours
        }

        durations.forEach(duration => {
            const endTime = calculateEndTime(startTime, duration);
            let endMinutes = timeToMinutes(endTime);

            // If end time wrapped around midnight, add 1440
            if (endMinutes < startMinutes) {
                endMinutes += 1440;
            }

            // Check if exceeds closing time
            if (endMinutes > closeMinutes) {
                // console.log(`  ❌ ${duration} min: Exceeds closing time (${endTime} [${endMinutes}] > ${closingTime} [${closeMinutes}])`);
                return; // Skip this duration
            }

            // Check if overlaps with existing bookings
            const hasConflict = isTimeSlotOccupied(courtId, startTime, endTime);

            // console.log(`  ${hasConflict ? '❌' : '✅'} ${duration} min (${startTime}-${endTime}): ${hasConflict ? 'Has conflict' : 'Available'}`);

            if (!hasConflict) {
                availableDurations.push(duration);
            }
        });

        // console.log(`  📊 Available durations:`, availableDurations);
        return availableDurations;
    };

    // Generate unified time slots with availability info (FOR SPORTS ONLY)
    const generateUnifiedTimeSlots = () => {
        const slots = [];

        // Determine the full operating window
        let startMinutes, endMinutes;

        if (timeRanges && timeRanges.length > 0) {
            startMinutes = Math.min(...timeRanges.map(r => timeToMinutes(r.open)));
            endMinutes = Math.max(...timeRanges.map(r => {
                const closeMinutes = timeToMinutes(r.close);
                // If close time is earlier than open time, it's next day (e.g., 00:00 = 24:00)
                return closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
            }));
        } else {
            startMinutes = timeToMinutes(openingTime);
            const closeMinutes = timeToMinutes(closingTime);
            // If close time is earlier than open time, it's next day (e.g., 00:00 = 24:00)
            endMinutes = closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
        }

        // Get business total capacity
        const totalBusinessCapacity = businessCapacity || 1;

        // Generate all possible time slots
        for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
            const time = minutesToTime(minutes);

            // Skip if not within operating hours (handles split shifts)
            if (!isWithinOperatingHours(minutes)) {
                continue;
            }

            // Skip past times
            if (isPastTime(minutes)) {
                continue;
            }

            // Format date using LOCAL timezone (not UTC)
            const slotDate = selectedDate instanceof Date
                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                : selectedDate;

            // ✅ FIRST: Check business-level capacity (total concurrent bookings)
            const totalBookingsAtTime = existingBookings?.filter(booking => {
                // Format booking date using LOCAL timezone
                const bookingDateObj = new Date(booking.date + 'T00:00:00'); // Force local timezone
                const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
                const bookingTime = booking.time?.substring(0, 5);
                const isActive = booking.status !== 'cancelled';
                return bookingDate === slotDate && bookingTime === time && isActive;
            }).length || 0;


            // If business is at full capacity, skip this time slot entirely
            if (totalBookingsAtTime >= totalBusinessCapacity) {
                continue;
            }

            // 🆕 Check if this time slot falls within any existing booking
            // (e.g., if there's a booking from 18:00-19:30, hide 18:00, 18:30, 19:00)
            const isSlotOccupiedByAnyBooking = existingBookings?.some(booking => {
                const bookingDateObj = new Date(booking.date + 'T00:00:00');
                const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;

                if (bookingDate !== slotDate) return false;
                if (booking.status === 'cancelled') return false;

                const bookingStartMinutes = timeToMinutes(booking.time);
                const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);
                const currentSlotMinutes = minutes;

                // Check if current slot falls within this booking's time range
                // (inclusive of start, exclusive of end)
                return currentSlotMinutes >= bookingStartMinutes && currentSlotMinutes < bookingEndMinutes;
            });

            // Skip this slot if it's occupied by any booking
            if (isSlotOccupiedByAnyBooking) {
                continue;
            }

            // Find which courts have availability at this time (considering capacity)
            const availableCourts = (providedResources || []).map(court => {
                // For padel courts, we don't check exact time match anymore
                // because we already filtered out occupied slots above
                // Just check if the court itself is available (not at capacity)

                const courtCapacity = court.capacity || 1;

                // Count how many bookings are active at this exact time for this court
                const bookingsCount = existingBookings?.filter(booking => {
                    const bookingDateObj = new Date(booking.date + 'T00:00:00');
                    const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
                    const matchesResource = booking.resource_id === court.id || booking.court_id === court.id;
                    const isActive = booking.status !== 'cancelled';

                    if (bookingDate !== slotDate || !matchesResource || !isActive) return false;

                    // Check if this booking overlaps with current time slot
                    const bookingStartMinutes = timeToMinutes(booking.time);
                    const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);

                    return minutes >= bookingStartMinutes && minutes < bookingEndMinutes;
                }).length || 0;

                const hasAvailability = bookingsCount < courtCapacity;

                return {
                    id: court.id,
                    name: court.name,
                    features: court.features || [],
                    price: court.price || 0,
                    sport: court.sport, // 🆕 Include sport type
                    slotsUsed: bookingsCount,
                    totalCapacity: courtCapacity,
                    hasAvailability
                };
            }).filter(court => court.hasAvailability);

            // Only add slot if at least one court has availability
            if (availableCourts.length > 0) {
                slots.push({
                    time,
                    availableCourts
                });
            }
        }

        return slots;
    };

    // Handle time slot selection (for sports)
    const handleTimeSlotSelect = (time) => {
        // Emit time selection to parent
        onTimeSelect(time, null);
    };

    // Handle court selection (for sports)
    const handleCourtSelect = (court) => {
        // Check if court has duration info (padel court)
        if (court.selectedDuration && court.finalPrice !== undefined) {
            // Padel court with duration selected
            onTimeSelect(selectedTimeSlot, court.id, court.selectedDuration, court.finalPrice);
        } else {
            // Regular court (football, tennis, etc.)
            onTimeSelect(selectedTimeSlot, court.id);
        }
    };

    // Get courts available for selected time slot
    const getCourtsForSelectedTime = () => {
        if (!selectedTimeSlot) return [];
        const availableSlots = generateUnifiedTimeSlots();
        const slot = availableSlots.find(s => s.time === selectedTimeSlot);
        return slot ? slot.availableCourts : [];
    };

    // FOR SERVICES: Render original flow (resource-first)
    if (type === 'service') {
        // For services: generate unified time slots with BUSINESS-LEVEL capacity
        const generateUnifiedServiceSlots = () => {
            const slots = [];
            let startMinutes, endMinutes;


            if (timeRanges && timeRanges.length > 0) {
                startMinutes = Math.min(...timeRanges.map(r => timeToMinutes(r.open)));
                endMinutes = Math.max(...timeRanges.map(r => {
                    const closeMinutes = timeToMinutes(r.close);
                    return closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
                }));
            } else {
                startMinutes = timeToMinutes(openingTime);
                const closeMinutes = timeToMinutes(closingTime);
                endMinutes = closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
            }

            // Get business capacity (total spaces)
            const totalCapacity = businessCapacity || providedResources?.length || 1;

            // Duration to check (default to interval or 60 if not provided)
            const durationToCheck = serviceDuration || interval || 60;

            for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                const time = minutesToTime(minutes);

                // 1. Check if START time is within operating hours
                // 1. Check if START time is within operating hours
                if (!isWithinOperatingHours(minutes)) continue;

                // Skip past times
                if (isPastTime(minutes)) continue;

                // 2. Check if END time extends beyond closing time
                // For services, we MUST finish before closing (or the end of the shift)
                const proposedEndMinutes = minutes + durationToCheck;

                // If using time ranges (split shifts), ensure the WHOLE duration fits in the SAME range
                let fitsInShift = false;
                if (timeRanges && timeRanges.length > 0) {
                    fitsInShift = timeRanges.some(range => {
                        const rStart = timeToMinutes(range.open);
                        const rClose = timeToMinutes(range.close);
                        const rEnd = rClose < rStart ? rClose + 1440 : rClose;
                        return minutes >= rStart && proposedEndMinutes <= rEnd;
                    });
                } else {
                    // Continuous hours
                    // Note: endMinutes is already the closing time (potentially +1440)
                    fitsInShift = proposedEndMinutes <= endMinutes;
                }

                if (!fitsInShift) continue; // Skip if finish time is outside business hours

                // 3. Check capacity availability for the WHOLE duration
                // We check availability at every 'interval' step within the duration
                // e.g. for 60m duration and 30m interval: check at t+0 and t+30
                let isFullyAvailable = true;
                let maxSlotsUsed = 0;

                for (let checkTime = minutes; checkTime < proposedEndMinutes; checkTime += interval) {
                    // Check if this specific intermediate slot is even within operating hours
                    if (!isWithinOperatingHours(checkTime)) {
                        isFullyAvailable = false;
                        break;
                    }

                    // Count bookings active at 'checkTime'
                    const slotDate = selectedDate instanceof Date
                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        : selectedDate;

                    const bookingsAtThisStep = existingBookings?.filter(booking => {
                        if (booking.status === 'cancelled') return false;

                        const bookingDateObj = new Date(booking.date + 'T00:00:00');
                        const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;

                        if (bookingDate !== slotDate) return false;

                        const bookingStart = timeToMinutes(booking.time);
                        const bookingDuration = booking.duration || 60;
                        const bookingEnd = bookingStart + bookingDuration;

                        // Check if booking is active at 'checkTime' (inclusive start, exclusive end)
                        return bookingStart <= checkTime && checkTime < bookingEnd;
                    }).length || 0;

                    if (bookingsAtThisStep >= totalCapacity) {
                        isFullyAvailable = false;
                        break;
                    }

                    maxSlotsUsed = Math.max(maxSlotsUsed, bookingsAtThisStep);
                }

                if (isFullyAvailable) {
                    slots.push({
                        time,
                        status: 'available',
                        slotsUsed: maxSlotsUsed,
                        totalCapacity: totalCapacity
                    });
                }
            }

            return slots;
        };

        const allSlots = generateUnifiedServiceSlots();

        // For services, show a unified view with all available slots
        return (
            <div style={{ maxWidth: '800px', margin: '20px auto 0', animation: 'slideUp 0.5s ease' }}>
                <div className="card" style={{ padding: '20px', textAlign: 'left' }}>
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '16px' }}>
                        Horarios Disponibles
                    </h4>

                    {/* Time slots grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: '10px'
                    }}>
                        {allSlots.filter(slot => slot.status === 'available').map((slot) => {
                            const isSelected = selectedTime?.time === slot.time;

                            return (
                                <button
                                    key={slot.time}
                                    onClick={() => onTimeSelect(slot.time, null)} // No courtId for services
                                    style={{
                                        padding: '12px 8px',
                                        borderRadius: '8px',
                                        border: isSelected ? `2px solid ${sportColor}` : '2px solid var(--border)',
                                        background: isSelected ? `${sportColor}15` : 'var(--card-bg)',
                                        color: isSelected ? sportColor : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: isSelected ? 'bold' : '500',
                                        transition: 'all 0.2s',
                                        textAlign: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.target.style.borderColor = sportColor;
                                            e.target.style.background = `${sportColor}08`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.target.style.borderColor = 'var(--border)';
                                            e.target.style.background = 'var(--card-bg)';
                                        }
                                    }}
                                >
                                    {slot.time}
                                </button>
                            );
                        })}
                    </div>

                    {allSlots.filter(slot => slot.status === 'available').length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📅</div>
                            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                No hay horarios disponibles
                            </p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                Todos los espacios están ocupados para esta fecha.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // FOR SPORTS: Render new time-first flow
    const availableSlots = generateUnifiedTimeSlots();

    return (
        <div style={{ maxWidth: '800px', margin: '20px auto 0', animation: 'slideUp 0.5s ease' }}>
            {/* Time Slot Grid */}
            <TimeSlotGrid
                availableSlots={availableSlots}
                selectedTimeSlot={selectedTimeSlot}
                onTimeSlotSelect={handleTimeSlotSelect}
                sportColor={sportColor}
            />

            {/* Court Selector (shows when time is selected) */}
            {selectedTimeSlot && (
                <CourtSelector
                    availableCourts={getCourtsForSelectedTime()}
                    selectedCourt={selectedTime?.courtId}
                    onCourtSelect={handleCourtSelect}
                    timeSlot={selectedTimeSlot}
                    sportColor={sportColor}
                    existingBookings={existingBookings}
                    selectedDate={selectedDate}
                    closingTime={closingTime}
                    getAvailableDurations={getAvailableDurations}
                />
            )}

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
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
export default TimeSlotPicker;

