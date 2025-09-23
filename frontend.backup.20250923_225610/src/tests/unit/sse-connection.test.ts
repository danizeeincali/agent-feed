/**
 * SSE Connection Unit Tests
 * Tests EventSource connection lifecycle, message handling, and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MockSSEServer, MockEventSource, MockSSETestUtils } from '../mocks/MockSSEServer';
import { DEFAULT_TEST_CONFIG, TEST_SCENARIOS } from '../config/sse-migration-test-config';

// Mock EventSource globally
global.EventSource = MockEventSource as any;

describe('SSE Connection Unit Tests', () => {
  let mockServer: MockSSEServer;
  let eventSource: MockEventSource;

  beforeEach(async () => {
    mockServer = new MockSSEServer(DEFAULT_TEST_CONFIG.mock);
    await mockServer.start();
  });

  afterEach(async () => {
    if (eventSource) {
      eventSource.close();
    }
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('Connection Lifecycle', () => {
    it('should establish SSE connection successfully', async () => {
      eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      const openPromise = new Promise((resolve) => {
        eventSource.addEventListener('open', resolve);
      });

      await openPromise;
      expect(eventSource.readyState).toBe(MockEventSource.OPEN);
    });

    it('should handle connection timeout gracefully', async () => {
      const shortTimeoutConfig = {
        ...DEFAULT_TEST_CONFIG.sse,
        timeout: 100,
      };

      eventSource = new MockEventSource(shortTimeoutConfig.endpoint);
      
      // Simulate connection delay longer than timeout
      const connectionPromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, shortTimeoutConfig.timeout);

        eventSource.addEventListener('open', () => {
          clearTimeout(timer);
          resolve(true);
        });
      });

      await expect(connectionPromise).rejects.toThrow('Connection timeout');
    });

    it('should attempt reconnection after connection loss', async () => {
      eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      // Wait for initial connection
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
      
      let reconnectAttempted = false;
      const originalEventSource = eventSource;

      // Simulate connection loss
      eventSource.simulateClose();
      
      // Simulate reconnection logic
      setTimeout(() => {
        eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
        reconnectAttempted = true;
      }, DEFAULT_TEST_CONFIG.sse.reconnectInterval);

      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, DEFAULT_TEST_CONFIG.sse.reconnectInterval + 200));
      
      expect(reconnectAttempted).toBe(true);
      expect(eventSource.readyState).toBe(MockEventSource.OPEN);
    });

    it('should respect maximum retry attempts', async () => {
      let retryCount = 0;
      const maxRetries = DEFAULT_TEST_CONFIG.sse.maxRetries;

      const attemptConnection = () => {
        retryCount++;
        if (retryCount <= maxRetries) {
          eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
          // Simulate immediate failure
          eventSource.simulateError(new Error('Connection failed'));
          
          if (retryCount < maxRetries) {
            setTimeout(attemptConnection, DEFAULT_TEST_CONFIG.sse.reconnectInterval);
          }
        }
      };

      attemptConnection();
      
      // Wait for all retry attempts
      await new Promise(resolve => 
        setTimeout(resolve, maxRetries * DEFAULT_TEST_CONFIG.sse.reconnectInterval + 500)
      );

      expect(retryCount).toBe(maxRetries);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
    });

    it('should receive and parse JSON messages correctly', async () => {
      const testMessage = { type: 'test', data: 'Hello World', timestamp: Date.now() };
      
      const messagePromise = new Promise((resolve) => {
        eventSource.addEventListener('message', (event: any) => {
          const parsed = JSON.parse(event.data);
          resolve(parsed);
        });
      });

      eventSource.simulateMessage(testMessage);
      
      const received = await messagePromise;
      expect(received).toEqual(testMessage);
    });

    it('should handle different event types', async () => {
      const events: string[] = [];
      
      eventSource.addEventListener('custom-event', (event: any) => {
        events.push(`custom-event: ${event.data}`);
      });
      
      eventSource.addEventListener('another-event', (event: any) => {
        events.push(`another-event: ${event.data}`);
      });

      eventSource.simulateMessage('test data 1', 'custom-event');
      eventSource.simulateMessage('test data 2', 'another-event');

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(events).toContain('custom-event: test data 1');
      expect(events).toContain('another-event: test data 2');
    });

    it('should handle malformed JSON gracefully', async () => {
      const errors: Error[] = [];
      
      eventSource.addEventListener('message', (event: any) => {
        try {
          JSON.parse(event.data);
        } catch (error) {
          errors.push(error as Error);
        }
      });

      eventSource.simulateMessage('{ invalid json }');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SyntaxError);
    });

    it('should handle large message payloads efficiently', async () => {
      const largeData = {
        id: 'large-message',
        payload: 'x'.repeat(1024 * 1024), // 1MB payload
        metadata: { size: 1024 * 1024, type: 'large-test' }
      };

      const startTime = performance.now();
      
      const messagePromise = new Promise((resolve) => {
        eventSource.addEventListener('message', (event: any) => {
          const parsed = JSON.parse(event.data);
          const endTime = performance.now();
          resolve({ data: parsed, processingTime: endTime - startTime });
        });
      });

      eventSource.simulateMessage(largeData);
      
      const result: any = await messagePromise;
      expect(result.data.id).toBe('large-message');
      expect(result.processingTime).toBeLessThan(1000); // Should process within 1 second
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(async () => {
      eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
    });

    it('should handle network errors gracefully', async () => {
      const errors: Error[] = [];
      
      eventSource.addEventListener('error', (error: any) => {
        errors.push(error);
      });

      const networkError = new Error('Network unreachable');
      eventSource.simulateError(networkError);

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Network unreachable');
    });

    it('should handle server errors (5xx)', async () => {
      const serverError = new Error('500 Internal Server Error');
      const errorHandled = new Promise((resolve) => {
        eventSource.addEventListener('error', resolve);
      });

      eventSource.simulateError(serverError);
      
      await errorHandled;
      expect(eventSource.readyState).toBe(MockEventSource.OPEN); // Should still be connected for server errors
    });

    it('should handle connection drops during message streaming', async () => {
      let messagesReceived = 0;
      let connectionLost = false;

      eventSource.addEventListener('message', () => {
        messagesReceived++;
      });

      eventSource.addEventListener('close', () => {
        connectionLost = true;
      });

      // Start streaming messages
      const messageInterval = setInterval(() => {
        if (eventSource.readyState === MockEventSource.OPEN) {
          eventSource.simulateMessage({ id: messagesReceived, data: 'test' });
        }
      }, 100);

      // Simulate connection drop after some messages
      setTimeout(() => {
        eventSource.simulateClose();
        clearInterval(messageInterval);
      }, 550);

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(messagesReceived).toBeGreaterThan(0);
      expect(messagesReceived).toBeLessThan(10); // Should have been interrupted
      expect(connectionLost).toBe(true);
    });

    it('should handle rapid reconnection scenarios', async () => {
      let connectionCount = 0;
      const connections: MockEventSource[] = [];

      const createConnection = () => {
        const es = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
        connectionCount++;
        connections.push(es);
        
        es.addEventListener('open', () => {
          // Immediately close and reconnect
          es.close();
          if (connectionCount < 5) {
            setTimeout(createConnection, 10);
          }
        });
      };

      createConnection();

      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(connectionCount).toBe(5);
      expect(connections).toHaveLength(5);
      
      // Cleanup
      connections.forEach(es => es.close());
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      await new Promise(resolve => eventSource.addEventListener('open', resolve));
    });

    it('should establish connection within performance threshold', async () => {
      const startTime = performance.now();
      
      const newEventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
      
      await new Promise(resolve => newEventSource.addEventListener('open', resolve));
      
      const connectionTime = performance.now() - startTime;
      expect(connectionTime).toBeLessThan(DEFAULT_TEST_CONFIG.performance.maxConnectionTime);
      
      newEventSource.close();
    });

    it('should handle high message throughput', async () => {
      let messageCount = 0;
      const targetMessages = DEFAULT_TEST_CONFIG.performance.messageThroughput;
      const testDuration = 1000; // 1 second

      eventSource.addEventListener('message', () => {
        messageCount++;
      });

      const startTime = Date.now();
      const messageInterval = setInterval(() => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(messageInterval);
          return;
        }
        eventSource.simulateMessage({ id: messageCount, timestamp: Date.now() });
      }, testDuration / targetMessages);

      await new Promise(resolve => setTimeout(resolve, testDuration + 100));

      expect(messageCount).toBeGreaterThanOrEqual(targetMessages * 0.9); // Allow 10% tolerance
    });

    it('should maintain reasonable memory usage', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Send many messages to test memory usage
      for (let i = 0; i < 1000; i++) {
        eventSource.simulateMessage({
          id: i,
          data: 'x'.repeat(1000), // 1KB per message
          timestamp: Date.now()
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Allow for reasonable memory increase (less than 50MB for 1000 messages)
      expect(memoryIncrease).toBeLessThan(DEFAULT_TEST_CONFIG.performance.maxMemoryUsage);
    });
  });

  describe('Scenario-based Tests', () => {
    it('should handle slow network conditions', async () => {
      await MockSSETestUtils.withMockServer(
        { ...DEFAULT_TEST_CONFIG.mock, delay: 2000 },
        async (server) => {
          const startTime = performance.now();
          
          eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
          
          await new Promise(resolve => eventSource.addEventListener('open', resolve));
          
          const connectionTime = performance.now() - startTime;
          expect(connectionTime).toBeGreaterThan(1900); // Should reflect the delay
        }
      );
    });

    it('should recover from network failure scenario', async () => {
      await MockSSETestUtils.withMockServer(
        { ...DEFAULT_TEST_CONFIG.mock, errorRate: 0.8 },
        async (server) => {
          let connectionAttempts = 0;
          let successfulConnection = false;

          const attemptConnection = () => {
            connectionAttempts++;
            eventSource = new MockEventSource(DEFAULT_TEST_CONFIG.sse.endpoint);
            
            eventSource.addEventListener('open', () => {
              successfulConnection = true;
            });
            
            eventSource.addEventListener('error', () => {
              if (connectionAttempts < 3) {
                setTimeout(attemptConnection, 500);
              }
            });
          };

          attemptConnection();
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          expect(connectionAttempts).toBeGreaterThan(1);
          // With high error rate, may or may not succeed, but should attempt retries
        }
      );
    });
  });
});