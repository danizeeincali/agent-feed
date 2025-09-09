import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MentionService, MentionSuggestion, MentionConfig } from '../../services/MentionService';

describe('MentionService', () => {
  beforeEach(() => {
    // Clear cache before each test
    MentionService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('searchMentions', () => {
    it('should return all agents when query is empty', async () => {
      const results = await MentionService.searchMentions('');
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(8); // default maxSuggestions
    });

    it('should filter agents by query string', async () => {
      const results = await MentionService.searchMentions('code');
      
      expect(results).toBeDefined();
      expect(results.some(agent => 
        agent.name.toLowerCase().includes('code') ||
        agent.displayName.toLowerCase().includes('code') ||
        (agent.description && agent.description.toLowerCase().includes('code'))
      )).toBe(true);
    });

    it('should filter agents by name', async () => {
      const results = await MentionService.searchMentions('chief');
      
      expect(results).toBeDefined();
      expect(results.some(agent => 
        agent.name.toLowerCase().includes('chief') ||
        agent.displayName.toLowerCase().includes('chief')
      )).toBe(true);
    });

    it('should filter agents by displayName', async () => {
      const results = await MentionService.searchMentions('reviewer');
      
      expect(results).toBeDefined();
      expect(results.some(agent => 
        agent.displayName.toLowerCase().includes('reviewer')
      )).toBe(true);
    });

    it('should filter agents by description', async () => {
      const results = await MentionService.searchMentions('analysis');
      
      expect(results).toBeDefined();
      expect(results.some(agent => 
        agent.description && agent.description.toLowerCase().includes('analysis')
      )).toBe(true);
    });

    it('should be case insensitive', async () => {
      const lowerResults = await MentionService.searchMentions('code');
      const upperResults = await MentionService.searchMentions('CODE');
      const mixedResults = await MentionService.searchMentions('Code');
      
      expect(lowerResults).toEqual(upperResults);
      expect(lowerResults).toEqual(mixedResults);
    });

    it('should respect maxSuggestions config', async () => {
      const config: MentionConfig = { maxSuggestions: 3 };
      const results = await MentionService.searchMentions('', config);
      
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should filter by type when specified', async () => {
      const config: MentionConfig = { filterByType: ['reviewer'] };
      const results = await MentionService.searchMentions('', config);
      
      expect(results).toBeDefined();
      expect(results.every(agent => agent.type === 'reviewer')).toBe(true);
    });

    it('should filter by multiple types', async () => {
      const config: MentionConfig = { filterByType: ['reviewer', 'tester'] };
      const results = await MentionService.searchMentions('', config);
      
      expect(results).toBeDefined();
      expect(results.every(agent => 
        agent.type === 'reviewer' || agent.type === 'tester'
      )).toBe(true);
    });

    it('should return empty array for non-existent query', async () => {
      const results = await MentionService.searchMentions('nonexistentquery123');
      
      expect(results).toEqual([]);
    });

    it('should prioritize exact name matches', async () => {
      const results = await MentionService.searchMentions('code');
      
      expect(results).toBeDefined();
      if (results.length > 1) {
        // Check if exact matches come first
        const exactNameMatch = results.find(agent => 
          agent.name.toLowerCase().startsWith('code')
        );
        if (exactNameMatch) {
          expect(results[0]).toEqual(exactNameMatch);
        }
      }
    });

    it('should prioritize display name matches', async () => {
      const results = await MentionService.searchMentions('bug');
      
      expect(results).toBeDefined();
      if (results.length > 1) {
        const exactDisplayMatch = results.find(agent => 
          agent.displayName.toLowerCase().startsWith('bug')
        );
        if (exactDisplayMatch) {
          expect(results[0]).toEqual(exactDisplayMatch);
        }
      }
    });

    it('should handle empty filter types gracefully', async () => {
      const config: MentionConfig = { filterByType: [] };
      const results = await MentionService.searchMentions('', config);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getAllAgents', () => {
    it('should return all available agents', () => {
      const agents = MentionService.getAllAgents();
      
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      
      // Verify structure of first agent
      const firstAgent = agents[0];
      expect(firstAgent).toHaveProperty('id');
      expect(firstAgent).toHaveProperty('name');
      expect(firstAgent).toHaveProperty('displayName');
      expect(typeof firstAgent.id).toBe('string');
      expect(typeof firstAgent.name).toBe('string');
      expect(typeof firstAgent.displayName).toBe('string');
    });

    it('should return a copy of agents array', () => {
      const agents1 = MentionService.getAllAgents();
      const agents2 = MentionService.getAllAgents();
      
      expect(agents1).not.toBe(agents2); // Different references
      expect(agents1).toEqual(agents2); // Same content
    });
  });

  describe('getAgentById', () => {
    it('should return agent by valid ID', () => {
      const allAgents = MentionService.getAllAgents();
      const firstAgent = allAgents[0];
      
      const foundAgent = MentionService.getAgentById(firstAgent.id);
      
      expect(foundAgent).toEqual(firstAgent);
    });

    it('should return null for invalid ID', () => {
      const foundAgent = MentionService.getAgentById('invalid-id');
      
      expect(foundAgent).toBeNull();
    });

    it('should return null for empty ID', () => {
      const foundAgent = MentionService.getAgentById('');
      
      expect(foundAgent).toBeNull();
    });
  });

  describe('getAgentsByType', () => {
    it('should return agents of specified type', () => {
      const reviewerAgents = MentionService.getAgentsByType('reviewer');
      
      expect(reviewerAgents).toBeDefined();
      expect(Array.isArray(reviewerAgents)).toBe(true);
      expect(reviewerAgents.every(agent => agent.type === 'reviewer')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      const agents = MentionService.getAgentsByType('nonexistent');
      
      expect(agents).toEqual([]);
    });

    it('should handle undefined type gracefully', () => {
      const agents = MentionService.getAgentsByType(undefined as any);
      
      expect(agents).toEqual([]);
    });
  });

  describe('extractMentions', () => {
    it('should extract single mention from text', () => {
      const text = 'Hello @code-reviewer, please review this';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toEqual(['code-reviewer']);
    });

    it('should extract multiple mentions from text', () => {
      const text = 'Hey @code-reviewer and @bug-hunter, help needed!';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toContain('code-reviewer');
      expect(mentions).toContain('bug-hunter');
      expect(mentions.length).toBe(2);
    });

    it('should handle mentions with dashes and underscores', () => {
      const text = 'Contact @test-agent_123 and @another_agent-456';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toContain('test-agent_123');
      expect(mentions).toContain('another_agent-456');
    });

    it('should handle mentions at start of text', () => {
      const text = '@code-reviewer please help';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toEqual(['code-reviewer']);
    });

    it('should handle mentions at end of text', () => {
      const text = 'Please help @code-reviewer';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toEqual(['code-reviewer']);
    });

    it('should return empty array for text with no mentions', () => {
      const text = 'No mentions in this text';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toEqual([]);
    });

    it('should handle empty string', () => {
      const mentions = MentionService.extractMentions('');
      
      expect(mentions).toEqual([]);
    });

    it('should handle mentions in multiline text', () => {
      const text = `First line with @agent1
Second line with @agent2
Third line with @agent3`;
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toContain('agent1');
      expect(mentions).toContain('agent2');
      expect(mentions).toContain('agent3');
    });

    it('should not extract @ symbols that are not mentions', () => {
      const text = 'Email me at user@domain.com or @validmention';
      const mentions = MentionService.extractMentions(text);
      
      expect(mentions).toEqual(['validmention']);
      expect(mentions).not.toContain('domain.com');
    });
  });

  describe('validateMention', () => {
    it('should validate existing agent names', () => {
      const allAgents = MentionService.getAllAgents();
      const firstAgent = allAgents[0];
      
      const isValid = MentionService.validateMention(firstAgent.name);
      
      expect(isValid).toBe(true);
    });

    it('should invalidate non-existent agent names', () => {
      const isValid = MentionService.validateMention('non-existent-agent');
      
      expect(isValid).toBe(false);
    });

    it('should handle empty string', () => {
      const isValid = MentionService.validateMention('');
      
      expect(isValid).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      const allAgents = MentionService.getAllAgents();
      const firstAgent = allAgents[0];
      
      // Should be case sensitive
      const isValidUpper = MentionService.validateMention(firstAgent.name.toUpperCase());
      
      expect(isValidUpper).toBe(false);
    });
  });

  describe('getQuickMentions', () => {
    it('should return quick mentions for post context', () => {
      const mentions = MentionService.getQuickMentions('post');
      
      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeLessThanOrEqual(6);
    });

    it('should return quick mentions for comment context', () => {
      const mentions = MentionService.getQuickMentions('comment');
      
      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeLessThanOrEqual(5);
      
      // Should contain reviewer/analyst/tester types
      const hasExpectedTypes = mentions.some(mention => 
        ['reviewer', 'analyst', 'tester'].includes(mention.type || '')
      );
      expect(hasExpectedTypes).toBe(true);
    });

    it('should return quick mentions for quick-post context', () => {
      const mentions = MentionService.getQuickMentions('quick-post');
      
      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeLessThanOrEqual(5);
      
      // Should contain coordinator/planner/reviewer types
      const hasExpectedTypes = mentions.some(mention => 
        ['coordinator', 'planner', 'reviewer'].includes(mention.type || '')
      );
      expect(hasExpectedTypes).toBe(true);
    });

    it('should default to post context', () => {
      const defaultMentions = MentionService.getQuickMentions();
      const postMentions = MentionService.getQuickMentions('post');
      
      expect(defaultMentions).toEqual(postMentions);
    });

    it('should handle invalid context gracefully', () => {
      const mentions = MentionService.getQuickMentions('invalid' as any);
      
      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should cache search results', async () => {
      const spy = vi.spyOn(MentionService as any, 'agents', 'get');
      
      // First call
      await MentionService.searchMentions('test');
      const firstCallCount = spy.mock.calls.length;
      
      // Second call with same query should use cache
      await MentionService.searchMentions('test');
      const secondCallCount = spy.mock.calls.length;
      
      // Should not have made additional calls to agents getter
      expect(secondCallCount).toBe(firstCallCount);
      
      spy.mockRestore();
    });

    it('should clear cache when requested', async () => {
      // Populate cache
      await MentionService.searchMentions('test');
      
      // Clear cache
      MentionService.clearCache();
      
      // Verify cache is empty (indirect test via behavior)
      const result = await MentionService.searchMentions('test');
      expect(result).toBeDefined(); // Should still work after clearing
    });

    it('should handle cache expiry', async () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      const mockTime = 1000000;
      Date.now = vi.fn(() => mockTime);
      
      try {
        // First call to populate cache
        await MentionService.searchMentions('test');
        
        // Fast forward time beyond cache duration
        Date.now = vi.fn(() => mockTime + 6 * 60 * 1000); // 6 minutes later
        
        // Should work even with expired cache
        const result = await MentionService.searchMentions('test');
        expect(result).toBeDefined();
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined input gracefully', async () => {
      const result1 = await MentionService.searchMentions(null as any);
      const result2 = await MentionService.searchMentions(undefined as any);
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });

    it('should handle malformed config gracefully', async () => {
      const malformedConfig = {
        maxSuggestions: -1,
        filterByType: null,
        invalidProperty: 'invalid'
      } as any;
      
      const result = await MentionService.searchMentions('test', malformedConfig);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large queries efficiently', async () => {
      const start = performance.now();
      
      const longQuery = 'a'.repeat(1000);
      await MentionService.searchMentions(longQuery);
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete within reasonable time (100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle many concurrent searches', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        MentionService.searchMentions(`query${i}`)
      );
      
      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();
      
      expect(results.length).toBe(100);
      expect(results.every(result => Array.isArray(result))).toBe(true);
      
      // Should complete within reasonable time
      const duration = end - start;
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Data Integrity', () => {
    it('should return consistent agent structure', async () => {
      const results = await MentionService.searchMentions('');
      
      expect(results.every(agent => {
        return typeof agent.id === 'string' &&
               typeof agent.name === 'string' &&
               typeof agent.displayName === 'string' &&
               (agent.description === undefined || typeof agent.description === 'string') &&
               (agent.avatar === undefined || typeof agent.avatar === 'string') &&
               (agent.type === undefined || typeof agent.type === 'string');
      })).toBe(true);
    });

    it('should not modify original agent data', async () => {
      const originalAgents = MentionService.getAllAgents();
      const originalFirst = { ...originalAgents[0] };
      
      // Perform operations that might modify data
      await MentionService.searchMentions('test');
      MentionService.getAgentById(originalFirst.id);
      
      const afterAgents = MentionService.getAllAgents();
      const afterFirst = afterAgents.find(a => a.id === originalFirst.id);
      
      expect(afterFirst).toEqual(originalFirst);
    });

    it('should ensure unique agent IDs', () => {
      const agents = MentionService.getAllAgents();
      const ids = agents.map(agent => agent.id);
      const uniqueIds = [...new Set(ids)];
      
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should ensure unique agent names', () => {
      const agents = MentionService.getAllAgents();
      const names = agents.map(agent => agent.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names.length).toBe(uniqueNames.length);
    });
  });
});