import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';
import { useNotification } from '../../contexts/NotificationContext';
import SuperAdminSidebar from './SuperAdminSidebar';
import OverviewTab from './tabs/OverviewTab';
import BusinessesTab from './tabs/BusinessesTab';
import SellersTab from './tabs/SellersTab';
import CategoriesTab from './tabs/CategoriesTab';
import GlobalSearchModal from './tabs/GlobalSearchModal';
import ResetPasswordModal from './tabs/ResetPasswordModal';
import BookingsTab from './BookingsTab';
import ReviewsTab from './ReviewsTab';
import BusinessFormModal from './BusinessFormModal';
import SellerDetailModal from './SellerDetailModal';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { showToast, showConfirm } = useNotification();

    // Data State
    const [analytics, setAnalytics] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [bookingsData, setBookingsData] = useState(null);
    const [commissionTrends, setCommissionTrends] = useState([]);
    const [businessGrowthTrends, setBusinessGrowthTrends] = useState([]);
    const [settledSellers, setSettledSellers] = useState({});

    // UI & Navigation State
    const [activeTab, setActiveTab] = useState('overview');
    const [initialLoading, setInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [businessFilter, setBusinessFilter] = useState('all');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    const [isOpenMobile, setIsOpenMobile] = useState(false);

    // Modals State
    const [showBusinessModal, setShowBusinessModal] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState(null);
    const [sellerDetails, setSellerDetails] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [resetCredentialsModal, setResetCredentialsModal] = useState(null);

    // Resize listener for responsive layout
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsOpenMobile(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Ctrl+K Shortcut Handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowSearchModal(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Load SuperAdmin Data
    const loadData = async (isInitial = false) => {
        if (isInitial && !businesses.length) {
            setInitialLoading(true);
        }
        setIsRefreshing(true);
        try {
            const safe = async (fn, fallback = null) => {
                try {
                    const res = await fn();
                    return res !== undefined && res !== null ? res : fallback;
                } catch (e) {
                    console.warn('SuperAdmin fetch warning:', e);
                    return fallback;
                }
            };

            const [
                analyticsData,
                sellersData,
                businessesData,
                categoriesData,
                subcategoriesData,
                bookingsRes,
                commissionData,
                growthData
            ] = await Promise.all([
                safe(() => supabaseService.getGlobalAnalytics(), null),
                safe(() => supabaseService.getAllSellers(), []),
                safe(async () => {
                    const biz = await supabaseService.getAllBusinesses();
                    if (biz && biz.length > 0) return biz;
                    return await supabaseService.getBusinesses();
                }, []),
                safe(() => supabaseService.getCategories(), []),
                safe(() => supabaseService.getSubcategories(), []),
                safe(() => supabaseService.getBookingsAnalytics(), null),
                safe(() => supabaseService.getCommissionTrends(), []),
                safe(() => supabaseService.getBusinessGrowthTrends(), [])
            ]);

            if (analyticsData) setAnalytics(analyticsData);
            if (sellersData) setSellers(sellersData);
            if (businessesData) setBusinesses(businessesData);
            if (categoriesData) setCategories(categoriesData);
            if (subcategoriesData) setSubcategories(subcategoriesData);
            if (bookingsRes) setBookingsData(bookingsRes);
            if (commissionData) setCommissionTrends(commissionData);
            if (growthData) setBusinessGrowthTrends(growthData);
        } catch (error) {
            console.error('Error loading SuperAdmin data:', error);
            showToast('Error cargando métricas del sistema', 'error');
        } finally {
            setInitialLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData(true);
    }, []);

    // Actions
    const handleLogout = () => {
        localStorage.removeItem('superAdmin');
        navigate('/login');
    };

    const toggleSellerSettlement = (sellerId) => {
        setSettledSellers(prev => ({
            ...prev,
            [sellerId]: !prev[sellerId]
        }));
    };

    const handleToggleSellerStatus = async (sellerId, currentStatus) => {
        try {
            await supabaseService.updateSellerStatus(sellerId, !currentStatus);
            showToast(`Vendedor ${!currentStatus ? 'activado' : 'desactivado'} correctamente`, 'info');
            loadData();
        } catch (err) {
            console.error('Error updating seller status:', err);
            showToast(`Error al cambiar estado del vendedor: ${err.message}`, 'error');
        }
    };

    const handleDeleteBusiness = async (businessId) => {
        const confirmed = await showConfirm(
            '¿Eliminar Negocio?',
            '¿Estás seguro de que deseas eliminar este negocio y todos sus recursos vinculados? Esta acción es irreversible.',
            'Eliminar Negocio',
            'Cancelar'
        );
        if (!confirmed) return;

        try {
            await supabaseService.deleteBusinessAsSuperAdmin(businessId);
            showToast('🗑️ Negocio eliminado correctamente', 'success');
            loadData();
        } catch (err) {
            console.error('Error deleting business:', err);
            showToast(`Error al eliminar negocio: ${err.message}`, 'error', 6000);
        }
    };

    const handleUpdateSubscriptionStatus = async (businessId, newStatus) => {
        try {
            await supabaseService.updateBusinessAsSuperAdmin(businessId, { subscription_status: newStatus });
            setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, subscription_status: newStatus } : b));
            showToast(`Estado de suscripción actualizado a: ${newStatus}`, 'success');
        } catch (err) {
            console.error('Error updating subscription status:', err);
            showToast(`Error al actualizar estado: ${err.message}`, 'error');
        }
    };

    const handleResetBusinessPassword = async (business) => {
        const confirmed = await showConfirm(
            '¿Restablecer Contraseña?',
            `¿Generar una nueva contraseña provisoria para "${business.name}"?`,
            'Restablecer',
            'Cancelar'
        );
        if (!confirmed) return;

        try {
            const creds = await supabaseService.resetBusinessPasswordAsSuperAdmin(business.id, business.name);
            setResetCredentialsModal(creds);
            showToast('🔑 Contraseña provisoria generada', 'success');
        } catch (err) {
            console.error('Error resetting password:', err);
            showToast(`Error al restablecer contraseña: ${err.message}`, 'error');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        const confirmed = await showConfirm(
            '¿Eliminar Categoría?',
            '¿Estás seguro de que deseas eliminar esta categoría?',
            'Eliminar',
            'Cancelar'
        );
        if (!confirmed) return;

        try {
            await supabaseService.deleteCategory(categoryId);
            showToast('Categoría eliminada', 'info');
            loadData();
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    };

    const handleDeleteSubcategory = async (subcategoryId) => {
        const confirmed = await showConfirm(
            '¿Eliminar Subcategoría?',
            '¿Estás seguro de que deseas eliminar esta subcategoría?',
            'Eliminar',
            'Cancelar'
        );
        if (!confirmed) return;

        try {
            await supabaseService.deleteSubcategory(subcategoryId);
            showToast('Subcategoría eliminada', 'info');
            loadData();
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        }
    };

    const handleViewSellerDetails = async (sellerId) => {
        try {
            const details = await supabaseService.getSellerDetails(sellerId);
            setSellerDetails(details);
        } catch (err) {
            console.error('Error loading seller details:', err);
            showToast(`Error: ${err.message}`, 'error');
        }
    };

    const handleExportBusinessesCSV = () => {
        if (!businesses.length) return alert('No hay negocios para exportar.');
        const headers = ['Nombre', 'Categoría', 'Ubicación', 'Vendedor', 'Estado Suscripción', 'Email'];
        const rows = businesses.map(b => [
            `"${(b.name || '').replace(/"/g, '""')}"`,
            `"${(b.categories?.name || '').replace(/"/g, '""')}"`,
            `"${(b.location || '').replace(/"/g, '""')}"`,
            `"${(b.sellers ? `${b.sellers.first_name} ${b.sellers.last_name}` : 'Sin vendedor').replace(/"/g, '""')}"`,
            `"${b.subscription_status || 'Inactivo'}"`,
            `"${(b.email || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_negocios_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const alertCount = businesses.filter(b => b.subscription_status === 'trial' || b.subscription_status === 'inactive').length;

    // Loading Screen
    if (initialLoading && !businesses.length) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#0a0f1d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        border: '3px solid #2563eb',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8' }}>
                        Cargando Centro de Control SuperAdmin...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: '#0a0f1d',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
            {/* Collapsible Sidebar */}
            <SuperAdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                alertCount={alertCount}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={isMobile}
                isOpenMobile={isOpenMobile}
                setIsOpenMobile={setIsOpenMobile}
                onOpenSearch={() => setShowSearchModal(true)}
                onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflowY: 'auto'
            }}>
                {/* Top Control Bar */}
                <header style={{
                    padding: '16px 28px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(10, 15, 29, 0.75)',
                    backdropFilter: 'blur(10px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isMobile && (
                            <button
                                onClick={() => setIsOpenMobile(true)}
                                style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    cursor: 'pointer'
                                }}
                            >
                                ☰
                            </button>
                        )}
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc', textTransform: 'capitalize' }}>
                                {activeTab === 'overview' && '📊 Dashboard General'}
                                {activeTab === 'businesses' && '🏢 Gestión de Negocios'}
                                {activeTab === 'sellers' && '👥 Red de Vendedores'}
                                {activeTab === 'bookings' && '🎫 Reservas Globales'}
                                {activeTab === 'reviews' && '⭐ Reseñas & Feedback'}
                                {activeTab === 'categories' && '📁 Rubros & Categorías'}
                            </h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => loadData(false)}
                            disabled={isRefreshing}
                            style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                color: '#cbd5e1',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            title="Refrescar métricas en tiempo real"
                        >
                            <span>{isRefreshing ? '⏳' : '🔄'}</span>
                            <span>{isRefreshing ? 'Actualizando...' : 'Refrescar'}</span>
                        </button>
                    </div>
                </header>

                {/* Main Views */}
                <main style={{ padding: '24px 28px', flex: 1 }}>
                    {activeTab === 'overview' && (
                        <OverviewTab
                            analytics={analytics}
                            sellers={sellers}
                            commissionTrends={commissionTrends}
                            businessGrowthTrends={businessGrowthTrends}
                            businesses={businesses}
                            onNavigateToBusinesses={(filter) => {
                                setBusinessFilter(filter);
                                setActiveTab('businesses');
                            }}
                        />
                    )}

                    {activeTab === 'businesses' && (
                        <BusinessesTab
                            businesses={businesses}
                            onDelete={handleDeleteBusiness}
                            onEdit={(biz) => {
                                setEditingBusiness(biz);
                                setShowBusinessModal(true);
                            }}
                            onCreate={() => {
                                setEditingBusiness(null);
                                setShowBusinessModal(true);
                            }}
                            onExportCSV={handleExportBusinessesCSV}
                            filter={businessFilter}
                            setFilter={setBusinessFilter}
                            onResetPassword={handleResetBusinessPassword}
                            onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
                        />
                    )}

                    {activeTab === 'sellers' && (
                        <SellersTab
                            sellers={sellers}
                            onToggleStatus={handleToggleSellerStatus}
                            onViewDetails={handleViewSellerDetails}
                            settledSellers={settledSellers}
                            onToggleSettlement={toggleSellerSettlement}
                        />
                    )}

                    {activeTab === 'bookings' && (
                        <BookingsTab bookingsData={bookingsData} />
                    )}

                    {activeTab === 'reviews' && (
                        <ReviewsTab bookingsData={bookingsData} businesses={businesses} />
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
                </main>
            </div>

            {/* Modals & Dialogs */}
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
                    onClose={() => setSellerDetails(null)}
                />
            )}

            {showSearchModal && (
                <GlobalSearchModal
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onClose={() => setShowSearchModal(false)}
                    businesses={businesses}
                    sellers={sellers}
                    categories={categories}
                    bookingsData={bookingsData}
                    onViewSellerDetails={handleViewSellerDetails}
                />
            )}

            {resetCredentialsModal && (
                <ResetPasswordModal
                    credentials={resetCredentialsModal}
                    onClose={() => setResetCredentialsModal(null)}
                />
            )}
        </div>
    );
}
