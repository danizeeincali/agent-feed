/**
 * Test Setup for TokenAnalyticsDashboard
 *
 * This setup file configures the test environment to properly handle:
 * - Chart.js and react-chartjs-2 components
 * - Canvas and 2D context mocking
 * - ResizeObserver and other browser APIs
 * - Global mocks and polyfills
 *
 * Tests will FAIL if chart dependencies cannot be properly mocked/imported
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Global test configuration
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeChartCanvas(): T;
      toHaveChartData(): T;
      toRenderChart(): T;
    }
  }
}

// Canvas and 2D Context Mocking
const mockCanvas = () => {
  const mockContext = {
    // Drawing methods
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 100, height: 12 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),

    // Canvas properties
    canvas: {
      width: 800,
      height: 400,
      style: {},
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },

    // Style properties
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDashOffset: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: '',
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'ltr',
    imageSmoothingEnabled: true,
  };

  return {
    getContext: vi.fn(() => mockContext),
    width: 800,
    height: 400,
    style: {},
    getAttribute: vi.fn(),
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,'),
    toBlob: vi.fn(),
    getClientRects: vi.fn(() => []),
    getBoundingClientRect: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 400,
      top: 0,
      right: 800,
      bottom: 400,
      left: 0,
      toJSON: vi.fn(),
    })),
  };
};

// Global mocks setup
beforeAll(() => {
  // Mock HTMLCanvasElement
  Object.defineProperty(window, 'HTMLCanvasElement', {
    value: vi.fn().mockImplementation(() => mockCanvas()),
    writable: true,
  });

  // Mock canvas getContext globally
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType) => {
    if (contextType === '2d') {
      return mockCanvas().getContext();
    }
    return null;
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn().mockImplementation((callback) => {
    return setTimeout(callback, 16); // ~60fps
  });

  global.cancelAnimationFrame = vi.fn().mockImplementation((id) => {
    clearTimeout(id);
  });

  // Mock performance.now for consistent timing tests
  Object.defineProperty(global.performance, 'now', {
    value: vi.fn(() => Date.now()),
    writable: true,
  });

  // Mock URL.createObjectURL and revokeObjectURL for download tests
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
  });

  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  });

  // Mock document.createElement for download link creation
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = vi.fn().mockImplementation((tagName) => {
    if (tagName === 'a') {
      return {
        style: {},
        href: '',
        download: '',
        click: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
      };
    }
    if (tagName === 'canvas') {
      return mockCanvas();
    }
    return originalCreateElement(tagName);
  });

  // Mock document methods for download functionality
  document.body.appendChild = vi.fn();
  document.body.removeChild = vi.fn();

  // Mock window.alert for error handling tests
  window.alert = vi.fn();

  // Mock console methods to reduce noise in tests
  console.error = vi.fn();
  console.warn = vi.fn();
  console.log = vi.fn();

  // Mock fetch for API tests
  global.fetch = vi.fn();

  // Mock matchMedia for responsive design tests
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });

  // Mock getComputedStyle for style calculations
  Object.defineProperty(window, 'getComputedStyle', {
    value: vi.fn().mockImplementation(() => ({
      getPropertyValue: vi.fn(() => ''),
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#000000',
    })),
    writable: true,
  });
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();

  // Reset fetch mock to default behavior
  (global.fetch as any).mockClear();

  // Reset console mocks
  (console.error as any).mockClear();
  (console.warn as any).mockClear();
  (console.log as any).mockClear();

  // Reset URL mocks
  (window.URL.createObjectURL as any).mockClear();
  (window.URL.revokeObjectURL as any).mockClear();

  // Reset document mocks
  (document.createElement as any).mockClear();
  (document.body.appendChild as any).mockClear();
  (document.body.removeChild as any).mockClear();

  // Reset performance mock
  (global.performance.now as any).mockClear();
});

// Cleanup after each test
afterEach(() => {
  // Additional cleanup if needed
  vi.clearAllTimers();
});

// Custom Jest matchers for chart testing
expect.extend({
  toBeChartCanvas(received) {
    const pass = received && received.tagName === 'CANVAS' && received.getContext;
    return {
      message: () =>
        pass
          ? `Expected element not to be a chart canvas`
          : `Expected element to be a chart canvas with getContext method`,
      pass,
    };
  },

  toHaveChartData(received) {
    const dataAttr = received.getAttribute?.('data-chart-data');
    const pass = dataAttr && dataAttr !== 'undefined' && dataAttr !== 'null';
    return {
      message: () =>
        pass
          ? `Expected element not to have chart data`
          : `Expected element to have valid chart data attribute`,
      pass,
    };
  },

  toRenderChart(received) {
    const hasCanvas = received.querySelector?.('canvas');
    const hasChartData = received.getAttribute?.('data-chart-data') ||
                         received.querySelector?.('[data-chart-data]');
    const pass = hasCanvas && hasChartData;
    return {
      message: () =>
        pass
          ? `Expected element not to render a chart`
          : `Expected element to render a chart with canvas and data`,
      pass,
    };
  },
});

// Chart.js test utilities
export const createMockChartData = (type: 'line' | 'bar' = 'line') => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Test Dataset',
      data: [10, 20, 30, 25, 35],
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      ...(type === 'line' && { tension: 0.1 }),
    }],
  };
};

export const createMockChartOptions = () => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Test Chart',
      },
    },
    scales: {
      x: {
        display: true,
      },
      y: {
        display: true,
      },
    },
  };
};

// Test error handlers
export const expectChartError = (error: Error, expectedType: 'import' | 'render' | 'data') => {
  switch (expectedType) {
    case 'import':
      expect(error.message).toMatch(/import|module|chart/i);
      break;
    case 'render':
      expect(error.message).toMatch(/render|canvas|context/i);
      break;
    case 'data':
      expect(error.message).toMatch(/data|dataset|labels/i);
      break;
    default:
      throw new Error(`Unknown error type: ${expectedType}`);
  }
};

// Performance testing helpers
export const measureTestPerformance = async (testFunction: () => Promise<void> | void) => {
  const startTime = performance.now();
  await testFunction();
  const endTime = performance.now();
  return endTime - startTime;
};

export const expectPerformanceWithinLimit = (actualTime: number, maxTime: number = 1000) => {
  expect(actualTime).toBeLessThan(maxTime);
  if (actualTime > maxTime * 0.8) {
    console.warn(`Test performance warning: ${actualTime}ms (close to limit of ${maxTime}ms)`);
  }
};

// Export test configuration
export const testConfig = {
  chartTimeout: 5000,
  renderTimeout: 3000,
  apiTimeout: 2000,
  performanceLimit: 1000,
};

console.log('TokenAnalyticsDashboard test setup completed');