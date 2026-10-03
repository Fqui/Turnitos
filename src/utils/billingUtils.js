/**
 * Billing status of a business, shared by the SuperAdmin, seller panel and business portal.
 *
 * Source of truth: businesses.subscription_status (trial / active / inactive).
 * "Overdue" is derived: due date + GRACE_DAYS passed without a registered payment.
 *   - trial  → due date is trial_end_date
 *   - active → due date is subscriptions.next_billing_date
 */
export const GRACE_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(value) {
    if (!value) return null;
    const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

export const BILLING_STATUS = {
    trial: { label: 'En prueba', tone: 'info' },
    active: { label: 'Al día', tone: 'success' },
    due_soon: { label: 'Vence pronto', tone: 'warning' },
    grace: { label: 'Pago atrasado', tone: 'warning' },
    overdue: { label: 'Vencido', tone: 'danger' },
    trial_expired: { label: 'Prueba vencida', tone: 'danger' },
    paused: { label: 'Pausado', tone: 'neutral' }
};

/**
 * @returns {{ status: string, label: string, tone: string, dueDate: Date|null, daysToDue: number|null, monthlyPrice: number }}
 */
export function getBillingInfo(business, subscription, today = new Date()) {
    const now = startOfDay(today);
    const monthlyPrice = Number(subscription?.monthly_price || 0);
    const rawStatus = business?.subscription_status || 'trial';

    if (rawStatus === 'inactive' || rawStatus === 'paused') {
        return { status: 'paused', ...BILLING_STATUS.paused, dueDate: null, daysToDue: null, monthlyPrice };
    }

    const isTrial = rawStatus === 'trial';
    const dueDate = startOfDay(isTrial ? business?.trial_end_date : subscription?.next_billing_date);
    const daysToDue = dueDate ? Math.round((dueDate - now) / DAY_MS) : null;

    let status = isTrial ? 'trial' : 'active';
    if (daysToDue !== null) {
        if (daysToDue < -GRACE_DAYS) status = isTrial ? 'trial_expired' : 'overdue';
        else if (daysToDue < 0) status = isTrial ? 'trial' : 'grace';
        else if (daysToDue <= 3) status = isTrial ? 'trial' : 'due_soon';
    }

    return { status, ...BILLING_STATUS[status], dueDate, daysToDue, monthlyPrice };
}

export function formatMoney(value) {
    return `$${Math.round(Number(value) || 0).toLocaleString('es-AR')}`;
}

export function formatDueText(info) {
    if (!info?.dueDate || info.daysToDue === null) return 'Sin vencimiento';
    const date = info.dueDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    if (info.daysToDue === 0) return `Vence hoy (${date})`;
    if (info.daysToDue > 0) return `Vence en ${info.daysToDue} día${info.daysToDue === 1 ? '' : 's'} (${date})`;
    const late = -info.daysToDue;
    return `Venció hace ${late} día${late === 1 ? '' : 's'} (${date})`;
}
