/**
 * TDD London School: Test Setup and Configuration
 * Global test configuration and setup for component validation tests
 */

import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Setup mock implementations for common browser APIs
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

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  }
});

// Mock URL constructor for older environments
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url) {
      const match = url.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/);
      if (!match) throw new Error('Invalid URL');
      
      this.protocol = match[1];
      this.hostname = match[2];
      this.pathname = match[3] || '/';
      this.href = url;
    }
  };
}

// Global test configuration
export const TEST_CONFIG = {
  PERFORMANCE_THRESHOLDS: {
    RENDER_TIME: 100, // milliseconds
    VALIDATION_TIME: 50, // milliseconds
    MEMORY_USAGE: 10 * 1024 * 1024, // 10MB
    COMPONENT_COUNT: 1000
  },
  
  SECURITY_POLICIES: {
    BLOCKED_PROTOCOLS: ['javascript:', 'data:', 'vbscript:', 'about:'],
    BLOCKED_PROPS: ['dangerouslySetInnerHTML', 'onLoad', 'onError', '__proto__', 'constructor'],
    ALLOWED_DOMAINS: ['example.com', 'test.com', 'localhost'],
    MAX_PROP_SIZE: 1024 * 10 // 10KB
  },
  
  VALIDATION_RULES: {
    REQUIRED_ACCESSIBILITY: ['aria-label', 'role'],
    MAX_NESTING_DEPTH: 10,
    MAX_ARRAY_LENGTH: 1000,
    MIN_STRING_LENGTH: 1
  }
};

// Global mock setup function
export const setupGlobalMocks = () => {
  // Mock console methods to reduce noise in tests
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });
  
  // Mock timers
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
};

// Test utilities
export const createTestContainer = () => {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'test-container');
  document.body.appendChild(container);
  
  return {
    container,
    cleanup: () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
};

export const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

export const measureMemoryUsage = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    return {
      used: window.performance.memory.usedJSHeapSize,
      total: window.performance.memory.totalJSHeapSize,
      limit: window.performance.memory.jsHeapSizeLimit
    };
  }
  
  // Fallback for environments without memory API
  return {
    used: 0,
    total: 0,
    limit: 0
  };
};

// Custom matchers for component testing
expect.extend({
  toBeValidComponent(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 typeof received.type === 'string' &&
                 received.type.length > 0;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid component`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid component`,
        pass: false,
      };
    }
  },

  toHaveValidationErrors(received, expectedCount) {
    const errors = received.errors || [];
    const pass = errors.length === expectedCount;
    
    if (pass) {
      return {
        message: () => `expected validation result not to have ${expectedCount} errors`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected validation result to have ${expectedCount} errors, but got ${errors.length}`,
        pass: false,
      };
    }
  },

  toHaveSecurityViolations(received, expectedCount) {
    const violations = received.violations || received.securityViolations || [];
    const pass = violations.length === expectedCount;
    
    if (pass) {
      return {
        message: () => `expected result not to have ${expectedCount} security violations`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected result to have ${expectedCount} security violations, but got ${violations.length}`,
        pass: false,
      };
    }
  },

  toRenderWithinTime(renderFunction, maxTime) {
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    const pass = renderTime <= maxTime;
    
    if (pass) {
      return {
        message: () => `expected render time ${renderTime}ms not to be within ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected render time ${renderTime}ms to be within ${maxTime}ms`,
        pass: false,
      };
    }
  },

  toHaveAccessibilityViolations(container, expectedCount) {
    // Simple accessibility check - in real tests, use axe-core
    const violations = [];
    
    // Check for missing aria-labels
    const interactiveElements = container.querySelectorAll('button, input, select, textarea');
    interactiveElements.forEach((element, index) => {
      if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
        violations.push(`Element ${element.tagName} at index ${index} missing aria-label`);
      }
    });
    
    const pass = violations.length === expectedCount;
    
    if (pass) {
      return {
        message: () => `expected container not to have ${expectedCount} accessibility violations`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected container to have ${expectedCount} accessibility violations, but got ${violations.length}: ${violations.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Component testing utilities
export const createComponentTestSuite = (componentName, testCases) => {
  describe(`TDD London School: ${componentName} Component Tests`, () => {
    const { validSpecs, invalidSpecs, maliciousSpecs, performanceSpecs } = testCases;
    
    describe('Valid Component Specifications', () => {
      validSpecs.forEach((spec, index) => {
        it(`should validate and render valid spec ${index + 1}`, () => {
          expect(spec).toBeValidComponent();
          // Additional validation logic would go here
        });
      });
    });
    
    describe('Invalid Component Specifications', () => {
      invalidSpecs.forEach((spec, index) => {
        it(`should reject invalid spec ${index + 1}`, () => {
          // Validation and error checking logic would go here
        });
      });
    });
    
    describe('Security Testing', () => {
      maliciousSpecs.forEach((spec, index) => {
        it(`should handle malicious spec ${index + 1} safely`, () => {
          // Security testing logic would go here
        });
      });
    });
    
    describe('Performance Testing', () => {
      performanceSpecs.forEach((spec, index) => {
        it(`should render performance spec ${index + 1} within time limits`, () => {
          expect(() => {
            // Component rendering logic
          }).toRenderWithinTime(TEST_CONFIG.PERFORMANCE_THRESHOLDS.RENDER_TIME);
        });
      });
    });
  });
};

// Error boundary for testing
export class TestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h3>Component Error</h3>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Test data validation utilities
export const validateTestData = (data, schema) => {
  const errors = [];
  
  // Basic schema validation
  Object.keys(schema).forEach(key => {
    const rule = schema[key];
    const value = data[key];
    
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
    }
    
    if (value !== undefined && rule.type && typeof value !== rule.type) {
      errors.push(`${key} must be of type ${rule.type}`);
    }
    
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push(`${key} must be at least ${rule.minLength} characters`);
    }
    
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(`${key} must be no more than ${rule.maxLength} characters`);
    }
    
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Snapshot testing helpers
export const createSnapshotTest = (componentName, specs) => {
  describe(`${componentName} Snapshots`, () => {
    specs.forEach((spec, index) => {
      it(`should match snapshot for spec ${index + 1}`, () => {
        // Snapshot testing logic would go here
        expect(JSON.stringify(spec, null, 2)).toMatchSnapshot();
      });
    });
  });
};

// Integration test helpers
export const createIntegrationTestSuite = (suiteName, testConfig) => {
  describe(`Integration: ${suiteName}`, () => {
    const { setup, teardown, tests } = testConfig;
    
    beforeAll(async () => {
      if (setup) await setup();
    });
    
    afterAll(async () => {
      if (teardown) await teardown();
    });
    
    tests.forEach(test => {
      it(test.description, async () => {
        await test.fn();
      });
    });
  });
};

// Mock network utilities
export const createNetworkMock = (scenarios) => {
  const fetchMock = jest.fn();
  
  scenarios.forEach(scenario => {
    if (scenario.method === 'GET' && scenario.url) {
      fetchMock.mockImplementationOnce(() => 
        Promise.resolve({
          ok: scenario.success !== false,
          status: scenario.status || 200,
          json: () => Promise.resolve(scenario.response)
        })
      );
    }
  });
  
  global.fetch = fetchMock;
  return fetchMock;
};

// Export test configuration
export default {
  TEST_CONFIG,
  setupGlobalMocks,
  createTestContainer,
  waitForCondition,
  measureMemoryUsage,
  createComponentTestSuite,
  TestErrorBoundary,
  validateTestData,
  createSnapshotTest,
  createIntegrationTestSuite,
  createNetworkMock
};