/**
 * Work Context Extractor Unit Tests
 */

import { WorkContextExtractor, OriginType, WorkContext } from '../../../src/utils/work-context-extractor';
import { WorkTicket } from '../../../src/types/work-ticket';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WorkContextExtractor', () => {
  let extractor: WorkContextExtractor;

  beforeEach(() => {
    extractor = new WorkContextExtractor();
  });

  describe('extractContext', () => {
    it('should extract context from comment ticket', () => {
      const ticket: WorkTicket = {
        id: 'ticket-123',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-456',
        payload: {
          feedItemId: '789',
          content: 'Please add Dani to the file',
          metadata: {
            type: 'comment',
            parent_post_id: 42,
            parent_comment_id: null,
            depth: 0,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context).toEqual({
        ticketId: 'ticket-123',
        originType: 'comment',
        parentPostId: 42,
        parentCommentId: null,
        userRequest: 'Please add Dani to the file',
        conversationDepth: 0,
        userId: 'user-456',
        agentName: 'avi',
      });
    });

    it('should extract context from nested comment reply', () => {
      const ticket: WorkTicket = {
        id: 'ticket-456',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-789',
        payload: {
          content: 'Can you also fix the formatting?',
          metadata: {
            type: 'comment',
            parent_post_id: 42,
            parent_comment_id: 100,
            depth: 2,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.originType).toBe('comment');
      expect(context.parentPostId).toBe(42);
      expect(context.parentCommentId).toBe(100);
      expect(context.conversationDepth).toBe(2);
    });

    it('should extract context from post ticket', () => {
      const ticket: WorkTicket = {
        id: 'ticket-789',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-123',
        payload: {
          feedItemId: '50',
          content: 'Analyze the project structure',
          metadata: {
            type: 'post',
            title: 'Project Analysis Request',
            tags: ['analysis', 'structure'],
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.originType).toBe('post');
      expect(context.parentPostId).toBe(50);
      expect(context.parentCommentId).toBeNull();
    });

    it('should extract context from autonomous task (no metadata)', () => {
      const ticket: WorkTicket = {
        id: 'ticket-auto-1',
        type: 'health_check',
        priority: 3,
        agentName: 'avi',
        userId: 'system',
        payload: {
          content: 'Perform system health check',
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.originType).toBe('autonomous');
      expect(context.parentPostId).toBeNull();
      expect(context.parentCommentId).toBeNull();
      expect(context.conversationDepth).toBe(0);
    });

    it('should handle missing metadata gracefully', () => {
      const ticket: WorkTicket = {
        id: 'ticket-999',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-999',
        payload: {
          content: 'Do something',
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.ticketId).toBe('ticket-999');
      expect(context.originType).toBe('autonomous');
      expect(context.userRequest).toBe('Do something');
    });

    it('should handle empty payload gracefully', () => {
      const ticket: WorkTicket = {
        id: 'ticket-empty',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-empty',
        payload: null,
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.ticketId).toBe('ticket-empty');
      expect(context.originType).toBe('autonomous');
      expect(context.userRequest).toBe('');
    });

    it('should extract user request from post.content', () => {
      const ticket: WorkTicket = {
        id: 'ticket-alt-1',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-alt',
        payload: {
          post: {
            content: 'Alternative content location',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.userRequest).toBe('Alternative content location');
    });

    it('should extract user request from feedItem.content', () => {
      const ticket: WorkTicket = {
        id: 'ticket-alt-2',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-alt',
        payload: {
          feedItem: {
            content: 'Feed item content',
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const context = extractor.extractContext(ticket);

      expect(context.userRequest).toBe('Feed item content');
    });
  });

  describe('determineOriginType', () => {
    it('should identify comment from explicit type', () => {
      const metadata = { type: 'comment' as const };
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('comment');
    });

    it('should identify post from explicit type', () => {
      const metadata = { type: 'post' as const };
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('post');
    });

    it('should identify comment from parent_post_id', () => {
      const metadata = { parent_post_id: 42 };
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('comment');
    });

    it('should identify post from title', () => {
      const metadata = { title: 'Post Title' };
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('post');
    });

    it('should identify post from tags', () => {
      const metadata = { tags: ['tag1', 'tag2'] };
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('post');
    });

    it('should default to autonomous for null metadata', () => {
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(null, ticket);

      expect(originType).toBe('autonomous');
    });

    it('should default to autonomous for empty metadata', () => {
      const metadata = {};
      const ticket = createMockTicket();

      const originType = extractor.determineOriginType(metadata, ticket);

      expect(originType).toBe('autonomous');
    });
  });

  describe('getReplyTarget', () => {
    it('should return reply target for comment', () => {
      const context: WorkContext = {
        ticketId: 'ticket-123',
        originType: 'comment',
        parentPostId: 42,
        parentCommentId: null,
        userRequest: 'Test request',
        conversationDepth: 0,
        userId: 'user-123',
        agentName: 'avi',
      };

      const target = extractor.getReplyTarget(context);

      expect(target).toEqual({
        postId: 42,
        commentId: undefined,
      });
    });

    it('should return reply target for nested comment', () => {
      const context: WorkContext = {
        ticketId: 'ticket-456',
        originType: 'comment',
        parentPostId: 42,
        parentCommentId: 100,
        userRequest: 'Test request',
        conversationDepth: 1,
        userId: 'user-123',
        agentName: 'avi',
      };

      const target = extractor.getReplyTarget(context);

      expect(target).toEqual({
        postId: 42,
        commentId: 100,
      });
    });

    it('should throw error for autonomous context', () => {
      const context: WorkContext = {
        ticketId: 'ticket-auto',
        originType: 'autonomous',
        parentPostId: null,
        parentCommentId: null,
        userRequest: 'Test request',
        conversationDepth: 0,
        userId: 'system',
        agentName: 'avi',
      };

      expect(() => extractor.getReplyTarget(context)).toThrow(
        'Cannot determine reply target for autonomous task'
      );
    });

    it('should throw error for missing parent_post_id', () => {
      const context: WorkContext = {
        ticketId: 'ticket-invalid',
        originType: 'comment',
        parentPostId: null,
        parentCommentId: null,
        userRequest: 'Test request',
        conversationDepth: 0,
        userId: 'user-123',
        agentName: 'avi',
      };

      expect(() => extractor.getReplyTarget(context)).toThrow(
        'Cannot determine reply target: missing parent_post_id'
      );
    });
  });

  describe('getConversationDepth', () => {
    it('should return depth from metadata', () => {
      const ticket: WorkTicket = {
        id: 'ticket-depth',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-123',
        payload: {
          metadata: {
            depth: 3,
          },
        },
        createdAt: new Date(),
        status: 'pending',
      };

      const depth = extractor.getConversationDepth(ticket);

      expect(depth).toBe(3);
    });

    it('should return 0 for missing depth', () => {
      const ticket: WorkTicket = {
        id: 'ticket-no-depth',
        type: 'post_response',
        priority: 5,
        agentName: 'avi',
        userId: 'user-123',
        payload: {},
        createdAt: new Date(),
        status: 'pending',
      };

      const depth = extractor.getConversationDepth(ticket);

      expect(depth).toBe(0);
    });
  });

  describe('extractParentPostId', () => {
    it('should extract parent_post_id from metadata', () => {
      const metadata = { parent_post_id: 42 };
      const ticket = createMockTicket();

      const parentPostId = extractor['extractParentPostId'](metadata, ticket, 'comment');

      expect(parentPostId).toBe(42);
    });

    it('should return null for autonomous origin', () => {
      const metadata = { parent_post_id: 42 };
      const ticket = createMockTicket();

      const parentPostId = extractor['extractParentPostId'](metadata, ticket, 'autonomous');

      expect(parentPostId).toBeNull();
    });

    it('should use feedItemId for post origin', () => {
      const metadata = null;
      const ticket: WorkTicket = {
        ...createMockTicket(),
        payload: {
          feedItemId: '50',
        },
      };

      const parentPostId = extractor['extractParentPostId'](metadata, ticket, 'post');

      expect(parentPostId).toBe(50);
    });

    it('should return null when no parent found', () => {
      const metadata = null;
      const ticket = createMockTicket();

      const parentPostId = extractor['extractParentPostId'](metadata, ticket, 'comment');

      expect(parentPostId).toBeNull();
    });
  });
});

// Helper function to create mock tickets
function createMockTicket(): WorkTicket {
  return {
    id: 'mock-ticket',
    type: 'post_response',
    priority: 5,
    agentName: 'avi',
    userId: 'mock-user',
    payload: {},
    createdAt: new Date(),
    status: 'pending',
  };
}
