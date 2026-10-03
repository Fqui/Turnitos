import React, { useMemo } from 'react';
import { Wallet, CalendarClock, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { getBillingInfo, formatMoney, formatDueText } from '../../../utils/billingUtils';

const PAYING_STATUSES = new Set(['active', 'due_soon', 'grace', 'overdue']);
const ATTENTION_ORDER = { overdue: 0, trial_expired: 1, grace: 2, due_soon: 3, trial: 4 };

const METHOD_LABELS = {
    transferencia: 'Transferencia',
    efectivo: 'Efectivo',
    mercadopago: 'Mercado Pago',
    otro: 'Otro'
};

function Kpi({ icon, label, value, foot, variant }) {
    const IconComponent = icon;
    return (
        <div className={`sa-card sa-kpi${variant ? ` is-${variant}` : ''}`}>
            <div className="sa-kpi-label"><IconComponent size={15} />{label}</div>
            <div className="sa-kpi-value">{value}</div>
            {foot && <div className="sa-kpi-foot">{foot}</div>}
        </div>
    );
}

export default function OverviewTab({ businesses = [], billing, onRegisterPayment }) {
    const payments = billing?.payments || [];

    const rows = useMemo(() => {
        const subByBusiness = new Map((billing?.subscriptions || []).map(s => [String(s.business_id), s]));
        return businesses.map(b => ({
            business: b,
            info: getBillingInfo(b, subByBusiness.get(String(b.id)))
        }));
    }, [businesses, billing]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const paying = rows.filter(r => PAYING_STATUSES.has(r.info.status));
    const expectedMonthly = paying.reduce((sum, r) => sum + r.info.monthlyPrice, 0);

    const paymentsThisMonth = payments.filter(p => {
        const d = new Date(p.payment_date);
        return d >= monthStart && d <= new Date(monthEnd.getTime() + 86399999);
    });
    const collectedThisMonth = paymentsThisMonth.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const dueThisMonth = paying.filter(r => r.info.dueDate && r.info.dueDate <= monthEnd);
    const pendingThisMonth = dueThisMonth.reduce((sum, r) => sum + r.info.monthlyPrice, 0);

    const overdue = rows.filter(r => r.info.status === 'overdue' || r.info.status === 'trial_expired');
    const overdueAmount = overdue.reduce((sum, r) => sum + r.info.monthlyPrice, 0);

    const attention = rows
        .filter(r => {
            if (r.info.status in ATTENTION_ORDER && r.info.status !== 'trial') return true;
            return r.info.status === 'trial' && r.info.daysToDue !== null && r.info.daysToDue <= 7;
        })
        .sort((a, b) => (ATTENTION_ORDER[a.info.status] - ATTENTION_ORDER[b.info.status])
            || ((a.info.daysToDue ?? 0) - (b.info.daysToDue ?? 0)));

    const counts = rows.reduce((acc, r) => {
        acc[r.info.status] = (acc[r.info.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sa-kpis">
                <Kpi
                    icon={TrendingUp}
                    label="Ingreso mensual esperado"
                    value={formatMoney(expectedMonthly)}
                    foot={`${paying.length} negocio${paying.length === 1 ? '' : 's'} pagando`}
                />
                <Kpi
                    icon={Wallet}
                    label="Cobrado este mes"
                    value={formatMoney(collectedThisMonth)}
                    foot={`${paymentsThisMonth.length} pago${paymentsThisMonth.length === 1 ? '' : 's'} registrado${paymentsThisMonth.length === 1 ? '' : 's'}`}
                    variant="primary"
                />
                <Kpi
                    icon={CalendarClock}
                    label="Por cobrar este mes"
                    value={formatMoney(pendingThisMonth)}
                    foot={`${dueThisMonth.length} vencimiento${dueThisMonth.length === 1 ? '' : 's'} hasta fin de mes`}
                />
                <Kpi
                    icon={AlertTriangle}
                    label="Vencidos"
                    value={overdue.length}
                    foot={overdue.length ? `${formatMoney(overdueAmount)}/mes en riesgo` : 'Nadie atrasado'}
                    variant={overdue.length ? 'danger' : undefined}
                />
            </div>

            <div className="sa-grid-2">
                <div className="sa-card">
                    <div className="sa-card-header">
                        <div>
                            <h2 className="sa-card-title">Requieren atención</h2>
                            <p className="sa-card-sub">Vencidos, por vencer y pruebas que terminan en 7 días</p>
                        </div>
                    </div>
                    {attention.length === 0 ? (
                        <div className="sa-empty">Todo al día. No hay cobros pendientes.</div>
                    ) : (
                        <div className="sa-table-wrap">
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Negocio</th>
                                        <th>Estado</th>
                                        <th className="is-num">Abono</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {attention.map(({ business, info }) => (
                                        <tr key={business.id}>
                                            <td>
                                                <div className="is-strong">{business.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--sa-text-muted)' }}>{formatDueText(info)}</div>
                                            </td>
                                            <td><span className={`sa-badge tone-${info.tone}`}>{info.label}</span></td>
                                            <td className="is-num">{info.monthlyPrice ? formatMoney(info.monthlyPrice) : '—'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button type="button" className="sa-btn is-primary" onClick={() => onRegisterPayment(business, info.monthlyPrice)}>
                                                    <Plus size={14} /> Registrar pago
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="sa-card">
                        <div className="sa-card-header">
                            <h2 className="sa-card-title">Cartera</h2>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 18px 16px' }}>
                            <span className="sa-badge tone-success">{(counts.active || 0) + (counts.due_soon || 0)} al día</span>
                            <span className="sa-badge tone-warning">{counts.grace || 0} atrasados</span>
                            <span className="sa-badge tone-danger">{(counts.overdue || 0) + (counts.trial_expired || 0)} vencidos</span>
                            <span className="sa-badge tone-info">{counts.trial || 0} en prueba</span>
                            <span className="sa-badge tone-neutral">{counts.paused || 0} pausados</span>
                        </div>
                    </div>

                    <div className="sa-card">
                        <div className="sa-card-header">
                            <h2 className="sa-card-title">Últimos pagos</h2>
                        </div>
                        {payments.length === 0 ? (
                            <div className="sa-empty">Todavía no registraste pagos.</div>
                        ) : (
                            <div className="sa-table-wrap">
                                <table className="sa-table">
                                    <tbody>
                                        {payments.slice(0, 8).map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div className="is-strong">{p.businesses?.name || 'Negocio'}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--sa-text-muted)' }}>
                                                        {new Date(p.payment_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                        {' · '}{METHOD_LABELS[p.method] || p.method || 'Sin medio'}
                                                        {p.months_covered > 1 ? ` · ${p.months_covered} meses` : ''}
                                                    </div>
                                                </td>
                                                <td className="is-num is-strong">{formatMoney(p.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
