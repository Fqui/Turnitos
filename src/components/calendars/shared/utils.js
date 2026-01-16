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
    const h = Math.floor(minutes / 60);
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

    for (let minutes = startMinutes; minutes <= endMinutes; minutes += slotSize) {
        slots.push(minutesToTime(minutes));
    }

    return slots;
}

/**
 * Verifica si una reserva ocupa un slot específico
 * @param {Object} booking - Reserva
 * @param {string} slotTime - Tiempo del slot (HH:MM)
 * @param {number} slotSize - Tamaño del slot en minutos
 * @returns {boolean} True si la reserva ocupa este slot
 */
export function bookingOccupiesSlot(booking, slotTime, slotSize = 30) {
    const slotMinutes = timeToMinutes(slotTime);
    const bookingStartMinutes = timeToMinutes(booking.time);
    const bookingDuration = booking.duration || 60;
    const bookingEndMinutes = bookingStartMinutes + bookingDuration;

    // El slot está ocupado si cae dentro del rango [start, end)
    return slotMinutes >= bookingStartMinutes && slotMinutes < bookingEndMinutes;
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
 * @returns {Array} Reservas que ocupan ese slot
 */
export function getBookingsForSlot(bookings, date, time, slotSize = 30) {
    const dateKey = formatDateKey(date);

    return bookings.filter(booking => {
        // Normalizar fecha de la reserva
        const bookingDateKey = normalizeBookingDate(booking.date);

        // Verificar fecha
        if (bookingDateKey !== dateKey) return false;

        // Ignorar canceladas
        if (booking.status === 'cancelled') return false;

        // Verificar si ocupa este slot
        return bookingOccupiesSlot(booking, time, slotSize);
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
