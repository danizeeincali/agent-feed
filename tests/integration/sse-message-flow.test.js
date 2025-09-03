/**
 * SSE Message Flow Integration Tests
 * 
 * Tests for Server-Sent Events message flow, broadcasting, and real-time communication
 * between the backend and frontend Claude instance management system.
 */

import { jest, describe, test, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  SSE_TIMEOUT: 15000,
  CONNECTION_TIMEOUT: 10000,
  MESSAGE_TIMEOUT: 20000
};

class SSEMessageFlowTester {
  constructor() {
    this.activeConnections = [];
    this.activeInstances = [];
    this.messageBuffer = new Map(); // instanceId -> messages[]
  }

  async createTestInstance() {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'claude --dangerously-skip-permissions',
        name: `sse-test-${Date.now()}`,
        type: 'skip-permissions'
      })
    });

    const data = await response.json();
    this.activeInstances.push(data.instanceId);
    return data.instanceId;
  }

  createSSEConnection(instanceId, trackMessages = true) {
    const eventSource = new EventSource(
      `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`
    );
    
    this.activeConnections.push(eventSource);

    if (trackMessages) {
      if (!this.messageBuffer.has(instanceId)) {
        this.messageBuffer.set(instanceId, []);
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageBuffer.get(instanceId).push({
            ...data,
            receivedAt: new Date()
          });
        } catch (error) {
          console.warn('Failed to parse SSE message:', error);
        }
      };
    }

    return eventSource;
  }

  async sendMessage(instanceId, message) {
    const response = await fetch(
      `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: message })
      }
    );
    return response.json();
  }

  async waitForMessages(instanceId, count = 1, timeoutMs = TEST_CONFIG.MESSAGE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const received = this.messageBuffer.get(instanceId)?.length || 0;
        reject(new Error(`Timeout waiting for ${count} messages. Received: ${received}`));
      }, timeoutMs);

      const checkMessages = () => {
        const messages = this.messageBuffer.get(instanceId) || [];
        if (messages.length >= count) {
          clearTimeout(timeout);
          resolve(messages.slice(0, count));
        } else {
          setTimeout(checkMessages, 100);
        }
      };

      checkMessages();
    });
  }

  async waitForRealMessage(instanceId, timeoutMs = TEST_CONFIG.MESSAGE_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for real message'));
      }, timeoutMs);

      const checkMessages = () => {
        const messages = this.messageBuffer.get(instanceId) || [];
        const realMessage = messages.find(msg => 
          msg.isReal === true && msg.type === 'terminal_output' && msg.data?.trim()
        );
        
        if (realMessage) {
          clearTimeout(timeout);
          resolve(realMessage);
        } else {
          setTimeout(checkMessages, 100);
        }
      };

      checkMessages();
    });
  }

  async cleanup() {
    // Close all SSE connections
    this.activeConnections.forEach(conn => {
      if (conn.readyState === EventSource.OPEN) {
        conn.close();
      }
    });
    this.activeConnections = [];

    // Clean up instances
    for (const instanceId of this.activeInstances) {
      try {
        await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message);
      }
    }
    this.activeInstances = [];
    this.messageBuffer.clear();
  }

  async waitForInstanceReady(instanceId, timeoutMs = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
      const data = await response.json();
      const instance = data.instances?.find(i => i.id === instanceId);
      
      if (instance && (instance.status === 'running' || instance.status === 'ready')) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Instance ${instanceId} not ready within ${timeoutMs}ms`);
  }
}

describe('SSE Message Flow Integration Tests', () => {
  let tester;

  beforeAll(async () => {
    // Verify backend is accessible
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
    expect(response.ok).toBe(true);
  });

  beforeEach(() => {
    tester = new SSEMessageFlowTester();
  });

  afterEach(async () => {
    await tester.cleanup();
  });

  describe('SSE Connection Management', () => {
    test('should establish SSE connection successfully', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const connectionPromise = new Promise((resolve, reject) => {
        const eventSource = tester.createSSEConnection(instanceId, false);
        
        const timeout = setTimeout(() => {
          reject(new Error('SSE connection timeout'));
        }, TEST_CONFIG.CONNECTION_TIMEOUT);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      await connectionPromise;
    }, TEST_CONFIG.CONNECTION_TIMEOUT);

    test('should handle multiple concurrent SSE connections to same instance', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const connections = [];
      const connectionPromises = [];

      for (let i = 0; i < 3; i++) {
        const connectionPromise = new Promise((resolve, reject) => {
          const eventSource = tester.createSSEConnection(instanceId, false);
          connections.push(eventSource);
          
          const timeout = setTimeout(() => {
            reject(new Error(`Connection ${i} timeout`));
          }, TEST_CONFIG.CONNECTION_TIMEOUT);

          eventSource.onopen = () => {
            clearTimeout(timeout);
            resolve(i);
          };

          eventSource.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });

        connectionPromises.push(connectionPromise);
      }

      const results = await Promise.all(connectionPromises);
      expect(results).toEqual([0, 1, 2]);
      
      // All connections should be open
      connections.forEach(conn => {
        expect(conn.readyState).toBe(EventSource.OPEN);
      });
    }, TEST_CONFIG.CONNECTION_TIMEOUT);

    test('should handle SSE reconnection after connection loss', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      let eventSource = tester.createSSEConnection(instanceId, false);
      
      // Wait for initial connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Initial connection timeout'));
        }, TEST_CONFIG.CONNECTION_TIMEOUT);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // Simulate connection loss
      eventSource.close();
      
      // Reconnect
      eventSource = tester.createSSEConnection(instanceId, false);
      
      // Verify reconnection works
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection timeout'));
        }, TEST_CONFIG.CONNECTION_TIMEOUT);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      expect(eventSource.readyState).toBe(EventSource.OPEN);
    }, TEST_CONFIG.CONNECTION_TIMEOUT);
  });

  describe('Message Broadcasting', () => {
    test('should broadcast messages to all connected SSE clients', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      // Create multiple connections
      const eventSource1 = tester.createSSEConnection(instanceId);
      const eventSource2 = tester.createSSEConnection(instanceId);
      const eventSource3 = tester.createSSEConnection(instanceId);

      // Wait for all connections to be ready
      await Promise.all([
        new Promise(resolve => eventSource1.onopen = resolve),
        new Promise(resolve => eventSource2.onopen = resolve),
        new Promise(resolve => eventSource3.onopen = resolve)
      ]);

      // Send a message
      const testMessage = 'Broadcast test message';
      await tester.sendMessage(instanceId, testMessage);

      // All connections should receive the response
      const [messages1, messages2, messages3] = await Promise.all([
        tester.waitForRealMessage(instanceId),
        tester.waitForRealMessage(instanceId),
        tester.waitForRealMessage(instanceId)
      ]);

      expect(messages1.type).toBe('terminal_output');
      expect(messages2.type).toBe('terminal_output');
      expect(messages3.type).toBe('terminal_output');
      
      expect(messages1.isReal).toBe(true);
      expect(messages2.isReal).toBe(true);
      expect(messages3.isReal).toBe(true);
    }, TEST_CONFIG.MESSAGE_TIMEOUT);

    test('should handle broadcastToConnections with proper message format', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      
      await new Promise(resolve => eventSource.onopen = resolve);

      await tester.sendMessage(instanceId, 'Message format test');
      const message = await tester.waitForRealMessage(instanceId);

      // Validate complete message structure
      expect(message).toHaveProperty('type', 'terminal_output');
      expect(message).toHaveProperty('data');
      expect(message).toHaveProperty('isReal', true);
      expect(message).toHaveProperty('instanceId', instanceId);
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('receivedAt');

      expect(typeof message.data).toBe('string');
      expect(message.data.trim()).not.toBe('');
      expect(message.timestamp).toBeDefined();
      expect(message.receivedAt).toBeInstanceOf(Date);
    }, TEST_CONFIG.MESSAGE_TIMEOUT);

    test('should buffer messages when no SSE connections exist', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      // Send message without any SSE connections
      await tester.sendMessage(instanceId, 'Buffered message test');
      
      // Wait a moment for message to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Connect SSE and should receive buffered output
      const eventSource = tester.createSSEConnection(instanceId);
      
      await new Promise(resolve => eventSource.onopen = resolve);
      
      // Should receive the message that was sent before connection
      const message = await tester.waitForRealMessage(instanceId);
      
      expect(message.type).toBe('terminal_output');
      expect(message.isReal).toBe(true);
      expect(message.data).toBeDefined();
    }, TEST_CONFIG.MESSAGE_TIMEOUT);
  });

  describe('Message Content and Ordering', () => {
    test('should preserve message order across multiple inputs', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      await new Promise(resolve => eventSource.onopen = resolve);

      // Send multiple messages in sequence
      const messages = [
        'First message for ordering test',
        'Second message for ordering test',
        'Third message for ordering test'
      ];

      for (const msg of messages) {
        await tester.sendMessage(instanceId, msg);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between messages
      }

      // Wait for all responses
      const receivedMessages = await tester.waitForMessages(instanceId, 3);
      
      expect(receivedMessages.length).toBe(3);
      
      // Verify chronological order
      for (let i = 1; i < receivedMessages.length; i++) {
        const current = new Date(receivedMessages[i].timestamp);
        const previous = new Date(receivedMessages[i-1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(previous.getTime());
      }
    }, TEST_CONFIG.MESSAGE_TIMEOUT * 2);

    test('should handle special characters and encoding in messages', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      await new Promise(resolve => eventSource.onopen = resolve);

      const specialMessage = 'Special chars: 🚀 ñáéíóú "quotes" \'apostrophes\' <tags> & symbols';
      await tester.sendMessage(instanceId, specialMessage);

      const message = await tester.waitForRealMessage(instanceId);
      
      expect(message.type).toBe('terminal_output');
      expect(message.isReal).toBe(true);
      expect(message.data).toBeDefined();
      expect(typeof message.data).toBe('string');
    }, TEST_CONFIG.MESSAGE_TIMEOUT);

    test('should handle empty and whitespace-only messages', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      await new Promise(resolve => eventSource.onopen = resolve);

      // Test empty string
      const response1 = await tester.sendMessage(instanceId, '');
      expect(response1).toHaveProperty('success');

      // Test whitespace only
      const response2 = await tester.sendMessage(instanceId, '   \n  \t  ');
      expect(response2).toHaveProperty('success');
      
      // These might not generate real messages, which is acceptable
    }, TEST_CONFIG.MESSAGE_TIMEOUT);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid instance ID in SSE connection', async () => {
      const invalidInstanceId = 'invalid-instance-id';
      
      const errorPromise = new Promise((resolve) => {
        const eventSource = new EventSource(
          `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${invalidInstanceId}/terminal/stream`
        );
        
        eventSource.onerror = (error) => {
          resolve(error);
        };
      });

      const error = await errorPromise;
      expect(error).toBeDefined();
    }, TEST_CONFIG.CONNECTION_TIMEOUT);

    test('should handle SSE connection limit and cleanup', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      // Create many connections to test limits
      const connections = [];
      for (let i = 0; i < 10; i++) {
        connections.push(tester.createSSEConnection(instanceId, false));
      }

      // Wait for connections to establish
      await Promise.all(connections.map(conn => 
        new Promise(resolve => {
          conn.onopen = resolve;
          conn.onerror = resolve; // Also resolve on error to not fail the test
        })
      ));

      // At least some connections should be successful
      const openConnections = connections.filter(conn => conn.readyState === EventSource.OPEN);
      expect(openConnections.length).toBeGreaterThan(0);
    }, TEST_CONFIG.CONNECTION_TIMEOUT);

    test('should handle malformed SSE data gracefully', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      let messageCount = 0;
      let errorCount = 0;

      const eventSource = new EventSource(
        `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`
      );
      
      tester.activeConnections.push(eventSource);

      eventSource.onmessage = (event) => {
        try {
          JSON.parse(event.data);
          messageCount++;
        } catch (error) {
          errorCount++;
        }
      };

      await new Promise(resolve => eventSource.onopen = resolve);

      await tester.sendMessage(instanceId, 'Test for malformed data handling');
      
      // Wait a bit for messages
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should receive messages without JSON parsing errors
      expect(messageCount).toBeGreaterThan(0);
      expect(errorCount).toBe(0);
    }, TEST_CONFIG.MESSAGE_TIMEOUT);

    test('should handle concurrent message sending from multiple clients', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      await new Promise(resolve => eventSource.onopen = resolve);

      // Send multiple concurrent messages
      const concurrentMessages = [
        'Concurrent message 1',
        'Concurrent message 2', 
        'Concurrent message 3',
        'Concurrent message 4',
        'Concurrent message 5'
      ];

      const sendPromises = concurrentMessages.map(msg => 
        tester.sendMessage(instanceId, msg)
      );

      const responses = await Promise.all(sendPromises);
      
      // All sends should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Should receive all corresponding responses
      const messages = await tester.waitForMessages(instanceId, concurrentMessages.length);
      expect(messages.length).toBe(concurrentMessages.length);
    }, TEST_CONFIG.MESSAGE_TIMEOUT);
  });

  describe('Performance and Reliability', () => {
    test('should handle high-frequency message sending', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      await new Promise(resolve => eventSource.onopen = resolve);

      const messageCount = 20;
      const startTime = Date.now();

      // Send messages rapidly
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(tester.sendMessage(instanceId, `High frequency message ${i + 1}`));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      console.log(`Sent ${messageCount} messages in ${endTime - startTime}ms`);

      // Should handle the load without errors
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);

    test('should maintain SSE connection stability over time', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const eventSource = tester.createSSEConnection(instanceId);
      let connectionStable = true;

      eventSource.onerror = () => {
        connectionStable = false;
      };

      await new Promise(resolve => eventSource.onopen = resolve);

      // Send periodic messages over extended time
      for (let i = 0; i < 10; i++) {
        await tester.sendMessage(instanceId, `Stability test message ${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second intervals
      }

      expect(connectionStable).toBe(true);
      expect(eventSource.readyState).toBe(EventSource.OPEN);
    }, 15000);

    test('should measure message latency', async () => {
      const instanceId = await tester.createTestInstance();
      await tester.waitForInstanceReady(instanceId);

      const latencies = [];
      const eventSource = tester.createSSEConnection(instanceId, false);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.isReal && data.data && data.sentAt) {
            const latency = Date.now() - data.sentAt;
            latencies.push(latency);
          }
        } catch (error) {
          // Ignore parsing errors for this test
        }
      };

      await new Promise(resolve => eventSource.onopen = resolve);

      // Send test messages with timestamps
      for (let i = 0; i < 5; i++) {
        const message = {
          input: `Latency test message ${i + 1}`,
          sentAt: Date.now()
        };
        
        await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for responses
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`Average message latency: ${avgLatency.toFixed(2)}ms`);
        
        // Reasonable latency expectation
        expect(avgLatency).toBeLessThan(10000); // Less than 10 seconds average
      }
    }, 15000);
  });
});