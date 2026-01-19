import React from 'react';

const SellerDetailModal = ({ seller, onClose }) => {
    if (!seller) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return `$${parseFloat(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '24px'
        }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '24px',
                    padding: '32px',
                    maxWidth: '900px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '20px',
                        background: seller.seller.is_active
                            ? 'linear-gradient(135deg, var(--primary-paddle), #059669)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: '900',
                        color: '#000'
                    }}>
                        {seller.seller.first_name[0]}{seller.seller.last_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: 0, marginBottom: '4px' }}>
                            {seller.seller.first_name} {seller.seller.last_name}
                        </h2>
                        <div style={{ fontSize: '15px', opacity: 0.7 }}>
                            {seller.seller.email}
                        </div>
                    </div>
                    <div style={{
                        padding: '12px 24px',
                        background: seller.seller.is_active ? 'rgba(0, 230, 118, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: seller.seller.is_active ? 'var(--primary-paddle)' : '#ef4444'
                    }}>
                        {seller.seller.is_active ? '✓ Activo' : '✗ Inactivo'}
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    <StatCard
                        icon="🏢"
                        label="Total Negocios"
                        value={seller.totalBusinesses}
                        gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                    />
                    <StatCard
                        icon="✓"
                        label="Activos"
                        value={seller.activeBusinesses}
                        gradient="linear-gradient(135deg, #10b981, #059669)"
                    />
                    <StatCard
                        icon="⏱"
                        label="En Prueba"
                        value={seller.trialBusinesses}
                        gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
                    />
                    <StatCard
                        icon="💰"
                        label="Comisiones Totales"
                        value={formatCurrency(seller.lifetimeCommissions)}
                        gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                    />
                    <StatCard
                        icon="📈"
                        label="Tasa Conversión"
                        value={`${seller.stats?.conversionRate || 0}%`}
                        gradient="linear-gradient(135deg, #ec4899, #db2777)"
                    />
                </div>

                {/* Recent Businesses */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏢</span> Negocios Recientes
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {seller.recentBusinesses && seller.recentBusinesses.length > 0 ? (
                            seller.recentBusinesses.map(business => (
                                <div key={business.id} style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', marginBottom: '4px' }}>{business.name}</div>
                                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                            📍 {business.location} • Creado {formatDate(business.created_at)}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '6px 12px',
                                        background: business.subscription_status === 'active' ? 'rgba(0, 230, 118, 0.1)' :
                                            business.subscription_status === 'trial' ? 'rgba(59, 130, 246, 0.1)' :
                                                'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: business.subscription_status === 'active' ? 'var(--primary-paddle)' :
                                            business.subscription_status === 'trial' ? '#60a5fa' :
                                                '#ef4444'
                                    }}>
                                        {business.subscription_status === 'active' ? 'Activo' :
                                            business.subscription_status === 'trial' ? 'Prueba' :
                                                'Inactivo'}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No hay negocios registrados
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Commissions */}
                <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💰</span> Comisiones Recientes
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {seller.recentCommissions && seller.recentCommissions.length > 0 ? (
                            seller.recentCommissions.map((commission, idx) => (
                                <div key={idx} style={{
                                    padding: '12px 16px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                        {formatDate(commission.created_at)}
                                    </div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        {formatCurrency(commission.commission_amount)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No hay comisiones registradas
                            </div>
                        )}
                    </div>
                </div>

                {/* Close Button */}
                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '14px 32px',
                            background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, gradient }) => (
    <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: gradient,
            borderRadius: '50%',
            opacity: 0.1,
            filter: 'blur(30px)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                {label}
            </div>
            <div style={{
                fontSize: '24px',
                fontWeight: '900',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {value}
            </div>
        </div>
    </div>
);

export default SellerDetailModal;
