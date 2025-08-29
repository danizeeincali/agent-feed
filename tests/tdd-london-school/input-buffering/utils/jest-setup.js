/**
 * Jest Setup for TDD London School Input Buffering Tests
 * Global mocks and utilities for WebSocket and DOM testing
 */

// Mock WebSocket globally for all tests
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Mock implementation methods
    this.send = jest.fn();
    this.close = jest.fn();
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    
    // Simulate connection after a brief delay
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }
  
  // Static constants
  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }
  
  // Instance constants
  get CONNECTING() { return 0; }
  get OPEN() { return 1; }
  get CLOSING() { return 2; }
  get CLOSED() { return 3; }
};

// Mock EventSource for SSE testing
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.close = jest.fn();
    
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }
  
  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSED() { return 2; }
  
  get CONNECTING() { return 0; }
  get OPEN() { return 1; }
  get CLOSED() { return 2; }
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  let storage = {};
  return {
    getItem: jest.fn(key => storage[key] || null),
    setItem: jest.fn((key, value) => { storage[key] = value; }),
    removeItem: jest.fn(key => { delete storage[key]; }),
    clear: jest.fn(() => { storage = {}; }),
    get length() { return Object.keys(storage).length; },
    key: jest.fn(index => Object.keys(storage)[index] || null)
  };
};

global.localStorage = createMockStorage();
global.sessionStorage = createMockStorage();

// Mock fetch for API testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Map()
  })
);

// Mock URL and URLSearchParams
global.URL = class MockURL {
  constructor(url, base) {
    this.href = url;
    this.origin = 'http://localhost:3000';
    this.protocol = 'http:';
    this.hostname = 'localhost';
    this.port = '3000';
    this.pathname = '/';
    this.search = '';
    this.hash = '';
  }
  
  toString() {
    return this.href;
  }
  
  static createObjectURL = jest.fn(() => 'blob:mock-url');
  static revokeObjectURL = jest.fn();
};

global.URLSearchParams = class MockURLSearchParams {
  constructor(init = '') {
    this.params = new Map();
  }
  
  get = jest.fn(key => this.params.get(key));
  set = jest.fn((key, value) => this.params.set(key, value));
  has = jest.fn(key => this.params.has(key));
  delete = jest.fn(key => this.params.delete(key));
  append = jest.fn((key, value) => {
    const existing = this.params.get(key);
    this.params.set(key, existing ? `${existing},${value}` : value);
  });
};

// Mock crypto for random IDs
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  randomUUID: jest.fn(() => 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  )
};

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
});

global.cancelIdleCallback = jest.fn((id) => {
  clearTimeout(id);
});

// Enhanced console methods for test debugging
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(originalConsole.log),
  info: jest.fn(originalConsole.info),
  warn: jest.fn(originalConsole.warn),
  error: jest.fn(originalConsole.error),
  debug: jest.fn(originalConsole.debug),
  trace: jest.fn(originalConsole.trace)
};

// Mock clipboard API
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
    write: jest.fn(() => Promise.resolve()),
    read: jest.fn(() => Promise.resolve([]))
  },
  userAgent: 'Mozilla/5.0 (Test Environment) MockBrowser/1.0'
};

// Mock document methods commonly used in input handling
if (typeof document !== 'undefined') {
  // Mock createElement to return elements with common input properties
  const originalCreateElement = document.createElement;
  document.createElement = jest.fn((tagName) => {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName === 'input' || tagName === 'textarea') {
      element.value = '';
      element.focus = jest.fn();
      element.blur = jest.fn();
      element.select = jest.fn();
      element.selectionStart = 0;
      element.selectionEnd = 0;
      element.addEventListener = jest.fn();
      element.removeEventListener = jest.fn();
    }
    
    return element;
  });
  
  // Mock activeElement
  Object.defineProperty(document, 'activeElement', {
    value: document.body,
    writable: true
  });
}

// Utility functions for test environment
global.createMockKeyEvent = (key, options = {}) => {
  return {
    key,
    keyCode: key.charCodeAt?.(0) || 0,
    code: `Key${key.toUpperCase()}`,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    stopImmediatePropagation: jest.fn(),
    target: null,
    currentTarget: null,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    ...options
  };
};

global.createMockInputElement = (initialValue = '') => {
  return {
    value: initialValue,
    type: 'text',
    placeholder: '',
    disabled: false,
    readOnly: false,
    focus: jest.fn(),
    blur: jest.fn(),
    select: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    selectionStart: 0,
    selectionEnd: initialValue.length,
    setSelectionRange: jest.fn((start, end) => {
      this.selectionStart = start;
      this.selectionEnd = end;
    })
  };
};

// Test utilities for London School TDD
global.testUtils = {
  // Verify mock interaction order
  expectCallOrder: (mockA, mockB) => {
    const callsA = mockA.mock.invocationCallOrder;
    const callsB = mockB.mock.invocationCallOrder;
    
    if (callsA.length === 0 || callsB.length === 0) {
      throw new Error('Both mocks must have been called');
    }
    
    expect(callsA[0]).toBeLessThan(callsB[0]);
  },
  
  // Create interaction spy
  createInteractionSpy: () => {
    const interactions = [];
    return {
      record: (name, args) => interactions.push({ name, args, timestamp: Date.now() }),
      getInteractions: () => [...interactions],
      clear: () => interactions.splice(0, interactions.length)
    };
  }
};

// Set up custom matchers
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});

// Global test cleanup
global.afterEach = global.afterEach || (() => {
  // Reset all mocks after each test
  jest.clearAllMocks();
  
  // Reset console mocks but preserve original functionality
  global.console.log.mockClear();
  global.console.info.mockClear();
  global.console.warn.mockClear();
  global.console.error.mockClear();
  global.console.debug.mockClear();
  global.console.trace.mockClear();
  
  // Clear storage
  global.localStorage.clear();
  global.sessionStorage.clear();
  
  // Reset DOM if available
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});