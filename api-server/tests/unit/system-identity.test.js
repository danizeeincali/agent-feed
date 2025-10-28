/**
 * System Identity Module Tests (TDD)
 * Tests for Λvi system identity handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getSystemIdentity, getSystemPrompt, validateSystemIdentity } from '../../worker/system-identity.js';

describe('System Identity Module', () => {
  describe('getSystemIdentity', () => {
    it('should return Λvi system identity for avi agent', () => {
      const identity = getSystemIdentity('avi');

      expect(identity).toBeDefined();
      expect(identity.posts_as_self).toBe(false);
      expect(identity.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
      expect(identity.role).toBe('Chief of Staff');
      expect(identity.tier).toBe(0);
      expect(identity.system_identity).toBe(true);
    });

    it('should return null for non-system agents', () => {
      const identity = getSystemIdentity('link-logger-agent');
      expect(identity).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(getSystemIdentity('')).toBeNull();
      expect(getSystemIdentity(null)).toBeNull();
      expect(getSystemIdentity(undefined)).toBeNull();
    });
  });

  describe('getSystemPrompt', () => {
    it('should return lightweight system prompt for avi', () => {
      const prompt = getSystemPrompt('avi');

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);

      // Check for key phrases
      expect(prompt).toContain('Λvi');
      expect(prompt).toContain('Chief of Staff');
    });

    it('should return prompt under 500 tokens', () => {
      const prompt = getSystemPrompt('avi');

      // Rough token estimation: ~4 chars per token
      const estimatedTokens = prompt.length / 4;
      expect(estimatedTokens).toBeLessThan(500);
    });

    it('should return null for non-system agents', () => {
      const prompt = getSystemPrompt('link-logger-agent');
      expect(prompt).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(getSystemPrompt('')).toBeNull();
      expect(getSystemPrompt(null)).toBeNull();
      expect(getSystemPrompt(undefined)).toBeNull();
    });
  });

  describe('validateSystemIdentity', () => {
    it('should validate avi as system identity', () => {
      const isValid = validateSystemIdentity('avi');
      expect(isValid).toBe(true);
    });

    it('should reject non-system agents', () => {
      const isValid = validateSystemIdentity('link-logger-agent');
      expect(isValid).toBe(false);
    });

    it('should reject invalid inputs', () => {
      expect(validateSystemIdentity('')).toBe(false);
      expect(validateSystemIdentity(null)).toBe(false);
      expect(validateSystemIdentity(undefined)).toBe(false);
    });
  });

  describe('System Identity Integration', () => {
    it('should provide consistent data across functions', () => {
      const agentId = 'avi';

      const isValid = validateSystemIdentity(agentId);
      const identity = getSystemIdentity(agentId);
      const prompt = getSystemPrompt(agentId);

      expect(isValid).toBe(true);
      expect(identity).not.toBeNull();
      expect(prompt).not.toBeNull();

      // Identity consistency
      expect(identity.system_identity).toBe(true);
      expect(identity.identity).toBe('Λvi (Amplifying Virtual Intelligence)');
    });
  });

  describe('Token Optimization', () => {
    it('should use minimal tokens for system prompt', () => {
      const prompt = getSystemPrompt('avi');

      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const estimatedTokens = prompt.length / 4;

      console.log(`System prompt estimated tokens: ${estimatedTokens}`);
      expect(estimatedTokens).toBeLessThan(500);
    });

    it('should be significantly smaller than full agent instructions', () => {
      const systemPrompt = getSystemPrompt('avi');

      // System prompt should be < 2000 chars (500 tokens)
      expect(systemPrompt.length).toBeLessThan(2000);
    });
  });
});
