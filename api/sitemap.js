import { createClient } from '@supabase/supabase-js';
import { SITE_URL, STATIC_PAGES, staticPageUrl, businessUrl, isIndexableBusiness, hasOnlineStore } from '../src/utils/seo.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const entry = (loc, changefreq, priority) =>
    `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

// Built on request (and cached by the CDN), so a new business shows up
// without waiting for a deploy. Business pages live on their subdomain;
// robots.txt on each subdomain points here, which lets Google accept them.
export default async function handler(req, res) {
    const urls = [
        entry(`${SITE_URL}/`, 'daily', '1.0'),
        ...Object.keys(STATIC_PAGES).map(page =>
            entry(staticPageUrl(page), ['terminos', 'privacidad'].includes(page) ? 'yearly' : 'monthly', page === 'negocios' ? '0.8' : '0.5'))
    ];

    let ok = true;
    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Same data the profile checklist needs to decide if a business is listed
        const { data, error } = await supabase
            .from('businesses')
            .select('slug, type, logo, logo_url, banner_image, banner_url, location, description, hours, time_ranges, metadata, store_enabled, categories(name), services(*), specialists(*), courts(*), bookable_resources:resources(id, name, type, base_price, active)')
            .not('slug', 'is', null)
            .order('created_at', { ascending: true });

        if (error) {
            ok = false;
            console.error('Sitemap business query failed:', error.message);
        } else {
            data.filter(b => b.slug && isIndexableBusiness(b)).forEach(b => {
                urls.push(entry(businessUrl(b.slug), 'daily', '0.9'));
                if (hasOnlineStore(b)) urls.push(entry(businessUrl(b.slug, 'tienda'), 'weekly', '0.6'));
            });
        }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    // A partial sitemap (database down) is cached briefly so it gets replaced soon
    res.setHeader('Vercel-CDN-Cache-Control', ok ? 'max-age=3600, stale-while-revalidate=86400' : 'max-age=60');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}
