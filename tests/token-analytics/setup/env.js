/**
 * Environment Configuration for Token Analytics Tests
 * Sets up test environment with strict validation
 */

// Prevent accidental use of development/mock data
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️  Running token analytics tests in development mode');
}

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TZ = 'UTC';

// Initialize test counters
global.__FAKE_DATA_VIOLATIONS__ = [];
global.__REAL_DATA_VALIDATIONS__ = 0;
global.__API_CALLS_TRACKED__ = 0;

// Override console methods to detect fake data mentions
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  if (/fake|mock|dummy|stub/i.test(message) && /token|cost|price/i.test(message)) {
    global.__FAKE_DATA_VIOLATIONS__.push(`Console.log: ${message}`);
  }
  return originalConsoleLog.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (/fake|mock|dummy|stub/i.test(message) && /token|cost|price/i.test(message)) {
    global.__FAKE_DATA_VIOLATIONS__.push(`Console.warn: ${message}`);
  }
  return originalConsoleWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (/fake|mock|dummy|stub/i.test(message) && /token|cost|price/i.test(message)) {
    global.__FAKE_DATA_VIOLATIONS__.push(`Console.error: ${message}`);
  }
  return originalConsoleError.apply(console, args);
};

// Anthropic API pricing (real values as of 2024)
global.ANTHROPIC_PRICING = {
  'claude-3-opus': {
    input: 0.000015,  // $15 per 1M tokens
    output: 0.000075  // $75 per 1M tokens
  },
  'claude-3-sonnet': {
    input: 0.000003,  // $3 per 1M tokens
    output: 0.000015  // $15 per 1M tokens
  },
  'claude-3-haiku': {
    input: 0.00000025, // $0.25 per 1M tokens
    output: 0.00000125 // $1.25 per 1M tokens
  }
};

// Test database configuration
global.TEST_DB_CONFIG = {
  filename: ':memory:', // Use in-memory database for tests
  driver: 'sqlite3'
};

// API endpoint configuration for testing
global.TEST_API_ENDPOINTS = {
  claude: 'https://api.anthropic.com/v1',
  tokenAnalytics: 'http://localhost:3001/api/token-analytics',
  websocket: 'ws://localhost:3001/api/websockets/token-analytics'
};

// Real-time validation settings
global.VALIDATION_SETTINGS = {
  maxCostVariance: 0.10, // 10% variance allowed for cost calculations
  maxTimeVariance: 5000, // 5 seconds variance for timestamps
  requireRealApiKeys: true,
  failOnFakeData: true,
  trackAllApiCalls: true
};

// Helper function to track real data validations
global.trackRealDataValidation = () => {
  global.__REAL_DATA_VALIDATIONS__++;
};

// Helper function to track API calls
global.trackApiCall = (endpoint, method, tokens, cost) => {
  global.__API_CALLS_TRACKED__++;

  // Store API call data for validation
  if (!global.__API_CALL_DATA__) {
    global.__API_CALL_DATA__ = [];
  }

  global.__API_CALL_DATA__.push({
    endpoint,
    method,
    tokens,
    cost,
    timestamp: Date.now()
  });
};

// Helper function to report fake data violation
global.reportFakeDataViolation = (violation) => {
  global.__FAKE_DATA_VIOLATIONS__.push(violation);

  // Immediately fail the test if configured to do so
  if (global.VALIDATION_SETTINGS.failOnFakeData) {
    throw new Error(`FAKE DATA VIOLATION: ${violation}`);
  }
};