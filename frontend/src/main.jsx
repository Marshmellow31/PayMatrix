import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { syncManager } from './services/syncManager.js';
import store from './redux/store.js';
import App from './App.jsx';
import './index.css';

// Register Service Worker
registerSW({ immediate: true });

// Initialize Sync Manager
syncManager.init();

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
