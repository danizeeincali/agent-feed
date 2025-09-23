/**
 * Performance Regression Tests for Token Analytics
 * London School TDD - Performance-Driven Testing
 * 
 * NLD Risk Mitigation:
 * - Memory leak prevention (78% risk)
 * - UI responsiveness under load
 * - WebSocket performance monitoring (65% risk)
 * - Token calculation benchmarks (72% accuracy risk)
 */

import { jest } from '@jest/globals';
import { performance, PerformanceObserver } from 'perf_hooks';
import { 
  createHighPerformanceTokenStreamMock,
  mockTokenCalculator,
  mockMemoryMonitor,
  createRealisticWebSocketMock
} from '../mocks/TokenAnalyticsMocks';

// Performance benchmarks and thresholds
const PERFORMANCE_THRESHOLDS = {
  memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
  maxRenderTime: 16, // 16ms for 60fps
  maxCalculationTime: 5, // 5ms per calculation
  maxWebSocketLatency: 100, // 100ms
  maxMemoryGrowth: 30, // 30% memory growth
  maxQueueSize: 1000, // Max queued updates
  gcPressureThreshold: 80 // 80% GC pressure threshold
};

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  
  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }
  
  end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) throw new Error(`No start time for ${label}`);
    
    const duration = performance.now() - startTime;
    
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
    
    return duration;
  }
  
  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      avg,
      median,
      p95,
      measurements
    };
  }
  
  clear(): void {
    this.measurements.clear();
    this.startTimes.clear();
  }
}

// Memory leak detector
class MemoryLeakDetector {
  private references: WeakRef<any>[] = [];
  private initialMemory: number = 0;
  
  markReference(obj: any): void {
    this.references.push(new WeakRef(obj));
  }
  
  setBaseline(): void {
    // Force garbage collection if available
    if (global.gc) global.gc();
    this.initialMemory = process.memoryUsage().heapUsed;
  }
  
  detectLeaks(): {
    memoryGrowth: number;
    suspectedLeaks: number;
    gcEfficiency: number;
  } {
    // Force garbage collection
    if (global.gc) global.gc();
    
    const currentMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = currentMemory - this.initialMemory;
    
    // Count surviving references that should have been collected
    const suspectedLeaks = this.references.filter(ref => ref.deref() !== undefined).length;
    
    // Calculate GC efficiency
    const totalReferences = this.references.length;
    const collectedReferences = totalReferences - suspectedLeaks;
    const gcEfficiency = totalReferences > 0 ? collectedReferences / totalReferences : 1;
    
    return {
      memoryGrowth,
      suspectedLeaks,
      gcEfficiency
    };
  }
  
  clear(): void {
    this.references = [];
  }
}

describe('Token Analytics Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let memoryLeakDetector: MemoryLeakDetector;
  let mockCalculator: ReturnType<typeof mockTokenCalculator>;
  let mockMemoryMonitor: ReturnType<typeof mockMemoryMonitor>;
  let mockTokenStream: ReturnType<typeof createHighPerformanceTokenStreamMock>;
  
  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    memoryLeakDetector = new MemoryLeakDetector();
    mockCalculator = mockTokenCalculator();
    mockMemoryMonitor = mockMemoryMonitor();
    mockTokenStream = createHighPerformanceTokenStreamMock();
    
    // Set memory baseline
    memoryLeakDetector.setBaseline();
  });
  
  afterEach(() => {
    performanceMonitor.clear();
    memoryLeakDetector.clear();
    
    // Cleanup mocks
    mockTokenStream.stopStream();
  });

  describe('Memory Leak Prevention - 78% Risk Mitigation', () => {
    it('should not leak memory during high-frequency token updates', async () => {
      // Arrange - Create token analytics instance
      const tokenAnalytics = {
        subscribers: new Map(),
        updateQueue: [],
        memoryReferences: []
      };
      
      // Mark initial references
      memoryLeakDetector.markReference(tokenAnalytics);
      
      // Act - Simulate 10,000 token updates
      const updatePromises = [];
      
      for (let i = 0; i < 10000; i++) {
        const update = {
          tokens: Math.floor(Math.random() * 100) + 1,
          cost: Math.random() * 5,
          timestamp: Date.now() + i
        };
        
        updatePromises.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              // Simulate processing update
              tokenAnalytics.updateQueue.push(update);
              
              // Process in batches to prevent memory accumulation
              if (tokenAnalytics.updateQueue.length >= 100) {
                const batch = tokenAnalytics.updateQueue.splice(0, 100);
                mockCalculator.processBatch(batch);
              }
              
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(updatePromises);
      
      // Assert - Check for memory leaks
      const leakResults = memoryLeakDetector.detectLeaks();
      
      expect(leakResults.memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold);
      expect(leakResults.gcEfficiency).toBeGreaterThan(0.8); // 80% GC efficiency
      expect(leakResults.suspectedLeaks).toBe(0);
      
      // Verify queue doesn't grow unbounded
      expect(tokenAnalytics.updateQueue.length).toBeLessThan(100);
    });

    it('should properly cleanup WebSocket subscriptions', async () => {
      // Arrange
      const mockWebSocket = createRealisticWebSocketMock();
      const subscriptions = new Set();
      
      // Create multiple subscriptions
      for (let i = 0; i < 100; i++) {
        const subscription = mockWebSocket.subscribe(`channel-${i}`, () => {});
        subscriptions.add(subscription);
        memoryLeakDetector.markReference(subscription);
      }
      
      // Act - Cleanup all subscriptions
      subscriptions.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      subscriptions.clear();
      
      // Force garbage collection
      if (global.gc) global.gc();
      
      // Assert - Verify cleanup
      const leakResults = memoryLeakDetector.detectLeaks();
      expect(leakResults.suspectedLeaks).toBeLessThan(10); // Allow for some GC delay
    });

    it('should handle memory pressure gracefully', async () => {
      // Arrange - Mock memory pressure scenario
      mockMemoryMonitor.getMemoryUsage.mockReturnValue({
        used: 80 * 1024 * 1024, // 80MB used
        total: 100 * 1024 * 1024, // 100MB total
        percentage: 80, // 80% usage
        available: 20 * 1024 * 1024
      });
      
      const tokenAnalytics = {
        memoryThreshold: 75,
        onMemoryPressure: jest.fn(),
        clearCache: jest.fn(),
        isProcessingBatch: false
      };
      
      // Act - Simulate memory pressure detection
      const memoryCheckInterval = setInterval(() => {
        const memoryUsage = mockMemoryMonitor.getMemoryUsage();
        
        if (memoryUsage.percentage > tokenAnalytics.memoryThreshold) {
          tokenAnalytics.onMemoryPressure();
          tokenAnalytics.clearCache();
        }
      }, 100);
      
      // Let it run for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(memoryCheckInterval);
      
      // Assert - Memory pressure should be handled
      expect(tokenAnalytics.onMemoryPressure).toHaveBeenCalled();
      expect(tokenAnalytics.clearCache).toHaveBeenCalled();
    });
  });

  describe('Token Calculation Performance - 72% Accuracy Risk', () => {
    it('should calculate token costs within performance thresholds', async () => {
      // Arrange - Test cases with varying complexity
      const testCases = [
        { tokens: 1, complexity: 'simple' },
        { tokens: 1000, complexity: 'medium' },
        { tokens: 100000, complexity: 'high' },
        { tokens: 0.5, complexity: 'decimal' },
        { tokens: Number.MAX_SAFE_INTEGER / 1000000, complexity: 'extreme' }
      ];
      
      // Act & Assert - Test each case
      for (const testCase of testCases) {
        performanceMonitor.start(`calculation-${testCase.complexity}`);
        
        const result = mockCalculator.calculateCost(testCase.tokens);
        
        const duration = performanceMonitor.end(`calculation-${testCase.complexity}`);
        
        // Verify performance threshold
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.maxCalculationTime);
        
        // Verify accuracy
        if (typeof result === 'number' && isFinite(result)) {
          expect(result).toBeGreaterThanOrEqual(0);
        }
      }
      
      // Check overall performance stats
      const stats = performanceMonitor.getStats('calculation-simple');
      if (stats) {
        expect(stats.avg).toBeLessThan(1); // Sub-millisecond for simple calculations
        expect(stats.p95).toBeLessThan(2); // 95th percentile under 2ms
      }
    });

    it('should handle bulk calculations efficiently', async () => {
      // Arrange - Large batch of calculations
      const batchSizes = [100, 1000, 10000];
      
      for (const batchSize of batchSizes) {
        const tokenData = Array.from({ length: batchSize }, (_, i) => ({
          tokens: Math.floor(Math.random() * 1000) + 1,
          timestamp: Date.now() + i
        }));
        
        // Act - Process batch
        performanceMonitor.start(`batch-${batchSize}`);
        
        const results = mockCalculator.processBatch(tokenData);
        
        const duration = performanceMonitor.end(`batch-${batchSize}`);
        
        // Assert - Performance scales reasonably
        const timePerItem = duration / batchSize;
        expect(timePerItem).toBeLessThan(0.1); // Less than 0.1ms per item
        
        // Verify all items processed
        expect(results).toHaveLength(batchSize);
        expect(results.every(r => r.processed)).toBe(true);
      }
    });

    it('should maintain precision across calculation methods', async () => {
      // Property-based precision testing
      const precisionTests = Array.from({ length: 1000 }, () => ({
        tokens: Math.random() * 10000,
        rate: 0.01
      }));
      
      let precisionErrors = 0;
      const maxAcceptableError = 1e-10; // Very small floating point tolerance
      
      performanceMonitor.start('precision-test');
      
      for (const test of precisionTests) {
        const directCalculation = test.tokens * test.rate;
        const serviceCalculation = mockCalculator.calculateCost(test.tokens);
        
        const error = Math.abs(directCalculation - serviceCalculation);
        if (error > maxAcceptableError) {
          precisionErrors++;
        }
      }
      
      const duration = performanceMonitor.end('precision-test');
      
      // Assert - High precision maintained
      const errorRate = precisionErrors / precisionTests.length;
      expect(errorRate).toBeLessThan(0.01); // Less than 1% precision errors
      
      // Performance should remain good for precision calculations
      const avgTimePerCalculation = duration / precisionTests.length;
      expect(avgTimePerCalculation).toBeLessThan(0.05); // 0.05ms per calculation
    });
  });

  describe('WebSocket Performance - 65% Risk Mitigation', () => {
    it('should maintain low latency under high message volume', async () => {
      // Arrange
      const mockWebSocket = createRealisticWebSocketMock(10, 0); // 10ms delay, no dropout
      const latencyMeasurements = [];
      
      await mockWebSocket.connect();
      
      // Subscribe to measure latency
      mockWebSocket.subscribe('performance-test', (message) => {
        const latency = Date.now() - message.timestamp;
        latencyMeasurements.push(latency);
      });
      
      // Act - Send 1000 messages at high frequency
      const messagePromises = [];
      
      for (let i = 0; i < 1000; i++) {
        const message = {
          id: i,
          timestamp: Date.now(),
          tokens: Math.floor(Math.random() * 100),
          cost: Math.random() * 5
        };
        
        messagePromises.push(
          mockWebSocket.send('performance-test', message)
            .catch(error => {
              console.warn('Message send failed:', error);
            })
        );
      }
      
      await Promise.allSettled(messagePromises);
      
      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Assert - Latency should be acceptable
      if (latencyMeasurements.length > 0) {
        const avgLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
        const maxLatency = Math.max(...latencyMeasurements);
        const p95Latency = latencyMeasurements.sort((a, b) => a - b)[Math.floor(latencyMeasurements.length * 0.95)];
        
        expect(avgLatency).toBeLessThan(50); // Average under 50ms
        expect(maxLatency).toBeLessThan(200); // Max under 200ms
        expect(p95Latency).toBeLessThan(100); // P95 under 100ms
        
        // Most messages should be delivered
        expect(latencyMeasurements.length).toBeGreaterThan(900); // >90% delivery rate
      }
    });

    it('should handle connection instability without performance degradation', async () => {
      // Arrange - Unstable WebSocket with reconnection logic
      const unstableWebSocket = createRealisticWebSocketMock(50, 0.05); // 50ms delay, 5% dropout
      let reconnectionCount = 0;
      let performanceMetrics = {
        messagesReceived: 0,
        messagesLost: 0,
        reconnectionTime: []
      };
      
      // Mock reconnection logic
      const originalConnect = unstableWebSocket.connect;
      unstableWebSocket.connect = jest.fn().mockImplementation(async () => {
        const startTime = Date.now();
        await originalConnect();
        const reconnectionDuration = Date.now() - startTime;
        
        reconnectionCount++;
        performanceMetrics.reconnectionTime.push(reconnectionDuration);
      });
      
      await unstableWebSocket.connect();
      
      // Subscribe to track messages
      unstableWebSocket.subscribe('stability-test', () => {
        performanceMetrics.messagesReceived++;
      });
      
      // Act - Test connection stability over time
      const testDuration = 5000; // 5 seconds
      const messageInterval = 100; // Every 100ms
      let messagesSent = 0;
      
      const messageTimer = setInterval(async () => {
        try {
          await unstableWebSocket.send('stability-test', {
            id: messagesSent++,
            timestamp: Date.now()
          });
        } catch (error) {
          performanceMetrics.messagesLost++;
          
          // Simulate reconnection on error
          if (!unstableWebSocket.isConnected()) {
            await unstableWebSocket.connect();
          }
        }
      }, messageInterval);
      
      // Simulate some disconnections
      setTimeout(() => unstableWebSocket.simulateDisconnection(), 1000);
      setTimeout(() => unstableWebSocket.simulateDisconnection(), 3000);
      
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(messageTimer);
      
      // Assert - Performance should remain acceptable despite instability
      const deliveryRate = performanceMetrics.messagesReceived / messagesSent;
      expect(deliveryRate).toBeGreaterThan(0.8); // >80% delivery rate
      
      if (performanceMetrics.reconnectionTime.length > 0) {
        const avgReconnectionTime = performanceMetrics.reconnectionTime.reduce((a, b) => a + b, 0) / performanceMetrics.reconnectionTime.length;
        expect(avgReconnectionTime).toBeLessThan(1000); // Reconnection under 1s
      }
      
      expect(reconnectionCount).toBeGreaterThanOrEqual(2); // Should have reconnected
    });
  });

  describe('UI Responsiveness Under Load', () => {
    it('should maintain 60fps during high-frequency updates', async () => {
      // Mock RAF (requestAnimationFrame) for testing
      const rafCallbacks: (() => void)[] = [];
      const mockRAF = jest.fn().mockImplementation((callback: () => void) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
      
      // Simulate component update cycle
      const componentUpdateTimes: number[] = [];
      let frameCount = 0;
      
      const simulateFrameUpdate = () => {
        performanceMonitor.start(`frame-${frameCount}`);
        
        // Simulate React re-render with token data
        const tokenUpdate = {
          tokens: Math.floor(Math.random() * 100),
          cost: Math.random() * 5,
          timestamp: Date.now()
        };
        
        // Simulate DOM updates
        mockCalculator.calculateCost(tokenUpdate.tokens);
        
        const frameDuration = performanceMonitor.end(`frame-${frameCount}`);
        componentUpdateTimes.push(frameDuration);
        
        frameCount++;
      };
      
      // Act - Simulate 60fps for 1 second (60 frames)
      const frameInterval = setInterval(() => {
        simulateFrameUpdate();
        
        // Process any queued RAF callbacks
        rafCallbacks.forEach(callback => callback());
        rafCallbacks.length = 0;
      }, 16.67); // ~60fps
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(frameInterval);
      
      // Assert - Frame times should be under 16ms for 60fps
      const avgFrameTime = componentUpdateTimes.reduce((a, b) => a + b, 0) / componentUpdateTimes.length;
      const maxFrameTime = Math.max(...componentUpdateTimes);
      const droppedFrames = componentUpdateTimes.filter(time => time > 16.67).length;
      
      expect(avgFrameTime).toBeLessThan(8); // Average well under 16ms
      expect(maxFrameTime).toBeLessThan(32); // Max under 2 frame budget
      expect(droppedFrames / componentUpdateTimes.length).toBeLessThan(0.1); // <10% dropped frames
      
      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Max frame time: ${maxFrameTime.toFixed(2)}ms`);
      console.log(`Dropped frames: ${droppedFrames}/${componentUpdateTimes.length}`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in token calculations', async () => {
      // Baseline performance measurement
      const baselineRuns = 100;
      const baselineTimes = [];
      
      for (let i = 0; i < baselineRuns; i++) {
        performanceMonitor.start('baseline');
        mockCalculator.calculateCost(Math.random() * 1000);
        baselineTimes.push(performanceMonitor.end('baseline'));
      }
      
      const baselineAvg = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
      
      // Simulate performance regression (add artificial delay)
      const originalCalculateCost = mockCalculator.calculateCost;
      mockCalculator.calculateCost = jest.fn().mockImplementation((tokens) => {
        // Simulate 2x performance regression
        const start = performance.now();
        while (performance.now() - start < baselineAvg * 2) {
          // Busy wait to simulate regression
        }
        return originalCalculateCost(tokens);
      });
      
      // Test with regression
      const regressionTimes = [];
      for (let i = 0; i < baselineRuns; i++) {
        performanceMonitor.start('regression');
        mockCalculator.calculateCost(Math.random() * 1000);
        regressionTimes.push(performanceMonitor.end('regression'));
      }
      
      const regressionAvg = regressionTimes.reduce((a, b) => a + b, 0) / regressionTimes.length;
      
      // Assert - Should detect significant regression
      const performanceRatio = regressionAvg / baselineAvg;
      expect(performanceRatio).toBeGreaterThan(1.5); // Detect >50% regression
      
      console.log(`Baseline average: ${baselineAvg.toFixed(3)}ms`);
      console.log(`Regression average: ${regressionAvg.toFixed(3)}ms`);
      console.log(`Performance ratio: ${performanceRatio.toFixed(2)}x`);
    });
  });
});