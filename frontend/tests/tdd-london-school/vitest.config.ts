import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'TDD London School',
    environment: 'jsdom',
    setupFiles: ['./setup-tests.ts'],
    include: [
      './**/*.test.{ts,tsx}',
      './**/*.spec.{ts,tsx}'
    ],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        '../../src/**/*.{ts,tsx}'
      ],
      exclude: [
        '../../src/**/*.d.ts',
        '../../src/main.tsx',
        '../../src/vite-env.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@components': resolve(__dirname, '../../src/components'),
      '@utils': resolve(__dirname, '../../src/utils'),
      '@api': resolve(__dirname, '../../src/api')
    }
  }
});