// Helpers shared by the phone views of the business portal (reservas, calendario, detalle)

const DAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export const PHONE_MAX_WIDTH = 768;

export const isPhoneWidth = () => typeof window !== 'undefined' && window.innerWidth <= PHONE_MAX_WIDTH;

export const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

export const pad2 = (n) => String(n).padStart(2, '0');

export const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayKey = () => toDateKey(new Date());

// Bookings may come as YYYY-MM-DD or the legacy DD/MM/YYYY
export const bookingDateKey = (booking) => {
    const raw = String(booking?.date || '');
    if (raw.includes('/')) {
        const [d, m, y] = raw.split('/');
        return `${y}-${pad2(m)}-${pad2(d)}`;
    }
    return raw.slice(0, 10);
};

export const keyToDate = (key) => {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export const addDaysToKey = (key, days) => {
    const d = keyToDate(key);
    d.setDate(d.getDate() + days);
    return toDateKey(d);
};

export const shortDate = (key) => {
    const d = keyToDate(key);
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};

export const dayShortName = (key) => DAY_NAMES[keyToDate(key).getDay()];

// "Hoy", "Mañana", "Ayer" or the day name
export const relativeDayLabel = (key) => {
    const today = todayKey();
    if (key === today) return 'Hoy';
    if (key === addDaysToKey(today, 1)) return 'Mañana';
    if (key === addDaysToKey(today, -1)) return 'Ayer';
    const name = dayShortName(key);
    return name.charAt(0).toUpperCase() + name.slice(1);
};

export const isBookingBlocked = (booking) => booking?.status === 'blocked' ||
    booking?.is_blocked ||
    String(booking?.customer_name || booking?.customerName || '').toUpperCase().includes('BLOQUEADO');

// "MARÍA DEL VALLE" -> "María Del Valle"; mixed-case names stay as typed
export const toTitleCase = (name) => {
    const str = String(name || '').trim();
    if (!str) return '';
    if (str !== str.toUpperCase() && str !== str.toLowerCase()) return str;
    return str.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
};

export const bookingTime = (booking) => {
    const t = String(booking?.time || '').slice(0, 5);
    return t && t !== '00:00' ? t : '';
};

export const bookingDuration = (booking) => Number(booking?.duration || booking?.metadata?.duration) ||
    (Number(booking?.metadata?.duration_hours) ? Number(booking.metadata.duration_hours) * 60 : 0) || 60;

export const addMinutesToTime = (time, minutes) => {
    const [h, m] = String(time || '00:00').split(':').map(Number);
    const total = (h || 0) * 60 + (m || 0) + (Number(minutes) || 0);
    return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
};

export const bookingPrice = (booking) => Number(booking?.price || booking?.total_price || booking?.totalPrice || 0);

export const bookingDeposit = (booking) => Number(booking?.deposit_amount || booking?.depositAmount ||
    booking?.metadata?.deposit_amount || booking?.metadata?.depositAmount || 0);

export const blockReason = (booking) => {
    const name = String(booking?.customer_name || booking?.customerName || '');
    const fromName = name.includes(':') ? name.split(':').slice(1).join(':').trim() : '';
    return fromName || booking?.notes || booking?.metadata?.notes || 'Bloqueado';
};

export const bookingServiceName = (booking, business) => {
    const service = (business?.services || []).find(s => String(s.id) === String(booking?.service_id || booking?.serviceId));
    const court = (business?.courts || []).find(c => String(c.id) === String(booking?.court_id || booking?.courtId));
    return booking?.services?.name || booking?.courts?.name || service?.name || court?.name || booking?.service || '';
};

// Who or where: the professional for services, the court for sports
export const bookingResourceName = (booking, business) => {
    const specialist = (business?.specialists || []).find(sp => String(sp.id) === String(booking?.specialist_id || booking?.specialistId));
    if (specialist) return specialist.name;
    const court = (business?.courts || []).find(c => String(c.id) === String(booking?.court_id || booking?.courtId));
    return court?.name || booking?.courts?.name || '';
};

// Phone status: a pending booking with a deposit is waiting for it; without one it only needs confirming
export const STATUS_META = {
    unconfirmed: { label: 'Sin confirmar', tone: 'pend' },
    deposit_due: { label: 'Seña pendiente', tone: 'warn' },
    deposit_paid: { label: 'Señado', tone: 'pend' },
    confirmed: { label: 'Confirmado', tone: 'ok' },
    attended: { label: 'Presente', tone: 'ok' },
    completed: { label: 'Finalizado', tone: 'done' },
    cancelled: { label: 'Cancelado', tone: 'bad' },
    blocked: { label: 'Bloqueado', tone: 'pend' }
};

export const mobileStatusKey = (booking) => {
    if (isBookingBlocked(booking)) return 'blocked';
    if (booking?.status === 'pending') return bookingDeposit(booking) > 0 ? 'deposit_due' : 'unconfirmed';
    return STATUS_META[booking?.status] ? booking.status : 'unconfirmed';
};

export const needsAction = (booking) => !isBookingBlocked(booking) &&
    (booking?.status === 'pending' || booking?.status === 'deposit_paid');

export const waLink = (phone, text = '') => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    // Local numbers (380 4xx-xxxx) get the Argentina mobile prefix
    if (!digits.startsWith('54')) digits = `549${digits.replace(/^0/, '')}`;
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

// "Hoy · lun 20/10" for the nearby days, "Jue 23/10" for the rest
export const dayHeader = (key) => {
    const rel = relativeDayLabel(key);
    const date = shortDate(key);
    if (['Hoy', 'Mañana', 'Ayer'].includes(rel)) return `${rel} · ${date}`;
    return date.charAt(0).toUpperCase() + date.slice(1);
};
