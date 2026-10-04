// Public link of a business page: always the production subdomain (slug.turnitoslr.com),
// even from localhost or a Vercel preview, so a shared link is never a dev address.
export function buildBusinessShareUrl(slug, path = '', params = {}) {
    if (!slug) return '';
    const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();
    return `https://${slug}.turnitoslr.com${path}${query ? `?${query}` : ''}`;
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
