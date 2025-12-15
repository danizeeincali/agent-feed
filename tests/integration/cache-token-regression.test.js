/**
 * Cache Token Regression Tests
 *
 * London School TDD tests for ensuring backward compatibility and
 * no performance degradation after adding cache token tracking.
 *
 * Test Philosophy:
 * - Verify existing functionality still works
 * - Ensure no performance regression
 * - Validate backward compatibility
 * - Test that old queries still work with new schema
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { TokenAnalyticsWriter } from '../../src/services/TokenAnalyticsWriter.js';

const TEST_DB_PATH = join(process.cwd(), 'tests', 'integration', 'test-regression.db');

describe('Cache Token Regression Tests', () => {
  let db;
  let writer;

  beforeEach(() => {
    // Create fresh database for each test
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }

    db = new Database(TEST_DB_PATH);

    // Create token_analytics table with cache columns
    db.exec(`
      CREATE TABLE token_analytics (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        operation TEXT NOT NULL,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        estimatedCost REAL NOT NULL,
        model TEXT NOT NULL,
        userId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cacheReadTokens INTEGER DEFAULT 0,
        cacheCreationTokens INTEGER DEFAULT 0
      );

      CREATE INDEX idx_analytics_session ON token_analytics(sessionId);
      CREATE INDEX idx_analytics_timestamp ON token_analytics(timestamp);
    `);

    writer = new TokenAnalyticsWriter(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Backward Compatibility', () => {
    it('should support legacy queries without cache token columns', async () => {
      // Arrange: Write records with cache tokens
      const sessionId = randomUUID();
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 5000,
            cache_creation_input_tokens: 3000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];

      await writer.writeTokenMetrics(messages, sessionId);

      // Act: Run legacy query (no cache columns)
      const legacyQuery = db.prepare(`
        SELECT sessionId, inputTokens, outputTokens, totalTokens, estimatedCost
        FROM token_analytics
        WHERE sessionId = ?
      `).get(sessionId);

      // Assert: Legacy query still works
      expect(legacyQuery).toBeDefined();
      expect(legacyQuery.inputTokens).toBe(1000);
      expect(legacyQuery.outputTokens).toBe(500);
      expect(legacyQuery.totalTokens).toBe(1500);
      expect(legacyQuery.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle SDK responses without cache tokens (pre-cache API)', async () => {
      // Arrange: Old SDK response format (no cache tokens)
      const sessionId = randomUUID();
      const oldFormatMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
            // No cache_read_input_tokens or cache_creation_input_tokens
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];

      // Act: Process old format
      await writer.writeTokenMetrics(oldFormatMessages, sessionId);

      // Assert: Record created with cache tokens defaulted to 0
      const record = db.prepare(`
        SELECT inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens
        FROM token_analytics
        WHERE sessionId = ?
      `).get(sessionId);

      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
      expect(record.cacheReadTokens).toBe(0);
      expect(record.cacheCreationTokens).toBe(0);
    });

    it('should support historical data queries', async () => {
      // Arrange: Mix of old (no cache) and new (with cache) records
      const oldSessionId = randomUUID();
      const newSessionId = randomUUID();

      // Old record (insert manually without cache tokens)
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        new Date().toISOString(),
        oldSessionId,
        'old_operation',
        'claude-sonnet-4-20250514',
        1000,
        500,
        1500,
        0.0105
      );

      // New record (with cache tokens)
      const newMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 5000,
            cache_creation_input_tokens: 3000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];

      await writer.writeTokenMetrics(newMessages, newSessionId);

      // Act: Query both records
      const allRecords = db.prepare(`
        SELECT sessionId, inputTokens, outputTokens,
               COALESCE(cacheReadTokens, 0) as cacheRead,
               COALESCE(cacheCreationTokens, 0) as cacheCreation
        FROM token_analytics
      `).all();

      // Assert: Both records queryable
      expect(allRecords).toHaveLength(2);

      const oldRecord = allRecords.find(r => r.sessionId === oldSessionId);
      const newRecord = allRecords.find(r => r.sessionId === newSessionId);

      expect(oldRecord.cacheRead).toBe(0);
      expect(oldRecord.cacheCreation).toBe(0);
      expect(newRecord.cacheRead).toBe(5000);
      expect(newRecord.cacheCreation).toBe(3000);
    });
  });

  describe('Cost Tracking API Compatibility', () => {
    it('should return correct totals for analytics endpoint', async () => {
      // Arrange: Write multiple records
      for (let i = 0; i < 5; i++) {
        const messages = [
          {
            type: 'result',
            usage: {
              input_tokens: 1000,
              output_tokens: 500,
              cache_read_input_tokens: 2000,
              cache_creation_input_tokens: 1000
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                input_tokens: 1000,
                output_tokens: 500
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, randomUUID());
      }

      // Act: Query analytics totals (common API pattern)
      const totals = db.prepare(`
        SELECT
          COUNT(*) as totalRequests,
          SUM(inputTokens) as totalInput,
          SUM(outputTokens) as totalOutput,
          SUM(totalTokens) as totalTokens,
          SUM(estimatedCost) as totalCost,
          AVG(estimatedCost) as avgCost
        FROM token_analytics
      `).get();

      // Assert: Analytics endpoint returns correct data
      expect(totals.totalRequests).toBe(5);
      expect(totals.totalInput).toBe(5000);
      expect(totals.totalOutput).toBe(2500);
      expect(totals.totalTokens).toBe(7500);
      expect(totals.totalCost).toBeGreaterThan(0);
      expect(totals.avgCost).toBeCloseTo(totals.totalCost / 5, 6);
    });

    it('should support cost-by-session analytics', async () => {
      // Arrange: Multiple sessions with different usage
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const sessionId = `session-${i}`;
        sessions.push(sessionId);

        // Write multiple calls per session
        for (let j = 0; j < 3; j++) {
          const messages = [
            {
              type: 'result',
              usage: {
                input_tokens: 1000 * (i + 1),
                output_tokens: 500 * (i + 1),
                cache_read_input_tokens: 5000 * (i + 1),
                cache_creation_input_tokens: 2000 * (i + 1)
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {
                  input_tokens: 1000 * (i + 1),
                  output_tokens: 500 * (i + 1)
                }
              }
            }
          ];

          await writer.writeTokenMetrics(messages, sessionId);
        }
      }

      // Act: Query cost by session
      const sessionCosts = db.prepare(`
        SELECT
          sessionId,
          COUNT(*) as requestCount,
          SUM(estimatedCost) as totalCost,
          SUM(inputTokens) as totalInput,
          SUM(cacheReadTokens) as totalCacheRead
        FROM token_analytics
        GROUP BY sessionId
        ORDER BY sessionId
      `).all();

      // Assert: Session-level analytics work
      expect(sessionCosts).toHaveLength(3);
      sessionCosts.forEach((session, index) => {
        expect(session.requestCount).toBe(3);
        expect(session.totalInput).toBe(3000 * (index + 1));
        expect(session.totalCacheRead).toBe(15000 * (index + 1));
      });
    });
  });

  describe('Performance Regression', () => {
    it('should have minimal performance impact (<1ms per write)', async () => {
      // Arrange: Prepare test data
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 5000,
            cache_creation_input_tokens: 3000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];

      // Act: Measure write performance
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await writer.writeTokenMetrics(messages, randomUUID());
      }

      const endTime = performance.now();
      const avgTimePerWrite = (endTime - startTime) / iterations;

      // Assert: Performance acceptable (<1ms per write)
      expect(avgTimePerWrite).toBeLessThan(1.0);

      // Verify all records written
      const count = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
      expect(count.count).toBe(iterations);
    });

    it('should maintain query performance with cache columns', () => {
      // Arrange: Insert test data
      for (let i = 0; i < 1000; i++) {
        const stmt = db.prepare(`
          INSERT INTO token_analytics (
            id, timestamp, sessionId, operation, model,
            inputTokens, outputTokens, totalTokens, estimatedCost,
            cacheReadTokens, cacheCreationTokens
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          randomUUID(),
          new Date().toISOString(),
          `session-${i % 10}`,
          'test_operation',
          'claude-sonnet-4-20250514',
          1000,
          500,
          1500,
          0.0105,
          5000,
          3000
        );
      }

      // Act: Measure query performance
      const queries = [
        // Legacy query (no cache columns)
        () => db.prepare('SELECT inputTokens, outputTokens FROM token_analytics LIMIT 100').all(),

        // New query (with cache columns)
        () => db.prepare('SELECT inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens FROM token_analytics LIMIT 100').all(),

        // Aggregation query
        () => db.prepare('SELECT SUM(inputTokens), SUM(cacheReadTokens) FROM token_analytics').get(),

        // Session query
        () => db.prepare('SELECT * FROM token_analytics WHERE sessionId = ?').all('session-5')
      ];

      const queryTimes = queries.map(queryFn => {
        const start = performance.now();
        queryFn();
        return performance.now() - start;
      });

      // Assert: All queries complete quickly (<3ms)
      queryTimes.forEach(time => {
        expect(time).toBeLessThan(3.0);
      });
    });
  });

  describe('Index Performance', () => {
    it('should use existing indexes efficiently with new columns', () => {
      // Arrange: Insert test data
      const sessionId = randomUUID();
      for (let i = 0; i < 100; i++) {
        const stmt = db.prepare(`
          INSERT INTO token_analytics (
            id, timestamp, sessionId, operation, model,
            inputTokens, outputTokens, totalTokens, estimatedCost,
            cacheReadTokens, cacheCreationTokens
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          randomUUID(),
          new Date(Date.now() - i * 1000).toISOString(),
          i % 2 === 0 ? sessionId : randomUUID(),
          'test_operation',
          'claude-sonnet-4-20250514',
          1000,
          500,
          1500,
          0.0105,
          5000,
          3000
        );
      }

      // Act: Query using indexed columns
      const indexedQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM token_analytics
        WHERE sessionId = ?
      `).get(sessionId);

      // Assert: Index still works efficiently
      expect(indexedQuery.count).toBe(50);

      // Verify query plan uses index
      const queryPlan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM token_analytics WHERE sessionId = ?
      `).all(sessionId);

      const usesIndex = queryPlan.some(row =>
        row.detail && row.detail.includes('idx_analytics_session')
      );

      expect(usesIndex).toBe(true);
    });
  });
});
