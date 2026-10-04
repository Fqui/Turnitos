import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const RESERVED_SUBDOMAINS = ['www', 'turnitoslr', 'admin', 'app', 'portal', 'api'];
const SLUG_PATTERN = /^[a-z0-9-]+$/i;

const DEFAULT_TITLE = 'TurnitosLR | Reserva de Turnos Online en La Rioja';
const DEFAULT_DESCRIPTION = 'Plataforma líder de reservas de turnos online en La Rioja. Canchas de pádel, fútbol, peluquerías y quinchos.';
const DEFAULT_IMAGE = 'https://www.turnitoslr.com/logo-turnitos.png';

const formatPrice = (price) => {
    const n = Number(price);
    return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('es-AR')}` : '';
};

const truncate = (text, max = 160) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
};

// "texto" -> "texto. " so the next sentence doesn't run into it
const sentence = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return '';
    return /[.!?…]$/.test(clean) ? `${clean} ` : `${clean}. `;
};

const parseMetadata = (m) => {
    if (!m) return {};
    if (typeof m === 'string') {
        try { return JSON.parse(m); } catch { return {}; }
    }
    return m;
};

// WhatsApp, Facebook and other link previewers are routed here by vercel.json.
// They don't run JavaScript, so we answer with the meta tags of the business,
// service (?servicio=<id>) or product (?producto=<id>) being shared.
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const host = req.headers.host || '';
    const query = req.query || {};

    let pathSlug = query.slug || '';
    if (Array.isArray(pathSlug)) pathSlug = pathSlug.join('/');
    pathSlug = String(pathSlug).replace(/^\/+|\/+$/g, '');

    // Business slug: the subdomain (slug.turnitoslr.com) or the first path segment (turnitoslr.com/slug)
    const hostParts = host.split('.');
    const subdomainSlug = host.includes('turnitoslr.com') && hostParts.length > 2 && !RESERVED_SUBDOMAINS.includes(hostParts[0])
        ? hostParts[0]
        : '';
    const targetSlug = (subdomainSlug || pathSlug.split('/')[0] || '').toLowerCase();

    const serviceId = typeof query.servicio === 'string' ? query.servicio : '';
    const productId = typeof query.producto === 'string' ? query.producto : '';

    // Canonical URL of the shared page, without the internal "slug" rewrite param
    const params = new URLSearchParams();
    if (serviceId) params.set('servicio', serviceId);
    if (productId) params.set('producto', productId);
    const pagePath = pathSlug ? `/${pathSlug}` : '/';
    const pageUrl = `https://${host}${pagePath}${params.toString() ? `?${params}` : ''}`;

    const send = (meta) => res.status(200).send(renderHtml({ url: pageUrl, ...meta }));
    const sendDefault = () => send({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, image: DEFAULT_IMAGE });

    if (!targetSlug || !SLUG_PATTERN.test(targetSlug) || !supabaseUrl || !supabaseKey) {
        return sendDefault();
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: business, error } = await supabase
            .from('businesses')
            .select('id, name, slug, description, location, banner_image, banner_url, logo, logo_url, metadata, categories(name)')
            .eq('slug', targetSlug)
            .maybeSingle();

        if (error || !business) {
            if (error) console.error('OG business lookup failed:', error.message);
            return sendDefault();
        }

        const businessImage = business.banner_image || business.banner_url || business.logo || business.logo_url || DEFAULT_IMAGE;
        const where = business.location || 'La Rioja';

        if (serviceId) {
            const { data: service } = await supabase
                .from('services')
                .select('name, description, price, duration, image_url')
                .eq('business_id', business.id)
                .eq('id', serviceId)
                .maybeSingle();

            if (service) {
                const details = [service.duration ? `${service.duration} min` : '', formatPrice(service.price)].filter(Boolean).join(' · ');
                return send({
                    title: `${service.name} · ${business.name}`,
                    description: truncate(`${sentence(details)}${sentence(service.description)}Reservá tu turno online en ${business.name}.`),
                    image: service.image_url || businessImage
                });
            }
        }

        if (productId) {
            const products = parseMetadata(business.metadata).store_products || [];
            const product = products.find(p => String(p.id) === String(productId) && p.is_active !== false);

            if (product) {
                const price = formatPrice(product.price);
                const productImage = (Array.isArray(product.images) && product.images[0]) || product.image;
                return send({
                    title: `${product.name} · ${business.name}`,
                    description: truncate(`${sentence(price)}${sentence(product.desc)}Pedilo en la tienda online de ${business.name}.`),
                    image: productImage || businessImage
                });
            }
        }

        const categoryName = business.categories?.name;
        return send({
            title: `${business.name}${categoryName ? ` (${categoryName})` : ''} | Turnos online`,
            description: business.description
                ? truncate(`${sentence(business.description)}Reservá tu turno online en ${where}.`)
                : `Reservá tu turno online en ${business.name} (${where}). Horarios disponibles en tiempo real.`,
            image: businessImage
        });
    } catch (err) {
        console.error('Error handling OG crawler request:', err);
        return sendDefault();
    }
}

function renderHtml({ title, description, image, url }) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="TurnitosLR">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:locale" content="es_AR">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <!-- Instant redirect for any human visiting this endpoint -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #121212; color: white;">
  <h2>${escapeHtml(title)}</h2>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(url)}" style="color: #00E676;">Tocá acá si no se abre solo</a></p>
</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
