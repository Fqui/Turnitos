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
        const businessSlug = generateSlug(business.name);
        return businessSlug === slug;
    });
}
