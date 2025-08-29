import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/tdd-london-school-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../frontend/src'),
    },
  },
});