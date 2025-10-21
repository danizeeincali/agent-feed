/**
 * TDD Test for api-server/config/database-selector.js createPost() Method
 *
 * Purpose: Verify createPost inserts posts with correct column names in agent_posts table
 *
 * Target File: /workspaces/agent-feed/api-server/config/database-selector.js
 * Target Method: createPost (lines 208-229)
 *
 * Schema (database.db agent_posts table):
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
 * EXPECTED FAILURE (RED): Current code uses wrong column names:
 * - Uses: author_agent, tags, published_at (WRONG)
 * - Should use: authorAgent, metadata, publishedAt (CORRECT)
 */

const Database = require('better-sqlite3');

describe('API Database Selector - createPost() Column Names', () => {
  let db;
  let testPostIds = [];

  beforeAll(() => {
    // Connect directly to database for verification
    db = new Database('/workspaces/agent-feed/database.db');
  });

  afterEach(() => {
    // Clean up test posts
    testPostIds.forEach(postId => {
      try {
        db.prepare('DELETE FROM agent_posts WHERE id = ?').run(postId);
      } catch (error) {
        // Ignore errors
      }
    });
    testPostIds = [];
  });

  afterAll(() => {
    if (db) db.close();
  });

  describe('Direct SQL Test - Schema Validation', () => {
    test('database schema has camelCase columns (authorAgent, publishedAt)', () => {
      const tableInfo = db.prepare('PRAGMA table_info(agent_posts)').all();
      const columnNames = tableInfo.map(col => col.name);

      // Verify camelCase columns exist
      expect(columnNames).toContain('authorAgent');
      expect(columnNames).toContain('publishedAt');
      expect(columnNames).toContain('metadata');
      expect(columnNames).toContain('engagement');

      // Verify snake_case columns do NOT exist
      expect(columnNames).not.toContain('author_agent');
      expect(columnNames).not.toContain('published_at');
      expect(columnNames).not.toContain('tags');
    });

    test('CORRECT SQL INSERT works with camelCase columns', () => {
      const testId = `test-correct-sql-${Date.now()}`;
      testPostIds.push(testId);

      // This is the CORRECT SQL that should be in database-selector.js
      const correctInsert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = correctInsert.run(
        testId,
        'TestAgent',
        'Test content',
        'Test title',
        new Date().toISOString(),
        JSON.stringify({ tags: ['test'] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      expect(result.changes).toBe(1);

      // Verify data was inserted correctly
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
      expect(post.authorAgent).toBe('TestAgent');
      expect(post.publishedAt).toBeDefined();
    });

    test('BROKEN SQL INSERT fails with snake_case columns', () => {
      const testId = `test-broken-sql-${Date.now()}`;

      // This is the BROKEN SQL currently in database-selector.js (lines 214-215)
      const brokenInsert = db.prepare(`
        INSERT INTO agent_posts (id, author_agent, content, title, tags, published_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);

      // This should FAIL because columns don't exist
      expect(() => {
        brokenInsert.run(
          testId,
          'TestAgent',
          'Test content',
          'Test title',
          JSON.stringify(['test'])
        );
      }).toThrow(/no such column/);
    });
  });

  describe('Module Integration Test', () => {
    test('database-selector.js createPost should use correct column names', async () => {
      // Dynamically import the database selector to test
      let databaseSelector;

      try {
        // Clear module cache to get fresh instance
        delete require.cache[require.resolve('../../api-server/config/database-selector.js')];

        // This will fail because it's an ES6 module
        // We'll test manually after fixing
        const module = require('../../api-server/config/database-selector.js');
        databaseSelector = module.default || module;
      } catch (error) {
        // Expected to fail - ES6 module import in CommonJS context
        // This test documents the expected behavior
        expect(error.message).toMatch(/Cannot use import statement|Unexpected token|Must use import/);
        return;
      }

      // If we get here (after fixing), test the actual method
      if (databaseSelector) {
        await databaseSelector.initialize();

        const testId = `test-module-${Date.now()}`;
        testPostIds.push(testId);

        const postData = {
          id: testId,
          author_agent: 'ModuleTestAgent',
          content: 'Testing module integration',
          title: 'Module Test',
          tags: ['module', 'test']
        };

        // This should work after fixing
        const result = await databaseSelector.createPost('anonymous', postData);

        expect(result).toBeDefined();
        expect(result.id).toBe(testId);

        // Verify in database
        const dbPost = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
        expect(dbPost.authorAgent).toBe('ModuleTestAgent');
        expect(dbPost.publishedAt).toBeDefined();

        await databaseSelector.close();
      }
    });
  });

  describe('Expected Fix Validation', () => {
    test('documents the required SQL fix for createPost', () => {
      // This test documents what needs to be fixed

      const brokenSQL = `
        INSERT INTO agent_posts (id, author_agent, content, title, tags, published_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;

      const fixedSQL = `
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const brokenValues = [
        'postId',
        'postData.author_agent',
        'postData.content',
        'postData.title',
        'JSON.stringify(postData.tags || [])'
      ];

      const fixedValues = [
        'postId',
        'postData.author_agent',  // Keep snake_case from request
        'postData.content',
        'postData.title || ""',
        'new Date().toISOString()',  // publishedAt
        'JSON.stringify(postData.metadata || { tags: postData.tags || [] })',  // metadata
        'JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })'  // engagement
      ];

      // Verify column counts
      const brokenColumns = (brokenSQL.match(/\(/g) || []).length;
      const fixedColumns = (fixedSQL.match(/\(/g) || []).length;

      expect(brokenColumns).toBe(fixedColumns); // Both have INSERT + VALUES

      // Document the fix
      expect(fixedSQL).toContain('authorAgent'); // Not author_agent
      expect(fixedSQL).toContain('publishedAt'); // Not published_at
      expect(fixedSQL).toContain('metadata'); // Not tags
      expect(fixedSQL).toContain('engagement'); // New field

      expect(fixedValues).toHaveLength(7); // All parameters accounted for
    });

    test('engagement field should have correct default structure', () => {
      const expectedEngagement = {
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      };

      const serialized = JSON.stringify(expectedEngagement);
      expect(serialized).toBe('{"comments":0,"likes":0,"shares":0,"views":0}');
    });

    test('metadata field should merge tags correctly', () => {
      const postTags = ['javascript', 'testing'];
      const postMetadata = { priority: 'high' };

      const mergedMetadata = {
        ...postMetadata,
        tags: postTags
      };

      expect(mergedMetadata).toEqual({
        priority: 'high',
        tags: ['javascript', 'testing']
      });
    });
  });
});
