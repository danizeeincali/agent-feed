/**
 * 🚨 EMERGENCY TDD TEST SUITE FOR MENTIONSERVICE BUG
 * Critical Issue: @ mention detection works, dropdown opens, but MentionService returns 0 suggestions
 * Evidence: "Query: '' | MentionQuery: {"query":"","startIndex":0} | Suggestions: 0"
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { MentionService, type MentionSuggestion, type MentionConfig } from '../../services/MentionService';

describe('🚨 EMERGENCY TDD: MentionService Suggestion Loading Bug', () => {
  beforeEach(() => {
    // Clear any cached data before each test
    MentionService.clearCache();
  });

  describe('CRITICAL BUG: Empty Query Should Return Agents', () => {
    test('❌ FAILING TEST: searchMentions("") should return agents > 0', async () => {
      // ARRANGE: Set up for empty query test
      console.log('🧪 TDD TEST: Testing searchMentions with empty string');
      
      // ACT: Call searchMentions with empty string (this is the bug scenario)
      const result = await MentionService.searchMentions('');
      
      // ASSERT: Should return agents, NOT empty array
      console.log('🧪 TDD RESULT:', { 
        resultLength: result.length, 
        resultSample: result.slice(0, 3).map(r => ({ id: r.id, name: r.name, displayName: r.displayName }))
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0); // 🚨 THIS SHOULD FAIL with current bug
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('displayName');
    });

    test('❌ FAILING TEST: searchMentions(null/undefined) should return agents > 0', async () => {
      // Test various empty values
      const emptyValues = ['', null, undefined, '   ', '\n', '\t'];
      
      for (const emptyValue of emptyValues) {
        console.log('🧪 TDD TEST: Testing searchMentions with', JSON.stringify(emptyValue));
        
        // @ts-ignore - testing edge cases
        const result = await MentionService.searchMentions(emptyValue);
        
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0); // 🚨 THIS SHOULD FAIL
      }
    });

    test('❌ FAILING TEST: searchMentions("") should return at least 6 agents by default', async () => {
      const result = await MentionService.searchMentions('');
      
      expect(result.length).toBeGreaterThanOrEqual(6); // Default maxSuggestions
    });

    test('❌ FAILING TEST: searchMentions("") should respect maxSuggestions config', async () => {
      const config: MentionConfig = { maxSuggestions: 3 };
      const result = await MentionService.searchMentions('', config);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('CRITICAL BUG: Service Methods Should Return Agents', () => {
    test('❌ FAILING TEST: getAllAgents() should return agents array > 0', () => {
      console.log('🧪 TDD TEST: Testing getAllAgents');
      
      const result = MentionService.getAllAgents();
      
      console.log('🧪 TDD RESULT:', { 
        resultLength: result.length,
        hasResult: !!result,
        isArray: Array.isArray(result)
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0); // 🚨 THIS SHOULD FAIL
      
      // Validate agent structure
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('displayName');
      }
    });

    test('❌ FAILING TEST: getQuickMentions("post") should return agents > 0', () => {
      console.log('🧪 TDD TEST: Testing getQuickMentions("post")');
      
      const result = MentionService.getQuickMentions('post');
      
      console.log('🧪 TDD RESULT:', { 
        resultLength: result.length,
        resultSample: result.slice(0, 3).map(r => ({ id: r.id, name: r.name, displayName: r.displayName, type: r.type }))
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0); // 🚨 THIS SHOULD FAIL
    });

    test('❌ FAILING TEST: getQuickMentions() should return different results for different contexts', () => {
      const postResult = MentionService.getQuickMentions('post');
      const commentResult = MentionService.getQuickMentions('comment');
      const quickPostResult = MentionService.getQuickMentions('quick-post');
      
      // All should return agents
      expect(postResult.length).toBeGreaterThan(0);
      expect(commentResult.length).toBeGreaterThan(0);
      expect(quickPostResult.length).toBeGreaterThan(0);
      
      // Results might be different based on context
      // This is more of a behavioral test
    });
  });

  describe('CRITICAL BUG: Agent Data Integrity', () => {
    test('✅ PASSING TEST: Service instance should exist', () => {
      expect(MentionService).toBeDefined();
      expect(typeof MentionService.searchMentions).toBe('function');
      expect(typeof MentionService.getAllAgents).toBe('function');
      expect(typeof MentionService.getQuickMentions).toBe('function');
    });

    test('❌ FAILING TEST: Service should have internal agents data', () => {
      // This is a white-box test to check internal state
      const agents = MentionService.getAllAgents();
      
      // Check that we have the expected agent data
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(10); // We should have at least 10+ agents
      
      // Check for specific expected agents
      const agentNames = agents.map(a => a.name);
      expect(agentNames).toContain('chief-of-staff-agent');
      expect(agentNames).toContain('personal-todos-agent');
      expect(agentNames).toContain('meeting-prep-agent');
    });

    test('❌ FAILING TEST: Agents should have required properties', () => {
      const agents = MentionService.getAllAgents();
      
      expect(agents.length).toBeGreaterThan(0);
      
      agents.forEach((agent, index) => {
        expect(agent, `Agent at index ${index}`).toHaveProperty('id');
        expect(agent, `Agent at index ${index}`).toHaveProperty('name');
        expect(agent, `Agent at index ${index}`).toHaveProperty('displayName');
        expect(typeof agent.id, `Agent ${agent.id} id`).toBe('string');
        expect(typeof agent.name, `Agent ${agent.id} name`).toBe('string');
        expect(typeof agent.displayName, `Agent ${agent.id} displayName`).toBe('string');
        expect(agent.id.length, `Agent ${agent.id} id length`).toBeGreaterThan(0);
        expect(agent.name.length, `Agent ${agent.id} name length`).toBeGreaterThan(0);
        expect(agent.displayName.length, `Agent ${agent.id} displayName length`).toBeGreaterThan(0);
      });
    });
  });

  describe('CRITICAL BUG: Search Functionality', () => {
    test('❌ FAILING TEST: searchMentions() should work with non-empty queries', async () => {
      const testQueries = ['chief', 'todo', 'review', 'analyst'];
      
      for (const query of testQueries) {
        console.log('🧪 TDD TEST: Testing searchMentions with query:', query);
        
        const result = await MentionService.searchMentions(query);
        
        console.log('🧪 TDD RESULT:', { 
          query, 
          resultLength: result.length,
          resultSample: result.slice(0, 2).map(r => ({ name: r.name, displayName: r.displayName }))
        });
        
        // Should return some results for valid queries
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        // Note: This might pass because non-empty query search might work
        
        // Results should match query
        if (result.length > 0) {
          const hasMatch = result.some(agent => 
            agent.name.toLowerCase().includes(query.toLowerCase()) ||
            agent.displayName.toLowerCase().includes(query.toLowerCase()) ||
            (agent.description && agent.description.toLowerCase().includes(query.toLowerCase()))
          );
          expect(hasMatch).toBe(true);
        }
      }
    });

    test('🔍 DEBUG TEST: Compare empty vs non-empty query behavior', async () => {
      console.log('🧪 TDD DEBUG: Comparing empty vs non-empty query behavior');
      
      // Test empty query
      const emptyResult = await MentionService.searchMentions('');
      console.log('🧪 Empty query result:', { 
        length: emptyResult.length, 
        sample: emptyResult.slice(0, 2).map(r => r.displayName) 
      });
      
      // Test non-empty query
      const nonEmptyResult = await MentionService.searchMentions('chief');
      console.log('🧪 Non-empty query result:', { 
        length: nonEmptyResult.length, 
        sample: nonEmptyResult.slice(0, 2).map(r => r.displayName) 
      });
      
      // Both should return results, but they're likely different
      expect(emptyResult.length).toBeGreaterThan(0); // 🚨 THIS WILL FAIL
      expect(nonEmptyResult.length).toBeGreaterThan(0); // This might pass
    });
  });

  describe('PERFORMANCE & CACHE TESTS', () => {
    test('🧪 Cache should work for empty queries', async () => {
      // Clear cache first
      MentionService.clearCache();
      
      // First call
      const start1 = Date.now();
      const result1 = await MentionService.searchMentions('');
      const time1 = Date.now() - start1;
      
      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await MentionService.searchMentions('');
      const time2 = Date.now() - start2;
      
      console.log('🧪 Cache performance:', { time1, time2, cached: time2 < time1 });
      
      expect(result1.length).toEqual(result2.length);
      expect(result1).toEqual(result2);
      // Cache should make second call faster (though this might be flaky in tests)
    });
  });
});

/**
 * 🚨 EMERGENCY TDD SUMMARY
 * 
 * EXPECTED FAILURES:
 * 1. searchMentions('') returns 0 agents instead of all agents
 * 2. getAllAgents() might return empty or undefined
 * 3. getQuickMentions('post') returns 0 agents
 * 
 * ROOT CAUSE HYPOTHESES:
 * 1. MentionService.agents array might be undefined/empty
 * 2. searchMentions empty query logic might be broken
 * 3. Singleton instance might not be properly initialized
 * 4. Cache might be interfering with first-time loads
 * 
 * FIX STRATEGY:
 * 1. Ensure agents array is properly initialized 
 * 2. Fix empty query handling in searchMentions
 * 3. Add validation and fallbacks throughout
 * 4. Test service in isolation before integration
 */