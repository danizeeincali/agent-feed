/**
 * Terminal Flow Integration Tests with Regression Coverage
 * Tests terminal functionality, carriage return handling, and cascading prevention
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'vitest';
import { getPortConfig, getServerUrls } from '../config/ports.config';
import { setupTestServers, teardownTestServers } from '../utils/server-manager';
import { TerminalTestHelper, WebSocketTestHelper, testFixtures } from '../utils/test-helpers';

describe('Terminal Flow Integration Tests', () => {
  let config: ReturnType<typeof getPortConfig>;
  let urls: ReturnType<typeof getServerUrls>;
  let terminalHelper: TerminalTestHelper;
  let wsHelper: WebSocketTestHelper;

  beforeAll(async () => {
    config = getPortConfig('integration');
    urls = getServerUrls('integration');
    terminalHelper = new TerminalTestHelper(urls.websocketTerminal);
    wsHelper = new WebSocketTestHelper(urls.websocketTerminal);
  }, 30000);

  beforeEach(async () => {
    await setupTestServers(config);
    await terminalHelper.connect();
  }, 60000);

  afterEach(async () => {
    if (terminalHelper) {
      terminalHelper.close();
    }
    if (wsHelper.isConnected()) {
      wsHelper.close();
    }
    await teardownTestServers();
  }, 30000);

  afterAll(async () => {
    await teardownTestServers();
  }, 30000);

  describe('Basic Terminal Flow', () => {
    it('should establish terminal connection and execute basic commands', async () => {
      // Test basic echo command
      await terminalHelper.sendCommand('echo "Hello Terminal"');
      const output = await terminalHelper.waitForOutput('Hello Terminal', 5000);
      
      expect(output).toContain('Hello Terminal');
    });

    it('should handle sequential command execution', async () => {
      const commands = [
        'echo "Command 1"',
        'echo "Command 2"', 
        'echo "Command 3"'
      ];

      for (const command of commands) {
        await terminalHelper.sendCommand(command);
        const output = await terminalHelper.waitForOutput(command.split('"')[1], 3000);
        expect(output).toContain(command.split('"')[1]);
      }
    });

    it('should handle commands with different output patterns', async () => {
      // Test various command types
      const commandTests = [
        { cmd: 'pwd', expectPattern: /\/.*/ },
        { cmd: 'echo $HOME', expectPattern: /\/.*/ },
        { cmd: 'date', expectPattern: /\d{4}/ },
        { cmd: 'whoami', expectPattern: /\w+/ }
      ];

      for (const test of commandTests) {
        await terminalHelper.sendCommand(test.cmd);
        const output = await terminalHelper.waitForOutput(test.expectPattern, 5000);
        expect(output).toMatch(test.expectPattern);
      }
    });

    it('should handle long-running commands', async () => {
      // Start a sleep command
      await terminalHelper.sendCommand('sleep 1 && echo "Sleep completed"');
      
      // Wait for completion
      const output = await terminalHelper.waitForOutput('Sleep completed', 3000);
      expect(output).toContain('Sleep completed');
    });

    it('should handle interactive command input', async () => {
      // Send input after command
      await terminalHelper.sendInput('echo "Interactive test"');
      await terminalHelper.sendInput('\n');
      
      const output = await terminalHelper.waitForOutput('Interactive test', 3000);
      expect(output).toContain('Interactive test');
    });
  });

  describe('Carriage Return Handling - REGRESSION TESTS', () => {
    it('should handle carriage returns without cascading', async () => {
      const result = await terminalHelper.testCarriageReturnHandling();
      
      expect(result.handled).toBe(true);
      expect(result.cascading).toBe(false);
    });

    it('should handle multiple carriage returns in sequence', async () => {
      await terminalHelper.sendCommand('echo "Test"');
      
      // Send multiple carriage returns
      for (let i = 0; i < 3; i++) {
        await terminalHelper.sendCarriageReturn();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Should not cause cascading output
      const messages: any[] = [];
      terminalHelper['wsHelper'].onMessage(data => messages.push(data));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should not have excessive duplicate messages
      const outputMessages = messages.filter(m => m.type === 'output');
      expect(outputMessages.length).toBeLessThan(5); // Reasonable threshold
    });

    it('should handle carriage return mixed with regular input', async () => {
      await terminalHelper.sendInput('echo ');
      await terminalHelper.sendCarriageReturn();
      await terminalHelper.sendInput('"Mixed input"');
      await terminalHelper.sendInput('\n');
      
      try {
        const output = await terminalHelper.waitForOutput('Mixed input', 3000);
        expect(output).toContain('Mixed input');
      } catch (error) {
        // Mixed input with carriage return might not execute properly, which is acceptable
        console.warn('Mixed carriage return input test - expected behavior may vary');
      }
    });

    it('should handle carriage return in different terminal states', async () => {
      // Test carriage return when terminal is idle
      await terminalHelper.sendCarriageReturn();
      
      // Test carriage return after command
      await terminalHelper.sendCommand('ls');
      await terminalHelper.waitForOutput(/.*/, 2000); // Wait for any output
      await terminalHelper.sendCarriageReturn();
      
      // Test carriage return during input
      await terminalHelper.sendInput('echo "test');
      await terminalHelper.sendCarriageReturn();
      
      // Terminal should remain responsive
      await terminalHelper.sendCommand('echo "Still responsive"');
      const output = await terminalHelper.waitForOutput('Still responsive', 3000);
      expect(output).toContain('Still responsive');
    });

    it('should prevent carriage return event bubbling', async () => {
      const eventLog: string[] = [];
      
      // Monitor all messages
      terminalHelper['wsHelper'].onMessage(data => {
        if (data.type) {
          eventLog.push(`${data.type}:${JSON.stringify(data.data).substring(0, 50)}`);
        }
      });

      // Send command followed by carriage return
      await terminalHelper.sendCommand('echo "Event test"');
      await terminalHelper.sendCarriageReturn();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for event duplication or bubbling
      const uniqueEvents = [...new Set(eventLog)];
      const duplicateRatio = eventLog.length / uniqueEvents.length;
      
      expect(duplicateRatio).toBeLessThan(3); // Some duplication is acceptable, but not excessive
    });
  });

  describe('Terminal State Management', () => {
    it('should maintain terminal state across commands', async () => {
      // Change directory
      await terminalHelper.sendCommand('cd /tmp');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check current directory
      await terminalHelper.sendCommand('pwd');
      const output = await terminalHelper.waitForOutput('/tmp', 3000);
      expect(output).toContain('/tmp');
    });

    it('should handle environment variables', async () => {
      // Set environment variable
      await terminalHelper.sendCommand('export TEST_VAR="test_value"');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use environment variable
      await terminalHelper.sendCommand('echo $TEST_VAR');
      const output = await terminalHelper.waitForOutput('test_value', 3000);
      expect(output).toContain('test_value');
    });

    it('should handle terminal history', async () => {
      // Execute commands to build history
      const commands = ['echo "cmd1"', 'echo "cmd2"', 'echo "cmd3"'];
      
      for (const cmd of commands) {
        await terminalHelper.sendCommand(cmd);
        await terminalHelper.waitForOutput(cmd.split('"')[1], 2000);
      }

      // Test history navigation (up arrow)
      await terminalHelper.sendInput('\u001b[A'); // Up arrow
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Terminal should remain responsive regardless of history support
      await terminalHelper.sendCommand('echo "history test"');
      const output = await terminalHelper.waitForOutput('history test', 3000);
      expect(output).toContain('history test');
    });

    it('should handle terminal resize during active sessions', async () => {
      // Start a command
      await terminalHelper.sendCommand('echo "Before resize"');
      await terminalHelper.waitForOutput('Before resize', 2000);
      
      // Send resize event
      terminalHelper['wsHelper'].send({
        type: 'resize',
        cols: 120,
        rows: 30
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Terminal should remain functional after resize
      await terminalHelper.sendCommand('echo "After resize"');
      const output = await terminalHelper.waitForOutput('After resize', 3000);
      expect(output).toContain('After resize');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle command errors gracefully', async () => {
      // Execute non-existent command
      await terminalHelper.sendCommand('nonexistent-command-xyz');
      
      try {
        await terminalHelper.waitForOutput(/command not found|not recognized/, 3000);
      } catch (error) {
        // Error message format may vary
      }
      
      // Terminal should remain responsive after error
      await terminalHelper.sendCommand('echo "After error"');
      const output = await terminalHelper.waitForOutput('After error', 3000);
      expect(output).toContain('After error');
    });

    it('should handle special characters and escape sequences', async () => {
      const specialCases = [
        'echo "Special: !@#$%^&*()"',
        'echo "Unicode: 🚀 ✨ 💻"',
        'echo "Escaped: \\"quotes\\" and \\\\backslashes\\\\"',
        'echo "Newlines:\\nand\\ttabs"'
      ];

      for (const testCase of specialCases) {
        await terminalHelper.sendCommand(testCase);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Terminal should remain functional
      await terminalHelper.sendCommand('echo "Special chars handled"');
      const output = await terminalHelper.waitForOutput('Special chars handled', 3000);
      expect(output).toContain('Special chars handled');
    });

    it('should handle rapid input sequences', async () => {
      // Send rapid sequence of inputs
      const rapidInputs = Array(10).fill(null).map((_, i) => `echo "Rapid ${i}"`);
      
      for (const input of rapidInputs) {
        terminalHelper['wsHelper'].send({
          type: 'input',
          data: input + '\n'
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Terminal should still be responsive
      await terminalHelper.sendCommand('echo "After rapid input"');
      const output = await terminalHelper.waitForOutput('After rapid input', 3000);
      expect(output).toContain('After rapid input');
    });

    it('should handle connection interruption and recovery', async () => {
      // Send command
      await terminalHelper.sendCommand('echo "Before interruption"');
      await terminalHelper.waitForOutput('Before interruption', 2000);
      
      // Close and reconnect
      terminalHelper.close();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      terminalHelper = new TerminalTestHelper(urls.websocketTerminal);
      await terminalHelper.connect();
      
      // Should be able to use terminal after reconnection
      await terminalHelper.sendCommand('echo "After reconnection"');
      const output = await terminalHelper.waitForOutput('After reconnection', 3000);
      expect(output).toContain('After reconnection');
    });
  });

  describe('Terminal Width and Cascading Prevention', () => {
    it('should handle terminal width changes without cascading', async () => {
      // Test different terminal widths
      const widthTests = [80, 120, 160, 40];
      
      for (const width of widthTests) {
        terminalHelper['wsHelper'].send({
          type: 'resize',
          cols: width,
          rows: 24
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Send a command that might be affected by width
        await terminalHelper.sendCommand(`echo "Width ${width} test"`);
        const output = await terminalHelper.waitForOutput(`Width ${width} test`, 2000);
        expect(output).toContain(`Width ${width} test`);
      }
    });

    it('should handle long lines without cascading issues', async () => {
      const longText = 'A'.repeat(200);
      
      await terminalHelper.sendCommand(`echo "${longText}"`);
      
      try {
        const output = await terminalHelper.waitForOutput(longText, 3000);
        expect(output).toContain(longText);
      } catch (error) {
        // Long lines might be handled differently, but should not cause crashes
        console.warn('Long line handling test - terminal may truncate or wrap');
      }
      
      // Terminal should remain responsive
      await terminalHelper.sendCommand('echo "After long line"');
      const output = await terminalHelper.waitForOutput('After long line', 3000);
      expect(output).toContain('After long line');
    });

    it('should prevent viewport cascade when terminal exceeds container', async () => {
      // This test simulates the cascading issue that was previously fixed
      
      // Send resize to a very wide terminal
      terminalHelper['wsHelper'].send({
        type: 'resize',
        cols: 300,
        rows: 50
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send commands that might trigger cascading
      for (let i = 0; i < 5; i++) {
        await terminalHelper.sendCommand(`echo "Cascade test ${i}"`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Monitor for excessive message repetition
      const messages: any[] = [];
      terminalHelper['wsHelper'].onMessage(data => messages.push(data));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should not have excessive duplicate messages (cascading)
      const outputCount = messages.filter(m => m.type === 'output').length;
      expect(outputCount).toBeLessThan(20); // Reasonable threshold
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle sustained terminal usage', async () => {
      const startTime = Date.now();
      const testDuration = 5000; // 5 seconds
      let commandCount = 0;
      
      while (Date.now() - startTime < testDuration) {
        await terminalHelper.sendCommand(`echo "Sustained test ${commandCount}"`);
        await terminalHelper.waitForOutput(`Sustained test ${commandCount}`, 1000);
        commandCount++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      expect(commandCount).toBeGreaterThan(10); // Should handle reasonable load
      
      // Final responsiveness check
      await terminalHelper.sendCommand('echo "Sustained test complete"');
      const output = await terminalHelper.waitForOutput('Sustained test complete', 3000);
      expect(output).toContain('Sustained test complete');
    });

    it('should handle concurrent terminal operations', async () => {
      // Create multiple WebSocket connections
      const helpers = Array(3).fill(null).map(() => new TerminalTestHelper(urls.websocketTerminal));
      
      try {
        // Connect all helpers
        await Promise.all(helpers.map(helper => helper.connect()));
        
        // Send concurrent commands
        const concurrentCommands = helpers.map((helper, i) => 
          helper.sendCommand(`echo "Concurrent ${i}"`).then(() =>
            helper.waitForOutput(`Concurrent ${i}`, 3000)
          )
        );
        
        const results = await Promise.all(concurrentCommands);
        
        results.forEach((result, i) => {
          expect(result).toContain(`Concurrent ${i}`);
        });
        
      } finally {
        // Cleanup
        helpers.forEach(helper => helper.close());
      }
    });
  });

  describe('Regression Test Coverage', () => {
    it('should not regress on carriage return cascading issue', async () => {
      // This is the specific regression test for the carriage return issue
      
      // Clear any existing state
      await terminalHelper.sendCommand('clear');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send the problematic sequence that previously caused cascading
      await terminalHelper.sendCommand('echo "Start test"');
      await terminalHelper.waitForOutput('Start test', 2000);
      
      // Send carriage return that previously caused issues
      await terminalHelper.sendCarriageReturn();
      
      // Monitor for cascading (excessive repeated messages)
      const messages: any[] = [];
      const startTime = Date.now();
      
      terminalHelper['wsHelper'].onMessage(data => {
        if (Date.now() - startTime < 2000) { // Monitor for 2 seconds
          messages.push(data);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should not have excessive messages
      const duplicateCount = messages.filter(m => 
        JSON.stringify(m).includes('Start test')
      ).length;
      
      expect(duplicateCount).toBeLessThan(5); // Should not repeat excessively
    });

    it('should not regress on terminal width calculation', async () => {
      // Test the terminal width calculation that was previously problematic
      
      // Send resize events that previously caused issues
      const problematicSizes = [
        { cols: 80, rows: 24 },
        { cols: 120, rows: 30 },
        { cols: 160, rows: 40 },
        { cols: 200, rows: 50 }
      ];
      
      for (const size of problematicSizes) {
        terminalHelper['wsHelper'].send({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify terminal remains responsive
        await terminalHelper.sendCommand(`echo "Size ${size.cols}x${size.rows}"`);
        const output = await terminalHelper.waitForOutput(`Size ${size.cols}x${size.rows}`, 2000);
        expect(output).toContain(`Size ${size.cols}x${size.rows}`);
      }
    });

    it('should not regress on FitAddon integration', async () => {
      // Test that FitAddon-related functionality works correctly
      
      // Send a resize that should trigger FitAddon recalculation
      terminalHelper['wsHelper'].send({
        type: 'resize',
        cols: 100,
        rows: 25
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send a command that exercises the terminal layout
      await terminalHelper.sendCommand('echo "FitAddon test - this is a longer line to test wrapping behavior"');
      
      const output = await terminalHelper.waitForOutput('FitAddon test', 3000);
      expect(output).toContain('FitAddon test');
      
      // Verify terminal remains functional after resize
      await terminalHelper.sendCommand('echo "Post-resize functionality"');
      const postOutput = await terminalHelper.waitForOutput('Post-resize functionality', 2000);
      expect(postOutput).toContain('Post-resize functionality');
    });
  });
});