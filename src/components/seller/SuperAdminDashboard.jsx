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

    const handleLogout = () => {
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
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
            color: 'white',
            padding: '24px'
        }}>
            {/* Modern Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                padding: '24px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            🔐
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                                Super Admin
                            </h1>
                            <p style={{ opacity: 0.6, margin: 0, fontSize: '14px' }}>
                                Control total del sistema
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#ef4444',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                    Cerrar Sesión
                </button>
            </div>

            {/* Modern Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '32px',
                padding: '8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)',
                flexWrap: 'wrap'
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
                            minWidth: '140px',
                            padding: '14px 20px',
                            background: activeTab === tab.id
                                ? 'linear-gradient(135deg, var(--primary-paddle), #059669)'
                                : 'transparent',
                            color: activeTab === tab.id ? '#000' : 'rgba(255,255,255,0.7)',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            fontSize: '14px',
                            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0, 230, 118, 0.3)' : 'none'
                        }}
                        onMouseOver={(e) => {
                            if (activeTab !== tab.id) {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                                e.target.style.color = 'white';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (activeTab !== tab.id) {
                                e.target.style.background = 'transparent';
                                e.target.style.color = 'rgba(255,255,255,0.7)';
                            }
                        }}
                    >
                        {tab.icon} {tab.label}
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
    );
};

// Overview Tab Component
const OverviewTab = ({ analytics, sellers, commissionTrends, businessGrowthTrends }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Key Metrics Grid */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px'
        }}>
            <ModernMetricCard
                icon="👥"
                title="Total Vendedores"
                value={analytics?.totalSellers || 0}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            />
            <ModernMetricCard
                icon="🏢"
                title="Total Negocios"
                value={analytics?.totalBusinesses || 0}
                subtitle={`${analytics?.activeBusinesses || 0} activos`}
                gradient="linear-gradient(135deg, #10b981, #059669)"
            />
            <ModernMetricCard
                icon="💰"
                title="Comisiones (Mes)"
                value={`$${(analytics?.totalCommissions || 0).toLocaleString('es-AR')}`}
                gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            />
            <ModernMetricCard
                icon="📈"
                title="Conversión"
                value={`${analytics?.conversionRate || 0}%`}
                subtitle="Activos / Total"
                gradient="linear-gradient(135deg, #ec4899, #db2777)"
            />
            <ModernMetricCard
                icon="💵"
                title="Ingresos Totales"
                value={`$${(analytics?.totalRevenue || 0).toLocaleString('es-AR')}`}
                subtitle={`${analytics?.totalBookings || 0} reservas`}
                gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            />
        </div>

        {/* Charts Section */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '24px'
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
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
    }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👥</span> Gestión de Vendedores
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sellers.map(seller => (
                <div key={seller.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: `1px solid ${seller.is_active ? 'rgba(0, 230, 118, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onClick={() => onViewDetails(seller.id)}
                >
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: seller.is_active
                            ? 'linear-gradient(135deg, var(--primary-paddle), #059669)'
                            : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#000'
                    }}>
                        {seller.first_name[0]}{seller.last_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                            {seller.first_name} {seller.last_name}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '8px' }}>
                            {seller.email}
                        </div>
                        <div style={{ fontSize: '13px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ padding: '4px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '6px', color: '#818cf8' }}>
                                📊 {seller.stats?.totalBusinesses || 0} negocios
                            </span>
                            <span style={{ padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', color: '#fbbf24' }}>
                                💰 ${(seller.stats?.monthlyCommissions || 0).toLocaleString('es-AR')}
                            </span>
                            <span style={{ padding: '4px 12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px', color: '#f472b6' }}>
                                📈 {seller.stats?.conversionRate || 0}% conversión
                            </span>
                        </div>
                    </div>
                    <div style={{
                        padding: '10px 20px',
                        background: seller.is_active ? 'rgba(0, 230, 118, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: seller.is_active ? 'var(--primary-paddle)' : '#ef4444'
                    }}>
                        {seller.is_active ? '✓ Activo' : '✗ Inactivo'}
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(seller.id, seller.is_active);
                        }}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
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
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏢</span> Todos los Negocios
            </h3>
            <button
                onClick={onCreate}
                style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#000',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
                + Crear Negocio
            </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {businesses.map(business => (
                <div key={business.id} style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s'
                }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            {business.categories?.icon || '🏢'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '16px' }}>{business.name}</div>
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>
                                {business.categories?.name}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>
                        📍 {business.location}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '12px' }}>
                        👤 {business.sellers ? `${business.sellers.first_name} ${business.sellers.last_name}` : 'Sin vendedor'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
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
                                padding: '10px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                color: '#60a5fa',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => onDelete(business.id)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px'
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Categories Section */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        📁 Categorías
                    </h3>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '', icon: '', description: '' });
                            setShowCategoryModal(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ fontSize: '32px' }}>{cat.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '700' }}>{cat.name}</div>
                                <div style={{ fontSize: '12px', opacity: 0.7 }}>{cat.description}</div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({ name: cat.name, icon: cat.icon, description: cat.description || '' });
                                    setShowCategoryModal(true);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                onClick={() => onDeleteCategory(cat.id)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '12px'
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
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        📂 Subcategorías
                    </h3>
                    <button
                        onClick={() => {
                            setEditingSubcategory(null);
                            setSubcategoryForm({ name: '', description: '', category_id: '' });
                            setShowSubcategoryModal(true);
                        }}
                        style={{
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#000',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        + Nueva
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subcategories.map(sub => {
                        const parentCat = categories.find(c => c.id === sub.category_id);
                        return (
                            <div key={sub.id} style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700' }}>{sub.name}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                                        {parentCat?.icon} {parentCat?.name}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingSubcategory(sub);
                                        setSubcategoryForm({
                                            name: sub.name,
                                            description: sub.description || '',
                                            category_id: sub.category_id
                                        });
                                        setShowSubcategoryModal(true);
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => onDeleteSubcategory(sub.id)}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '12px'
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
const ModernMetricCard = ({ icon, title, value, subtitle, gradient }) => (
    <div style={{
        padding: '24px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s'
    }}
        onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 230, 118, 0.15)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: gradient,
            borderRadius: '50%',
            opacity: 0.1,
            filter: 'blur(40px)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
            <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '8px', fontWeight: '600' }}>
                {title}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', marginBottom: '4px', background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    {subtitle}
                </div>
            )}
        </div>
    </div>
);

const ModernChart = ({ title, data, type }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
    }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
            {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.map((item, idx) => {
                const maxValue = Math.max(...data.map(d => type === 'commission' ? d.amount : d.count));
                const percentage = ((type === 'commission' ? item.amount : item.count) / maxValue) * 100;

                return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '90px', fontSize: '13px', opacity: 0.7, fontWeight: '600' }}>
                            {item.month}
                        </div>
                        <div style={{ flex: 1, height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: type === 'commission'
                                    ? 'linear-gradient(90deg, var(--primary-paddle), #059669)'
                                    : 'linear-gradient(90deg, #6366f1, #4f46e5)',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '16px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: type === 'commission' ? '#000' : 'white',
                                transition: 'width 0.5s ease',
                                borderRadius: '10px'
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
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
    }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        border: idx < 3 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s'
                    }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                    idx === 2 ? 'linear-gradient(135deg, #cd7f32, #a0522d)' :
                                        'linear-gradient(135deg, #6366f1, #4f46e5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '900',
                            fontSize: '20px'
                        }}>
                            {idx < 3 ? medals[idx] : idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '16px' }}>
                                {sellerData ? `${sellerData.first_name} ${sellerData.last_name}` : 'Vendedor'}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {sellerData?.email}
                            </div>
                        </div>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: '900',
                            background: 'linear-gradient(135deg, var(--primary-paddle), #059669)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
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
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)'
    }}
        onClick={onClose}
    >
        <div
            style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', margin: 0 }}>
                {title}
            </h2>
            {children}
        </div>
    </div>
);

export default SuperAdminDashboard;
