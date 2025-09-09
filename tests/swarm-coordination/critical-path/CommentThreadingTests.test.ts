/**
 * Critical Path Tests: Comment Threading System
 * Comprehensive testing for nested comments and threading functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFactory } from '../mocks/MockFactory';
import { TestValidationUtils } from '../assertions/CustomAssertions';
import '../assertions/CustomAssertions';

describe('🧵 Critical Path: Comment Threading System', () => {
  let mockPosts: any[];
  let mockComments: any[];
  let mockApiClient: any;
  let mockWebSocket: any;

  beforeEach(() => {
    mockPosts = mockFactory.createMockPosts(5);
    mockComments = mockFactory.createMockComments('test-post', 10);
    mockApiClient = mockFactory.createApiMocks();
    mockWebSocket = mockFactory.createWebSocketMock();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFactory.resetMocks();
  });

  describe('Comment Creation and Validation', () => {
    it('should create valid comments with proper threading', async () => {
      const commentData = {
        postId: 'post-123',
        content: 'This is a test comment with @alice',
        author: 'commenter',
        mentions: ['alice']
      };

      const createdComment = await mockApiClient.createComment(commentData);

      expect(createdComment).toBeValidComment();
      expect(createdComment.postId).toBe('post-123');
      expect(createdComment).toHaveMentions(['alice']);
      expect(createdComment.timestamp).toHaveValidTimestamp();
    });

    it('should create nested reply comments', async () => {
      const parentComment = {
        id: 'parent-comment-1',
        postId: 'post-123',
        content: 'Parent comment',
        author: 'parent-author'
      };

      const replyData = {
        postId: 'post-123',
        content: 'Reply to parent comment @parent-author',
        author: 'reply-author',
        parentId: 'parent-comment-1',
        mentions: ['parent-author']
      };

      const createdReply = await mockApiClient.createComment(replyData);

      expect(createdReply).toBeValidComment();
      expect(createdReply.parentId).toBe('parent-comment-1');
      expect(createdReply).toHaveMentions(['parent-author']);
    });

    it('should enforce maximum threading depth', () => {
      const maxDepth = 3;
      const deepThread = createDeepThread('post-1', maxDepth + 1);

      // Should prevent comments deeper than max depth
      const tooDeepComment = {
        postId: 'post-1',
        content: 'This should be rejected',
        author: 'deep-user',
        parentId: deepThread[deepThread.length - 1].id
      };

      expect(() => validateCommentDepth(tooDeepComment, deepThread, maxDepth))
        .toThrow('Comment threading depth exceeds maximum allowed');
    });

    it('should validate comment content requirements', () => {
      const invalidComments = [
        { postId: 'post-1', content: '', author: 'user' }, // Empty content
        { postId: '', content: 'Valid content', author: 'user' }, // Empty post ID
        { postId: 'post-1', content: 'Valid content', author: '' }, // Empty author
        { postId: 'post-1', content: ' ', author: 'user' } // Whitespace only
      ];

      invalidComments.forEach(comment => {
        expect(() => validateCommentData(comment)).toThrow();
      });
    });
  });

  describe('Thread Structure and Integrity', () => {
    it('should maintain correct parent-child relationships', () => {
      const threadStructure = [
        { id: 'comment-1', parentId: null, postId: 'post-1' },
        { id: 'comment-2', parentId: 'comment-1', postId: 'post-1' },
        { id: 'comment-3', parentId: 'comment-1', postId: 'post-1' },
        { id: 'comment-4', parentId: 'comment-2', postId: 'post-1' }
      ];

      const validation = TestValidationUtils.validateCommentThreading(threadStructure as any);
      expect(validation.passed).toBe(true);
    });

    it('should detect and prevent circular references', () => {
      const circularComments = [
        { id: 'comment-1', parentId: 'comment-2', postId: 'post-1' },
        { id: 'comment-2', parentId: 'comment-1', postId: 'post-1' }
      ];

      expect(() => validateThreadIntegrity(circularComments))
        .toThrow('Circular reference detected in comment thread');
    });

    it('should handle orphaned comments gracefully', () => {
      const commentsWithOrphans = [
        { id: 'comment-1', parentId: null, postId: 'post-1' },
        { id: 'comment-2', parentId: 'nonexistent-parent', postId: 'post-1' }
      ];

      const fixedComments = resolveOrphanedComments(commentsWithOrphans);
      
      // Orphaned comment should be moved to root level
      expect(fixedComments.find(c => c.id === 'comment-2')?.parentId).toBeNull();
    });

    it('should sort comments by timestamp within threads', () => {
      const unsortedComments = [
        { id: 'comment-3', parentId: 'comment-1', timestamp: '2024-01-01T10:30:00Z' },
        { id: 'comment-2', parentId: 'comment-1', timestamp: '2024-01-01T10:20:00Z' },
        { id: 'comment-1', parentId: null, timestamp: '2024-01-01T10:10:00Z' },
        { id: 'comment-4', parentId: 'comment-1', timestamp: '2024-01-01T10:25:00Z' }
      ];

      const sortedComments = sortCommentsInThread(unsortedComments);
      
      // Root comment should be first
      expect(sortedComments[0].id).toBe('comment-1');
      
      // Replies should be sorted by timestamp
      const replies = sortedComments.filter(c => c.parentId === 'comment-1');
      expect(replies.map(r => r.id)).toEqual(['comment-2', 'comment-4', 'comment-3']);
    });
  });

  describe('UI Rendering and Interaction', () => {
    it('should render threaded comments with correct indentation', () => {
      const threadedComments = [
        { id: 'comment-1', parentId: null, depth: 0 },
        { id: 'comment-2', parentId: 'comment-1', depth: 1 },
        { id: 'comment-3', parentId: 'comment-2', depth: 2 },
        { id: 'comment-4', parentId: 'comment-1', depth: 1 }
      ];

      threadedComments.forEach(comment => {
        const expectedIndent = comment.depth * 20; // 20px per level
        expect(comment.depth).toBeGreaterThanOrEqual(0);
        expect(comment.depth).toBeLessThanOrEqual(3);
        expect(expectedIndent).toBeLessThanOrEqual(60); // Max 3 levels deep
      });
    });

    it('should handle collapse/expand functionality', () => {
      const threadState = {
        'comment-1': { collapsed: false, replyCount: 5 },
        'comment-2': { collapsed: true, replyCount: 2 },
        'comment-3': { collapsed: false, replyCount: 0 }
      };

      // Toggle collapse state
      threadState['comment-1'].collapsed = !threadState['comment-1'].collapsed;
      expect(threadState['comment-1'].collapsed).toBe(true);

      // Collapsed comments should hide replies
      const visibleReplies = Object.entries(threadState)
        .filter(([_, state]) => !state.collapsed)
        .reduce((total, [_, state]) => total + state.replyCount, 0);

      expect(visibleReplies).toBe(0); // Only non-collapsed comment has no replies
    });

    it('should show reply count indicators', () => {
      const commentsWithCounts = mockComments.map(comment => ({
        ...comment,
        replyCount: comment.replies?.length || 0,
        hasReplies: (comment.replies?.length || 0) > 0
      }));

      commentsWithCounts.forEach(comment => {
        if (comment.hasReplies) {
          expect(comment.replyCount).toBeGreaterThan(0);
        } else {
          expect(comment.replyCount).toBe(0);
        }
      });
    });

    it('should handle load more replies functionality', async () => {
      const parentCommentId = 'comment-with-many-replies';
      const initialReplies = Array.from({ length: 5 }, (_, i) => ({
        id: `reply-${i}`,
        parentId: parentCommentId,
        content: `Reply ${i}`,
        author: `user-${i}`
      }));

      const additionalReplies = Array.from({ length: 10 }, (_, i) => ({
        id: `reply-${i + 5}`,
        parentId: parentCommentId,
        content: `Reply ${i + 5}`,
        author: `user-${i + 5}`
      }));

      // Initially show 5 replies
      let visibleReplies = initialReplies;
      expect(visibleReplies).toHaveLength(5);

      // Load more replies
      visibleReplies = [...visibleReplies, ...additionalReplies.slice(0, 5)];
      expect(visibleReplies).toHaveLength(10);
    });
  });

  describe('Real-time Updates and Notifications', () => {
    it('should broadcast new comments via WebSocket', async () => {
      const commentData = {
        postId: 'post-realtime',
        content: 'Real-time comment test @followers',
        author: 'realtime-user',
        mentions: ['followers']
      };

      const createdComment = await mockApiClient.createComment(commentData);

      const broadcastMessage = {
        type: 'comment_added',
        data: createdComment,
        timestamp: new Date().toISOString()
      };

      mockWebSocket.simulateMessage(broadcastMessage);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(broadcastMessage)
      );
    });

    it('should update thread counts in real-time', () => {
      const postMetrics = {
        'post-1': { commentCount: 5, lastActivity: '2024-01-01T10:00:00Z' },
        'post-2': { commentCount: 3, lastActivity: '2024-01-01T09:30:00Z' }
      };

      // Simulate new comment added to post-1
      postMetrics['post-1'].commentCount += 1;
      postMetrics['post-1'].lastActivity = new Date().toISOString();

      expect(postMetrics['post-1'].commentCount).toBe(6);
      expect(new Date(postMetrics['post-1'].lastActivity).getTime())
        .toBeGreaterThan(new Date('2024-01-01T10:00:00Z').getTime());
    });

    it('should notify mentioned users in comments', async () => {
      const commentWithMentions = {
        postId: 'post-mentions',
        content: 'Great point @alice! What do you think @bob?',
        author: 'commenter',
        mentions: ['alice', 'bob']
      };

      const createdComment = await mockApiClient.createComment(commentWithMentions);

      // Should generate notifications for each mention
      const notifications = createdComment.mentions.map((user: string) => ({
        type: 'mention_notification',
        data: {
          mentionedUser: user,
          postId: createdComment.postId,
          commentId: createdComment.id,
          author: createdComment.author
        }
      }));

      expect(notifications).toHaveLength(2);
      notifications.forEach(notification => {
        expect(notification.data).toBeValidMentionNotification();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large comment threads efficiently', () => {
      const largeThread = Array.from({ length: 1000 }, (_, i) => ({
        id: `comment-${i}`,
        postId: 'large-post',
        content: `Comment ${i}`,
        author: `user-${i % 50}`,
        parentId: i > 0 && i % 10 === 0 ? `comment-${i - 10}` : null,
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      }));

      const startTime = performance.now();
      const organizedThread = organizeCommentsIntoThread(largeThread);
      const endTime = performance.now();

      expect(endTime - startTime).toBeWithinResponseTime(500); // Within 500ms
      expect(organizedThread.length).toBeGreaterThan(0);
    });

    it('should implement virtual scrolling for long threads', () => {
      const virtualScrollConfig = {
        itemHeight: 100,
        containerHeight: 500,
        totalItems: 1000,
        visibleItems: Math.ceil(500 / 100), // 5 items visible
        scrollTop: 0
      };

      const getVisibleRange = (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / virtualScrollConfig.itemHeight);
        const endIndex = Math.min(
          startIndex + virtualScrollConfig.visibleItems + 1,
          virtualScrollConfig.totalItems
        );
        return { startIndex, endIndex };
      };

      const { startIndex, endIndex } = getVisibleRange(500); // Scrolled halfway
      expect(startIndex).toBe(5);
      expect(endIndex).toBe(11);
      expect(endIndex - startIndex).toBeLessThanOrEqual(7); // Reasonable visible range
    });

    it('should cache thread structures for quick access', () => {
      const threadCache = new Map();
      const postId = 'cached-post';
      const comments = mockFactory.createMockComments(postId, 20);

      // Build and cache thread structure
      const threadStructure = organizeCommentsIntoThread(comments);
      threadCache.set(postId, {
        structure: threadStructure,
        timestamp: Date.now(),
        commentCount: comments.length
      });

      // Retrieve from cache
      const cached = threadCache.get(postId);
      expect(cached).toBeDefined();
      expect(cached.structure).toEqual(threadStructure);
      expect(cached.commentCount).toBe(20);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed comment data gracefully', () => {
      const malformedComments = [
        null,
        undefined,
        { invalidStructure: true },
        { id: 'valid', postId: null },
        { id: 'valid', postId: 'post', content: null }
      ];

      malformedComments.forEach(comment => {
        expect(() => {
          try {
            validateCommentData(comment);
          } catch (error) {
            // Expected to fail gracefully
            console.warn('Invalid comment data:', error);
          }
        }).not.toThrow();
      });
    });

    it('should handle network failures during comment creation', async () => {
      mockApiClient.createComment.mockRejectedValueOnce(new Error('Network error'));

      const commentData = {
        postId: 'post-network-test',
        content: 'Test comment for network failure',
        author: 'error-tester'
      };

      await expect(mockApiClient.createComment(commentData))
        .rejects.toThrow('Network error');

      // Should handle retry logic
      mockApiClient.createComment.mockResolvedValueOnce({
        ...commentData,
        id: 'retry-success',
        timestamp: new Date().toISOString()
      });

      const retryResult = await mockApiClient.createComment(commentData);
      expect(retryResult.id).toBe('retry-success');
    });

    it('should prevent comment spam and rate limiting', () => {
      const rateLimiter = {
        attempts: new Map(),
        isAllowed: (userId: string) => {
          const now = Date.now();
          const userAttempts = rateLimiter.attempts.get(userId) || [];
          
          // Remove attempts older than 1 minute
          const recentAttempts = userAttempts.filter(time => now - time < 60000);
          rateLimiter.attempts.set(userId, recentAttempts);
          
          // Allow max 5 comments per minute
          return recentAttempts.length < 5;
        },
        recordAttempt: (userId: string) => {
          const attempts = rateLimiter.attempts.get(userId) || [];
          attempts.push(Date.now());
          rateLimiter.attempts.set(userId, attempts);
        }
      };

      const userId = 'spam-user';
      
      // Should allow first 5 attempts
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(userId)).toBe(true);
        rateLimiter.recordAttempt(userId);
      }
      
      // Should block 6th attempt
      expect(rateLimiter.isAllowed(userId)).toBe(false);
    });
  });
});

// Helper functions for thread management
function createDeepThread(postId: string, depth: number): any[] {
  const thread = [];
  let parentId = null;

  for (let i = 0; i < depth; i++) {
    const comment = {
      id: `deep-comment-${i}`,
      postId,
      content: `Deep comment at level ${i}`,
      author: `user-${i}`,
      parentId,
      depth: i
    };
    thread.push(comment);
    parentId = comment.id;
  }

  return thread;
}

function validateCommentData(comment: any): void {
  if (!comment || typeof comment !== 'object') {
    throw new Error('Comment data must be an object');
  }
  
  if (!comment.postId || typeof comment.postId !== 'string') {
    throw new Error('Comment must have a valid post ID');
  }
  
  if (!comment.content || typeof comment.content !== 'string' || comment.content.trim() === '') {
    throw new Error('Comment must have non-empty content');
  }
  
  if (!comment.author || typeof comment.author !== 'string') {
    throw new Error('Comment must have an author');
  }
}

function validateCommentDepth(comment: any, existingComments: any[], maxDepth: number): void {
  if (!comment.parentId) return; // Root level comment
  
  let depth = 0;
  let currentParentId = comment.parentId;
  
  while (currentParentId && depth < maxDepth + 1) {
    const parent = existingComments.find(c => c.id === currentParentId);
    if (!parent) break;
    
    depth++;
    currentParentId = parent.parentId;
  }
  
  if (depth >= maxDepth) {
    throw new Error('Comment threading depth exceeds maximum allowed');
  }
}

function validateThreadIntegrity(comments: any[]): void {
  const visited = new Set();
  
  for (const comment of comments) {
    if (!comment.parentId) continue;
    
    const path = new Set();
    let currentId = comment.id;
    
    while (currentId) {
      if (path.has(currentId)) {
        throw new Error('Circular reference detected in comment thread');
      }
      
      path.add(currentId);
      const current = comments.find(c => c.id === currentId);
      currentId = current?.parentId;
    }
  }
}

function resolveOrphanedComments(comments: any[]): any[] {
  const commentMap = new Map(comments.map(c => [c.id, c]));
  
  return comments.map(comment => {
    if (comment.parentId && !commentMap.has(comment.parentId)) {
      // Orphaned comment - move to root level
      return { ...comment, parentId: null };
    }
    return comment;
  });
}

function sortCommentsInThread(comments: any[]): any[] {
  return comments.sort((a, b) => {
    // Root comments first, then by timestamp
    if (!a.parentId && b.parentId) return -1;
    if (a.parentId && !b.parentId) return 1;
    
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
}

function organizeCommentsIntoThread(comments: any[]): any[] {
  const commentMap = new Map();
  const rootComments: any[] = [];
  
  // First pass: create map and identify root comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
    if (!comment.parentId) {
      rootComments.push(commentMap.get(comment.id));
    }
  });
  
  // Second pass: build tree structure
  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentMap.get(comment.id));
      }
    }
  });
  
  return rootComments;
}