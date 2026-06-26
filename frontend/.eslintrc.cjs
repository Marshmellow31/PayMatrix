/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022:  true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',        // React 17+ — no need to import React
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'public'],
  parserOptions: {
    ecmaVersion:    'latest',
    sourceType:     'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['react-refresh'],
  rules: {
    // ─── React ────────────────────────────────────────────────────────────
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'react/prop-types': 'off',           // TypeScript migration will add types
    'react/display-name': 'off',

    // ─── Security / Quality ───────────────────────────────────────────────
    'no-console':          ['warn', { allow: ['warn', 'error'] }],
    'no-debugger':         'error',
    'no-unused-vars':      ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var':              'error',
    'prefer-const':        'warn',
    'eqeqeq':             ['error', 'always', { null: 'ignore' }],
    'no-implicit-globals': 'error',

    // ─── Async safety ─────────────────────────────────────────────────────
    'no-async-promise-executor': 'error',
    'no-await-in-loop':          'warn',  // prefer Promise.all
    'require-await':             'warn',
  },
};
