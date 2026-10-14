/**
 * What a business still has to fill in before its profile is ready.
 *
 * Each item: { id, label, done, required, tab }
 * - required items decide whether the business is listed on Home
 * - tab is the settings tab that fixes it (BusinessSettings / VenueSettings ids)
 */

const PLACEHOLDER_IMAGE = /placehold\.co|placeholder/i;
const DEFAULT_SPECIALIST_NAME = /^especialista \d+$/i;

export function getBusinessKind(business) {
    const type = String(business?.type || '').toLowerCase();
    if (type === 'service') return 'service';
    if (type === 'sport' || type === 'courts') return 'sport';
    if (type === 'alquiler' || type === 'venue' || type === 'rental') return 'rental';
    return 'service';
}

function hasRealImage(url) {
    return Boolean(url) && !PLACEHOLDER_IMAGE.test(String(url));
}

function parseHours(hours) {
    if (!hours) return null;
    if (typeof hours === 'object') return hours;
    try { return JSON.parse(hours); } catch { return null; }
}

function hasOpeningHours(business) {
    const hours = parseHours(business?.hours);
    if (hours && typeof hours === 'object') {
        if (Object.values(hours).some(day => day && day.isOpen && day.open && day.close)) return true;
    }
    return Array.isArray(business?.time_ranges) && business.time_ranges.length > 0;
}

function courtList(business) {
    const courts = Array.isArray(business?.courts) ? business.courts : [];
    if (courts.length > 0) return courts.map(c => ({ name: c.name, price: Number(c.price) || 0 }));
    const resources = Array.isArray(business?.bookable_resources) ? business.bookable_resources : [];
    return resources
        .filter(r => r.active !== false && (r.type === 'court' || !r.type))
        .map(r => ({ name: r.name, price: Number(r.base_price) || 0 }));
}

export function getProfileChecklist(business) {
    if (!business) return [];
    const kind = getBusinessKind(business);
    const items = [];

    items.push({
        id: 'logo',
        label: 'Subí el logo',
        done: hasRealImage(business.logo_url || business.logo),
        required: true,
        tab: 'appearance'
    });
    items.push({
        id: 'banner',
        label: 'Subí una foto de portada',
        done: hasRealImage(business.banner_url || business.banner_image),
        required: false,
        tab: 'appearance'
    });
    items.push({
        id: 'location',
        label: 'Cargá la dirección',
        done: Boolean(String(business.location || '').trim()),
        required: false,
        tab: 'general'
    });
    items.push({
        id: 'description',
        label: 'Escribí una descripción corta',
        done: Boolean(String(business.description || '').trim()),
        required: false,
        tab: 'general'
    });

    if (kind === 'service') {
        const services = Array.isArray(business.services) ? business.services : [];
        const specialists = Array.isArray(business.specialists) ? business.specialists : [];
        items.push({
            id: 'hours',
            label: 'Configurá los horarios de atención',
            done: hasOpeningHours(business),
            required: true,
            tab: 'schedule'
        });
        items.push({
            id: 'services',
            label: 'Agregá al menos un servicio con precio',
            done: services.some(s => Number(s.price) > 0),
            required: true,
            tab: 'services'
        });
        items.push({
            id: 'specialists',
            label: 'Poné el nombre real de cada profesional',
            done: specialists.length > 0 && specialists.every(s => !DEFAULT_SPECIALIST_NAME.test(String(s.name || '').trim())),
            required: false,
            tab: 'subscription'
        });
    } else if (kind === 'sport') {
        const courts = courtList(business);
        items.push({
            id: 'hours',
            label: 'Configurá los horarios de las canchas',
            done: hasOpeningHours(business),
            required: true,
            tab: 'schedule'
        });
        items.push({
            id: 'courts',
            label: 'Poné el precio de tus canchas',
            done: courts.length > 0 && courts.some(c => c.price > 0),
            required: true,
            tab: 'subscription'
        });
    } else {
        const tiers = Array.isArray(business.pricing_tiers) ? business.pricing_tiers : [];
        items.push({
            id: 'pricing',
            label: 'Cargá el precio del alquiler',
            done: Number(business.price_per_hour) > 0 || Number(business.price_per_day) > 0 || tiers.length > 0,
            required: true,
            tab: 'pricing'
        });
    }

    return items;
}

/** A business is listed on Home once every required item is done. */
export function isProfileReady(business) {
    return getProfileChecklist(business).every(item => !item.required || item.done);
}
