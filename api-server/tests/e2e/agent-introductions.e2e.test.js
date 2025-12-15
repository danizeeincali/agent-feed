/**
 * E2E Tests for Agent Introduction System
 * Tests complete contextual introduction flow
 * SPARC TDD: End-to-end validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { AgentIntroductionService } from '../../services/agents/agent-introduction-service.js';
import { AgentTriggerService } from '../../services/agents/agent-trigger-service.js';
import { AgentContentGenerator } from '../../services/agents/agent-content-generator.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Agent Introduction E2E Flow', () => {
  let db;
  let introService;
  let triggerService;
  let contentGenerator;
  const testDbPath = '/tmp/test-agent-intro-e2e.db';
  const testUserId = 'e2e-test-user';

  beforeAll(async () => {
    // Create test database
    db = new Database(testDbPath);

    // First create user_settings table (prerequisite for migration 012)
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        display_name_style TEXT,
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        onboarding_completed_at INTEGER,
        profile_json TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      ) STRICT;
    `);

    // Run migrations
    const migrationPath = path.join(process.cwd(), 'db/migrations/012-onboarding-tables.sql');
    const migration = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration line by line to handle PRAGMA and CREATE statements
    const statements = migration.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          db.exec(stmt);
        } catch (e) {
          // Ignore errors from ALTER TABLE if columns already exist
          if (!e.message.includes('duplicate column name')) {
            console.warn('Migration statement warning:', e.message);
          }
        }
      }
    }

    // Initialize services
    introService = new AgentIntroductionService(db);
    triggerService = new AgentTriggerService();
    contentGenerator = new AgentContentGenerator();
  });

  afterAll(() => {
    db.close();
    try {
      require('fs').unlinkSync(testDbPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  it('E2E: Complete contextual introduction flow', async () => {
    // Step 1: User creates post with URL
    const userPost = 'Check out this interesting article: https://example.com/article';

    // Step 2: Detect triggers
    const triggers = triggerService.detectTriggers(userPost);
    expect(triggers).toContain('link-logger-agent');

    // Step 3: Filter already introduced agents (should be none initially)
    const introduced = introService.getIntroducedAgents(testUserId);
    expect(introduced).toHaveLength(0);

    const filteredTriggers = triggerService.filterIntroducedAgents(
      triggers,
      introduced.map(a => a.agent_id)
    );
    expect(filteredTriggers).toContain('link-logger-agent');

    // Step 4: Load agent config
    const agentConfig = await triggerService.loadAgentConfig('link-logger-agent');
    expect(agentConfig).toBeDefined();
    expect(agentConfig.agentId).toBe('link-logger-agent');

    // Step 5: Generate introduction post
    const introPost = contentGenerator.generateIntroPost(agentConfig, testUserId);
    expect(introPost.title).toContain('Link Logger');
    expect(introPost.content).toContain('save');
    expect(introPost.isAgentResponse).toBe(true);

    // Step 6: Mark agent as introduced
    const result = introService.markAgentIntroduced(
      testUserId,
      'link-logger-agent',
      introPost.id
    );
    expect(result.success).toBe(true);

    // Step 7: Verify agent is now introduced
    const isIntroduced = introService.isAgentIntroduced(testUserId, 'link-logger-agent');
    expect(isIntroduced).toBe(true);

    // Step 8: Verify no duplicate introduction on same trigger
    const secondTriggers = triggerService.detectTriggers(userPost);
    const secondFiltered = triggerService.filterIntroducedAgents(
      secondTriggers,
      introService.getIntroducedAgents(testUserId).map(a => a.agent_id)
    );
    expect(secondFiltered).not.toContain('link-logger-agent');

    // Step 9: User interacts with agent
    introService.incrementInteractionCount(testUserId, 'link-logger-agent');

    // Step 10: Verify interaction count
    const finalIntroduced = introService.getIntroducedAgents(testUserId);
    const linkLogger = finalIntroduced.find(a => a.agent_id === 'link-logger-agent');
    expect(linkLogger.interaction_count).toBe(1);
  });

  it('E2E: Core agents introduction after Phase 1', async () => {
    const phase1User = 'phase1-user';

    // Step 1: Check pending introductions before Phase 1
    const pendingBefore = await introService.getPendingIntroductions(phase1User, false);
    const coreAgentsBefore = pendingBefore.filter(a =>
      ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'].includes(a.agentId)
    );
    expect(coreAgentsBefore.length).toBe(0);

    // Step 2: Complete Phase 1
    const pendingAfter = await introService.getPendingIntroductions(phase1User, true);

    // Step 3: Verify core agents are now pending
    const coreAgentsAfter = pendingAfter.filter(a =>
      ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'].includes(a.agentId)
    );
    expect(coreAgentsAfter.length).toBe(3);

    // Step 4: Introduce all core agents
    for (const agentConfig of coreAgentsAfter) {
      const introPost = contentGenerator.generateIntroPost(agentConfig, phase1User);
      introService.markAgentIntroduced(phase1User, agentConfig.agentId, introPost.id);
    }

    // Step 5: Verify all core agents are introduced
    const introduced = introService.getIntroducedAgents(phase1User);
    expect(introduced).toHaveLength(3);

    const introducedIds = introduced.map(a => a.agent_id);
    expect(introducedIds).toContain('personal-todos-agent');
    expect(introducedIds).toContain('agent-ideas-agent');
    expect(introducedIds).toContain('link-logger-agent');
  });

  it('E2E: Multiple contextual triggers in single post', async () => {
    const multiUser = 'multi-trigger-user';
    const complexPost = 'Meeting tomorrow to discuss learning React. Check the agenda: https://agenda.com';

    // Step 1: Detect all triggers
    const triggers = triggerService.detectTriggers(complexPost);

    // Should trigger: meeting-prep, learning-optimizer, link-logger
    expect(triggers).toContain('meeting-prep-agent');
    expect(triggers).toContain('learning-optimizer-agent');
    expect(triggers).toContain('link-logger-agent');
    expect(triggers.length).toBeGreaterThanOrEqual(3);

    // Step 2: Introduce first agent
    const firstAgent = triggers[0];
    const config = await triggerService.loadAgentConfig(firstAgent);
    const introPost = contentGenerator.generateIntroPost(config, multiUser);
    introService.markAgentIntroduced(multiUser, firstAgent, introPost.id);

    // Step 3: Verify only remaining agents are in filtered list
    const introduced = introService.getIntroducedAgents(multiUser);
    const remainingTriggers = triggerService.filterIntroducedAgents(
      triggers,
      introduced.map(a => a.agent_id)
    );
    expect(remainingTriggers).not.toContain(firstAgent);
    expect(remainingTriggers.length).toBe(triggers.length - 1);
  });
});
