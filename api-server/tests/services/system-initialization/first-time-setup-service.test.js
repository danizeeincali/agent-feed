/**
 * Unit Tests: First-Time Setup Service
 * AGENT 1: Infrastructure & Database
 * Tests for system initialization detection and setup
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFirstTimeSetupService } from '../../../services/system-initialization/first-time-setup-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let service;
const TEST_DB_PATH = path.join(__dirname, 'test-data', 'first-time-setup.db');

beforeAll(() => {
  // Ensure test-data directory exists
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Create new test database
  db = new Database(TEST_DB_PATH);

  // Create required tables
  db.exec(`
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT
    ) STRICT;

    CREATE TABLE hemingway_bridges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bridge_type TEXT NOT NULL,
      content TEXT NOT NULL,
      priority INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    ) STRICT;

    CREATE TABLE agent_introductions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL
    ) STRICT;

    CREATE TABLE agent_posts (
      id TEXT PRIMARY KEY,
      authorAgent TEXT,
      title TEXT,
      content TEXT,
      publishedAt TEXT,
      metadata TEXT,
      engagement TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      last_activity_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Create service instance
  service = createFirstTimeSetupService(db);
});

afterAll(() => {
  if (db) {
    db.close();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(() => {
  // Clear all tables before each test
  db.exec(`
    DELETE FROM user_settings;
    DELETE FROM onboarding_state;
    DELETE FROM hemingway_bridges;
    DELETE FROM agent_introductions;
    DELETE FROM agent_posts;
  `);
});

describe('First-Time Setup Service - Unit Tests', () => {
  describe('isSystemInitialized()', () => {
    it('should return false when no users exist', () => {
      const result = service.isSystemInitialized();

      expect(result.initialized).toBe(false);
      expect(result.userCount).toBe(0);
      expect(result.needsInitialization).toBe(true);
    });

    it('should return true when users exist', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('test-user', 'Test');

      const result = service.isSystemInitialized();

      expect(result.initialized).toBe(true);
      expect(result.userCount).toBe(1);
      expect(result.needsInitialization).toBe(false);
    });
  });

  describe('checkUserExists()', () => {
    it('should return exists=false when user does not exist', () => {
      const result = service.checkUserExists('nonexistent-user');

      expect(result.exists).toBe(false);
      expect(result.userId).toBe('nonexistent-user');
      expect(result.needsSetup).toBe(true);
    });

    it('should return exists=true when user exists', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('test-user', 'Test User');

      const result = service.checkUserExists('test-user');

      expect(result.exists).toBe(true);
      expect(result.userId).toBe('test-user');
      expect(result.displayName).toBe('Test User');
      expect(result.needsSetup).toBe(false);
    });
  });

  describe('initializeSystem()', () => {
    it('should create default user successfully', () => {
      const result = service.initializeSystem('demo-user-123', 'Demo User');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('demo-user-123');
      expect(result.displayName).toBe('Demo User');

      // Verify in database
      const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('demo-user-123');
      expect(user).toBeDefined();
      expect(user.display_name).toBe('Demo User');
    });

    it('should create onboarding state for user', () => {
      service.initializeSystem('demo-user-123');

      const onboarding = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get('demo-user-123');
      expect(onboarding).toBeDefined();
      expect(onboarding.phase).toBe(1);
      expect(onboarding.step).toBe('name');
    });

    it('should create initial Hemingway bridge', () => {
      service.initializeSystem('demo-user-123');

      const bridge = db.prepare('SELECT * FROM hemingway_bridges WHERE user_id = ?').get('demo-user-123');
      expect(bridge).toBeDefined();
      expect(bridge.bridge_type).toBe('question');
      expect(bridge.active).toBe(1);
    });

    it('should be idempotent (safe to run multiple times)', () => {
      service.initializeSystem('demo-user-123');
      service.initializeSystem('demo-user-123'); // Run again

      // Should still have only one user
      const userCount = db.prepare('SELECT COUNT(*) as count FROM user_settings WHERE user_id = ?').get('demo-user-123');
      expect(userCount.count).toBe(1);
    });
  });

  describe('detectAndInitialize()', () => {
    it('should initialize system when user does not exist', () => {
      const result = service.detectAndInitialize('demo-user-123');

      expect(result.success).toBe(true);
      expect(result.alreadyInitialized).toBe(false);
      expect(result.userId).toBe('demo-user-123');

      // Verify user was created
      const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('demo-user-123');
      expect(user).toBeDefined();
    });

    it('should skip initialization when user already exists', () => {
      db.prepare('INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)').run('existing-user', 'Existing');

      const result = service.detectAndInitialize('existing-user');

      expect(result.success).toBe(true);
      expect(result.alreadyInitialized).toBe(true);
      expect(result.userId).toBe('existing-user');
    });
  });

  describe('getSystemState()', () => {
    it('should return correct state for empty system', () => {
      const state = service.getSystemState();

      expect(state.initialized).toBe(false);
      expect(state.userCount).toBe(0);
      expect(state.onboardingStats.completed).toBe(0);
      expect(state.activeBridges).toBe(0);
    });

    it('should return correct state after initialization', () => {
      service.initializeSystem('demo-user-123');

      const state = service.getSystemState();

      expect(state.initialized).toBe(true);
      expect(state.userCount).toBe(1);
      expect(state.activeBridges).toBe(1);
    });

    it('should track onboarding completion', () => {
      service.initializeSystem('demo-user-123');

      // Mark onboarding as complete
      db.prepare('UPDATE user_settings SET onboarding_completed = 1 WHERE user_id = ?').run('demo-user-123');

      const state = service.getSystemState();

      expect(state.onboardingStats.completed).toBe(1);
      expect(state.onboardingStats.pending).toBe(0);
    });
  });

  describe('initializeSystemWithPosts()', () => {
    it('should create 3 welcome posts in database', async () => {
      const result = await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      expect(result.success).toBe(true);
      expect(result.postsCreated).toBe(3);
      expect(result.postIds).toHaveLength(3);

      // Verify posts in database - check metadata for userId
      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
      `).all();
      expect(posts).toHaveLength(3);
    });

    it('should create posts with correct author_agent values', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
        ORDER BY created_at ASC
      `).all();

      // Posts are created in REVERSE order (Reference, Onboarding, Λvi)
      // so they display in DESC order as: Λvi first, Onboarding second, Reference third
      expect(posts[0].authorAgent).toBe('system');
      expect(posts[1].authorAgent).toBe('get-to-know-you-agent');
      expect(posts[2].authorAgent).toBe('lambda-vi');
    });

    it('should create posts with isSystemInitialization metadata', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
      `).all();

      posts.forEach(post => {
        const metadata = JSON.parse(post.metadata);
        expect(metadata.isSystemInitialization).toBe(true);
        expect(metadata.welcomePostType).toBeDefined();
      });
    });

    it('should be idempotent - not create duplicates if user already has posts', async () => {
      // First initialization
      const result1 = await service.initializeSystemWithPosts('test-user-posts', 'Test User');
      expect(result1.success).toBe(true);
      expect(result1.postsCreated).toBe(3);

      // Second initialization attempt
      const result2 = await service.initializeSystemWithPosts('test-user-posts', 'Test User');
      expect(result2.alreadyInitialized).toBe(true);
      expect(result2.existingPostsCount).toBe(3);

      // Verify still only 3 posts
      const posts = db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
      `).get();
      expect(posts.count).toBe(3);
    });

    it('should NOT contain "chief of staff" in Λvi post content', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      const aviPost = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
        AND authorAgent = ?
      `).get('lambda-vi');
      expect(aviPost).toBeDefined();

      const content = aviPost.content.toLowerCase();
      expect(content).not.toContain('chief of staff');
      // Also verify "Lambda-vi" text is removed
      expect(content).not.toContain('lambda-vi');
    });

    it('should create user settings and onboarding state', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      // Verify user settings
      const user = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get('test-user-posts');
      expect(user).toBeDefined();
      expect(user.display_name).toBe('Test User');

      // Verify onboarding state
      const onboarding = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get('test-user-posts');
      expect(onboarding).toBeDefined();
      expect(onboarding.phase).toBe(1);
    });

    it('should create initial Hemingway bridge', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      const bridge = db.prepare('SELECT * FROM hemingway_bridges WHERE user_id = ?').get('test-user-posts');
      expect(bridge).toBeDefined();
      expect(bridge.active).toBe(1);
    });

    it('should return post IDs in response', async () => {
      const result = await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      expect(result.postIds).toBeDefined();
      expect(Array.isArray(result.postIds)).toBe(true);
      expect(result.postIds.length).toBe(3);

      // Verify each post ID exists in database
      result.postIds.forEach(postId => {
        const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postId);
        expect(post).toBeDefined();
      });
    });

    it('should have correct post types in metadata', async () => {
      await service.initializeSystemWithPosts('test-user-posts', 'Test User');

      const posts = db.prepare(`
        SELECT * FROM agent_posts
        WHERE metadata LIKE '%"userId":"test-user-posts"%'
        ORDER BY created_at ASC
      `).all();

      const post1Metadata = JSON.parse(posts[0].metadata);
      const post2Metadata = JSON.parse(posts[1].metadata);
      const post3Metadata = JSON.parse(posts[2].metadata);

      // Posts are created in REVERSE order
      expect(post1Metadata.welcomePostType).toBe('reference-guide');
      expect(post2Metadata.welcomePostType).toBe('onboarding-phase1');
      expect(post3Metadata.welcomePostType).toBe('avi-welcome');
    });
  });
});
