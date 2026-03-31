import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

import { db } from './db.js';

// Request interceptor — attach token & handle offline cache
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('paymatrix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Intercept purely network GET requests if offline
    if (!navigator.onLine && config.method === 'get') {
      try {
        const cached = await db.apiCache.get(config.url);
        if (cached) {
          console.log('[Offline Cache Hit]:', config.url);
          // Mock Axios Adapter to resolve the cache instantly without throwing NetworkError
          config.adapter = async () => ({
            data: cached.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            request: {}
          });
        }
      } catch (err) {
        console.error('Offline Cache error:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & cache incoming data
api.interceptors.response.use(
  async (response) => {
    // Persist all successful GET requests instantly
    if (response.config.method === 'get' && response.status >= 200 && response.status < 300) {
      try {
        await db.apiCache.put({ url: response.config.url, data: response.data, timestamp: Date.now() });
      } catch (err) { }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('paymatrix_token');
      localStorage.removeItem('paymatrix_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
