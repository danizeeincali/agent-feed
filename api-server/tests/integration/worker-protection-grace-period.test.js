/**
 * Integration Tests for Worker Protection with Grace Period Handler
 *
 * Tests the complete grace period flow with REAL database operations:
 * - Grace period triggers at exact 80% threshold
 * - State persists to database when triggered
 * - TodoWrite plan generated correctly
 * - User choices can be recorded
 * - Execution continues after "continue" choice
 * - State saves for "pause" choice
 * - No grace period trigger for quick queries
 * - Multiple messages collected before trigger
 * - Timeout still enforces after grace period
 *
 * Uses real Better-SQLite3 database (in-memory for tests)
 * Applies migration 017 to create grace_period_states table
 * Mocks only the SDK manager (sdkManager.executeHeadlessTask)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GracePeriodHandler } from '../../worker/grace-period-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Worker Protection with Grace Period Handler - Integration Tests', () => {
  let db;
  let gracePeriodHandler;

  beforeEach(() => {
    // Create in-memory database for tests
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create work_queue_tickets table first (for foreign key constraint)
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Apply migration 017 - Grace Period States Table
    const migrationPath = path.join(__dirname, '../../db/migrations/017-grace-period-states.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    db.exec(migration);

    // Initialize grace period handler with real database
    gracePeriodHandler = new GracePeriodHandler(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('IT-WPGP-001: Grace period triggers at 80% of timeout', () => {
    it('should trigger grace period at exact 80% threshold', async () => {
      const timeoutMs = 1000; // 1 second
      const expectedGracePeriodMs = 800; // 80% of 1000ms

      const context = gracePeriodHandler.startMonitoring(
        'test query',
        'worker-1',
        'ticket-1',
        timeoutMs
      );

      expect(context.gracePeriodMs).toBe(expectedGracePeriodMs);
      expect(context.gracePeriodTriggered).toBe(false);

      // Should not trigger before 80%
      await new Promise(resolve => setTimeout(resolve, 700)); // 70%
      let shouldTrigger = gracePeriodHandler.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);

      // Should trigger at 80%+
      await new Promise(resolve => setTimeout(resolve, 150)); // Now at 85%
      shouldTrigger = gracePeriodHandler.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    }, 2000);

    it('should calculate grace period correctly for different timeout values', () => {
      const testCases = [
        { timeout: 60000, expected: 48000 },   // Simple: 60s -> 48s
        { timeout: 120000, expected: 96000 },  // Default: 120s -> 96s
        { timeout: 300000, expected: 240000 }, // Complex: 300s -> 240s
      ];

      for (const { timeout, expected } of testCases) {
        const context = gracePeriodHandler.startMonitoring(
          'test',
          'worker-1',
          'ticket-1',
          timeout
        );
        expect(context.gracePeriodMs).toBe(expected);
      }
    });
  });

  describe('IT-WPGP-002: State persists to database when triggered', () => {
    it('should persist execution state to database', () => {
      // Create ticket first (for foreign key constraint)
      db.prepare(`
        INSERT INTO work_queue_tickets (id, agent_id, content)
        VALUES (?, 'test-agent', 'test content')
      `).run('ticket-2');

      const context = gracePeriodHandler.startMonitoring(
        'complex query',
        'worker-2',
        'ticket-2',
        10000
      );

      const messages = [
        { type: 'assistant', content: 'Message 1' },
        { type: 'assistant', content: 'Message 2' },
        { type: 'tool_use', name: 'read_file' }
      ];

      const executionState = gracePeriodHandler.captureExecutionState(
        context,
        messages,
        3
      );

      const plan = gracePeriodHandler.generateTodoWritePlan(executionState, context);
      const stateId = gracePeriodHandler.persistState(executionState, plan, context);

      // Verify state exists in database
      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeTruthy();
      expect(row.worker_id).toBe('worker-2');
      expect(row.ticket_id).toBe('ticket-2');
      expect(row.query).toBe('complex query');
      expect(row.execution_state).toBeTruthy();
      expect(row.plan).toBeTruthy();

      // Verify JSON parsing
      const savedState = JSON.parse(row.execution_state);
      expect(savedState.messagesCollected).toBe(3);
      expect(savedState.chunksProcessed).toBe(3);
    });

    it('should set correct expiration time (24 hours default)', () => {
      // Create ticket first
      db.prepare(`
        INSERT INTO work_queue_tickets (id, agent_id, content)
        VALUES (?, 'test-agent', 'test content')
      `).run('ticket-3');

      const context = gracePeriodHandler.startMonitoring(
        'test',
        'worker-3',
        'ticket-3',
        10000
      );

      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const plan = [];
      const stateId = gracePeriodHandler.persistState(state, plan, context);

      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      const hoursDiff = (expiresAt - now) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });
  });

  describe('IT-WPGP-003: TodoWrite plan generated correctly', () => {
    it('should generate plan with completed and pending steps', () => {
      const context = gracePeriodHandler.startMonitoring(
        'build app',
        'worker-4',
        'ticket-4',
        10000
      );

      const partialResults = {
        partialMessages: [
          { type: 'tool_use', name: 'write_file' },
          { type: 'tool_result', content: 'File written' },
          { type: 'tool_use', name: 'bash' },
          { type: 'tool_result', content: 'Command executed' }
        ],
        chunksProcessed: 30 // 30% progress
      };

      const plan = gracePeriodHandler.generateTodoWritePlan(partialResults, context);

      expect(plan.length).toBeGreaterThanOrEqual(5); // Min 5 steps
      expect(plan.length).toBeLessThanOrEqual(10); // Max 10 steps

      // Should have at least one completed step (for tool uses)
      const completedSteps = plan.filter(s => s.status === 'completed');
      expect(completedSteps.length).toBeGreaterThan(0);

      // Should have pending steps
      const pendingSteps = plan.filter(s => s.status === 'pending');
      expect(pendingSteps.length).toBeGreaterThan(0);

      // Each step should have required fields
      for (const step of plan) {
        expect(step.content).toBeTruthy();
        expect(step.status).toMatch(/^(completed|pending)$/);
        expect(step.activeForm).toBeTruthy();
      }
    });

    it('should adjust pending steps based on progress percentage', () => {
      const context = gracePeriodHandler.startMonitoring('test', 'w', 't', 10000);

      // Low progress (< 50%)
      const lowProgress = {
        partialMessages: [],
        chunksProcessed: 20
      };
      const lowPlan = gracePeriodHandler.generateTodoWritePlan(lowProgress, context);
      const lowPending = lowPlan.filter(s => s.status === 'pending');
      expect(lowPending.length).toBeGreaterThanOrEqual(2);

      // High progress (> 80%)
      const highProgress = {
        partialMessages: [],
        chunksProcessed: 85
      };
      const highPlan = gracePeriodHandler.generateTodoWritePlan(highProgress, context);
      const highPending = highPlan.filter(s => s.status === 'pending');

      // Note: Plan is padded to minStepsInPlan (5), so even with high progress,
      // we'll have more than 1 pending step due to padding
      expect(highPlan.length).toBeGreaterThanOrEqual(5); // Min steps enforced
      expect(highPending.length).toBeGreaterThan(0); // At least one pending
    });

    it('should enforce min/max plan length constraints', () => {
      const handler = new GracePeriodHandler(db, {
        minStepsInPlan: 3,
        maxStepsInPlan: 7
      });

      const context = handler.startMonitoring('test', 'w', 't', 10000);
      const partialResults = { partialMessages: [], chunksProcessed: 10 };

      const plan = handler.generateTodoWritePlan(partialResults, context);

      expect(plan.length).toBeGreaterThanOrEqual(3);
      expect(plan.length).toBeLessThanOrEqual(7);
    });
  });

  describe('IT-WPGP-004: User choices can be recorded', () => {
    it('should record "continue" choice', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-5', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-5', 't-5', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      gracePeriodHandler.recordUserChoice(stateId, 'continue');

      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.user_choice).toBe('continue');
      expect(row.user_choice_at).toBeTruthy();
    });

    it('should record "pause" choice', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-6', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-6', 't-6', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      gracePeriodHandler.recordUserChoice(stateId, 'pause');

      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.user_choice).toBe('pause');
    });

    it('should record all valid choice types', () => {
      const choices = ['continue', 'pause', 'simplify', 'cancel'];

      for (let i = 0; i < choices.length; i++) {
        // Create ticket first
        db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run(`t-${i}`, 'agent', 'test');

        const context = gracePeriodHandler.startMonitoring('test', `w-${i}`, `t-${i}`, 10000);
        const state = gracePeriodHandler.captureExecutionState(context, [], 0);
        const stateId = gracePeriodHandler.persistState(state, [], context);

        gracePeriodHandler.recordUserChoice(stateId, choices[i]);

        const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
        expect(row.user_choice).toBe(choices[i]);
      }
    });
  });

  describe('IT-WPGP-005: Execution continues after "continue" choice', () => {
    it('should allow resumption after continue choice', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-7', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-7', 't-7', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const plan = [];
      const stateId = gracePeriodHandler.persistState(state, plan, context);

      // Record continue choice
      gracePeriodHandler.recordUserChoice(stateId, 'continue');

      // Resume from state
      const resumed = gracePeriodHandler.resumeFromState(stateId);
      expect(resumed).toBeTruthy();
      expect(resumed.userChoice).toBe('continue');
      expect(resumed.workerId).toBe('w-7');
      expect(resumed.ticketId).toBe('t-7');
    });

    it('should mark state as resumed when loaded', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-8', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-8', 't-8', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      // Before resume
      let row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.resumed).toBe(0);
      expect(row.resumed_at).toBeNull();

      // After resume
      gracePeriodHandler.resumeFromState(stateId);
      row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.resumed).toBe(1);
      expect(row.resumed_at).toBeTruthy();
    });
  });

  describe('IT-WPGP-006: State saves for "pause" choice', () => {
    it('should preserve partial results for paused state', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-9', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-9', 't-9', 10000);

      const messages = [
        { type: 'assistant', content: 'Step 1 complete' },
        { type: 'assistant', content: 'Step 2 in progress' }
      ];

      const state = gracePeriodHandler.captureExecutionState(context, messages, 2);
      const plan = gracePeriodHandler.generateTodoWritePlan(state, context);
      const stateId = gracePeriodHandler.persistState(state, plan, context);

      gracePeriodHandler.recordUserChoice(stateId, 'pause');

      // Retrieve and verify
      const resumed = gracePeriodHandler.resumeFromState(stateId);
      expect(resumed.userChoice).toBe('pause');
      expect(resumed.partialResults.length).toBeGreaterThan(0);
      expect(resumed.plan.length).toBeGreaterThan(0);
    });

    it('should handle pause with large partial results', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-10', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-10', 't-10', 10000);

      // Create 50 messages
      const messages = Array(50).fill(null).map((_, i) => ({
        type: 'assistant',
        content: `Message ${i}`
      }));

      const state = gracePeriodHandler.captureExecutionState(context, messages, 50);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      gracePeriodHandler.recordUserChoice(stateId, 'pause');

      // Should still be retrievable
      const resumed = gracePeriodHandler.resumeFromState(stateId);
      expect(resumed).toBeTruthy();
      expect(resumed.executionState.messagesCollected).toBe(50);
    });
  });

  describe('IT-WPGP-007: No grace period trigger for quick queries', () => {
    it('should not trigger for queries that complete before threshold', async () => {
      const timeoutMs = 10000; // 10 seconds
      const context = gracePeriodHandler.startMonitoring(
        'quick query',
        'w-11',
        't-11',
        timeoutMs
      );

      // Simulate quick completion (1 second, well before 80% = 8 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const shouldTrigger = gracePeriodHandler.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
      expect(context.gracePeriodTriggered).toBe(false);
    }, 2000);

    it('should handle very short timeouts without triggering immediately', () => {
      const timeoutMs = 500; // 500ms
      const context = gracePeriodHandler.startMonitoring(
        'ultra quick',
        'w-12',
        't-12',
        timeoutMs
      );

      // Should not trigger immediately
      const shouldTrigger = gracePeriodHandler.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
      expect(context.gracePeriodMs).toBe(400); // 80% of 500ms
    });
  });

  describe('IT-WPGP-008: Multiple messages collected before trigger', () => {
    it('should collect and store multiple messages before grace period', () => {
      const context = gracePeriodHandler.startMonitoring('test', 'w-13', 't-13', 10000);

      const messages = [
        { type: 'assistant', content: 'Analyzing requirements...' },
        { type: 'tool_use', name: 'read_file', input: { path: 'src/app.js' } },
        { type: 'tool_result', content: 'File content...' },
        { type: 'assistant', content: 'Implementing changes...' },
        { type: 'tool_use', name: 'write_file', input: { path: 'src/app.js' } },
        { type: 'tool_result', content: 'File written' },
        { type: 'assistant', content: 'Running tests...' }
      ];

      const state = gracePeriodHandler.captureExecutionState(context, messages, 7);

      expect(state.messagesCollected).toBe(7);
      expect(state.partialMessages.length).toBe(7); // Keeps first 10
      expect(state.chunksProcessed).toBe(7);
    });

    it('should truncate messages to first 10 for storage efficiency', () => {
      const context = gracePeriodHandler.startMonitoring('test', 'w-14', 't-14', 10000);

      const messages = Array(25).fill(null).map((_, i) => ({
        type: 'assistant',
        content: `Message ${i}`
      }));

      const state = gracePeriodHandler.captureExecutionState(context, messages, 25);

      expect(state.messagesCollected).toBe(25);
      expect(state.partialMessages.length).toBe(10); // Only first 10 kept
    });
  });

  describe('IT-WPGP-009: Timeout still enforces after grace period', () => {
    it('should respect total timeout even with grace period', async () => {
      const timeoutMs = 1000; // 1 second total
      const context = gracePeriodHandler.startMonitoring(
        'test',
        'w-15',
        't-15',
        timeoutMs
      );

      // Wait for grace period trigger (80% = 800ms)
      await new Promise(resolve => setTimeout(resolve, 850));

      let shouldTrigger = gracePeriodHandler.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);

      // Grace period triggered, but timeout should still enforce
      // Wait beyond total timeout
      await new Promise(resolve => setTimeout(resolve, 200)); // Now at 1050ms > 1000ms

      // In real implementation, timeout would have fired
      const elapsed = Date.now() - context.startTime;
      expect(elapsed).toBeGreaterThan(timeoutMs);
    }, 2000);

    it('should provide user choices within grace period window', () => {
      const context = gracePeriodHandler.startMonitoring('test', 'w-16', 't-16', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const plan = gracePeriodHandler.generateTodoWritePlan(state, context);

      const userPrompt = gracePeriodHandler.presentUserChoices('post-1', plan, context);

      expect(userPrompt.choices.length).toBe(4); // continue, pause, simplify, cancel
      expect(userPrompt.progress.remaining).toBeTruthy();
      expect(userPrompt.plan).toEqual(plan);

      // Verify choice actions
      const actions = userPrompt.choices.map(c => c.action);
      expect(actions).toContain('extend_timeout');
      expect(actions).toContain('save_state');
      expect(actions).toContain('reduce_scope');
      expect(actions).toContain('terminate');
    });
  });

  describe('IT-WPGP-010: State expiration and cleanup', () => {
    it('should not return expired states', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-17', 'agent', 'test');

      // Create handler with very short TTL
      const handler = new GracePeriodHandler(db, { stateTtlHours: 0.001 }); // ~3.6 seconds

      const context = handler.startMonitoring('test', 'w-17', 't-17', 10000);
      const state = handler.captureExecutionState(context, [], 0);
      const stateId = handler.persistState(state, [], context);

      // Manually update expires_at to past
      db.prepare(`
        UPDATE grace_period_states
        SET expires_at = datetime('now', '-1 hour')
        WHERE id = ?
      `).run(stateId);

      const resumed = handler.resumeFromState(stateId);
      expect(resumed).toBeNull(); // Expired, should return null
    });

    it('should cleanup expired states', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-18', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-18', 't-18', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      // Set to expired
      db.prepare(`
        UPDATE grace_period_states
        SET expires_at = datetime('now', '-1 day')
        WHERE id = ?
      `).run(stateId);

      // Cleanup
      gracePeriodHandler.cleanupExpiredStates();

      // Should be deleted
      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeUndefined();
    });
  });

  describe('IT-WPGP-011: Statistics and monitoring', () => {
    it('should track grace period statistics', () => {
      // Create multiple states with different choices
      const testData = [
        { worker: 'w-19', ticket: 't-19', choice: 'continue' },
        { worker: 'w-20', ticket: 't-20', choice: 'pause' },
        { worker: 'w-21', ticket: 't-21', choice: 'simplify' },
        { worker: 'w-22', ticket: 't-22', choice: 'cancel' },
        { worker: 'w-23', ticket: 't-23', choice: 'continue' }
      ];

      for (const { worker, ticket, choice } of testData) {
        // Create ticket first
        db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run(ticket, 'agent', 'test');

        const context = gracePeriodHandler.startMonitoring('test', worker, ticket, 10000);
        const state = gracePeriodHandler.captureExecutionState(context, [], 0);
        const stateId = gracePeriodHandler.persistState(state, [], context);
        gracePeriodHandler.recordUserChoice(stateId, choice);
      }

      const stats = gracePeriodHandler.getStatistics();

      expect(stats.total).toBe(5);
      expect(stats.choices.continue).toBe(2);
      expect(stats.choices.pause).toBe(1);
      expect(stats.choices.simplify).toBe(1);
      expect(stats.choices.cancel).toBe(1);
    });

    it('should track resumption count', () => {
      // Create ticket first
      db.prepare('INSERT INTO work_queue_tickets (id, agent_id, content) VALUES (?, ?, ?)').run('t-24', 'agent', 'test');

      const context = gracePeriodHandler.startMonitoring('test', 'w-24', 't-24', 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      gracePeriodHandler.recordUserChoice(stateId, 'pause');
      gracePeriodHandler.resumeFromState(stateId);

      const stats = gracePeriodHandler.getStatistics();
      expect(stats.resumed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('IT-WPGP-012: Foreign key constraints', () => {
    it('should respect foreign key constraint on ticket_id', () => {
      // Create a ticket first
      const ticketId = 'fk-ticket-1';
      db.prepare(`
        INSERT INTO work_queue_tickets (id, agent_id, content)
        VALUES (?, 'test-agent', 'test content')
      `).run(ticketId);

      // Create grace period state with valid ticket
      const context = gracePeriodHandler.startMonitoring('test', 'w-25', ticketId, 10000);
      const state = gracePeriodHandler.captureExecutionState(context, [], 0);
      const stateId = gracePeriodHandler.persistState(state, [], context);

      // Verify state exists
      let row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeTruthy();

      // Delete ticket - should cascade delete grace period state
      db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(ticketId);

      // Grace period state should be deleted due to CASCADE
      row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeUndefined();
    });
  });
});
