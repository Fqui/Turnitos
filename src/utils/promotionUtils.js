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
