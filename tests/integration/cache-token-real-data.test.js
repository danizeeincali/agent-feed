/**
 * Cache Token Real Data Tests
 *
 * London School TDD tests using actual SDK response structures.
 *
 * Test Philosophy:
 * - Use real-world SDK response formats
 * - Verify end-to-end data flow from SDK to database
 * - Validate against actual Anthropic pricing
 * - Test complete integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { TokenAnalyticsWriter } from '../../src/services/TokenAnalyticsWriter.js';

const TEST_DB_PATH = join(process.cwd(), 'tests', 'integration', 'test-real-data.db');

describe('Cache Token Real Data Integration', () => {
  let db;
  let writer;

  beforeEach(() => {
    // Create fresh database for each test
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }

    db = new Database(TEST_DB_PATH);

    // Create token_analytics table
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
        cacheReadTokens INTEGER DEFAULT 0,
        cacheCreationTokens INTEGER DEFAULT 0
      );
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

  describe('Real SDK Response Processing', () => {
    it('should process real SDK response with cache tokens', async () => {
      // Arrange: Actual SDK response structure from Claude Code SDK
      const sessionId = randomUUID();
      const realSDKResponse = [
        {
          type: 'progress',
          index: 0,
          delta: 'Starting conversation...'
        },
        {
          type: 'result',
          usage: {
            input_tokens: 2847,
            output_tokens: 1523,
            cache_read_input_tokens: 12459,
            cache_creation_input_tokens: 5234
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 2847,
              output_tokens: 1523,
              cache_read_input_tokens: 12459,
              cache_creation_input_tokens: 5234
            }
          },
          total_cost_usd: 0.053,
          duration_ms: 4567,
          num_turns: 3
        }
      ];

      // Act: Process SDK response
      await writer.writeTokenMetrics(realSDKResponse, sessionId);

      // Assert: Verify all data extracted and stored
      const record = db.prepare(`
        SELECT * FROM token_analytics WHERE sessionId = ?
      `).get(sessionId);

      expect(record).toBeDefined();
      expect(record.sessionId).toBe(sessionId);
      expect(record.inputTokens).toBe(2847);
      expect(record.outputTokens).toBe(1523);
      expect(record.cacheReadTokens).toBe(12459);
      expect(record.cacheCreationTokens).toBe(5234);
      expect(record.model).toBe('claude-sonnet-4-20250514');
    });

    it('should extract all token types from complex SDK response', () => {
      // Arrange: Complex SDK response with multiple message types
      const sessionId = randomUUID();
      const complexResponse = [
        { type: 'start', timestamp: Date.now() },
        { type: 'progress', index: 0, delta: 'Thinking...' },
        { type: 'progress', index: 1, delta: 'Processing...' },
        {
          type: 'result',
          usage: {
            input_tokens: 1847,
            output_tokens: 923,
            cache_read_input_tokens: 8234,
            cache_creation_input_tokens: 3456
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1847,
              output_tokens: 923
            }
          }
        },
        { type: 'end', timestamp: Date.now() }
      ];

      // Act: Extract metrics
      const metrics = writer.extractMetricsFromSDK(complexResponse, sessionId);

      // Assert: Verify extraction from complex response
      expect(metrics).toBeDefined();
      expect(metrics.inputTokens).toBe(1847);
      expect(metrics.outputTokens).toBe(923);
      expect(metrics.cacheReadTokens).toBe(8234);
      expect(metrics.cacheCreationTokens).toBe(3456);
      expect(metrics.totalTokens).toBe(2770); // input + output
    });
  });

  describe('Database Round-Trip Validation', () => {
    it('should save and retrieve all token values correctly', async () => {
      // Arrange: Real-world token counts
      const sessionId = randomUUID();
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 3245,
            output_tokens: 1876,
            cache_read_input_tokens: 15678,
            cache_creation_input_tokens: 7890
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 3245,
              output_tokens: 1876
            }
          }
        }
      ];

      // Act: Write and read back
      await writer.writeTokenMetrics(messages, sessionId);

      const record = db.prepare(`
        SELECT inputTokens, outputTokens, totalTokens,
               cacheReadTokens, cacheCreationTokens
        FROM token_analytics
        WHERE sessionId = ?
      `).get(sessionId);

      // Assert: Verify exact values preserved
      expect(record.inputTokens).toBe(3245);
      expect(record.outputTokens).toBe(1876);
      expect(record.totalTokens).toBe(5121);
      expect(record.cacheReadTokens).toBe(15678);
      expect(record.cacheCreationTokens).toBe(7890);
    });

    it('should retrieve all token values in single query', async () => {
      // Arrange: Write multiple records
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const sessionId = randomUUID();
        sessions.push(sessionId);

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

      // Act: Query all records
      const records = db.prepare(`
        SELECT sessionId, inputTokens, outputTokens,
               cacheReadTokens, cacheCreationTokens
        FROM token_analytics
        ORDER BY inputTokens
      `).all();

      // Assert: Verify all records retrieved with cache tokens
      expect(records).toHaveLength(5);
      records.forEach((record, index) => {
        expect(record.inputTokens).toBe(1000 * (index + 1));
        expect(record.cacheReadTokens).toBe(5000 * (index + 1));
        expect(record.cacheCreationTokens).toBe(2000 * (index + 1));
      });
    });
  });

  describe('Anthropic Pricing Validation', () => {
    it('should match Anthropic pricing calculation', async () => {
      // Arrange: Real usage from production scenario
      const sessionId = randomUUID();
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 2500,
            output_tokens: 1200,
            cache_read_input_tokens: 10000,
            cache_creation_input_tokens: 5000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 2500,
              output_tokens: 1200
            }
          }
        }
      ];

      // Act: Write to database
      await writer.writeTokenMetrics(messages, sessionId);

      // Retrieve cost
      const record = db.prepare(
        'SELECT estimatedCost FROM token_analytics WHERE sessionId = ?'
      ).get(sessionId);

      // Assert: Verify against Anthropic pricing
      // Input: 2500 * $3.00 / 1M = $0.0075
      // Output: 1200 * $15.00 / 1M = $0.018
      // Cache Read: 10000 * $0.30 / 1M = $0.003
      // Cache Creation: 5000 * $3.00 / 1M = $0.015
      // Total: $0.0435
      const anthropicPricing = {
        input: (2500 * 3.00) / 1000000,
        output: (1200 * 15.00) / 1000000,
        cacheRead: (10000 * 0.30) / 1000000,
        cacheCreation: (5000 * 3.00) / 1000000
      };

      const expectedTotal = Object.values(anthropicPricing).reduce((a, b) => a + b, 0);

      expect(record.estimatedCost).toBeCloseTo(expectedTotal, 6);
      expect(record.estimatedCost).toBeCloseTo(0.0435, 6);
    });

    it('should calculate aggregated costs for analytics dashboard', async () => {
      // Arrange: Simulate multiple API calls over a session
      const baseSessionId = randomUUID();
      const apiCalls = [
        { input: 1000, output: 500, cacheRead: 5000, cacheCreation: 2000 },
        { input: 800, output: 400, cacheRead: 7000, cacheCreation: 0 },
        { input: 0, output: 300, cacheRead: 10000, cacheCreation: 0 },
        { input: 1200, output: 600, cacheRead: 3000, cacheCreation: 1500 }
      ];

      // Act: Write all records
      for (const [index, call] of apiCalls.entries()) {
        const messages = [
          {
            type: 'result',
            usage: {
              input_tokens: call.input,
              output_tokens: call.output,
              cache_read_input_tokens: call.cacheRead,
              cache_creation_input_tokens: call.cacheCreation
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                input_tokens: call.input,
                output_tokens: call.output
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, `${baseSessionId}-${index}`);
      }

      // Query aggregated totals
      const totals = db.prepare(`
        SELECT
          SUM(inputTokens) as totalInput,
          SUM(outputTokens) as totalOutput,
          SUM(cacheReadTokens) as totalCacheRead,
          SUM(cacheCreationTokens) as totalCacheCreation,
          SUM(estimatedCost) as totalCost
        FROM token_analytics
        WHERE sessionId LIKE ?
      `).get(`${baseSessionId}%`);

      // Assert: Verify aggregated totals
      expect(totals.totalInput).toBe(3000);
      expect(totals.totalOutput).toBe(1800);
      expect(totals.totalCacheRead).toBe(25000);
      expect(totals.totalCacheCreation).toBe(3500);

      // Verify total cost is sum of individual costs
      const individualCosts = db.prepare(`
        SELECT estimatedCost FROM token_analytics WHERE sessionId LIKE ?
      `).all(`${baseSessionId}%`);

      const manualTotal = individualCosts.reduce((sum, record) => sum + record.estimatedCost, 0);
      expect(totals.totalCost).toBeCloseTo(manualTotal, 6);
    });
  });
});
