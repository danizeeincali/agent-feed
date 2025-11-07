/**
 * Test Suite: AgentVisibilityService
 * Purpose: TDD test suite for agent visibility and boundaries system
 * Tests system agent hiding, progressive revelation, and exposure tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import AgentVisibilityService from '../../services/agent-visibility-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('AgentVisibilityService - TDD Suite', () => {
  let db;
  let service;
  const TEST_USER_ID = 'test-user-123';
  const DEMO_USER_ID = 'demo-user-123';

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Run migration
    const migrationPath = join(__dirname, '../../db/migrations/016-user-agent-exposure.sql');
    const migration = readFileSync(migrationPath, 'utf8');
    db.exec(migration);

    // Also need user_engagement table from migration 014
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_engagement (
        user_id TEXT PRIMARY KEY,
        total_interactions INTEGER NOT NULL DEFAULT 0,
        posts_created INTEGER NOT NULL DEFAULT 0,
        comments_created INTEGER NOT NULL DEFAULT 0,
        likes_given INTEGER NOT NULL DEFAULT 0,
        posts_read INTEGER NOT NULL DEFAULT 0,
        engagement_score INTEGER NOT NULL DEFAULT 0,
        last_activity_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      ) STRICT;
    `);

    // Initialize service
    service = new AgentVisibilityService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('System Agent Hiding', () => {
    it('should hide system agents (coder, reviewer, tester) from user-facing queries', () => {
      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      // System agents should not be in the list
      const systemAgentIds = visibleAgents.map(a => a.agent_id);
      expect(systemAgentIds).not.toContain('coder');
      expect(systemAgentIds).not.toContain('reviewer');
      expect(systemAgentIds).not.toContain('tester');
      expect(systemAgentIds).not.toContain('debugger');
      expect(systemAgentIds).not.toContain('architect');
    });

    it('should only return agents with visibility=public', () => {
      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      visibleAgents.forEach(agent => {
        expect(agent.visibility).toBe('public');
      });
    });

    it('should return system agents when explicitly requested with includeSystem flag', () => {
      const allAgents = service.getAllAgents({ includeSystem: true });

      const systemAgents = allAgents.filter(a => a.visibility === 'system');
      expect(systemAgents.length).toBeGreaterThan(0);

      const systemAgentIds = systemAgents.map(a => a.agent_id);
      expect(systemAgentIds).toContain('coder');
    });
  });

  describe('Progressive Agent Revelation', () => {
    it('should return only phase 1 agents for new users with no engagement', () => {
      // New user with 0 engagement
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 0)
      `).run(TEST_USER_ID);

      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      // Should only see phase 1 agents
      visibleAgents.forEach(agent => {
        expect(agent.introduction_phase).toBeLessThanOrEqual(1);
      });
    });

    it('should reveal phase 2 agents when user reaches 10 engagement points', () => {
      // User with 15 engagement points
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 15)
      `).run(TEST_USER_ID);

      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      // Should see phase 1 and 2 agents
      const phases = visibleAgents.map(a => a.introduction_phase);
      expect(Math.max(...phases)).toBeGreaterThanOrEqual(2);
    });

    it('should reveal phase 3 agents when user reaches 25 engagement points', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 30)
      `).run(TEST_USER_ID);

      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      const phases = visibleAgents.map(a => a.introduction_phase);
      expect(Math.max(...phases)).toBeGreaterThanOrEqual(3);
    });

    it('should not show agents user has already been exposed to', () => {
      // Mark agent as already introduced
      db.prepare(`
        INSERT INTO user_agent_exposure (id, user_id, agent_id, introduction_method)
        VALUES (?, ?, ?, ?)
      `).run('exp-1', TEST_USER_ID, 'avi', 'welcome');

      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      const agentIds = visibleAgents.map(a => a.agent_id);
      expect(agentIds).not.toContain('avi');
    });
  });

  describe('canIntroduceAgent', () => {
    it('should return true for public agent user hasn\'t seen', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 0)
      `).run(TEST_USER_ID);

      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'avi');
      expect(canIntroduce).toBe(true);
    });

    it('should return false for system agents', () => {
      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'coder');
      expect(canIntroduce).toBe(false);
    });

    it('should return false if user already exposed to agent', () => {
      db.prepare(`
        INSERT INTO user_agent_exposure (id, user_id, agent_id, introduction_method)
        VALUES (?, ?, ?, ?)
      `).run('exp-1', TEST_USER_ID, 'avi', 'welcome');

      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'avi');
      expect(canIntroduce).toBe(false);
    });

    it('should return false if user engagement too low for agent', () => {
      // User with 5 engagement points
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 5)
      `).run(TEST_USER_ID);

      // Agent requires 25 points
      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'learning-optimizer-agent');
      expect(canIntroduce).toBe(false);
    });

    it('should return true if user meets engagement requirement', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 30)
      `).run(TEST_USER_ID);

      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'learning-optimizer-agent');
      expect(canIntroduce).toBe(true);
    });
  });

  describe('recordIntroduction', () => {
    it('should create exposure record when agent introduced', () => {
      service.recordIntroduction(TEST_USER_ID, 'avi', 'welcome', 1);

      const exposure = db.prepare(`
        SELECT * FROM user_agent_exposure
        WHERE user_id = ? AND agent_id = ?
      `).get(TEST_USER_ID, 'avi');

      expect(exposure).toBeDefined();
      expect(exposure.agent_id).toBe('avi');
      expect(exposure.introduction_method).toBe('welcome');
    });

    it('should not allow duplicate exposure records', () => {
      service.recordIntroduction(TEST_USER_ID, 'avi', 'welcome', 1);

      // Try to record again
      expect(() => {
        service.recordIntroduction(TEST_USER_ID, 'avi', 'milestone', 2);
      }).toThrow();
    });

    it('should store session number correctly', () => {
      service.recordIntroduction(TEST_USER_ID, 'avi', 'welcome', 3);

      const exposure = db.prepare(`
        SELECT session_number FROM user_agent_exposure
        WHERE user_id = ? AND agent_id = ?
      `).get(TEST_USER_ID, 'avi');

      expect(exposure.session_number).toBe(3);
    });

    it('should validate introduction_method values', () => {
      expect(() => {
        service.recordIntroduction(TEST_USER_ID, 'avi', 'invalid_method', 1);
      }).toThrow();
    });
  });

  describe('getExposedAgents', () => {
    it('should return empty array for user with no exposures', () => {
      const exposed = service.getExposedAgents(TEST_USER_ID);
      expect(exposed).toEqual([]);
    });

    it('should return all agents user has been exposed to', () => {
      service.recordIntroduction(TEST_USER_ID, 'avi', 'welcome', 1);
      service.recordIntroduction(TEST_USER_ID, 'personal-todos-agent', 'milestone', 2);

      const exposed = service.getExposedAgents(TEST_USER_ID);

      expect(exposed.length).toBe(2);
      const agentIds = exposed.map(e => e.agent_id);
      expect(agentIds).toContain('avi');
      expect(agentIds).toContain('personal-todos-agent');
    });

    it('should order exposures by introduced_at DESC', () => {
      service.recordIntroduction(TEST_USER_ID, 'avi', 'welcome', 1);

      // Wait a bit
      const later = Date.now() + 1000;
      db.prepare(`
        INSERT INTO user_agent_exposure (id, user_id, agent_id, introduction_method, introduced_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('exp-2', TEST_USER_ID, 'personal-todos-agent', 'milestone', Math.floor(later / 1000));

      const exposed = service.getExposedAgents(TEST_USER_ID);

      // Most recent should be first
      expect(exposed[0].agent_id).toBe('personal-todos-agent');
    });
  });

  describe('getIntroductionStatus', () => {
    it('should return current phase and progress for user', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 15)
      `).run(TEST_USER_ID);

      const status = service.getIntroductionStatus(TEST_USER_ID);

      expect(status).toBeDefined();
      expect(status.currentPhase).toBeGreaterThanOrEqual(1);
      expect(status.engagementScore).toBe(15);
      expect(status.exposedCount).toBe(0);
      expect(status.availableCount).toBeGreaterThan(0);
    });

    it('should calculate next milestone correctly', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 5)
      `).run(TEST_USER_ID);

      const status = service.getIntroductionStatus(TEST_USER_ID);

      // Next milestone should be phase 2 at 10 points
      expect(status.nextMilestone).toBeDefined();
      expect(status.nextMilestone.phase).toBe(2);
      expect(status.nextMilestone.requiredScore).toBe(10);
    });

    it('should include list of available agents not yet introduced', () => {
      db.prepare(`
        INSERT INTO user_engagement (user_id, engagement_score)
        VALUES (?, 0)
      `).run(TEST_USER_ID);

      const status = service.getIntroductionStatus(TEST_USER_ID);

      expect(status.availableAgents).toBeDefined();
      expect(Array.isArray(status.availableAgents)).toBe(true);

      // Should only include phase 1 public agents
      status.availableAgents.forEach(agent => {
        expect(agent.visibility).toBe('public');
        expect(agent.introduction_phase).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent agent gracefully', () => {
      const canIntroduce = service.canIntroduceAgent(TEST_USER_ID, 'non-existent-agent');
      expect(canIntroduce).toBe(false);
    });

    it('should handle user with no engagement record', () => {
      // User not in engagement table
      const visibleAgents = service.getVisibleAgents('new-user-456');

      // Should default to phase 1 agents only
      visibleAgents.forEach(agent => {
        expect(agent.introduction_phase).toBeLessThanOrEqual(1);
      });
    });

    it('should not expose admin agents to regular users', () => {
      // Insert an admin agent
      db.prepare(`
        INSERT OR REPLACE INTO agent_metadata
        (agent_id, agent_name, visibility, requires_introduction)
        VALUES (?, ?, ?, ?)
      `).run('admin-agent', 'Admin Agent', 'admin', 0);

      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);

      const agentIds = visibleAgents.map(a => a.agent_id);
      expect(agentIds).not.toContain('admin-agent');
    });
  });

  describe('Integration with Migration 014 (Introduction Queue)', () => {
    it('should work alongside introduction_queue table', () => {
      // This table exists from migration 014
      db.exec(`
        CREATE TABLE IF NOT EXISTS introduction_queue (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          priority INTEGER NOT NULL,
          unlock_threshold INTEGER NOT NULL,
          introduced INTEGER NOT NULL DEFAULT 0,
          introduced_at INTEGER,
          intro_post_id TEXT,
          intro_method TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          UNIQUE(user_id, agent_id)
        ) STRICT;
      `);

      // Add queue entry
      db.prepare(`
        INSERT INTO introduction_queue
        (id, user_id, agent_id, priority, unlock_threshold)
        VALUES (?, ?, ?, ?, ?)
      `).run('queue-1', TEST_USER_ID, 'avi', 1, 0);

      // Should not interfere with visibility service
      const visibleAgents = service.getVisibleAgents(TEST_USER_ID);
      expect(visibleAgents.length).toBeGreaterThan(0);
    });
  });
});
