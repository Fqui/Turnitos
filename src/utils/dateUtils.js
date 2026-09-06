/**
 * Formats a date string to DD/MM/YYYY for display.
 * Handles YYYY-MM-DD and legacy DD/MM/YYYY inputs.
 * @param {string} dateStr - The date string to format
 * @returns {string} - Formatted date string in DD/MM/YYYY
 */
export function formatDisplayDate(dateStr) {
    if (!dateStr) return '';

    // If it already matches DD/MM/YYYY, return it as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
    }

    // If it matches YYYY-MM-DD, convert to DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    // Fallback for Date objects or other strings
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

/**
 * Returns a date object from YYYY-MM-DD or DD/MM/YYYY
 */
export function parseDate(dateStr) {
    if (!dateStr) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + 'T00:00:00');
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}T00:00:00`);
    }

    return new Date(dateStr);
}

/**
 * Formats a date to a short, elegant string: "Martes 28 de Julio"
 */
export function formatLongDate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? parseDate(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(date);

    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('es-ES', { month: 'long' });

    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`;
}

/**
 * Calculates end time given start time and duration in minutes
 * @param {string} startTime - HH:MM format
 * @param {number} durationMinutes - duration in minutes
 * @returns {string} - End time in HH:MM format
 */
export function calculateEndTime(startTime, durationMinutes) {
    if (!startTime || !durationMinutes) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + Number(durationMinutes));

    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).slice(0, 5);
}

const SPANISH_MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Formats a date to friendly day and month format: "7 de septiembre"
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted friendly date (e.g. "7 de septiembre")
 */
export function formatFriendlyDate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? parseDate(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(date);

    const day = d.getDate();
    const month = SPANISH_MONTHS[d.getMonth()] || d.toLocaleDateString('es-ES', { month: 'long' });

    return `${day} de ${month.toLowerCase()}`;
}

