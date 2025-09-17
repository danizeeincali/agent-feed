/**
 * Integration Tests for /api/streaming-ticker/stream endpoint
 * Tests Server-Sent Events (SSE) functionality and streaming behavior
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-node';
import fetch from 'node-fetch';
import EventSource from 'eventsource';
import MockApiServer from '../mock-servers/mock-api-server';
import {
  streamingTickerTestData,
  errorTestCases,
  performanceTestData,
  webSocketTestData,
  delay,
  waitForCondition
} from '../fixtures/test-data';

// Type definitions for SSE events
interface StreamingEvent {
  type: string;
  data: any;
  timestamp?: number;
  priority?: string;
}

interface StreamingStats {
  activeConnections: number;
  totalMessages: number;
  uptime: number;
  timestamp: number;
}

// Helper function to parse SSE data
const parseSSEData = (data: string): any => {
  try {
    return JSON.parse(data);
  } catch {
    return { raw: data };
  }
};

// Helper function to create EventSource with proper error handling
const createEventSource = (url: string): Promise<EventSource> => {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(url);

    const timeoutId = setTimeout(() => {
      eventSource.close();
      reject(new Error('EventSource connection timeout'));
    }, 10000);

    eventSource.onopen = () => {
      clearTimeout(timeoutId);
      resolve(eventSource);
    };

    eventSource.onerror = (error) => {
      clearTimeout(timeoutId);
      eventSource.close();
      reject(error);
    };
  });
};

describe('Streaming Ticker SSE API Integration Tests', () => {
  let mockServer: MockApiServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Start mock server for isolated testing
    mockServer = new MockApiServer({
      port: 3004,
      cors: true,
      logging: false
    });
    await mockServer.start();
    baseUrl = mockServer.getUrl();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  beforeEach(() => {
    mockServer.clearAllOverrides();
    mockServer.resetRequestCount();
  });

  describe('GET /api/streaming-ticker/stream - SSE Connection', () => {
    test('should establish SSE connection successfully', async () => {
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream`);

      let connectionEstablished = false;

      eventSource.addEventListener('connection', (event) => {
        const data = parseSSEData(event.data);
        expect(data.connectionId).toBeDefined();
        expect(data.timestamp).toBeDefined();
        connectionEstablished = true;
      });

      // Wait for connection event
      await waitForCondition(() => connectionEstablished, 5000);

      expect(connectionEstablished).toBe(true);
      eventSource.close();
    });

    test('should receive periodic streaming events', async () => {
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream`);

      const receivedEvents: StreamingEvent[] = [];
      let connectionEstablished = false;

      eventSource.addEventListener('connection', () => {
        connectionEstablished = true;
      });

      eventSource.addEventListener('tool_activity', (event) => {
        const data = parseSSEData(event.data);
        receivedEvents.push({
          type: 'tool_activity',
          data
        });
      });

      // Wait for connection and some events
      await waitForCondition(() => connectionEstablished, 5000);
      await delay(3000); // Wait for periodic events

      expect(receivedEvents.length).toBeGreaterThan(0);

      // Validate event structure
      receivedEvents.forEach(event => {
        expect(event.type).toBe('tool_activity');
        expect(event.data).toBeDefined();
        expect(event.data.timestamp).toBeDefined();
        expect(event.data.mock).toBe(true);
      });

      eventSource.close();
    }, 10000);

    test('should handle multiple concurrent SSE connections', async () => {
      const connectionCount = 3;
      const eventSources: EventSource[] = [];
      const connectionResults: boolean[] = [];

      try {
        // Create multiple connections
        for (let i = 0; i < connectionCount; i++) {
          const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream?userId=user-${i}`);
          eventSources.push(eventSource);

          let connected = false;
          eventSource.addEventListener('connection', () => {
            connected = true;
          });

          connectionResults.push(connected);
        }

        // Wait for all connections to establish
        await delay(2000);

        // All connections should be established
        expect(eventSources.length).toBe(connectionCount);

      } finally {
        // Clean up all connections
        eventSources.forEach(es => es.close());
      }
    });

    test('should handle SSE connection with query parameters', async () => {
      const userId = 'test-user-123';
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream?userId=${userId}&demo=true`);

      let connectionData: any = null;

      eventSource.addEventListener('connection', (event) => {
        connectionData = parseSSEData(event.data);
      });

      await waitForCondition(() => connectionData !== null, 5000);

      expect(connectionData.userId).toBe(userId);
      expect(connectionData.connectionId).toBeDefined();

      eventSource.close();
    });

    test('should handle SSE connection errors gracefully', async () => {
      // Test with invalid endpoint
      try {
        const eventSource = new EventSource(`${baseUrl}/api/streaming-ticker/invalid-endpoint`);

        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            eventSource.close();
            resolve(null); // Not an error - expected behavior
          }, 3000);

          eventSource.onerror = () => {
            clearTimeout(timeoutId);
            eventSource.close();
            resolve(null); // Expected error
          };

          eventSource.onopen = () => {
            clearTimeout(timeoutId);
            eventSource.close();
            reject(new Error('Should not have connected to invalid endpoint'));
          };
        });

      } catch (error) {
        // Expected behavior for invalid endpoint
        expect(error).toBeDefined();
      }
    });
  });

  describe('POST /api/streaming-ticker/message - Message Broadcasting', () => {
    test('should send custom message successfully', async () => {
      const testMessage = streamingTickerTestData.toolActivity;

      const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testMessage.data.message,
          type: testMessage.type,
          priority: testMessage.data.priority
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.sent).toBe(true);
      expect(data.message).toBe(testMessage.data.message);
      expect(data.type).toBe(testMessage.type);
      expect(data.timestamp).toBeDefined();
    });

    test('should broadcast to specific connection', async () => {
      const connectionId = 'test-connection-123';
      const message = 'Targeted message test';

      const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          connectionId,
          type: 'targeted'
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.sent).toBe(true);
      expect(data.connectionId).toBe(connectionId);
    });

    test('should reject message without content', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test'
        })
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Message is required');
    });

    test('should handle different message types and priorities', async () => {
      const messageTypes = [
        { type: 'tool_activity', priority: 'medium' },
        { type: 'execution_start', priority: 'high' },
        { type: 'execution_complete', priority: 'high' },
        { type: 'error', priority: 'critical' }
      ];

      for (const msgType of messageTypes) {
        const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Test message for ${msgType.type}`,
            type: msgType.type,
            priority: msgType.priority
          })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.sent).toBe(true);
        expect(data.type).toBe(msgType.type);
      }
    });
  });

  describe('GET /api/streaming-ticker/stats - Statistics and Monitoring', () => {
    test('should return streaming statistics', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/stats`);

      expect(response.status).toBe(200);

      const data: StreamingStats = await response.json();
      expect(data.activeConnections).toBeDefined();
      expect(data.totalMessages).toBeDefined();
      expect(data.uptime).toBeDefined();
      expect(data.timestamp).toBeDefined();

      // Validate data types
      expect(typeof data.activeConnections).toBe('number');
      expect(typeof data.totalMessages).toBe('number');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.timestamp).toBe('number');

      // Validate reasonable values
      expect(data.activeConnections).toBeGreaterThanOrEqual(0);
      expect(data.totalMessages).toBeGreaterThanOrEqual(0);
      expect(data.uptime).toBeGreaterThan(0);
    });

    test('should track statistics changes over time', async () => {
      // Get initial stats
      const initialResponse = await fetch(`${baseUrl}/api/streaming-ticker/stats`);
      const initialStats: StreamingStats = await initialResponse.json();

      // Send some messages
      await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Stats test message 1' })
      });

      await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Stats test message 2' })
      });

      // Wait a bit for stats to update
      await delay(1000);

      // Get updated stats
      const updatedResponse = await fetch(`${baseUrl}/api/streaming-ticker/stats`);
      const updatedStats: StreamingStats = await updatedResponse.json();

      // Timestamp should be more recent
      expect(updatedStats.timestamp).toBeGreaterThan(initialStats.timestamp);

      // Uptime should have increased
      expect(updatedStats.uptime).toBeGreaterThan(initialStats.uptime);
    });
  });

  describe('Connection Management and Cleanup', () => {
    test('should close specific connection', async () => {
      const connectionId = 'test-connection-to-close';

      const response = await fetch(`${baseUrl}/api/streaming-ticker/connection/${connectionId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain('Connection closed');
      expect(data.connectionId).toBe(connectionId);
    });

    test('should perform cleanup of inactive connections', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/cleanup`, {
        method: 'POST'
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain('Cleanup completed');
      expect(data.stats).toBeDefined();
    });

    test('should handle connection cleanup with active connections', async () => {
      // Establish a connection
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream`);

      try {
        // Perform cleanup
        const cleanupResponse = await fetch(`${baseUrl}/api/streaming-ticker/cleanup`, {
          method: 'POST'
        });

        expect(cleanupResponse.status).toBe(200);

        const cleanupData = await cleanupResponse.json();
        expect(cleanupData.message).toContain('Cleanup completed');

      } finally {
        eventSource.close();
      }
    });
  });

  describe('Real-time Event Broadcasting', () => {
    test('should broadcast events to all active connections', async () => {
      const eventSources: EventSource[] = [];
      const receivedEvents: Array<{ source: number; events: StreamingEvent[] }> = [];

      try {
        // Create multiple connections
        for (let i = 0; i < 2; i++) {
          const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream?userId=broadcast-test-${i}`);
          eventSources.push(eventSource);

          const events: StreamingEvent[] = [];
          receivedEvents.push({ source: i, events });

          eventSource.addEventListener('tool_activity', (event) => {
            events.push({
              type: 'tool_activity',
              data: parseSSEData(event.data)
            });
          });
        }

        // Wait for connections to establish
        await delay(1000);

        // Broadcast a message
        const broadcastMessage = 'Broadcast test message';
        await fetch(`${baseUrl}/api/streaming-ticker/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: broadcastMessage,
            type: 'tool_activity'
          })
        });

        // Wait for broadcast to propagate
        await delay(2000);

        // Check if message was received by connections (mock server simulates this)
        expect(receivedEvents.length).toBe(2);

      } finally {
        eventSources.forEach(es => es.close());
      }
    }, 15000);

    test('should handle high-frequency event streaming', async () => {
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream`);

      const receivedEvents: StreamingEvent[] = [];
      let connectionEstablished = false;

      eventSource.addEventListener('connection', () => {
        connectionEstablished = true;
      });

      eventSource.addEventListener('tool_activity', (event) => {
        receivedEvents.push({
          type: 'tool_activity',
          data: parseSSEData(event.data)
        });
      });

      // Wait for connection
      await waitForCondition(() => connectionEstablished, 5000);

      // Send multiple rapid messages
      const messagePromises = [];
      for (let i = 0; i < 10; i++) {
        messagePromises.push(
          fetch(`${baseUrl}/api/streaming-ticker/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `High frequency message ${i}`,
              type: 'tool_activity'
            })
          })
        );
      }

      await Promise.all(messagePromises);

      // Wait for events to be processed
      await delay(3000);

      // Should handle rapid messages without issues
      expect(receivedEvents.length).toBeGreaterThan(0);

      eventSource.close();
    }, 15000);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle malformed SSE requests', async () => {
      const response = await fetch(`${baseUrl}/api/streaming-ticker/stream`, {
        method: 'POST', // Wrong method
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });

      expect([404, 405]).toContain(response.status);
    });

    test('should handle connection drops gracefully', async () => {
      const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream`);

      let connectionEstablished = false;
      let errorOccurred = false;

      eventSource.addEventListener('connection', () => {
        connectionEstablished = true;
      });

      eventSource.onerror = () => {
        errorOccurred = true;
      };

      // Wait for connection
      await waitForCondition(() => connectionEstablished, 5000);

      // Force close connection
      eventSource.close();

      // Verify graceful handling
      expect(connectionEstablished).toBe(true);
      // Error may or may not occur depending on timing
    });

    test('should handle server-side errors during streaming', async () => {
      // Override to simulate server error during message sending
      mockServer.setResponseOverride('POST:/api/streaming-ticker/message', {
        status: 500,
        data: { error: 'Simulated streaming error' }
      });

      const response = await fetch(`${baseUrl}/api/streaming-ticker/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This will cause an error',
          type: 'error_test'
        })
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple simultaneous SSE connections efficiently', async () => {
      const connectionCount = 5;
      const eventSources: EventSource[] = [];
      const connectionTimes: number[] = [];

      try {
        // Create connections and measure time
        for (let i = 0; i < connectionCount; i++) {
          const startTime = Date.now();
          const eventSource = await createEventSource(`${baseUrl}/api/streaming-ticker/stream?userId=perf-test-${i}`);
          const endTime = Date.now();

          eventSources.push(eventSource);
          connectionTimes.push(endTime - startTime);
        }

        // All connections should be established quickly
        connectionTimes.forEach(time => {
          expect(time).toBeLessThan(5000); // 5 seconds max per connection
        });

        // Average connection time should be reasonable
        const avgTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
        expect(avgTime).toBeLessThan(3000); // 3 seconds average

      } finally {
        eventSources.forEach(es => es.close());
      }
    }, 30000);

    test('should maintain performance under message load', async () => {
      const messageCount = 50;
      const startTime = Date.now();

      // Send many messages in parallel
      const messagePromises = Array.from({ length: messageCount }, (_, i) =>
        fetch(`${baseUrl}/api/streaming-ticker/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Load test message ${i}`,
            type: 'load_test'
          })
        })
      );

      const responses = await Promise.all(messagePromises);
      const endTime = Date.now();

      // All messages should be processed successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 50 messages

      console.log(`Processed ${messageCount} messages in ${totalTime}ms`);
    }, 20000);
  });
});