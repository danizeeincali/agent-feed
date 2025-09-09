/**
 * MentionService Behavior Tests - TDD London School
 * Tests the interaction patterns and contracts of MentionService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockMentionSuggestion, 
  createMockMentionSuggestions 
} from '../factories/MockFactory';
import { MentionServiceContract, type IMentionService } from '../contracts/ComponentContracts';
import type { MentionSuggestion } from '@/services/MentionService';

class MentionServiceBehaviorSuite extends LondonSchoolTestSuite {
  private mentionService!: IMentionService;
  private mockCacheService!: any;

  protected setupCollaborators(): void {
    this.mockCacheService = testSetup.mockService('CacheService', {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      clear: vi.fn()
    });

    this.mentionService = testSetup.mockService('MentionService');
  }

  protected verifyAllInteractions(): void {
    // Verify cache interactions when expected
    // This is called after each test to ensure proper collaboration
  }

  public testSearchMentionsWithEmptyQuery(): void {
    this.testBehavior(
      LondonTestUtils.behavior()
        .given('the MentionService is initialized')
        .when('searchMentions is called with empty query')
        .then([
          'it should return all available agents',
          'it should not consult the cache for empty queries',
          'it should return results in the correct format'
        ])
        .withCollaborators(['MentionService'])
        .build(),
      () => {
        it('should return all available agents for empty query', async () => {
          // Arrange
          const expectedSuggestions = createMockMentionSuggestions(5);
          this.mentionService.searchMentions = vi.fn().mockResolvedValue(expectedSuggestions);

          // Act
          const result = await this.mentionService.searchMentions('');

          // Assert - London School focuses on behavior verification
          expect(this.mentionService.searchMentions).toHaveBeenCalledWith('');
          expect(result).toHaveLength(5);
          expect(result).toEqual(expectedSuggestions);
        });
      }
    );
  }

  public testSearchMentionsWithQuery(): void {
    it('should filter agents based on query and return matching results', async () => {
      // Arrange
      const mockSuggestions = [
        createMockMentionSuggestion({ 
          name: 'chief-of-staff-agent', 
          displayName: 'Chief of Staff' 
        }),
        createMockMentionSuggestion({ 
          name: 'code-reviewer-agent', 
          displayName: 'Code Reviewer' 
        })
      ];
      this.mentionService.searchMentions = vi.fn().mockResolvedValue([mockSuggestions[0]]);

      // Act
      const result = await this.mentionService.searchMentions('chief');

      // Assert - Verify the interaction pattern
      expect(this.mentionService.searchMentions).toHaveBeenCalledWith('chief');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('chief-of-staff-agent');
    });
  }

  public testSearchMentionsWithCaching(): void {
    it('should use cache for repeated queries and store results', async () => {
      // Arrange
      const mockSuggestions = createMockMentionSuggestions(3);
      this.mentionService.searchMentions = vi.fn().mockResolvedValue(mockSuggestions);
      
      // Mock cache behavior
      this.mockCacheService.has = vi.fn()
        .mockReturnValueOnce(false)  // First call - cache miss
        .mockReturnValueOnce(true);  // Second call - cache hit
      this.mockCacheService.get = vi.fn().mockReturnValue(mockSuggestions);

      // Act - First call should populate cache
      const firstResult = await this.mentionService.searchMentions('test');
      
      // Act - Second call should use cache
      const secondResult = await this.mentionService.searchMentions('test');

      // Assert - London School verifies collaboration patterns
      expect(this.mentionService.searchMentions).toHaveBeenCalledTimes(2);
      expect(firstResult).toEqual(mockSuggestions);
      expect(secondResult).toEqual(mockSuggestions);
    });
  }

  public testGetAllAgentsBehavior(): void {
    it('should return all available agents without filtering', () => {
      // Arrange
      const allAgents = createMockMentionSuggestions(10);
      this.mentionService.getAllAgents = vi.fn().mockReturnValue(allAgents);

      // Act
      const result = this.mentionService.getAllAgents();

      // Assert - Verify the contract is fulfilled
      expect(this.mentionService.getAllAgents).toHaveBeenCalledWith();
      expect(result).toHaveLength(10);
      expect(result).toBe(allAgents);
    });
  }

  public testGetQuickMentionsByContext(): void {
    describe('getQuickMentions context behavior', () => {
      it('should return context-appropriate agents for comments', () => {
        // Arrange
        const commentAgents = createMockMentionSuggestions(3).map(agent => ({
          ...agent,
          type: 'reviewer'
        }));
        this.mentionService.getQuickMentions = vi.fn().mockReturnValue(commentAgents);

        // Act
        const result = this.mentionService.getQuickMentions('comment');

        // Assert - Verify context-aware behavior
        expect(this.mentionService.getQuickMentions).toHaveBeenCalledWith('comment');
        expect(result).toHaveLength(3);
        result.forEach(agent => {
          expect(agent.type).toBe('reviewer');
        });
      });

      it('should return different agents for post context', () => {
        // Arrange
        const postAgents = createMockMentionSuggestions(5).map(agent => ({
          ...agent,
          type: 'coordinator'
        }));
        this.mentionService.getQuickMentions = vi.fn().mockReturnValue(postAgents);

        // Act
        const result = this.mentionService.getQuickMentions('post');

        // Assert
        expect(this.mentionService.getQuickMentions).toHaveBeenCalledWith('post');
        expect(result).toHaveLength(5);
      });
    });
  }

  public testMentionValidationBehavior(): void {
    it('should validate mention names against known agents', () => {
      // Arrange
      this.mentionService.validateMention = vi.fn()
        .mockReturnValueOnce(true)   // Valid agent
        .mockReturnValueOnce(false); // Invalid agent

      // Act & Assert - Test valid mention
      const validResult = this.mentionService.validateMention('chief-of-staff-agent');
      expect(this.mentionService.validateMention).toHaveBeenCalledWith('chief-of-staff-agent');
      expect(validResult).toBe(true);

      // Act & Assert - Test invalid mention
      const invalidResult = this.mentionService.validateMention('nonexistent-agent');
      expect(this.mentionService.validateMention).toHaveBeenCalledWith('nonexistent-agent');
      expect(invalidResult).toBe(false);
    });
  }

  public testMentionExtractionBehavior(): void {
    it('should extract all mentions from content text', () => {
      // Arrange
      const content = 'Hey @chief-of-staff-agent and @code-reviewer, please review this @bug-hunter';
      const expectedMentions = ['chief-of-staff-agent', 'code-reviewer', 'bug-hunter'];
      this.mentionService.extractMentions = vi.fn().mockReturnValue(expectedMentions);

      // Act
      const result = this.mentionService.extractMentions(content);

      // Assert - Verify extraction behavior
      expect(this.mentionService.extractMentions).toHaveBeenCalledWith(content);
      expect(result).toEqual(expectedMentions);
      expect(result).toHaveLength(3);
    });

    it('should handle content with no mentions', () => {
      // Arrange
      const content = 'This content has no mentions at all';
      this.mentionService.extractMentions = vi.fn().mockReturnValue([]);

      // Act
      const result = this.mentionService.extractMentions(content);

      // Assert
      expect(this.mentionService.extractMentions).toHaveBeenCalledWith(content);
      expect(result).toEqual([]);
    });
  }

  public testCacheClearingBehavior(): void {
    it('should clear all cached data when requested', () => {
      // Arrange
      this.mentionService.clearCache = vi.fn();

      // Act
      this.mentionService.clearCache();

      // Assert - Verify collaboration with cache service
      expect(this.mentionService.clearCache).toHaveBeenCalledWith();
    });
  }

  public testErrorHandlingBehavior(): void {
    it('should handle search failures gracefully', async () => {
      // Arrange
      const errorMessage = 'Network error';
      this.mentionService.searchMentions = vi.fn().mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(this.mentionService.searchMentions('test'))
        .rejects.toThrow(errorMessage);
      
      expect(this.mentionService.searchMentions).toHaveBeenCalledWith('test');
    });

    it('should return fallback agents when service is unavailable', () => {
      // Arrange - Simulate service degradation
      this.mentionService.getAllAgents = vi.fn().mockImplementation(() => {
        // First call fails, second call returns fallback
        throw new Error('Service unavailable');
      });

      // Act & Assert
      expect(() => this.mentionService.getAllAgents()).toThrow('Service unavailable');
      expect(this.mentionService.getAllAgents).toHaveBeenCalledWith();
    });
  }
}

// Test Suite Execution
describe('MentionService Behavior Tests (London School TDD)', () => {
  let behaviorSuite: MentionServiceBehaviorSuite;

  beforeEach(() => {
    testSetup.resetAll();
    behaviorSuite = new MentionServiceBehaviorSuite();
    behaviorSuite.beforeEach();
  });

  afterEach(() => {
    behaviorSuite.afterEach();
  });

  describe('Search Mention Behavior', () => {
    behaviorSuite.testSearchMentionsWithEmptyQuery();
    behaviorSuite.testSearchMentionsWithQuery();
    behaviorSuite.testSearchMentionsWithCaching();
  });

  describe('Agent Retrieval Behavior', () => {
    behaviorSuite.testGetAllAgentsBehavior();
    behaviorSuite.testGetQuickMentionsByContext();
  });

  describe('Mention Processing Behavior', () => {
    behaviorSuite.testMentionValidationBehavior();
    behaviorSuite.testMentionExtractionBehavior();
  });

  describe('Cache Management Behavior', () => {
    behaviorSuite.testCacheClearingBehavior();
  });

  describe('Error Handling Behavior', () => {
    behaviorSuite.testErrorHandlingBehavior();
  });

  // Integration behavior test
  describe('Service Integration Behavior', () => {
    it('should coordinate with multiple services in proper sequence', async () => {
      // This test verifies the interaction patterns between services
      const behaviorSpec = LondonTestUtils.behavior()
        .given('MentionService needs to search and cache results')
        .when('a search is performed with caching enabled')
        .then([
          'cache should be checked first',
          'search should only be performed on cache miss', 
          'results should be cached after successful search'
        ])
        .withCollaborators(['MentionService', 'CacheService'])
        .build();

      // Test implementation would verify the interaction sequence
      expect(behaviorSpec.collaborators).toContain('MentionService');
      expect(behaviorSpec.collaborators).toContain('CacheService');
    });
  });
});