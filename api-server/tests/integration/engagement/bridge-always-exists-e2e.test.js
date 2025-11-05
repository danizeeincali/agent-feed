/**
 * E2E Test: Bridges Always Exist
 * Verifies AC-5 from SPARC: "At least 1 bridge active at all times"
 *
 * Test Scenarios:
 * 1. New user → assert bridge exists
 * 2. Complete Phase 1 → assert bridge exists
 * 3. Create post → assert bridge exists
 * 4. No activity → assert bridge exists
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../../services/engagement/hemingway-bridge-service.js';
import { createBridgePriorityService } from '../../../services/engagement/bridge-priority-service.js';
import { createBridgeUpdateService } from '../../../services/engagement/bridge-update-service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';

describe('E2E: Hemingway Bridge Always Exists (AC-5)', () => {
  let db;
  let bridgeService;
  let priorityService;
  let updateService;
  const testDbPath = `/tmp/test-bridge-e2e-${randomUUID()}.db`;

  beforeEach(() => {
    // Create a fresh test database
    db = new Database(testDbPath);

    // Create supporting tables FIRST
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

    // Initialize services
    bridgeService = createHemingwayBridgeService(db);
    priorityService = createBridgePriorityService(db, bridgeService);
    updateService = createBridgeUpdateService(db, bridgeService, priorityService);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  /**
   * E2E Test 1: New User → Bridge Exists
   */
  it('should have at least 1 bridge for a brand new user', () => {
    const newUserId = `new-user-${randomUUID()}`;

    // Create new user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(newUserId, 'New User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(newUserId);

    // Ensure bridge exists
    const bridge = updateService.ensureBridgeExists(newUserId);

    expect(bridge).toBeDefined();
    expect(bridge.active).toBe(1);
    expect(bridge.user_id).toBe(newUserId);

    // Verify count
    const count = bridgeService.countActiveBridges(newUserId);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  /**
   * E2E Test 2: Complete Phase 1 → Bridge Exists
   */
  it('should have at least 1 bridge after completing Phase 1 onboarding', () => {
    const userId = `user-phase1-${randomUUID()}`;

    // Create user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Test User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(userId);

    // Complete Phase 1
    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = unixepoch(),
        phase = 1
      WHERE user_id = ?
    `).run(userId);

    // Recalculate bridge
    const bridge = updateService.recalculateBridge(userId);

    expect(bridge).toBeDefined();
    expect(bridge.active).toBe(1);

    // Should be either new_feature (agent intro) or question
    expect(['new_feature', 'question', 'next_step']).toContain(bridge.bridge_type);

    // Verify count
    const count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  /**
   * E2E Test 3: Create Post → Bridge Exists
   */
  it('should have at least 1 bridge after user creates a post', () => {
    const userId = `user-post-${randomUUID()}`;
    const postId = randomUUID();

    // Create user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Test User');
    db.prepare('INSERT INTO onboarding_state (user_id, phase1_completed) VALUES (?, 1)').run(userId);

    // User creates a post
    const bridge = updateService.updateBridgeOnUserAction(userId, 'post_created', {
      postId,
      content: 'My test post'
    });

    expect(bridge).toBeDefined();
    expect(bridge.active).toBe(1);
    expect(bridge.bridge_type).toBe('continue_thread');
    expect(bridge.post_id).toBe(postId);

    // Verify count
    const count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  /**
   * E2E Test 4: No Activity → Bridge Exists (Fallback)
   */
  it('should have at least 1 bridge even with no user activity', () => {
    const userId = `user-inactive-${randomUUID()}`;

    // Create user with all onboarding complete and all agents introduced
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Inactive User');
    db.prepare(`
      INSERT INTO onboarding_state (
        user_id,
        phase,
        phase1_completed,
        phase2_completed
      ) VALUES (?, 2, 1, 1)
    `).run(userId);

    // Introduce all core agents
    const coreAgents = ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'];
    coreAgents.forEach(agentId => {
      db.prepare(`
        INSERT INTO agent_introductions (id, user_id, agent_id, introduced_at)
        VALUES (?, ?, ?, unixepoch())
      `).run(randomUUID(), userId, agentId);
    });

    // Calculate priority - should fall back to question or insight
    const recommendation = priorityService.calculatePriority(userId);

    expect(recommendation).toBeDefined();
    expect(['question', 'insight']).toContain(recommendation.type);
    expect([4, 5]).toContain(recommendation.priority);

    // Create the bridge
    const bridge = bridgeService.createBridge({
      userId,
      type: recommendation.type,
      content: recommendation.content,
      priority: recommendation.priority
    });

    expect(bridge).toBeDefined();
    expect(bridge.active).toBe(1);

    // Verify count
    const count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  /**
   * E2E Test 5: Bridge Persistence Across Actions
   */
  it('should maintain bridge across multiple user actions', () => {
    const userId = `user-multi-${randomUUID()}`;

    // Create user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Multi Action User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(userId);

    // Action 1: Create post
    const postId1 = randomUUID();
    updateService.updateBridgeOnUserAction(userId, 'post_created', {
      postId: postId1,
      content: 'First post'
    });

    let count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    // Action 2: Create comment
    const commentId = randomUUID();
    updateService.updateBridgeOnUserAction(userId, 'comment_created', {
      commentId,
      postId: postId1
    });

    count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    // Action 3: Mention agent
    updateService.updateBridgeOnUserAction(userId, 'agent_mentioned', {
      agentId: 'personal-todos-agent',
      agentName: 'Personal Todos',
      postId: postId1
    });

    count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    // Action 4: Create another post
    const postId2 = randomUUID();
    updateService.updateBridgeOnUserAction(userId, 'post_created', {
      postId: postId2,
      content: 'Second post'
    });

    count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);

    // Final check: Always at least 1 active bridge
    const activeBridge = bridgeService.getActiveBridge(userId);
    expect(activeBridge).toBeDefined();
    expect(activeBridge.active).toBe(1);
  });

  /**
   * E2E Test 6: Bridge Recovery After Clear
   */
  it('should recover bridge after all bridges are cleared', () => {
    const userId = `user-recovery-${randomUUID()}`;

    // Create user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Recovery User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(userId);

    // Create initial bridge
    bridgeService.createBridge({
      userId,
      type: 'question',
      content: 'Test question',
      priority: 4
    });

    let count = bridgeService.countActiveBridges(userId);
    expect(count).toBe(1);

    // Clear all bridges
    bridgeService.clearAllBridges(userId);

    count = bridgeService.countActiveBridges(userId);
    expect(count).toBe(0);

    // Ensure bridge exists (recovery)
    const recoveredBridge = updateService.ensureBridgeExists(userId);

    expect(recoveredBridge).toBeDefined();
    expect(recoveredBridge.active).toBe(1);

    count = bridgeService.countActiveBridges(userId);
    expect(count).toBe(1);
  });

  /**
   * E2E Test 7: Bridge Priority Waterfall Integrity
   */
  it('should maintain bridge integrity throughout priority waterfall', () => {
    const userId = `user-waterfall-${randomUUID()}`;

    // Create user
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(userId, 'Waterfall User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(userId);

    // Get complete waterfall
    const waterfall = priorityService.getPriorityWaterfall(userId);

    expect(waterfall).toBeDefined();
    expect(Array.isArray(waterfall)).toBe(true);
    expect(waterfall.length).toBeGreaterThan(0);

    // Every item in waterfall should be a valid bridge
    waterfall.forEach(bridge => {
      expect(bridge).toBeDefined();
      expect(bridge.type).toBeTruthy();
      expect(bridge.content).toBeTruthy();
      expect(bridge.priority).toBeGreaterThanOrEqual(1);
      expect(bridge.priority).toBeLessThanOrEqual(5);
    });

    // Create the highest priority bridge
    const topBridge = waterfall[0];
    const createdBridge = bridgeService.createBridge({
      userId,
      type: topBridge.type,
      content: topBridge.content,
      priority: topBridge.priority,
      postId: topBridge.postId,
      agentId: topBridge.agentId,
      action: topBridge.action
    });

    expect(createdBridge).toBeDefined();
    expect(createdBridge.active).toBe(1);

    // Verify at least 1 active bridge
    const count = bridgeService.countActiveBridges(userId);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
