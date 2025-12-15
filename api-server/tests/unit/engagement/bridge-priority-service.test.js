/**
 * Unit Tests for Bridge Priority Service
 * Tests the priority waterfall logic for Hemingway bridges
 *
 * Test Requirements (from SPARC):
 * - 8 unit tests for priority calculation
 * - Test all 5 priority levels
 * - Test waterfall logic
 * - Test edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../../services/engagement/hemingway-bridge-service.js';
import { createBridgePriorityService } from '../../../services/engagement/bridge-priority-service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';

describe('BridgePriorityService - Priority Waterfall Logic', () => {
  let db;
  let bridgeService;
  let priorityService;
  let testUserId;
  const testDbPath = `/tmp/test-bridges-${randomUUID()}.db`;

  beforeEach(() => {
    // Create a fresh test database
    db = new Database(testDbPath);

    // Create test user settings FIRST
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        onboarding_completed INTEGER DEFAULT 0
      ) STRICT;

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      ) STRICT;
    `);

    // Run migrations AFTER user_settings exists
    const migrationSql = fs.readFileSync(
      '/workspaces/agent-feed/api-server/db/migrations/012-hemingway-bridges.sql',
      'utf8'
    );
    db.exec(migrationSql);

    testUserId = `test-user-${randomUUID()}`;
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(testUserId, 'Test User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(testUserId);

    // Initialize services
    bridgeService = createHemingwayBridgeService(db);
    priorityService = createBridgePriorityService(db, bridgeService);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  /**
   * Test 1: Priority 1 - Last Interaction (Recent Comment)
   */
  it('should return priority 1 bridge for recent user interaction', () => {
    // Create a recent comment (< 1 hour ago)
    const postId = randomUUID();
    const commentId = randomUUID();
    const recentTimestamp = Math.floor(Date.now() / 1000) - 1800; // 30 minutes ago

    db.prepare(`
      INSERT INTO comments (id, post_id, author_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, postId, testUserId, 'Test comment', recentTimestamp);

    const bridge = priorityService.calculatePriority(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.type).toBe('continue_thread');
    expect(bridge.priority).toBe(1);
    expect(bridge.postId).toBe(postId);
    expect(bridge.content).toContain('recent');
  });

  /**
   * Test 2: Priority 2 - Next Step (Phase 1 Incomplete)
   */
  it('should return priority 2 bridge for incomplete Phase 1 onboarding', () => {
    // User has not completed Phase 1
    db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 0, phase = 1, step = 'name'
      WHERE user_id = ?
    `).run(testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.type).toBe('next_step');
    expect(bridge.priority).toBe(2);
    expect(bridge.agentId).toBe('get-to-know-you-agent');
    expect(bridge.content).toContain('finish getting to know you');
  });

  /**
   * Test 3: Priority 2 - Next Step (Phase 1 Complete, Phase 2 Pending)
   */
  it('should return priority 2 bridge for Phase 2 trigger after 1 day', () => {
    // Phase 1 completed over 1 day ago
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 172800;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0,
        phase = 1
      WHERE user_id = ?
    `).run(twoDaysAgo, testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.type).toBe('next_step');
    expect(bridge.priority).toBe(2);
    expect(bridge.action).toBe('trigger_phase2');
    expect(bridge.content).toContain('complete your setup');
  });

  /**
   * Test 4: Priority 3 - New Feature (Core Agent Not Introduced)
   */
  it('should return priority 3 bridge for unintroduced core agent', () => {
    // Phase 1 completed recently (so no Phase 2 trigger)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(oneHourAgo, testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.type).toBe('new_feature');
    expect(bridge.priority).toBe(3);
    expect(bridge.agentId).toMatch(/(personal-todos-agent|agent-ideas-agent|link-logger-agent)/);
    expect(bridge.action).toBe('introduce_agent');
  });

  /**
   * Test 5: Priority 4 - Engaging Question (No Higher Priority)
   */
  it('should return priority 4 bridge when all core agents introduced', () => {
    // Phase 1 completed recently (so no Phase 2 trigger)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(oneHourAgo, testUserId);

    // Mark all core agents as introduced
    const coreAgents = ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'];
    coreAgents.forEach(agentId => {
      db.prepare(`
        INSERT INTO agent_introductions (id, user_id, agent_id, introduced_at)
        VALUES (?, ?, ?, unixepoch())
      `).run(randomUUID(), testUserId, agentId);
    });

    const bridge = priorityService.calculatePriority(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.type).toBe('question');
    expect(bridge.priority).toBe(4);
    expect(bridge.content).toContain('mind');
  });

  /**
   * Test 6: Priority 5 - Valuable Insight (Always Available Fallback)
   */
  it('should return priority 5 bridge as ultimate fallback', () => {
    const insight = priorityService.getValuableInsight(testUserId);

    expect(insight).toBeDefined();
    expect(insight.type).toBe('insight');
    expect(insight.priority).toBe(5);
    expect(insight.content).toBeTruthy();
    expect(insight.content.length).toBeGreaterThan(10);
  });

  /**
   * Test 7: Complete Waterfall (All Priorities)
   */
  it('should return complete priority waterfall with all levels', () => {
    // Set up state for multiple priority levels
    db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 0
      WHERE user_id = ?
    `).run(testUserId);

    const waterfall = priorityService.getPriorityWaterfall(testUserId);

    expect(waterfall).toBeDefined();
    expect(Array.isArray(waterfall)).toBe(true);
    expect(waterfall.length).toBeGreaterThan(0);

    // Should always have at least priority 5 (insight)
    const hasPriority5 = waterfall.some(b => b.priority === 5);
    expect(hasPriority5).toBe(true);

    // Should be sorted by priority
    const priorities = waterfall.map(b => b.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  /**
   * Test 8: Agent Introduction Check
   */
  it('should correctly identify introduced vs non-introduced agents', () => {
    const agentId = 'personal-todos-agent';

    // Initially not introduced
    expect(priorityService.isAgentIntroduced(testUserId, agentId)).toBe(false);

    // Introduce the agent
    db.prepare(`
      INSERT INTO agent_introductions (id, user_id, agent_id, introduced_at)
      VALUES (?, ?, ?, unixepoch())
    `).run(randomUUID(), testUserId, agentId);

    // Now should be introduced
    expect(priorityService.isAgentIntroduced(testUserId, agentId)).toBe(true);
  });

  /**
   * Test 9: Onboarding State Retrieval
   */
  it('should retrieve onboarding state with parsed responses', () => {
    const responses = { name: 'Test User', useCase: 'testing' };

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase = 2,
        step = 'goals',
        phase1_completed = 1,
        responses = ?
      WHERE user_id = ?
    `).run(JSON.stringify(responses), testUserId);

    const state = priorityService.getOnboardingState(testUserId);

    expect(state).toBeDefined();
    expect(state.phase).toBe(2);
    expect(state.step).toBe('goals');
    expect(state.phase1_completed).toBe(1);
    expect(state.responses).toEqual(responses);
  });

  /**
   * Test 10: Old Interaction (> 1 hour) Should Not Trigger Priority 1
   */
  it('should skip priority 1 for old interactions', () => {
    // Create an old comment (> 1 hour ago)
    const postId = randomUUID();
    const commentId = randomUUID();
    const oldTimestamp = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago

    db.prepare(`
      INSERT INTO comments (id, post_id, author_id, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, postId, testUserId, 'Old comment', oldTimestamp);

    // Set up for priority 2
    db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 0
      WHERE user_id = ?
    `).run(testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should skip priority 1 and go to priority 2
    expect(bridge.priority).not.toBe(1);
    expect(bridge.type).toBe('next_step');
  });
});
