/**
 * Unit Tests: Bridge Priority Service - Completed Onboarding State
 *
 * CRITICAL REQUIREMENT:
 * When phase1_completed=1 AND phase2_completed=1, the Priority Service
 * MUST NEVER return onboarding-related bridges (Priority 2).
 *
 * This test suite uses REAL database with actual onboarding_state.
 * NO MOCKS - validates complete system behavior.
 *
 * Test Coverage:
 * 1. checkNextStep() returns null when phase1_completed=1
 * 2. calculatePriority() skips to Priority 3+ when onboarding complete
 * 3. Never returns onboarding content when phases complete
 * 4. Falls back to engaging questions (Priority 4)
 * 5. Waterfall logic excludes Priority 2 when complete
 * 6. Edge cases: both phases complete, partial completion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createHemingwayBridgeService } from '../../services/engagement/hemingway-bridge-service.js';
import { createBridgePriorityService } from '../../services/engagement/bridge-priority-service.js';
import { randomUUID } from 'crypto';
import fs from 'fs';

describe('BridgePriorityService - Completed Onboarding State (NO ONBOARDING BRIDGES)', () => {
  let db;
  let bridgeService;
  let priorityService;
  let testUserId;
  const testDbPath = `/tmp/test-bridge-completed-${randomUUID()}.db`;

  beforeEach(() => {
    // Create a fresh test database with real schema
    db = new Database(testDbPath);

    // Create base tables FIRST
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        onboarding_completed INTEGER DEFAULT 0
      ) STRICT;

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
    `);

    // Load actual migrations to get real schema
    const migrationSql = fs.readFileSync(
      '/workspaces/agent-feed/api-server/db/migrations/012-hemingway-bridges.sql',
      'utf8'
    );
    db.exec(migrationSql);

    // Create test user with completed onboarding
    testUserId = `test-user-completed-${randomUUID()}`;
    db.prepare('INSERT INTO user_settings (user_id, display_name, onboarding_completed) VALUES (?, ?, 1)')
      .run(testUserId, 'Completed User');

    // Initialize onboarding state with Phase 1 COMPLETED
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO onboarding_state (
        user_id,
        phase,
        step,
        phase1_completed,
        phase1_completed_at,
        phase2_completed,
        phase2_completed_at,
        responses
      ) VALUES (?, ?, NULL, 1, ?, 0, NULL, ?)
    `).run(testUserId, 1, now - 86400, '{"name":"Test","useCase":"testing"}');

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
   * TEST 1: checkNextStep() returns null when phase1_completed=1
   *
   * CRITICAL: When Phase 1 is complete, checkNextStep() should NOT
   * return onboarding bridges UNLESS Phase 1 was completed > 1 day ago
   * (which triggers Phase 2).
   */
  it('should return NULL from checkNextStep() when Phase 1 just completed', () => {
    // Phase 1 completed 1 hour ago (recent)
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(oneHourAgo, testUserId);

    const nextStepBridge = priorityService.checkNextStep(testUserId);

    // Should be NULL because Phase 1 is complete and < 1 day ago
    expect(nextStepBridge).toBeNull();
  });

  /**
   * TEST 2: calculatePriority() skips Priority 2 when Phase 1 complete
   *
   * When Phase 1 is complete (recently), calculatePriority() should
   * skip Priority 2 (next_step) and jump to Priority 3 (new_feature)
   * or Priority 4 (question).
   */
  it('should skip Priority 2 and jump to Priority 3+ when onboarding complete', () => {
    // Phase 1 completed 2 hours ago (recent, no Phase 2 trigger)
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(twoHoursAgo, testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should NOT be Priority 1 (no recent interaction)
    expect(bridge.priority).not.toBe(1);

    // Should NOT be Priority 2 (onboarding complete)
    expect(bridge.priority).not.toBe(2);
    expect(bridge.type).not.toBe('next_step');

    // Should be Priority 3 (new_feature) or Priority 4 (question)
    expect(bridge.priority).toBeGreaterThanOrEqual(3);
    expect(['new_feature', 'question', 'insight']).toContain(bridge.type);
  });

  /**
   * TEST 3: Never returns onboarding content when Phase 1 complete
   *
   * Comprehensive check: No bridge returned should contain onboarding
   * language or references when Phase 1 is complete.
   */
  it('should NEVER return onboarding-related content when Phase 1 complete', () => {
    // Phase 1 completed 3 hours ago
    const threeHoursAgo = Math.floor(Date.now() / 1000) - 10800;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(threeHoursAgo, testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Check content doesn't reference onboarding
    const onboardingKeywords = [
      'onboarding',
      'finish getting to know you',
      'complete your setup',
      'getting started',
      'setup questions'
    ];

    const contentLower = bridge.content.toLowerCase();
    onboardingKeywords.forEach(keyword => {
      expect(contentLower).not.toContain(keyword);
    });

    // Agent should NOT be get-to-know-you-agent
    expect(bridge.agentId).not.toBe('get-to-know-you-agent');
  });

  /**
   * TEST 4: Falls back to engaging questions (Priority 4) when complete
   *
   * When onboarding is complete and no agents need introduction,
   * system should fall back to Priority 4 (engaging questions).
   */
  it('should fall back to Priority 4 (questions) when onboarding complete and all agents introduced', () => {
    // Phase 1 completed 5 hours ago
    const fiveHoursAgo = Math.floor(Date.now() / 1000) - 18000;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(fiveHoursAgo, testUserId);

    // Mark ALL core agents as introduced (skip Priority 3)
    const coreAgents = ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'];
    coreAgents.forEach(agentId => {
      db.prepare(`
        INSERT INTO agent_introductions (id, user_id, agent_id, introduced_at)
        VALUES (?, ?, ?, unixepoch())
      `).run(randomUUID(), testUserId, agentId);
    });

    const bridge = priorityService.calculatePriority(testUserId);

    // Should be Priority 4 (question) or Priority 5 (insight)
    expect(bridge.priority).toBeGreaterThanOrEqual(4);
    expect(['question', 'insight']).toContain(bridge.type);

    // Should contain engaging language
    const engagingPhrases = ['mind', 'accomplish', 'help', 'working on'];
    const hasEngagingPhrase = engagingPhrases.some(phrase =>
      bridge.content.toLowerCase().includes(phrase)
    );
    expect(hasEngagingPhrase).toBe(true);
  });

  /**
   * TEST 5: Waterfall logic excludes Priority 2 when complete
   *
   * When getting the complete priority waterfall, Priority 2 should
   * NOT appear in the list when onboarding is complete.
   */
  it('should exclude Priority 2 from waterfall when Phase 1 complete', () => {
    // Phase 1 completed 4 hours ago
    const fourHoursAgo = Math.floor(Date.now() / 1000) - 14400;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(fourHoursAgo, testUserId);

    const waterfall = priorityService.getPriorityWaterfall(testUserId);

    // Check that NO Priority 2 bridge exists
    const hasPriority2 = waterfall.some(bridge => bridge.priority === 2);
    expect(hasPriority2).toBe(false);

    // Check that NO next_step type exists
    const hasNextStep = waterfall.some(bridge => bridge.type === 'next_step');
    expect(hasNextStep).toBe(false);

    // Should have Priority 3, 4, or 5
    const validPriorities = waterfall.map(b => b.priority);
    expect(validPriorities.every(p => p >= 3)).toBe(true);
  });

  /**
   * TEST 6: Both phases complete - no onboarding bridges at all
   *
   * When both Phase 1 AND Phase 2 are complete, absolutely NO
   * onboarding-related bridges should ever be returned.
   */
  it('should NEVER return onboarding bridges when BOTH phases complete', () => {
    const tenDaysAgo = Math.floor(Date.now() / 1000) - 864000;
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 604800;

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 1,
        phase2_completed_at = ?,
        phase = 2
      WHERE user_id = ?
    `).run(tenDaysAgo, sevenDaysAgo, testUserId);

    // Test calculatePriority
    const bridge = priorityService.calculatePriority(testUserId);
    expect(bridge.priority).not.toBe(2);
    expect(bridge.type).not.toBe('next_step');
    expect(bridge.agentId).not.toBe('get-to-know-you-agent');

    // Test checkNextStep directly
    const nextStep = priorityService.checkNextStep(testUserId);
    expect(nextStep).toBeNull();

    // Test full waterfall
    const waterfall = priorityService.getPriorityWaterfall(testUserId);
    const hasOnboarding = waterfall.some(b =>
      b.type === 'next_step' ||
      b.priority === 2 ||
      b.agentId === 'get-to-know-you-agent'
    );
    expect(hasOnboarding).toBe(false);
  });

  /**
   * TEST 7: Edge case - Phase 1 complete MORE than 24 hours ago
   *
   * Tests the boundary condition: Phase 1 completed more than 1 day ago
   * should trigger Phase 2 (Priority 2 with trigger_phase2 action).
   * Note: Implementation uses `<` so exactly 1 day doesn't trigger.
   */
  it('should trigger Phase 2 when Phase 1 completed more than 1 day ago', () => {
    const moreThanOneDayAgo = Math.floor(Date.now() / 1000) - 86401; // 1 day + 1 second

    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(moreThanOneDayAgo, testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should return Priority 2 with Phase 2 trigger
    expect(bridge.priority).toBe(2);
    expect(bridge.type).toBe('next_step');
    expect(bridge.action).toBe('trigger_phase2');
    expect(bridge.content).toContain('complete your setup');
  });

  /**
   * TEST 8: Partial completion - Phase 1 incomplete should show onboarding
   *
   * Validates that onboarding bridges ARE returned when Phase 1
   * is NOT complete (control test).
   */
  it('should return onboarding bridge when Phase 1 is NOT complete', () => {
    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 0,
        phase1_completed_at = NULL,
        phase2_completed = 0,
        phase = 1,
        step = 'name'
      WHERE user_id = ?
    `).run(testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should return Priority 2 (onboarding)
    expect(bridge.priority).toBe(2);
    expect(bridge.type).toBe('next_step');
    expect(bridge.agentId).toBe('get-to-know-you-agent');
    expect(bridge.content).toContain('finish getting to know you');
  });

  /**
   * TEST 9: No onboarding state record - should not crash
   *
   * Edge case: User has no onboarding_state record.
   * System should handle gracefully without returning onboarding bridges.
   */
  it('should handle missing onboarding_state gracefully', () => {
    // Delete onboarding state
    db.prepare('DELETE FROM onboarding_state WHERE user_id = ?').run(testUserId);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should not crash and should skip Priority 2
    expect(bridge).toBeDefined();
    expect(bridge.priority).not.toBe(2);
    expect(bridge.type).not.toBe('next_step');
  });

  /**
   * TEST 10: Recent interaction trumps completed onboarding
   *
   * When user has recent activity (Priority 1), that should take
   * precedence over any onboarding state.
   */
  it('should prioritize recent interaction over onboarding state', () => {
    // Phase 1 complete
    const fiveHoursAgo = Math.floor(Date.now() / 1000) - 18000;
    db.prepare(`
      UPDATE onboarding_state
      SET
        phase1_completed = 1,
        phase1_completed_at = ?,
        phase2_completed = 0
      WHERE user_id = ?
    `).run(fiveHoursAgo, testUserId);

    // Create recent comment (30 minutes ago)
    const postId = randomUUID();
    const commentId = randomUUID();
    const recentTimestamp = new Date(Date.now() - 1800000).toISOString();

    db.prepare(`
      INSERT INTO comments (id, post_id, author, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(commentId, postId, testUserId, 'Recent comment', recentTimestamp);

    const bridge = priorityService.calculatePriority(testUserId);

    // Should prioritize recent interaction
    expect(bridge.priority).toBe(1);
    expect(bridge.type).toBe('continue_thread');
    expect(bridge.postId).toBe(postId);
  });
});
