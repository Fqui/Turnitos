import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion'; // Added AnimatePresence import
import { NotificationProvider } from './contexts/NotificationContext';
import Toast from './components/notifications/Toast';
import ConfirmDialog from './components/notifications/ConfirmDialog';
import AlertDialog from './components/notifications/AlertDialog';
import Header from './components/Header';
import Footer from './components/Footer';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const BusinessProfile = lazy(() => import('./pages/BusinessProfile'));
const VenueProfile = lazy(() => import('./pages/VenueProfile'));
const BusinessProfileRouter = lazy(() => import('./pages/BusinessProfileRouter'));
const LinkBio = lazy(() => import('./pages/LinkBio'));
const Admin = lazy(() => import('./pages/Admin'));
const BusinessPortal = lazy(() => import('./pages/BusinessPortal'));
const Ayuda = lazy(() => import('./pages/Ayuda'));
const Negocios = lazy(() => import('./pages/Negocios'));
const Colaboradores = lazy(() => import('./pages/Colaboradores'));

// Seller Portal Components
const SellerLogin = lazy(() => import('./components/seller/SellerLogin'));
const SellerDashboard = lazy(() => import('./components/seller/SellerDashboard'));
const SellerBusinessList = lazy(() => import('./components/seller/SellerBusinessList'));
const SellerBusinessForm = lazy(() => import('./components/seller/SellerBusinessForm'));
const SellerCommissionsReport = lazy(() => import('./components/seller/SellerCommissionsReport'));
const SuperAdminDashboard = lazy(() => import('./components/seller/SuperAdminDashboard'));
const ProtectedSellerRoute = lazy(() => import('./components/seller/ProtectedSellerRoute'));

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

const getSubdomain = () => {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (hostname.includes('turnitoslr.com') && parts.length > 2) {
    const sub = parts[0].toLowerCase();
    if (!['www', 'admin', 'app', 'portal', 'api'].includes(sub)) {
      return sub;
    }
  } else if (hostname.includes('localhost') && parts.length > 1) {
    const sub = parts[0].toLowerCase();
    if (!['www', 'admin', 'app', 'portal', 'api', 'localhost'].includes(sub)) {
      return sub;
    }
  }
  return null;
};

function AppContent() {
  const location = useLocation();
  const subdomain = getSubdomain();

  if (subdomain && (location.pathname === '/' || location.pathname === '/turnos')) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header showSearch={false} />
        <main style={{ flex: 1, minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={<LoadingFallback />}>
            <BusinessProfileRouter overrideSlug={subdomain} />
          </Suspense>
        </main>
        <Footer />
        <Toast />
        <ConfirmDialog />
        <AlertDialog />
      </div>
    );
  }

  const isHome = location.pathname === '/';
  const isBusinessPortal = location.pathname.startsWith('/portal');
  const isAdmin = location.pathname.startsWith('/admin');
  const isPublicRoute = ['/', '/ayuda', '/negocios', '/colaboradores', '/for-business', '/help'].includes(location.pathname) || location.pathname.endsWith('/turnos');
  const isLinkBio = !isAdmin && !isBusinessPortal && !isPublicRoute;

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAdmin && !isLinkBio && !isBusinessPortal && <Header showSearch={isHome} />}

      <main style={{ flex: 1, minHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/ayuda" element={<Ayuda />} />
              <Route path="/negocios" element={<Negocios />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              {/* Static routes must come BEFORE /:businessSlug to take precedence */}
              <Route path="/login" element={<SellerLogin />} />
              <Route path="/portal" element={<BusinessPortal />} />
              <Route path="/business-portal" element={<BusinessPortal />} />
              {/* Keep old routes temporarily for compatibility if needed, or remove them */}
              <Route path="/:businessSlug" element={<LinkBio />} />
              <Route path="/:businessSlug/turnos" element={<BusinessProfileRouter />} />
              <Route path="/admin" element={<Navigate to="/login" replace />} />
              <Route path="/admin/login" element={<Navigate to="/login" replace />} />

              {/* Admin Portal Routes (Sellers + Super Admin) */}
              <Route path="/admin/super" element={<Suspense fallback={<LoadingFallback />}><SuperAdminDashboard /></Suspense>} />
              <Route path="/admin/dashboard" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerDashboard /></ProtectedSellerRoute></Suspense>} />
              <Route path="/admin/businesses" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessList /></ProtectedSellerRoute></Suspense>} />
              <Route path="/admin/businesses/new" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessForm /></ProtectedSellerRoute></Suspense>} />
              <Route path="/admin/businesses/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerBusinessForm /></ProtectedSellerRoute></Suspense>} />
              <Route path="/admin/commissions" element={<Suspense fallback={<LoadingFallback />}><ProtectedSellerRoute><SellerCommissionsReport /></ProtectedSellerRoute></Suspense>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isAdmin && !isLinkBio && !isBusinessPortal && <Footer />}

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
