import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AuthProvider } from './lib/firebase/AuthContext';
import { registerSW } from 'virtual:pwa-register';
import { patchGlobalJsonStringify } from './lib/safeJson';
import './index.css';

// Apply global JSON circular reference protection
patchGlobalJsonStringify();

// Silence benign Vite websocket connection notices in container iframe preview
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const text = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (text.includes('[vite]') && (text.includes('websocket') || text.includes('failed to connect') || text.includes('WebSocket'))) {
      return;
    }
    originalError.apply(console, args);
  };
}

// Force service worker refresh, monitor updates, and notify user
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

    const notifyUpdateAvailable = () => {
      console.log('[PWA] Wykryto nową wersję aplikacji Kapi-Studio! Zgłaszanie powiadomienia do UI...');
      
      // Dispatch custom event for PWAUpdateBanner and UI listeners
      window.dispatchEvent(
        new CustomEvent('pwa-update-available', {
          detail: {
            updateSW: async () => {
              try {
                if (updateSW) {
                  await updateSW(true);
                } else {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg?.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                  window.location.reload();
                }
              } catch {
                window.location.reload();
              }
            }
          }
        })
      );

      // Trigger studio toast notification
      if (typeof (window as any).showStudioToast === 'function') {
        (window as any).showStudioToast('Wykryto nową wersję Kapi-Studio! Kliknij baner, aby załadować ulepszenia.', 'info');
      }
    };

    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        notifyUpdateAvailable();
      },
      onOfflineReady() {
        console.log('[PWA] Aplikacja jest gotowa do pracy w trybie offline.');
        if (typeof (window as any).showStudioToast === 'function') {
          (window as any).showStudioToast('Kapi-Studio jest gotowe do pracy offline (PWA)', 'success');
        }
      },
      onRegisteredSW(swScriptUrl, registration) {
        console.log('[PWA] Service Worker pomyślnie zarejestrowany:', swScriptUrl);
        if (registration) {
          // Force immediate update check on startup
          registration.update().catch((err) => {
            console.debug('[PWA] Błąd sprawdzania aktualizacji przy rejestracji:', err);
          });

          // Check if there is already a waiting service worker
          if (registration.waiting) {
            notifyUpdateAvailable();
          }

          // Monitor for future service worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  notifyUpdateAvailable();
                }
              });
            }
          });
        }
      },
    });

    // Explicit function to check for updates programmatically
    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            notifyUpdateAvailable();
          }
        }
      } catch (e) {
        console.debug('[PWA] Sprawdzanie aktualizacji:', e);
      }
    };

    // Global hooks for manual trigger or settings panel
    (window as any).checkForAppUpdate = checkForUpdates;
    (window as any).forceRefreshServiceWorker = async () => {
      if (updateSW) {
        await updateSW(true);
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      }
    };

    // Initial check right after load
    checkForUpdates();

    // Periodically check for updates every 15 minutes
    setInterval(checkForUpdates, 15 * 60 * 1000);

    // Check when user returns to tab / app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });

    // Check when network connection is restored
    window.addEventListener('online', () => {
      checkForUpdates();
    });

    // Listen for controllerchange so the page reloads cleanly once the new SW activates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Nowy Service Worker przejął kontrolę. Przeładowywanie aplikacji...');
        window.location.reload();
      }
    });
  } catch (err) {
    console.warn('Nie udało się zarejestrować Service Workera:', err);
  }
}

// Global safe-guard against cross-origin script error masking, circular error serialization, and unhandled network/abort errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const filename = event.filename || '';
    if (
      msg === 'Script error.' || 
      !event.filename || 
      msg.includes('WebSocket') ||
      msg.includes('[vite]') ||
      msg.includes('closed without opened') ||
      filename.includes('@vite/client') ||
      msg.includes('circular structure') || 
      msg.includes('Aborted due to close') ||
      msg.includes('close()') ||
      (event.target && (event.target as any).tagName === 'VIDEO')
    ) {
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    const isAbort = 
      reason?.name === 'AbortError' || 
      msg.includes('Aborted due to close') || 
      msg.includes('close()') ||
      msg.toLowerCase().includes('aborted');

    if (
      isAbort ||
      msg.includes('WebSocket') ||
      msg.includes('[vite]') ||
      msg.includes('closed without opened') ||
      msg.includes('Script error') || 
      msg.includes('the client is offline') || 
      msg.includes('unavailable') || 
      msg.includes('Failed to fetch') ||
      msg.includes('circular structure')
    ) {
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
