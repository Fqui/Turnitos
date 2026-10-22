// Color de letra legible sobre un fondo: blanco salvo que el fondo sea claro.
// Se prefiere blanco (a los botones de color con letra negra les queda mal) y solo se pasa
// a letra oscura cuando el blanco no llega a un contraste razonable.
export const DARK_TEXT = '#0B1410';
export const LIGHT_TEXT = '#FFFFFF';

const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const parseRgb = (color) => {
    const str = String(color || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(str);
    if (m) return m[1].split('').map(x => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})/i.exec(str);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?/i.exec(str);
    if (m) {
        const alpha = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
        if (alpha < 0.5) return null;
        return [m[1], m[2], m[3]].map(Number);
    }
    return null;
};

export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const readableTextOn = (color) => {
    const rgb = parseRgb(color);
    if (!rgb) return null;
    const whiteContrast = 1.05 / (luminance(rgb) + 0.05);
    return whiteContrast >= 3 ? LIGHT_TEXT : DARK_TEXT;
};
