// Test setup for TDD London School Network Connectivity Tests

// Mock browser APIs
global.fetch = jest.fn();
global.WebSocket = jest.fn();
global.XMLHttpRequest = jest.fn();

// Mock window object for browser environment
global.window = {
  location: {
    protocol: 'http:',
    hostname: 'localhost',
    port: '5173',
    host: 'localhost:5173'
  }
};

// Mock document for DOM events
global.document = {
  addEventListener: jest.fn()
};

// Mock console to reduce test noise while allowing important logs
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep error logs for debugging
};

// Setup for each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset environment variables
  delete process.env.CODESPACES;
  delete process.env.CODESPACE_NAME;
  delete process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  
  // Reset global mocks
  global.fetch.mockReset();
  global.WebSocket.mockReset();
  global.XMLHttpRequest.mockReset();
});