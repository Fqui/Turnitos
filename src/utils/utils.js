/**
 * Generates a URL-friendly slug from a business name
 * @param {string} name - The business name
 * @returns {string} - URL-friendly slug
 */
export function generateSlug(name) {
    if (!name) return '';

    return name
        .toLowerCase()
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove accents and special characters
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Remove any remaining non-alphanumeric characters except hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Replace multiple consecutive hyphens with a single hyphen
        .replace(/-+/g, '-')
        // Remove leading and trailing hyphens
        .replace(/^-|-$/g, '');
}

/**
 * Finds a business by its slug
 * @param {Array} businesses - Array of business objects
 * @param {string} slug - The URL slug to search for
 * @returns {Object|null} - The matching business or null
 */
export function findBusinessBySlug(businesses, slug) {
    if (!businesses || !slug) return null;

    return businesses.find(business => {
        return business.slug === slug || generateSlug(business.name) === slug;
    });
}

/**
 * Extracts the subdomain from current window hostname if applicable
 * @returns {string|null} - Subdomain name or null
 */
export function getSubdomain() {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    if (hostname.includes('turnitoslr.com') && parts.length > 2) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'admin', 'app', 'portal', 'api'].includes(sub)) {
            return sub;
        }
    } else if (hostname.includes('localhost') && parts.length > 1) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'admin', 'app', 'portal', 'api', 'localhost'].includes(sub)) {
            return sub;
        }
    }
    return null;
}
