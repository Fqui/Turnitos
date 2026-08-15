import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env directly
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

function generateSlug(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

async function run() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, name, slug, created_at, store_enabled');

    if (error) {
        console.error('Error fetching businesses:', error);
        return;
    }

    const baseUrl = 'https://www.turnitoslr.com';
    const today = new Date().toISOString().split('T')[0];

    const urls = [
        `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
        `  <url>\n    <loc>${baseUrl}/ayuda</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    ];

    (businesses || []).forEach(b => {
        const slug = b.slug || generateSlug(b.name);
        const lastMod = (b.created_at || new Date().toISOString()).split('T')[0];

        // Business profile URL
        urls.push(`  <url>\n    <loc>${baseUrl}/${slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`);

        // Store URL if enabled
        if (b.store_enabled) {
            urls.push(`  <url>\n    <loc>${baseUrl}/${slug}/tienda</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
        }
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    fs.writeFileSync('public/sitemap.xml', sitemapXml);
    console.log(`✅ Sitemap created at public/sitemap.xml with ${urls.length} URLs!`);
}

run();
