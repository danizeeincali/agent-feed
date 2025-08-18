import request from 'supertest';
import { app } from '@/api/server';
import { db } from '@/database/connection';

describe('Comments API', () => {
  beforeEach(async () => {
    // Clear test data
    await db.query('DELETE FROM comments WHERE TRUE');
    await db.query('DELETE FROM feed_items WHERE TRUE');
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /api/v1/posts/:id/comments', () => {
    it('should create a new comment on a post', async () => {
      // First create a test post
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const commentData = {
        content: 'This is a test comment',
        author: 'test-user',
        parentId: null
      };

      const response = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(commentData.content);
      expect(response.body.data.author).toBe(commentData.author);
      expect(response.body.data.postId).toBe(postId);
    });

    it('should create a threaded reply to existing comment', async () => {
      // Create post and parent comment first
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const parentCommentResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Parent comment',
          author: 'user1',
          parentId: null
        });

      const parentCommentId = parentCommentResponse.body.data.id;

      const replyData = {
        content: 'This is a reply',
        author: 'user2',
        parentId: parentCommentId
      };

      const response = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send(replyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parentId).toBe(parentCommentId);
      expect(response.body.data.content).toBe(replyData.content);
    });

    it('should validate comment content length', async () => {
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const longContent = 'a'.repeat(2001); // Exceeds 2000 char limit

      const response = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: longContent,
          author: 'test-user',
          parentId: null
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Comment content must be under 2000 characters');
    });

    it('should require author and content fields', async () => {
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const response = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Content is required'),
          expect.stringContaining('Author is required')
        ])
      );
    });
  });

  describe('GET /api/v1/posts/:id/comments', () => {
    it('should retrieve comments for a post with threading', async () => {
      // Create test post
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      // Create parent comment
      const parentResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Parent comment',
          author: 'user1',
          parentId: null
        });

      const parentId = parentResponse.body.data.id;

      // Create reply
      await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Reply comment',
          author: 'user2',
          parentId: parentId
        });

      const response = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      const parentComment = response.body.data.find((c: any) => c.parentId === null);
      const replyComment = response.body.data.find((c: any) => c.parentId === parentId);
      
      expect(parentComment.content).toBe('Parent comment');
      expect(replyComment.content).toBe('Reply comment');
    });

    it('should return empty array for post with no comments', async () => {
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    it('should update comment content', async () => {
      // Create post and comment first
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const commentResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Original content',
          author: 'test-user',
          parentId: null
        });

      const commentId = commentResponse.body.data.id;

      const updateData = {
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.data.isEdited).toBe(true);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('should soft delete a comment', async () => {
      // Create post and comment first
      const postResponse = await request(app)
        .post('/api/v1/agent-posts')
        .send({
          title: 'Test Post',
          authorAgent: 'test-agent',
          contentBody: 'Test content',
          isAgentResponse: true
        });

      const postId = postResponse.body.data.id;

      const commentResponse = await request(app)
        .post(`/api/v1/posts/${postId}/comments`)
        .send({
          content: 'Comment to delete',
          author: 'test-user',
          parentId: null
        });

      const commentId = commentResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify comment is marked as deleted
      const getResponse = await request(app)
        .get(`/api/v1/posts/${postId}/comments`)
        .expect(200);

      const deletedComment = getResponse.body.data.find((c: any) => c.id === commentId);
      expect(deletedComment.content).toBe('[deleted]');
      expect(deletedComment.isDeleted).toBe(true);
    });
  });
});