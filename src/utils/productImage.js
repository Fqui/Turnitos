import { useEffect, useState } from 'react';

/**
 * Product image helpers.
 * Store products can be cut-out PNGs (transparent background) or regular photos.
 * Cut-outs look best floating with a shadow; photos look best filling their box.
 */

export const PRODUCT_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';

/** Asks Unsplash for a smaller rendition so thumbnails don't download 900px images. */
export function getSizedImageUrl(url, size) {
    if (!url || !size || !url.includes('images.unsplash.com')) return url;
    try {
        const u = new URL(url);
        u.searchParams.set('w', String(size));
        if (u.searchParams.has('h')) u.searchParams.set('h', String(size));
        return u.toString();
    } catch {
        return url;
    }
}

const cache = new Map(); // url -> 'transparent' | 'opaque'

function guessFromUrl(url) {
    const path = url.split('?')[0].toLowerCase();
    if (/\.(jpe?g)$/.test(path)) return 'opaque';
    if (url.includes('images.unsplash.com') && !/[?&]fm=(png|webp|avif)/.test(url)) return 'opaque';
    return null;
}

/** Looks at the image corners: if most of them are see-through, it's a cut-out. */
function detectTransparency(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const size = 32;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);
                const alphaAt = (x, y) => data[(y * size + x) * 4 + 3];
                const corners = [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2]];
                const clear = corners.filter(([x, y]) => alphaAt(x, y) < 200).length;
                resolve(clear >= 2 ? 'transparent' : 'opaque');
            } catch {
                // Tainted canvas (no CORS): treat as a photo, the safe default
                resolve('opaque');
            }
        };
        img.onerror = () => resolve('opaque');
        img.src = url;
    });
}

/**
 * Returns 'transparent' | 'opaque' for an image URL.
 * Starts as 'opaque' (photo layout) until a PNG/WebP proves to be a cut-out.
 */
export function useImageKind(url) {
    const [, setDetectedUrl] = useState(null);
    const known = url ? (cache.get(url) || guessFromUrl(url)) : 'opaque';

    useEffect(() => {
        if (!url || known) return undefined;
        let alive = true;
        detectTransparency(url).then((result) => {
            cache.set(url, result);
            if (alive) setDetectedUrl(url); // re-render to pick up the cached result
        });
        return () => { alive = false; };
    }, [url, known]);

    return known || 'opaque';
}
