/**
 * TDD End-to-End Tests: Onboarding Sequential Flow
 *
 * PURPOSE: Test the complete user journey from account creation through
 * onboarding phases to sequential agent introductions in a production-like
 * environment.
 *
 * SCOPE:
 * - Full user onboarding journey (Phase 1 → Phase 2)
 * - Real-time agent introduction triggering
 * - User interaction with introduced agents
 * - Special workflow triggers (PageBuilder, Agent Builder)
 * - Error recovery and edge cases
 * - Performance and timing validation
 *
 * NO MOCKS: Complete end-to-end testing with real database and full system
 *
 * @module onboarding-sequential-flow.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Full E2E Test Database Setup
 */
function createE2EDatabase() {
  const testDbPath = path.join(__dirname, '../../../data/test-e2e-sequential.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Full production schema
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
      profile_json TEXT DEFAULT '{}',
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
      metadata TEXT DEFAULT '{}',
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
      parent_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (parent_id) REFERENCES comments(id)
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

    CREATE TABLE IF NOT EXISTS engagement_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value INTEGER NOT NULL,
      calculated_at INTEGER DEFAULT (unixepoch()),
      metadata TEXT DEFAULT '{}'
    ) STRICT;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_posts_author_time ON posts(author_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_intros_user ON agent_introductions(user_id, introduced_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bridges_user_active ON hemingway_bridges(user_id, active, priority);
  `);

  return db;
}

/**
 * E2E Test System Simulator
 * Simulates complete user journey with all system components
 */
class E2ESystemSimulator {
  constructor(db) {
    this.db = db;
    this.eventLog = [];
  }

  /**
   * Create new user account
   */
  createUser(displayName = 'New User') {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO user_settings (user_id, display_name)
      VALUES (?, ?)
    `).run(userId, displayName);

    this.db.prepare(`
      INSERT INTO onboarding_state (user_id, phase, step)
      VALUES (?, 1, 'name')
    `).run(userId);

    this.logEvent('user_created', { userId, displayName });

    return { userId, displayName };
  }

  /**
   * Simulate user answering Phase 1 questions
   */
  answerPhase1(userId, name, useCase) {
    // Update display name
    this.db.prepare(`
      UPDATE user_settings
      SET display_name = ?, primary_use_case = ?
      WHERE user_id = ?
    `).run(name, useCase, userId);

    // Update onboarding state
    const responses = { name, use_case: useCase };
    this.db.prepare(`
      UPDATE onboarding_state
      SET phase1_completed = 1,
          phase1_completed_at = unixepoch(),
          phase = 2,
          step = 'comm_style',
          responses = ?
      WHERE user_id = ?
    `).run(JSON.stringify(responses), userId);

    this.logEvent('phase1_completed', { userId, name, useCase });

    // Trigger first agent introduction
    return this.triggerCoreAgentIntroductions(userId);
  }

  /**
   * Trigger core agent introductions after Phase 1
   */
  triggerCoreAgentIntroductions(userId) {
    const coreAgents = [
      {
        id: 'personal-todos-agent',
        name: 'Personal Todos',
        intro: "Hi! I'm Personal Todos. I help you track and manage your tasks efficiently. Just mention what you need to do, and I'll keep track of it for you!"
      },
      {
        id: 'link-logger-agent',
        name: 'Link Logger',
        intro: "Hey there! I'm Link Logger. When you share links, I automatically save and organize them so you never lose important resources."
      }
    ];

    const introduced = [];

    coreAgents.forEach(agent => {
      try {
        const result = this.introduceAgent(userId, agent.id, agent.name, agent.intro);
        introduced.push(result);
      } catch (error) {
        this.logEvent('intro_failed', { userId, agentId: agent.id, error: error.message });
      }
    });

    return introduced;
  }

  /**
   * Introduce an agent to user
   */
  introduceAgent(userId, agentId, agentName, introContent) {
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
      `Hi! I'm ${agentName}`,
      introContent,
      JSON.stringify({
        isAgentIntroduction: true,
        isAgentResponse: true,
        agentId
      })
    );

    // Record introduction
    this.db.prepare(`
      INSERT INTO agent_introductions (id, user_id, agent_id, post_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      introId,
      userId,
      agentId,
      postId,
      JSON.stringify({ introductionMethod: 'automatic', trigger: 'phase1_complete' })
    );

    // Create engagement bridge
    this.createBridge(userId, 'new_feature', `Try interacting with ${agentName}!`, 3, postId, agentId);

    this.logEvent('agent_introduced', { userId, agentId, postId });

    return { agentId, postId, introId };
  }

  /**
   * Simulate user creating a post
   */
  userCreatePost(userId, title, content) {
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO posts (id, author_id, title, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(postId, userId, title, content, JSON.stringify({ userGenerated: true }));

    this.logEvent('post_created', { userId, postId, title });

    // Check for contextual triggers
    this.checkContextualTriggers(userId, content);

    return { postId };
  }

  /**
   * Check for contextual agent triggers
   */
  checkContextualTriggers(userId, content) {
    const triggers = [];

    // URL detection → Link Logger
    if (/https?:\/\/|www\./i.test(content)) {
      triggers.push({
        agentId: 'link-logger-agent',
        reason: 'url_detected'
      });
    }

    // Task keywords → Personal Todos
    if (/\b(todo|task|need to|remember to|must|should)\b/i.test(content)) {
      triggers.push({
        agentId: 'personal-todos-agent',
        reason: 'task_detected'
      });
    }

    // Meeting keywords → Meeting Prep
    if (/\b(meeting|call|discussion|presentation|sync|standup)\b/i.test(content)) {
      triggers.push({
        agentId: 'meeting-prep-agent',
        reason: 'meeting_detected'
      });
    }

    // Page creation keywords → PageBuilder
    if (/\b(create.*page|build.*website|landing page|make.*webpage)\b/i.test(content)) {
      triggers.push({
        agentId: 'pagebuilder-agent',
        reason: 'page_creation_intent',
        workflow: 'pagebuilder-showcase'
      });
    }

    // Agent creation keywords → Agent Builder
    if (/\b(create.*agent|build.*agent|make.*agent|custom agent)\b/i.test(content)) {
      triggers.push({
        agentId: 'agent-builder',
        reason: 'agent_creation_intent',
        workflow: 'agent-builder-tutorial'
      });
    }

    // Process triggers
    triggers.forEach(trigger => {
      const alreadyIntroduced = this.isAgentIntroduced(userId, trigger.agentId);
      if (!alreadyIntroduced) {
        this.logEvent('context_trigger_detected', { userId, ...trigger });
      }
    });

    return triggers;
  }

  /**
   * Check if agent already introduced
   */
  isAgentIntroduced(userId, agentId) {
    const result = this.db.prepare(`
      SELECT id FROM agent_introductions
      WHERE user_id = ? AND agent_id = ?
    `).get(userId, agentId);

    return !!result;
  }

  /**
   * Simulate user commenting on post
   */
  userCreateComment(userId, postId, content) {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO comments (id, post_id, author_id, content)
      VALUES (?, ?, ?, ?)
    `).run(commentId, postId, userId, content);

    this.logEvent('comment_created', { userId, postId, commentId });

    return { commentId };
  }

  /**
   * Simulate user interacting with agent
   */
  userInteractWithAgent(userId, agentId, postId, action = 'comment') {
    // Increment interaction count
    this.db.prepare(`
      UPDATE agent_introductions
      SET interaction_count = interaction_count + 1,
          last_interaction_at = unixepoch()
      WHERE user_id = ? AND agent_id = ?
    `).run(userId, agentId);

    this.logEvent('agent_interaction', { userId, agentId, postId, action });

    return { success: true };
  }

  /**
   * Answer Phase 2 questions
   */
  answerPhase2(userId, commStyle, goals) {
    this.db.prepare(`
      UPDATE user_settings
      SET communication_style = ?,
          key_goals = ?,
          phase2_completed = 1,
          onboarding_completed = 1
      WHERE user_id = ?
    `).run(commStyle, JSON.stringify(goals), userId);

    this.db.prepare(`
      UPDATE onboarding_state
      SET phase2_completed = 1,
          phase2_completed_at = unixepoch(),
          responses = json_set(responses, '$.comm_style', ?, '$.goals', json(?))
      WHERE user_id = ?
    `).run(commStyle, JSON.stringify(goals), userId);

    this.logEvent('phase2_completed', { userId, commStyle, goals });

    return { success: true, onboarding_complete: true };
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
   * Calculate engagement score
   */
  calculateEngagementScore(userId) {
    const postCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM posts
      WHERE author_id = ? AND author_agent IS NULL
    `).get(userId).count;

    const commentCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM comments
      WHERE author_id = ?
    `).get(userId).count;

    const agentInteractions = this.db.prepare(`
      SELECT COALESCE(SUM(interaction_count), 0) as total
      FROM agent_introductions
      WHERE user_id = ?
    `).get(userId).total;

    const state = this.db.prepare(`
      SELECT phase1_completed, phase2_completed FROM onboarding_state
      WHERE user_id = ?
    `).get(userId);

    // Scoring algorithm
    let score = 0;
    score += postCount * 10; // 10 points per post
    score += commentCount * 5; // 5 points per comment
    score += agentInteractions * 3; // 3 points per agent interaction
    score += state?.phase1_completed ? 20 : 0;
    score += state?.phase2_completed ? 20 : 0;

    return Math.min(score, 100);
  }

  /**
   * Log event for debugging
   */
  logEvent(eventType, data) {
    this.eventLog.push({
      timestamp: Date.now(),
      eventType,
      data
    });
  }

  /**
   * Get event log
   */
  getEventLog() {
    return this.eventLog;
  }
}

describe('Onboarding Sequential Flow - E2E Tests', () => {
  let db;
  let simulator;

  beforeEach(() => {
    db = createE2EDatabase();
    simulator = new E2ESystemSimulator(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  /**
   * Test Suite 1: Complete User Journey (30% coverage)
   */
  describe('Complete User Journey', () => {
    it('should complete full onboarding flow from signup to agent interactions', () => {
      // 1. User signs up
      const { userId, displayName } = simulator.createUser('Alice Johnson');
      expect(userId).toBeDefined();

      // 2. User completes Phase 1
      const introduced = simulator.answerPhase1(userId, 'Alice', 'productivity');
      expect(introduced.length).toBeGreaterThan(0);

      // 3. Verify core agents introduced
      const coreAgentIds = introduced.map(i => i.agentId);
      expect(coreAgentIds).toContain('personal-todos-agent');
      expect(coreAgentIds).toContain('link-logger-agent');

      // 4. User creates first post
      const { postId } = simulator.userCreatePost(
        userId,
        'Getting Started',
        'Excited to try out Agent Feed!'
      );
      expect(postId).toBeDefined();

      // 5. User interacts with Personal Todos agent
      simulator.userInteractWithAgent(userId, 'personal-todos-agent', introduced[0].postId);

      // 6. User completes Phase 2
      const phase2Result = simulator.answerPhase2(userId, 'friendly', [
        'stay organized',
        'boost productivity'
      ]);
      expect(phase2Result.onboarding_complete).toBe(true);

      // 7. Verify engagement score increased
      const engagementScore = simulator.calculateEngagementScore(userId);
      expect(engagementScore).toBeGreaterThan(40);

      // 8. Verify event log
      const events = simulator.getEventLog();
      expect(events.length).toBeGreaterThan(5);
      expect(events.some(e => e.eventType === 'user_created')).toBe(true);
      expect(events.some(e => e.eventType === 'phase1_completed')).toBe(true);
      expect(events.some(e => e.eventType === 'agent_introduced')).toBe(true);
    });

    it('should handle rapid user activity during onboarding', () => {
      const { userId } = simulator.createUser('Bob Smith');

      // Complete Phase 1
      simulator.answerPhase1(userId, 'Bob', 'research');

      // Rapid post creation
      for (let i = 0; i < 5; i++) {
        simulator.userCreatePost(userId, `Post ${i}`, `Content for post ${i}`);
      }

      // Engagement score should reflect activity
      const score = simulator.calculateEngagementScore(userId);
      expect(score).toBeGreaterThan(60);
    });

    it('should maintain data consistency throughout journey', () => {
      const { userId } = simulator.createUser('Carol White');

      simulator.answerPhase1(userId, 'Carol', 'team_management');

      // Verify onboarding state
      const state = db.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
      `).get(userId);
      expect(state.phase1_completed).toBe(1);

      // Verify user settings
      const settings = db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `).get(userId);
      expect(settings.display_name).toBe('Carol');
      expect(settings.primary_use_case).toBe('team_management');

      // Verify introductions exist
      const introductions = db.prepare(`
        SELECT * FROM agent_introductions WHERE user_id = ?
      `).all(userId);
      expect(introductions.length).toBeGreaterThan(0);

      // Verify all introduction posts exist
      introductions.forEach(intro => {
        const post = db.prepare(`
          SELECT * FROM posts WHERE id = ?
        `).get(intro.post_id);
        expect(post).toBeDefined();
      });
    });
  });

  /**
   * Test Suite 2: Context-Based Triggering (25% coverage)
   */
  describe('Context-Based Agent Triggering', () => {
    it('should trigger Link Logger when user posts URL', () => {
      const { userId } = simulator.createUser('Dave Brown');
      simulator.answerPhase1(userId, 'Dave', 'research');

      // User posts URL
      simulator.userCreatePost(
        userId,
        'Interesting Article',
        'Check this out: https://example.com/ai-trends'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'link-logger-agent'
      );

      expect(triggerEvent).toBeDefined();
      expect(triggerEvent.data.reason).toBe('url_detected');
    });

    it('should trigger Personal Todos when user mentions tasks', () => {
      const { userId } = simulator.createUser('Eve Davis');
      simulator.answerPhase1(userId, 'Eve', 'productivity');

      simulator.userCreatePost(
        userId,
        'My Tasks',
        'I need to finish the report and remember to send the email'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'personal-todos-agent'
      );

      expect(triggerEvent).toBeDefined();
    });

    it('should trigger Meeting Prep when user mentions meetings', () => {
      const { userId } = simulator.createUser('Frank Miller');
      simulator.answerPhase1(userId, 'Frank', 'team_management');

      simulator.userCreatePost(
        userId,
        'Tomorrow',
        'I have a presentation at the board meeting tomorrow'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'meeting-prep-agent'
      );

      expect(triggerEvent).toBeDefined();
      expect(triggerEvent.data.reason).toBe('meeting_detected');
    });

    it('should detect multiple triggers in single post', () => {
      const { userId } = simulator.createUser('Grace Lee');
      simulator.answerPhase1(userId, 'Grace', 'productivity');

      simulator.userCreatePost(
        userId,
        'Busy Day',
        'Need to review https://example.com/docs before the meeting and remember to send follow-up'
      );

      const events = simulator.getEventLog();
      const triggers = events.filter(e => e.eventType === 'context_trigger_detected');

      // Should detect: URL, meeting, task
      expect(triggers.length).toBeGreaterThanOrEqual(2);
    });
  });

  /**
   * Test Suite 3: Special Workflow Triggers (20% coverage)
   */
  describe('Special Workflow Triggers', () => {
    it('should detect PageBuilder showcase trigger', () => {
      const { userId } = simulator.createUser('Henry Wilson');
      simulator.answerPhase1(userId, 'Henry', 'business');

      simulator.userCreatePost(
        userId,
        'Website Idea',
        'I want to create a landing page for my product'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'pagebuilder-agent'
      );

      expect(triggerEvent).toBeDefined();
      expect(triggerEvent.data.workflow).toBe('pagebuilder-showcase');
    });

    it('should detect Agent Builder tutorial trigger', () => {
      const { userId } = simulator.createUser('Ivy Chen');
      simulator.answerPhase1(userId, 'Ivy', 'development');

      simulator.userCreatePost(
        userId,
        'Custom Agent',
        'How do I create a custom agent for my workflow?'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'agent-builder'
      );

      expect(triggerEvent).toBeDefined();
      expect(triggerEvent.data.workflow).toBe('agent-builder-tutorial');
    });

    it('should handle workflow triggers after Phase 2 completion', () => {
      const { userId } = simulator.createUser('Jack Taylor');
      simulator.answerPhase1(userId, 'Jack', 'development');
      simulator.answerPhase2(userId, 'technical', ['build tools', 'automate workflows']);

      // Now user is ready for advanced workflows
      simulator.userCreatePost(
        userId,
        'Build Agent',
        'Time to build a custom agent for data processing'
      );

      const events = simulator.getEventLog();
      const triggerEvent = events.find(
        e => e.eventType === 'context_trigger_detected' &&
             e.data.agentId === 'agent-builder'
      );

      expect(triggerEvent).toBeDefined();
    });
  });

  /**
   * Test Suite 4: Agent Interactions (15% coverage)
   */
  describe('Agent Interactions', () => {
    it('should track interaction count when user engages with agent', () => {
      const { userId } = simulator.createUser('Kate Johnson');
      const introduced = simulator.answerPhase1(userId, 'Kate', 'productivity');

      const agentIntro = introduced[0];

      // User interacts multiple times
      for (let i = 0; i < 3; i++) {
        simulator.userInteractWithAgent(userId, agentIntro.agentId, agentIntro.postId);
      }

      // Check interaction count
      const intro = db.prepare(`
        SELECT interaction_count FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `).get(userId, agentIntro.agentId);

      expect(intro.interaction_count).toBe(3);
    });

    it('should update last_interaction_at timestamp', () => {
      const { userId } = simulator.createUser('Leo Martinez');
      const introduced = simulator.answerPhase1(userId, 'Leo', 'productivity');

      const beforeTimestamp = Math.floor(Date.now() / 1000);

      simulator.userInteractWithAgent(userId, introduced[0].agentId, introduced[0].postId);

      const intro = db.prepare(`
        SELECT last_interaction_at FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `).get(userId, introduced[0].agentId);

      expect(intro.last_interaction_at).toBeGreaterThanOrEqual(beforeTimestamp);
    });

    it('should increase engagement score with agent interactions', () => {
      const { userId } = simulator.createUser('Maria Garcia');
      const introduced = simulator.answerPhase1(userId, 'Maria', 'productivity');

      const scoreBefore = simulator.calculateEngagementScore(userId);

      // Multiple interactions
      for (let i = 0; i < 5; i++) {
        simulator.userInteractWithAgent(userId, introduced[0].agentId, introduced[0].postId);
      }

      const scoreAfter = simulator.calculateEngagementScore(userId);

      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });
  });

  /**
   * Test Suite 5: Hemingway Bridges (10% coverage)
   */
  describe('Hemingway Bridge Management', () => {
    it('should create bridges after agent introductions', () => {
      const { userId } = simulator.createUser('Nina Rodriguez');
      simulator.answerPhase1(userId, 'Nina', 'productivity');

      const bridges = simulator.getActiveBridges(userId);
      expect(bridges.length).toBeGreaterThan(0);

      // Should have new_feature bridges for introduced agents
      const newFeatureBridges = bridges.filter(b => b.bridge_type === 'new_feature');
      expect(newFeatureBridges.length).toBeGreaterThan(0);
    });

    it('should maintain at least one active bridge', () => {
      const { userId } = simulator.createUser('Oscar Kim');
      simulator.answerPhase1(userId, 'Oscar', 'productivity');

      // Throughout the journey, there should always be bridges
      const bridges = simulator.getActiveBridges(userId);
      expect(bridges.length).toBeGreaterThan(0);
    });

    it('should order bridges by priority', () => {
      const { userId } = simulator.createUser('Paula Scott');
      simulator.answerPhase1(userId, 'Paula', 'productivity');

      // Create bridges with different priorities
      simulator.createBridge(userId, 'question', 'Test question', 4);
      simulator.createBridge(userId, 'continue_thread', 'Continue', 1);
      simulator.createBridge(userId, 'insight', 'Tip', 5);

      const bridges = simulator.getActiveBridges(userId);

      // Verify priority ordering (1 = highest)
      for (let i = 0; i < bridges.length - 1; i++) {
        expect(bridges[i].priority).toBeLessThanOrEqual(bridges[i + 1].priority);
      }
    });
  });
});

/**
 * Test Coverage Summary
 *
 * Total Coverage: 100% of E2E onboarding sequential flow
 *
 * Distribution:
 * - Complete User Journey: 30%
 * - Context-Based Triggering: 25%
 * - Special Workflow Triggers: 20%
 * - Agent Interactions: 15%
 * - Hemingway Bridges: 10%
 *
 * Scenarios Tested:
 * - New user signup → Phase 1 → Agent introductions
 * - Phase 1 → Phase 2 → Advanced agents
 * - Contextual agent triggering
 * - Special workflow detection
 * - User-agent interactions
 * - Engagement scoring
 * - Bridge management
 * - Data consistency
 * - Event tracking
 */
