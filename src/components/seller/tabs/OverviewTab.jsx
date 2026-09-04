import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, AreaChart, Area
} from 'recharts';

export function ModernMetricCard({ icon, title, value, subtitle, colorAccent = '#3b82f6' }) {
    return (
        <div
            style={{
                background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.9), rgba(15, 23, 42, 0.8))',
                borderRadius: '14px',
                padding: '18px 20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, ${colorAccent}, transparent)`
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                    {title}
                </span>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `${colorAccent}15`,
                    border: `1px solid ${colorAccent}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                }}>
                    {icon}
                </div>
            </div>

            <div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px' }}>
                    {value}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ModernChart({ title, data, type = 'commission' }) {
    const isCommission = type === 'commission';

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.9), rgba(15, 23, 42, 0.8))',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                {title}
            </h4>

            {(!data || data.length === 0) ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
                    Sin datos históricos registrados
                </div>
            ) : (
                <div style={{ height: '220px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {isCommission ? (
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(val) => [`$${Number(val).toLocaleString('es-AR')}`, 'Comisión']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#commGrad)" />
                            </AreaChart>
                        ) : (
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(val) => [val, 'Nuevos Negocios']}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export default function OverviewTab({
    analytics,
    sellers = [],
    commissionTrends = [],
    businessGrowthTrends = [],
    businesses = [],
    onNavigateToBusinesses
}) {
    const trialBusinesses = businesses.filter(b => b.subscription_status === 'trial');
    const inactiveBusinesses = businesses.filter(b => b.subscription_status === 'inactive');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Key Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px'
            }}>
                <ModernMetricCard
                    icon="🏢"
                    title="Total Negocios"
                    value={analytics?.totalBusinesses || businesses.length || 0}
                    subtitle={`${analytics?.activeBusinesses || businesses.filter(b => b.subscription_status === 'active').length} activos`}
                    colorAccent="#10b981"
                />
                <ModernMetricCard
                    icon="👥"
                    title="Red Comercial"
                    value={analytics?.totalSellers || sellers.length || 0}
                    subtitle={`${sellers.filter(s => s.status === 'active').length} vendedores activos`}
                    colorAccent="#6366f1"
                />
                <ModernMetricCard
                    icon="💰"
                    title="Comisiones Mes"
                    value={`$${(analytics?.totalCommissions || 0).toLocaleString('es-AR')}`}
                    subtitle="Acumulado periodo"
                    colorAccent="#f59e0b"
                />
                <ModernMetricCard
                    icon="📈"
                    title="Tasa de Conversión"
                    value={`${analytics?.conversionRate || 0}%`}
                    subtitle="Activos vs Registrados"
                    colorAccent="#ec4899"
                />
                <ModernMetricCard
                    icon="💵"
                    title="Ingresos Registrados"
                    value={`$${(analytics?.totalRevenue || 0).toLocaleString('es-AR')}`}
                    subtitle={`${analytics?.totalBookings || 0} reservas procesadas`}
                    colorAccent="#8b5cf6"
                />
            </div>

            {/* Churn Prevention & Attention Banner */}
            {(trialBusinesses.length > 0 || inactiveBusinesses.length > 0) && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.08))',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>
                                Alertas de Retención y Seguimiento
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                {trialBusinesses.length} negocio(s) en prueba gratuita y {inactiveBusinesses.length} inactivo(s).
                            </div>
                        </div>
                    </div>

                    {onNavigateToBusinesses && (
                        <button
                            onClick={() => onNavigateToBusinesses('attention')}
                            style={{
                                background: '#f59e0b',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Ver Negocios que Requieren Atención →
                        </button>
                    )}
                </div>
            )}

            {/* Charts Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '16px'
            }}>
                <ModernChart
                    title="📊 Evolución de Comisiones"
                    data={commissionTrends}
                    type="commission"
                />
                <ModernChart
                    title="📈 Crecimiento de Negocios"
                    data={businessGrowthTrends}
                    type="growth"
                />
            </div>
        </div>
    );
}
