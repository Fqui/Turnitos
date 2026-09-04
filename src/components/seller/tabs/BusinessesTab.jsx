import React, { useState, useMemo } from 'react';

export default function BusinessesTab({
    businesses = [],
    onDelete,
    onEdit,
    onCreate,
    onExportCSV,
    filter = 'all',
    setFilter,
    onResetPassword,
    onUpdateSubscriptionStatus
}) {
    const [search, setSearch] = useState('');
    const [quickStatusLoading, setQuickStatusLoading] = useState(null);

    const activeCount = businesses.filter(b => b.subscription_status === 'active').length;
    const attentionCount = businesses.filter(b => b.subscription_status === 'trial' || b.subscription_status === 'inactive').length;

    // Filter and search
    const filteredBusinesses = useMemo(() => {
        return businesses.filter(b => {
            const matchesFilter = filter === 'all'
                ? true
                : filter === 'active'
                    ? b.subscription_status === 'active'
                    : b.subscription_status === 'trial' || b.subscription_status === 'inactive';

            const query = search.toLowerCase();
            const matchesSearch = !query ||
                (b.name || '').toLowerCase().includes(query) ||
                (b.location || '').toLowerCase().includes(query) ||
                (b.email || '').toLowerCase().includes(query) ||
                (b.categories?.name || '').toLowerCase().includes(query);

            return matchesFilter && matchesSearch;
        });
    }, [businesses, filter, search]);

    // Handle "Login As" / Impersonation
    const handleLoginAs = (business) => {
        try {
            // Store business session format in localStorage
            localStorage.setItem('business', JSON.stringify(business));
            localStorage.setItem('turnitos_business_email', business.email || '');
            // Open portal in new tab
            window.open('/portal', '_blank');
        } catch (e) {
            console.error('Error in Login As:', e);
            alert('No se pudo abrir la sesión del negocio');
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
            background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.85))',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
                    <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏢</span> Directorio de Negocios ({businesses.length})
                    </h3>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '3px', borderRadius: '10px', border: '1px solid #334155' }}>
                        <button
                            onClick={() => setFilter && setFilter('all')}
                            style={{
                                padding: '5px 12px',
                                background: filter === 'all' ? '#2563eb' : 'transparent',
                                color: filter === 'all' ? '#fff' : '#94a3b8',
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
                                color: filter === 'active' ? '#fff' : '#94a3b8',
                                border: 'none',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ✓ Activos ({activeCount})
                        </button>
                        <button
                            onClick={() => setFilter && setFilter('attention')}
                            style={{
                                padding: '5px 12px',
                                background: filter === 'attention' ? '#f59e0b' : 'transparent',
                                color: filter === 'attention' ? '#000' : '#fbbf24',
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
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            color: '#f8fafc',
                            fontSize: '12px',
                            outline: 'none',
                            minWidth: '200px'
                        }}
                    />

                    <button
                        onClick={onExportCSV}
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '7px 12px',
                            color: '#cbd5e1',
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
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
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
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '14px' }}>
                    No se encontraron negocios con los filtros aplicados.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredBusinesses.map((biz) => {
                        const statusColor = biz.subscription_status === 'active'
                            ? '#10b981'
                            : biz.subscription_status === 'trial'
                                ? '#f59e0b'
                                : '#ef4444';

                        const statusText = biz.subscription_status === 'active'
                            ? 'Activo'
                            : biz.subscription_status === 'trial'
                                ? 'En Prueba'
                                : 'Inactivo';

                        return (
                            <div
                                key={biz.id}
                                style={{
                                    background: '#0f172a',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
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
                                            background: '#1e293b',
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
                                            <span style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>
                                                {biz.name}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                background: `${statusColor}18`,
                                                color: statusColor,
                                                fontWeight: '800',
                                                border: `1px solid ${statusColor}40`
                                            }}>
                                                {statusText}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Plan/Estado:</span>
                                    <select
                                        value={biz.subscription_status || 'trial'}
                                        disabled={quickStatusLoading === biz.id}
                                        onChange={(e) => handleQuickStatus(biz.id, e.target.value)}
                                        style={{
                                            background: '#1e293b',
                                            color: '#f8fafc',
                                            border: '1px solid #334155',
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
                                    {/* Login As / Ver Portal Button */}
                                    <button
                                        onClick={() => handleLoginAs(biz)}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: '8px',
                                            color: '#34d399',
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
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            color: '#60a5fa',
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
                                            color: '#fbbf24',
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
                                            color: '#f87171',
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
