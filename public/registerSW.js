// registerSW.js - Custom registrar
// Unregisters any old SWs and registers the new one with cache-busting

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Get current registration
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const reg of registrations) {
        try {
          const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
          // Unregister any SW that's not the current one
          if (scriptURL && !scriptURL.includes('sw-v')) {
            console.log('[RegisterSW] Unregistering old SW:', scriptURL);
            await reg.unregister();
          }
        } catch (e) {
          console.warn('[RegisterSW] Error checking reg:', e);
        }
      }

      // Clear all caches that are not from the current build
      try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (!name.startsWith('turnitos-')) {
            console.log('[RegisterSW] Deleting old cache:', name);
            await caches.delete(name);
          }
        }
      } catch (e) {
        console.warn('[RegisterSW] Error clearing caches:', e);
      }

      // Find the new SW file (it has a timestamp in the name)
      const indexHtml = await fetch('/').then(r => r.text());
      const swMatch = indexHtml.match(/\/sw-v[\w-]+\.js/);
      if (!swMatch) {
        console.log('[RegisterSW] No new SW file found in HTML, skipping registration');
        return;
      }

      const swUrl = swMatch[0];
      console.log('[RegisterSW] Registering new SW:', swUrl);
      await navigator.serviceWorker.register(swUrl, { scope: '/' });
    } catch (e) {
      console.error('[RegisterSW] Error:', e);
    }
  });
}
