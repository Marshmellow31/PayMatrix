import { defineConfig } from 'vitest/config';

/**
 * Standalone Vitest config — kept separate from vite.config.js so the test
 * runner doesn't have to load PWA/browser plugins that don't run in Node.
 */
export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    include:     ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/utils/**', 'src/services/validationService.js'],
    },
  },
});
