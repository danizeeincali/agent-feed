/**
 * SSE Migration Test Configuration
 * Comprehensive configuration for all test types
 */

export interface TestConfig {
  sse: {
    endpoint: string;
    reconnectInterval: number;
    maxRetries: number;
    timeout: number;
  };
  http: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  performance: {
    maxConnectionTime: number;
    maxMemoryUsage: number;
    messageThroughput: number;
  };
  mock: {
    port: number;
    delay: number;
    errorRate: number;
  };
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  sse: {
    endpoint: 'http://localhost:3001/events',
    reconnectInterval: 1000,
    maxRetries: 3,
    timeout: 5000,
  },
  http: {
    baseUrl: 'http://localhost:3001/api',
    timeout: 3000,
    retries: 2,
  },
  performance: {
    maxConnectionTime: 1000, // 1 second
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    messageThroughput: 100, // messages per second
  },
  mock: {
    port: 3002,
    delay: 100,
    errorRate: 0.1, // 10% error rate
  },
};

export const TEST_ENVIRONMENTS = {
  development: {
    ...DEFAULT_TEST_CONFIG,
    mock: { ...DEFAULT_TEST_CONFIG.mock, errorRate: 0.2 },
  },
  ci: {
    ...DEFAULT_TEST_CONFIG,
    performance: {
      ...DEFAULT_TEST_CONFIG.performance,
      maxConnectionTime: 2000,
    },
  },
  local: DEFAULT_TEST_CONFIG,
};

export const TEST_SCENARIOS = {
  // Connection scenarios
  normalConnection: {
    name: 'Normal SSE Connection',
    config: DEFAULT_TEST_CONFIG,
    expectedBehavior: 'Connects successfully and maintains connection',
  },
  slowNetwork: {
    name: 'Slow Network Conditions',
    config: {
      ...DEFAULT_TEST_CONFIG,
      mock: { ...DEFAULT_TEST_CONFIG.mock, delay: 2000 },
    },
    expectedBehavior: 'Handles slow responses gracefully',
  },
  networkFailure: {
    name: 'Network Failure Recovery',
    config: {
      ...DEFAULT_TEST_CONFIG,
      mock: { ...DEFAULT_TEST_CONFIG.mock, errorRate: 0.8 },
    },
    expectedBehavior: 'Recovers from network failures',
  },
  
  // Message scenarios
  highVolume: {
    name: 'High Volume Messages',
    config: {
      ...DEFAULT_TEST_CONFIG,
      performance: {
        ...DEFAULT_TEST_CONFIG.performance,
        messageThroughput: 1000,
      },
    },
    expectedBehavior: 'Handles high message volume',
  },
  largeMessages: {
    name: 'Large Message Payloads',
    config: DEFAULT_TEST_CONFIG,
    expectedBehavior: 'Processes large messages efficiently',
  },
  
  // Error scenarios
  serverError: {
    name: 'Server Error Handling',
    config: {
      ...DEFAULT_TEST_CONFIG,
      mock: { ...DEFAULT_TEST_CONFIG.mock, errorRate: 1.0 },
    },
    expectedBehavior: 'Handles server errors gracefully',
  },
  connectionDrop: {
    name: 'Connection Drop Recovery',
    config: DEFAULT_TEST_CONFIG,
    expectedBehavior: 'Automatically reconnects after connection drop',
  },
};

export const PERFORMANCE_THRESHOLDS = {
  connectionTime: {
    excellent: 200,
    good: 500,
    acceptable: 1000,
    poor: 2000,
  },
  memoryUsage: {
    excellent: 10 * 1024 * 1024, // 10MB
    good: 25 * 1024 * 1024, // 25MB
    acceptable: 50 * 1024 * 1024, // 50MB
    poor: 100 * 1024 * 1024, // 100MB
  },
  throughput: {
    excellent: 500,
    good: 200,
    acceptable: 100,
    poor: 50,
  },
};