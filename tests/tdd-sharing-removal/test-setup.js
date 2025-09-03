/**
 * TDD London School - Test Setup
 * 
 * Global test configuration and utilities for sharing removal tests
 * London School methodology requires extensive mocking and isolation
 */

import '@testing-library/jest-dom';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally for API tests
global.fetch = jest.fn();

// Mock window.performance for performance tests
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
};

// Mock IntersectionObserver for any components that use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Setup for London School TDD
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset console mocks
  global.console.log.mockClear();
  global.console.info.mockClear();
  global.console.warn.mockClear();
  global.console.error.mockClear();
  
  // Reset fetch mock
  global.fetch.mockClear();
  
  // Reset performance mocks
  global.performance.now.mockClear();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Custom matchers for London School testing
expect.extend({
  toHaveBeenCalledWithoutShare(received) {
    const calls = received.mock.calls || [];
    const shareCalls = calls.filter(call => 
      call.some(arg => 
        typeof arg === 'string' && arg.includes('share')
      )
    );
    
    const pass = shareCalls.length === 0;
    
    if (pass) {
      return {
        message: () => `Expected mock not to have been called with share-related arguments`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected mock not to have been called with share-related arguments, but found: ${JSON.stringify(shareCalls)}`,
        pass: false,
      };
    }
  },

  toHaveEngagementButtonsWithoutShare(received) {
    const likeButtons = received.getAllByRole('button', { name: /like/i });
    const commentButtons = received.getAllByRole('button', { name: /comment/i });
    const shareButtons = received.queryAllByRole('button', { name: /share/i });
    
    const hasLikeButtons = likeButtons.length > 0;
    const hasCommentButtons = commentButtons.length > 0;
    const hasNoShareButtons = shareButtons.length === 0;
    
    const pass = hasLikeButtons && hasCommentButtons && hasNoShareButtons;
    
    if (pass) {
      return {
        message: () => `Expected component to have like and comment buttons but no share buttons`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected like (${likeButtons.length}) and comment (${commentButtons.length}) buttons with no share buttons (found ${shareButtons.length})`,
        pass: false,
      };
    }
  },

  toHaveInteractionContract(received, expectedContract) {
    const { apiCalls = [], webSocketCalls = [], excludedCalls = [] } = expectedContract;
    
    let pass = true;
    let failureMessage = '';
    
    // Check expected API calls
    for (const expectedCall of apiCalls) {
      const [method, ...args] = expectedCall;
      if (!received.apiService[method] || !received.apiService[method].toHaveBeenCalledWith(...args)) {
        pass = false;
        failureMessage += `Expected API call ${method}(${args.join(', ')}) not found. `;
      }
    }
    
    // Check expected WebSocket calls
    for (const expectedCall of webSocketCalls) {
      const [method, ...args] = expectedCall;
      if (!received.webSocket[method] || !received.webSocket[method].toHaveBeenCalledWith(...args)) {
        pass = false;
        failureMessage += `Expected WebSocket call ${method}(${args.join(', ')}) not found. `;
      }
    }
    
    // Check excluded calls
    for (const excludedCall of excludedCalls) {
      const [service, method, ...args] = excludedCall;
      const serviceObj = service === 'api' ? received.apiService : received.webSocket;
      
      if (serviceObj[method] && serviceObj[method].toHaveBeenCalledWith(...args)) {
        pass = false;
        failureMessage += `Unexpected ${service} call ${method}(${args.join(', ')}) found. `;
      }
    }
    
    return {
      message: () => failureMessage || 'Interaction contract verified successfully',
      pass,
    };
  }
});

// Mock data generators for consistent testing
export const createTestData = {
  post: (overrides = {}) => ({
    id: 'test-post-' + Math.random().toString(36).substr(2, 9),
    title: 'Test Post',
    content: 'Test content',
    authorAgent: 'test-agent',
    publishedAt: new Date().toISOString(),
    metadata: {
      businessImpact: 5,
      tags: ['test'],
      isAgentResponse: true,
    },
    likes: 0,
    comments: 0,
    shares: 0,
    ...overrides,
  }),

  apiResponse: (success = true, data = {}) => ({
    success,
    ...data,
  }),

  webSocketEvent: (type, data = {}) => ({
    type,
    timestamp: Date.now(),
    ...data,
  }),
};

// Test utilities for London School methodology
export const testUtils = {
  // Verify mock call patterns
  verifyMockCalls: (mock, expectedCalls) => {
    expect(mock).toHaveBeenCalledTimes(expectedCalls.length);
    expectedCalls.forEach((expectedCall, index) => {
      expect(mock).toHaveBeenNthCalledWith(index + 1, ...expectedCall);
    });
  },

  // Verify no sharing-related calls
  verifyNoSharingCalls: (mocks) => {
    Object.entries(mocks).forEach(([name, mock]) => {
      if (mock.mock && mock.mock.calls) {
        const shareCalls = mock.mock.calls.filter(call =>
          call.some(arg => 
            (typeof arg === 'string' && arg.includes('share')) ||
            (typeof arg === 'object' && JSON.stringify(arg).includes('share'))
          )
        );
        
        expect(shareCalls).toHaveLength(0);
      }
    });
  },

  // Create comprehensive mock suite
  createMockSuite: () => ({
    apiService: {
      getAgentPosts: jest.fn(),
      updatePostEngagement: jest.fn(),
      searchPosts: jest.fn(),
      checkDatabaseConnection: jest.fn(),
      clearCache: jest.fn(),
    },
    webSocketContext: {
      isConnected: true,
      on: jest.fn(),
      off: jest.fn(),
      subscribeFeed: jest.fn(),
      unsubscribeFeed: jest.fn(),
      subscribePost: jest.fn(),
      sendLike: jest.fn(),
      addNotification: jest.fn(),
    },
  }),

  // Wait for component to stabilize
  waitForStable: async (screen) => {
    await screen.findByText(/./); // Wait for any text to appear
    await new Promise(resolve => setTimeout(resolve, 100)); // Additional stabilization
  },
};

// London School test patterns
export const londonSchoolPatterns = {
  // Outside-in test structure
  outsideInTest: (description, testFn) => {
    return test(`[OUTSIDE-IN] ${description}`, testFn);
  },

  // Mock-first test structure  
  mockFirstTest: (description, testFn) => {
    return test(`[MOCK-FIRST] ${description}`, testFn);
  },

  // Behavior verification test
  behaviorTest: (description, testFn) => {
    return test(`[BEHAVIOR] ${description}`, testFn);
  },

  // Interaction test
  interactionTest: (description, testFn) => {
    return test(`[INTERACTION] ${description}`, testFn);
  },
};

// Export for use in tests
global.createTestData = createTestData;
global.testUtils = testUtils;
global.londonSchoolPatterns = londonSchoolPatterns;