/**
 * Vitest Configuration for London School TDD Draft Modal Workflow Tests
 * Optimized for mock-driven behavior verification and interaction testing
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'London School TDD - Draft Modal Workflow',
    
    // Test environment
    environment: 'jsdom',
    
    // Test file patterns
    include: [
      'tests/tdd-london-school/draft-modal-workflow/**/*.test.{ts,tsx}'
    ],
    
    // Setup files
    setupFiles: [
      'tests/tdd-london-school/draft-modal-workflow/setup.ts'
    ],
    
    // Global configuration
    globals: true,
    
    // Coverage configuration (focused on interaction patterns)
    coverage: {
      include: [
        'src/components/DraftManager.tsx',
        'src/components/PostCreatorModal.tsx', 
        'src/hooks/useDraftManager.ts',
        'src/services/DraftService.ts'
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/tests/**'
      ],
      
      // Coverage thresholds for London School TDD
      thresholds: {
        // London School focuses on behavior over coverage percentages
        branches: 80,
        functions: 85,
        lines: 80,
        statements: 80
      },
      
      reporter: ['text', 'html', 'json']
    },
    
    // Mock configuration for London School approach
    clearMocks: true,
    restoreMocks: true,
    
    // Timeout for async interactions
    testTimeout: 10000,
    
    // Reporters for interaction analysis
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: 'test-results/london-school-draft-modal-junit.xml'
    },
    
    // Error handling for async tests
    isolate: true,
    
    // Watch mode configuration
    watch: false
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
    },
  },
  
  define: {
    global: 'globalThis',
  }
});