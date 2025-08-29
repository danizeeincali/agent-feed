/**
 * Test Setup for Instance Endpoint Consistency Tests
 * 
 * Global configuration and utilities for the endpoint consistency test suite
 */

// Mock console methods to capture test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Enhanced console logging for test analysis
console.error = (...args) => {
  // Always show error analysis from tests
  if (args[0] && typeof args[0] === 'string' && 
      (args[0].includes('🚨') || args[0].includes('ANALYSIS'))) {
    originalConsoleError('\n' + '='.repeat(80));
    originalConsoleError(...args);
    originalConsoleError('='.repeat(80) + '\n');
  } else {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('⚠️')) {
    originalConsoleWarn('\n' + '-'.repeat(80));
    originalConsoleWarn(...args);  
    originalConsoleWarn('-'.repeat(80) + '\n');
  } else {
    originalConsoleWarn(...args);
  }
};

console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('✅')) {
    originalConsoleLog('\n' + '+'.repeat(80));
    originalConsoleLog(...args);
    originalConsoleLog('+'.repeat(80) + '\n');
  } else {
    originalConsoleLog(...args);
  }
};

// Global test utilities
global.testUtils = {
  // Restore original console methods if needed
  restoreConsole: () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  },
  
  // Test timing utilities
  measurePerformance: (fn) => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  },
  
  // Async performance measurement
  measurePerformanceAsync: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }
};

// Mock fetch globally - will be overridden by individual tests
global.fetch = jest.fn();

// Mock EventSource for SSE testing
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
};

// Mock performance.now() if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now()
  };
}

// Test environment detection
global.isTestEnvironment = true;

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});

// Enhanced expect matchers for endpoint testing
expect.extend({
  toBeValidEndpointResponse(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 typeof received.ok === 'boolean' &&
                 typeof received.status === 'number';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid endpoint response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid endpoint response with ok and status properties`,
        pass: false,
      };
    }
  },
  
  toHaveEndpointConsistency(received) {
    const responses = Array.isArray(received) ? received : [received];
    const statusCodes = responses.map(r => r.status);
    const uniqueStatusCodes = [...new Set(statusCodes)];
    
    const pass = uniqueStatusCodes.length === 1;
    
    if (pass) {
      return {
        message: () => `expected responses to have inconsistent status codes`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected responses to have consistent status codes, but got: ${statusCodes.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Test result tracking for analysis
global.testResults = {
  failureAnalysis: [],
  performanceMetrics: [],
  
  recordFailure: (testName, analysis) => {
    global.testResults.failureAnalysis.push({
      testName,
      analysis,
      timestamp: new Date().toISOString()
    });
  },
  
  recordPerformance: (testName, metrics) => {
    global.testResults.performanceMetrics.push({
      testName,
      metrics,
      timestamp: new Date().toISOString()  
    });
  },
  
  getSummary: () => {
    return {
      totalFailures: global.testResults.failureAnalysis.length,
      averageResponseTime: global.testResults.performanceMetrics.reduce((avg, metric) => {
        const responseTime = metric.metrics.responseTime || metric.metrics.duration || 0;
        return avg + responseTime;
      }, 0) / Math.max(global.testResults.performanceMetrics.length, 1),
      failuresByType: global.testResults.failureAnalysis.reduce((types, failure) => {
        const type = failure.analysis.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {})
    };
  }
};

// Cleanup on test suite completion
afterAll(() => {
  // Print test summary
  const summary = global.testResults.getSummary();
  
  console.log('\n' + '='.repeat(100));
  console.log('📊 ENDPOINT CONSISTENCY TEST SUITE SUMMARY');
  console.log('='.repeat(100));
  console.log(`Total Failure Analyses: ${summary.totalFailures}`);
  console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`Failure Types:`, summary.failuresByType);
  console.log('='.repeat(100) + '\n');
  
  // Restore console methods
  global.testUtils.restoreConsole();
});