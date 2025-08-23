/**
 * Test Setup for TDD London School Test Suite
 * 
 * Configures testing environment with comprehensive mocks and utilities
 * for zero white screen testing
 */

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock WebSocket Singleton Hook for tests
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

// Global test configuration
beforeAll(() => {
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };

  // Mock window methods
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

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock performance API
  Object.defineProperty(window, 'performance', {
    value: {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
    },
  });

  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn(() => Promise.resolve()),
      readText: jest.fn(() => Promise.resolve('')),
    },
  });

  // Mock online/offline detection
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });

  // Mock fetch API
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
    })
  ) as jest.Mock;

  // Mock WebSocket
  global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  }));

  // Mock URL constructor
  global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
  global.URL.revokeObjectURL = jest.fn();

  // Mock image loading
  Object.defineProperty(HTMLImageElement.prototype, 'loading', {
    get() {
      return 'eager';
    },
    set() {
      // Do nothing
    },
  });

  // Mock location methods
  delete (window as any).location;
  window.location = {
    ...window.location,
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: jest.fn(),
    assign: jest.fn(),
    replace: jest.fn(),
  };

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
  });

  // Mock CSS modules
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    }),
  });
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock to default success
  (global.fetch as jest.Mock).mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );

  // Reset console mocks
  (console.warn as jest.Mock).mockClear();
  (console.error as jest.Mock).mockClear();
  (console.log as jest.Mock).mockClear();
});

// Cleanup after each test
afterEach(() => {
  // Clear any timers
  jest.clearAllTimers();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled promise rejection in test:', reason);
});

// Export test utilities
export const testUtils = {
  // Mock component props
  createMockProps: (overrides = {}) => ({
    className: 'test-class',
    'data-testid': 'test-component',
    ...overrides,
  }),

  // Mock API responses
  createMockApiResponse: (data = {}, options = {}) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...options,
  }),

  // Mock error responses
  createMockApiError: (message = 'API Error', status = 500) => ({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.reject(new Error(message)),
    text: () => Promise.reject(new Error(message)),
  }),

  // Mock WebSocket events
  createMockWebSocketEvent: (type: string, data = {}) => ({
    type,
    data: JSON.stringify(data),
    target: {
      readyState: WebSocket.OPEN,
    },
  }),

  // Wait for async operations
  waitForAsync: async (fn: () => void, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Async operation timed out after ${timeout}ms`));
      }, timeout);

      try {
        fn();
        clearTimeout(timer);
        resolve(void 0);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  },

  // Mock component refs
  createMockRef: <T>(value: T) => ({
    current: value,
  }),

  // Mock router location
  createMockLocation: (pathname = '/', search = '', hash = '') => ({
    pathname,
    search,
    hash,
    state: null,
    key: 'mock-key',
  }),

  // Mock router navigate function
  createMockNavigate: () => jest.fn(),

  // Simulate network conditions
  simulateOffline: () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
  },

  simulateOnline: () => {
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));
  },

  // Simulate component errors
  createErrorComponent: (message = 'Test error') => {
    return () => {
      throw new Error(message);
    };
  },

  // Performance testing helpers
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },

  // Memory leak detection helpers
  createMemoryLeakTest: (componentFn: () => void, iterations = 10) => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    for (let i = 0; i < iterations; i++) {
      componentFn();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    return finalMemory - initialMemory;
  },

  // Accessibility testing helpers
  checkAriaAttributes: (element: Element) => {
    const ariaAttributes = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('aria-'))
      .map(attr => ({ name: attr.name, value: attr.value }));
    
    return ariaAttributes;
  },

  // Visual regression helpers
  captureComponentSnapshot: (element: Element) => {
    return {
      tagName: element.tagName,
      className: element.className,
      textContent: element.textContent,
      children: Array.from(element.children).map(child => 
        testUtils.captureComponentSnapshot(child)
      ),
    };
  },
};

// Export mock factories
export const mockFactories = {
  queryClient: () => {
    const { QueryClient } = require('@tanstack/react-query');
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false },
      },
    });
  },

  errorBoundary: (componentName = 'TestComponent') => {
    const { ErrorBoundary } = require('@/components/ErrorBoundary');
    return ErrorBoundary;
  },

  webSocketContext: (overrides = {}) => ({
    socket: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      connected: true,
    },
    connectionStatus: 'connected' as const,
    lastActivity: new Date(),
    reconnectAttempts: 0,
    isConnecting: false,
    ...overrides,
  }),

  routerWrapper: (initialEntries = ['/']) => {
    const { MemoryRouter } = require('react-router-dom');
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(MemoryRouter, { initialEntries }, children);
  },
};

// Add custom matchers
expect.extend({
  toBeVisibleToUser(received) {
    const element = received as Element;
    const style = window.getComputedStyle(element);
    
    const isVisible = 
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetHeight > 0 &&
      element.offsetWidth > 0;

    return {
      message: () => 
        isVisible 
          ? `Expected element to not be visible to user`
          : `Expected element to be visible to user`,
      pass: isVisible,
    };
  },

  toHaveNoWhiteScreen(received) {
    const element = received as Element;
    const hasContent = 
      (element.textContent?.trim().length || 0) > 0 ||
      element.querySelector('img, svg, canvas, video') !== null ||
      element.children.length > 0;

    return {
      message: () =>
        hasContent
          ? `Expected element to have white screen`
          : `Expected element to not have white screen`,
      pass: hasContent,
    };
  },

  toBeAccessible(received) {
    const element = received as Element;
    const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
    const hasRole = element.hasAttribute('role');
    const isSemanticElement = ['button', 'link', 'heading', 'main', 'nav', 'article'].includes(element.tagName.toLowerCase());

    const isAccessible = hasAriaLabel || hasRole || isSemanticElement;

    return {
      message: () =>
        isAccessible
          ? `Expected element to not be accessible`
          : `Expected element to be accessible`,
      pass: isAccessible,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisibleToUser(): R;
      toHaveNoWhiteScreen(): R;
      toBeAccessible(): R;
    }
  }
}

export default testUtils;