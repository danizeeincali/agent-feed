/**
 * Environment Setup for CI
 * Sets up environment variables and configurations for CI runs
 */

// Core environment variables
process.env.NODE_ENV = 'test';
process.env.CI = 'true';
process.env.VITEST = 'true';

// Disable WebSocket connections in CI
process.env.DISABLE_WEBSOCKETS = 'true';

// Mock API endpoints for CI
process.env.MOCK_API_ENDPOINTS = 'true';

// Disable real-time features in CI
process.env.DISABLE_REAL_TIME = 'true';

// Set fixed timezone for consistent test results
process.env.TZ = 'UTC';

// Memory and performance settings
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Debug settings
process.env.DEBUG_PRINT_LIMIT = '0';

// Test-specific configurations
process.env.COST_TRACKING_STORAGE_KEY = 'ci-test-storage';
process.env.BUDGET_LIMITS_DAILY = '10.0';
process.env.BUDGET_LIMITS_WEEKLY = '50.0';
process.env.BUDGET_LIMITS_MONTHLY = '200.0';

// Mock external services
process.env.MOCK_CLAUDE_API = 'true';
process.env.MOCK_ANALYTICS_API = 'true';

// Disable analytics tracking in tests
process.env.DISABLE_ANALYTICS = 'true';

// Set predictable IDs for testing
process.env.USE_DETERMINISTIC_IDS = 'true';