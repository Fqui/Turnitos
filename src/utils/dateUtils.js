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
 * Formats a date to a long string: "Jueves, 1 de Enero de 2026"
 */
export function formatLongDate(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? parseDate(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(date);

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = d.toLocaleDateString('es-ES', options);

    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
