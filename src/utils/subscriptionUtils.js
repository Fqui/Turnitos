/**
 * Subscription Plans & Commission Architecture for TurnitosLR
 */

export const PLAN_IDS = {
    SERVICES_INDIVIDUAL: 'services_individual',
    SERVICES_TEAM: 'services_team',
    COURTS_1_3: 'courts_1_3',
    COURTS_4_5: 'courts_4_5',
    COURTS_6_PLUS: 'courts_6_plus',
    RENTAL: 'rental'
};

export const PLANS_CATALOG = [
    {
        id: PLAN_IDS.SERVICES_INDIVIDUAL,
        name: 'Servicios - Individual',
        business_type: 'services',
        category_label: '1 Agenda / Profesional',
        monthly_price: 17000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        description: 'Todo incluido para 1 profesional. $0 comisión directa, $500 por reserva desde marketplace.'
    },
    {
        id: PLAN_IDS.SERVICES_TEAM,
        name: 'Servicios - Equipo',
        business_type: 'services',
        category_label: '2 o más Agendas',
        monthly_price: 32000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        extra_specialist_price: 10000,
        description: '2 profesionales $25.000, 3 profesionales $32.000 ($10.000 por agenda extra a partir de la 4ta). $500 por turno marketplace.'
    },
    {
        id: PLAN_IDS.COURTS_1_3,
        name: 'Canchas (1 a 3 Canchas)',
        business_type: 'sport',
        category_label: '1 a 3 Canchas',
        monthly_price_per_unit: 20000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        description: '$20.000 por cancha. Turnos ilimitados, $0 comisión directa, $500 por turno marketplace.'
    },
    {
        id: PLAN_IDS.COURTS_4_5,
        name: 'Canchas (4 a 5 Canchas)',
        business_type: 'sport',
        category_label: '4 a 5 Canchas',
        monthly_price_per_unit: 17000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        description: '$17.000 por cancha (tarifa plana por volumen). $500 por turno marketplace.'
    },
    {
        id: PLAN_IDS.COURTS_6_PLUS,
        name: 'Canchas (Más de 5 Canchas)',
        business_type: 'sport',
        category_label: 'Más de 5 Canchas',
        monthly_price_per_unit: 15000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        description: '$15.000 por cancha (máxima escala). $500 por turno marketplace.'
    },
    {
        id: PLAN_IDS.RENTAL,
        name: 'Alquileres (Quinchos / Salones)',
        business_type: 'rental',
        category_label: 'Quinchos y Espacios',
        monthly_price: 15000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: null,
        marketplace_commission_percent: 0.03,
        description: '$15.000 / mes fijo. Todo incluido para espacios y quinchos. 3% de comisión por reserva desde TurnitosLR.'
    }
];

/**
 * Monthly subscription price by business type and number of agendas/courts.
 * Must match public.calculate_subscription_price() in the database.
 *   Services: 1 → $17.000 · 2 → $25.000 · 3 → $32.000 · +$10.000 per extra after the 3rd
 *   Sports:   1-3 courts → $20.000 c/u · 4-5 → $17.000 c/u · 6+ → $15.000 c/u
 *   Rentals:  $15.000
 */
export function calculateSubscriptionPrice(businessType, unitsCount = 1) {
    const type = String(businessType || '').toLowerCase();
    const count = Math.max(1, Number(unitsCount) || 1);

    if (type === 'sport' || type === 'courts') {
        if (count <= 3) return count * 20000;
        if (count <= 5) return count * 17000;
        return count * 15000;
    }
    if (type === 'venue' || type === 'rental' || type === 'alquiler') {
        return 15000;
    }
    if (count === 1) return 17000;
    if (count === 2) return 25000;
    return 32000 + (count - 3) * 10000;
}

/**
 * Resolves full plan definition from id, name or fallback
 */
export function getPlanDetails(planIdOrName, businessType = null, unitsCount = 1) {
    const found = PLANS_CATALOG.find(p => p.id === planIdOrName || p.name.toLowerCase() === String(planIdOrName).toLowerCase());
    if (found) return found;

    // Fallbacks by business type
    if (businessType === 'venue' || businessType === 'rental') {
        return PLANS_CATALOG.find(p => p.id === PLAN_IDS.RENTAL);
    }
    if (businessType === 'sport') {
        const count = Number(unitsCount) || 1;
        if (count >= 6) return PLANS_CATALOG.find(p => p.id === PLAN_IDS.COURTS_6_PLUS);
        if (count >= 4) return PLANS_CATALOG.find(p => p.id === PLAN_IDS.COURTS_4_5);
        return PLANS_CATALOG.find(p => p.id === PLAN_IDS.COURTS_1_3);
    }
    if (businessType === 'services' || businessType === 'beauty' || businessType === 'health') {
        const count = Number(unitsCount) || 1;
        if (count > 1) return PLANS_CATALOG.find(p => p.id === PLAN_IDS.SERVICES_TEAM);
        return PLANS_CATALOG.find(p => p.id === PLAN_IDS.SERVICES_INDIVIDUAL);
    }

    return PLANS_CATALOG.find(p => p.id === PLAN_IDS.SERVICES_INDIVIDUAL);
}

/**
 * Calculates monthly subscription fee based on plan and capacity
 */
export function calculateMonthlyFee(planIdOrName, unitsCount = 1, businessType = null) {
    const count = Math.max(1, Number(unitsCount) || 1);
    const plan = getPlanDetails(planIdOrName, businessType, count);
    const type = plan?.business_type === 'services' ? 'service' : (plan?.business_type || businessType);
    return calculateSubscriptionPrice(type, count);
}

/**
 * Calculates commission for a booking
 */
export function calculateBookingCommission({ planId, price = 0, isMarketplace = false, businessType = null }) {
    if (isMarketplace) {
        const type = String(businessType || '').toLowerCase();
        const pId = String(planId || '').toLowerCase();
        const isRental = pId === PLAN_IDS.RENTAL || 
            pId.includes('rental') || 
            pId.includes('alquiler') || 
            type === 'rental' || 
            type === 'venue' || 
            type === 'alquiler' ||
            type.includes('quincho') ||
            type.includes('salon');

        if (isRental) {
            return Math.round(Number(price || 0) * 0.03);
        }
        return 500;
    }
    return 0;
}
