import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone Vitest config — kept separate from vite.config.js so the test
 * runner doesn't have to load PWA/browser plugins that don't run in Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      '#paymatrix-runtime': path.resolve(configDir, 'src/platform/webRuntime.js'),
    },
  },
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
