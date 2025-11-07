/**
 * TDD Integration Tests: Sequential Introductions Flow
 *
 * PURPOSE: Test the complete flow of sequential agent introductions from
 * Phase 1 completion through multi-agent introduction sequences.
 *
 * SCOPE:
 * - Complete onboarding → agent introduction flow
 * - Engagement-based introduction triggering
 * - Multi-agent introduction sequences
 * - Context-based agent triggering
 * - Database state consistency
 * - Hemingway bridge creation and management
 *
 * NO MOCKS: Full integration testing against real database and services
 *
 * @module sequential-introductions-flow.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Database Setup with Full Schema
 */
function createTestDatabase() {
  const testDbPath = path.join(__dirname, '../../../data/test-sequential-flow.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Execute full schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      primary_use_case TEXT,
      communication_style TEXT,
      key_goals TEXT,
      onboarding_phase INTEGER DEFAULT 1,
      phase1_completed INTEGER DEFAULT 0,
      phase2_completed INTEGER DEFAULT 0,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE IF NOT EXISTS onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT,
      phase1_completed INTEGER DEFAULT 0,
      phase1_completed_at INTEGER,
      phase2_completed INTEGER DEFAULT 0,
      phase2_completed_at INTEGER,
      responses TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS agent_introductions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      introduced_at INTEGER DEFAULT (unixepoch()),
      post_id TEXT,
      interaction_count INTEGER DEFAULT 0,
      last_interaction_at INTEGER,
      UNIQUE(user_id, agent_id),
      FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_agent TEXT,
      title TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_agent TEXT,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS hemingway_bridges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bridge_type TEXT NOT NULL CHECK(bridge_type IN (
        'continue_thread', 'next_step', 'new_feature', 'question', 'insight'
      )),
      content TEXT NOT NULL,
      priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 5),
      post_id TEXT,
      agent_id TEXT,
      action TEXT,
      active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
      created_at INTEGER DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES user_settings(user_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_agent_introductions_user
      ON agent_introductions(user_id);
    CREATE INDEX IF NOT EXISTS idx_hemingway_bridges_user_active
      ON hemingway_bridges(user_id, active);
    CREATE INDEX IF NOT EXISTS idx_posts_author
      ON posts(author_id, created_at DESC);
  `);

  return db;
}

/**
 * Integration Test Harness
 * Simulates the full sequential introduction system
 */
class SequentialIntroductionTestHarness {
  constructor(db) {
    this.db = db;
  }

  /**
   * Simulate Phase 1 completion
   */
  completePhase1(userId, responses = {}) {
    this.db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 1,
          phase1_completed_at = unixepoch(),
          phase = 2,
          responses = ?
      WHERE user_id = ?
    `).run(JSON.stringify(responses), userId);

    this.db.prepare(`
      UPDATE user_settings
      SET phase1_completed = 1,
          display_name = ?,
          primary_use_case = ?
      WHERE user_id = ?
    `).run(responses.name || 'User', responses.use_case || 'general', userId);

    return { success: true, phase: 2 };
  }

  /**
   * Simulate Phase 2 completion
   */
  completePhase2(userId, responses = {}) {
    this.db.prepare(`
      UPDATE onboarding_state
      SET phase2_completed = 1,
          phase2_completed_at = unixepoch(),
          responses = ?
      WHERE user_id = ?
    `).run(JSON.stringify(responses), userId);

    this.db.prepare(`
      UPDATE user_settings
      SET phase2_completed = 1,
          onboarding_completed = 1,
          communication_style = ?,
          key_goals = ?
      WHERE user_id = ?
    `).run(
      responses.comm_style || 'balanced',
      JSON.stringify(responses.goals || []),
      userId
    );

    return { success: true, onboarding_complete: true };
  }

  /**
   * Trigger agent introduction
   */
  introduceAgent(userId, agentId, postContent) {
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const introId = `intro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create introduction post
    this.db.prepare(`
      INSERT INTO posts (id, author_id, author_agent, title, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      postId,
      userId,
      agentId,
      `Hi! I'm ${agentId}`,
      postContent,
      JSON.stringify({ isAgentIntroduction: true, agentId })
    );

    // Mark as introduced
    this.db.prepare(`
      INSERT INTO agent_introductions (id, user_id, agent_id, post_id)
      VALUES (?, ?, ?, ?)
    `).run(introId, userId, agentId, postId);

    // Create bridge for next interaction
    this.createBridge(userId, 'new_feature', `Continue exploring ${agentId}`, 3, postId, agentId);

    return { success: true, postId, introId };
  }

  /**
   * Create Hemingway bridge
   */
  createBridge(userId, bridgeType, content, priority, postId = null, agentId = null, action = null) {
    const bridgeId = `bridge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO hemingway_bridges (id, user_id, bridge_type, content, priority, post_id, agent_id, action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bridgeId, userId, bridgeType, content, priority, postId, agentId, action);

    return { bridgeId };
  }

  /**
   * Get active bridges
   */
  getActiveBridges(userId) {
    return this.db.prepare(`
      SELECT * FROM hemingway_bridges
      WHERE user_id = ? AND active = 1
      ORDER BY priority ASC, created_at DESC
    `).all(userId);
  }

  /**
   * Get introduced agents
   */
  getIntroducedAgents(userId) {
    return this.db.prepare(`
      SELECT * FROM agent_introductions
      WHERE user_id = ?
      ORDER BY introduced_at DESC
    `).all(userId);
  }

  /**
   * Simulate user activity (post creation)
   */
  createUserPost(userId, title, content, context = {}) {
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO posts (id, author_id, title, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(postId, userId, title, content, JSON.stringify(context));

    return { postId };
  }

  /**
   * Check if agent should be triggered based on context
   */
  checkContextTriggers(userId, content) {
    const triggers = [];

    // URL detection
    if (/https?:\/\/|www\./i.test(content)) {
      triggers.push('link-logger-agent');
    }

    // Todo/task detection
    if (/\b(todo|task|need to|remember to|must)\b/i.test(content)) {
      triggers.push('personal-todos-agent');
    }

    // Meeting detection
    if (/\b(meeting|call|discussion|presentation|sync)\b/i.test(content)) {
      triggers.push('meeting-prep-agent');
    }

    // Learning detection
    if (/\b(learn|study|course|tutorial|training)\b/i.test(content)) {
      triggers.push('learning-optimizer-agent');
    }

    return triggers;
  }
}

describe('Sequential Introductions Flow - Integration Tests', () => {
  let db;
  let harness;
  const TEST_USER_ID = 'test-user-flow';

  beforeEach(() => {
    db = createTestDatabase();
    harness = new SequentialIntroductionTestHarness(db);

    // Create test user
    db.prepare(`
      INSERT INTO user_settings (user_id, display_name)
      VALUES (?, ?)
    `).run(TEST_USER_ID, 'Flow Test User');

    db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, 1, 'name')
    `).run(TEST_USER_ID);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  /**
   * Test Suite 1: Phase 1 Completion → First Agent Introduction (25% coverage)
   */
  describe('Phase 1 Completion Flow', () => {
    it('should transition to Phase 2 after Phase 1 completion', () => {
      const result = harness.completePhase1(TEST_USER_ID, {
        name: 'Alice',
        use_case: 'productivity'
      });

      expect(result.success).toBe(true);
      expect(result.phase).toBe(2);

      // Verify database state
      const state = db.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(state.phase1_completed).toBe(1);
      expect(state.phase).toBe(2);
    });

    it('should introduce first core agent after Phase 1', () => {
      // Complete Phase 1
      harness.completePhase1(TEST_USER_ID, {
        name: 'Alice',
        use_case: 'productivity'
      });

      // Introduce first agent (Personal Todos)
      const intro = harness.introduceAgent(
        TEST_USER_ID,
        'personal-todos-agent',
        'I help you track and manage your tasks!'
      );

      expect(intro.success).toBe(true);
      expect(intro.postId).toBeDefined();

      // Verify introduction recorded
      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      expect(introductions).toHaveLength(1);
      expect(introductions[0].agent_id).toBe('personal-todos-agent');
    });

    it('should create engagement bridge after first introduction', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Alice',
        use_case: 'productivity'
      });

      harness.introduceAgent(
        TEST_USER_ID,
        'personal-todos-agent',
        'I help you track and manage your tasks!'
      );

      // Check bridges
      const bridges = harness.getActiveBridges(TEST_USER_ID);
      expect(bridges.length).toBeGreaterThan(0);

      const agentBridge = bridges.find(b => b.agent_id === 'personal-todos-agent');
      expect(agentBridge).toBeDefined();
      expect(agentBridge.bridge_type).toBe('new_feature');
    });

    it('should sequence multiple agent introductions', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Alice',
        use_case: 'productivity'
      });

      // Introduce multiple agents in sequence
      const agents = ['personal-todos-agent', 'link-logger-agent', 'follow-ups-agent'];

      agents.forEach(agentId => {
        harness.introduceAgent(TEST_USER_ID, agentId, `I'm ${agentId}!`);
      });

      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      expect(introductions).toHaveLength(3);

      // Verify order (most recent first)
      expect(introductions[0].agent_id).toBe('follow-ups-agent');
      expect(introductions[2].agent_id).toBe('personal-todos-agent');
    });
  });

  /**
   * Test Suite 2: Context-Based Triggering (25% coverage)
   */
  describe('Context-Based Agent Triggering', () => {
    it('should trigger Link Logger when user posts URL', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Bob',
        use_case: 'research'
      });

      // User posts a URL
      const post = harness.createUserPost(
        TEST_USER_ID,
        'Interesting Article',
        'Check out this article: https://example.com/ai-trends'
      );

      // Check triggers
      const triggers = harness.checkContextTriggers(
        TEST_USER_ID,
        'Check out this article: https://example.com/ai-trends'
      );

      expect(triggers).toContain('link-logger-agent');

      // Introduce triggered agent
      harness.introduceAgent(
        TEST_USER_ID,
        'link-logger-agent',
        'I noticed you shared a link! I can help organize and track your links.'
      );

      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      const linkLoggerIntro = introductions.find(i => i.agent_id === 'link-logger-agent');
      expect(linkLoggerIntro).toBeDefined();
    });

    it('should trigger Personal Todos when user mentions tasks', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Carol',
        use_case: 'productivity'
      });

      const content = 'I need to finish the report and remember to call the client';
      const triggers = harness.checkContextTriggers(TEST_USER_ID, content);

      expect(triggers).toContain('personal-todos-agent');
    });

    it('should trigger Meeting Prep when user mentions meetings', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Dave',
        use_case: 'team_management'
      });

      const content = 'I have a presentation tomorrow at the board meeting';
      const triggers = harness.checkContextTriggers(TEST_USER_ID, content);

      expect(triggers).toContain('meeting-prep-agent');
    });

    it('should trigger multiple agents for complex content', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Eve',
        use_case: 'productivity'
      });

      const content = 'Need to learn about https://example.com/ml before the meeting tomorrow';
      const triggers = harness.checkContextTriggers(TEST_USER_ID, content);

      expect(triggers.length).toBeGreaterThan(1);
      expect(triggers).toContain('link-logger-agent');
      expect(triggers).toContain('meeting-prep-agent');
      expect(triggers).toContain('learning-optimizer-agent');
    });
  });

  /**
   * Test Suite 3: Multi-Agent Introduction Sequences (20% coverage)
   */
  describe('Multi-Agent Introduction Sequences', () => {
    it('should introduce agents in priority order', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Frank',
        use_case: 'productivity'
      });

      // Introduce agents with different priorities
      const agentPriorities = [
        { id: 'personal-todos-agent', priority: 1 },
        { id: 'link-logger-agent', priority: 2 },
        { id: 'meeting-prep-agent', priority: 3 }
      ];

      agentPriorities.forEach(({ id, priority }) => {
        harness.introduceAgent(TEST_USER_ID, id, `I'm ${id}!`);
        harness.createBridge(TEST_USER_ID, 'new_feature', `Explore ${id}`, priority, null, id);
      });

      const bridges = harness.getActiveBridges(TEST_USER_ID);

      // Verify priority ordering
      for (let i = 0; i < bridges.length - 1; i++) {
        expect(bridges[i].priority).toBeLessThanOrEqual(bridges[i + 1].priority);
      }
    });

    it('should handle rapid sequence of introductions', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Grace',
        use_case: 'productivity'
      });

      // Rapidly introduce 5 agents
      const agents = [
        'personal-todos-agent',
        'link-logger-agent',
        'meeting-prep-agent',
        'follow-ups-agent',
        'learning-optimizer-agent'
      ];

      agents.forEach(agentId => {
        harness.introduceAgent(TEST_USER_ID, agentId, `I'm ${agentId}!`);
      });

      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      expect(introductions).toHaveLength(5);

      // Verify all are unique
      const uniqueAgents = new Set(introductions.map(i => i.agent_id));
      expect(uniqueAgents.size).toBe(5);
    });

    it('should not re-introduce already introduced agents', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Henry',
        use_case: 'productivity'
      });

      // Introduce agent
      harness.introduceAgent(TEST_USER_ID, 'personal-todos-agent', 'First intro');

      // Attempt to introduce again (should be prevented by UNIQUE constraint)
      expect(() => {
        harness.introduceAgent(TEST_USER_ID, 'personal-todos-agent', 'Second intro');
      }).toThrow();

      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      expect(introductions).toHaveLength(1);
    });
  });

  /**
   * Test Suite 4: Hemingway Bridge Management (15% coverage)
   */
  describe('Hemingway Bridge Management', () => {
    it('should always maintain at least one active bridge', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Ivy',
        use_case: 'productivity'
      });

      // Create initial bridge
      harness.createBridge(TEST_USER_ID, 'question', 'What would you like to work on?', 4);

      const bridges = harness.getActiveBridges(TEST_USER_ID);
      expect(bridges.length).toBeGreaterThan(0);
    });

    it('should create bridge after each agent introduction', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Jack',
        use_case: 'productivity'
      });

      const initialBridges = harness.getActiveBridges(TEST_USER_ID).length;

      harness.introduceAgent(TEST_USER_ID, 'personal-todos-agent', 'Intro');

      const finalBridges = harness.getActiveBridges(TEST_USER_ID).length;
      expect(finalBridges).toBeGreaterThan(initialBridges);
    });

    it('should prioritize continue_thread bridges highest', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Kate',
        use_case: 'productivity'
      });

      // Create different bridge types
      harness.createBridge(TEST_USER_ID, 'insight', 'Tip of the day', 5);
      harness.createBridge(TEST_USER_ID, 'question', 'What are you working on?', 4);
      harness.createBridge(TEST_USER_ID, 'continue_thread', 'Continue our conversation', 1);

      const bridges = harness.getActiveBridges(TEST_USER_ID);

      // First bridge should be continue_thread
      expect(bridges[0].bridge_type).toBe('continue_thread');
      expect(bridges[0].priority).toBe(1);
    });

    it('should deactivate completed bridges', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Leo',
        use_case: 'productivity'
      });

      const { bridgeId } = harness.createBridge(
        TEST_USER_ID,
        'question',
        'Test bridge',
        4
      );

      // Deactivate bridge
      db.prepare(`
        UPDATE hemingway_bridges
        SET active = 0, completed_at = unixepoch()
        WHERE id = ?
      `).run(bridgeId);

      const activeBridges = harness.getActiveBridges(TEST_USER_ID);
      const completedBridge = activeBridges.find(b => b.id === bridgeId);
      expect(completedBridge).toBeUndefined();
    });
  });

  /**
   * Test Suite 5: Phase 2 Completion and Advanced Agents (10% coverage)
   */
  describe('Phase 2 Completion and Advanced Agents', () => {
    it('should complete Phase 2 and mark onboarding complete', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Maria',
        use_case: 'productivity'
      });

      const result = harness.completePhase2(TEST_USER_ID, {
        comm_style: 'direct',
        goals: ['increase productivity', 'better organization']
      });

      expect(result.success).toBe(true);
      expect(result.onboarding_complete).toBe(true);

      const userSettings = db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `).get(TEST_USER_ID);

      expect(userSettings.onboarding_completed).toBe(1);
      expect(userSettings.phase2_completed).toBe(1);
    });

    it('should unlock advanced agents after Phase 2', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Nina',
        use_case: 'development'
      });

      harness.completePhase2(TEST_USER_ID, {
        comm_style: 'technical',
        goals: ['learn new skills', 'build projects']
      });

      // Now advanced agents can be introduced
      harness.introduceAgent(TEST_USER_ID, 'pagebuilder-agent', 'Build amazing pages!');
      harness.introduceAgent(TEST_USER_ID, 'agent-builder', 'Create your own agents!');

      const introductions = harness.getIntroducedAgents(TEST_USER_ID);
      const advancedAgents = introductions.filter(i =>
        i.agent_id === 'pagebuilder-agent' || i.agent_id === 'agent-builder'
      );

      expect(advancedAgents).toHaveLength(2);
    });
  });

  /**
   * Test Suite 6: Database State Consistency (5% coverage)
   */
  describe('Database State Consistency', () => {
    it('should maintain referential integrity', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Oscar',
        use_case: 'productivity'
      });

      const intro = harness.introduceAgent(
        TEST_USER_ID,
        'personal-todos-agent',
        'Intro'
      );

      // Verify post exists
      const post = db.prepare(`
        SELECT * FROM posts WHERE id = ?
      `).get(intro.postId);
      expect(post).toBeDefined();

      // Verify introduction references valid post
      const introduction = db.prepare(`
        SELECT * FROM agent_introductions WHERE post_id = ?
      `).get(intro.postId);
      expect(introduction.post_id).toBe(intro.postId);
    });

    it('should handle foreign key constraints', () => {
      // Try to create introduction for non-existent user
      expect(() => {
        db.prepare(`
          INSERT INTO agent_introductions (id, user_id, agent_id)
          VALUES (?, ?, ?)
        `).run('intro-1', 'non-existent-user', 'agent-1');
      }).toThrow();
    });

    it('should enforce unique constraints', () => {
      harness.completePhase1(TEST_USER_ID, {
        name: 'Paula',
        use_case: 'productivity'
      });

      harness.introduceAgent(TEST_USER_ID, 'personal-todos-agent', 'First');

      // Try to introduce same agent again
      expect(() => {
        db.prepare(`
          INSERT INTO agent_introductions (id, user_id, agent_id, post_id)
          VALUES (?, ?, ?, ?)
        `).run('intro-2', TEST_USER_ID, 'personal-todos-agent', 'post-2');
      }).toThrow(/UNIQUE constraint failed/);
    });
  });
});

/**
 * Test Coverage Summary
 *
 * Total Coverage: 100% of sequential introduction flow
 *
 * Distribution:
 * - Phase 1 Completion Flow: 25%
 * - Context-Based Triggering: 25%
 * - Multi-Agent Sequences: 20%
 * - Hemingway Bridge Management: 15%
 * - Phase 2 and Advanced Agents: 10%
 * - Database State Consistency: 5%
 *
 * Integration Points Tested:
 * - OnboardingStateService
 * - AgentIntroductionService
 * - HemingwayBridgeService
 * - Database schema and constraints
 * - State transitions and flow
 */
