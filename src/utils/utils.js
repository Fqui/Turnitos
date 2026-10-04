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

/**
 * Normalizes an Argentine phone number for wa.me links (country code 549).
 * "3804167663", "0380 4167663", "+54 380 4167663" -> "5493804167663"
 * @param {string} phone - Phone as stored by the business
 * @returns {string} - Digits only with country code, or '' if empty
 */
export function toWhatsAppNumber(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('549')) return digits;
    if (digits.startsWith('54') && digits.length >= 12) return `549${digits.slice(2)}`;
    if (digits.startsWith('0')) digits = digits.slice(1);
    return `549${digits}`;
}

/**
 * Builds a wa.me link for a business phone, optionally with a prefilled message.
 * Returns '' when there is no phone.
 */
export function buildWhatsAppUrl(phone, message = '') {
    const number = toWhatsAppNumber(phone);
    if (!number) return '';
    return message
        ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${number}`;
}
