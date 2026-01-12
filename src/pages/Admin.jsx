import React, { useState, useEffect } from 'react';
import { categories } from '../data/mockData';
import BusinessFormSelector from '../components/business-forms/BusinessFormSelector';
import CategoryForm from '../components/CategoryForm';
import PromotionForm from '../components/PromotionForm';
import CategoryManager from '../components/admin/CategoryManager';
import SubcategoryManager from '../components/admin/SubcategoryManager';
import supabaseService from '../services/supabaseService';
import analyticsService from '../services/analyticsService';
import MetricsCard from '../components/analytics/MetricsCard';
import BusinessLeaderboard from '../components/analytics/BusinessLeaderboard';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('businesses');
    const [editingItem, setEditingItem] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data states
    const [businessList, setBusinessList] = useState([]);
    const [categoryList, setCategoryList] = useState(categories);
    const [promotionList, setPromotionList] = useState([]);
    const [bookingList, setBookingList] = useState([]);

    // Analytics states
    const [adminMetrics, setAdminMetrics] = useState(null);
    const [businessComparison, setBusinessComparison] = useState([]);

    // Category management states
    const [showSubcategoryManager, setShowSubcategoryManager] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [businesses, promotions, bookings] = await Promise.all([
                supabaseService.getBusinesses(),
                supabaseService.getPromotions(),
                supabaseService.getBookings(null, null)
            ]);
            console.log('Fetched bookings:', bookings);
            setBusinessList(businesses || []);
            setPromotionList(promotions || []);
            setBookingList(bookings?.bookings || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const [metrics, comparison] = await Promise.all([
                analyticsService.getAdminMetrics(),
                analyticsService.getBusinessComparison()
            ]);
            setAdminMetrics(metrics);
            setBusinessComparison(comparison);
        } catch (error) {
            console.error('Error fetching admin analytics:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab]);

    const tabs = [
        { id: 'businesses', name: 'Negocios', icon: '🏢', count: businessList.length },
        { id: 'categories', name: 'Categorías', icon: '📂', count: categoryList.length },
        { id: 'promotions', name: 'Promociones', icon: '🔥', count: promotionList.length },
        { id: 'bookings', name: 'Reservas', icon: '📅', count: bookingList.length },
        { id: 'analytics', name: 'Analytics', icon: '📊', count: null }
    ];

    const handleSeedData = async () => {
        if (!confirm('¿Estás seguro de poblar la base de datos? Esto podría duplicar datos si ya existen.')) return;

        setSeeding(true);
        try {
            // Seed businesses (from mockData import - temporary re-import for seeding)
            const { businesses: mockBusinesses, promotions: mockPromotions } = await import('../data/mockData');

            let count = 0;
            for (const business of mockBusinesses) {
                console.log('Seeding business:', business.name);
                await supabaseService.createBusiness(business);
                count++;
            }

            // Seed promotions
            for (const promo of mockPromotions) {
                console.log('Seeding promotion:', promo.title);
                await supabaseService.createPromotion({
                    title: promo.title,
                    description: promo.description || '',
                    image: promo.image,
                    discount: promo.discount,
                    business_id: promo.businessId,
                    valid_until: new Date(Date.now() + 86400000 * 30) // 30 days from now
                });
            }

            alert(`Se han migrado ${count} negocios y promociones exitosamente a Supabase!`);
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error seeding data:', error);
            alert('Error al poblar datos. Revisa la consola.');
        } finally {
            setSeeding(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este elemento?')) return;

        try {
            if (activeTab === 'businesses') {
                // Not implemented in service yet for delete business, but let's assume UI update for now
                // await supabaseService.deleteBusiness(id); 
                setBusinessList(businessList.filter(b => b.id !== id));
            } else if (activeTab === 'categories') {
                setCategoryList(categoryList.filter(c => c.id !== id));
            } else if (activeTab === 'promotions') {
                await supabaseService.deletePromotion(id);
                setPromotionList(promotionList.filter(p => p.id !== id));
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Error al eliminar el elemento.");
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleNew = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    const handleSave = async (item) => {
        try {
            if (activeTab === 'businesses') {
                // Use updateBusiness for existing businesses, createBusiness for new ones
                if (item.id && editingItem) {
                    await supabaseService.updateBusiness(item.id, item);
                } else {
                    await supabaseService.createBusiness(item);
                }
            } else if (activeTab === 'categories') {
                // Local only for now
                if (editingItem) {
                    setCategoryList(categoryList.map(c => c.id === item.id ? item : c));
                } else {
                    setCategoryList([...categoryList, item]);
                }
            } else if (activeTab === 'promotions') {
                if (item.id && editingItem) {
                    // Ensure we don't send empty image string - keep original if no new image uploaded
                    const updateData = { ...item };
                    if (!updateData.image || updateData.image === '') {
                        updateData.image = editingItem.image;
                    }

                    // Remove joined properties that aren't columns in the promotions table
                    // Only keep the actual columns: title, business_id, discount, image, description, valid_until
                    const { businesses, business, created_at, ...cleanData } = updateData;

                    await supabaseService.updatePromotion(item.id, cleanData);
                } else {
                    await supabaseService.createPromotion(item);
                }
            }

            fetchData(); // Refresh all data
            setShowForm(false);
            setEditingItem(null);
        } catch (error) {
            console.error("Error saving item:", error);
            console.error("Error details:", error.message, error);
            alert("Error al guardar los cambios: " + (error.message || "Error desconocido"));
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                padding: '20px 0'
            }}>
                <div className="container" style={{ padding: '0 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                Panel de Administración
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                                Gestiona tu marketplace
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleSeedData}
                                disabled={seeding}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    backgroundColor: seeding ? '#ccc' : '#2196F3',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: seeding ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {seeding ? 'Migrando...' : '🔄 Migrar a Supabase'}
                            </button>
                            <a
                                href="/"
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--primary-paddle)',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                ← Volver al sitio
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ padding: '40px 20px' }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '32px',
                    borderBottom: '2px solid var(--border)',
                    paddingBottom: '0'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setShowForm(false);
                                setEditingItem(null);
                            }}
                            style={{
                                padding: '16px 24px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                borderBottom: activeTab === tab.id ? '3px solid var(--primary-paddle)' : '3px solid transparent',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '-2px'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
                            <span>{tab.name}</span>
                            <span style={{
                                backgroundColor: activeTab === tab.id ? 'var(--primary-paddle)' : 'var(--bg-main)',
                                color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '700'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Action Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        {activeTab === 'businesses' && 'Gestionar Negocios'}
                        {activeTab === 'categories' && 'Gestionar Categorías'}
                        {activeTab === 'promotions' && 'Gestionar Promociones'}
                        {activeTab === 'bookings' && 'Gestionar Reservas'}
                        {activeTab === 'analytics' && 'Analytics de Plataforma'}
                    </h2>
                    {activeTab !== 'analytics' && (
                        <button
                            onClick={handleNew}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--primary-paddle)',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(0,230,118,0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,230,118,0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,230,118,0.3)';
                            }}
                        >
                            + Crear Nuevo
                        </button>
                    )}
                </div>

                {/* Content */}
                {!showForm ? (
                    <div>
                        {/* Businesses List */}
                        {activeTab === 'businesses' && (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {businessList.map(business => (
                                    <div key={business.id} style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        gap: '20px',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        <img
                                            src={business.image}
                                            alt={business.name}
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                borderRadius: '12px',
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                                                {business.name}
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                                                📍 {business.location} • ⭐ {business.rating}
                                            </p>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    backgroundColor: 'var(--primary-paddle)20',
                                                    color: 'var(--primary-paddle)',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    {business.category}
                                                </span>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    backgroundColor: 'var(--bg-main)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    {business.type === 'sport' ? 'Deporte' : 'Servicio'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleEdit(business)}
                                                style={{
                                                    padding: '10px 20px',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg-card)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(business.id)}
                                                style={{
                                                    padding: '10px 20px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #FF4444',
                                                    backgroundColor: '#FF444410',
                                                    color: '#FF4444',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    fontSize: '14px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#FF4444';
                                                    e.currentTarget.style.color = '#fff';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#FF444410';
                                                    e.currentTarget.style.color = '#FF4444';
                                                }}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Categories Management */}
                        {activeTab === 'categories' && (
                            showSubcategoryManager && selectedCategory ? (
                                <SubcategoryManager
                                    categoryId={selectedCategory.id}
                                    categoryName={selectedCategory.name}
                                    onClose={() => {
                                        setShowSubcategoryManager(false);
                                        setSelectedCategory(null);
                                    }}
                                />
                            ) : (
                                <CategoryManager
                                    onManageSubcategories={(category) => {
                                        setSelectedCategory(category);
                                        setShowSubcategoryManager(true);
                                    }}
                                />
                            )
                        )}

                        {/* Promotions List */}
                        {activeTab === 'promotions' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {promotionList.map(promo => (
                                    <div key={promo.id} style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ position: 'relative', height: '160px' }}>
                                            <img src={promo.image} alt={promo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                background: '#FF4081',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                padding: '6px 12px',
                                                borderRadius: '8px'
                                            }}>
                                                {promo.discount}
                                            </div>
                                        </div>
                                        <div style={{ padding: '16px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                {promo.title}
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                                                {promo.business}
                                            </p>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleEdit(promo)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '10px',
                                                        border: '1px solid var(--border)',
                                                        backgroundColor: 'var(--bg-card)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(promo.id)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '10px',
                                                        border: '1px solid #FF4444',
                                                        backgroundColor: '#FF444410',
                                                        color: '#FF4444',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    🗑️ Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bookings List */}
                        {activeTab === 'bookings' && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Negocio</th>
                                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Cliente</th>
                                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Fecha y Hora</th>
                                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Servicio/Cancha</th>
                                            <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bookingList.map(booking => (
                                            <tr key={booking.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {booking.businesses?.name || 'Negocio'}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{booking.customer_name}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{booking.customer_phone}</div>
                                                </td>
                                                <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                                                    <div>{booking.date}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{booking.time}</div>
                                                </td>
                                                <td style={{ padding: '16px', color: 'var(--text-primary)' }}>
                                                    {booking.services?.name || booking.courts?.name || '-'}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        backgroundColor: booking.status === 'confirmed' ? '#4CAF5020' : '#FFC10720',
                                                        color: booking.status === 'confirmed' ? '#4CAF50' : '#FFC107',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {booking.status === 'confirmed' ? 'Confirmado' : booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {bookingList.length === 0 && (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay reservas registradas aún.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Analytics Section */}
                        {activeTab === 'analytics' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Platform Metrics */}
                                {adminMetrics && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                        <MetricsCard
                                            icon="🏢"
                                            title="Total Negocios"
                                            value={adminMetrics.totalBusinesses}
                                            format="number"
                                            color="#6366f1"
                                        />
                                        <MetricsCard
                                            icon="📅"
                                            title="Total Reservas"
                                            value={adminMetrics.totalBookings}
                                            format="number"
                                            color="#10b981"
                                        />
                                        <MetricsCard
                                            icon="💰"
                                            title="Ingresos Totales"
                                            value={adminMetrics.totalRevenue}
                                            format="currency"
                                            color="#f59e0b"
                                        />
                                        <MetricsCard
                                            icon="✨"
                                            title="Negocios Nuevos (Mes)"
                                            value={adminMetrics.newBusinesses}
                                            format="number"
                                            color="#8b5cf6"
                                        />
                                    </div>
                                )}

                                {/* Category Breakdown */}
                                {adminMetrics && (
                                    <div style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-primary)' }}>Distribución por Categoría</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                            <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.02))', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚽</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Deportes</div>
                                                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{adminMetrics.categoryBreakdown.sport}</div>
                                            </div>
                                            <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.02))', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💆</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Salud & Belleza</div>
                                                <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{adminMetrics.categoryBreakdown.service}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Business Leaderboard */}
                                {businessComparison.length > 0 && (
                                    <BusinessLeaderboard businesses={businessComparison} />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '32px',
                        border: '1px solid var(--border)',
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
                                {editingItem ? 'Editar' : 'Crear Nuevo'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingItem(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                ✕ Cancelar
                            </button>
                        </div>

                        {/* Render appropriate form based on active tab */}
                        {activeTab === 'businesses' && (
                            <BusinessFormSelector
                                business={editingItem}
                                onSave={handleSave}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingItem(null);
                                }}
                            />
                        )}

                        {activeTab === 'categories' && (
                            <CategoryForm
                                category={editingItem}
                                onSave={handleSave}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingItem(null);
                                }}
                            />
                        )}

                        {activeTab === 'promotions' && (
                            <PromotionForm
                                promotion={editingItem}
                                businesses={businessList}
                                onSave={handleSave}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingItem(null);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
