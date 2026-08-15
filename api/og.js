import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

function generateSlug(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

export default async function handler(req, res) {
    // Enable CORS and caching headers for crawlers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const host = req.headers.host || '';
    const fullUrl = `https://${host}${req.url || ''}`;

    // Extract slug from URL query or path
    let slug = req.query.slug || '';
    if (Array.isArray(slug)) slug = slug.join('/');
    
    // Check if host is a subdomain (e.g. padel-arena-lr.turnitoslr.com)
    let subdomainSlug = '';
    const hostParts = host.split('.');
    if (hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'turnitoslr') {
        subdomainSlug = hostParts[0];
    }

    const targetSlug = subdomainSlug || slug.replace(/^\/+|\/+$/g, '').split('/')[0] || '';

    const defaultTitle = 'TurnitosLR | Reserva de Turnos Online en La Rioja';
    const defaultDescription = 'Plataforma líder de reservas de turnos online en La Rioja. Canchas de pádel, fútbol, peluquerías y quinchos.';
    const defaultImage = 'https://www.turnitoslr.com/logo-turnitos.png';

    // If no specific slug or looking at home page
    if (!targetSlug || targetSlug === 'index.html' || targetSlug === 'ayuda') {
        return res.status(200).send(renderHtml({
            title: defaultTitle,
            description: defaultDescription,
            image: defaultImage,
            url: fullUrl
        }));
    }

    try {
        if (!supabaseUrl || !supabaseKey) {
            return res.status(200).send(renderHtml({
                title: defaultTitle,
                description: defaultDescription,
                image: defaultImage,
                url: fullUrl
            }));
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch business by slug or name
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('id, name, slug, description, location, banner_image, logo, rating_avg, rating, reviews_count, category, categories(name)')
            .or(`slug.eq.${targetSlug},name.ilike.%${targetSlug.replace(/-/g, ' ')}%`)
            .limit(1);

        if (error || !businesses || businesses.length === 0) {
            return res.status(200).send(renderHtml({
                title: `${targetSlug.replace(/-/g, ' ')} | TurnitosLR`,
                description: defaultDescription,
                image: defaultImage,
                url: fullUrl
            }));
        }

        const business = businesses[0];
        const categoryName = business.categories?.name || business.category || 'Turnos';
        const rating = Number(business.rating_avg || business.rating || 5.0).toFixed(1);
        const reviews = business.reviews_count ? ` (${business.reviews_count} opiniones)` : '';
        
        const title = `${business.name} - Turnos Online (${categoryName}) | TurnitosLR`;
        const description = business.description 
            ? `${business.description.slice(0, 160)}... Reservá tu turno online en ${business.location || 'La Rioja'}.`
            : `Reservá tu turno online en ${business.name} (${business.location || 'La Rioja'}). ⭐ ${rating}/5${reviews}. Canchas y servicios disponibles en tiempo real.`;
        
        const image = business.banner_image || business.logo || defaultImage;

        return res.status(200).send(renderHtml({
            title,
            description,
            image,
            url: fullUrl
        }));

    } catch (err) {
        console.error('Error handling OG crawler request:', err);
        return res.status(200).send(renderHtml({
            title: defaultTitle,
            description: defaultDescription,
            image: defaultImage,
            url: fullUrl
        }));
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
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
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
  <p><a href="${escapeHtml(url)}" style="color: #00E676;">Haz clic aquí si no eres redirigido automáticamente</a></p>
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
