import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SkillLoader } from '../../api-server/worker/skill-loader.js';
import { estimateTokenCount } from '../../api-server/worker/token-estimator.js';

describe('Simple Query Fix - Integration Tests', () => {
  let skillLoader;

  beforeAll(() => {
    skillLoader = new SkillLoader();
  });

  describe('End-to-End Simple Math Query', () => {
    it('should process "what is 500+343?" query successfully', async () => {
      const conversation = [
        {
          role: 'system',
          content: 'You are Avi, a helpful AI assistant.'
        },
        {
          role: 'user',
          content: '---\nUser: what is 500+343?\n---'
        }
      ];

      // Execute skill loading
      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Verify successful execution
      expect(skills).toBeDefined();
      expect(Array.isArray(skills)).toBe(true);

      // Log for debugging
      console.log('Skills loaded:', skills.length);
      console.log('Skill names:', skills.map(s => s.name));
    });

    it('should load correct number of skills (≤ 2 for simple math)', async () => {
      const conversation = [
        {
          role: 'user',
          content: 'what is 500+343?'
        }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Simple math should require minimal skills
      expect(skills.length).toBeLessThanOrEqual(2);
      expect(skills.length).toBeGreaterThan(0);

      console.log('✓ Skill count optimized:', skills.length, 'skills loaded');
    });

    it('should keep token count reasonable (< 10,000 tokens)', async () => {
      const conversation = [
        {
          role: 'system',
          content: 'You are Avi, a helpful AI assistant.'
        },
        {
          role: 'user',
          content: 'what is 500+343?'
        }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Calculate total prompt size
      const systemPrompt = conversation[0].content;
      const userQuery = conversation[1].content;
      const skillsPrompt = skills.map(s => s.prompt || '').join('\n\n');

      const totalPrompt = `${systemPrompt}\n\n${skillsPrompt}\n\n${userQuery}`;
      const tokenCount = estimateTokenCount(totalPrompt);

      expect(tokenCount).toBeLessThan(10000);

      console.log('✓ Token count optimized:', tokenCount, 'tokens');
      console.log('  System:', estimateTokenCount(systemPrompt), 'tokens');
      console.log('  Skills:', estimateTokenCount(skillsPrompt), 'tokens');
      console.log('  User:', estimateTokenCount(userQuery), 'tokens');
    });

    it('should verify response would contain correct answer (843)', async () => {
      // This is an integration test - we verify the skill loading
      // The actual calculation would be done by the LLM
      const conversation = [
        {
          role: 'user',
          content: 'what is 500+343?'
        }
      ];

      const skills = await skillLoader.loadSkillsForRequest(conversation);

      // Verify calculator skill is loaded
      const hasCalculator = skills.some(skill =>
        skill.name.toLowerCase().includes('calculator') ||
        skill.name.toLowerCase().includes('math') ||
        skill.prompt?.toLowerCase().includes('calculate') ||
        skill.prompt?.toLowerCase().includes('math')
      );

      expect(hasCalculator).toBe(true);
      console.log('✓ Calculator skill available for computation');
    });
  });

  describe('Real-World Query Scenarios', () => {
    it('should handle arithmetic with formatting variations', async () => {
      const queries = [
        'what is 500+343?',
        'calculate 500 + 343',
        '500 plus 343',
        'add 500 and 343',
        'What is the sum of 500 and 343?'
      ];

      for (const query of queries) {
        const conversation = [{ role: 'user', content: query }];
        const skills = await skillLoader.loadSkillsForRequest(conversation);

        expect(skills.length).toBeLessThanOrEqual(3);
        expect(skills.length).toBeGreaterThan(0);

        console.log(`✓ "${query}" → ${skills.length} skills`);
      }
    });

    it('should handle mixed complexity queries appropriately', async () => {
      const testCases = [
        {
          query: 'what is 2+2?',
          expectedMaxSkills: 2,
          description: 'very simple math'
        },
        {
          query: 'calculate the average of 10, 20, 30, 40, 50',
          expectedMaxSkills: 2,
          description: 'simple statistics'
        },
        {
          query: 'search for weather in Paris and calculate temperature',
          expectedMaxSkills: 4,
          description: 'multi-domain query'
        }
      ];

      for (const testCase of testCases) {
        const conversation = [{ role: 'user', content: testCase.query }];
        const skills = await skillLoader.loadSkillsForRequest(conversation);

        expect(skills.length).toBeLessThanOrEqual(testCase.expectedMaxSkills);

        console.log(`✓ ${testCase.description}: "${testCase.query}" → ${skills.length}/${testCase.expectedMaxSkills} skills`);
      }
    });
  });

  describe('Performance Validation', () => {
    it('should process simple queries faster than complex ones', async () => {
      const simpleQuery = [{ role: 'user', content: 'what is 500+343?' }];
      const complexQuery = [{
        role: 'user',
        content: 'Search the web for AI research papers, summarize the top 5, calculate citation counts, and email me the results'
      }];

      // Simple query timing
      const simpleStart = Date.now();
      const simpleSkills = await skillLoader.loadSkillsForRequest(simpleQuery);
      const simpleDuration = Date.now() - simpleStart;

      // Complex query timing
      const complexStart = Date.now();
      const complexSkills = await skillLoader.loadSkillsForRequest(complexQuery);
      const complexDuration = Date.now() - complexStart;

      console.log(`Simple query: ${simpleDuration}ms (${simpleSkills.length} skills)`);
      console.log(`Complex query: ${complexDuration}ms (${complexSkills.length} skills)`);

      // Simple should load fewer skills
      expect(simpleSkills.length).toBeLessThan(complexSkills.length);

      // Both should complete reasonably fast
      expect(simpleDuration).toBeLessThan(2000);
      expect(complexDuration).toBeLessThan(3000);
    });

    it('should maintain consistent performance across multiple requests', async () => {
      const durations = [];
      const query = [{ role: 'user', content: 'calculate 100 + 200' }];

      // Run 5 iterations
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await skillLoader.loadSkillsForRequest(query);
        const duration = Date.now() - start;
        durations.push(duration);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log(`Performance stats over 5 runs:`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Min: ${minDuration}ms`);
      console.log(`  Max: ${maxDuration}ms`);
      console.log(`  Variance: ${(maxDuration - minDuration).toFixed(2)}ms`);

      // Variance should be reasonable (max should not be more than 3x min)
      expect(maxDuration).toBeLessThanOrEqual(minDuration * 3);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed conversation gracefully', async () => {
      const malformedConversations = [
        null,
        undefined,
        [],
        [{ role: 'invalid' }],
        [{ content: 'no role' }]
      ];

      for (const conversation of malformedConversations) {
        try {
          const skills = await skillLoader.loadSkillsForRequest(conversation);
          // Should either return empty array or handle gracefully
          expect(Array.isArray(skills)).toBe(true);
        } catch (error) {
          // Error should be informative
          expect(error.message).toBeTruthy();
          console.log(`✓ Graceful error for malformed input: ${error.message}`);
        }
      }
    });

    it('should reject extremely large prompts (>200KB)', async () => {
      const largeContent = 'x'.repeat(250 * 1024); // 250KB
      const conversation = [
        { role: 'user', content: largeContent }
      ];

      await expect(
        skillLoader.loadSkillsForRequest(conversation)
      ).rejects.toThrow();
    });

    it('should handle concurrent requests without race conditions', async () => {
      const queries = [
        [{ role: 'user', content: 'what is 1+1?' }],
        [{ role: 'user', content: 'what is 2+2?' }],
        [{ role: 'user', content: 'what is 3+3?' }],
        [{ role: 'user', content: 'what is 4+4?' }],
        [{ role: 'user', content: 'what is 5+5?' }]
      ];

      // Execute all requests concurrently
      const results = await Promise.all(
        queries.map(q => skillLoader.loadSkillsForRequest(q))
      );

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach(skills => {
        expect(Array.isArray(skills)).toBe(true);
        expect(skills.length).toBeGreaterThan(0);
      });

      console.log('✓ Concurrent requests handled successfully');
    });
  });
});
