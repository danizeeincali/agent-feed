/**
 * TDD London School Tests for Post Priority Sorting
 *
 * Testing sorting algorithm where:
 * 1. Posts with MORE comments appear first (Primary)
 * 2. If comment counts tie → agent posts beat user posts (Secondary)
 * 3. If still tied → sort by created_at DESC (Tertiary)
 * 4. If still tied → sort by id ASC (Quaternary)
 *
 * Database Schema:
 * - agent_posts.engagement: JSON with {"comments": N, "shares": N, ...}
 * - Agent detection: authorAgent NOT LIKE 'user%'
 * - Database: /workspaces/agent-feed/database.db
 *
 * Following London School TDD approach:
 * - Use real database (no mocks for data layer)
 * - Verify behavior through integration tests
 * - Focus on sorting algorithm correctness
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');

let db;
let testPostIds = [];

// Helper function to create test posts with specific engagement
const createTestPost = (authorAgent, comments, createdAt = new Date()) => {
  const postId = crypto.randomUUID();
  const engagement = JSON.stringify({
    views: 0,
    bookmarks: 0,
    shares: 0,
    comments: comments
  });

  const stmt = db.prepare(`
    INSERT INTO agent_posts (
      id, title, content, authorAgent, publishedAt,
      metadata, engagement, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    postId,
    'Test Post',
    'Test content',
    authorAgent,
    createdAt.toISOString(),
    JSON.stringify({}),
    engagement,
    createdAt.toISOString()
  );

  testPostIds.push(postId);
  return postId;
};

// Helper function to get posts with sorting logic (only test posts)
const getPostsWithPrioritySorting = (limit = 100, offset = 0) => {
  if (testPostIds.length === 0) {
    return [];
  }

  const placeholders = testPostIds.map(() => '?').join(',');
  const query = `
    SELECT
      id,
      authorAgent,
      engagement,
      created_at,
      COALESCE(json_extract(engagement, '$.comments'), 0) as comment_count,
      CASE
        WHEN authorAgent NOT LIKE 'user%' THEN 1
        ELSE 0
      END as is_agent_post
    FROM agent_posts
    WHERE id IN (${placeholders})
    ORDER BY
      comment_count DESC,
      is_agent_post DESC,
      created_at DESC,
      id ASC
    LIMIT ? OFFSET ?
  `;

  return db.prepare(query).all(...testPostIds, limit, offset);
};

// Cleanup helper
const cleanupTestPosts = () => {
  if (testPostIds.length > 0) {
    const placeholders = testPostIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM agent_posts WHERE id IN (${placeholders})`).run(...testPostIds);
    testPostIds = [];
  }
};

describe('Post Priority Sorting - London School TDD', () => {

  beforeAll(() => {
    // Connect to real database
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('✅ Connected to database for sorting tests:', DB_PATH);
  });

  afterAll(() => {
    // Final cleanup
    cleanupTestPosts();
    db.close();
    console.log('✅ Database connection closed');
  });

  beforeEach(() => {
    // Clean up before each test
    cleanupTestPosts();
  });

  describe('1. Comment Count Priority Tests (Primary Sort)', () => {

    it('should place post with 5 comments before post with 3 comments', () => {
      // Arrange
      const post3Comments = createTestPost('DataAnalysis-Agent', 3);
      const post5Comments = createTestPost('CodeReview-Agent', 5);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].id).toBe(post5Comments);
      expect(results[1].id).toBe(post3Comments);
      expect(results[0].comment_count).toBe(5);
      expect(results[1].comment_count).toBe(3);
    });

    it('should place post with 10 comments before post with 0 comments', () => {
      // Arrange
      const post0Comments = createTestPost('Security-Agent', 0);
      const post10Comments = createTestPost('Performance-Agent', 10);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].id).toBe(post10Comments);
      expect(results[1].id).toBe(post0Comments);
      expect(results[0].comment_count).toBe(10);
      expect(results[1].comment_count).toBe(0);
    });

    it('should place newly created post (0 comments) last', () => {
      // Arrange
      const post8Comments = createTestPost('Analytics-Agent', 8);
      const post3Comments = createTestPost('Content-Agent', 3);
      const post0Comments = createTestPost('New-Agent', 0);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].id).toBe(post8Comments);
      expect(results[1].id).toBe(post3Comments);
      expect(results[2].id).toBe(post0Comments);
      expect(results[2].comment_count).toBe(0);
    });

    it('should correctly order multiple posts with varied comment counts', () => {
      // Arrange
      const post2Comments = createTestPost('Agent-A', 2);
      const post15Comments = createTestPost('Agent-B', 15);
      const post7Comments = createTestPost('Agent-C', 7);
      const post10Comments = createTestPost('Agent-D', 10);
      const post5Comments = createTestPost('Agent-E', 5);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Should be ordered: 15, 10, 7, 5, 2
      expect(results[0].comment_count).toBe(15);
      expect(results[1].comment_count).toBe(10);
      expect(results[2].comment_count).toBe(7);
      expect(results[3].comment_count).toBe(5);
      expect(results[4].comment_count).toBe(2);
    });
  });

  describe('2. Agent Priority Tests (Secondary Sort)', () => {

    it('should place agent post before user post when comment counts are equal', () => {
      // Arrange - Both have 5 comments
      const userPost = createTestPost('user-agent', 5);
      const agentPost = createTestPost('DataAnalysis-Agent', 5);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Agent post should appear first
      expect(results[0].id).toBe(agentPost);
      expect(results[1].id).toBe(userPost);
      expect(results[0].is_agent_post).toBe(1);
      expect(results[1].is_agent_post).toBe(0);
    });

    it('should correctly detect DataAnalysis-Agent as agent post', () => {
      // Arrange
      const agentPost = createTestPost('DataAnalysis-Agent', 3);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].authorAgent).toBe('DataAnalysis-Agent');
      expect(results[0].is_agent_post).toBe(1);
    });

    it('should correctly detect CodeReview-Agent as agent post', () => {
      // Arrange
      const agentPost = createTestPost('CodeReview-Agent', 5);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].authorAgent).toBe('CodeReview-Agent');
      expect(results[0].is_agent_post).toBe(1);
    });

    it('should correctly detect user-agent as user post', () => {
      // Arrange
      const userPost = createTestPost('user-agent', 5);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].authorAgent).toBe('user-agent');
      expect(results[0].is_agent_post).toBe(0);
    });

    it('should correctly detect user-123 as user post', () => {
      // Arrange
      const userPost = createTestPost('user-123', 3);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results[0].authorAgent).toBe('user-123');
      expect(results[0].is_agent_post).toBe(0);
    });

    it('should handle multiple agent and user posts with same comment count', () => {
      // Arrange - All have 5 comments
      const userPost1 = createTestPost('user-agent', 5, new Date('2025-10-02T10:00:00Z'));
      const agentPost1 = createTestPost('Security-Agent', 5, new Date('2025-10-02T11:00:00Z'));
      const userPost2 = createTestPost('user-123', 5, new Date('2025-10-02T09:00:00Z'));
      const agentPost2 = createTestPost('Analytics-Agent', 5, new Date('2025-10-02T12:00:00Z'));

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - All agents first, then all users
      expect(results[0].is_agent_post).toBe(1);
      expect(results[1].is_agent_post).toBe(1);
      expect(results[2].is_agent_post).toBe(0);
      expect(results[3].is_agent_post).toBe(0);

      // Within agents, newer first
      expect(results[0].id).toBe(agentPost2); // 12:00 (newest agent)
      expect(results[1].id).toBe(agentPost1); // 11:00

      // Within users, newer first
      expect(results[2].id).toBe(userPost1); // 10:00 (newest user)
      expect(results[3].id).toBe(userPost2); // 09:00
    });
  });

  describe('3. Timestamp Tiebreaker Tests (Tertiary Sort)', () => {

    it('should place newer agent post before older agent post with same comments', () => {
      // Arrange - Both agent posts with 5 comments
      const olderPost = createTestPost('Agent-A', 5, new Date('2025-10-01T10:00:00Z'));
      const newerPost = createTestPost('Agent-B', 5, new Date('2025-10-02T10:00:00Z'));

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Newer post first
      expect(results[0].id).toBe(newerPost);
      expect(results[1].id).toBe(olderPost);
      expect(new Date(results[0].created_at).getTime()).toBeGreaterThan(
        new Date(results[1].created_at).getTime()
      );
    });

    it('should place newer user post before older user post with same comments', () => {
      // Arrange - Both user posts with 3 comments
      const olderPost = createTestPost('user-old', 3, new Date('2025-10-01T10:00:00Z'));
      const newerPost = createTestPost('user-new', 3, new Date('2025-10-02T10:00:00Z'));

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Newer post first
      expect(results[0].id).toBe(newerPost);
      expect(results[1].id).toBe(olderPost);
    });

    it('should correctly order posts by timestamp when comments and type are equal', () => {
      // Arrange - All agent posts with 5 comments, different timestamps
      const post1 = createTestPost('Agent-A', 5, new Date('2025-10-01T08:00:00Z'));
      const post2 = createTestPost('Agent-B', 5, new Date('2025-10-01T12:00:00Z'));
      const post3 = createTestPost('Agent-C', 5, new Date('2025-10-01T16:00:00Z'));
      const post4 = createTestPost('Agent-D', 5, new Date('2025-10-01T20:00:00Z'));

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Ordered by timestamp DESC (newest first)
      expect(results[0].id).toBe(post4); // 20:00
      expect(results[1].id).toBe(post3); // 16:00
      expect(results[2].id).toBe(post2); // 12:00
      expect(results[3].id).toBe(post1); // 08:00
    });
  });

  describe('4. ID Tiebreaker Tests (Quaternary Sort)', () => {

    it('should sort by ID ascending when comments, type, and timestamp are identical', () => {
      // Arrange - Same comments, same type, same timestamp
      const timestamp = new Date('2025-10-02T12:00:00Z');

      // Create posts with specific IDs (UUID format but sortable)
      const id1 = '00000000-0000-0000-0000-000000000001';
      const id2 = '00000000-0000-0000-0000-000000000002';
      const id3 = '00000000-0000-0000-0000-000000000003';

      // Insert manually with specific IDs
      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(id3, 'Test', 'Content', 'Agent-A', timestamp.toISOString(),
        '{}', '{"comments": 5}', timestamp.toISOString());
      insertStmt.run(id1, 'Test', 'Content', 'Agent-B', timestamp.toISOString(),
        '{}', '{"comments": 5}', timestamp.toISOString());
      insertStmt.run(id2, 'Test', 'Content', 'Agent-C', timestamp.toISOString(),
        '{}', '{"comments": 5}', timestamp.toISOString());

      testPostIds.push(id1, id2, id3);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Sorted by ID ascending
      expect(results[0].id).toBe(id1);
      expect(results[1].id).toBe(id2);
      expect(results[2].id).toBe(id3);
    });
  });

  describe('5. Edge Cases', () => {

    it('should handle posts with NULL/missing engagement field as 0 comments', () => {
      // Arrange
      const postWithComments = createTestPost('Agent-A', 3);

      // Create post with empty engagement (SQLite doesn't allow NULL for NOT NULL fields)
      const emptyEngagementId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        emptyEngagementId,
        'Test',
        'Content',
        'Agent-B',
        new Date().toISOString(),
        '{}',
        '{}', // Empty JSON object
        new Date().toISOString()
      );
      testPostIds.push(emptyEngagementId);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Post with 3 comments should be first
      expect(results[0].id).toBe(postWithComments);
      expect(results[0].comment_count).toBe(3);
      expect(results[1].comment_count).toBe(0); // COALESCE returns 0 for missing field
    });

    it('should handle posts with malformed JSON gracefully using COALESCE', () => {
      // Arrange
      const validPost = createTestPost('Agent-A', 5);

      // Note: SQLite json_extract will return NULL for invalid JSON
      // Our COALESCE will convert this to 0
      // SQLite is strict about JSON validation, so we use valid JSON with missing field instead
      const invalidJsonId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invalidJsonId,
        'Test',
        'Content',
        'Agent-B',
        new Date().toISOString(),
        '{}',
        '{"views": 10}', // Valid JSON but missing comments field
        new Date().toISOString()
      );
      testPostIds.push(invalidJsonId);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Valid post should be first
      expect(results[0].id).toBe(validPost);
      expect(results[0].comment_count).toBe(5);
      expect(results[1].comment_count).toBe(0); // COALESCE handles missing field
    });

    it('should handle empty database gracefully', () => {
      // Act - No posts created
      const results = getPostsWithPrioritySorting();

      // Assert
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });

    it('should handle posts with missing comments field in engagement JSON', () => {
      // Arrange
      const validPost = createTestPost('Agent-A', 5);

      // Create post with engagement but no comments field
      const noCommentsId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        noCommentsId,
        'Test',
        'Content',
        'Agent-B',
        new Date().toISOString(),
        '{}',
        JSON.stringify({ views: 10, shares: 5 }), // No comments field
        new Date().toISOString()
      );
      testPostIds.push(noCommentsId);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Post with 5 comments should be first
      expect(results[0].id).toBe(validPost);
      expect(results[0].comment_count).toBe(5);
      expect(results[1].comment_count).toBe(0); // COALESCE converts NULL to 0
    });
  });

  describe('6. Pagination Tests', () => {

    it('should preserve correct ordering with pagination', () => {
      // Arrange - Create 10 posts with descending comment counts
      const postIds = [];
      for (let i = 10; i >= 1; i--) {
        postIds.push(createTestPost(`Agent-${i}`, i));
      }

      // Act - Get first 5 posts
      const page1 = getPostsWithPrioritySorting(5, 0);

      // Assert - First page should have posts with 10, 9, 8, 7, 6 comments
      expect(page1).toHaveLength(5);
      expect(page1[0].comment_count).toBe(10);
      expect(page1[1].comment_count).toBe(9);
      expect(page1[2].comment_count).toBe(8);
      expect(page1[3].comment_count).toBe(7);
      expect(page1[4].comment_count).toBe(6);
    });

    it('should correctly handle second page of results', () => {
      // Arrange - Create 10 posts
      const postIds = [];
      for (let i = 10; i >= 1; i--) {
        postIds.push(createTestPost(`Agent-${i}`, i));
      }

      // Act - Get second page (offset 5, limit 5)
      const page2 = getPostsWithPrioritySorting(5, 5);

      // Assert - Second page should have posts with 5, 4, 3, 2, 1 comments
      expect(page2).toHaveLength(5);
      expect(page2[0].comment_count).toBe(5);
      expect(page2[1].comment_count).toBe(4);
      expect(page2[2].comment_count).toBe(3);
      expect(page2[3].comment_count).toBe(2);
      expect(page2[4].comment_count).toBe(1);
    });

    it('should handle partial last page correctly', () => {
      // Arrange - Create 7 posts
      for (let i = 7; i >= 1; i--) {
        createTestPost(`Agent-${i}`, i);
      }

      // Act - Get second page with limit 5 (only 2 posts left)
      const page2 = getPostsWithPrioritySorting(5, 5);

      // Assert
      expect(page2).toHaveLength(2);
      expect(page2[0].comment_count).toBe(2);
      expect(page2[1].comment_count).toBe(1);
    });
  });

  describe('7. Integration Tests - Complex Scenarios', () => {

    it('should correctly order full feed with mixed agent/user posts and various comment counts', () => {
      // Arrange - Create complex scenario
      const agentHighComments = createTestPost('Analytics-Agent', 10);
      const userHighComments = createTestPost('user-popular', 10);
      const agentMidComments = createTestPost('Security-Agent', 5);
      const userMidComments = createTestPost('user-123', 5);
      const agentLowComments = createTestPost('Code-Agent', 2);
      const userLowComments = createTestPost('user-new', 2);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Correct priority order
      expect(results[0].id).toBe(agentHighComments); // 10 comments, agent
      expect(results[1].id).toBe(userHighComments);  // 10 comments, user
      expect(results[2].id).toBe(agentMidComments);  // 5 comments, agent
      expect(results[3].id).toBe(userMidComments);   // 5 comments, user
      expect(results[4].id).toBe(agentLowComments);  // 2 comments, agent
      expect(results[5].id).toBe(userLowComments);   // 2 comments, user
    });

    it('should verify top 10 posts are correctly ordered in complex feed', () => {
      // Arrange - Create 20 posts with various characteristics
      const posts = [
        { agent: 'Agent-A', comments: 15 },
        { agent: 'user-1', comments: 15 },
        { agent: 'Agent-B', comments: 12 },
        { agent: 'user-2', comments: 12 },
        { agent: 'Agent-C', comments: 8 },
        { agent: 'Agent-D', comments: 8 },
        { agent: 'user-3', comments: 8 },
        { agent: 'Agent-E', comments: 5 },
        { agent: 'user-4', comments: 5 },
        { agent: 'Agent-F', comments: 3 },
        { agent: 'user-5', comments: 3 },
        { agent: 'Agent-G', comments: 1 },
        { agent: 'user-6', comments: 1 },
        { agent: 'Agent-H', comments: 0 },
        { agent: 'user-7', comments: 0 }
      ];

      posts.forEach(p => createTestPost(p.agent, p.comments));

      // Act - Get top 10
      const top10 = getPostsWithPrioritySorting(10, 0);

      // Assert - Verify ordering
      expect(top10).toHaveLength(10);
      expect(top10[0].comment_count).toBe(15); // Agent-A
      expect(top10[0].is_agent_post).toBe(1);
      expect(top10[1].comment_count).toBe(15); // user-1
      expect(top10[1].is_agent_post).toBe(0);
      expect(top10[2].comment_count).toBe(12); // Agent-B
      expect(top10[3].comment_count).toBe(12); // user-2
      expect(top10[4].comment_count).toBe(8);  // Agent-C
      expect(top10[5].comment_count).toBe(8);  // Agent-D
      expect(top10[6].comment_count).toBe(8);  // user-3
      expect(top10[7].comment_count).toBe(5);  // Agent-E
      expect(top10[8].comment_count).toBe(5);  // user-4
      expect(top10[9].comment_count).toBe(3);  // Agent-F
    });

    it('should handle all four sorting levels in single query', () => {
      // Arrange - Create scenario requiring all tiebreakers
      const timestamp = new Date('2025-10-02T12:00:00Z');

      // Same comments, same type, same timestamp - only ID differs
      const id1 = '10000000-0000-0000-0000-000000000001';
      const id2 = '20000000-0000-0000-0000-000000000002';

      const insertStmt = db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, authorAgent, publishedAt,
          metadata, engagement, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(id2, 'Test', 'Content', 'Agent-A', timestamp.toISOString(),
        '{}', '{"comments": 5}', timestamp.toISOString());
      insertStmt.run(id1, 'Test', 'Content', 'Agent-B', timestamp.toISOString(),
        '{}', '{"comments": 5}', timestamp.toISOString());

      testPostIds.push(id1, id2);

      // Different timestamp
      const newer = createTestPost('Agent-C', 5, new Date('2025-10-02T13:00:00Z'));

      // Different type
      const userPost = createTestPost('user-agent', 5, timestamp);

      // Different comments
      const moreComments = createTestPost('Agent-D', 8, timestamp);

      // Act
      const results = getPostsWithPrioritySorting();

      // Assert - Verify all sorting levels
      expect(results[0].id).toBe(moreComments);  // Level 1: Most comments (8)
      expect(results[1].id).toBe(newer);         // Level 3: Newer timestamp (13:00)
      expect(results[2].id).toBe(id1);           // Level 4: Lower ID (1...)
      expect(results[3].id).toBe(id2);           // Level 4: Higher ID (2...)
      expect(results[4].id).toBe(userPost);      // Level 2: User post (same comments)
    });
  });
});
