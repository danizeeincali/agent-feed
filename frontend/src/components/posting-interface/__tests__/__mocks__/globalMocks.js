/**
 * Global Mocks for Avi DM Component Tests
 * Sets up essential mocks that are needed across all tests
 */

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
});

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
  thresholds: [0],
  root: null,
  rootMargin: '0px'
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock HTMLElement.offsetHeight and offsetWidth
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get() { return parseFloat(this.style.height) || 0; }
  },
  offsetWidth: {
    get() { return parseFloat(this.style.width) || 0; }
  }
});

// Mock window.getComputedStyle
global.getComputedStyle = jest.fn(() => ({
  getPropertyValue: jest.fn(() => ''),
  display: 'block',
  appearance: ['-webkit-appearance']
}));

// Mock URL constructor
global.URL = jest.fn().mockImplementation((url, base) => ({
  href: base ? `${base}${url}` : url,
  origin: base || 'http://localhost:3000',
  pathname: url.split('?')[0],
  search: url.includes('?') ? url.split('?')[1] : '',
  searchParams: {
    set: jest.fn(),
    get: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    append: jest.fn(),
    toString: jest.fn(() => '')
  },
  toString: jest.fn(() => url)
}));

// Mock EventSource for streaming tests
global.EventSource = jest.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  close: jest.fn(),
  readyState: 0,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
  url: '',
  withCredentials: false
}));

// Mock WebSocket for real-time features
global.WebSocket = jest.fn().mockImplementation(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  protocol: '',
  url: ''
}));

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  onabort: null,
  onloadstart: null,
  onloadend: null,
  onprogress: null,
  readAsDataURL: jest.fn(function(file) {
    setTimeout(() => {
      this.result = `data:${file.type};base64,mockbase64data`;
      if (this.onload) this.onload({ target: { result: this.result } });
    }, 0);
  }),
  readAsText: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  readAsBinaryString: jest.fn(),
  abort: jest.fn(),
  result: null,
  error: null,
  readyState: 0,
  EMPTY: 0,
  LOADING: 1,
  DONE: 2
}));

// Mock Blob constructor
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: parts ? parts.reduce((acc, part) => acc + part.length, 0) : 0,
  type: options?.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
  arrayBuffer: jest.fn()
}));

// Mock File constructor
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  ...new Blob(bits, options),
  name,
  lastModified: Date.now(),
  webkitRelativePath: ''
}));

// Mock FormData
global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  forEach: jest.fn()
}));

// Mock performance.mark and measure
if (!global.performance.mark) {
  global.performance.mark = jest.fn();
}
if (!global.performance.measure) {
  global.performance.measure = jest.fn();
}
if (!global.performance.now) {
  global.performance.now = jest.fn(() => Date.now());
}

// Mock navigator.clipboard
if (!global.navigator.clipboard) {
  global.navigator.clipboard = {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
    write: jest.fn(() => Promise.resolve()),
    read: jest.fn(() => Promise.resolve([]))
  };
}

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
});

if (!global.localStorage) {
  global.localStorage = createStorageMock();
}
if (!global.sessionStorage) {
  global.sessionStorage = createStorageMock();
}

// Mock fetch if not already mocked
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Map(),
      clone: jest.fn()
    })
  );
}

// Mock console methods to reduce test noise
const originalConsole = { ...console };
console.error = jest.fn();
console.warn = jest.fn();
console.log = jest.fn();
console.info = jest.fn();
console.debug = jest.fn();

// Restore console for specific test environments
if (process.env.NODE_ENV === 'test' && process.env.JEST_VERBOSE === 'true') {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
}

// Mock react-router-dom if used
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null
  }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()]
}));

// Mock react-query if not already mocked
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isLoading: false,
    error: null,
    data: null
  })),
  QueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn()
  })),
  QueryClientProvider: ({ children }) => children
}));

// Export for use in tests
module.exports = {
  createStorageMock,
  originalConsole
};