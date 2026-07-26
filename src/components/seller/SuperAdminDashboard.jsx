import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';
import BusinessFormModal from './BusinessFormModal';
import SellerDetailModal from './SellerDetailModal';
import BookingsTab from './BookingsTab';

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [bookingsData, setBookingsData] = useState(null);
    const [commissionTrends, setCommissionTrends] = useState([]);
    const [businessGrowthTrends, setBusinessGrowthTrends] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Modals
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [sellerDetails, setSellerDetails] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Each fetch has its own try/catch so one failure doesn't break the rest
            const safe = async (promise, fallback = null) => {
                try {
                    const result = await promise;
                    return result ?? fallback;
                } catch (err) {
                    console.warn('Fetch failed:', err.message || err);
                    return fallback;
                }
            };

            const [
                analyticsData, sellersData, businessesData,
                categoriesData, subcategoriesData, bookings,
                commTrends, bizTrends
            ] = await Promise.all([
                safe(supabaseService.getGlobalAnalytics(), {}),
                safe(supabaseService.getAllSellers(), []),
                safe(supabaseService.getAllBusinesses(), []),
                safe(supabaseService.getCategories(), []),
                safe(supabaseService.getSubcategories(), []),
                safe(supabaseService.getBookingsAnalytics(), {}),
                safe(supabaseService.getCommissionTrends(6), []),
                safe(supabaseService.getBusinessGrowthTrends(6), []),
            ]);

            setAnalytics(analyticsData || {});
            setSellers(sellersData || []);
            setBusinesses(businessesData || []);
            setCategories(categoriesData || []);
            setSubcategories(subcategoriesData || []);
            setBookingsData(bookings || {});
            setCommissionTrends(commTrends || []);
            setBusinessGrowthTrends(bizTrends || []);
        } catch (err) {
            console.error('Critical error in loadData:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabaseService.logout();
        localStorage.removeItem('superAdmin');
        navigate('/admin/login');
    };

    const handleToggleSellerStatus = async (sellerId, currentStatus) => {
        try {
            await supabaseService.updateSellerStatus(sellerId, !currentStatus);
            loadData();
        } catch (err) {
            console.error('Error updating seller status:', err);
        }
    };

    const handleDeleteBusiness = async (businessId) => {
        if (!confirm('¿Estás seguro de eliminar este negocio? Esta acción no se puede deshacer.')) return;

        try {
            await supabaseService.deleteBusinessAsSuperAdmin(businessId);
            loadData();
        } catch (err) {
            console.error('Error deleting business:', err);
            alert(err.message);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

        try {
            await supabaseService.deleteCategory(categoryId);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteSubcategory = async (subcategoryId) => {
        if (!confirm('¿Estás seguro de eliminar esta subcategoría?')) return;

        try {
            await supabaseService.deleteSubcategory(subcategoryId);
            loadData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleViewSellerDetails = async (sellerId) => {
        try {
            const details = await supabaseService.getSellerDetails(sellerId);
            setSellerDetails(details);
            setSelectedSeller(sellerId);
        } catch (err) {
            console.error('Error loading seller details:', err);
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        border: '4px solid var(--primary-paddle)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>Cargando analíticas...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: '#0b0f19',
            color: '#f9fafb',
            fontFamily: "var(--font-sans)"
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '24px 24px'
            }}>
            {/* Modern Compact Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '14px 20px',
                background: '#111827',
                borderRadius: '14px',
                border: '1px solid #1f2937',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontFamily: 'var(--font-title)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            background: '#1e293b',
                            border: '1px solid #3b82f6',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}>
                            🔐
                        </div>
                        <div>
                            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px', color: '#f9fafb', fontFamily: 'var(--font-title)' }}>
                                Super Admin
                            </h1>
                            <p style={{ opacity: 0.6, margin: '1px 0 0 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af', fontFamily: 'var(--font-title)' }}>
                                Panel de Control Master
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '7px 16px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'var(--font-title)'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'rgba(239, 68, 68, 0.08)';
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>

            {/* Modern Compact Tabs */}
            <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '20px',
                padding: '4px',
                background: '#111827',
                borderRadius: '10px',
                border: '1px solid #1f2937',
                flexWrap: 'wrap',
                fontFamily: 'var(--font-title)'
            }}>
                {[
                    { id: 'overview', icon: '📊', label: 'Resumen' },
                    { id: 'bookings', icon: '🎫', label: 'Reservas' },
                    { id: 'sellers', icon: '👥', label: 'Vendedores' },
                    { id: 'businesses', icon: '🏢', label: 'Negocios' },
                    { id: 'categories', icon: '📁', label: 'Categorías' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            minWidth: '110px',
                            padding: '8px 14px',
                            background: activeTab === tab.id
                                ? '#2563eb'
                                : 'transparent',
                            color: activeTab === tab.id ? '#ffffff' : '#9ca3af',
                            border: 'none',
                            borderRadius: '7px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            fontSize: '13px',
                            boxShadow: activeTab === tab.id ? '0 2px 6px rgba(37, 99, 235, 0.4)' : 'none',
                            fontFamily: 'var(--font-title)'
                        }}
                    >
                        <span style={{ marginRight: '6px' }}>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <OverviewTab
                    analytics={analytics}
                    sellers={sellers}
                    commissionTrends={commissionTrends}
                    businessGrowthTrends={businessGrowthTrends}
                />
            )}

            {activeTab === 'bookings' && (
                <BookingsTab bookingsData={bookingsData} />
            )}

            {activeTab === 'sellers' && (
                <SellersTab
                    sellers={sellers}
                    onToggleStatus={handleToggleSellerStatus}
                    onViewDetails={handleViewSellerDetails}
                />
            )}

            {activeTab === 'businesses' && (
                <BusinessesTab
                    businesses={businesses}
                    onDelete={handleDeleteBusiness}
                    onEdit={(business) => {
                        setEditingBusiness(business);
                        setShowBusinessModal(true);
                    }}
                    onCreate={() => {
                        setEditingBusiness(null);
                        setShowBusinessModal(true);
                    }}
                />
            )}

            {activeTab === 'categories' && (
                <CategoriesTab
                    categories={categories}
                    subcategories={subcategories}
                    onDeleteCategory={handleDeleteCategory}
                    onDeleteSubcategory={handleDeleteSubcategory}
                    onReload={loadData}
                />
            )}

            {/* Modals */}
            {showBusinessModal && (
                <BusinessFormModal
                    business={editingBusiness}
                    categories={categories}
                    subcategories={subcategories}
                    sellers={sellers}
                    onClose={() => {
                        setShowBusinessModal(false);
                        setEditingBusiness(null);
                    }}
                    onSave={loadData}
                />
            )}

            {sellerDetails && (
                <SellerDetailModal
                    seller={sellerDetails}
                    onClose={() => {
                        setSellerDetails(null);
                        setSelectedSeller(null);
                    }}
                />
            )}
            </div>
        </div>
    );
};

// Overview Tab Component
const OverviewTab = ({ analytics, sellers, commissionTrends, businessGrowthTrends }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Key Metrics Grid - 5 columns on desktop */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
        }}>
            <ModernMetricCard
                icon="👥"
                title="Total Vendedores"
                value={analytics?.totalSellers || 0}
                colorAccent="#6366f1"
            />
            <ModernMetricCard
                icon="🏢"
                title="Total Negocios"
                value={analytics?.totalBusinesses || 0}
                subtitle={`${analytics?.activeBusinesses || 0} activos`}
                colorAccent="#10b981"
            />
            <ModernMetricCard
                icon="💰"
                title="Comisiones (Mes)"
                value={`$${(analytics?.totalCommissions || 0).toLocaleString('es-AR')}`}
                colorAccent="#f59e0b"
            />
            <ModernMetricCard
                icon="📈"
                title="Conversión"
                value={`${analytics?.conversionRate || 0}%`}
                subtitle="Activos / Total"
                colorAccent="#ec4899"
            />
            <ModernMetricCard
                icon="💵"
                title="Ingresos Totales"
                value={`$${(analytics?.totalRevenue || 0).toLocaleString('es-AR')}`}
                subtitle={`${analytics?.totalBookings || 0} reservas`}
                colorAccent="#8b5cf6"
            />
        </div>

        {/* Charts Section */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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

        {/* Top Sellers */}
        {analytics?.topSellers && analytics.topSellers.length > 0 && (
            <TopSellersCard sellers={analytics.topSellers} allSellers={sellers} />
        )}
    </div>
);

// Sellers Tab Component
const SellersTab = ({ sellers, onToggleStatus, onViewDetails }) => (
    <div style={{
        background: '#111827',
        borderRadius: '14px',
        padding: '20px',
        border: '1px solid #1f2937',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f9fafb' }}>
            <span>👥</span> Gestión de Vendedores
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sellers.map(seller => (
                <div key={seller.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    background: '#1e293b',
                    borderRadius: '10px',
                    border: `1px solid ${seller.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                }}
                    onClick={() => onViewDetails(seller.id)}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: seller.is_active
                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '800',
                        color: '#fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {seller.first_name?.[0]}{seller.last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#f9fafb' }}>
                            {seller.first_name} {seller.last_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                            {seller.email}
                        </div>
                        <div style={{ fontSize: '11px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', color: '#a5b4fc', fontWeight: '700' }}>
                                📊 {seller.stats?.totalBusinesses || 0} negocios
                            </span>
                            <span style={{ padding: '3px 8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', color: '#fde047', fontWeight: '700' }}>
                                💰 ${(seller.stats?.monthlyCommissions || 0).toLocaleString('es-AR')}
                            </span>
                            <span style={{ padding: '3px 8px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '6px', color: '#fbcfe8', fontWeight: '700' }}>
                                📈 {seller.stats?.conversionRate || 0}% conv.
                            </span>
                        </div>
                    </div>
                    <div style={{
                        padding: '4px 10px',
                        background: seller.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: seller.is_active ? '#34d399' : '#f87171',
                        border: `1px solid ${seller.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        {seller.is_active ? '✓ Activo' : '✗ Inactivo'}
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(seller.id, seller.is_active);
                        }}
                        style={{
                            padding: '6px 14px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#e2e8f0',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '11px'
                        }}
                    >
                        {seller.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            ))}
        </div>
    </div>
);

// Businesses Tab Component
const BusinessesTab = ({ businesses, onDelete, onEdit, onCreate }) => (
    <div style={{
        background: '#111827',
        borderRadius: '14px',
        padding: '20px',
        border: '1px solid #1f2937',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f9fafb' }}>
                <span>🏢</span> Todos los Negocios
            </h3>
            <button
                onClick={onCreate}
                style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)'
                }}
            >
                + Crear Negocio
            </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {businesses.map(business => (
                <div key={business.id} style={{
                    padding: '14px 16px',
                    background: '#1e293b',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            {business.categories?.icon || '🏢'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {business.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {business.categories?.name}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📍</span> {business.location}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>👤</span> {business.sellers ? `${business.sellers.first_name} ${business.sellers.last_name}` : 'Sin vendedor'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{
                            padding: '3px 8px',
                            background: business.subscription_status === 'active' ? 'rgba(16, 185, 129, 0.1)' :
                                business.subscription_status === 'trial' ? 'rgba(59, 130, 246, 0.1)' :
                                    'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${
                                business.subscription_status === 'active' ? 'rgba(16, 185, 129, 0.3)' :
                                business.subscription_status === 'trial' ? 'rgba(59, 130, 246, 0.3)' :
                                'rgba(239, 68, 68, 0.3)'
                            }`,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: business.subscription_status === 'active' ? '#34d399' :
                                business.subscription_status === 'trial' ? '#60a5fa' :
                                    '#f87171'
                        }}>
                            {business.subscription_status === 'active' ? '✓ Activo' :
                                business.subscription_status === 'trial' ? '⏱ Prueba' :
                                    '✗ Inactivo'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => onEdit(business)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '6px',
                                color: '#60a5fa',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '11px'
                            }}
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => onDelete(business.id)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                color: '#f87171',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '11px'
                            }}
                        >
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Categories Tab Component (simplified - full implementation in previous version)
const CategoriesTab = ({ categories, subcategories, onDeleteCategory, onDeleteSubcategory, onReload }) => {
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', icon: '', description: '' });
    const [subcategoryForm, setSubcategoryForm] = useState({ name: '', description: '', category_id: '' });

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await supabaseService.updateCategory(editingCategory.id, categoryForm);
            } else {
                await supabaseService.createCategory(categoryForm);
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', icon: '', description: '' });
            onReload();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSaveSubcategory = async () => {
        try {
            if (editingSubcategory) {
                await supabaseService.updateSubcategory(editingSubcategory.id, subcategoryForm);
            } else {
                await supabaseService.createSubcategory(subcategoryForm);
            }
            setShowSubcategoryModal(false);
            setEditingSubcategory(null);
            setSubcategoryForm({ name: '', description: '', category_id: '' });
            onReload();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Categories Section */}
            <div style={{
                background: '#111827',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #1f2937',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f9fafb' }}>
                        📁 Categorías
                    </h3>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '', icon: '', description: '' });
                            setShowCategoryModal(true);
                        }}
                        style={{
                            padding: '8px 16px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{
                            padding: '10px 14px',
                            background: '#1e293b',
                            borderRadius: '8px',
                            border: '1px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ 
                                fontSize: '20px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>{cat.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '13px', color: '#f9fafb' }}>{cat.name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({ name: cat.name, icon: cat.icon, description: cat.description || '' });
                                    setShowCategoryModal(true);
                                }}
                                style={{
                                    padding: '6px 10px',
                                    background: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '6px',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700'
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => onDeleteCategory(cat.id)}
                                style={{
                                    padding: '6px 10px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '700'
                                }}
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Subcategories Section */}
            <div style={{
                background: '#111827',
                borderRadius: '14px',
                padding: '20px',
                border: '1px solid #1f2937',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f9fafb' }}>
                        📂 Subcategorías
                    </h3>
                    <button
                        onClick={() => {
                            setEditingSubcategory(null);
                            setSubcategoryForm({ name: '', description: '', category_id: '' });
                            setShowSubcategoryModal(true);
                        }}
                        style={{
                            padding: '8px 16px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subcategories.map(sub => {
                        const parentCat = categories.find(c => c.id === sub.category_id);
                        return (
                            <div key={sub.id} style={{
                                padding: '10px 14px',
                                background: '#1e293b',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#f9fafb' }}>{sub.name}</div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                        {parentCat ? `${parentCat.icon || ''} ${parentCat.name}` : 'Sin categoría'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingSubcategory(sub);
                                        setSubcategoryForm({ name: sub.name, description: sub.description || '', category_id: sub.category_id });
                                        setShowSubcategoryModal(true);
                                    }}
                                    style={{
                                        padding: '6px 10px',
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '6px',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => onDeleteSubcategory(sub.id)}
                                    style={{
                                        padding: '6px 10px',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '6px',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: '700'
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <Modal
                    title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                    onClose={() => setShowCategoryModal(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Icono (emoji)
                            </label>
                            <input
                                type="text"
                                value={categoryForm.icon}
                                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                                placeholder="🏋️"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Descripción
                            </label>
                            <textarea
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveCategory}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Subcategory Modal */}
            {showSubcategoryModal && (
                <Modal
                    title={editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
                    onClose={() => setShowSubcategoryModal(false)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Categoría Padre
                            </label>
                            <select
                                value={subcategoryForm.category_id}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Nombre
                            </label>
                            <input
                                type="text"
                                value={subcategoryForm.name}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                Descripción
                            </label>
                            <textarea
                                value={subcategoryForm.description}
                                onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowSubcategoryModal(false)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSubcategory}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Helper Components
const ModernMetricCard = ({ icon, title, value, subtitle, colorAccent = '#3b82f6' }) => (
    <div style={{
        padding: '14px 16px',
        background: '#111827',
        borderRadius: '12px',
        border: '1px solid #1f2937',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
            </div>
            <div style={{ 
                fontSize: '16px', 
                width: '32px',
                height: '32px',
                background: '#1e293b',
                border: `1px solid rgba(255, 255, 255, 0.05)`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colorAccent
            }}>{icon}</div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '2px', color: '#ffffff', letterSpacing: '-0.3px' }}>
            {value}
        </div>
        {subtitle && (
            <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span>ℹ️</span> {subtitle}
            </div>
        )}
    </div>
);

const ModernChart = ({ title, data, type }) => (
    <div style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #1f2937',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', color: '#f9fafb' }}>
            {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.map((item, idx) => {
                const maxValue = Math.max(...data.map(d => type === 'commission' ? d.amount : d.count));
                const percentage = ((type === 'commission' ? item.amount : item.count) / (maxValue || 1)) * 100;

                return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '75px', fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>
                            {item.month}
                        </div>
                        <div style={{ flex: 1, height: '26px', background: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: type === 'commission'
                                    ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                                    : 'linear-gradient(90deg, #6366f1, #4f46e5)',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'white',
                                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                                borderRadius: '6px'
                            }}>
                                {type === 'commission'
                                    ? `$${item.amount.toLocaleString('es-AR')}`
                                    : `${item.count} negocios`}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const TopSellersCard = ({ sellers, allSellers }) => (
    <div style={{
        background: '#151c2c',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #222d44',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9' }}>
            <span>🏆</span> Top Vendedores del Mes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sellers.map((seller, idx) => {
                const sellerData = allSellers.find(s => s.id === seller.sellerId);
                const medals = ['🥇', '🥈', '🥉'];

                return (
                    <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px',
                        background: '#1e293b',
                        borderRadius: '12px',
                        border: idx < 3 
                            ? '1px solid rgba(59, 130, 246, 0.2)' 
                            : '1px solid #222d44',
                        transition: 'all 0.2s'
                    }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#1e293b';
                        }}
                    >
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: idx === 0 ? '#d97706' :
                                idx === 1 ? '#475569' :
                                    idx === 2 ? '#b45309' :
                                        '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '18px',
                            color: 'white'
                        }}>
                            {idx < 3 ? medals[idx] : idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#f1f5f9' }}>
                                {sellerData ? `${sellerData.first_name} ${sellerData.last_name}` : 'Vendedor'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                {sellerData?.email}
                            </div>
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#3b82f6',
                            letterSpacing: '-0.3px'
                        }}>
                            ${seller.amount.toLocaleString('es-AR')}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const Modal = ({ title, children, onClose }) => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease-out'
    }}
        onClick={onClose}
    >
        <div
            style={{
                background: '#151c2c',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                border: '1px solid #222d44',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
                animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', margin: 0, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                {title}
            </h2>
            {children}
        </div>
    </div>
);

export default SuperAdminDashboard;
