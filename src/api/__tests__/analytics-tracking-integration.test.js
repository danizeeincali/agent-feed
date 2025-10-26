/**
 * Analytics Tracking Integration Tests (London School TDD)
 *
 * Testing Strategy: Test the complete flow from API endpoint to analytics write
 * - Mock SDK responses but test real integration
 * - Verify async operations complete correctly
 * - Test error handling doesn't block API responses
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { TokenAnalyticsWriter } from '../../services/TokenAnalyticsWriter.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Analytics Tracking Integration Tests (London School TDD)', () => {
  let app;
  let db;
  let tokenAnalyticsWriter;
  let tempDir;
  let mockClaudeCodeManager;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Create temporary database for testing
    tempDir = mkdtempSync(join(tmpdir(), 'analytics-test-'));
    const dbPath = join(tempDir, 'test-analytics.db');
    db = new Database(dbPath);

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
        model TEXT NOT NULL
      )
    `);

    // Initialize writer
    tokenAnalyticsWriter = new TokenAnalyticsWriter(db);

    // Mock Claude Code SDK Manager
    mockClaudeCodeManager = {
      createStreamingChat: vi.fn()
    };

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create test Express app
    app = express();
    app.use(express.json());

    // Define test route matching production behavior
    app.post('/api/claude-code/streaming-chat', async (req, res) => {
      try {
        const { message } = req.body;

        if (!message) {
          return res.status(400).json({ success: false, error: 'Message required' });
        }

        // Call mocked SDK
        const responses = await mockClaudeCodeManager.createStreamingChat(message, {});
        const sessionId = `test_session_${Date.now()}`;

        // Track token analytics (async, non-blocking)
        if (tokenAnalyticsWriter && responses && responses.length > 0) {
          const firstResponse = responses[0];
          const messages = firstResponse?.messages || [];

          if (messages.length > 0) {
            tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)
              .catch(error => {
                console.error('Analytics write failed (non-blocking):', error.message);
              });
          }
        }

        // Return response immediately (don't wait for analytics)
        res.json({
          success: true,
          message: 'Response from Claude',
          responses
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (db) {
      db.close();
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Test 1: /streaming-chat triggers analytics write on completion', () => {
    it('should write analytics after successful SDK response', async () => {
      // Arrange
      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 1000,
                output_tokens: 500,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test message' });

      // Wait for async analytics write
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify analytics was written
      const records = db.prepare('SELECT * FROM token_analytics').all();
      expect(records).toHaveLength(1);
      expect(records[0].inputTokens).toBe(1000);
      expect(records[0].outputTokens).toBe(500);
    });
  });

  describe('Test 2: Analytics write does not block API response', () => {
    it('should return API response immediately even if analytics write is slow', async () => {
      // Arrange - Make analytics write slow
      const originalWrite = tokenAnalyticsWriter.writeToDatabase.bind(tokenAnalyticsWriter);
      tokenAnalyticsWriter.writeToDatabase = async function(...args) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return originalWrite(...args);
      };

      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 100,
                output_tokens: 50,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Act - Measure response time
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test message' });
      const responseTime = Date.now() - startTime;

      // Assert - Response should be fast (< 500ms)
      expect(responseTime).toBeLessThan(500);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Test 3: Analytics write succeeds with valid Claude SDK response', () => {
    it('should successfully write analytics with complete SDK response', async () => {
      // Arrange
      const validResponse = [
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 2000,
                output_tokens: 1000,
                cache_read_input_tokens: 500,
                cache_creation_input_tokens: 250
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              },
              total_cost_usd: 0.0425,
              duration_ms: 2500,
              num_turns: 1
            }
          ]
        }
      ];

      mockClaudeCodeManager.createStreamingChat.mockResolvedValue(validResponse);

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Complex query' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(response.status).toBe(200);
      const records = db.prepare('SELECT * FROM token_analytics').all();
      expect(records).toHaveLength(1);
      expect(records[0].totalTokens).toBe(3000);
      expect(records[0].model).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('Test 4: Analytics write skips when tokenAnalyticsWriter is null', () => {
    it('should handle gracefully when writer is not initialized', async () => {
      // Arrange - Temporarily set writer to null
      const originalWriter = tokenAnalyticsWriter;
      tokenAnalyticsWriter = null;

      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 100,
                output_tokens: 50,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Recreate route with null writer
      app = express();
      app.use(express.json());
      app.post('/api/claude-code/streaming-chat', async (req, res) => {
        try {
          const responses = await mockClaudeCodeManager.createStreamingChat(req.body.message, {});

          if (tokenAnalyticsWriter && responses && responses.length > 0) {
            // This should not execute
            tokenAnalyticsWriter.writeTokenMetrics([], 'session').catch(() => {});
          }

          res.json({ success: true, responses });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - API should succeed even without writer
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore writer
      tokenAnalyticsWriter = originalWriter;
    });
  });

  describe('Test 5: Analytics write skips when responses array is empty', () => {
    it('should handle empty responses gracefully', async () => {
      // Arrange
      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(response.status).toBe(200);
      const records = db.prepare('SELECT * FROM token_analytics').all();
      expect(records).toHaveLength(0);
    });
  });

  describe('Test 6: Analytics write skips when messages array is empty', () => {
    it('should handle response with no messages', async () => {
      // Arrange
      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: []
        }
      ]);

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert
      expect(response.status).toBe(200);
      const records = db.prepare('SELECT * FROM token_analytics').all();
      expect(records).toHaveLength(0);
    });
  });

  describe('Test 7: Analytics write logs error but doesn\'t crash on failure', () => {
    it('should log error and continue when analytics write fails', async () => {
      // Arrange - Make database write fail
      db.close(); // Close database to cause write failure

      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 100,
                output_tokens: 50,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Act
      const response = await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - API should still succeed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analytics write failed')
      );
    });
  });

  describe('Test 8: Multiple concurrent requests write separate analytics records', () => {
    it('should handle concurrent requests without conflicts', async () => {
      // Arrange
      mockClaudeCodeManager.createStreamingChat.mockImplementation((message) => {
        return Promise.resolve([
          {
            messages: [
              {
                type: 'result',
                usage: {
                  input_tokens: 100,
                  output_tokens: 50,
                  cache_read_input_tokens: 0,
                  cache_creation_input_tokens: 0
                },
                modelUsage: {
                  'claude-sonnet-4-20250514': {}
                }
              }
            ]
          }
        ]);
      });

      // Act - Send 5 concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/claude-code/streaming-chat')
          .send({ message: `Test message ${i}` })
      );

      const responses = await Promise.all(requests);

      // Wait for all analytics writes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify 5 records were written
      const records = db.prepare('SELECT * FROM token_analytics').all();
      expect(records).toHaveLength(5);

      // Verify all records have unique IDs and session IDs
      const ids = records.map(r => r.id);
      const sessionIds = records.map(r => r.sessionId);
      expect(new Set(ids).size).toBe(5);
      expect(new Set(sessionIds).size).toBe(5);
    });
  });

  describe('Test 9: Analytics record appears in database after write', () => {
    it('should persist analytics data correctly', async () => {
      // Arrange
      const testSessionId = `session_${Date.now()}`;
      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 1500,
                output_tokens: 750,
                cache_read_input_tokens: 100,
                cache_creation_input_tokens: 50
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Modify route to use predictable session ID
      app = express();
      app.use(express.json());
      app.post('/api/claude-code/streaming-chat', async (req, res) => {
        try {
          const responses = await mockClaudeCodeManager.createStreamingChat(req.body.message, {});

          if (tokenAnalyticsWriter && responses && responses.length > 0) {
            const messages = responses[0]?.messages || [];
            if (messages.length > 0) {
              tokenAnalyticsWriter.writeTokenMetrics(messages, testSessionId)
                .catch(() => {});
            }
          }

          res.json({ success: true, responses });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });

      // Act
      await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Query specific session
      const record = db.prepare('SELECT * FROM token_analytics WHERE sessionId = ?').get(testSessionId);
      expect(record).toBeDefined();
      expect(record.sessionId).toBe(testSessionId);
      expect(record.inputTokens).toBe(1500);
      expect(record.outputTokens).toBe(750);
      expect(record.totalTokens).toBe(2250);
      expect(record.model).toBe('claude-sonnet-4-20250514');
      expect(record.operation).toBe('sdk_operation');
    });
  });

  describe('Test 10: Analytics APIs reflect new data after write', () => {
    it('should query analytics data successfully after write', async () => {
      // Arrange
      mockClaudeCodeManager.createStreamingChat.mockResolvedValue([
        {
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 500,
                output_tokens: 250,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ]);

      // Act - Make API call
      await request(app)
        .post('/api/claude-code/streaming-chat')
        .send({ message: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert - Query analytics
      const totalTokens = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get();
      expect(totalTokens.total).toBe(750);

      const totalCost = db.prepare('SELECT SUM(estimatedCost) as cost FROM token_analytics').get();
      expect(totalCost.cost).toBeGreaterThan(0);

      const recordCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
      expect(recordCount.count).toBe(1);
    });
  });
});
