// Helpers for home-visit (a domicilio) services: rings of distance around the business.

export const LOCATION_MODES = [
    { id: 'local', label: 'Solo local' },
    { id: 'home', label: 'Solo domicilio' },
    { id: 'both', label: 'Las dos' }
];

export const MAX_RINGS = 4;

export const RING_COLORS = ['#3ecf8e', '#f59e0b', '#2563eb', '#a855f7'];

export const DEFAULT_RINGS = [
    { km: 3, fee: 0 },
    { km: 6, fee: 1500 },
    { km: 9, fee: 2500 }
];

export function getLocationMode(service) {
    const mode = service?.location_mode;
    return mode === 'home' || mode === 'both' ? mode : 'local';
}

export function offersHomeVisit(service) {
    return getLocationMode(service) !== 'local';
}

// Returns the business rings sorted by km, ignoring invalid entries
export function getHomeRings(business) {
    const raw = business?.home_service?.rings;
    if (!Array.isArray(raw)) return [];
    return raw
        .map(r => ({ km: Number(r.km), fee: Math.max(0, Number(r.fee) || 0) }))
        .filter(r => r.km > 0)
        .sort((a, b) => a.km - b.km);
}

export function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Finds the ring that covers a point. Returns null when the point is outside every ring.
export function findRing(business, lat, lng) {
    const bLat = Number(business?.latitude);
    const bLng = Number(business?.longitude);
    if (!isFinite(bLat) || !isFinite(bLng) || !isFinite(lat) || !isFinite(lng)) return null;
    const distanceKm = haversineKm(bLat, bLng, lat, lng);
    const rings = getHomeRings(business);
    const index = rings.findIndex(r => distanceKm <= r.km);
    if (index === -1) return { distanceKm, ring: null, index: -1 };
    return { distanceKm, ring: rings[index], index };
}

export function formatKm(km) {
    return `${Number(km).toFixed(1).replace('.', ',')} km`;
}

export function formatFee(fee) {
    return fee > 0 ? `$${Number(fee).toLocaleString('es-AR')}` : 'Sin cargo';
}

export const HOME_VISIT_BADGE_STYLE = {
    marginLeft: '6px',
    padding: '1px 6px',
    borderRadius: '6px',
    background: 'rgba(37, 99, 235, 0.12)',
    color: 'var(--status-completed, #2563eb)',
    fontSize: '10px',
    fontWeight: '800',
    verticalAlign: 'middle'
};

export function getHomeVisit(booking) {
    const visit = booking?.metadata?.home_visit;
    return visit && visit.address ? visit : null;
}
