/**
 * SPARC Unit Tests: Saved Posts Database Methods
 * Comprehensive testing of real database operations
 * NO MOCKS - Real SQLite database functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SQLiteFallbackDatabase } from '../../../../src/database/sqlite-fallback.js';
import fs from 'fs';
import path from 'path';

describe('SPARC Unit Tests: Saved Posts Database Operations', () => {
  let database: SQLiteFallbackDatabase;
  let testPostId: string;
  let testUserId: string = 'test-user-12345';

  beforeAll(async () => {
    // Initialize real database with test data
    database = new SQLiteFallbackDatabase();
    await database.initialize();

    // Create test post for saved posts testing
    const testPost = {
      id: 'test-post-saved-validation',
      title: 'Test Post for Saved Functionality',
      content: 'This is a test post used for validating saved posts functionality. It includes comprehensive content for real testing scenarios.',
      author_agent: 'TestAgent',
      metadata: JSON.stringify({
        businessImpact: 85,
        isAgentResponse: true,
        testPost: true
      }),
      likes: 0,
      comments: 0,
      tags: JSON.stringify(['test', 'saved', 'validation'])
    };

    // Insert test post directly into database
    const insertPost = database.db.prepare(`
      INSERT INTO agent_posts (id, title, content, author_agent, metadata, likes, comments, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertPost.run(
      testPost.id,
      testPost.title,
      testPost.content,
      testPost.author_agent,
      testPost.metadata,
      testPost.likes,
      testPost.comments,
      testPost.tags
    );

    testPostId = testPost.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (database.db) {
      database.db.prepare('DELETE FROM saved_posts WHERE user_id = ?').run(testUserId);
      database.db.prepare('DELETE FROM agent_posts WHERE id = ?').run(testPostId);
      database.close();
    }
  });

  beforeEach(async () => {
    // Ensure clean state before each test
    database.db.prepare('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?').run(testUserId, testPostId);
  });

  test('SPARC: Save post creates correct database record', async () => {
    // Test real database save operation
    const result = await database.savePost(testPostId, testUserId);

    expect(result).toBeDefined();
    expect(result.id).toBe(`save-${testPostId}-${testUserId}`);
    expect(result.post_id).toBe(testPostId);
    expect(result.user_id).toBe(testUserId);

    // Verify record exists in database
    const savedRecord = database.db.prepare(`
      SELECT * FROM saved_posts WHERE post_id = ? AND user_id = ?
    `).get(testPostId, testUserId);

    expect(savedRecord).toBeDefined();
    expect(savedRecord.post_id).toBe(testPostId);
    expect(savedRecord.user_id).toBe(testUserId);
    expect(savedRecord.created_at).toBeDefined();
  });

  test('SPARC: Save post handles duplicate saves correctly', async () => {
    // Save post first time
    await database.savePost(testPostId, testUserId);

    // Save same post again - should not create duplicate
    const result = await database.savePost(testPostId, testUserId);

    expect(result).toBeDefined();
    expect(result.post_id).toBe(testPostId);
    expect(result.user_id).toBe(testUserId);

    // Verify only one record exists
    const savedRecords = database.db.prepare(`
      SELECT COUNT(*) as count FROM saved_posts WHERE post_id = ? AND user_id = ?
    `).get(testPostId, testUserId);

    expect(savedRecords.count).toBe(1);
  });

  test('SPARC: Unsave post removes database record', async () => {
    // First save the post
    await database.savePost(testPostId, testUserId);

    // Verify it's saved
    let savedRecord = database.db.prepare(`
      SELECT * FROM saved_posts WHERE post_id = ? AND user_id = ?
    `).get(testPostId, testUserId);
    expect(savedRecord).toBeDefined();

    // Unsave the post
    const success = await database.unsavePost(testPostId, testUserId);

    expect(success).toBe(true);

    // Verify record is removed
    savedRecord = database.db.prepare(`
      SELECT * FROM saved_posts WHERE post_id = ? AND user_id = ?
    `).get(testPostId, testUserId);
    expect(savedRecord).toBeUndefined();
  });

  test('SPARC: Unsave non-existent save returns false', async () => {
    // Try to unsave a post that was never saved
    const success = await database.unsavePost(testPostId, testUserId);

    expect(success).toBe(false);

    // Verify no records exist
    const savedRecords = database.db.prepare(`
      SELECT COUNT(*) as count FROM saved_posts WHERE post_id = ? AND user_id = ?
    `).get(testPostId, testUserId);

    expect(savedRecords.count).toBe(0);
  });

  test('SPARC: Get saved posts returns correct format', async () => {
    // Save a post first
    await database.savePost(testPostId, testUserId);

    // Get saved posts
    const result = await database.getSavedPosts(testUserId, 10, 0);

    expect(result).toBeDefined();
    expect(result.posts).toBeDefined();
    expect(Array.isArray(result.posts)).toBe(true);
    expect(result.total).toBeDefined();
    expect(typeof result.total).toBe('number');

    // Verify our test post is in the results
    const savedPost = result.posts.find(post => post.id === testPostId);
    expect(savedPost).toBeDefined();
    expect(savedPost.engagement.isSaved).toBe(true);
    expect(savedPost.title).toBe('Test Post for Saved Functionality');
  });

  test('SPARC: Get saved posts with pagination works correctly', async () => {
    // Create multiple test posts and save them
    const testPosts = [];
    for (let i = 0; i < 5; i++) {
      const postId = `test-post-pagination-${i}`;
      const insertPost = database.db.prepare(`
        INSERT INTO agent_posts (id, title, content, author_agent, metadata, likes, comments, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertPost.run(
        postId,
        `Test Post ${i}`,
        `Content for test post ${i}`,
        'TestAgent',
        JSON.stringify({ testPost: true }),
        0,
        0,
        JSON.stringify(['test'])
      );

      await database.savePost(postId, testUserId);
      testPosts.push(postId);
    }

    try {
      // Test pagination
      const page1 = await database.getSavedPosts(testUserId, 2, 0);
      const page2 = await database.getSavedPosts(testUserId, 2, 2);

      expect(page1.posts.length).toBe(2);
      expect(page2.posts.length).toBeGreaterThan(0);
      expect(page1.total).toBeGreaterThanOrEqual(5);
      
      // Ensure different posts on different pages
      const page1Ids = page1.posts.map(p => p.id);
      const page2Ids = page2.posts.map(p => p.id);
      
      // No overlap between pages
      expect(page1Ids.every(id => !page2Ids.includes(id))).toBe(true);

    } finally {
      // Clean up test posts
      for (const postId of testPosts) {
        database.db.prepare('DELETE FROM saved_posts WHERE post_id = ?').run(postId);
        database.db.prepare('DELETE FROM agent_posts WHERE id = ?').run(postId);
      }
    }
  });

  test('SPARC: isPostSavedByUser helper method accuracy', async () => {
    // Initially not saved
    expect(database.isPostSavedByUser(testPostId, testUserId)).toBe(false);

    // Save the post
    await database.savePost(testPostId, testUserId);

    // Now should return true
    expect(database.isPostSavedByUser(testPostId, testUserId)).toBe(true);

    // Unsave the post
    await database.unsavePost(testPostId, testUserId);

    // Should return false again
    expect(database.isPostSavedByUser(testPostId, testUserId)).toBe(false);
  });

  test('SPARC: formatPostRow includes correct isSaved status', async () => {
    // Create test post record
    const postRow = {
      id: testPostId,
      title: 'Test Post for Saved Functionality',
      content: 'Test content',
      author_agent: 'TestAgent',
      published_at: new Date().toISOString(),
      metadata: '{"businessImpact": 85}',
      tags: '["test"]',
      likes: 0,
      comments: 0,
      shares: 0
    };

    // Format without saving - should show not saved
    let formatted = database.formatPostRow(postRow, testUserId);
    expect(formatted.engagement.isSaved).toBe(false);

    // Save the post
    await database.savePost(testPostId, testUserId);

    // Format after saving - should show saved
    formatted = database.formatPostRow(postRow, testUserId);
    expect(formatted.engagement.isSaved).toBe(true);
  });

  test('SPARC: Save/unsave cycle performance validation', async () => {
    const iterations = 100;
    const startTime = Date.now();

    // Perform multiple save/unsave cycles
    for (let i = 0; i < iterations; i++) {
      await database.savePost(testPostId, `${testUserId}-${i}`);
      await database.unsavePost(testPostId, `${testUserId}-${i}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / (iterations * 2); // 2 operations per iteration

    console.log(`Performance: ${iterations} save/unsave cycles in ${duration}ms (${avgTime.toFixed(2)}ms avg per operation)`);

    // Ensure reasonable performance (less than 10ms per operation)
    expect(avgTime).toBeLessThan(10);

    // Verify no residual data
    const residualCount = database.db.prepare(`
      SELECT COUNT(*) as count FROM saved_posts WHERE user_id LIKE ?
    `).get(`${testUserId}-%`);

    expect(residualCount.count).toBe(0);
  });
});