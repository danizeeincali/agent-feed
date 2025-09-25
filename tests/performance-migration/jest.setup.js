// Custom matchers for DOM testing
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && received.nodeType === 1;
    return {
      pass,
      message: () => pass
        ? `Expected element not to be in the document`
        : `Expected element to be in the document`
    };
  },

  toBeVisible(received) {
    const pass = received && received.nodeType === 1 && !received.hidden;
    return {
      pass,
      message: () => pass
        ? `Expected element not to be visible`
        : `Expected element to be visible`
    };
  },

  toHaveClass(received, className) {
    const pass = received && received.classList && received.classList.contains(className);
    return {
      pass,
      message: () => pass
        ? `Expected element not to have class '${className}'`
        : `Expected element to have class '${className}'`
    };
  },

  toHaveAttribute(received, attr, value) {
    const hasAttr = received && received.hasAttribute(attr);
    const attrValue = hasAttr ? received.getAttribute(attr) : null;
    const pass = hasAttr && (value === undefined || attrValue === value);

    return {
      pass,
      message: () => {
        if (value === undefined) {
          return pass
            ? `Expected element not to have attribute '${attr}'`
            : `Expected element to have attribute '${attr}'`;
        }
        return pass
          ? `Expected element not to have attribute '${attr}' with value '${value}'`
          : `Expected element to have attribute '${attr}' with value '${value}', but got '${attrValue}'`;
      }
    };
  }
});

// Mock Performance API with extensive capabilities
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50000000, // 50MB
      totalJSHeapSize: 100000000, // 100MB
      jsHeapSizeLimit: 2000000000 // 2GB
    },
    timing: {
      navigationStart: Date.now() - 1000,
      responseEnd: Date.now() - 500,
      domContentLoadedEventEnd: Date.now() - 200,
      loadEventEnd: Date.now() - 100
    },
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  }
});

// Mock requestAnimationFrame with control
let animationFrameCallbacks = [];
let animationFrameId = 1;

global.requestAnimationFrame = jest.fn((callback) => {
  const id = animationFrameId++;
  animationFrameCallbacks.push({ id, callback });
  return id;
});

global.cancelAnimationFrame = jest.fn((id) => {
  animationFrameCallbacks = animationFrameCallbacks.filter(cb => cb.id !== id);
});

// Helper to trigger animation frames
global.triggerAnimationFrame = () => {
  const callbacks = [...animationFrameCallbacks];
  animationFrameCallbacks = [];
  callbacks.forEach(({ callback }) => callback(performance.now()));
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
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
  })),
});

// Mock console methods to track console errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.consoleMocks = {
  error: jest.fn(),
  warn: jest.fn()
};

console.error = global.consoleMocks.error;
console.warn = global.consoleMocks.warn;

// Reset console tracking before each test
beforeEach(() => {
  global.consoleMocks.error.mockClear();
  global.consoleMocks.warn.mockClear();
  animationFrameCallbacks = [];
  animationFrameId = 1;

  // Reset performance mocks
  performance.now.mockClear();
  performance.getEntriesByType.mockClear();
  performance.getEntriesByName.mockClear();
  performance.mark.mockClear();
  performance.measure.mockClear();
  performance.clearMarks.mockClear();
  performance.clearMeasures.mockClear();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});