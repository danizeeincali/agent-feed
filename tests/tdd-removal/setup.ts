/**
 * TDD Test Setup for Workflow Removal Test Suite
 *
 * Configures the testing environment for SPARC Refinement phase
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock console methods to reduce test noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Mock console methods but allow important messages through
  console.error = (...args: any[]) => {
    // Allow specific error messages that are expected during testing
    const message = args[0]?.toString() || '';
    const allowedErrors = [
      'Warning: ReactDOM.render is no longer supported',
      'Warning: An invalid form control',
      'The above error occurred in the'
    ];

    if (allowedErrors.some(allowed => message.includes(allowed))) {
      return;
    }

    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const allowedWarnings = [
      'Warning: componentWillMount has been renamed',
      'Warning: React.createFactory() is deprecated'
    ];

    if (allowedWarnings.some(allowed => message.includes(allowed))) {
      return;
    }

    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock performance API for performance tests
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock
});

// Mock WebSocket for WebSocketProvider tests
global.WebSocket = class WebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocket.CONNECTING;
  url = '';

  constructor(url: string) {
    this.url = url;
    // Simulate successful connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen({} as Event);
    }, 0);
  }

  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
};

// Mock fetch for API tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: () => ({}) as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData())
  })
) as jest.Mock;

// Setup for React Router tests
const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default'
};

// Mock React Router hooks
jest.mock('react-router-dom', () => {
  const actualRouter = jest.requireActual('react-router-dom');
  return {
    ...actualRouter,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    MemoryRouter: actualRouter.MemoryRouter
  };
});

// Mock React Query client
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    QueryClient: jest.fn(() => ({
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
      removeQueries: jest.fn(),
      clear: jest.fn(),
      getMutationCache: jest.fn(() => ({
        clear: jest.fn()
      })),
      getQueryCache: jest.fn(() => ({
        clear: jest.fn()
      }))
    }))
  };
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | object): R;
    }
  }
}

// TDD-specific setup for workflow removal tests
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Reset localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();

  // Reset navigation mock
  mockNavigate.mockClear();

  // Reset performance mocks
  const performanceMock = window.performance as jest.Mocked<typeof window.performance>;
  performanceMock.now.mockClear();
  performanceMock.getEntriesByType.mockClear();
});

// Global error handler for tests
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection during test:', reason);
});

// Configure test environment
process.env.NODE_ENV = 'test';