import { getSubdomain } from './utils';

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

// Booking source: a link shared from the TurnitosLR site (not from the business's own
// subdomain) carries ?via=turnitos, so bookings made through it count as marketplace.
const VIA_PARAM = 'via';
const VIA_TURNITOS = 'turnitos';
const BOOKING_SOURCE_KEY = 'turnitos_booking_source';

// Adds ?via=turnitos when sharing from the main site; links shared from a business subdomain stay clean
export function withTurnitosVia(url) {
    if (!url || getSubdomain()) return url;
    try {
        const parsed = new URL(url);
        parsed.searchParams.set(VIA_PARAM, VIA_TURNITOS);
        return parsed.toString();
    } catch {
        return url;
    }
}

// On a business page opened with ?via=turnitos, remember it for that business (same mark the
// TurnitosLR search sets). sessionStorage is per origin, so it's set here, on the landing page.
export function markTurnitosVia(businessId) {
    if (!businessId || typeof window === 'undefined') return;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get(VIA_PARAM) !== VIA_TURNITOS) return;
        sessionStorage.setItem(BOOKING_SOURCE_KEY, JSON.stringify({ businessId, at: Date.now() }));
    } catch {
        // Storage blocked (private mode): the booking just stays 'direct'
    }
}
