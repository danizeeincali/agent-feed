/**
 * Ticket Status Service Tests
 * Tests the ticket status tracking functionality with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import ticketStatusService from '../../services/ticket-status-service.js';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DB_PATH = join(__dirname, '../../../data/test-ticket-status.db');

describe('Ticket Status Service', () => {
  let db;
  let workQueue;
  let testPostId;
  let testTicketIds;

  beforeAll(() => {
    // Clean up old test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema
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
    `);

    workQueue = new WorkQueueRepository(db);
    testPostId = 'test-post-123';
    testTicketIds = [];
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('getPostTicketStatus', () => {
    it('should return empty status for post with no tickets', () => {
      const result = ticketStatusService.getPostTicketStatus('nonexistent-post', db);

      expect(result).toBeDefined();
      expect(result.post_id).toBe('nonexistent-post');
      expect(result.tickets).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('should throw error for invalid post_id', () => {
      expect(() => {
        ticketStatusService.getPostTicketStatus(null, db);
      }).toThrow('Invalid post_id');

      expect(() => {
        ticketStatusService.getPostTicketStatus('', db);
      }).toThrow('Invalid post_id');
    });

    it('should throw error for missing database', () => {
      expect(() => {
        ticketStatusService.getPostTicketStatus('test-post', null);
      }).toThrow('Database instance is required');
    });

    it('should return tickets for post with multiple tickets', () => {
      // Create tickets with different statuses
      const ticket1 = workQueue.createTicket({
        agent_id: 'link-logger-agent',
        content: 'Log URL https://example.com',
        url: 'https://example.com',
        priority: 'P1',
        post_id: testPostId
      });
      testTicketIds.push(ticket1.id);

      const ticket2 = workQueue.createTicket({
        agent_id: 'follow-up-agent',
        content: 'Follow up on task',
        priority: 'P2',
        post_id: testPostId
      });
      testTicketIds.push(ticket2.id);

      // Update statuses
      workQueue.updateTicketStatus(ticket1.id, 'in_progress');
      workQueue.completeTicket(ticket2.id, { success: true });

      const result = ticketStatusService.getPostTicketStatus(testPostId, db);

      expect(result.post_id).toBe(testPostId);
      expect(result.tickets).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.processing).toBe(1);
      expect(result.summary.completed).toBe(1);
      expect(result.summary.agents).toContain('link-logger-agent');
      expect(result.summary.agents).toContain('follow-up-agent');
    });

    it('should deserialize JSON fields correctly', () => {
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Test with metadata',
        priority: 'P3',
        post_id: 'json-test-post',
        metadata: { extra: 'data', count: 42 }
      });

      workQueue.completeTicket(ticket.id, { processed: true, items: [1, 2, 3] });

      const result = ticketStatusService.getPostTicketStatus('json-test-post', db);

      expect(result.tickets[0].metadata).toEqual({ extra: 'data', count: 42 });
      expect(result.tickets[0].result).toEqual({ processed: true, items: [1, 2, 3] });
    });
  });

  describe('getTicketStatusSummary', () => {
    it('should return zero summary for empty array', () => {
      const summary = ticketStatusService.getTicketStatusSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.processing).toBe(0);
      expect(summary.completed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.agents).toHaveLength(0);
    });

    it('should aggregate ticket statuses correctly', () => {
      const tickets = [
        { status: 'pending', agent_id: 'agent-1' },
        { status: 'in_progress', agent_id: 'agent-2' },
        { status: 'in_progress', agent_id: 'agent-2' },
        { status: 'completed', agent_id: 'agent-3' },
        { status: 'failed', agent_id: 'agent-1' }
      ];

      const summary = ticketStatusService.getTicketStatusSummary(tickets);

      expect(summary.total).toBe(5);
      expect(summary.pending).toBe(1);
      expect(summary.processing).toBe(2);
      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.agents).toHaveLength(3);
      expect(summary.agents).toContain('agent-1');
      expect(summary.agents).toContain('agent-2');
      expect(summary.agents).toContain('agent-3');
    });

    it('should throw error for non-array input', () => {
      expect(() => {
        ticketStatusService.getTicketStatusSummary(null);
      }).toThrow('Invalid tickets: must be an array');

      expect(() => {
        ticketStatusService.getTicketStatusSummary('not-array');
      }).toThrow('Invalid tickets: must be an array');
    });
  });

  describe('getGlobalTicketStats', () => {
    it('should return global statistics', () => {
      const stats = ticketStatusService.getGlobalTicketStats(db);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.processing).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.failed).toBeGreaterThanOrEqual(0);
      expect(stats.unique_agents).toBeGreaterThan(0);
      expect(stats.posts_with_tickets).toBeGreaterThan(0);
    });

    it('should throw error for missing database', () => {
      expect(() => {
        ticketStatusService.getGlobalTicketStats(null);
      }).toThrow('Database instance is required');
    });

    it('should handle empty database', () => {
      // Create clean database
      const emptyDb = new Database(':memory:');
      emptyDb.exec(`
        CREATE TABLE IF NOT EXISTS work_queue_tickets (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          agent_id TEXT NOT NULL,
          content TEXT NOT NULL,
          url TEXT,
          priority TEXT NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          metadata TEXT,
          result TEXT,
          last_error TEXT,
          post_id TEXT,
          created_at INTEGER NOT NULL,
          assigned_at INTEGER,
          completed_at INTEGER
        );
      `);

      const stats = ticketStatusService.getGlobalTicketStats(emptyDb);

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.unique_agents).toBe(0);
      expect(stats.posts_with_tickets).toBe(0);

      emptyDb.close();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle many tickets efficiently', () => {
      const manyPostId = 'performance-test-post';

      // Create 50 tickets
      const startCreate = Date.now();
      for (let i = 0; i < 50; i++) {
        workQueue.createTicket({
          agent_id: `agent-${i % 5}`,
          content: `Task ${i}`,
          priority: 'P2',
          post_id: manyPostId
        });
      }
      const createTime = Date.now() - startCreate;

      // Query should be fast with proper indexes
      const startQuery = Date.now();
      const result = ticketStatusService.getPostTicketStatus(manyPostId, db);
      const queryTime = Date.now() - startQuery;

      expect(result.tickets).toHaveLength(50);
      expect(result.summary.total).toBe(50);
      expect(queryTime).toBeLessThan(100); // Should be very fast with indexes
      console.log(`Performance: Created 50 tickets in ${createTime}ms, queried in ${queryTime}ms`);
    });
  });

  describe('No Emoji Verification', () => {
    it('should return text-only status values', () => {
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Test ticket',
        priority: 'P1',
        post_id: 'emoji-test-post'
      });

      const result = ticketStatusService.getPostTicketStatus('emoji-test-post', db);

      expect(result.tickets[0].status).toMatch(/^(pending|in_progress|completed|failed)$/);
      expect(result.summary).not.toContain('🔴');
      expect(result.summary).not.toContain('🟡');
      expect(result.summary).not.toContain('🟢');
    });
  });
});
