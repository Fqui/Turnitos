import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { getBillingInfo, formatDueText, formatMoney } from '../../../utils/billingUtils';

const TONES = {
    danger: { bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.35)', color: 'var(--status-cancelled, #dc2626)' },
    warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.35)', color: 'var(--status-pending, #b45309)' },
    info: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', color: '#2563eb' }
};

/**
 * Payment reminder for the business owner. Only informs: the business keeps working
 * while overdue (the platform owner decides when to pause it).
 */
export default function PortalBillingBanner({ business, onOpenSubscription }) {
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        if (!business?.id) return;
        let cancelled = false;
        supabase
            .from('subscriptions')
            .select('monthly_price, next_billing_date, status')
            .eq('business_id', business.id)
            .maybeSingle()
            .then(({ data }) => { if (!cancelled) setSubscription(data || null); });
        return () => { cancelled = true; };
    }, [business?.id]);

    if (!business) return null;
    const info = getBillingInfo(business, subscription);

    let tone = null;
    let title = '';
    if (info.status === 'overdue') {
        tone = 'danger';
        title = 'Tenés el abono vencido';
    } else if (info.status === 'trial_expired') {
        tone = 'danger';
        title = 'Terminó tu prueba gratis';
    } else if (info.status === 'grace') {
        tone = 'warning';
        title = 'Tu abono está atrasado';
    } else if (info.status === 'due_soon') {
        tone = 'warning';
        title = 'Tu abono vence pronto';
    } else if (info.status === 'trial' && info.daysToDue !== null && info.daysToDue <= 3) {
        tone = 'info';
        title = 'Tu prueba gratis está por terminar';
    }

    if (!tone) return null;
    const colors = TONES[tone];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '10px 14px',
            marginBottom: '12px',
            borderRadius: '12px',
            background: colors.bg,
            border: `1px solid ${colors.border}`
        }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: colors.color }}>{title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {formatDueText(info)}
                    {info.monthlyPrice ? ` · Abono ${formatMoney(info.monthlyPrice)}/mes` : ''}
                </div>
            </div>
            {onOpenSubscription && (
                <button
                    type="button"
                    onClick={onOpenSubscription}
                    style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                    Ver mi suscripción
                </button>
            )}
        </div>
    );
}
