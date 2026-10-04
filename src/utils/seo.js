import { isProfileReady } from './profileChecklist.js';

// SEO metadata shared by the browser (SEOHead) and the server (api/page.js),
// so search engines get the same title, canonical and JSON-LD before and after
// the app runs. Plain JS only: it is imported from a Vercel function too.

export const SITE_URL = 'https://www.turnitoslr.com';
export const ROOT_DOMAIN = 'turnitoslr.com';
export const DEFAULT_TITLE = 'TurnitosLR | Reserva de Turnos Online en La Rioja';
export const DEFAULT_DESCRIPTION = 'Reservá canchas de pádel y fútbol, turnos de peluquería, barbería, estética y quinchos en La Rioja. Horarios en tiempo real, sin llamar.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-turnitos.jpg`;
export const REGION = 'La Rioja';

// Indexable pages that live on www and render the same index.html
export const STATIC_PAGES = {
    ayuda: {
        title: 'Centro de Ayuda y Preguntas Frecuentes | TurnitosLR',
        description: '¿Tenés dudas sobre cómo reservar canchas, quinchos o turnos en La Rioja? Encontrá todas las respuestas en el Centro de Ayuda de TurnitosLR.'
    },
    negocios: {
        title: 'TurnitosLR para Negocios | Turnos online para tu negocio',
        description: 'Sumá tu cancha, peluquería, consultorio o quincho a TurnitosLR. Turnos online 24/7, cobro de señas y Link in Bio. Probalo 14 días gratis.'
    },
    terminos: {
        title: 'Términos y Condiciones de Uso | TurnitosLR',
        description: 'Conocé los términos y condiciones de uso de TurnitosLR, la plataforma de reserva de turnos en La Rioja.'
    },
    privacidad: {
        title: 'Política de Privacidad | TurnitosLR',
        description: 'Conocé cómo protegemos tus datos personales, reservas y privacidad en TurnitosLR según la normativa argentina.'
    }
};

export const staticPageUrl = (page) => `${SITE_URL}/${page}`;

// Public address of a business page. The subdomain is the one people share,
// so it is also the one we ask Google to index.
export const businessUrl = (slug, view = 'turnos') => {
    const path = view === 'bio' ? '/' : `/${view}`;
    return `https://${slug}.${ROOT_DOMAIN}${path}`;
};

export const truncate = (text, max = 160) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
};

// "texto" -> "texto. " so the next sentence doesn't run into it
const sentence = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return '';
    return /[.!?…]$/.test(clean) ? `${clean} ` : `${clean}. `;
};

export const formatPrice = (price) => {
    const n = Number(price);
    return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('es-AR')}` : '';
};

export const parseMetadata = (m) => {
    if (!m) return {};
    if (typeof m === 'string') {
        try { return JSON.parse(m); } catch { return {}; }
    }
    return m;
};

// Demo businesses loaded with the bulk script: real-looking but not real
export const isSimulatedBusiness = (business) => Boolean(parseMetadata(business?.metadata).simulacion);

// Same rule as the Home listing: demo businesses and unfinished profiles stay out of Google
// Same rule as storeUtils.isStoreAvailable (that one pulls in React, this file can't)
export const hasOnlineStore = (business) => business?.store_enabled !== false &&
    (parseMetadata(business?.metadata).store_products || []).some(p => p && p.is_active !== false);

export const isIndexableBusiness = (business) => !isSimulatedBusiness(business) && isProfileReady(business);

const normalize = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// sport | venue | service, mirrors BusinessProfileRouter
export const getBusinessKind = (business) => {
    const cat = normalize(business?.categories?.name || business?.category);
    const hasItems = (key) => Array.isArray(business?.[key]) && business[key].length > 0;
    if (business?.type === 'sport') return 'sport';
    if (business?.type === 'service') return 'service';
    if (/deport|cancha|padel|futbol|tenis/.test(cat) || hasItems('courts')) return 'sport';
    if (/belleza|estetica|spa|salud|mascota|peluqueria|barber/.test(cat) || hasItems('services') || hasItems('specialists')) return 'service';
    if (['alquiler', 'venue'].includes(business?.type) || /alquiler|quincho|salon|finca/.test(cat)) return 'venue';
    return 'service';
};

const SCHEMA_TYPES = {
    sport: 'SportsActivityLocation',
    venue: 'EventVenue',
    service: 'LocalBusiness'
};

const TITLE_ACTIONS = {
    sport: 'Reservá tu cancha online',
    venue: 'Alquiler para eventos',
    service: 'Reservá tu turno online'
};

export const businessImage = (business) =>
    business?.banner_image || business?.banner_url || business?.logo || business?.logo_url || DEFAULT_IMAGE;

const DAY_NAMES = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
    friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

const openingHours = (hours) => {
    const parsed = parseMetadata(hours);
    const specs = [];
    Object.entries(parsed || {}).forEach(([day, h]) => {
        const dayOfWeek = DAY_NAMES[String(day).toLowerCase()];
        if (!dayOfWeek || !h?.isOpen || !h.open || !h.close) return;
        const ranges = h.isSplit && h.breakStart && h.breakEnd
            ? [[h.open, h.breakStart], [h.breakEnd, h.close]]
            : [[h.open, h.close]];
        ranges.forEach(([opens, closes]) => specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek, opens, closes }));
    });
    return specs;
};

const SOCIAL_BASES = {
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    tiktok: 'https://www.tiktok.com/@'
};

const socialLinks = (business) => Object.entries(SOCIAL_BASES)
    .map(([network, base]) => {
        const value = String(business?.[network] || '').trim();
        if (!value) return null;
        if (/^https?:\/\//i.test(value)) return value;
        return `${base}${value.replace(/^@/, '')}`;
    })
    .filter(Boolean);

// WhatsApp numbers are stored as local mobiles (3804111003)
const phoneNumber = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return undefined;
    return digits.startsWith('54') ? `+${digits}` : `+549${digits}`;
};

export function buildBusinessSchema(business) {
    if (!business) return null;
    const kind = getBusinessKind(business);
    const url = businessUrl(business.slug);

    const schema = {
        '@context': 'https://schema.org',
        '@type': SCHEMA_TYPES[kind],
        '@id': `${url}#business`,
        name: business.name,
        url,
        image: businessImage(business),
        description: business.description || undefined,
        telephone: phoneNumber(business.whatsapp),
        address: {
            '@type': 'PostalAddress',
            streetAddress: business.location || undefined,
            addressLocality: REGION,
            addressRegion: REGION,
            addressCountry: 'AR'
        }
    };

    if (business.latitude && business.longitude) {
        schema.geo = { '@type': 'GeoCoordinates', latitude: Number(business.latitude), longitude: Number(business.longitude) };
    }

    const hours = openingHours(business.hours);
    if (hours.length) schema.openingHoursSpecification = hours;

    const sameAs = socialLinks(business);
    if (sameAs.length) schema.sameAs = sameAs;

    const services = (business.services || []).filter(s => s?.name).slice(0, 30);
    if (services.length) {
        schema.makesOffer = services.map(s => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.name, description: s.description || undefined },
            price: Number(s.price) > 0 ? Number(s.price) : undefined,
            priceCurrency: Number(s.price) > 0 ? 'ARS' : undefined
        }));
    }

    // Only real reviews: no rating is better than an invented one
    const meta = parseMetadata(business.metadata);
    const rating = Number(business.rating_avg || business.rating || meta.rating_avg || 0);
    const reviews = Number(business.reviews_count || meta.reviews_count || 0);
    if (rating > 0 && reviews > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: rating.toFixed(1),
            reviewCount: reviews,
            bestRating: '5',
            worstRating: '1'
        };
    }

    return JSON.parse(JSON.stringify(schema)); // drops undefined fields
}

// Everything a business page needs in <head>. view: turnos | tienda | bio
export function buildBusinessSeo(business, view = 'turnos') {
    const kind = getBusinessKind(business);
    const name = business.name;
    const where = business.location || REGION;
    const indexable = isIndexableBusiness(business);

    if (view === 'tienda') {
        return {
            title: `Tienda de ${name} | Comprá online en ${REGION}`,
            description: truncate(`Productos de ${name} en ${where}. Mirá precios y hacé tu pedido online.`),
            image: parseMetadata(business.metadata).store_banners?.[0] || businessImage(business),
            canonical: businessUrl(business.slug, 'tienda'),
            robots: indexable && hasOnlineStore(business) ? 'index, follow, max-image-preview:large' : 'noindex, follow',
            schema: null
        };
    }

    if (view === 'bio') {
        return {
            title: `${name} | Enlaces y turnos`,
            description: truncate(business.description || `Turnos, redes y tienda de ${name} en un solo lugar.`),
            image: businessImage(business),
            // No canonical next to noindex: Google reads the pair as mixed signals
            canonical: null,
            url: businessUrl(business.slug, 'bio'),
            // Same business as /turnos with less content: let Google follow, not index
            robots: 'noindex, follow',
            schema: null
        };
    }

    return {
        title: `${name} | ${TITLE_ACTIONS[kind]} en ${REGION}`,
        description: business.description
            ? truncate(`${sentence(business.description)}Reservá online en ${name}, ${where}.`)
            : truncate(`Reservá online en ${name} (${where}). Horarios disponibles en tiempo real, sin llamar.`),
        image: businessImage(business),
        canonical: businessUrl(business.slug),
        robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
        schema: buildBusinessSchema(business)
    };
}

// Link previews of a single service or product (?servicio= / ?producto=)
export function buildServicePreview(business, service) {
    const details = [service.duration ? `${service.duration} min` : '', formatPrice(service.price)].filter(Boolean).join(' · ');
    return {
        title: `${service.name} · ${business.name}`,
        description: truncate(`${sentence(details)}${sentence(service.description)}Reservá tu turno online en ${business.name}.`),
        image: service.image_url || businessImage(business)
    };
}

export function buildProductPreview(business, product) {
    const productImage = (Array.isArray(product.images) && product.images[0]) || product.image;
    return {
        title: `${product.name} · ${business.name}`,
        description: truncate(`${sentence(formatPrice(product.price))}${sentence(product.desc)}Pedilo en la tienda online de ${business.name}.`),
        image: productImage || businessImage(business)
    };
}
