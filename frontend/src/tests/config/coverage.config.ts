/**
 * Coverage Configuration for Claude SDK Analytics Tests
 * Defines coverage thresholds and reporting settings
 */

export const coverageConfig = {
  // Coverage provider
  provider: 'v8' as const,

  // Output directories
  reportsDirectory: './coverage',
  tempDirectory: './coverage/tmp',

  // Report formats
  reporter: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'clover',
    'cobertura'
  ],

  // Files to include in coverage
  include: [
    'src/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/components/**/*.{tsx,ts}',
    'src/utils/**/*.{ts,tsx}'
  ],

  // Files to exclude from coverage
  exclude: [
    'node_modules/**',
    'src/tests/**',
    'src/**/*.d.ts',
    'src/**/*.config.*',
    'src/**/*.stories.{ts,tsx}',
    'src/main.tsx',
    'src/vite-env.d.ts',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.nuxt/**',
    '**/test-results/**',
    '**/playwright-report/**'
  ],

  // Global coverage thresholds
  thresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },

    // Specific thresholds for critical components
    'src/services/cost-tracking/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },

    'src/components/posting-interface/': {
      branches: 85,
      functions: 90,
      lines: 92,
      statements: 92
    },

    'src/components/TokenCostAnalytics.tsx': {
      branches: 75, // Lower due to disabled state
      functions: 80,
      lines: 85,
      statements: 85
    },

    'src/utils/': {
      branches: 88,
      functions: 92,
      lines: 94,
      statements: 94
    }
  },

  // Additional configuration options
  all: true, // Include all files, even those not touched by tests
  clean: true, // Clean coverage directory before running
  cleanOnRerun: true, // Clean on watch mode reruns

  // Watermarks for HTML report
  watermarks: {
    statements: [80, 95],
    functions: [80, 95],
    branches: [75, 90],
    lines: [80, 95]
  }
};

export default coverageConfig;