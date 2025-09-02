/**
 * SPARC Test Setup Configuration
 * Sets up global test environment for comprehensive terminal validation
 */

// Increase timeout for real system integration tests
jest.setTimeout(120000);

// Global test configuration
global.SPARC_TEST_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CLEANUP_TIMEOUT: parseInt(process.env.CLEANUP_TIMEOUT) || 5000
};

// Enhanced console logging for test debugging
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalLog(`[${timestamp}] [SPARC-TEST]`, ...args);
};

console.error = (...args) => {
  const timestamp = new Date().toISOString();
  originalError(`[${timestamp}] [SPARC-ERROR]`, ...args);
};

console.warn = (...args) => {
  const timestamp = new Date().toISOString();
  originalWarn(`[${timestamp}] [SPARC-WARN]`, ...args);
};

// Global test utilities
global.SPARC_UTILS = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  formatTestResult: (testName, result, metadata = {}) => ({
    test: testName,
    result,
    timestamp: new Date().toISOString(),
    metadata,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    }
  }),
  
  logTestStart: (testName) => {
    console.log(`🚀 Starting SPARC test: ${testName}`);
  },
  
  logTestComplete: (testName, duration, result) => {
    const icon = result === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} SPARC test completed: ${testName} (${duration}ms) - ${result}`);
  }
};

// Global error handlers for uncaught exceptions during testing
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

console.log('✅ SPARC test environment initialized successfully');
console.log('📊 Test configuration:', global.SPARC_TEST_CONFIG);