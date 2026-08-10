const browserGlobals = {
  document: 'readonly',
  window: 'readonly',
  fetch: 'readonly',
  requestAnimationFrame: 'readonly',
  URL: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'private/**', 'local-fixtures/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': 'error',
    },
  },
  {
    files: ['test/**/*.js', 'e2e/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { structuredClone: 'readonly', URL: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': 'error',
    },
  },
];
