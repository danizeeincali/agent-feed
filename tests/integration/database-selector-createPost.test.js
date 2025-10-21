/**
 * TDD Test for database-selector.js createPost() Method
 *
 * Purpose: Verify createPost inserts posts with correct column names
 *
 * Schema Requirements (from database.db):
 * - id TEXT PRIMARY KEY
 * - authorAgent TEXT NOT NULL (camelCase)
 * - content TEXT NOT NULL
 * - title TEXT NOT NULL
 * - publishedAt TEXT NOT NULL (camelCase)
 * - metadata TEXT NOT NULL (JSON)
 * - engagement TEXT NOT NULL (JSON)
 * - created_at DATETIME
 * - last_activity_at DATETIME
 *
 * Test Strategy: London School TDD - Outside-In
 * 1. RED: Write failing test
 * 2. GREEN: Fix createPost implementation
 * 3. REFACTOR: Clean up and optimize
 */

const path = require('path');
const Database = require('better-sqlite3');

describe('DatabaseSelector.createPost() - Column Name Fix', () => {
  let db;
  let dbSelector;
  let testPostIds = [];

  beforeAll(async () => {
    // Set environment to SQLite mode
    process.env.USE_POSTGRES = 'false';

    // Connect to real database
    db = new Database('/workspaces/agent-feed/database.db');

    // Import database selector (using require for CommonJS compatibility)
    const dbSelectorModule = require('../../backend/services/database-selector.js');
    dbSelector = dbSelectorModule;

    // Initialize in SQLite mode
    await dbSelector.initialize();
  });

  afterEach(() => {
    // Clean up test posts
    testPostIds.forEach(postId => {
      try {
        db.prepare('DELETE FROM agent_posts WHERE id = ?').run(postId);
      } catch (error) {
        // Ignore errors if post doesn't exist
      }
    });
    testPostIds = [];
  });

  afterAll(() => {
    // Close connections
    if (db) db.close();
    if (dbSelector) dbSelector.close();
  });

  describe('Column Name Mapping', () => {
    test('should insert post with camelCase column names (authorAgent, publishedAt)', async () => {
      const postData = {
        id: `test-createPost-${Date.now()}`,
        author_agent: 'TestAgent', // snake_case from request
        content: 'Test content for createPost column name verification',
        title: 'Test Post Title',
        tags: ['testing', 'tdd'],
        metadata: {
          source: 'test',
          environment: 'development'
        }
      };

      testPostIds.push(postData.id);

      // Execute createPost
      const result = await dbSelector.createPost('anonymous', postData);

      // Verify post was created
      expect(result).toBeDefined();
      expect(result.id).toBe(postData.id);

      // Verify database has correct data with camelCase column names
      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      expect(dbPost).toBeDefined();
      expect(dbPost.id).toBe(postData.id);

      // CRITICAL: Verify camelCase columns exist
      expect(dbPost.authorAgent).toBe('TestAgent');
      expect(dbPost.publishedAt).toBeDefined();
      expect(dbPost.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO 8601 format

      // Verify JSON fields
      expect(dbPost.metadata).toBeDefined();
      const metadata = JSON.parse(dbPost.metadata);
      expect(metadata.tags).toEqual(['testing', 'tdd']);

      expect(dbPost.engagement).toBeDefined();
      const engagement = JSON.parse(dbPost.engagement);
      expect(engagement.comments).toBe(0);
      expect(engagement.likes).toBe(0);
      expect(engagement.shares).toBe(0);
      expect(engagement.views).toBe(0);
    });

    test('should NOT create snake_case columns (author_agent, published_at)', async () => {
      const postData = {
        id: `test-noSnakeCase-${Date.now()}`,
        author_agent: 'TestAgent2',
        content: 'Verify no snake_case columns are created',
        title: 'Snake Case Test'
      };

      testPostIds.push(postData.id);

      await dbSelector.createPost('anonymous', postData);

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      // Verify snake_case columns do NOT exist
      expect(dbPost.author_agent).toBeUndefined();
      expect(dbPost.published_at).toBeUndefined();
      expect(dbPost.tags).toBeUndefined();

      // Verify camelCase columns DO exist
      expect(dbPost.authorAgent).toBeDefined();
      expect(dbPost.publishedAt).toBeDefined();
      expect(dbPost.metadata).toBeDefined();
    });

    test('should handle missing optional fields gracefully', async () => {
      const postData = {
        id: `test-minimal-${Date.now()}`,
        author_agent: 'MinimalAgent',
        content: 'Minimal content'
        // No title, tags, or metadata
      };

      testPostIds.push(postData.id);

      const result = await dbSelector.createPost('anonymous', postData);

      expect(result).toBeDefined();
      expect(result.id).toBe(postData.id);
      expect(result.title).toBe(''); // Default empty string

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      const metadata = JSON.parse(dbPost.metadata);
      expect(metadata.tags).toEqual([]); // Default empty array

      const engagement = JSON.parse(dbPost.engagement);
      expect(engagement.comments).toBe(0);
    });

    test('should preserve tags in metadata.tags (not as separate column)', async () => {
      const postData = {
        id: `test-tags-${Date.now()}`,
        author_agent: 'TagAgent',
        content: 'Testing tags storage',
        title: 'Tags Test',
        tags: ['javascript', 'testing', 'tdd']
      };

      testPostIds.push(postData.id);

      await dbSelector.createPost('anonymous', postData);

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      // Verify tags are stored in metadata JSON
      const metadata = JSON.parse(dbPost.metadata);
      expect(metadata.tags).toEqual(['javascript', 'testing', 'tdd']);

      // Verify no separate tags column
      expect(dbPost.tags).toBeUndefined();
    });

    test('should auto-generate publishedAt timestamp if not provided', async () => {
      const beforeCreate = new Date().toISOString();

      const postData = {
        id: `test-timestamp-${Date.now()}`,
        author_agent: 'TimestampAgent',
        content: 'Testing auto-timestamp generation',
        title: 'Timestamp Test'
        // No publishedAt provided
      };

      testPostIds.push(postData.id);

      await dbSelector.createPost('anonymous', postData);

      const afterCreate = new Date().toISOString();

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      expect(dbPost.publishedAt).toBeDefined();
      expect(dbPost.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify timestamp is between before and after test execution
      expect(new Date(dbPost.publishedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeCreate).getTime() - 1000);
      expect(new Date(dbPost.publishedAt).getTime()).toBeLessThanOrEqual(new Date(afterCreate).getTime() + 1000);
    });

    test('should initialize engagement with correct default structure', async () => {
      const postData = {
        id: `test-engagement-${Date.now()}`,
        author_agent: 'EngagementAgent',
        content: 'Testing engagement initialization',
        title: 'Engagement Test'
      };

      testPostIds.push(postData.id);

      await dbSelector.createPost('anonymous', postData);

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      const engagement = JSON.parse(dbPost.engagement);

      // Verify all engagement fields are initialized
      expect(engagement).toMatchObject({
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      });
    });

    test('should merge custom metadata with tags', async () => {
      const postData = {
        id: `test-metadata-merge-${Date.now()}`,
        author_agent: 'MetadataAgent',
        content: 'Testing metadata merge',
        title: 'Metadata Merge Test',
        tags: ['meta', 'test'],
        metadata: {
          customField: 'custom value',
          priority: 'high'
        }
      };

      testPostIds.push(postData.id);

      await dbSelector.createPost('anonymous', postData);

      const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(postData.id);

      const metadata = JSON.parse(dbPost.metadata);

      // Verify tags are included
      expect(metadata.tags).toEqual(['meta', 'test']);

      // Verify custom metadata is preserved
      expect(metadata.customField).toBe('custom value');
      expect(metadata.priority).toBe('high');
    });

    test('should return created post with correct structure', async () => {
      const postData = {
        id: `test-return-${Date.now()}`,
        author_agent: 'ReturnAgent',
        content: 'Testing return value',
        title: 'Return Test'
      };

      testPostIds.push(postData.id);

      const result = await dbSelector.createPost('anonymous', postData);

      // Verify return value structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('authorAgent');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('publishedAt');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('engagement');

      // Verify values match input
      expect(result.authorAgent).toBe('ReturnAgent');
      expect(result.content).toBe('Testing return value');
      expect(result.title).toBe('Return Test');
    });
  });

  describe('Error Handling', () => {
    test('should throw error if author_agent is missing', async () => {
      const postData = {
        id: `test-no-author-${Date.now()}`,
        content: 'Missing author',
        title: 'Error Test'
        // No author_agent
      };

      await expect(
        dbSelector.createPost('anonymous', postData)
      ).rejects.toThrow();
    });

    test('should throw error if content is missing', async () => {
      const postData = {
        id: `test-no-content-${Date.now()}`,
        author_agent: 'ErrorAgent',
        title: 'Error Test'
        // No content
      };

      await expect(
        dbSelector.createPost('anonymous', postData)
      ).rejects.toThrow();
    });

    test('should handle duplicate ID gracefully', async () => {
      const duplicateId = `test-duplicate-${Date.now()}`;

      const postData1 = {
        id: duplicateId,
        author_agent: 'DuplicateAgent1',
        content: 'First post',
        title: 'Duplicate Test 1'
      };

      testPostIds.push(duplicateId);

      // First insert should succeed
      await dbSelector.createPost('anonymous', postData1);

      // Second insert with same ID should fail
      const postData2 = {
        id: duplicateId,
        author_agent: 'DuplicateAgent2',
        content: 'Second post',
        title: 'Duplicate Test 2'
      };

      await expect(
        dbSelector.createPost('anonymous', postData2)
      ).rejects.toThrow();
    });
  });

  describe('Integration with getPostById', () => {
    test('should retrieve created post with getPostById', async () => {
      const postData = {
        id: `test-integration-${Date.now()}`,
        author_agent: 'IntegrationAgent',
        content: 'Testing createPost -> getPostById integration',
        title: 'Integration Test',
        tags: ['integration']
      };

      testPostIds.push(postData.id);

      // Create post
      const created = await dbSelector.createPost('anonymous', postData);

      // Retrieve post
      const retrieved = await dbSelector.getPostById(postData.id, 'anonymous');

      // Verify they match
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.authorAgent).toBe(created.authorAgent);
      expect(retrieved.content).toBe(created.content);
      expect(retrieved.publishedAt).toBe(created.publishedAt);
    });
  });
});
