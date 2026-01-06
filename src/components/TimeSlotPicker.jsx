import React, { useState, useEffect } from 'react';

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
    selectedDate = null,
    maxCapacity = 1, // 🆕 Default to 1
    useDatabaseAvailability = false, // 🆕 Use SQL function for availability
    businessId = null // 🆕 Required for database availability
}) {
    const [availabilityCache, setAvailabilityCache] = useState({});

    // Preload availability from database when using database mode
    useEffect(() => {
        if (!useDatabaseAvailability || !businessId || !selectedDate || !providedResources) return;

        const loadAvailability = async () => {
            try {
                const supabaseService = (await import('../services/supabaseService')).default;
                const cache = {};

                for (const resource of providedResources) {
                    // Check availability for each hour slot
                    const startHour = parseInt(openingTime.split(':')[0]);
                    const endHour = parseInt(closingTime.split(':')[0]);

                    for (let hour = startHour; hour < endHour; hour++) {
                        const time = `${String(hour).padStart(2, '0')}:00`;
                        const startTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${time}:00`);
                        const endTime = new Date(startTime.getTime() + interval * 60000);

                        const result = await supabaseService.checkResourceAvailability(
                            resource.id,
                            startTime.toISOString(),
                            endTime.toISOString()
                        );

                        cache[`${resource.id}-${time}`] = result.available;
                    }
                }

                setAvailabilityCache(cache);
            } catch (error) {
                console.error('Error loading availability:', error);
                // Fall back to existing bookings logic
            }
        };

        loadAvailability();
    }, [useDatabaseAvailability, businessId, selectedDate, providedResources, openingTime, closingTime, interval]);

    // Helper to generate slots
    const generateSlots = (resourceId, resourcePrice) => {
        console.log('🔧 generateSlots called with:', {
            resourceId,
            resourcePrice,
            timeRanges,
            openingTime,
            closingTime,
            selectedDate: selectedDate?.toISOString().split('T')[0]
        });
        const slots = [];

        // 1. Determine the Full Operating Window (Earliest Open to Latest Close)
        // If timeRanges are provided (e.g. split shift), find the overall start and end.
        // If not, use openingTime and closingTime.
        let effectiveStartMinutes, effectiveEndMinutes;

        if (timeRanges && timeRanges.length > 0) {
            // Find earliest start
            const startTimes = timeRanges.map(r => {
                const [h, m] = r.open.split(':').map(Number);
                return h * 60 + m;
            });
            effectiveStartMinutes = Math.min(...startTimes);

            // Find latest close
            const endTimes = timeRanges.map(r => {
                const [h, m] = r.close.split(':').map(Number);
                // Handle late night closes (e.g. 02:00 is next day)
                // We assume if close < open it's overnight, but here we just need max relative value
                // For simplicity in this context, let's treat values < 5:00 as next day if we have late shifts
                return (h < 5 ? h + 24 : h) * 60 + m;
            });
            effectiveEndMinutes = Math.max(...endTimes);
        } else {
            const [startHour, startMinute] = openingTime.split(':').map(Number);
            const [endHour, endMinute] = closingTime.split(':').map(Number);
            effectiveStartMinutes = startHour * 60 + startMinute;
            effectiveEndMinutes = (endHour < startHour ? endHour + 24 : endHour) * 60 + endMinute;
        }


        // 2. Loop continuously from Start to End
        let currentTotalMinutes = effectiveStartMinutes;

        while (currentTotalMinutes < effectiveEndMinutes) {
            const currentHour = Math.floor(currentTotalMinutes / 60);
            const currentMinute = currentTotalMinutes % 60;
            const displayHour = currentHour % 24;
            const formattedTime = `${String(displayHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

            // 3. Check if this time falls within any ACTIVE range
            // If timeRanges is null/empty, we assume continuous day (so it's valid).
            // If timeRanges exists, we must check if formattedTime is inside one of them.
            let isActiveTime = true;

            if (timeRanges && timeRanges.length > 0) {
                // Convert current formatted time to minutes for comparison relative to the day start
                // We use currentTotalMinutes which is already absolute

                isActiveTime = timeRanges.some(range => {
                    const [rH, rM] = range.open.split(':').map(Number);
                    const [cH, cM] = range.close.split(':').map(Number);

                    const rStart = rH * 60 + rM;
                    const cEnd = (cH < rH ? cH + 24 : cH) * 60 + cM;

                    const isInRange = currentTotalMinutes >= rStart && currentTotalMinutes < cEnd;

                    if (formattedTime === '13:00' || formattedTime === '14:00' || formattedTime === '15:00') {
                        console.log(`⏰ Checking ${formattedTime} against range ${range.open}-${range.close}:`, {
                            currentTotalMinutes,
                            rStart,
                            cEnd,
                            isInRange
                        });
                    }

                    return isInRange;
                });

                if (formattedTime === '13:00' || formattedTime === '14:00' || formattedTime === '15:00') {
                    console.log(`✅ Final isActiveTime for ${formattedTime}:`, isActiveTime);
                }
            }



            // 4. Determine Availability
            // If NOT active time (it's a break), it's "blocked" by default (unavailable).
            // BUT we render it so admin/user sees it exists but is closed.

            // Find price from time_ranges or default
            let slotPrice = resourcePrice;
            if (timeRanges && timeRanges.length > 0) {
                const matchingRange = timeRanges.find(tr => {
                    const [rH, rM] = tr.open.split(':').map(Number);
                    const [cH, cM] = tr.close.split(':').map(Number);
                    // Simple string comparison works for HH:MM in 24h format if not overnight
                    // But using minutes is safer given our loop context
                    // For simplicity here reusing string compare if consistent, but let's stick to logic above or simple find
                    return formattedTime >= tr.open && formattedTime < tr.close;
                });
                if (matchingRange && matchingRange.price !== undefined) {
                    slotPrice = matchingRange.price;
                }
            }

            // Check existing bookings
            // Filter bookings for this specific resource and time
            const matchingBookings = existingBookings.filter(booking => {
                // Date Check
                const bookingDateStr = booking.date; // already YYYY-MM-DD
                const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
                if (bookingDateStr !== selectedDateStr) return false;

                // Time Check
                // Handle HH:MM:SS vs HH:MM
                const bookingTime = booking.time.substring(0, 5);
                if (bookingTime !== formattedTime) return false;

                // Resource Check
                // If booking has a specific resource, it must match.
                // If booking has NO resource (global block), it matches everything.
                if (booking.resource_id && booking.resource_id !== resourceId) return false;

                // Status Check
                const bookingStatus = booking.status?.toLowerCase() || '';
                return ['confirmed', 'blocked', 'deposit', 'pending', 'completed'].includes(bookingStatus);
            });

            // Calculate Availability based on Capacity
            const currentBookingCount = matchingBookings.length;

            // Check if ANY matching booking is a BLOCK status
            const hasBlockedStatus = matchingBookings.some(b => (b.status?.toLowerCase() || '') === 'blocked');

            // Determine if full
            // Priority 1: Use database availability if available (most accurate)
            let isFull;
            const cacheKey = `${resourceId}-${formattedTime}`;

            if (useDatabaseAvailability && availabilityCache.hasOwnProperty(cacheKey)) {
                // Use database result
                isFull = !availabilityCache[cacheKey] || !isActiveTime;
            } else {
                // Fallback to existing logic
                // A slot is full if:
                // 1. It is explicitly BLOCKED (admin block)
                // 2. OR capacity is reached
                // 3. OR it is a break time (isActiveTime === false)
                isFull = hasBlockedStatus || (currentBookingCount >= maxCapacity) || !isActiveTime;
            }

            // Debug Log for specific cases (optional, can be removed)
            if (!isActiveTime) {
                // console.log(`Slot ${formattedTime} is inactive (break time).`);
            }

            slots.push({
                time: formattedTime,
                available: !isFull,
                price: slotPrice,
                status: !isActiveTime ? 'blocked' : (isFull ? 'Ocupado' : 'Disponible'),
                isBreak: !isActiveTime, // Flag to identify break slots specifically
                // Keep original hour for chronological sorting
                _originalHour: currentHour,
                _originalMinute: currentMinute,
                _sortKey: currentTotalMinutes
            });

            currentTotalMinutes += interval;
        }

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

                        {/* Unified Grid View for all types (Service & Sport) */}
                        {(() => {
                            // Filter strictly for AVAILABLE slots
                            // This hides: Blocked, Break, and Occupied slots
                            const visibleSlots = resource.slots.filter(s => s.available);

                            if (visibleSlots.length === 0) {
                                return (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        No hay horarios disponibles para esta fecha
                                    </div>
                                );
                            }

                            return (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                                    gap: '12px'
                                }}>
                                    {visibleSlots.map((slot, index) => {
                                        const slotId = `${resource.id}-${slot.time}`;
                                        const isSelected = selectedTime?.id === slotId;

                                        // Slots here are guaranteed available, so no need for blocked checks

                                        return (
                                            <button
                                                key={`${index}-${slot.time}`}
                                                onClick={() => onTimeSelect({
                                                    id: slotId,
                                                    time: slot.time,
                                                    price: slot.price > 0 ? slot.price : undefined,
                                                    courtName: resource.name,
                                                    courtId: resource.id,
                                                    status: slot.status
                                                })}
                                                style={{
                                                    padding: '12px 20px',
                                                    borderRadius: '12px',
                                                    backgroundColor: isSelected
                                                        ? sportColor
                                                        : 'var(--bg-card)',
                                                    border: isSelected
                                                        ? `2px solid ${sportColor}`
                                                        : '1px solid var(--border)',
                                                    color: isSelected
                                                        ? '#fff'
                                                        : 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? `0 4px 12px ${sportColor}40` : 'none',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    opacity: 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
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
                                                title="Disponible"
                                            >
                                                {slot.time}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                ))}
            </div>
        </div>
    );
}

