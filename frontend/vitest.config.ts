import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts', 
      'tests/mock-server/**/*.test.ts'
    ],
    exclude: [
      'tests/e2e/**/*',
      'node_modules/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/tests/setup.ts',
        'tests/',
        'dist/'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 1000,
    isolate: true,
    pool: 'forks'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});