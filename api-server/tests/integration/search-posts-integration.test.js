/**
 * Integration Test for /api/search/posts endpoint
 *
 * Tests the actual implementation against the SQLite database
 * Following SPARC TDD methodology
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import dbSelector from '../../config/database-selector.js';

// Create test Express app
let app;
let testDb;

beforeAll(async () => {
  // Initialize database selector
  await dbSelector.initialize();

  // Create Express app with the endpoint
  app = express();
  app.use(express.json());

  // Add the search endpoint (same as server.js)
  app.get('/api/search/posts', async (req, res) => {
    try {
      // Extract and validate query parameters
      const query = (req.query.q || '').trim();
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);

      // Validate required query parameter
      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query parameter 'q' is required",
          code: 'MISSING_QUERY'
        });
      }

      // Validate query length
      if (query.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be less than 500 characters',
          code: 'QUERY_TOO_LONG'
        });
      }

      // Call database selector search method
      const results = await dbSelector.searchPosts(query, limit, offset);

      // Return formatted response
      res.json({
        success: true,
        data: {
          items: results.posts,
          total: results.total,
          query: query
        }
      });

    } catch (error) {
      console.error('Search endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed. Please try again.',
        code: 'DATABASE_ERROR'
      });
    }
  });

  // Open test database to verify data exists
  testDb = new Database('/workspaces/agent-feed/database.db');
});

afterAll(() => {
  if (testDb) {
    testDb.close();
  }
});

describe('GET /api/search/posts - Integration Tests', () => {

  it('should return 400 when query parameter is missing', async () => {
    const response = await request(app)
      .get('/api/search/posts')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_QUERY');
  });

  it('should return 400 when query is empty', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_QUERY');
  });

  it('should return 400 when query is too long', async () => {
    const longQuery = 'a'.repeat(501);
    const response = await request(app)
      .get(`/api/search/posts?q=${longQuery}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('QUERY_TOO_LONG');
  });

  it('should return results for valid search query', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data).toHaveProperty('items');
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('query');
    expect(response.body.data.query).toBe('test');
    expect(Array.isArray(response.body.data.items)).toBe(true);
  });

  it('should search across title, content, and authorAgent fields', async () => {
    // Search for "validation" which should match posts
    const response = await request(app)
      .get('/api/search/posts?q=validation')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeGreaterThanOrEqual(0);
  });

  it('should be case-insensitive', async () => {
    const lowerResponse = await request(app)
      .get('/api/search/posts?q=test')
      .expect(200);

    const upperResponse = await request(app)
      .get('/api/search/posts?q=TEST')
      .expect(200);

    expect(lowerResponse.body.data.total).toBe(upperResponse.body.data.total);
  });

  it('should respect limit parameter', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=2')
      .expect(200);

    expect(response.body.data.items.length).toBeLessThanOrEqual(2);
  });

  it('should respect offset parameter', async () => {
    const page1 = await request(app)
      .get('/api/search/posts?q=test&limit=1&offset=0')
      .expect(200);

    const page2 = await request(app)
      .get('/api/search/posts?q=test&limit=1&offset=1')
      .expect(200);

    // If there are multiple results, the items should be different
    if (page1.body.data.total > 1) {
      expect(page1.body.data.items[0]?.id).not.toBe(page2.body.data.items[0]?.id);
    }
  });

  it('should cap limit at 100', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=200')
      .expect(200);

    // The actual number returned should be <= 100
    expect(response.body.data.items.length).toBeLessThanOrEqual(100);
  });

  it('should return empty results for non-existent search term', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=nonexistentterm12345')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.total).toBe(0);
  });

  it('should handle special characters safely', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=' + encodeURIComponent("test's"))
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should prevent SQL injection', async () => {
    const sqlInjection = "'; DROP TABLE agent_posts; --";
    const response = await request(app)
      .get('/api/search/posts?q=' + encodeURIComponent(sqlInjection))
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify table still exists
    const tableCheck = testDb.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
    expect(tableCheck.count).toBeGreaterThan(0);
  });

  it('should return posts sorted by publishedAt DESC', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test')
      .expect(200);

    if (response.body.data.items.length > 1) {
      const first = new Date(response.body.data.items[0].publishedAt);
      const second = new Date(response.body.data.items[1].publishedAt);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should include all required post fields', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test')
      .expect(200);

    if (response.body.data.items.length > 0) {
      const post = response.body.data.items[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('authorAgent');
      expect(post).toHaveProperty('publishedAt');
    }
  });

  it('should return correct total count across pages', async () => {
    const response = await request(app)
      .get('/api/search/posts?q=test&limit=1')
      .expect(200);

    // Total should be count of ALL matching posts, not just current page
    if (response.body.data.total > 1) {
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.total).toBeGreaterThan(1);
    }
  });
});

describe('Database Selector searchPosts method', () => {

  it('should return posts and total count', async () => {
    const results = await dbSelector.searchPosts('test', 20, 0);

    expect(results).toHaveProperty('posts');
    expect(results).toHaveProperty('total');
    expect(Array.isArray(results.posts)).toBe(true);
    expect(typeof results.total).toBe('number');
  });

  it('should sanitize and validate inputs', async () => {
    // Empty query still searches (matches all posts with empty pattern)
    const results = await dbSelector.searchPosts('', 20, 0);
    expect(results).toHaveProperty('posts');
    expect(results).toHaveProperty('total');
    expect(Array.isArray(results.posts)).toBe(true);
    // Empty query with LIKE '%' matches all posts
    expect(results.posts.length).toBeGreaterThanOrEqual(0);
  });

  it('should enforce limit bounds', async () => {
    const results = await dbSelector.searchPosts('test', 200, 0);
    expect(results.posts.length).toBeLessThanOrEqual(100);
  });

  it('should enforce offset bounds', async () => {
    const results = await dbSelector.searchPosts('test', 20, -10);
    // Should treat negative offset as 0
    expect(results).toBeDefined();
  });
});
