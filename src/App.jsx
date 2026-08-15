import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion'; // Added AnimatePresence import
import { NotificationProvider } from './contexts/NotificationContext';
import Toast from './components/notifications/Toast';
import ConfirmDialog from './components/notifications/ConfirmDialog';
import AlertDialog from './components/notifications/AlertDialog';
import Header from './components/Header';
import Footer from './components/Footer';

// Helper for lazy loading that auto-reloads if a chunk fails to load after a new deployment
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_reload_done') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('chunk_reload_done', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        console.warn('Chunk load failed after deployment, forcing reload...', error);
        window.sessionStorage.setItem('chunk_reload_done', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy load pages for code splitting with retry
const Home = lazyWithRetry(() => import('./pages/Home'));
const BusinessProfile = lazyWithRetry(() => import('./pages/BusinessProfile'));
const VenueProfile = lazyWithRetry(() => import('./pages/VenueProfile'));
const BusinessProfileRouter = lazyWithRetry(() => import('./pages/BusinessProfileRouter'));
const LinkBio = lazyWithRetry(() => import('./pages/LinkBio'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const BusinessPortal = lazyWithRetry(() => import('./pages/BusinessPortal'));
const Ayuda = lazyWithRetry(() => import('./pages/Ayuda'));
const Negocios = lazyWithRetry(() => import('./pages/Negocios'));
const Colaboradores = lazyWithRetry(() => import('./pages/Colaboradores'));
const Terminos = lazyWithRetry(() => import('./pages/Terminos'));
const Privacidad = lazyWithRetry(() => import('./pages/Privacidad'));
const BusinessStore = lazyWithRetry(() => import('./pages/BusinessStore'));
const SubmitReview = lazyWithRetry(() => import('./pages/SubmitReview'));

// Seller Portal Components
const SellerLogin = lazyWithRetry(() => import('./components/seller/SellerLogin'));
const SellerDashboard = lazyWithRetry(() => import('./components/seller/SellerDashboard'));
const SellerBusinessList = lazyWithRetry(() => import('./components/seller/SellerBusinessList'));
const SellerBusinessForm = lazyWithRetry(() => import('./components/seller/SellerBusinessForm'));
const SellerCommissionsReport = lazyWithRetry(() => import('./components/seller/SellerCommissionsReport'));
const SuperAdminDashboard = lazyWithRetry(() => import('./components/seller/SuperAdminDashboard'));
const ProtectedSellerRoute = lazyWithRetry(() => import('./components/seller/ProtectedSellerRoute'));
const ProtectedSuperAdminRoute = lazyWithRetry(() => import('./components/seller/ProtectedSuperAdminRoute'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minHeight: '60vh',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-primary)'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid var(--primary-paddle)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <p style={{ fontSize: '16px', fontWeight: '600' }}>Cargando...</p>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-primary)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Ocurrió un error inesperado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '400px', fontSize: '14px' }}>
            Hubo un problema al cargar esta pantalla. Haz clic abajo para recargar la aplicación.
          </p>
          <button
            onClick={() => {
              window.sessionStorage.clear();
              window.location.reload();
            }}
            style={{
              backgroundColor: 'var(--primary-paddle, #84CC16)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { getSubdomain } from './utils/utils';

function AppContent() {
  const location = useLocation();
  const subdomain = getSubdomain();

  const isHome = location.pathname === '/';
  const isBusinessPortal = location.pathname.startsWith('/portal');
  const isAdmin = location.pathname.startsWith('/admin');
  const isLinkBio = (subdomain && location.pathname === '/') || location.pathname.endsWith('/bio');
  const isBusinessPage = isLinkBio || location.pathname.endsWith('/turnos') || location.pathname.endsWith('/tienda') || (subdomain && (location.pathname === '/' || location.pathname === '/turnos' || location.pathname === '/tienda'));

  if (subdomain && (location.pathname === '/' || location.pathname === '/turnos' || location.pathname === '/tienda')) {
    return (
      <div className="app-container" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <Header showSearch={false} />
        <main style={{ 
          flex: 1, 
          minHeight: 'calc(100vh - 70px)', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              {location.pathname === '/tienda' ? (
                <BusinessStore overrideSlug={subdomain} />
              ) : location.pathname === '/' ? (
                <LinkBio overrideSlug={subdomain} />
              ) : (
                <BusinessProfileRouter overrideSlug={subdomain} />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer minimal={true} />
        <Toast />
        <ConfirmDialog />
        <AlertDialog />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ 
      height: isLinkBio ? '100vh' : 'auto',
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: isLinkBio ? 'hidden' : 'visible'
    }}>
      {!isAdmin && !isLinkBio && !isBusinessPortal && <Header showSearch={isHome} />}

      <main style={{ 
        flex: 1, 
        minHeight: isLinkBio ? '0' : 'calc(100vh - 70px)', 
        height: isLinkBio ? 'calc(100vh - 60px)' : 'auto',
        display: 'flex', 
        flexDirection: 'column',
        overflow: isLinkBio ? 'hidden' : 'visible'
      }}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="/negocios" element={<Negocios />} />
                <Route path="/colaboradores" element={<Colaboradores />} />
                <Route path="/terminos" element={<Terminos />} />
                <Route path="/privacidad" element={<Privacidad />} />
                {/* Static routes must come BEFORE /:businessSlug to take precedence */}
                <Route path="/login" element={<SellerLogin />} />
                <Route path="/portal" element={<BusinessPortal />} />
                <Route path="/business-portal" element={<BusinessPortal />} />
                <Route path="/calificar/:token" element={<SubmitReview />} />
                <Route path="/review/:token" element={<SubmitReview />} />
                {/* /:businessSlug now goes directly to the reservation / booking page */}
                <Route path="/:businessSlug" element={<BusinessProfileRouter />} />
                <Route path="/:businessSlug/turnos" element={<BusinessProfileRouter />} />
                <Route path="/:businessSlug/tienda" element={<BusinessStore />} />
                <Route path="/:businessSlug/bio" element={<LinkBio />} />
                <Route path="/admin" element={<Navigate to="/login" replace />} />
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />

                {/* Admin Portal Routes (Sellers + Super Admin) */}
                <Route path="/admin/super" element={<Suspense fallback={<LoadingFallback />}><ProtectedSuperAdminRoute><SuperAdminDashboard /></ProtectedSuperAdminRoute></Suspense>} />
                <Route path="/admin/dashboard" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerDashboard /></ProtectedSellerRoute></Suspense>} />
                <Route path="/admin/businesses" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessList /></ProtectedSellerRoute></Suspense>} />
                <Route path="/admin/businesses/new" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessForm /></ProtectedSellerRoute></Suspense>} />
                <Route path="/admin/businesses/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessForm /></ProtectedSellerRoute></Suspense>} />
                <Route path="/admin/commissions" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerCommissionsReport /></ProtectedSellerRoute></Suspense>} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isAdmin && !isBusinessPortal && <Footer minimal={isBusinessPage} />}

      {/* Notification Components */}
      <Toast />
      <ConfirmDialog />
      <AlertDialog />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </Router>
  );
}
