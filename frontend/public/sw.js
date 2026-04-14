/**
 * PayMatrix — Custom Service Worker
 * Strategy: injectManifest (vite-plugin-pwa injects self.__WB_MANIFEST at build time)
 *
 * Guarantees:
 * ✅ Full offline support (precaching + SPA fallback)
 * ✅ Google Fonts cached for 1 year
 * ✅ FCM background push notifications
 * ✅ Notification click → navigates to correct in-app route
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ── 1. Workbox Precaching ──────────────────────────────────────────────────
// self.__WB_MANIFEST is replaced at build time with the full asset manifest.
// Every JS bundle, CSS file, icon, and HTML shell is cached here → app loads
// instantly and works fully offline after first visit.
precacheAndRoute(self.__WB_MANIFEST);

// Remove caches from older SW versions on activation
cleanupOutdatedCaches();

// ── 2. SPA Navigation Fallback ────────────────────────────────────────────
// Any navigation request (page load, refresh, deep link) that isn't a
// precached asset will be served with the cached index.html.
// This is what makes the app fully functional offline for all routes.
const spaHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(spaHandler));

// ── 3. Runtime Caching: Google Fonts ──────────────────────────────────────
// Cache font CSS and font files with a 1-year expiry.
// Inter (used by PayMatrix) will be available offline after first load.
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ── 4. FCM Background Push Handler ───────────────────────────────────────
// This fires when a push message arrives and the app is closed / backgrounded.
// The payload is the FCM message object sent by the Cloud Function.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback for plain-text payloads
    payload = { notification: { title: 'PayMatrix', body: event.data.text() } };
  }

  // FCM structures the payload as: { notification: {...}, data: {...} }
  const notification = payload.notification || {};
  const data         = payload.data         || {};

  const title   = notification.title || 'PayMatrix';
  const options = {
    body:      notification.body || '',
    icon:      '/logo.png',
    badge:     '/logo.png',
    // tag deduplicates: same notificationId → replaces previous rather than stacking
    tag:       data.notificationId || 'paymatrix-push',
    renotify:  true,
    // data is passed through to the notificationclick handler
    data: {
      url: data.url || '/dashboard',
      ...data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 5. Notification Click Handler ────────────────────────────────────────
// When the user taps a push notification, bring PayMatrix to focus and
// navigate to the relevant screen (group detail, friends, etc.).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If there is already a PayMatrix window open, reuse it
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl);
            return;
          }
        }
        // No open window — open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── 6. Notification Close Handler ────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  // Placeholder for analytics (e.g. tracking dismissal rate)
  console.log('[SW] Notification dismissed:', event.notification.tag);
});
