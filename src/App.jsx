import React, { lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { NotificationProvider } from './contexts/NotificationContext';
import Toast from './components/notifications/Toast';
import ConfirmDialog from './components/notifications/ConfirmDialog';
import AlertDialog from './components/notifications/AlertDialog';
import Header from './components/Header';
import Footer from './components/Footer';
import PageLoader from './components/common/PageLoader';

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
const LoadingFallback = () => <PageLoader />;

// Warm up the chunks of the most visited pages once the browser is idle,
// so opening a business from the home doesn't wait on a network round trip.
const prefetchCommonPages = () => {
  const run = () => {
    import('./pages/BusinessProfileRouter');
    import('./pages/BusinessStore');
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
};

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

// Scroll position per history entry, so going back lands where the user was
const scrollPositions = new Map();

// Saved position on back/forward, top otherwise. Read it as soon as the
// location changes: once the old page unmounts, the browser clamps the scroll
// and that event would overwrite the saved value.
const getScrollTarget = (key, navigationType) =>
  (navigationType === 'POP' && scrollPositions.get(key)) || 0;

// Retries for a moment because the page may still be loading its data.
const applyScroll = (target) => {
  if (!target) {
    window.scrollTo(0, 0);
    return;
  }

  let cancelled = false;
  const cancel = () => { cancelled = true; };
  const stopListening = () => {
    window.removeEventListener('wheel', cancel);
    window.removeEventListener('touchstart', cancel);
  };
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });

  const start = performance.now();
  const attempt = () => {
    if (cancelled) return stopListening();
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.min(target, Math.max(maxY, 0)));
    if (maxY < target && performance.now() - start < 1500) requestAnimationFrame(attempt);
    else stopListening();
  };
  attempt();
};

function useScrollMemory() {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    const key = location.key;
    const save = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [location.key]);
}

// A business page and its /turnos alias render the same screen: keep one key
// so switching between them doesn't remount and refetch everything.
const getRouteKey = (pathname) => pathname.replace(/\/turnos\/?$/, '') || '/';

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }
};

function AppContent() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const subdomain = getSubdomain();
  const routeKey = getRouteKey(location.pathname);

  useScrollMemory();

  useEffect(() => {
    prefetchCommonPages();
  }, []);

  // Scroll is applied once the old page has faded out, so it never jumps while
  // still visible. Without a page change (same key) it applies right away.
  const pendingScroll = useRef(0);
  const prevRoute = useRef({ pathname: location.pathname, routeKey });

  useEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = { pathname: location.pathname, routeKey };
    // Query-only changes (home filters, search) keep the scroll as is
    if (prev.pathname === location.pathname) return;
    pendingScroll.current = getScrollTarget(location.key, navigationType);
    if (prev.routeKey === routeKey || subdomain) applyScroll(pendingScroll.current);
  }, [location.key, location.pathname, navigationType, routeKey, subdomain]);

  const handleExitComplete = useCallback(() => {
    applyScroll(pendingScroll.current);
  }, []);

  const isHome = location.pathname === '/';
  const isBusinessPortal = location.pathname.startsWith('/portal');
  const isAdmin = location.pathname.startsWith('/admin');
  const isLinkBio = (subdomain && location.pathname === '/') || location.pathname.endsWith('/bio');
  const isBusinessPage = isLinkBio || location.pathname.endsWith('/turnos') || location.pathname.endsWith('/tienda') || (subdomain && (location.pathname === '/' || location.pathname === '/turnos' || location.pathname === '/tienda'));

  if (subdomain && (location.pathname === '/' || location.pathname === '/turnos' || location.pathname === '/tienda')) {
    const isBio = location.pathname === '/';
    return (
      <div className="app-container" style={{ 
        minHeight: '100dvh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)'
      }}>
        <main style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          alignItems: 'center'
        }}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              {location.pathname === '/tienda' ? (
                 <BusinessStore overrideSlug={subdomain} />
              ) : isBio ? (
                <LinkBio overrideSlug={subdomain} />
              ) : (
                <BusinessProfileRouter overrideSlug={subdomain} />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
        {/* On the business's own link: no TurnitosLR banner, only the small footer */}
        <Footer minimal={true} />
        <Toast />
        <ConfirmDialog />
        <AlertDialog />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ 
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--bg-main)'
    }}>
      {!isAdmin && !isLinkBio && !isBusinessPortal && <Header showSearch={isHome} />}

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%'
      }}>
        <ErrorBoundary>
          <AnimatePresence mode="wait" initial={false} onExitComplete={handleExitComplete}>
            <motion.div
              key={routeKey}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}
            >
            <Suspense fallback={<LoadingFallback />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="/negocios" element={<Negocios />} />
                <Route path="/terminos" element={<Terminos />} />
                <Route path="/privacidad" element={<Privacidad />} />
                {/* Static routes must come BEFORE /:businessSlug to take precedence */}
                <Route path="/login" element={<SellerLogin />} />
                <Route path="/portal" element={<BusinessPortal />} />
                <Route path="/business-portal" element={<BusinessPortal />} />
                <Route path="/calificar/:token" element={<SubmitReview />} />
                <Route path="/review/:token" element={<SubmitReview />} />
                {/* /:businessSlug now goes directly to the reservation / booking page */}
                {/* One route for both URLs so moving between them keeps the page mounted */}
                <Route path="/:businessSlug/turnos?" element={<BusinessProfileRouter />} />
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
            </Suspense>
            </motion.div>
          </AnimatePresence>
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

export default function App() {
  return (
    <Router>
      <MotionConfig reducedMotion="user">
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </MotionConfig>
    </Router>
  );
}
