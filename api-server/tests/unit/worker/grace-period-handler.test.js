/**
 * GracePeriodHandler - TDD Unit Tests
 *
 * Tests the grace period timeout handling implementation that triggers at 80%
 * of timeout threshold to provide users with options and TodoWrite plans.
 *
 * Following TDD methodology with REAL database operations (NO MOCKS).
 *
 * Context:
 * - Grace period triggers at 192s for 240s timeout (80%)
 * - Provides 4 user choices: Continue, Pause, Simplify, Cancel
 * - Generates TodoWrite plan from execution state
 * - Persists state to database for 24h resumption
 * - Uses real Better-SQLite3 database operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { GracePeriodHandler } from '../../../worker/grace-period-handler.js';
import fs from 'fs';
import path from 'path';

describe('GracePeriodHandler - TDD Unit Tests', () => {
  let db;
  let handler;
  const testDbPath = ':memory:'; // Use in-memory database for tests

  beforeEach(() => {
    // Create real in-memory database
    db = new Database(testDbPath);

    // Apply migration to create grace_period_states table
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'db/migrations/017-grace-period-states.sql'),
      'utf-8'
    );
    db.exec(migrationSql);

    // Create work_queue_tickets table (required for foreign key)
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create handler with default config
    handler = new GracePeriodHandler(db);
  });

  afterEach(() => {
    // Cleanup
    db.close();
  });

  describe('UT-GPH-001: Constructor and Initialization', () => {
    test('should create handler with default configuration', () => {
      expect(handler).toBeDefined();
      expect(handler.db).toBe(db);
      expect(handler.config.triggerAtPercentage).toBe(0.8);
      expect(handler.config.enablePlanningMode).toBe(true);
      expect(handler.config.minStepsInPlan).toBe(5);
      expect(handler.config.maxStepsInPlan).toBe(10);
      expect(handler.config.stateTtlHours).toBe(24);
    });

    test('should create handler with custom configuration', () => {
      const customHandler = new GracePeriodHandler(db, {
        triggerAtPercentage: 0.75,
        minStepsInPlan: 3,
        maxStepsInPlan: 8,
        stateTtlHours: 48
      });

      expect(customHandler.config.triggerAtPercentage).toBe(0.75);
      expect(customHandler.config.minStepsInPlan).toBe(3);
      expect(customHandler.config.maxStepsInPlan).toBe(8);
      expect(customHandler.config.stateTtlHours).toBe(48);
    });

    test('should initialize prepared statements', () => {
      expect(handler.insertStateStmt).toBeDefined();
      expect(handler.getStateStmt).toBeDefined();
      expect(handler.updateChoiceStmt).toBeDefined();
      expect(handler.markResumedStmt).toBeDefined();
      expect(handler.cleanupExpiredStmt).toBeDefined();
    });
  });

  describe('UT-GPH-002: startMonitoring() - Grace Period Initialization', () => {
    test('should start monitoring with correct context', () => {
      const context = handler.startMonitoring(
        'create personal assistant agent',
        'worker-1',
        'ticket-123',
        240000 // 240 seconds
      );

      expect(context).toBeDefined();
      expect(context.stateId).toMatch(/^gps-\d+-[a-f0-9]{8}$/);
      expect(context.workerId).toBe('worker-1');
      expect(context.ticketId).toBe('ticket-123');
      expect(context.query).toBe('create personal assistant agent');
      expect(context.timeoutMs).toBe(240000);
      expect(context.gracePeriodMs).toBe(192000); // 80% of 240000
      expect(context.gracePeriodTriggered).toBe(false);
      expect(context.startTime).toBeDefined();
      expect(context.messages).toEqual([]);
      expect(context.chunkCount).toBe(0);
    });

    test('should calculate grace period at 80% for 240s timeout', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      expect(context.gracePeriodMs).toBe(192000); // 192 seconds
    });

    test('should calculate grace period at 80% for 300s timeout', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 300000);
      expect(context.gracePeriodMs).toBe(240000); // 240 seconds
    });

    test('should calculate grace period at 75% when configured', () => {
      const customHandler = new GracePeriodHandler(db, { triggerAtPercentage: 0.75 });
      const context = customHandler.startMonitoring('test', 'w1', 't1', 240000);
      expect(context.gracePeriodMs).toBe(180000); // 180 seconds (75% of 240s)
    });
  });

  describe('UT-GPH-003: shouldTrigger() - Grace Period Trigger Detection', () => {
    test('should NOT trigger before grace period threshold', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);

      // Immediately check (0ms elapsed)
      expect(handler.shouldTrigger(context)).toBe(false);
    });

    test('should NOT trigger if already triggered', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      context.gracePeriodTriggered = true;

      // Even if elapsed time >= gracePeriodMs
      context.startTime = Date.now() - 200000; // 200s ago
      expect(handler.shouldTrigger(context)).toBe(false);
    });

    test('should trigger when elapsed time >= grace period threshold', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);

      // Simulate 192s elapsed (exactly at threshold)
      context.startTime = Date.now() - 192000;
      expect(handler.shouldTrigger(context)).toBe(true);
    });

    test('should trigger when elapsed time > grace period threshold', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);

      // Simulate 200s elapsed (past threshold)
      context.startTime = Date.now() - 200000;
      expect(handler.shouldTrigger(context)).toBe(true);
    });
  });

  describe('UT-GPH-004: captureExecutionState() - State Snapshot', () => {
    test('should capture execution state correctly', () => {
      const context = handler.startMonitoring('test query', 'w1', 't1', 240000);
      context.startTime = Date.now() - 150000; // 150s elapsed

      const messages = [
        { type: 'tool_use', name: 'Read', id: 'm1' },
        { type: 'tool_result', id: 'm2' },
        { type: 'text', content: 'test', id: 'm3' }
      ];
      const chunkCount = 75;

      const state = handler.captureExecutionState(context, messages, chunkCount);

      expect(state.workerId).toBe('w1');
      expect(state.ticketId).toBe('t1');
      expect(state.query).toBe('test query');
      expect(state.messagesCollected).toBe(3);
      expect(state.chunksProcessed).toBe(75);
      expect(state.timeElapsed).toBeGreaterThanOrEqual(150000);
      expect(state.timeElapsed).toBeLessThan(152000); // Allow small variance
      expect(state.timestamp).toBeDefined();
      expect(state.partialMessages).toHaveLength(3);
    });

    test('should only keep first 10 messages for context', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);

      const messages = Array.from({ length: 50 }, (_, i) => ({
        type: 'text',
        content: `message ${i}`,
        id: `m${i}`
      }));

      const state = handler.captureExecutionState(context, messages, 100);

      expect(state.messagesCollected).toBe(50);
      expect(state.partialMessages).toHaveLength(10);
      expect(state.partialMessages[0].content).toBe('message 0');
      expect(state.partialMessages[9].content).toBe('message 9');
    });

    test('should handle empty messages array', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const state = handler.captureExecutionState(context, [], 0);

      expect(state.messagesCollected).toBe(0);
      expect(state.chunksProcessed).toBe(0);
      expect(state.partialMessages).toEqual([]);
    });
  });

  describe('UT-GPH-005: generateTodoWritePlan() - TodoWrite Plan Generation', () => {
    test('should generate plan with minimum 5 steps', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const partialResults = {
        messagesCollected: 10,
        chunksProcessed: 20,
        partialMessages: []
      };

      const plan = handler.generateTodoWritePlan(partialResults, context);

      expect(plan).toBeDefined();
      expect(Array.isArray(plan)).toBe(true);
      expect(plan.length).toBeGreaterThanOrEqual(5);
    });

    test('should generate plan with maximum 10 steps', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const partialResults = {
        messagesCollected: 100,
        chunksProcessed: 200,
        partialMessages: Array.from({ length: 10 }, (_, i) => ({
          type: 'tool_use',
          name: `Tool${i}`
        }))
      };

      const plan = handler.generateTodoWritePlan(partialResults, context);

      expect(plan.length).toBeLessThanOrEqual(10);
    });

    test('should mark tool operations as completed', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const partialResults = {
        messagesCollected: 15,
        chunksProcessed: 30,
        partialMessages: [
          { type: 'tool_use', name: 'Read' },
          { type: 'tool_use', name: 'Write' },
          { type: 'tool_use', name: 'Edit' },
          { type: 'text', content: 'test' }
        ]
      };

      const plan = handler.generateTodoWritePlan(partialResults, context);

      const completedSteps = plan.filter(step => step.status === 'completed');
      expect(completedSteps.length).toBeGreaterThan(0);
      expect(completedSteps[0].content).toContain('3 tool operations');
    });

    test('should add pending steps based on progress percentage', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);

      // Low progress (< 50%)
      const lowProgress = {
        messagesCollected: 10,
        chunksProcessed: 20,
        partialMessages: []
      };
      const planLow = handler.generateTodoWritePlan(lowProgress, context);
      const pendingLow = planLow.filter(s => s.status === 'pending');
      expect(pendingLow.some(s => s.content.includes('primary task objective'))).toBe(true);

      // Medium progress (50-80%)
      const medProgress = {
        messagesCollected: 50,
        chunksProcessed: 65,
        partialMessages: []
      };
      const planMed = handler.generateTodoWritePlan(medProgress, context);
      const pendingMed = planMed.filter(s => s.status === 'pending');
      expect(pendingMed.some(s => s.content.includes('remaining implementation'))).toBe(true);

      // High progress (> 80%)
      const highProgress = {
        messagesCollected: 80,
        chunksProcessed: 90,
        partialMessages: []
      };
      const planHigh = handler.generateTodoWritePlan(highProgress, context);
      const pendingHigh = planHigh.filter(s => s.status === 'pending');
      expect(pendingHigh.some(s => s.content.includes('final validation'))).toBe(true);
    });

    test('should include activeForm for each step', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const partialResults = {
        messagesCollected: 10,
        chunksProcessed: 20,
        partialMessages: []
      };

      const plan = handler.generateTodoWritePlan(partialResults, context);

      plan.forEach(step => {
        expect(step).toHaveProperty('content');
        expect(step).toHaveProperty('status');
        expect(step).toHaveProperty('activeForm');
        expect(typeof step.activeForm).toBe('string');
      });
    });
  });

  describe('UT-GPH-006: presentUserChoices() - User Choice Prompt', () => {
    test('should generate prompt with 4 choices', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      context.startTime = Date.now() - 192000; // 192s elapsed

      const plan = [
        { content: 'Step 1', status: 'completed', activeForm: 'Step 1' },
        { content: 'Step 2', status: 'pending', activeForm: 'Step 2' }
      ];

      const prompt = handler.presentUserChoices('post-123', plan, context);

      expect(prompt.stateId).toBe(context.stateId);
      expect(prompt.postId).toBe('post-123');
      expect(prompt.message).toContain('longer than expected');
      expect(prompt.choices).toHaveLength(4);
      expect(prompt.plan).toBe(plan);
    });

    test('should include correct choice options', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      const plan = [];

      const prompt = handler.presentUserChoices('post-1', plan, context);

      const choiceIds = prompt.choices.map(c => c.id);
      expect(choiceIds).toContain('continue');
      expect(choiceIds).toContain('pause');
      expect(choiceIds).toContain('simplify');
      expect(choiceIds).toContain('cancel');

      const continueChoice = prompt.choices.find(c => c.id === 'continue');
      expect(continueChoice.label).toBe('Continue');
      expect(continueChoice.description).toContain('+120s');
      expect(continueChoice.action).toBe('extend_timeout');
    });

    test('should calculate progress correctly', () => {
      const context = handler.startMonitoring('test', 'w1', 't1', 240000);
      context.startTime = Date.now() - 192000; // 192s elapsed

      const prompt = handler.presentUserChoices('post-1', [], context);

      expect(prompt.progress.elapsed).toBe('192s');
      expect(prompt.progress.remaining).toBe('48s'); // 240 - 192
      expect(prompt.progress.percentComplete).toBe(80); // 192/240 = 0.8
    });
  });

  describe('UT-GPH-007: persistState() - Real Database Operations', () => {
    test('should persist state to database successfully', () => {
      // Insert ticket into work_queue_tickets first (foreign key requirement)
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-123');

      const context = handler.startMonitoring('test query', 'w1', 'ticket-123', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-123',
        query: 'test query',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: [{ type: 'text', content: 'test' }]
      };
      const plan = [
        { content: 'Step 1', status: 'completed', activeForm: 'Step 1' }
      ];

      const stateId = handler.persistState(state, plan, context);

      expect(stateId).toBe(context.stateId);

      // Verify state was persisted to database
      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeDefined();
      expect(row.worker_id).toBe('w1');
      expect(row.ticket_id).toBe('ticket-123');
      expect(row.query).toBe('test query');
      expect(JSON.parse(row.execution_state).messagesCollected).toBe(10);
      expect(JSON.parse(row.plan)).toHaveLength(1);
    });

    test('should set correct expiration time (24h TTL)', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-456');

      const context = handler.startMonitoring('test', 'w1', 'ticket-456', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-456',
        query: 'test',
        messagesCollected: 5,
        chunksProcessed: 10,
        timeElapsed: 100000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);

      const row = db.prepare('SELECT expires_at FROM grace_period_states WHERE id = ?').get(stateId);
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      const hoursDiff = (expiresAt - now) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23.9); // Allow small variance
      expect(hoursDiff).toBeLessThan(24.1);
    });

    test('should use custom TTL when configured', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-789');

      const customHandler = new GracePeriodHandler(db, { stateTtlHours: 48 });
      const context = customHandler.startMonitoring('test', 'w1', 'ticket-789', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-789',
        query: 'test',
        messagesCollected: 5,
        chunksProcessed: 10,
        timeElapsed: 100000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = customHandler.persistState(state, [], context);

      const row = db.prepare('SELECT expires_at FROM grace_period_states WHERE id = ?').get(stateId);
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      const hoursDiff = (expiresAt - now) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(47.9);
      expect(hoursDiff).toBeLessThan(48.1);
    });

    test('should throw error if database operation fails', () => {
      const context = handler.startMonitoring('test', 'w1', 'invalid-ticket', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'invalid-ticket', // No matching work_queue_tickets entry
        query: 'test',
        messagesCollected: 5,
        chunksProcessed: 10,
        timeElapsed: 100000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      // Should throw due to foreign key constraint
      expect(() => {
        handler.persistState(state, [], context);
      }).toThrow();
    });
  });

  describe('UT-GPH-008: recordUserChoice() - User Choice Tracking', () => {
    test('should record user choice to database', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-abc');

      const context = handler.startMonitoring('test', 'w1', 'ticket-abc', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-abc',
        query: 'test',
        messagesCollected: 5,
        chunksProcessed: 10,
        timeElapsed: 100000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);

      // Record user choice
      handler.recordUserChoice(stateId, 'continue');

      const row = db.prepare('SELECT user_choice, user_choice_at FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.user_choice).toBe('continue');
      expect(row.user_choice_at).toBeDefined();
    });

    test('should record all valid choice types', () => {
      const choices = ['continue', 'pause', 'simplify', 'cancel'];

      choices.forEach((choice, index) => {
        const ticketId = `ticket-choice-${index}`;
        db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run(ticketId);

        const context = handler.startMonitoring('test', 'w1', ticketId, 240000);
        const state = {
          workerId: 'w1',
          ticketId,
          query: 'test',
          messagesCollected: 5,
          chunksProcessed: 10,
          timeElapsed: 100000,
          timestamp: new Date().toISOString(),
          partialMessages: []
        };

        const stateId = handler.persistState(state, [], context);
        handler.recordUserChoice(stateId, choice);

        const row = db.prepare('SELECT user_choice FROM grace_period_states WHERE id = ?').get(stateId);
        expect(row.user_choice).toBe(choice);
      });
    });
  });

  describe('UT-GPH-009: resumeFromState() - State Resumption', () => {
    test('should resume from saved state successfully', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-resume');

      const context = handler.startMonitoring('original query', 'w1', 'ticket-resume', 240000);
      const originalState = {
        workerId: 'w1',
        ticketId: 'ticket-resume',
        query: 'original query',
        messagesCollected: 25,
        chunksProcessed: 50,
        timeElapsed: 180000,
        timestamp: new Date().toISOString(),
        partialMessages: [{ type: 'text', content: 'test message' }]
      };
      const originalPlan = [
        { content: 'Step 1', status: 'completed', activeForm: 'Step 1' },
        { content: 'Step 2', status: 'pending', activeForm: 'Step 2' }
      ];

      const stateId = handler.persistState(originalState, originalPlan, context);
      handler.recordUserChoice(stateId, 'pause');

      // Resume from state
      const resumedState = handler.resumeFromState(stateId);

      expect(resumedState).toBeDefined();
      expect(resumedState.id).toBe(stateId);
      expect(resumedState.workerId).toBe('w1');
      expect(resumedState.ticketId).toBe('ticket-resume');
      expect(resumedState.query).toBe('original query');
      expect(resumedState.executionState.messagesCollected).toBe(25);
      expect(resumedState.executionState.chunksProcessed).toBe(50);
      expect(resumedState.plan).toHaveLength(2);
      expect(resumedState.userChoice).toBe('pause');
      expect(resumedState.partialResults).toHaveLength(1);
    });

    test('should mark state as resumed in database', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-mark');

      const context = handler.startMonitoring('test', 'w1', 'ticket-mark', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-mark',
        query: 'test',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);

      // Initially not resumed
      let row = db.prepare('SELECT resumed, resumed_at FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.resumed).toBe(0);
      expect(row.resumed_at).toBeNull();

      // Resume
      handler.resumeFromState(stateId);

      // Now marked as resumed
      row = db.prepare('SELECT resumed, resumed_at FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row.resumed).toBe(1);
      expect(row.resumed_at).toBeDefined();
    });

    test('should return null for non-existent state', () => {
      const result = handler.resumeFromState('gps-99999-nonexistent');
      expect(result).toBeNull();
    });

    test('should return null for expired state', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-expired');

      const context = handler.startMonitoring('test', 'w1', 'ticket-expired', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-expired',
        query: 'test',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);

      // Manually set expiration to past
      db.prepare('UPDATE grace_period_states SET expires_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 1000).toISOString(), stateId);

      const result = handler.resumeFromState(stateId);
      expect(result).toBeNull();
    });
  });

  describe('UT-GPH-010: cleanupExpiredStates() - Automatic Cleanup', () => {
    test('should remove expired states from database', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-cleanup-1');
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-cleanup-2');

      // Create two states: one expired, one valid
      const context1 = handler.startMonitoring('test1', 'w1', 'ticket-cleanup-1', 240000);
      const context2 = handler.startMonitoring('test2', 'w2', 'ticket-cleanup-2', 240000);

      const state = {
        workerId: 'w1',
        ticketId: 'ticket-cleanup-1',
        query: 'test',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId1 = handler.persistState(state, [], context1);
      const stateId2 = handler.persistState({ ...state, workerId: 'w2', ticketId: 'ticket-cleanup-2' }, [], context2);

      // Manually expire first state
      db.prepare('UPDATE grace_period_states SET expires_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 1000).toISOString(), stateId1);

      // Cleanup
      handler.cleanupExpiredStates();

      // First state should be deleted
      const row1 = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId1);
      expect(row1).toBeUndefined();

      // Second state should still exist
      const row2 = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId2);
      expect(row2).toBeDefined();
    });

    test('should not remove valid states', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-valid');

      const context = handler.startMonitoring('test', 'w1', 'ticket-valid', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-valid',
        query: 'test',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);

      // Cleanup (should not affect valid state)
      handler.cleanupExpiredStates();

      const row = db.prepare('SELECT * FROM grace_period_states WHERE id = ?').get(stateId);
      expect(row).toBeDefined();
    });
  });

  describe('UT-GPH-011: getStatistics() - Analytics', () => {
    test('should return statistics for last 7 days', () => {
      const stats = handler.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeDefined();
      expect(stats.choices).toBeDefined();
      expect(stats.choices.continue).toBeDefined();
      expect(stats.choices.pause).toBeDefined();
      expect(stats.choices.simplify).toBeDefined();
      expect(stats.choices.cancel).toBeDefined();
      expect(stats.resumed).toBeDefined();
      expect(stats.period).toBe('7 days');
    });

    test('should count user choices correctly', () => {
      // Create multiple states with different choices
      const choices = ['continue', 'pause', 'simplify', 'cancel', 'continue'];

      choices.forEach((choice, index) => {
        const ticketId = `ticket-stats-${index}`;
        db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run(ticketId);

        const context = handler.startMonitoring('test', `w${index}`, ticketId, 240000);
        const state = {
          workerId: `w${index}`,
          ticketId,
          query: 'test',
          messagesCollected: 10,
          chunksProcessed: 20,
          timeElapsed: 150000,
          timestamp: new Date().toISOString(),
          partialMessages: []
        };

        const stateId = handler.persistState(state, [], context);
        handler.recordUserChoice(stateId, choice);
      });

      const stats = handler.getStatistics();

      expect(stats.total).toBe(5);
      expect(stats.choices.continue).toBe(2);
      expect(stats.choices.pause).toBe(1);
      expect(stats.choices.simplify).toBe(1);
      expect(stats.choices.cancel).toBe(1);
    });

    test('should count resumed states', () => {
      db.prepare('INSERT INTO work_queue_tickets (id) VALUES (?)').run('ticket-resume-stats');

      const context = handler.startMonitoring('test', 'w1', 'ticket-resume-stats', 240000);
      const state = {
        workerId: 'w1',
        ticketId: 'ticket-resume-stats',
        query: 'test',
        messagesCollected: 10,
        chunksProcessed: 20,
        timeElapsed: 150000,
        timestamp: new Date().toISOString(),
        partialMessages: []
      };

      const stateId = handler.persistState(state, [], context);
      handler.recordUserChoice(stateId, 'pause');
      handler.resumeFromState(stateId);

      const stats = handler.getStatistics();

      expect(stats.resumed).toBeGreaterThan(0);
    });
  });
});
