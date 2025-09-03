/**
 * London School TDD: API Integration Tests
 * Testing HTTP endpoint behaviors with mock collaborators
 */

const request = require('supertest');
const express = require('express');

describe('API Endpoints - Integration Tests', () => {
  let app;
  let mockFeedService;
  let mockAuthMiddleware;
  let mockValidationMiddleware;
  
  beforeEach(() => {
    // Mock all service layer dependencies
    mockFeedService = {
      loadFeed: jest.fn(),
      createPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn(),
      searchPosts: jest.fn(),
      recordEngagement: jest.fn()
    };
    
    mockAuthMiddleware = jest.fn((req, res, next) => {
      req.user = { id: 'user-1', role: 'agent' };
      next();
    });
    
    mockValidationMiddleware = jest.fn((req, res, next) => next());
    
    // Setup Express app with mocked dependencies
    app = express();
    app.use(express.json());
    
    // Inject mocks into route handlers
    const apiRoutes = require('../../../src/routes/api-routes')({
      feedService: mockFeedService,
      authMiddleware: mockAuthMiddleware,
      validationMiddleware: mockValidationMiddleware
    });
    
    app.use('/api/v1', apiRoutes);
  });
  
  describe('GET /api/v1/agent-posts', () => {
    it('should return posts with proper HTTP status and headers', async () => {
      // Arrange
      const mockPosts = [
        createMockPost({ id: '1', title: 'Agent Update 1' }),
        createMockPost({ id: '2', title: 'Agent Update 2' })
      ];
      
      mockFeedService.loadFeed.mockResolvedValue({
        success: true,
        posts: mockPosts,
        pagination: { page: 1, total: 2 }
      });
      
      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(200);
      
      // Assert - Verify service collaboration
      expect(mockFeedService.loadFeed).toHaveBeenCalledWith({
        userId: 'user-1',
        pagination: { page: 1, limit: 50 }
      });
      
      // Assert - Verify HTTP response structure
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toMatchObject({
        success: true,
        posts: expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '2' })
        ]),
        pagination: expect.any(Object)
      });
    });
    
    it('should handle service errors with appropriate HTTP status', async () => {
      // Arrange
      mockFeedService.loadFeed.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        errorCode: 'DB_CONNECTION_ERROR'
      });
      
      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(500);
      
      // Assert - Verify error response format
      expect(response.body).toMatchObject({
        success: false,
        error: 'Database connection failed',
        errorCode: 'DB_CONNECTION_ERROR'
      });
    });
    
    it('should support pagination and filtering query parameters', async () => {
      // Arrange
      mockFeedService.loadFeed.mockResolvedValue({
        success: true,
        posts: [],
        pagination: { page: 2, total: 0 }
      });
      
      // Act
      await request(app)
        .get('/api/v1/agent-posts')
        .query({
          page: '2',
          limit: '20',
          filter: 'high-impact',
          search: 'optimization'
        })
        .expect(200);
      
      // Assert - Verify query parameter handling
      expect(mockFeedService.loadFeed).toHaveBeenCalledWith({
        userId: 'user-1',
        pagination: { page: 2, limit: 20 },
        filter: 'high-impact',
        search: 'optimization'
      });
    });
  });
  
  describe('POST /api/v1/agent-posts', () => {
    it('should create post and return 201 with created resource', async () => {
      // Arrange
      const postData = {
        title: 'New Agent Achievement',
        content: 'Successfully optimized database queries',
        authorAgent: 'database-optimizer-agent',
        metadata: {
          businessImpact: 8,
          tags: ['optimization', 'database']
        }
      };
      
      const createdPost = createMockPost({ ...postData, id: 'new-post-123' });
      
      mockFeedService.createPost.mockResolvedValue({
        success: true,
        post: createdPost
      });
      
      // Act
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postData)
        .expect(201);
      
      // Assert - Verify service collaboration
      expect(mockFeedService.createPost).toHaveBeenCalledWith(
        postData,
        { userId: 'user-1' }
      );
      
      // Assert - Verify response includes Location header
      expect(response.headers.location).toBe('/api/v1/agent-posts/new-post-123');
      expect(response.body).toMatchObject({
        success: true,
        post: expect.objectContaining({ id: 'new-post-123' })
      });
    });
    
    it('should validate request body and return 400 for invalid data', async () => {
      // Arrange
      mockValidationMiddleware.mockImplementationOnce((req, res, next) => {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: ['title is required', 'content is required']
        });
      });
      
      // Act
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({})
        .expect(400);
      
      // Assert - Verify validation middleware called
      expect(mockValidationMiddleware).toHaveBeenCalledTimes(1);
      expect(mockFeedService.createPost).not.toHaveBeenCalled();
      
      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        details: expect.arrayContaining(['title is required'])
      });
    });
    
    it('should handle authorization failures with 403 status', async () => {
      // Arrange
      mockFeedService.createPost.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'PERMISSION_DENIED'
      });
      
      // Act
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({ title: 'Test', content: 'Test' })
        .expect(403);
      
      // Assert - Verify error handling
      expect(response.body.errorCode).toBe('PERMISSION_DENIED');
    });
  });
  
  describe('PUT /api/v1/agent-posts/:id', () => {
    it('should update existing post and return updated resource', async () => {
      // Arrange
      const postId = 'post-123';
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        metadata: { businessImpact: 9 }
      };
      
      const updatedPost = createMockPost({ ...updateData, id: postId });
      
      mockFeedService.updatePost.mockResolvedValue({
        success: true,
        post: updatedPost
      });
      
      // Act
      const response = await request(app)
        .put(`/api/v1/agent-posts/${postId}`)
        .send(updateData)
        .expect(200);
      
      // Assert - Verify service collaboration
      expect(mockFeedService.updatePost).toHaveBeenCalledWith(
        postId,
        updateData,
        { userId: 'user-1' }
      );
      
      expect(response.body.post.id).toBe(postId);
    });
    
    it('should return 404 for non-existent posts', async () => {
      // Arrange
      mockFeedService.updatePost.mockResolvedValue({
        success: false,
        error: 'Post not found',
        errorCode: 'POST_NOT_FOUND'
      });
      
      // Act
      await request(app)
        .put('/api/v1/agent-posts/non-existent-id')
        .send({ title: 'Updated' })
        .expect(404);
    });
  });
  
  describe('DELETE /api/v1/agent-posts/:id', () => {
    it('should delete post and return 204 no content', async () => {
      // Arrange
      mockFeedService.deletePost.mockResolvedValue({ success: true });
      
      // Act
      const response = await request(app)
        .delete('/api/v1/agent-posts/post-123')
        .expect(204);
      
      // Assert - Verify service collaboration
      expect(mockFeedService.deletePost).toHaveBeenCalledWith(
        'post-123',
        { userId: 'user-1' }
      );
      
      expect(response.body).toEqual({});
    });
  });
  
  describe('GET /api/v1/agent-posts/search', () => {
    it('should search posts and return relevant results', async () => {
      // Arrange
      const searchQuery = 'database optimization';
      const mockResults = [
        createMockPost({ title: 'Database Performance Tuning' }),
        createMockPost({ title: 'Query Optimization Strategies' })
      ];
      
      mockFeedService.searchPosts.mockResolvedValue({
        success: true,
        posts: mockResults,
        searchMetadata: {
          query: searchQuery,
          totalResults: 2,
          searchTime: 45
        }
      });
      
      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts/search')
        .query({ q: searchQuery })
        .expect(200);
      
      // Assert - Verify search collaboration
      expect(mockFeedService.searchPosts).toHaveBeenCalledWith(
        searchQuery,
        { userId: 'user-1' }
      );
      
      expect(response.body).toMatchObject({
        success: true,
        posts: expect.arrayContaining([expect.any(Object)]),
        searchMetadata: expect.objectContaining({
          query: searchQuery
        })
      });
    });
  });
  
  describe('POST /api/v1/agent-posts/:id/engagement', () => {
    it('should record engagement and return updated metrics', async () => {
      // Arrange
      const postId = 'post-123';
      const engagementData = {
        type: 'like',
        action: 'add'
      };
      
      const updatedEngagement = {
        likes: 6,
        comments: 2,
        shares: 1
      };
      
      mockFeedService.recordEngagement.mockResolvedValue({
        success: true,
        engagement: updatedEngagement
      });
      
      // Act
      const response = await request(app)
        .post(`/api/v1/agent-posts/${postId}/engagement`)
        .send(engagementData)
        .expect(200);
      
      // Assert - Verify engagement tracking
      expect(mockFeedService.recordEngagement).toHaveBeenCalledWith({
        postId,
        userId: 'user-1',
        ...engagementData
      });
      
      expect(response.body.engagement).toEqual(updatedEngagement);
    });
  });
  
  describe('Authentication and Authorization', () => {
    it('should require authentication for all protected endpoints', async () => {
      // Arrange - Mock auth middleware to reject
      mockAuthMiddleware.mockImplementationOnce((req, res) => {
        res.status(401).json({ error: 'Authentication required' });
      });
      
      // Act & Assert
      await request(app)
        .get('/api/v1/agent-posts')
        .expect(401);
      
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1);
      expect(mockFeedService.loadFeed).not.toHaveBeenCalled();
    });
  });
  
  describe('Error Handling Middleware', () => {
    it('should handle unexpected errors with 500 status', async () => {
      // Arrange
      mockFeedService.loadFeed.mockRejectedValue(new Error('Unexpected error'));
      
      // Act
      const response = await request(app)
        .get('/api/v1/agent-posts')
        .expect(500);
      
      // Assert - Verify error response format
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Internal server error')
      });
    });
  });
  
  describe('Content-Type Handling', () => {
    it('should only accept JSON for POST requests', async () => {
      // Act & Assert
      await request(app)
        .post('/api/v1/agent-posts')
        .send('invalid-data')
        .set('Content-Type', 'text/plain')
        .expect(400);
    });
  });
});
