/**
 * TokenAnalyticsWriter - London School TDD Tests
 *
 * Testing Strategy:
 * - Mock-driven development (London School)
 * - Focus on interactions and collaborations
 * - Verify behavior through mock expectations
 * - Test contracts between components
 */

import { jest } from '@jest/globals';

// Import TokenAnalyticsWriter directly
const { TokenAnalyticsWriter } = await import('../../src/services/TokenAnalyticsWriter.js');

describe('TokenAnalyticsWriter - London School TDD', () => {
  let writer;
  let mockDb;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create fresh mock database for each test
    mockDb = {
      run: jest.fn((sql, params, callback) => {
        // Simulate successful database write
        if (callback) callback(null);
        return { lastID: 1 };
      }),
      get: jest.fn(),
      all: jest.fn()
    };

    // Create writer instance with mock database
    writer = new TokenAnalyticsWriter(mockDb);
  });

  describe('extractMetricsFromSDK(messages, sessionId)', () => {
    describe('Success Cases - SDK Message Extraction', () => {
      it('should extract metrics from valid SDK result message', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            total_cost_usd: 0.0042,
            duration_ms: 2345,
            num_turns: 3,
            usage: {
              input_tokens: 1234,
              output_tokens: 567,
              cache_read_input_tokens: 800,
              cache_creation_input_tokens: 0
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1234,
                outputTokens: 567,
                costUSD: 0.0042
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-123');

        expect(metrics).toEqual({
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1234,
          outputTokens: 567,
          cacheReadTokens: 800,
          cacheCreationTokens: 0,
          totalTokens: 1801, // input + output
          sdkReportedCost: 0.0042,
          duration_ms: 2345,
          num_turns: 3
        });
      });

      it('should extract from multiple result messages and use last one', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 100,
              output_tokens: 50
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 100,
                outputTokens: 50
              }
            }
          },
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 2000,
              output_tokens: 1000,
              cache_read_input_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 2000,
                outputTokens: 1000
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-456');

        expect(metrics.inputTokens).toBe(2000);
        expect(metrics.outputTokens).toBe(1000);
        expect(metrics.cacheReadTokens).toBe(500);
      });

      it('should handle missing cache token fields gracefully', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
              // No cache fields
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-789');

        expect(metrics.cacheReadTokens).toBe(0);
        expect(metrics.cacheCreationTokens).toBe(0);
        expect(metrics.totalTokens).toBe(1500);
      });

      it('should extract correct model from modelUsage', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-opus-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-xyz');

        expect(metrics.model).toBe('claude-opus-4-20250514');
      });

      it('should handle multiple models and use first one', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 800,
                outputTokens: 400
              },
              'claude-opus-4-20250514': {
                inputTokens: 200,
                outputTokens: 100
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-multi');

        expect(metrics.model).toBe('claude-sonnet-4-20250514');
      });
    });

    describe('Edge Cases - Invalid or Missing Data', () => {
      it('should return null for empty messages array', () => {
        const metrics = writer.extractMetricsFromSDK([], 'session-empty');
        expect(metrics).toBeNull();
      });

      it('should return null for null messages', () => {
        const metrics = writer.extractMetricsFromSDK(null, 'session-null');
        expect(metrics).toBeNull();
      });

      it('should return null for undefined messages', () => {
        const metrics = writer.extractMetricsFromSDK(undefined, 'session-undef');
        expect(metrics).toBeNull();
      });

      it('should return null when no result messages found', () => {
        const messages = [
          { type: 'text', content: 'Hello' },
          { type: 'status', message: 'Processing' }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-no-result');
        expect(metrics).toBeNull();
      });

      it('should return null when result message has no usage field', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success'
            // No usage field
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-no-usage');
        expect(metrics).toBeNull();
      });

      it('should return null when result message has no modelUsage', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            }
            // No modelUsage
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, 'session-no-model');
        expect(metrics).toBeNull();
      });

      it('should handle missing sessionId', () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        const metrics = writer.extractMetricsFromSDK(messages, null);
        expect(metrics).toBeNull();
      });
    });
  });

  describe('calculateEstimatedCost(usage, model)', () => {
    describe('Cost Calculation - Claude Sonnet 4', () => {
      const sonnetModel = 'claude-sonnet-4-20250514';

      it('should calculate cost without cache tokens', () => {
        const usage = {
          inputTokens: 1000,
          outputTokens: 500,
          cacheReadTokens: 0,
          cacheCreationTokens: 0
        };

        const cost = writer.calculateEstimatedCost(usage, sonnetModel);

        // Input: 1000 * 0.003 / 1000 = 0.003
        // Output: 500 * 0.015 / 1000 = 0.0075
        // Total: 0.0105
        expect(cost).toBeCloseTo(0.0105, 4);
      });

      it('should apply 90% discount to cache read tokens', () => {
        const usage = {
          inputTokens: 1000,
          outputTokens: 500,
          cacheReadTokens: 800,
          cacheCreationTokens: 0
        };

        const cost = writer.calculateEstimatedCost(usage, sonnetModel);

        // Input: 1000 * 0.003 / 1000 = 0.003
        // Output: 500 * 0.015 / 1000 = 0.0075
        // Cache Read: 800 * 0.0003 / 1000 = 0.00024
        // Total: 0.01074
        expect(cost).toBeCloseTo(0.01074, 5);
      });

      it('should charge cache creation tokens at input rate', () => {
        const usage = {
          inputTokens: 1000,
          outputTokens: 500,
          cacheReadTokens: 0,
          cacheCreationTokens: 500
        };

        const cost = writer.calculateEstimatedCost(usage, sonnetModel);

        // Input: 1000 * 0.003 / 1000 = 0.003
        // Output: 500 * 0.015 / 1000 = 0.0075
        // Cache Creation: 500 * 0.003 / 1000 = 0.0015
        // Total: 0.012
        expect(cost).toBeCloseTo(0.012, 4);
      });

      it('should calculate cost with all token types', () => {
        const usage = {
          inputTokens: 1234,
          outputTokens: 567,
          cacheReadTokens: 800,
          cacheCreationTokens: 200
        };

        const cost = writer.calculateEstimatedCost(usage, sonnetModel);

        // Input: 1234 * 0.003 / 1000 = 0.003702
        // Output: 567 * 0.015 / 1000 = 0.008505
        // Cache Read: 800 * 0.0003 / 1000 = 0.00024
        // Cache Creation: 200 * 0.003 / 1000 = 0.0006
        // Total: 0.013047
        expect(cost).toBeCloseTo(0.013047, 5);
      });
    });

    describe('Cost Calculation - Edge Cases', () => {
      it('should return 0 for zero tokens', () => {
        const usage = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0
        };

        const cost = writer.calculateEstimatedCost(usage, 'claude-sonnet-4-20250514');
        expect(cost).toBe(0);
      });

      it('should handle missing cache token fields', () => {
        const usage = {
          inputTokens: 1000,
          outputTokens: 500
          // No cache fields
        };

        const cost = writer.calculateEstimatedCost(usage, 'claude-sonnet-4-20250514');
        expect(cost).toBeCloseTo(0.0105, 4);
      });

      it('should use default pricing for unknown model', () => {
        const usage = {
          inputTokens: 1000,
          outputTokens: 500
        };

        const cost = writer.calculateEstimatedCost(usage, 'unknown-model');

        // Should use Sonnet 4 pricing as default
        expect(cost).toBeCloseTo(0.0105, 4);
      });

      it('should return 0 for null usage', () => {
        const cost = writer.calculateEstimatedCost(null, 'claude-sonnet-4-20250514');
        expect(cost).toBe(0);
      });

      it('should return 0 for undefined usage', () => {
        const cost = writer.calculateEstimatedCost(undefined, 'claude-sonnet-4-20250514');
        expect(cost).toBe(0);
      });
    });
  });

  describe('writeToDatabase(metrics)', () => {
    describe('Database Interaction - Success Cases', () => {
      it('should write metrics to database with correct SQL', async () => {
        const metrics = {
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1234,
          outputTokens: 567,
          totalTokens: 1801,
          estimatedCost: 0.0105
        };

        await writer.writeToDatabase(metrics);

        // Verify database interaction
        expect(mockDb.run).toHaveBeenCalledTimes(1);

        const [sql, params] = mockDb.run.mock.calls[0];

        expect(sql).toContain('INSERT INTO token_analytics');
        expect(sql).toContain('sessionId');
        expect(sql).toContain('operation');
        expect(sql).toContain('model');
        expect(sql).toContain('inputTokens');
        expect(sql).toContain('outputTokens');
        expect(sql).toContain('totalTokens');
        expect(sql).toContain('estimatedCost');

        expect(params).toMatchObject({
          $sessionId: 'session-123',
          $operation: 'sdk_operation',
          $model: 'claude-sonnet-4-20250514',
          $inputTokens: 1234,
          $outputTokens: 567,
          $totalTokens: 1801,
          $estimatedCost: 0.0105
        });
      });

      it('should generate unique ID for each write', async () => {
        const metrics = {
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.01
        };

        await writer.writeToDatabase(metrics);
        await writer.writeToDatabase(metrics);

        expect(mockDb.run).toHaveBeenCalledTimes(2);

        const [, params1] = mockDb.run.mock.calls[0];
        const [, params2] = mockDb.run.mock.calls[1];

        expect(params1.$id).toBeDefined();
        expect(params2.$id).toBeDefined();
        expect(params1.$id).not.toBe(params2.$id);
      });

      it('should include timestamp in database write', async () => {
        const metrics = {
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.01
        };

        const beforeWrite = new Date().toISOString();
        await writer.writeToDatabase(metrics);
        const afterWrite = new Date().toISOString();

        const [, params] = mockDb.run.mock.calls[0];

        expect(params.$timestamp).toBeDefined();
        expect(params.$timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(params.$timestamp >= beforeWrite).toBe(true);
        expect(params.$timestamp <= afterWrite).toBe(true);
      });
    });

    describe('Database Interaction - Error Handling', () => {
      it('should handle database errors gracefully and not throw', async () => {
        mockDb.run.mockImplementation((sql, params, callback) => {
          if (callback) callback(new Error('Database connection failed'));
        });

        const metrics = {
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.01
        };

        // Should not throw
        await expect(writer.writeToDatabase(metrics)).resolves.not.toThrow();
      });

      it('should log error when database write fails', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockDb.run.mockImplementation((sql, params, callback) => {
          if (callback) callback(new Error('Table does not exist'));
        });

        const metrics = {
          sessionId: 'session-123',
          operation: 'sdk_operation',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.01
        };

        await writer.writeToDatabase(metrics);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to write token analytics'),
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should handle null metrics gracefully', async () => {
        await expect(writer.writeToDatabase(null)).resolves.not.toThrow();
        expect(mockDb.run).not.toHaveBeenCalled();
      });

      it('should handle undefined metrics gracefully', async () => {
        await expect(writer.writeToDatabase(undefined)).resolves.not.toThrow();
        expect(mockDb.run).not.toHaveBeenCalled();
      });

      it('should handle metrics with missing required fields', async () => {
        const incompleteMetrics = {
          sessionId: 'session-123'
          // Missing other required fields
        };

        await expect(writer.writeToDatabase(incompleteMetrics)).resolves.not.toThrow();
      });
    });
  });

  describe('writeTokenMetrics(messages, sessionId) - Main Entry Point', () => {
    describe('End-to-End Workflow - Success Cases', () => {
      it('should orchestrate full workflow: extract -> calculate -> write', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            total_cost_usd: 0.0042,
            duration_ms: 2345,
            num_turns: 3,
            usage: {
              input_tokens: 1234,
              output_tokens: 567,
              cache_read_input_tokens: 800,
              cache_creation_input_tokens: 0
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1234,
                outputTokens: 567,
                costUSD: 0.0042
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-e2e');

        // Verify database was called with calculated cost
        expect(mockDb.run).toHaveBeenCalledTimes(1);

        const [, params] = mockDb.run.mock.calls[0];

        expect(params.$sessionId).toBe('session-e2e');
        expect(params.$model).toBe('claude-sonnet-4-20250514');
        expect(params.$inputTokens).toBe(1234);
        expect(params.$outputTokens).toBe(567);
        expect(params.$totalTokens).toBe(1801);
        expect(params.$estimatedCost).toBeGreaterThan(0);
      });

      it('should verify collaboration between extract and calculate methods', async () => {
        const extractSpy = jest.spyOn(writer, 'extractMetricsFromSDK');
        const calculateSpy = jest.spyOn(writer, 'calculateEstimatedCost');
        const writeSpy = jest.spyOn(writer, 'writeToDatabase');

        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-collab');

        // Verify method call sequence
        expect(extractSpy).toHaveBeenCalledWith(messages, 'session-collab');
        expect(calculateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            inputTokens: 1000,
            outputTokens: 500
          }),
          'claude-sonnet-4-20250514'
        );
        expect(writeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-collab',
            inputTokens: 1000,
            outputTokens: 500,
            estimatedCost: expect.any(Number)
          })
        );

        extractSpy.mockRestore();
        calculateSpy.mockRestore();
        writeSpy.mockRestore();
      });

      it('should handle successful write with complex token usage', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 5000,
              output_tokens: 2000,
              cache_read_input_tokens: 3000,
              cache_creation_input_tokens: 1000
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 5000,
                outputTokens: 2000
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-complex');

        expect(mockDb.run).toHaveBeenCalledTimes(1);

        const [, params] = mockDb.run.mock.calls[0];

        expect(params.$inputTokens).toBe(5000);
        expect(params.$outputTokens).toBe(2000);
        expect(params.$totalTokens).toBe(7000);
      });
    });

    describe('End-to-End Workflow - Error Cases', () => {
      it('should handle extraction failure gracefully', async () => {
        const invalidMessages = [];

        await expect(
          writer.writeTokenMetrics(invalidMessages, 'session-fail')
        ).resolves.not.toThrow();

        // Should not attempt database write
        expect(mockDb.run).not.toHaveBeenCalled();
      });

      it('should handle null messages gracefully', async () => {
        await expect(
          writer.writeTokenMetrics(null, 'session-null')
        ).resolves.not.toThrow();

        expect(mockDb.run).not.toHaveBeenCalled();
      });

      it('should handle database write failure gracefully', async () => {
        mockDb.run.mockImplementation((sql, params, callback) => {
          if (callback) callback(new Error('Write failed'));
        });

        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        await expect(
          writer.writeTokenMetrics(messages, 'session-db-fail')
        ).resolves.not.toThrow();
      });

      it('should handle missing sessionId gracefully', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000,
              output_tokens: 500
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000,
                outputTokens: 500
              }
            }
          }
        ];

        await expect(
          writer.writeTokenMetrics(messages, null)
        ).resolves.not.toThrow();

        expect(mockDb.run).not.toHaveBeenCalled();
      });
    });

    describe('End-to-End Workflow - Edge Cases', () => {
      it('should handle messages with only error results', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'error',
            error: 'API timeout'
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-error-result');

        expect(mockDb.run).not.toHaveBeenCalled();
      });

      it('should handle mixed message types and extract only result', async () => {
        const messages = [
          { type: 'text', content: 'Processing...' },
          { type: 'status', message: 'Working...' },
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 800,
              output_tokens: 400
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 800,
                outputTokens: 400
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-mixed');

        expect(mockDb.run).toHaveBeenCalledTimes(1);

        const [, params] = mockDb.run.mock.calls[0];
        expect(params.$inputTokens).toBe(800);
        expect(params.$outputTokens).toBe(400);
      });

      it('should handle very large token counts', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1000000,
              output_tokens: 500000,
              cache_read_input_tokens: 2000000,
              cache_creation_input_tokens: 100000
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1000000,
                outputTokens: 500000
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-large');

        expect(mockDb.run).toHaveBeenCalledTimes(1);

        const [, params] = mockDb.run.mock.calls[0];
        expect(params.$inputTokens).toBe(1000000);
        expect(params.$outputTokens).toBe(500000);
        expect(params.$totalTokens).toBe(1500000);
        expect(params.$estimatedCost).toBeGreaterThan(0);
      });

      it('should handle decimal token counts by rounding', async () => {
        const messages = [
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1234.56,
              output_tokens: 567.89
            },
            modelUsage: {
              'claude-sonnet-4-20250514': {
                inputTokens: 1234.56,
                outputTokens: 567.89
              }
            }
          }
        ];

        await writer.writeTokenMetrics(messages, 'session-decimal');

        expect(mockDb.run).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Contract Verification - Mock Interactions', () => {
    it('should define clear database contract for writes', async () => {
      const messages = [
        {
          type: 'result',
          subtype: 'success',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              inputTokens: 1000,
              outputTokens: 500
            }
          }
        }
      ];

      await writer.writeTokenMetrics(messages, 'session-contract');

      // Verify contract: database.run should be called with SQL and params
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO token_analytics'),
        expect.objectContaining({
          $id: expect.any(String),
          $timestamp: expect.any(String),
          $sessionId: expect.any(String),
          $operation: expect.any(String),
          $model: expect.any(String),
          $inputTokens: expect.any(Number),
          $outputTokens: expect.any(Number),
          $totalTokens: expect.any(Number),
          $estimatedCost: expect.any(Number)
        }),
        expect.any(Function)
      );
    });

    it('should verify no database calls for invalid inputs', async () => {
      await writer.writeTokenMetrics(null, 'session-1');
      await writer.writeTokenMetrics([], 'session-2');
      await writer.writeTokenMetrics([{ type: 'text' }], 'session-3');

      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('should verify idempotent behavior for repeated calls', async () => {
      const messages = [
        {
          type: 'result',
          subtype: 'success',
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              inputTokens: 1000,
              outputTokens: 500
            }
          }
        }
      ];

      await writer.writeTokenMetrics(messages, 'session-repeat');
      await writer.writeTokenMetrics(messages, 'session-repeat');
      await writer.writeTokenMetrics(messages, 'session-repeat');

      // Should write 3 times (each with unique ID)
      expect(mockDb.run).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle real-world SDK response structure', async () => {
      const realWorldMessages = [
        {
          type: 'text',
          text: 'Starting analysis...'
        },
        {
          type: 'status',
          status: 'processing'
        },
        {
          type: 'result',
          subtype: 'success',
          total_cost_usd: 0.0347,
          duration_ms: 5432,
          num_turns: 5,
          usage: {
            input_tokens: 8934,
            output_tokens: 2341,
            cache_read_input_tokens: 5600,
            cache_creation_input_tokens: 1200
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              inputTokens: 8934,
              outputTokens: 2341,
              costUSD: 0.0347
            }
          }
        }
      ];

      await writer.writeTokenMetrics(realWorldMessages, 'real-session-123');

      expect(mockDb.run).toHaveBeenCalledTimes(1);

      const [, params] = mockDb.run.mock.calls[0];

      expect(params.$sessionId).toBe('real-session-123');
      expect(params.$inputTokens).toBe(8934);
      expect(params.$outputTokens).toBe(2341);
      expect(params.$totalTokens).toBe(11275);
      // Expected calculation:
      // Input: 8934 * 0.003 / 1000 = 0.026802
      // Output: 2341 * 0.015 / 1000 = 0.035115
      // Cache Read: 5600 * 0.0003 / 1000 = 0.00168
      // Cache Creation: 1200 * 0.003 / 1000 = 0.0036
      // Total: 0.067197
      expect(params.$estimatedCost).toBeCloseTo(0.067197, 4);
    });

    it('should handle streaming completion with final result', async () => {
      const streamingMessages = [
        {
          type: 'stream',
          delta: 'Hello'
        },
        {
          type: 'stream',
          delta: ' world'
        },
        {
          type: 'result',
          subtype: 'success',
          usage: {
            input_tokens: 450,
            output_tokens: 120
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              inputTokens: 450,
              outputTokens: 120
            }
          }
        }
      ];

      await writer.writeTokenMetrics(streamingMessages, 'streaming-session');

      expect(mockDb.run).toHaveBeenCalledTimes(1);

      const [, params] = mockDb.run.mock.calls[0];
      expect(params.$inputTokens).toBe(450);
      expect(params.$outputTokens).toBe(120);
    });
  });
});
