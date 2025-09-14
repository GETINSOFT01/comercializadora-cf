// Auto-update Service Worker registration and update handling
// Ensures new SW activates immediately and reloads the app once.

const SW_PATH = '/sw.js';

let reloaded = false;

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);

    // When a new worker is found
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          // If there's an existing controller, a new SW is waiting. Skip waiting.
          if (navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      });
    });

    // Reload the page once the new controller takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    // Periodically check for updates when the tab gains focus
    const checkForUpdate = () => registration.update().catch(() => {});
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });

    // Initial manual update check
    checkForUpdate();
  } catch (err) {
    // Fail silently; app still works without SW
    console.log('[SW] Registration failed:', (err as any)?.message || err);
  }
}

// Auto-run on module import
registerSW();
