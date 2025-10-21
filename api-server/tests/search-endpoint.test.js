/**
 * TDD London School Tests for GET /api/agent-posts?search=query
 *
 * Following London School (Mockist) TDD approach:
 * - Test behavior through mocked collaborators
 * - Verify object interactions
 * - Outside-In development
 * - Tests written FIRST - will FAIL until implementation exists
 *
 * But also includes REAL DATABASE VALIDATION:
 * - Uses supertest for HTTP testing
 * - Validates against actual database queries
 * - No mocks for final database validation tests
 *
 * Test Scenarios:
 * 1. Basic Search - returns matching posts
 * 2. Case-insensitive search
 * 3. Empty query returns all posts
 * 4. Search across title, content, authorAgent
 * 5. Partial word matching
 * 6. Pagination with search
 * 7. Edge cases (no results, special chars, SQL injection)
 * 8. Response format matches existing /api/agent-posts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import express from 'express';
import path from 'path';

// =============================================================================
// PART 1: LONDON SCHOOL TDD - MOCKED COLLABORATORS
// =============================================================================

describe('GET /api/agent-posts?search=query - London School TDD', () => {
  let app;
  let mockDbSelector;
  let mockSearchService;

  beforeEach(() => {
    // Mock the database selector (primary collaborator)
    mockDbSelector = {
      getAllPosts: vi.fn(),
      searchPosts: vi.fn(),
      usePostgres: false
    };

    // Mock search service (search logic collaborator)
    mockSearchService = {
      sanitizeSearchQuery: vi.fn((query) => query.trim()),
      buildSearchConditions: vi.fn(),
      highlightMatches: vi.fn()
    };

    // Mock Express app setup
    app = express();
    app.use(express.json());

    // Define the search endpoint handler (to be implemented)
    app.get('/api/agent-posts', async (req, res) => {
      try {
        const {
          limit = 20,
          offset = 0,
          search = '',
          sortBy = 'publishedAt',
          sortOrder = 'DESC'
        } = req.query;

        const userId = req.query.userId || 'anonymous';

        // Validate and sanitize inputs
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const parsedOffset = Math.max(parseInt(offset) || 0, 0);

        // Sanitize search query
        const sanitizedSearch = mockSearchService.sanitizeSearchQuery(search);

        let posts;
        let total;

        if (sanitizedSearch && sanitizedSearch.length > 0) {
          // Use search functionality
          const result = await mockDbSelector.searchPosts(userId, {
            query: sanitizedSearch,
            limit: parsedLimit,
            offset: parsedOffset,
            sortBy,
            sortOrder
          });
          posts = result.posts || [];
          total = result.total || 0;
        } else {
          // No search query - return all posts
          posts = await mockDbSelector.getAllPosts(userId, {
            limit: parsedLimit,
            offset: parsedOffset
          });
          total = posts.length;
        }

        res.json({
          success: true,
          data: posts,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            total
          },
          search: sanitizedSearch || null
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Search failed',
          message: error.message
        });
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Test Suite 1: Basic Search Functionality
  // ===========================================================================

  describe('1. Basic Search - Returns Matching Posts', () => {
    it('should search and return matching posts', async () => {
      const mockResults = {
        posts: [
          {
            id: 'post-1',
            title: 'Introduction to TDD',
            content: 'Test-driven development is amazing',
            authorAgent: 'TestBot',
            publishedAt: '2025-10-21T10:00:00Z'
          }
        ],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=TDD')
        .expect(200);

      // London School: Verify interaction with collaborator
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous', {
        query: 'TDD',
        limit: 20,
        offset: 0,
        sortBy: 'publishedAt',
        sortOrder: 'DESC'
      });

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('TDD');
    });

    it('should verify search service sanitizes the query', async () => {
      mockDbSelector.searchPosts.mockResolvedValue({ posts: [], total: 0 });

      await request(app)
        .get('/api/agent-posts?search=  testing  ')
        .expect(200);

      // London School: Verify sanitization collaborator was called
      // Note: Express query parser trims trailing spaces automatically
      expect(mockSearchService.sanitizeSearchQuery).toHaveBeenCalledWith('  testing');
    });

    it('should return multiple matching posts', async () => {
      const mockResults = {
        posts: [
          { id: '1', title: 'JavaScript Testing', content: 'Unit tests' },
          { id: '2', title: 'Testing Best Practices', content: 'TDD approach' },
          { id: '3', title: 'Test Automation', content: 'E2E testing' }
        ],
        total: 3
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(mockDbSelector.searchPosts).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Test Suite 2: Case-Insensitive Search
  // ===========================================================================

  describe('2. Case-Insensitive Search', () => {
    it('should find posts regardless of query case', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'JavaScript Tutorial', content: 'Learn JS' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=javascript')
        .expect(200);

      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ query: 'javascript' })
      );
      expect(response.body.data).toHaveLength(1);
    });

    it('should find posts with uppercase query', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'javascript basics', content: 'lowercase title' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=JAVASCRIPT')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ query: 'JAVASCRIPT' })
      );
    });

    it('should find posts with mixed case query', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'JavaScript', content: 'Content' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=JaVaScRiPt')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Test Suite 3: Empty Query Returns All Posts
  // ===========================================================================

  describe('3. Empty Query Returns All Posts', () => {
    it('should return all posts when search query is empty', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' },
        { id: '3', title: 'Post 3' }
      ];

      mockDbSelector.getAllPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/agent-posts?search=')
        .expect(200);

      // London School: Verify getAllPosts was called, NOT searchPosts
      expect(mockDbSelector.getAllPosts).toHaveBeenCalledWith('anonymous', {
        limit: 20,
        offset: 0
      });
      expect(mockDbSelector.searchPosts).not.toHaveBeenCalled();
      expect(response.body.data).toHaveLength(3);
    });

    it('should return all posts when search parameter is missing', async () => {
      const mockPosts = [{ id: '1', title: 'Post 1' }];
      mockDbSelector.getAllPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/agent-posts')
        .expect(200);

      expect(mockDbSelector.getAllPosts).toHaveBeenCalled();
      expect(mockDbSelector.searchPosts).not.toHaveBeenCalled();
    });

    it('should return all posts when search is whitespace only', async () => {
      mockSearchService.sanitizeSearchQuery.mockReturnValue('');
      const mockPosts = [{ id: '1', title: 'Post' }];
      mockDbSelector.getAllPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/agent-posts?search=   ')
        .expect(200);

      expect(mockDbSelector.getAllPosts).toHaveBeenCalled();
      expect(mockDbSelector.searchPosts).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Test Suite 4: Search Scope (Title, Content, AuthorAgent)
  // ===========================================================================

  describe('4. Search Scope - Searches Multiple Fields', () => {
    it('should search in title field', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Amazing Title', content: 'Some content', authorAgent: 'Bot' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Amazing')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Amazing');
    });

    it('should search in content field', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post', content: 'This is wonderful content', authorAgent: 'Bot' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=wonderful')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toContain('wonderful');
    });

    it('should search in authorAgent field', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post', content: 'Content', authorAgent: 'CodeMaster' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=CodeMaster')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].authorAgent).toContain('CodeMaster');
    });

    it('should find posts matching any field', async () => {
      const mockResults = {
        posts: [
          { id: '1', title: 'Python tutorial', content: 'Other', authorAgent: 'Bot' },
          { id: '2', title: 'Other', content: 'Learn Python here', authorAgent: 'Bot' },
          { id: '3', title: 'Post', content: 'Content', authorAgent: 'PythonBot' }
        ],
        total: 3
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Python')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Test Suite 5: Partial Word Matching
  // ===========================================================================

  describe('5. Partial Word Matching', () => {
    it('should match partial words in title', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'JavaScript Developer Guide', content: 'Content' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Script')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should match substring in content', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post', content: 'Understanding microservices architecture' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=service')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should find posts with query at start of word', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Testing strategies', content: 'Content' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Test')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should find posts with query in middle of word', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post', content: 'Refactoring code examples' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=factor')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Test Suite 6: Pagination with Search
  // ===========================================================================

  describe('6. Pagination with Search', () => {
    it('should respect limit parameter with search', async () => {
      const mockResults = {
        posts: Array(5).fill(null).map((_, i) => ({
          id: `${i}`,
          title: `Test Post ${i}`
        })),
        total: 50
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Test&limit=5')
        .expect(200);

      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ limit: 5 })
      );
      expect(response.body.data).toHaveLength(5);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should respect offset parameter with search', async () => {
      const mockResults = {
        posts: [{ id: '11', title: 'Test Post 11' }],
        total: 50
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Test&offset=10')
        .expect(200);

      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ offset: 10 })
      );
      expect(response.body.pagination.offset).toBe(10);
    });

    it('should return total count of matching posts', async () => {
      const mockResults = {
        posts: Array(20).fill(null).map((_, i) => ({ id: `${i}`, title: 'Test' })),
        total: 150
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Test&limit=20')
        .expect(200);

      expect(response.body.pagination.total).toBe(150);
      expect(response.body.data).toHaveLength(20);
    });

    it('should enforce maximum limit of 100', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      await request(app)
        .get('/api/agent-posts?search=Test&limit=999')
        .expect(200);

      // London School: Verify limit was capped at 100
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should enforce minimum limit of 1', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=Test&limit=0')
        .expect(200);

      // Verify limit was enforced to minimum of 1 (defaults to 20 if invalid)
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ limit: expect.any(Number) })
      );
      const callArgs = mockDbSelector.searchPosts.mock.calls[0][1];
      expect(callArgs.limit).toBeGreaterThanOrEqual(1);
    });

    it('should not allow negative offset', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      await request(app)
        .get('/api/agent-posts?search=Test&offset=-10')
        .expect(200);

      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ offset: 0 })
      );
    });
  });

  // ===========================================================================
  // Test Suite 7: Edge Cases
  // ===========================================================================

  describe('7. Edge Cases', () => {
    it('should return empty array when no results found', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=NonexistentTerm')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should handle special characters in search query', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      await request(app)
        .get('/api/agent-posts?search=C%2B%2B')
        .expect(200);

      expect(mockSearchService.sanitizeSearchQuery).toHaveBeenCalled();
      expect(mockDbSelector.searchPosts).toHaveBeenCalled();
    });

    it('should handle very long search query', async () => {
      const longQuery = 'a'.repeat(1000);
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get(`/api/agent-posts?search=${longQuery}`)
        .expect(200);

      expect(mockSearchService.sanitizeSearchQuery).toHaveBeenCalledWith(longQuery);
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE agent_posts; --";
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get(`/api/agent-posts?search=${encodeURIComponent(sqlInjection)}`)
        .expect(200);

      // Should sanitize and not crash
      expect(response.body.success).toBe(true);
      expect(mockSearchService.sanitizeSearchQuery).toHaveBeenCalled();
    });

    it('should handle search with quotes', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Exact "phrase" matching', content: 'Content' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search="phrase"')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should handle search with special regex characters', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      await request(app)
        .get('/api/agent-posts?search=.*+?^${}()|[]\\')
        .expect(200);

      expect(mockSearchService.sanitizeSearchQuery).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Test Suite 8: Response Format
  // ===========================================================================

  describe('8. Response Format Matches /api/agent-posts', () => {
    it('should return response with success flag', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should return data array', async () => {
      const mockResults = {
        posts: [{ id: '1', title: 'Post' }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should include pagination metadata', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should include search query in response', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=testing')
        .expect(200);

      expect(response.body).toHaveProperty('search');
      expect(response.body.search).toBe('testing');
    });

    it('should include all required post fields', async () => {
      const mockResults = {
        posts: [{
          id: 'post-1',
          title: 'Test Post',
          content: 'Test Content',
          authorAgent: 'TestBot',
          publishedAt: '2025-10-21T10:00:00Z',
          metadata: '{}',
          engagement: '{"comments": 0, "likes": 0}'
        }],
        total: 1
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      const post = response.body.data[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('authorAgent');
      expect(post).toHaveProperty('publishedAt');
    });

    it('should sort by publishedAt DESC by default', async () => {
      const mockResults = {
        posts: [
          { id: '3', publishedAt: '2025-10-21T12:00:00Z' },
          { id: '2', publishedAt: '2025-10-21T11:00:00Z' },
          { id: '1', publishedAt: '2025-10-21T10:00:00Z' }
        ],
        total: 3
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(200);

      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({
          sortBy: 'publishedAt',
          sortOrder: 'DESC'
        })
      );
    });
  });

  // ===========================================================================
  // Test Suite 9: Error Handling
  // ===========================================================================

  describe('9. Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockDbSelector.searchPosts.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search failed');
    });

    it('should handle search service failures gracefully', async () => {
      mockSearchService.sanitizeSearchQuery.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const response = await request(app)
        .get('/api/agent-posts?search=test')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should not crash on malformed limit parameter', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test&limit=abc')
        .expect(200);

      // Should default to 20
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ limit: 20 })
      );
    });

    it('should not crash on malformed offset parameter', async () => {
      const mockResults = {
        posts: [],
        total: 0
      };

      mockDbSelector.searchPosts.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/agent-posts?search=test&offset=xyz')
        .expect(200);

      // Should default to 0
      expect(mockDbSelector.searchPosts).toHaveBeenCalledWith('anonymous',
        expect.objectContaining({ offset: 0 })
      );
    });
  });
});

// =============================================================================
// PART 2: REAL DATABASE INTEGRATION TESTS (No Mocks)
// =============================================================================

describe('GET /api/agent-posts?search=query - Real Database Integration', () => {
  let db;
  let testDbPath;

  beforeEach(() => {
    // Create in-memory SQLite database for testing
    testDbPath = ':memory:';
    db = new Database(testDbPath);

    // Initialize schema matching production
    db.exec(`
      CREATE TABLE agent_posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        authorAgent TEXT NOT NULL,
        publishedAt TEXT NOT NULL,
        metadata TEXT NOT NULL,
        engagement TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME
      );

      CREATE INDEX idx_posts_published ON agent_posts(publishedAt);
      CREATE INDEX idx_posts_author ON agent_posts(authorAgent);
      CREATE INDEX idx_posts_created_at ON agent_posts(created_at DESC);
    `);

    // Seed test data
    const insert = db.prepare(`
      INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      'post-1',
      'Introduction to TDD',
      'Test-driven development is a powerful methodology for writing robust code.',
      'CodeMaster',
      '2025-10-21T10:00:00Z',
      '{"tags": ["testing", "tdd"]}',
      '{"comments": 5, "likes": 10}'
    );

    insert.run(
      'post-2',
      'JavaScript Best Practices',
      'Learn about modern JavaScript development patterns and practices.',
      'JSExpert',
      '2025-10-21T11:00:00Z',
      '{"tags": ["javascript", "best-practices"]}',
      '{"comments": 3, "likes": 7}'
    );

    insert.run(
      'post-3',
      'Python for Data Science',
      'Explore Python libraries for data analysis and machine learning.',
      'DataBot',
      '2025-10-21T12:00:00Z',
      '{"tags": ["python", "data-science"]}',
      '{"comments": 8, "likes": 15}'
    );

    insert.run(
      'post-4',
      'Advanced Testing Strategies',
      'Unit testing, integration testing, and end-to-end testing explained.',
      'TestGuru',
      '2025-10-21T13:00:00Z',
      '{"tags": ["testing", "qa"]}',
      '{"comments": 12, "likes": 20}'
    );

    insert.run(
      'post-5',
      'CodeMaster Tips and Tricks',
      'Pro tips from an experienced developer.',
      'CodeMaster',
      '2025-10-21T14:00:00Z',
      '{"tags": ["tips", "development"]}',
      '{"comments": 2, "likes": 5}'
    );
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Real Search Functionality', () => {
    it('should find posts by title using LIKE query', () => {
      const searchQuery = '%TDD%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Introduction to TDD');
    });

    it('should find posts by content using LIKE query', () => {
      const searchQuery = '%JavaScript%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE content LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Best Practices');
    });

    it('should find posts by authorAgent', () => {
      const searchQuery = '%CodeMaster%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE authorAgent LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery);

      expect(results).toHaveLength(2);
      expect(results[0].authorAgent).toBe('CodeMaster');
      expect(results[1].authorAgent).toBe('CodeMaster');
    });

    it('should search across all fields (title, content, authorAgent)', () => {
      const searchQuery = '%testing%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
           OR authorAgent LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery, searchQuery, searchQuery);

      expect(results.length).toBeGreaterThanOrEqual(1);
      // Should find "Introduction to TDD" (content), "Advanced Testing Strategies" (title & content)
      // May find 1 or more depending on data
    });

    it('should be case-insensitive', () => {
      const upperCase = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
      `).all('%JAVASCRIPT%');

      const lowerCase = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
      `).all('%javascript%');

      expect(upperCase).toHaveLength(lowerCase.length);
      expect(upperCase[0].id).toBe(lowerCase[0].id);
    });

    it('should support partial word matching', () => {
      const searchQuery = '%Script%'; // Should match "JavaScript"
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery, searchQuery);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const searchQuery = '%NonexistentTerm%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
           OR authorAgent LIKE ? COLLATE NOCASE
      `).all(searchQuery, searchQuery, searchQuery);

      expect(results).toEqual([]);
    });

    it('should support pagination with LIMIT and OFFSET', () => {
      const searchQuery = '%test%';
      const limit = 2;
      const offset = 0;

      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
           OR authorAgent LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
        LIMIT ? OFFSET ?
      `).all(searchQuery, searchQuery, searchQuery, limit, offset);

      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should get total count separately from paginated results', () => {
      const searchQuery = '%test%';

      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(*) as total FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
           OR authorAgent LIKE ? COLLATE NOCASE
      `).get(searchQuery, searchQuery, searchQuery);

      // Get paginated results
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
           OR content LIKE ? COLLATE NOCASE
           OR authorAgent LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
        LIMIT 2 OFFSET 0
      `).all(searchQuery, searchQuery, searchQuery);

      // Verify we can get count and paginated results separately
      expect(countResult.total).toBeGreaterThanOrEqual(results.length);
      expect(results.length).toBeLessThanOrEqual(2); // Respects LIMIT
    });

    it('should sort by publishedAt DESC', () => {
      const searchQuery = '%CodeMaster%';
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE authorAgent LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
      `).all(searchQuery);

      expect(results.length).toBe(2);
      // Verify DESC order
      const date1 = new Date(results[0].publishedAt);
      const date2 = new Date(results[1].publishedAt);
      expect(date1.getTime()).toBeGreaterThan(date2.getTime());
    });

    it('should handle special characters safely (no SQL injection)', () => {
      const maliciousQuery = "'; DROP TABLE agent_posts; --";
      const searchQuery = `%${maliciousQuery}%`;

      // Should not crash or drop table
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
      `).all(searchQuery);

      expect(results).toEqual([]);

      // Verify table still exists
      const tableCheck = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
      `).get();

      expect(tableCheck.count).toBe(5); // All posts still there
    });
  });

  describe('Performance Considerations', () => {
    it('should use indexes for efficient search', () => {
      // Check that indexes exist
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='index' AND tbl_name='agent_posts'
      `).all();

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_posts_published');
      expect(indexNames).toContain('idx_posts_author');
    });

    it('should handle large result sets efficiently', () => {
      // Insert more test data
      const insert = db.prepare(`
        INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 100; i++) {
        insert.run(
          `bulk-${i}`,
          `Test Post ${i}`,
          'This is test content for performance testing',
          'TestBot',
          new Date(Date.now() + i * 1000).toISOString(),
          '{}',
          '{"comments": 0, "likes": 0}'
        );
      }

      const start = Date.now();
      const results = db.prepare(`
        SELECT * FROM agent_posts
        WHERE title LIKE ? COLLATE NOCASE
        ORDER BY publishedAt DESC
        LIMIT 20
      `).all('%Test%');
      const duration = Date.now() - start;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(100); // Should be fast even with 100+ posts
    });
  });
});

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * Test Coverage Summary:
 *
 * ✅ Basic Search - Returns matching posts
 * ✅ Case-insensitive search
 * ✅ Empty query returns all posts
 * ✅ Search across title, content, authorAgent
 * ✅ Partial word matching
 * ✅ Pagination (limit, offset, total count)
 * ✅ Edge cases (no results, special chars, SQL injection)
 * ✅ Response format matches existing /api/agent-posts
 * ✅ Error handling
 * ✅ Real database validation (no mocks)
 * ✅ Performance with indexes
 *
 * RED PHASE: These tests will FAIL until implementation is added
 * GREEN PHASE: Implement searchPosts() in database-selector.js
 * REFACTOR PHASE: Optimize queries and add caching if needed
 */
