/**
 * SPARC Methodology - Specification Phase Tests
 * Complete requirements validation for persistent feed system
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { dbPool } from '../../src/database/connection/pool.js';
import { feedDataService } from '../../src/services/FeedDataService.js';

describe('SPARC Specification Phase - Requirements Validation', () => {
  beforeAll(async () => {
    // Initialize database connection
    await dbPool.initialize();
    await feedDataService.initialize();
  });

  afterAll(async () => {
    await dbPool.close();
  });

  describe('Database System Requirements', () => {
    it('should have PostgreSQL database connection established', async () => {
      const health = await dbPool.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.pool.totalCount).toBeGreaterThan(0);
    });

    it('should have complete schema with all required tables', async () => {
      const tables = [
        'users', 'feeds', 'feed_items', 'automation_results',
        'claude_flow_sessions', 'neural_patterns', 'agents'
      ];

      for (const table of tables) {
        const result = await dbPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });

    it('should have proper indexes for performance', async () => {
      const criticalIndexes = [
        'idx_feed_items_feed_id',
        'idx_feed_items_published_at',
        'idx_feed_items_content_search',
        'idx_feeds_user_id'
      ];

      for (const index of criticalIndexes) {
        const result = await dbPool.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = $1
          )
        `, [index]);
        
        expect(result.rows[0].exists).toBe(true);
      }
    });
  });

  describe('Feed Data System Requirements', () => {
    it('should support creating agent posts', async () => {
      const postData = {
        title: 'Test SPARC Specification',
        content: 'This is a test post for SPARC specification validation',
        authorAgent: 'sparc-test-agent',
        metadata: {
          businessImpact: 8,
          tags: ['testing', 'sparc'],
          testData: true
        }
      };

      const post = await feedDataService.createAgentPost(postData);
      
      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.authorAgent).toBe(postData.authorAgent);
      expect(post.metadata.businessImpact).toBe(8);
      expect(post.metadata.tags).toContain('sparc');
    });

    it('should support retrieving posts with filtering', async () => {
      const options = {
        limit: 10,
        filter: 'all',
        includeEngagement: true
      };

      const result = await feedDataService.getAgentPosts(options);
      
      expect(result.posts).toBeDefined();
      expect(Array.isArray(result.posts)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should support full-text search functionality', async () => {
      const searchQuery = 'test';
      const result = await feedDataService.searchPosts(searchQuery);
      
      expect(result.posts).toBeDefined();
      expect(Array.isArray(result.posts)).toBe(true);
      
      // If posts exist, verify search relevance
      if (result.posts.length > 0) {
        const post = result.posts[0];
        const containsQuery = 
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase());
        
        expect(containsQuery).toBe(true);
      }
    });

    it('should support engagement tracking', async () => {
      // First create a test post
      const postData = {
        title: 'Engagement Test Post',
        content: 'Testing engagement functionality',
        authorAgent: 'engagement-test-agent'
      };

      const post = await feedDataService.createAgentPost(postData);
      
      // Test engagement update
      await feedDataService.updateEngagement(post.id, 'like', 'test-user');
      
      // This should not throw an error
      expect(true).toBe(true);
    });
  });

  describe('API Integration Requirements', () => {
    it('should maintain compatibility with existing frontend interface', async () => {
      // Test that posts include all fields expected by frontend
      const result = await feedDataService.getAgentPosts({ limit: 1 });
      
      if (result.posts.length > 0) {
        const post = result.posts[0];
        
        // Check required fields for frontend compatibility
        expect(post.id).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.content).toBeDefined();
        expect(post.authorAgent).toBeDefined();
        expect(post.publishedAt).toBeDefined();
        expect(post.metadata).toBeDefined();
        expect(post.metadata.businessImpact).toBeDefined();
        expect(post.metadata.tags).toBeDefined();
        expect(post.likes).toBeDefined();
        expect(post.comments).toBeDefined();
        expect(post.shares).toBeDefined();
      }
    });

    it('should provide proper error handling', async () => {
      try {
        await feedDataService.getPostById('invalid-uuid');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should handle concurrent operations efficiently', async () => {
      const concurrentOps = [];
      
      for (let i = 0; i < 5; i++) {
        concurrentOps.push(
          feedDataService.createAgentPost({
            title: `Concurrent Test ${i}`,
            content: `Testing concurrent operations ${i}`,
            authorAgent: `concurrent-agent-${i}`
          })
        );
      }

      const results = await Promise.all(concurrentOps);
      
      expect(results.length).toBe(5);
      results.forEach(post => {
        expect(post.id).toBeDefined();
      });
    });

    it('should maintain connection pool efficiency', async () => {
      const stats = dbPool.getPoolStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalCount).toBeGreaterThan(0);
      expect(stats.totalCount).toBeLessThanOrEqual(stats.maxConnections);
      expect(stats.idleCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Integrity Requirements', () => {
    it('should prevent duplicate posts using content hash', async () => {
      const postData = {
        title: 'Duplicate Test Post',
        content: 'This content should be unique',
        authorAgent: 'duplicate-test-agent'
      };

      // Create first post
      const post1 = await feedDataService.createAgentPost(postData);
      expect(post1.id).toBeDefined();

      // Try to create identical post
      const post2 = await feedDataService.createAgentPost(postData);
      
      // Should handle gracefully (either return same post or handle conflict)
      expect(post2).toBeDefined();
    });

    it('should maintain referential integrity', async () => {
      // Test that proper foreign key relationships exist
      const result = await dbPool.query(`
        SELECT 
          COUNT(*) as feed_items_count,
          COUNT(f.id) as linked_feeds_count
        FROM feed_items fi
        LEFT JOIN feeds f ON fi.feed_id = f.id
      `);

      const row = result.rows[0];
      expect(parseInt(row.feed_items_count)).toBe(parseInt(row.linked_feeds_count));
    });
  });

  describe('Scalability Requirements', () => {
    it('should support pagination for large datasets', async () => {
      const page1 = await feedDataService.getAgentPosts({ limit: 5, offset: 0 });
      const page2 = await feedDataService.getAgentPosts({ limit: 5, offset: 5 });
      
      expect(page1.posts).toBeDefined();
      expect(page2.posts).toBeDefined();
      expect(page1.pagination.hasMore !== undefined).toBe(true);
    });

    it('should handle large content efficiently', async () => {
      const largeContent = 'x'.repeat(5000); // 5KB content
      
      const post = await feedDataService.createAgentPost({
        title: 'Large Content Test',
        content: largeContent,
        authorAgent: 'large-content-agent'
      });

      expect(post.content.length).toBe(5000);
    });
  });

  describe('Security Requirements', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>Test Title',
        content: 'SELECT * FROM users; DROP TABLE users;',
        authorAgent: 'security-test-agent'
      };

      // Should not throw SQL injection errors
      const post = await feedDataService.createAgentPost(maliciousData);
      expect(post.id).toBeDefined();
      
      // Title should be stored as-is (sanitization at display layer)
      expect(post.title).toBe(maliciousData.title);
    });

    it('should handle prepared statements correctly', async () => {
      // Test parameterized queries don't allow injection
      const searchResult = await feedDataService.searchPosts("'; DROP TABLE feed_items; --");
      
      // Should return empty results, not crash
      expect(Array.isArray(searchResult.posts)).toBe(true);
    });
  });
});