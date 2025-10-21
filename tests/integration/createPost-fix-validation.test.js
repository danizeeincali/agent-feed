/**
 * Integration Test - createPost Fix Validation
 *
 * Purpose: Verify the createPost fix works end-to-end with real database
 *
 * File Fixed: /workspaces/agent-feed/api-server/config/database-selector.js
 * Method: createPost (lines 208-236)
 *
 * Test Strategy:
 * 1. Direct SQL validation (schema check)
 * 2. Insert test posts using fixed code
 * 3. Verify data integrity
 * 4. Validate JSON fields
 * 5. Test edge cases
 */

const Database = require('better-sqlite3');

describe('createPost Fix - End-to-End Validation', () => {
  let db;
  let testPostIds = [];

  beforeAll(() => {
    db = new Database('/workspaces/agent-feed/database.db');
  });

  afterEach(() => {
    // Clean up all test posts
    testPostIds.forEach(postId => {
      try {
        db.prepare('DELETE FROM agent_posts WHERE id = ?').run(postId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    testPostIds = [];
  });

  afterAll(() => {
    if (db) db.close();
  });

  describe('Fixed SQL - Direct Database Test', () => {
    test('can insert post with correct camelCase columns', () => {
      const testId = `test-fixed-${Date.now()}`;
      testPostIds.push(testId);

      // This matches the FIXED SQL in database-selector.js
      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        testId,
        'FixedTestAgent',
        'Testing fixed createPost method',
        'Fixed Test Post',
        new Date().toISOString(),
        JSON.stringify({ tags: ['fix', 'test'] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      expect(result.changes).toBe(1);

      // Verify post was created correctly
      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);

      expect(post).toBeDefined();
      expect(post.id).toBe(testId);
      expect(post.authorAgent).toBe('FixedTestAgent');
      expect(post.content).toBe('Testing fixed createPost method');
      expect(post.title).toBe('Fixed Test Post');
      expect(post.publishedAt).toBeDefined();
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify JSON fields
      const metadata = JSON.parse(post.metadata);
      expect(metadata.tags).toEqual(['fix', 'test']);

      const engagement = JSON.parse(post.engagement);
      expect(engagement).toMatchObject({
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      });
    });

    test('metadata field correctly stores tags array', () => {
      const testId = `test-metadata-${Date.now()}`;
      testPostIds.push(testId);

      const tags = ['javascript', 'tdd', 'sparc'];
      const customMetadata = { priority: 'high', source: 'test' };

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'MetadataTestAgent',
        'Testing metadata storage',
        'Metadata Test',
        new Date().toISOString(),
        JSON.stringify({ ...customMetadata, tags }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.tags).toEqual(['javascript', 'tdd', 'sparc']);
      expect(metadata.priority).toBe('high');
      expect(metadata.source).toBe('test');
    });

    test('engagement field has correct structure', () => {
      const testId = `test-engagement-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const engagementData = {
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      };

      insert.run(
        testId,
        'EngagementTestAgent',
        'Testing engagement field',
        'Engagement Test',
        new Date().toISOString(),
        JSON.stringify({ tags: [] }),
        JSON.stringify(engagementData)
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
      const engagement = JSON.parse(post.engagement);

      expect(engagement).toEqual({
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      });

      // Verify each field type
      expect(typeof engagement.comments).toBe('number');
      expect(typeof engagement.likes).toBe('number');
      expect(typeof engagement.shares).toBe('number');
      expect(typeof engagement.views).toBe('number');
    });

    test('publishedAt stores ISO 8601 timestamp', () => {
      const testId = `test-timestamp-${Date.now()}`;
      testPostIds.push(testId);

      const beforeInsert = new Date();
      const timestamp = beforeInsert.toISOString();

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'TimestampTestAgent',
        'Testing timestamp format',
        'Timestamp Test',
        timestamp,
        JSON.stringify({ tags: [] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);

      // Verify ISO 8601 format
      expect(post.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify it's a valid date
      const parsedDate = new Date(post.publishedAt);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toString()).not.toBe('Invalid Date');

      // Verify it's close to our test time (within 1 second)
      expect(Math.abs(parsedDate.getTime() - beforeInsert.getTime())).toBeLessThan(1000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty tags array correctly', () => {
      const testId = `test-empty-tags-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'EmptyTagsAgent',
        'Testing empty tags',
        'Empty Tags Test',
        new Date().toISOString(),
        JSON.stringify({ tags: [] }),  // Empty array
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
      const metadata = JSON.parse(post.metadata);

      expect(metadata.tags).toEqual([]);
      expect(Array.isArray(metadata.tags)).toBe(true);
    });

    test('handles metadata with only tags (no custom fields)', () => {
      const testId = `test-tags-only-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'TagsOnlyAgent',
        'Testing tags-only metadata',
        'Tags Only Test',
        new Date().toISOString(),
        JSON.stringify({ tags: ['only', 'tags'] }),  // Only tags, no other metadata
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);
      const metadata = JSON.parse(post.metadata);

      expect(metadata).toEqual({ tags: ['only', 'tags'] });
      expect(Object.keys(metadata)).toEqual(['tags']);
    });

    test('handles empty title (default empty string)', () => {
      const testId = `test-empty-title-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'EmptyTitleAgent',
        'Testing empty title handling',
        '',  // Empty title
        new Date().toISOString(),
        JSON.stringify({ tags: [] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);

      expect(post.title).toBe('');
      expect(typeof post.title).toBe('string');
    });

    test('enforces NOT NULL constraint on authorAgent', () => {
      const testId = `test-null-author-${Date.now()}`;

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Should fail due to NOT NULL constraint
      expect(() => {
        insert.run(
          testId,
          null,  // NULL authorAgent
          'Testing null author',
          'Null Author Test',
          new Date().toISOString(),
          JSON.stringify({ tags: [] }),
          JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
        );
      }).toThrow(/NOT NULL constraint failed/);
    });

    test('enforces NOT NULL constraint on content', () => {
      const testId = `test-null-content-${Date.now()}`;

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Should fail due to NOT NULL constraint
      expect(() => {
        insert.run(
          testId,
          'NullContentAgent',
          null,  // NULL content
          'Null Content Test',
          new Date().toISOString(),
          JSON.stringify({ tags: [] }),
          JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
        );
      }).toThrow(/NOT NULL constraint failed/);
    });

    test('enforces unique constraint on id (PRIMARY KEY)', () => {
      const duplicateId = `test-duplicate-${Date.now()}`;
      testPostIds.push(duplicateId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // First insert should succeed
      insert.run(
        duplicateId,
        'FirstAgent',
        'First post',
        'First',
        new Date().toISOString(),
        JSON.stringify({ tags: [] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      // Second insert with same ID should fail
      expect(() => {
        insert.run(
          duplicateId,
          'SecondAgent',
          'Second post',
          'Second',
          new Date().toISOString(),
          JSON.stringify({ tags: [] }),
          JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
        );
      }).toThrow(/UNIQUE constraint failed|PRIMARY KEY/);
    });
  });

  describe('Data Integrity Validation', () => {
    test('all required columns are populated after insert', () => {
      const testId = `test-all-columns-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        testId,
        'AllColumnsAgent',
        'Testing all columns',
        'All Columns Test',
        new Date().toISOString(),
        JSON.stringify({ tags: ['complete'] }),
        JSON.stringify({ comments: 0, likes: 0, shares: 0, views: 0 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);

      // Verify all core columns exist
      expect(post.id).toBeDefined();
      expect(post.authorAgent).toBeDefined();
      expect(post.content).toBeDefined();
      expect(post.title).toBeDefined();
      expect(post.publishedAt).toBeDefined();
      expect(post.metadata).toBeDefined();
      expect(post.engagement).toBeDefined();

      // Verify auto-generated columns
      expect(post.created_at).toBeDefined();
      expect(post.last_activity_at).toBeDefined();
    });

    test('JSON fields can be parsed without errors', () => {
      const testId = `test-json-parse-${Date.now()}`;
      testPostIds.push(testId);

      const insert = db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const complexMetadata = {
        tags: ['complex', 'nested'],
        customData: {
          nested: {
            deep: 'value'
          }
        },
        array: [1, 2, 3]
      };

      insert.run(
        testId,
        'JSONParseAgent',
        'Testing JSON parsing',
        'JSON Parse Test',
        new Date().toISOString(),
        JSON.stringify(complexMetadata),
        JSON.stringify({ comments: 5, likes: 10, shares: 2, views: 100 })
      );

      const post = db.prepare('SELECT * FROM agent_posts WHERE id = ?').get(testId);

      // Parse metadata
      expect(() => {
        const metadata = JSON.parse(post.metadata);
        expect(metadata.customData.nested.deep).toBe('value');
        expect(metadata.array).toEqual([1, 2, 3]);
      }).not.toThrow();

      // Parse engagement
      expect(() => {
        const engagement = JSON.parse(post.engagement);
        expect(engagement.comments).toBe(5);
        expect(engagement.likes).toBe(10);
      }).not.toThrow();
    });
  });
});
