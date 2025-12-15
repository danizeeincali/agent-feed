/**
 * OnboardingFlowService Test Suite
 * Tests for phased agent introduction UX system
 *
 * INTRODUCTION FLOW:
 * - Session 1: Avi only
 * - Session 2: Avi + get-to-know-you-agent
 * - Session 3: First specialized agent (Aha moment)
 * - Sessions 4-5: Progressive discovery (max 2 agents per session)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { OnboardingFlowService } from '../../services/onboarding/onboarding-flow-service.js';

describe('OnboardingFlowService - TDD Implementation', () => {
  let db;
  let service;

  beforeEach(() => {
    // Create in-memory test database
    db = new Database(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_onboarding_state (
        user_id TEXT PRIMARY KEY,
        session_count INTEGER DEFAULT 0,
        phase TEXT DEFAULT 'session1',
        aha_moment_completed INTEGER DEFAULT 0,
        aha_moment_timestamp INTEGER,
        user_profile_json TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS agent_introductions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        session_introduced INTEGER NOT NULL,
        introduced_at INTEGER DEFAULT (unixepoch()),
        interaction_count INTEGER DEFAULT 0,
        UNIQUE(user_id, agent_id)
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL DEFAULT 'User',
        profile_json TEXT DEFAULT '{}',
        onboarding_completed INTEGER DEFAULT 0,
        onboarding_completed_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    service = new OnboardingFlowService(db);
  });

  describe('Service Initialization', () => {
    it('should initialize with database connection', () => {
      expect(service).toBeDefined();
      expect(service.db).toBe(db);
    });

    it('should throw error if database not provided', () => {
      expect(() => new OnboardingFlowService(null)).toThrow('Database instance is required');
    });
  });

  describe('Session Tracking', () => {
    it('should initialize new user with session count 0', () => {
      const state = service.getOnboardingState('user-1');
      expect(state.sessionCount).toBe(0);
      expect(state.phase).toBe('session1');
    });

    it('should increment session count on new session', () => {
      service.startNewSession('user-1');
      const state = service.getOnboardingState('user-1');
      expect(state.sessionCount).toBe(1);
    });

    it('should track multiple sessions correctly', () => {
      service.startNewSession('user-1');
      service.startNewSession('user-1');
      service.startNewSession('user-1');
      const state = service.getOnboardingState('user-1');
      expect(state.sessionCount).toBe(3);
    });
  });

  describe('Phase 1: Session 1 - Avi Only', () => {
    it('should return only Avi for first session', () => {
      const agents = service.getAgentsForSession('user-1', 1);
      expect(agents).toEqual(['avi']);
      expect(agents.length).toBe(1);
    });

    it('should not introduce any specialist agents in session 1', () => {
      const agents = service.getAgentsForSession('user-1', 1);
      expect(agents).not.toContain('get-to-know-you-agent');
      expect(agents).not.toContain('personal-todos-agent');
    });
  });

  describe('Phase 2: Session 2 - Avi + Get-to-know-you', () => {
    it('should introduce get-to-know-you-agent in session 2', () => {
      service.startNewSession('user-1'); // Session 1
      service.startNewSession('user-1'); // Session 2
      const agents = service.getAgentsForSession('user-1', 2);
      expect(agents).toContain('avi');
      expect(agents).toContain('get-to-know-you-agent');
      expect(agents.length).toBe(2);
    });

    it('should not introduce specialist agents until profile complete', () => {
      service.startNewSession('user-1'); // Session 1
      service.startNewSession('user-1'); // Session 2
      const agents = service.getAgentsForSession('user-1', 2);
      expect(agents).not.toContain('personal-todos-agent');
      expect(agents).not.toContain('link-logger-agent');
    });
  });

  describe('Phase 3: Session 3 - First Specialized Agent (Aha Moment)', () => {
    it('should introduce first specialized agent based on user profile', () => {
      // Complete profile collection
      service.saveUserProfile('user-1', {
        focus: 'productivity',
        interests: ['task management', 'organization']
      });

      service.startNewSession('user-1'); // Session 1
      service.startNewSession('user-1'); // Session 2
      service.startNewSession('user-1'); // Session 3

      const agents = service.getAgentsForSession('user-1', 3);
      expect(agents.length).toBeGreaterThan(2);
      // Should introduce productivity-focused agent
      expect(agents).toContain('personal-todos-agent');
    });

    it('should suggest creative agent for creative-focused users', () => {
      service.saveUserProfile('user-1', {
        focus: 'creative',
        interests: ['brainstorming', 'ideas']
      });

      service.startNewSession('user-1');
      service.startNewSession('user-1');
      service.startNewSession('user-1');

      const agents = service.getAgentsForSession('user-1', 3);
      expect(agents).toContain('agent-ideas-agent');
    });

    it('should suggest knowledge agent for knowledge-focused users', () => {
      service.saveUserProfile('user-1', {
        focus: 'knowledge',
        interests: ['research', 'learning']
      });

      service.startNewSession('user-1');
      service.startNewSession('user-1');
      service.startNewSession('user-1');

      const agents = service.getAgentsForSession('user-1', 3);
      expect(agents).toContain('link-logger-agent');
    });
  });

  describe('Aha Moment Tracking', () => {
    it('should track aha moment completion', () => {
      service.markAhaMomentComplete('user-1', 'personal-todos-agent');
      const state = service.getOnboardingState('user-1');
      expect(state.ahaMomentCompleted).toBe(true);
      expect(state.ahaMomentAgent).toBe('personal-todos-agent');
    });

    it('should record timestamp of aha moment', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      service.markAhaMomentComplete('user-1', 'link-logger-agent');
      const state = service.getOnboardingState('user-1');
      const afterTime = Math.floor(Date.now() / 1000);

      expect(state.ahaMomentTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(state.ahaMomentTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should allow only one aha moment per user', () => {
      service.markAhaMomentComplete('user-1', 'personal-todos-agent');
      service.markAhaMomentComplete('user-1', 'link-logger-agent');

      const state = service.getOnboardingState('user-1');
      // First aha moment should be preserved
      expect(state.ahaMomentAgent).toBe('personal-todos-agent');
    });
  });

  describe('Phase 4-5: Progressive Discovery', () => {
    it('should introduce max 2 new agents per session', () => {
      service.saveUserProfile('user-1', {
        focus: 'productivity',
        interests: ['everything']
      });

      // Complete first 3 sessions
      for (let i = 0; i < 3; i++) {
        service.startNewSession('user-1');
      }

      // Session 4 - should not exceed 2 new agents
      service.startNewSession('user-1');
      const session4Agents = service.getAgentsForSession('user-1', 4);
      const previousAgents = ['avi', 'get-to-know-you-agent', 'personal-todos-agent'];
      const newAgents = session4Agents.filter(a => !previousAgents.includes(a));

      expect(newAgents.length).toBeLessThanOrEqual(2);
    });

    it('should progressively reveal agents over multiple sessions', () => {
      service.saveUserProfile('user-1', {
        focus: 'mixed',
        interests: ['everything', 'productivity', 'creative']
      });

      const sessionAgents = [];
      for (let i = 1; i <= 5; i++) {
        service.startNewSession('user-1');
        sessionAgents[i] = service.getAgentsForSession('user-1', i);
      }

      // Each session should have more agents than the previous
      expect(sessionAgents[2].length).toBeGreaterThan(sessionAgents[1].length);
      expect(sessionAgents[3].length).toBeGreaterThan(sessionAgents[2].length);
      expect(sessionAgents[4].length).toBeGreaterThan(sessionAgents[3].length);
    });
  });

  describe('Agent Introduction Recording', () => {
    it('should record when agents are introduced', () => {
      service.recordAgentIntroduction('user-1', 'avi', 1);
      const introduced = service.getIntroducedAgents('user-1');
      expect(introduced).toContainEqual(
        expect.objectContaining({
          agent_id: 'avi',
          session_introduced: 1
        })
      );
    });

    it('should prevent duplicate introductions', () => {
      service.recordAgentIntroduction('user-1', 'avi', 1);
      service.recordAgentIntroduction('user-1', 'avi', 2);

      const introduced = service.getIntroducedAgents('user-1');
      const aviIntros = introduced.filter(a => a.agent_id === 'avi');
      expect(aviIntros.length).toBe(1);
    });

    it('should track interaction counts per agent', () => {
      service.recordAgentIntroduction('user-1', 'personal-todos-agent', 3);
      service.incrementInteractionCount('user-1', 'personal-todos-agent');
      service.incrementInteractionCount('user-1', 'personal-todos-agent');

      const introduced = service.getIntroducedAgents('user-1');
      const agent = introduced.find(a => a.agent_id === 'personal-todos-agent');
      expect(agent.interaction_count).toBe(2);
    });
  });

  describe('System Agent Filtering', () => {
    it('should never return system agents', () => {
      const systemAgents = [
        'meta-agent',
        'monitoring-agent',
        'security-agent',
        'backup-agent'
      ];

      for (let session = 1; session <= 5; session++) {
        service.startNewSession('user-1');
        const agents = service.getAgentsForSession('user-1', session);

        systemAgents.forEach(sysAgent => {
          expect(agents).not.toContain(sysAgent);
        });
      }
    });

    it('should filter out system agents from suggestions', () => {
      const allAgents = service.getAllAvailableAgents();
      const systemAgents = ['meta-agent', 'monitoring-agent', 'security-agent'];

      systemAgents.forEach(sysAgent => {
        expect(allAgents).not.toContain(sysAgent);
      });
    });
  });

  describe('User Profile Management', () => {
    it('should save user profile from get-to-know-you agent', () => {
      const profile = {
        focus: 'productivity',
        interests: ['task management'],
        workStyle: 'structured'
      };

      service.saveUserProfile('user-1', profile);
      const state = service.getOnboardingState('user-1');
      expect(state.userProfile).toEqual(profile);
    });

    it('should use profile to determine agent order', () => {
      // Productivity user
      service.saveUserProfile('user-prod', { focus: 'productivity' });
      service.startNewSession('user-prod');
      service.startNewSession('user-prod');
      service.startNewSession('user-prod');
      const prodAgents = service.getAgentsForSession('user-prod', 3);

      // Creative user
      service.saveUserProfile('user-creative', { focus: 'creative' });
      service.startNewSession('user-creative');
      service.startNewSession('user-creative');
      service.startNewSession('user-creative');
      const creativeAgents = service.getAgentsForSession('user-creative', 3);

      // Different users should get different first specialized agents
      expect(prodAgents[2]).not.toBe(creativeAgents[2]);
    });
  });

  describe('Phase Progression Logic', () => {
    it('should progress through phases correctly', () => {
      const state1 = service.getOnboardingState('user-1');
      expect(state1.phase).toBe('session1');

      service.startNewSession('user-1');
      const state2 = service.getOnboardingState('user-1');
      expect(state2.phase).toBe('session1');

      service.startNewSession('user-1');
      const state3 = service.getOnboardingState('user-1');
      expect(state3.phase).toBe('session2');

      service.saveUserProfile('user-1', { focus: 'productivity' });
      service.startNewSession('user-1');
      const state4 = service.getOnboardingState('user-1');
      expect(state4.phase).toBe('session3');
    });

    it('should track completion of each phase', () => {
      service.completePhase('user-1', 'session1');
      const state = service.getOnboardingState('user-1');
      expect(state.completedPhases).toContain('session1');
    });
  });

  describe('Integration with Existing Onboarding', () => {
    it('should check if basic onboarding is complete', () => {
      // Insert into user_settings
      db.prepare(`
        INSERT INTO user_settings (user_id, display_name, onboarding_completed)
        VALUES (?, ?, ?)
      `).run('user-1', 'Test User', 1);

      const isComplete = service.isBasicOnboardingComplete('user-1');
      expect(isComplete).toBe(true);
    });

    it('should return false if onboarding not complete', () => {
      const isComplete = service.isBasicOnboardingComplete('new-user');
      expect(isComplete).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no profile gracefully', () => {
      service.startNewSession('user-1');
      service.startNewSession('user-1');
      service.startNewSession('user-1');

      const agents = service.getAgentsForSession('user-1', 3);
      // Should still return agents even without profile
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should handle non-existent users gracefully', () => {
      const state = service.getOnboardingState('non-existent-user');
      expect(state.sessionCount).toBe(0);
      expect(state.phase).toBe('session1');
    });

    it('should handle invalid session numbers', () => {
      expect(() => service.getAgentsForSession('user-1', 0)).toThrow();
      expect(() => service.getAgentsForSession('user-1', -1)).toThrow();
    });
  });

  describe('Statistics and Reporting', () => {
    it('should provide introduction statistics', () => {
      service.recordAgentIntroduction('user-1', 'avi', 1);
      service.recordAgentIntroduction('user-1', 'get-to-know-you-agent', 2);
      service.recordAgentIntroduction('user-1', 'personal-todos-agent', 3);

      const stats = service.getIntroductionStats('user-1');
      expect(stats.totalIntroduced).toBe(3);
      expect(stats.totalAvailable).toBeGreaterThan(3);
    });

    it('should calculate discovery progress percentage', () => {
      service.recordAgentIntroduction('user-1', 'avi', 1);
      service.recordAgentIntroduction('user-1', 'get-to-know-you-agent', 2);

      const stats = service.getIntroductionStats('user-1');
      expect(stats.discoveryProgress).toBeGreaterThan(0);
      expect(stats.discoveryProgress).toBeLessThanOrEqual(100);
    });
  });
});
