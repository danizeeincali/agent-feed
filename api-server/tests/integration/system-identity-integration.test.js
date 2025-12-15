/**
 * System Identity Integration Test
 * End-to-end validation of Λvi system identity handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import { getSystemIdentity, getSystemPrompt, validateSystemIdentity } from '../../worker/system-identity.js';

describe('System Identity Integration Tests', () => {
  describe('Real AgentWorker Integration', () => {
    let worker;

    beforeAll(() => {
      worker = new AgentWorker({
        workerId: 'integration-test-worker',
        ticketId: 'test-ticket-avi',
        agentId: 'avi',
        apiBaseUrl: 'http://localhost:3001'
      });
    });

    it('should recognize avi as system identity', () => {
      const isValid = validateSystemIdentity('avi');
      expect(isValid).toBe(true);
    });

    it('should load system identity without file system access', async () => {
      const frontmatter = await worker.readAgentFrontmatter('avi');

      expect(frontmatter).toBeDefined();
      expect(frontmatter.system_identity).toBe(true);
      expect(frontmatter.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
      expect(frontmatter.role).toBe('Chief of Staff');
      expect(frontmatter.tier).toBe(0);
      expect(frontmatter.posts_as_self).toBe(false);
    });

    it('should have lightweight system prompt', () => {
      const systemPrompt = getSystemPrompt('avi');

      expect(systemPrompt).toBeDefined();
      expect(typeof systemPrompt).toBe('string');

      // Validate content
      expect(systemPrompt).toContain('Λvi');
      expect(systemPrompt).toContain('Chief of Staff');
      expect(systemPrompt).toContain('Amplifying Virtual Intelligence');

      // Validate token optimization (< 500 tokens ≈ 2000 chars)
      expect(systemPrompt.length).toBeLessThan(2000);

      console.log(`✓ System prompt length: ${systemPrompt.length} chars`);
      console.log(`✓ Estimated tokens: ${Math.ceil(systemPrompt.length / 4)}`);
    });

    it('should use correct display name', () => {
      const identity = getSystemIdentity('avi');
      expect(identity.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
      expect(identity.identity).not.toContain('avi');
      expect(identity.identity).toContain('Λvi');
    });

    it('should maintain data consistency with author_agent', async () => {
      const frontmatter = await worker.readAgentFrontmatter('avi');

      // System identity should be recognized
      expect(frontmatter.system_identity).toBe(true);

      // But agent ID remains 'avi' for database consistency
      expect(worker.agentId).toBe('avi');
    });

    it('should handle regular agents normally', async () => {
      const regularWorker = new AgentWorker({
        workerId: 'regular-worker',
        ticketId: 'test-ticket-regular',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3001'
      });

      const isSystem = validateSystemIdentity('link-logger-agent');
      expect(isSystem).toBe(false);

      // Regular agent should NOT have system identity
      const systemIdentity = getSystemIdentity('link-logger-agent');
      expect(systemIdentity).toBeNull();
    });
  });

  describe('Token Optimization Validation', () => {
    it('should use significantly fewer tokens for system identity', () => {
      const systemPrompt = getSystemPrompt('avi');
      const estimatedTokens = Math.ceil(systemPrompt.length / 4);

      // Should be well under 500 tokens
      expect(estimatedTokens).toBeLessThan(500);

      console.log(`Token efficiency: ${estimatedTokens} tokens (target: < 500)`);
    });

    it('should not access file system for system identity', async () => {
      const worker = new AgentWorker({
        workerId: 'test-worker',
        agentId: 'avi'
      });

      // This should NOT throw an error about missing file
      const frontmatter = await worker.readAgentFrontmatter('avi');
      expect(frontmatter.system_identity).toBe(true);
    });
  });

  describe('Display Name Consistency', () => {
    it('should use Λvi in all user-facing contexts', () => {
      const identity = getSystemIdentity('avi');

      expect(identity.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
      expect(identity.role).toBe('Chief of Staff');
    });

    it('should never show "avi" in display contexts', () => {
      const identity = getSystemIdentity('avi');
      const displayName = identity.identity;

      // Display should use Λvi, not avi
      expect(displayName.toLowerCase()).not.toContain('avi');
      expect(displayName).toContain('Λvi');
    });
  });

  describe('System Identity Completeness', () => {
    it('should provide all required identity fields', () => {
      const identity = getSystemIdentity('avi');

      expect(identity).toHaveProperty('posts_as_self');
      expect(identity).toHaveProperty('identity');
      expect(identity).toHaveProperty('role');
      expect(identity).toHaveProperty('tier');
      expect(identity).toHaveProperty('system_identity');

      expect(identity.posts_as_self).toBe(false);
      expect(identity.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
      expect(identity.role).toBe('Chief of Staff');
      expect(identity.tier).toBe(0);
      expect(identity.system_identity).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing agent worker functionality', async () => {
      // Test that regular agents still work
      const regularWorker = new AgentWorker({
        workerId: 'compat-test',
        agentId: 'link-logger-agent'
      });

      expect(regularWorker.agentId).toBe('link-logger-agent');
      expect(regularWorker.workerId).toBe('compat-test');
    });

    it('should handle edge cases gracefully', () => {
      expect(validateSystemIdentity(null)).toBe(false);
      expect(validateSystemIdentity(undefined)).toBe(false);
      expect(validateSystemIdentity('')).toBe(false);
      expect(validateSystemIdentity('nonexistent')).toBe(false);

      expect(getSystemIdentity(null)).toBeNull();
      expect(getSystemPrompt(undefined)).toBeNull();
    });
  });
});
