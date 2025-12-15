/**
 * Terminal Test Setup Configuration
 * 
 * Global setup and configuration for terminal-related tests.
 * Configures mocks, utilities, and test environment specifically
 * for terminal functionality testing.
 */

import '@testing-library/jest-dom';

// Mock WebSocket globally for all terminal tests
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
})) as any;

// Mock BroadcastChannel for cross-tab testing
global.BroadcastChannel = jest.fn(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null
})) as any;

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
})) as any;

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
})) as any;

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
})) as any;

// Mock URL APIs for file downloads
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(void 0),
    readText: jest.fn().mockResolvedValue('mock clipboard text')
  },
  writable: true
});

// Mock Canvas API (used by xterm.js)
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
})) as any;

// Mock 2D canvas context
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  top: 0,
  left: 0,
  right: 800,
  bottom: 600,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  },
  writable: true
});

// Mock localStorage with better implementation
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock document.visibilityState for page visibility testing
Object.defineProperty(document, 'visibilityState', {
  value: 'visible',
  writable: true
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
console.warn = jest.fn();
console.error = jest.fn();

// Provide access to original console for debugging
(global as any).originalConsole = originalConsole;

// Mock TextEncoder/TextDecoder for binary data testing
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ArrayBuffer and related APIs for binary data handling
global.ArrayBuffer = ArrayBuffer;
global.Uint8Array = Uint8Array;
global.DataView = DataView;

// Mock File and FileReader APIs
global.File = class MockFile {
  constructor(
    public chunks: any[],
    public name: string,
    public options: any = {}
  ) {}
  
  get size() { return this.chunks.reduce((acc, chunk) => acc + chunk.length, 0); }
  get type() { return this.options.type || ''; }
} as any;

global.FileReader = class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public error: Error | null = null;
  public readyState = 0;
  public onload: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onloadend: ((event: any) => void) | null = null;

  readAsText(file: any) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mock file content';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsArrayBuffer(file: any) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
} as any;

// Global test utilities
(global as any).terminalTestUtils = {
  // Helper to create mock WebSocket messages
  createMockMessage: (type: string, data: any) => ({
    data: JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    })
  }),

  // Helper to simulate WebSocket connection sequence
  simulateConnectionSequence: (mockSocket: any, instanceId: string) => {
    setTimeout(() => mockSocket.emit('connected'), 10);
    setTimeout(() => mockSocket.emit('terminal_connected', {
      instanceId,
      instanceName: `Terminal ${instanceId}`,
      instanceType: 'test',
      pid: 12345
    }), 20);
  },

  // Helper to simulate terminal data
  simulateTerminalData: (mockSocket: any, data: string) => {
    mockSocket.emit('terminal_data', {
      data,
      timestamp: new Date().toISOString(),
      isHistory: false
    });
  }
};

// Error handling for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Setup for each test file
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorageMock.clear();
  
  // Reset console mocks
  (console.warn as jest.Mock).mockClear();
  (console.error as jest.Mock).mockClear();
  
  // Reset timers
  jest.clearAllTimers();
});

// Cleanup after each test
afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  
  // Reset DOM if modified
  document.body.innerHTML = '';
  
  // Clear any event listeners
  window.removeEventListener = jest.fn();
  document.removeEventListener = jest.fn();
});

// Global teardown
afterAll(() => {
  // Restore original console
  Object.assign(console, originalConsole);
});

// Extend Jest matchers with terminal-specific matchers
expect.extend({
  toHaveReceivedWebSocketMessage(mockSocket: any, expectedMessage: any) {
    const sentMessages = mockSocket.getSentMessages ? mockSocket.getSentMessages() : [];
    const found = sentMessages.some((msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        return Object.entries(expectedMessage).every(([key, value]) => 
          parsed[key] === value
        );
      } catch {
        return false;
      }
    });

    return {
      message: () => 
        `expected WebSocket to ${found ? 'not ' : ''}have received message ${JSON.stringify(expectedMessage)}`,
      pass: found
    };
  },

  toHaveLoggedMessage(mockLogger: any, level: string, message: string) {
    const logs = mockLogger.getLogs ? mockLogger.getLogs(level) : [];
    const found = logs.some((log: any) => 
      log.message && log.message.includes(message)
    );

    return {
      message: () => 
        `expected logger to ${found ? 'not ' : ''}have logged ${level} message containing "${message}"`,
      pass: found
    };
  },

  toHaveTerminalState(component: any, expectedState: string) {
    // This would need to be implemented based on how state is exposed in the component
    // For now, it's a placeholder for terminal-specific assertions
    return {
      message: () => `expected terminal to ${expectedState === component.state ? 'not ' : ''}be in state "${expectedState}"`,
      pass: component.state === expectedState
    };
  }
});

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveReceivedWebSocketMessage(expectedMessage: any): R;
      toHaveLoggedMessage(level: string, message: string): R;
      toHaveTerminalState(expectedState: string): R;
    }
  }
}

export {};