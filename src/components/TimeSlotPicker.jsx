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
    businessCapacity // ✅ NEW: Total capacity of the business (number of spaces)
}) => {
    // Use selectedTime.time directly from props
    const selectedTimeSlot = selectedTime?.time || null;

    // 🔍 Debug: Log resources and business capacity
    console.log('📊 TimeSlotPicker received:', {
        resources: providedResources,
        businessCapacity,
        existingBookings: existingBookings?.length
    });

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

        // Generate all possible time slots
        for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
            const time = minutesToTime(minutes);

            // Skip if not within operating hours (handles split shifts)
            if (!isWithinOperatingHours(minutes)) {
                continue;
            }

            // Find which courts have availability at this time (considering capacity)
            const availableCourts = (providedResources || []).map(court => {
                const slotDate = selectedDate?.toISOString().split('T')[0];

                // Count bookings for this court at this time
                const bookingsCount = existingBookings?.filter(booking => {
                    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
                    const bookingTime = booking.time?.substring(0, 5);
                    const matchesResource = booking.resource_id === court.id || booking.court_id === court.id;
                    const isActive = booking.status !== 'cancelled';

                    return bookingDate === slotDate && bookingTime === time && matchesResource && isActive;
                }).length || 0;

                const courtCapacity = court.capacity || 1;
                const hasAvailability = bookingsCount < courtCapacity;

                return {
                    id: court.id,
                    name: court.name,
                    features: court.features || [],
                    slotsUsed: bookingsCount,
                    totalCapacity: courtCapacity,
                    hasAvailability
                };
            }).filter(court => court.hasAvailability); // Only include courts with at least 1 space available

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
        setSelectedCourt(null); // Reset court selection when time changes
        // Emit time selection to parent
        onTimeSelect(time, null);
    };

    // Handle court selection (for sports)
    const handleCourtSelect = (court) => {
        setSelectedCourt(court);
        // Emit final selection to parent
        onTimeSelect(selectedTimeSlot, court.id);
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

            for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                const time = minutesToTime(minutes);

                if (!isWithinOperatingHours(minutes)) continue;

                // Count ALL bookings for this business at this time (business-level)
                const slotDate = selectedDate?.toISOString().split('T')[0];
                const businessBookingsCount = existingBookings?.filter(booking => {
                    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
                    const bookingTime = booking.time?.substring(0, 5);
                    const isActive = booking.status !== 'cancelled';

                    return bookingDate === slotDate && bookingTime === time && isActive;
                }).length || 0;

                // Slot is available if total bookings < business capacity
                const isAvailable = businessBookingsCount < totalCapacity;

                // 🔍 Debug log for specific slots
                if (time === '09:00' || time === '09:30') {
                    console.log(`🕐 Service Slot ${time}:`, {
                        totalCapacity,
                        businessBookingsCount,
                        isAvailable,
                        selectedDate: slotDate
                    });
                }

                slots.push({
                    time,
                    status: isAvailable ? 'available' : 'booked',
                    slotsUsed: businessBookingsCount,
                    totalCapacity: totalCapacity
                });
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
                    selectedCourt={selectedTime?.courtId} // Pass selectedTime.courtId directly
                    onCourtSelect={handleCourtSelect}
                    timeSlot={selectedTimeSlot}
                    sportColor={sportColor}
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
