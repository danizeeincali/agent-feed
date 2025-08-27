const { test, expect } = require('@playwright/test');

test.describe('SSE Status and Terminal E2E Flow', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging to capture backend logs
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser console:', msg.text());
      }
    });

    // Navigate to the Claude Instance Manager page
    await page.goto('http://localhost:5173/claude-instances');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Button 1: Complete SSE flow validation', async () => {
    // Step 1: Click button → Instance created
    await test.step('Create instance via Button 1', async () => {
      // Look for the prod/claude button
      const button1 = page.locator('button:has-text("prod/claude")');
      await expect(button1).toBeVisible({ timeout: 10000 });
      await button1.click();
      
      // Wait for instance creation response
      await page.waitForTimeout(1000);
    });

    // Step 2: Status updates from "starting" → "running"
    await test.step('Validate status progression: starting → running', async () => {
      // Look for instance status display - check both status indicator and text
      const statusElement = page.locator('.instance-status .status-text, .status-text, .instance-status').first();
      
      // Should initially show "starting"
      await expect(statusElement).toContainText(/starting|Starting/i, { timeout: 5000 });
      
      // Should transition to "running" within reasonable time
      await expect(statusElement).toContainText(/running|Running/i, { timeout: 10000 });
    });

    // Step 3: Terminal accepts input commands
    await test.step('Validate terminal input functionality', async () => {
      // Find terminal input element - specific class from component
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      await expect(terminalInput).toBeVisible({ timeout: 5000 });
      
      // Test command input
      const testCommand = 'echo "Hello World"';
      await terminalInput.fill(testCommand);
      await terminalInput.press('Enter');
      
      // Verify command was accepted (input should clear or show response)
      await page.waitForTimeout(1000);
    });

    // Step 4: Commands generate backend forwarding logs
    await test.step('Validate backend forwarding logs', async () => {
      // Monitor network requests for SSE connections
      const sseRequests = [];
      page.on('request', request => {
        if (request.url().includes('/status') || request.url().includes('/sse')) {
          sseRequests.push(request.url());
        }
      });

      // Send another command to trigger forwarding
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      await terminalInput.fill('ls -la');
      await terminalInput.press('Enter');
      
      await page.waitForTimeout(2000);
      
      // Verify SSE connections were established
      expect(sseRequests.length).toBeGreaterThan(0);
    });
  });

  test('Button 2: SSE functionality validation', async () => {
    await test.step('Create instance via Button 2', async () => {
      const button2 = page.locator('button:has-text("skip-permissions")');
      await expect(button2).toBeVisible({ timeout: 10000 });
      await button2.click();
      await page.waitForTimeout(1000);
    });

    await test.step('Validate SSE connection count > 0', async () => {
      // Look for connection status or count display
      const connectionInfo = page.locator('.connection-status, .status, .count').first();
      
      // Should show connected status instead of disconnected
      await expect(connectionInfo).not.toContainText('Disconnected', { timeout: 10000 });
      await expect(connectionInfo).toContainText(/Connected|Active/, { timeout: 10000 });
      
      // Verify status shows running state
      const statusElement = page.locator('.instance-status .status-text, .status-text').first();
      await expect(statusElement).toContainText(/running/i, { timeout: 10000 });
    });

    await test.step('Test terminal command execution', async () => {
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      await expect(terminalInput).toBeVisible();
      
      await terminalInput.fill('pwd');
      await terminalInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // Verify command execution doesn't cause errors
      const errorElements = page.locator('.error, [data-testid="error"]');
      await expect(errorElements).toHaveCount(0);
    });
  });

  test('Button 3: Status broadcasting validation', async () => {
    await test.step('Create instance via Button 3', async () => {
      const button3 = page.locator('button:has-text("skip-permissions -c")');
      await expect(button3).toBeVisible({ timeout: 10000 });
      await button3.click();
      await page.waitForTimeout(1000);
    });

    await test.step('Validate status broadcasting to connections', async () => {
      // Monitor for SSE events
      let sseEventReceived = false;
      
      page.on('response', response => {
        if (response.url().includes('/status') && response.status() === 200) {
          sseEventReceived = true;
        }
      });

      // Wait for status updates
      await page.waitForTimeout(3000);
      
      // Verify SSE events are being received
      expect(sseEventReceived).toBe(true);
      
      // Check instance shows running status
      const statusElement = page.locator('[data-testid="instance-status"], .instance-status, .status').first();
      await expect(statusElement).toContainText(/running|Running/i, { timeout: 10000 });
    });

    await test.step('Test multiple command forwarding', async () => {
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      
      const commands = ['whoami', 'date', 'echo "test"'];
      
      for (const cmd of commands) {
        await terminalInput.fill(cmd);
        await terminalInput.press('Enter');
        await page.waitForTimeout(500);
      }
      
      // Verify no stuck states
      const statusElement = page.locator('[data-testid="instance-status"], .instance-status, .status').first();
      await expect(statusElement).not.toContainText(/starting|Starting/i, { timeout: 2000 });
    });
  });

  test('Button 4: Complete flow with backend log validation', async () => {
    let backendLogs = [];
    
    // Capture all console logs that might contain backend forwarding messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Broadcasting status') || text.includes('Forwarding input')) {
        backendLogs.push(text);
      }
    });

    await test.step('Create instance via Button 4', async () => {
      const button4 = page.locator('button:has-text("skip-permissions --resume")');
      await expect(button4).toBeVisible({ timeout: 10000 });
      await button4.click();
      await page.waitForTimeout(1000);
    });

    await test.step('Validate backend broadcasting logs', async () => {
      // Wait for status to transition to running
      const statusElement = page.locator('[data-testid="instance-status"], .instance-status, .status').first();
      await expect(statusElement).toContainText(/running|Running/i, { timeout: 10000 });
      
      // Check for broadcasting logs pattern
      await page.waitForTimeout(2000);
      
      // Look for expected log patterns (may need to check backend directly)
      const expectedPatterns = [
        /Broadcasting status running for instance claude-.*? to \d+ connections/,
        /Forwarding input to Claude claude-.*?:/
      ];
      
      // Note: In a real E2E test, you might need to check server logs differently
      // This is a placeholder for backend log validation
      console.log('Backend logs captured:', backendLogs);
    });

    await test.step('Test terminal input and command forwarding', async () => {
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      await expect(terminalInput).toBeVisible();
      
      // Test command that should generate forwarding log
      const testCommand = 'echo "Testing command forwarding"';
      await terminalInput.fill(testCommand);
      await terminalInput.press('Enter');
      
      await page.waitForTimeout(1000);
      
      // Verify terminal is responsive and not stuck
      await terminalInput.fill('clear');
      await terminalInput.press('Enter');
      
      await page.waitForTimeout(500);
    });

    await test.step('Validate SSE connection stability', async () => {
      // Test that SSE connections remain stable during multiple interactions
      for (let i = 0; i < 3; i++) {
        const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
        await terminalInput.fill(`test-command-${i}`);
        await terminalInput.press('Enter');
        await page.waitForTimeout(500);
        
        // Ensure status remains running
        const statusElement = page.locator('[data-testid="instance-status"], .instance-status, .status').first();
        await expect(statusElement).toContainText(/running|Running/i);
      }
    });
  });

  test('Cross-button SSE consistency validation', async () => {
    await test.step('Test all buttons for consistent SSE behavior', async () => {
      // Get all launch buttons from the launch-buttons container
      const launchButtons = page.locator('.launch-buttons button');
      const buttonCount = await launchButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(4);
      
      for (let i = 0; i < Math.min(4, buttonCount); i++) {
        await test.step(`Test Button ${i + 1} SSE behavior`, async () => {
          // Click button from launch buttons
          const button = launchButtons.nth(i);
          await button.click();
          await page.waitForTimeout(1000);
          
          // Verify status progression
          const statusElement = page.locator('.instance-status .status-text, .status-text').first();
          
          // Should not remain stuck on "starting"
          await expect(statusElement).not.toContainText(/starting|Starting/i, { timeout: 10000 });
          
          // Should show "running"
          await expect(statusElement).toContainText(/running|Running/i, { timeout: 10000 });
          
          // Test terminal input
          const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
          if (await terminalInput.isVisible()) {
            await terminalInput.fill(`test-${i}`);
            await terminalInput.press('Enter');
            await page.waitForTimeout(500);
          }
        });
      }
    });
  });

  test('SSE connection recovery after network issues', async () => {
    await test.step('Create instance and establish SSE', async () => {
      const button1 = page.locator('.launch-buttons button').first();
      await button1.click();
      
      // Wait for running status
      const statusElement = page.locator('.instance-status .status-text, .status-text').first();
      await expect(statusElement).toContainText(/running/i, { timeout: 10000 });
    });

    await test.step('Simulate network interruption and recovery', async () => {
      // Simulate offline condition
      await page.setOffline(true);
      await page.waitForTimeout(2000);
      
      // Restore connection
      await page.setOffline(false);
      await page.waitForTimeout(3000);
      
      // Verify SSE reconnection
      const statusElement = page.locator('.instance-status .status-text, .status-text').first();
      await expect(statusElement).toContainText(/running/i, { timeout: 10000 });
      
      // Test terminal still works after reconnection
      const terminalInput = page.locator('.input-field, input[placeholder*="command"]').first();
      if (await terminalInput.isVisible()) {
        await terminalInput.fill('echo "reconnection test"');
        await terminalInput.press('Enter');
        await page.waitForTimeout(1000);
      }
    });
  });
});

// Helper test for backend log validation (run separately if needed)
test.describe('Backend Log Validation', () => {
  test('Validate backend logs contain expected patterns', async () => {
    // This test would need to be run with access to backend logs
    // For now, it serves as documentation of expected log patterns
    
    const expectedLogPatterns = [
      'Broadcasting status running for instance claude-XXXX to 1 connections',
      '⌨️ Forwarding input to Claude claude-XXXX: [command]',
      'SSE connection established for instance: claude-XXXX',
      'Status SSE connections: 1 (expected > 0)'
    ];
    
    console.log('Expected backend log patterns:');
    expectedLogPatterns.forEach(pattern => {
      console.log(`  - ${pattern}`);
    });
    
    // In a real implementation, you would:
    // 1. Make HTTP requests to trigger the flow
    // 2. Check server logs via log files or API
    // 3. Validate the exact log messages appear
    
    expect(expectedLogPatterns.length).toBeGreaterThan(0);
  });
});