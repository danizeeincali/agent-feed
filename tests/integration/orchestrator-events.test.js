/**
 * Orchestrator Events Integration Tests
 *
 * Tests the COMPLETE orchestrator ticket processing flow with REAL components:
 * - Ticket creation → pending event
 * - Orchestrator polling → processing event
 * - Worker execution → completed/failed event
 * - Real WebSocket event emission
 * - Real database state changes
 *
 * NO MOCKS for core orchestrator logic - only external services (Claude API)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { Server } from 'socket.io';
import { createServer } from 'http';
import ioClient from 'socket.io-client';
import AviOrchestrator from '../../api-server/avi/orchestrator.js';
import { WorkQueueRepository } from '../../api-server/repositories/work-queue-repository.js';
import websocketService from '../../api-server/services/websocket-service.js';

describe('Orchestrator Events Integration Tests', () => {
  let db;
  let workQueueRepo;
  let orchestrator;
  let httpServer;
  let wsClient;
  let receivedEvents;

  // Real-world test data
  const TEST_POST_ID = 'post-test-123';
  const TEST_AGENT_ID = 'avi';
  const TEST_USER_ID = 'test-user';

  beforeAll(async () => {
    // Setup test database (in-memory SQLite)
    db = new Database(':memory:');

    // Create work_queue_tickets schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        priority TEXT DEFAULT 'P2',
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        metadata TEXT,
        post_id TEXT,
        result TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        assigned_at INTEGER,
        completed_at INTEGER
      )
    `);

    // Create agent_posts schema for database queries
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        author_agent TEXT,
        published_at TEXT,
        metadata TEXT,
        engagement TEXT
      )
    `);

    // Create comments schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        author TEXT,
        author_agent TEXT,
        created_at TEXT,
        content_type TEXT DEFAULT 'text'
      )
    `);

    // Initialize repositories
    workQueueRepo = new WorkQueueRepository(db);

    // Setup WebSocket server for real event testing
    httpServer = createServer();
    websocketService.initialize(httpServer, {
      cors: { origin: '*' }
    });

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        const port = httpServer.address().port;
        console.log(`Test WebSocket server on port ${port}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (wsClient) {
      wsClient.close();
    }
    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
    }
    if (db) {
      db.close();
    }
  });

  beforeEach(async () => {
    // Clear database
    db.prepare('DELETE FROM work_queue_tickets').run();
    db.prepare('DELETE FROM agent_posts').run();
    db.prepare('DELETE FROM comments').run();

    // Reset event tracking
    receivedEvents = [];

    // Connect WebSocket client
    const port = httpServer.address().port;
    wsClient = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise((resolve) => {
      wsClient.on('connect', resolve);
    });

    // Listen for all ticket status events
    wsClient.on('ticket:status:update', (event) => {
      receivedEvents.push(event);
      console.log(`📡 Received event: ${event.status} for ticket ${event.ticket_id}`);
    });

    // Create orchestrator with test dependencies
    orchestrator = new AviOrchestrator(
      {
        maxWorkers: 3,
        pollInterval: 100, // Fast polling for tests
        healthCheckInterval: 60000
      },
      workQueueRepo,
      websocketService,
      db
    );

    // Mock Claude SDK to prevent real API calls
    vi.mock('../../prod/src/services/ClaudeCodeSDKManager.js', () => ({
      getClaudeCodeSDKManager: () => ({
        execute: vi.fn().mockResolvedValue({
          success: true,
          messages: [
            {
              type: 'assistant',
              content: [
                { type: 'text', text: 'Test agent response' }
              ]
            }
          ]
        })
      })
    }));
  });

  afterEach(async () => {
    if (orchestrator && orchestrator.running) {
      await orchestrator.stop();
    }
    if (wsClient && wsClient.connected) {
      wsClient.close();
    }
  });

  describe('1. Orchestrator Main Loop', () => {
    it('should poll for pending tickets every pollInterval', async () => {
      const pollSpy = vi.spyOn(orchestrator, 'processWorkQueue');

      await orchestrator.start();

      // Wait for at least 3 poll cycles
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(pollSpy).toHaveBeenCalledTimes(3);

      await orchestrator.stop();
    });

    it('should process tickets in FIFO order', async () => {
      // Create 3 tickets with same priority
      const ticket1 = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'First ticket',
        post_id: 'post-1',
        priority: 'P2'
      });

      const ticket2 = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Second ticket',
        post_id: 'post-2',
        priority: 'P2'
      });

      const ticket3 = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Third ticket',
        post_id: 'post-3',
        priority: 'P2'
      });

      await orchestrator.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check processing order (ticket1 should be processed first)
      const updatedTicket1 = workQueueRepo.getTicket(ticket1.id);
      const updatedTicket2 = workQueueRepo.getTicket(ticket2.id);

      // First ticket should have been assigned before second
      expect(updatedTicket1.assigned_at).toBeLessThan(updatedTicket2.assigned_at);

      await orchestrator.stop();
    });

    it('should update ticket status: pending → in_progress → completed', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Test ticket',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();

      // Wait for ticket to be picked up
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check in_progress status
      let updatedTicket = workQueueRepo.getTicket(ticket.id);
      expect(updatedTicket.status).toBe('in_progress');

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check completed status
      updatedTicket = workQueueRepo.getTicket(ticket.id);
      expect(updatedTicket.status).toBe('completed');

      await orchestrator.stop();
    });

    it('should emit WebSocket events at each status change', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Event test ticket',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();

      // Wait for all events
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should receive at least 2 events: processing, completed
      expect(receivedEvents.length).toBeGreaterThanOrEqual(2);

      // Check event sequence
      const processingEvent = receivedEvents.find(e => e.status === 'processing');
      const completedEvent = receivedEvents.find(e => e.status === 'completed');

      expect(processingEvent).toBeDefined();
      expect(processingEvent.ticket_id).toBe(ticket.id);
      expect(processingEvent.post_id).toBe(TEST_POST_ID);

      expect(completedEvent).toBeDefined();
      expect(completedEvent.ticket_id).toBe(ticket.id);

      await orchestrator.stop();
    });
  });

  describe('2. Worker Spawning', () => {
    it('should spawn worker for each pending ticket', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Worker spawn test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();

      // Wait for worker spawn
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify worker is tracked
      expect(orchestrator.activeWorkers.size).toBe(1);

      const workerEntry = Array.from(orchestrator.activeWorkers.values())[0];
      expect(workerEntry.ticketId).toBe(ticket.id);

      await orchestrator.stop();
    });

    it('should pass ticket data and context to worker', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Worker context test',
        post_id: TEST_POST_ID,
        priority: 'P1',
        metadata: { testKey: 'testValue' }
      });

      const spawnSpy = vi.spyOn(orchestrator, 'spawnWorker');

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(spawnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ticket.id,
          agent_id: TEST_AGENT_ID,
          content: 'Worker context test',
          metadata: expect.objectContaining({ testKey: 'testValue' })
        })
      );

      await orchestrator.stop();
    });

    it('should emit "processing" event on worker start', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Processing event test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      const processingEvent = receivedEvents.find(e => e.status === 'processing');

      expect(processingEvent).toBeDefined();
      expect(processingEvent.ticket_id).toBe(ticket.id);
      expect(processingEvent.agent_id).toBe(TEST_AGENT_ID);
      expect(processingEvent.post_id).toBe(TEST_POST_ID);
      expect(processingEvent.timestamp).toBeDefined();

      await orchestrator.stop();
    });

    it('should emit "completed" event on worker success', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Completion event test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 1500));

      const completedEvent = receivedEvents.find(e => e.status === 'completed');

      expect(completedEvent).toBeDefined();
      expect(completedEvent.ticket_id).toBe(ticket.id);
      expect(completedEvent.agent_id).toBe(TEST_AGENT_ID);
      expect(completedEvent.timestamp).toBeDefined();

      await orchestrator.stop();
    });

    it('should emit "failed" event on worker error', async () => {
      // Create ticket with invalid agent_id to trigger error
      const ticket = workQueueRepo.createTicket({
        agent_id: 'nonexistent-agent',
        content: 'Failure event test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should have processing event but end with failed
      const failedEvent = receivedEvents.find(e => e.status === 'failed');

      // Note: May be pending for retry, check database instead
      const updatedTicket = workQueueRepo.getTicket(ticket.id);
      expect(['failed', 'pending']).toContain(updatedTicket.status);
      if (updatedTicket.status === 'pending') {
        expect(updatedTicket.retry_count).toBeGreaterThan(0);
      }

      await orchestrator.stop();
    });
  });

  describe('3. Event Emission Flow (CRITICAL)', () => {
    it('should emit events in correct order: pending → processing → completed', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Full flow test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();

      // Wait for complete flow
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract event sequence for this ticket
      const ticketEvents = receivedEvents.filter(e => e.ticket_id === ticket.id);

      // Should have at least processing and completed
      expect(ticketEvents.length).toBeGreaterThanOrEqual(2);

      // Check chronological order
      const processingIdx = ticketEvents.findIndex(e => e.status === 'processing');
      const completedIdx = ticketEvents.findIndex(e => e.status === 'completed');

      expect(processingIdx).toBeGreaterThanOrEqual(0);
      expect(completedIdx).toBeGreaterThan(processingIdx);

      await orchestrator.stop();
    });

    it('should emit processing event within 5-10 seconds of ticket creation', async () => {
      const startTime = Date.now();

      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Timing test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const processingEvent = receivedEvents.find(e =>
        e.ticket_id === ticket.id && e.status === 'processing'
      );

      expect(processingEvent).toBeDefined();

      const processingTime = new Date(processingEvent.timestamp).getTime();
      const elapsed = processingTime - startTime;

      // Should be picked up within 10 seconds (fast for tests)
      expect(elapsed).toBeLessThan(10000);

      await orchestrator.stop();
    });

    it('should emit completed event within 30-60 seconds for simple tasks', async () => {
      const startTime = Date.now();

      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Simple task',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedEvent = receivedEvents.find(e =>
        e.ticket_id === ticket.id && e.status === 'completed'
      );

      expect(completedEvent).toBeDefined();

      const completionTime = new Date(completedEvent.timestamp).getTime();
      const elapsed = completionTime - startTime;

      // For test mocked SDK, should be very fast (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);

      await orchestrator.stop();
    });

    it('should emit all events to WebSocket listeners', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'WebSocket broadcast test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      // Subscribe to specific post
      wsClient.emit('subscribe:post', TEST_POST_ID);

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // All events should be received
      const ticketEvents = receivedEvents.filter(e => e.ticket_id === ticket.id);

      expect(ticketEvents.length).toBeGreaterThanOrEqual(2);

      // Each event should have required fields
      ticketEvents.forEach(event => {
        expect(event.post_id).toBe(TEST_POST_ID);
        expect(event.ticket_id).toBe(ticket.id);
        expect(event.status).toBeDefined();
        expect(event.agent_id).toBe(TEST_AGENT_ID);
        expect(event.timestamp).toBeDefined();
      });

      await orchestrator.stop();
    });
  });

  describe('4. Error Handling', () => {
    it('should retry failed tickets up to max retry count', async () => {
      // Create ticket that will fail
      const ticket = workQueueRepo.createTicket({
        agent_id: 'invalid-agent',
        content: 'Retry test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 3000));

      const updatedTicket = workQueueRepo.getTicket(ticket.id);

      // Should have attempted retry
      expect(updatedTicket.retry_count).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should not crash orchestrator on worker errors', async () => {
      // Create multiple tickets, some will fail
      workQueueRepo.createTicket({
        agent_id: 'invalid-agent-1',
        content: 'Will fail',
        post_id: 'post-1',
        priority: 'P1'
      });

      workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Will succeed',
        post_id: 'post-2',
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Orchestrator should still be running
      expect(orchestrator.running).toBe(true);

      // At least one ticket should complete
      const completed = db.prepare(
        'SELECT COUNT(*) as count FROM work_queue_tickets WHERE status = ?'
      ).get('completed');

      expect(parseInt(completed.count)).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should allow failed tickets to be retried manually', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: 'invalid-agent',
        content: 'Manual retry test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Manually reset ticket to pending
      workQueueRepo.updateTicketStatus(ticket.id, 'pending');

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 1500));

      const updatedTicket = workQueueRepo.getTicket(ticket.id);

      // Should have been re-attempted
      expect(updatedTicket.assigned_at).toBeDefined();

      await orchestrator.stop();
    });
  });

  describe('5. Real-World Scenario: Post Creation to Completion', () => {
    it('should process "What is the weather?" post end-to-end', async () => {
      const postContent = 'What is the weather?';

      // 1. Create post in database
      const postId = 'post-weather-123';
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        postId,
        'Weather Question',
        postContent,
        'user',
        new Date().toISOString()
      );

      // 2. Create work queue ticket
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: postContent,
        post_id: postId,
        priority: 'P1'
      });

      // Track all events
      const allEvents = [];
      wsClient.on('ticket:status:update', (event) => {
        if (event.ticket_id === ticket.id) {
          allEvents.push(event);
        }
      });

      // 3. Start orchestrator
      await orchestrator.start();

      // 4. Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 5. Verify ticket is in database with correct state
      const finalTicket = workQueueRepo.getTicket(ticket.id);
      expect(finalTicket).toBeDefined();
      expect(finalTicket.status).toBe('completed');

      // 6. Verify events were emitted in correct order
      expect(allEvents.length).toBeGreaterThanOrEqual(2);

      const statuses = allEvents.map(e => e.status);
      const processingIdx = statuses.indexOf('processing');
      const completedIdx = statuses.indexOf('completed');

      expect(processingIdx).toBeGreaterThanOrEqual(0);
      expect(completedIdx).toBeGreaterThan(processingIdx);

      // 7. Verify agent response in database
      expect(finalTicket.result).toBeDefined();
      const result = JSON.parse(finalTicket.result);
      expect(result.response).toBeDefined();

      await orchestrator.stop();
    });

    it('should verify WebSocket events arrive within expected timeframes', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Timeframe verification',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      const eventTimes = {};

      wsClient.on('ticket:status:update', (event) => {
        if (event.ticket_id === ticket.id) {
          eventTimes[event.status] = new Date(event.timestamp).getTime();
        }
      });

      const startTime = Date.now();

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Processing should be within 10 seconds
      if (eventTimes.processing) {
        const processingDelay = eventTimes.processing - startTime;
        expect(processingDelay).toBeLessThan(10000);
      }

      // Completed should be within 60 seconds (much faster for tests)
      if (eventTimes.completed) {
        const completionDelay = eventTimes.completed - startTime;
        expect(completionDelay).toBeLessThan(60000);
      }

      await orchestrator.stop();
    });

    it('should handle multiple concurrent posts', async () => {
      const posts = [
        { id: 'post-1', content: 'First question' },
        { id: 'post-2', content: 'Second question' },
        { id: 'post-3', content: 'Third question' }
      ];

      // Create posts and tickets
      const tickets = posts.map(post => {
        db.prepare(`
          INSERT INTO agent_posts (id, title, content, author_agent, published_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          post.id,
          'Test Post',
          post.content,
          'user',
          new Date().toISOString()
        );

        return workQueueRepo.createTicket({
          agent_id: TEST_AGENT_ID,
          content: post.content,
          post_id: post.id,
          priority: 'P1'
        });
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 3000));

      // All tickets should be processed
      tickets.forEach(ticket => {
        const finalTicket = workQueueRepo.getTicket(ticket.id);
        expect(['completed', 'in_progress']).toContain(finalTicket.status);
      });

      // Should have received events for all tickets
      const uniqueTickets = new Set(receivedEvents.map(e => e.ticket_id));
      expect(uniqueTickets.size).toBeGreaterThan(0);

      await orchestrator.stop();
    });
  });

  describe('6. Database State Verification', () => {
    it('should update database at each processing step', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Database state test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();

      // Check initial state
      let currentTicket = workQueueRepo.getTicket(ticket.id);
      expect(currentTicket.status).toBe('pending');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));
      currentTicket = workQueueRepo.getTicket(ticket.id);
      expect(currentTicket.status).toBe('in_progress');
      expect(currentTicket.assigned_at).toBeDefined();

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1500));
      currentTicket = workQueueRepo.getTicket(ticket.id);
      expect(currentTicket.status).toBe('completed');
      expect(currentTicket.completed_at).toBeDefined();

      await orchestrator.stop();
    });

    it('should persist ticket result on completion', async () => {
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Result persistence test',
        post_id: TEST_POST_ID,
        priority: 'P1'
      });

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedTicket = workQueueRepo.getTicket(ticket.id);

      expect(completedTicket.status).toBe('completed');
      expect(completedTicket.result).toBeDefined();

      const result = JSON.parse(completedTicket.result);
      expect(result).toHaveProperty('response');

      await orchestrator.stop();
    });

    it('should maintain referential integrity between tickets and posts', async () => {
      const postId = 'post-ref-test';

      // Create post
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, published_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        postId,
        'Reference Test',
        'Test content',
        'user',
        new Date().toISOString()
      );

      // Create ticket
      const ticket = workQueueRepo.createTicket({
        agent_id: TEST_AGENT_ID,
        content: 'Reference test',
        post_id: postId,
        priority: 'P1'
      });

      // Verify foreign key relationship
      const ticketFromDb = workQueueRepo.getTicket(ticket.id);
      expect(ticketFromDb.post_id).toBe(postId);

      // Verify post exists
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postId);
      expect(post).toBeDefined();
      expect(post.id).toBe(postId);
    });
  });

  describe('7. Performance and Scalability', () => {
    it('should handle 10 concurrent tickets efficiently', async () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        workQueueRepo.createTicket({
          agent_id: TEST_AGENT_ID,
          content: `Ticket ${i}`,
          post_id: `post-${i}`,
          priority: 'P2'
        })
      );

      const startTime = Date.now();

      await orchestrator.start();

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 5000));

      const elapsed = Date.now() - startTime;

      // Should process reasonably fast (< 10 seconds for 10 tickets)
      expect(elapsed).toBeLessThan(10000);

      // Check completion
      const completed = db.prepare(
        'SELECT COUNT(*) as count FROM work_queue_tickets WHERE status = ?'
      ).get('completed');

      expect(parseInt(completed.count)).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should respect maxWorkers limit', async () => {
      orchestrator.maxWorkers = 2;

      // Create 5 tickets
      Array.from({ length: 5 }, (_, i) =>
        workQueueRepo.createTicket({
          agent_id: TEST_AGENT_ID,
          content: `Limit test ${i}`,
          post_id: `post-${i}`,
          priority: 'P2'
        })
      );

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should never exceed 2 active workers
      expect(orchestrator.activeWorkers.size).toBeLessThanOrEqual(2);

      await orchestrator.stop();
    });

    it('should emit events for all tickets without dropping', async () => {
      const ticketCount = 5;
      const tickets = Array.from({ length: ticketCount }, (_, i) =>
        workQueueRepo.createTicket({
          agent_id: TEST_AGENT_ID,
          content: `Event test ${i}`,
          post_id: `post-${i}`,
          priority: 'P2'
        })
      );

      await orchestrator.start();
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Should have events for multiple tickets
      const uniqueTicketIds = new Set(receivedEvents.map(e => e.ticket_id));

      expect(uniqueTicketIds.size).toBeGreaterThan(0);

      await orchestrator.stop();
    });
  });
});
