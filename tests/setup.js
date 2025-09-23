require('@testing-library/jest-dom');

// Mock fetch globally
global.fetch = jest.fn();

// Mock console.error to reduce noise in tests
const originalError = console.error;
console.error = (...args) => {
  // Suppress specific warnings we expect
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is deprecated') ||
    args[0]?.includes?.('Warning: validateDOMNesting')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  if (fetch.mockClear) {
    fetch.mockClear();
  }
});