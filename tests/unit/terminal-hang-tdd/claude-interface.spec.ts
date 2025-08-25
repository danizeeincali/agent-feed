/**
 * SPARC COMPLETION PHASE: Playwright E2E Tests
 * End-to-end testing for Claude Interface with dedicated process architecture
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Claude Interface - Dedicated Process Architecture', () => {
  let apiBaseUrl: string;
  let wsBaseUrl: string;

  test.beforeAll(async () => {
    apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    wsBaseUrl = process.env.WS_BASE_URL || 'ws://localhost:3001';
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Wait for initial load
    await expect(page.getByTestId('app-container')).toBeVisible();
  });

  test('should launch Claude process and display clean UI interface', async ({ page }) => {
    // Verify Claude availability check
    await expect(page.getByTestId('claude-availability')).toContainText('Available', {
      timeout: 5000
    });

    // Verify no terminal-related elements are present
    await expect(page.locator('[class*="terminal"]')).toHaveCount(0);
    await expect(page.locator('[class*="cascade"]')).toHaveCount(0);
    await expect(page.locator('[class*="width-calc"]')).toHaveCount(0);

    // Launch Claude process using dedicated architecture
    await page.click('[data-testid="launch-claude-button"]');

    // Verify process launch indicator
    await expect(page.getByTestId('launch-status')).toContainText('Launching...', {
      timeout: 2000
    });

    // Wait for process to be ready
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });

    // Verify Claude UI interface appears (not terminal)
    await expect(page.getByTestId('claude-interface')).toBeVisible();
    await expect(page.getByTestId('command-input')).toBeVisible();
    await expect(page.getByTestId('output-container')).toBeVisible();

    // Verify process information is displayed
    const processInfo = page.getByTestId('process-info');
    await expect(processInfo).toContainText('PID:');
    await expect(processInfo).toContainText('claude');

    // Test command execution in clean UI
    await page.fill('[data-testid="command-input"]', 'help');
    await page.click('[data-testid="send-command-button"]');

    // Verify response appears in output container
    await expect(page.getByTestId('output-container')).toContainText('Available commands', {
      timeout: 8000
    });

    // Verify no terminal artifacts in output
    const outputContent = await page.getByTestId('output-container').textContent();
    expect(outputContent).not.toContain('terminal-');
    expect(outputContent).not.toContain('cascade');
    expect(outputContent).not.toContain('width');

    // Stop the process
    await page.click('[data-testid="stop-process-button"]');

    // Verify process stops cleanly
    await expect(page.getByTestId('process-status')).toContainText('Stopped', {
      timeout: 5000
    });
  });

  test('should handle all 4-button launcher variants with background processes', async ({ page }) => {
    const buttonConfigs = [
      { 
        testId: 'launch-standard', 
        expectedCommand: 'claude',
        buttonText: 'claude'
      },
      { 
        testId: 'launch-skip-perms', 
        expectedCommand: 'claude --dangerously-skip-permissions',
        buttonText: 'skip-permissions'
      },
      { 
        testId: 'launch-skip-perms-c', 
        expectedCommand: 'claude --dangerously-skip-permissions -c',
        buttonText: 'skip-permissions -c'
      },
      { 
        testId: 'launch-skip-perms-resume', 
        expectedCommand: 'claude --dangerously-skip-permissions --resume',
        buttonText: 'skip-permissions --resume'
      }
    ];

    for (const config of buttonConfigs) {
      // Ensure clean state
      await page.reload();
      await page.waitForSelector('[data-testid="app-container"]');

      // Click specific launcher button
      await page.click(`[data-testid="${config.testId}"]`);

      // Verify button shows launching state
      await expect(page.locator(`[data-testid="${config.testId}"]`)).toContainText('Launching...', {
        timeout: 2000
      });

      // Wait for process to start
      await expect(page.getByTestId('process-status')).toContainText('Running', {
        timeout: 10000
      });

      // Verify correct command is displayed in process info
      await expect(page.getByTestId('process-command')).toContainText(config.expectedCommand);

      // Test that the process is actually functional
      await page.fill('[data-testid="command-input"]', 'version');
      await page.click('[data-testid="send-command-button"]');

      // Verify response
      await expect(page.getByTestId('output-container')).toContainText('Claude', {
        timeout: 5000
      });

      // Stop process for next iteration
      await page.click('[data-testid="stop-process-button"]');
      await expect(page.getByTestId('process-status')).toContainText('Stopped', {
        timeout: 5000
      });
    }
  });

  test('should handle real-time output streaming without terminal dependencies', async ({ page }) => {
    // Launch process
    await page.click('[data-testid="launch-claude-button"]');
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });

    // Execute a command that produces streaming output
    await page.fill('[data-testid="command-input"]', 'help');
    await page.click('[data-testid="send-command-button"]');

    // Verify streaming output appears progressively
    const outputContainer = page.getByTestId('output-container');
    
    // Check that output appears within reasonable time
    await expect(outputContainer).not.toBeEmpty({ timeout: 3000 });
    
    // Verify output is properly formatted (no terminal escape sequences)
    const outputText = await outputContainer.textContent();
    expect(outputText).not.toMatch(/\x1b\[[0-9;]*m/); // No ANSI escape codes
    expect(outputText).not.toContain('\r'); // No carriage returns
    expect(outputText).toContain('Available commands'); // Actual content

    // Test multiple rapid commands to verify streaming performance
    const commands = ['version', 'whoami', 'pwd'];
    
    for (const command of commands) {
      const initialContent = await outputContainer.textContent();
      
      await page.fill('[data-testid="command-input"]', command);
      await page.click('[data-testid="send-command-button"]');
      
      // Wait for new content to appear
      await expect(async () => {
        const newContent = await outputContainer.textContent();
        expect(newContent).not.toBe(initialContent);
      }).toPass({ timeout: 5000 });
    }

    // Clean up
    await page.click('[data-testid="stop-process-button"]');
  });

  test('should maintain responsive UI without terminal width calculations', async ({ page, viewport }) => {
    // Test different viewport sizes to ensure no terminal width dependencies
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 }, // Mobile
      { width: 320, height: 568 }   // Small mobile
    ];

    for (const size of viewports) {
      await page.setViewportSize(size);
      
      // Launch process
      await page.click('[data-testid="launch-claude-button"]');
      await expect(page.getByTestId('process-status')).toContainText('Running', {
        timeout: 10000
      });

      // Verify UI is responsive at this size
      await expect(page.getByTestId('claude-interface')).toBeVisible();
      await expect(page.getByTestId('command-input')).toBeVisible();
      
      // Test command execution works at this viewport size
      await page.fill('[data-testid="command-input"]', 'help');
      await page.click('[data-testid="send-command-button"]');
      
      await expect(page.getByTestId('output-container')).toContainText('Available commands', {
        timeout: 5000
      });

      // Verify no terminal width calculations are performed
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('measure')
          .filter(entry => entry.name.includes('terminal-width') || entry.name.includes('cascade'))
          .length;
      });
      expect(performanceEntries).toBe(0);

      // Stop process for next viewport test
      await page.click('[data-testid="stop-process-button"]');
      await expect(page.getByTestId('process-status')).toContainText('Stopped');
    }
  });

  test('should handle error scenarios gracefully without terminal fallback', async ({ page }) => {
    // Mock API failure for process launch
    await page.route('/api/claude/launch', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Process spawn failed: Command not found'
        })
      });
    });

    // Attempt to launch Claude
    await page.click('[data-testid="launch-claude-button"]');

    // Verify error is displayed in UI (not terminal)
    await expect(page.getByTestId('error-message')).toContainText('Process spawn failed', {
      timeout: 5000
    });
    
    // Verify process status remains stopped
    await expect(page.getByTestId('process-status')).toContainText('Stopped');

    // Verify no terminal elements are created as fallback
    await expect(page.locator('[class*="terminal"]')).toHaveCount(0);
    
    // Test error recovery
    await page.unroute('/api/claude/launch');
    
    // Dismiss error and try again
    await page.click('[data-testid="dismiss-error"]');
    await expect(page.getByTestId('error-message')).not.toBeVisible();
    
    // Successful launch after error
    await page.click('[data-testid="launch-claude-button"]');
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });
  });

  test('should provide system terminal separately for debugging', async ({ page }) => {
    // Verify system terminal is available but separate
    const systemTerminalButton = page.getByTestId('show-system-terminal');
    
    if (await systemTerminalButton.isVisible()) {
      // Click to show system terminal
      await systemTerminalButton.click();
      
      const systemTerminal = page.getByTestId('system-terminal');
      await expect(systemTerminal).toBeVisible();
      
      // Verify it's clearly marked as system terminal (not Claude)
      await expect(systemTerminal).toContainText('System Terminal');
      await expect(systemTerminal).toContainText('Debug Only');
      
      // Launch Claude process
      await page.click('[data-testid="launch-claude-button"]');
      await expect(page.getByTestId('process-status')).toContainText('Running', {
        timeout: 10000
      });
      
      // Verify Claude interface and system terminal are independent
      const claudeInterface = page.getByTestId('claude-interface');
      await expect(claudeInterface).toBeVisible();
      await expect(systemTerminal).toBeVisible();
      
      // Verify they operate independently
      await page.fill('[data-testid="command-input"]', 'help'); // Claude interface
      await page.click('[data-testid="send-command-button"]');
      
      // Claude output should appear in Claude interface, not system terminal
      await expect(claudeInterface.getByTestId('output-container'))
        .toContainText('Available commands', { timeout: 5000 });
      
      // System terminal should remain unchanged
      const systemTerminalContent = await systemTerminal.textContent();
      expect(systemTerminalContent).not.toContain('Available commands');
    }
  });

  test('should maintain session state across UI interactions', async ({ page }) => {
    // Launch Claude process
    await page.click('[data-testid="launch-claude-button"]');
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });

    // Execute multiple commands to build session state
    const commands = [
      { cmd: 'cd /tmp', expected: '/tmp' },
      { cmd: 'pwd', expected: '/tmp' },
      { cmd: 'echo "session test"', expected: 'session test' }
    ];

    for (const { cmd, expected } of commands) {
      await page.fill('[data-testid="command-input"]', cmd);
      await page.click('[data-testid="send-command-button"]');
      
      await expect(page.getByTestId('output-container')).toContainText(expected, {
        timeout: 5000
      });
    }

    // Verify command history is preserved
    const historyButton = page.getByTestId('command-history');
    if (await historyButton.isVisible()) {
      await historyButton.click();
      
      for (const { cmd } of commands) {
        await expect(page.getByTestId('history-list')).toContainText(cmd);
      }
    }

    // Test session persistence through UI state changes
    await page.click('[data-testid="minimize-interface"]');
    await page.click('[data-testid="restore-interface"]');
    
    // Verify session is still active
    await expect(page.getByTestId('process-status')).toContainText('Running');
    
    // Test another command to verify session continuity
    await page.fill('[data-testid="command-input"]', 'pwd');
    await page.click('[data-testid="send-command-button"]');
    
    await expect(page.getByTestId('output-container')).toContainText('/tmp', {
      timeout: 5000
    });
  });

  test('should handle concurrent Claude sessions independently', async ({ context }) => {
    // Create multiple pages for concurrent testing
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    try {
      // Navigate both pages
      await page1.goto('/');
      await page2.goto('/');

      // Launch Claude on both pages
      await page1.click('[data-testid="launch-claude-button"]');
      await page2.click('[data-testid="launch-claude-button"]');

      // Wait for both to be running
      await expect(page1.getByTestId('process-status')).toContainText('Running', {
        timeout: 10000
      });
      await expect(page2.getByTestId('process-status')).toContainText('Running', {
        timeout: 10000
      });

      // Execute different commands on each session
      await page1.fill('[data-testid="command-input"]', 'echo "session 1"');
      await page1.click('[data-testid="send-command-button"]');
      
      await page2.fill('[data-testid="command-input"]', 'echo "session 2"');
      await page2.click('[data-testid="send-command-button"]');

      // Verify outputs are independent
      await expect(page1.getByTestId('output-container')).toContainText('session 1', {
        timeout: 5000
      });
      await expect(page2.getByTestId('output-container')).toContainText('session 2', {
        timeout: 5000
      });

      // Verify no cross-contamination
      const page1Output = await page1.getByTestId('output-container').textContent();
      const page2Output = await page2.getByTestId('output-container').textContent();
      
      expect(page1Output).not.toContain('session 2');
      expect(page2Output).not.toContain('session 1');

      // Clean up both sessions
      await page1.click('[data-testid="stop-process-button"]');
      await page2.click('[data-testid="stop-process-button"]');

    } finally {
      await page1.close();
      await page2.close();
    }
  });
});

test.describe('Performance and Reliability', () => {
  test('should meet performance requirements for process operations', async ({ page }) => {
    // Test process startup performance
    const startTime = Date.now();
    
    await page.goto('/');
    await page.click('[data-testid="launch-claude-button"]');
    
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });
    
    const launchTime = Date.now() - startTime;
    expect(launchTime).toBeLessThan(5000); // Under 5 seconds including UI load

    // Test command response performance
    const commandStartTime = Date.now();
    
    await page.fill('[data-testid="command-input"]', 'help');
    await page.click('[data-testid="send-command-button"]');
    
    await expect(page.getByTestId('output-container')).not.toBeEmpty({
      timeout: 3000
    });
    
    const responseTime = Date.now() - commandStartTime;
    expect(responseTime).toBeLessThan(2000); // Under 2 seconds for response

    // Test UI responsiveness
    const interactions = [
      () => page.click('[data-testid="clear-output"]'),
      () => page.fill('[data-testid="command-input"]', 'test'),
      () => page.click('[data-testid="command-history"]')
    ];

    for (const interaction of interactions) {
      const interactionStart = Date.now();
      await interaction();
      const interactionTime = Date.now() - interactionStart;
      expect(interactionTime).toBeLessThan(100); // Under 100ms for UI interactions
    }
  });
});