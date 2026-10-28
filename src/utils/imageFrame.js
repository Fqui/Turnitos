// Framing (zoom + position) for uploaded photos, chosen by the owner in ImageFrameEditor.
// It travels inside the image URL as a fragment: `https://.../foto.jpg#tf=50,30,1.4` or
// `#tf=50,50,1,e` ("e" = whole photo over a blurred fill). Browsers never send the fragment,
// so the same file is served; every column that stores a URL keeps working without changes,
// and photos without a fragment look exactly as before.

const FRAME_KEY = 'tf=';
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const DEFAULT_FRAME = { x: 50, y: 50, z: 1, whole: false };

// Split an image URL into the file URL and its framing (null when it has none).
export function parseFrame(url) {
    if (typeof url !== 'string') return { src: url, frame: null };
    const hashAt = url.indexOf('#');
    if (hashAt === -1) return { src: url, frame: null };
    const src = url.slice(0, hashAt);
    const hash = url.slice(hashAt + 1);
    if (!hash.startsWith(FRAME_KEY)) return { src: url, frame: null };

    const [x, y, z, mode] = hash.slice(FRAME_KEY.length).split(',');
    const nx = Number(x), ny = Number(y), nz = Number(z);
    if (![nx, ny].every(Number.isFinite)) return { src, frame: null };
    return {
        src,
        frame: {
            x: clamp(Math.round(nx), 0, 100),
            y: clamp(Math.round(ny), 0, 100),
            z: Number.isFinite(nz) ? clamp(nz, MIN_ZOOM, MAX_ZOOM) : 1,
            whole: mode === 'e'
        }
    };
}

// File URL without the framing (for SEO tags, downloads, comparisons).
export const imageSrc = (url) => parseFrame(url).src;

export const isDefaultFrame = (f) => !f || (f.x === 50 && f.y === 50 && f.z === 1 && !f.whole);

// URL with the given framing; the default framing leaves the URL clean.
export function withFrame(url, frame) {
    const src = imageSrc(url);
    if (!src || isDefaultFrame(frame)) return src;
    const z = Math.round(clamp(frame.z ?? 1, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
    return `${src}#${FRAME_KEY}${Math.round(frame.x)},${Math.round(frame.y)},${z}${frame.whole ? ',e' : ''}`;
}

// Inline styles for an <img> that fills its box. Photos with no framing get only `fallbackPosition`
// (or nothing), so spreading this after an existing style keeps that style as it was.
export function frameImageStyle(frame, fallbackPosition) {
    if (!frame) return fallbackPosition ? { objectPosition: fallbackPosition } : {};
    const position = `${frame.x}% ${frame.y}%`;
    return {
        objectFit: frame.whole ? 'contain' : 'cover',
        objectPosition: position,
        transformOrigin: position,
        transform: frame.z !== 1 ? `scale(${frame.z})` : undefined
    };
}

// Same as frameImageStyle, straight from a URL.
export const frameStyleFor = (url, fallbackPosition) => frameImageStyle(parseFrame(url).frame, fallbackPosition);
