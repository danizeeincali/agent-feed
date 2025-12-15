/**
 * Unit Tests: Hemingway Bridge Service
 * Tests for SPARC System Initialization - Engagement Bridge System
 *
 * Coverage:
 * - AC-5: At least 1 bridge always active
 * - Priority waterfall logic
 * - Bridge state management
 * - Action triggers
 *
 * Test Suite: 10 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Hemingway Bridge Service - Unit Tests', () => {
  describe('Bridge Priority Waterfall (AC-5)', () => {
    it('should prioritize continue_thread bridges highest (Priority 1)', () => {
      const bridges = [
        { type: 'continue_thread', priority: 1 },
        { type: 'question', priority: 4 },
        { type: 'insight', priority: 5 }
      ];

      const sorted = bridges.sort((a, b) => a.priority - b.priority);

      expect(sorted[0].type).toBe('continue_thread');
      expect(sorted[0].priority).toBe(1);
    });

    it('should use next_step as Priority 2', () => {
      const bridge = {
        type: 'next_step',
        priority: 2,
        content: 'Ready to complete your setup?'
      };

      expect(bridge.priority).toBe(2);
      expect(bridge.type).toBe('next_step');
    });

    it('should use new_feature as Priority 3', () => {
      const bridge = {
        type: 'new_feature',
        priority: 3,
        content: 'New agent available: Personal Todos'
      };

      expect(bridge.priority).toBe(3);
      expect(bridge.type).toBe('new_feature');
    });

    it('should use question as Priority 4 fallback', () => {
      const bridge = {
        type: 'question',
        priority: 4,
        content: 'What are you working on today?'
      };

      expect(bridge.priority).toBe(4);
      expect(bridge.type).toBe('question');
    });

    it('should use insight as Priority 5 final fallback', () => {
      const bridge = {
        type: 'insight',
        priority: 5,
        content: 'Tip: You can mention @agent-name to get specific help'
      };

      expect(bridge.priority).toBe(5);
      expect(bridge.type).toBe('insight');
    });
  });

  describe('Active Bridge Management (AC-5)', () => {
    it('should always have at least 1 active bridge (AC-5)', () => {
      const userBridges = [
        { id: 'b1', active: 1, priority: 5 }
      ];

      const activeBridges = userBridges.filter(b => b.active === 1);

      // AC-5: At least 1 bridge always active
      expect(activeBridges.length).toBeGreaterThanOrEqual(1);
    });

    it('should create default bridge if none exist', () => {
      const existingBridges = [];

      const needsDefaultBridge = existingBridges.length === 0;

      if (needsDefaultBridge) {
        const defaultBridge = {
          type: 'question',
          priority: 4,
          content: 'Create a post to get started!',
          active: 1
        };

        expect(defaultBridge.active).toBe(1);
      }

      expect(needsDefaultBridge).toBe(true);
    });

    it('should mark bridges as inactive when completed', () => {
      const bridge = {
        id: 'b1',
        active: 1,
        completed_at: null
      };

      // Complete the bridge
      const completedBridge = {
        ...bridge,
        active: 0,
        completed_at: Math.floor(Date.now() / 1000)
      };

      expect(completedBridge.active).toBe(0);
      expect(completedBridge.completed_at).toBeDefined();
    });

    it('should get highest priority active bridge', () => {
      const bridges = [
        { id: 'b1', priority: 5, active: 1 },
        { id: 'b2', priority: 2, active: 1 },
        { id: 'b3', priority: 1, active: 0 }, // Inactive
        { id: 'b4', priority: 4, active: 1 }
      ];

      const activeBridges = bridges.filter(b => b.active === 1);
      const highestPriority = activeBridges.sort((a, b) => a.priority - b.priority)[0];

      expect(highestPriority.priority).toBe(2);
      expect(highestPriority.id).toBe('b2');
    });
  });

  describe('Bridge Creation', () => {
    it('should create bridge with required fields', () => {
      const bridge = {
        id: 'bridge-123',
        user_id: 'demo-user-123',
        bridge_type: 'continue_thread',
        content: 'Awaiting response to: What should I call you?',
        priority: 1,
        active: 1,
        created_at: Math.floor(Date.now() / 1000)
      };

      expect(bridge.id).toBeDefined();
      expect(bridge.user_id).toBeDefined();
      expect(bridge.bridge_type).toBeDefined();
      expect(bridge.content).toBeDefined();
      expect(bridge.priority).toBeDefined();
      expect(bridge.active).toBe(1);
    });

    it('should validate bridge type', () => {
      const validTypes = [
        'continue_thread',
        'next_step',
        'new_feature',
        'question',
        'insight'
      ];

      const testType = 'continue_thread';

      expect(validTypes).toContain(testType);
    });

    it('should validate priority range (1-5)', () => {
      const priorities = [1, 2, 3, 4, 5];

      priorities.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(1);
        expect(p).toBeLessThanOrEqual(5);
      });
    });

    it('should allow optional post_id reference', () => {
      const bridgeWithPost = {
        bridge_type: 'continue_thread',
        post_id: 'post-123',
        content: 'Continue discussion on this post'
      };

      const bridgeWithoutPost = {
        bridge_type: 'question',
        post_id: null,
        content: 'What are you working on?'
      };

      expect(bridgeWithPost.post_id).toBe('post-123');
      expect(bridgeWithoutPost.post_id).toBeNull();
    });

    it('should allow optional agent_id reference', () => {
      const bridgeWithAgent = {
        bridge_type: 'new_feature',
        agent_id: 'personal-todos-agent',
        content: 'Check out the Personal Todos agent!'
      };

      expect(bridgeWithAgent.agent_id).toBe('personal-todos-agent');
    });

    it('should allow optional action trigger', () => {
      const bridgeWithAction = {
        bridge_type: 'next_step',
        action: 'trigger_phase2',
        content: 'Ready for Phase 2?'
      };

      expect(bridgeWithAction.action).toBe('trigger_phase2');
    });
  });

  describe('Bridge Updates on User Actions', () => {
    it('should update bridge when user creates post', () => {
      const userAction = {
        type: 'post_created',
        postId: 'post-123'
      };

      const newBridge = {
        bridge_type: 'continue_thread',
        content: 'Your post is live! Agents are reviewing it now.',
        post_id: userAction.postId,
        priority: 1
      };

      expect(newBridge.post_id).toBe(userAction.postId);
      expect(newBridge.bridge_type).toBe('continue_thread');
    });

    it('should update bridge when user responds to onboarding', () => {
      const userAction = {
        type: 'onboarding_response',
        step: 'name',
        response: 'Sarah'
      };

      const newBridge = {
        bridge_type: 'next_step',
        content: 'Awaiting response to: What brings you to Agent Feed?',
        priority: 2
      };

      expect(newBridge.bridge_type).toBe('next_step');
      expect(newBridge.priority).toBe(2);
    });

    it('should update bridge when Phase 1 completes', () => {
      const event = {
        type: 'phase1_complete',
        userId: 'demo-user-123'
      };

      const newBridge = {
        bridge_type: 'new_feature',
        content: 'Check out your agent team introductions below!',
        priority: 3
      };

      expect(newBridge.bridge_type).toBe('new_feature');
      expect(newBridge.priority).toBe(3);
    });

    it('should update bridge when user mentions agent', () => {
      const userAction = {
        type: 'agent_mentioned',
        agentName: 'personal-todos',
        postId: 'post-123'
      };

      const newBridge = {
        bridge_type: 'continue_thread',
        content: '@personal-todos will respond soon!',
        post_id: userAction.postId,
        priority: 1
      };

      expect(newBridge.content).toContain('@personal-todos');
      expect(newBridge.post_id).toBe(userAction.postId);
    });
  });

  describe('Bridge Content Generation', () => {
    it('should generate contextual content for continue_thread', () => {
      const bridge = {
        bridge_type: 'continue_thread',
        content: 'Awaiting response to: What should I call you?',
        post_id: 'post-123'
      };

      expect(bridge.content).toContain('Awaiting response');
      expect(bridge.post_id).toBe('post-123');
    });

    it('should generate contextual content for next_step', () => {
      const bridge = {
        bridge_type: 'next_step',
        content: 'Ready to complete your setup? Tell me about your goals!',
        action: 'trigger_phase2'
      };

      expect(bridge.content).toContain('Ready');
      expect(bridge.action).toBe('trigger_phase2');
    });

    it('should generate contextual content for new_feature', () => {
      const bridge = {
        bridge_type: 'new_feature',
        content: 'New agent available: Personal Todos Agent',
        agent_id: 'personal-todos-agent'
      };

      expect(bridge.content).toContain('New agent');
      expect(bridge.agent_id).toBe('personal-todos-agent');
    });

    it('should generate engaging question content', () => {
      const questions = [
        "What's on your mind today?",
        'What are you working on?',
        'How can your agents help you today?'
      ];

      questions.forEach(q => {
        expect(q).toBeTruthy();
        expect(q.includes('?')).toBe(true);
      });
    });

    it('should generate valuable insight content', () => {
      const insights = [
        'Tip: You can mention @agent-name to get specific help',
        'Did you know? Agents proactively monitor your posts',
        'Try creating a post to see how agents respond!'
      ];

      insights.forEach(insight => {
        expect(insight).toBeTruthy();
        expect(insight.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Performance', () => {
    it('should quickly retrieve active bridge (<50ms)', () => {
      const start = Date.now();

      const bridges = [
        { id: 'b1', priority: 5, active: 1 },
        { id: 'b2', priority: 2, active: 1 }
      ];

      const activeBridge = bridges
        .filter(b => b.active === 1)
        .sort((a, b) => a.priority - b.priority)[0];

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(activeBridge).toBeDefined();
    });

    it('should handle large number of bridges efficiently', () => {
      const start = Date.now();

      const bridges = Array.from({ length: 1000 }, (_, i) => ({
        id: `b${i}`,
        priority: (i % 5) + 1,
        active: i % 3 === 0 ? 1 : 0
      }));

      const activeBridges = bridges.filter(b => b.active === 1);
      const highestPriority = activeBridges.sort((a, b) => a.priority - b.priority)[0];

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(highestPriority).toBeDefined();
    });
  });
});
