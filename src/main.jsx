import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './index.css'
import 'leaflet/dist/leaflet.css';
import App from './App.jsx'

// Automatically reload if a dynamic chunk fails to load due to a new deployment release
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected, reloading to fetch latest assets...', event);
  window.location.reload();
});

const BUSINESS_ROUTES = ['/portal', '/business-portal', '/login', '/seller', '/admin'];
const isBusinessPath = (path) => BUSINESS_ROUTES.some(route => path.startsWith(route));

// The app is installable only for businesses: block the browser's install banner on public pages
window.addEventListener('beforeinstallprompt', (event) => {
  if (!isBusinessPath(window.location.pathname)) event.preventDefault();
});

// Register Service Worker for PWA ONLY on business/seller/admin routes
if ('serviceWorker' in navigator) {
  const isBusinessRoute = isBusinessPath(window.location.pathname);

  if (isBusinessRoute) {
    // Inject PWA manifest only for business routes
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.webmanifest';
    document.head.appendChild(manifestLink);

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw-v2.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    });
  } else {
    // For regular users: unregister any existing SW to remove PWA behavior
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(async reg => {
        const scriptURL = reg.active?.scriptURL || '';
        // Old Firebase messaging worker: replaced by Web Push in sw-v2
        if (scriptURL.includes('firebase-messaging-sw')) {
          reg.unregister();
          return;
        }
        if (scriptURL.includes('sw-v2')) {
          // Keep it on devices that receive booking alerts: unregistering drops the subscription
          const subscription = await reg.pushManager?.getSubscription().catch(() => null);
          if (!subscription) reg.unregister();
        }
      });
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
