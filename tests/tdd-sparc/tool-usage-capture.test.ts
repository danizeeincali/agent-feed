/**
 * TDD Test Suite for Tool Usage Capture Agent
 * SPARC Testing Implementation - Full coverage for tool event capture and terminal display
 */

import { ToolUsageCaptureAgent } from '../../src/agents/tool-usage-capture-agent';
import { EventEmitter } from 'events';

// Mock terminal display implementation
class MockTerminalDisplay extends EventEmitter {
  public content: string = '';
  public title: string = '';

  write(content: string): void {
    this.content += content;
    this.emit('write', content);
  }

  clear(): void {
    this.content = '';
    this.emit('clear');
  }

  setTitle(title: string): void {
    this.title = title;
    this.emit('setTitle', title);
  }

  getContent(): string {
    return this.content;
  }

  getTitle(): string {
    return this.title;
  }
}

describe('ToolUsageCaptureAgent', () => {
  let agent: ToolUsageCaptureAgent;
  let mockDisplay: MockTerminalDisplay;
  const instanceId = 'test-instance-1';

  beforeEach(() => {
    agent = new ToolUsageCaptureAgent();
    mockDisplay = new MockTerminalDisplay();
    agent.registerTerminalDisplay(instanceId, mockDisplay);
  });

  afterEach(() => {
    agent.shutdown();
  });

  describe('Terminal Display Registration', () => {
    test('should register terminal display correctly', () => {
      const newInstanceId = 'test-instance-2';
      const newDisplay = new MockTerminalDisplay();
      
      agent.registerTerminalDisplay(newInstanceId, newDisplay);
      
      expect(newDisplay.getTitle()).toContain(newInstanceId.slice(0, 8));
    });

    test('should unregister terminal display', () => {
      agent.unregisterTerminalDisplay(instanceId);
      
      // Tool capture should not affect unregistered displays
      const toolId = agent.captureToolExecution(instanceId, 'Read', 'file.ts');
      agent.completeToolExecution(toolId, true, 'File content', undefined, 150);
      
      expect(mockDisplay.getContent()).not.toContain('[TOOL]');
    });

    test('should set appropriate terminal title', () => {
      const expectedTitle = `Claude Code Terminal - ${instanceId.slice(0, 8)}`;
      expect(mockDisplay.getTitle()).toBe(expectedTitle);
    });
  });

  describe('Tool Execution Capture', () => {
    test('should capture tool start events', () => {
      const toolId = agent.captureToolExecution(
        instanceId, 
        'Read', 
        '/path/to/file.ts',
        { lines: 100 },
        { source: 'user' }
      );

      expect(toolId).toBeDefined();
      expect(mockDisplay.getContent()).toContain('[TOOL]');
      expect(mockDisplay.getContent()).toContain('Read');
      expect(mockDisplay.getContent()).toContain('/path/to/file.ts');
      expect(mockDisplay.getContent()).toContain('lines: 100');
    });

    test('should display tool completion successfully', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Edit', 'update function');
      
      agent.completeToolExecution(
        toolId, 
        true, 
        'Function updated successfully', 
        undefined, 
        250
      );

      const content = mockDisplay.getContent();
      expect(content).toContain('[SUCCESS]');
      expect(content).toContain('(250ms)');
      expect(content).toContain('Function updated successfully');
    });

    test('should display tool failure with error', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Bash', 'npm test');
      
      agent.completeToolExecution(
        toolId, 
        false, 
        undefined, 
        'Tests failed with exit code 1', 
        1200
      );

      const content = mockDisplay.getContent();
      expect(content).toContain('[FAILED]');
      expect(content).toContain('(1200ms)');
      expect(content).toContain('Tests failed with exit code 1');
    });

    test('should handle tools without parameters', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Git', 'status');
      
      expect(mockDisplay.getContent()).toContain('Git -> status');
      expect(mockDisplay.getContent()).not.toContain('()');
    });

    test('should format long parameters appropriately', () => {
      const longParameter = 'a'.repeat(60);
      const toolId = agent.captureToolExecution(
        instanceId, 
        'Write', 
        'large-file.txt',
        { content: longParameter }
      );

      const content = mockDisplay.getContent();
      expect(content).toContain('content: "aaa...'); // Should be truncated
      expect(content).not.toContain(longParameter); // Should not contain full string
    });
  });

  describe('Tool History Management', () => {
    test('should maintain tool history', () => {
      // Execute several tools
      for (let i = 1; i <= 5; i++) {
        const toolId = agent.captureToolExecution(instanceId, 'Read', `file${i}.ts`);
        agent.completeToolExecution(toolId, true, `File ${i} content`, undefined, 100);
      }

      const stats = agent.getToolStats();
      expect(stats.totalToolsExecuted).toBe(5);
    });

    test('should limit history size', () => {
      // Execute more tools than the history limit (100)
      for (let i = 1; i <= 105; i++) {
        const toolId = agent.captureToolExecution(instanceId, 'Read', `file${i}.ts`);
        agent.completeToolExecution(toolId, true, `File ${i} content`, undefined, 100);
      }

      const stats = agent.getToolStats();
      expect(stats.totalToolsExecuted).toBe(100); // Should be capped at history limit
    });

    test('should show recent history for new terminal connections', () => {
      // Execute some tools first
      for (let i = 1; i <= 3; i++) {
        const toolId = agent.captureToolExecution(instanceId, 'Edit', `function${i}`);
        agent.completeToolExecution(toolId, true, `Function ${i} updated`, undefined, 150);
      }

      // Register a new display (simulating reconnection)
      const newDisplay = new MockTerminalDisplay();
      agent.registerTerminalDisplay(instanceId, newDisplay);

      const content = newDisplay.getContent();
      expect(content).toContain('Recent Tool Usage');
      expect(content).toContain('[HIST]');
      expect(content).toContain('function1');
      expect(content).toContain('function2');
      expect(content).toContain('function3');
    });

    test('should clear history when requested', () => {
      // Execute some tools
      for (let i = 1; i <= 3; i++) {
        const toolId = agent.captureToolExecution(instanceId, 'Read', `file${i}.ts`);
        agent.completeToolExecution(toolId, true, `File ${i} content`, undefined, 100);
      }

      expect(agent.getToolStats().totalToolsExecuted).toBe(3);

      agent.clearHistory();

      expect(agent.getToolStats().totalToolsExecuted).toBe(0);
    });
  });

  describe('Output Formatting', () => {
    test('should format short output normally', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Bash', 'ls');
      agent.completeToolExecution(toolId, true, 'file1.ts\nfile2.ts', undefined, 50);

      const content = mockDisplay.getContent();
      expect(content).toContain('file1.ts\nfile2.ts');
    });

    test('should truncate long output', () => {
      const longOutput = 'line\n'.repeat(10); // 10 lines
      const toolId = agent.captureToolExecution(instanceId, 'Read', 'big-file.txt');
      agent.completeToolExecution(toolId, true, longOutput, undefined, 200);

      const content = mockDisplay.getContent();
      expect(content).toContain('... (8 more lines)'); // Should show truncation
    });

    test('should truncate very long single-line output', () => {
      const longOutput = 'a'.repeat(150);
      const toolId = agent.captureToolExecution(instanceId, 'Bash', 'echo');
      agent.completeToolExecution(toolId, true, longOutput, undefined, 25);

      const content = mockDisplay.getContent();
      expect(content).toContain('aaa...'); // Should be truncated
      expect(content).not.toContain(longOutput); // Should not contain full string
    });

    test('should handle ANSI codes in output', () => {
      const outputWithAnsi = '\x1b[31mError: something failed\x1b[0m';
      const toolId = agent.captureToolExecution(instanceId, 'Test', 'unit-tests');
      agent.completeToolExecution(toolId, false, outputWithAnsi, undefined, 300);

      const content = mockDisplay.getContent();
      expect(content).toContain('Error: something failed');
      // ANSI codes should be stripped from display
      expect(content).not.toContain('\x1b[31m');
      expect(content).not.toContain('\x1b[0m');
    });
  });

  describe('Statistics', () => {
    test('should calculate correct statistics', () => {
      // Execute mix of successful and failed tools
      const successfulToolId1 = agent.captureToolExecution(instanceId, 'Read', 'file1.ts');
      agent.completeToolExecution(successfulToolId1, true, 'content', undefined, 100);

      const successfulToolId2 = agent.captureToolExecution(instanceId, 'Edit', 'file2.ts');
      agent.completeToolExecution(successfulToolId2, true, 'updated', undefined, 200);

      const failedToolId = agent.captureToolExecution(instanceId, 'Bash', 'invalid-command');
      agent.completeToolExecution(failedToolId, false, undefined, 'Command not found', 50);

      const stats = agent.getToolStats();
      
      expect(stats.totalToolsExecuted).toBe(3);
      expect(stats.successRate).toBe(66.67); // 2/3 * 100, rounded
      expect(stats.averageDuration).toBe(116.67); // (100 + 200 + 50) / 3, rounded
      expect(stats.toolsByType['Read']).toBe(1);
      expect(stats.toolsByType['Edit']).toBe(1);
      expect(stats.toolsByType['Bash']).toBe(1);
      expect(stats.toolsByInstance[instanceId]).toBe(3);
      expect(stats.activeTools).toBe(0); // All completed
    });

    test('should track active tools correctly', () => {
      const toolId1 = agent.captureToolExecution(instanceId, 'Read', 'file1.ts');
      const toolId2 = agent.captureToolExecution(instanceId, 'Edit', 'file2.ts');

      expect(agent.getToolStats().activeTools).toBe(2);

      agent.completeToolExecution(toolId1, true, 'content', undefined, 100);
      expect(agent.getToolStats().activeTools).toBe(1);

      agent.completeToolExecution(toolId2, true, 'updated', undefined, 150);
      expect(agent.getToolStats().activeTools).toBe(0);
    });

    test('should handle tools with no duration', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Read', 'file.ts');
      agent.completeToolExecution(toolId, true, 'content'); // No duration provided

      const stats = agent.getToolStats();
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('Multiple Instance Support', () => {
    test('should handle multiple instances independently', () => {
      const instance2 = 'test-instance-2';
      const display2 = new MockTerminalDisplay();
      agent.registerTerminalDisplay(instance2, display2);

      // Execute tools for both instances
      const toolId1 = agent.captureToolExecution(instanceId, 'Read', 'file1.ts');
      const toolId2 = agent.captureToolExecution(instance2, 'Edit', 'file2.ts');

      agent.completeToolExecution(toolId1, true, 'content1', undefined, 100);
      agent.completeToolExecution(toolId2, false, undefined, 'error2', 200);

      // Each display should only show its instance's tools
      expect(mockDisplay.getContent()).toContain('Read');
      expect(mockDisplay.getContent()).not.toContain('Edit');
      
      expect(display2.getContent()).toContain('Edit');
      expect(display2.getContent()).not.toContain('Read');

      const stats = agent.getToolStats();
      expect(stats.toolsByInstance[instanceId]).toBe(1);
      expect(stats.toolsByInstance[instance2]).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing terminal display gracefully', () => {
      const unknownInstance = 'unknown-instance';
      
      expect(() => {
        const toolId = agent.captureToolExecution(unknownInstance, 'Read', 'file.ts');
        agent.completeToolExecution(toolId, true, 'content', undefined, 100);
      }).not.toThrow();
    });

    test('should handle invalid tool parameters', () => {
      expect(() => {
        const toolId = agent.captureToolExecution(instanceId, '', '');
        agent.completeToolExecution(toolId, true);
      }).not.toThrow();
    });

    test('should handle complex parameter objects', () => {
      const complexParams = {
        array: [1, 2, 3],
        nested: { key: 'value', deep: { deeper: 'test' } },
        nullValue: null,
        undefinedValue: undefined
      };

      const toolId = agent.captureToolExecution(
        instanceId, 
        'Complex', 
        'operation',
        complexParams
      );

      const content = mockDisplay.getContent();
      expect(content).toContain('Complex');
      expect(content).toContain('operation');
      // Should handle complex objects without crashing
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent tool executions', async () => {
      const promises: Promise<void>[] = [];

      // Start multiple tools concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(new Promise<void>((resolve) => {
          const toolId = agent.captureToolExecution(instanceId, 'Concurrent', `task${i}`);
          setTimeout(() => {
            agent.completeToolExecution(toolId, true, `result${i}`, undefined, 100);
            resolve();
          }, Math.random() * 100);
        }));
      }

      await Promise.all(promises);

      const stats = agent.getToolStats();
      expect(stats.totalToolsExecuted).toBe(10);
      expect(stats.activeTools).toBe(0);
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources on shutdown', () => {
      const toolId = agent.captureToolExecution(instanceId, 'Read', 'file.ts');
      
      expect(agent.getToolStats().activeTools).toBe(1);

      agent.shutdown();

      expect(agent.getToolStats().totalToolsExecuted).toBe(0);
      expect(agent.getToolStats().activeTools).toBe(0);
    });
  });
});

describe('ToolUsageCaptureAgent Integration', () => {
  test('should integrate with real event system', (done) => {
    const agent = new ToolUsageCaptureAgent();
    const display = new MockTerminalDisplay();
    const instanceId = 'integration-test';

    agent.registerTerminalDisplay(instanceId, display);

    // Listen for display writes
    let writeCount = 0;
    display.on('write', (content) => {
      writeCount++;
      if (writeCount === 2) { // Tool start + completion
        expect(display.getContent()).toContain('Integration');
        expect(display.getContent()).toContain('[SUCCESS]');
        agent.shutdown();
        done();
      }
    });

    // Simulate tool execution
    const toolId = agent.captureToolExecution(instanceId, 'Integration', 'test');
    setTimeout(() => {
      agent.completeToolExecution(toolId, true, 'success', undefined, 100);
    }, 10);
  });
});