import React from 'react';

export default function GlobalSearchModal({
    searchQuery,
    setSearchQuery,
    onClose,
    businesses = [],
    sellers = [],
    categories = [],
    bookingsData = null,
    onViewSellerDetails
}) {
    const cleanQuery = (searchQuery || '').trim().toLowerCase();

    const matchedBusinesses = cleanQuery
        ? businesses.filter(b => (b.name || '').toLowerCase().includes(cleanQuery) || (b.location || '').toLowerCase().includes(cleanQuery))
        : [];
    const matchedSellers = cleanQuery
        ? sellers.filter(s => (s.first_name || '').toLowerCase().includes(cleanQuery) || (s.last_name || '').toLowerCase().includes(cleanQuery) || (s.email || '').toLowerCase().includes(cleanQuery))
        : [];
    const matchedCategories = cleanQuery
        ? categories.filter(c => (c.name || '').toLowerCase().includes(cleanQuery))
        : [];
    const matchedBookings = cleanQuery
        ? (bookingsData?.recentBookings || []).filter(b => (b.customer_name || '').toLowerCase().includes(cleanQuery) || (b.business_name || '').toLowerCase().includes(cleanQuery))
        : [];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '60px 20px 20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: '#f8fafc',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔍</span> Búsqueda Global
                    </h3>
                    <kbd style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        color: '#94a3b8'
                    }}>
                        ESC para cerrar
                    </kbd>
                </div>

                <input
                    type="text"
                    autoFocus
                    placeholder="Buscar negocio, vendedor, cliente o reserva..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: '#0f172a',
                        border: '1px solid #3b82f6',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        marginBottom: '16px'
                    }}
                />

                <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {!cleanQuery && (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b', fontSize: '13px' }}>
                            Escribe una palabra para buscar en toda la plataforma...
                        </div>
                    )}

                    {cleanQuery && matchedBusinesses.length === 0 && matchedSellers.length === 0 && matchedCategories.length === 0 && matchedBookings.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', fontSize: '13px' }}>
                            No se encontraron coincidencias para "{searchQuery}".
                        </div>
                    )}

                    {matchedBusinesses.length > 0 && (
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                🏢 Negocios ({matchedBusinesses.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {matchedBusinesses.map(b => (
                                    <div key={b.id} style={{
                                        padding: '10px 12px',
                                        background: '#1e293b',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#f8fafc',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <strong>{b.name}</strong> <span style={{ color: '#94a3b8', fontSize: '11px' }}>• {b.location}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: b.subscription_status === 'active' ? '#10b98120' : '#f59e0b20',
                                            color: b.subscription_status === 'active' ? '#34d399' : '#fbbf24',
                                            fontWeight: '700'
                                        }}>
                                            {b.subscription_status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {matchedSellers.length > 0 && (
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                👥 Vendedores ({matchedSellers.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {matchedSellers.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            if (onViewSellerDetails) onViewSellerDetails(s.id);
                                            onClose();
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            background: '#1e293b',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: '#f8fafc',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span><strong>{s.first_name} {s.last_name}</strong></span>
                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{s.email}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {matchedBookings.length > 0 && (
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                🎫 Reservas Recientes ({matchedBookings.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {matchedBookings.map(bk => (
                                    <div key={bk.id} style={{
                                        padding: '10px 12px',
                                        background: '#1e293b',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#f8fafc',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span><strong>{bk.customer_name}</strong> en {bk.business_name}</span>
                                        <span style={{ color: '#34d399', fontWeight: '700' }}>${bk.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
