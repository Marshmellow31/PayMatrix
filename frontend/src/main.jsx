import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './redux/store.js';
import App from './App.jsx';
import Loader from './components/common/Loader.jsx';
import './index.css';

// Development environment cleanup: prevent service workers from intercepting localhost/HMR
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}

// Purge obsolete cache buckets across versions
if (typeof window !== 'undefined' && 'caches' in window) {
  [
    'google-avatars-cache',
    'google-avatars-v2',
    'paymatrix-lazy-scripts-v1',
    'paymatrix-navigation-v2',
  ].forEach((name) => caches.delete(name).catch(() => {}));
}

// The Service Worker is registered and managed by PwaUpdatePrompt.jsx
// inside the React component tree to provide a smooth update UI.

// App-like behaviors: Disable context menu and specific gestures
if (typeof window !== 'undefined') {
  window.addEventListener(
    'contextmenu',
    (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    },
    false
  );

  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) return;
    },
    { passive: true }
  );

  // Self-healing: if an outdated cached index.html or service worker fails to load chunks,
  // unregister service workers, clear caches, and reload the fresh deployment.
  const triggerSelfHealing = () => {
    const key = 'pm_auto_recovery_ts';
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (!last || now - parseInt(last, 10) > 15000) {
      sessionStorage.setItem(key, String(now));
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.unregister());
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  };

  // Vite specific chunk reload hook
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerSelfHealing();
  });

  // Global window error hook (e.g. dynamic import MIME type failure, missing stylesheet/script)
  window.addEventListener(
    'error',
    (e) => {
      const msg = e && e.message ? String(e.message) : '';
      const target = e && e.target;
      const isChunkOrMimeError =
        msg.includes('Expected a JavaScript-or-Wasm module script') ||
        msg.includes('Strict MIME type') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        (target &&
          target.tagName === 'LINK' &&
          target.rel === 'stylesheet' &&
          target.href &&
          target.href.includes('/assets/')) ||
        (target && target.tagName === 'SCRIPT' && target.src && target.src.includes('/assets/'));
      if (isChunkOrMimeError) {
        triggerSelfHealing();
      }
    },
    true
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#2a2a2a',
                color: '#e5e2e1',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: { primary: '#ffffff', secondary: '#1a1c1c' },
              },
              error: {
                iconTheme: { primary: '#ffb4ab', secondary: '#690005' },
              },
            }}
          />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
