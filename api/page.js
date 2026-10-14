import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
    SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, STATIC_PAGES, staticPageUrl,
    buildBusinessSeo, buildServicePreview, buildProductPreview, parseMetadata
} from '../src/utils/seo.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const VIEWS = ['turnos', 'tienda', 'bio'];
const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;

// The built app shell (dist/app.html) is bundled with this function (vercel.json includeFiles).
// Fetching it from the site is the fallback; it is a static file, so it never loops back here.
let shellCache = null;
async function getShell() {
    if (shellCache) return shellCache;
    try {
        shellCache = fs.readFileSync(path.join(process.cwd(), 'dist', 'app.html'), 'utf8');
    } catch {
        const res = await fetch(`${SITE_URL}/app.html`);
        shellCache = await res.text();
    }
    return shellCache;
}

const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// JSON-LD lives inside <script>: only "<" can break out of it
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function renderHead({ title, description, image, canonical, url, robots, schema }) {
    const ogUrl = url || canonical || SITE_URL;
    return [
        '<!-- seo:start -->',
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta name="robots" content="${escapeHtml(robots)}" />`,
        canonical && !robots.startsWith('noindex') ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="TurnitosLR" />',
        '<meta property="og:locale" content="es_AR" />',
        `<meta property="og:url" content="${escapeHtml(ogUrl)}" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:image" content="${escapeHtml(image)}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
        schema ? `<script type="application/ld+json" id="turnitos-schema-jsonld">${safeJson(schema)}</script>` : '',
        '<!-- seo:end -->'
    ].filter(Boolean).join('\n  ');
}

async function findBusiness(slug) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Same lookup as the app: "spa-3-soles" also finds "spa3soles"
    const noHyphens = slug.replace(/-/g, '');
    let query = supabase
        .from('businesses')
        .select('id, name, slug, type, description, location, latitude, longitude, whatsapp, instagram, facebook, tiktok, hours, rating, banner_image, banner_url, logo, logo_url, metadata, store_enabled, time_ranges, categories(name), services(*), specialists(*), courts(*), bookable_resources:resources(id, name, type, base_price, active)');
    query = slug === noHyphens ? query.eq('slug', slug) : query.or(`slug.eq.${slug},slug.eq.${noHyphens}`);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data;
}

// Business pages and the indexable static pages get their own <head> in the
// HTML itself, so crawlers and link previews don't depend on running the app.
// Unknown businesses answer 404 (the app still loads and sends people home).
export default async function handler(req, res) {
    const query = req.query || {};
    const page = String(query.page || '');
    const slug = String(query.slug || '').toLowerCase();
    const view = VIEWS.includes(query.view) ? query.view : 'turnos';
    const serviceId = typeof query.servicio === 'string' ? query.servicio : '';
    const productId = typeof query.producto === 'string' ? query.producto : '';

    const send = (status, meta) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Browsers always revalidate; the CDN keeps it a few minutes so edits show up quickly
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Vercel-CDN-Cache-Control', status === 200 ? 'max-age=300, stale-while-revalidate=86400' : 'max-age=60');
        res.end(shell.replace(SEO_BLOCK, renderHead(meta)));
    };

    const shell = await getShell();

    if (STATIC_PAGES[page]) {
        const { title, description } = STATIC_PAGES[page];
        return send(200, {
            title, description, image: DEFAULT_IMAGE,
            canonical: staticPageUrl(page),
            robots: 'index, follow, max-image-preview:large'
        });
    }

    const notFound = {
        title: 'Página no encontrada | TurnitosLR',
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        robots: 'noindex, follow'
    };

    if (!SLUG_PATTERN.test(slug) || !supabaseUrl || !supabaseKey) return send(404, notFound);

    let business;
    try {
        business = await findBusiness(slug);
    } catch (err) {
        // Database hiccup: serve the generic page rather than telling Google it is gone
        console.error('SEO business lookup failed:', err.message);
        return send(200, {
            title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, image: DEFAULT_IMAGE,
            robots: 'index, follow'
        });
    }

    if (!business) return send(404, notFound);

    const seo = buildBusinessSeo(business, view);
    let preview = null;
    if (serviceId) {
        const service = (business.services || []).find(s => String(s.id) === serviceId);
        if (service) preview = buildServicePreview(business, service);
    } else if (productId) {
        const products = parseMetadata(business.metadata).store_products || [];
        const product = products.find(p => String(p.id) === productId && p.is_active !== false);
        if (product) preview = buildProductPreview(business, product);
    }

    // A shared service or product keeps the page canonical but previews the item
    const params = new URLSearchParams();
    if (preview && serviceId) params.set('servicio', serviceId);
    if (preview && productId) params.set('producto', productId);
    const pageUrl = seo.url || seo.canonical;
    const url = params.toString() ? `${pageUrl}?${params}` : pageUrl;

    return send(200, { ...seo, ...(preview || {}), url });
}
