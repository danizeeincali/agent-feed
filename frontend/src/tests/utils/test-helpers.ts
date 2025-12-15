/**
 * Test Utilities and Helpers
 * Common utilities for testing Claude SDK analytics integration
 */

import { vi, Mock } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { mockClaudeCodeAPI } from '@/tests/mocks/claude-code-sdk.mock';
import { CostTrackingService, CostTrackingConfig } from '@/services/cost-tracking/CostTrackingService';
import { SAMPLE_TOKEN_USAGE, TEST_CONFIGS, testDataUtils } from '@/tests/fixtures/analytics-test-data';

/**
 * Test environment detection
 */
export const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' ||
         typeof jest !== 'undefined' ||
         typeof vitest !== 'undefined';
};

/**
 * Create a test query client with disabled retry and caching
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  });
};

/**
 * Mock localStorage implementation for testing
 */
export const createMockLocalStorage = () => {
  const storage = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
    key: vi.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    }),
    length: storage.size
  };
};

/**
 * Setup global mocks for testing
 */
export const setupGlobalMocks = () => {
  // Mock localStorage
  const mockLocalStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  // Mock fetch
  global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    return mockClaudeCodeAPI.mockFetch(url, options);
  });

  // Mock performance API
  if (!global.performance) {
    global.performance = {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn()
    } as any;
  }

  // Mock console methods to avoid noise in tests
  const originalConsole = { ...console };
  console.warn = vi.fn();
  console.error = vi.fn();

  return {
    mockLocalStorage,
    mockFetch: global.fetch as Mock,
    restoreConsole: () => {
      Object.assign(console, originalConsole);
    }
  };
};

/**
 * Cleanup global mocks after testing
 */
export const cleanupGlobalMocks = () => {
  vi.restoreAllMocks();
  mockClaudeCodeAPI.reset();
};

/**
 * Create a test cost tracking service with predefined data
 */
export const createTestCostTrackingService = (
  config: Partial<CostTrackingConfig> = {},
  preloadData: boolean = false
): CostTrackingService => {
  const testConfig = {
    ...TEST_CONFIGS.default,
    ...config,
    storageKey: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  const service = new CostTrackingService(testConfig);

  if (preloadData) {
    // Add sample data
    SAMPLE_TOKEN_USAGE.forEach(async (usage) => {
      await service.trackTokenUsage({
        provider: usage.provider,
        model: usage.model,
        tokensUsed: usage.tokensUsed,
        requestType: usage.requestType,
        component: usage.component,
        sessionId: usage.sessionId,
        metadata: usage.metadata
      });
    });
  }

  return service;
};

/**
 * Wait for a condition to be true with timeout
 */
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Simulate delay for testing async operations
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Mock API response helpers
 */
export const mockApiHelpers = {
  /**
   * Setup successful API response
   */
  mockSuccess: (data: any, endpoint: string = 'streaming-chat') => {
    mockClaudeCodeAPI.setResponse({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    }, endpoint);
  },

  /**
   * Setup API error response
   */
  mockError: (error: string, details?: string, endpoint: string = 'streaming-chat') => {
    mockClaudeCodeAPI.setResponse({
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    }, endpoint);
  },

  /**
   * Setup API with delay
   */
  mockWithDelay: (data: any, delayMs: number, endpoint: string = 'streaming-chat') => {
    mockClaudeCodeAPI.setDelay(delayMs, endpoint);
    mockClaudeCodeAPI.setResponse({
      success: true,
      ...data,
      timestamp: new Date().toISOString()
    }, endpoint);
  },

  /**
   * Setup network error
   */
  mockNetworkError: (endpoint: string = 'streaming-chat') => {
    mockClaudeCodeAPI.setError(new Error('Network request failed'), endpoint);
  }
};

/**
 * Performance testing utilities
 */
export const performanceHelpers = {
  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return { result, duration };
  },

  /**
   * Run performance benchmark
   */
  benchmark: async (
    fn: () => Promise<void> | void,
    iterations: number = 10
  ): Promise<{ average: number; min: number; max: number; total: number }> => {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await performanceHelpers.measureTime(fn);
      durations.push(duration);
    }

    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / iterations;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { average, min, max, total };
  },

  /**
   * Assert performance within threshold
   */
  assertPerformance: (duration: number, threshold: number, operation: string) => {
    if (duration > threshold) {
      throw new Error(`Performance threshold exceeded for ${operation}: ${duration}ms > ${threshold}ms`);
    }
  }
};

/**
 * Data generation utilities
 */
export const dataGenerators = {
  /**
   * Generate realistic token usage patterns
   */
  generateRealisticUsage: (
    sessionCount: number = 3,
    messagesPerSession: number = 5
  ) => {
    const usage = [];
    const baseTime = Date.now();

    for (let session = 0; session < sessionCount; session++) {
      const sessionId = `session-${session + 1}`;
      const sessionStartTime = baseTime + (session * 600000); // 10 minutes apart

      for (let message = 0; message < messagesPerSession; message++) {
        const messageTime = sessionStartTime + (message * 30000); // 30 seconds apart
        const tokensUsed = 80 + Math.floor(Math.random() * 200); // 80-280 tokens

        usage.push(testDataUtils.createTokenUsage({
          id: `usage-${session}-${message}`,
          timestamp: new Date(messageTime),
          tokensUsed,
          sessionId,
          component: 'AviDirectChatSDK',
          metadata: {
            sessionIndex: session,
            messageIndex: message,
            realistic: true
          }
        }));
      }
    }

    return usage;
  },

  /**
   * Generate usage data that triggers budget alerts
   */
  generateBudgetExceedingUsage: (dailyBudget: number = 10.0) => {
    const highCostUsage = testDataUtils.createTokenUsage({
      tokensUsed: 5000000, // Very high usage
      model: 'claude-3-opus-20240229', // Expensive model
      requestType: 'tool_use',
      component: 'BudgetTest',
      metadata: { testScenario: 'budget-exceeding' }
    });

    return [highCostUsage];
  },

  /**
   * Generate concurrent session data
   */
  generateConcurrentSessions: (sessionCount: number = 5, messagesPerSession: number = 3) => {
    const usage = [];
    const baseTime = Date.now();

    for (let session = 0; session < sessionCount; session++) {
      for (let message = 0; message < messagesPerSession; message++) {
        // All sessions run concurrently
        const messageTime = baseTime + (message * 10000); // 10 seconds apart per message

        usage.push(testDataUtils.createTokenUsage({
          id: `concurrent-${session}-${message}`,
          timestamp: new Date(messageTime),
          sessionId: `concurrent-session-${session}`,
          tokensUsed: 100 + (session * 10),
          component: 'ConcurrentTest',
          metadata: {
            sessionIndex: session,
            messageIndex: message,
            concurrent: true
          }
        }));
      }
    }

    return usage;
  }
};

/**
 * Test assertion helpers
 */
export const assertionHelpers = {
  /**
   * Assert that metrics match expected values within tolerance
   */
  assertMetricsApproximate: (actual: any, expected: any, tolerance: number = 0.01) => {
    const assertNumber = (actualVal: number, expectedVal: number, field: string) => {
      const diff = Math.abs(actualVal - expectedVal);
      const relativeDiff = expectedVal !== 0 ? diff / Math.abs(expectedVal) : diff;

      if (relativeDiff > tolerance) {
        throw new Error(
          `Metrics field '${field}' differs by more than ${tolerance * 100}%: ` +
          `expected ${expectedVal}, got ${actualVal} (diff: ${diff})`
        );
      }
    };

    assertNumber(actual.totalTokensUsed, expected.totalTokensUsed, 'totalTokensUsed');
    assertNumber(actual.totalCost, expected.totalCost, 'totalCost');
    assertNumber(actual.averageCostPerToken, expected.averageCostPerToken, 'averageCostPerToken');
  },

  /**
   * Assert array contains expected items
   */
  assertArrayContains: <T>(array: T[], expectedItems: Partial<T>[], message?: string) => {
    expectedItems.forEach(expectedItem => {
      const found = array.some(item => {
        return Object.keys(expectedItem).every(key =>
          item[key as keyof T] === expectedItem[key as keyof T]
        );
      });

      if (!found) {
        throw new Error(
          `${message || 'Array'} does not contain expected item: ${JSON.stringify(expectedItem)}`
        );
      }
    });
  },

  /**
   * Assert cost tracking service state
   */
  assertServiceState: (service: CostTrackingService, expectedState: {
    totalTokens?: number;
    totalCost?: number;
    usageCount?: number;
    tolerance?: number;
  }) => {
    const metrics = service.getCostMetrics();
    const usage = service.getUsageData();
    const tolerance = expectedState.tolerance || 0.01;

    if (expectedState.totalTokens !== undefined) {
      assertionHelpers.assertMetricsApproximate(
        { totalTokensUsed: metrics.totalTokensUsed },
        { totalTokensUsed: expectedState.totalTokens },
        tolerance
      );
    }

    if (expectedState.totalCost !== undefined) {
      assertionHelpers.assertMetricsApproximate(
        { totalCost: metrics.totalCost },
        { totalCost: expectedState.totalCost },
        tolerance
      );
    }

    if (expectedState.usageCount !== undefined) {
      if (usage.length !== expectedState.usageCount) {
        throw new Error(
          `Expected ${expectedState.usageCount} usage entries, got ${usage.length}`
        );
      }
    }
  }
};

/**
 * Event testing utilities
 */
export const eventHelpers = {
  /**
   * Create a mock event listener
   */
  createMockListener: () => {
    const calls: any[] = [];
    const listener = vi.fn((...args) => calls.push(args));
    return { listener, calls };
  },

  /**
   * Wait for event to be emitted
   */
  waitForEvent: async (
    service: CostTrackingService,
    eventName: string,
    timeout: number = 1000
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        service.off(eventName, handler);
        reject(new Error(`Event '${eventName}' not emitted within ${timeout}ms`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timeoutId);
        service.off(eventName, handler);
        resolve(data);
      };

      service.on(eventName, handler);
    });
  }
};

/**
 * Component testing utilities
 */
export const componentHelpers = {
  /**
   * Find element by test ID with timeout
   */
  findByTestId: async (container: Element, testId: string, timeout: number = 5000) => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = container.querySelector(`[data-testid="${testId}"]`);
      if (element) {
        return element;
      }
      await delay(100);
    }

    throw new Error(`Element with test ID '${testId}' not found within ${timeout}ms`);
  },

  /**
   * Simulate user typing with realistic delays
   */
  simulateTyping: async (element: Element, text: string, delay: number = 50) => {
    for (const char of text) {
      const event = new KeyboardEvent('keydown', { key: char });
      element.dispatchEvent(event);

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Integration test utilities
 */
export const integrationHelpers = {
  /**
   * Setup full test environment
   */
  setupTestEnvironment: () => {
    const mocks = setupGlobalMocks();
    const queryClient = createTestQueryClient();
    const costService = createTestCostTrackingService();

    return {
      ...mocks,
      queryClient,
      costService,
      cleanup: () => {
        cleanupGlobalMocks();
        costService.destroy();
        queryClient.clear();
        mocks.restoreConsole();
      }
    };
  },

  /**
   * Simulate complete user workflow
   */
  simulateUserWorkflow: async (steps: Array<{
    action: string;
    data?: any;
    delay?: number;
    verify?: () => void | Promise<void>;
  }>) => {
    for (const step of steps) {
      console.log(`Executing step: ${step.action}`);

      if (step.delay) {
        await delay(step.delay);
      }

      if (step.verify) {
        await step.verify();
      }
    }
  }
};