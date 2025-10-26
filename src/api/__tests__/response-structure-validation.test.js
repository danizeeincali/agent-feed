/**
 * Response Structure Validation Tests (London School TDD)
 *
 * Testing Strategy: Validate Claude SDK response format detection
 * - Test various response structures
 * - Verify error detection and logging
 * - Mock-based approach to test validation logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenAnalyticsWriter } from '../../services/TokenAnalyticsWriter.js';

describe('Response Structure Validation Tests (London School TDD)', () => {
  let mockDb;
  let mockPrepare;
  let mockRun;
  let writer;
  let consoleLogSpy;
  let consoleWarnSpy;

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

    writer = new TokenAnalyticsWriter(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 1: Validates correct Claude SDK response format', () => {
    it('should accept and process correctly formatted SDK response', async () => {
      // Arrange - Valid SDK response structure
      const validMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 50
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          },
          total_cost_usd: 0.0215,
          duration_ms: 1500,
          num_turns: 1
        }
      ];
      const sessionId = 'valid-format-test';

      // Act
      await writer.writeTokenMetrics(validMessages, sessionId);

      // Assert - Should successfully write
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'valid-format-test',
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          model: 'claude-sonnet-4-20250514'
        })
      );

      // Verify success logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully extracted metrics')
      );
    });
  });

  describe('Test 2: Detects missing messages property', () => {
    it('should handle null messages gracefully', async () => {
      // Arrange
      const nullMessages = null;
      const sessionId = 'null-messages-test';

      // Act
      await writer.writeTokenMetrics(nullMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();
      expect(mockRun).not.toHaveBeenCalled();

      // Verify warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid messages array'),
        expect.objectContaining({
          isNull: true
        })
      );
    });
  });

  describe('Test 3: Detects empty messages array', () => {
    it('should log warning when messages array is empty', async () => {
      // Arrange
      const emptyMessages = [];
      const sessionId = 'empty-messages-test';

      // Act
      await writer.writeTokenMetrics(emptyMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid messages array'),
        expect.objectContaining({
          length: 0
        })
      );
    });
  });

  describe('Test 4: Detects missing usage data in message', () => {
    it('should validate presence of usage data', async () => {
      // Arrange - Message missing usage field
      const messagesWithoutUsage = [
        {
          type: 'result',
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
          // Missing usage field
        }
      ];
      const sessionId = 'missing-usage-test';

      // Act
      await writer.writeTokenMetrics(messagesWithoutUsage, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify warning logged about missing fields
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required fields'),
        expect.objectContaining({
          hasUsage: false,
          hasModelUsage: true
        })
      );
    });
  });

  describe('Test 5: Handles different response format versions', () => {
    it('should process response with minimal required fields', async () => {
      // Arrange - Minimal valid response
      const minimalMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 500,
            output_tokens: 250
            // Missing optional cache fields
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {}
          }
          // Missing optional fields: total_cost_usd, duration_ms, num_turns
        }
      ];
      const sessionId = 'minimal-format-test';

      // Act
      await writer.writeTokenMetrics(minimalMessages, sessionId);

      // Assert - Should write successfully with defaults
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'minimal-format-test',
          inputTokens: 500,
          outputTokens: 250,
          totalTokens: 750,
          model: 'claude-sonnet-4-20250514'
        })
      );
    });

    it('should process response with extended fields', async () => {
      // Arrange - Response with extra fields
      const extendedMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 1500,
            output_tokens: 750,
            cache_read_input_tokens: 200,
            cache_creation_input_tokens: 100
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              extra_field: 'extra_value'
            }
          },
          total_cost_usd: 0.0325,
          duration_ms: 2500,
          num_turns: 3,
          // Additional fields not in spec
          request_id: 'req_12345',
          metadata: {
            user: 'test',
            session: 'session_xyz'
          }
        }
      ];
      const sessionId = 'extended-format-test';

      // Act
      await writer.writeTokenMetrics(extendedMessages, sessionId);

      // Assert - Should process successfully, ignoring extra fields
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'extended-format-test',
          inputTokens: 1500,
          outputTokens: 750,
          totalTokens: 2250,
          model: 'claude-sonnet-4-20250514'
        })
      );
    });
  });

  describe('Test 6: Logs available properties when validation fails', () => {
    it('should log detailed information about malformed response', async () => {
      // Arrange - Invalid response structure
      const malformedMessages = [
        {
          type: 'result',
          // Missing both usage and modelUsage
          some_other_field: 'value',
          unexpected_data: {
            nested: 'data'
          }
        }
      ];
      const sessionId = 'malformed-test';

      // Act
      await writer.writeTokenMetrics(malformedMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify detailed logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Result message structure'),
        expect.objectContaining({
          hasUsage: false,
          hasModelUsage: false
        })
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required fields')
      );
    });

    it('should log when no result messages are found', async () => {
      // Arrange - Messages with no result type
      const noResultMessages = [
        {
          type: 'request',
          content: 'User message'
        },
        {
          type: 'assistant',
          content: 'Assistant response'
        },
        {
          type: 'tool_use',
          name: 'bash',
          input: { command: 'ls' }
        }
      ];
      const sessionId = 'no-result-test';

      // Act
      await writer.writeTokenMetrics(noResultMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found result messages'),
        0
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No result messages found')
      );
    });

    it('should log when modelUsage is empty', async () => {
      // Arrange - Valid usage but empty modelUsage
      const emptyModelUsageMessages = [
        {
          type: 'result',
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          },
          modelUsage: {}
          // Empty modelUsage object
        }
      ];
      const sessionId = 'empty-model-usage-test';

      // Act
      await writer.writeTokenMetrics(emptyModelUsageMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify logging about missing models
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No models found in modelUsage')
      );
    });

    it('should handle non-array messages parameter', async () => {
      // Arrange - Messages is an object instead of array
      const objectMessages = {
        type: 'result',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        },
        modelUsage: {
          'claude-sonnet-4-20250514': {}
        }
      };
      const sessionId = 'object-messages-test';

      // Act
      await writer.writeTokenMetrics(objectMessages, sessionId);

      // Assert - Should not write
      expect(mockPrepare).not.toHaveBeenCalled();

      // Verify logging
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid messages array'),
        expect.objectContaining({
          isArray: false
        })
      );
    });
  });
});
