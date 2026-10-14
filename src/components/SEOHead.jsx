import { useEffect } from 'react';
import { SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION, DEFAULT_IMAGE } from '../utils/seo';

/**
 * SEOHead: keeps title, meta description, robots, OpenGraph, Twitter Cards,
 * canonical and Schema.org JSON-LD in sync while navigating inside the app.
 * The first load already comes with these tags from the server (api/page.js).
 */
export default function SEOHead({
    title,
    description,
    image,
    url,
    canonical,
    type = 'website',
    schema = null,
    noIndex = false,
    robots,
    brandTitle = true
}) {
    useEffect(() => {
        const finalTitle = title
            ? (!brandTitle || title.includes('Turnitos') ? title : `${title} | TurnitosLR`)
            : DEFAULT_TITLE;
        const finalDescription = description || DEFAULT_DESCRIPTION;
        const finalImage = image || DEFAULT_IMAGE;
        const finalUrl = url ? (url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`) : window.location.href;
        const finalCanonical = canonical || finalUrl.split('?')[0];
        const finalRobots = robots || (noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

        document.title = finalTitle;

        // Set or update a meta tag by name or property
        const setMetaTag = (attrName, attrValue, content) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attrName, attrValue);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        setMetaTag('name', 'description', finalDescription);
        setMetaTag('name', 'robots', finalRobots);

        // Open Graph / Facebook / WhatsApp
        setMetaTag('property', 'og:title', finalTitle);
        setMetaTag('property', 'og:description', finalDescription);
        setMetaTag('property', 'og:image', finalImage);
        setMetaTag('property', 'og:url', finalCanonical);
        setMetaTag('property', 'og:type', type);
        setMetaTag('property', 'og:site_name', 'TurnitosLR');
        setMetaTag('property', 'og:locale', 'es_AR');

        // Twitter Card
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', finalTitle);
        setMetaTag('name', 'twitter:description', finalDescription);
        setMetaTag('name', 'twitter:image', finalImage);

        // A noindex page has no canonical: the pair reads as mixed signals
        let canonicalEl = document.querySelector('link[rel="canonical"]');
        if (finalRobots.startsWith('noindex')) {
            canonicalEl?.remove();
        } else {
            if (!canonicalEl) {
                canonicalEl = document.createElement('link');
                canonicalEl.setAttribute('rel', 'canonical');
                document.head.appendChild(canonicalEl);
            }
            canonicalEl.setAttribute('href', finalCanonical);
        }

        // Schema.org JSON-LD
        let schemaEl = document.getElementById('turnitos-schema-jsonld');
        if (schema) {
            if (!schemaEl) {
                schemaEl = document.createElement('script');
                schemaEl.id = 'turnitos-schema-jsonld';
                schemaEl.type = 'application/ld+json';
                document.head.appendChild(schemaEl);
            }
            schemaEl.textContent = JSON.stringify(schema);
        } else if (schemaEl) {
            schemaEl.remove();
        }
    }, [title, description, image, url, canonical, type, schema, noIndex, robots, brandTitle]);

    return null;
}
