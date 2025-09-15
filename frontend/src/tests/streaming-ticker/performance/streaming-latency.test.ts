/**
 * Performance Tests for Streaming Latency
 *
 * Tests streaming performance including:
 * - Message delivery latency
 * - Connection establishment time
 * - Memory usage optimization
 * - High-frequency message handling
 * - Resource cleanup efficiency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedSSEConnection } from '../../../hooks/useAdvancedSSEConnection';
import { ClaudeOutputParser } from '../../../utils/claude-output-parser';
import { createPerformanceMonitor } from '../utils/performance-helpers';

describe('Streaming Latency Performance Tests', () => {
  let performanceMonitor: ReturnType<typeof createPerformanceMonitor>;
  let mockEventSource: any;

  beforeEach(() => {
    performanceMonitor = createPerformanceMonitor();

    // Mock EventSource with performance tracking
    mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      readyState: 0,
      close: vi.fn(),

      // Test helpers
      simulateOpen() {
        this.readyState = 1;
        this.onopen?.(new Event('open'));
      },

      simulateMessage(data: any, timestamp?: number) {
        const messageTimestamp = timestamp || performance.now();
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            ...data,
            timestamp: messageTimestamp
          })
        });
        this.onmessage?.(event);
      },

      simulateError() {
        this.readyState = 2;
        this.onerror?.(new Event('error'));
      }
    };

    global.EventSource = vi.fn(() => mockEventSource);

    // Mock performance.now for consistent testing
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    performanceMonitor.cleanup();
    vi.restoreAllMocks();
  });

  describe('Connection Establishment Latency', () => {
    it('should establish connection within acceptable time', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      const startTime = performance.now();

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');

        // Simulate connection opening after 50ms
        setTimeout(() => mockEventSource.simulateOpen(), 50);

        await connectPromise;
      });

      const connectionTime = performance.now() - startTime;

      expect(connectionTime).toBeLessThan(100); // Should connect in <100ms
      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should handle connection timeout efficiently', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: false
        })
      );

      const startTime = performance.now();

      await act(async () => {
        try {
          // Don't simulate connection opening to trigger timeout
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          const timeoutDuration = performance.now() - startTime;
          expect(timeoutDuration).toBeGreaterThan(9000); // Should respect 10s timeout
          expect(timeoutDuration).toBeLessThan(11000);
        }
      });
    });

    it('should reconnect efficiently after failure', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          autoReconnect: true,
          maxRetries: 3,
          reconnectDelay: 50
        })
      );

      // Initial connection
      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const reconnectStartTime = performance.now();

      // Simulate connection loss
      await act(async () => {
        mockEventSource.simulateError();
      });

      // Wait for reconnection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        mockEventSource.simulateOpen();
      });

      const reconnectTime = performance.now() - reconnectStartTime;

      expect(reconnectTime).toBeLessThan(200); // Should reconnect quickly
      expect(result.current.connectionState.isConnected).toBe(true);
    });
  });

  describe('Message Processing Latency', () => {
    let hookResult: any;

    beforeEach(async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          batchSize: 10
        })
      );

      hookResult = result;

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });
    });

    it('should process single message with low latency', async () => {
      const messages: any[] = [];
      const latencies: number[] = [];

      hookResult.current.addMessageHandler((instanceId: string, newMessages: any[]) => {
        const receivedTime = performance.now();
        newMessages.forEach(msg => {
          const latency = receivedTime - msg.timestamp.getTime();
          latencies.push(latency);
          messages.push(msg);
        });
      });

      const sendTime = performance.now();

      await act(async () => {
        mockEventSource.simulateMessage({
          type: 'terminal_output',
          data: 'Test message',
          instanceId: 'claude-test-123'
        }, sendTime);
      });

      expect(messages).toHaveLength(1);
      expect(latencies[0]).toBeLessThan(10); // Should process in <10ms
    });

    it('should handle high-frequency messages efficiently', async () => {
      const messages: any[] = [];
      const startTime = performance.now();

      hookResult.current.addMessageHandler((instanceId: string, newMessages: any[]) => {
        messages.push(...newMessages);
      });

      const messageCount = 1000;

      await act(async () => {
        for (let i = 0; i < messageCount; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Message ${i}`,
            instanceId: 'claude-test-123',
            sequenceNumber: i + 1
          });
        }
      });

      const processingTime = performance.now() - startTime;
      const averageLatency = processingTime / messageCount;

      expect(averageLatency).toBeLessThan(1); // Should process each message in <1ms on average
      expect(messages.length).toBe(messageCount);
    });

    it('should batch messages efficiently', async () => {
      const batchSizes: number[] = [];
      const batchTimes: number[] = [];

      hookResult.current.addMessageHandler((instanceId: string, newMessages: any[]) => {
        batchSizes.push(newMessages.length);
        batchTimes.push(performance.now());
      });

      await act(async () => {
        // Send 25 messages rapidly (should be batched into groups of 10)
        for (let i = 0; i < 25; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Batch message ${i}`,
            instanceId: 'claude-test-123',
            sequenceNumber: i + 1
          });
        }
      });

      // Should receive messages in batches
      expect(batchSizes.length).toBeGreaterThan(1);
      expect(batchSizes.some(size => size > 1)).toBe(true); // At least one batch should have multiple messages
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain low memory usage under load', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          maxMemoryMB: 25
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      // Send large messages to stress memory
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: 'A'.repeat(1000), // 1KB per message
            instanceId: 'claude-test-123',
            sequenceNumber: i + 1
          });
        }
      });

      const memoryUsage = result.current.connectionState.memoryUsage;
      expect(memoryUsage).toBeLessThan(30); // Should stay under 30MB
    });

    it('should cleanup old messages efficiently', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const initialMemory = result.current.connectionState.memoryUsage;

      // Send many messages
      await act(async () => {
        for (let i = 0; i < 2000; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Message ${i}`,
            instanceId: 'claude-test-123',
            sequenceNumber: i + 1
          });
        }
      });

      // Trigger cleanup
      await act(async () => {
        result.current.flushUpdates();
      });

      const finalMemory = result.current.connectionState.memoryUsage;

      // Memory should not grow unbounded
      expect(finalMemory - initialMemory).toBeLessThan(50); // Should not increase by more than 50MB
    });

    it('should handle concurrent instance memory efficiently', async () => {
      const hook1 = renderHook(() => useAdvancedSSEConnection('http://localhost:3001'));
      const hook2 = renderHook(() => useAdvancedSSEConnection('http://localhost:3001'));

      // Connect both instances
      await act(async () => {
        const connect1 = hook1.result.current.connectToInstance('claude-instance-1');
        const connect2 = hook2.result.current.connectToInstance('claude-instance-2');

        mockEventSource.simulateOpen();

        await Promise.all([connect1, connect2]);
      });

      // Send messages to both instances
      await act(async () => {
        for (let i = 0; i < 500; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Instance 1 Message ${i}`,
            instanceId: 'claude-instance-1'
          });

          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: `Instance 2 Message ${i}`,
            instanceId: 'claude-instance-2'
          });
        }
      });

      const memory1 = hook1.result.current.connectionState.memoryUsage;
      const memory2 = hook2.result.current.connectionState.memoryUsage;

      // Each instance should maintain reasonable memory usage
      expect(memory1).toBeLessThan(25);
      expect(memory2).toBeLessThan(25);
    });
  });

  describe('Claude Output Parser Performance', () => {
    it('should parse output efficiently', () => {
      const complexOutput = `
\x1B[2J\x1B[H┌──────────────────────────────────────┐
│  Welcome to Claude Code!              │
│  cwd: /workspaces/agent-feed          │
│  Model: Claude Sonnet 4               │
└──────────────────────────────────────┘

> npm run test
Running test suite...

\x1B[32m✓\x1B[0m All tests passed
\x1B[33m⚠\x1B[0m 2 warnings

Test Summary:
- 45 tests passed
- 0 tests failed
- 2 warnings
`;

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        ClaudeOutputParser.parseClaudeOutput(complexOutput);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(5); // Should parse each output in <5ms
    });

    it('should handle large output efficiently', () => {
      // Generate 1MB of output
      const largeOutput = Array(1000).fill(0).map((_, i) =>
        `Line ${i}: ${'A'.repeat(1000)}`
      ).join('\n');

      const startTime = performance.now();
      const messages = ClaudeOutputParser.parseClaudeOutput(largeOutput);
      const parseTime = performance.now() - startTime;

      expect(parseTime).toBeLessThan(100); // Should parse 1MB in <100ms
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should extract text content efficiently', () => {
      const complexOutput = `
\x1B[2J\x1B[H┌──────────────────┐
│ Complex Output   │
└──────────────────┘

Multiple lines of text
With various formatting
\x1B[31mRed text\x1B[0m
\x1B[1mBold text\x1B[0m
`;

      const iterations = 5000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        ClaudeOutputParser.extractTextContent(complexOutput);
      }

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(1); // Should extract text in <1ms per operation
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should cleanup resources quickly', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001')
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      // Add many event listeners
      const unsubscribers = Array.from({ length: 100 }, () =>
        result.current.addMessageHandler(() => {})
      );

      const cleanupStart = performance.now();

      await act(async () => {
        // Cleanup all listeners
        unsubscribers.forEach(unsub => unsub());
        result.current.cleanup();
      });

      const cleanupTime = performance.now() - cleanupStart;

      expect(cleanupTime).toBeLessThan(50); // Should cleanup in <50ms
    });

    it('should handle multiple instance cleanup efficiently', async () => {
      const hooks = Array.from({ length: 10 }, () =>
        renderHook(() => useAdvancedSSEConnection('http://localhost:3001'))
      );

      // Connect all instances
      await act(async () => {
        const connections = hooks.map((hook, i) =>
          hook.result.current.connectToInstance(`claude-instance-${i}`)
        );

        mockEventSource.simulateOpen();
        await Promise.all(connections);
      });

      const cleanupStart = performance.now();

      await act(async () => {
        // Cleanup all instances
        hooks.forEach(hook => hook.result.current.cleanup());
      });

      const cleanupTime = performance.now() - cleanupStart;

      expect(cleanupTime).toBeLessThan(100); // Should cleanup 10 instances in <100ms
    });
  });

  describe('Stress Testing', () => {
    it('should handle sustained high load', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          batchSize: 50
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const messagesSent = 10000;
      const startTime = performance.now();

      await act(async () => {
        // Send messages in bursts
        for (let burst = 0; burst < 100; burst++) {
          for (let i = 0; i < 100; i++) {
            mockEventSource.simulateMessage({
              type: 'terminal_output',
              data: `Stress test message ${burst * 100 + i}`,
              instanceId: 'claude-test-123',
              sequenceNumber: burst * 100 + i + 1
            });
          }

          // Small pause between bursts
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });

      const processingTime = performance.now() - startTime;
      const throughput = messagesSent / (processingTime / 1000); // messages per second

      expect(throughput).toBeGreaterThan(1000); // Should handle >1000 messages/second
      expect(result.current.connectionState.memoryUsage).toBeLessThan(100); // Should stay under 100MB
    });

    it('should maintain performance under memory pressure', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://localhost:3001', {
          maxMemoryMB: 10 // Very limited memory
        })
      );

      await act(async () => {
        const connectPromise = result.current.connectToInstance('claude-test-123');
        mockEventSource.simulateOpen();
        await connectPromise;
      });

      const startTime = performance.now();

      await act(async () => {
        // Send large messages to trigger memory pressure
        for (let i = 0; i < 50; i++) {
          mockEventSource.simulateMessage({
            type: 'terminal_output',
            data: 'X'.repeat(10000), // 10KB per message
            instanceId: 'claude-test-123',
            sequenceNumber: i + 1
          });
        }
      });

      const processingTime = performance.now() - startTime;

      // Should still process efficiently even under memory pressure
      expect(processingTime).toBeLessThan(1000);
      expect(result.current.connectionState.memoryUsage).toBeLessThan(15); // Should enforce memory limit
    });
  });
});