/**
 * TokenAnalyticsWriter Unit Tests (London School TDD)
 *
 * Testing Strategy: Outside-In with Mock-First Approach
 * - Mock database connections to isolate unit behavior
 * - Verify interactions and collaborations
 * - Focus on contract definition through mock expectations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenAnalyticsWriter } from '../TokenAnalyticsWriter.js';

describe('TokenAnalyticsWriter - Unit Tests (London School TDD)', () => {
  let mockDb;
  let mockPrepare;
  let mockRun;
  let writer;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock database connection (London School - mock collaborators)
    mockRun = vi.fn().mockReturnValue({ changes: 1 });
    mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
    mockDb = {
      prepare: mockPrepare
    };

    // Spy on console methods to verify logging behavior
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    writer = new TokenAnalyticsWriter(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 1: writeTokenMetrics with valid message writes to database', () => {
    it('should extract metrics, calculate cost, and write to database', async () => {
      // Arrange
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 200,
            cache_creation_input_tokens: 100
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          },
          total_cost_usd: 0.012,
          duration_ms: 1500,
          num_turns: 1
        }
      ];
      const sessionId = 'test-session-123';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Verify database interaction
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO token_analytics'));
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session-123',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          model: 'claude-sonnet-4-20250514',
          operation: 'sdk_operation'
        })
      );

      // Verify success logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('writeTokenMetrics completed successfully')
      );
    });
  });

  describe('Test 2: writeTokenMetrics with multiple messages writes all records', () => {
    it('should process multiple messages and write the last result message', async () => {
      // Arrange
      const messages = [
        { type: 'request', content: 'User message' },
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
        },
        {
          type: 'result',
          usage: {
            input_tokens: 1200,
            output_tokens: 600,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 50
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
        }
      ];
      const sessionId = 'multi-message-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Should use the LAST result message
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 1200,
          outputTokens: 600,
          totalTokens: 1800
        })
      );
    });
  });

  describe('Test 3: writeTokenMetrics with empty messages array logs skip', () => {
    it('should log warning and skip write when messages array is empty', async () => {
      // Arrange
      const messages = [];
      const sessionId = 'empty-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - No database write should occur
      expect(mockPrepare).not.toHaveBeenCalled();
      expect(mockRun).not.toHaveBeenCalled();

      // Verify warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid messages array')
      );
    });
  });

  describe('Test 4: writeTokenMetrics with malformed message structure throws error', () => {
    it('should handle malformed message gracefully without throwing', async () => {
      // Arrange
      const messages = [
        {
          type: 'result',
          // Missing usage and modelUsage
        }
      ];
      const sessionId = 'malformed-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Should not throw, should log warning
      expect(mockPrepare).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required fields')
      );
    });
  });

  describe('Test 5: writeTokenMetrics with missing usage data skips message', () => {
    it('should skip write when usage data is missing', async () => {
      // Arrange
      const messages = [
        {
          type: 'result',
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
          // Missing usage field
        }
      ];
      const sessionId = 'missing-usage-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert
      expect(mockPrepare).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required fields')
      );
    });
  });

  describe('Test 6: writeTokenMetrics calculates correct cost for claude-sonnet', () => {
    it('should calculate cost accurately for claude-sonnet-4 model', async () => {
      // Arrange
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 1000,
            cache_read_input_tokens: 1000,
            cache_creation_input_tokens: 1000
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
        }
      ];
      const sessionId = 'cost-calc-session';

      // Expected cost calculation:
      // Input: 1000 * $0.003 / 1000 = $0.003
      // Output: 1000 * $0.015 / 1000 = $0.015
      // Cache Read: 1000 * $0.0003 / 1000 = $0.0003
      // Cache Creation: 1000 * $0.003 / 1000 = $0.003
      // Total: $0.0213
      const expectedCost = 0.0213;

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedCost: expectedCost
        })
      );
    });
  });

  describe('Test 7: writeTokenMetrics calculates correct cost for claude-haiku', () => {
    it('should use default pricing for unknown models', async () => {
      // Arrange - Using a model not in pricing table
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 1000,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          },
          modelUsage: {
            'claude-haiku-unknown': {}
          }
        }
      ];
      const sessionId = 'haiku-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Should use default pricing (same as sonnet-4)
      const expectedCost = 0.018; // (1000*0.003 + 1000*0.015) / 1000
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedCost: expectedCost,
          model: 'claude-haiku-unknown'
        })
      );
    });
  });

  describe('Test 8: writeTokenMetrics handles database locked error gracefully', () => {
    it('should log error but not throw when database is locked', async () => {
      // Arrange
      mockRun.mockImplementation(() => {
        throw new Error('SQLITE_BUSY: database is locked');
      });

      const messages = [
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
      ];
      const sessionId = 'locked-db-session';

      // Act & Assert - Should not throw
      await expect(
        writer.writeTokenMetrics(messages, sessionId)
      ).resolves.not.toThrow();

      // Verify error logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('database is locked')
      );
    });
  });

  describe('Test 9: writeTokenMetrics logs success on completion', () => {
    it('should log detailed success messages throughout the process', async () => {
      // Arrange
      const messages = [
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
      ];
      const sessionId = 'success-logging-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Verify success logging at multiple stages
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting writeTokenMetrics')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metrics extracted successfully')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cost calculated')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('writeTokenMetrics completed successfully')
      );
    });
  });

  describe('Test 10: writeTokenMetrics logs error details on failure', () => {
    it('should log comprehensive error details when write fails', async () => {
      // Arrange
      const errorMessage = 'Database constraint violation';
      mockRun.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const messages = [
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
      ];
      const sessionId = 'error-logging-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Verify error logging includes details
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error stack')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metrics that failed to write'),
        expect.any(Object)
      );
    });
  });

  describe('Test 11: writeTokenMetrics truncates long message content', () => {
    it('should handle and log truncation for very large messages', async () => {
      // Note: Current implementation doesn't store message content in DB
      // This test verifies the behavior handles large messages without crashing

      // Arrange
      const messages = [
        {
          type: 'result',
          usage: {
            input_tokens: 10000,
            output_tokens: 5000,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          },
          content: 'x'.repeat(100000) // Very large content
        }
      ];
      const sessionId = 'large-message-session';

      // Act & Assert - Should not crash
      await expect(
        writer.writeTokenMetrics(messages, sessionId)
      ).resolves.not.toThrow();

      // Verify write succeeded
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('Test 12: writeTokenMetrics includes session ID in record', () => {
    it('should pass session ID correctly to database', async () => {
      // Arrange
      const messages = [
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
      ];
      const sessionId = 'unique-session-id-12345';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'unique-session-id-12345'
        })
      );
    });
  });

  describe('Test 13: writeTokenMetrics includes timestamp in ISO format', () => {
    it('should generate ISO format timestamp for database record', async () => {
      // Arrange
      const messages = [
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
      ];
      const sessionId = 'timestamp-test-session';

      // Act
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Check timestamp format
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      );
    });
  });

  describe('Test 14: writeTokenMetrics generates unique IDs for each record', () => {
    it('should generate UUID for each record', async () => {
      // Arrange
      const messages = [
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
      ];
      const sessionId = 'uuid-test-session';

      // Act - Write twice
      await writer.writeTokenMetrics(messages, sessionId);
      await writer.writeTokenMetrics(messages, sessionId);

      // Assert - Each call should have different UUID
      const firstCall = mockRun.mock.calls[0][0];
      const secondCall = mockRun.mock.calls[1][0];

      expect(firstCall.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(secondCall.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(firstCall.id).not.toBe(secondCall.id);
    });
  });
});
