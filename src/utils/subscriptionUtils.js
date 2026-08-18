/**
 * Subscription Plans & Commission Architecture for TurnitosLR
 */

export const PLAN_IDS = {
    FREE: 'free',
    SERVICES_INDIVIDUAL: 'services_individual',
    SERVICES_TEAM: 'services_team',
    COURTS_1_3: 'courts_1_3',
    COURTS_4_5: 'courts_4_5',
    COURTS_6_PLUS: 'courts_6_plus',
    RENTAL: 'rental'
};

export const PLANS_CATALOG = [
    {
        id: PLAN_IDS.FREE,
        name: 'Plan Gratis',
        business_type: 'all',
        category_label: 'Todos los rubros',
        monthly_price: 0,
        monthly_bookings_limit: 100,
        has_subdomain: false,
        has_linkbio: false,
        has_store: false,
        direct_commission_percent: 0.05,
        marketplace_commission_percent: 0.05,
        marketplace_commission_fixed: null,
        description: 'Hasta 100 turnos/mes. 5% de comisión por turno. Solo link directo turnitoslr.com/:negocio'
    },
    {
        id: PLAN_IDS.SERVICES_INDIVIDUAL,
        name: 'Servicios - Individual',
        business_type: 'services',
        category_label: '1 Agenda / Profesional',
        monthly_price: 18000,
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
        name: 'Servicios - Equipo (Hasta 3 Agendas)',
        business_type: 'services',
        category_label: 'Hasta 3 Agendas',
        monthly_price: 36000,
        monthly_bookings_limit: null,
        has_subdomain: true,
        has_linkbio: true,
        has_store: true,
        direct_commission_fixed: 0,
        marketplace_commission_fixed: 500,
        extra_specialist_price: 10000,
        description: 'Hasta 3 profesionales ($10.000 por agenda extra a partir de la 4ta). $500 por turno marketplace.'
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
 * Checks if a plan name or id corresponds to the free plan
 */
export function isFreePlan(planIdOrName) {
    if (!planIdOrName) return false;
    const lower = String(planIdOrName).toLowerCase().trim();
    return lower === 'free' || lower === 'gratis' || lower === 'plan gratis' || lower === 'plan_gratis';
}

/**
 * Resolves full plan definition from id, name or fallback
 */
export function getPlanDetails(planIdOrName, businessType = null, unitsCount = 1) {
    if (isFreePlan(planIdOrName)) {
        return PLANS_CATALOG.find(p => p.id === PLAN_IDS.FREE);
    }

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
    if (isFreePlan(planIdOrName)) return 0;

    const count = Math.max(1, Number(unitsCount) || 1);
    const plan = getPlanDetails(planIdOrName, businessType, count);

    if (!plan) return 18000;

    if (plan.id === PLAN_IDS.COURTS_1_3) return 20000 * count;
    if (plan.id === PLAN_IDS.COURTS_4_5) return 17000 * count;
    if (plan.id === PLAN_IDS.COURTS_6_PLUS) return 15000 * count;
    if (plan.id === PLAN_IDS.RENTAL) return 15000;
    if (plan.id === PLAN_IDS.SERVICES_INDIVIDUAL) return 18000;
    if (plan.id === PLAN_IDS.SERVICES_TEAM) {
        const extraUnits = Math.max(0, count - 3);
        return 36000 + (extraUnits * 10000);
    }

    return plan.monthly_price || 18000;
}

/**
 * Calculates commission for a booking
 */
export function calculateBookingCommission({ planId, price = 0, isMarketplace = false, businessType = null }) {
    if (isFreePlan(planId)) {
        return Math.round(Number(price || 0) * 0.05);
    }
    if (isMarketplace) {
        if (planId === PLAN_IDS.RENTAL || businessType === 'rental' || businessType === 'venue') {
            return Math.round(Number(price || 0) * 0.03);
        }
        return 500;
    }
    return 0;
}
