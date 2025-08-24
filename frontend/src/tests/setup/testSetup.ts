/**
 * Jest Test Setup Configuration
 * Sets up testing environment for React components and DOM testing
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia which is not implemented in JSDOM
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

// Mock ResizeObserver which is not available in test environment
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

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock canvas context for xterm
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
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
}));

// Suppress specific console warnings that are expected in test environment
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress known test environment warnings
  if (
    message.includes('Warning: validateDOMNesting') ||
    message.includes('Warning: React.jsx') ||
    message.includes('Warning: Each child in a list') ||
    message.includes('act(() => { ... })') ||
    message.includes('Warning: ReactDOM.render') ||
    message.includes('Not implemented: HTMLCanvasElement.prototype.getContext') ||
    message.includes('Warning: An update to') ||
    message.includes('inside a test was not wrapped in act') ||
    message.includes('ReactDOMTestUtils.act')
  ) {
    return;
  }
  
  originalError(...args);
};

// Set up fetch mock
global.fetch = jest.fn();

// Increase test timeout for complex integration tests
jest.setTimeout(30000);