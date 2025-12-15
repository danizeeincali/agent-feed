import '@testing-library/jest-dom';
import { server } from './mocks/websocket-server-mock';

// Global test setup for WebSocket regression tests
beforeAll(() => {
  // Start MSW server for API mocking
  server.listen({ onUnhandledRequest: 'warn' });
  
  // Mock WebSocket globals
  global.WebSocket = require('ws');
  
  // Mock environment variables
  process.env.VITE_WEBSOCKET_HUB_URL = 'http://localhost:3002';
  
  // Mock browser APIs
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3001',
      hostname: 'localhost',
      port: '3001'
    },
    writable: true
  });
  
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Test Environment)',
    writable: true
  });
  
  // Console error/warning tracking
  const originalError = console.error;
  const originalWarn = console.warn;
  
  global.consoleErrors = [];
  global.consoleWarns = [];
  
  console.error = (...args) => {
    global.consoleErrors.push(args);
    originalError(...args);
  };
  
  console.warn = (...args) => {
    global.consoleWarns.push(args);
    originalWarn(...args);
  };
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();
  
  // Clear console tracking
  global.consoleErrors = [];
  global.consoleWarns = [];
  
  // Clear any active timers
  jest.clearAllTimers();
});

afterAll(() => {
  // Clean up
  server.close();
});

// Global test timeout
jest.setTimeout(30000);