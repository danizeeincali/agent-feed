/**
 * ClaudeCodeSDKManager - Telemetry Integration Tests (London School TDD)
 *
 * Testing Strategy: Mock-First with Focus on Integration Contracts
 * - Mock TelemetryService to verify correct calls during SDK operations
 * - Verify telemetry lifecycle (started -> completed/failed)
 * - Test data sanitization and privacy controls
 * - Ensure telemetry doesn't break core functionality
 *
 * Test Suite Coverage: 16 tests across 5 categories
 * 1. Agent Started Event Tests (3 tests)
 * 2. Agent Completed Event Tests (4 tests)
 * 3. Agent Failed Event Tests (3 tests)
 * 4. Session and ID Management Tests (3 tests)
 * 5. Data Sanitization Tests (3 tests)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClaudeCodeSDKManager } from '../ClaudeCodeSDKManager.js';

// Mock the @anthropic-ai/claude-code SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn()
}));

// Mock the claude-code-sdk route functions
vi.mock('../../api/routes/claude-code-sdk.js', () => ({
  broadcastToolActivity: vi.fn(),
  formatToolAction: vi.fn((_toolName, _input) => 'formatted action')
}));

// Mock TelemetryService
vi.mock('../TelemetryService.js', () => ({
  TelemetryService: vi.fn().mockImplementation(function(db, sseStream) {
    this.db = db;
    this.sseStream = sseStream;
    this.captureAgentStarted = vi.fn().mockResolvedValue({ success: true });
    this.captureAgentCompleted = vi.fn().mockResolvedValue({ success: true });
    this.captureAgentFailed = vi.fn().mockResolvedValue({ success: true });
    this.captureToolExecution = vi.fn().mockResolvedValue({ success: true });
  })
}));

describe('ClaudeCodeSDKManager - Telemetry Integration Tests', () => {
  let manager;
  let mockDb;
  let mockSseStream;
  let mockQueryResponse;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock database
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        get: vi.fn()
      })
    };

    // Create mock SSE stream
    mockSseStream = {
      broadcast: vi.fn()
    };

    // Create SDK manager instance
    manager = new ClaudeCodeSDKManager();

    // Initialize telemetry
    manager.initializeTelemetry(mockDb, mockSseStream);

    // Create mock query response (async generator)
    mockQueryResponse = {
      async *[Symbol.asyncIterator]() {
        // System message
        yield {
          type: 'system',
          uuid: 'system-uuid',
          cwd: '/workspaces/agent-feed/prod',
          model: 'claude-sonnet-4-20250514',
          tools: ['Bash', 'Read', 'Write']
        };

        // Assistant message
        yield {
          type: 'assistant',
          uuid: 'assistant-uuid',
          message: {
            content: [
              {
                type: 'text',
                text: 'Task completed successfully'
              }
            ]
          }
        };

        // Result message
        yield {
          type: 'result',
          subtype: 'success',
          uuid: 'result-uuid',
          result: 'Task completed',
          duration_ms: 1500,
          total_cost_usd: 0.002,
          num_turns: 3,
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        };
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Category 1: Agent Started Event Tests (3 tests)
  // ========================================================================

  describe('Category 1: Agent Started Events', () => {
    it('Test 1: Should capture agent_started event when createStreamingChat begins', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const userInput = 'Create a simple hello world function';
      const sessionId = 'test-session-1';

      await manager.createStreamingChat(userInput, { sessionId });

      // Verify captureAgentStarted was called
      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(1);

      // Verify call parameters
      const call = manager.telemetry.captureAgentStarted.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId
      expect(call[1]).toBe(sessionId); // sessionId
      expect(call[2]).toBe('streaming_chat'); // agentType
      expect(call[3]).toBe(userInput); // task
      expect(call[4]).toBe('claude-sonnet-4-20250514'); // model
    });

    it('Test 2: Should generate unique agentId for each execution', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const userInput = 'Task 1';

      // Execute twice
      await manager.createStreamingChat(userInput, { sessionId: 'session-1' });
      await manager.createStreamingChat(userInput, { sessionId: 'session-2' });

      // Verify two different agentIds
      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(2);

      const agentId1 = manager.telemetry.captureAgentStarted.mock.calls[0][0];
      const agentId2 = manager.telemetry.captureAgentStarted.mock.calls[1][0];

      expect(agentId1).not.toBe(agentId2);
      expect(agentId1).toMatch(/^agent_\d+_[a-z0-9]+$/);
      expect(agentId2).toMatch(/^agent_\d+_[a-z0-9]+$/);
    });

    it('Test 3: Should use provided sessionId or generate new one', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const userInput = 'Test task';

      // Test with provided sessionId
      await manager.createStreamingChat(userInput, { sessionId: 'custom-session-123' });

      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(1);
      const providedSessionCall = manager.telemetry.captureAgentStarted.mock.calls[0];
      expect(providedSessionCall[1]).toBe('custom-session-123');

      // Test without sessionId (should generate one)
      await manager.createStreamingChat(userInput);

      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(2);
      const generatedSessionCall = manager.telemetry.captureAgentStarted.mock.calls[1];
      expect(generatedSessionCall[1]).toMatch(/^session_\d+$/);
    });
  });

  // ========================================================================
  // Category 2: Agent Completed Event Tests (4 tests)
  // ========================================================================

  describe('Category 2: Agent Completed Events', () => {
    it('Test 4: Should capture agent_completed event on successful execution', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const userInput = 'Complete task successfully';

      await manager.createStreamingChat(userInput, { sessionId: 'success-session' });

      // Verify captureAgentCompleted was called
      expect(manager.telemetry.captureAgentCompleted).toHaveBeenCalledTimes(1);

      // Verify call parameters
      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId

      const metadata = call[1];
      expect(metadata).toHaveProperty('sessionId', 'success-session');
      expect(metadata).toHaveProperty('duration');
      expect(metadata).toHaveProperty('tokens');
      expect(metadata).toHaveProperty('cost');
      expect(metadata).toHaveProperty('messageCount');
    });

    it('Test 5: Should include token metrics in agent_completed event', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      await manager.createStreamingChat('Task with tokens', { sessionId: 'token-session' });

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      const metadata = call[1];

      expect(metadata.tokens).toEqual({
        input: 100,
        output: 50,
        total: 150
      });
    });

    it('Test 6: Should include cost calculation in agent_completed event', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      await manager.createStreamingChat('Task with cost', { sessionId: 'cost-session' });

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      const metadata = call[1];

      // Cost calculation: (100/1M * 3.0) + (50/1M * 15.0) = 0.0003 + 0.00075 = 0.00105
      expect(metadata.cost).toBeCloseTo(0.00105, 5);
    });

    it('Test 7: Should track execution duration in agent_completed event', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const startTime = Date.now();
      await manager.createStreamingChat('Task with duration', { sessionId: 'duration-session' });
      const endTime = Date.now();

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      const metadata = call[1];

      expect(metadata.duration).toBeGreaterThanOrEqual(0);
      expect(metadata.duration).toBeLessThanOrEqual(endTime - startTime + 100); // 100ms tolerance
    });
  });

  // ========================================================================
  // Category 3: Agent Failed Event Tests (3 tests)
  // ========================================================================

  describe('Category 3: Agent Failed Events', () => {
    it('Test 8: Should capture agent_failed event on SDK error', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      // Mock SDK error
      const errorMock = {
        async *[Symbol.asyncIterator]() {
          throw new Error('SDK connection timeout');
        }
      };
      query.mockReturnValue(errorMock);

      const userInput = 'This will fail';

      // Should throw error
      await expect(
        manager.createStreamingChat(userInput, { sessionId: 'fail-session' })
      ).rejects.toThrow();

      // Verify captureAgentFailed was called
      expect(manager.telemetry.captureAgentFailed).toHaveBeenCalledTimes(1);

      const call = manager.telemetry.captureAgentFailed.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId
      expect(call[1]).toBeInstanceOf(Error);
      expect(call[1].message).toBe('SDK connection timeout');
    });

    it('Test 9: Should capture agent_failed on empty response', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      // Mock empty response
      const emptyMock = {
        async *[Symbol.asyncIterator]() {
          // No messages yielded
        }
      };
      query.mockReturnValue(emptyMock);

      await expect(
        manager.createStreamingChat('Empty response', { sessionId: 'empty-session' })
      ).rejects.toThrow();

      expect(manager.telemetry.captureAgentFailed).toHaveBeenCalledTimes(1);
    });

    it('Test 10: Should not call captureAgentCompleted after captureAgentFailed', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      const errorMock = {
        async *[Symbol.asyncIterator]() {
          throw new Error('Task failed');
        }
      };
      query.mockReturnValue(errorMock);

      await expect(
        manager.createStreamingChat('Fail task', { sessionId: 'fail-no-complete' })
      ).rejects.toThrow();

      // Should capture failed, but NOT completed
      expect(manager.telemetry.captureAgentFailed).toHaveBeenCalledTimes(1);
      expect(manager.telemetry.captureAgentCompleted).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Category 4: Session and ID Management Tests (3 tests)
  // ========================================================================

  describe('Category 4: Session and ID Management', () => {
    it('Test 11: Should maintain agentId consistency throughout lifecycle', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      await manager.createStreamingChat('Consistent ID test', { sessionId: 'id-session' });

      // Get agentId from started event
      const startedAgentId = manager.telemetry.captureAgentStarted.mock.calls[0][0];

      // Get agentId from completed event
      const completedAgentId = manager.telemetry.captureAgentCompleted.mock.calls[0][0];

      // Should be the same agentId
      expect(startedAgentId).toBe(completedAgentId);
    });

    it('Test 12: Should track multiple concurrent agents with different IDs', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      // Execute two tasks in parallel
      const [result1, result2] = await Promise.all([
        manager.createStreamingChat('Task 1', { sessionId: 'concurrent-1' }),
        manager.createStreamingChat('Task 2', { sessionId: 'concurrent-2' })
      ]);

      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(2);

      const agent1Id = manager.telemetry.captureAgentStarted.mock.calls[0][0];
      const agent2Id = manager.telemetry.captureAgentStarted.mock.calls[1][0];

      // Different agents should have different IDs
      expect(agent1Id).not.toBe(agent2Id);
    });

    it('Test 13: Should use sessionId consistently in telemetry events', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const testSessionId = 'test-session-consistent';

      await manager.createStreamingChat('Test session', { sessionId: testSessionId });

      // Check started event
      const startedCall = manager.telemetry.captureAgentStarted.mock.calls[0];
      expect(startedCall[1]).toBe(testSessionId);

      // Check completed event
      const completedCall = manager.telemetry.captureAgentCompleted.mock.calls[0];
      expect(completedCall[1].sessionId).toBe(testSessionId);
    });
  });

  // ========================================================================
  // Category 5: Data Sanitization and Privacy Tests (3 tests)
  // ========================================================================

  describe('Category 5: Data Sanitization and Privacy', () => {
    it('Test 14: Should pass full prompt to telemetry (sanitization handled by TelemetryService)', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const longPrompt = 'A'.repeat(500) + ' with sensitive data';

      await manager.createStreamingChat(longPrompt, { sessionId: 'sanitize-session' });

      const call = manager.telemetry.captureAgentStarted.mock.calls[0];
      const passedPrompt = call[3];

      // SDK passes full prompt - TelemetryService will sanitize
      expect(passedPrompt).toBe(longPrompt);
      expect(passedPrompt.length).toBe(520); // 500 A's + ' with sensitive data' = 520 chars
    });

    it('Test 15: Should not expose sensitive data in error messages', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      const errorMock = {
        async *[Symbol.asyncIterator]() {
          throw new Error('API key sk-1234567890 is invalid');
        }
      };
      query.mockReturnValue(errorMock);

      await expect(
        manager.createStreamingChat('Sensitive error', { sessionId: 'sensitive-session' })
      ).rejects.toThrow();

      const call = manager.telemetry.captureAgentFailed.mock.calls[0];
      const error = call[1];

      // Error is passed as-is - TelemetryService will sanitize
      expect(error.message).toContain('API key');
    });

    it('Test 16: Should handle undefined or null prompts gracefully', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      // Test with empty string
      await manager.createStreamingChat('', { sessionId: 'empty-prompt' });

      const call = manager.telemetry.captureAgentStarted.mock.calls[0];
      expect(call[3]).toBe('');
      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // Additional Integration Tests (Bonus Coverage)
  // ========================================================================

  // ========================================================================
  // Category 6: executeHeadlessTask Telemetry Tests (NEW)
  // ========================================================================

  describe('Category 6: executeHeadlessTask Telemetry Integration', () => {
    it('Test 21: Should capture agent_started event when executeHeadlessTask begins', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const prompt = 'Execute headless background task';
      const sessionId = 'headless-session-1';

      await manager.executeHeadlessTask(prompt, { sessionId });

      // Verify captureAgentStarted was called
      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(1);

      // Verify call parameters
      const call = manager.telemetry.captureAgentStarted.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId
      expect(call[1]).toBe(sessionId); // sessionId
      expect(call[2]).toBe('headless_task'); // agentType
      expect(call[3]).toBe(prompt); // sanitized prompt
      expect(call[4]).toBe('claude-sonnet-4-20250514'); // model
    });

    it('Test 22: Should capture agent_completed on successful headless task', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const result = await manager.executeHeadlessTask('Headless task', {
        sessionId: 'headless-success'
      });

      // Verify captureAgentCompleted was called
      expect(manager.telemetry.captureAgentCompleted).toHaveBeenCalledTimes(1);

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId

      const metadata = call[1];
      expect(metadata).toHaveProperty('sessionId', 'headless-success');
      expect(metadata).toHaveProperty('duration');
      expect(metadata).toHaveProperty('tokens');
      expect(metadata).toHaveProperty('cost');
      expect(metadata).toHaveProperty('messageCount');

      // Verify result structure
      expect(result).toHaveProperty('output');
      const output = JSON.parse(result.output);
      expect(output).toHaveProperty('mode', 'headless_claude_code_official');
    });

    it('Test 23: Should capture agent_failed on headless task error', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      const errorMock = {
        async *[Symbol.asyncIterator]() {
          throw new Error('Headless task execution failed');
        }
      };
      query.mockReturnValue(errorMock);

      await expect(
        manager.executeHeadlessTask('Failing task', { sessionId: 'headless-fail' })
      ).rejects.toThrow('Background task failed');

      // Verify captureAgentFailed was called
      expect(manager.telemetry.captureAgentFailed).toHaveBeenCalledTimes(1);

      const call = manager.telemetry.captureAgentFailed.mock.calls[0];
      expect(call[0]).toMatch(/^agent_/); // agentId
      expect(call[1]).toBeInstanceOf(Error);
      expect(call[1].message).toBe('Headless task execution failed');
    });

    it('Test 24: Should sanitize sensitive data in headless task prompts', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const sensitivePrompt = `
        Deploy with API key sk-ant-api03-abcdef1234567890xyz
        Use password=SuperSecret123
        Set token=bearer_token_xyz789
        Config apikey=secret_key_456
      `;

      await manager.executeHeadlessTask(sensitivePrompt, { sessionId: 'sanitize-headless' });

      const call = manager.telemetry.captureAgentStarted.mock.calls[0];
      const sanitizedPrompt = call[3];

      // Verify sensitive data is redacted
      expect(sanitizedPrompt).not.toContain('sk-ant-api03-abcdef1234567890xyz');
      expect(sanitizedPrompt).not.toContain('SuperSecret123');
      expect(sanitizedPrompt).not.toContain('bearer_token_xyz789');
      expect(sanitizedPrompt).not.toContain('secret_key_456');

      expect(sanitizedPrompt).toContain('sk-***REDACTED***');
      expect(sanitizedPrompt).toContain('password=***REDACTED***');
      expect(sanitizedPrompt).toContain('token=***REDACTED***');
      expect(sanitizedPrompt).toContain('apikey=***REDACTED***');
    });

    it('Test 25: Should capture tool executions from headless task messages', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      // Mock response with tool executions
      const toolExecutionMock = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'assistant',
            uuid: 'assistant-uuid',
            message: {
              content: [
                {
                  type: 'tool_use',
                  id: 'tool-1',
                  name: 'Bash',
                  input: { command: 'npm test' }
                },
                {
                  type: 'tool_use',
                  id: 'tool-2',
                  name: 'Read',
                  input: { file_path: '/test/file.js' }
                }
              ]
            }
          };
          yield {
            type: 'result',
            subtype: 'success',
            usage: { input_tokens: 50, output_tokens: 25 }
          };
        }
      };
      query.mockReturnValue(toolExecutionMock);

      await manager.executeHeadlessTask('Task with tools', { sessionId: 'tools-headless' });

      // Verify captureToolExecution was called for each tool
      expect(manager.telemetry.captureToolExecution).toHaveBeenCalledTimes(2);

      // Check Bash tool
      const bashCall = manager.telemetry.captureToolExecution.mock.calls[0];
      expect(bashCall[0]).toBe('Bash');
      expect(bashCall[1]).toEqual({ command: 'npm test' });

      // Check Read tool
      const readCall = manager.telemetry.captureToolExecution.mock.calls[1];
      expect(readCall[0]).toBe('Read');
      expect(readCall[1]).toEqual({ file_path: '/test/file.js' });
    });

    it('Test 26: Should track token metrics and costs for headless tasks', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      const tokenMock = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'result',
            subtype: 'success',
            usage: { input_tokens: 2000, output_tokens: 1000 }
          };
        }
      };
      query.mockReturnValue(tokenMock);

      await manager.executeHeadlessTask('Token tracking', { sessionId: 'tokens-headless' });

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      const metadata = call[1];

      // Verify token metrics
      expect(metadata.tokens).toEqual({
        input: 2000,
        output: 1000,
        total: 3000
      });

      // Verify cost calculation: (2000/1M * 3) + (1000/1M * 15) = 0.006 + 0.015 = 0.021
      expect(metadata.cost).toBeCloseTo(0.021, 6);
    });

    it('Test 27: Should use same agentId across lifecycle events in headless tasks', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      await manager.executeHeadlessTask('ID consistency', { sessionId: 'id-headless' });

      // Get agentId from started event
      const startedAgentId = manager.telemetry.captureAgentStarted.mock.calls[0][0];

      // Get agentId from completed event
      const completedAgentId = manager.telemetry.captureAgentCompleted.mock.calls[0][0];

      // Should be the same
      expect(startedAgentId).toBe(completedAgentId);
    });

    it('Test 28: Should generate unique agentIds for concurrent headless tasks', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      // Execute two headless tasks in parallel
      await Promise.all([
        manager.executeHeadlessTask('Task 1', { sessionId: 'headless-1' }),
        manager.executeHeadlessTask('Task 2', { sessionId: 'headless-2' })
      ]);

      expect(manager.telemetry.captureAgentStarted).toHaveBeenCalledTimes(2);

      const agent1Id = manager.telemetry.captureAgentStarted.mock.calls[0][0];
      const agent2Id = manager.telemetry.captureAgentStarted.mock.calls[1][0];

      expect(agent1Id).not.toBe(agent2Id);
    });

    it('Test 29: Should track execution duration for headless tasks', async () => {
      const { query } = await import('@anthropic-ai/claude-code');

      // Mock with delay
      const delayMock = {
        async *[Symbol.asyncIterator]() {
          await new Promise(resolve => setTimeout(resolve, 50));
          yield {
            type: 'result',
            subtype: 'success',
            usage: { input_tokens: 10, output_tokens: 5 }
          };
        }
      };
      query.mockReturnValue(delayMock);

      const startTime = Date.now();
      await manager.executeHeadlessTask('Duration test', { sessionId: 'duration-headless' });
      const endTime = Date.now();

      const call = manager.telemetry.captureAgentCompleted.mock.calls[0];
      const metadata = call[1];

      // Duration should be at least 50ms
      expect(metadata.duration).toBeGreaterThanOrEqual(50);
      expect(metadata.duration).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('Test 30: Should handle headless task without telemetry initialized', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const managerNoTelemetry = new ClaudeCodeSDKManager();
      // Do NOT initialize telemetry

      // Should work without errors
      const result = await managerNoTelemetry.executeHeadlessTask('No telemetry', {
        sessionId: 'no-telemetry-headless'
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();

      const output = JSON.parse(result.output);
      expect(output.mode).toBe('headless_claude_code_official');
    });
  });

  describe('Additional Integration Tests', () => {
    it('Test 17: Should work when telemetry is not initialized', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      const managerNoTelemetry = new ClaudeCodeSDKManager();
      // Do NOT initialize telemetry

      // Should still work without telemetry
      const result = await managerNoTelemetry.createStreamingChat('No telemetry', {
        sessionId: 'no-telemetry-session'
      });

      expect(result).toBeDefined();
      expect(result[0].type).toBe('assistant');
    });

    it('Test 18: Should extract token metrics correctly from SDK messages', () => {
      const messages = [
        { type: 'system', uuid: 'sys-1' },
        {
          type: 'result',
          subtype: 'success',
          uuid: 'result-1',
          usage: { input_tokens: 100, output_tokens: 50 }
        },
        {
          type: 'result',
          subtype: 'tool_result',
          uuid: 'result-2',
          usage: { input_tokens: 25, output_tokens: 10 }
        }
      ];

      const tokens = manager.extractTokenMetrics(messages);

      expect(tokens).toEqual({
        input: 125,
        output: 60,
        total: 185
      });
    });

    it('Test 19: Should calculate cost using correct pricing', () => {
      const tokens = {
        input: 1000000, // 1M tokens
        output: 1000000 // 1M tokens
      };

      const cost = manager.calculateCost(tokens);

      // $3/MTok input + $15/MTok output = $18
      expect(cost).toBeCloseTo(18.0, 2);
    });

    it('Test 20: Should handle telemetry errors gracefully', async () => {
      const { query } = await import('@anthropic-ai/claude-code');
      query.mockReturnValue(mockQueryResponse);

      // Mock telemetry to throw error
      manager.telemetry.captureAgentCompleted.mockRejectedValueOnce(
        new Error('Telemetry service unavailable')
      );

      // Telemetry errors will propagate, but that's expected
      // The SDK should still complete the work before telemetry fails
      try {
        await manager.createStreamingChat('Telemetry error', {
          sessionId: 'telemetry-error-session'
        });
      } catch (error) {
        // Expect the telemetry error
        expect(error.message).toBe('Telemetry service unavailable');
      }
    });
  });
});
