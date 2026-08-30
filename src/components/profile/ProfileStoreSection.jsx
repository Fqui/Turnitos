import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubdomain } from '../../utils/utils';

export default function ProfileStoreSection({
    business,
    primaryColor
}) {
    const navigate = useNavigate();

    if (!business?.store_enabled) return null;

    const storeProducts = (business.metadata?.store_products && business.metadata.store_products.length > 0)
        ? business.metadata.store_products.filter(p => p.is_active !== false)
        : [];

    if (storeProducts.length === 0) return null;

    return (
        <section style={{
            marginBottom: '30px',
            padding: '20px',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                        🛍️ Tienda {business.name}
                    </h3>
                </div>
                <button
                    onClick={() => {
                        const subdomain = getSubdomain();
                        navigate(subdomain ? '/tienda' : `/${business.slug}/tienda`);
                    }}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    Ver Tienda ➔
                </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                {storeProducts.map((prod, idx) => (
                    <div
                        key={prod.id || idx}
                        onClick={() => {
                            const subdomain = getSubdomain();
                            navigate(subdomain ? '/tienda' : `/${business.slug}/tienda`);
                        }}
                        style={{
                            flexShrink: 0,
                            width: '130px',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'transform 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
                            <img src={prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80'} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h4 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{prod.name}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: primaryColor }}>${Number(prod.price).toLocaleString('es-AR')}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>➔</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
