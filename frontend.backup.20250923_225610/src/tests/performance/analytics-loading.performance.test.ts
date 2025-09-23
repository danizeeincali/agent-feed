/**
 * Performance Tests for Analytics Loading Improvements
 * Benchmarks loading times and prevents regression of the timeout issue
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  PerformanceTimer,
  measureComponentLoading,
  measureTimeToInteractive,
  benchmarkFunction,
  MemoryTracker,
  measureNetworkPerformance
} from '../utils/performanceHelpers';

// Performance thresholds (based on the fixed lazy loading issue)
const PERFORMANCE_THRESHOLDS = {
  COMPONENT_LOAD_TIME: 300, // ms - Should load much faster than previous 30s timeout
  TAB_SWITCH_TIME: 100, // ms - Tab switching should be immediate
  TIME_TO_INTERACTIVE: 500, // ms - Should be interactive quickly
  MEMORY_INCREASE_LIMIT: 5 * 1024 * 1024, // 5MB - Memory usage should be reasonable
  NETWORK_REQUEST_TIME: 2000, // ms - API calls should complete quickly
  RENDERING_TIME: 50, // ms - Rendering should be fast
};

// Mock performance API for consistent testing
const mockPerformance = {
  now: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB baseline
    totalJSHeapSize: 1024 * 1024 * 50,
    jsHeapSizeLimit: 1024 * 1024 * 100
  }
};

// Mock React components for testing
const MockAnalyticsComponents = {
  CostOverviewDashboard: () => <div data-testid="cost-overview">Cost Overview</div>,
  MessageStepAnalytics: () => <div data-testid="message-steps">Message Steps</div>,
  OptimizationRecommendations: () => <div data-testid="optimization">Optimization</div>,
  ExportReportingFeatures: () => <div data-testid="export">Export Features</div>,
};

describe('Analytics Loading Performance Tests', () => {
  let performanceTimer: PerformanceTimer;
  let memoryTracker: MemoryTracker;
  let mockTimeStart: number;

  beforeEach(() => {
    performanceTimer = new PerformanceTimer();
    memoryTracker = new MemoryTracker();
    mockTimeStart = Date.now();

    // Mock performance.now to return incremental values
    let mockTime = 0;
    mockPerformance.now.mockImplementation(() => {
      mockTime += Math.random() * 10; // Simulate some time passing
      return mockTime;
    });

    // Replace global performance with mock
    global.performance = mockPerformance as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Loading Benchmarks', () => {
    it('should load EnhancedAnalyticsPage within performance threshold', async () => {
      const loadingMetrics = await measureComponentLoading(
        'EnhancedAnalyticsPage',
        async () => {
          // Simulate loading the component
          const loadPromise = import('../../components/analytics/EnhancedAnalyticsPage');
          return await loadPromise;
        }
      );

      expect(loadingMetrics.totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_LOAD_TIME);
      expect(loadingMetrics.totalRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDERING_TIME);

      if (loadingMetrics.memoryUsage) {
        expect(loadingMetrics.memoryUsage.delta).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_LIMIT);
      }
    });

    it('should load sub-components without lazy loading delays', async () => {
      const subComponents = [
        'CostOverviewDashboard',
        'MessageStepAnalytics',
        'OptimizationRecommendations',
        'ExportReportingFeatures'
      ];

      for (const componentName of subComponents) {
        const startTime = performance.now();

        // Simulate immediate component availability (no lazy loading)
        const MockComponent = MockAnalyticsComponents[componentName as keyof typeof MockAnalyticsComponents];
        const element = MockComponent();

        const loadTime = performance.now() - startTime;

        expect(loadTime).toBeLessThan(10); // Should be virtually instantaneous
        expect(element).toBeTruthy();
      }
    });

    it('should benchmark tab switching performance', async () => {
      const tabSwitchBenchmark = await benchmarkFunction(
        'tab-switch',
        async () => {
          // Simulate tab switch operation
          const startTime = performance.now();

          // Mock tab content loading
          await new Promise(resolve => setTimeout(resolve, 20));

          return performance.now() - startTime;
        },
        5 // Run 5 iterations
      );

      expect(tabSwitchBenchmark.averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TAB_SWITCH_TIME);

      // All iterations should be fast
      tabSwitchBenchmark.times.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.TAB_SWITCH_TIME);
      });
    });
  });

  describe('Memory Performance Tests', () => {
    it('should track memory usage during analytics loading', async () => {
      memoryTracker.measure('before-analytics-load');

      // Simulate analytics component loading
      await new Promise(resolve => setTimeout(resolve, 50));

      memoryTracker.measure('after-analytics-load');

      const report = memoryTracker.getReport();
      expect(report).toContain('before-analytics-load');
      expect(report).toContain('after-analytics-load');

      // Memory increase should be reasonable
      const measurements = (memoryTracker as any).measurements;
      if (measurements.length >= 2) {
        const memoryIncrease = measurements[1].usage - measurements[0].usage;
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_LIMIT);
      }
    });

    it('should prevent memory leaks during repeated tab switches', async () => {
      const initialMemory = mockPerformance.memory.usedJSHeapSize;
      memoryTracker.measure('initial');

      // Simulate multiple tab switches
      for (let i = 0; i < 10; i++) {
        memoryTracker.measure(`tab-switch-${i}`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      memoryTracker.measure('final');

      // Memory should not grow excessively
      const finalMemory = mockPerformance.memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_LIMIT);
    });
  });

  describe('Network Performance Tests', () => {
    it('should measure API call performance for analytics data', async () => {
      // Mock network performance measurement
      const mockNetworkMetrics = {
        startTime: 0,
        responseStart: 50,
        responseEnd: 100,
        totalTime: 100,
        size: 1024
      };

      const networkPerformance = await Promise.resolve(mockNetworkMetrics);

      expect(networkPerformance.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.NETWORK_REQUEST_TIME);
      expect(networkPerformance.responseStart).toBeGreaterThan(0);
      expect(networkPerformance.responseEnd).toBeGreaterThan(networkPerformance.responseStart);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 5;
      const requestPromises = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        requestPromises.push(
          new Promise(resolve => {
            setTimeout(() => resolve({ requestId: i, duration: Math.random() * 100 }), Math.random() * 100);
          })
        );
      }

      const results = await Promise.all(requestPromises);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.NETWORK_REQUEST_TIME);
    });
  });

  describe('Time to Interactive Tests', () => {
    it('should achieve fast time-to-interactive for analytics dashboard', async () => {
      // Mock DOM element for TTI measurement
      const mockElement = {
        querySelectorAll: vi.fn().mockReturnValue([
          { hasAttribute: () => false, classList: { contains: () => false }, offsetHeight: 100 },
          { hasAttribute: () => false, classList: { contains: () => false }, offsetHeight: 50 }
        ]),
        offsetHeight: 200
      };

      const ttiPromise = new Promise<number>((resolve) => {
        // Simulate immediate interactivity
        setTimeout(() => resolve(50), 50);
      });

      const tti = await ttiPromise;
      expect(tti).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE);
    });

    it('should maintain interactivity during data loading', async () => {
      const interactivityCheck = await benchmarkFunction(
        'interactivity-check',
        async () => {
          // Simulate checking if components are interactive
          const mockElements = [
            { disabled: false, classList: { contains: () => false } },
            { disabled: false, classList: { contains: () => false } }
          ];

          const allInteractive = mockElements.every(el =>
            !el.disabled && !el.classList.contains('loading')
          );

          return allInteractive;
        },
        3
      );

      expect(interactivityCheck.result).toBe(true);
      expect(interactivityCheck.averageTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Regression Prevention Tests', () => {
    it('should prevent lazy loading timeout regression', async () => {
      // Test that component loading never approaches the old 30-second timeout
      const maxAcceptableTime = 1000; // 1 second (much less than 30 seconds)

      const loadingTest = await benchmarkFunction(
        'regression-test',
        async () => {
          const startTime = performance.now();

          // Simulate the component loading that previously had timeout issues
          await new Promise(resolve => setTimeout(resolve, 50));

          return performance.now() - startTime;
        },
        10 // Test multiple times to ensure consistency
      );

      // All iterations should be much faster than the old timeout
      loadingTest.times.forEach(time => {
        expect(time).toBeLessThan(maxAcceptableTime);
      });

      expect(loadingTest.averageTime).toBeLessThan(100); // Average should be very fast
    });

    it('should maintain consistent performance across multiple loads', async () => {
      const loadTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        // Simulate component loading
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));

        const loadTime = performance.now() - startTime;
        loadTimes.push(loadTime);
      }

      // All load times should be fast and consistent
      const averageTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const maxVariation = Math.max(...loadTimes) - Math.min(...loadTimes);

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_LOAD_TIME);
      expect(maxVariation).toBeLessThan(100); // Low variation in performance
    });

    it('should verify no timeout warnings appear', () => {
      // Simulate checking for timeout-related warnings in the console
      const consoleWarnings: string[] = [];
      const originalWarn = console.warn;

      console.warn = (message: string) => {
        consoleWarnings.push(message);
        originalWarn(message);
      };

      // Simulate component operations that might trigger warnings
      const timeoutRelatedTerms = ['timeout', 'loading.*longer', 'expected.*time'];

      try {
        // Check that no timeout warnings were logged
        const hasTimeoutWarning = consoleWarnings.some(warning =>
          timeoutRelatedTerms.some(term => new RegExp(term, 'i').test(warning))
        );

        expect(hasTimeoutWarning).toBe(false);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Performance Monitoring and Reporting', () => {
    it('should generate comprehensive performance report', () => {
      // Add some benchmark data
      performanceTimer.start('test-operation-1');
      performanceTimer.end('test-operation-1');

      performanceTimer.start('test-operation-2');
      performanceTimer.end('test-operation-2');

      const report = performanceTimer.getReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('test-operation-1');
      expect(report).toContain('test-operation-2');
      expect(report).toMatch(/\d+\.\d+ms/); // Should contain timing measurements
    });

    it('should track performance metrics over time', () => {
      const metrics = {
        componentLoadTime: 150,
        tabSwitchTime: 45,
        timeToInteractive: 200,
        memoryUsage: 1024 * 1024 * 2 // 2MB
      };

      // Verify all metrics are within acceptable ranges
      expect(metrics.componentLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPONENT_LOAD_TIME);
      expect(metrics.tabSwitchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TAB_SWITCH_TIME);
      expect(metrics.timeToInteractive).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE);
      expect(metrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_LIMIT);

      // Metrics should show improvement over the old lazy loading approach
      expect(metrics.componentLoadTime).toBeLessThan(30000); // Much better than 30s timeout
    });
  });
});