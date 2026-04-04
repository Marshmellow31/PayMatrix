import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { store, persistor } from './redux/store.js';
import App from './App.jsx';
import Loader from './components/common/Loader.jsx';
import './index.css';

// Purge old broken avatar cache entries that stored opaque (status 0) failed responses.
// This runs once at startup on every device, fixing poisoned caches automatically.
if (typeof window !== 'undefined' && 'caches' in window) {
  const STALE_CACHES = ['google-avatars-cache']; // old cache name that cached failures
  Promise.all(
    STALE_CACHES.map(name => caches.delete(name).catch(() => {}))
  ).then(() => {
    // Also purge any slipped-through non-200 entries from the new cache
    caches.open('google-avatars-v2').then(cache => {
      cache.keys().then(keys => {
        keys.forEach(req => {
          cache.match(req).then(res => {
            if (!res || res.status !== 200) {
              cache.delete(req).catch(() => {});
            }
          });
        });
      });
    }).catch(() => {});
  }).catch(() => {});
}

// Register Service Worker
registerSW({ immediate: true });

// App-like behaviors: Disable context menu and specific gestures
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, false);

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return;
  }, { passive: true });
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
