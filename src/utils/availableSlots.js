// Free time slots of one day, shared by the public booking (TimeSlotPicker) and the
// "Agenda abierta" story in the business panel, so both always show the same times.
// Pure functions: everything they need comes in the options object.
//
// Options:
//   resources        courts (sports) or specialist-like resources (services), with capacity
//   specialists      specialists qualified for the service (services only)
//   openingTime      "HH:MM" of the day
//   closingTime      "HH:MM" of the day (earlier than opening = closes after midnight)
//   timeRanges       [{ open, close }] split shifts, optional
//   interval         minutes between slot starts
//   existingBookings bookings of the day (blocks included, they come as bookings)
//   selectedDate     Date (or "YYYY-MM-DD" for services)
//   businessCapacity total concurrent bookings allowed (fallback when no resources)
//   serviceDuration  minutes the service takes; it must end before the range closes
//   minAdvanceHours  minimum hours of advance booking
//   bufferMinutes    cleaning time between bookings
//   now              current time, defaults to new Date()

const pad2 = (n) => String(n).padStart(2, '0');

const localDateKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// "HH:MM" to minutes, 0 for anything else
export function timeToMinutes(time) {
    if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${pad2(h)}:${pad2(m)}`;
}

function getValidTimeRanges(timeRanges) {
    if (!Array.isArray(timeRanges)) return [];
    return timeRanges.filter(r => r && typeof r.open === 'string' && typeof r.close === 'string' && r.open.trim() && r.close.trim());
}

// Is the slot within operating hours? Handles midnight crossing and split shifts
function isWithinOperatingHours(slotMinutes, { openingTime, closingTime, timeRanges }) {
    const checkRange = (sMin, openStr, closeStr) => {
        if (!openStr || !closeStr) return true;
        const rangeStart = timeToMinutes(openStr);
        const rangeClose = timeToMinutes(closeStr);
        const rangeEnd = rangeClose <= rangeStart ? rangeClose + 1440 : rangeClose;

        let normalizedSlot = sMin;
        if (normalizedSlot < rangeStart && rangeEnd > 1440) {
            normalizedSlot += 1440;
        }
        return normalizedSlot >= rangeStart && normalizedSlot < rangeEnd;
    };

    const validTimeRanges = getValidTimeRanges(timeRanges);
    if (validTimeRanges.length === 0) {
        return checkRange(slotMinutes, openingTime || '08:00', closingTime || '20:00');
    }
    return validTimeRanges.some(range => checkRange(slotMinutes, range.open, range.close));
}

// Is the slot in the past or within the minimum advance hours?
function isPastTime(slotMinutes, { selectedDate, minAdvanceHours = 0, now = new Date() }) {
    if (!selectedDate) return false;

    const currentDate = localDateKey(now);
    const slotDate = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    const slotDateStr = localDateKey(slotDate);

    // Full slot datetime to compare against now + minAdvanceHours
    const slotDateTime = new Date(slotDate);
    slotDateTime.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);

    // After midnight of the current shift (>= 1440) it is later tonight, in the future
    if (slotMinutes >= 1440 && slotDateStr === currentDate) return false;

    const minAllowedTime = new Date(now.getTime() + (minAdvanceHours * 60 * 60 * 1000));
    return slotDateTime <= minAllowedTime;
}

const bookingLocalDate = (booking) => localDateKey(new Date(booking.date + 'T00:00:00'));

// Is the court busy (any active booking, buffer included) between startTime and endTime?
function isTimeSlotOccupied(courtId, startTime, endTime, { selectedDate, existingBookings, bufferMinutes = 0 }) {
    if (!selectedDate || !existingBookings) return false;

    const slotDate = selectedDate instanceof Date ? localDateKey(selectedDate) : selectedDate;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return existingBookings.some(booking => {
        const matchesResource = booking.resource_id === courtId || booking.court_id === courtId;
        if (!matchesResource) return false;
        if (booking.status === 'cancelled') return false;
        if (bookingLocalDate(booking) !== slotDate) return false;

        const bookingStartMinutes = timeToMinutes(booking.time);
        const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60) + (bufferMinutes || 0);

        // Overlap: (start < bookingEnd + buffer) AND (end + buffer > bookingStart)
        const effectiveEndMinutes = endMinutes + (bufferMinutes || 0);
        return (startMinutes < bookingEndMinutes) && (effectiveEndMinutes > bookingStartMinutes);
    });
}

// Durations (minutes) a court can be booked for starting at startTime, before closing and without overlaps
export function getCourtDurations(options, courtId, startTime, durations = [60, 90, 120]) {
    const { openingTime, closingTime } = options;
    let closeMinutes = timeToMinutes(closingTime);
    const startMinutes = timeToMinutes(startTime);
    const openMinutes = timeToMinutes(openingTime);

    // Midnight crossing: open=18:00, close=03:00 -> close is 03:00 of the next day
    if (closeMinutes < openMinutes) {
        closeMinutes += 1440;
    }

    return durations.filter(duration => {
        const endTime = minutesToTime(startMinutes + duration);
        let endMinutes = timeToMinutes(endTime);
        if (endMinutes < startMinutes) {
            endMinutes += 1440;
        }
        if (endMinutes > closeMinutes) return false;
        return !isTimeSlotOccupied(courtId, startTime, endTime, options);
    });
}

// Sports: start times with at least one court free (business-level capacity first)
export function getSportSlots(options) {
    const {
        resources,
        openingTime,
        closingTime,
        timeRanges,
        interval = 30,
        existingBookings,
        selectedDate,
        businessCapacity,
        bufferMinutes = 0
    } = options;
    const slots = [];

    // Full operating window
    let startMinutes, endMinutes;
    if (timeRanges && timeRanges.length > 0) {
        startMinutes = Math.min(...timeRanges.map(r => timeToMinutes(r.open)));
        endMinutes = Math.max(...timeRanges.map(r => {
            const closeMinutes = timeToMinutes(r.close);
            // Close earlier than open is the next day (00:00 = 24:00)
            return closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
        }));
    } else {
        startMinutes = timeToMinutes(openingTime);
        const closeMinutes = timeToMinutes(closingTime);
        endMinutes = closeMinutes < startMinutes ? closeMinutes + 1440 : closeMinutes;
    }

    // Sum of the resource capacities, or the business capacity as fallback
    const totalBusinessCapacity = resources && resources.length > 0
        ? resources.reduce((sum, r) => sum + (r.capacity || 1), 0)
        : (businessCapacity || 1);

    const slotDate = selectedDate instanceof Date ? localDateKey(selectedDate) : selectedDate;

    const isActiveAt = (booking, minutes) => {
        const bookingStartMinutes = timeToMinutes(booking.time);
        const bookingEndMinutes = bookingStartMinutes + (booking.duration || 60) + (bufferMinutes || 0);
        return minutes >= bookingStartMinutes && minutes < bookingEndMinutes;
    };

    for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
        const time = minutesToTime(minutes);

        if (!isWithinOperatingHours(minutes, options)) continue;
        if (isPastTime(minutes, options)) continue;

        // Business-level capacity (total concurrent bookings)
        const totalBookingsAtTime = existingBookings?.filter(booking => {
            if (bookingLocalDate(booking) !== slotDate || booking.status === 'cancelled') return false;
            return isActiveAt(booking, minutes);
        }).length || 0;

        if (totalBookingsAtTime >= totalBusinessCapacity) continue;

        // Courts with room at this time
        const availableCourts = (resources || []).map(court => {
            const courtCapacity = court.capacity || 1;
            const bookingsCount = existingBookings?.filter(booking => {
                const matchesResource = booking.resource_id === court.id || booking.court_id === court.id;
                if (bookingLocalDate(booking) !== slotDate || !matchesResource || booking.status === 'cancelled') return false;
                return isActiveAt(booking, minutes);
            }).length || 0;

            return {
                id: court.id,
                name: court.name,
                features: court.features || [],
                price: court.price || 0,
                sport: court.sport,
                slotsUsed: bookingsCount,
                totalCapacity: courtCapacity,
                hasAvailability: bookingsCount < courtCapacity
            };
        }).filter(court => court.hasAvailability);

        if (availableCourts.length > 0) {
            slots.push({ time, availableCourts });
        }
    }

    return slots;
}

// Services: start times where the whole service fits in a range and a specialist (or capacity) is free
export function getServiceSlots(options) {
    const {
        resources,
        specialists,
        openingTime,
        closingTime,
        timeRanges,
        interval = 30,
        existingBookings,
        selectedDate,
        businessCapacity,
        serviceDuration,
        bufferMinutes = 0
    } = options;
    const slots = [];

    // Base operating ranges
    let activeRanges = [];
    if (Array.isArray(timeRanges) && timeRanges.length > 0) {
        activeRanges = timeRanges.filter(r => r && r.open && r.close);
    }
    if (activeRanges.length === 0) {
        const o = (openingTime && openingTime !== '00:00') ? openingTime : '08:00';
        const c = (closingTime && closingTime !== '00:00') ? closingTime : '20:00';
        activeRanges = [{ open: o, close: c }];
    }

    const durationToCheck = serviceDuration || interval || 30;
    const stepInterval = interval || 30;

    const slotDate = selectedDate instanceof Date
        ? localDateKey(selectedDate)
        : (typeof selectedDate === 'string' ? selectedDate.split('T')[0] : '');

    const activeSpecialists = Array.isArray(specialists) && specialists.length > 0 ? specialists : [];
    const hasSpecialists = activeSpecialists.length > 0;
    const totalCap = hasSpecialists
        ? activeSpecialists.length
        : Math.max(1, businessCapacity || resources?.length || 1);

    // Each operating range (e.g. 08:00-13:00, 16:00-20:00)
    activeRanges.forEach(range => {
        const rStart = timeToMinutes(range.open);
        const rClose = timeToMinutes(range.close);
        const rEnd = rClose <= rStart ? rClose + 1440 : rClose;

        for (let min = rStart; min + durationToCheck <= rEnd; min += stepInterval) {
            if (isPastTime(min, options)) continue;

            const slotStart = min;
            const slotEnd = min + durationToCheck;

            // Active bookings on this date that overlap [slotStart, slotEnd)
            const overlappingBookings = (existingBookings || []).filter(b => {
                if (b.status === 'cancelled') return false;
                const bDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
                if (bDate && slotDate && bDate !== slotDate) return false;

                const bStart = timeToMinutes(b.time);
                const buffer = bufferMinutes || 0;
                const bEnd = bStart + (b.duration || 60) + buffer;

                // Same rule as the specialist assignment in BusinessProfile
                return slotStart < bEnd && (slotEnd + buffer) > bStart;
            });

            let availableCount;
            if (hasSpecialists) {
                const busySpecialistIds = new Set();
                let unassignedCount = 0;
                overlappingBookings.forEach(b => {
                    const specId = b.specialist_id || b.metadata?.specialist_id || b.metadata?.specialist_id_raw;
                    if (specId) busySpecialistIds.add(String(specId));
                    else unassignedCount++;
                });
                const freeSpecialists = activeSpecialists.filter(spec => !busySpecialistIds.has(String(spec.id)));
                availableCount = Math.max(0, freeSpecialists.length - unassignedCount);
            } else {
                availableCount = Math.max(0, totalCap - overlappingBookings.length);
            }

            if (availableCount > 0) {
                slots.push({
                    time: minutesToTime(min),
                    status: 'available',
                    slotsUsed: totalCap - availableCount,
                    totalCapacity: totalCap,
                    availableCount
                });
            }
        }
    });

    return slots;
}

// Hours of one date: special days first (closed / special hours), then the weekly schedule.
// Returns { open, close, ranges?, isClosed? }; closed days come as 00:00-00:00.
export function getDayHours(business, date) {
    let hours = business?.hours;
    const defaultHours = { open: '08:00', close: '20:00' };

    if (!hours) return defaultHours;

    if (typeof hours === 'string') {
        try {
            if (hours.trim().startsWith('{') || hours.trim().startsWith('[')) {
                hours = JSON.parse(hours);
            }
        } catch {
            // Not JSON: read it as "HH:MM - HH:MM" below
        }
    }

    if (typeof hours === 'string') {
        const matches = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (matches) {
            return { open: matches[1], close: matches[2] };
        }
        return defaultHours;
    }

    const toDateObj = (value) => (value instanceof Date
        ? value
        : new Date(typeof value === 'string' && !value.includes('T') ? `${value}T00:00:00` : value));

    // special_days override
    const specialDays = business?.special_days || [];
    if (specialDays.length > 0 && date) {
        const dateStr = localDateKey(toDateObj(date));
        const matchedSpecialDay = specialDays.find(sd => sd.date === dateStr);
        if (matchedSpecialDay) {
            if (matchedSpecialDay.type === 'closed' || matchedSpecialDay.type === 'holiday') {
                return { open: '00:00', close: '00:00', isClosed: true };
            }
            if (matchedSpecialDay.type === 'special_hours' && matchedSpecialDay.open && matchedSpecialDay.close) {
                return { open: matchedSpecialDay.open, close: matchedSpecialDay.close };
            }
        }
    }

    if (!date) return defaultHours;

    const daysEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysEs = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const daysEsAccents = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    const dayIndex = toDateObj(date).getDay();
    const dayNameEn = daysEn[dayIndex];
    const dayNameEs = daysEs[dayIndex];

    let schedule = null;
    if (typeof hours === 'object' && hours !== null) {
        schedule = hours[dayNameEn] ||
                   hours[dayNameEs] ||
                   hours[daysEsAccents[dayIndex]] ||
                   hours[dayNameEn.toUpperCase()] ||
                   hours[dayNameEs.toUpperCase()] ||
                   hours[dayIndex];
    }

    if (!schedule) return defaultHours;

    if (schedule.isOpen === false) {
        return { open: '00:00', close: '00:00', isClosed: true };
    }

    if (schedule.isSplit) {
        const o1 = schedule.open || '08:00';
        const c1 = schedule.breakStart || '13:00';
        const o2 = schedule.breakEnd || '16:00';
        const c2 = schedule.close || '20:00';
        return {
            open: o1,
            close: c2,
            ranges: [
                { open: o1, close: c1 },
                { open: o2, close: c2 }
            ]
        };
    }

    return {
        open: schedule.open || '08:00',
        close: schedule.close || '20:00',
        ranges: (Array.isArray(schedule.ranges) && schedule.ranges.length > 0) ? schedule.ranges : undefined
    };
}

// Minutes between slot starts: the business setting, else 30 for services and pádel, 60 for other sports
export function getSlotInterval(business, sportName = '') {
    let hoursObj = business?.hours;
    if (typeof hoursObj === 'string') {
        try {
            hoursObj = JSON.parse(hoursObj);
        } catch {
            hoursObj = {};
        }
    }

    let defaultInterval = 60;
    if (business?.type === 'service') {
        defaultInterval = 30;
    } else if (business?.type === 'sport') {
        const sport = String(sportName || '').toLowerCase();
        if (sport.includes('padel') || sport.includes('paddle')) {
            defaultInterval = 30;
        }
    }

    return (hoursObj?.interval && hoursObj.interval > 0) ? hoursObj.interval : defaultInterval;
}
