/**
 * Database Operations Integration Tests
 * Tests all database operations, migrations, and data integrity
 */

const { db } = require('../../src/database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

describe('Database Operations Integration Tests', () => {
  let testUserId;
  let testFeedId;
  let testSessionId;

  beforeAll(async () => {
    // Ensure database is migrated
    await db.migrate();
  });

  afterAll(async () => {
    // Cleanup all test data
    if (testUserId) {
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await db.close();
  });

  describe('Database Connection and Health', () => {
    test('Should connect to database successfully', async () => {
      const result = await db.query('SELECT NOW() as current_time');
      expect(result.rows[0]).toHaveProperty('current_time');
    });

    test('Should perform health check', async () => {
      const health = await db.healthCheck();
      expect(health).toHaveProperty('database');
      expect(health.database).toBe(true);
    });

    test('Should have all required tables', async () => {
      const tables = await db.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      const tableNames = tables.rows.map(row => row.tablename);
      const requiredTables = [
        'users', 'feeds', 'feed_items', 'automation_results',
        'claude_flow_sessions', 'neural_patterns', 'user_sessions',
        'feed_fetch_logs', 'automation_triggers', 'automation_actions'
      ];
      
      requiredTables.forEach(tableName => {
        expect(tableNames).toContain(tableName);
      });
    });

    test('Should have all required indexes', async () => {
      const indexes = await db.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);
      
      const indexNames = indexes.rows.map(row => row.indexname);
      const requiredIndexes = [
        'idx_feeds_user_id', 'idx_feeds_status', 'idx_feed_items_feed_id',
        'idx_claude_flow_sessions_user_id', 'idx_neural_patterns_feed_id'
      ];
      
      requiredIndexes.forEach(indexName => {
        expect(indexNames).toContain(indexName);
      });
    });
  });

  describe('User Operations', () => {
    test('Should create user with all required fields', async () => {
      const userData = {
        email: 'dbtest@example.com',
        name: 'Database Test User',
        password_hash: await bcrypt.hash('testpassword', 10),
        preferences: {
          theme: 'dark',
          notifications: { email: true, push: false }
        }
      };

      const result = await db.query(`
        INSERT INTO users (email, name, password_hash, preferences) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [userData.email, userData.name, userData.password_hash, JSON.stringify(userData.preferences)]);
      
      testUserId = result.rows[0].id;
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].email).toBe(userData.email);
      expect(result.rows[0].preferences.theme).toBe('dark');
      expect(result.rows[0]).toHaveProperty('created_at');
      expect(result.rows[0]).toHaveProperty('updated_at');
    });

    test('Should enforce unique email constraint', async () => {
      try {
        await db.query(`
          INSERT INTO users (email, name, password_hash) 
          VALUES ($1, $2, $3)
        `, ['dbtest@example.com', 'Duplicate User', 'hash']);
        
        fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.code).toBe('23505'); // PostgreSQL unique constraint violation
      }
    });

    test('Should update user preferences', async () => {
      const newPreferences = {
        theme: 'light',
        notifications: { email: false, push: true },
        feed_settings: { auto_refresh: false }
      };

      const result = await db.query(`
        UPDATE users 
        SET preferences = $1 
        WHERE id = $2 
        RETURNING preferences
      `, [JSON.stringify(newPreferences), testUserId]);
      
      expect(result.rows[0].preferences.theme).toBe('light');
      expect(result.rows[0].preferences.notifications.push).toBe(true);
    });

    test('Should handle JSONB queries on preferences', async () => {
      const result = await db.query(`
        SELECT * FROM users 
        WHERE preferences->>'theme' = $1
      `, ['light']);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].id).toBe(testUserId);
    });
  });

  describe('Feed Operations', () => {
    test('Should create feed with automation config', async () => {
      const feedData = {
        user_id: testUserId,
        name: 'Test Database Feed',
        url: 'https://example.com/db-test-feed.rss',
        feed_type: 'rss',
        automation_config: {
          enabled: true,
          triggers: ['new_item'],
          claude_flow_config: {
            swarm_topology: 'mesh',
            max_agents: 3
          }
        }
      };

      const result = await db.query(`
        INSERT INTO feeds (user_id, name, url, feed_type, automation_config) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [feedData.user_id, feedData.name, feedData.url, feedData.feed_type, 
          JSON.stringify(feedData.automation_config)]);
      
      testFeedId = result.rows[0].id;
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].name).toBe(feedData.name);
      expect(result.rows[0].automation_config.enabled).toBe(true);
      expect(result.rows[0].status).toBe('pending');
    });

    test('Should enforce feed URL uniqueness per user', async () => {
      try {
        await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4)
        `, [testUserId, 'Duplicate Feed', 'https://example.com/db-test-feed.rss', 'rss']);
        
        fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.code).toBe('23505');
      }
    });

    test('Should get feeds to fetch using stored function', async () => {
      // Update feed to be fetchable
      await db.query(`
        UPDATE feeds 
        SET status = 'active', last_fetched = NOW() - INTERVAL '2 hours' 
        WHERE id = $1
      `, [testFeedId]);

      const result = await db.query('SELECT * FROM get_feeds_to_fetch(10)');
      
      expect(Array.isArray(result.rows)).toBe(true);
      const testFeedFound = result.rows.find(row => row.feed_id === testFeedId);
      expect(testFeedFound).toBeDefined();
    });
  });

  describe('Feed Items Operations', () => {
    test('Should create feed items with content hashing', async () => {
      const itemData = {
        feed_id: testFeedId,
        title: 'Test Database Item',
        content: 'This is test content for database testing',
        url: 'https://example.com/item/1',
        author: 'Test Author',
        published_at: new Date(),
        metadata: { category: 'tech', tags: ['database', 'testing'] }
      };

      // Calculate content hash
      const hashResult = await db.query('SELECT calculate_content_hash($1) as hash', [itemData.content]);
      const contentHash = hashResult.rows[0].hash;

      const result = await db.query(`
        INSERT INTO feed_items 
        (feed_id, title, content, url, author, published_at, metadata, content_hash) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [itemData.feed_id, itemData.title, itemData.content, itemData.url, 
          itemData.author, itemData.published_at, JSON.stringify(itemData.metadata), contentHash]);
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].title).toBe(itemData.title);
      expect(result.rows[0].content_hash).toBe(contentHash);
      expect(result.rows[0].metadata.category).toBe('tech');
    });

    test('Should prevent duplicate content using hash', async () => {
      const content = 'This is duplicate content';
      const hashResult = await db.query('SELECT calculate_content_hash($1) as hash', [content]);
      const contentHash = hashResult.rows[0].hash;

      // Insert first item
      await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5)
      `, [testFeedId, 'First Item', content, 'https://example.com/first', contentHash]);

      // Try to insert duplicate
      try {
        await db.query(`
          INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
          VALUES ($1, $2, $3, $4, $5)
        `, [testFeedId, 'Duplicate Item', content, 'https://example.com/duplicate', contentHash]);
        
        fail('Should have thrown unique constraint error');
      } catch (error) {
        expect(error.code).toBe('23505');
      }
    });

    test('Should support full-text search on items', async () => {
      // Insert searchable content
      await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5)
      `, [testFeedId, 'Machine Learning Article', 
          'This article discusses advanced machine learning algorithms and neural networks', 
          'https://example.com/ml-article', 'mlhash123']);

      // Search by title
      const titleResult = await db.query(`
        SELECT * FROM feed_items 
        WHERE to_tsvector('english', title) @@ plainto_tsquery('english', $1)
      `, ['machine learning']);
      
      expect(titleResult.rows.length).toBeGreaterThan(0);
      expect(titleResult.rows[0].title).toContain('Machine Learning');

      // Search by content
      const contentResult = await db.query(`
        SELECT * FROM feed_items 
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
      `, ['neural networks']);
      
      expect(contentResult.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Claude Flow Session Operations', () => {
    test('Should create Claude Flow session with metrics', async () => {
      const sessionData = {
        user_id: testUserId,
        swarm_id: 'test-swarm-' + Date.now(),
        configuration: {
          topology: 'hierarchical',
          max_agents: 5,
          strategy: 'adaptive'
        },
        metrics: {
          agents_spawned: 0,
          tasks_completed: 0,
          total_tokens_used: 0,
          performance_score: 0.0
        }
      };

      const result = await db.query(`
        INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration, metrics) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [sessionData.user_id, sessionData.swarm_id, 
          JSON.stringify(sessionData.configuration), JSON.stringify(sessionData.metrics)]);
      
      testSessionId = result.rows[0].id;
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].swarm_id).toBe(sessionData.swarm_id);
      expect(result.rows[0].configuration.topology).toBe('hierarchical');
      expect(result.rows[0].status).toBe('initializing');
    });

    test('Should update session metrics', async () => {
      const updatedMetrics = {
        agents_spawned: 3,
        tasks_completed: 5,
        total_tokens_used: 1500,
        performance_score: 0.85,
        neural_patterns_learned: 2
      };

      const result = await db.query(`
        UPDATE claude_flow_sessions 
        SET metrics = $1, status = 'active' 
        WHERE id = $2 
        RETURNING *
      `, [JSON.stringify(updatedMetrics), testSessionId]);
      
      expect(result.rows[0].metrics.agents_spawned).toBe(3);
      expect(result.rows[0].metrics.performance_score).toBe(0.85);
      expect(result.rows[0].status).toBe('active');
    });
  });

  describe('Neural Patterns Operations', () => {
    test('Should create neural patterns with confidence scoring', async () => {
      const patternData = {
        feed_id: testFeedId,
        session_id: testSessionId,
        pattern_type: 'optimization',
        pattern_data: {
          algorithm: 'gradient_descent',
          parameters: { learning_rate: 0.01, epochs: 100 },
          results: { accuracy: 0.95, loss: 0.05 }
        },
        confidence_score: 0.92
      };

      const result = await db.query(`
        INSERT INTO neural_patterns 
        (feed_id, session_id, pattern_type, pattern_data, confidence_score) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [patternData.feed_id, patternData.session_id, patternData.pattern_type, 
          JSON.stringify(patternData.pattern_data), patternData.confidence_score]);
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].pattern_type).toBe('optimization');
      expect(result.rows[0].confidence_score).toBe('0.9200');
      expect(result.rows[0].pattern_data.algorithm).toBe('gradient_descent');
    });

    test('Should query patterns by confidence threshold', async () => {
      const result = await db.query(`
        SELECT * FROM neural_patterns 
        WHERE confidence_score >= $1 
        ORDER BY confidence_score DESC
      `, [0.9]);
      
      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(parseFloat(row.confidence_score)).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('Automation Operations', () => {
    test('Should create automation triggers and actions', async () => {
      // Create trigger
      const triggerResult = await db.query(`
        INSERT INTO automation_triggers 
        (feed_id, name, trigger_type, conditions) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [testFeedId, 'Keyword Trigger', 'keyword_match', 
          JSON.stringify({ keywords: ['AI', 'ML'], match_type: 'any' })]);
      
      expect(triggerResult.rows[0]).toHaveProperty('id');
      expect(triggerResult.rows[0].name).toBe('Keyword Trigger');
      
      // Create action
      const actionResult = await db.query(`
        INSERT INTO automation_actions 
        (feed_id, name, action_type, config) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [testFeedId, 'Claude Flow Action', 'claude_flow_spawn', 
          JSON.stringify({ agent_type: 'analyzer', task: 'sentiment_analysis' })]);
      
      expect(actionResult.rows[0]).toHaveProperty('id');
      expect(actionResult.rows[0].action_type).toBe('claude_flow_spawn');
    });

    test('Should create automation results', async () => {
      // First create a feed item
      const itemResult = await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [testFeedId, 'Auto Test Item', 'Content for automation', 
          'https://example.com/auto-item', 'autohash123']);
      
      const feedItemId = itemResult.rows[0].id;
      
      // Create automation result
      const resultData = {
        feed_item_id: feedItemId,
        trigger_id: 'trigger-123',
        action_id: 'action-456',
        status: 'completed',
        result_data: {
          sentiment: 'positive',
          confidence: 0.89,
          keywords_found: ['AI']
        }
      };

      const result = await db.query(`
        INSERT INTO automation_results 
        (feed_item_id, trigger_id, action_id, status, result_data) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [resultData.feed_item_id, resultData.trigger_id, resultData.action_id, 
          resultData.status, JSON.stringify(resultData.result_data)]);
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].status).toBe('completed');
      expect(result.rows[0].result_data.sentiment).toBe('positive');
    });
  });

  describe('Session Management', () => {
    test('Should manage user sessions with expiration', async () => {
      const sessionData = {
        user_id: testUserId,
        refresh_token: 'test-refresh-token-' + Date.now(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        user_agent: 'Test Browser',
        ip_address: '127.0.0.1'
      };

      const result = await db.query(`
        INSERT INTO user_sessions 
        (user_id, refresh_token, expires_at, user_agent, ip_address) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [sessionData.user_id, sessionData.refresh_token, sessionData.expires_at, 
          sessionData.user_agent, sessionData.ip_address]);
      
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0].refresh_token).toBe(sessionData.refresh_token);
      expect(result.rows[0].ip_address).toBe(sessionData.ip_address);
    });

    test('Should cleanup expired sessions', async () => {
      // Create expired session
      await db.query(`
        INSERT INTO user_sessions 
        (user_id, refresh_token, expires_at) 
        VALUES ($1, $2, $3)
      `, [testUserId, 'expired-token', new Date(Date.now() - 1000)]);

      // Run cleanup function
      const cleanupResult = await db.query('SELECT cleanup_expired_sessions() as deleted_count');
      
      expect(cleanupResult.rows[0].deleted_count).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity and Constraints', () => {
    test('Should enforce foreign key constraints', async () => {
      try {
        await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4)
        `, ['non-existent-user-id', 'Invalid Feed', 'https://example.com', 'rss']);
        
        fail('Should have thrown foreign key constraint error');
      } catch (error) {
        expect(error.code).toBe('23503'); // Foreign key violation
      }
    });

    test('Should enforce check constraints', async () => {
      try {
        await db.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4)
        `, [testUserId, 'Invalid Feed Type', 'https://example.com', 'invalid_type']);
        
        fail('Should have thrown check constraint error');
      } catch (error) {
        expect(error.code).toBe('23514'); // Check violation
      }
    });

    test('Should update timestamps automatically', async () => {
      const beforeUpdate = new Date();
      
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      await db.query(`
        UPDATE users 
        SET name = 'Updated Name' 
        WHERE id = $1
      `, [testUserId]);

      const result = await db.query(`
        SELECT updated_at FROM users WHERE id = $1
      `, [testUserId]);
      
      expect(new Date(result.rows[0].updated_at)).toBeGreaterThan(beforeUpdate);
    });
  });

  describe('Performance and Indexing', () => {
    test('Should use indexes for common queries', async () => {
      // Test index usage with EXPLAIN
      const explainResult = await db.query(`
        EXPLAIN (FORMAT JSON) 
        SELECT * FROM feeds WHERE user_id = $1
      `, [testUserId]);
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      expect(plan.Plan.Node_Type).toContain('Index');
    });

    test('Should perform well with JSONB queries', async () => {
      const start = Date.now();
      
      await db.query(`
        SELECT * FROM users 
        WHERE preferences->'notifications'->>'email' = 'false'
      `);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast with GIN index
    });
  });

  describe('Transaction Support', () => {
    test('Should support atomic transactions', async () => {
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert feed
        const feedResult = await client.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [testUserId, 'Transaction Feed', 'https://example.com/tx-feed.rss', 'rss']);
        
        const feedId = feedResult.rows[0].id;
        
        // Insert feed item
        await client.query(`
          INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
          VALUES ($1, $2, $3, $4, $5)
        `, [feedId, 'Transaction Item', 'Content', 'https://example.com/tx-item', 'txhash']);
        
        await client.query('COMMIT');
        
        // Verify both were inserted
        const checkFeed = await db.query('SELECT * FROM feeds WHERE id = $1', [feedId]);
        const checkItem = await db.query('SELECT * FROM feed_items WHERE feed_id = $1', [feedId]);
        
        expect(checkFeed.rows.length).toBe(1);
        expect(checkItem.rows.length).toBe(1);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    test('Should rollback on error', async () => {
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Valid insert
        await client.query(`
          INSERT INTO feeds (user_id, name, url, feed_type) 
          VALUES ($1, $2, $3, $4)
        `, [testUserId, 'Rollback Feed', 'https://example.com/rollback-feed.rss', 'rss']);
        
        // Invalid insert (duplicate email)
        await client.query(`
          INSERT INTO users (email, name, password_hash) 
          VALUES ($1, $2, $3)
        `, ['dbtest@example.com', 'Duplicate', 'hash']);
        
        await client.query('COMMIT');
        
        fail('Should have thrown error');
        
      } catch (error) {
        await client.query('ROLLBACK');
        
        // Verify rollback - feed should not exist
        const checkFeed = await db.query(`
          SELECT * FROM feeds 
          WHERE name = 'Rollback Feed' AND user_id = $1
        `, [testUserId]);
        
        expect(checkFeed.rows.length).toBe(0);
        
      } finally {
        client.release();
      }
    });
  });
});
