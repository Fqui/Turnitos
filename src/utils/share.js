// Public link of a business page. In production every business lives on its own
// subdomain (slug.turnitoslr.com); locally and in Vercel previews it's /slug/...
export function buildBusinessShareUrl(slug, path = '', params = {}) {
    if (!slug || typeof window === 'undefined') return '';
    const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();
    const suffix = `${path}${query ? `?${query}` : ''}`;
    if (window.location.hostname.endsWith('turnitoslr.com')) {
        return `https://${slug}.turnitoslr.com${suffix}`;
    }
    return `${window.location.origin}/${slug}${suffix}`;
}

// Phones get the native share sheet (WhatsApp, Instagram, etc.). Desktops get our own menu,
// because the Windows/macOS share dialog is unfamiliar and doesn't always list WhatsApp.
export function canUseNativeShare() {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function buildWhatsAppShareUrl(text, url) {
    return `https://wa.me/?text=${encodeURIComponent(text ? `${text}\n${url}` : url)}`;
}
