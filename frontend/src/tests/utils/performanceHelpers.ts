/**
 * Performance testing utilities for analytics components
 * Provides accurate timing measurements and benchmark tools
 */

export interface PerformanceBenchmark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ComponentLoadingMetrics {
  componentName: string;
  loadStartTime: number;
  loadEndTime: number;
  renderStartTime: number;
  renderEndTime: number;
  totalLoadTime: number;
  totalRenderTime: number;
  totalTime: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

/**
 * High-precision timer for performance measurements
 */
export class PerformanceTimer {
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();

  start(name: string, metadata?: Record<string, any>): void {
    this.benchmarks.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  end(name: string): number | null {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      console.warn(`No benchmark found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - benchmark.startTime;

    this.benchmarks.set(name, {
      ...benchmark,
      endTime,
      duration
    });

    return duration;
  }

  get(name: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(name);
  }

  getAllBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  clear(): void {
    this.benchmarks.clear();
  }

  getReport(): string {
    const benchmarks = this.getAllBenchmarks()
      .filter(b => b.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    let report = '=== Performance Report ===\n';
    benchmarks.forEach(benchmark => {
      report += `${benchmark.name}: ${benchmark.duration?.toFixed(2)}ms\n`;
      if (benchmark.metadata) {
        report += `  Metadata: ${JSON.stringify(benchmark.metadata)}\n`;
      }
    });

    return report;
  }
}

/**
 * Measures component loading performance including lazy loading
 */
export async function measureComponentLoading(
  componentName: string,
  loadFunction: () => Promise<any>
): Promise<ComponentLoadingMetrics> {
  const loadStartTime = performance.now();

  // Measure memory before loading
  const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

  // Track when render starts
  let renderStartTime = 0;
  let renderEndTime = 0;

  // Hook into React's render cycle if possible
  const originalRender = React.createElement;
  React.createElement = function(...args) {
    if (renderStartTime === 0) {
      renderStartTime = performance.now();
    }
    const result = originalRender.apply(this, args);
    renderEndTime = performance.now();
    return result;
  };

  try {
    // Execute the loading function
    await loadFunction();

    const loadEndTime = performance.now();
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;

    // Restore original createElement
    React.createElement = originalRender;

    return {
      componentName,
      loadStartTime,
      loadEndTime,
      renderStartTime: renderStartTime || loadEndTime,
      renderEndTime: renderEndTime || loadEndTime,
      totalLoadTime: loadEndTime - loadStartTime,
      totalRenderTime: (renderEndTime || loadEndTime) - (renderStartTime || loadStartTime),
      totalTime: loadEndTime - loadStartTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryAfter - memoryBefore
      }
    };
  } catch (error) {
    // Restore original createElement on error
    React.createElement = originalRender;
    throw error;
  }
}

/**
 * Wait for component to be fully rendered and stable
 */
export async function waitForComponentStable(
  element: HTMLElement,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let lastHeight = element.offsetHeight;
    let stableCount = 0;
    const requiredStableFrames = 3;

    const checkStability = () => {
      const currentHeight = element.offsetHeight;
      const elapsed = Date.now() - startTime;

      if (elapsed > timeout) {
        reject(new Error(`Component did not stabilize within ${timeout}ms`));
        return;
      }

      if (currentHeight === lastHeight) {
        stableCount++;
        if (stableCount >= requiredStableFrames) {
          resolve();
          return;
        }
      } else {
        stableCount = 0;
        lastHeight = currentHeight;
      }

      requestAnimationFrame(checkStability);
    };

    requestAnimationFrame(checkStability);
  });
}

/**
 * Create a performance observer for specific metrics
 */
export function createPerformanceObserver(
  entryTypes: string[],
  callback: (entries: PerformanceEntry[]) => void
): PerformanceObserver {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    callback(entries);
  });

  observer.observe({ entryTypes });
  return observer;
}

/**
 * Measure time to interactive (TTI) for components
 */
export async function measureTimeToInteractive(
  container: HTMLElement,
  interactiveSelector: string = '[data-testid]',
  timeout: number = 10000
): Promise<number> {
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Component not interactive within ${timeout}ms`));
    }, timeout);

    const checkInteractive = () => {
      const interactiveElements = container.querySelectorAll(interactiveSelector);
      const allInteractive = Array.from(interactiveElements).every(el => {
        return !el.hasAttribute('disabled') &&
               !el.classList.contains('loading') &&
               el.offsetHeight > 0;
      });

      if (allInteractive && interactiveElements.length > 0) {
        clearTimeout(timeoutId);
        resolve(performance.now() - startTime);
      } else {
        requestAnimationFrame(checkInteractive);
      }
    };

    requestAnimationFrame(checkInteractive);
  });
}

/**
 * Benchmark function execution time
 */
export async function benchmarkFunction<T>(
  name: string,
  fn: () => Promise<T> | T,
  iterations: number = 1
): Promise<{ result: T; averageTime: number; times: number[] }> {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    result = await fn();
    const endTime = performance.now();
    times.push(endTime - startTime);
  }

  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

  return {
    result: result!,
    averageTime,
    times
  };
}

/**
 * Network performance measurement for API calls
 */
export interface NetworkMetrics {
  startTime: number;
  responseStart: number;
  responseEnd: number;
  totalTime: number;
  size?: number;
}

export function measureNetworkPerformance(url: string): Promise<NetworkMetrics> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const entry = entries.find(e => e.name.includes(url)) as PerformanceResourceTiming;

      if (entry) {
        resolve({
          startTime: entry.startTime,
          responseStart: entry.responseStart,
          responseEnd: entry.responseEnd,
          totalTime: entry.responseEnd - entry.startTime,
          size: entry.transferSize
        });
        observer.disconnect();
      }
    });

    observer.observe({ entryTypes: ['resource'] });

    // Cleanup observer after timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Network measurement timeout for ${url}`));
    }, 30000);
  });
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private measurements: Array<{ timestamp: number; usage: number; label: string }> = [];

  measure(label: string): void {
    const usage = (performance as any).memory?.usedJSHeapSize || 0;
    this.measurements.push({
      timestamp: performance.now(),
      usage,
      label
    });
  }

  getReport(): string {
    if (this.measurements.length === 0) {
      return 'No memory measurements recorded';
    }

    let report = '=== Memory Usage Report ===\n';
    this.measurements.forEach((measurement, index) => {
      const mbUsage = (measurement.usage / 1024 / 1024).toFixed(2);
      report += `${measurement.label}: ${mbUsage}MB`;

      if (index > 0) {
        const delta = measurement.usage - this.measurements[index - 1].usage;
        const mbDelta = (delta / 1024 / 1024).toFixed(2);
        report += ` (${delta >= 0 ? '+' : ''}${mbDelta}MB)`;
      }

      report += '\n';
    });

    return report;
  }

  clear(): void {
    this.measurements = [];
  }
}

// Export a global performance timer instance
export const globalTimer = new PerformanceTimer();
export const globalMemoryTracker = new MemoryTracker();

// React import for createElement override
import React from 'react';