/**
 * TDD Unit Tests: Engagement Detection Service
 *
 * PURPOSE: Test the service that detects user engagement patterns and calculates
 * engagement scores to determine optimal timing for agent introductions.
 *
 * SCOPE:
 * - Activity pattern detection (posting frequency, comment frequency)
 * - Engagement metrics (post length, interaction depth, response time)
 * - Time-based decay factors
 * - Engagement thresholds and categorization
 * - Historical engagement tracking
 *
 * NO MOCKS: Tests against real database for accurate behavior
 *
 * @module engagement-detection-service.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Database Setup
 */
function createTestDatabase() {
  const testDbPath = path.join(__dirname, '../../../data/test-engagement-detection.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    ) STRICT;

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS agent_introductions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      introduced_at INTEGER DEFAULT (unixepoch()),
      interaction_count INTEGER DEFAULT 0,
      last_interaction_at INTEGER,
      UNIQUE(user_id, agent_id)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS onboarding_state (
      user_id TEXT PRIMARY KEY,
      phase INTEGER DEFAULT 1,
      step TEXT,
      phase1_completed INTEGER DEFAULT 0,
      phase1_completed_at INTEGER,
      phase2_completed INTEGER DEFAULT 0,
      phase2_completed_at INTEGER,
      responses TEXT DEFAULT '{}'
    ) STRICT;

    CREATE TABLE IF NOT EXISTS engagement_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      engagement_score INTEGER NOT NULL,
      activity_count INTEGER NOT NULL,
      calculated_at INTEGER DEFAULT (unixepoch()),
      metadata TEXT DEFAULT '{}'
    ) STRICT;
  `);

  return db;
}

/**
 * EngagementDetectionService Class (TDD - Implementation Required)
 */
class EngagementDetectionService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Calculate current engagement score for user
   * @param {string} userId - User ID
   * @returns {number} Engagement score (0-100)
   */
  calculateEngagementScore(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Detect posting frequency pattern
   * @param {string} userId - User ID
   * @param {number} windowDays - Time window in days
   * @returns {Object} Frequency metrics
   */
  detectPostingFrequency(userId, windowDays = 7) {
    throw new Error('Not implemented');
  }

  /**
   * Detect comment frequency pattern
   * @param {string} userId - User ID
   * @param {number} windowDays - Time window in days
   * @returns {Object} Frequency metrics
   */
  detectCommentFrequency(userId, windowDays = 7) {
    throw new Error('Not implemented');
  }

  /**
   * Calculate time-based engagement decay
   * @param {string} userId - User ID
   * @returns {number} Decay factor (0-1)
   */
  calculateEngagementDecay(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Get engagement category
   * @param {number} score - Engagement score
   * @returns {string} Category (high, medium, low, none)
   */
  getEngagementCategory(score) {
    throw new Error('Not implemented');
  }

  /**
   * Track engagement score in history
   * @param {string} userId - User ID
   * @param {number} score - Engagement score
   * @param {Object} metadata - Additional data
   * @returns {Object} Result
   */
  trackEngagementHistory(userId, score, metadata) {
    throw new Error('Not implemented');
  }

  /**
   * Get engagement trend over time
   * @param {string} userId - User ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Trend data
   */
  getEngagementTrend(userId, days = 30) {
    throw new Error('Not implemented');
  }

  /**
   * Detect engagement patterns (daily, weekly, sporadic)
   * @param {string} userId - User ID
   * @returns {string} Pattern type
   */
  detectEngagementPattern(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Calculate interaction depth score
   * @param {string} userId - User ID
   * @returns {number} Depth score (0-100)
   */
  calculateInteractionDepth(userId) {
    throw new Error('Not implemented');
  }

  /**
   * Get optimal introduction timing
   * @param {string} userId - User ID
   * @returns {Object} Timing recommendation
   */
  getOptimalIntroductionTiming(userId) {
    throw new Error('Not implemented');
  }
}

describe('Engagement Detection Service - Unit Tests', () => {
  let db;
  let service;
  const TEST_USER_ID = 'test-user-engagement';

  beforeEach(() => {
    db = createTestDatabase();
    service = new EngagementDetectionService(db);

    // Create test user
    db.prepare(`
      INSERT INTO user_settings (user_id, display_name)
      VALUES (?, ?)
    `).run(TEST_USER_ID, 'Test User');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  /**
   * Test Suite 1: Basic Engagement Score Calculation (20% coverage)
   */
  describe('Basic Engagement Score Calculation', () => {
    it('should return 0 for user with no activity', () => {
      const score = service.calculateEngagementScore(TEST_USER_ID);
      expect(score).toBe(0);
    });

    it('should calculate score based on post count', () => {
      // Create posts
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content)
          VALUES (?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, `Post ${i}`, 'Content here');
      }

      const score = service.calculateEngagementScore(TEST_USER_ID);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate score based on comment count', () => {
      // Create a post by another user
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-1', 'other-user', 'Post', 'Content');

      // Create comments
      for (let i = 0; i < 3; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author_id, content)
          VALUES (?, ?, ?, ?)
        `).run(`comment-${i}`, 'post-1', TEST_USER_ID, 'Great post!');
      }

      const score = service.calculateEngagementScore(TEST_USER_ID);
      expect(score).toBeGreaterThan(0);
    });

    it('should weight posts higher than comments', () => {
      // User A: 5 posts
      const userA = 'user-a';
      db.prepare(`INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)`).run(userA, 'User A');
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content)
          VALUES (?, ?, ?, ?)
        `).run(`post-a-${i}`, userA, 'Post', 'Content');
      }

      // User B: 10 comments
      const userB = 'user-b';
      db.prepare(`INSERT INTO user_settings (user_id, display_name) VALUES (?, ?)`).run(userB, 'User B');
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-other', 'other-user', 'Post', 'Content');
      for (let i = 0; i < 10; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author_id, content)
          VALUES (?, ?, ?, ?)
        `).run(`comment-b-${i}`, 'post-other', userB, 'Comment');
      }

      const scoreA = service.calculateEngagementScore(userA);
      const scoreB = service.calculateEngagementScore(userB);

      // Posts should be weighted higher
      expect(scoreA).toBeGreaterThan(scoreB);
    });

    it('should cap score at 100', () => {
      // Create excessive activity
      for (let i = 0; i < 100; i++) {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content)
          VALUES (?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Post', 'Content');
      }

      const score = service.calculateEngagementScore(TEST_USER_ID);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  /**
   * Test Suite 2: Activity Pattern Detection (20% coverage)
   */
  describe('Activity Pattern Detection', () => {
    it('should detect posting frequency in time window', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create posts over 7 days
      for (let i = 0; i < 7; i++) {
        const postTime = now - (i * 86400); // 1 day intervals
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Daily Post', 'Content', postTime);
      }

      const frequency = service.detectPostingFrequency(TEST_USER_ID, 7);

      expect(frequency.totalPosts).toBe(7);
      expect(frequency.postsPerDay).toBeCloseTo(1, 1);
      expect(frequency.pattern).toBe('daily');
    });

    it('should detect comment frequency in time window', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create a post
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-1', 'other-user', 'Post', 'Content');

      // Create comments over time
      for (let i = 0; i < 14; i++) {
        const commentTime = now - (i * 43200); // 12-hour intervals
        db.prepare(`
          INSERT INTO comments (id, post_id, author_id, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`comment-${i}`, 'post-1', TEST_USER_ID, 'Comment', commentTime);
      }

      const frequency = service.detectCommentFrequency(TEST_USER_ID, 7);

      expect(frequency.totalComments).toBe(14);
      expect(frequency.commentsPerDay).toBeCloseTo(2, 0);
    });

    it('should detect sporadic activity pattern', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create irregular posts (gaps between activity)
      const timestamps = [
        now - (1 * 86400),   // 1 day ago
        now - (5 * 86400),   // 5 days ago
        now - (15 * 86400),  // 15 days ago
        now - (20 * 86400)   // 20 days ago
      ];

      timestamps.forEach((ts, i) => {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Post', 'Content', ts);
      });

      const pattern = service.detectEngagementPattern(TEST_USER_ID);
      expect(pattern).toBe('sporadic');
    });

    it('should detect consistent daily pattern', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create posts every day for 10 days
      for (let i = 0; i < 10; i++) {
        const postTime = now - (i * 86400);
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Post', 'Content', postTime);
      }

      const pattern = service.detectEngagementPattern(TEST_USER_ID);
      expect(pattern).toBe('daily');
    });

    it('should detect weekly pattern', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create posts every 7 days
      for (let i = 0; i < 4; i++) {
        const postTime = now - (i * 604800); // 7 days in seconds
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Weekly Post', 'Content', postTime);
      }

      const pattern = service.detectEngagementPattern(TEST_USER_ID);
      expect(pattern).toBe('weekly');
    });
  });

  /**
   * Test Suite 3: Engagement Decay Calculation (15% coverage)
   */
  describe('Engagement Decay Calculation', () => {
    it('should have no decay for recent activity', () => {
      const now = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO posts (id, author_id, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Recent', 'Content', now - 3600); // 1 hour ago

      const decay = service.calculateEngagementDecay(TEST_USER_ID);
      expect(decay).toBeCloseTo(1, 1); // No significant decay
    });

    it('should have moderate decay for activity 1 week ago', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneWeekAgo = now - (7 * 86400);

      db.prepare(`
        INSERT INTO posts (id, author_id, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Week Old', 'Content', oneWeekAgo);

      const decay = service.calculateEngagementDecay(TEST_USER_ID);
      expect(decay).toBeLessThan(1);
      expect(decay).toBeGreaterThan(0.5);
    });

    it('should have significant decay for activity 1 month ago', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneMonthAgo = now - (30 * 86400);

      db.prepare(`
        INSERT INTO posts (id, author_id, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Month Old', 'Content', oneMonthAgo);

      const decay = service.calculateEngagementDecay(TEST_USER_ID);
      expect(decay).toBeLessThan(0.5);
    });

    it('should return 0 decay for no activity', () => {
      const decay = service.calculateEngagementDecay(TEST_USER_ID);
      expect(decay).toBe(0);
    });

    it('should prioritize most recent activity for decay calculation', () => {
      const now = Math.floor(Date.now() / 1000);

      // Old post
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Old', 'Content', now - (30 * 86400));

      // Recent post
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('post-2', TEST_USER_ID, 'Recent', 'Content', now - 3600);

      const decay = service.calculateEngagementDecay(TEST_USER_ID);
      expect(decay).toBeCloseTo(1, 1); // Should use recent activity
    });
  });

  /**
   * Test Suite 4: Engagement Categories (10% coverage)
   */
  describe('Engagement Categories', () => {
    it('should categorize score 0-20 as "none"', () => {
      expect(service.getEngagementCategory(0)).toBe('none');
      expect(service.getEngagementCategory(10)).toBe('none');
      expect(service.getEngagementCategory(20)).toBe('none');
    });

    it('should categorize score 21-40 as "low"', () => {
      expect(service.getEngagementCategory(21)).toBe('low');
      expect(service.getEngagementCategory(30)).toBe('low');
      expect(service.getEngagementCategory(40)).toBe('low');
    });

    it('should categorize score 41-70 as "medium"', () => {
      expect(service.getEngagementCategory(41)).toBe('medium');
      expect(service.getEngagementCategory(55)).toBe('medium');
      expect(service.getEngagementCategory(70)).toBe('medium');
    });

    it('should categorize score 71-100 as "high"', () => {
      expect(service.getEngagementCategory(71)).toBe('high');
      expect(service.getEngagementCategory(85)).toBe('high');
      expect(service.getEngagementCategory(100)).toBe('high');
    });

    it('should handle edge cases', () => {
      expect(service.getEngagementCategory(-1)).toBe('none');
      expect(service.getEngagementCategory(101)).toBe('high');
    });
  });

  /**
   * Test Suite 5: Engagement History Tracking (15% coverage)
   */
  describe('Engagement History Tracking', () => {
    it('should track engagement score in history', () => {
      const result = service.trackEngagementHistory(TEST_USER_ID, 75, {
        posts: 5,
        comments: 3
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(true);
    });

    it('should retrieve engagement trend over time', () => {
      // Track multiple scores over time
      const scores = [20, 35, 50, 65, 80];
      scores.forEach((score, i) => {
        service.trackEngagementHistory(TEST_USER_ID, score, {
          day: i + 1
        });
      });

      const trend = service.getEngagementTrend(TEST_USER_ID, 30);

      expect(trend.direction).toBe('increasing');
      expect(trend.dataPoints).toHaveLength(5);
      expect(trend.averageScore).toBeCloseTo(50, 0);
    });

    it('should detect decreasing engagement trend', () => {
      const scores = [80, 65, 50, 35, 20];
      scores.forEach((score, i) => {
        service.trackEngagementHistory(TEST_USER_ID, score, {
          day: i + 1
        });
      });

      const trend = service.getEngagementTrend(TEST_USER_ID, 30);

      expect(trend.direction).toBe('decreasing');
    });

    it('should detect stable engagement trend', () => {
      const scores = [50, 52, 48, 51, 49];
      scores.forEach((score, i) => {
        service.trackEngagementHistory(TEST_USER_ID, score, {
          day: i + 1
        });
      });

      const trend = service.getEngagementTrend(TEST_USER_ID, 30);

      expect(trend.direction).toBe('stable');
    });

    it('should limit trend analysis to specified time window', () => {
      // Create history entries
      for (let i = 0; i < 60; i++) {
        service.trackEngagementHistory(TEST_USER_ID, 50 + i, {
          day: i + 1
        });
      }

      const trend30 = service.getEngagementTrend(TEST_USER_ID, 30);
      expect(trend30.dataPoints.length).toBeLessThanOrEqual(30);
    });
  });

  /**
   * Test Suite 6: Interaction Depth Scoring (10% coverage)
   */
  describe('Interaction Depth Scoring', () => {
    it('should score based on content length', () => {
      // Create posts with varying lengths
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Short', 'Hi');

      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-2', TEST_USER_ID, 'Long', 'A'.repeat(500));

      const depth = service.calculateInteractionDepth(TEST_USER_ID);
      expect(depth).toBeGreaterThan(0);
    });

    it('should score based on agent interactions', () => {
      // Add agent introductions with interactions
      db.prepare(`
        INSERT INTO agent_introductions (id, user_id, agent_id, interaction_count)
        VALUES (?, ?, ?, ?)
      `).run('intro-1', TEST_USER_ID, 'agent-1', 5);

      db.prepare(`
        INSERT INTO agent_introductions (id, user_id, agent_id, interaction_count)
        VALUES (?, ?, ?, ?)
      `).run('intro-2', TEST_USER_ID, 'agent-2', 3);

      const depth = service.calculateInteractionDepth(TEST_USER_ID);
      expect(depth).toBeGreaterThan(20);
    });

    it('should score based on comment threads', () => {
      // Create post
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-1', 'other-user', 'Post', 'Content');

      // Create multiple comments (thread depth)
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO comments (id, post_id, author_id, content)
          VALUES (?, ?, ?, ?)
        `).run(`comment-${i}`, 'post-1', TEST_USER_ID, 'Deep conversation');
      }

      const depth = service.calculateInteractionDepth(TEST_USER_ID);
      expect(depth).toBeGreaterThan(10);
    });

    it('should return 0 for user with no interactions', () => {
      const depth = service.calculateInteractionDepth(TEST_USER_ID);
      expect(depth).toBe(0);
    });
  });

  /**
   * Test Suite 7: Optimal Introduction Timing (10% coverage)
   */
  describe('Optimal Introduction Timing', () => {
    it('should recommend immediate introduction for high engagement', () => {
      // Create high engagement activity
      for (let i = 0; i < 10; i++) {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content)
          VALUES (?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Post', 'Content here');
      }

      const timing = service.getOptimalIntroductionTiming(TEST_USER_ID);

      expect(timing.when).toBe('immediate');
      expect(timing.ready).toBe(true);
    });

    it('should recommend delay for low engagement', () => {
      // Create minimal activity
      db.prepare(`
        INSERT INTO posts (id, author_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run('post-1', TEST_USER_ID, 'Post', 'Hi');

      const timing = service.getOptimalIntroductionTiming(TEST_USER_ID);

      expect(timing.when).toBe('delay');
      expect(timing.ready).toBe(false);
    });

    it('should recommend after engagement spike', () => {
      const now = Math.floor(Date.now() / 1000);

      // Create spike in recent activity
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO posts (id, author_id, title, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`post-${i}`, TEST_USER_ID, 'Post', 'Content', now - (i * 3600));
      }

      const timing = service.getOptimalIntroductionTiming(TEST_USER_ID);

      expect(timing.reason).toContain('spike');
    });

    it('should consider time of day patterns', () => {
      const now = Math.floor(Date.now() / 1000);
      const hourOfDay = new Date().getHours();

      const timing = service.getOptimalIntroductionTiming(TEST_USER_ID);

      expect(timing).toHaveProperty('bestTimeOfDay');
      expect(timing.bestTimeOfDay).toBeGreaterThanOrEqual(0);
      expect(timing.bestTimeOfDay).toBeLessThan(24);
    });
  });
});

/**
 * Test Coverage Summary
 *
 * Total Coverage: 100% of engagement detection service logic
 *
 * Distribution:
 * - Basic Engagement Score: 20%
 * - Activity Pattern Detection: 20%
 * - Engagement Decay: 15%
 * - Engagement Categories: 10%
 * - History Tracking: 15%
 * - Interaction Depth: 10%
 * - Optimal Timing: 10%
 *
 * Implementation Required:
 * - EngagementDetectionService class in api-server/services/engagement/
 * - engagement_history table
 * - Scoring algorithms with weights
 * - Pattern detection algorithms
 * - Time-based decay functions
 */
