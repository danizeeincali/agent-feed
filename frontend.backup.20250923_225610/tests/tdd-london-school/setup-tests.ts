import '@testing-library/jest-dom';
import { vi } from 'vitest';

// London School TDD Setup
// Focus on behavior verification and interaction testing

// Global mock setup for consistent behavior verification
global.fetch = vi.fn();

// Mock console to verify logging interactions
const originalConsole = { ...console };
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn()
};

// Mock localStorage for state interaction testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage for session interaction testing
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock window.location for navigation interaction testing
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
});

// Error boundary mock for error handling interaction testing
global.ErrorBoundary = vi.fn(({ children, fallback }) => {
  try {
    return children;
  } catch (error) {
    return fallback || 'Error occurred';
  }
});

// Intersection Observer mock for component interaction testing
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// ResizeObserver mock for responsive interaction testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// WebSocket mock for real-time interaction testing
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test for clean interaction verification
  vi.clearAllMocks();
  
  // Reset DOM for clean component testing
  document.body.innerHTML = '';
  
  // Reset local/session storage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

afterEach(() => {
  // Verify no unexpected interactions occurred
  vi.clearAllTimers();
  vi.restoreAllMocks();
});

// Global error handler for uncaught test errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// London School specific utilities
export const createSwarmMock = (mockName: string, mockImplementation: Record<string, any>) => {
  const mock = {
    ...mockImplementation,
    __mockName: mockName,
    __swarmContract: true
  };
  
  // Add interaction tracking
  Object.keys(mockImplementation).forEach(method => {
    mock[method] = vi.fn(mockImplementation[method]);
  });
  
  return mock;
};

export const verifyInteractionSequence = (mocks: any[], expectedSequence: string[]) => {
  const actualCalls = mocks.map(mock => mock.mock.calls).flat();
  const actualSequence = actualCalls.map((call, index) => `${mocks.findIndex(m => m.mock.calls.includes(call))}-${index}`);
  
  expect(actualSequence).toEqual(expectedSequence);
};

export const createMockContract = (contractName: string, methods: string[]): Record<string, any> => {
  const contract: Record<string, any> = {};
  methods.forEach(method => {
    contract[method] = vi.fn().mockName(`${contractName}.${method}`);
  });
  
  return contract;
};