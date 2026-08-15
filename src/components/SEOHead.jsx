import React, { useEffect } from 'react';

/**
 * SEOHead: Injects and synchronizes SEO meta tags, OpenGraph, Twitter Cards,
 * canonical links, and Schema.org JSON-LD structured data in the document head.
 */
export default function SEOHead({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    schema = null,
    noIndex = false
}) {
    useEffect(() => {
        const defaultTitle = 'TurnitosLR | Reserva de Turnos Online en La Rioja';
        const defaultDescription = 'Reservá canchas de pádel, fútbol, turnos de peluquería, estética y quinchos en La Rioja de forma fácil, rápida y directa.';
        const defaultKeywords = 'turnos online, reservas la rioja, canchas de padel la rioja, futbol la rioja, quinchos la rioja, peluquerias la rioja, turnitos';
        const defaultImage = 'https://www.turnitoslr.com/logo-turnitos.png';
        const siteUrl = 'https://www.turnitoslr.com';

        const finalTitle = title ? (title.includes('Turnitos') ? title : `${title} | TurnitosLR`) : defaultTitle;
        const finalDescription = description || defaultDescription;
        const finalKeywords = keywords || defaultKeywords;
        const finalImage = image || defaultImage;
        const finalUrl = url ? (url.startsWith('http') ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`) : window.location.href;

        // 1. Update Title
        document.title = finalTitle;

        // Helper to set or update meta tag by name or property
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

        // 2. Standard Meta Tags
        setMetaTag('name', 'description', finalDescription);
        setMetaTag('name', 'keywords', finalKeywords);
        setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

        // 3. Open Graph / Facebook / WhatsApp
        setMetaTag('property', 'og:title', finalTitle);
        setMetaTag('property', 'og:description', finalDescription);
        setMetaTag('property', 'og:image', finalImage);
        setMetaTag('property', 'og:url', finalUrl);
        setMetaTag('property', 'og:type', type);
        setMetaTag('property', 'og:site_name', 'TurnitosLR');
        setMetaTag('property', 'og:locale', 'es_AR');

        // 4. Twitter Card
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', finalTitle);
        setMetaTag('name', 'twitter:description', finalDescription);
        setMetaTag('name', 'twitter:image', finalImage);

        // 5. Canonical Link
        let canonicalEl = document.querySelector('link[rel="canonical"]');
        if (!canonicalEl) {
            canonicalEl = document.createElement('link');
            canonicalEl.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalEl);
        }
        canonicalEl.setAttribute('href', finalUrl.split('?')[0]);

        // 6. Schema.org JSON-LD
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

        return () => {
            // Optional cleanup on unmount
        };
    }, [title, description, keywords, image, url, type, schema, noIndex]);

    return null;
}
