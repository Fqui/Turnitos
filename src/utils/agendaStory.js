// "Agenda abierta" story (1080x1920) drawn with Canvas in the browser: no server, no cost.
// Three templates: 'elegant' (nude, serif + script), 'brand' (business color) and 'photo' (cover).
import { parseFrame } from './imageFrame';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export const STORY_TEMPLATES = [
    { key: 'elegant', label: 'Elegante' },
    { key: 'brand', label: 'Color del negocio' },
    { key: 'photo', label: 'Con foto' }
];

const SANS = '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", system-ui, sans-serif';
const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
const SCRIPT = '"Great Vibes", "Brush Script MT", cursive';
const EXTRA_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Great+Vibes&display=swap';

const PAD_X = 88;
const CONTENT_W = STORY_WIDTH - PAD_X * 2;

// Link icon (24x24 strokes), drawn with Path2D
const LINK_PATHS = [
    'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
    'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'
];

const withTimeout = (promise, ms) => Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);

let extraFontsLink = null;

// Plus Jakarta Sans (bundled) and the elegant template fonts must be ready before drawing,
// or the canvas falls back to the system font for good
export async function loadStoryFonts() {
    if (typeof document === 'undefined' || !document.fonts) return;
    if (!extraFontsLink) {
        extraFontsLink = document.createElement('link');
        extraFontsLink.rel = 'stylesheet';
        extraFontsLink.href = EXTRA_FONTS_URL;
        document.head.appendChild(extraFontsLink);
        await withTimeout(new Promise(resolve => {
            extraFontsLink.onload = resolve;
            extraFontsLink.onerror = resolve;
        }), 3000);
    }
    const faces = [
        `600 40px ${SANS}`, `700 40px ${SANS}`, `800 40px ${SANS}`,
        `500 40px ${SERIF}`, `600 40px ${SERIF}`, `400 40px ${SCRIPT}`
    ];
    await withTimeout(Promise.all(faces.map(face => document.fonts.load(face).catch(() => null))), 4000);
}

// Images from Supabase Storage need CORS to keep the canvas exportable; on failure, null (drawn without it)
export function loadStoryImage(url) {
    const { src } = parseFrame(url || '');
    if (!src) return Promise.resolve(null);
    const attempt = (href) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = href;
    });
    // A copy cached without CORS headers fails once: retry skipping the cache
    return withTimeout(attempt(src).then(img => img || attempt(`${src}${src.includes('?') ? '&' : '?'}agenda=1`)), 8000)
        .then(img => img || null);
}

function hexToRgb(hex) {
    const value = String(hex || '').trim().replace('#', '');
    const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}

function luminance(rgb) {
    const [r, g, b] = rgb.map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const isLight = (hex) => {
    const rgb = hexToRgb(hex);
    return rgb ? luminance(rgb) > 0.45 : false;
};

function initials(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'T';
}

function setFont(ctx, weight, size, family, spacing = 0) {
    ctx.font = `${weight} ${size}px ${family}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
}

// Largest size (down to min) at which the text fits maxWidth
function fitFont(ctx, text, weight, size, family, maxWidth, min = 20, spacing = 0) {
    let current = size;
    setFont(ctx, weight, current, family, spacing);
    while (current > min && ctx.measureText(text).width > maxWidth) {
        current -= 2;
        setFont(ctx, weight, current, family, spacing);
    }
    return current;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

// Image filling the box (object-fit: cover) around a focus point in %
function drawCover(ctx, img, x, y, w, h, focus = { x: 50, y: 50 }, zoom = 1) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * Math.max(1, zoom || 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) * (focus.x / 100);
    const dy = y + (h - dh) * (focus.y / 100);
    ctx.drawImage(img, dx, dy, dw, dh);
}

function drawLogo(ctx, { logo, name }, cx, cy, size, { bg, fg, family, weight }) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    if (logo) {
        ctx.clip();
        drawCover(ctx, logo, cx - size / 2, cy - size / 2, size, size);
    } else {
        ctx.fillStyle = fg;
        setFont(ctx, weight, Math.round(size * 0.38), family);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials(name), cx, cy + 2);
    }
    ctx.restore();
}

function drawLinkPill(ctx, url, centerY, { bg, fg }) {
    const height = 116;
    const iconSize = 44;
    const gap = 18;
    const fontSize = fitFont(ctx, url, 700, 46, SANS, CONTENT_W - 96 - iconSize - gap, 26);
    const textW = ctx.measureText(url).width;
    const width = Math.min(CONTENT_W, textW + iconSize + gap + 96);
    const x = (STORY_WIDTH - width) / 2;
    const y = centerY - height / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();

    // Icon
    ctx.save();
    ctx.translate(x + 48, centerY - iconSize / 2);
    ctx.scale(iconSize / 24, iconSize / 24);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    LINK_PATHS.forEach(d => ctx.stroke(new Path2D(d)));
    ctx.restore();

    setFont(ctx, 700, fontSize, SANS);
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(url, x + 48 + iconSize + gap, centerY + 2);
}

// Days with their time chips between top and bottom, scaled down to fit
function drawDays(ctx, days, columns, top, bottom, style) {
    if (days.length === 0) return;
    const natural = { label: 58, labelGap: 18, chip: 100, dayGap: 48 };
    const available = bottom - top;
    const blockH = natural.label + natural.labelGap + natural.chip;
    // Many days: first the space between days gets tighter, then everything scales down
    let naturalGap = natural.dayGap;
    if (days.length > 1 && days.length * blockH + (days.length - 1) * naturalGap > available) {
        naturalGap = Math.max(22, (available - days.length * blockH) / (days.length - 1));
    }
    const scale = Math.min(1, available / (days.length * blockH + (days.length - 1) * naturalGap));
    const label = natural.label * scale;
    const labelGap = natural.labelGap * scale;
    const chipH = natural.chip * scale;
    const dayGap = naturalGap * scale;
    const total = days.length * (label + labelGap + chipH) + (days.length - 1) * dayGap;

    const chipGap = columns > 4 ? 14 : 20;
    const chipW = (CONTENT_W - chipGap * (columns - 1)) / columns;
    const chipFont = Math.round((columns > 4 ? 40 : 48) * Math.max(scale, 0.8));

    let y = top + Math.max(0, (bottom - top - total) / 2);
    days.forEach(day => {
        // Day name
        style.dayFont(ctx, Math.round(label * 0.92));
        ctx.fillStyle = style.dayColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = style.align === 'center' ? 'center' : 'left';
        ctx.fillText(style.dayText(day), style.align === 'center' ? STORY_WIDTH / 2 : PAD_X, y + label / 2);
        y += label + labelGap;

        // Time chips
        const rowW = day.times.length * chipW + (day.times.length - 1) * chipGap;
        let x = style.align === 'center' ? (STORY_WIDTH - rowW) / 2 : PAD_X;
        day.times.forEach(time => {
            roundRect(ctx, x, y, chipW, chipH, style.chipRadius);
            if (style.chipFill) {
                ctx.fillStyle = style.chipFill;
                ctx.fill();
            }
            if (style.chipStroke) {
                ctx.strokeStyle = style.chipStroke;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            setFont(ctx, style.chipWeight, chipFont, SANS);
            ctx.fillStyle = style.chipText;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(time, x + chipW / 2, y + chipH / 2 + 2);
            x += chipW + chipGap;
        });
        y += chipH + dayGap;
    });
}

function drawElegant(ctx, data) {
    const ink = '#5a3a2a';
    const bg = ctx.createRadialGradient(STORY_WIDTH * 0.8, STORY_HEIGHT * 0.2, 60, STORY_WIDTH * 0.8, STORY_HEIGHT * 0.2, STORY_HEIGHT * 1.05);
    bg.addColorStop(0, '#f3e7db');
    bg.addColorStop(0.55, '#e7d2bf');
    bg.addColorStop(1, '#d8bea7');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    drawLogo(ctx, data, STORY_WIDTH / 2, 230, 150, { bg: 'rgba(255,255,255,0.55)', fg: ink, family: SERIF, weight: 600 });

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    setFont(ctx, 500, 150, SERIF, 9);
    ctx.fillText('AGENDA', STORY_WIDTH / 2, 480);
    setFont(ctx, 400, 150, SCRIPT);
    ctx.fillText('abierta', STORY_WIDTH / 2, 600);

    drawDays(ctx, data.days, data.columns, 680, 1560, {
        align: 'center',
        dayFont: (c, size) => setFont(c, 600, size, SERIF, 5),
        dayText: day => `${day.name.toUpperCase()} ${day.dayNumber}`,
        dayColor: ink,
        chipFill: 'rgba(255,255,255,0.45)',
        chipRadius: 18,
        chipWeight: 600,
        chipText: '#6b4a38'
    });

    setFont(ctx, 400, 92, SCRIPT);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Agendá tu turno:', STORY_WIDTH / 2, 1680);
    drawLinkPill(ctx, data.link, 1770, { bg: '#ffffff', fg: ink });
}

function drawBrand(ctx, data) {
    const color = hexToRgb(data.color) ? data.color : '#3ECF8E';
    const light = isLight(color);
    const ink = light ? '#0E1411' : '#ffffff';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    // Soft circles for depth
    ctx.fillStyle = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(STORY_WIDTH * 0.95, STORY_HEIGHT * 0.9, 620, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-80, 120, 300, 0, Math.PI * 2);
    ctx.fill();

    drawLogo(ctx, data, STORY_WIDTH / 2, 230, 150, { bg: '#ffffff', fg: light ? '#0E1411' : color, family: SANS, weight: 800 });

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    setFont(ctx, 800, 124, SANS, -2);
    ctx.fillText('Turnos libres', STORY_WIDTH / 2, 470);
    ctx.globalAlpha = 0.85;
    fitFont(ctx, data.name, 600, 46, SANS, CONTENT_W, 28);
    ctx.fillText(data.name, STORY_WIDTH / 2, 545);
    ctx.globalAlpha = 1;

    drawDays(ctx, data.days, data.columns, 640, 1570, {
        align: 'left',
        dayFont: (c, size) => setFont(c, 800, Math.round(size * 0.9), SANS, 3),
        dayText: day => `${day.name.toUpperCase()} ${day.dayNumber}`,
        dayColor: ink,
        chipFill: light ? '#0E1411' : '#ffffff',
        chipRadius: 16,
        chipWeight: 800,
        chipText: light ? '#ffffff' : color
    });

    setFont(ctx, 700, 54, SANS);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Reservá en 1 minuto', STORY_WIDTH / 2, 1680);
    drawLinkPill(ctx, data.link, 1770, light ? { bg: '#ffffff', fg: '#0E1411' } : { bg: '#0E1411', fg: '#ffffff' });
}

function drawPhoto(ctx, data) {
    const accent = hexToRgb(data.color) && isLight(data.color) ? data.color : '#F48FB1';
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    if (data.cover) {
        const frame = data.coverFrame || { x: 50, y: 50, z: 1 };
        drawCover(ctx, data.cover, 0, 0, STORY_WIDTH, STORY_HEIGHT, frame, frame.z);
    } else if (hexToRgb(data.color)) {
        const fallback = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
        fallback.addColorStop(0, data.color);
        fallback.addColorStop(1, '#111111');
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    }
    const shade = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
    shade.addColorStop(0, 'rgba(0,0,0,0.55)');
    shade.addColorStop(0.45, 'rgba(0,0,0,0.68)');
    shade.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 0.9;
    fitFont(ctx, data.name.toUpperCase(), 700, 46, SANS, CONTENT_W, 26, 6);
    ctx.fillText(data.name.toUpperCase(), STORY_WIDTH / 2, 230);
    ctx.globalAlpha = 1;
    setFont(ctx, 800, 128, SANS, -2);
    ctx.fillText('¿Turno?', STORY_WIDTH / 2, 400);
    ctx.fillText('Quedan estos', STORY_WIDTH / 2, 525);

    drawDays(ctx, data.days, data.columns, 630, 1570, {
        align: 'left',
        dayFont: (c, size) => setFont(c, 700, Math.round(size * 0.9), SANS, 1),
        dayText: day => `${day.name} ${day.dayNumber}`,
        dayColor: accent,
        chipFill: 'rgba(255,255,255,0.08)',
        chipStroke: 'rgba(255,255,255,0.55)',
        chipRadius: 16,
        chipWeight: 700,
        chipText: '#ffffff'
    });

    setFont(ctx, 600, 48, SANS);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Reservá online', STORY_WIDTH / 2, 1680);
    drawLinkPill(ctx, data.link, 1770, { bg: accent, fg: '#0E1411' });
}

const DRAWERS = { elegant: drawElegant, brand: drawBrand, photo: drawPhoto };

// data: { template, name, link, color, logo (img|null), cover (img|null), coverFrame, days, columns }
export function drawAgendaStory(canvas, data) {
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    (DRAWERS[data.template] || drawElegant)(ctx, data);
    return canvas;
}

// PNG of the canvas; null when the browser refuses (canvas tainted by an image without CORS)
export function storyToBlob(canvas) {
    return new Promise(resolve => {
        try {
            canvas.toBlob(blob => resolve(blob), 'image/png');
        } catch {
            resolve(null);
        }
    });
}
