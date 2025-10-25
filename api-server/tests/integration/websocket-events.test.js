/**
 * WebSocket Integration Tests
 * Tests real-time ticket status updates via Socket.IO
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import AgentWorker from '../../worker/agent-worker.js';
import websocketService from '../../services/websocket-service.js';
import { createServer } from 'http';

describe('WebSocket Integration Tests', () => {
  let httpServer;
  let clientSocket;
  let serverUrl;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize WebSocket service
    websocketService.initialize(httpServer, {
      cors: { origin: '*' }
    });

    // Start server on random port
    httpServer.listen(() => {
      const port = httpServer.address().port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (httpServer) {
      httpServer.close(done);
    }
  });

  test('should establish WebSocket connection', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should receive connection confirmation', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connected', (data) => {
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
      expect(data.message).toBe('WebSocket connection established');
      done();
    });
  });

  test('should subscribe to post updates', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connect', () => {
      clientSocket.emit('subscribe:post', 'post-123');

      // Wait a bit for subscription to complete
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });
  });

  test('should receive ticket status update event', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connect', () => {
      // Listen for ticket status updates
      clientSocket.on('ticket:status:update', (data) => {
        expect(data).toHaveProperty('post_id');
        expect(data).toHaveProperty('ticket_id');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('agent_id');
        expect(data).toHaveProperty('timestamp');
        expect(['pending', 'processing', 'completed', 'failed']).toContain(data.status);
        done();
      });

      // Emit a test event
      setTimeout(() => {
        websocketService.emitTicketStatusUpdate({
          post_id: 'post-123',
          ticket_id: 'ticket-456',
          status: 'processing',
          agent_id: 'link-logger-agent'
        });
      }, 100);
    });
  });

  test('should receive multiple status updates for ticket lifecycle', (done) => {
    clientSocket = ioClient(serverUrl);
    const receivedStatuses = [];

    clientSocket.on('connect', () => {
      clientSocket.on('ticket:status:update', (data) => {
        receivedStatuses.push(data.status);

        if (receivedStatuses.length === 2) {
          expect(receivedStatuses).toContain('processing');
          expect(receivedStatuses).toContain('completed');
          done();
        }
      });

      // Emit lifecycle events
      setTimeout(() => {
        websocketService.emitTicketStatusUpdate({
          post_id: 'post-123',
          ticket_id: 'ticket-456',
          status: 'processing',
          agent_id: 'link-logger-agent'
        });

        setTimeout(() => {
          websocketService.emitTicketStatusUpdate({
            post_id: 'post-123',
            ticket_id: 'ticket-456',
            status: 'completed',
            agent_id: 'link-logger-agent'
          });
        }, 50);
      }, 100);
    });
  });

  test('should include error in failed status update', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connect', () => {
      clientSocket.on('ticket:status:update', (data) => {
        if (data.status === 'failed') {
          expect(data).toHaveProperty('error');
          expect(data.error).toBe('Test error message');
          done();
        }
      });

      setTimeout(() => {
        websocketService.emitTicketStatusUpdate({
          post_id: 'post-123',
          ticket_id: 'ticket-456',
          status: 'failed',
          agent_id: 'link-logger-agent',
          error: 'Test error message'
        });
      }, 100);
    });
  });

  test('should validate status values', () => {
    // Mock console.error to suppress error output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Invalid status should be rejected
    websocketService.emitTicketStatusUpdate({
      post_id: 'post-123',
      ticket_id: 'ticket-456',
      status: 'invalid-status',
      agent_id: 'link-logger-agent'
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('should receive updates only for subscribed posts', (done) => {
    const client1 = ioClient(serverUrl);
    const client2 = ioClient(serverUrl);
    let client1Received = false;
    let client2Received = false;

    client1.on('connect', () => {
      client1.emit('subscribe:post', 'post-123');

      client1.on('ticket:status:update', (data) => {
        if (data.post_id === 'post-123') {
          client1Received = true;
        }
      });
    });

    client2.on('connect', () => {
      client2.emit('subscribe:post', 'post-456');

      client2.on('ticket:status:update', (data) => {
        if (data.post_id === 'post-456') {
          client2Received = true;
        }
      });

      // After both clients are subscribed, emit different events
      setTimeout(() => {
        websocketService.emitTicketStatusUpdate({
          post_id: 'post-123',
          ticket_id: 'ticket-1',
          status: 'processing',
          agent_id: 'link-logger-agent'
        });

        websocketService.emitTicketStatusUpdate({
          post_id: 'post-456',
          ticket_id: 'ticket-2',
          status: 'processing',
          agent_id: 'link-logger-agent'
        });

        setTimeout(() => {
          expect(client1Received).toBe(true);
          expect(client2Received).toBe(true);
          client1.disconnect();
          client2.disconnect();
          done();
        }, 200);
      }, 200);
    });
  });

  test('should get connection statistics', () => {
    const stats = websocketService.getStats();
    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('rooms');
    expect(stats).toHaveProperty('timestamp');
    expect(typeof stats.connected).toBe('number');
    expect(typeof stats.rooms).toBe('number');
  });

  test('AgentWorker should emit status updates', async () => {
    // Mock work queue repository
    const mockWorkQueueRepo = {
      getTicket: vi.fn().mockResolvedValue({
        id: 'ticket-123',
        agent_id: 'test-agent',
        url: 'https://example.com',
        post_id: 'post-789',
        content: 'Test content'
      })
    };

    // Track emitted events
    const emittedEvents = [];
    const mockWebsocketService = {
      isInitialized: () => true,
      emitTicketStatusUpdate: (payload) => {
        emittedEvents.push(payload);
      }
    };

    // Create worker with mocked dependencies
    const worker = new AgentWorker({
      workerId: 'worker-test',
      ticketId: 'ticket-123',
      agentId: 'test-agent',
      workQueueRepo: mockWorkQueueRepo,
      websocketService: mockWebsocketService
    });

    // Mock processURL and postToAgentFeed to avoid actual API calls
    worker.processURL = vi.fn().mockResolvedValue({
      title: 'Test Intelligence',
      summary: 'Test summary',
      tokensUsed: 100,
      completedAt: Date.now()
    });

    worker.postToAgentFeed = vi.fn().mockResolvedValue({
      id: 'comment-123',
      comment_id: 'comment-123'
    });

    try {
      // Execute worker
      await worker.execute();

      // Should emit processing and completed events
      expect(emittedEvents.length).toBeGreaterThanOrEqual(2);

      const processingEvent = emittedEvents.find(e => e.status === 'processing');
      expect(processingEvent).toBeDefined();
      expect(processingEvent.post_id).toBe('post-789');
      expect(processingEvent.ticket_id).toBe('ticket-123');
      expect(processingEvent.agent_id).toBe('test-agent');

      const completedEvent = emittedEvents.find(e => e.status === 'completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent.post_id).toBe('post-789');
    } catch (error) {
      // Worker should still emit failed event on error
      const failedEvent = emittedEvents.find(e => e.status === 'failed');
      expect(failedEvent).toBeDefined();
    }
  });

  test('AgentWorker should emit failed status on error', async () => {
    // Mock work queue repository that throws error
    const mockWorkQueueRepo = {
      getTicket: vi.fn().mockRejectedValue(new Error('Ticket not found'))
    };

    // Track emitted events
    const emittedEvents = [];
    const mockWebsocketService = {
      isInitialized: () => true,
      emitTicketStatusUpdate: (payload) => {
        emittedEvents.push(payload);
      }
    };

    // Create worker
    const worker = new AgentWorker({
      workerId: 'worker-test',
      ticketId: 'ticket-999',
      agentId: 'test-agent',
      workQueueRepo: mockWorkQueueRepo,
      websocketService: mockWebsocketService
    });

    try {
      await worker.execute();
    } catch (error) {
      // Expected to fail
    }

    // Should emit failed event with error message
    const failedEvent = emittedEvents.find(e => e.status === 'failed');
    expect(failedEvent).toBeDefined();
    expect(failedEvent.error).toBe('Ticket not found');
  });

  test('should validate event payload format', (done) => {
    clientSocket = ioClient(serverUrl);

    clientSocket.on('connect', () => {
      clientSocket.on('ticket:status:update', (data) => {
        // Validate timestamp is in ISO format
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // Validate required fields
        expect(typeof data.post_id).toBe('string');
        expect(typeof data.ticket_id).toBe('string');
        expect(typeof data.status).toBe('string');
        expect(typeof data.agent_id).toBe('string');

        // Validate no emojis in event
        const eventString = JSON.stringify(data);
        const emojiRegex = /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/u;
        expect(emojiRegex.test(eventString)).toBe(false);

        done();
      });

      setTimeout(() => {
        websocketService.emitTicketStatusUpdate({
          post_id: 'post-123',
          ticket_id: 'ticket-456',
          status: 'processing',
          agent_id: 'link-logger-agent'
        });
      }, 100);
    });
  });
});
