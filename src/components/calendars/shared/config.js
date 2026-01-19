// Configuración de calendarios por tipo de negocio
export const SLOT_CONFIGS = {
    futbol: {
        slotSize: 60,              // Minutos por slot
        minDuration: 60,           // Duración mínima de reserva
        maxDuration: 180,          // Duración máxima de reserva (3 horas)
        durationStep: 60,          // Incrementos de duración
        allowHalfHourStart: false, // Solo puede empezar en punto (:00)
        gridRowHeight: 80,         // Altura de fila en px (más grande para slots de 1h)
        showResourceColumns: true, // Mostrar columnas por cancha
        defaultView: 'day',        // Vista por defecto
    },

    padel: {
        slotSize: 30,              // Minutos por slot
        minDuration: 60,           // Duración mínima
        maxDuration: 180,          // Duración máxima
        durationStep: 30,          // Incrementos de 30 min
        allowHalfHourStart: true,  // Puede empezar en :00 o :30
        gridRowHeight: 60,         // Altura de fila en px
        showResourceColumns: true, // Mostrar columnas por cancha
        defaultView: 'day',
        allowedDurations: [60, 90, 120, 150, 180], // Duraciones específicas permitidas
    },

    service: {
        slotSize: 30,              // Minutos por slot
        minDuration: 15,           // Servicios pueden ser cortos
        maxDuration: 240,          // Hasta 4 horas
        durationStep: 15,          // Incrementos de 15 min
        allowHalfHourStart: true,  // Puede empezar en :00 o :30
        gridRowHeight: 60,         // Altura de fila en px
        showResourceColumns: true, // Mostrar columnas por especialista
        defaultView: 'day',
        allowedDurations: 'dynamic', // Duraciones según el servicio
    }
};

// Configuración de calendario de períodos (alquileres)
export const PERIOD_CONFIG = {
    alquiler: {
        defaultView: 'month',      // Vista mensual por defecto
        allowYearView: true,       // Permitir vista anual
        allowMultiDay: true,       // Permitir reservas de múltiples días
        allowCrossDayBooking: true, // Permitir reservas que cruzan días (19:00 → 15:00)
        showTimeOnCrossDay: true,  // Mostrar horarios en reservas que cruzan días
    }
};

// Colores por estado de reserva (NO por tipo de servicio)
export const STATUS_COLORS = {
    confirmed: {
        light: '#2563EB',  // Blue-600
        dark: '#3B82F6',   // Blue-500
    },
    pending: {
        light: '#9CA3AF',  // Gray-400
        dark: '#6B7280',   // Gray-500
    },
    deposit_paid: {
        light: '#F59E0B',  // Amber-500
        dark: '#FBBF24',   // Amber-400
    },
    cancelled: {
        light: '#DC2626',  // Red-600
        dark: '#EF4444',   // Red-500
    },
    completed: {
        light: '#10B981',  // Emerald-500
        dark: '#34D399',   // Emerald-400
    },
    attended: {
        light: '#10B981',  // Emerald-500
        dark: '#34D399',   // Emerald-400
    },
    blocked: {
        light: 'repeating-linear-gradient(45deg, #374151, #374151 10px, #4B5563 10px, #4B5563 20px)',  // Gray-700/600 striped
        dark: 'repeating-linear-gradient(45deg, #1F2937, #1F2937 10px, #374151 10px, #374151 20px)',   // Gray-800/700 striped
    },
};

// Colores especiales para canchas de pádel (por cancha, no por estado)
export const PADEL_COURT_COLORS = {
    light: ['#059669', '#2563EB', '#7C3AED', '#DC2626'], // Emerald, Blue, Purple, Red
    dark: ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444'],
};

/**
 * Obtiene el color de una reserva según su estado y tema
 * @param {string} status - Estado de la reserva
 * @param {boolean} isDark - Si está en tema oscuro
 * @returns {string} Color hex
 */
export function getBookingColor(status, isDark = false) {
    const theme = isDark ? 'dark' : 'light';
    return STATUS_COLORS[status]?.[theme] || STATUS_COLORS.confirmed[theme];
}

/**
 * Detecta el tipo de calendario según el negocio
 * @param {Object} business - Objeto de negocio
 * @returns {string} Tipo de calendario: 'futbol', 'padel', 'service', 'alquiler', 'mixed'
 */
export function getCalendarType(business) {
    if (!business) return 'futbol'; // Default

    // Alquileres usan calendario de períodos
    if (business.type === 'alquiler' || business.type === 'venue') {
        return 'alquiler';
    }

    // Servicios usan calendario de slots
    if (business.type === 'service') {
        return 'service';
    }

    // Para deportes, detectar si es fútbol o pádel
    if (business.type === 'sport') {
        const courts = business.courts || [];
        const hasFutbol = courts.some(c => c.sport === 'futbol' || c.sport === 'football');
        const hasPadel = courts.some(c => c.sport === 'padel' || c.sport === 'paddle');

        // Si tiene ambos, es mixto
        if (hasFutbol && hasPadel) {
            return 'mixed';
        }

        // Si solo tiene uno
        if (hasPadel) return 'padel';
        if (hasFutbol) return 'futbol';

        // Default a pádel si no se puede determinar
        return 'padel';
    }

    return 'futbol'; // Default
}

/**
 * Obtiene la configuración de slots según el tipo
 * @param {string} type - Tipo de calendario
 * @returns {Object} Configuración de slots
 */
export function getSlotConfig(type) {
    return SLOT_CONFIGS[type] || SLOT_CONFIGS.futbol;
}

/**
 * Obtiene los recursos (canchas/especialistas) filtrados por tipo
 * @param {Object} business - Objeto de negocio
 * @param {string} type - Tipo de calendario
 * @returns {Array} Lista de recursos
 */
export function getResourcesByType(business, type) {
    if (!business) return [];

    if (type === 'futbol') {
        return business.courts?.filter(c => c.sport === 'futbol' || c.sport === 'football') || [];
    }

    if (type === 'padel') {
        return business.courts?.filter(c => c.sport === 'padel' || c.sport === 'paddle') || [];
    }

    if (type === 'service') {
        return business.specialists || [];
    }

    return business.courts || [];
}
