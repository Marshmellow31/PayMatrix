import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import store from './redux/store.js';
import App from './App.jsx';
import './index.css';

// Register Service Worker
registerSW({ immediate: true });

// App-like behaviors: Disable context menu and specific gestures
if (typeof window !== 'undefined') {
  // 1. Disable long-press context menu (link previews, save image, etc)
  window.addEventListener('contextmenu', (e) => {
    // Exception: Let inputs/textareas have context menus if needed, or just block all
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, false);

  // 2. Mitigate edge-swipe navigation (mostly for iOS)
  // Note: True blocking of system-level back gesture is limited in browsers,
  // but we can prevent some touch-start behaviors at the edges.
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return; // Allow pinch (though disabled in meta)
    
    // If touch starts very close to the edge, we can't reliably block the system-level 
    // back gesture in all browsers, but overscroll-behavior: none handles 90% of it.
  }, { passive: true });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
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
    </Provider>
  </React.StrictMode>
);
