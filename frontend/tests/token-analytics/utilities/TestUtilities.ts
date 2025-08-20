/**
 * Test Utilities for Token Analytics Testing
 * London School TDD Support Tools
 * 
 * Provides:
 * - Mock factories and builders
 * - Test data generators
 * - Performance measurement tools
 * - WebSocket testing utilities
 */

import { jest } from '@jest/globals';

// Test data builders using Builder pattern
export class TokenDataBuilder {
  private data: any = {
    tokens: 100,
    cost: 1.00,
    timestamp: Date.now(),
    model: 'gpt-4',
    operation: 'completion'
  };

  tokens(value: number): TokenDataBuilder {
    this.data.tokens = value;
    return this;
  }

  cost(value: number): TokenDataBuilder {
    this.data.cost = value;
    return this;
  }

  timestamp(value: number): TokenDataBuilder {
    this.data.timestamp = value;
    return this;
  }

  model(value: string): TokenDataBuilder {
    this.data.model = value;
    return this;
  }

  operation(value: string): TokenDataBuilder {
    this.data.operation = value;
    return this;
  }

  withRandomValues(): TokenDataBuilder {
    this.data.tokens = Math.floor(Math.random() * 1000) + 1;
    this.data.cost = this.data.tokens * 0.01;
    this.data.timestamp = Date.now() + Math.floor(Math.random() * 1000);
    return this;
  }

  build(): any {
    return { ...this.data };
  }

  buildArray(count: number): any[] {
    return Array.from({ length: count }, () => this.withRandomValues().build());
  }
}

// WebSocket test utilities
export class WebSocketTestUtil {
  private messageQueue: any[] = [];
  private subscribers: Map<string, Function[]> = new Map();
  private connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  constructor() {
    this.reset();
  }

  // Mock WebSocket behavior
  connect(): Promise<void> {
    this.connectionState = 'connecting';
    return new Promise(resolve => {
      setTimeout(() => {
        this.connectionState = 'connected';
        resolve();
      }, 50);
    });
  }

  disconnect(): Promise<void> {
    this.connectionState = 'disconnected';
    this.messageQueue = [];
    return Promise.resolve();
  }

  subscribe(channel: string, callback: Function): { unsubscribe: () => void } {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel)!.push(callback);

    return {
      unsubscribe: () => {
        const callbacks = this.subscribers.get(channel) || [];
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  send(channel: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState !== 'connected') {
        reject(new Error('WebSocket not connected'));
        return;
      }

      setTimeout(() => {
        const callbacks = this.subscribers.get(channel) || [];
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Callback error:', error);
          }
        });
        resolve();
      }, Math.random() * 10); // Simulate network delay
    });
  }

  // Test utilities
  simulateMessage(channel: string, data: any): void {
    const callbacks = this.subscribers.get(channel) || [];
    callbacks.forEach(callback => callback(data));
  }

  simulateConnectionLoss(): void {
    this.connectionState = 'disconnected';
    // Notify all subscribers
    this.subscribers.forEach((callbacks) => {
      callbacks.forEach(callback => {
        try {
          callback({ type: 'connection_lost' });
        } catch (error) {
          console.error('Connection loss callback error:', error);
        }
      });
    });
  }

  simulateBulkMessages(channel: string, count: number, delay: number = 0): Promise<void> {
    const builder = new TokenDataBuilder();
    const messages = builder.buildArray(count);

    return new Promise(resolve => {
      messages.forEach((message, index) => {
        setTimeout(() => {
          this.simulateMessage(channel, { ...message, sequenceId: index });
          if (index === messages.length - 1) {
            resolve();
          }
        }, index * delay);
      });
    });
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  reset(): void {
    this.messageQueue = [];
    this.subscribers.clear();
    this.connectionState = 'disconnected';
  }
}

// Performance testing utilities
export class PerformanceTester {
  private static instance: PerformanceTester;
  private measurements: Map<string, number[]> = new Map();

  static getInstance(): PerformanceTester {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester();
    }
    return PerformanceTester.instance;
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      return result;
    } finally {
      const duration = performance.now() - start;
      this.addMeasurement(label, duration);
    }
  }

  measure<T>(label: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.addMeasurement(label, duration);
    }
  }

  measureMemory<T>(label: string, fn: () => T): { result: T; memoryDelta: number } {
    const initialMemory = process.memoryUsage().heapUsed;
    const result = fn();
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = finalMemory - initialMemory;
    
    this.addMeasurement(`${label}_memory`, memoryDelta / 1024 / 1024); // MB
    
    return { result, memoryDelta };
  }

  private addMeasurement(label: string, value: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(value);
  }

  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  assertPerformance(label: string, maxAvg: number, maxP95: number): void {
    const stats = this.getStats(label);
    if (!stats) {
      throw new Error(`No measurements found for ${label}`);
    }

    if (stats.avg > maxAvg) {
      throw new Error(`Performance regression: ${label} average ${stats.avg.toFixed(2)}ms > ${maxAvg}ms`);
    }

    if (stats.p95 > maxP95) {
      throw new Error(`Performance regression: ${label} P95 ${stats.p95.toFixed(2)}ms > ${maxP95}ms`);
    }
  }

  clear(): void {
    this.measurements.clear();
  }

  report(): string {
    let report = '=== Performance Report ===\n';
    
    this.measurements.forEach((measurements, label) => {
      const stats = this.getStats(label);
      if (stats) {
        report += `\n${label}:\n`;
        report += `  Count: ${stats.count}\n`;
        report += `  Average: ${stats.avg.toFixed(2)}ms\n`;
        report += `  Median: ${stats.median.toFixed(2)}ms\n`;
        report += `  P95: ${stats.p95.toFixed(2)}ms\n`;
        report += `  Min/Max: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms\n`;
      }
    });
    
    return report;
  }
}

// Memory leak detection utilities
export class MemoryLeakTester {
  private references: WeakRef<any>[] = [];
  private objectCounter = 0;

  createTrackableObject<T extends object>(obj: T): T {
    this.references.push(new WeakRef(obj));
    this.objectCounter++;
    return obj;
  }

  createTrackableArray<T>(items: T[]): T[] {
    const array = [...items];
    this.references.push(new WeakRef(array));
    this.objectCounter++;
    return array;
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    } else {
      // Fallback: create memory pressure
      const largeArray = new Array(1000000).fill('memory pressure');
      largeArray.length = 0;
    }
  }

  detectLeaks(): {
    totalObjects: number;
    survivingObjects: number;
    leakPercentage: number;
    suspectedLeaks: any[];
  } {
    this.forceGarbageCollection();
    
    const survivingRefs = this.references.filter(ref => ref.deref() !== undefined);
    const survivingObjects = survivingRefs.map(ref => ref.deref()).filter(Boolean);
    
    return {
      totalObjects: this.objectCounter,
      survivingObjects: survivingObjects.length,
      leakPercentage: (survivingObjects.length / this.objectCounter) * 100,
      suspectedLeaks: survivingObjects
    };
  }

  reset(): void {
    this.references = [];
    this.objectCounter = 0;
  }

  assertNoLeaks(maxLeakPercentage: number = 10): void {
    const results = this.detectLeaks();
    
    if (results.leakPercentage > maxLeakPercentage) {
      throw new Error(
        `Memory leak detected: ${results.leakPercentage.toFixed(2)}% objects surviving (${results.survivingObjects}/${results.totalObjects})`
      );
    }
  }
}

// Test data generators
export const generateTokenData = {
  single: () => new TokenDataBuilder().build(),
  
  batch: (count: number) => new TokenDataBuilder().buildArray(count),
  
  stream: (count: number, intervalMs: number = 100) => {
    const builder = new TokenDataBuilder();
    const data: any[] = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        ...builder.withRandomValues().build(),
        sequenceId: i,
        timestamp: Date.now() + (i * intervalMs)
      });
    }
    
    return data;
  },
  
  withErrors: (count: number, errorRate: number = 0.1) => {
    const data = new TokenDataBuilder().buildArray(count);
    const errorCount = Math.floor(count * errorRate);
    
    for (let i = 0; i < errorCount; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      data[randomIndex] = {
        ...data[randomIndex],
        error: new Error(`Simulated error ${i}`),
        isError: true
      };
    }
    
    return data;
  },
  
  largeDataset: (size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizeMap = {
      small: 1000,
      medium: 10000,
      large: 100000
    };
    
    return new TokenDataBuilder().buildArray(sizeMap[size]);
  }
};

// Assertion helpers
export const performanceAssertions = {
  expectFastExecution: (fn: () => void, maxMs: number = 50) => {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(maxMs);
    return duration;
  },

  expectMemoryEfficient: <T>(fn: () => T, maxMemoryMB: number = 10): T => {
    const tester = new MemoryLeakTester();
    const initialMemory = process.memoryUsage().heapUsed;
    
    const result = tester.createTrackableObject(fn());
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024;
    
    expect(memoryUsed).toBeLessThan(maxMemoryMB);
    
    return result;
  },

  expectNoMemoryLeaks: (fn: () => void, maxLeakPercentage: number = 5) => {
    const tester = new MemoryLeakTester();
    
    // Create trackable objects during execution
    const originalCreate = Object.create;
    Object.create = function(proto: any, props?: any) {
      const obj = originalCreate.call(this, proto, props);
      return tester.createTrackableObject(obj);
    };
    
    try {
      fn();
      tester.assertNoLeaks(maxLeakPercentage);
    } finally {
      Object.create = originalCreate;
    }
  }
};

// Export singleton instances
export const webSocketTestUtil = new WebSocketTestUtil();
export const performanceTester = PerformanceTester.getInstance();
export const memoryLeakTester = new MemoryLeakTester();

// Helper to create test contexts
export const createTestContext = () => ({
  webSocket: new WebSocketTestUtil(),
  performance: new PerformanceTester(),
  memory: new MemoryLeakTester(),
  tokenData: generateTokenData,
  
  cleanup: function() {
    this.webSocket.reset();
    this.performance.clear();
    this.memory.reset();
  }
});

export default {
  TokenDataBuilder,
  WebSocketTestUtil,
  PerformanceTester,
  MemoryLeakTester,
  generateTokenData,
  performanceAssertions,
  createTestContext
};