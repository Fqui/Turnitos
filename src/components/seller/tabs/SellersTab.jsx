import React from 'react';

export default function SellersTab({
    sellers = [],
    onToggleStatus,
    onViewDetails,
    settledSellers = {},
    onToggleSettlement
}) {
    return (
        <div style={{
            background: 'linear-gradient(145deg, var(--sa-surface), var(--sa-surface))',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--sa-border)',
            boxShadow: '0 4px 25px rgba(0, 0, 0, 0.3)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sa-text)' }}>
                    <span>👥</span> Red de Vendedores ({sellers.length})
                </h3>
            </div>

            {sellers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--sa-text-muted)', fontSize: '13px' }}>
                    No hay vendedores registrados en la plataforma.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sellers.map((seller) => {
                        const isSettled = settledSellers[seller.id];

                        return (
                            <div
                                key={seller.id}
                                onClick={() => onViewDetails(seller.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px 18px',
                                    background: 'var(--sa-surface)',
                                    borderRadius: '12px',
                                    border: `1px solid ${seller.is_active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    background: seller.is_active
                                        ? 'linear-gradient(135deg, var(--sa-primary), var(--sa-primary))'
                                        : 'linear-gradient(135deg, var(--sa-text-muted), var(--sa-border-strong))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    color: '#fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                }}>
                                    {seller.first_name?.[0] || 'V'}{seller.last_name?.[0] || ''}
                                </div>

                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--sa-text)' }}>
                                        {seller.first_name} {seller.last_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--sa-text-muted)', marginBottom: '8px' }}>
                                        {seller.email} {seller.phone ? `• ${seller.phone}` : ''}
                                    </div>
                                    <div style={{ fontSize: '11px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', color: '#a5b4fc', fontWeight: '700' }}>
                                            🏢 {seller.stats?.totalBusinesses || 0} negocios
                                        </span>
                                        <span style={{ padding: '3px 8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', color: '#fde047', fontWeight: '700' }}>
                                            💰 ${(seller.stats?.monthlyCommissions || 0).toLocaleString('es-AR')}
                                        </span>
                                        <span style={{ padding: '3px 8px', background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '6px', color: '#fbcfe8', fontWeight: '700' }}>
                                            📈 {seller.stats?.conversionRate || 0}% conversión
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {/* Settlement Toggle */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleSettlement(seller.id);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: isSettled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            border: `1px solid ${isSettled ? '#10b981' : '#f59e0b'}`,
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            color: isSettled ? 'var(--sa-primary-text)' : 'var(--sa-warning)',
                                            cursor: 'pointer'
                                        }}
                                        title={isSettled ? 'Comisiones pagadas al vendedor' : 'Comisiones pendientes de pago'}
                                    >
                                        {isSettled ? '✓ Liquidado' : '💵 Pendiente'}
                                    </button>

                                    {/* Status Badge */}
                                    <div style={{
                                        padding: '5px 10px',
                                        background: seller.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: seller.is_active ? 'var(--sa-primary-text)' : 'var(--sa-danger)',
                                        border: `1px solid ${seller.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}>
                                        {seller.is_active ? '✓ Activo' : '✗ Inactivo'}
                                    </div>

                                    {/* Toggle Active Status */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleStatus(seller.id, seller.is_active);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--sa-surface-2)',
                                            border: '1px solid var(--sa-border-strong)',
                                            borderRadius: '8px',
                                            color: 'var(--sa-text)',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            fontSize: '11px'
                                        }}
                                    >
                                        {seller.is_active ? 'Desactivar' : 'Activar'}
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
