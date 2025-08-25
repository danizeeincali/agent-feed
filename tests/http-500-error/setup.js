/**
 * Global Test Setup for HTTP 500 Error Tests
 * Provides common mocks, utilities, and configuration
 */

// Global timeout for all tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Store original console methods for restoration
global.originalConsole = {
  error: originalConsoleError,
  warn: originalConsoleWarn,
  log: originalConsoleLog
};

// Mock console methods globally
console.error = jest.fn((...args) => {
  // Only log actual errors during tests if DEBUG is set
  if (process.env.DEBUG) {
    originalConsoleError(...args);
  }
});

console.warn = jest.fn((...args) => {
  if (process.env.DEBUG) {
    originalConsoleWarn(...args);
  }
});

console.log = jest.fn((...args) => {
  if (process.env.DEBUG) {
    originalConsoleLog(...args);
  }
});

// Global test utilities
global.testUtils = {
  // Create a mock HTTP response
  createMockResponse: (status = 200, data = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: getStatusText(status),
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map([
      ['content-type', 'application/json']
    ])
  }),
  
  // Create a mock error response
  createErrorResponse: (status = 500, error = 'Internal Server Error') => ({
    ok: false,
    status,
    statusText: getStatusText(status),
    json: jest.fn().mockResolvedValue({
      success: false,
      error,
      message: error
    }),
    text: jest.fn().mockResolvedValue(`Error: ${error}`),
    headers: new Map([
      ['content-type', 'application/json']
    ])
  }),
  
  // Create a mock process object
  createMockProcess: (pid = 12345, options = {}) => ({
    pid,
    killed: false,
    stdin: {
      write: jest.fn(),
      end: jest.fn()
    },
    stdout: {
      on: jest.fn(),
      pipe: jest.fn()
    },
    stderr: {
      on: jest.fn(),
      pipe: jest.fn()
    },
    on: jest.fn(),
    kill: jest.fn(),
    send: jest.fn(),
    ...options
  }),
  
  // Create a mock WebSocket
  createMockWebSocket: (readyState = 1) => ({
    readyState, // 1 = OPEN
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    ping: jest.fn(),
    pong: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }),
  
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create a timeout promise for testing timeouts
  createTimeoutPromise: (ms = 1000) => new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  }),
  
  // Generate test error objects
  createNetworkError: (code = 'ECONNREFUSED', message = 'Connection refused') => {
    const error = new Error(message);
    error.code = code;
    return error;
  },
  
  // Simulate random delays
  randomDelay: (min = 100, max = 500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
};

// HTTP status code to text mapping
function getStatusText(status) {
  const statusCodes = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusCodes[status] || 'Unknown Status';
}

// Global error types for testing
global.ErrorTypes = {
  NETWORK: {
    TIMEOUT: { code: 'ECONNABORTED', message: 'Request timeout' },
    REFUSED: { code: 'ECONNREFUSED', message: 'Connection refused' },
    RESET: { code: 'ECONNRESET', message: 'Connection reset' },
    NOT_FOUND: { code: 'ENOTFOUND', message: 'Host not found' },
    UNREACHABLE: { code: 'ENETUNREACH', message: 'Network unreachable' }
  },
  PROCESS: {
    NO_ENTITY: { code: 'ENOENT', message: 'No such file or directory' },
    ACCESS_DENIED: { code: 'EACCES', message: 'Permission denied' },
    NO_MEMORY: { code: 'ENOMEM', message: 'Cannot allocate memory' },
    NO_SPACE: { code: 'ENOSPC', message: 'No space left on device' },
    TOO_MANY_FILES: { code: 'EMFILE', message: 'Too many open files' },
    RESOURCE_BUSY: { code: 'EAGAIN', message: 'Resource temporarily unavailable' }
  },
  PTY: {
    ALLOCATION_FAILED: { code: 'ENOMEM', message: 'PTY allocation failed' },
    NO_DEVICE: { code: 'ENODEV', message: 'No such device' },
    INVALID_ARGUMENT: { code: 'EINVAL', message: 'Invalid argument' }
  }
};

// Common test patterns
global.TestPatterns = {
  // Test a function that should handle errors gracefully
  testErrorHandling: async (fn, expectedError) => {
    try {
      await fn();
      throw new Error('Expected function to throw');
    } catch (error) {
      if (expectedError) {
        expect(error.message).toContain(expectedError);
      }
    }
  },
  
  // Test retry logic with exponential backoff
  testRetryLogic: async (operation, maxRetries = 3) => {
    let attempts = 0;
    const start = Date.now();
    
    try {
      await operation(() => {
        attempts++;
        if (attempts <= maxRetries) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts };
      });
    } catch (error) {
      // Should have made the expected number of attempts
      expect(attempts).toBe(maxRetries + 1);
      
      // Should have taken time due to backoff
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThan(100); // At least some delay
    }
  }
};

// Test data generators
global.TestData = {
  // Generate random error scenarios
  generateErrorScenario: () => {
    const scenarios = [
      { status: 500, error: 'Internal Server Error' },
      { status: 502, error: 'Bad Gateway' },
      { status: 503, error: 'Service Unavailable' },
      { status: 504, error: 'Gateway Timeout' }
    ];
    
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  },
  
  // Generate process information
  generateProcessInfo: () => ({
    pid: Math.floor(Math.random() * 90000) + 10000,
    status: ['running', 'stopped', 'error'][Math.floor(Math.random() * 3)],
    startedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    workingDirectory: '/prod'
  }),
  
  // Generate API request data
  generateApiRequest: (endpoint = '/api/claude/launch') => ({
    endpoint,
    method: endpoint.includes('launch') || endpoint.includes('stop') ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    timestamp: Date.now()
  })
};

// Cleanup function for tests
global.testCleanup = {
  processes: [],
  timers: [],
  servers: [],
  
  addProcess: (process) => {
    global.testCleanup.processes.push(process);
  },
  
  addTimer: (timer) => {
    global.testCleanup.timers.push(timer);
  },
  
  addServer: (server) => {
    global.testCleanup.servers.push(server);
  },
  
  cleanupAll: () => {
    // Kill processes
    global.testCleanup.processes.forEach(process => {
      if (process && process.kill && !process.killed) {
        process.kill();
      }
    });
    
    // Clear timers
    global.testCleanup.timers.forEach(timer => {
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
      }
    });
    
    // Close servers
    global.testCleanup.servers.forEach(server => {
      if (server && server.close) {
        server.close();
      }
    });
    
    // Reset arrays
    global.testCleanup.processes = [];
    global.testCleanup.timers = [];
    global.testCleanup.servers = [];
  }
};

// Global beforeEach and afterEach
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup resources after each test
  global.testCleanup.cleanupAll();
  
  // Reset console mocks
  console.error.mockClear();
  console.warn.mockClear();
  console.log.mockClear();
});

// Process cleanup on exit
process.on('exit', () => {
  global.testCleanup.cleanupAll();
});

process.on('SIGTERM', () => {
  global.testCleanup.cleanupAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  global.testCleanup.cleanupAll();
  process.exit(0);
});