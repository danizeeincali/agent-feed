/**
 * Cache Token Cost Validation Tests
 *
 * London School TDD tests for validating cost calculations with cache tokens.
 *
 * Test Philosophy:
 * - Verify cost calculations match Anthropic pricing
 * - Test edge cases and boundary conditions
 * - Validate database-stored costs against manual calculations
 * - Ensure cost accuracy within acceptable tolerance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { TokenAnalyticsWriter } from '../../src/services/TokenAnalyticsWriter.js';

const TEST_DB_PATH = join(process.cwd(), 'tests', 'integration', 'test-cost-validation.db');

// Anthropic Claude Sonnet 4 Pricing (per 1,000 tokens)
const PRICING = {
  input: 0.003,        // $3.00 per million
  output: 0.015,       // $15.00 per million
  cacheRead: 0.0003,   // $0.30 per million (90% discount)
  cacheCreation: 0.003 // $3.00 per million (same as input)
};

describe('Cache Token Cost Validation', () => {
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

  describe('Cache Read Token Pricing', () => {
    it('should calculate cost with cache_read tokens at $0.0003 per 1K', () => {
      // Arrange: Metrics with cache_read tokens
      const metrics = {
        inputTokens: 0,
        outputTokens: 1000,
        cacheReadTokens: 10000, // 10K tokens
        cacheCreationTokens: 0
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Verify cache_read pricing
      // Cache Read: 10000 * $0.0003 / 1000 = $0.003
      // Output: 1000 * $0.015 / 1000 = $0.015
      // Total: $0.018
      const expectedCacheReadCost = (10000 * PRICING.cacheRead) / 1000;
      const expectedOutputCost = (1000 * PRICING.output) / 1000;
      const expectedTotal = expectedCacheReadCost + expectedOutputCost;

      expect(cost).toBeCloseTo(expectedTotal, 6);
      expect(cost).toBeCloseTo(0.018, 6);
    });

    it('should calculate cost with cache_creation tokens at $0.003 per 1K', () => {
      // Arrange: Metrics with cache_creation tokens
      const metrics = {
        inputTokens: 0,
        outputTokens: 1000,
        cacheReadTokens: 0,
        cacheCreationTokens: 5000 // 5K tokens
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Verify cache_creation pricing (same as input)
      // Cache Creation: 5000 * $0.003 / 1000 = $0.015
      // Output: 1000 * $0.015 / 1000 = $0.015
      // Total: $0.030
      const expectedCacheCreationCost = (5000 * PRICING.cacheCreation) / 1000;
      const expectedOutputCost = (1000 * PRICING.output) / 1000;
      const expectedTotal = expectedCacheCreationCost + expectedOutputCost;

      expect(cost).toBeCloseTo(expectedTotal, 6);
      expect(cost).toBeCloseTo(0.030, 6);
    });
  });

  describe('Combined Cost Calculations', () => {
    it('should calculate total cost with all token types (input + output + cache_read + cache_creation)', () => {
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

      // Assert: Manual calculation for verification
      const inputCost = (1000 * PRICING.input) / 1000;           // $0.003
      const outputCost = (500 * PRICING.output) / 1000;          // $0.0075
      const cacheReadCost = (5000 * PRICING.cacheRead) / 1000;   // $0.0015
      const cacheCreationCost = (3000 * PRICING.cacheCreation) / 1000; // $0.009
      const expectedTotal = inputCost + outputCost + cacheReadCost + cacheCreationCost; // $0.021

      expect(cost).toBeCloseTo(expectedTotal, 6);
      expect(cost).toBeCloseTo(0.021, 6);
    });

    it('should match database-stored cost within 0.1% tolerance', async () => {
      // Arrange: Real SDK response
      const sessionId = randomUUID();
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 2000,
            output_tokens: 1000,
            cache_read_input_tokens: 8000,
            cache_creation_input_tokens: 4000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 2000,
              output_tokens: 1000
            }
          }
        }
      ];

      // Act: Write to database
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert: Verify stored cost matches manual calculation
      const record = db.prepare(
        'SELECT estimatedCost, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens FROM token_analytics WHERE sessionId = ?'
      ).get(sessionId);

      // Manual calculation
      const inputCost = (record.inputTokens * PRICING.input) / 1000;
      const outputCost = (record.outputTokens * PRICING.output) / 1000;
      const cacheReadCost = (record.cacheReadTokens * PRICING.cacheRead) / 1000;
      const cacheCreationCost = (record.cacheCreationTokens * PRICING.cacheCreation) / 1000;
      const expectedCost = inputCost + outputCost + cacheReadCost + cacheCreationCost;

      // Verify within 0.1% tolerance
      const tolerance = expectedCost * 0.001; // 0.1%
      expect(Math.abs(record.estimatedCost - expectedCost)).toBeLessThan(tolerance);
    });
  });

  describe('Edge Cases', () => {
    it('should calculate cost correctly with zero cache tokens (legacy behavior)', () => {
      // Arrange: Metrics without cache tokens (pre-cache API behavior)
      const metrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheCreationTokens: 0
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Cost should be input + output only
      const expectedCost = (1000 * PRICING.input) / 1000 + (500 * PRICING.output) / 1000;
      expect(cost).toBeCloseTo(expectedCost, 6);
      expect(cost).toBeCloseTo(0.0105, 6); // $0.003 + $0.0075
    });

    it('should calculate cost correctly with ONLY cache tokens (no regular input)', () => {
      // Arrange: Warm cache scenario - all input from cache
      const metrics = {
        inputTokens: 0,
        outputTokens: 500,
        cacheReadTokens: 10000,
        cacheCreationTokens: 0
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Cost should be cache_read + output only
      const cacheReadCost = (10000 * PRICING.cacheRead) / 1000;
      const outputCost = (500 * PRICING.output) / 1000;
      const expectedCost = cacheReadCost + outputCost;

      expect(cost).toBeCloseTo(expectedCost, 6);
      expect(cost).toBeCloseTo(0.0105, 6); // $0.003 + $0.0075
    });

    it('should verify cache savings vs non-cache cost', () => {
      // Arrange: Compare same input tokens as regular vs cache_read
      const regularMetrics = {
        inputTokens: 10000,
        outputTokens: 1000,
        cacheReadTokens: 0,
        cacheCreationTokens: 0
      };

      const cacheMetrics = {
        inputTokens: 0,
        outputTokens: 1000,
        cacheReadTokens: 10000,
        cacheCreationTokens: 0
      };

      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate both costs
      const regularCost = writer.calculateEstimatedCost(regularMetrics, model);
      const cacheCost = writer.calculateEstimatedCost(cacheMetrics, model);

      // Assert: Cache should be 90% cheaper for input tokens
      const inputSavings = ((10000 * PRICING.input) / 1000) - ((10000 * PRICING.cacheRead) / 1000);
      const expectedSavings = (10000 * (PRICING.input - PRICING.cacheRead)) / 1000;

      expect(inputSavings).toBeCloseTo(expectedSavings, 6);
      expect(inputSavings).toBeCloseTo(0.027, 6); // 90% of $0.03
      expect(regularCost - cacheCost).toBeCloseTo(inputSavings, 6);
    });
  });

  describe('High-Volume Scenarios', () => {
    it('should handle million-token operations accurately', () => {
      // Arrange: Large-scale operation with millions of tokens
      const metrics = {
        inputTokens: 100000,      // 100K regular input
        outputTokens: 50000,       // 50K output
        cacheReadTokens: 5000000,  // 5M cache read
        cacheCreationTokens: 1000000 // 1M cache creation
      };
      const model = 'claude-sonnet-4-20250514';

      // Act: Calculate cost
      const cost = writer.calculateEstimatedCost(metrics, model);

      // Assert: Verify large-scale cost calculation
      const inputCost = (100000 * PRICING.input) / 1000;           // $0.30
      const outputCost = (50000 * PRICING.output) / 1000;          // $0.75
      const cacheReadCost = (5000000 * PRICING.cacheRead) / 1000;  // $1.50
      const cacheCreationCost = (1000000 * PRICING.cacheCreation) / 1000; // $3.00
      const expectedTotal = inputCost + outputCost + cacheReadCost + cacheCreationCost; // $5.55

      expect(cost).toBeCloseTo(expectedTotal, 4); // Relaxed precision for large numbers
      expect(cost).toBeCloseTo(5.55, 2);
    });
  });
});
