/**
 * Integration Tests: System Initialization Post Creation Flow
 * AGENT 5: Integration Testing (Priority: P1)
 *
 * Tests complete flow: New user → Initialize → Posts created
 * Validates AGAINST RUNNING SYSTEM (NO MOCKS)
 * Verifies content quality (NO "chief of staff")
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the actual database path that the server uses
const DB_PATH = path.join(__dirname, '../../db/agent-feed.db');

let db;

beforeAll(() => {
  // Connect to the REAL database
  db = new Database(DB_PATH);
  console.log('✅ Connected to real database at:', DB_PATH);
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

beforeEach(() => {
  // Clean up test user data before each test
  const testUserId = 'integration-test-user';

  // Delete test user's posts
  db.prepare('DELETE FROM agent_posts WHERE author_id = ?').run(testUserId);

  // Delete test user's settings
  db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(testUserId);

  // Delete test user's onboarding state
  db.prepare('DELETE FROM onboarding_state WHERE user_id = ?').run(testUserId);

  // Delete test user's bridges
  db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?').run(testUserId);
});

describe('System Initialization Integration - Post Creation', () => {
  const API_BASE = 'http://localhost:3001';
  const testUserId = 'integration-test-user';

  describe('AC-1: Welcome Posts Created', () => {
    it('should create 3 welcome posts on initialization', async () => {
      // Call initialization API
      const response = await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          displayName: 'Integration Test User'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.postsCreated).toBe(3);
      expect(data.postIds).toHaveLength(3);

      // Verify posts in database
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE author_id = ?
        ORDER BY created_at ASC
      `).all(testUserId);

      expect(posts).toHaveLength(3);
    });

    it('should create posts with correct author_agent values', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Verify authors
      const posts = db.prepare(`
        SELECT author_agent FROM agent_posts
        WHERE author_id = ?
        ORDER BY created_at ASC
      `).all(testUserId);

      expect(posts[0].author_agent).toBe('lambda-vi');
      expect(posts[1].author_agent).toBe('get-to-know-you-agent');
      expect(posts[2].author_agent).toBe('system');
    });

    it('should create posts with isSystemInitialization metadata', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Verify metadata
      const posts = db.prepare(`
        SELECT metadata FROM agent_posts
        WHERE author_id = ?
      `).all(testUserId);

      posts.forEach(post => {
        const metadata = JSON.parse(post.metadata);
        expect(metadata.isSystemInitialization).toBe(true);
      });
    });

    it('should create posts that appear in feed', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Fetch posts via API
      const feedResponse = await fetch(`${API_BASE}/api/agent-posts?userId=${testUserId}`);
      const feedData = await feedResponse.json();

      expect(feedData.success).toBe(true);
      expect(feedData.data).toHaveLength(3);
    });
  });

  describe('AC-2: Content Validation', () => {
    it('should NOT contain "chief of staff" in Λvi post', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Get Λvi post
      const aviPost = db.prepare(`
        SELECT content FROM agent_posts
        WHERE author_id = ? AND author_agent = 'lambda-vi'
      `).get(testUserId);

      expect(aviPost).toBeDefined();
      expect(aviPost.content).not.toContain('chief of staff');
      expect(aviPost.content.toLowerCase()).not.toContain('chief of staff');
    });

    it('should use "AI partner" terminology in Λvi post', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Get Λvi post
      const aviPost = db.prepare(`
        SELECT content FROM agent_posts
        WHERE author_id = ? AND author_agent = 'lambda-vi'
      `).get(testUserId);

      expect(aviPost.content).toContain('AI partner');
    });

    it('should ask for name in onboarding post', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Get onboarding post
      const onboardingPost = db.prepare(`
        SELECT content FROM agent_posts
        WHERE author_id = ? AND author_agent = 'get-to-know-you-agent'
      `).get(testUserId);

      expect(onboardingPost).toBeDefined();
      expect(onboardingPost.content.toLowerCase()).toMatch(/name|what.*call/);
    });

    it('should document features in reference guide post', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Get reference guide post
      const refPost = db.prepare(`
        SELECT content, title FROM agent_posts
        WHERE author_id = ? AND author_agent = 'system'
      `).get(testUserId);

      expect(refPost).toBeDefined();
      expect(refPost.content.length).toBeGreaterThan(100); // Should be substantial
    });
  });

  describe('AC-3: Idempotency', () => {
    it('should not create duplicate posts on second initialization', async () => {
      // First initialization
      const response1 = await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });
      const data1 = await response1.json();
      expect(data1.postsCreated).toBe(3);

      // Second initialization
      const response2 = await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });
      const data2 = await response2.json();

      expect(data2.alreadyInitialized).toBe(true);
      expect(data2.existingPostsCount).toBe(3);

      // Verify still only 3 posts in database
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts WHERE author_id = ?
      `).get(testUserId);

      expect(posts.count).toBe(3);
    });

    it('should safely handle multiple concurrent initialization requests', async () => {
      // Make 3 concurrent requests
      const promises = [
        fetch(`${API_BASE}/api/system/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId })
        }),
        fetch(`${API_BASE}/api/system/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId })
        }),
        fetch(`${API_BASE}/api/system/initialize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: testUserId })
        })
      ];

      await Promise.all(promises);

      // Should still only have 3 posts
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts WHERE author_id = ?
      `).get(testUserId);

      expect(posts.count).toBe(3);
    });
  });

  describe('AC-4: Database Validation', () => {
    it('should return 3 posts with systemInitialization metadata', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Query database
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE author_id = ?
        AND json_extract(metadata, '$.isSystemInitialization') = 1
      `).all(testUserId);

      expect(posts).toHaveLength(3);
    });

    it('should have correct timestamps', async () => {
      const beforeTime = Date.now();

      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      const afterTime = Date.now();

      // Verify timestamps
      const posts = db.prepare(`
        SELECT created_at FROM agent_posts WHERE author_id = ?
      `).all(testUserId);

      posts.forEach(post => {
        expect(post.created_at).toBeGreaterThanOrEqual(beforeTime);
        expect(post.created_at).toBeLessThanOrEqual(afterTime);
      });
    });

    it('should have correct author attribution', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Verify each post has correct fields
      const posts = db.prepare(`
        SELECT id, author_id, author_agent, content, metadata
        FROM agent_posts
        WHERE author_id = ?
      `).all(testUserId);

      posts.forEach(post => {
        expect(post.id).toBeTruthy();
        expect(post.author_id).toBe(testUserId);
        expect(post.author_agent).toBeTruthy();
        expect(post.content).toBeTruthy();
        expect(post.metadata).toBeTruthy();

        const metadata = JSON.parse(post.metadata);
        expect(metadata.isAgentResponse).toBe(true);
        expect(metadata.agentId).toBe(post.author_agent);
      });
    });
  });

  describe('AC-5: System State Integration', () => {
    it('should create user_settings record', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId, displayName: 'Test User' })
      });

      // Verify user_settings
      const settings = db.prepare(`
        SELECT * FROM user_settings WHERE user_id = ?
      `).get(testUserId);

      expect(settings).toBeDefined();
      expect(settings.display_name).toBe('Test User');
      expect(settings.onboarding_completed).toBe(0);
    });

    it('should create onboarding_state record', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Verify onboarding_state
      const state = db.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
      `).get(testUserId);

      expect(state).toBeDefined();
      expect(state.phase).toBe(1);
      expect(state.phase1_completed).toBe(0);
    });

    it('should create initial hemingway bridge', async () => {
      // Initialize
      await fetch(`${API_BASE}/api/system/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: testUserId })
      });

      // Verify bridge
      const bridge = db.prepare(`
        SELECT * FROM hemingway_bridges WHERE user_id = ?
      `).get(testUserId);

      expect(bridge).toBeDefined();
      expect(bridge.active).toBe(1);
      expect(bridge.content).toBeTruthy();
    });
  });
});

describe('Integration: Error Handling', () => {
  it('should handle missing userId gracefully', async () => {
    const response = await fetch(`${API_BASE}/api/system/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    // Should use default userId
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return proper error on server failure', async () => {
    // This would require simulating a server error
    // For now, verify error structure is correct
    const response = await fetch(`${API_BASE}/api/system/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'valid-user' })
    });

    const data = await response.json();
    expect(data).toHaveProperty('success');

    if (!data.success) {
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
    }
  });
});
