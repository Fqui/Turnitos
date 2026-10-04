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
    const cleanInput = slug.toLowerCase().trim();
    const strippedInput = cleanInput.replace(/[-_\s]/g, '');

    return businesses.find(business => {
        if (!business) return false;
        const bSlug = (business.slug || '').toLowerCase().trim();
        const bNameSlug = generateSlug(business.name || '').toLowerCase().trim();

        return bSlug === cleanInput ||
               bNameSlug === cleanInput ||
               (bSlug && bSlug.replace(/[-_\s]/g, '') === strippedInput) ||
               (bNameSlug && bNameSlug.replace(/[-_\s]/g, '') === strippedInput);
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

    // Handle double subdomain like www.cancha-apolo.turnitoslr.com
    if (hostname.includes('turnitoslr.com') && parts.length > 3 && parts[0] === 'www') {
        const actualSub = parts[1].toLowerCase();
        if (!['admin', 'app', 'portal', 'api'].includes(actualSub)) {
            const cleanHost = parts.slice(1).join('.');
            window.location.href = `${window.location.protocol}//${cleanHost}${window.location.pathname}${window.location.search}`;
            return actualSub;
        }
    }

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
