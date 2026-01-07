import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/portal');
  // Determine if it's a LinkBio page (e.g. /my-business) but EXCLUDE known public routes
  const isPublicRoute = ['/', '/ayuda', '/negocios', '/for-business', '/help'].includes(location.pathname) || location.pathname.endsWith('/turnos');
  const isLinkBio = !isAdmin && !isPublicRoute;

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAdmin && !isLinkBio && <Header showSearch={isHome} />}

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
              <Route path="/admin" element={<Admin />} />
              <Route path="/portal" element={<BusinessPortal />} />
              <Route path="/business-portal" element={<BusinessPortal />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isAdmin && !isLinkBio && <Footer />}

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
