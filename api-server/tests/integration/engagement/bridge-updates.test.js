/**
 * Integration Tests for Bridge Update Service
 * Tests automatic bridge updates based on user actions
 *
 * Test Requirements (from SPARC):
 * - 4 integration tests for bridge updates
 * - Test all event types (post_created, comment_created, onboarding_response, agent_mentioned)
 * - Verify bridge state changes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../../services/engagement/hemingway-bridge-service.js';
import { createBridgePriorityService } from '../../../services/engagement/bridge-priority-service.js';
import { createBridgeUpdateService } from '../../../services/engagement/bridge-update-service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';

describe('BridgeUpdateService - Integration Tests', () => {
  let db;
  let bridgeService;
  let priorityService;
  let updateService;
  let testUserId;
  const testDbPath = `/tmp/test-bridge-updates-${randomUUID()}.db`;

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

    testUserId = `test-user-${randomUUID()}`;
    db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run(testUserId, 'Test User');
    db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(testUserId);

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
   * Integration Test 1: Post Created Action
   */
  it('should update bridge when user creates a post', () => {
    const postId = randomUUID();

    // Create initial bridge
    const initialBridge = bridgeService.createBridge({
      userId: testUserId,
      type: 'question',
      content: 'Test question',
      priority: 4
    });

    expect(initialBridge.bridge_type).toBe('question');

    // Trigger post_created action
    const updatedBridge = updateService.updateBridgeOnUserAction(testUserId, 'post_created', {
      postId,
      content: 'My first post'
    });

    expect(updatedBridge).toBeDefined();
    expect(updatedBridge.bridge_type).toBe('continue_thread');
    expect(updatedBridge.priority).toBe(1);
    expect(updatedBridge.post_id).toBe(postId);
    expect(updatedBridge.content).toContain('live');

    // Verify old question bridge was deactivated
    const oldBridge = bridgeService.getBridgeById(initialBridge.id);
    expect(oldBridge.active).toBe(0);
  });

  /**
   * Integration Test 2: Comment Created Action
   */
  it('should update bridge when user creates a comment', () => {
    const postId = randomUUID();
    const commentId = randomUUID();

    // Trigger comment_created action
    const bridge = updateService.updateBridgeOnUserAction(testUserId, 'comment_created', {
      commentId,
      postId
    });

    expect(bridge).toBeDefined();
    expect(bridge.bridge_type).toBe('continue_thread');
    expect(bridge.priority).toBe(1);
    expect(bridge.post_id).toBe(postId);
    expect(bridge.content).toContain('Comment posted');
  });

  /**
   * Integration Test 3: Agent Mentioned Action
   */
  it('should update bridge when user mentions an agent', () => {
    const postId = randomUUID();
    const agentId = 'personal-todos-agent';
    const agentName = 'Personal Todos';

    // Trigger agent_mentioned action
    const bridge = updateService.updateBridgeOnUserAction(testUserId, 'agent_mentioned', {
      agentId,
      agentName,
      postId
    });

    expect(bridge).toBeDefined();
    expect(bridge.bridge_type).toBe('continue_thread');
    expect(bridge.priority).toBe(1);
    expect(bridge.post_id).toBe(postId);
    expect(bridge.agent_id).toBe(agentId);
    expect(bridge.content).toContain(`@${agentName}`);

    // Verify interaction count was incremented
    // First, record the introduction
    updateService.recordAgentIntroduction(testUserId, agentId, randomUUID());

    // Mention again
    updateService.updateBridgeOnUserAction(testUserId, 'agent_mentioned', {
      agentId,
      agentName,
      postId
    });

    // Check that interaction was tracked
    const intro = db.prepare(`
      SELECT interaction_count FROM agent_introductions
      WHERE user_id = ? AND agent_id = ?
    `).get(testUserId, agentId);

    expect(intro).toBeDefined();
    expect(intro.interaction_count).toBeGreaterThan(0);
  });

  /**
   * Integration Test 4: Contextual Agent Introduction Trigger
   */
  it('should trigger contextual agent introduction on URL in post', () => {
    const postId = randomUUID();

    // Post with URL should trigger link-logger introduction
    updateService.updateBridgeOnUserAction(testUserId, 'post_created', {
      postId,
      content: 'Check out https://example.com for more info'
    });

    // Should have created a new_feature bridge for link-logger
    const bridges = bridgeService.getAllActiveBridges(testUserId);
    const introductionBridge = bridges.find(b =>
      b.bridge_type === 'new_feature' &&
      b.agent_id === 'link-logger-agent'
    );

    expect(introductionBridge).toBeDefined();
    expect(introductionBridge.action).toBe('introduce_agent');
  });

  /**
   * Integration Test 5: Recalculate Bridge
   */
  it('should recalculate bridge based on current user state', () => {
    // Create an old bridge
    const oldBridge = bridgeService.createBridge({
      userId: testUserId,
      type: 'question',
      content: 'Old question',
      priority: 4
    });

    // Update onboarding state to trigger priority 2
    db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 0, phase = 1
      WHERE user_id = ?
    `).run(testUserId);

    // Recalculate
    const newBridge = updateService.recalculateBridge(testUserId);

    expect(newBridge).toBeDefined();
    expect(newBridge.bridge_type).toBe('next_step');
    expect(newBridge.priority).toBe(2);

    // Old bridge should be deactivated
    const oldBridgeUpdated = bridgeService.getBridgeById(oldBridge.id);
    expect(oldBridgeUpdated.active).toBe(0);
  });

  /**
   * Integration Test 6: Bridge Always Exists (AC-5)
   */
  it('should ensure at least one bridge always exists', () => {
    // Clear all bridges
    bridgeService.clearAllBridges(testUserId);

    // Verify no active bridges
    let count = bridgeService.countActiveBridges(testUserId);
    expect(count).toBe(0);

    // Ensure bridge exists
    const bridge = updateService.ensureBridgeExists(testUserId);

    expect(bridge).toBeDefined();
    expect(bridge.active).toBe(1);

    // Verify count is now 1
    count = bridgeService.countActiveBridges(testUserId);
    expect(count).toBe(1);
  });

  /**
   * Integration Test 7: Agent Introduction Recording
   */
  it('should record agent introductions correctly', () => {
    const agentId = 'personal-todos-agent';
    const postId = randomUUID();

    // Record introduction
    updateService.recordAgentIntroduction(testUserId, agentId, postId);

    // Verify recorded
    expect(priorityService.isAgentIntroduced(testUserId, agentId)).toBe(true);

    // Get introduction details
    const intro = db.prepare(`
      SELECT * FROM agent_introductions
      WHERE user_id = ? AND agent_id = ?
    `).get(testUserId, agentId);

    expect(intro).toBeDefined();
    expect(intro.post_id).toBe(postId);
    expect(intro.interaction_count).toBe(0);
  });

  /**
   * Integration Test 8: Onboarding State Updates
   */
  it('should update onboarding state correctly', () => {
    const responses = {
      name: 'John Doe',
      useCase: 'personal productivity'
    };

    updateService.updateOnboardingState(testUserId, {
      phase: 2,
      step: 'comm_style',
      phase1_completed: 1,
      phase1_completed_at: Math.floor(Date.now() / 1000),
      responses
    });

    const state = priorityService.getOnboardingState(testUserId);

    expect(state).toBeDefined();
    expect(state.phase).toBe(2);
    expect(state.step).toBe('comm_style');
    expect(state.phase1_completed).toBe(1);
    expect(state.responses).toEqual(responses);
  });
});
