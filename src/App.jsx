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
const BusinessStore = lazy(() => import('./pages/BusinessStore'));

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
          <Suspense fallback={<LoadingFallback />}>
            {location.pathname === '/tienda' ? (
              <BusinessStore overrideSlug={subdomain} />
            ) : location.pathname === '/' ? (
              <LinkBio overrideSlug={subdomain} />
            ) : (
              <BusinessProfileRouter overrideSlug={subdomain} />
            )}
          </Suspense>
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
              {/* /:businessSlug now goes directly to the reservation / booking page */}
              <Route path="/:businessSlug" element={<BusinessProfileRouter />} />
              <Route path="/:businessSlug/turnos" element={<BusinessProfileRouter />} />
              <Route path="/:businessSlug/tienda" element={<BusinessStore />} />
              <Route path="/:businessSlug/bio" element={<LinkBio />} />
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
