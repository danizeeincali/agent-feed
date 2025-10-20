/**
 * TDD Integration Test Suite: Business Impact Indicator Removal
 *
 * Purpose: Validate that the API and database correctly handle post creation
 * without businessImpact field, and that existing posts still load properly.
 *
 * Test Coverage:
 * - New posts created without businessImpact field
 * - API response doesn't include businessImpact for new posts
 * - Existing posts with businessImpact still load correctly
 * - Post creation flow still works
 * - Database schema handles missing businessImpact
 * - API endpoints return correct data structure
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const DB_PATH = path.join(__dirname, '../../database.db');

let db: any;
let testPostIds: string[] = [];

describe('Business Impact Removal - Integration Tests', () => {
  beforeAll(() => {
    // Connect to database
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('✅ Test database connected');
  });

  afterAll(() => {
    // Cleanup test posts
    if (db && testPostIds.length > 0) {
      const placeholders = testPostIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM agent_posts WHERE id IN (${placeholders})`).run(...testPostIds);
      console.log(`🧹 Cleaned up ${testPostIds.length} test posts`);
    }

    if (db) {
      db.close();
      console.log('✅ Test database closed');
    }
  });

  beforeEach(() => {
    // Reset test post IDs for each test
    testPostIds = [];
  });

  describe('New Post Creation', () => {
    test('should create post without businessImpact field', async () => {
      const testPost = {
        title: 'Test Post Without Business Impact',
        content: 'This is a test post created without any business impact data.',
        authorAgent: 'TestAgent',
        tags: ['test', 'integration']
      };

      const response = await fetch(`${API_BASE_URL}/api/agent-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPost)
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBeDefined();

      // Track for cleanup
      testPostIds.push(data.data.id);

      // Verify no businessImpact in response
      expect(data.data.metadata?.businessImpact).toBeUndefined();
      expect(data.data.businessImpact).toBeUndefined();
    });

    test('should create post in database without businessImpact column', async () => {
      const postId = uuidv4();
      const testPost = {
        id: postId,
        title: 'Direct DB Insert Test',
        content: 'Testing direct database insertion without businessImpact.',
        author_agent: 'TestAgent',
        created_at: new Date().toISOString(),
        tags: JSON.stringify(['test'])
      };

      // Insert directly into database
      const stmt = db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, created_at, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        testPost.id,
        testPost.title,
        testPost.content,
        testPost.author_agent,
        testPost.created_at,
        testPost.tags
      );

      testPostIds.push(postId);

      // Retrieve the post
      const result = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postId);

      expect(result).toBeDefined();
      expect(result.id).toBe(postId);
      expect(result.title).toBe(testPost.title);

      // Verify database schema doesn't have businessImpact column
      // or if it does, it's NULL
      expect(result.business_impact).toBeUndefined();
    });

    test('should handle post creation with legacy businessImpact field gracefully', async () => {
      const testPost = {
        title: 'Legacy Post with Business Impact',
        content: 'This post includes legacy businessImpact data.',
        authorAgent: 'TestAgent',
        tags: ['test', 'legacy'],
        metadata: {
          businessImpact: 80 // Legacy field
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/agent-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPost)
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);

      testPostIds.push(data.data.id);

      // Verify API strips out businessImpact or ignores it
      // The field may be stored but should not be returned in API response
      expect(data.data.metadata?.businessImpact).toBeUndefined();
    });
  });

  describe('API Response Structure', () => {
    test('GET /api/agent-posts should not include businessImpact in response', async () => {
      // Create a test post first
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'API Test Post', 'Test content', 'TestAgent', new Date().toISOString());

      testPostIds.push(postId);

      // Fetch posts via API
      const response = await fetch(`${API_BASE_URL}/api/agent-posts?limit=10&offset=0`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Find our test post
      const testPost = data.data.find((post: any) => post.id === postId);
      expect(testPost).toBeDefined();

      // Verify no businessImpact field
      expect(testPost.businessImpact).toBeUndefined();
      expect(testPost.metadata?.businessImpact).toBeUndefined();
    });

    test('GET /api/agent-posts/:id should not include businessImpact', async () => {
      // Create a test post
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(postId, 'Single Post Test', 'Test content', 'TestAgent', new Date().toISOString());

      testPostIds.push(postId);

      // Fetch single post via API
      const response = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();

      // Verify no businessImpact field
      expect(data.data.businessImpact).toBeUndefined();
      expect(data.data.metadata?.businessImpact).toBeUndefined();
    });

    test('POST /api/agent-posts response should not include businessImpact', async () => {
      const testPost = {
        title: 'Response Structure Test',
        content: 'Testing API response structure',
        authorAgent: 'TestAgent'
      };

      const response = await fetch(`${API_BASE_URL}/api/agent-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPost)
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);

      testPostIds.push(data.data.id);

      // Verify response structure doesn't include businessImpact
      expect(data.data.businessImpact).toBeUndefined();
      expect(data.data.metadata?.businessImpact).toBeUndefined();
    });
  });

  describe('Existing Posts Compatibility', () => {
    test('should load existing posts without errors', async () => {
      // Fetch all posts
      const response = await fetch(`${API_BASE_URL}/api/agent-posts?limit=50&offset=0`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Verify all posts load correctly
      data.data.forEach((post: any) => {
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.authorAgent).toBeDefined();

        // No businessImpact should be present
        expect(post.businessImpact).toBeUndefined();
        expect(post.metadata?.businessImpact).toBeUndefined();
      });
    });

    test('should handle posts with legacy businessImpact data in database', async () => {
      // Check if database has any posts with businessImpact
      const postsWithImpact = db.prepare(`
        SELECT id, title, metadata FROM agent_posts
        WHERE metadata LIKE '%businessImpact%'
        LIMIT 5
      `).all();

      if (postsWithImpact.length > 0) {
        // Fetch these posts via API
        for (const dbPost of postsWithImpact) {
          const response = await fetch(`${API_BASE_URL}/api/agent-posts/${dbPost.id}`);
          expect(response.status).toBe(200);

          const data = await response.json();
          expect(data.success).toBe(true);

          // API should not return businessImpact even if it's in the database
          expect(data.data.businessImpact).toBeUndefined();
          expect(data.data.metadata?.businessImpact).toBeUndefined();
        }
      } else {
        console.log('ℹ️ No legacy posts with businessImpact found in database');
      }
    });
  });

  describe('Post Creation Flow', () => {
    test('should complete full post creation workflow without businessImpact', async () => {
      // Step 1: Create post
      const createResponse = await fetch(`${API_BASE_URL}/api/agent-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Full Workflow Test',
          content: 'Testing complete post creation flow',
          authorAgent: 'TestAgent',
          tags: ['test', 'workflow']
        })
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const postId = createData.data.id;
      testPostIds.push(postId);

      // Step 2: Retrieve post
      const getResponse = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}`);
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();

      // Step 3: Verify data integrity
      expect(getData.data.title).toBe('Full Workflow Test');
      expect(getData.data.content).toBe('Testing complete post creation flow');
      expect(getData.data.authorAgent).toBe('TestAgent');
      expect(getData.data.businessImpact).toBeUndefined();
      expect(getData.data.metadata?.businessImpact).toBeUndefined();

      // Step 4: Update post (if API supports it)
      // This would test that updates also don't include businessImpact
    });

    test('should handle concurrent post creation without businessImpact', async () => {
      // Create multiple posts simultaneously
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        fetch(`${API_BASE_URL}/api/agent-posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Concurrent Test Post ${i}`,
            content: `Testing concurrent creation ${i}`,
            authorAgent: 'TestAgent'
          })
        })
      );

      const responses = await Promise.all(createPromises);

      // Verify all succeeded
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Get all response data
      const dataPromises = responses.map(r => r.json());
      const allData = await Promise.all(dataPromises);

      // Track for cleanup and verify no businessImpact
      allData.forEach(data => {
        testPostIds.push(data.data.id);
        expect(data.data.businessImpact).toBeUndefined();
        expect(data.data.metadata?.businessImpact).toBeUndefined();
      });
    });
  });

  describe('Database Schema Validation', () => {
    test('should verify database schema does not require businessImpact', () => {
      // Get table schema
      const schema = db.prepare("PRAGMA table_info(agent_posts)").all();

      // Check if businessImpact column exists and is nullable
      const businessImpactColumn = schema.find((col: any) =>
        col.name === 'business_impact' || col.name === 'businessImpact'
      );

      if (businessImpactColumn) {
        // If column exists, it should be nullable
        expect(businessImpactColumn.notnull).toBe(0);
      } else {
        // Preferred: column doesn't exist at all
        expect(businessImpactColumn).toBeUndefined();
      }
    });

    test('should verify metadata field structure', () => {
      // Create a test post and check metadata
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        'Metadata Test',
        'Testing metadata structure',
        'TestAgent',
        new Date().toISOString(),
        JSON.stringify({ tags: ['test'], category: 'integration' })
      );

      testPostIds.push(postId);

      // Retrieve and verify
      const result = db.prepare('SELECT metadata FROM agent_posts WHERE id = ?').get(postId);
      expect(result).toBeDefined();

      const metadata = JSON.parse(result.metadata || '{}');
      expect(metadata.businessImpact).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing fields gracefully without businessImpact', async () => {
      const incompletePost = {
        title: 'Incomplete Post',
        // Missing content
        authorAgent: 'TestAgent'
      };

      const response = await fetch(`${API_BASE_URL}/api/agent-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incompletePost)
      });

      // Should handle gracefully (either accept with defaults or reject with clear error)
      // Both are acceptable as long as there's no businessImpact error
      if (response.status === 201) {
        const data = await response.json();
        testPostIds.push(data.data.id);
        expect(data.data.businessImpact).toBeUndefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
        const errorData = await response.json();
        // Error should NOT be about missing businessImpact
        expect(JSON.stringify(errorData)).not.toMatch(/businessImpact/i);
      }
    });

    test('should not error on null metadata', async () => {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        'Null Metadata Test',
        'Testing null metadata handling',
        'TestAgent',
        new Date().toISOString(),
        null
      );

      testPostIds.push(postId);

      // Fetch via API
      const response = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.businessImpact).toBeUndefined();
    });
  });

  describe('Performance', () => {
    test('should load posts efficiently without businessImpact processing', async () => {
      const startTime = Date.now();

      const response = await fetch(`${API_BASE_URL}/api/agent-posts?limit=100&offset=0`);
      expect(response.status).toBe(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      const data = await response.json();
      expect(data.success).toBe(true);

      console.log(`✅ Loaded ${data.data.length} posts in ${duration}ms`);
    });
  });
});
