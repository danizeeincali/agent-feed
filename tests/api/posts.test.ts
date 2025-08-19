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

describe('Posts API', () => {
  let app: express.Application;
  let testUserId: string;
  let testAgentId: string;
  let testPostId: string;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());
    
    // Mock middleware and routes will be added here
    testUserId = uuidv4();
    testAgentId = uuidv4();
    testPostId = uuidv4();
  });

  afterAll(async () => {
    await mockDb.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/posts', () => {
    it('should create a new post with all required fields', async () => {
      const postData = {
        title: 'Test Agent Post',
        content: 'This is a test post content with detailed information.',
        authorAgent: 'test-agent',
        metadata: {
          businessImpact: 7,
          tags: ['strategy', 'automation'],
          isAgentResponse: true,
          postType: 'insight'
        }
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: testPostId,
          ...postData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      });

      const response = await request(app)
        .post('/api/v1/posts')
        .send(postData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: expect.any(String),
          title: postData.title,
          content: postData.content,
          authorAgent: postData.authorAgent,
          metadata: postData.metadata,
          created_at: expect.any(String),
          updated_at: expect.any(String),
          engagement: {
            likes: 0,
            hearts: 0,
            shares: 0,
            bookmarks: 0,
            views: 0,
            comments: 0
          }
        }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.arrayContaining([
          postData.title,
          postData.content,
          postData.authorAgent,
          JSON.stringify(postData.metadata)
        ])
      );
    });

    it('should validate required fields', async () => {
      const invalidPostData = {
        // Missing title
        content: 'Test content',
        authorAgent: 'test-agent'
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .send(invalidPostData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Title is required'
      });
    });

    it('should handle database errors gracefully', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'test-agent'
      };

      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/posts')
        .send(postData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create post'
      });
    });
  });

  describe('GET /api/v1/posts', () => {
    it('should retrieve all posts with pagination', async () => {
      const mockPosts = [
        {
          id: testPostId,
          title: 'Test Post 1',
          content: 'Content 1',
          author_agent: 'agent-1',
          metadata: { businessImpact: 5 },
          created_at: new Date().toISOString(),
          likes: 10,
          hearts: 5,
          shares: 2,
          bookmarks: 3,
          views: 100,
          comment_count: 4
        }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockPosts
      });

      const response = await request(app)
        .get('/api/v1/posts')
        .query({ limit: 20, offset: 0 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: testPostId,
            title: 'Test Post 1',
            content: 'Content 1',
            authorAgent: 'agent-1',
            engagement: {
              likes: 10,
              hearts: 5,
              shares: 2,
              bookmarks: 3,
              views: 100,
              comments: 4
            }
          })
        ]),
        pagination: {
          limit: 20,
          offset: 0,
          total: expect.any(Number)
        }
      });
    });

    it('should filter posts by agent', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await request(app)
        .get('/api/v1/posts')
        .query({ authorAgent: 'specific-agent' })
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE author_agent = $'),
        expect.arrayContaining(['specific-agent'])
      );
    });

    it('should search posts by content', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      await request(app)
        .get('/api/v1/posts')
        .query({ search: 'automation' })
        .expect(200);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('to_tsvector'),
        expect.arrayContaining(['automation'])
      );
    });
  });

  describe('GET /api/v1/posts/:id', () => {
    it('should retrieve a specific post by id', async () => {
      const mockPost = {
        id: testPostId,
        title: 'Specific Post',
        content: 'Specific content',
        author_agent: 'test-agent',
        metadata: { businessImpact: 8 },
        created_at: new Date().toISOString(),
        likes: 5,
        hearts: 2,
        shares: 1,
        bookmarks: 1,
        views: 50,
        comment_count: 2
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockPost]
      });

      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testPostId,
          title: 'Specific Post'
        })
      });
    });

    it('should return 404 for non-existent post', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get(`/api/v1/posts/${uuidv4()}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Post not found'
      });
    });
  });

  describe('PUT /api/v1/posts/:id', () => {
    it('should update an existing post', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const mockUpdatedPost = {
        id: testPostId,
        ...updateData,
        author_agent: 'test-agent',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedPost]
      });

      const response = await request(app)
        .put(`/api/v1/posts/${testPostId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testPostId,
          title: 'Updated Title',
          content: 'Updated content'
        })
      });
    });

    it('should return 404 when updating non-existent post', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .put(`/api/v1/posts/${uuidv4()}`)
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Post not found'
      });
    });
  });

  describe('DELETE /api/v1/posts/:id', () => {
    it('should delete a post and return success', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: testPostId }]
      });

      const response = await request(app)
        .delete(`/api/v1/posts/${testPostId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Post deleted successfully'
      });
    });

    it('should return 404 when deleting non-existent post', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .delete(`/api/v1/posts/${uuidv4()}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Post not found'
      });
    });
  });
});