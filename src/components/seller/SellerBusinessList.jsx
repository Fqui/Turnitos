import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';

const SellerBusinessList = () => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, trial, active, inactive
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            const data = await supabaseService.getSellerBusinesses(sellerData.id);
            setBusinesses(data);
        } catch (error) {
            console.error('Error loading businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBusinesses = businesses.filter(business => {
        const matchesFilter = filter === 'all' || business.subscription_status === filter;
        const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status) => {
        const styles = {
            trial: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'Prueba' },
            active: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', text: 'Activo' },
            inactive: { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', text: 'Inactivo' }
        };
        const style = styles[status] || styles.inactive;

        return (
            <span style={{
                padding: '6px 12px',
                background: style.bg,
                color: style.color,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600'
            }}>
                {style.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f0f0f',
                color: 'white'
            }}>
                <p>Cargando negocios...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f0f0f',
            color: 'white',
            padding: '24px'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary-paddle)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            marginBottom: '8px'
                        }}
                    >
                        ← Volver al Dashboard
                    </button>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>
                        Mis Negocios
                    </h1>
                    <p style={{ opacity: 0.6, marginTop: '4px' }}>
                        {filteredBusinesses.length} negocio{filteredBusinesses.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/businesses/new')}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--primary-paddle)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)'
                    }}
                >
                    + Crear Negocio
                </button>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '250px',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'trial', 'active', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            style={{
                                padding: '12px 20px',
                                background: filter === status ? 'var(--primary-paddle)' : 'rgba(255,255,255,0.05)',
                                color: filter === status ? '#000' : 'white',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {status === 'all' ? 'Todos' : status === 'trial' ? 'Prueba' : status === 'active' ? 'Activos' : 'Inactivos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Business List */}
            {filteredBusinesses.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No se encontraron negocios</h3>
                    <p style={{ opacity: 0.6, marginBottom: '24px' }}>
                        {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer negocio para comenzar'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => navigate('/admin/businesses/new')}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--primary-paddle)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Crear Negocio
                        </button>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: '16px'
                }}>
                    {filteredBusinesses.map((business) => (
                        <motion.div
                            key={business.id}
                            whileHover={{ y: -2 }}
                            onClick={() => navigate(`/admin/businesses/${business.id}/edit`)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '20px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                <div style={{ fontSize: '48px' }}>{business.categories?.icon || '🏢'}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '6px' }}>
                                        {business.name}
                                    </div>
                                    <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>
                                        {business.categories?.name} • {business.location}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.5 }}>
                                        {business.totalBookings} reservas • Mes {business.subscriptionMonth || 0} de suscripción
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                {getStatusBadge(business.subscription_status)}
                                <div style={{ fontSize: '24px', opacity: 0.5 }}>→</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SellerBusinessList;
