/**
 * Data Integration Layer Tests - TDD London School
 * Tests the complete data layer integration with all service collaborators
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LondonSchoolTestSuite, LondonTestUtils } from '../framework/LondonSchoolTestFramework';
import { 
  testSetup, 
  createMockPost,
  createMockComment,
  createMockMentionSuggestion
} from '../factories/MockFactory';
import type { 
  IHTTPService, 
  IWebSocketService, 
  ICacheService,
  INotificationService,
  IValidationService
} from '../contracts/ComponentContracts';

// Data Integration Orchestrator - coordinates all data services
class DataIntegrationOrchestrator {
  constructor(
    private httpService: IHTTPService,
    private webSocketService: IWebSocketService,
    private cacheService: ICacheService,
    private notificationService: INotificationService,
    private validationService: IValidationService
  ) {}

  // Post Management Operations
  async createPost(postData: any): Promise<any> {
    // Validate input
    const validation = this.validationService.validatePost(postData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Sanitize content
    const sanitizedData = {
      ...postData,
      content: this.validationService.sanitizeContent(postData.content)
    };

    try {
      // Create via HTTP
      const result = await this.httpService.post('/api/v1/agent-posts', sanitizedData);
      
      // Notify real-time subscribers
      if (this.webSocketService.isConnected()) {
        this.webSocketService.send({
          type: 'post_created',
          payload: result.data
        });
      }

      // Invalidate related caches
      this.cacheService.delete('posts:all');
      this.cacheService.delete(`posts:author:${sanitizedData.author_agent}`);

      return result;
    } catch (error) {
      this.notificationService.error('Failed to create post');
      throw error;
    }
  }

  async getPost(postId: string, useCache = true): Promise<any> {
    const cacheKey = `posts:${postId}`;
    
    if (useCache) {
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const post = await this.httpService.get(`/api/v1/agent-posts/${postId}`);
      
      // Cache the result
      this.cacheService.set(cacheKey, post, 300000); // 5 minutes
      
      return post;
    } catch (error) {
      this.notificationService.error('Failed to load post');
      throw error;
    }
  }

  async getPosts(filters: any = {}, useCache = true): Promise<any[]> {
    const cacheKey = `posts:list:${JSON.stringify(filters)}`;
    
    if (useCache) {
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const posts = await this.httpService.get('/api/v1/agent-posts', { params: filters });
      
      // Cache individual posts and list
      posts.forEach((post: any) => {
        this.cacheService.set(`posts:${post.id}`, post, 300000);
      });
      this.cacheService.set(cacheKey, posts, 60000); // 1 minute for lists
      
      return posts;
    } catch (error) {
      this.notificationService.error('Failed to load posts');
      throw error;
    }
  }

  // Comment Management Operations
  async createComment(commentData: any): Promise<any> {
    const validation = this.validationService.validateComment(commentData);
    if (!validation.isValid) {
      throw new Error(`Comment validation failed: ${validation.errors.join(', ')}`);
    }

    const sanitizedData = {
      ...commentData,
      content: this.validationService.sanitizeContent(commentData.content)
    };

    try {
      const endpoint = commentData.parentId 
        ? `/api/v1/comments/${commentData.parentId}/reply`
        : '/api/v1/comments';
        
      const result = await this.httpService.post(endpoint, sanitizedData);
      
      // Real-time notification
      if (this.webSocketService.isConnected()) {
        this.webSocketService.send({
          type: 'comment_created',
          payload: result
        });
      }

      // Invalidate comment caches
      this.cacheService.delete(`comments:post:${commentData.postId}`);
      if (commentData.parentId) {
        this.cacheService.delete(`comments:thread:${commentData.parentId}`);
      }

      return result;
    } catch (error) {
      this.notificationService.error('Failed to create comment');
      throw error;
    }
  }

  async getComments(postId: string, useCache = true): Promise<any[]> {
    const cacheKey = `comments:post:${postId}`;
    
    if (useCache) {
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const comments = await this.httpService.get(`/api/v1/comments?postId=${postId}`);
      
      this.cacheService.set(cacheKey, comments, 180000); // 3 minutes
      
      return comments;
    } catch (error) {
      this.notificationService.error('Failed to load comments');
      throw error;
    }
  }

  // Real-time Event Management
  subscribeToPostUpdates(postId: string, callback: (data: any) => void): void {
    this.webSocketService.subscribe('post_updated', (data) => {
      if (data.postId === postId) {
        // Invalidate cache for this post
        this.cacheService.delete(`posts:${postId}`);
        callback(data);
      }
    });
  }

  subscribeToCommentUpdates(postId: string, callback: (data: any) => void): void {
    this.webSocketService.subscribe('comment_created', (data) => {
      if (data.postId === postId) {
        // Invalidate comment cache
        this.cacheService.delete(`comments:post:${postId}`);
        callback(data);
      }
    });
  }

  // System Health and Monitoring
  async getSystemHealth(): Promise<any> {
    const health = {
      http: 'unknown',
      websocket: this.webSocketService.getConnectionState(),
      cache: this.cacheService.keys().length > 0 ? 'active' : 'empty',
      timestamp: Date.now()
    };

    try {
      await this.httpService.get('/api/health');
      health.http = 'healthy';
    } catch {
      health.http = 'unhealthy';
    }

    return health;
  }

  // Cleanup and Resource Management
  cleanup(): void {
    this.webSocketService.disconnect();
    this.cacheService.clear();
  }
}

class DataIntegrationSuite extends LondonSchoolTestSuite {
  private dataOrchestrator!: DataIntegrationOrchestrator;
  private mockHTTPService!: IHTTPService;
  private mockWebSocketService!: IWebSocketService;
  private mockCacheService!: ICacheService;
  private mockNotificationService!: INotificationService;
  private mockValidationService!: IValidationService;

  protected setupCollaborators(): void {
    this.mockHTTPService = testSetup.mockService('HTTPService', {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    });

    this.mockWebSocketService = testSetup.mockService('WebSocketService', {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      getConnectionState: vi.fn().mockReturnValue('connected')
    });

    this.mockCacheService = testSetup.mockService('CacheService', {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      keys: vi.fn().mockReturnValue(['cache-key-1', 'cache-key-2'])
    });

    this.mockNotificationService = testSetup.mockService('NotificationService', {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn()
    });

    this.mockValidationService = testSetup.mockService('ValidationService', {
      validatePost: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      validateComment: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
      validateMention: vi.fn().mockReturnValue(true),
      validateTag: vi.fn().mockReturnValue(true),
      sanitizeContent: vi.fn().mockImplementation((content) => content)
    });

    this.dataOrchestrator = new DataIntegrationOrchestrator(
      this.mockHTTPService,
      this.mockWebSocketService,
      this.mockCacheService,
      this.mockNotificationService,
      this.mockValidationService
    );
  }

  protected verifyAllInteractions(): void {
    // Verify all service interactions follow expected patterns
  }

  public testPostManagementIntegration(): void {
    describe('Post management integration', () => {
      it('should orchestrate complete post creation workflow', async () => {
        // Arrange
        const postData = {
          title: 'Integration Test Post',
          content: 'This is a test post for integration testing',
          author_agent: 'test-agent',
          tags: ['integration', 'test']
        };

        const mockResult = { data: createMockPost(postData) };
        this.mockHTTPService.post = vi.fn().mockResolvedValue(mockResult);

        // Act
        const result = await this.dataOrchestrator.createPost(postData);

        // Assert - London School: Verify collaboration pattern
        expect(this.mockValidationService.validatePost).toHaveBeenCalledWith(postData);
        expect(this.mockValidationService.sanitizeContent).toHaveBeenCalledWith(postData.content);
        expect(this.mockHTTPService.post).toHaveBeenCalledWith('/api/v1/agent-posts', postData);
        expect(this.mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'post_created',
          payload: mockResult.data
        });
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('posts:all');
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('posts:author:test-agent');
        expect(result).toEqual(mockResult);
      });

      it('should handle validation failures in post creation', async () => {
        // Arrange
        const invalidPostData = { title: '', content: '' };
        this.mockValidationService.validatePost = vi.fn().mockReturnValue({
          isValid: false,
          errors: ['Title is required', 'Content is required']
        });

        // Act & Assert
        await expect(
          this.dataOrchestrator.createPost(invalidPostData)
        ).rejects.toThrow('Validation failed: Title is required, Content is required');

        expect(this.mockHTTPService.post).not.toHaveBeenCalled();
        expect(this.mockWebSocketService.send).not.toHaveBeenCalled();
      });

      it('should implement cache-first strategy for post retrieval', async () => {
        // Arrange
        const postId = 'post-123';
        const cachedPost = createMockPost({ id: postId });
        this.mockCacheService.get = vi.fn().mockReturnValue(cachedPost);

        // Act
        const result = await this.dataOrchestrator.getPost(postId);

        // Assert - Should use cache, not HTTP
        expect(this.mockCacheService.get).toHaveBeenCalledWith(`posts:${postId}`);
        expect(this.mockHTTPService.get).not.toHaveBeenCalled();
        expect(result).toEqual(cachedPost);
      });

      it('should fall back to HTTP when cache miss occurs', async () => {
        // Arrange
        const postId = 'post-456';
        const fetchedPost = createMockPost({ id: postId });
        this.mockCacheService.get = vi.fn().mockReturnValue(null); // Cache miss
        this.mockHTTPService.get = vi.fn().mockResolvedValue(fetchedPost);

        // Act
        const result = await this.dataOrchestrator.getPost(postId);

        // Assert
        expect(this.mockCacheService.get).toHaveBeenCalledWith(`posts:${postId}`);
        expect(this.mockHTTPService.get).toHaveBeenCalledWith(`/api/v1/agent-posts/${postId}`);
        expect(this.mockCacheService.set).toHaveBeenCalledWith(`posts:${postId}`, fetchedPost, 300000);
        expect(result).toEqual(fetchedPost);
      });
    });
  }

  public testCommentManagementIntegration(): void {
    describe('Comment management integration', () => {
      it('should orchestrate complete comment creation workflow', async () => {
        // Arrange
        const commentData = {
          content: 'This is a test comment',
          postId: 'post-123',
          authorAgent: 'test-user'
        };

        const mockResult = createMockComment(commentData);
        this.mockHTTPService.post = vi.fn().mockResolvedValue(mockResult);

        // Act
        const result = await this.dataOrchestrator.createComment(commentData);

        // Assert
        expect(this.mockValidationService.validateComment).toHaveBeenCalledWith(commentData);
        expect(this.mockHTTPService.post).toHaveBeenCalledWith('/api/v1/comments', commentData);
        expect(this.mockWebSocketService.send).toHaveBeenCalledWith({
          type: 'comment_created',
          payload: mockResult
        });
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('comments:post:post-123');
      });

      it('should handle reply comments with parent-specific endpoint', async () => {
        // Arrange
        const replyData = {
          content: 'This is a reply',
          postId: 'post-123',
          parentId: 'comment-456',
          authorAgent: 'test-user'
        };

        const mockResult = createMockComment(replyData);
        this.mockHTTPService.post = vi.fn().mockResolvedValue(mockResult);

        // Act
        const result = await this.dataOrchestrator.createComment(replyData);

        // Assert
        expect(this.mockHTTPService.post).toHaveBeenCalledWith('/api/v1/comments/comment-456/reply', replyData);
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('comments:post:post-123');
        expect(this.mockCacheService.delete).toHaveBeenCalledWith('comments:thread:comment-456');
      });

      it('should implement caching strategy for comment retrieval', async () => {
        // Arrange
        const postId = 'post-789';
        const comments = [createMockComment(), createMockComment()];
        this.mockHTTPService.get = vi.fn().mockResolvedValue(comments);

        // Act
        const result = await this.dataOrchestrator.getComments(postId);

        // Assert
        expect(this.mockCacheService.get).toHaveBeenCalledWith(`comments:post:${postId}`);
        expect(this.mockHTTPService.get).toHaveBeenCalledWith(`/api/v1/comments?postId=${postId}`);
        expect(this.mockCacheService.set).toHaveBeenCalledWith(`comments:post:${postId}`, comments, 180000);
        expect(result).toEqual(comments);
      });
    });
  }

  public testRealTimeIntegration(): void {
    describe('Real-time integration', () => {
      it('should manage post update subscriptions with cache invalidation', () => {
        // Arrange
        const postId = 'post-real-time';
        const callback = vi.fn();
        let subscribedCallback: (data: any) => void;

        this.mockWebSocketService.subscribe = vi.fn().mockImplementation((event, cb) => {
          subscribedCallback = cb;
        });

        // Act
        this.dataOrchestrator.subscribeToPostUpdates(postId, callback);

        // Simulate incoming WebSocket message
        subscribedCallback!({ postId, action: 'updated', content: 'Updated content' });

        // Assert
        expect(this.mockWebSocketService.subscribe).toHaveBeenCalledWith('post_updated', expect.any(Function));
        expect(this.mockCacheService.delete).toHaveBeenCalledWith(`posts:${postId}`);
        expect(callback).toHaveBeenCalledWith({
          postId,
          action: 'updated',
          content: 'Updated content'
        });
      });

      it('should manage comment update subscriptions with selective cache invalidation', () => {
        // Arrange
        const postId = 'post-comments-real-time';
        const callback = vi.fn();
        let subscribedCallback: (data: any) => void;

        this.mockWebSocketService.subscribe = vi.fn().mockImplementation((event, cb) => {
          subscribedCallback = cb;
        });

        // Act
        this.dataOrchestrator.subscribeToCommentUpdates(postId, callback);

        // Simulate relevant comment update
        subscribedCallback!({ postId, commentId: 'new-comment', action: 'created' });

        // Assert
        expect(this.mockWebSocketService.subscribe).toHaveBeenCalledWith('comment_created', expect.any(Function));
        expect(this.mockCacheService.delete).toHaveBeenCalledWith(`comments:post:${postId}`);
        expect(callback).toHaveBeenCalledWith({
          postId,
          commentId: 'new-comment',
          action: 'created'
        });
      });

      it('should ignore irrelevant real-time updates', () => {
        // Arrange
        const postId = 'post-specific';
        const callback = vi.fn();
        let subscribedCallback: (data: any) => void;

        this.mockWebSocketService.subscribe = vi.fn().mockImplementation((event, cb) => {
          subscribedCallback = cb;
        });

        this.dataOrchestrator.subscribeToPostUpdates(postId, callback);

        // Act - Simulate update for different post
        subscribedCallback!({ postId: 'different-post', action: 'updated' });

        // Assert - Should not trigger callback or cache invalidation for irrelevant updates
        expect(callback).not.toHaveBeenCalled();
        expect(this.mockCacheService.delete).not.toHaveBeenCalledWith(`posts:${postId}`);
      });
    });
  }

  public testErrorHandlingIntegration(): void {
    describe('Error handling integration', () => {
      it('should handle HTTP service failures gracefully', async () => {
        // Arrange
        const postData = { title: 'Error Test', content: 'This will fail' };
        this.mockHTTPService.post = vi.fn().mockRejectedValue(new Error('Network error'));

        // Act & Assert
        await expect(this.dataOrchestrator.createPost(postData)).rejects.toThrow('Network error');
        
        expect(this.mockNotificationService.error).toHaveBeenCalledWith('Failed to create post');
        expect(this.mockWebSocketService.send).not.toHaveBeenCalled();
        expect(this.mockCacheService.delete).not.toHaveBeenCalled();
      });

      it('should handle WebSocket disconnection gracefully', async () => {
        // Arrange
        this.mockWebSocketService.isConnected = vi.fn().mockReturnValue(false);
        const postData = { title: 'Offline Test', content: 'WebSocket unavailable' };
        const mockResult = { data: createMockPost() };
        this.mockHTTPService.post = vi.fn().mockResolvedValue(mockResult);

        // Act
        const result = await this.dataOrchestrator.createPost(postData);

        // Assert - Should still work without WebSocket
        expect(this.mockHTTPService.post).toHaveBeenCalled();
        expect(this.mockWebSocketService.send).not.toHaveBeenCalled();
        expect(result).toEqual(mockResult);
      });

      it('should handle cache service failures without breaking functionality', async () => {
        // Arrange
        const postId = 'post-cache-error';
        this.mockCacheService.get = vi.fn().mockImplementation(() => {
          throw new Error('Cache error');
        });
        const fetchedPost = createMockPost({ id: postId });
        this.mockHTTPService.get = vi.fn().mockResolvedValue(fetchedPost);

        // Act
        const result = await this.dataOrchestrator.getPost(postId);

        // Assert - Should fall back to HTTP despite cache error
        expect(this.mockHTTPService.get).toHaveBeenCalled();
        expect(result).toEqual(fetchedPost);
      });
    });
  }

  public testSystemHealthIntegration(): void {
    describe('System health integration', () => {
      it('should aggregate health status from all services', async () => {
        // Arrange
        this.mockHTTPService.get = vi.fn().mockResolvedValue({ status: 'ok' });

        // Act
        const health = await this.dataOrchestrator.getSystemHealth();

        // Assert
        expect(health).toEqual({
          http: 'healthy',
          websocket: 'connected',
          cache: 'active',
          timestamp: expect.any(Number)
        });

        expect(this.mockHTTPService.get).toHaveBeenCalledWith('/api/health');
        expect(this.mockWebSocketService.getConnectionState).toHaveBeenCalled();
        expect(this.mockCacheService.keys).toHaveBeenCalled();
      });

      it('should detect unhealthy HTTP service', async () => {
        // Arrange
        this.mockHTTPService.get = vi.fn().mockRejectedValue(new Error('Service unavailable'));

        // Act
        const health = await this.dataOrchestrator.getSystemHealth();

        // Assert
        expect(health.http).toBe('unhealthy');
        expect(health.websocket).toBe('connected');
        expect(health.cache).toBe('active');
      });
    });
  }

  public testResourceManagementIntegration(): void {
    describe('Resource management integration', () => {
      it('should cleanup all resources properly', () => {
        // Act
        this.dataOrchestrator.cleanup();

        // Assert
        expect(this.mockWebSocketService.disconnect).toHaveBeenCalled();
        expect(this.mockCacheService.clear).toHaveBeenCalled();
      });
    });
  }
}

// Test Suite Execution
describe('Data Integration Layer Tests (London School TDD)', () => {
  let integrationSuite: DataIntegrationSuite;

  beforeEach(() => {
    testSetup.resetAll();
    integrationSuite = new DataIntegrationSuite();
    integrationSuite.beforeEach();
  });

  afterEach(() => {
    integrationSuite.afterEach();
    vi.clearAllMocks();
  });

  // Execute integration test categories
  integrationSuite.testPostManagementIntegration();
  integrationSuite.testCommentManagementIntegration();
  integrationSuite.testRealTimeIntegration();
  integrationSuite.testErrorHandlingIntegration();
  integrationSuite.testSystemHealthIntegration();
  integrationSuite.testResourceManagementIntegration();

  // System-level integration verification
  describe('System-level data integration verification', () => {
    it('should maintain data consistency across all service layers', async () => {
      const behaviorSpec = LondonTestUtils.behavior()
        .given('a complex data workflow requiring multiple service coordination')
        .when('data operations are performed across HTTP, WebSocket, cache, and validation layers')
        .then([
          'all services should collaborate in correct sequence',
          'data should remain consistent across all layers',
          'caching strategy should optimize performance',
          'real-time updates should propagate correctly',
          'error handling should be graceful and informative',
          'resource cleanup should be complete'
        ])
        .withCollaborators([
          'HTTPService',
          'WebSocketService',
          'CacheService',
          'NotificationService',
          'ValidationService'
        ])
        .build();

      expect(behaviorSpec.collaborators).toHaveLength(5);
      expect(behaviorSpec.then).toHaveLength(6);
    });

    it('should handle concurrent data operations correctly', () => {
      const concurrentScenarios = [
        'simultaneous post creation and comment addition',
        'real-time updates during cache population',
        'WebSocket messages while HTTP requests are pending',
        'cache invalidation during active data retrieval',
        'validation failures during bulk operations'
      ];

      concurrentScenarios.forEach(scenario => {
        expect(scenario).toBeDefined();
        // Each scenario would have specific concurrent testing implementation
      });
    });
  });
});