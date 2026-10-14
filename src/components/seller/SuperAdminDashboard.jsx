import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabaseService from '../../services/supabaseService';
import { useNotification } from '../../contexts/NotificationContext';
import { Menu, RefreshCw, Search } from 'lucide-react';
import SuperAdminSidebar from './SuperAdminSidebar';
import { SUPERADMIN_NAV } from './superAdminNav';
import './superadmin.css';
import OverviewTab from './tabs/OverviewTab';
import BusinessesTab from './tabs/BusinessesTab';
import SellersTab from './tabs/SellersTab';
import LeadsTab from './tabs/LeadsTab';
import CategoriesTab from './tabs/CategoriesTab';
import PromotionsTab from './tabs/PromotionsTab';
import GlobalSearchModal from './tabs/GlobalSearchModal';
import ResetPasswordModal from './tabs/ResetPasswordModal';
import BookingsTab from './BookingsTab';
import ReviewsTab from './ReviewsTab';
import BusinessFormModal from './BusinessFormModal';
import SellerDetailModal from './SellerDetailModal';
import RegisterPaymentModal from './RegisterPaymentModal';
import { getBillingRows, needsAttention } from '../../utils/billingUtils';

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { showToast, showConfirm } = useNotification();

    // Data State
    const [sellers, setSellers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [bookingsData, setBookingsData] = useState(null);
    const [settledSellers, setSettledSellers] = useState({});
    const [billing, setBilling] = useState({ subscriptions: [], payments: [] });
    const [paymentTarget, setPaymentTarget] = useState(null);

    // UI & Navigation State
    const [activeTab, setActiveTab] = useState('overview');
    const [initialLoading, setInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [businessFilter, setBusinessFilter] = useState('all');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    const [isOpenMobile, setIsOpenMobile] = useState(false);
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem('sa-theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch { /* storage unavailable */ }
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });
    const [admin] = useState(() => {
        try { return JSON.parse(localStorage.getItem('superAdmin')) || null; } catch { return null; }
    });

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('sa-theme', next); } catch { /* storage unavailable */ }
            return next;
        });
    };

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
                sellersData,
                businessesData,
                categoriesData,
                subcategoriesData,
                bookingsRes,
                billingData
            ] = await Promise.all([
                safe(() => supabaseService.getAllSellers(), []),
                safe(async () => {
                    const biz = await supabaseService.getAllBusinesses();
                    if (biz && biz.length > 0) return biz;
                    return await supabaseService.getBusinesses();
                }, []),
                safe(() => supabaseService.getCategories(), []),
                safe(() => supabaseService.getSubcategories(), []),
                safe(() => supabaseService.getBookingsAnalytics(), null),
                safe(() => supabaseService.getBillingData(), null)
            ]);

            if (sellersData) setSellers(sellersData);
            if (businessesData) setBusinesses(businessesData);
            if (categoriesData) setCategories(categoriesData);
            if (subcategoriesData) setSubcategories(subcategoriesData);
            if (bookingsRes) setBookingsData(bookingsRes);
            if (billingData) setBilling(billingData);
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
    const handleLogout = async () => {
        await supabaseService.logout();
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

    const handleCreateSeller = async (form) => {
        try {
            const creds = await supabaseService.createSellerAsSuperAdmin(form);
            setResetCredentialsModal({
                ...creds,
                businessName: `${form.firstName} ${form.lastName}`.trim(),
                accessLabel: 'el *panel de vendedores de TurnitosLR*',
                loginPath: '/admin/login',
                whatsapp: form.phone || ''
            });
            showToast('Vendedor creado', 'success');
            loadData();
            return true;
        } catch (err) {
            console.error('Error creating seller:', err);
            showToast(`Error al crear vendedor: ${err.message}`, 'error', 6000);
            return false;
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
            setResetCredentialsModal({ ...creds, whatsapp: business.whatsapp || '', slug: business.slug || '' });
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
        if (!businesses.length) return showToast('No hay negocios para exportar', 'warning');
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

    const alertCount = getBillingRows(businesses, billing).filter(r => needsAttention(r.info)).length;

    const activeNavItem = SUPERADMIN_NAV.flatMap(g => g.items).find(i => i.id === activeTab);

    // Loading Screen
    if (initialLoading && !businesses.length) {
        return (
            <div className="sa-root" data-theme={theme}>
                <div className="sa-loading">
                    <RefreshCw size={26} className="sa-spin" />
                    Cargando panel de administración...
                </div>
            </div>
        );
    }

    return (
        <div className="sa-root" data-theme={theme}>
            <SuperAdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                alertCount={alertCount}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={isMobile}
                isOpenMobile={isOpenMobile}
                setIsOpenMobile={setIsOpenMobile}
                theme={theme}
                onToggleTheme={toggleTheme}
                admin={admin}
                onLogout={handleLogout}
            />

            <div className="sa-main">
                <header className="sa-header">
                    {isMobile && (
                        <button type="button" className="sa-icon-btn" onClick={() => setIsOpenMobile(true)} title="Abrir menú">
                            <Menu size={18} />
                        </button>
                    )}
                    <div style={{ minWidth: 0 }}>
                        <h1 className="sa-header-title">{activeNavItem?.label}</h1>
                        <p className="sa-header-sub">{activeNavItem?.description}</p>
                    </div>

                    <div className="sa-header-actions">
                        <button type="button" className="sa-search-trigger" onClick={() => setShowSearchModal(true)} title="Búsqueda rápida (Ctrl + K)">
                            <Search size={15} />
                            <span className="sa-search-text">Buscar negocios, vendedores...</span>
                            <kbd>Ctrl K</kbd>
                        </button>
                        <button
                            type="button"
                            className="sa-icon-btn"
                            onClick={() => loadData(false)}
                            disabled={isRefreshing}
                            title="Actualizar datos"
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'sa-spin' : undefined} />
                        </button>
                    </div>
                </header>

                <main className="sa-content">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            businesses={businesses}
                            billing={billing}
                            onRegisterPayment={(business, monthlyPrice) => setPaymentTarget({ business, monthlyPrice })}
                        />
                    )}

                    {activeTab === 'promotions' && (
                        <PromotionsTab businesses={businesses} />
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
                            billing={billing}
                            onRegisterPayment={(business, monthlyPrice) => setPaymentTarget({ business, monthlyPrice })}
                            onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
                        />
                    )}

                    {activeTab === 'leads' && <LeadsTab />}

                    {activeTab === 'sellers' && (
                        <SellersTab
                            sellers={sellers}
                            onToggleStatus={handleToggleSellerStatus}
                            onViewDetails={handleViewSellerDetails}
                            settledSellers={settledSellers}
                            onToggleSettlement={toggleSellerSettlement}
                            onCreateSeller={handleCreateSeller}
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
                    onSelectBusiness={(biz) => {
                        setEditingBusiness(biz);
                        setShowBusinessModal(true);
                    }}
                />
            )}

            {paymentTarget && (
                <RegisterPaymentModal
                    business={paymentTarget.business}
                    monthlyPrice={paymentTarget.monthlyPrice}
                    onClose={() => setPaymentTarget(null)}
                    onRegistered={(result) => {
                        setPaymentTarget(null);
                        const until = result?.period_end
                            ? new Date(`${result.period_end}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
                            : null;
                        showToast(`Pago registrado${until ? `. Al día hasta el ${until}` : ''}`, 'success');
                        loadData();
                    }}
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
