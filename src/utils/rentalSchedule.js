// Horarios de ingreso de alquileres (quinchos, salones, quintas).
// Se guardan en business.metadata.rental_schedule:
//   start_times: { "0": ["10:00"], "5": ["10:00", "18:00"], ... }  clave = día de la semana (0 = domingo)
//   max_end: minutos desde las 00:00 del día de la reserva (1560 = 02:00 del día siguiente), null = sin tope
// La base valida lo mismo en guard_public_booking.

export const WEEK_DAYS = [
    { key: '1', short: 'Lun', label: 'Lunes' },
    { key: '2', short: 'Mar', label: 'Martes' },
    { key: '3', short: 'Mié', label: 'Miércoles' },
    { key: '4', short: 'Jue', label: 'Jueves' },
    { key: '5', short: 'Vie', label: 'Viernes' },
    { key: '6', short: 'Sáb', label: 'Sábado' },
    { key: '0', short: 'Dom', label: 'Domingo' }
];

export function timeToMinutes(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function getRentalSchedule(business) {
    const raw = business?.metadata?.rental_schedule || {};
    const startTimes = {};
    WEEK_DAYS.forEach(({ key }) => {
        const list = Array.isArray(raw.start_times?.[key]) ? raw.start_times[key] : [];
        startTimes[key] = [...new Set(list.filter(t => timeToMinutes(t) !== null))]
            .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    });
    const maxEnd = raw.max_end === null || raw.max_end === undefined || raw.max_end === '' ? null : Number(raw.max_end);
    return { startTimes, maxEnd: Number.isFinite(maxEnd) ? maxEnd : null };
}

export function hasRentalSchedule(schedule) {
    return Object.values(schedule?.startTimes || {}).some(list => list.length > 0);
}

function dayStart(date) {
    const d = date instanceof Date ? new Date(date) : new Date(`${String(date).slice(0, 10)}T00:00:00`);
    d.setHours(0, 0, 0, 0);
    return d;
}

function overlapsBooking(bookings, start, end) {
    return (bookings || []).some(b => {
        if (['cancelled', 'rejected'].includes(b.status)) return false;
        if (!b.start_time || !b.end_time) return false;
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return bStart < end && bEnd > start;
    });
}

// Horarios de ingreso de una fecha con su salida y si se pueden elegir.
// reason: 'past' | 'max_end' | 'taken'
export function getStartOptions(schedule, date, durationHours, bookings = []) {
    if (!date) return [];
    const base = dayStart(date);
    const list = schedule.startTimes[String(base.getDay())] || [];
    const durationMin = Math.round(Number(durationHours || 0) * 60);
    const now = new Date();
    return list.map(time => {
        const startMin = timeToMinutes(time);
        const endMin = startMin + durationMin;
        const start = new Date(base.getTime() + startMin * 60000);
        const end = new Date(base.getTime() + endMin * 60000);
        let reason = null;
        if (start <= now) reason = 'past';
        else if (schedule.maxEnd !== null && endMin > schedule.maxEnd) reason = 'max_end';
        else if (overlapsBooking(bookings, start, end)) reason = 'taken';
        return { time, startMin, endMin, endTime: minutesToTime(endMin), nextDay: endMin >= 1440, available: !reason, reason };
    });
}

// Una fecha está completa si con ninguna de las duraciones entra algún horario
export function isRentalDateFull(schedule, date, durationOptions, bookings = []) {
    const durations = (durationOptions && durationOptions.length) ? durationOptions : [4];
    return !durations.some(h => getStartOptions(schedule, date, h, bookings).some(o => o.available));
}

export function formatEndTime(option) {
    if (!option) return '';
    return `${option.endTime}${option.nextDay ? ' (día siguiente)' : ''}`;
}
