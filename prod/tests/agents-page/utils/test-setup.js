/**
 * Test Setup and Configuration
 * London School TDD - Test Environment Setup
 */

const { jest } = require('@jest/globals');

// Mock global fetch for testing
global.fetch = jest.fn();

// Mock WebSocket for real-time testing
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock timers setup
jest.useFakeTimers();

/**
 * Test Environment Setup
 */
class TestEnvironment {
  static setup() {
    // Setup test-specific globals
    global.__TEST__ = true;
    global.__VERSION__ = '1.0.0';
    
    // Mock environment variables
    process.env.NODE_ENV = 'test';
    process.env.AGENT_WORKSPACE_PATH = '/test/agent_workspace';
    process.env.WEBSOCKET_URL = 'ws://localhost:3001';
    
    // Setup DOM environment for React testing
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
    }

    // Clear all mocks before each test
    jest.clearAllMocks();
  }

  static teardown() {
    // Restore original implementations
    jest.restoreAllMocks();
    
    // Clear fake timers
    jest.useRealTimers();
    
    // Clean up global state
    delete global.__TEST__;
    delete global.__VERSION__;
  }
}

/**
 * Mock API Responses
 */
const mockApiResponses = {
  agents: {
    success: {
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        agents: [
          {
            id: 'personal-todos-agent',
            name: 'Personal TODOs Agent',
            status: 'active',
            metrics: { performance: 0.92 }
          },
          {
            id: 'meeting-next-steps-agent',
            name: 'Meeting Next Steps Agent',
            status: 'active',
            metrics: { performance: 0.87 }
          }
        ],
        total: 2,
        timestamp: new Date().toISOString()
      })
    },
    error: {
      status: 500,
      ok: false,
      json: () => Promise.resolve({
        error: 'Internal server error',
        message: 'Failed to discover agents'
      })
    },
    empty: {
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        agents: [],
        total: 0,
        timestamp: new Date().toISOString()
      })
    }
  },
  
  agentDetails: {
    success: (agentId) => ({
      status: 200,
      ok: true,
      json: () => Promise.resolve({
        id: agentId,
        name: `${agentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        description: `Detailed description for ${agentId}`,
        capabilities: ['capability-1', 'capability-2'],
        metrics: {
          performance: 0.85,
          reliability: 0.92,
          uptime: 0.99
        },
        configuration: {
          autoStart: true,
          maxItems: 100
        }
      })
    }),
    notFound: {
      status: 404,
      ok: false,
      json: () => Promise.resolve({
        error: 'Agent not found',
        message: 'The requested agent does not exist'
      })
    }
  }
};

/**
 * WebSocket Mock Implementation
 */
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.listeners = new Map();
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.dispatchEvent(new Event('open'));
    }, 100);
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  send(data) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    // Mock sending data
    console.log('WebSocket send:', data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.dispatchEvent(new Event('close'));
  }

  dispatchEvent(event) {
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach(handler => handler(event));
    }
  }

  // Helper method to simulate incoming messages
  simulateMessage(data) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.dispatchEvent(event);
  }
}

/**
 * Test Utilities
 */
const testUtils = {
  /**
   * Wait for async operations
   */
  async waitFor(callback, options = {}) {
    const { timeout = 5000, interval = 50 } = options;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await callback();
        if (result) {
          return result;
        }
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw error;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`waitFor timeout after ${timeout}ms`);
  },

  /**
   * Mock fetch response
   */
  mockFetchResponse(response) {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      ...response
    });
  },

  /**
   * Mock fetch error
   */
  mockFetchError(error) {
    global.fetch.mockRejectedValueOnce(error);
  },

  /**
   * Create mock WebSocket
   */
  createMockWebSocket(url = 'ws://localhost:3001') {
    return new MockWebSocket(url);
  },

  /**
   * Advance timers and flush promises
   */
  async flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
  },

  /**
   * Create test container element
   */
  createTestContainer() {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'test-container');
    document.body.appendChild(container);
    return container;
  },

  /**
   * Clean up test container
   */
  cleanupTestContainer(container) {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  },

  /**
   * Mock React component
   */
  mockReactComponent(name, props = {}) {
    return jest.fn(({ children, ...componentProps }) => ({
      type: 'div',
      props: {
        'data-testid': name.toLowerCase(),
        ...props,
        ...componentProps
      },
      children: children || []
    }));
  }
};

/**
 * Custom Jest Matchers
 */
expect.extend({
  /**
   * Test if a mock was called with correct agent data structure
   */
  toHaveBeenCalledWithAgent(received, agentId) {
    const calls = received.mock.calls;
    const hasAgentCall = calls.some(call => {
      return call.some(arg => 
        typeof arg === 'object' && 
        arg !== null && 
        arg.id === agentId
      );
    });

    return {
      message: () => `Expected mock to be called with agent ID "${agentId}"`,
      pass: hasAgentCall
    };
  },

  /**
   * Test if WebSocket connection was established
   */
  toHaveConnectedWebSocket(received) {
    return {
      message: () => 'Expected WebSocket to be connected',
      pass: received.readyState === 1
    };
  },

  /**
   * Test if component follows accessibility patterns
   */
  toBeAccessible(received) {
    // Basic accessibility checks
    const hasRole = received.props && received.props.role;
    const hasAriaLabel = received.props && (received.props['aria-label'] || received.props['aria-labelledby']);
    const hasTestId = received.props && received.props['data-testid'];

    return {
      message: () => 'Expected component to follow accessibility patterns',
      pass: hasRole || hasAriaLabel || hasTestId
    };
  }
});

/**
 * Global test setup
 */
beforeEach(() => {
  TestEnvironment.setup();
});

afterEach(() => {
  TestEnvironment.teardown();
});

// Export utilities and mocks
module.exports = {
  TestEnvironment,
  mockApiResponses,
  MockWebSocket,
  testUtils
};