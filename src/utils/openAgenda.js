// "Agenda abierta": free times of the next days for the story the business shares.
// The times come from the same functions as the public booking (availableSlots / rentalSchedule).
import { getDayHours, getSlotInterval, getServiceSlots, getSportSlots, getCourtDurations } from './availableSlots';
import { getRentalSchedule, hasRentalSchedule, getStartOptions } from './rentalSchedule';
import { groupCourtsBySport } from './sports';
import { isRentalBusiness } from './businessUtils';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const pad2 = (n) => String(n).padStart(2, '0');
export const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isActive = (item) => item && item.active !== false && item.is_active !== false;

function parseJson(value) {
    if (typeof value !== 'string') return value || {};
    try {
        return JSON.parse(value) || {};
    } catch {
        return {};
    }
}

// Dates from today, `count` days
export function nextDates(count, from = new Date()) {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

// Specialists that do this service, same order of preference as the public booking
function qualifiedSpecialists(business, service) {
    const all = business.specialists || [];
    const pick = (item) => {
        if (Array.isArray(item?.specialists) && item.specialists.length > 0) return item.specialists;
        if (Array.isArray(item?.specialist_ids) && item.specialist_ids.length > 0) {
            const filtered = all.filter(s => item.specialist_ids.includes(s.id));
            if (filtered.length > 0) return filtered;
        }
        if (item?.specialist_id) {
            const filtered = all.filter(s => s.id === item.specialist_id);
            if (filtered.length > 0) return filtered;
        }
        return null;
    };
    return pick(service) || pick((business.services || []).find(s => s.id === service?.id)) || all;
}

// What the slots are measured with: a service, a sport + duration, or a rental duration
export function getAgendaOptions(business) {
    if (!business) return [];

    if (isRentalBusiness(business)) {
        const hours = (Array.isArray(business.rental_duration_options) && business.rental_duration_options.length > 0
            ? business.rental_duration_options
            : [4]).map(Number).filter(h => h > 0);
        return hours.map(h => ({ key: `rental:${h}`, kind: 'rental', label: `${h} h`, durationHours: h }));
    }

    const courts = (business.courts || []).filter(isActive);
    if (business.type === 'sport' || courts.length > 0) {
        const groups = groupCourtsBySport(courts);
        const mixed = groups.length > 1;
        return groups.flatMap(group => {
            const durations = group.key === 'padel' ? [60, 90] : [60];
            return durations.map(duration => ({
                key: `sport:${group.key}:${duration}`,
                kind: 'sport',
                label: `${group.label} · ${duration} min`,
                sport: group.key,
                courts: group.courts,
                mixed,
                duration
            }));
        });
    }

    return (business.services || []).filter(isActive).map(service => ({
        key: `service:${service.id}`,
        kind: 'service',
        label: `${service.name} · ${service.duration || 60} min`,
        service,
        duration: service.duration || 60
    }));
}

// Free start times ("HH:MM") of one date. dayBookings: bookings of that date (rentals: of the date and the day before)
export function getFreeTimes(business, option, date, dayBookings, now = new Date()) {
    if (!business || !option) return [];
    const rules = parseJson(business.booking_rules);
    const minAdvanceHours = Number(rules?.advance_booking?.min_hours) || 0;
    const bufferMinutes = Number(rules?.time?.buffer_minutes) || 0;

    if (option.kind === 'rental') {
        const schedule = getRentalSchedule(business);
        if (!hasRentalSchedule(schedule)) return [];
        return getStartOptions(schedule, date, option.durationHours, dayBookings)
            .filter(o => o.available)
            .map(o => o.time);
    }

    const { open, close, ranges, isClosed } = getDayHours(business, date);
    if (isClosed || (open === '00:00' && close === '00:00')) return [];

    if (option.kind === 'sport') {
        const resources = option.courts;
        const ids = new Set(resources.map(c => c.id));
        const bookings = option.mixed
            ? dayBookings.filter(b => ids.has(b.resource_id) || ids.has(b.court_id))
            : dayBookings;
        const slotOptions = {
            resources,
            openingTime: open,
            closingTime: close,
            timeRanges: ranges,
            interval: getSlotInterval(business, option.mixed ? option.sport : (business.category || '')),
            existingBookings: bookings,
            selectedDate: date,
            businessCapacity: (!option.mixed && business.capacity) || resources.reduce((sum, r) => sum + (r.capacity || 1), 0),
            minAdvanceHours,
            bufferMinutes,
            now
        };
        // A court has to be free for the whole chosen duration
        return getSportSlots(slotOptions)
            .filter(slot => slot.availableCourts.some(c => getCourtDurations(slotOptions, c.id, slot.time, [option.duration]).length > 0))
            .map(slot => slot.time);
    }

    const specialists = qualifiedSpecialists(business, option.service);
    const resources = specialists.length > 0
        ? specialists.map(s => ({ id: s.id, capacity: s.capacity || 1 }))
        : [{ id: option.service?.id || 'no-specialist', capacity: 1 }];
    return getServiceSlots({
        resources,
        specialists,
        openingTime: open,
        closingTime: close,
        timeRanges: ranges,
        interval: getSlotInterval(business),
        existingBookings: dayBookings,
        selectedDate: date,
        businessCapacity: business.capacity || specialists.length || resources.length,
        serviceDuration: option.duration,
        minAdvanceHours,
        bufferMinutes,
        now
    }).map(slot => slot.time);
}

// Up to `max` times spread over the day (morning to evening), not just the first ones
export function pickSpread(times, max) {
    if (times.length <= max) return times;
    if (max <= 1) return times.slice(0, 1);
    const picked = new Set();
    for (let i = 0; i < max; i++) picked.add(Math.round(i * (times.length - 1) / (max - 1)));
    return [...picked].sort((a, b) => a - b).map(i => times[i]);
}

// Days with free times, ready to draw: [{ key, name, dayNumber, times }]
export function buildAgendaDays(business, option, dates, bookingsByDate, maxPerDay, now = new Date()) {
    return dates.map(date => {
        const key = toDateKey(date);
        let dayBookings = bookingsByDate[key] || [];
        if (option?.kind === 'rental') {
            const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
            dayBookings = [...(bookingsByDate[toDateKey(prev)] || []), ...dayBookings];
        }
        const times = pickSpread(getFreeTimes(business, option, date, dayBookings, now), maxPerDay);
        return { key, name: DAY_NAMES[date.getDay()], dayNumber: date.getDate(), times };
    }).filter(day => day.times.length > 0);
}
