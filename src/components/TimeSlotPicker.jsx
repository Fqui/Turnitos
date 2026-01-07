import React, { useState } from 'react';
import TimeSlotGrid from './TimeSlotGrid';
import CourtSelector from './CourtSelector';

export default function TimeSlotPicker({
    selectedTime,
    onTimeSelect,
    sportColor = '#00e676',
    type = 'sport',
    resources: providedResources,
    openingTime = '08:00',
    closingTime = '22:00',
    interval = 60,
    existingBookings = [],
    timeRanges = [],
    selectedDate = null
}) {
    const [selectedCourt, setSelectedCourt] = useState(null);

    // Use selectedTime.time directly from props
    const selectedTimeSlot = selectedTime?.time || null;

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

            // Find which courts are available at this time
            const availableCourts = (providedResources || []).filter(court => {
                return !isCourtBooked(court.id, time);
            }).map(court => ({
                id: court.id,
                name: court.name,
                features: court.features || []
            }));

            // Only add slot if at least one court is available
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
        // Generate slots per resource (original logic)
        const generateSlotsForResource = (resourceId) => {
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

            for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
                const time = minutesToTime(minutes);

                if (!isWithinOperatingHours(minutes)) continue;

                const isBooked = isCourtBooked(resourceId, time);

                slots.push({
                    time,
                    status: isBooked ? 'booked' : 'available'
                });
            }

            return slots;
        };

        const resources = (providedResources || []).map(resource => ({
            ...resource,
            slots: generateSlotsForResource(resource.id)
        }));

        return (
            <div style={{ maxWidth: '800px', margin: '20px auto 0', animation: 'slideUp 0.5s ease' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {resources.map(resource => (
                        <div key={resource.id} className="card" style={{ padding: '20px', textAlign: 'left' }}>
                            {resource.name !== 'Sin profesional asignado' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{resource.name}</h4>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            {resource.features.map((feat, i) => (
                                                <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                                    {feat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time slots grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                gap: '10px'
                            }}>
                                {resource.slots.filter(slot => slot.status === 'available').map((slot) => {
                                    // Check if this slot is selected (compare with courtId since that's what BusinessProfile stores)
                                    const isSelected = selectedTime?.time === slot.time && selectedTime?.courtId === resource.id;

                                    return (
                                        <button
                                            key={slot.time}
                                            onClick={() => onTimeSelect(slot.time, resource.id)}
                                            style={{
                                                padding: '12px 8px',
                                                borderRadius: '12px',
                                                border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                                backgroundColor: isSelected ? `${sportColor}15` : 'var(--bg-card)',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                fontWeight: isSelected ? '700' : '600',
                                                fontSize: '14px',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? `0 4px 12px ${sportColor}30` : '0 2px 8px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {slot.time}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

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
                    selectedCourt={selectedCourt}
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
