/**
 * Integration Tests for Agent Introduction Service
 * Tests agent introduction management and state tracking
 * SPARC TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { AgentIntroductionService } from '../../../services/agents/agent-introduction-service.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('AgentIntroductionService - Introduction Management', () => {
  let db;
  let service;
  const testDbPath = '/tmp/test-agent-intro.db';

  beforeEach(async () => {
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

    // Run migrations for agent introductions
    const migrationPath = path.join(process.cwd(), 'db/migrations/012-onboarding-tables.sql');
    const migration = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration line by line to handle ALTER TABLE statements
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

    service = new AgentIntroductionService(db);
  });

  afterEach(() => {
    db.close();
    try {
      require('fs').unlinkSync(testDbPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  });

  it('should mark agent as introduced for a user', () => {
    const result = service.markAgentIntroduced('test-user-1', 'personal-todos-agent', 'post-123');

    expect(result.success).toBe(true);
    expect(result.agentId).toBe('personal-todos-agent');
  });

  it('should retrieve list of introduced agents for a user', () => {
    service.markAgentIntroduced('test-user-1', 'personal-todos-agent', 'post-1');
    service.markAgentIntroduced('test-user-1', 'link-logger-agent', 'post-2');

    const introduced = service.getIntroducedAgents('test-user-1');

    expect(introduced).toHaveLength(2);
    expect(introduced.map(a => a.agent_id)).toContain('personal-todos-agent');
    expect(introduced.map(a => a.agent_id)).toContain('link-logger-agent');
  });

  it('should check if specific agent has been introduced', () => {
    service.markAgentIntroduced('test-user-1', 'personal-todos-agent', 'post-1');

    const isIntroduced = service.isAgentIntroduced('test-user-1', 'personal-todos-agent');
    const notIntroduced = service.isAgentIntroduced('test-user-1', 'meeting-prep-agent');

    expect(isIntroduced).toBe(true);
    expect(notIntroduced).toBe(false);
  });

  it('should get pending agent introductions based on trigger rules', async () => {
    // Core agents should be pending after Phase 1
    const pending = await service.getPendingIntroductions('test-user-1', true); // Phase 1 completed

    expect(pending).toBeInstanceOf(Array);
    expect(pending.map(a => a.agentId)).toContain('personal-todos-agent');
    expect(pending.map(a => a.agentId)).toContain('link-logger-agent');
  });

  it('should not return already introduced agents as pending', async () => {
    service.markAgentIntroduced('test-user-1', 'personal-todos-agent', 'post-1');

    const pending = await service.getPendingIntroductions('test-user-1', true);

    expect(pending.map(a => a.agentId)).not.toContain('personal-todos-agent');
  });

  it('should increment interaction count when user interacts with agent', () => {
    service.markAgentIntroduced('test-user-1', 'personal-todos-agent', 'post-1');

    service.incrementInteractionCount('test-user-1', 'personal-todos-agent');
    service.incrementInteractionCount('test-user-1', 'personal-todos-agent');

    const introduced = service.getIntroducedAgents('test-user-1');
    const agent = introduced.find(a => a.agent_id === 'personal-todos-agent');

    expect(agent.interaction_count).toBe(2);
  });
});
