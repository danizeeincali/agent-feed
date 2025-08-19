/**
 * Database Migration Validation Tests
 * Comprehensive test suite for AgentLink database migrations (005-008)
 * 
 * Test Categories:
 * - Schema integrity and structure validation
 * - Data preservation and transformation verification
 * - Performance benchmarking
 * - Rollback functionality
 * - Foreign key constraint validation
 * - Index effectiveness testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool, Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Database connection configuration
const testDbConfig = {
  user: process.env.TEST_DB_USER || 'postgres',
  host: process.env.TEST_DB_HOST || 'localhost',
  database: process.env.TEST_DB_NAME || 'agent_feed_test',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
};

let pool: Pool;
let client: Client;

// Test data fixtures
const testUserData = {
  email: 'test@example.com',
  name: 'Test User',
  preferences: {
    theme: 'dark',
    notifications: { email: true }
  }
};

const testFeedData = {
  name: 'Test Feed',
  description: 'Test feed for migration validation',
  url: 'https://example.com/feed.xml',
  feed_type: 'rss'
};

const testFeedItemData = {
  title: 'Test Article',
  content: 'This is test content for migration validation with a link: https://example.com/article',
  url: 'https://example.com/test-article',
  author: 'Test Author',
  published_at: new Date().toISOString()
};

describe('Database Migration Validation', () => {
  beforeAll(async () => {
    pool = new Pool(testDbConfig);
    client = await pool.connect();
    
    // Ensure test database is clean
    await resetTestDatabase();
    
    // Create initial test data
    await seedInitialData();
  });

  afterAll(async () => {
    await client.release();
    await pool.end();
  });

  beforeEach(async () => {
    // Clear any test-specific data but preserve base structure
    await client.query('TRUNCATE TABLE user_engagements, post_analytics, agent_mentions CASCADE');
  });

  describe('Pre-Migration State Validation', () => {
    it('should have original schema tables present', async () => {
      const tables = await getTableNames();
      
      const expectedOriginalTables = [
        'users', 'feeds', 'feed_items', 'comments', 'claude_flow_sessions',
        'neural_patterns', 'user_sessions', 'feed_fetch_logs', 
        'automation_results', 'automation_triggers', 'automation_actions'
      ];
      
      for (const table of expectedOriginalTables) {
        expect(tables).toContain(table);
      }
    });

    it('should have data integrity in original schema', async () => {
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      const feedCount = await client.query('SELECT COUNT(*) FROM feeds');
      const feedItemCount = await client.query('SELECT COUNT(*) FROM feed_items');
      
      expect(parseInt(userCount.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(feedCount.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(feedItemCount.rows[0].count)).toBeGreaterThan(0);
    });

    it('should have proper foreign key relationships', async () => {
      const feedsWithUsers = await client.query(`
        SELECT COUNT(*) FROM feeds f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE u.id IS NULL
      `);
      
      const feedItemsWithFeeds = await client.query(`
        SELECT COUNT(*) FROM feed_items fi
        LEFT JOIN feeds f ON fi.feed_id = f.id
        WHERE f.id IS NULL
      `);
      
      expect(parseInt(feedsWithUsers.rows[0].count)).toBe(0);
      expect(parseInt(feedItemsWithFeeds.rows[0].count)).toBe(0);
    });
  });

  describe('Migration 005: Posts Structure Enhancement', () => {
    beforeAll(async () => {
      await executeMigration('005_enhance_posts_structure.sql');
    });

    it('should create posts table with correct structure', async () => {
      const columns = await getTableColumns('posts');
      
      const expectedColumns = [
        'id', 'title', 'hook', 'content_body', 'author_id', 'author_agent',
        'parent_post_id', 'thread_depth', 'processing_status', 'is_agent_response',
        'likes_count', 'comments_count', 'saves_count', 'shares_count', 'views_count',
        'metadata', 'tags', 'mentioned_agents', 'visibility', 'business_impact',
        'created_at', 'updated_at', 'published_at', 'slug'
      ];
      
      for (const column of expectedColumns) {
        expect(columns).toContain(column);
      }
    });

    it('should migrate all feed_items data to posts', async () => {
      const originalCount = await client.query('SELECT COUNT(*) FROM feed_items');
      const migratedCount = await client.query(`
        SELECT COUNT(*) FROM posts 
        WHERE (metadata->>'migrated_from') = 'feed_items'
      `);
      
      expect(migratedCount.rows[0].count).toBe(originalCount.rows[0].count);
    });

    it('should preserve all original data during migration', async () => {
      const originalData = await client.query(`
        SELECT fi.id, fi.title, fi.content, fi.created_at
        FROM feed_items fi
        ORDER BY fi.created_at
        LIMIT 1
      `);
      
      const migratedData = await client.query(`
        SELECT p.id, p.title, p.content_body, p.created_at
        FROM posts p
        WHERE p.id = $1
      `, [originalData.rows[0].id]);
      
      expect(migratedData.rows).toHaveLength(1);
      expect(migratedData.rows[0].title).toBe(originalData.rows[0].title);
      expect(migratedData.rows[0].content_body).toBe(originalData.rows[0].content);
      expect(migratedData.rows[0].created_at).toEqual(originalData.rows[0].created_at);
    });

    it('should create proper indexes for performance', async () => {
      const indexes = await getTableIndexes('posts');
      
      const expectedIndexes = [
        'idx_posts_author_id', 'idx_posts_processing_status', 'idx_posts_published_at',
        'idx_posts_tags', 'idx_posts_mentioned_agents', 'idx_posts_full_text'
      ];
      
      for (const index of expectedIndexes) {
        expect(indexes).toContain(index);
      }
    });

    it('should support threading functionality', async () => {
      // Create a root post
      const rootPost = await client.query(`
        INSERT INTO posts (title, content_body, author_id)
        VALUES ('Root Post', 'This is a root post', (SELECT id FROM users LIMIT 1))
        RETURNING id
      `);
      
      // Create a reply
      const reply = await client.query(`
        INSERT INTO posts (title, content_body, author_id, parent_post_id)
        VALUES ('Reply Post', 'This is a reply', (SELECT id FROM users LIMIT 1), $1)
        RETURNING id, thread_depth, root_post_id
      `, [rootPost.rows[0].id]);
      
      expect(reply.rows[0].thread_depth).toBe(1);
      expect(reply.rows[0].root_post_id).toBe(rootPost.rows[0].id);
    });

    it('should handle search vector generation', async () => {
      const postsWithSearchVector = await client.query(`
        SELECT COUNT(*) FROM posts 
        WHERE search_vector IS NOT NULL
      `);
      
      expect(parseInt(postsWithSearchVector.rows[0].count)).toBeGreaterThan(0);
    });

    describe('Performance Tests', () => {
      it('should have fast feed queries (<100ms)', async () => {
        const start = Date.now();
        
        await client.query(`
          SELECT p.*, u.name as author_name
          FROM posts p
          JOIN users u ON p.author_id = u.id
          WHERE p.processing_status = 'published'
          ORDER BY p.published_at DESC
          LIMIT 20
        `);
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
      });

      it('should have efficient full-text search', async () => {
        const start = Date.now();
        
        await client.query(`
          SELECT * FROM posts
          WHERE search_vector @@ to_tsquery('english', 'test')
          LIMIT 10
        `);
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(50);
      });
    });
  });

  describe('Migration 006: Agent Management System', () => {
    beforeAll(async () => {
      await executeMigration('006_create_agent_management.sql');
    });

    it('should create all agent-related tables', async () => {
      const tables = await getTableNames();
      
      const expectedAgentTables = [
        'agents', 'agent_pages', 'agent_performance_metrics',
        'agent_mentions', 'agent_coordination'
      ];
      
      for (const table of expectedAgentTables) {
        expect(tables).toContain(table);
      }
    });

    it('should populate initial agent data', async () => {
      const agentCount = await client.query('SELECT COUNT(*) FROM agents');
      expect(parseInt(agentCount.rows[0].count)).toBeGreaterThan(0);
      
      // Check specific agents
      const chiefOfStaff = await client.query(`
        SELECT * FROM agents WHERE name = 'chief-of-staff'
      `);
      expect(chiefOfStaff.rows).toHaveLength(1);
      expect(chiefOfStaff.rows[0].agent_type).toBe('coordinator');
    });

    it('should create agent pages for initial agents', async () => {
      const agentPagesCount = await client.query(`
        SELECT COUNT(*) FROM agent_pages ap
        JOIN agents a ON ap.agent_id = a.id
      `);
      expect(parseInt(agentPagesCount.rows[0].count)).toBeGreaterThan(0);
    });

    it('should support agent mention functionality', async () => {
      // Create a post that mentions an agent
      const agent = await client.query('SELECT id FROM agents LIMIT 1');
      const user = await client.query('SELECT id FROM users LIMIT 1');
      const post = await client.query(`
        INSERT INTO posts (title, content_body, author_id, mentioned_agents)
        VALUES ('Test Post', 'Mentioning an agent', $1, ARRAY['chief-of-staff'])
        RETURNING id
      `, [user.rows[0].id]);
      
      // Create agent mention record
      const mention = await client.query(`
        INSERT INTO agent_mentions (post_id, agent_id, mentioned_by_user_id, mention_text)
        VALUES ($1, $2, $3, '@chief-of-staff please review this')
        RETURNING id
      `, [post.rows[0].id, agent.rows[0].id, user.rows[0].id]);
      
      expect(mention.rows).toHaveLength(1);
    });

    it('should maintain referential integrity', async () => {
      const orphanedPages = await client.query(`
        SELECT COUNT(*) FROM agent_pages ap
        LEFT JOIN agents a ON ap.agent_id = a.id
        WHERE a.id IS NULL
      `);
      
      const orphanedMentions = await client.query(`
        SELECT COUNT(*) FROM agent_mentions am
        LEFT JOIN agents a ON am.agent_id = a.id
        WHERE a.id IS NULL
      `);
      
      expect(parseInt(orphanedPages.rows[0].count)).toBe(0);
      expect(parseInt(orphanedMentions.rows[0].count)).toBe(0);
    });
  });

  describe('Migration 007: Engagement System', () => {
    beforeAll(async () => {
      await executeMigration('007_create_engagement_system.sql');
    });

    it('should create engagement tracking tables', async () => {
      const tables = await getTableNames();
      
      const expectedEngagementTables = [
        'user_engagements', 'user_engagement_analytics',
        'post_analytics', 'engagement_events'
      ];
      
      for (const table of expectedEngagementTables) {
        expect(tables).toContain(table);
      }
    });

    it('should support user engagement operations', async () => {
      const user = await client.query('SELECT id FROM users LIMIT 1');
      const post = await client.query('SELECT id FROM posts LIMIT 1');
      
      // Test engagement creation
      const result = await client.query(`
        SELECT add_user_engagement($1, $2, 'like', '{}')
      `, [user.rows[0].id, post.rows[0].id]);
      
      const engagement = JSON.parse(result.rows[0].add_user_engagement);
      expect(engagement.success).toBe(true);
      
      // Verify engagement count updated
      const updatedPost = await client.query(`
        SELECT likes_count FROM posts WHERE id = $1
      `, [post.rows[0].id]);
      
      expect(updatedPost.rows[0].likes_count).toBe(1);
    });

    it('should prevent duplicate engagements', async () => {
      const user = await client.query('SELECT id FROM users LIMIT 1');
      const post = await client.query('SELECT id FROM posts LIMIT 1');
      
      // Try to add same engagement twice
      await client.query(`
        SELECT add_user_engagement($1, $2, 'save', '{}')
      `, [user.rows[0].id, post.rows[0].id]);
      
      const secondAttempt = await client.query(`
        SELECT add_user_engagement($1, $2, 'save', '{}')
      `, [user.rows[0].id, post.rows[0].id]);
      
      const result = JSON.parse(secondAttempt.rows[0].add_user_engagement);
      expect(result.success).toBe(false);
      expect(result.error).toBe('duplicate_engagement');
    });

    it('should calculate analytics correctly', async () => {
      const user = await client.query('SELECT id FROM users LIMIT 1');
      
      const analytics = await client.query(`
        SELECT calculate_user_engagement_analytics($1, CURRENT_DATE)
      `, [user.rows[0].id]);
      
      const result = JSON.parse(analytics.rows[0].calculate_user_engagement_analytics);
      expect(result.user_id).toBe(user.rows[0].id);
      expect(result.total_engagements).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Migration 008: Processing and Previews', () => {
    beforeAll(async () => {
      await executeMigration('008_processing_and_previews.sql');
    });

    it('should create processing and preview tables', async () => {
      const tables = await getTableNames();
      
      const expectedProcessingTables = [
        'post_processing_status', 'link_previews', 'post_links',
        'chief_of_staff_checks', 'agent_responses'
      ];
      
      for (const table of expectedProcessingTables) {
        expect(tables).toContain(table);
      }
    });

    it('should support link extraction from posts', async () => {
      const post = await client.query('SELECT id FROM posts WHERE content_body LIKE \'%https://%\' LIMIT 1');
      
      if (post.rows.length > 0) {
        const extractResult = await client.query(`
          SELECT * FROM extract_post_links($1, 'Check out https://example.com and https://test.com')
        `, [post.rows[0].id]);
        
        expect(extractResult.rows[0].links_found).toBeGreaterThan(0);
        expect(extractResult.rows[0].previews_created).toBeGreaterThan(0);
      }
    });

    it('should execute Chief of Staff checks', async () => {
      const post = await client.query('SELECT id FROM posts LIMIT 1');
      
      const checkResult = await client.query(`
        SELECT execute_chief_of_staff_check($1, 'content_quality', '{}', 'chief-of-staff')
      `, [post.rows[0].id]);
      
      const result = JSON.parse(checkResult.rows[0].execute_chief_of_staff_check);
      expect(result.success).toBe(true);
      expect(result.check_result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should track processing status', async () => {
      const post = await client.query('SELECT id FROM posts LIMIT 1');
      
      const statusId = await client.query(`
        SELECT update_post_processing_stage($1, 'content_validation', 'test-processor', 'system', '{"test": true}')
      `, [post.rows[0].id]);
      
      expect(statusId.rows[0].update_post_processing_stage).toBeDefined();
      
      // Verify status was recorded
      const status = await client.query(`
        SELECT * FROM post_processing_status WHERE post_id = $1 AND stage = 'content_validation'
      `, [post.rows[0].id]);
      
      expect(status.rows).toHaveLength(1);
      expect(status.rows[0].processor_id).toBe('test-processor');
    });
  });

  describe('Cross-Migration Integration Tests', () => {
    it('should maintain data consistency across all migrations', async () => {
      // Verify no orphaned records exist
      const checks = [
        'SELECT COUNT(*) FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE u.id IS NULL',
        'SELECT COUNT(*) FROM agent_mentions am LEFT JOIN posts p ON am.post_id = p.id WHERE p.id IS NULL',
        'SELECT COUNT(*) FROM user_engagements ue LEFT JOIN posts p ON ue.post_id = p.id WHERE p.id IS NULL',
        'SELECT COUNT(*) FROM post_processing_status pps LEFT JOIN posts p ON pps.post_id = p.id WHERE p.id IS NULL'
      ];
      
      for (const check of checks) {
        const result = await client.query(check);
        expect(parseInt(result.rows[0].count)).toBe(0);
      }
    });

    it('should support complete workflow from post creation to engagement', async () => {
      const user = await client.query('SELECT id FROM users LIMIT 1');
      
      // Create post
      const post = await client.query(`
        INSERT INTO posts (title, content_body, author_id, mentioned_agents)
        VALUES ('Integration Test Post', 'This is a test post https://example.com', $1, ARRAY['chief-of-staff'])
        RETURNING id
      `, [user.rows[0].id]);
      
      // Process post
      await client.query(`
        SELECT update_post_processing_stage($1, 'processing', 'integration-test', 'system', '{}')
      `, [post.rows[0].id]);
      
      // Add engagement
      await client.query(`
        SELECT add_user_engagement($1, $2, 'like', '{}')
      `, [user.rows[0].id, post.rows[0].id]);
      
      // Verify complete workflow
      const finalPost = await client.query(`
        SELECT p.*, COUNT(ue.id) as engagement_count, COUNT(pps.id) as processing_count
        FROM posts p
        LEFT JOIN user_engagements ue ON p.id = ue.post_id
        LEFT JOIN post_processing_status pps ON p.id = pps.post_id
        WHERE p.id = $1
        GROUP BY p.id
      `, [post.rows[0].id]);
      
      expect(finalPost.rows).toHaveLength(1);
      expect(parseInt(finalPost.rows[0].engagement_count)).toBeGreaterThan(0);
      expect(parseInt(finalPost.rows[0].processing_count)).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain query performance under load', async () => {
      // Test concurrent queries
      const queries = Array(10).fill(null).map(() => 
        client.query(`
          SELECT p.*, u.name, COUNT(ue.id) as engagements
          FROM posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN user_engagements ue ON p.id = ue.post_id
          WHERE p.processing_status = 'published'
          GROUP BY p.id, u.name
          ORDER BY p.published_at DESC
          LIMIT 20
        `)
      );
      
      const start = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - start;
      
      // Should complete 10 concurrent queries in under 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should have efficient indexing', async () => {
      // Test index usage with EXPLAIN
      const plan = await client.query(`
        EXPLAIN (FORMAT JSON) 
        SELECT * FROM posts 
        WHERE processing_status = 'published' 
        ORDER BY published_at DESC 
        LIMIT 10
      `);
      
      const planText = JSON.stringify(plan.rows[0]);
      // Should use index scan, not sequential scan
      expect(planText).not.toMatch(/Seq Scan/);
    });
  });

  describe('Rollback Functionality Tests', () => {
    it('should be able to rollback migration 008', async () => {
      // Execute rollback
      await executeRollback('rollback-008-processing.sql');
      
      // Verify tables are removed
      const tables = await getTableNames();
      const processingTables = [
        'post_processing_status', 'link_previews', 'post_links',
        'chief_of_staff_checks', 'agent_responses'
      ];
      
      for (const table of processingTables) {
        expect(tables).not.toContain(table);
      }
      
      // Re-apply migration for other tests
      await executeMigration('008_processing_and_previews.sql');
    });

    it('should preserve data during rollback operations', async () => {
      const originalUserCount = await client.query('SELECT COUNT(*) FROM users');
      const originalPostCount = await client.query('SELECT COUNT(*) FROM posts');
      
      // Execute and rollback migration 007
      await executeRollback('rollback-007-engagement.sql');
      await executeMigration('007_create_engagement_system.sql');
      
      const finalUserCount = await client.query('SELECT COUNT(*) FROM users');
      const finalPostCount = await client.query('SELECT COUNT(*) FROM posts');
      
      expect(finalUserCount.rows[0].count).toBe(originalUserCount.rows[0].count);
      expect(finalPostCount.rows[0].count).toBe(originalPostCount.rows[0].count);
    });
  });
});

// Helper functions
async function resetTestDatabase(): Promise<void> {
  // Drop all tables except system tables
  await client.query(`
    DROP SCHEMA IF EXISTS rollback_backup CASCADE;
    DROP TABLE IF EXISTS agent_responses CASCADE;
    DROP TABLE IF EXISTS chief_of_staff_checks CASCADE;
    DROP TABLE IF EXISTS post_links CASCADE;
    DROP TABLE IF EXISTS link_previews CASCADE;
    DROP TABLE IF EXISTS post_processing_status CASCADE;
    DROP TABLE IF EXISTS engagement_events CASCADE;
    DROP TABLE IF EXISTS post_analytics CASCADE;
    DROP TABLE IF EXISTS user_engagement_analytics CASCADE;
    DROP TABLE IF EXISTS user_engagements CASCADE;
    DROP TABLE IF EXISTS agent_coordination CASCADE;
    DROP TABLE IF EXISTS agent_mentions CASCADE;
    DROP TABLE IF EXISTS agent_performance_metrics CASCADE;
    DROP TABLE IF EXISTS agent_pages CASCADE;
    DROP TABLE IF EXISTS agents CASCADE;
    DROP TABLE IF EXISTS posts CASCADE;
  `);
  
  // Ensure original schema exists
  const originalSchema = readFileSync(
    join(__dirname, '../../src/database/schema.sql'),
    'utf-8'
  );
  await client.query(originalSchema);
}

async function seedInitialData(): Promise<void> {
  // Create test user
  const user = await client.query(`
    INSERT INTO users (email, name, preferences)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [testUserData.email, testUserData.name, JSON.stringify(testUserData.preferences)]);
  
  // Create test feed
  const feed = await client.query(`
    INSERT INTO feeds (user_id, name, description, url, feed_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [user.rows[0].id, testFeedData.name, testFeedData.description, testFeedData.url, testFeedData.feed_type]);
  
  // Create test feed items
  await client.query(`
    INSERT INTO feed_items (feed_id, title, content, url, author, published_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    feed.rows[0].id,
    testFeedItemData.title,
    testFeedItemData.content,
    testFeedItemData.url,
    testFeedItemData.author,
    testFeedItemData.published_at
  ]);
}

async function executeMigration(filename: string): Promise<void> {
  const migrationSql = readFileSync(
    join(__dirname, '../../src/database/migrations', filename),
    'utf-8'
  );
  await client.query(migrationSql);
}

async function executeRollback(filename: string): Promise<void> {
  const rollbackSql = readFileSync(
    join(__dirname, '../../src/database/migrations/rollback', filename),
    'utf-8'
  );
  await client.query(rollbackSql);
}

async function getTableNames(): Promise<string[]> {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  return result.rows.map(row => row.table_name);
}

async function getTableColumns(tableName: string): Promise<string[]> {
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows.map(row => row.column_name);
}

async function getTableIndexes(tableName: string): Promise<string[]> {
  const result = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = $1 AND schemaname = 'public'
    ORDER BY indexname
  `, [tableName]);
  return result.rows.map(row => row.indexname);
}