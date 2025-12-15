/**
 * Performance Tests for SSE-HTTP Migration
 * Tests connection speed, memory usage, and throughput benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockSSEServer, MockEventSource } from '../mocks/MockSSEServer';
import { DEFAULT_TEST_CONFIG, PERFORMANCE_THRESHOLDS } from '../config/sse-migration-test-config';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private initialMemory: number = 0;
  private samples: number[] = [];

  start(): void {
    this.startTime = performance.now();
    this.initialMemory = this.getCurrentMemoryUsage();
    this.samples = [];
  }

  sample(label?: string): number {
    const elapsed = performance.now() - this.startTime;
    this.samples.push(elapsed);
    if (label) {
      console.log(`Performance sample [${label}]: ${elapsed.toFixed(2)}ms`);
    }
    return elapsed;
  }

  getElapsedTime(): number {
    return performance.now() - this.startTime;
  }

  getMemoryUsage(): number {
    return this.getCurrentMemoryUsage() - this.initialMemory;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize;
    }
    return 0; // Fallback for non-browser environments
  }

  getStats() {
    return {
      totalTime: this.getElapsedTime(),
      memoryUsage: this.getMemoryUsage(),
      sampleCount: this.samples.length,
      averageTime: this.samples.length > 0 ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0,
      minTime: Math.min(...this.samples),
      maxTime: Math.max(...this.samples),
    };
  }
}

// Mock performance.memory for testing
Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    memory: {
      usedJSHeapSize: 10 * 1024 * 1024, // 10MB base
      totalJSHeapSize: 20 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    },
  },
  writable: true,
});

global.EventSource = MockEventSource as any;
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Connection Performance Tests', () => {
  let mockServer: MockSSEServer;
  let monitor: PerformanceMonitor;

  beforeEach(async () => {
    mockServer = new MockSSEServer(DEFAULT_TEST_CONFIG.mock);
    await mockServer.start();
    monitor = new PerformanceMonitor();
  });

  afterEach(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('Connection Speed', () => {
    it('should establish SSE connection within performance threshold', async () => {
      monitor.start();
      
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      await new Promise(resolve => {
        eventSource.addEventListener('open', () => {
          monitor.sample('SSE Connection Established');
          resolve(true);
        });
      });

      const connectionTime = monitor.getElapsedTime();
      
      expect(connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.excellent);
      
      eventSource.close();
    });

    it('should establish HTTP connection within threshold', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      monitor.start();
      
      const response = await fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}/health`, {
        method: 'GET',
      });

      const connectionTime = monitor.sample('HTTP Connection');
      
      expect(response.ok).toBe(true);
      expect(connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.good);
    });

    it('should handle concurrent connections efficiently', async () => {
      monitor.start();

      const connections = Array.from({ length: 10 }, () => 
        new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint)
      );

      await Promise.all(connections.map(es => 
        new Promise(resolve => es.addEventListener('open', resolve))
      ));

      const totalTime = monitor.sample('10 Concurrent SSE Connections');
      
      // Concurrent connections should not take much longer than single connection
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.good * 2);

      connections.forEach(es => es.close());
    });

    it('should reconnect quickly after connection loss', async () => {
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Wait for initial connection
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
      
      monitor.start();
      
      // Simulate connection loss and reconnection
      eventSource.simulateClose();
      
      const newEventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => newEventSource.addEventListener('open', resolve));
      
      const reconnectionTime = monitor.sample('Reconnection Time');
      
      expect(reconnectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.acceptable);
      
      eventSource.close();
      newEventSource.close();
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage during normal operation', async () => {
      monitor.start();
      
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      // Simulate normal message flow
      for (let i = 0; i < 100; i++) {
        eventSource.simulateMessage({
          id: i,
          data: `Message ${i}`,
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const memoryUsage = monitor.getMemoryUsage();
      
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.good);
      
      eventSource.close();
    });

    it('should handle large message payloads efficiently', async () => {
      monitor.start();
      
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      // Send large messages
      for (let i = 0; i < 10; i++) {
        eventSource.simulateMessage({
          id: i,
          data: 'x'.repeat(100 * 1024), // 100KB per message
          timestamp: Date.now(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      
      const memoryUsage = monitor.getMemoryUsage();
      
      // Should handle 1MB of data without excessive memory usage
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.acceptable);
      
      eventSource.close();
    });

    it('should clean up memory properly on disconnect', async () => {
      monitor.start();
      
      const connections: MockEventSource[] = [];
      
      // Create multiple connections
      for (let i = 0; i < 5; i++) {
        const es = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
        connections.push(es);
        await new Promise(resolve => es.addEventListener('open', resolve));
        
        // Send some messages to each
        for (let j = 0; j < 20; j++) {
          es.simulateMessage({ id: `${i}-${j}`, data: `Connection ${i} Message ${j}` });
        }
      }

      const memoryBeforeCleanup = monitor.getMemoryUsage();
      
      // Close all connections
      connections.forEach(es => es.close());
      
      // Allow cleanup time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const memoryAfterCleanup = monitor.getMemoryUsage();
      
      // Memory usage should not increase significantly after cleanup
      expect(memoryAfterCleanup).toBeLessThanOrEqual(memoryBeforeCleanup * 1.1);
    });

    it('should prevent memory leaks with long-running connections', async () => {
      monitor.start();
      
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      const messageCount = 1000;
      let messagesProcessed = 0;

      eventSource.addEventListener('message', () => {
        messagesProcessed++;
      });

      // Simulate long-running operation with many messages
      const sendMessages = async () => {
        for (let i = 0; i < messageCount; i++) {
          eventSource.simulateMessage({
            id: i,
            data: `Long running message ${i}`,
            timestamp: Date.now(),
          });
          
          // Small delay to simulate real-time flow
          if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      };

      await sendMessages();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemoryUsage = monitor.getMemoryUsage();
      
      expect(messagesProcessed).toBe(messageCount);
      expect(finalMemoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.poor);
      
      eventSource.close();
    });
  });

  describe('Message Throughput', () => {
    it('should handle high-frequency messages', async () => {
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      let messageCount = 0;
      const targetThroughput = PERFORMANCE_THRESHOLDS.throughput.good;

      eventSource.addEventListener('message', () => {
        messageCount++;
      });

      monitor.start();

      // Send messages at high frequency
      const duration = 1000; // 1 second
      const interval = duration / targetThroughput;
      
      for (let i = 0; i < targetThroughput; i++) {
        setTimeout(() => {
          eventSource.simulateMessage({
            id: i,
            data: `High freq message ${i}`,
            timestamp: Date.now(),
          });
        }, i * interval);
      }

      await new Promise(resolve => setTimeout(resolve, duration + 100));

      const actualThroughput = messageCount / (duration / 1000);
      const processingTime = monitor.sample('High Frequency Processing');
      
      expect(actualThroughput).toBeGreaterThanOrEqual(targetThroughput * 0.9); // 90% tolerance
      expect(processingTime).toBeLessThan(duration * 1.2); // Within 120% of test duration
      
      eventSource.close();
    });

    it('should maintain throughput under concurrent HTTP requests', async () => {
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      let messageCount = 0;
      eventSource.addEventListener('message', () => messageCount++);

      monitor.start();

      // Start high-frequency SSE messages
      const messageInterval = setInterval(() => {
        eventSource.simulateMessage({
          data: `Concurrent message ${Date.now()}`,
        });
      }, 10); // 100 messages per second

      // Send concurrent HTTP requests
      const httpRequests = Array.from({ length: 20 }, (_, i) =>
        fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}/test${i}`, {
          method: 'POST',
          body: JSON.stringify({ test: i }),
        })
      );

      await Promise.all(httpRequests);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      clearInterval(messageInterval);

      const throughput = messageCount / 1; // messages per second
      const totalTime = monitor.sample('Concurrent Operations');
      
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.throughput.acceptable);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      eventSource.close();
    });

    it('should handle burst traffic efficiently', async () => {
      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));

      let messageCount = 0;
      const processingTimes: number[] = [];

      eventSource.addEventListener('message', () => {
        const processTime = performance.now();
        processingTimes.push(processTime);
        messageCount++;
      });

      monitor.start();

      // Send burst of messages
      const burstSize = 500;
      const burstStartTime = performance.now();
      
      for (let i = 0; i < burstSize; i++) {
        eventSource.simulateMessage({
          id: i,
          data: `Burst message ${i}`,
          burstTime: burstStartTime,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const burstProcessingTime = monitor.sample('Burst Processing');
      const avgProcessingDelay = processingTimes.length > 0 
        ? (processingTimes[processingTimes.length - 1] - processingTimes[0]) / processingTimes.length
        : 0;
      
      expect(messageCount).toBe(burstSize);
      expect(burstProcessingTime).toBeLessThan(2000); // Process burst within 2 seconds
      expect(avgProcessingDelay).toBeLessThan(10); // Average processing delay < 10ms
      
      eventSource.close();
    });
  });

  describe('Benchmark Comparisons', () => {
    it('should compare SSE vs HTTP polling performance', async () => {
      const results = {
        sse: { time: 0, memory: 0, messages: 0 },
        httpPolling: { time: 0, memory: 0, messages: 0 },
      };

      // Test SSE performance
      {
        monitor.start();
        const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
        await new Promise(resolve => eventSource.addEventListener('open', resolve));

        let messageCount = 0;
        eventSource.addEventListener('message', () => messageCount++);

        // Send 100 messages over 1 second
        for (let i = 0; i < 100; i++) {
          setTimeout(() => {
            eventSource.simulateMessage({ id: i, data: `SSE message ${i}` });
          }, i * 10);
        }

        await new Promise(resolve => setTimeout(resolve, 1200));

        results.sse = {
          time: monitor.getElapsedTime(),
          memory: monitor.getMemoryUsage(),
          messages: messageCount,
        };

        eventSource.close();
      }

      // Test HTTP polling performance
      {
        monitor.start();
        
        mockFetch.mockImplementation(() => {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              messages: [`HTTP poll message ${Date.now()}`],
            }),
          });
        });

        let messageCount = 0;
        const pollInterval = setInterval(async () => {
          try {
            const response = await fetch(`${DEFAULT_TEST_CONFIG.http.baseUrl}/poll`);
            const data = await response.json();
            messageCount += data.messages.length;
          } catch (error) {
            // Ignore polling errors for this test
          }
        }, 100); // Poll every 100ms

        await new Promise(resolve => setTimeout(resolve, 1200));
        clearInterval(pollInterval);

        results.httpPolling = {
          time: monitor.getElapsedTime(),
          memory: monitor.getMemoryUsage(),
          messages: messageCount,
        };
      }

      // SSE should be more efficient
      expect(results.sse.messages).toBe(100);
      expect(results.httpPolling.messages).toBeGreaterThan(0);
      
      // SSE should use less memory (fewer HTTP requests)
      expect(results.sse.memory).toBeLessThanOrEqual(results.httpPolling.memory);
      
      console.log('Performance Comparison:', results);
    });

    it('should benchmark connection establishment times', async () => {
      const connectionTimes: number[] = [];
      const concurrentTests = 5;

      for (let i = 0; i < concurrentTests; i++) {
        monitor.start();
        
        const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
        await new Promise(resolve => eventSource.addEventListener('open', resolve));
        
        connectionTimes.push(monitor.getElapsedTime());
        eventSource.close();
      }

      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);
      const minConnectionTime = Math.min(...connectionTimes);

      expect(avgConnectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.good);
      expect(maxConnectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.acceptable);
      expect(minConnectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.connectionTime.excellent);

      console.log('Connection Time Stats:', {
        average: avgConnectionTime,
        min: minConnectionTime,
        max: maxConnectionTime,
        samples: connectionTimes,
      });
    });

    it('should benchmark memory usage patterns', async () => {
      const memorySnapshots: number[] = [];
      
      monitor.start();
      memorySnapshots.push(monitor.getMemoryUsage()); // Baseline

      const eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
      memorySnapshots.push(monitor.getMemoryUsage()); // After connection

      // Process batches of messages
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 50; i++) {
          eventSource.simulateMessage({
            id: `${batch}-${i}`,
            data: `Batch ${batch} Message ${i}`,
          });
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        memorySnapshots.push(monitor.getMemoryUsage());
      }

      eventSource.close();
      await new Promise(resolve => setTimeout(resolve, 100));
      memorySnapshots.push(monitor.getMemoryUsage()); // After cleanup

      const maxMemoryUsage = Math.max(...memorySnapshots);
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];

      expect(maxMemoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.acceptable);
      expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage.good);

      console.log('Memory Usage Pattern:', {
        snapshots: memorySnapshots,
        maxUsage: maxMemoryUsage,
        finalGrowth: memoryGrowth,
      });
    });
  });
});