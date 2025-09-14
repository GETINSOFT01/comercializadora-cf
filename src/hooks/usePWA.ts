import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  isLoading: boolean;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => void;
  checkForUpdates: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    isLoading: true,
  });

  const { enqueueSnackbar } = useSnackbar();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Listeners para eventos PWA
  useEffect(() => {
    // Listener para instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setState(prev => ({ ...prev, isInstallable: true }));
      console.log('[PWA] App is now installable');
    };

    // Listener para cambios de conectividad
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    // Listener para cuando la app se instala
    const handleAppInstalled = () => {
      setState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setDeferredPrompt(null);
      enqueueSnackbar('¡Aplicación instalada correctamente!', { variant: 'success' });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [enqueueSnackbar]);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      setRegistration(reg);

      // Verificar si hay una actualización disponible
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, hasUpdate: true }));
              enqueueSnackbar('Nueva versión disponible', {
                variant: 'info',
                persist: true,
              });
            }
          });
        }
      });

      // Verificar si ya está instalado
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setState(prev => ({ ...prev, isInstalled: true }));
      }

      setState(prev => ({ ...prev, isLoading: false }));
      console.log('[PWA] Service Worker registrado correctamente');
    } catch (error) {
      console.error('[PWA] Error registrando Service Worker:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      enqueueSnackbar('La instalación no está disponible', { variant: 'warning' });
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        enqueueSnackbar('Instalando aplicación...', { variant: 'info' });
      } else {
        enqueueSnackbar('Instalación cancelada', { variant: 'info' });
      }
      
      setDeferredPrompt(null);
      setState(prev => ({ ...prev, isInstallable: false }));
    } catch (error) {
      console.error('[PWA] Error durante la instalación:', error);
      enqueueSnackbar('Error durante la instalación', { variant: 'error' });
    }
  }, [deferredPrompt, enqueueSnackbar]);

  const updateApp = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  const checkForUpdates = useCallback(() => {
    if (registration) {
      registration.update();
    }
  }, [registration]);

  return {
    ...state,
    installApp,
    updateApp,
    checkForUpdates,
  };
}

// Hook para detectar si la app está offline
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

// Utilidad para verificar si es PWA
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}
