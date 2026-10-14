import { CalendarCheck, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';

export const formatMoney = (value) => {
    const n = Number(value) || 0;
    const rounded = Math.round(n * 100) / 100;
    return `${rounded < 0 ? '-' : ''}$${Math.abs(rounded).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
};

export const formatSignedMoney = (value) => {
    const n = Number(value) || 0;
    if (n === 0) return '$0';
    return `${n > 0 ? '+' : '-'}${formatMoney(Math.abs(n))}`;
};

// Registers are always shown in Argentina time, 24 h, whatever the device settings
export const AR_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export const formatTime = (iso) => iso
    ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: AR_TIME_ZONE })
    : '--:--';

export const formatDate = (iso, opts = { day: '2-digit', month: '2-digit', year: 'numeric' }) => iso
    ? new Date(iso).toLocaleDateString('es-AR', { ...opts, timeZone: AR_TIME_ZONE })
    : '';

const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '');

export const formatLongDate = (iso) => capitalize(formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' }));

/** Day of month and short weekday in Argentina time (history list) */
export const dayParts = (iso) => ({
    day: formatDate(iso, { day: 'numeric' }),
    weekday: formatDate(iso, { weekday: 'short' }).replace('.', '')
});

// Visual identity of each movement type (icon + tone used by badges and list icons)
export const MOVEMENT_VISUALS = {
    booking_income: { icon: CalendarCheck, label: 'Turno', tone: 'blue' },
    canteen_sale: { icon: ShoppingCart, label: 'Artículos', tone: 'green' },
    manual_income: { icon: TrendingUp, label: 'Ingreso', tone: 'green' },
    manual_expense: { icon: TrendingDown, label: 'Gasto', tone: 'red' }
};

export const toneStyle = (tone) => ({
    green: { background: 'var(--cc-green-bg)', color: 'var(--cc-green)' },
    red: { background: 'var(--cc-red-bg)', color: 'var(--cc-red)' },
    amber: { background: 'var(--cc-amber-bg)', color: 'var(--cc-amber)' },
    blue: { background: 'var(--cc-blue-bg)', color: 'var(--cc-blue)' }
}[tone] || { background: 'var(--bg-main)', color: 'var(--text-secondary)' });

export const differenceTone = (difference) => {
    const d = Number(difference) || 0;
    if (Math.abs(d) < 0.01) return 'green';
    return d > 0 ? 'amber' : 'red';
};

export const differenceLabel = (difference) => {
    const d = Number(difference) || 0;
    if (Math.abs(d) < 0.01) return 'Cuadra';
    return d > 0 ? `Sobran ${formatMoney(d)}` : `Faltan ${formatMoney(Math.abs(d))}`;
};

export const stockStatus = (product) => {
    if (!product.track_stock) return { label: 'Sin control de stock', tone: null };
    const stock = Number(product.current_stock) || 0;
    if (stock <= 0) return { label: 'Sin stock', tone: 'red' };
    if (stock <= (Number(product.min_stock_alert) || 0)) return { label: 'Stock bajo', tone: 'amber' };
    return { label: 'En stock', tone: 'green' };
};
