import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';

// Mock database connection
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

describe('Comments API', () => {
  let app: express.Application;
  let testPostId: string;
  let testCommentId: string;
  let testUserId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    testPostId = uuidv4();
    testCommentId = uuidv4();
    testUserId = uuidv4();
  });

  afterAll(async () => {
    await mockDb.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/posts/:postId/comments', () => {
    it('should create a new comment on a post', async () => {
      const commentData = {
        content: 'This is a test comment with meaningful feedback.',
        authorAgent: 'test-agent',
        metadata: {
          sentiment: 'positive',
          tags: ['feedback', 'suggestion']
        }
      };

      const mockComment = {
        id: testCommentId,
        post_id: testPostId,
        ...commentData,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockComment]
      });

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(commentData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: expect.any(String),
          postId: testPostId,
          content: commentData.content,
          authorAgent: commentData.authorAgent,
          metadata: commentData.metadata,
          parentId: null,
          created_at: expect.any(String),
          updated_at: expect.any(String),
          engagement: {
            likes: 0,
            hearts: 0,
            replies: 0
          },
          thread: {
            depth: 0,
            hasReplies: false,
            replyCount: 0
          }
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comments'),
        expect.arrayContaining([
          testPostId,
          commentData.content,
          commentData.authorAgent,
          JSON.stringify(commentData.metadata)
        ])
      );
    });

    it('should create a nested reply comment', async () => {
      const parentCommentId = uuidv4();
      const replyData = {
        content: 'This is a reply to the comment above.',
        authorAgent: 'reply-agent',
        parentId: parentCommentId
      };

      const mockReply = {
        id: uuidv4(),
        post_id: testPostId,
        parent_id: parentCommentId,
        ...replyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockReply]
      });

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(replyData)
        .expect(201);

      expect(response.body.data.parentId).toBe(parentCommentId);
      expect(response.body.data.thread.depth).toBe(1);
    });

    it('should validate comment content', async () => {
      const invalidComment = {
        // Missing content
        authorAgent: 'test-agent'
      };

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(invalidComment)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Comment content is required'
      });
    });

    it('should enforce maximum nesting depth', async () => {
      const deepReplyData = {
        content: 'This reply is too deep',
        authorAgent: 'test-agent',
        parentId: uuidv4()
      };

      // Mock a query that would indicate max depth exceeded
      mockDb.query.mockRejectedValueOnce(new Error('Maximum comment nesting depth exceeded'));

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comments`)
        .send(deepReplyData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Maximum comment nesting depth exceeded'
      });
    });
  });

  describe('GET /api/v1/posts/:postId/comments', () => {
    it('should retrieve all comments for a post with threading', async () => {
      const mockComments = [
        {
          id: testCommentId,
          post_id: testPostId,
          content: 'Top level comment',
          author_agent: 'agent-1',
          parent_id: null,
          created_at: new Date().toISOString(),
          likes: 5,
          hearts: 2,
          reply_count: 1,
          thread_depth: 0
        },
        {
          id: uuidv4(),
          post_id: testPostId,
          content: 'Reply comment',
          author_agent: 'agent-2',
          parent_id: testCommentId,
          created_at: new Date().toISOString(),
          likes: 2,
          hearts: 1,
          reply_count: 0,
          thread_depth: 1
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockComments
      });

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: testCommentId,
            content: 'Top level comment',
            thread: expect.objectContaining({
              depth: 0,
              hasReplies: true,
              replyCount: 1
            })
          })
        ]),
        meta: {
          total: 2,
          topLevelCount: 1,
          maxDepth: 1
        }
      });
    });

    it('should support comment sorting options', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .query({ sort: 'newest' })
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
    });

    it('should filter comments by agent', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await request(app)
        .get(`/api/v1/posts/${testPostId}/comments`)
        .query({ authorAgent: 'specific-agent' })
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('author_agent = $'),
        expect.arrayContaining(['specific-agent'])
      );
    });
  });

  describe('GET /api/v1/comments/:id', () => {
    it('should retrieve a specific comment with thread context', async () => {
      const mockComment = {
        id: testCommentId,
        post_id: testPostId,
        content: 'Specific comment',
        author_agent: 'test-agent',
        parent_id: null,
        created_at: new Date().toISOString(),
        likes: 3,
        hearts: 1,
        reply_count: 0,
        thread_depth: 0
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockComment]
      });

      const response = await request(app)
        .get(`/api/v1/comments/${testCommentId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testCommentId,
          content: 'Specific comment',
          thread: expect.objectContaining({
            depth: 0,
            hasReplies: false
          })
        })
      });
    });

    it('should return 404 for non-existent comment', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get(`/api/v1/comments/${uuidv4()}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Comment not found'
      });
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    it('should update an existing comment', async () => {
      const updateData = {
        content: 'Updated comment content'
      };

      const mockUpdatedComment = {
        id: testCommentId,
        post_id: testPostId,
        content: updateData.content,
        author_agent: 'test-agent',
        updated_at: new Date().toISOString()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedComment]
      });

      const response = await request(app)
        .put(`/api/v1/comments/${testCommentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testCommentId,
          content: 'Updated comment content'
        })
      });
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('should delete a comment and handle cascading for replies', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: testCommentId }]
      });

      const response = await request(app)
        .delete(`/api/v1/comments/${testCommentId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Comment deleted successfully'
      });
    });

    it('should soft delete comments with replies', async () => {
      // Mock a comment that has replies
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: testCommentId, reply_count: 3 }]
      });

      const response = await request(app)
        .delete(`/api/v1/comments/${testCommentId}`)
        .query({ soft: 'true' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Comment soft deleted (replaced with [deleted])'
      });
    });
  });
});