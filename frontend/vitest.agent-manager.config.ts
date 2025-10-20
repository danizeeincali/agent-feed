/**
 * Vitest Configuration for Agent Manager Frontend Tests
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'Agent Manager Frontend',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      './src/tests/unit/WorkingAgentProfile.test.tsx',
      './src/tests/unit/toolDescriptions.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/agent-manager',
      include: [
        'src/components/WorkingAgentProfile.tsx',
        'src/constants/toolDescriptions.ts'
      ],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ]
    },
    reporters: ['default', 'html'],
    outputFile: {
      html: './tests/reports/agent-manager-frontend-tests.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
