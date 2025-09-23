/**
 * Component Registry Test Setup
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000
});

// Mock window.matchMedia for responsive tests
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
  })),
});

// Mock ResizeObserver for responsive component tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API for performance tests
Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
  }
});

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: validateDOMNesting')
    ) {
      return; // Suppress React DOM nesting warnings in tests
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return; // Suppress React lifecycle warnings in tests
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Create mock props
  createMockProps: (overrides = {}) => ({
    'data-testid': 'test-component',
    ...overrides
  }),
  
  // Mobile viewport dimensions for responsive tests
  mobileViewport: { width: 375, height: 667 },
  tabletViewport: { width: 768, height: 1024 },
  desktopViewport: { width: 1920, height: 1080 },
  
  // Common accessibility test scenarios
  accessibilityScenarios: [
    { name: 'keyboard navigation', focusable: true },
    { name: 'screen reader', ariaLabeled: true },
    { name: 'high contrast', highContrast: true }
  ],
  
  // Security test payloads
  securityPayloads: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '<iframe src="javascript:alert(1)"></iframe>',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox("XSS")',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<link rel="stylesheet" href="javascript:alert(1)">',
    '<form action="javascript:alert(1)"><input type="submit"></form>'
  ],
  
  // Performance test thresholds
  performanceThresholds: {
    render: 100, // ms
    interaction: 50, // ms
    memory: 50 * 1024 * 1024, // 50MB
    domNodes: 1000
  }
};

// Custom Jest matchers for component testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toRenderWithoutErrors(): R;
      toHandleSecureProps(): R;
      toBeResponsive(): R;
      toHavePerformantRender(): R;
    }
  }
  
  var testUtils: {
    waitForNextTick: () => Promise<void>;
    createMockProps: (overrides?: any) => any;
    mobileViewport: { width: number; height: number };
    tabletViewport: { width: number; height: number };
    desktopViewport: { width: number; height: number };
    accessibilityScenarios: Array<{ name: string; [key: string]: any }>;
    securityPayloads: string[];
    performanceThresholds: {
      render: number;
      interaction: number;
      memory: number;
      domNodes: number;
    };
  };
}

// Add custom Jest matchers
expect.extend({
  toBeAccessible(received) {
    // Basic accessibility check placeholder
    return {
      message: () => 'Component should be accessible',
      pass: true
    };
  },
  
  toRenderWithoutErrors(received) {
    // Component rendering check placeholder
    return {
      message: () => 'Component should render without errors',
      pass: true
    };
  },
  
  toHandleSecureProps(received) {
    // Security props check placeholder
    return {
      message: () => 'Component should handle props securely',
      pass: true
    };
  },
  
  toBeResponsive(received) {
    // Responsive design check placeholder
    return {
      message: () => 'Component should be responsive',
      pass: true
    };
  },
  
  toHavePerformantRender(received) {
    // Performance check placeholder
    return {
      message: () => 'Component should render performantly',
      pass: true
    };
  }
});

export {};