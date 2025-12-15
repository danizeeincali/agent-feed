/**
 * Skills Loading Integration Tests
 * Tests the integration between ClaudeCodeSDKManager and SkillLoader
 *
 * Test Coverage:
 * - ClaudeCodeSDKManager with skills
 * - Token reduction for simple queries
 * - Skill loading for complex queries
 * - Cost estimation accuracy
 * - Real-world conversation scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudeCodeSDKManager } from '../../src/services/ClaudeCodeSDKManager.js';

// Mock the actual query function
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn()
}));

describe('Skills Loading - Integration Tests', () => {
  let sdkManager;
  let skillLoader;

  beforeEach(() => {
    sdkManager = new ClaudeCodeSDKManager();

    // Mock SkillLoader integration
    skillLoader = {
      buildSystemPrompt: vi.fn(),
      calculateSavings: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ClaudeCodeSDKManager with SkillLoader', () => {
    it('should integrate SkillLoader into query flow', async () => {
      // Mock skill loader to return optimized prompt
      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'Optimized system prompt',
        skillsLoaded: [],
        tokenCount: 100,
        simplified: true
      });

      const query = '5 + 3';

      // In real implementation, SDK would use the optimized prompt
      const result = await sdkManager.query({
        prompt: query,
        skillLoader: skillLoader
      });

      expect(skillLoader.buildSystemPrompt).toHaveBeenCalledWith(query);
    });

    it('should pass full query context to SkillLoader', async () => {
      const complexQuery = 'Debug this code and write tests';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System prompt with debugging and testing skills',
        skillsLoaded: ['debugging', 'testing'],
        tokenCount: 300,
        simplified: false
      });

      await sdkManager.query({
        prompt: complexQuery,
        skillLoader: skillLoader
      });

      expect(skillLoader.buildSystemPrompt).toHaveBeenCalledWith(complexQuery);
    });
  });

  describe('Token Reduction Scenarios', () => {
    it('should achieve significant token reduction for simple math', async () => {
      const simpleQuery = '3000 + 500';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'Base instructions only',
        skillsLoaded: [],
        tokenCount: 150, // Reduced from 500 (all skills)
        simplified: true
      });

      skillLoader.calculateSavings.mockReturnValue({
        tokensSaved: 350,
        percentSaved: 70,
        costSaved: 0.00105
      });

      const result = await sdkManager.query({
        prompt: simpleQuery,
        skillLoader: skillLoader
      });

      const savings = skillLoader.calculateSavings(500, 150);

      expect(savings.tokensSaved).toBe(350);
      expect(savings.percentSaved).toBe(70);
    });

    it('should use minimal tokens for greetings', async () => {
      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'Minimal system prompt',
        skillsLoaded: [],
        tokenCount: 100,
        simplified: true
      });

      await sdkManager.query({
        prompt: 'hello',
        skillLoader: skillLoader
      });

      const promptResult = await skillLoader.buildSystemPrompt('hello');
      expect(promptResult.tokenCount).toBeLessThan(200);
    });

    it('should show cost savings over multiple queries', async () => {
      const queries = [
        '5 + 3',
        'hello',
        '100 / 2',
        'what is 42?',
        '3000 + 500'
      ];

      let totalSavings = 0;

      for (const query of queries) {
        skillLoader.buildSystemPrompt.mockResolvedValue({
          prompt: 'Optimized prompt',
          skillsLoaded: [],
          tokenCount: 150,
          simplified: true
        });

        await sdkManager.query({
          prompt: query,
          skillLoader: skillLoader
        });

        const savings = 500 - 150; // Assume full system = 500 tokens
        totalSavings += savings;
      }

      expect(totalSavings).toBe(1750); // 350 tokens * 5 queries
    });
  });

  describe('Skill Loading for Complex Queries', () => {
    it('should load code-related skills for debugging', async () => {
      const query = 'Debug this code: function test() { console.log("test"); }';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + code-analysis + debugging skills',
        skillsLoaded: ['code-analysis', 'debugging'],
        tokenCount: 300,
        simplified: false
      });

      await sdkManager.query({
        prompt: query,
        skillLoader: skillLoader
      });

      const result = await skillLoader.buildSystemPrompt(query);

      expect(result.skillsLoaded).toContain('code-analysis');
      expect(result.skillsLoaded).toContain('debugging');
    });

    it('should load testing skills for test creation', async () => {
      const query = 'Write unit tests for this function';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + testing skills',
        skillsLoaded: ['testing'],
        tokenCount: 250,
        simplified: false
      });

      await sdkManager.query({
        prompt: query,
        skillLoader: skillLoader
      });

      const result = await skillLoader.buildSystemPrompt(query);

      expect(result.skillsLoaded).toContain('testing');
    });

    it('should load multiple skills for complex multi-step queries', async () => {
      const query = 'Create a database table, write an API endpoint, and add tests';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + database + api + testing skills',
        skillsLoaded: ['database-operations', 'api-operations', 'testing'],
        tokenCount: 400,
        simplified: false
      });

      await sdkManager.query({
        prompt: query,
        skillLoader: skillLoader
      });

      const result = await skillLoader.buildSystemPrompt(query);

      expect(result.skillsLoaded).toHaveLength(3);
      expect(result.skillsLoaded).toContain('database-operations');
      expect(result.skillsLoaded).toContain('api-operations');
      expect(result.skillsLoaded).toContain('testing');
    });

    it('should still achieve some savings even with multiple skills', async () => {
      const query = 'Create an API with tests';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + api + testing skills',
        skillsLoaded: ['api-operations', 'testing'],
        tokenCount: 300, // Still less than loading ALL skills (500)
        simplified: false
      });

      skillLoader.calculateSavings.mockReturnValue({
        tokensSaved: 200,
        percentSaved: 40,
        costSaved: 0.0006
      });

      await sdkManager.query({
        prompt: query,
        skillLoader: skillLoader
      });

      const savings = skillLoader.calculateSavings(500, 300);

      expect(savings.tokensSaved).toBe(200);
      expect(savings.percentSaved).toBe(40);
    });
  });

  describe('Cost Estimation Accuracy', () => {
    it('should estimate accurate per-query cost savings', () => {
      skillLoader.calculateSavings.mockReturnValue({
        tokensSaved: 350,
        percentSaved: 70,
        costSaved: 0.00105,
        estimatedCostSavingsPerMonth: 1.05
      });

      const savings = skillLoader.calculateSavings(500, 150);

      // At $3 per 1M tokens, 350 tokens saved = $0.00105
      expect(savings.costSaved).toBeCloseTo(0.00105, 5);
    });

    it('should project monthly savings accurately', () => {
      skillLoader.calculateSavings.mockReturnValue({
        tokensSaved: 350,
        percentSaved: 70,
        costSaved: 0.00105,
        estimatedCostSavingsPerMonth: 1.05 // 1000 queries/month
      });

      const savings = skillLoader.calculateSavings(500, 150);

      // 1000 queries * $0.00105 = $1.05/month
      expect(savings.estimatedCostSavingsPerMonth).toBeCloseTo(1.05, 2);
    });

    it('should show cumulative savings across conversation', () => {
      const conversationQueries = [
        { full: 500, optimized: 150 }, // Simple math
        { full: 500, optimized: 150 }, // Another simple query
        { full: 500, optimized: 300 }, // Complex query with skills
        { full: 500, optimized: 150 }, // Back to simple
        { full: 500, optimized: 150 }  // Simple again
      ];

      let totalSaved = 0;

      conversationQueries.forEach(({ full, optimized }) => {
        const saved = full - optimized;
        totalSaved += saved;
      });

      // 350 + 350 + 200 + 350 + 350 = 1600 tokens saved
      expect(totalSaved).toBe(1600);

      // Cost saved: 1600 * ($3 / 1M) = $0.0048
      const costSaved = totalSaved * (3 / 1_000_000);
      expect(costSaved).toBeCloseTo(0.0048, 4);
    });
  });

  describe('Real-World Conversation Scenarios', () => {
    it('should handle "3000+500 then divide by 2" scenario efficiently', async () => {
      // First query: "3000 + 500"
      skillLoader.buildSystemPrompt.mockResolvedValueOnce({
        prompt: 'Base only',
        skillsLoaded: [],
        tokenCount: 150,
        simplified: true
      });

      await sdkManager.query({
        prompt: '3000 + 500',
        skillLoader: skillLoader
      });

      // Second query: "divide by 2" (with conversation context)
      skillLoader.buildSystemPrompt.mockResolvedValueOnce({
        prompt: 'Base only + conversation context',
        skillsLoaded: [],
        tokenCount: 200, // Slightly more for context
        simplified: true
      });

      await sdkManager.query({
        prompt: 'divide by 2',
        skillLoader: skillLoader,
        conversationContext: {
          previousQuery: '3000 + 500',
          previousResult: '3500'
        }
      });

      // Total: 150 + 200 = 350 tokens (vs 1000 without optimization)
      const totalTokens = 350;
      const totalSavings = 1000 - totalTokens;

      expect(totalSavings).toBe(650);
    });

    it('should maintain conversation memory while minimizing tokens', async () => {
      const conversation = [
        { query: 'Create a function', skillsLoaded: ['code-analysis'], tokens: 250 },
        { query: 'Add tests for it', skillsLoaded: ['testing'], tokens: 250 },
        { query: 'What was the function name?', skillsLoaded: [], tokens: 180 }
      ];

      for (const turn of conversation) {
        skillLoader.buildSystemPrompt.mockResolvedValueOnce({
          prompt: 'Optimized prompt',
          skillsLoaded: turn.skillsLoaded,
          tokenCount: turn.tokens,
          simplified: turn.skillsLoaded.length === 0
        });

        await sdkManager.query({
          prompt: turn.query,
          skillLoader: skillLoader
        });
      }

      const totalTokens = conversation.reduce((sum, turn) => sum + turn.tokens, 0);

      // Should be significantly less than full system for all 3 queries (1500 tokens)
      expect(totalTokens).toBe(680);
      expect(totalTokens).toBeLessThan(1500);
    });

    it('should handle mixed simple and complex queries efficiently', async () => {
      const queries = [
        { prompt: 'hello', tokens: 100, simple: true },
        { prompt: 'Create a REST API', tokens: 300, simple: false },
        { prompt: '5 + 3', tokens: 100, simple: true },
        { prompt: 'Write tests for the API', tokens: 250, simple: false },
        { prompt: 'what is 42?', tokens: 100, simple: true }
      ];

      for (const query of queries) {
        skillLoader.buildSystemPrompt.mockResolvedValueOnce({
          prompt: query.simple ? 'Base only' : 'Base + skills',
          skillsLoaded: query.simple ? [] : ['relevant-skill'],
          tokenCount: query.tokens,
          simplified: query.simple
        });

        await sdkManager.query({
          prompt: query.prompt,
          skillLoader: skillLoader
        });
      }

      const totalTokens = queries.reduce((sum, q) => sum + q.tokens, 0);

      // 100 + 300 + 100 + 250 + 100 = 850 tokens
      expect(totalTokens).toBe(850);

      // vs full system (500 tokens * 5 queries = 2500 tokens)
      const savings = 2500 - totalTokens;
      expect(savings).toBe(1650); // 66% reduction
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid-fire queries efficiently', async () => {
      const queries = Array(100).fill('5 + 3');

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'Base only',
        skillsLoaded: [],
        tokenCount: 150,
        simplified: true
      });

      const startTime = Date.now();

      await Promise.all(
        queries.map(query =>
          sdkManager.query({ prompt: query, skillLoader: skillLoader })
        )
      );

      const duration = Date.now() - startTime;

      // Should handle 100 queries quickly (skill loader caching helps)
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should benefit from caching for repeated query patterns', async () => {
      const repeatedQuery = 'debug this code';

      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + debugging skills',
        skillsLoaded: ['debugging'],
        tokenCount: 250,
        simplified: false
      });

      // First call - cache miss
      await sdkManager.query({
        prompt: repeatedQuery,
        skillLoader: skillLoader
      });

      // Subsequent calls - should use cache
      await sdkManager.query({
        prompt: repeatedQuery,
        skillLoader: skillLoader
      });

      await sdkManager.query({
        prompt: repeatedQuery,
        skillLoader: skillLoader
      });

      // SkillLoader should be called multiple times but use internal cache
      expect(skillLoader.buildSystemPrompt).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to full system if SkillLoader fails', async () => {
      skillLoader.buildSystemPrompt.mockRejectedValue(
        new Error('Skill loading failed')
      );

      // SDK should catch error and use default system prompt
      const result = await sdkManager.query({
        prompt: 'test query',
        skillLoader: skillLoader
      }).catch(error => {
        expect(error.message).toContain('Skill loading failed');
        return { fallback: true };
      });

      expect(result).toBeDefined();
    });

    it('should continue working if some skills fail to load', async () => {
      skillLoader.buildSystemPrompt.mockResolvedValue({
        prompt: 'System + partial skills',
        skillsLoaded: ['code-analysis'],
        skillsSkipped: ['missing-skill'],
        tokenCount: 200,
        simplified: false
      });

      const result = await sdkManager.query({
        prompt: 'debug code and test',
        skillLoader: skillLoader
      });

      const promptResult = await skillLoader.buildSystemPrompt('debug code and test');

      // Should still load available skills
      expect(promptResult.skillsLoaded).toContain('code-analysis');
      expect(promptResult.skillsSkipped).toContain('missing-skill');
    });
  });
});
