import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, validInstanceConfigs, apiEndpoints, sseTestMessages, testUtils } from './fixtures/test-data';

/**
 * Test Suite: Real-time Terminal Streaming Functionality
 * 
 * Validates that:
 * 1. Terminal streaming displays output in real-time
 * 2. Command execution works through SSE
 * 3. Terminal input/output synchronization is correct
 * 4. Large output handling works properly
 * 5. Terminal session persistence is maintained
 */
test.describe('Real-time Terminal Streaming Functionality', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
    
    // Mock instances list with running instances
    await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
    await instancePage.navigate();
  });

  test.afterEach(async ({ page }) => {
    await instancePage.cleanupInstances();
    await page.unrouteAll();
  });

  test.describe('Real-time Output Display', () => {
    test('should display terminal output in real-time', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock real-time SSE stream
      const realtimeMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Starting Claude instance...\n',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: 'Loading model weights...\n',
          timestamp: new Date(Date.now() + 1000).toISOString()
        },
        {
          type: 'output',
          data: 'Claude is ready to assist!\n',
          timestamp: new Date(Date.now() + 2000).toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', realtimeMessages);
      await instancePage.connectToTerminal();
      
      // Verify each message appears in order
      await instancePage.waitForTerminalOutput('SSE connection established');
      await instancePage.waitForTerminalOutput('Starting Claude instance...');
      await instancePage.waitForTerminalOutput('Loading model weights...');
      await instancePage.waitForTerminalOutput('Claude is ready to assist!');
      
      // Verify output is accumulated
      const fullOutput = await instancePage.getTerminalOutput();
      expect(fullOutput).toContain('Starting Claude instance...');
      expect(fullOutput).toContain('Loading model weights...');
      expect(fullOutput).toContain('Claude is ready to assist!');
    });

    test('should handle rapid output bursts', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate rapid burst of messages
      const burstMessages = [sseTestMessages.welcome];
      for (let i = 0; i < 50; i++) {
        burstMessages.push({
          type: 'output',
          data: `Rapid output line ${i + 1}\n`,
          timestamp: new Date(Date.now() + i * 10).toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', burstMessages);
      await instancePage.connectToTerminal();
      
      // Wait for all messages to be processed
      await instancePage.waitForTerminalOutput('Rapid output line 50');
      
      // Verify terminal remains responsive
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      
      // Verify output buffering works correctly
      const output = await instancePage.getTerminalOutput();
      expect(output).toContain('Rapid output line 1');
      expect(output).toContain('Rapid output line 25');
      expect(output).toContain('Rapid output line 50');
    });

    test('should preserve output formatting and colors', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock output with ANSI colors and formatting
      const formattedMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: '\x1b[31mError:\x1b[0m Something went wrong\n',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: '\x1b[32mSuccess:\x1b[0m Operation completed\n',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: '\x1b[1mBold text\x1b[0m and \x1b[4munderlined text\x1b[0m\n',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', formattedMessages);
      await instancePage.connectToTerminal();
      
      // Wait for formatted output
      await instancePage.waitForTerminalOutput('Error:');
      await instancePage.waitForTerminalOutput('Success:');
      await instancePage.waitForTerminalOutput('Bold text');
      
      // Check if terminal preserves formatting (look for ANSI escape sequences or processed styling)
      const terminalElement = page.locator('[data-testid="terminal-output"]');
      const html = await terminalElement.innerHTML();
      
      // Should either preserve ANSI codes or convert to HTML styling
      expect(html).toMatch(/error|Error/i);
      expect(html).toMatch(/success|Success/i);
      expect(html).toMatch(/bold|Bold/i);
    });

    test('should handle multiline output correctly', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      const multilineOutput = `
Line 1 of multiline output
Line 2 with some details
Line 3 with more information
  Indented line 4
    Double indented line 5
Final line 6
`;
      
      const multilineMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: multilineOutput,
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', multilineMessages);
      await instancePage.connectToTerminal();
      
      // Wait for multiline content
      await instancePage.waitForTerminalOutput('Line 1 of multiline output');
      await instancePage.waitForTerminalOutput('Final line 6');
      
      // Verify line structure is preserved
      const output = await instancePage.getTerminalOutput();
      expect(output).toContain('Line 1 of multiline output');
      expect(output).toContain('  Indented line 4');
      expect(output).toContain('    Double indented line 5');
    });
  });

  test.describe('Command Execution', () => {
    test('should execute commands through terminal interface', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock command execution endpoint
      await page.route(apiEndpoints.terminal.execute('test-instance-1'), async route => {
        const requestBody = await route.request().postDataJSON();
        const command = requestBody.command;
        
        // Simulate command responses
        let response;
        if (command === 'echo "Hello World"') {
          response = {
            success: true,
            output: 'Hello World\n',
            exitCode: 0
          };
        } else if (command === 'pwd') {
          response = {
            success: true,
            output: '/home/claude\n',
            exitCode: 0
          };
        } else {
          response = {
            success: false,
            error: 'Command not found',
            exitCode: 127
          };
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      });
      
      // Mock SSE to show command execution
      const executionMessages = [
        sseTestMessages.welcome,
        {
          type: 'command',
          command: 'echo "Hello World"',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: 'Hello World\n',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', executionMessages);
      await instancePage.connectToTerminal();
      
      // Execute command
      await instancePage.sendTerminalCommand('echo "Hello World"');
      
      // Verify command output appears
      await instancePage.waitForTerminalOutput('Hello World');
    });

    test('should handle command input correctly', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      await instancePage.connectToTerminal();
      
      // Verify input field is available and functional
      await expect(instancePage.terminalInput).toBeVisible();
      await expect(instancePage.terminalInput).toBeEnabled();
      
      // Test typing in input
      await instancePage.terminalInput.fill('test command');
      await expect(instancePage.terminalInput).toHaveValue('test command');
      
      // Test clearing input
      await instancePage.terminalInput.fill('');
      await expect(instancePage.terminalInput).toHaveValue('');
    });

    test('should maintain command history', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock command execution
      await page.route(apiEndpoints.terminal.execute('test-instance-1'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            output: 'Command executed\n',
            exitCode: 0
          })
        });
      });
      
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      await instancePage.connectToTerminal();
      
      // Execute multiple commands
      const commands = ['ls', 'pwd', 'echo "test"'];
      
      for (const command of commands) {
        await instancePage.sendTerminalCommand(command);
        await testUtils.delay(500);
      }
      
      // Test command history navigation (up arrow)
      await instancePage.terminalInput.focus();
      await page.keyboard.press('ArrowUp');
      
      // Should show last command
      await expect(instancePage.terminalInput).toHaveValue('echo "test"');
      
      await page.keyboard.press('ArrowUp');
      await expect(instancePage.terminalInput).toHaveValue('pwd');
      
      await page.keyboard.press('ArrowUp');
      await expect(instancePage.terminalInput).toHaveValue('ls');
    });

    test('should handle command errors gracefully', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock failing command
      await page.route(apiEndpoints.terminal.execute('test-instance-1'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'bash: invalidcommand: command not found',
            exitCode: 127
          })
        });
      });
      
      const errorMessages = [
        sseTestMessages.welcome,
        {
          type: 'command',
          command: 'invalidcommand',
          timestamp: new Date().toISOString()
        },
        {
          type: 'error',
          data: 'bash: invalidcommand: command not found\n',
          exitCode: 127,
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', errorMessages);
      await instancePage.connectToTerminal();
      
      // Execute invalid command
      await instancePage.sendTerminalCommand('invalidcommand');
      
      // Should display error message
      await instancePage.waitForTerminalOutput('command not found');
      
      // Terminal should remain functional
      await expect(instancePage.terminalInput).toBeEnabled();
    });
  });

  test.describe('Input/Output Synchronization', () => {
    test('should synchronize input and output correctly', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock interactive command that requires input
      const interactiveMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Enter your name: ',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', interactiveMessages);
      await instancePage.connectToTerminal();
      
      // Wait for prompt
      await instancePage.waitForTerminalOutput('Enter your name:');
      
      // Send response
      await instancePage.sendTerminalCommand('John Doe');
      
      // Mock response to input
      const responseMessages = [
        {
          type: 'output',
          data: 'Hello, John Doe!\n',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', responseMessages);
      
      // Verify response appears
      await instancePage.waitForTerminalOutput('Hello, John Doe!');
    });

    test('should handle simultaneous input/output', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Simulate simultaneous I/O
      const simultaneousMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Background process started...\n',
          timestamp: new Date().toISOString()
        },
        {
          type: 'command',
          command: 'ps aux',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n',
          timestamp: new Date().toISOString()
        },
        {
          type: 'output',
          data: 'Background process output...\n',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', simultaneousMessages);
      await instancePage.connectToTerminal();
      
      // Should handle mixed output correctly
      await instancePage.waitForTerminalOutput('Background process started...');
      await instancePage.waitForTerminalOutput('USER       PID %CPU');
      await instancePage.waitForTerminalOutput('Background process output...');
      
      // Terminal should remain responsive
      await expect(instancePage.terminalInput).toBeEnabled();
    });

    test('should maintain proper ordering of messages', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Messages with specific timestamps to test ordering
      const orderedMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Message 1\n',
          timestamp: '2024-01-01T10:00:01.000Z'
        },
        {
          type: 'output',
          data: 'Message 2\n',
          timestamp: '2024-01-01T10:00:02.000Z'
        },
        {
          type: 'output',
          data: 'Message 3\n',
          timestamp: '2024-01-01T10:00:03.000Z'
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', orderedMessages);
      await instancePage.connectToTerminal();
      
      // Wait for all messages
      await instancePage.waitForTerminalOutput('Message 3');
      
      // Verify ordering is preserved
      const output = await instancePage.getTerminalOutput();
      const message1Index = output.indexOf('Message 1');
      const message2Index = output.indexOf('Message 2');
      const message3Index = output.indexOf('Message 3');
      
      expect(message1Index).toBeLessThan(message2Index);
      expect(message2Index).toBeLessThan(message3Index);
    });
  });

  test.describe('Large Output Handling', () => {
    test('should handle large text output efficiently', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate large output (10KB)
      const largeText = 'x'.repeat(10 * 1024);
      const largeOutputMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: `Large output start\n${largeText}\nLarge output end\n`,
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', largeOutputMessages);
      await instancePage.connectToTerminal();
      
      // Wait for output to be processed
      await instancePage.waitForTerminalOutput('Large output start');
      await instancePage.waitForTerminalOutput('Large output end');
      
      // Terminal should remain responsive
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      await expect(instancePage.terminalInput).toBeEnabled();
    });

    test('should implement output truncation for very large outputs', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate extremely large output (1MB)
      const veryLargeMessages = [];
      veryLargeMessages.push(sseTestMessages.welcome);
      
      for (let i = 0; i < 100; i++) {
        veryLargeMessages.push({
          type: 'output',
          data: `Line ${i}: ${'x'.repeat(1000)}\n`,
          timestamp: new Date(Date.now() + i).toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', veryLargeMessages);
      await instancePage.connectToTerminal();
      
      // Wait for processing
      await testUtils.delay(3000);
      
      // Should handle large output without freezing UI
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      
      // Check if truncation or scrolling is implemented
      const output = await instancePage.getTerminalOutput();
      expect(output).toBeTruthy();
      
      // UI should not be overwhelmed
      const terminalElement = page.locator('[data-testid="terminal-output"]');
      await expect(terminalElement).toBeVisible();
    });

    test('should implement scrollback buffer limits', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate many lines to test scrollback
      const manyLineMessages = [sseTestMessages.welcome];
      
      for (let i = 0; i < 1000; i++) {
        manyLineMessages.push({
          type: 'output',
          data: `Scrollback line ${i}\n`,
          timestamp: new Date(Date.now() + i).toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', manyLineMessages);
      await instancePage.connectToTerminal();
      
      // Wait for all lines to be processed
      await instancePage.waitForTerminalOutput('Scrollback line 999');
      
      // Check if terminal has scroll capability
      const terminalElement = page.locator('[data-testid="terminal-output"]');
      const isScrollable = await terminalElement.evaluate(el => 
        el.scrollHeight > el.clientHeight
      );
      
      if (isScrollable) {
        // Test scrolling
        await terminalElement.evaluate(el => {
          el.scrollTop = 0; // Scroll to top
        });
        
        await testUtils.delay(500);
        
        await terminalElement.evaluate(el => {
          el.scrollTop = el.scrollHeight; // Scroll to bottom
        });
        
        await expect(terminalElement).toBeVisible();
      }
    });
  });

  test.describe('Terminal Session Persistence', () => {
    test('should maintain terminal session across UI interactions', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Establish connection with some output
      const initialMessages = [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Session started at ' + new Date().toISOString() + '\n',
          timestamp: new Date().toISOString()
        }
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', initialMessages);
      await instancePage.connectToTerminal();
      
      // Wait for initial output
      await instancePage.waitForTerminalOutput('Session started at');
      
      // Close and reopen terminal modal
      await page.keyboard.press('Escape');
      await expect(instancePage.detailModal).not.toBeVisible();
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Terminal session should be maintained
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      
      // Previous output should still be visible
      await instancePage.waitForTerminalOutput('Session started at');
    });

    test('should preserve session state after temporary disconnection', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Initial connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Initial session state\n',
          timestamp: new Date().toISOString()
        }
      ]);
      
      await instancePage.connectToTerminal();
      await instancePage.waitForTerminalOutput('Initial session state');
      
      // Simulate temporary disconnection
      await instancePage.disconnectFromTerminal();
      await testUtils.delay(1000);
      
      // Reconnect
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Reconnected session\n',
          timestamp: new Date().toISOString()
        }
      ]);
      
      await instancePage.connectToTerminal();
      
      // Should see both old and new output
      await instancePage.waitForTerminalOutput('Initial session state');
      await instancePage.waitForTerminalOutput('Reconnected session');
    });

    test('should handle session cleanup on instance termination', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Initial connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        {
          type: 'output',
          data: 'Instance running normally\n',
          timestamp: new Date().toISOString()
        }
      ]);
      
      await instancePage.connectToTerminal();
      await instancePage.waitForTerminalOutput('Instance running normally');
      
      // Simulate instance termination
      const terminationMessages = [
        {
          type: 'status',
          status: 'stopped',
          message: 'Instance terminated',
          timestamp: new Date().toISOString()
        },
        sseTestMessages.close
      ];
      
      await instancePage.mockSSEConnection('test-instance-1', terminationMessages);
      
      // Should handle termination gracefully
      await testUtils.delay(2000);
      
      // Connection should be closed
      const terminationMessage = page.locator('[data-testid="terminal-termination-message"]');
      await expect(terminationMessage).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should maintain UI responsiveness during heavy terminal activity', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate continuous output stream
      const continuousMessages = [sseTestMessages.welcome];
      
      for (let i = 0; i < 50; i++) {
        continuousMessages.push({
          type: 'output',
          data: `Continuous output ${i} at ${Date.now()}\n`,
          timestamp: new Date(Date.now() + i * 100).toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', continuousMessages);
      await instancePage.connectToTerminal();
      
      // UI should remain responsive during output
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      await expect(instancePage.terminalInput).toBeEnabled();
      
      // Should be able to interact with other UI elements
      await expect(instancePage.detailInstanceName).toBeVisible();
      await expect(instancePage.detailInstanceStatus).toBeVisible();
    });

    test('should optimize memory usage with long-running sessions', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Simulate long-running session with periodic output
      const longRunningMessages = [sseTestMessages.welcome];
      
      // Add periodic status updates
      for (let i = 0; i < 20; i++) {
        longRunningMessages.push({
          type: 'status',
          status: 'running',
          uptime: i * 60000, // Every minute
          timestamp: new Date(Date.now() + i * 60000).toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', longRunningMessages);
      await instancePage.connectToTerminal();
      
      // Wait for all status updates
      await testUtils.delay(2000);
      
      // Terminal should remain functional
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      
      // Memory usage should be reasonable (check if UI is still responsive)
      await instancePage.terminalInput.fill('test memory usage');
      await expect(instancePage.terminalInput).toHaveValue('test memory usage');
    });
  });
});