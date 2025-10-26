/**
 * TokenAnalyticsWriter Cache Token Tests
 *
 * London School TDD tests for cache token tracking in TokenAnalyticsWriter.
 *
 * Test Philosophy:
 * - Mock-driven development (London School)
 * - Test interactions and collaborations
 * - Verify contracts between TokenAnalyticsWriter and database
 * - Focus on cache token extraction and storage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { TokenAnalyticsWriter } from '../TokenAnalyticsWriter.js';

const TEST_DB_PATH = join(process.cwd(), 'tests', 'integration', 'test-token-analytics-cache.db');

describe('TokenAnalyticsWriter - Cache Token Tracking', () => {
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
    `);

    // Initialize writer with test database
    writer = new TokenAnalyticsWriter(db);
  });

  afterEach(() => {
    // Close database connection
    if (db) {
      db.close();
    }

    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Cache Token Extraction', () => {
    it('should extract cache_read_input_tokens from SDK response', () => {
      // Arrange: Mock SDK response with cache_read tokens
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 5000,
            cache_creation_input_tokens: 0
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];
      const sessionId = randomUUID();

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(messages, sessionId);

      // Assert: Verify cache_read tokens extracted
      expect(metrics).toBeDefined();
      expect(metrics.cacheReadTokens).toBe(5000);
      expect(metrics.sessionId).toBe(sessionId);
    });

    it('should extract cache_creation_input_tokens from SDK response', () => {
      // Arrange: Mock SDK response with cache_creation tokens
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 0,
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
      const sessionId = randomUUID();

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(messages, sessionId);

      // Assert: Verify cache_creation tokens extracted
      expect(metrics).toBeDefined();
      expect(metrics.cacheCreationTokens).toBe(3000);
    });

    it('should default to 0 when cache tokens not in SDK response', () => {
      // Arrange: Mock SDK response WITHOUT cache tokens
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];
      const sessionId = randomUUID();

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(messages, sessionId);

      // Assert: Verify cache tokens default to 0
      expect(metrics).toBeDefined();
      expect(metrics.cacheReadTokens).toBe(0);
      expect(metrics.cacheCreationTokens).toBe(0);
    });

    it('should handle large cache token values (millions)', () => {
      // Arrange: Mock SDK response with very large cache token counts
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 5000000, // 5 million
            cache_creation_input_tokens: 3000000 // 3 million
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];
      const sessionId = randomUUID();

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(messages, sessionId);

      // Assert: Verify large values handled correctly
      expect(metrics).toBeDefined();
      expect(metrics.cacheReadTokens).toBe(5000000);
      expect(metrics.cacheCreationTokens).toBe(3000000);
    });

    it('should handle null/undefined cache token values', () => {
      // Arrange: Mock SDK response with null/undefined cache tokens
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: null,
            cache_creation_input_tokens: undefined
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          }
        }
      ];
      const sessionId = randomUUID();

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(messages, sessionId);

      // Assert: Verify null/undefined handled gracefully
      expect(metrics).toBeDefined();
      expect(metrics.cacheReadTokens).toBe(0);
      expect(metrics.cacheCreationTokens).toBe(0);
    });
  });

  describe('Database Write Operations', () => {
    it('should include cacheReadTokens in INSERT statement', async () => {
      // Arrange: Prepare metrics with cache tokens
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

      // Act: Write to database
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert: Verify cacheReadTokens column populated
      const record = db.prepare(
        'SELECT cacheReadTokens FROM token_analytics WHERE sessionId = ?'
      ).get(sessionId);

      expect(record).toBeDefined();
      expect(record.cacheReadTokens).toBe(5000);
    });

    it('should include cacheCreationTokens in INSERT statement', async () => {
      // Arrange: Prepare metrics with cache tokens
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

      // Act: Write to database
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert: Verify cacheCreationTokens column populated
      const record = db.prepare(
        'SELECT cacheCreationTokens FROM token_analytics WHERE sessionId = ?'
      ).get(sessionId);

      expect(record).toBeDefined();
      expect(record.cacheCreationTokens).toBe(3000);
    });

    it('should write all token types to database record', async () => {
      // Arrange: Prepare comprehensive metrics
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

      // Act: Write to database
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert: Verify ALL token types in database
      const record = db.prepare(`
        SELECT inputTokens, outputTokens, totalTokens,
               cacheReadTokens, cacheCreationTokens
        FROM token_analytics
        WHERE sessionId = ?
      `).get(sessionId);

      expect(record).toBeDefined();
      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
      expect(record.totalTokens).toBe(1500);
      expect(record.cacheReadTokens).toBe(5000);
      expect(record.cacheCreationTokens).toBe(3000);
    });
  });

  describe('Cost Calculation', () => {
    it('should include cache tokens in cost calculation', () => {
      // Arrange: Metrics with all token types
      const metrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 5000,
        cacheCreationTokens: 3000
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Verify cost includes all token types
      // Input: 1000 * $0.003 / 1000 = $0.003
      // Output: 500 * $0.015 / 1000 = $0.0075
      // Cache Read: 5000 * $0.0003 / 1000 = $0.0015
      // Cache Creation: 3000 * $0.003 / 1000 = $0.009
      // Total: $0.021
      const expectedCost = 0.003 + 0.0075 + 0.0015 + 0.009;
      expect(cost).toBeCloseTo(expectedCost, 6);
    });

    it('should calculate cost correctly with only cache_read tokens', () => {
      // Arrange: Metrics with only cache_read tokens (warm cache scenario)
      const metrics = {
        inputTokens: 0,
        outputTokens: 500,
        cacheReadTokens: 10000,
        cacheCreationTokens: 0
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Verify cost uses cache_read pricing
      // Cache Read: 10000 * $0.0003 / 1000 = $0.003
      // Output: 500 * $0.015 / 1000 = $0.0075
      // Total: $0.0105
      const expectedCost = 0.003 + 0.0075;
      expect(cost).toBeCloseTo(expectedCost, 6);
    });
  });
});
