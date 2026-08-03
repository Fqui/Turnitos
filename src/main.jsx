import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css';
import App from './App.jsx'

// Register Service Worker for PWA ONLY on business/seller/admin routes
if ('serviceWorker' in navigator) {
  const path = window.location.pathname;
  const isBusinessRoute = path.startsWith('/portal') || path.startsWith('/seller') || path.startsWith('/admin');

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
      // Only unregister the main SW, keep firebase-messaging-sw if present
      registrations.forEach(reg => {
        if (reg.active && reg.active.scriptURL.includes('sw-v2')) {
          reg.unregister();
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
