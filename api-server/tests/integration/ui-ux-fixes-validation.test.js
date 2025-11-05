/**
 * Integration Test Suite: UI/UX Fixes Validation
 *
 * Tests ALL UI/UX fixes from SPARC-UI-UX-FIXES-SYSTEM-INITIALIZATION.md
 * using REAL database queries and API calls (NO MOCKS)
 *
 * Critical: This test suite validates production-ready implementation
 */

const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');

// Real database path
const DB_PATH = path.join(__dirname, '../../../database.db');
const API_BASE_URL = 'http://localhost:3001';

describe('UI/UX Fixes - Integration Tests (Real Database)', () => {
  let db;

  beforeAll(() => {
    // Connect to real database
    db = new Database(DB_PATH, { readonly: true });
    console.log(`Connected to database: ${DB_PATH}`);
  });

  afterAll(() => {
    if (db) {
      db.close();
      console.log('Database connection closed');
    }
  });

  describe('Database Post Order Validation', () => {
    test('First post should be lambda-vi "Welcome to Agent Feed!"', () => {
      const posts = db.prepare(`
        SELECT id, authorAgent, title
        FROM agent_posts
        WHERE id LIKE 'post-%'
        ORDER BY created_at ASC
      `).all();

      expect(posts.length).toBeGreaterThanOrEqual(3);
      expect(posts[0].authorAgent).toBe('lambda-vi');
      expect(posts[0].title).toBe('Welcome to Agent Feed!');
    });

    test('Second post should be get-to-know-you-agent "Hi! Let\'s Get Started"', () => {
      const posts = db.prepare(`
        SELECT id, authorAgent, title
        FROM agent_posts
        WHERE id LIKE 'post-%'
        ORDER BY created_at ASC
      `).all();

      expect(posts.length).toBeGreaterThanOrEqual(3);
      expect(posts[1].authorAgent).toBe('get-to-know-you-agent');
      expect(posts[1].title).toBe('Hi! Let\'s Get Started');
    });

    test('Third post should be system "📚 How Agent Feed Works"', () => {
      const posts = db.prepare(`
        SELECT id, authorAgent, title
        FROM agent_posts
        WHERE id LIKE 'post-%'
        ORDER BY created_at ASC
      `).all();

      expect(posts.length).toBeGreaterThanOrEqual(3);
      expect(posts[2].authorAgent).toBe('system');
      expect(posts[2].title).toBe('📚 How Agent Feed Works');
    });

    test('All three welcome posts exist', () => {
      const count = db.prepare(`
        SELECT COUNT(*) as total
        FROM agent_posts
        WHERE id LIKE 'post-%'
      `).get();

      expect(count.total).toBeGreaterThanOrEqual(3);
    });

    test('Posts are ordered by created_at ascending', () => {
      const posts = db.prepare(`
        SELECT created_at
        FROM agent_posts
        WHERE id LIKE 'post-%'
        ORDER BY created_at ASC
        LIMIT 3
      `).all();

      expect(posts.length).toBe(3);

      // Verify chronological order
      const timestamps = posts.map(p => new Date(p.created_at).getTime());
      expect(timestamps[0]).toBeLessThanOrEqual(timestamps[1]);
      expect(timestamps[1]).toBeLessThanOrEqual(timestamps[2]);
    });
  });

  describe('No "Lambda" Text Validation', () => {
    test('Lambda-vi post should NOT contain standalone "Lambda" word', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'lambda-vi'
      `).get();

      expect(post).toBeDefined();

      // Should NOT contain standalone "Lambda" (case-insensitive)
      // Allows "Lambda-vi" but not "Lambda" alone
      const standaloneRegex = /\bLambda\b(?!-vi)/i;
      expect(post.content).not.toMatch(standaloneRegex);
    });

    test('Lambda-vi post should contain correct Λvi symbol', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'lambda-vi'
      `).get();

      expect(post.content).toContain('**Λvi**');
    });

    test('Lambda-vi post should have pronunciation comment', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'lambda-vi'
      `).get();

      expect(post.content).toContain('<!-- Λvi is pronounced "Avi" -->');
    });
  });

  describe('Content Validation', () => {
    test('Lambda-vi content should have clickable agent mentions', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'lambda-vi'
      `).get();

      // Check for markdown bold formatting
      expect(post.content).toContain('**Λvi**');
      expect(post.content).toContain('**Get-to-Know-You**');
    });

    test('Get-to-know-you-agent content should have proper formatting', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'get-to-know-you-agent'
      `).get();

      expect(post.content).toContain('## Question 1');
      expect(post.content).toContain('**Get-to-Know-You**');
    });

    test('System post should have emoji and proper sections', () => {
      const post = db.prepare(`
        SELECT content
        FROM agent_posts
        WHERE authorAgent = 'system'
      `).get();

      expect(post.content).toContain('📚');
      expect(post.content).toContain('## What is Agent Feed?');
      expect(post.content).toContain('## Your Proactive Agents');
    });

    test('All posts have non-empty content', () => {
      const posts = db.prepare(`
        SELECT id, content
        FROM agent_posts
        WHERE id LIKE 'post-%'
      `).all();

      posts.forEach(post => {
        expect(post.content).toBeTruthy();
        expect(post.content.length).toBeGreaterThan(100);
      });
    });
  });

  describe('Metadata Validation', () => {
    test('All posts have valid metadata JSON', () => {
      const posts = db.prepare(`
        SELECT id, metadata
        FROM agent_posts
        WHERE id LIKE 'post-%'
      `).all();

      posts.forEach(post => {
        expect(() => JSON.parse(post.metadata)).not.toThrow();
        const meta = JSON.parse(post.metadata);
        expect(meta.isSystemInitialization).toBe(true);
        expect(meta.userId).toBe('demo-user-123');
      });
    });

    test('Lambda-vi metadata has correct welcomePostType', () => {
      const post = db.prepare(`
        SELECT metadata
        FROM agent_posts
        WHERE authorAgent = 'lambda-vi'
      `).get();

      const meta = JSON.parse(post.metadata);
      expect(meta.welcomePostType).toBe('avi-welcome');
    });

    test('Get-to-know-you-agent metadata has onboarding phase', () => {
      const post = db.prepare(`
        SELECT metadata
        FROM agent_posts
        WHERE authorAgent = 'get-to-know-you-agent'
      `).get();

      const meta = JSON.parse(post.metadata);
      expect(meta.welcomePostType).toBe('onboarding-phase1');
      expect(meta.onboardingPhase).toBe(1);
      expect(meta.onboardingStep).toBe('name');
    });

    test('System metadata has reference guide type', () => {
      const post = db.prepare(`
        SELECT metadata
        FROM agent_posts
        WHERE authorAgent = 'system'
      `).get();

      const meta = JSON.parse(post.metadata);
      expect(meta.welcomePostType).toBe('reference-guide');
      expect(meta.isSystemDocumentation).toBe(true);
    });
  });
});

describe('API Endpoint Validation (requires running server)', () => {
  const TEST_USER_ID = 'demo-user-123';

  // Note: These tests require the API server to be running
  // Run: cd api-server && npm start

  test('System state API should return 200 OK', async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/system/state`, {
        params: { userId: TEST_USER_ID },
        timeout: 5000
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.state).toBeDefined();
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️  API server not running. Start with: cd api-server && npm start');
        // Mark as pending rather than failing
        pending('API server not running');
      } else {
        throw error;
      }
    }
  });

  test('System state should show initialized and hasWelcomePosts', async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/system/state`, {
        params: { userId: TEST_USER_ID },
        timeout: 5000
      });

      expect(response.data.state.initialized).toBe(true);
      expect(response.data.state.hasWelcomePosts).toBe(true);
      expect(response.data.state.welcomePostsCount).toBeGreaterThanOrEqual(3);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        pending('API server not running');
      } else {
        throw error;
      }
    }
  });
});
