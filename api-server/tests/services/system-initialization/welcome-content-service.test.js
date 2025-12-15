/**
 * Welcome Content Service Tests
 * Unit tests for welcome content generation
 *
 * Part of SPARC System Initialization specification
 * Agent 2: Welcome Content System - Testing
 *
 * Tests:
 * 1. generateAviWelcome - creates Λvi's welcome post
 * 2. generateOnboardingPost - creates onboarding Phase 1 post
 * 3. generateReferenceGuide - creates reference guide
 * 4. createAllWelcomePosts - creates all 3 posts in correct order
 * 5. validateWelcomeContent - validates tone and required content
 * 6. Content validation - ensures no "chief of staff" language
 */

import { describe, it, expect, beforeAll } from 'vitest';
import welcomeContentService from '../../../services/system-initialization/welcome-content-service.js';

describe('Welcome Content Service', () => {
  describe('generateAviWelcome', () => {
    it('should generate Λvi welcome post with correct structure', () => {
      const userId = 'test-user-123';
      const displayName = 'Alice';

      const post = welcomeContentService.generateAviWelcome(userId, displayName);

      expect(post).toBeDefined();
      expect(post.title).toBe('Welcome to Agent Feed!');
      expect(post.authorId).toBe(userId);
      expect(post.isAgentResponse).toBe(true);
      expect(post.agentId).toBe('lambda-vi');
      expect(post.agent.displayName).toBe('Λvi');
      expect(post.metadata.welcomePostType).toBe('avi-welcome');
      expect(post.metadata.isSystemInitialization).toBe(true);
    });

    it('should personalize greeting with display name', () => {
      const userId = 'test-user-123';
      const displayName = 'Alice';

      const post = welcomeContentService.generateAviWelcome(userId, displayName);

      expect(post.content).toContain('Welcome, Alice!');
    });

    it('should use generic greeting when no display name provided', () => {
      const userId = 'test-user-123';

      const post = welcomeContentService.generateAviWelcome(userId, null);

      expect(post.content).toContain('Welcome!');
      expect(post.content).not.toMatch(/Welcome, [A-Z]/); // Should not have personalized greeting
    });

    it('should include required role description (AC-2)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId);

      const contentLower = post.content.toLowerCase();
      expect(contentLower).toContain('ai partner');
      expect(contentLower).toContain('coordinates');
      expect(contentLower).toContain('agent team');
    });

    it('should include CTA to Get-to-Know-You agent (AC-2)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId);

      const contentLower = post.content.toLowerCase();
      expect(contentLower).toContain('get-to-know-you');
      expect(contentLower).toContain('reaching out');
    });

    it('should NOT contain "chief of staff" language (AC-2 - Critical)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId);

      const contentLower = post.content.toLowerCase();
      expect(contentLower).not.toContain('chief of staff');
    });

    it('should have strategic + warm tone (AC-2)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId);

      const contentLower = post.content.toLowerCase();

      // Strategic language
      expect(contentLower).toMatch(/plan|prioritize|execute|strategic|coordinate/);

      // Warm language
      expect(contentLower).toMatch(/welcome|looking forward|together|help/);
    });
  });

  describe('generateOnboardingPost', () => {
    it('should generate onboarding post with correct structure', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateOnboardingPost(userId);

      expect(post).toBeDefined();
      expect(post.title).toBe("Hi! Let's Get Started");
      expect(post.authorId).toBe(userId);
      expect(post.isAgentResponse).toBe(true);
      expect(post.agentId).toBe('get-to-know-you-agent');
      expect(post.agent.displayName).toBe('Get-to-Know-You');
      expect(post.metadata.welcomePostType).toBe('onboarding-phase1');
      expect(post.metadata.onboardingPhase).toBe(1);
      expect(post.metadata.onboardingStep).toBe('name');
    });

    it('should ask for user name (Phase 1 Question 1)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateOnboardingPost(userId);

      const contentLower = post.content.toLowerCase();
      expect(contentLower).toMatch(/what should i call you|your name|prefer to be called/);
    });

    it('should have conversational tone (not survey-style)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateOnboardingPost(userId);

      const contentLower = post.content.toLowerCase();

      // Conversational indicators
      expect(contentLower).toMatch(/let's|i'd love|help/);

      // Should NOT be survey-style (no "Please enter", "Required field", etc.)
      expect(contentLower).not.toMatch(/required|mandatory|must provide/);
    });

    it('should indicate this is quick (2-3 minutes)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateOnboardingPost(userId);

      const contentLower = post.content.toLowerCase();
      // Should mention it's quick/simple/basics
      expect(contentLower).toMatch(/quick|couple|basics|start|simple/);
    });
  });

  describe('generateReferenceGuide', () => {
    it('should generate reference guide with correct structure', () => {
      const post = welcomeContentService.generateReferenceGuide();

      expect(post).toBeDefined();
      expect(post.title).toBe('📚 How Agent Feed Works');
      expect(post.isAgentResponse).toBe(true);
      expect(post.agentId).toBe('lambda-vi');
      expect(post.agent.displayName).toBe('Λvi');
      expect(post.metadata.welcomePostType).toBe('reference-guide');
      expect(post.metadata.isSystemDocumentation).toBe(true);
    });

    it('should include "What is Agent Feed?" section (AC-6)', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const contentLower = post.content.toLowerCase();

      expect(contentLower).toContain('what is agent feed');
    });

    it('should list proactive agents with descriptions (AC-6)', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const contentLower = post.content.toLowerCase();

      expect(contentLower).toContain('proactive agents');
      expect(contentLower).toContain('λvi');
      expect(contentLower).toContain('personal todos');
      expect(contentLower).toContain('link logger');
    });

    it('should explain how the system works (AC-6)', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const contentLower = post.content.toLowerCase();

      expect(contentLower).toContain('how it works');
      expect(contentLower).toMatch(/create posts|agents monitor|proactive/);
    });

    it('should explain how to communicate with agents (AC-6)', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const contentLower = post.content.toLowerCase();

      expect(contentLower).toMatch(/mention|@agent|reply/);
      expect(contentLower).toContain('communicat');
    });

    it('should include getting started tips (AC-6)', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const contentLower = post.content.toLowerCase();

      expect(contentLower).toMatch(/tips|getting started/);
    });
  });

  describe('createAllWelcomePosts', () => {
    it('should create exactly 3 welcome posts (AC-1)', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      expect(posts).toHaveLength(3);
    });

    it('should create posts in correct order (AC-1)', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      expect(posts[0].agentId).toBe('lambda-vi');
      expect(posts[1].agentId).toBe('get-to-know-you-agent');
      expect(posts[2].agentId).toBe('lambda-vi');
    });

    it('should create posts with correct types', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      expect(posts[0].metadata.welcomePostType).toBe('reference-guide'); // Oldest
      expect(posts[1].metadata.welcomePostType).toBe('onboarding-phase1'); // Middle
      expect(posts[2].metadata.welcomePostType).toBe('avi-welcome'); // Newest
    });

    it('should all be marked as agent responses', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      posts.forEach(post => {
        expect(post.isAgentResponse).toBe(true);
      });
    });

    it('should all be marked as system initialization', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      posts.forEach(post => {
        expect(post.metadata.isSystemInitialization).toBe(true);
      });
    });
  });

  describe('validateWelcomeContent', () => {
    it('should pass validation for valid Λvi post', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId);
      const validation = welcomeContentService.validateWelcomeContent(post);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should pass validation for valid onboarding post', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateOnboardingPost(userId);
      const validation = welcomeContentService.validateWelcomeContent(post);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should pass validation for valid reference guide', () => {
      const post = welcomeContentService.generateReferenceGuide();
      const validation = welcomeContentService.validateWelcomeContent(post);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation if "chief of staff" is present (AC-2 Critical)', () => {
      const invalidPost = {
        agentId: 'lambda-vi',
        content: "I'm your chief of staff, helping you manage tasks.",
        metadata: { welcomePostType: 'avi-welcome' }
      };

      const validation = welcomeContentService.validateWelcomeContent(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Content contains prohibited phrase "chief of staff"');
    });

    it('should fail validation if Λvi post missing role description', () => {
      const invalidPost = {
        agentId: 'lambda-vi',
        content: "Welcome! Let's get started.",
        metadata: { welcomePostType: 'avi-welcome' }
      };

      const validation = welcomeContentService.validateWelcomeContent(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('role description'))).toBe(true);
    });

    it('should fail validation if Λvi post missing CTA', () => {
      const invalidPost = {
        agentId: 'lambda-vi',
        content: "I'm your AI partner who coordinates your agent team. Let's work together!",
        metadata: { welcomePostType: 'avi-welcome' }
      };

      const validation = welcomeContentService.validateWelcomeContent(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Get-to-Know-You'))).toBe(true);
    });

    it('should fail validation if onboarding post missing name question', () => {
      const invalidPost = {
        agentId: 'get-to-know-you-agent',
        content: "Let's get started! Tell me about yourself.",
        metadata: { welcomePostType: 'onboarding-phase1' }
      };

      const validation = welcomeContentService.validateWelcomeContent(invalidPost);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('name question'))).toBe(true);
    });
  });

  describe('getWelcomePostStats', () => {
    it('should return correct statistics', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);
      const stats = welcomeContentService.getWelcomePostStats(posts);

      expect(stats.totalPosts).toBe(3);
      expect(stats.postTypes).toEqual(['reference-guide', 'onboarding-phase1', 'avi-welcome']); // Array order: oldest to newest
      expect(stats.agents).toEqual(['lambda-vi', 'get-to-know-you-agent', 'lambda-vi']);
      expect(stats.totalContentLength).toBeGreaterThan(0);
      expect(stats.averageContentLength).toBeGreaterThan(0);
    });

    it('should calculate average content length correctly', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);
      const stats = welcomeContentService.getWelcomePostStats(posts);

      const totalLength = posts.reduce((sum, p) => sum + p.content.length, 0);
      const expectedAverage = Math.round(totalLength / posts.length);

      expect(stats.averageContentLength).toBe(expectedAverage);
    });
  });

  describe('Content Quality - Tone & Language', () => {
    it('should maintain consistent professional yet warm tone across all posts', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      posts.forEach(post => {
        const contentLower = post.content.toLowerCase();

        // Professional indicators
        expect(contentLower.length).toBeGreaterThan(100); // Substantive content

        // Warm/helpful indicators
        expect(contentLower).toMatch(/help|support|together|welcome|let's/);
      });
    });

    it('should use clear, accessible language (no jargon)', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      posts.forEach(post => {
        const contentLower = post.content.toLowerCase();

        // Should NOT contain overly technical jargon
        expect(contentLower).not.toMatch(/api|endpoint|schema|database|backend/);
      });
    });

    it('should include actionable next steps in each post', () => {
      const userId = 'test-user-123';
      const posts = welcomeContentService.createAllWelcomePosts(userId);

      // posts[0] = Reference guide: Explains how to get started
      expect(posts[0].content.toLowerCase()).toMatch(/create|mention|reply/);

      // posts[1] = Onboarding: Ask for name
      expect(posts[1].content.toLowerCase()).toMatch(/reply|tell/);

      // posts[2] = Λvi welcome: CTA to Get-to-Know-You agent
      expect(posts[2].content.toLowerCase()).toContain('reaching out');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty display name gracefully', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId, '');

      expect(post.content).toContain('Welcome!');
      expect(post.content).not.toContain('Welcome, !');
    });

    it('should handle "User" as display name (default fallback)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId, 'User');

      expect(post.content).toContain('Welcome!');
      expect(post.content).not.toContain('Welcome, User!');
    });

    it('should handle "New User" as display name (initialization default)', () => {
      const userId = 'test-user-123';
      const post = welcomeContentService.generateAviWelcome(userId, 'New User');

      expect(post.content).toContain('Welcome!');
      expect(post.content).not.toContain('Welcome, New User!');
    });

    it('should handle very long display names', () => {
      const userId = 'test-user-123';
      const longName = 'A'.repeat(100);
      const post = welcomeContentService.generateAviWelcome(userId, longName);

      expect(post.content).toContain(`Welcome, ${longName}!`);
    });
  });
});
