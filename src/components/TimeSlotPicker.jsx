import React from 'react';

export default function TimeSlotPicker({
    selectedTime,
    onTimeSelect,
    sportColor,
    type = 'sport',
    resources: providedResources,
    openingTime = '08:00',
    closingTime = '22:00',
    interval = 60,
    existingBookings = [],
    timeRanges = [],
    selectedDate = null  // 🆕 Added selectedDate parameter
}) {
    // Helper to generate slots
    const generateSlots = (resourceId, resourcePrice) => {
        const slots = [];

        // Normalize ranges: if timeRanges is provided, use it; otherwise create a single range from opening/closing
        // timeRanges should be an array of { open: 'HH:MM', close: 'HH:MM' }
        const ranges = (timeRanges && timeRanges.length > 0)
            ? timeRanges
            : [{ open: openingTime, close: closingTime }];

        ranges.forEach(range => {
            const [startHour, startMinute] = range.open.split(':').map(Number);
            const [endHour, endMinute] = range.close.split(':').map(Number);

            let currentHour = startHour;
            let currentMinute = startMinute;

            const startTotalMinutes = startHour * 60 + startMinute;
            let endTotalMinutes = endHour * 60 + endMinute;

            // Handle overnight ranges (e.g., 22:00 to 02:00 becomes 22:00 to 26:00)
            if (endTotalMinutes <= startTotalMinutes) {
                endTotalMinutes += 24 * 60;
            }

            let currentTotalMinutes = startTotalMinutes;

            while (currentTotalMinutes < endTotalMinutes) {
                // Format time for display
                const displayHour = currentHour % 24;
                const formattedTime = `${String(displayHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

                // Find price from time_ranges if available, else use resource price
                let slotPrice = resourcePrice;
                if (timeRanges && timeRanges.length > 0) {
                    const matchingRange = timeRanges.find(tr => {
                        const rangeStart = tr.start || tr.open;
                        const rangeEnd = tr.end || tr.close;
                        return formattedTime >= rangeStart && formattedTime < rangeEnd;
                    });
                    if (matchingRange && matchingRange.price !== undefined) {
                        slotPrice = matchingRange.price;
                    }
                }

                // Check if this slot is already booked FOR THE SELECTED DATE
                // Convert selectedDate to YYYY-MM-DD format (local time, not UTC)
                const selectedDateStr = selectedDate
                    ? (selectedDate instanceof Date
                        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        : selectedDate)
                    : null;

                const isBooked = existingBookings?.some(booking => {
                    // Must match: resource_id, time, AND date
                    const bookingDateStr = booking.date instanceof Date
                        ? `${booking.date.getFullYear()}-${String(booking.date.getMonth() + 1).padStart(2, '0')}-${String(booking.date.getDate()).padStart(2, '0')}`
                        : booking.date;

                    const bookingMatches = booking.resource_id === resourceId
                        && booking.time === formattedTime
                        && bookingDateStr === selectedDateStr
                        && booking.status !== 'cancelled';

                    return bookingMatches;
                }) || false;

                slots.push({
                    time: formattedTime,
                    price: slotPrice,
                    available: !isBooked,
                    // Keep original hour for chronological sorting
                    _originalHour: currentHour,
                    _originalMinute: currentMinute,
                    _sortKey: currentTotalMinutes
                });

                // Increment time
                currentMinute += interval;
                currentTotalMinutes += interval;

                while (currentMinute >= 60) {
                    currentHour += 1;
                    currentMinute -= 60;
                }
            }
        });

        // Sort by chronological order using the sort key (preserves overnight slots)
        return slots.sort((a, b) => a._sortKey - b._sortKey);
    };


    const getResources = () => {
        if (providedResources && providedResources.length > 0) {
            return providedResources.map(resource => ({
                id: resource.id,
                name: resource.name,
                features: resource.sport ? [resource.sport] : [],
                slots: generateSlots(resource.id, resource.price || 0)
            }));
        }

        // Fallback for testing if no resources provided
        return [
            {
                id: 'default',
                name: 'Recurso General',
                features: ['Estándar'],
                slots: generateSlots('default', 0)
            }
        ];
    };

    const resources = getResources();

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto 0', animation: 'slideUp 0.5s ease' }}>
            {type === 'sport' && (
                <h3 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>
                    Disponibilidad por Cancha
                </h3>
            )}

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


                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: '12px'
                        }}>
                            {resource.slots.map((slot, index) => {
                                const slotId = `${resource.id}-${slot.time}`;
                                const isSelected = selectedTime?.id === slotId;

                                return (
                                    <button
                                        key={index}
                                        disabled={!slot.available}
                                        onClick={() => onTimeSelect({
                                            id: slotId,
                                            time: slot.time,
                                            price: slot.price > 0 ? slot.price : undefined,
                                            courtName: resource.name,
                                            courtId: resource.id // Pass the real court ID
                                        })}
                                        style={{
                                            padding: '16px 12px',
                                            borderRadius: '12px',
                                            backgroundColor: isSelected ? sportColor : (slot.available ? 'var(--bg-card)' : 'rgba(0,0,0,0.02)'),
                                            border: isSelected ? `2px solid ${sportColor}` : '1px solid var(--border)',
                                            color: isSelected ? '#fff' : (slot.available ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                            cursor: slot.available ? 'pointer' : 'not-allowed',
                                            opacity: slot.available ? 1 : 0.5,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s',
                                            boxShadow: isSelected ? `0 4px 12px ${sportColor}40` : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (slot.available && !isSelected) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', textDecoration: slot.available ? 'none' : 'line-through' }}>
                                            {slot.time}
                                        </span>
                                        {slot.price > 0 && (
                                            <span style={{ fontSize: '12px', opacity: 0.8 }}>
                                                ${slot.price.toLocaleString()}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
