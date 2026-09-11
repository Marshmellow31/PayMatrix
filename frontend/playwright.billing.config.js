import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/billing-ui',
  testMatch: '**/*.spec.js',
  use: { baseURL: 'http://127.0.0.1:4174', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    env: { VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED: 'true' },
  },
});
