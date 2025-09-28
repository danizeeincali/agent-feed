/**
 * Jest Environment Variables Setup for Regression Tests
 */

// Set Node environment for tests
process.env.NODE_ENV = 'test';

// Set test URLs
process.env.FRONTEND_URL = 'http://localhost:3003';
process.env.BACKEND_URL = 'http://localhost:3000';

// Disable Next.js telemetry during tests
process.env.NEXT_TELEMETRY_DISABLED = '1';

// Set timezone for consistent test results
process.env.TZ = 'UTC';

// Mock environment variables that might be needed
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

// Disable CSS extraction warnings
process.env.DISABLE_CSS_EXTRACTION_WARNING = '1';