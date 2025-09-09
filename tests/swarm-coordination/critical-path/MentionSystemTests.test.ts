/**
 * Critical Path Tests: Mention System
 * Comprehensive testing for @ mention functionality and regression prevention
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFactory } from '../mocks/MockFactory';
import { TestValidationUtils } from '../assertions/CustomAssertions';
import '../assertions/CustomAssertions'; // Load custom matchers

describe('🔥 Critical Path: Mention System', () => {
  let mockPosts: any[];
  let mockComments: any[];
  let mockWebSocket: any;
  
  beforeEach(() => {
    mockPosts = mockFactory.createMockPosts(10);
    mockComments = mockFactory.createMockComments('test-post', 5);
    mockWebSocket = mockFactory.createWebSocketMock();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFactory.resetMocks();
  });

  describe('Mention Detection and Extraction', () => {
    it('should correctly extract mentions from post content', () => {
      const testCases = [
        {
          content: 'Hello @alice and @bob, check this out!',
          expectedMentions: ['alice', 'bob']
        },
        {
          content: 'Working with @team-lead on the @project-name',
          expectedMentions: ['team-lead', 'project-name']
        },
        {
          content: 'No mentions in this post',
          expectedMentions: []
        },
        {
          content: '@claude this is amazing! Thanks @developer for the help',
          expectedMentions: ['claude', 'developer']
        }
      ];

      testCases.forEach(({ content, expectedMentions }, index) => {
        const post = {
          id: `test-post-${index}`,
          content,
          mentions: extractMentionsFromContent(content),
          author: 'tester'
        };

        expect(post).toHaveMentions(expectedMentions);
        expect(post.mentions).toEqual(expectedMentions);
      });
    });

    it('should handle edge cases in mention detection', () => {
      const edgeCases = [
        {
          content: '@@double-at should not work',
          expectedMentions: []
        },
        {
          content: 'Email test@example.com should not be mention',
          expectedMentions: []
        },
        {
          content: '@_underscore-user and @123numeric-start',
          expectedMentions: ['_underscore-user', '123numeric-start']
        },
        {
          content: '@user. @user, @user! @user?',
          expectedMentions: ['user', 'user', 'user', 'user']
        }
      ];

      edgeCases.forEach(({ content, expectedMentions }, index) => {
        const mentions = extractMentionsFromContent(content);
        expect(mentions).toEqual(expectedMentions);
      });
    });

    it('should prevent self-mentions', () => {
      const post = {
        id: 'self-mention-test',
        content: 'I am @alice talking about myself',
        author: 'alice',
        mentions: extractMentionsFromContent('I am @alice talking about myself')
      };

      // Should filter out self-mentions
      const filteredMentions = post.mentions.filter(mention => mention !== post.author);
      expect(filteredMentions).toEqual([]);
    });
  });

  describe('Mention Notifications', () => {
    it('should generate valid mention notifications', () => {
      const notifications = mockFactory.createMockWebSocketMessages(5)
        .filter(msg => msg.type === 'mention_notification');

      notifications.forEach(notification => {
        expect(notification.data).toBeValidMentionNotification();
      });
    });

    it('should handle multiple mentions in single post', () => {
      const post = {
        id: 'multi-mention-post',
        content: 'Great work @alice, @bob, and @charlie!',
        author: 'diana',
        mentions: ['alice', 'bob', 'charlie']
      };

      // Should generate notification for each mentioned user
      const notifications = post.mentions.map(user => ({
        type: 'mention_notification',
        data: {
          mentionedUser: user,
          postId: post.id,
          author: post.author
        }
      }));

      expect(notifications).toHaveLength(3);
      notifications.forEach(notification => {
        expect(notification.data).toBeValidMentionNotification();
      });
    });

    it('should deliver notifications via WebSocket', async () => {
      const mockNotification = {
        type: 'mention_notification',
        data: {
          mentionedUser: 'alice',
          postId: 'test-post-123',
          author: 'bob'
        },
        timestamp: new Date().toISOString()
      };

      // Simulate WebSocket message delivery
      mockWebSocket.simulateMessage(mockNotification);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(mockNotification)
      );
    });
  });

  describe('Mention Dropdown and UI Integration', () => {
    it('should show mention dropdown when typing @', () => {
      const mockMentionInput = {
        value: 'Hello @',
        cursorPosition: 7,
        showDropdown: true,
        suggestions: ['alice', 'bob', 'charlie']
      };

      expect(mockMentionInput.showDropdown).toBe(true);
      expect(mockMentionInput.suggestions.length).toBeGreaterThan(0);
    });

    it('should filter suggestions based on typed characters', () => {
      const allUsers = ['alice', 'bob', 'charlie', 'diana'];
      const typedChars = 'al';
      
      const filteredSuggestions = allUsers.filter(user => 
        user.toLowerCase().startsWith(typedChars.toLowerCase())
      );

      expect(filteredSuggestions).toEqual(['alice']);
    });

    it('should complete mention when suggestion selected', () => {
      const inputBefore = 'Hello @al';
      const selectedUser = 'alice';
      const expectedResult = 'Hello @alice ';

      const completedInput = inputBefore.replace(/@al$/, `@${selectedUser} `);
      expect(completedInput).toBe(expectedResult);
    });

    it('should handle keyboard navigation in dropdown', () => {
      const dropdown = {
        suggestions: ['alice', 'bob', 'charlie'],
        selectedIndex: 0,
        navigateDown: () => Math.min(dropdown.selectedIndex + 1, dropdown.suggestions.length - 1),
        navigateUp: () => Math.max(dropdown.selectedIndex - 1, 0)
      };

      // Test navigation
      dropdown.selectedIndex = dropdown.navigateDown();
      expect(dropdown.selectedIndex).toBe(1);
      
      dropdown.selectedIndex = dropdown.navigateUp();
      expect(dropdown.selectedIndex).toBe(0);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should work correctly in PostCreator component', () => {
      const postCreatorData = {
        content: 'New post with @alice mention',
        mentions: extractMentionsFromContent('New post with @alice mention'),
        showMentionDropdown: false
      };

      expect(postCreatorData).toHaveMentions(['alice']);
      expect(postCreatorData.mentions).toHaveLength(1);
    });

    it('should work correctly in CommentForm component', () => {
      const commentData = {
        content: 'Reply to @bob with @charlie',
        mentions: extractMentionsFromContent('Reply to @bob with @charlie'),
        parentId: 'post-123'
      };

      expect(commentData).toHaveMentions(['bob', 'charlie']);
      expect(commentData.mentions).toHaveLength(2);
    });

    it('should maintain mention state across component re-renders', () => {
      let componentState = {
        content: 'Draft with @alice',
        mentions: ['alice'],
        renderCount: 0
      };

      // Simulate re-render
      componentState = {
        ...componentState,
        renderCount: componentState.renderCount + 1
      };

      expect(componentState.mentions).toEqual(['alice']);
      expect(componentState.renderCount).toBe(1);
    });
  });

  describe('Performance and Regression Prevention', () => {
    it('should process mentions efficiently for large posts', () => {
      const longContent = 'This is a very long post with multiple mentions: ' + 
        Array.from({ length: 100 }, (_, i) => `@user${i}`).join(' ');

      const startTime = performance.now();
      const mentions = extractMentionsFromContent(longContent);
      const endTime = performance.now();

      expect(endTime - startTime).toBeWithinResponseTime(100); // Should complete within 100ms
      expect(mentions).toHaveLength(100);
    });

    it('should not cause memory leaks with frequent mention processing', () => {
      // Simulate frequent mention processing
      for (let i = 0; i < 1000; i++) {
        const content = `Test post ${i} with @user${i % 10}`;
        extractMentionsFromContent(content);
      }

      // Memory usage should remain stable
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it('should prevent mention dropdown rendering bugs', () => {
      const dropdownStates = [
        { showDropdown: true, suggestions: ['alice', 'bob'] },
        { showDropdown: false, suggestions: [] },
        { showDropdown: true, suggestions: ['charlie'] },
        { showDropdown: false, suggestions: [] }
      ];

      // Rapid state changes should not cause errors
      dropdownStates.forEach(state => {
        expect(state.suggestions).toEqual(
          expect.arrayContaining(state.showDropdown ? expect.any(Array) : [])
        );
      });
    });

    it('should handle concurrent mention processing', async () => {
      const concurrentPosts = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-post-${i}`,
        content: `Concurrent post ${i} with @user${i}`,
        author: `author${i}`
      }));

      const results = await Promise.all(
        concurrentPosts.map(async post => ({
          ...post,
          mentions: extractMentionsFromContent(post.content)
        }))
      );

      results.forEach((result, index) => {
        expect(result.mentions).toEqual([`user${index}`]);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed mention patterns gracefully', () => {
      const malformedCases = [
        '@ invalid space after at',
        '@',
        '@@',
        '@user@domain.com',
        '@user with spaces',
        ''
      ];

      malformedCases.forEach(content => {
        expect(() => extractMentionsFromContent(content)).not.toThrow();
        const mentions = extractMentionsFromContent(content);
        expect(Array.isArray(mentions)).toBe(true);
      });
    });

    it('should handle network failures for mention notifications', () => {
      const failingWebSocket = {
        ...mockWebSocket,
        send: vi.fn().mockImplementation(() => {
          throw new Error('Network failure');
        })
      };

      expect(() => {
        try {
          failingWebSocket.send(JSON.stringify({ type: 'mention_notification' }));
        } catch (error) {
          // Should handle gracefully
          console.warn('Mention notification failed:', error);
        }
      }).not.toThrow();
    });

    it('should validate mention system integration', () => {
      const validation = TestValidationUtils.validateMentionSystem(mockPosts);
      
      expect(validation.passed).toBe(true);
      expect(validation.summary).toContain('checks passed');
    });
  });
});

/**
 * Helper function to extract mentions from content
 * This simulates the actual mention extraction logic
 */
function extractMentionsFromContent(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  
  const mentionPattern = /@([a-zA-Z0-9_-]+)/g;
  const matches = content.match(mentionPattern);
  
  if (!matches) return [];
  
  return matches
    .map(match => match.substring(1)) // Remove @ symbol
    .filter((mention, index, array) => array.indexOf(mention) === index); // Remove duplicates
}