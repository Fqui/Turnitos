import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import DurationSelector from './DurationSelector';
import { PADEL_DURATIONS, buildShiftRanges, findShift } from '../utils/courtHours';
import { promoSlotStyle, promoTagStyle, shortPromoLabel } from './promotions/promoSlotStyles';

const PadelTimeline = ({
    courts,
    selectedDate,
    existingBookings,
    openingTime,
    closingTime,
    timeRanges, // 🆕 Add timeRanges for split shifts
    onSlotSelect,
    sportColor = '#00e676',
    slotPromo = null
}) => {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [showDurationModal, setShowDurationModal] = useState(false);

    // Opening shifts of the day, to know where each booking has to end
    const shiftRanges = useMemo(() => buildShiftRanges(
        timeRanges && timeRanges.length > 0 ? timeRanges : [{ open: openingTime, close: closingTime }]
    ), [openingTime, closingTime, timeRanges]);

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

    // 🆕 Helper: Check if a time slot falls within operating hours (respects split shifts & midnight wraparound)
    const isWithinOperatingHours = (slotMinutes) => {
        const checkSlot = (sMin, openStr, closeStr) => {
            const openMin = timeToMinutes(openStr);
            let closeMin = timeToMinutes(closeStr);

            if (closeMin <= openMin) {
                closeMin += 1440;
            }

            let normalizedSlot = sMin;
            if (normalizedSlot < openMin && closeMin > 1440) {
                normalizedSlot += 1440;
            }

            return normalizedSlot >= openMin && normalizedSlot < closeMin;
        };

        if (!timeRanges || timeRanges.length === 0) {
            return checkSlot(slotMinutes, openingTime, closingTime);
        }

        return timeRanges.some(range => checkSlot(slotMinutes, range.open, range.close));
    };

    // Helper: Calculate end time
    const calculateEndTime = (startTime, durationMinutes) => {
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = startMinutes + durationMinutes;
        return minutesToTime(endMinutes % 1440);
    };

    // Helper: Check if time slot is occupied
    const isTimeSlotOccupied = (courtId, startTime, endTime) => {
        if (!selectedDate || !existingBookings) return false;

        const slotDate = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;

        const openMinutes = timeToMinutes(openingTime);

        let startMinutes = timeToMinutes(startTime);
        let endMinutes = timeToMinutes(endTime);

        if (startMinutes < openMinutes) startMinutes += 1440;
        if (endMinutes <= startMinutes) endMinutes += 1440;

        return existingBookings.some(booking => {
            const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;
            if (!matchesResource) return false;

            if (booking.status === 'cancelled') return false;

            const bookingDateObj = new Date(booking.date + 'T00:00:00');
            const bookingDate = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;
            if (bookingDate !== slotDate) return false;

            let bookingStartMinutes = timeToMinutes(booking.time);
            if (bookingStartMinutes < openMinutes) bookingStartMinutes += 1440;
            let bookingEndMinutes = bookingStartMinutes + (booking.duration || 60);

            return (startMinutes < bookingEndMinutes) && (endMinutes > bookingStartMinutes);
        });
    };

    // 🆕 Helper: Check if a time slot is in the past (only for today)
    const isPastTime = (slotTimeStr) => {
        if (!selectedDate) return false;

        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const slotDateStr = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : (typeof selectedDate === 'string' ? selectedDate.split('T')[0] : '');

        // Only filter if selected date is today
        if (slotDateStr !== currentDate) return false;

        const openMinutes = timeToMinutes(openingTime);
        let closeMinutes = timeToMinutes(closingTime);
        if (closeMinutes <= openMinutes) closeMinutes += 1440;

        let slotMinutes = timeToMinutes(slotTimeStr);
        if (slotMinutes < openMinutes && closeMinutes > 1440) {
            // Slot is after midnight tonight in the future
            return false;
        }

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        return slotMinutes <= currentMinutes;
    };

    // Helper: Get available durations for a slot
    const getAvailableDurations = (courtId, startTime) => {
        if (isPastTime(startTime)) {
            return []; // Past slots are not available for booking today
        }

        const availableDurations = [];

        // The booking has to end before its shift closes (split shifts and overnight included)
        const shift = findShift(startTime, shiftRanges);
        if (!shift) return [];

        PADEL_DURATIONS.forEach(duration => {
            const endMinutes = shift.start + duration;

            if (endMinutes > shift.end) {
                return;
            }

            const endTime = minutesToTime(endMinutes % 1440);
            const hasConflict = isTimeSlotOccupied(courtId, startTime, endTime);

            if (!hasConflict) {
                availableDurations.push(duration);
            }
        });

        return availableDurations;
    };

    // Generate time slots array (1 column per HOUR for perfect grid alignment like ATC Sports)
    const hours = useMemo(() => {
        const startMinutes = timeToMinutes(openingTime);
        let endMinutes = timeToMinutes(closingTime);

        if (endMinutes <= startMinutes) {
            endMinutes += 1440;
        }

        const hoursArray = [];
        const startHourMinutes = Math.floor(startMinutes / 60) * 60;
        for (let minutes = startHourMinutes; minutes < endMinutes; minutes += 60) {
            const normalizedMinutes = minutes % 1440;
            hoursArray.push(minutesToTime(normalizedMinutes));
        }
        return hoursArray;
    }, [openingTime, closingTime]);

    // Current time marker: only when the selected day is today, refreshed every minute
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const nowMarker = useMemo(() => {
        if (!selectedDate || hours.length === 0) return null;
        const day = selectedDate instanceof Date ? selectedDate : new Date(`${selectedDate}T00:00:00`);
        if (day.toDateString() !== now.toDateString()) return null;
        const startHourMinutes = Math.floor(timeToMinutes(openingTime) / 60) * 60;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        // Columns after midnight belong to the same grid: try both readings of "now"
        for (const minutes of [nowMinutes, nowMinutes + 1440]) {
            const offset = minutes - startHourMinutes;
            const index = Math.floor(offset / 60);
            if (offset >= 0 && index < hours.length) {
                return {
                    index,
                    left: `${((offset % 60) / 60) * 100}%`,
                    label: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                };
            }
        }
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, now, hours, openingTime]);

    const NOW_COLOR = '#FF5252';

    // If the grid scrolls sideways, bring the current time into view when the day opens
    const scrollRef = useRef(null);
    const nowIndex = nowMarker?.index;
    useEffect(() => {
        const container = scrollRef.current;
        if (nowIndex == null || !container || container.scrollWidth <= container.clientWidth) return;
        const line = container.querySelector('[data-now-line]');
        if (!line) return;
        const lineX = line.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft;
        container.scrollLeft = Math.max(0, lineX - container.clientWidth / 2);
    }, [nowIndex, selectedDate]);

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
            position: 'relative',
            width: '100%'
        }}>
            {/* Top Toolbar Header */}
            <div style={{
                marginBottom: '20px'
            }}>
                <h3 style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                }}>
                    Elige tu turno
                </h3>
            </div>

            {/* Main Timeline Grid (ATC Sports Layout) */}
            <div
                ref={scrollRef}
                className="custom-scrollbar"
                style={{
                    overflowX: 'auto',
                    overflowY: 'visible',
                    WebkitOverflowScrolling: 'touch',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-main)',
                    width: '100%'
                }}
            >
                <style>
                    {`
                        .custom-scrollbar::-webkit-scrollbar {
                            height: 7px;
                            background-color: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background-color: rgba(0,0,0,0.05);
                            border-radius: 4px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: rgba(156, 163, 175, 0.4);
                            border-radius: 4px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background-color: rgba(156, 163, 175, 0.7);
                        }
                        .atc-slot-hover:hover {
                            background-color: ${sportColor}38 !important;
                            cursor: pointer !important;
                        }
                    `}
                </style>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `210px repeat(${hours.length}, minmax(50px, 1fr))`,
                    rowGap: '0',
                    columnGap: '0',
                    width: '100%',
                    minWidth: '100%'
                }}>
                    {/* Corner Sticky Header */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'var(--bg-card)',
                        zIndex: 15
                    }} />

                    {/* Hours Header Row - 1 column per hour, 100% aligned with vertical grid lines */}
                    {hours.map((hour, hIdx) => (
                        <div
                            key={hour}
                            style={{
                                padding: '12px 0',
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-card)',
                                position: 'relative'
                            }}
                        >
                            {hour.split(':')[0]}
                            {nowMarker?.index === hIdx && (
                                <span
                                    title={`Ahora ${nowMarker.label}`}
                                    style={{
                                        position: 'absolute',
                                        left: nowMarker.left,
                                        bottom: '-1px',
                                        transform: 'translateX(-50%)',
                                        width: '0',
                                        height: '0',
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent',
                                        borderTop: `7px solid ${NOW_COLOR}`,
                                        zIndex: 20,
                                        pointerEvents: 'none'
                                    }}
                                />
                            )}
                        </div>
                    ))}

                    {/* Court Rows - Direct children of parent grid for 100% pixel-perfect column alignment */}
                    {courts.map((court, cIdx) => {
                        const courtBookings = getCourtBookings(court.id);
                        const isLastCourt = cIdx === courts.length - 1;

                        return (
                            <React.Fragment key={court.id}>
                                {/* Sticky Left Court Column */}
                                <div style={{
                                    padding: '0 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRight: '1px solid var(--border)',
                                    borderBottom: isLastCourt ? 'none' : '1px solid var(--border)',
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: 'var(--bg-card)',
                                    zIndex: 12,
                                    height: '56px',
                                    minHeight: '56px',
                                    maxHeight: '56px'
                                }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {court.name}
                                    </div>
                                </div>

                                {/* Direct Grid Children for every hour cell in this row */}
                                {hours.map((hour, hIdx) => {
                                    const hourMinutes = timeToMinutes(hour);
                                    const slot00Time = hour;
                                    const slot30Time = minutesToTime(hourMinutes + 30);

                                    const is00Available = isWithinOperatingHours(hourMinutes) && getAvailableDurations(court.id, slot00Time).length > 0;
                                    const is30Available = isWithinOperatingHours(hourMinutes + 30) && getAvailableDurations(court.id, slot30Time).length > 0;

                                    const promo00 = Boolean(slotPromo) && is00Available && slotPromo.isValid(slot00Time);
                                    const promo30 = Boolean(slotPromo) && is30Available && slotPromo.isValid(slot30Time);
                                    const borderBottom = isLastCourt ? 'none' : '1px solid var(--border)';
                                    const borderRight = '1px solid var(--border)';

                                    // Find if there is a booking overlapping this cell
                                    const booking = courtBookings.find(b => {
                                        const bStart = timeToMinutes(b.time);
                                        const bEnd = bStart + (b.duration || 60);
                                        return hourMinutes >= bStart && hourMinutes < bEnd;
                                    });

                                    return (
                                        <div
                                            key={hour}
                                            style={{
                                                height: '56px',
                                                backgroundColor: 'transparent',
                                                borderBottom,
                                                borderRight,
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            {/* Booking capsule segment if occupied - Overlaps cell borders cleanly */}
                                            {booking && (
                                                <div style={{
                                                    position: 'absolute',
                                                    left: (timeToMinutes(booking.time) === hourMinutes + 30) ? '50%' : '-1px',
                                                    right: (timeToMinutes(booking.time) + (booking.duration || 60) === hourMinutes + 30) ? '50%' : '-1px',
                                                    top: '8px',
                                                    bottom: '8px',
                                                    backgroundColor: '#607D8B', // ATC Slate Blue-Gray
                                                    borderTopLeftRadius: (timeToMinutes(booking.time) === hourMinutes) ? '8px' : ((timeToMinutes(booking.time) === hourMinutes + 30) ? '8px' : '0'),
                                                    borderBottomLeftRadius: (timeToMinutes(booking.time) === hourMinutes) ? '8px' : ((timeToMinutes(booking.time) === hourMinutes + 30) ? '8px' : '0'),
                                                    borderTopRightRadius: (timeToMinutes(booking.time) + (booking.duration || 60) === hourMinutes + 60) ? '8px' : ((timeToMinutes(booking.time) + (booking.duration || 60) === hourMinutes + 30) ? '8px' : '0'),
                                                    borderBottomRightRadius: (timeToMinutes(booking.time) + (booking.duration || 60) === hourMinutes + 60) ? '8px' : ((timeToMinutes(booking.time) + (booking.duration || 60) === hourMinutes + 30) ? '8px' : '0'),
                                                    zIndex: 15,
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                                }} />
                                            )}

                                            {/* Current time line */}
                                            {nowMarker?.index === hIdx && (
                                                <div data-now-line="" style={{
                                                    position: 'absolute',
                                                    left: nowMarker.left,
                                                    top: '-1px',
                                                    bottom: isLastCourt ? 0 : '-1px',
                                                    width: '2px',
                                                    transform: 'translateX(-1px)',
                                                    backgroundColor: NOW_COLOR,
                                                    boxShadow: `0 0 6px ${NOW_COLOR}80`,
                                                    zIndex: 20,
                                                    pointerEvents: 'none'
                                                }} />
                                            )}

                                            {/* Left half (:00 - :30) */}
                                            <div
                                                onClick={() => is00Available && handleSlotClick(court, slot00Time)}
                                                className={is00Available ? "atc-slot-hover" : ""}
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '50%',
                                                    cursor: is00Available ? 'pointer' : 'not-allowed',
                                                    borderRight: '1px dashed rgba(255, 255, 255, 0.05)',
                                                    backgroundColor: promo00 ? promoSlotStyle.backgroundColor : undefined,
                                                    zIndex: booking ? 1 : 2
                                                }}
                                            />

                                            {/* Right half (:30 - :00) */}
                                            <div
                                                onClick={() => is30Available && handleSlotClick(court, slot30Time)}
                                                className={is30Available ? "atc-slot-hover" : ""}
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '50%',
                                                    cursor: is30Available ? 'pointer' : 'not-allowed',
                                                    backgroundColor: promo30 ? promoSlotStyle.backgroundColor : undefined,
                                                    zIndex: booking ? 1 : 2
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Footer Legend */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '16px',
                marginTop: '18px',
                fontSize: '12px',
                color: 'var(--text-secondary)'
            }}>
                {/* Legend Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {slotPromo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '4px', ...promoSlotStyle }} />
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{shortPromoLabel(slotPromo.label)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: '#607D8B',
                            borderRadius: '4px'
                        }} />
                        <span>No disponible</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '14px',
                            height: '14px',
                            backgroundColor: sportColor,
                            borderRadius: '4px'
                        }} />
                        <span>Tu reserva</span>
                    </div>
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
                    getPrice={(duration) => {
                        const price = getPrice(selectedSlot.court, duration);
                        return slotPromo && slotPromo.isValid(selectedSlot.hour) ? slotPromo.apply(price) : price;
                    }}
                />
            )}
        </div>
    );
};

export default PadelTimeline;
