/**
 * Jest Global Configuration
 * Sets up global variables and constants for TDD London School tests
 */

// Global test constants
const TEST_CONSTANTS = {
  WORKSPACE_DIR: '/workspaces/agent-feed/prod',
  DEFAULT_TIMEOUT: 30000,
  MOCK_USER_ID: 'test-user-123',
  MOCK_INSTANCE_ID: 'claude-test-instance',
  MOCK_MESSAGE_ID: 'msg-test-123',
  DEFAULT_FILE_CONTENT: 'hello world',
  TEST_FILE_NAME: 'test.md',

  // WebSocket constants
  WEBSOCKET_URL: 'ws://localhost:3000',

  // API constants
  API_BASE_URL: 'http://localhost:3000/api',

  // Error messages
  ERRORS: {
    INSTANCE_NOT_FOUND: 'Claude instance not found',
    PERMISSION_DENIED: 'Permission denied',
    INVALID_WORKSPACE: 'Workspace directory not allowed',
    CONNECTION_FAILED: 'Connection failed',
    VALIDATION_FAILED: 'Validation failed'
  }
};

// Mock factory helpers
const MOCK_FACTORIES = {
  createMockRequest: (body: any = {}, params: any = {}, user: any = { id: TEST_CONSTANTS.MOCK_USER_ID }) => ({
    body,
    params,
    user,
    headers: {},
    query: {},
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent')
  }),

  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
    return res;
  },

  createMockNext: () => jest.fn(),

  createMockClaudeInstance: (overrides: any = {}) => ({
    id: TEST_CONSTANTS.MOCK_INSTANCE_ID,
    pid: 12345,
    workspaceDir: TEST_CONSTANTS.WORKSPACE_DIR,
    status: 'running' as const,
    createdAt: new Date(),
    config: { workspaceDir: TEST_CONSTANTS.WORKSPACE_DIR },
    ...overrides
  }),

  createMockMessage: (overrides: any = {}) => ({
    id: TEST_CONSTANTS.MOCK_MESSAGE_ID,
    instanceId: TEST_CONSTANTS.MOCK_INSTANCE_ID,
    type: 'input' as const,
    content: 'test message',
    timestamp: new Date(),
    ...overrides
  }),

  createMockFileOperation: (overrides: any = {}) => ({
    path: TEST_CONSTANTS.TEST_FILE_NAME,
    content: TEST_CONSTANTS.DEFAULT_FILE_CONTENT,
    operation: 'create' as const,
    overwrite: false,
    ...overrides
  })
};

// Test utilities
const TEST_UTILS = {
  // Time utilities
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Async test helpers
  waitForMockCall: async (mockFn: jest.MockFunction<any, any>, timeout: number = 1000) => {
    const start = Date.now();
    while (mockFn.mock.calls.length === 0 && Date.now() - start < timeout) {
      await TEST_UTILS.sleep(10);
    }
    if (mockFn.mock.calls.length === 0) {
      throw new Error(`Mock function was not called within ${timeout}ms`);
    }
  },

  // Mock verification helpers
  verifyMockCallsInOrder: (mocks: jest.MockFunction<any, any>[]) => {
    const callOrders = mocks.map(mock =>
      Math.min(...(mock.mock.invocationCallOrder || [Infinity]))
    );

    for (let i = 1; i < callOrders.length; i++) {
      if (callOrders[i] <= callOrders[i - 1]) {
        throw new Error(`Mock calls were not in expected order`);
      }
    }
  },

  // Error simulation helpers
  createNetworkError: () => new Error('Network error: Connection timeout'),
  createPermissionError: () => new Error('Permission denied: access to /etc/passwd'),
  createValidationError: () => new Error('Validation failed: invalid input'),
  createInstanceError: () => new Error('Claude instance unavailable'),

  // Data generation helpers
  generateRandomId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  generateMockUser: (id?: string) => ({
    id: id || TEST_UTILS.generateRandomId(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    department: 'testing',
    team: 'qa'
  }),

  // London School specific helpers
  createCollaboratorMocks: (methods: string[]) => {
    const mocks = {};
    methods.forEach(method => {
      mocks[method] = jest.fn();
    });
    return mocks;
  },

  verifyCollaboratorInteractions: (mocks: Record<string, jest.MockFunction<any, any>>) => {
    Object.entries(mocks).forEach(([name, mock]) => {
      expect(mock).toHaveBeenCalled();
    });
  }
};

// Contract templates for London School testing
const CONTRACT_TEMPLATES = {
  ClaudeProcessManager: {
    createInstance: expect.any(Function),
    destroyInstance: expect.any(Function),
    sendInput: expect.any(Function),
    streamOutput: expect.any(Function),
    requestFileCreation: expect.any(Function),
    getInstanceStatus: expect.any(Function),
    healthCheck: expect.any(Function)
  },

  WebSocketManager: {
    handleConnection: expect.any(Function),
    subscribeToInstance: expect.any(Function),
    broadcastToInstance: expect.any(Function),
    unsubscribeFromInstance: expect.any(Function)
  },

  MessageHandler: {
    processMessage: expect.any(Function),
    validateInput: expect.any(Function),
    sanitizeMessage: expect.any(Function),
    checkPermissions: expect.any(Function)
  }
};

// Export globals
declare global {
  var TEST_CONSTANTS: typeof TEST_CONSTANTS;
  var MOCK_FACTORIES: typeof MOCK_FACTORIES;
  var TEST_UTILS: typeof TEST_UTILS;
  var CONTRACT_TEMPLATES: typeof CONTRACT_TEMPLATES;
}

global.TEST_CONSTANTS = TEST_CONSTANTS;
global.MOCK_FACTORIES = MOCK_FACTORIES;
global.TEST_UTILS = TEST_UTILS;
global.CONTRACT_TEMPLATES = CONTRACT_TEMPLATES;

// Console styling for test output
const styles = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Enhanced console methods for test debugging
const originalConsole = { ...console };

console.testInfo = (message: string) => {
  console.log(`${styles.blue}ℹ ${message}${styles.reset}`);
};

console.testSuccess = (message: string) => {
  console.log(`${styles.green}✓ ${message}${styles.reset}`);
};

console.testWarning = (message: string) => {
  console.log(`${styles.yellow}⚠ ${message}${styles.reset}`);
};

console.testError = (message: string) => {
  console.log(`${styles.red}✗ ${message}${styles.reset}`);
};

console.testDebug = (message: string, data?: any) => {
  if (process.env.TEST_DEBUG === 'true') {
    console.log(`${styles.dim}🐛 ${message}${styles.reset}`, data ? data : '');
  }
};

console.londonSchoolInfo = (message: string) => {
  console.log(`${styles.magenta}🇬🇧 London School: ${message}${styles.reset}`);
};

// Test performance monitoring
const testMetrics = {
  startTimes: new Map<string, number>(),
  slowTests: new Set<string>(),

  markTestStart: (testName: string) => {
    testMetrics.startTimes.set(testName, performance.now());
  },

  markTestEnd: (testName: string) => {
    const startTime = testMetrics.startTimes.get(testName);
    if (startTime) {
      const duration = performance.now() - startTime;
      if (duration > 1000) { // Tests slower than 1 second
        testMetrics.slowTests.add(testName);
        console.testWarning(`Slow test: ${testName} (${duration.toFixed(2)}ms)`);
      }
      testMetrics.startTimes.delete(testName);
    }
  },

  getSlowTests: () => Array.from(testMetrics.slowTests)
};

global.testMetrics = testMetrics;

// Environment validation
if (process.env.NODE_ENV !== 'test') {
  console.testWarning('NODE_ENV is not set to "test". This may cause unexpected behavior.');
}

console.londonSchoolInfo('Global test environment configured for behavior-driven testing');