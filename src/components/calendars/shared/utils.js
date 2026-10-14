/**
 * Formatea una fecha como YYYY-MM-DD
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Convierte un string de tiempo a minutos
 * @param {string} timeStr - Tiempo en formato HH:MM
 * @returns {number} Minutos desde medianoche
 */
export function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Convierte minutos a string de tiempo
 * @param {number} minutes - Minutos desde medianoche
 * @returns {string} Tiempo en formato HH:MM
 */
export function minutesToTime(minutes) {
    const totalHours = Math.floor(minutes / 60);
    const h = totalHours % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Obtiene el inicio de la semana (lunes) para una fecha
 * @param {Date} date - Fecha
 * @returns {Date} Fecha del lunes de esa semana
 */
export function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Genera slots de tiempo según configuración
 * @param {number} startHour - Hora de inicio
 * @param {number} endHour - Hora de fin
 * @param {number} slotSize - Tamaño del slot en minutos
 * @returns {Array<string>} Array de slots en formato HH:MM
 */
export function generateTimeSlots(startHour, endHour, slotSize = 30) {
    const slots = [];
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotSize) {
        slots.push(minutesToTime(minutes));
    }

    return slots;
}

const DAY_KEYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_KEYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/**
 * Horario configurado del negocio para el día de una fecha
 * @param {Object|string} hours - business.hours (objeto o JSON)
 * @param {Date} date - Fecha
 * @returns {Object|null} Config del día ({ open, close, open2, close2, isOpen, isSplit })
 */
export function getDayHoursConfig(hours, date) {
    let hoursObj = hours;
    if (typeof hoursObj === 'string') {
        try {
            hoursObj = JSON.parse(hoursObj);
        } catch {
            return null;
        }
    }
    if (!hoursObj || typeof hoursObj !== 'object' || !date) return null;
    const dayIndex = date.getDay();
    return hoursObj[DAY_KEYS_EN[dayIndex]] || hoursObj[DAY_KEYS_ES[dayIndex]] || hoursObj[dayIndex] || null;
}

/**
 * Minuto de apertura del día si su horario pasa la medianoche (por ej. 18:00–02:00 o 18:00–26:00)
 * @param {Object} dayConfig - Config del día
 * @returns {number|null} Minutos de la primera apertura, o null si el día no cruza la medianoche
 */
export function getOvernightOpenMinutes(dayConfig) {
    if (!dayConfig || dayConfig.isOpen === false) return null;
    const ranges = [[dayConfig.open, dayConfig.close], [dayConfig.open2, dayConfig.close2]]
        .filter(([open, close]) => typeof open === 'string' && typeof close === 'string' && open && close);

    let crossesMidnight = false;
    let firstOpen = null;
    ranges.forEach(([open, close]) => {
        const openMin = timeToMinutes(open);
        const closeMin = timeToMinutes(close);
        if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return;
        if (closeMin <= openMin || closeMin > 1440) crossesMidnight = true;
        if (firstOpen === null || openMin < firstOpen) firstOpen = openMin;
    });

    return crossesMidnight ? firstOpen : null;
}

/**
 * Minutos de una hora contados desde el día que abre: en un horario que cruza la medianoche,
 * la madrugada (antes de la apertura) suma 1440. Así 00:30 queda después de 23:30.
 * @param {string} timeStr - Tiempo HH:MM
 * @param {Object|null} dayConfig - Config del día (sin config no cambia nada)
 * @returns {number} Minutos
 */
export function normalizeDayMinutes(timeStr, dayConfig) {
    const minutes = timeToMinutes(timeStr);
    const openMinutes = getOvernightOpenMinutes(dayConfig);
    return openMinutes !== null && minutes < openMinutes ? minutes + 1440 : minutes;
}

/**
 * Verifica si una reserva ocupa un slot específico
 * @param {Object} booking - Reserva
 * @param {string} slotTime - Tiempo del slot (HH:MM)
 * @param {number} slotSize - Tamaño del slot en minutos
 * @param {Object|null} dayConfig - Config del día, para ubicar bien la madrugada
 * @returns {boolean} True si la reserva ocupa este slot
 */
export function bookingOccupiesSlot(booking, slotTime, slotSize = 30, dayConfig = null) {
    const slotMinutes = normalizeDayMinutes(slotTime, dayConfig);
    const bookingStartMinutes = normalizeDayMinutes(booking.time, dayConfig);
    const bookingDuration = booking.duration || 60;
    const bookingEndMinutes = bookingStartMinutes + bookingDuration;

    // El slot está ocupado si se superpone con [start, end) (también reservas que empiezan a mitad de slot)
    return slotMinutes < bookingEndMinutes && slotMinutes + slotSize > bookingStartMinutes;
}

/**
 * True si la reserva empieza dentro de este slot (ahí se dibuja la tarjeta)
 */
export function bookingStartsInSlot(booking, slotTime, slotSize = 30, dayConfig = null) {
    const slotMinutes = normalizeDayMinutes(slotTime, dayConfig);
    const bookingStartMinutes = normalizeDayMinutes(booking.time, dayConfig);
    return bookingStartMinutes >= slotMinutes && bookingStartMinutes < slotMinutes + slotSize;
}

/**
 * Calcula cuántos slots ocupa una reserva
 * @param {number} duration - Duración en minutos
 * @param {number} slotSize - Tamaño del slot en minutos
 * @returns {number} Número de slots
 */
export function calculateSlotSpan(duration, slotSize = 30) {
    return Math.ceil(duration / slotSize);
}

/**
 * Normaliza una fecha de reserva a formato YYYY-MM-DD
 * @param {string} dateStr - Fecha en cualquier formato
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function normalizeBookingDate(dateStr) {
    if (!dateStr) return '';

    // Si ya está en formato YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }

    // Si está en formato DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr;
}

/**
 * Obtiene las reservas para un día y slot específico
 * @param {Array} bookings - Array de reservas
 * @param {Date} date - Fecha
 * @param {string} time - Tiempo del slot
 * @param {number} slotSize - Tamaño del slot
 * @param {Object|null} dayConfig - Config del día, para ubicar bien la madrugada
 * @returns {Array} Reservas que ocupan ese slot
 */
export function getBookingsForSlot(bookings, date, time, slotSize = 30, dayConfig = null) {
    const dateKey = formatDateKey(date);

    return bookings.filter(booking => {
        // Normalizar fecha de la reserva
        const bookingDateKey = normalizeBookingDate(booking.date);

        // Verificar fecha
        if (bookingDateKey !== dateKey) return false;

        // Ignorar canceladas
        if (booking.status === 'cancelled') return false;

        // Verificar si ocupa este slot
        return bookingOccupiesSlot(booking, time, slotSize, dayConfig);
    });
}

/**
 * Verifica si un día está en el mes actual
 * @param {Date} day - Día a verificar
 * @param {Date} currentMonth - Mes actual
 * @returns {boolean} True si el día está en el mes actual
 */
export function isInCurrentMonth(day, currentMonth) {
    return day.getMonth() === currentMonth.getMonth() &&
        day.getFullYear() === currentMonth.getFullYear();
}

/**
 * Verifica si un día es hoy
 * @param {Date} day - Día a verificar
 * @returns {boolean} True si es hoy
 */
export function isToday(day) {
    const today = new Date();
    return formatDateKey(day) === formatDateKey(today);
}

/**
 * Genera array de días para vista mensual (42 días = 6 semanas)
 * @param {Date} currentDate - Fecha actual del calendario
 * @returns {Array<Date>} Array de 42 días
 */
export function generateMonthDays(currentDate) {
    const days = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Empezar desde el lunes de la semana que contiene el primer día
    const startDay = getStartOfWeek(firstDay);

    // Generar 42 días (6 semanas completas)
    for (let i = 0; i < 42; i++) {
        const day = new Date(startDay);
        day.setDate(startDay.getDate() + i);
        days.push(day);
    }

    return days;
}

/**
 * Genera array de días para vista semanal (7 días)
 * @param {Date} currentDate - Fecha actual del calendario
 * @returns {Array<Date>} Array de 7 días
 */
export function generateWeekDays(currentDate) {
    const days = [];
    const startDay = getStartOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
        const day = new Date(startDay);
        day.setDate(startDay.getDate() + i);
        days.push(day);
    }

    return days;
}
