import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

const createPwaPlugin = () =>
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
  });

const androidIndexPlugin = {
  name: 'paymatrix-android-index',
  transformIndexHtml(html) {
    return html
      .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '')
      .replace(
        /\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>/,
        ''
      )
      .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com\/[^\"]+" rel="stylesheet" \/>/, '');
  },
};

export default defineConfig(({ mode }) => {
  const isAndroid = mode === 'android';
  const runtimeAdapter = isAndroid
    ? path.resolve(configDir, '../android app/src/platform/androidRuntime.js')
    : path.resolve(configDir, 'src/platform/webRuntime.js');

  return {
    plugins: [react(), ...(isAndroid ? [androidIndexPlugin] : [createPwaPlugin()])],
    resolve: {
      alias: {
        '#paymatrix-runtime': runtimeAdapter,
        ...(isAndroid
          ? {
              'virtual:pwa-register/react': path.resolve(
                configDir,
                'src/platform/nativePwaRegister.js'
              ),
            }
          : {}),
      },
    },
    server: {
    port: 5145,
    host: true,
    allowedHosts: true,
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/firebase/') || id.includes('\\firebase\\')) return 'vendor-firebase';
            if (id.includes('/framer-motion/') || id.includes('\\framer-motion\\')) {
              return 'vendor-motion';
            }
            if (
              id.includes('/chart.js/') ||
              id.includes('\\chart.js\\') ||
              id.includes('/react-chartjs-2/') ||
              id.includes('\\react-chartjs-2\\')
            ) {
              return 'vendor-charts';
            }
            if (
              id.includes('/jspdf/') ||
              id.includes('\\jspdf\\') ||
              id.includes('/jspdf-autotable/') ||
              id.includes('\\jspdf-autotable\\')
            ) {
              return 'vendor-pdf';
            }
            if (id.includes('/qrcode.react/') || id.includes('\\qrcode.react\\')) {
              return 'vendor-qr';
            }
            return undefined;
          },
        },
      },
    },
    // Test configuration lives in vitest.config.js to avoid loading PWA plugins in Node.
  };
});
