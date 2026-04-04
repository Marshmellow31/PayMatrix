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

// Purge ALL old avatar caches from the service worker.
// Avatars are no longer SW-cached (cross-origin opaque responses caused failures).
if (typeof window !== 'undefined' && 'caches' in window) {
  ['google-avatars-cache', 'google-avatars-v2'].forEach(name =>
    caches.delete(name).catch(() => {})
  );
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
