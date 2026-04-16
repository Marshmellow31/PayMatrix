import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: Workbox injects the precache manifest into our custom sw.js.
      // This is required to add FCM push event handling while keeping all
      // offline caching behaviour (precaching, SPA fallback, Fonts) intact.
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'logo.png'],
      manifest: {
        name: 'PayMatrix',
        short_name: 'PayMatrix',
        description: 'Smart Expense Sharing — Simplified.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        // Capture navigations: tells the browser to open matching URLs
        // inside the installed PWA instead of a new browser tab.
        handle_links: 'preferred',
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      // In injectManifest mode, the precache manifest config goes under `injectManifest`.
      // The HOW (caching strategies, navigateFallback, etc.) is written in public/sw.js.
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5080,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
