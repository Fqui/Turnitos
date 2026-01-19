import React, { lazy, Suspense } from 'react';
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
const LinkBio = lazy(() => import('./pages/LinkBio'));
const Admin = lazy(() => import('./pages/Admin'));
const BusinessPortal = lazy(() => import('./pages/BusinessPortal'));
const Ayuda = lazy(() => import('./pages/Ayuda'));
const Negocios = lazy(() => import('./pages/Negocios'));

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
    height: '100vh',
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

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isBusinessPortal = location.pathname.startsWith('/portal');
  const isAdmin = location.pathname.startsWith('/admin');
  // Determine if it's a LinkBio page (e.g. /my-business) but EXCLUDE known public routes
  const isPublicRoute = ['/', '/ayuda', '/negocios', '/for-business', '/help'].includes(location.pathname) || location.pathname.endsWith('/turnos');
  const isLinkBio = !isAdmin && !isBusinessPortal && !isPublicRoute;

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAdmin && !isLinkBio && !isBusinessPortal && <Header showSearch={isHome} />}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/ayuda" element={<Ayuda />} />
              <Route path="/negocios" element={<Negocios />} />
              {/* Keep old routes temporarily for compatibility if needed, or remove them */}
              <Route path="/:businessSlug" element={<LinkBio />} />
              <Route path="/:businessSlug/turnos" element={<BusinessProfile />} />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="/portal" element={<BusinessPortal />} />
              <Route path="/business-portal" element={<BusinessPortal />} />

              {/* Admin Portal Routes (Sellers + Super Admin) */}
              <Route path="/admin/login" element={<SellerLogin />} />
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

export default function App() {
  return (
    <Router>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </Router>
  );
}
