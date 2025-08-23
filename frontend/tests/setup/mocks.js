// Mock DOM globals first (before any React imports)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock WebSocket and Socket.IO
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock WebSocket Singleton Hook
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn(() => ({
    socket: {
      id: 'test-socket-id',
      connected: true,
      disconnected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    },
    isConnected: true,
    connectionState: 'connected',
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
  __esModule: true,
  default: jest.fn(() => ({
    socket: {
      id: 'test-socket-id',
      connected: true,
      disconnected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    },
    isConnected: true,
    connectionState: 'connected',
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Mock Connection Manager Hook
jest.mock('@/hooks/useConnectionManager', () => ({
  useConnectionManager: jest.fn(() => ({
    socket: {
      id: 'test-socket-id',
      connected: true,
      disconnected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    },
    isConnected: true,
    state: 'connected',
    metrics: {
      totalConnections: 1,
      totalDisconnections: 0,
      totalReconnections: 0,
      totalErrors: 0,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      averageLatency: 0,
      connectionUptime: 1000,
      lastMessageTime: new Date(),
      errorRate: 0,
      throughputPerSecond: 0,
    },
    health: {
      status: 'healthy',
      latency: 10,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      isHealthy: true,
    },
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    reconnect: jest.fn().mockResolvedValue(void 0),
    manager: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      getState: jest.fn(() => 'connected'),
      getMetrics: jest.fn(() => ({})),
      getHealth: jest.fn(() => ({ status: 'healthy' })),
      isConnected: jest.fn(() => true),
      updateOptions: jest.fn(),
      destroy: jest.fn(),
    },
  })),
  __esModule: true,
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    id: 'test-socket-id',
    connected: true,
    disconnected: false,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    onAny: jest.fn(),
    once: jest.fn(),
  })),
  Socket: jest.fn(),
}));

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  };
} else if (!global.performance.now) {
  global.performance.now = jest.fn(() => Date.now());
}

// Mock navigator if not available  
if (!global.navigator) {
  global.navigator = {
    userAgent: 'jest-test-runner',
    language: 'en-US',
    languages: ['en-US', 'en'],
    platform: 'linux',
    onLine: true,
  };
}

// Mock window.location if not available
if (!global.window) {
  global.window = {
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 0)),
    cancelAnimationFrame: jest.fn(),
  };
}

// Mock Blob for size calculations
if (!global.Blob) {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.size = parts ? parts.join('').length : 0;
      this.type = options?.type || '';
    }
  };
}

// Mock crypto for UUID generation
if (!global.crypto) {
  global.crypto = {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  };
}

// Mock AbortSignal for timeout handling
if (!global.AbortSignal) {
  global.AbortSignal = class AbortSignal {
    static timeout(milliseconds) {
      const signal = new AbortSignal();
      setTimeout(() => {
        signal.aborted = true;
        if (signal.onabort) signal.onabort();
      }, milliseconds);
      return signal;
    }
    constructor() {
      this.aborted = false;
      this.onabort = null;
    }
  };
}

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

console.error = (...args) => {
  // Filter out known React warnings and errors that are expected in tests
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is no longer supported') ||
     message.includes('Warning: An invalid form control') ||
     message.includes('Error: Uncaught') ||
     message.includes('Consider adding an error boundary'))
  ) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('componentWillReceiveProps') ||
     message.includes('componentWillMount') ||
     message.includes('componentWillUpdate'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Restore console methods after tests
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

module.exports = {};