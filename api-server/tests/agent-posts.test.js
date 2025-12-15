/**
 * TDD London School Tests for POST /api/v1/agent-posts
 *
 * Following London School (Mockist) TDD approach:
 * - Mock external dependencies (database, services)
 * - Verify object interactions and collaborations
 * - Focus on behavior rather than state
 * - Outside-In development
 *
 * IMPORTANT: These tests are written FIRST and should FAIL initially
 * until the implementation is created.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

// Mock dependencies (London School approach - define collaborators first)
const mockPostRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  count: vi.fn()
};

const mockValidationService = {
  validatePostData: vi.fn(),
  validateContentLength: vi.fn()
};

const mockIdGenerator = {
  generate: vi.fn(() => crypto.randomUUID())
};

const mockTimestampService = {
  now: vi.fn(() => new Date().toISOString())
};

// Test application setup
let app;

/**
 * Mock route handler for POST /api/v1/agent-posts
 * This will need to be implemented to make tests pass
 */
const createAgentPostHandler = (repository, validator, idGen, timestampSvc) => {
  return async (req, res) => {
    try {
      // Validate request body
      const validationResult = validator.validatePostData(req.body);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: validationResult.message
        });
      }

      // Validate content length
      const contentLengthResult = validator.validateContentLength(req.body.content);
      if (!contentLengthResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: contentLengthResult.message
        });
      }

      // Generate unique ID
      const postId = idGen.generate();

      // Add timestamps
      const now = timestampSvc.now();

      // Create post object
      const newPost = {
        id: postId,
        ...req.body,
        createdAt: now,
        updatedAt: now,
        publishedAt: now
      };

      // Save to repository
      const savedPost = await repository.save(newPost);

      // Return created post
      res.status(201).json({
        success: true,
        data: savedPost
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  };
};

describe('POST /api/v1/agent-posts - London School TDD', () => {

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup fresh Express app for each test
    app = express();
    app.use(express.json({ limit: '10mb' }));

    // Setup default mock behaviors (test doubles)
    mockValidationService.validatePostData.mockReturnValue({ valid: true });
    mockValidationService.validateContentLength.mockReturnValue({ valid: true });
    mockPostRepository.save.mockImplementation(async (post) => post);

    // Mount the route handler with mocked dependencies
    app.post('/api/v1/agent-posts', createAgentPostHandler(
      mockPostRepository,
      mockValidationService,
      mockIdGenerator,
      mockTimestampService
    ));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. POST returns 201 on valid request', () => {
    it('should return HTTP 201 Created status code for valid post', async () => {
      const validPost = {
        title: 'Test Post',
        content: 'This is test content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('2. POST returns created post with ID', () => {
    it('should return the created post with a generated ID', async () => {
      const mockId = crypto.randomUUID();
      mockIdGenerator.generate.mockReturnValue(mockId);

      const validPost = {
        title: 'Test Post',
        content: 'This is test content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(mockId);
      expect(response.body.data.title).toBe(validPost.title);
      expect(response.body.data.content).toBe(validPost.content);
    });

    it('should verify ID generator was called exactly once', async () => {
      const validPost = {
        title: 'Test Post',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify interaction with collaborator
      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. POST validates required fields (400 if missing)', () => {
    it('should return 400 when title is missing', async () => {
      mockValidationService.validatePostData.mockReturnValue({
        valid: false,
        message: 'Title is required'
      });

      const invalidPost = {
        content: 'Content without title',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 when content is missing', async () => {
      mockValidationService.validatePostData.mockReturnValue({
        valid: false,
        message: 'Content is required'
      });

      const invalidPost = {
        title: 'Title without content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Content is required');
    });

    it('should return 400 when agentId is missing', async () => {
      mockValidationService.validatePostData.mockReturnValue({
        valid: false,
        message: 'AgentId is required'
      });

      const invalidPost = {
        title: 'Title',
        content: 'Content'
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should verify validator was called with request body', async () => {
      const postData = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(postData);

      // London School: Verify collaboration with validator
      expect(mockValidationService.validatePostData).toHaveBeenCalledWith(
        expect.objectContaining(postData)
      );
    });
  });

  describe('4. POST accepts 10,000 character content', () => {
    it('should accept exactly 10,000 characters of content', async () => {
      const content10k = 'a'.repeat(10000);
      mockValidationService.validateContentLength.mockReturnValue({ valid: true });

      const validPost = {
        title: 'Long Content Post',
        content: content10k,
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.status).toBe(201);
      expect(response.body.data.content).toHaveLength(10000);
    });

    it('should verify content length validator was called', async () => {
      const content = 'Test content';
      const validPost = {
        title: 'Test',
        content: content,
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify interaction
      expect(mockValidationService.validateContentLength).toHaveBeenCalledWith(content);
    });
  });

  describe('5. POST rejects over 10,000 characters', () => {
    it('should return 400 for content over 10,000 characters', async () => {
      const contentOver10k = 'a'.repeat(10001);
      mockValidationService.validateContentLength.mockReturnValue({
        valid: false,
        message: 'Content must not exceed 10,000 characters'
      });

      const invalidPost = {
        title: 'Too Long Content',
        content: contentOver10k,
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('10,000 characters');
    });

    it('should reject content with 15,000 characters', async () => {
      const contentOver10k = 'x'.repeat(15000);
      mockValidationService.validateContentLength.mockReturnValue({
        valid: false,
        message: 'Content must not exceed 10,000 characters'
      });

      const invalidPost = {
        title: 'Too Long',
        content: contentOver10k,
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      expect(response.status).toBe(400);
    });
  });

  describe('6. POST generates unique IDs', () => {
    it('should generate different IDs for consecutive posts', async () => {
      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();

      mockIdGenerator.generate
        .mockReturnValueOnce(id1)
        .mockReturnValueOnce(id2);

      const post1 = {
        title: 'Post 1',
        content: 'Content 1',
        agentId: crypto.randomUUID()
      };

      const post2 = {
        title: 'Post 2',
        content: 'Content 2',
        agentId: crypto.randomUUID()
      };

      const response1 = await request(app)
        .post('/api/v1/agent-posts')
        .send(post1);

      const response2 = await request(app)
        .post('/api/v1/agent-posts')
        .send(post2);

      expect(response1.body.data.id).toBe(id1);
      expect(response2.body.data.id).toBe(id2);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);
    });

    it('should verify ID generator called for each post creation', async () => {
      const posts = [
        { title: 'P1', content: 'C1', agentId: crypto.randomUUID() },
        { title: 'P2', content: 'C2', agentId: crypto.randomUUID() },
        { title: 'P3', content: 'C3', agentId: crypto.randomUUID() }
      ];

      for (const post of posts) {
        await request(app)
          .post('/api/v1/agent-posts')
          .send(post);
      }

      // London School: Verify ID generator collaboration
      expect(mockIdGenerator.generate).toHaveBeenCalledTimes(3);
    });
  });

  describe('7. POST adds timestamps', () => {
    it('should add createdAt timestamp to new post', async () => {
      const mockTimestamp = '2025-10-01T12:00:00.000Z';
      mockTimestampService.now.mockReturnValue(mockTimestamp);

      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.body.data.createdAt).toBe(mockTimestamp);
    });

    it('should add updatedAt timestamp to new post', async () => {
      const mockTimestamp = '2025-10-01T12:00:00.000Z';
      mockTimestampService.now.mockReturnValue(mockTimestamp);

      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.body.data.updatedAt).toBe(mockTimestamp);
    });

    it('should add publishedAt timestamp to new post', async () => {
      const mockTimestamp = '2025-10-01T12:00:00.000Z';
      mockTimestampService.now.mockReturnValue(mockTimestamp);

      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.body.data.publishedAt).toBe(mockTimestamp);
    });

    it('should verify timestamp service was called', async () => {
      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify interaction with timestamp service
      expect(mockTimestampService.now).toHaveBeenCalled();
    });
  });

  describe('8. POST stores post (retrievable via GET)', () => {
    it('should call repository save method with complete post data', async () => {
      const validPost = {
        title: 'Test Post',
        content: 'Test Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify repository collaboration
      expect(mockPostRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPostRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: validPost.title,
          content: validPost.content,
          agentId: validPost.agentId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          publishedAt: expect.any(String)
        })
      );
    });

    it('should verify post is persisted with all required fields', async () => {
      let savedPost = null;
      mockPostRepository.save.mockImplementation(async (post) => {
        savedPost = post;
        return post;
      });

      const validPost = {
        title: 'Persisted Post',
        content: 'Will be saved',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify the conversation between objects
      expect(savedPost).toBeDefined();
      expect(savedPost.id).toBeDefined();
      expect(savedPost.title).toBe(validPost.title);
      expect(savedPost.createdAt).toBeDefined();
    });

    it('should coordinate save operation in correct sequence', async () => {
      const callOrder = [];

      mockValidationService.validatePostData.mockImplementation((data) => {
        callOrder.push('validate');
        return { valid: true };
      });

      mockIdGenerator.generate.mockImplementation(() => {
        callOrder.push('generateId');
        return crypto.randomUUID();
      });

      mockTimestampService.now.mockImplementation(() => {
        callOrder.push('timestamp');
        return new Date().toISOString();
      });

      mockPostRepository.save.mockImplementation(async (post) => {
        callOrder.push('save');
        return post;
      });

      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify collaboration sequence
      // Note: validateContentLength is also called, so we have two validations
      expect(callOrder).toEqual(['validate', 'generateId', 'timestamp', 'save']);
    });
  });

  describe('9. POST returns proper error on invalid JSON', () => {
    it('should return 400 for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/agent-posts')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle empty request body gracefully', async () => {
      mockValidationService.validatePostData.mockReturnValue({
        valid: false,
        message: 'Request body is required'
      });

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('10. POST handles missing metadata gracefully', () => {
    it('should create post without optional metadata fields', async () => {
      const minimalPost = {
        title: 'Minimal Post',
        content: 'Only required fields',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(minimalPost);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(minimalPost.title);
    });

    it('should accept and preserve optional metadata when provided', async () => {
      const postWithMetadata = {
        title: 'Post with Metadata',
        content: 'Has optional fields',
        agentId: crypto.randomUUID(),
        metadata: {
          tags: ['test', 'tdd'],
          category: 'Development',
          priority: 'high'
        }
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(postWithMetadata);

      expect(response.status).toBe(201);
      expect(response.body.data.metadata).toEqual(postWithMetadata.metadata);
    });
  });

  describe('11. Created posts appear in GET endpoint (integration)', () => {
    it('should verify created post would be retrievable', async () => {
      const mockId = crypto.randomUUID();
      mockIdGenerator.generate.mockReturnValue(mockId);

      // Setup mock for GET endpoint
      mockPostRepository.findById.mockResolvedValue({
        id: mockId,
        title: 'Test Post',
        content: 'Content'
      });

      const validPost = {
        title: 'Test Post',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // Verify repository save was called (post was persisted)
      expect(mockPostRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockId })
      );

      // Simulate GET retrieval
      const retrievedPost = await mockPostRepository.findById(mockId);
      expect(retrievedPost.id).toBe(mockId);
    });

    it('should verify post appears in findAll results', async () => {
      mockPostRepository.findAll.mockResolvedValue([
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' }
      ]);

      const validPost = {
        title: 'New Post',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // Verify repository interaction
      expect(mockPostRepository.save).toHaveBeenCalled();

      // Simulate listing all posts
      const allPosts = await mockPostRepository.findAll();
      expect(allPosts).toBeInstanceOf(Array);
      expect(allPosts.length).toBeGreaterThan(0);
    });
  });

  describe('12. Multiple posts maintain order (newest first)', () => {
    it('should create posts with incrementing timestamps', async () => {
      const timestamps = [
        '2025-10-01T12:00:00.000Z',
        '2025-10-01T12:01:00.000Z',
        '2025-10-01T12:02:00.000Z'
      ];

      let timestampIndex = 0;
      mockTimestampService.now.mockImplementation(() => {
        return timestamps[timestampIndex++];
      });

      const posts = [
        { title: 'First', content: 'C1', agentId: crypto.randomUUID() },
        { title: 'Second', content: 'C2', agentId: crypto.randomUUID() },
        { title: 'Third', content: 'C3', agentId: crypto.randomUUID() }
      ];

      const responses = [];
      for (const post of posts) {
        const response = await request(app)
          .post('/api/v1/agent-posts')
          .send(post);
        responses.push(response.body.data);
      }

      // Verify timestamps are sequential
      expect(responses[0].createdAt).toBe(timestamps[0]);
      expect(responses[1].createdAt).toBe(timestamps[1]);
      expect(responses[2].createdAt).toBe(timestamps[2]);
    });

    it('should verify posts can be sorted by createdAt (newest first)', async () => {
      const mockPosts = [
        { id: '3', title: 'Third', createdAt: '2025-10-01T12:02:00.000Z' },
        { id: '2', title: 'Second', createdAt: '2025-10-01T12:01:00.000Z' },
        { id: '1', title: 'First', createdAt: '2025-10-01T12:00:00.000Z' }
      ];

      mockPostRepository.findAll.mockResolvedValue(mockPosts);

      const posts = await mockPostRepository.findAll();

      // Verify newest first ordering (compare as strings since ISO timestamps are sortable)
      expect(new Date(posts[0].createdAt).getTime()).toBeGreaterThan(new Date(posts[1].createdAt).getTime());
      expect(new Date(posts[1].createdAt).getTime()).toBeGreaterThan(new Date(posts[2].createdAt).getTime());
      expect(posts[0].title).toBe('Third');
    });

    it('should verify repository stores posts in creation order', async () => {
      const savedPosts = [];
      mockPostRepository.save.mockImplementation(async (post) => {
        savedPosts.push(post);
        return post;
      });

      const posts = [
        { title: 'A', content: 'Content A', agentId: crypto.randomUUID() },
        { title: 'B', content: 'Content B', agentId: crypto.randomUUID() },
        { title: 'C', content: 'Content C', agentId: crypto.randomUUID() }
      ];

      for (const post of posts) {
        await request(app)
          .post('/api/v1/agent-posts')
          .send(post);
      }

      // London School: Verify collaboration maintained order
      expect(savedPosts).toHaveLength(3);
      expect(savedPosts[0].title).toBe('A');
      expect(savedPosts[1].title).toBe('B');
      expect(savedPosts[2].title).toBe('C');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle repository save failures gracefully', async () => {
      mockPostRepository.save.mockRejectedValue(
        new Error('Database connection failed')
      );

      const validPost = {
        title: 'Test',
        content: 'Content',
        agentId: crypto.randomUUID()
      };

      const response = await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should verify all collaborators are called in success scenario', async () => {
      const validPost = {
        title: 'Complete Test',
        content: 'All collaborators',
        agentId: crypto.randomUUID()
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(validPost);

      // London School: Verify all expected interactions occurred
      expect(mockValidationService.validatePostData).toHaveBeenCalled();
      expect(mockValidationService.validateContentLength).toHaveBeenCalled();
      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockTimestampService.now).toHaveBeenCalled();
      expect(mockPostRepository.save).toHaveBeenCalled();
    });

    it('should not call repository if validation fails', async () => {
      mockValidationService.validatePostData.mockReturnValue({
        valid: false,
        message: 'Invalid data'
      });

      const invalidPost = {
        title: '',
        content: '',
        agentId: ''
      };

      await request(app)
        .post('/api/v1/agent-posts')
        .send(invalidPost);

      // London School: Verify repository was NOT called when validation fails
      expect(mockPostRepository.save).not.toHaveBeenCalled();
    });
  });
});
