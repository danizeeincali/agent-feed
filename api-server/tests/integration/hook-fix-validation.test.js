/**
 * Integration Test: Hook Fix Validation
 *
 * Tests the complete system initialization flow with real database
 * Scenario: User has 29 old posts + 0 welcome posts
 * Expected: Hook triggers initialization → 3 welcome posts created → 32 total posts
 *
 * @see /workspaces/agent-feed/docs/SPARC-HOOK-FIX-SYSTEM-INITIALIZATION.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';

const DB_PATH = '/workspaces/agent-feed/database.db';
const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'demo-user-123';

describe('Hook Fix Integration Tests', () => {
  let db;

  beforeAll(() => {
    db = new Database(DB_PATH, { readonly: true });
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('Database State Validation', () => {
    it('should have posts in database (old posts from previous usage)', () => {
      const result = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
      expect(result.count).toBeGreaterThanOrEqual(29);
    });

    it('should have exactly 3 systemInitialization posts after initialization', () => {
      const result = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE metadata LIKE '%systemInitialization%'
      `).get();

      expect(result.count).toBe(3);
    });

    it('should have correct welcome post authors', () => {
      const posts = db.prepare(`
        SELECT authorAgent FROM agent_posts
        WHERE metadata LIKE '%systemInitialization%'
        ORDER BY created_at ASC
      `).all();

      expect(posts).toHaveLength(3);
      expect(posts[0].authorAgent).toBe('system');
      expect(posts[1].authorAgent).toBe('get-to-know-you-agent');
      expect(posts[2].authorAgent).toBe('lambda-vi');
    });

    it('should preserve old posts after initialization', () => {
      const totalPosts = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();

      // Should have at least 32 posts (29 old + 3 new)
      expect(totalPosts.count).toBeGreaterThanOrEqual(32);
    });
  });

  describe('API Endpoint Validation', () => {
    it('should detect welcome posts via /api/system/state', async () => {
      const response = await fetch(`${API_BASE}/api/system/state?userId=${TEST_USER_ID}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.state.hasWelcomePosts).toBe(true);
      expect(data.state.welcomePostsCount).toBe(3);
    });

    it('should return alreadyInitialized when called again', async () => {
      const response = await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: TEST_USER_ID })
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.alreadyInitialized).toBe(true);
      expect(data.existingPostsCount).toBe(3);
    });

    it('should not create duplicate posts on repeated initialization', async () => {
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();

      // Call initialize again
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: TEST_USER_ID })
      });

      const afterCount = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();

      // Post count should remain the same (idempotency)
      expect(afterCount.count).toBe(beforeCount.count);
    });
  });

  describe('Hook Fix Validation', () => {
    it('should correctly identify systemInitialization posts, not just any posts', () => {
      // Get total posts
      const totalPosts = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();

      // Get systemInitialization posts
      const welcomePosts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE metadata LIKE '%systemInitialization%'
      `).get();

      // Should have many more total posts than welcome posts
      expect(totalPosts.count).toBeGreaterThan(welcomePosts.count);

      // Specifically: 32 total, 3 welcome (29 old posts preserved)
      expect(totalPosts.count).toBeGreaterThanOrEqual(32);
      expect(welcomePosts.count).toBe(3);
    });

    it('should have welcome posts with correct metadata structure', () => {
      const posts = db.prepare(`
        SELECT id, authorAgent, metadata FROM agent_posts
        WHERE metadata LIKE '%systemInitialization%'
      `).all();

      expect(posts).toHaveLength(3);

      posts.forEach(post => {
        const metadata = JSON.parse(post.metadata);

        // Verify isSystemInitialization metadata exists
        expect(metadata).toHaveProperty('isSystemInitialization');
        expect(metadata.isSystemInitialization).toBe(true);

        // Verify userId
        expect(metadata).toHaveProperty('userId');
        expect(metadata.userId).toBe(TEST_USER_ID);
      });
    });

    it('should have old posts WITHOUT systemInitialization metadata', () => {
      const oldPosts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE metadata NOT LIKE '%systemInitialization%'
      `).all();

      // Should have at least 29 old posts without the flag
      expect(oldPosts[0].count).toBeGreaterThanOrEqual(29);
    });
  });

  describe('Performance Validation', () => {
    it('should respond to /api/system/state within reasonable time', async () => {
      const startTime = Date.now();

      await fetch(`${API_BASE}/api/system/state?userId=${TEST_USER_ID}`);

      const duration = Date.now() - startTime;

      // Network calls have overhead, so we allow up to 6 seconds
      expect(duration).toBeLessThan(6000);
    });

    it('should handle concurrent state checks without errors', async () => {
      const promises = Array(10).fill(null).map(() =>
        fetch(`${API_BASE}/api/system/state?userId=${TEST_USER_ID}`)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle query with non-existent userId gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/system/state?userId=non-existent-user`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      // Should return false for hasWelcomePosts
      expect(data.state.hasWelcomePosts).toBe(false);
    });

    it('should validate metadata is valid JSON', () => {
      const posts = db.prepare(`
        SELECT metadata FROM agent_posts
        WHERE metadata LIKE '%systemInitialization%'
      `).all();

      posts.forEach(post => {
        expect(() => JSON.parse(post.metadata)).not.toThrow();
      });
    });

    it('should have unique post IDs', () => {
      const posts = db.prepare('SELECT id FROM agent_posts').all();
      const uniqueIds = new Set(posts.map(p => p.id));

      expect(uniqueIds.size).toBe(posts.length);
    });
  });
});
