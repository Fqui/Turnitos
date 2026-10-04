import React, { useState, useMemo } from 'react';
import { getBillingInfo, getBillingRows, needsAttention, formatDueText, formatMoney } from '../../../utils/billingUtils';
import { useNotification } from '../../../contexts/NotificationContext';

const isUpToDate = (info) => info?.status === 'active' || info?.status === 'due_soon';

export default function BusinessesTab({
    businesses = [],
    onDelete,
    onEdit,
    onCreate,
    onExportCSV,
    filter = 'all',
    setFilter,
    onResetPassword,
    onUpdateSubscriptionStatus,
    billing,
    onRegisterPayment
}) {
    const { showToast } = useNotification();
    const [search, setSearch] = useState('');
    const [quickStatusLoading, setQuickStatusLoading] = useState(null);

    // Same billing rule as the dashboard: "Activos" = up to date, "Atención" = needs follow-up
    const billingById = useMemo(() => new Map(
        getBillingRows(businesses, billing).map(r => [r.business.id, r.info])
    ), [businesses, billing]);
    const activeCount = businesses.filter(b => isUpToDate(billingById.get(b.id))).length;
    const attentionCount = businesses.filter(b => needsAttention(billingById.get(b.id))).length;

    // Filter and search
    const filteredBusinesses = useMemo(() => {
        return businesses.filter(b => {
            const info = billingById.get(b.id);
            const matchesFilter = filter === 'all'
                ? true
                : filter === 'active'
                    ? isUpToDate(info)
                    : needsAttention(info);

            const query = search.toLowerCase();
            const matchesSearch = !query ||
                (b.name || '').toLowerCase().includes(query) ||
                (b.location || '').toLowerCase().includes(query) ||
                (b.email || '').toLowerCase().includes(query) ||
                (b.categories?.name || '').toLowerCase().includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [businesses, filter, search, billingById]);

    // Handle "Login As" / Impersonation
    const handleLoginAs = (business) => {
        try {
            // Store business session format in localStorage, bypassing password change prompt for SuperAdmin
            const impersonated = { ...business, password_changed: true };
            localStorage.setItem('business', JSON.stringify(impersonated));
            localStorage.setItem('turnitos_business_email', business.email || '');
            localStorage.removeItem('turnitos_must_change_password');
            showToast(`Abriendo portal de ${business.name}...`, 'info');
            // Open portal in new tab
            window.open('/portal', '_blank');
        } catch (e) {
            console.error('Error in Login As:', e);
            showToast('No se pudo abrir la sesión del negocio', 'error');
        }
    };

    // Quick subscription status change
    const handleQuickStatus = async (businessId, newStatus) => {
        if (!onUpdateSubscriptionStatus) return;
        setQuickStatusLoading(businessId);
        try {
            await onUpdateSubscriptionStatus(businessId, newStatus);
        } finally {
            setQuickStatusLoading(null);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(145deg, var(--sa-surface), var(--sa-surface))',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--sa-border)',
            boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
        }}>
            {/* Header & Controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '14px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--sa-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏢</span> Directorio de Negocios ({businesses.length})
                    </h3>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--sa-surface)', padding: '3px', borderRadius: '10px', border: '1px solid var(--sa-border-strong)' }}>
                        <button
                            onClick={() => setFilter && setFilter('all')}
                            style={{
                                padding: '5px 12px',
                                background: filter === 'all' ? 'var(--sa-primary)' : 'transparent',
                                color: filter === 'all' ? '#fff' : 'var(--sa-text-muted)',
                                border: 'none',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Todos ({businesses.length})
                        </button>
                        <button
                            onClick={() => setFilter && setFilter('active')}
                            style={{
                                padding: '5px 12px',
                                background: filter === 'active' ? '#10b981' : 'transparent',
                                color: filter === 'active' ? '#fff' : 'var(--sa-text-muted)',
                                border: 'none',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ✓ Al día ({activeCount})
                        </button>
                        <button
                            onClick={() => setFilter && setFilter('attention')}
                            style={{
                                padding: '5px 12px',
                                background: filter === 'attention' ? '#f59e0b' : 'transparent',
                                color: filter === 'attention' ? '#000' : 'var(--sa-warning)',
                                border: 'none',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ⚠️ Atención ({attentionCount})
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Buscar negocio, ciudad..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            background: 'var(--sa-surface)',
                            border: '1px solid var(--sa-border-strong)',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            color: 'var(--sa-text)',
                            fontSize: '12px',
                            outline: 'none',
                            minWidth: '200px'
                        }}
                    />

                    <button
                        onClick={onExportCSV}
                        style={{
                            background: 'var(--sa-surface-2)',
                            border: '1px solid var(--sa-border-strong)',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            color: 'var(--sa-text-2)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>📥</span> Exportar CSV
                    </button>

                    <button
                        onClick={onCreate}
                        style={{
                            background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '7px 14px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)'
                        }}
                    >
                        <span>+</span> Nuevo Negocio
                    </button>
                </div>
            </div>

            {/* Businesses Grid / Table */}
            {filteredBusinesses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sa-text-muted)', fontSize: '14px' }}>
                    No se encontraron negocios con los filtros aplicados.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredBusinesses.map((biz) => {
                        const subscription = (billing?.subscriptions || []).find(sub => String(sub.business_id) === String(biz.id));
                        const billingInfo = getBillingInfo(biz, subscription);

                        return (
                            <div
                                key={biz.id}
                                style={{
                                    background: 'var(--sa-surface)',
                                    border: '1px solid var(--sa-border)',
                                    borderRadius: '12px',
                                    padding: '14px 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '14px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Left Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                                    {biz.logo_url || biz.image || biz.logo ? (
                                        <img
                                            src={biz.logo_url || biz.image || biz.logo}
                                            alt={biz.name}
                                            style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '10px',
                                            background: 'var(--sa-surface-2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px'
                                        }}>
                                            🏢
                                        </div>
                                    )}

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--sa-text)' }}>
                                                {biz.name}
                                            </span>
                                            <span className={`sa-badge tone-${billingInfo.tone}`}>
                                                {billingInfo.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--sa-text-muted)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <span>{formatDueText(billingInfo)}{billingInfo.monthlyPrice ? ` · ${formatMoney(billingInfo.monthlyPrice)}/mes` : ''}</span>
                                            <span>📍 {biz.location || 'Sin ubicación'}</span>
                                            <span>📁 {biz.categories?.name || biz.category || 'General'}</span>
                                            {biz.sellers && (
                                                <span>👤 {biz.sellers.first_name} {biz.sellers.last_name}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Subscription Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--sa-text-muted)' }}>Plan/Estado:</span>
                                    <select
                                        value={biz.subscription_status || 'trial'}
                                        disabled={quickStatusLoading === biz.id}
                                        onChange={(e) => handleQuickStatus(biz.id, e.target.value)}
                                        style={{
                                            background: 'var(--sa-surface-2)',
                                            color: 'var(--sa-text)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="active">Activo</option>
                                        <option value="trial">Prueba (Trial)</option>
                                        <option value="inactive">Pausado / Inactivo</option>
                                    </select>
                                </div>

                                {/* Actions Toolbar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {onRegisterPayment && (
                                        <button
                                            type="button"
                                            className="sa-btn is-primary"
                                            style={{ padding: '6px 10px', fontSize: '11px' }}
                                            onClick={() => onRegisterPayment(biz, billingInfo.monthlyPrice)}
                                            title="Registrar un pago de la suscripción"
                                        >
                                            + Pago
                                        </button>
                                    )}

                                    {/* Login As / Ver Portal Button */}
                                    <button
                                        onClick={() => handleLoginAs(biz)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-primary-text)',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        title="Abrir y operar el portal como el dueño de este negocio"
                                    >
                                        <span>👁️</span> Abrir Portal
                                    </button>

                                    {/* Edit */}
                                    <button
                                        onClick={() => onEdit(biz)}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'var(--sa-surface-2)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-primary-text)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title="Editar detalles del negocio"
                                    >
                                        ✏️ Editar
                                    </button>

                                    {/* Password Reset */}
                                    <button
                                        onClick={() => onResetPassword && onResetPassword(biz)}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-warning)',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                        title="Generar clave provisoria para WhatsApp"
                                    >
                                        🔑 Clave
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => onDelete(biz.id)}
                                        style={{
                                            padding: '6px 9px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-danger)',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                        title="Eliminar negocio"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
