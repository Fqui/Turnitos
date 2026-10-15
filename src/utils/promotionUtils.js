/**
 * Utilities for parsing and calculating promotions, coupon codes, and targeted discounts
 */

export function parsePromotionTarget(promo) {
    if (!promo) {
        return {
            code: '',
            target_type: 'general',
            target_id: null,
            target_name: '',
            text: '',
            cta_text: '',
            action_url: '',
            discount_type: 'percentage',
            discount_value: 0,
            discount_label: ''
        };
    }

    let meta = {};
    if (promo.description && typeof promo.description === 'string') {
        try {
            if (promo.description.trim().startsWith('{')) {
                meta = JSON.parse(promo.description);
            }
        } catch (e) {
            meta = { text: promo.description };
        }
    }

    const code = promo.code || meta.code || promo.coupon_code || '';
    const target_type = promo.target_type || meta.target_type || (promo.service_id ? 'service' : (promo.sport_type ? 'sport' : 'general'));
    const target_id = promo.service_id || promo.target_id || meta.target_id || null;
    const target_name = promo.target_name || meta.target_name || '';
    const text = meta.text !== undefined ? meta.text : (!promo.description?.startsWith('{') ? promo.description : '');
    const cta_text = promo.cta_text || meta.cta_text || '';
    const action_url = promo.action_url || meta.action_url || '';

    const discount_type = promo.discount_type || meta.discount_type || 'percentage';
    const discount_value = Number(promo.discount_value !== undefined ? promo.discount_value : (meta.discount_value || 0));

    let discount_label = promo.discount || '';
    if (!discount_label) {
        if (discount_type === 'fixed' && discount_value > 0) {
            discount_label = `$${discount_value.toLocaleString('es-AR')} OFF`;
        } else if (discount_type === 'percentage' && discount_value > 0) {
            discount_label = `${discount_value}% OFF`;
        } else {
            discount_label = 'PROMO';
        }
    }

    return {
        code,
        target_type,
        target_id,
        target_name,
        text,
        cta_text,
        action_url,
        discount_type,
        discount_value,
        discount_label
    };
}

// ---------------------------------------------------------------------------
// Reglas de la promo (columnas de promotions): promo_kind, valid_days,
// time_from, time_to, min_advance_days, first_visit_only, max_uses_per_customer
// ---------------------------------------------------------------------------

// Tipos de promo que se venden (nombres para la UI)
export const PROMO_KINDS = [
    { id: 'schedule', icon: '🕐', label: 'Horario con descuento', help: 'Descuento en días y franja horaria con poca demanda.' },
    { id: 'weekday', icon: '📅', label: 'Día fijo', help: 'Uno o más días de la semana con precio especial, todo el día.' },
    { id: 'service', icon: '✂️', label: 'Servicio puntual', help: 'Descuento en un servicio, cancha o categoría concreta.' },
    { id: 'first_visit', icon: '👋', label: 'Primera visita', help: 'Solo para clientes que nunca reservaron en ese negocio.' },
    { id: 'advance', icon: '🗓️', label: 'Reserva anticipada', help: 'Premia a quien reserva con tiempo (quinchos, eventos).' },
    { id: 'visibility', icon: '📣', label: 'Solo visibilidad', help: 'Banner sin descuento: lleva al perfil o a la tienda.' },
    { id: 'general', icon: '🏷️', label: 'Descuento general', help: 'Descuento en cualquier turno, sin condiciones.' }
];

export function getPromoKindMeta(kind) {
    return PROMO_KINDS.find(k => k.id === kind) || PROMO_KINDS[PROMO_KINDS.length - 1];
}

// 0 = domingo ... 6 = sábado (como Date.getDay)
export const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toHHMM = (value) => (value ? String(value).slice(0, 5) : '');

const hourLabel = (hhmm) => {
    const [h, m] = String(hhmm).split(':');
    return m && m !== '00' ? `${Number(h)}:${m}` : `${Number(h)}`;
};

const dateFromYmd = (value) => {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const [y, m, d] = String(value || '').slice(0, 10).split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
};

/**
 * Reglas normalizadas de la promo
 */
export function getPromoRules(promo) {
    const rawDays = Array.isArray(promo?.valid_days) ? promo.valid_days : null;
    const days = rawDays
        ? rawDays.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
        : [];
    let time_from = toHHMM(promo?.time_from);
    const time_to = toHHMM(promo?.time_to);
    if (time_from === '00:00') time_from = '';
    return {
        kind: promo?.promo_kind || 'general',
        days: days.length === 7 ? [] : days,
        time_from,
        time_to,
        min_advance_days: Number(promo?.min_advance_days) > 0 ? Number(promo.min_advance_days) : 0,
        first_visit_only: Boolean(promo?.first_visit_only),
        max_uses_per_customer: Number(promo?.max_uses_per_customer) > 0 ? Number(promo.max_uses_per_customer) : 0
    };
}

/**
 * True si la promo descuenta algo (las de "Solo visibilidad" no)
 */
export function promoGivesDiscount(promo) {
    if (!promo || promo.promo_kind === 'visibility') return false;
    return parsePromotionTarget(promo).discount_value > 0;
}

/**
 * True si la promo depende del día u horario del turno
 */
export function hasPromoSchedule(promo) {
    const { days, time_from, time_to } = getPromoRules(promo);
    return days.length > 0 || Boolean(time_from) || Boolean(time_to);
}

/**
 * 'Lun a Vie', 'Sáb y Dom', 'Lun, Mié y Vie' ('' = todos los días)
 */
export function describePromoDays(promo) {
    const { days } = getPromoRules(promo);
    if (days.length === 0) return '';
    const ordered = WEEK_ORDER.filter(d => days.includes(d));
    const idx = ordered.map(d => WEEK_ORDER.indexOf(d));
    const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    if (ordered.length >= 3 && consecutive) {
        return `${DAY_SHORT[ordered[0]]} a ${DAY_SHORT[ordered[ordered.length - 1]]}`;
    }
    const names = ordered.map(d => DAY_SHORT[d]);
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * 'antes de las 18 h', 'desde las 14 h', 'de 9 a 13 h' ('' = todo el día)
 */
export function describePromoHours(promo) {
    const { time_from, time_to } = getPromoRules(promo);
    if (time_from && time_to) return `de ${hourLabel(time_from)} a ${hourLabel(time_to)} h`;
    if (time_to) return `antes de las ${hourLabel(time_to)} h`;
    if (time_from) return `desde las ${hourLabel(time_from)} h`;
    return '';
}

/**
 * 'Lun a Vie · antes de las 18 h' ('' si vale siempre)
 */
export function describePromoSchedule(promo) {
    return [describePromoDays(promo), describePromoHours(promo)].filter(Boolean).join(' · ');
}

const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/**
 * Chips de condiciones para mostrarle al cliente
 */
export function getPromoConditionChips(promo) {
    if (!promo) return [];
    const rules = getPromoRules(promo);
    const parsed = parsePromotionTarget(promo);
    const chips = [];
    if (parsed.target_type === 'service' && parsed.target_name) chips.push(`✂️ ${parsed.target_name}`);
    if (parsed.target_type === 'category' && parsed.target_name) chips.push(`🏷️ ${parsed.target_name}`);
    const days = describePromoDays(promo);
    if (days) chips.push(`📅 ${days}`);
    const hours = describePromoHours(promo);
    if (hours) chips.push(`🕐 ${capitalize(hours)}`);
    if (rules.min_advance_days) chips.push(`🗓️ Reservando con ${rules.min_advance_days} días o más`);
    if (rules.first_visit_only) chips.push('👋 Primera visita');
    if (rules.max_uses_per_customer === 1) chips.push('1 vez por cliente');
    else if (rules.max_uses_per_customer > 1) chips.push(`${rules.max_uses_per_customer} veces por cliente`);
    const end = promo.end_date || promo.expires_at;
    if (end) {
        const [, m, d] = String(end).slice(0, 10).split('-');
        chips.push(`⏳ Hasta ${d}/${m}`);
    }
    return chips;
}

/**
 * Por qué un turno no entra en la promo ('' si entra).
 * date: 'YYYY-MM-DD' o Date; time: 'HH:MM'.
 */
export function getPromoSlotIssue(promo, date, time, today = todayAR()) {
    if (!promo) return 'no hay promo';
    const rules = getPromoRules(promo);
    const day = dateFromYmd(date);
    if (rules.days.length > 0 && day && !rules.days.includes(day.getDay())) {
        return `solo vale ${describePromoDays(promo)}`;
    }
    if (time && (rules.time_from || rules.time_to)) {
        const t = String(time).slice(0, 5).padStart(5, '0');
        if ((rules.time_from && t < rules.time_from) || (rules.time_to && t >= rules.time_to)) {
            return `solo vale ${describePromoHours(promo)}`;
        }
    }
    if (rules.min_advance_days && day) {
        const base = dateFromYmd(today);
        const diff = base ? Math.round((day - base) / 86400000) : 0;
        if (diff < rules.min_advance_days) {
            return `hay que reservar con ${rules.min_advance_days} días de anticipación`;
        }
    }
    return '';
}

/**
 * True si el turno (fecha y hora de inicio) entra en la promo
 */
export function isPromoValidForSlot(promo, date, time, today) {
    return Boolean(promo) && getPromoSlotIssue(promo, date, time, today) === '';
}

/**
 * Check if a promotion applies to a specific service
 */
export function doesPromoApplyToService(promo, service) {
    if (!promo || !service) return false;
    const { target_type, target_id, target_name, discount_value } = parsePromotionTarget(promo);

    // If there is no real discount value and it's general, do not clutter all services with badges
    if (discount_value <= 0 && target_type !== 'service') {
        return false;
    }

    if (target_type === 'general' || target_type === 'sport') {
        return discount_value > 0;
    }
    if (target_type === 'service') {
        return String(service.id) === String(target_id) || service.name?.toLowerCase() === target_name?.toLowerCase();
    }
    if (target_type === 'category') {
        return service.category && target_name && service.category.toLowerCase().trim() === target_name.toLowerCase().trim();
    }
    return false;
}

/**
 * Check if a promotion applies to a specific store product
 */
export function doesPromoApplyToProduct(promo, product) {
    if (!promo || !product) return false;
    const { target_type, target_id, target_name } = parsePromotionTarget(promo);

    if (target_type === 'store') {
        return true;
    }
    if (target_type === 'product') {
        return String(product.id) === String(target_id) || product.name?.toLowerCase() === target_name?.toLowerCase();
    }
    if (target_type === 'category') {
        return product.category && target_name && product.category.toLowerCase().trim() === target_name.toLowerCase().trim();
    }
    return false;
}

/**
 * Calculate discounted price and saving amount
 */
export function calculatePromoDiscount(basePrice, promo) {
    const numPrice = Number(basePrice || 0);
    if (!promo || numPrice <= 0) return { finalPrice: numPrice, discountAmount: 0 };

    const { discount_type, discount_value } = parsePromotionTarget(promo);
    if (discount_value <= 0) return { finalPrice: numPrice, discountAmount: 0 };

    let discountAmount = 0;
    if (discount_type === 'fixed') {
        discountAmount = Math.min(discount_value, numPrice);
    } else {
        discountAmount = Math.round(numPrice * (discount_value / 100));
    }

    const finalPrice = Math.max(0, numPrice - discountAmount);
    return { finalPrice, discountAmount };
}

/**
 * Fecha de hoy en Argentina como 'YYYY-MM-DD' (comparable con start_date / end_date)
 */
export function todayAR() {
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
    } catch {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

const toDay = (value) => (value ? String(value).slice(0, 10) : null);

/**
 * Estado de una publicidad: 'paused' | 'scheduled' | 'expired' | 'live'
 */
export function getPromotionStatus(promo, today = todayAR()) {
    if (!promo) return 'expired';
    if (promo.active === false) return 'paused';
    const start = toDay(promo.start_date);
    const end = toDay(promo.end_date || promo.expires_at);
    if (start && start > today) return 'scheduled';
    if (end && end < today) return 'expired';
    return 'live';
}

/**
 * True si la publicidad debe mostrarse hoy en el Home
 */
export function isPromotionLive(promo, today = todayAR()) {
    return getPromotionStatus(promo, today) === 'live';
}
