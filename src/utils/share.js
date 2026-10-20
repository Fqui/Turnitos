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

// "Más opciones" in our share menu opens the system share sheet, only where the browser has one
export function hasNativeShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

// Touch phones and narrow windows get the bottom sheet; desktops get the centered modal
export function isPhoneLayout() {
    if (typeof window === 'undefined') return false;
    return (window.matchMedia?.('(pointer: coarse)').matches ?? false) || window.innerWidth < 640;
}

export function buildWhatsAppShareUrl(text, url) {
    return `https://wa.me/?text=${encodeURIComponent(text ? `${text}\n${url}` : url)}`;
}

export function buildFacebookShareUrl(url) {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

// Link shown in the share preview: no protocol, no trailing slash
export function displayShareUrl(url) {
    return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// Returns false when the clipboard is blocked (old browser or no permission)
export async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

// Booking source: a business opened on the TurnitosLR site itself (www.turnitoslr.com/negocio)
// counts as marketplace; its own subdomain (negocio.turnitoslr.com) is the business's link.
// Older shared links carry ?via=turnitos instead, still honored.
const VIA_PARAM = 'via';
const VIA_TURNITOS = 'turnitos';
const BOOKING_SOURCE_KEY = 'turnitos_booking_source';

// Shared from the TurnitosLR site, slug.turnitoslr.com/path becomes www.turnitoslr.com/slug/path,
// so the link stays clean and still marks the booking as marketplace. From a subdomain it stays as is.
export function withTurnitosVia(url) {
    if (!url || getSubdomain()) return url;
    try {
        const parsed = new URL(url);
        const match = parsed.hostname.match(/^([a-z0-9-]+)\.turnitoslr\.com$/);
        if (!match || match[1] === 'www') return url;
        const path = parsed.pathname === '/' ? '/turnos' : parsed.pathname;
        return `https://www.turnitoslr.com/${match[1]}${path}${parsed.search}`;
    } catch {
        return url;
    }
}

// On a business page opened on the TurnitosLR site (or with ?via=turnitos), remember it for that
// business (same mark the TurnitosLR search sets). sessionStorage is per origin, so it's set here.
export function markTurnitosVia(businessId) {
    if (!businessId || typeof window === 'undefined') return;
    try {
        const params = new URLSearchParams(window.location.search);
        if (getSubdomain() && params.get(VIA_PARAM) !== VIA_TURNITOS) return;
        sessionStorage.setItem(BOOKING_SOURCE_KEY, JSON.stringify({ businessId, at: Date.now() }));
    } catch {
        // Storage blocked (private mode): the booking just stays 'direct'
    }
}
