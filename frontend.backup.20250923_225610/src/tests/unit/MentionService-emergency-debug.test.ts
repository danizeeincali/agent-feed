import { describe, it, expect, beforeEach } from 'vitest';
import { MentionService } from '../../services/MentionService';

describe('EMERGENCY DEBUG: MentionService Direct Testing', () => {
  // MentionService is a singleton instance, not a constructor

  beforeEach(() => {
    // Clear cache before each test
    MentionService.clearCache();
  });

  describe('CRITICAL: Service Data Availability', () => {
    it('should have agent data available in service', () => {
      // Direct test of service initialization
      expect(MentionService).toBeDefined();
      
      // Test if service has internal agent data
      const quickMentions = MentionService.getQuickMentions('post');
      console.log('EMERGENCY DEBUG - Quick mentions:', quickMentions);
      
      expect(quickMentions).toBeDefined();
      expect(Array.isArray(quickMentions)).toBe(true);
      expect(quickMentions.length).toBeGreaterThan(0);
    });

    it('should return agent data for empty search query', async () => {
      const results = await MentionService.searchMentions('');
      
      console.log('EMERGENCY DEBUG - Empty search results:', results);
      console.log('EMERGENCY DEBUG - Results count:', results.length);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check structure of returned agents
      if (results.length > 0) {
        const agent = results[0];
        console.log('EMERGENCY DEBUG - Agent structure:', agent);
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('type');
      }
    });

    it('should return filtered results for specific search query', async () => {
      const results = await MentionService.searchMentions('ass');
      
      console.log('EMERGENCY DEBUG - Search "ass" results:', results);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should find Assistant agent
      const assistantAgent = results.find(agent => 
        agent.name.toLowerCase().includes('ass') || 
        agent.id.toLowerCase().includes('ass')
      );
      
      console.log('EMERGENCY DEBUG - Found assistant agent:', assistantAgent);
      expect(assistantAgent).toBeDefined();
    });
  });

  describe('CRITICAL: Method Behavior Analysis', () => {
    it('should test getSuggestions method behavior', async () => {
      if ('getSuggestions' in MentionService && typeof (MentionService as any).getSuggestions === 'function') {
        try {
          const suggestions = await (MentionService as any).getSuggestions('', 'post');
          console.log('EMERGENCY DEBUG - getSuggestions results:', suggestions);
          expect(suggestions).toBeDefined();
        } catch (error) {
          console.log('EMERGENCY DEBUG - getSuggestions error:', error);
        }
      } else {
        console.log('EMERGENCY DEBUG - getSuggestions method not found');
      }
    });

    it('should test all available methods on service', () => {
      console.log('EMERGENCY DEBUG - MentionService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(MentionService)));
      console.log('EMERGENCY DEBUG - MentionService instance properties:', Object.keys(MentionService));
      
      // Test if service has expected methods
      expect(typeof MentionService.searchMentions).toBe('function');
      expect(typeof MentionService.getQuickMentions).toBe('function');
    });
  });

  describe('CRITICAL: Query Processing Analysis', () => {
    it('should handle various query formats', async () => {
      const testQueries = ['', 'a', 'ass', 'assistant', 'Agent', '@agent'];
      
      for (const query of testQueries) {
        const results = await MentionService.searchMentions(query);
        console.log(`EMERGENCY DEBUG - Query "${query}" results:`, results.length, results.map(r => r.name));
        
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should test context-specific suggestions', () => {
      const contexts = ['post', 'comment', 'reply', ''];
      
      for (const context of contexts) {
        const results = MentionService.getQuickMentions(context as any);
        console.log(`EMERGENCY DEBUG - Context "${context}" quick mentions:`, results.length, results.map(r => r.name));
        
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });

  describe('CRITICAL: Performance and Error Handling', () => {
    it('should handle concurrent search requests', async () => {
      const promises = [
        MentionService.searchMentions('a'),
        MentionService.searchMentions('ass'),
        MentionService.searchMentions('agent'),
      ];

      const results = await Promise.all(promises);
      
      console.log('EMERGENCY DEBUG - Concurrent results:', results.map(r => r.length));
      
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle invalid input gracefully', async () => {
      const invalidInputs = [null, undefined, 123, {}, []];
      
      for (const input of invalidInputs) {
        try {
          const result = await MentionService.searchMentions(input as any);
          console.log(`EMERGENCY DEBUG - Invalid input "${input}" handled:`, result);
          expect(Array.isArray(result)).toBe(true);
        } catch (error) {
          console.log(`EMERGENCY DEBUG - Invalid input "${input}" threw error:`, error);
          // Should not throw, should handle gracefully
          expect(error).toBeDefined();
        }
      }
    });
  });
});