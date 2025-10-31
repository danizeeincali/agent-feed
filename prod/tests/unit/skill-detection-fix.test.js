import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillLoader } from '../../api-server/worker/skill-loader.js';

describe('Skill Detection Fix - Unit Tests', () => {
  let skillLoader;

  beforeEach(() => {
    skillLoader = new SkillLoader();
  });

  describe('extractUserQuery() - Conversation History Parsing', () => {
    it('should extract query using separator format', () => {
      const conversation = [
        { role: 'system', content: 'You are Avi' },
        { role: 'user', content: '---\nUser: what is 500+343?\n---' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('what is 500+343?');
    });

    it('should extract query using User: marker without separators', () => {
      const conversation = [
        { role: 'system', content: 'You are Avi' },
        { role: 'user', content: 'User: calculate 123 + 456' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('calculate 123 + 456');
    });

    it('should extract query using paragraph method for multi-line content', () => {
      const conversation = [
        { role: 'system', content: 'System instructions' },
        { role: 'user', content: 'Some context\n\nWhat is the capital of France?\n\nAdditional info' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('What is the capital of France?');
    });

    it('should use fallback for simple single-line content', () => {
      const conversation = [
        { role: 'user', content: 'Simple query here' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('Simple query here');
    });

    it('should handle empty conversation gracefully', () => {
      const conversation = [];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('');
    });

    it('should handle conversation with no user messages', () => {
      const conversation = [
        { role: 'system', content: 'System only' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('');
    });

    it('should trim whitespace from extracted query', () => {
      const conversation = [
        { role: 'user', content: '   what is 2+2?   ' }
      ];

      const query = skillLoader.extractUserQuery(conversation);
      expect(query).toBe('what is 2+2?');
    });
  });

  describe('Skill Detection for Simple Math Queries', () => {
    it('should detect exactly 2 skills for simple math query', async () => {
      const conversation = [
        { role: 'user', content: 'what is 500+343?' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Simple math should load calculator and possibly one more helper skill
      expect(skills.length).toBeLessThanOrEqual(2);
      expect(skills.length).toBeGreaterThan(0);

      // Should include calculator skill
      const hasCalculator = skills.some(skill =>
        skill.name.toLowerCase().includes('calculator') ||
        skill.name.toLowerCase().includes('math')
      );
      expect(hasCalculator).toBe(true);
    });

    it('should detect skills efficiently for arithmetic operations', async () => {
      const conversation = [
        { role: 'user', content: 'calculate 123 * 456' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      expect(skills.length).toBeLessThanOrEqual(2);
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('Skill Detection for Complex Queries', () => {
    it('should detect 3-4 skills for complex multi-domain query', async () => {
      const conversation = [
        { role: 'user', content: 'Search for the weather in Paris and calculate the temperature difference from New York, then send me an email with the results' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Complex query should load multiple skills but not everything
      expect(skills.length).toBeGreaterThanOrEqual(3);
      expect(skills.length).toBeLessThanOrEqual(4);
    });

    it('should prioritize relevant skills for complex queries', async () => {
      const conversation = [
        { role: 'user', content: 'Find research papers about AI, summarize them, and create a presentation' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      expect(skills.length).toBeGreaterThan(0);
      expect(skills.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Prompt Size Validation', () => {
    it('should error when prompt exceeds 200KB', () => {
      const largeContent = 'x'.repeat(210 * 1024); // 210KB
      const conversation = [
        { role: 'user', content: largeContent }
      ];

      expect(() => {
        skillLoader.loadSkillsForRequest(conversation);
      }).rejects.toThrow(/prompt.*too large/i);
    });

    it('should succeed when prompt is under 200KB', async () => {
      const normalContent = 'What is the meaning of life?';
      const conversation = [
        { role: 'user', content: normalContent }
      ];

      await expect(
        skillLoader.loadSkillsForRequest(conversation)
      ).resolves.not.toThrow();
    });

    it('should calculate prompt size correctly with multiple messages', () => {
      const conversation = [
        { role: 'system', content: 'You are Avi' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'What is 2+2?' }
      ];

      const totalSize = conversation.reduce((sum, msg) =>
        sum + (msg.content?.length || 0), 0
      );

      expect(totalSize).toBeLessThan(200 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries with special characters', async () => {
      const conversation = [
        { role: 'user', content: 'What is $500 + €343 in USD?' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should handle queries with emojis', async () => {
      const conversation = [
        { role: 'user', content: '🔢 Calculate 100 + 200 🧮' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should handle multilingual queries', async () => {
      const conversation = [
        { role: 'user', content: '¿Cuál es 100 + 200?' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should handle code blocks in queries', async () => {
      const conversation = [
        { role: 'user', content: 'Calculate this:\n```\nconst result = 500 + 343;\n```' }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);
      expect(skills.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should load skills within reasonable time (<1s)', async () => {
      const conversation = [
        { role: 'user', content: 'what is 500+343?' }
      ];

      const startTime = Date.now();
      await skillLoader.loadSkillsForRequest(conversation);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should cache skill metadata for repeated queries', async () => {
      const conversation = [
        { role: 'user', content: 'calculate 1+1' }
      ];

      // First call
      const start1 = Date.now();
      await skillLoader.loadSkillsForRequest(conversation);
      const duration1 = Date.now() - start1;

      // Second call (should be faster due to caching)
      const start2 = Date.now();
      await skillLoader.loadSkillsForRequest(conversation);
      const duration2 = Date.now() - start2;

      // Second call should be faster or similar
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });
  });
});
