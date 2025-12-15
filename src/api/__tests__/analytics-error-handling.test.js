/**
 * Analytics Error Handling Tests (London School TDD)
 *
 * Testing Strategy: Verify comprehensive error handling and logging
 * - Test various error scenarios
 * - Verify error doesn't propagate to API response
 * - Ensure detailed logging for debugging
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenAnalyticsWriter } from '../../services/TokenAnalyticsWriter.js';

describe('Analytics Error Handling Tests (London School TDD)', () => {
  let mockDb;
  let mockPrepare;
  let mockRun;
  let writer;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock database
    mockRun = vi.fn().mockReturnValue({ changes: 1 });
    mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
    mockDb = {
      prepare: mockPrepare
    };

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    writer = new TokenAnalyticsWriter(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 1: Database connection failure logged with context', () => {
    it('should log detailed error when database connection fails', async () => {
      // Arrange - Simulate database connection failure
      mockPrepare.mockImplementation(() => {
        throw new Error('SQLITE_CANTOPEN: unable to open database file');
      });

      const validMessages = [
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
      const sessionId = 'db-connection-error-test';

      // Act
      await writer.writeTokenMetrics(validMessages, sessionId);

      // Assert - Should not throw
      expect(mockPrepare).toHaveBeenCalled();

      // Verify detailed error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error stack'),
        expect.any(String)
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metrics that failed to write'),
        expect.objectContaining({
          sessionId: 'db-connection-error-test',
          inputTokens: 100,
          outputTokens: 50
        })
      );
    });
  });

  describe('Test 2: SQL constraint violation logged with data', () => {
    it('should log constraint violation errors with attempted data', async () => {
      // Arrange - Simulate constraint violation
      mockRun.mockImplementation(() => {
        const error = new Error('UNIQUE constraint failed: token_analytics.id');
        error.code = 'SQLITE_CONSTRAINT';
        throw error;
      });

      const validMessages = [
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
      const sessionId = 'constraint-violation-test';

      // Act
      await writer.writeTokenMetrics(validMessages, sessionId);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('UNIQUE constraint failed')
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metrics that failed to write'),
        expect.any(Object)
      );
    });
  });

  describe('Test 3: Malformed message structure logged with example', () => {
    it('should log detailed information about malformed messages', async () => {
      // Arrange - Malformed message that causes extraction to fail
      const malformedMessages = [
        {
          type: 'result',
          usage: 'not-an-object', // Invalid: should be object
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
        }
      ];
      const sessionId = 'malformed-structure-test';

      // Act
      await writer.writeTokenMetrics(malformedMessages, sessionId);

      // Assert - Should log warning about metric extraction failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metric extraction failed')
      );

      // Verify starting metrics extraction log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting metric extraction'),
        expect.objectContaining({
          messagesCount: 1,
          sessionId: 'malformed-structure-test'
        })
      );
    });
  });

  describe('Test 4: Async promise rejection caught and logged', () => {
    it('should catch and log async errors without throwing', async () => {
      // Arrange - Simulate async error in database write
      mockRun.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Async database operation failed'));
          }, 10);
        });
      });

      const validMessages = [
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
      const sessionId = 'async-error-test';

      // Act & Assert - Should not throw
      await expect(
        writer.writeTokenMetrics(validMessages, sessionId)
      ).resolves.not.toThrow();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify error was caught and logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Test 5: Error doesn\'t propagate to API response', () => {
    it('should handle all errors gracefully without throwing', async () => {
      // Arrange - Various error scenarios
      const errorScenarios = [
        {
          name: 'Database locked',
          error: new Error('SQLITE_BUSY: database is locked'),
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
        },
        {
          name: 'Permission denied',
          error: new Error('SQLITE_PERM: permission denied'),
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 200,
                output_tokens: 100,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        },
        {
          name: 'Disk full',
          error: new Error('SQLITE_FULL: database or disk is full'),
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 300,
                output_tokens: 150,
                cache_read_input_tokens: 0,
                cache_creation_input_tokens: 0
              },
              modelUsage: {
                'claude-sonnet-4-20250514': {}
              }
            }
          ]
        }
      ];

      // Act & Assert - None should throw
      for (const scenario of errorScenarios) {
        mockRun.mockImplementationOnce(() => {
          throw scenario.error;
        });

        await expect(
          writer.writeTokenMetrics(scenario.messages, `${scenario.name}-session`)
        ).resolves.not.toThrow();

        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining(scenario.error.message)
        );
      }
    });
  });

  describe('Test 6: Error includes stack trace in logs', () => {
    it('should log complete stack trace for debugging', async () => {
      // Arrange - Create error with stack trace
      const errorWithStack = new Error('Test error with stack');
      mockRun.mockImplementation(() => {
        throw errorWithStack;
      });

      const validMessages = [
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
      const sessionId = 'stack-trace-test';

      // Act
      await writer.writeTokenMetrics(validMessages, sessionId);

      // Assert - Verify stack trace was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error stack'),
        expect.stringContaining('at ')
      );

      // Verify error message logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test error with stack')
      );
    });

    it('should log extraction errors with context', async () => {
      // Arrange - Test extraction error handling
      const messagesWithError = [
        {
          type: 'result',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          },
          modelUsage: null // This will cause an error during model extraction
        }
      ];
      const sessionId = 'extraction-error-test';

      // Act
      await writer.writeTokenMetrics(messagesWithError, sessionId);

      // Assert - Extraction should fail but not throw
      expect(mockPrepare).not.toHaveBeenCalled(); // No database write attempted

      // Verify warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Metric extraction failed')
      );
    });

    it('should handle and log TypeError from invalid operations', async () => {
      // Arrange - Simulate TypeError
      mockPrepare.mockImplementation(() => {
        throw new TypeError('Cannot read property "run" of undefined');
      });

      const validMessages = [
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
      const sessionId = 'type-error-test';

      // Act
      await writer.writeTokenMetrics(validMessages, sessionId);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error stack'),
        expect.stringContaining('TypeError')
      );
    });
  });
});
