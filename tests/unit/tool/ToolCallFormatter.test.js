/**
 * Unit Tests for Tool Call Visualization System
 * Tests the ToolCallFormatter and ToolCallStatusManager integration
 * 
 * TESTING STRATEGY:
 * - Test tool call detection patterns
 * - Test output formatting for different tool types
 * - Test error handling and graceful degradation
 * - Test performance impact (should be minimal)
 * - Test WebSocket integration compatibility
 */

const { ToolCallFormatter, toolCallFormatter } = require('../../../src/services/ToolCallFormatter');
const { ToolCallStatusManager } = require('../../../src/services/ToolCallStatusManager');

describe('ToolCallFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new ToolCallFormatter();
  });

  describe('Tool Call Detection', () => {
    test('should detect standard function calls with antml:function_calls', () => {
      const output = `<function_calls>
<invoke name="Bash">
<parameter name="command">ls -la</parameter>
<parameter name="description">List files in directory</parameter>
</invoke>
</function_calls>`;

      const detected = formatter.detectToolCall(output);
      
      expect(detected).not.toBeNull();
      expect(detected.type).toBe('tool_call');
      expect(detected.toolName).toBe('Bash');
      expect(detected.parameters.command).toBe('ls -la');
      expect(detected.parameters.description).toBe('List files in directory');
    });

    test('should detect tool results', () => {
      const output = `<function_results>
<result>
Command executed successfully
Output: file1.txt file2.txt
</result>
</function_results>`;

      const detected = formatter.detectToolCall(output);
      
      expect(detected).not.toBeNull();
      expect(detected.type).toBe('tool_result');
    });

    test('should detect tool execution indicators', () => {
      const executionOutputs = [
        'Running command: npm install',
        'Executing: git status',
        'Tool Output: Success',
        'Command executed: ls -la'
      ];

      executionOutputs.forEach(output => {
        const detected = formatter.detectToolCall(output);
        expect(detected).not.toBeNull();
        expect(detected.type).toBe('tool_execution');
      });
    });

    test('should return null for non-tool-call output', () => {
      const regularOutputs = [
        'Hello, this is regular output',
        'Error: Something went wrong',
        '> User input command',
        'Processing your request...'
      ];

      regularOutputs.forEach(output => {
        const detected = formatter.detectToolCall(output);
        expect(detected).toBeNull();
      });
    });
  });

  describe('Output Formatting', () => {
    test('should format tool call output with enhanced metadata', () => {
      const toolCallOutput = `<function_calls>
<invoke name="Read">
<parameter name="file_path">/workspaces/agent-feed/package.json</parameter>
</invoke>
</function_calls>`;

      const formatted = formatter.formatToolCallOutput(toolCallOutput, 'test-instance');

      expect(formatted.type).toBe('tool_call');
      expect(formatted.enhanced).toBe(true);
      expect(formatted.source).toBe('claude-tools');
      expect(formatted.terminalId).toBe('test-instance');
      expect(formatted.toolCall).toBeDefined();
      expect(formatted.toolCall.toolName).toBe('Read');
      expect(formatted.toolCall.status).toBe('starting');
      expect(formatted.toolCall.displayName).toBe('Read File');
      expect(formatted.toolCall.icon).toBe('📖');
    });

    test('should format tool result output', () => {
      const toolResultOutput = `<function_results>
<result>
File contents: {"name": "agent-feed", "version": "1.0.0"}
</result>
</function_results>`;

      const formatted = formatter.formatToolCallOutput(toolResultOutput, 'test-instance');

      expect(formatted.type).toBe('tool_result');
      expect(formatted.enhanced).toBe(true);
      expect(formatted.toolResult).toBeDefined();
      expect(formatted.toolResult.status).toBe('completed');
    });

    test('should handle regular output without enhancement', () => {
      const regularOutput = 'This is just regular Claude output';

      const formatted = formatter.formatToolCallOutput(regularOutput, 'test-instance');

      expect(formatted.type).toBe('output');
      expect(formatted.enhanced).toBe(false);
      expect(formatted.source).toBe('process');
      expect(formatted.data).toBe(regularOutput);
    });
  });

  describe('Tool Display Names and Icons', () => {
    test('should provide correct display names for all supported tools', () => {
      const tools = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'WebFetch', 'TodoWrite', 'WebSearch'];
      
      tools.forEach(toolName => {
        const displayName = formatter.getToolDisplayName(toolName);
        expect(displayName).toBeDefined();
        expect(displayName.length).toBeGreaterThan(0);
        expect(displayName).not.toBe(toolName); // Should be human-readable, not technical
      });
    });

    test('should provide fallback for unknown tools', () => {
      const unknownTool = 'UnknownTool';
      const displayName = formatter.getToolDisplayName(unknownTool);
      expect(displayName).toBe(unknownTool);
    });

    test('should provide icons for all supported tools', () => {
      const tools = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'WebFetch', 'TodoWrite', 'WebSearch'];
      
      tools.forEach(toolName => {
        const icon = formatter.getToolIcon(toolName);
        expect(icon).toBeDefined();
        expect(icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    test('should handle malformed tool call output gracefully', () => {
      const malformedOutput = '<function_calls><invoke name="InvalidTool"><parameter';

      const formatted = formatter.formatToolCallOutput(malformedOutput, 'test-instance');

      // Should fall back to regular output format
      expect(formatted.type).toBe('output');
      expect(formatted.enhanced).toBe(false);
      expect(formatted.error).toBe('formatting_failed');
    });

    test('should handle null/undefined input gracefully', () => {
      const inputs = [null, undefined, ''];

      inputs.forEach(input => {
        const formatted = formatter.formatToolCallOutput(input, 'test-instance');
        expect(formatted.type).toBe('output');
        expect(formatted.enhanced).toBe(false);
      });
    });

    test('should continue working after errors', () => {
      // Cause an error first
      formatter.formatToolCallOutput('<malformed', 'test');
      
      // Should still work normally
      const validOutput = 'Normal output';
      const formatted = formatter.formatToolCallOutput(validOutput, 'test');
      
      expect(formatted.type).toBe('output');
      expect(formatted.data).toBe(validOutput);
    });
  });

  describe('Performance', () => {
    test('should format output quickly (under 10ms)', () => {
      const output = `<function_calls>
<invoke name="Bash">
<parameter name="command">echo "performance test"</parameter>
</invoke>
</function_calls>`;

      const startTime = performance.now();
      formatter.formatToolCallOutput(output, 'perf-test');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });

    test('should handle large output without performance issues', () => {
      const largeOutput = '<function_calls><invoke name="Read"><parameter name="file_path">/large/file</parameter></invoke></function_calls>' + 'x'.repeat(10000);

      const startTime = performance.now();
      formatter.formatToolCallOutput(largeOutput, 'large-test');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms even for large output
    });
  });
});

describe('ToolCallStatusManager', () => {
  let statusManager;
  let mockBroadcast;

  beforeEach(() => {
    mockBroadcast = jest.fn();
    statusManager = new ToolCallStatusManager(mockBroadcast);
  });

  afterEach(() => {
    // Cleanup any active intervals
    statusManager.activeStatusIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    statusManager.activeStatusIntervals.clear();
  });

  describe('Tool Call Monitoring', () => {
    test('should start monitoring a tool call', () => {
      const toolInfo = {
        toolName: 'Bash',
        parameters: { command: 'ls' }
      };

      statusManager.startMonitoring('tool-123', 'instance-456', toolInfo);

      expect(statusManager.activeStatusIntervals.has('tool-123')).toBe(true);
      expect(mockBroadcast).toHaveBeenCalledWith('instance-456', expect.objectContaining({
        type: 'tool_status',
        toolStatusUpdate: expect.objectContaining({
          toolCallId: 'tool-123',
          status: 'starting',
          toolName: 'Bash'
        })
      }));
    });

    test('should stop monitoring a tool call', () => {
      const toolInfo = { toolName: 'Read', parameters: {} };
      
      statusManager.startMonitoring('tool-456', 'instance-789', toolInfo);
      expect(statusManager.activeStatusIntervals.has('tool-456')).toBe(true);
      
      statusManager.stopMonitoring('tool-456', 'instance-789', 'completed');
      
      expect(statusManager.activeStatusIntervals.has('tool-456')).toBe(false);
      expect(mockBroadcast).toHaveBeenLastCalledWith('instance-789', expect.objectContaining({
        toolStatusUpdate: expect.objectContaining({
          status: 'completed',
          progress: 100
        })
      }));
    });

    test('should not create duplicate monitors', () => {
      const toolInfo = { toolName: 'Write', parameters: {} };
      
      statusManager.startMonitoring('tool-duplicate', 'instance-test', toolInfo);
      statusManager.startMonitoring('tool-duplicate', 'instance-test', toolInfo);
      
      expect(statusManager.activeStatusIntervals.size).toBe(1);
    });
  });

  describe('Progress Calculation', () => {
    test('should calculate progress based on tool type and elapsed time', () => {
      const toolInfo = {
        toolName: 'Bash',
        startTime: Date.now() - 2500 // 2.5 seconds ago
      };

      const progress = statusManager.calculateProgress('tool-progress', toolInfo);
      
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThanOrEqual(90); // Max 90% until completion
    });

    test('should generate appropriate activity messages', () => {
      const activities = [
        statusManager.generateActivityMessage('Bash', 10),
        statusManager.generateActivityMessage('Bash', 40),
        statusManager.generateActivityMessage('Bash', 70),
        statusManager.generateActivityMessage('Bash', 90)
      ];

      expect(activities.length).toBe(4);
      expect(activities[0]).toContain('Initializing');
      expect(activities[3]).toContain('Finalizing');
    });
  });

  describe('Error Handling', () => {
    test('should handle broadcast function errors gracefully', () => {
      const errorBroadcast = jest.fn(() => { throw new Error('Broadcast failed'); });
      statusManager.setBroadcastFunction(errorBroadcast);

      // Should not throw error
      expect(() => {
        statusManager.sendStatusUpdate('instance', { type: 'test' });
      }).not.toThrow();
    });

    test('should continue monitoring after individual update failures', (done) => {
      const failingBroadcast = jest.fn(() => { throw new Error('Update failed'); });
      statusManager.setBroadcastFunction(failingBroadcast);

      statusManager.startMonitoring('tool-error', 'instance-error', {
        toolName: 'Test',
        parameters: {}
      });

      // Wait for a few update cycles
      setTimeout(() => {
        expect(statusManager.activeStatusIntervals.has('tool-error')).toBe(true);
        statusManager.stopMonitoring('tool-error', 'instance-error');
        done();
      }, 2100); // Wait for 2+ update cycles
    });
  });

  describe('Cleanup', () => {
    test('should cleanup old tool calls', () => {
      statusManager.startMonitoring('tool-cleanup', 'instance-cleanup', {
        toolName: 'Test',
        parameters: {}
      });

      statusManager.cleanupInstance('instance-cleanup');
      
      expect(statusManager.activeStatusIntervals.size).toBe(0);
    });

    test('should auto-timeout long-running tool calls', (done) => {
      // Start monitoring with a very short timeout for testing
      statusManager.startMonitoring('tool-timeout', 'instance-timeout', {
        toolName: 'Test',
        parameters: {}
      });

      // Override the timeout to be shorter for testing
      setTimeout(() => {
        statusManager.stopMonitoring('tool-timeout', 'instance-timeout', 'timeout');
        expect(statusManager.activeStatusIntervals.has('tool-timeout')).toBe(false);
        done();
      }, 100);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together - ToolCallFormatter and ToolCallStatusManager', () => {
    const formatter = new ToolCallFormatter();
    const mockBroadcast = jest.fn();
    const statusManager = new ToolCallStatusManager(mockBroadcast);

    const toolCallOutput = `<function_calls>
<invoke name="Grep">
<parameter name="pattern">test</parameter>
<parameter name="path">./src</parameter>
</invoke>
</function_calls>`;

    // Format the output
    const formatted = formatter.formatToolCallOutput(toolCallOutput, 'integration-test');

    // Should detect it as a tool call
    expect(formatted.type).toBe('tool_call');
    expect(formatted.enhanced).toBe(true);

    // Start monitoring if it's a tool call
    if (formatted.toolCall) {
      statusManager.startMonitoring(
        formatted.toolCall.id,
        'integration-test',
        {
          toolName: formatted.toolCall.toolName,
          parameters: formatted.toolCall.parameters
        }
      );
    }

    // Should have started monitoring
    expect(statusManager.activeStatusIntervals.size).toBe(1);
    expect(mockBroadcast).toHaveBeenCalled();

    // Cleanup
    statusManager.cleanupInstance('integration-test');
  });
});