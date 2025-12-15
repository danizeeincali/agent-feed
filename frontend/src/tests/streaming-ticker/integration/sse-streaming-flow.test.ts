/**
 * Integration Tests for SSE Streaming Flow
 *
 * Tests end-to-end SSE streaming including:
 * - Complete message flow from backend to frontend
 * - Real-time data synchronization
 * - Multiple concurrent connections
 * - Stream recovery and resilience
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAdvancedSSEConnection } from '../../../hooks/useAdvancedSSEConnection';
import { renderHook, act } from '@testing-library/react';
import { createMockSSEServer } from '../mocks/mock-sse-server';

describe('SSE Streaming Flow Integration', () => {
  let mockServer: any;
  let baseUrl: string;

  beforeEach(async () => {
    mockServer = await createMockSSEServer();
    baseUrl = `http://localhost:${mockServer.port}`;
  });

  afterEach(async () => {
    await mockServer.close();
  });

  describe('Connection Establishment', () => {
    it('should establish SSE connection and receive initial handshake', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          autoReconnect: false,
          batchSize: 5
        })
      );

      const connectionPromise = act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Simulate server handshake
      mockServer.sendToInstance('claude-test-123', {
        type: 'connected',
        instanceId: 'claude-test-123',
        timestamp: Date.now()
      });

      await connectionPromise;

      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.connectionState.instanceId).toBe('claude-test-123');
      expect(result.current.connectionState.connectionHealth).toBe('healthy');
    });

    it('should handle connection failure gracefully', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection('http://nonexistent:9999', {
          autoReconnect: false
        })
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-test-123');
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.lastError).toBeTruthy();
    });

    it('should validate instance before connecting', async () => {
      // Configure server to reject invalid instance
      mockServer.setInstanceStatus('claude-invalid', 'not_found');

      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl)
      );

      await act(async () => {
        try {
          await result.current.connectToInstance('claude-invalid');
        } catch (error) {
          expect(error.message).toContain('not found');
        }
      });
    });
  });

  describe('Message Flow', () => {
    let hookResult: any;

    beforeEach(async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          batchSize: 3,
          maxMemoryMB: 10
        })
      );

      hookResult = result;

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Complete handshake
      mockServer.sendToInstance('claude-test-123', {
        type: 'connected',
        instanceId: 'claude-test-123'
      });
    });

    it('should receive and process terminal output messages', async () => {
      const messages: any[] = [];

      const unsubscribe = hookResult.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages.push(...newMessages);
        }
      );

      // Send terminal output
      await act(async () => {
        mockServer.sendToInstance('claude-test-123', {
          type: 'terminal_output',
          data: 'Hello from Claude!\n',
          timestamp: Date.now(),
          sequenceNumber: 1
        });
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'terminal_output',
        content: 'Hello from Claude!\n',
        instanceId: 'claude-test-123',
        sequenceNumber: 1
      });

      unsubscribe();
    });

    it('should handle batched message delivery', async () => {
      const messages: any[] = [];

      hookResult.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages.push(...newMessages);
        }
      );

      // Send multiple messages rapidly
      await act(async () => {
        for (let i = 1; i <= 5; i++) {
          mockServer.sendToInstance('claude-test-123', {
            type: 'terminal_output',
            data: `Line ${i}\n`,
            timestamp: Date.now(),
            sequenceNumber: i
          });
        }
      });

      // Should receive messages in batches of 3 (batchSize)
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.length).toBeLessThanOrEqual(5);
    });

    it('should handle different message types', async () => {
      const messages: any[] = [];

      hookResult.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages.push(...newMessages);
        }
      );

      // Send various message types
      await act(async () => {
        mockServer.sendToInstance('claude-test-123', {
          type: 'terminal_output',
          data: 'Terminal output',
          sequenceNumber: 1
        });

        mockServer.sendToInstance('claude-test-123', {
          type: 'status_update',
          status: 'processing',
          sequenceNumber: 2
        });

        mockServer.sendToInstance('claude-test-123', {
          type: 'heartbeat',
          timestamp: Date.now(),
          sequenceNumber: 3
        });
      });

      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe('terminal_output');
      expect(messages[1].type).toBe('status_update');
      expect(messages[2].type).toBe('heartbeat');
    });

    it('should preserve message order', async () => {
      const receivedMessages: any[] = [];

      hookResult.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          receivedMessages.push(...newMessages);
        }
      );

      // Send ordered messages
      await act(async () => {
        for (let i = 1; i <= 10; i++) {
          mockServer.sendToInstance('claude-test-123', {
            type: 'terminal_output',
            data: `Message ${i}`,
            sequenceNumber: i,
            timestamp: Date.now() + i
          });

          // Small delay to ensure ordering
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });

      expect(receivedMessages.length).toBeGreaterThan(0);

      // Verify sequence numbers are in order
      for (let i = 1; i < receivedMessages.length; i++) {
        expect(receivedMessages[i].sequenceNumber).toBeGreaterThan(
          receivedMessages[i - 1].sequenceNumber
        );
      }
    });
  });

  describe('Multiple Connections', () => {
    it('should handle multiple concurrent instance connections', async () => {
      const hook1 = renderHook(() => useAdvancedSSEConnection(baseUrl));
      const hook2 = renderHook(() => useAdvancedSSEConnection(baseUrl));

      // Connect to different instances
      await act(async () => {
        await hook1.result.current.connectToInstance('claude-instance-1');
        await hook2.result.current.connectToInstance('claude-instance-2');
      });

      // Complete handshakes
      mockServer.sendToInstance('claude-instance-1', {
        type: 'connected',
        instanceId: 'claude-instance-1'
      });

      mockServer.sendToInstance('claude-instance-2', {
        type: 'connected',
        instanceId: 'claude-instance-2'
      });

      expect(hook1.result.current.connectionState.instanceId).toBe('claude-instance-1');
      expect(hook2.result.current.connectionState.instanceId).toBe('claude-instance-2');
      expect(hook1.result.current.connectionState.isConnected).toBe(true);
      expect(hook2.result.current.connectionState.isConnected).toBe(true);
    });

    it('should isolate messages between instances', async () => {
      const hook1 = renderHook(() => useAdvancedSSEConnection(baseUrl));
      const hook2 = renderHook(() => useAdvancedSSEConnection(baseUrl));

      const messages1: any[] = [];
      const messages2: any[] = [];

      hook1.result.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages1.push(...newMessages);
        }
      );

      hook2.result.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages2.push(...newMessages);
        }
      );

      await act(async () => {
        await hook1.result.current.connectToInstance('claude-instance-1');
        await hook2.result.current.connectToInstance('claude-instance-2');
      });

      // Send messages to different instances
      await act(async () => {
        mockServer.sendToInstance('claude-instance-1', {
          type: 'terminal_output',
          data: 'Message for instance 1',
          sequenceNumber: 1
        });

        mockServer.sendToInstance('claude-instance-2', {
          type: 'terminal_output',
          data: 'Message for instance 2',
          sequenceNumber: 1
        });
      });

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1[0].content).toBe('Message for instance 1');
      expect(messages2[0].content).toBe('Message for instance 2');
    });
  });

  describe('Error Recovery', () => {
    let hookResult: any;

    beforeEach(async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          autoReconnect: true,
          maxRetries: 3
        })
      );

      hookResult = result;

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });
    });

    it('should reconnect automatically on connection loss', async () => {
      // Simulate connection loss
      await act(async () => {
        mockServer.disconnectInstance('claude-test-123');
      });

      expect(hookResult.current.connectionState.isRecovering).toBe(true);

      // Wait for reconnection attempt
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Simulate successful reconnection
      await act(async () => {
        mockServer.reconnectInstance('claude-test-123');
        mockServer.sendToInstance('claude-test-123', {
          type: 'connected',
          instanceId: 'claude-test-123'
        });
      });

      expect(hookResult.current.connectionState.isConnected).toBe(true);
      expect(hookResult.current.connectionState.isRecovering).toBe(false);
    });

    it('should handle sequence gap detection', async () => {
      const sequenceGaps: number[] = [];

      // Monitor for sequence gaps
      hookResult.current.addStateChangeHandler(
        (instanceId: string, state: any) => {
          if (state.lastError?.includes('sequence gap')) {
            sequenceGaps.push(state.sequenceNumber);
          }
        }
      );

      // Send messages with gap
      await act(async () => {
        mockServer.sendToInstance('claude-test-123', {
          type: 'terminal_output',
          data: 'Message 1',
          sequenceNumber: 1
        });

        // Skip sequence 2, send 3
        mockServer.sendToInstance('claude-test-123', {
          type: 'terminal_output',
          data: 'Message 3',
          sequenceNumber: 3
        });
      });

      // Should detect gap between 1 and 3
      expect(sequenceGaps.length).toBeGreaterThan(0);
    });

    it('should recover from malformed messages', async () => {
      const errorMessages: any[] = [];

      hookResult.current.addStateChangeHandler(
        (instanceId: string, state: any) => {
          if (state.lastError) {
            errorMessages.push(state.lastError);
          }
        }
      );

      // Send malformed message
      await act(async () => {
        mockServer.sendRawToInstance('claude-test-123', 'invalid json {');
      });

      // Should continue operating after malformed message
      await act(async () => {
        mockServer.sendToInstance('claude-test-123', {
          type: 'terminal_output',
          data: 'Valid message after error',
          sequenceNumber: 1
        });
      });

      expect(hookResult.current.connectionState.isConnected).toBe(true);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle high-frequency message stream', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          batchSize: 50,
          maxMemoryMB: 100
        })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      const messages: any[] = [];
      result.current.addMessageHandler(
        (instanceId: string, newMessages: any[]) => {
          messages.push(...newMessages);
        }
      );

      const start = performance.now();

      // Send 1000 messages rapidly
      await act(async () => {
        for (let i = 1; i <= 1000; i++) {
          mockServer.sendToInstance('claude-test-123', {
            type: 'terminal_output',
            data: `High frequency message ${i}`,
            sequenceNumber: i,
            timestamp: Date.now()
          });
        }
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // Should process 1000 messages in <5s
      expect(messages.length).toBeGreaterThan(900); // Should receive most messages
    });

    it('should maintain memory efficiency under load', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          maxMemoryMB: 25 // Limited memory
        })
      );

      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      // Send large messages
      await act(async () => {
        for (let i = 1; i <= 100; i++) {
          mockServer.sendToInstance('claude-test-123', {
            type: 'terminal_output',
            data: 'A'.repeat(1000), // 1KB per message
            sequenceNumber: i
          });
        }
      });

      const memoryUsage = result.current.connectionState.memoryUsage;
      expect(memoryUsage).toBeLessThan(30); // Should stay under 30MB
    });

    it('should handle connection churn gracefully', async () => {
      const { result } = renderHook(() =>
        useAdvancedSSEConnection(baseUrl, {
          autoReconnect: true
        })
      );

      // Rapid connect/disconnect cycles
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.connectToInstance('claude-test-123');
          await new Promise(resolve => setTimeout(resolve, 50));
          result.current.disconnectFromInstance('claude-test-123');
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Final connection should work
      await act(async () => {
        await result.current.connectToInstance('claude-test-123');
      });

      expect(result.current.connectionState.isConnected).toBe(true);
    });
  });
});