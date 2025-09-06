// Global test setup for Link Preview TDD Suite
import { jest } from '@jest/globals';

// Global mocks setup
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Mock JSDOM
jest.mock('jsdom', () => ({
  JSDOM: jest.fn()
}));

// Mock database service
jest.mock('../../src/database/DatabaseService.js', () => ({
  databaseService: {
    db: {
      getCachedLinkPreview: jest.fn(),
      cacheLinkPreview: jest.fn(),
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ changes: 0 }))
      }))
    }
  }
}));

// Test constants
export const TEST_CONSTANTS = {
  YOUTUBE_URL: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  LINKEDIN_URL: 'https://www.linkedin.com/posts/username_test-post-123',
  TWITTER_URL: 'https://twitter.com/username/status/1234567890',
  GENERIC_URL: 'https://example.com/article',
  INVALID_URL: 'not-a-url',
  TIMEOUT_DURATION: 5000
};

// Mock responses
export const MOCK_RESPONSES = {
  YOUTUBE_OEMBED: {
    title: 'Test YouTube Video',
    author_name: 'Test Channel',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    width: 560,
    height: 315
  },
  GENERIC_HTML: `
    <html>
      <head>
        <title>Test Page</title>
        <meta property="og:title" content="Test OG Title" />
        <meta property="og:description" content="Test OG Description" />
        <meta property="og:image" content="https://example.com/image.jpg" />
        <meta name="description" content="Test meta description" />
      </head>
      <body>
        <p>Test paragraph content for extraction</p>
        <img src="/relative-image.jpg" alt="Test image" />
      </body>
    </html>
  `,
  RATE_LIMIT_ERROR: new Error('Rate limit exceeded'),
  NETWORK_ERROR: new Error('Network request failed'),
  TIMEOUT_ERROR: new Error('Request timeout')
};

// Swarm coordination mock functions
export const createSwarmMock = (serviceName, methods = {}) => {
  const mock = {};
  Object.keys(methods).forEach(methodName => {
    mock[methodName] = jest.fn(methods[methodName]);
  });
  mock._swarmId = `swarm-${serviceName}-${Date.now()}`;
  mock._contractDefinition = { serviceName, methods: Object.keys(methods) };
  return mock;
};

// Contract verification helper
export const verifySwarmContract = (mock, expectedInteractions) => {
  expectedInteractions.forEach(({ method, calls }) => {
    expect(mock[method]).toHaveBeenCalledTimes(calls.length);
    calls.forEach((args, index) => {
      expect(mock[method]).toHaveBeenNthCalledWith(index + 1, ...args);
    });
  });
};

// Interaction sequence verifier
export const verifyInteractionSequence = (mocks, expectedSequence) => {
  const allCalls = [];
  
  Object.entries(mocks).forEach(([mockName, mock]) => {
    Object.keys(mock).forEach(methodName => {
      if (jest.isMockFunction(mock[methodName])) {
        mock[methodName].mock.calls.forEach((args, index) => {
          allCalls.push({
            mock: mockName,
            method: methodName,
            args,
            timestamp: mock[methodName].mock.invocationCallOrder[index]
          });
        });
      }
    });
  });
  
  // Sort by call order
  allCalls.sort((a, b) => a.timestamp - b.timestamp);
  
  expectedSequence.forEach(({ mock, method }, index) => {
    expect(allCalls[index]).toMatchObject({ mock, method });
  });
};

// Performance testing helpers
export const measureExecutionTime = async (fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    executionTime: end - start
  };
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.mockReset();
});