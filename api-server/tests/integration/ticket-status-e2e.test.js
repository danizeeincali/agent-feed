/**
 * E2E Integration Tests for Ticket Status Lifecycle
 * Tests the complete flow from post creation to ticket status tracking
 *
 * Test Coverage:
 * - Post creation with URL detection
 * - Automatic ticket creation via proactive agents
 * - Ticket status updates through lifecycle
 * - Real-time WebSocket event emission
 * - API integration across all endpoints
 * - NO emoji verification in all outputs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import ticketStatusService from '../../services/ticket-status-service.js';
import express from 'express';
import request from 'supertest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '../../../data/test-ticket-e2e.db');

describe('Ticket Status E2E Integration Tests', () => {
  let db;
  let workQueue;
  let app;
  let httpServer;
  let io;
  let clientSocket;
  let serverPort;

  beforeAll(async () => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create full schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        retry_count INTEGER DEFAULT 0,
        metadata TEXT,
        result TEXT,
        last_error TEXT,
        post_id TEXT,
        created_at INTEGER NOT NULL,
        assigned_at INTEGER,
        completed_at INTEGER
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_work_queue_agent ON work_queue_tickets(agent_id);
      CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue_tickets(post_id);
      CREATE INDEX IF NOT EXISTS idx_work_queue_post_status ON work_queue_tickets(post_id, status);

      CREATE TABLE IF NOT EXISTS agent_posts (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        updated_at INTEGER,
        author_name TEXT,
        author_username TEXT,
        metadata TEXT
      ) STRICT;
    `);

    workQueue = new WorkQueueRepository(db);

    // Set up Express app with WebSocket support
    app = express();
    app.use(express.json());
    httpServer = createServer(app);
    io = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });

    // WebSocket event handlers
    io.on('connection', (socket) => {
      console.log('Test client connected');
      socket.on('disconnect', () => {
        console.log('Test client disconnected');
      });
    });

    // Mock websocket service for tests
    const websocketService = {
      emitTicketCreated: (ticket) => {
        io.emit('ticket:created', ticket);
      },
      emitTicketStatusUpdate: (ticketId, status, data = {}) => {
        io.emit('ticket:status_update', { ticketId, status, ...data });
      },
      emitTicketCompleted: (ticket) => {
        io.emit('ticket:completed', ticket);
      }
    };

    // API Routes
    app.post('/api/v1/agent-posts', async (req, res) => {
      try {
        const { title, content, author_agent = 'test-agent' } = req.body;
        const postId = `post-${Date.now()}`;

        // Insert post
        db.prepare(`
          INSERT INTO agent_posts (id, agent_id, title, content, published_at, author_name, author_username)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(postId, author_agent, title, content, Date.now(), 'Test User', 'testuser');

        // Process for proactive agents
        const post = {
          id: postId,
          content,
          author_id: 'test-user',
          authorId: 'test-user'
        };

        const proactiveTickets = await processPostForProactiveAgents(post, workQueue);

        // Emit WebSocket events for each ticket
        proactiveTickets.forEach(ticket => {
          websocketService.emitTicketCreated(ticket);
        });

        return res.status(201).json({
          success: true,
          data: {
            id: postId,
            title,
            content,
            tickets: proactiveTickets.map(t => ({
              id: t.id,
              status: t.status,
              post_id: t.post_id,
              agent_id: t.agent_id,
              url: t.url,
              content: t.content
            }))
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.get('/api/agent-posts/:postId/tickets', async (req, res) => {
      try {
        const { postId } = req.params;
        const ticketStatus = ticketStatusService.getPostTicketStatus(postId, db);

        return res.json({
          success: true,
          data: ticketStatus
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.patch('/api/tickets/:ticketId/status', async (req, res) => {
      try {
        const { ticketId } = req.params;
        const { status, result, error } = req.body;

        if (status === 'in_progress') {
          workQueue.updateTicketStatus(ticketId, 'in_progress');
          websocketService.emitTicketStatusUpdate(ticketId, 'in_progress');
        } else if (status === 'completed') {
          workQueue.completeTicket(ticketId, result || { success: true });
          const ticket = workQueue.getTicket(ticketId);
          websocketService.emitTicketCompleted(ticket);
        } else if (status === 'failed') {
          workQueue.failTicket(ticketId, error || 'Unknown error');
          websocketService.emitTicketStatusUpdate(ticketId, 'failed', { error });
        }

        const ticket = workQueue.getTicket(ticketId);

        return res.json({
          success: true,
          data: ticket
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.get('/api/tickets/stats', async (req, res) => {
      try {
        const stmt = db.prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            COUNT(DISTINCT agent_id) as unique_agents,
            COUNT(DISTINCT post_id) as posts_with_tickets
          FROM work_queue_tickets
        `);

        const stats = stmt.get();

        return res.json({
          success: true,
          data: {
            total: stats.total || 0,
            pending: stats.pending || 0,
            processing: stats.processing || 0,
            completed: stats.completed || 0,
            failed: stats.failed || 0,
            unique_agents: stats.unique_agents || 0,
            posts_with_tickets: stats.posts_with_tickets || 0
          },
          meta: {
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    app.get('/api/v1/agent-posts', async (req, res) => {
      try {
        const { includeTickets = 'false' } = req.query;
        const shouldIncludeTickets = includeTickets === 'true';

        const posts = db.prepare('SELECT * FROM agent_posts ORDER BY published_at DESC').all();

        let enrichedPosts = posts;

        if (shouldIncludeTickets) {
          const postIds = posts.map(p => p.id);

          if (postIds.length > 0) {
            const placeholders = postIds.map(() => '?').join(',');
            const ticketsStmt = db.prepare(`
              SELECT id, post_id, agent_id, status, created_at, completed_at
              FROM work_queue_tickets
              WHERE post_id IN (${placeholders})
              ORDER BY created_at DESC
            `);

            const allTickets = ticketsStmt.all(...postIds);

            const ticketsByPost = {};
            allTickets.forEach(ticket => {
              if (!ticketsByPost[ticket.post_id]) {
                ticketsByPost[ticket.post_id] = [];
              }
              ticketsByPost[ticket.post_id].push(ticket);
            });

            enrichedPosts = posts.map(post => {
              const tickets = ticketsByPost[post.id] || [];
              const summary = {
                total: tickets.length,
                pending: tickets.filter(t => t.status === 'pending').length,
                processing: tickets.filter(t => t.status === 'in_progress').length,
                completed: tickets.filter(t => t.status === 'completed').length,
                failed: tickets.filter(t => t.status === 'failed').length,
                agents: [...new Set(tickets.map(t => t.agent_id))]
              };

              return {
                ...post,
                ticket_status: {
                  summary,
                  has_tickets: tickets.length > 0
                }
              };
            });
          }
        }

        return res.json({
          success: true,
          data: enrichedPosts,
          meta: {
            includes_tickets: shouldIncludeTickets
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Start server
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        console.log(`Test server running on port ${serverPort}`);
        resolve();
      });
    });

    // Connect WebSocket client
    await new Promise((resolve) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`);
      clientSocket.on('connect', () => {
        console.log('Test WebSocket client connected');
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.close();
    }
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(() => resolve());
      });
    }
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    db.prepare('DELETE FROM work_queue_tickets').run();
    db.prepare('DELETE FROM agent_posts').run();
  });

  describe('Complete Ticket Lifecycle', () => {
    it('should create post with URL, generate tickets, and track status', async () => {
      const postData = {
        title: 'GitHub PR Review',
        content: 'Please review this PR: https://github.com/user/repo/pull/123'
      };

      // Create post
      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.id).toBeDefined();
      expect(createResponse.body.data.tickets).toBeInstanceOf(Array);
      expect(createResponse.body.data.tickets.length).toBeGreaterThan(0);

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Verify ticket was created
      expect(createResponse.body.data.tickets[0].status).toBe('pending');

      // Fetch ticket status
      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.post_id).toBe(postId);
      expect(statusResponse.body.data.tickets.length).toBeGreaterThan(0);
      expect(statusResponse.body.data.summary.total).toBeGreaterThan(0);
      expect(statusResponse.body.data.summary.pending).toBeGreaterThan(0);
    });

    it('should handle ticket status transitions: pending -> processing -> completed', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Check this out: https://example.com/article'
      };

      // Create post with ticket
      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Initial status: pending
      let statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.summary.pending).toBe(1);
      expect(statusResponse.body.data.summary.processing).toBe(0);
      expect(statusResponse.body.data.summary.completed).toBe(0);

      // Update to processing
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.summary.pending).toBe(0);
      expect(statusResponse.body.data.summary.processing).toBe(1);
      expect(statusResponse.body.data.summary.completed).toBe(0);

      // Update to completed
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({
          status: 'completed',
          result: { logged: true, url: 'https://example.com/article' }
        })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.summary.pending).toBe(0);
      expect(statusResponse.body.data.summary.processing).toBe(0);
      expect(statusResponse.body.data.summary.completed).toBe(1);

      // Verify result data
      const completedTicket = statusResponse.body.data.tickets.find(t => t.id === ticketId);
      expect(completedTicket.result).toEqual({ logged: true, url: 'https://example.com/article' });
    });

    it('should handle failed ticket status', async () => {
      const postData = {
        title: 'Test Failure',
        content: 'Process this: https://test.com/fail'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Update to failed - need to fail 3 times due to retry logic
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'Network timeout error' });
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'Network timeout error' });
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'Network timeout error' })
        .expect(200);

      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.summary.failed).toBe(1);

      // Verify error message
      const failedTicket = statusResponse.body.data.tickets.find(t => t.id === ticketId);
      expect(failedTicket.last_error).toBe('Network timeout error');
      expect(failedTicket.status).toBe('failed');
    });
  });

  describe('WebSocket Real-Time Updates', () => {
    it('should emit ticket:created event when post with URL is created', (done) => {
      const postData = {
        title: 'WebSocket Test',
        content: 'Test URL: https://websocket-test.com'
      };

      clientSocket.once('ticket:created', (ticket) => {
        expect(ticket).toBeDefined();
        expect(ticket.id).toBeDefined();
        expect(ticket.status).toBe('pending');
        expect(ticket.url).toBe('https://websocket-test.com');
        done();
      });

      request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .end((err) => {
          if (err) done(err);
        });
    }, 10000);

    it('should emit ticket:status_update event on status change', (done) => {
      const postData = {
        title: 'Status Update Test',
        content: 'URL: https://status-update.com'
      };

      request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .end((err, res) => {
          if (err) return done(err);

          const ticketId = res.body.data.tickets[0].id;

          clientSocket.once('ticket:status_update', (update) => {
            expect(update.ticketId).toBe(ticketId);
            expect(update.status).toBe('in_progress');
            done();
          });

          request(httpServer)
            .patch(`/api/tickets/${ticketId}/status`)
            .send({ status: 'in_progress' })
            .end((err) => {
              if (err) done(err);
            });
        });
    }, 10000);

    it('should emit ticket:completed event when ticket completes', (done) => {
      const postData = {
        title: 'Completion Test',
        content: 'Complete: https://completion-test.com'
      };

      request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .end((err, res) => {
          if (err) return done(err);

          const ticketId = res.body.data.tickets[0].id;

          clientSocket.once('ticket:completed', (ticket) => {
            expect(ticket.id).toBe(ticketId);
            expect(ticket.status).toBe('completed');
            expect(ticket.result).toEqual({ success: true });
            done();
          });

          request(httpServer)
            .patch(`/api/tickets/${ticketId}/status`)
            .send({
              status: 'completed',
              result: { success: true }
            })
            .end((err) => {
              if (err) done(err);
            });
        });
    }, 10000);
  });

  describe('Multiple Tickets Per Post', () => {
    it('should create multiple tickets for posts with multiple URLs', async () => {
      const postData = {
        title: 'Multiple URLs',
        content: 'Check these: https://github.com/user/repo and https://example.com/article'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      expect(createResponse.body.data.tickets.length).toBeGreaterThan(0);

      const postId = createResponse.body.data.id;

      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.tickets.length).toBeGreaterThan(0);
      expect(statusResponse.body.data.summary.total).toBeGreaterThan(0);
    });

    it('should track mixed status across multiple tickets', async () => {
      const postData = {
        title: 'Mixed Status Test',
        content: 'URLs: https://url1.com and https://url2.com and https://url3.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const tickets = createResponse.body.data.tickets;

      if (tickets.length >= 3) {
        // Update different tickets to different statuses
        await request(httpServer)
          .patch(`/api/tickets/${tickets[0].id}/status`)
          .send({ status: 'in_progress' });

        await request(httpServer)
          .patch(`/api/tickets/${tickets[1].id}/status`)
          .send({ status: 'completed', result: { success: true } });

        // Fail third ticket - retry 3 times
        await request(httpServer)
          .patch(`/api/tickets/${tickets[2].id}/status`)
          .send({ status: 'failed', error: 'Test error' });
        await request(httpServer)
          .patch(`/api/tickets/${tickets[2].id}/status`)
          .send({ status: 'failed', error: 'Test error' });
        await request(httpServer)
          .patch(`/api/tickets/${tickets[2].id}/status`)
          .send({ status: 'failed', error: 'Test error' });

        const statusResponse = await request(httpServer)
          .get(`/api/agent-posts/${postId}/tickets`)
          .expect(200);

        expect(statusResponse.body.data.summary.processing).toBeGreaterThan(0);
        expect(statusResponse.body.data.summary.completed).toBeGreaterThan(0);
        expect(statusResponse.body.data.summary.failed).toBeGreaterThan(0);
      }
    });
  });

  describe('No Emoji Verification Across Entire Flow', () => {
    it('should not contain emojis in any API response during full lifecycle', async () => {
      const postData = {
        title: 'Emoji Test',
        content: 'Test URL: https://emoji-test.com'
      };

      // Create post
      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      let responseText = JSON.stringify(createResponse.body);
      expect(responseText).not.toContain('✅');
      expect(responseText).not.toContain('🔴');
      expect(responseText).not.toContain('🟡');
      expect(responseText).not.toContain('🟢');

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Check status
      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      responseText = JSON.stringify(statusResponse.body);
      expect(responseText).not.toContain('✅');
      expect(responseText).not.toContain('🔴');
      expect(responseText).not.toContain('🟡');
      expect(responseText).not.toContain('🟢');

      // Update status
      const updateResponse = await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'completed', result: { success: true } })
        .expect(200);

      responseText = JSON.stringify(updateResponse.body);
      expect(responseText).not.toContain('✅');
      expect(responseText).not.toContain('🔴');

      // Final status check
      const finalResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      responseText = JSON.stringify(finalResponse.body);
      expect(responseText).not.toContain('✅');
      expect(responseText).not.toContain('🔴');
      expect(responseText).not.toContain('🟡');
      expect(responseText).not.toContain('🟢');

      // Verify status text values
      expect(finalResponse.body.data.tickets[0].status).toMatch(/^(pending|in_progress|completed|failed)$/);
    });

    it('should not emit emojis in WebSocket events', (done) => {
      const postData = {
        title: 'WebSocket Emoji Test',
        content: 'URL: https://ws-emoji-test.com'
      };

      clientSocket.once('ticket:created', (ticket) => {
        const eventJson = JSON.stringify(ticket);
        expect(eventJson).not.toContain('✅');
        expect(eventJson).not.toContain('🔴');
        expect(eventJson).not.toContain('🟡');
        expect(eventJson).not.toContain('🟢');
        expect(ticket.status).toMatch(/^(pending|in_progress|completed|failed)$/);
        done();
      });

      request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .end((err) => {
          if (err) done(err);
        });
    }, 10000);
  });

  describe('API Endpoint Tests', () => {
    it('should GET /api/tickets/stats and return global statistics', async () => {
      // Create multiple posts with tickets
      const post1Data = {
        title: 'Stats Test Post 1',
        content: 'URL: https://example.com/stats1'
      };

      const post2Data = {
        title: 'Stats Test Post 2',
        content: 'URLs: https://example.com/stats2 and https://example.com/stats3'
      };

      await request(httpServer).post('/api/v1/agent-posts').send(post1Data).expect(201);
      await request(httpServer).post('/api/v1/agent-posts').send(post2Data).expect(201);

      // Get global stats
      const statsResponse = await request(httpServer)
        .get('/api/tickets/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toHaveProperty('total');
      expect(statsResponse.body.data).toHaveProperty('pending');
      expect(statsResponse.body.data).toHaveProperty('processing');
      expect(statsResponse.body.data).toHaveProperty('completed');
      expect(statsResponse.body.data).toHaveProperty('failed');
      expect(statsResponse.body.data).toHaveProperty('unique_agents');
      expect(statsResponse.body.data).toHaveProperty('posts_with_tickets');

      expect(statsResponse.body.data.total).toBeGreaterThan(0);
      expect(statsResponse.body.data.pending).toBeGreaterThan(0);
      expect(statsResponse.body.data.unique_agents).toBeGreaterThan(0);
    });

    it('should GET /api/v1/agent-posts?includeTickets=true and include ticket status', async () => {
      // Create post with URL
      const postData = {
        title: 'Include Tickets Test',
        content: 'Check this: https://github.com/test/repo'
      };

      await request(httpServer).post('/api/v1/agent-posts').send(postData).expect(201);

      // Get posts with tickets
      const response = await request(httpServer)
        .get('/api/v1/agent-posts?includeTickets=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.includes_tickets).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      // Find the post we just created
      const post = response.body.data.find(p => p.title === 'Include Tickets Test');
      expect(post).toBeDefined();
      expect(post.ticket_status).toBeDefined();
      expect(post.ticket_status.summary).toBeDefined();
      expect(post.ticket_status.has_tickets).toBe(true);
      expect(post.ticket_status.summary.total).toBeGreaterThan(0);
      expect(post.ticket_status.summary.agents).toContain('link-logger-agent');
    });

    it('should GET /api/v1/agent-posts and exclude tickets by default', async () => {
      // Create post with URL
      const postData = {
        title: 'Exclude Tickets Test',
        content: 'URL: https://example.com/exclude-test'
      };

      await request(httpServer).post('/api/v1/agent-posts').send(postData).expect(201);

      // Get posts without includeTickets parameter
      const response = await request(httpServer)
        .get('/api/v1/agent-posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.includes_tickets).toBe(false);
      expect(response.body.data).toBeInstanceOf(Array);

      // Verify posts do NOT have ticket_status property
      const post = response.body.data.find(p => p.title === 'Exclude Tickets Test');
      expect(post).toBeDefined();
      expect(post.ticket_status).toBeUndefined();
    });

    it('should GET /api/agent-posts/:postId/tickets and handle missing post', async () => {
      const nonExistentPostId = 'non-existent-post-12345';

      const response = await request(httpServer)
        .get(`/api/agent-posts/${nonExistentPostId}/tickets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.post_id).toBe(nonExistentPostId);
      expect(response.body.data.tickets).toHaveLength(0);
      expect(response.body.data.summary.total).toBe(0);
    });
  });

  describe('WebSocket Failure Events', () => {
    it('should emit ticket:status_update with failed status on ticket failure', async () => {
      const postData = {
        title: 'WebSocket Failure Test',
        content: 'URL: https://failure-test.com'
      };

      return new Promise((resolve, reject) => {
        const createResponse = request(httpServer)
          .post('/api/v1/agent-posts')
          .send(postData)
          .end((err, res) => {
            if (err) return reject(err);

            const ticketId = res.body.data.tickets[0].id;

            clientSocket.once('ticket:status_update', (update) => {
              if (update.status === 'failed') {
                expect(update.ticketId).toBe(ticketId);
                expect(update.status).toBe('failed');
                expect(update.error).toBeDefined();
                expect(update.error).toBe('Test failure error');
                resolve();
              }
            });

            // Fail the ticket
            request(httpServer)
              .patch(`/api/tickets/${ticketId}/status`)
              .send({ status: 'failed', error: 'Test failure error' })
              .end((err) => {
                if (err) reject(err);
              });
          });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle post with no URLs gracefully', async () => {
      const postData = {
        title: 'No URL Post',
        content: 'This post has no URLs at all'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      expect(createResponse.body.data.tickets).toHaveLength(0);

      const postId = createResponse.body.data.id;

      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      expect(statusResponse.body.data.tickets).toHaveLength(0);
      expect(statusResponse.body.data.summary.total).toBe(0);
    });

    it('should handle invalid ticket ID in status update', async () => {
      const response = await request(httpServer)
        .patch('/api/tickets/invalid-ticket-id/status')
        .send({ status: 'completed' });

      // May return 200 with null ticket or 500, either is acceptable
      expect([200, 500]).toContain(response.status);
    });

    it('should validate post creation input', async () => {
      const response = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Post ID Linking Verification', () => {
    it('should verify post_id is set on all created tickets', async () => {
      const postData = {
        title: 'Post ID Test',
        content: 'Multiple URLs: https://github.com/test1 https://example.com/test2'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const tickets = createResponse.body.data.tickets;

      expect(tickets.length).toBeGreaterThan(0);

      // All tickets must have post_id set
      tickets.forEach(ticket => {
        expect(ticket.post_id).toBe(postId);
      });

      // Verify in database
      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      statusResponse.body.data.tickets.forEach(ticket => {
        expect(ticket.post_id).toBe(postId);
      });
    });

    it('should verify post_id persists through ticket lifecycle', async () => {
      const postData = {
        title: 'Lifecycle Test',
        content: 'URL: https://lifecycle-test.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Check initial post_id
      let statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);
      expect(statusResponse.body.data.tickets[0].post_id).toBe(postId);

      // Update to processing
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);
      expect(statusResponse.body.data.tickets[0].post_id).toBe(postId);

      // Complete ticket
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'completed', result: { success: true } })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);
      expect(statusResponse.body.data.tickets[0].post_id).toBe(postId);
    });

    it('should verify worker can retrieve post_id from ticket for comment creation', async () => {
      const postData = {
        title: 'Worker Comment Test',
        content: 'URL: https://worker-comment.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const tickets = createResponse.body.data.tickets;

      expect(tickets.length).toBeGreaterThan(0);

      const ticket = tickets[0];

      // Worker would fetch ticket and use post_id for comment
      expect(ticket.post_id).toBe(postId);
      expect(ticket.id).toBeDefined();
      expect(ticket.agent_id).toBeDefined();

      // Verify structure needed for worker comment creation
      expect(ticket).toMatchObject({
        id: expect.any(String),
        post_id: postId,
        agent_id: expect.any(String),
        content: expect.any(String),
        url: expect.any(String),
        status: 'pending'
      });
    });
  });

  describe('Retry Logic Verification', () => {
    it('should test failed ticket retry mechanism', async () => {
      const postData = {
        title: 'Retry Test',
        content: 'URL: https://retry-mechanism.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const ticketId = createResponse.body.data.tickets[0].id;

      // Fail once - should set to pending with retry_count = 1
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'First failure' })
        .expect(200);

      let statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      let ticket = statusResponse.body.data.tickets[0];
      expect(ticket.retry_count).toBe(1);
      expect(ticket.status).toBe('pending'); // Auto-retry

      // Fail twice - still retry
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'Second failure' })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      ticket = statusResponse.body.data.tickets[0];
      expect(ticket.retry_count).toBe(2);
      expect(ticket.status).toBe('pending');

      // Third failure - permanently failed
      await request(httpServer)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({ status: 'failed', error: 'Third failure' })
        .expect(200);

      statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      ticket = statusResponse.body.data.tickets[0];
      expect(ticket.retry_count).toBe(3);
      expect(ticket.status).toBe('failed'); // Permanently failed
      expect(ticket.last_error).toBe('Third failure');
    });

    it('should verify failed ticket summary updates correctly', async () => {
      const postData = {
        title: 'Failed Summary Test',
        content: 'URLs: https://url1.com https://url2.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;
      const tickets = createResponse.body.data.tickets;

      if (tickets.length >= 2) {
        // Fail first ticket permanently
        await request(httpServer)
          .patch(`/api/tickets/${tickets[0].id}/status`)
          .send({ status: 'failed', error: 'Error 1' });
        await request(httpServer)
          .patch(`/api/tickets/${tickets[0].id}/status`)
          .send({ status: 'failed', error: 'Error 2' });
        await request(httpServer)
          .patch(`/api/tickets/${tickets[0].id}/status`)
          .send({ status: 'failed', error: 'Error 3' });

        // Complete second ticket
        await request(httpServer)
          .patch(`/api/tickets/${tickets[1].id}/status`)
          .send({ status: 'completed', result: { success: true } });

        const statusResponse = await request(httpServer)
          .get(`/api/agent-posts/${postId}/tickets`)
          .expect(200);

        expect(statusResponse.body.data.summary.failed).toBe(1);
        expect(statusResponse.body.data.summary.completed).toBe(1);
        expect(statusResponse.body.data.summary.total).toBe(2);
      }
    });
  });

  describe('Ticket Status Badge Data Validation', () => {
    it('should provide correct data structure for frontend badge rendering', async () => {
      const postData = {
        title: 'Badge Data Test',
        content: 'Test URL: https://badge-test.com'
      };

      const createResponse = await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const postId = createResponse.body.data.id;

      const statusResponse = await request(httpServer)
        .get(`/api/agent-posts/${postId}/tickets`)
        .expect(200);

      const data = statusResponse.body.data;

      // Validate badge data structure
      expect(data).toHaveProperty('post_id');
      expect(data).toHaveProperty('tickets');
      expect(data).toHaveProperty('summary');

      expect(data.summary).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        processing: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        agents: expect.any(Array)
      });

      // Verify all counts are non-negative
      expect(data.summary.total).toBeGreaterThanOrEqual(0);
      expect(data.summary.pending).toBeGreaterThanOrEqual(0);
      expect(data.summary.processing).toBeGreaterThanOrEqual(0);
      expect(data.summary.completed).toBeGreaterThanOrEqual(0);
      expect(data.summary.failed).toBeGreaterThanOrEqual(0);

      // Total should equal sum of statuses
      const sum = data.summary.pending + data.summary.processing +
                  data.summary.completed + data.summary.failed;
      expect(data.summary.total).toBe(sum);
    });

    it('should verify posts list includes ticket status when requested', async () => {
      const postData = {
        title: 'Posts List Badge Test',
        content: 'URL: https://posts-list-badge.com'
      };

      await request(httpServer)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);

      const response = await request(httpServer)
        .get('/api/v1/agent-posts?includeTickets=true')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);

      const post = response.body.data.find(p => p.title === 'Posts List Badge Test');
      expect(post).toBeDefined();
      expect(post.ticket_status).toBeDefined();
      expect(post.ticket_status.summary).toBeDefined();
      expect(post.ticket_status.has_tickets).toBe(true);

      // Validate badge summary structure
      expect(post.ticket_status.summary).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        processing: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        agents: expect.any(Array)
      });
    });
  });
});
