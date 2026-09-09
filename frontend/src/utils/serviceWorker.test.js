import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const events = {};
  const routes = [];
  const shell = vi.fn(() => Promise.resolve('cached release HTML'));
  const clients = { matchAll: vi.fn(() => Promise.resolve([])), openWindow: vi.fn() };
  const context = {
    URL,
    console,
    clients,
    self: {
      location: { origin: 'https://pay-matrix.vercel.app' },
      __WB_MANIFEST: [],
      addEventListener: (name, fn) => {
        events[name] = fn;
      },
    },
    precacheAndRoute: vi.fn(),
    cleanupOutdatedCaches: vi.fn(),
    clientsClaim: vi.fn(),
    createHandlerBoundToURL: () => shell,
    NavigationRoute: class {
      constructor(handler, options) {
        this.handler = handler;
        this.options = options;
      }
    },
    registerRoute: (...args) => routes.push(args),
    CacheFirst: class {},
    StaleWhileRevalidate: class {},
    ExpirationPlugin: class {},
    CacheableResponsePlugin: class {},
  };
  const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(source.replace(/^import .*;\r?\n/gm, ''), context);
  return { events, routes, shell, clients };
}

describe('installed service worker', () => {
  it('serves a deep navigation from the installed shell without a network strategy', async () => {
    const { routes, shell } = worker();
    const navigation = routes[0][0];
    expect(await navigation.handler({ request: { url: '/groups/trip' } })).toBe(
      'cached release HTML'
    );
    expect(shell).toHaveBeenCalledOnce();
    expect(navigation.options.denylist.some((pattern) => pattern.test('/api/scan-bill'))).toBe(
      true
    );
  });
  it('awaits navigation before focusing an existing notification window', async () => {
    const { events, clients } = worker();
    const order = [];
    clients.matchAll.mockResolvedValue([
      {
        url: 'https://pay-matrix.vercel.app/dashboard',
        navigate: (url) => {
          order.push(url);
          return Promise.resolve({ focus: () => Promise.resolve(order.push('focus')) });
        },
        focus: vi.fn(),
      },
    ]);
    let done;
    events.notificationclick({
      notification: { close() {}, data: { type: 'friend_request' } },
      waitUntil: (promise) => {
        done = promise;
      },
    });
    await done;
    expect(order).toEqual(['https://pay-matrix.vercel.app/friends', 'focus']);
  });
  it('opens a safe fallback for external notification URLs', async () => {
    const { events, clients } = worker();
    let done;
    events.notificationclick({
      notification: { close() {}, data: { url: 'https://evil.test' } },
      waitUntil: (promise) => {
        done = promise;
      },
    });
    await done;
    expect(clients.openWindow).toHaveBeenCalledWith('https://pay-matrix.vercel.app/dashboard');
  });
});
