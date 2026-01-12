/**
 * Utility functions for business management
 */

/**
 * Converts a business name to a URL-friendly slug
 * @param {string} text - The text to slugify
 * @returns {string} - URL-friendly slug
 */
export function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD') // Normalize to decomposed form
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates email and password credentials for a new business
 * @param {string} businessName - The name of the business
 * @returns {{email: string, password: string}} - Generated credentials
 */
export function generateBusinessCredentials(businessName) {
    const slug = slugify(businessName);

    return {
        email: `${slug}@turnitoslr.com`,
        password: 'admin123'
    };
}

/**
 * Validates if an email follows the TurnitosLR format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid format
 */
export function isValidTurnitosEmail(email) {
    return /^[a-z0-9-]+@turnitoslr\.com$/.test(email);
}

/**
 * Extracts business name from TurnitosLR email
 * @param {string} email - TurnitosLR email
 * @returns {string|null} - Business slug or null if invalid
 */
export function extractBusinessSlugFromEmail(email) {
    const match = email.match(/^([a-z0-9-]+)@turnitoslr\.com$/);
    return match ? match[1] : null;
}

/**
 * Formats a price in Argentine Pesos
 * @param {number} price - Price to format
 * @returns {string} - Formatted price string
 */
export function formatPrice(price) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(price);
}

/**
 * Validates subscription limits for courts/specialists
 * @param {number} currentCount - Current number of items
 * @param {number} limit - Maximum allowed by subscription
 * @returns {{isValid: boolean, message: string}} - Validation result
 */
export function validateSubscriptionLimit(currentCount, limit, itemType = 'espacios') {
    const isValid = currentCount < limit;

    return {
        isValid,
        message: isValid
            ? `${currentCount}/${limit} ${itemType} utilizados`
            : `Límite alcanzado (${limit} ${itemType}). Actualiza tu plan para agregar más.`
    };
}
