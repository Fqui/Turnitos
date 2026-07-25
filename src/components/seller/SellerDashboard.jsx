import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabaseService from '../../services/supabaseService';

const SellerDashboard = () => {
    const [seller, setSeller] = useState(null);
    const [stats, setStats] = useState(null);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const sellerData = JSON.parse(localStorage.getItem('seller'));
            setSeller(sellerData);

            // Load stats and businesses in parallel
            const [statsData, businessesData] = await Promise.all([
                supabaseService.getSellerStats(sellerData.id),
                supabaseService.getSellerBusinesses(sellerData.id)
            ]);

            setStats(statsData);
            setBusinesses(businessesData.slice(0, 5)); // Show only first 5
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabaseService.logout();
        localStorage.removeItem('seller');
        navigate('/admin/login');
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
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <p>Cargando dashboard...</p>
                </div>
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
                    <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0 }}>
                        Hola, <span style={{ color: 'var(--primary-paddle)' }}>{seller?.first_name}</span>
                    </h1>
                    <p style={{ opacity: 0.6, marginTop: '4px' }}>
                        Bienvenido a tu panel de vendedor
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
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
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '12px 24px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <StatCard
                    icon="🏢"
                    title="Total Negocios"
                    value={stats?.totalBusinesses || 0}
                    subtitle={`${stats?.activeBusinesses || 0} activos, ${stats?.trialBusinesses || 0} en prueba`}
                />
                <StatCard
                    icon="📈"
                    title="Tasa de Conversión"
                    value={`${stats?.conversionRate || 0}%`}
                    subtitle="Negocios que pagaron"
                />
                <StatCard
                    icon="💰"
                    title="Comisiones del Mes"
                    value={`$${stats?.monthlyCommissions?.toLocaleString() || 0}`}
                    subtitle="Acumulado hasta hoy"
                    highlight
                />
                <StatCard
                    icon="📊"
                    title="Proyección Mensual"
                    value={`$${stats?.projection?.projectedTotal || 0}`}
                    subtitle={`Promedio diario: $${stats?.projection?.dailyAverage || 0}`}
                />
            </div>

            {/* Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <QuickActionCard
                    icon="📋"
                    title="Mis Negocios"
                    onClick={() => navigate('/admin/businesses')}
                />
                <QuickActionCard
                    icon="💵"
                    title="Comisiones"
                    onClick={() => navigate('/admin/commissions')}
                />
                <QuickActionCard
                    icon="➕"
                    title="Nuevo Negocio"
                    onClick={() => navigate('/admin/businesses/new')}
                />
            </div>

            {/* Recent Businesses */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        Negocios Recientes
                    </h2>
                    <button
                        onClick={() => navigate('/admin/businesses')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary-paddle)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}
                    >
                        Ver todos →
                    </button>
                </div>

                {businesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <p>No has creado negocios aún</p>
                        <button
                            onClick={() => navigate('/admin/businesses/new')}
                            style={{
                                marginTop: '16px',
                                padding: '12px 24px',
                                background: 'var(--primary-paddle)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Crear tu primer negocio
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {businesses.map((business) => (
                            <BusinessRow key={business.id} business={business} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ icon, title, value, subtitle, highlight }) => (
    <motion.div
        whileHover={{ y: -4 }}
        style={{
            background: highlight ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${highlight ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '16px',
            padding: '24px',
            cursor: 'default'
        }}
    >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
        <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>{title}</div>
        <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            color: highlight ? 'var(--primary-paddle)' : 'white'
        }}>
            {value}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.5 }}>{subtitle}</div>
    </motion.div>
);

const QuickActionCard = ({ icon, title, onClick }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s'
        }}
    >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>{title}</div>
    </motion.div>
);

const BusinessRow = ({ business }) => {
    const navigate = useNavigate();

    const getStatusBadge = (status) => {
        const styles = {
            trial: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'Prueba' },
            active: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', text: 'Activo' },
            inactive: { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', text: 'Inactivo' }
        };
        const style = styles[status] || styles.inactive;

        return (
            <span style={{
                padding: '4px 12px',
                background: style.bg,
                color: style.color,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600'
            }}>
                {style.text}
            </span>
        );
    };

    return (
        <div
            onClick={() => navigate(`/admin/businesses/${business.id}/edit`)}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ fontSize: '32px' }}>{business.categories?.icon || '🏢'}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{business.name}</div>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>
                        {business.categories?.name} • {business.totalBookings} reservas
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {getStatusBadge(business.subscription_status)}
                <div style={{ fontSize: '20px', opacity: 0.5 }}>→</div>
            </div>
        </div>
    );
};

export default SellerDashboard;
