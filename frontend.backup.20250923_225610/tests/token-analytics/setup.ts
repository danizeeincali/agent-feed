// Test setup for Token Analytics
import '@testing-library/jest-dom';

// Mock WebSocket globally
const mockWebSocket = {
  readyState: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  url: 'ws://localhost:3001',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  binaryType: 'blob' as BinaryType,
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  dispatchEvent: jest.fn(),
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const mockWebSocketReturn = {
  socket: mockWebSocket,
  isConnected: true,
  error: null,
  lastMessage: null,
  connectionHistory: [],
  connect: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn(),
  send: jest.fn()
};

// Global mock for useWebSocketSingleton
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn(() => mockWebSocketReturn)
}));

// Mock NLD logger
jest.mock('@/utils/nld-logger', () => ({
  nldLogger: {
    renderAttempt: jest.fn(),
    renderSuccess: jest.fn(),
    renderFailure: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(() => ({ duration: 50 })),
    getEntriesByName: jest.fn(() => [{ duration: 50 }])
  }
});

// Mock process.env
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_WEBSOCKET_URL = 'ws://localhost:3001';