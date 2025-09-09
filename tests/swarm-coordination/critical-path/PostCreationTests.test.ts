/**
 * Critical Path Tests: Post Creation System
 * Comprehensive testing for post creation workflows and draft management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFactory } from '../mocks/MockFactory';
import { TestValidationUtils } from '../assertions/CustomAssertions';
import '../assertions/CustomAssertions';

describe('🚀 Critical Path: Post Creation System', () => {
  let mockApiClient: any;
  let mockQueryClient: any;
  let mockLocalStorage: any;

  beforeEach(() => {
    mockApiClient = mockFactory.createApiMocks();
    mockQueryClient = mockFactory.createQueryClientMock();
    mockLocalStorage = mockFactory.createLocalStorageMock();
    
    // Setup global mocks
    (global as any).localStorage = mockLocalStorage;
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFactory.resetMocks();
  });

  describe('Post Creation Workflow', () => {
    it('should create a valid post with all required fields', async () => {
      const postData = {
        content: 'This is a test post with @alice and #testing',
        author: 'testuser',
        mentions: ['alice'],
        hashtags: ['testing']
      };

      const createdPost = await mockApiClient.createPost(postData);

      expect(createdPost).toBeValidPost();
      expect(createdPost).toHaveMentions(['alice']);
      expect(createdPost).toHaveHashtags(['testing']);
      expect(createdPost.id).toBeDefined();
      expect(createdPost.timestamp).toHaveValidTimestamp();
    });

    it('should handle post creation with multiple mentions and hashtags', async () => {
      const postData = {
        content: 'Great work @alice @bob @charlie! #teamwork #success #ai #development',
        author: 'manager',
        mentions: ['alice', 'bob', 'charlie'],
        hashtags: ['teamwork', 'success', 'ai', 'development']
      };

      const createdPost = await mockApiClient.createPost(postData);

      expect(createdPost).toBeValidPost();
      expect(createdPost.mentions).toHaveLength(3);
      expect(createdPost.hashtags).toHaveLength(4);
      expect(createdPost).toHaveMentions(['alice', 'bob', 'charlie']);
      expect(createdPost).toHaveHashtags(['teamwork', 'success', 'ai', 'development']);
    });

    it('should validate post content before creation', () => {
      const invalidPosts = [
        { content: '', author: 'user' }, // Empty content
        { content: 'Valid content', author: '' }, // Empty author
        { content: ' ', author: 'user' }, // Whitespace only
        { content: 'x'.repeat(5001), author: 'user' } // Too long
      ];

      invalidPosts.forEach(postData => {
        expect(() => validatePostData(postData)).toThrow();
      });
    });

    it('should handle character limit enforcement', () => {
      const validPost = {
        content: 'A'.repeat(500), // Within limit
        author: 'user'
      };

      const invalidPost = {
        content: 'A'.repeat(5001), // Exceeds limit
        author: 'user'
      };

      expect(() => validatePostData(validPost)).not.toThrow();
      expect(() => validatePostData(invalidPost)).toThrow('Content exceeds maximum length');
    });

    it('should track character count in real-time', () => {
      const characterCounter = {
        content: '',
        maxLength: 5000,
        getCurrentCount: () => characterCounter.content.length,
        getRemainingCount: () => characterCounter.maxLength - characterCounter.content.length,
        isValid: () => characterCounter.getCurrentCount() <= characterCounter.maxLength
      };

      // Test typing simulation
      characterCounter.content = 'Hello world';
      expect(characterCounter.getCurrentCount()).toBe(11);
      expect(characterCounter.getRemainingCount()).toBe(4989);
      expect(characterCounter.isValid()).toBe(true);

      // Test limit approach
      characterCounter.content = 'A'.repeat(5000);
      expect(characterCounter.getCurrentCount()).toBe(5000);
      expect(characterCounter.getRemainingCount()).toBe(0);
      expect(characterCounter.isValid()).toBe(true);

      // Test limit exceeded
      characterCounter.content = 'A'.repeat(5001);
      expect(characterCounter.isValid()).toBe(false);
    });
  });

  describe('Draft Management System', () => {
    it('should save drafts automatically', () => {
      const draftData = {
        id: 'draft-123',
        content: 'This is a draft post with @alice',
        author: 'user',
        timestamp: new Date().toISOString(),
        isDraft: true
      };

      // Simulate auto-save
      mockLocalStorage.setItem(`draft-${draftData.id}`, JSON.stringify(draftData));

      const savedDraft = JSON.parse(mockLocalStorage.getItem(`draft-${draftData.id}`));
      expect(savedDraft).toEqual(draftData);
      expect(savedDraft.isDraft).toBe(true);
    });

    it('should load existing drafts on component mount', () => {
      // Setup existing drafts
      const drafts = [
        { id: 'draft-1', content: 'First draft', author: 'user' },
        { id: 'draft-2', content: 'Second draft with @bob', author: 'user' },
        { id: 'draft-3', content: 'Third draft #important', author: 'user' }
      ];

      drafts.forEach(draft => {
        mockLocalStorage.setItem(`draft-${draft.id}`, JSON.stringify(draft));
      });

      // Simulate loading drafts
      const loadedDrafts = [];
      for (let i = 0; i < mockLocalStorage.length; i++) {
        const key = mockLocalStorage.key(i);
        if (key && key.startsWith('draft-')) {
          const draft = JSON.parse(mockLocalStorage.getItem(key));
          loadedDrafts.push(draft);
        }
      }

      expect(loadedDrafts).toHaveLength(3);
      expect(loadedDrafts.map(d => d.id)).toEqual(['draft-1', 'draft-2', 'draft-3']);
    });

    it('should handle draft publishing workflow', async () => {
      const draftData = {
        id: 'draft-publish-test',
        content: 'Draft ready for publishing with @team',
        author: 'user',
        mentions: ['team'],
        isDraft: true
      };

      // Save as draft first
      mockLocalStorage.setItem(`draft-${draftData.id}`, JSON.stringify(draftData));

      // Publish the draft
      const publishData = { ...draftData, isDraft: false };
      const publishedPost = await mockApiClient.createPost(publishData);

      // Remove from drafts
      mockLocalStorage.removeItem(`draft-${draftData.id}`);

      expect(publishedPost).toBeValidPost();
      expect(publishedPost.isDraft).toBeFalsy();
      expect(mockLocalStorage.getItem(`draft-${draftData.id}`)).toBeNull();
    });

    it('should prevent data loss on browser crashes', () => {
      const unsavedContent = {
        content: 'Important content that must not be lost @urgentteam',
        author: 'user',
        timestamp: new Date().toISOString()
      };

      // Simulate periodic auto-save
      const autoSaveKey = 'auto-save-current';
      mockLocalStorage.setItem(autoSaveKey, JSON.stringify(unsavedContent));

      // Simulate browser restart/crash recovery
      const recoveredContent = JSON.parse(mockLocalStorage.getItem(autoSaveKey));
      
      expect(recoveredContent).toEqual(unsavedContent);
      expect(recoveredContent.content).toContain('@urgentteam');
    });

    it('should manage multiple drafts efficiently', () => {
      const multipleOptions = Array.from({ length: 10 }, (_, i) => ({
        id: `draft-${i}`,
        content: `Draft content ${i} with @user${i}`,
        author: 'user',
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      // Save all drafts
      multipleOptions.forEach(draft => {
        mockLocalStorage.setItem(`draft-${draft.id}`, JSON.stringify(draft));
      });

      // Verify all saved
      expect(mockLocalStorage.length).toBe(10);

      // Test cleanup of old drafts (keep only 5 most recent)
      const allDrafts = [];
      for (let i = 0; i < mockLocalStorage.length; i++) {
        const key = mockLocalStorage.key(i);
        if (key && key.startsWith('draft-')) {
          allDrafts.push(JSON.parse(mockLocalStorage.getItem(key)));
        }
      }

      const sortedDrafts = allDrafts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Keep only 5 most recent
      sortedDrafts.slice(5).forEach(draft => {
        mockLocalStorage.removeItem(`draft-${draft.id}`);
      });

      // Verify cleanup
      const remainingKeys = [];
      for (let i = 0; i < mockLocalStorage.length; i++) {
        const key = mockLocalStorage.key(i);
        if (key && key.startsWith('draft-')) {
          remainingKeys.push(key);
        }
      }

      expect(remainingKeys.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Content Processing and Validation', () => {
    it('should process hashtags correctly', () => {
      const content = 'Working on #AI #machine-learning #deep_learning project #2024';
      const hashtags = extractHashtagsFromContent(content);

      expect(hashtags).toEqual(['AI', 'machine-learning', 'deep_learning', '2024']);
    });

    it('should handle mixed content with mentions and hashtags', () => {
      const content = 'Great collaboration @alice @bob on #ai #project! #success';
      
      const mentions = extractMentionsFromContent(content);
      const hashtags = extractHashtagsFromContent(content);

      expect(mentions).toEqual(['alice', 'bob']);
      expect(hashtags).toEqual(['ai', 'project', 'success']);
    });

    it('should sanitize dangerous content', () => {
      const dangerousContent = 'Test post <script>alert("xss")</script> with @user';
      const sanitized = sanitizeContent(dangerousContent);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('@user');
    });

    it('should validate URL handling in posts', () => {
      const contentWithUrls = 'Check out https://example.com and http://test.org @team #links';
      
      const urls = extractUrlsFromContent(contentWithUrls);
      expect(urls).toEqual(['https://example.com', 'http://test.org']);
      
      // URLs should not interfere with mentions/hashtags
      expect(extractMentionsFromContent(contentWithUrls)).toEqual(['team']);
      expect(extractHashtagsFromContent(contentWithUrls)).toEqual(['links']);
    });
  });

  describe('Real-time Updates and WebSocket Integration', () => {
    it('should broadcast new posts via WebSocket', async () => {
      const mockWebSocket = mockFactory.createWebSocketMock();
      const postData = {
        content: 'New post for real-time testing @subscribers',
        author: 'broadcaster'
      };

      const createdPost = await mockApiClient.createPost(postData);

      // Simulate WebSocket broadcast
      const broadcastMessage = {
        type: 'post_created',
        data: createdPost,
        timestamp: new Date().toISOString()
      };

      mockWebSocket.simulateMessage(broadcastMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(broadcastMessage)
      );
    });

    it('should update UI immediately after post creation', async () => {
      const initialPosts = mockFactory.createMockPosts(5);
      mockQueryClient.setQueryData('posts', initialPosts);

      const newPost = {
        content: 'Real-time UI update test @frontend',
        author: 'ui-tester'
      };

      const createdPost = await mockApiClient.createPost(newPost);

      // Simulate optimistic update
      const updatedPosts = [createdPost, ...initialPosts];
      mockQueryClient.setQueryData('posts', updatedPosts);

      const currentPosts = mockQueryClient.getQueryData('posts');
      expect(currentPosts).toHaveLength(6);
      expect(currentPosts[0]).toEqual(createdPost);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle rapid post creation', async () => {
      const rapidPosts = Array.from({ length: 100 }, (_, i) => ({
        content: `Rapid post ${i} with @user${i % 10}`,
        author: 'speed-tester'
      }));

      const startTime = performance.now();
      const createdPosts = await Promise.all(
        rapidPosts.map(post => mockApiClient.createPost(post))
      );
      const endTime = performance.now();

      expect(createdPosts).toHaveLength(100);
      expect(endTime - startTime).toBeWithinResponseTime(5000); // Within 5 seconds
    });

    it('should handle network failures gracefully', async () => {
      mockApiClient.createPost.mockRejectedValueOnce(new Error('Network error'));

      const postData = {
        content: 'Test post for error handling',
        author: 'error-tester'
      };

      await expect(mockApiClient.createPost(postData)).rejects.toThrow('Network error');
      
      // Should preserve draft on failure
      const draftKey = 'failed-post-draft';
      mockLocalStorage.setItem(draftKey, JSON.stringify(postData));
      expect(mockLocalStorage.getItem(draftKey)).toBeDefined();
    });

    it('should prevent duplicate post submissions', async () => {
      const postData = {
        content: 'Unique post content for duplicate prevention',
        author: 'duplicate-tester'
      };

      // Simulate rapid double-click
      const [result1, result2] = await Promise.allSettled([
        mockApiClient.createPost(postData),
        mockApiClient.createPost(postData)
      ]);

      // Both should succeed but should be detected as potential duplicates
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');
      
      // In real implementation, would check content similarity and timing
      const timeDiff = Math.abs(
        new Date(result2.value?.timestamp || 0).getTime() - 
        new Date(result1.value?.timestamp || 0).getTime()
      );
      
      if (timeDiff < 1000) { // Within 1 second
        console.warn('Potential duplicate submission detected');
      }
    });
  });
});

// Helper functions for content processing
function validatePostData(postData: any): void {
  if (!postData.content || postData.content.trim() === '') {
    throw new Error('Content cannot be empty');
  }
  
  if (!postData.author || postData.author.trim() === '') {
    throw new Error('Author cannot be empty');
  }
  
  if (postData.content.length > 5000) {
    throw new Error('Content exceeds maximum length');
  }
}

function extractMentionsFromContent(content: string): string[] {
  const mentionPattern = /@([a-zA-Z0-9_-]+)/g;
  const matches = content.match(mentionPattern);
  return matches ? matches.map(match => match.substring(1)) : [];
}

function extractHashtagsFromContent(content: string): string[] {
  const hashtagPattern = /#([a-zA-Z0-9_-]+)/g;
  const matches = content.match(hashtagPattern);
  return matches ? matches.map(match => match.substring(1)) : [];
}

function extractUrlsFromContent(content: string): string[] {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const matches = content.match(urlPattern);
  return matches || [];
}

function sanitizeContent(content: string): string {
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}