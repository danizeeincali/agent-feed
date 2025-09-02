/**
 * Global test setup for WebSocket stability tests
 */

const { WebSocket } = require('ws');

// Make WebSocket available globally for tests
global.WebSocket = WebSocket;

// Global test timeout
jest.setTimeout(60000);

// Console filtering to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only show important messages during tests
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('[TEST]') || message.includes('PASS') || message.includes('FAIL')) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  const message = args.join(' ');
  if (!message.includes('ECONNREFUSED') && !message.includes('socket hang up')) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('[TEST]')) {
    originalConsoleWarn(...args);
  }
};

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError; 
  console.warn = originalConsoleWarn;
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  if (!reason.message?.includes('WebSocket connection timeout')) {
    console.error('[TEST] Unhandled Rejection at:', promise, 'reason:', reason);
  }
});