/**
 * Performance Testing Utilities
 *
 * Provides utilities for performance testing including:
 * - Memory usage tracking
 * - Latency measurement
 * - Throughput calculations
 * - Resource leak detection
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  messageCount: number;
  throughput?: number; // messages per second
  latencies: number[];
  averageLatency?: number;
  p95Latency?: number;
  p99Latency?: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private memorySnapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  constructor() {
    this.metrics = {
      startTime: performance.now(),
      memoryUsage: {
        initial: this.getCurrentMemoryUsage(),
        peak: 0,
        final: 0
      },
      messageCount: 0,
      latencies: []
    };

    this.startMemoryMonitoring();
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    this.intervalId = setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();

      this.memorySnapshots.push({
        timestamp: performance.now(),
        heapUsed: memoryUsage,
        heapTotal: 0, // Simplified for browser environment
        external: 0,
        arrayBuffers: 0
      });

      if (memoryUsage > this.metrics.memoryUsage.peak) {
        this.metrics.memoryUsage.peak = memoryUsage;
      }

      // Keep only recent snapshots (last 100)
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots = this.memorySnapshots.slice(-50);
      }

      this.notifyObservers();
    }, 100); // Check every 100ms
  }

  /**
   * Record message processing
   */
  recordMessage(latency?: number): void {
    this.metrics.messageCount++;

    if (latency !== undefined) {
      this.metrics.latencies.push(latency);
    }

    this.updateDerivedMetrics();
    this.notifyObservers();
  }

  /**
   * Record multiple messages
   */
  recordMessages(count: number, latencies?: number[]): void {
    this.metrics.messageCount += count;

    if (latencies) {
      this.metrics.latencies.push(...latencies);
    }

    this.updateDerivedMetrics();
    this.notifyObservers();
  }

  /**
   * Update calculated metrics
   */
  private updateDerivedMetrics(): void {
    const currentTime = performance.now();
    this.metrics.duration = currentTime - this.metrics.startTime;

    if (this.metrics.duration > 0) {
      this.metrics.throughput = (this.metrics.messageCount / this.metrics.duration) * 1000; // per second
    }

    if (this.metrics.latencies.length > 0) {
      const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
      this.metrics.averageLatency = sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length;
      this.metrics.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
      this.metrics.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    }
  }

  /**
   * Finish monitoring and calculate final metrics
   */
  finish(): PerformanceMetrics {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    this.metrics.memoryUsage.final = this.getCurrentMemoryUsage();

    this.updateDerivedMetrics();
    this.cleanup();

    return { ...this.metrics };
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): PerformanceMetrics {
    this.updateDerivedMetrics();
    return { ...this.metrics };
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): {
    hasLeak: boolean;
    leakRate?: number; // MB per second
    description: string;
  } {
    if (this.memorySnapshots.length < 10) {
      return {
        hasLeak: false,
        description: 'Insufficient data to detect memory leaks'
      };
    }

    // Calculate memory growth rate
    const firstSnapshot = this.memorySnapshots[0];
    const lastSnapshot = this.memorySnapshots[this.memorySnapshots.length - 1];

    const timeDiff = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 1000; // seconds
    const memoryDiff = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / (1024 * 1024); // MB

    const growthRate = memoryDiff / timeDiff; // MB per second

    // Consider it a leak if memory grows consistently > 1MB per minute
    const leakThreshold = 1 / 60; // 1MB per minute in MB per second

    if (growthRate > leakThreshold) {
      return {
        hasLeak: true,
        leakRate: growthRate,
        description: `Memory growing at ${(growthRate * 60).toFixed(2)} MB/min`
      };
    }

    return {
      hasLeak: false,
      description: `Memory usage stable (${(growthRate * 60).toFixed(2)} MB/min growth)`
    };
  }

  /**
   * Add observer for metrics updates
   */
  addObserver(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * Notify all observers
   */
  private notifyObservers(): void {
    const metrics = this.getMetrics();
    this.observers.forEach(observer => {
      try {
        observer(metrics);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * Get current memory usage (simplified for browser)
   */
  private getCurrentMemoryUsage(): number {
    // In browser environment, we simulate memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }

    // Fallback for browser - estimate based on stored data
    return this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage in browser environment
   */
  private estimateMemoryUsage(): number {
    // Rough estimation based on known data structures
    const baseUsage = 10 * 1024 * 1024; // 10MB base
    const messageOverhead = this.metrics.messageCount * 1000; // ~1KB per message
    const latencyOverhead = this.metrics.latencies.length * 8; // 8 bytes per number

    return baseUsage + messageOverhead + latencyOverhead;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.observers.clear();
  }
}

/**
 * Create a new performance monitor
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}

/**
 * Measure function execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Measure memory usage before and after operation
 */
export async function measureMemoryUsage<T>(
  fn: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; memoryDelta: number }> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const initialMemory = process?.memoryUsage?.()?.heapUsed || 0;
  const result = await fn();

  // Force garbage collection again
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process?.memoryUsage?.()?.heapUsed || 0;
  const memoryDelta = finalMemory - initialMemory;

  if (label) {
    console.log(`${label}: ${(memoryDelta / (1024 * 1024)).toFixed(2)}MB`);
  }

  return { result, memoryDelta };
}

/**
 * Run stress test with configurable parameters
 */
export async function runStressTest(config: {
  name: string;
  iterations: number;
  operation: () => Promise<void> | void;
  concurrency?: number;
  memoryThreshold?: number; // MB
  timeThreshold?: number; // ms
}): Promise<{
  success: boolean;
  results: {
    totalTime: number;
    averageTime: number;
    throughput: number;
    memoryUsage: number;
    errors: number;
  };
  errors: Error[];
}> {
  const monitor = createPerformanceMonitor();
  const errors: Error[] = [];
  const concurrency = config.concurrency || 1;

  console.log(`Starting stress test: ${config.name}`);
  console.log(`Iterations: ${config.iterations}, Concurrency: ${concurrency}`);

  const startTime = performance.now();

  // Run operations
  if (concurrency === 1) {
    // Sequential execution
    for (let i = 0; i < config.iterations; i++) {
      try {
        const opStart = performance.now();
        await config.operation();
        const opDuration = performance.now() - opStart;
        monitor.recordMessage(opDuration);
      } catch (error) {
        errors.push(error as Error);
      }
    }
  } else {
    // Concurrent execution
    const chunks = [];
    for (let i = 0; i < config.iterations; i += concurrency) {
      const chunk = Array.from({ length: Math.min(concurrency, config.iterations - i) }, () =>
        config.operation().catch(error => {
          errors.push(error as Error);
          return null;
        })
      );
      chunks.push(chunk);
    }

    for (const chunk of chunks) {
      await Promise.all(chunk);
      monitor.recordMessages(chunk.length);
    }
  }

  const metrics = monitor.finish();
  const memoryLeak = monitor.detectMemoryLeaks();

  const results = {
    totalTime: metrics.duration!,
    averageTime: metrics.averageLatency || 0,
    throughput: metrics.throughput || 0,
    memoryUsage: metrics.memoryUsage.peak / (1024 * 1024), // Convert to MB
    errors: errors.length
  };

  // Check thresholds
  let success = true;

  if (config.timeThreshold && results.averageTime > config.timeThreshold) {
    console.warn(`⚠️  Average time ${results.averageTime.toFixed(2)}ms exceeds threshold ${config.timeThreshold}ms`);
    success = false;
  }

  if (config.memoryThreshold && results.memoryUsage > config.memoryThreshold) {
    console.warn(`⚠️  Memory usage ${results.memoryUsage.toFixed(2)}MB exceeds threshold ${config.memoryThreshold}MB`);
    success = false;
  }

  if (memoryLeak.hasLeak) {
    console.warn(`⚠️  Memory leak detected: ${memoryLeak.description}`);
    success = false;
  }

  if (errors.length > config.iterations * 0.01) { // Allow 1% error rate
    console.warn(`⚠️  High error rate: ${errors.length}/${config.iterations} (${(errors.length / config.iterations * 100).toFixed(1)}%)`);
    success = false;
  }

  console.log(`Stress test ${config.name} ${success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Results:`, results);

  return { success, results, errors };
}

/**
 * Benchmark comparison utility
 */
export async function benchmarkComparison(
  implementations: Record<string, () => Promise<void> | void>,
  iterations: number = 1000
): Promise<Record<string, { duration: number; throughput: number }>> {
  const results: Record<string, { duration: number; throughput: number }> = {};

  for (const [name, fn] of Object.entries(implementations)) {
    console.log(`Benchmarking: ${name}`);

    const { duration } = await measureExecutionTime(async () => {
      for (let i = 0; i < iterations; i++) {
        await fn();
      }
    });

    results[name] = {
      duration,
      throughput: (iterations / duration) * 1000 // operations per second
    };
  }

  // Print comparison
  console.log('\nBenchmark Results:');
  console.table(results);

  return results;
}

export default {
  createPerformanceMonitor,
  measureExecutionTime,
  measureMemoryUsage,
  runStressTest,
  benchmarkComparison
};