import { test, expect } from '@playwright/test';
import { AgentFeedPage } from './pages/AgentFeedPage';
import { TestHelpers } from './utils/TestHelpers';

test.describe('Error Scenarios - Error Handling and Recovery', () => {
  let agentFeedPage: AgentFeedPage;

  test.beforeEach(async ({ page }) => {
    agentFeedPage = new AgentFeedPage(page);
    await agentFeedPage.goto();
  });

  test('Backend Service Unavailable', async ({ page }) => {
    // Mock backend failure
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });
    
    // Try to create instance
    await agentFeedPage.createInstanceButton.click();
    
    // Should show appropriate error
    await agentFeedPage.verifyErrorHandling();
    
    // Error message should be user-friendly
    const errorText = await agentFeedPage.errorMessage.textContent();
    expect(errorText).toContain('Service');
    expect(errorText).not.toContain('undefined');
    expect(errorText).not.toContain('500');
    
    // Restore backend
    await page.unroute('**/api/**');
    
    // Should recover after backend restoration
    await page.waitForTimeout(2000);
    await agentFeedPage.createInstanceButton.click();
    
    // Should work normally now
    await expect(agentFeedPage.instancesList.locator('.instance-item').first()).toBeVisible({ timeout: 30000 });
  });

  test('Invalid Command Execution', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Execute invalid command
    await agentFeedPage.executeCommand('nonexistentcommandthatdoesnotexist123');
    
    // Should handle error gracefully
    await agentFeedPage.verifyErrorHandling();
    
    // Error should be displayed in terminal
    await expect(agentFeedPage.terminalOutput).toContainText(/not found|not recognized|command not found/i, { timeout: 10000 });
    
    // System should recover and accept new commands
    await agentFeedPage.executeCommand('echo "Recovery test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Recovery test');
  });

  test('Network Connectivity Loss', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Establish normal communication
    await agentFeedPage.executeCommand('echo "Before network loss"');
    await expect(agentFeedPage.terminalOutput).toContainText('Before network loss');
    
    // Simulate network loss
    await TestHelpers.mockBackendError(page, 0); // Connection refused
    
    // Try to execute command during network loss
    await agentFeedPage.executeCommand('echo "During network loss"');
    
    // Should show connection error
    await page.waitForTimeout(5000);
    await agentFeedPage.verifyErrorHandling();
    
    // Restore network
    await TestHelpers.restoreBackend(page);
    
    // System should reconnect and work
    await page.waitForTimeout(3000);
    await agentFeedPage.executeCommand('echo "After network restoration"');
    await expect(agentFeedPage.terminalOutput).toContainText('After network restoration', { timeout: 15000 });
  });

  test('WebSocket Connection Failure', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Simulate WebSocket failure
    await page.evaluate(() => {
      // Close existing WebSocket if available
      if ((window as any).websocket && (window as any).websocket.close) {
        (window as any).websocket.close();
      }
    });
    
    // Block WebSocket connections
    await page.route('ws://**', route => route.abort());
    await page.route('wss://**', route => route.abort());
    
    // Try to execute command without WebSocket
    await agentFeedPage.executeCommand('echo "WebSocket failure test"');
    
    // Should handle WebSocket failure gracefully
    await page.waitForTimeout(5000);
    await agentFeedPage.verifyErrorHandling();
    
    // Check connection status
    if (await agentFeedPage.websocketStatus.isVisible()) {
      await expect(agentFeedPage.websocketStatus).not.toHaveText(/connected/i);
    }
    
    // Restore WebSocket
    await page.unroute('ws://**');
    await page.unroute('wss://**');
    
    // Should attempt to reconnect
    await page.waitForTimeout(5000);
    await agentFeedPage.executeCommand('echo "WebSocket recovery test"');
    await page.waitForTimeout(3000);
  });

  test('Instance Creation Failure', async ({ page }) => {
    // Mock instance creation failure
    await page.route('**/api/instances', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to create instance' })
        });
      } else {
        route.continue();
      }
    });
    
    // Try to create instance
    await agentFeedPage.createInstanceButton.click();
    
    // Loading should appear
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    
    // Should eventually show error
    await agentFeedPage.verifyErrorHandling();
    
    // Loading should disappear
    await expect(agentFeedPage.loadingAnimations.first()).toBeHidden({ timeout: 10000 });
    
    // No instance should be created
    const instanceCount = await agentFeedPage.instancesList.locator('.instance-item').count();
    expect(instanceCount).toBe(0);
    
    // Restore functionality
    await page.unroute('**/api/instances');
    
    // Should work normally now
    await agentFeedPage.createInstanceButton.click();
    await expect(agentFeedPage.instancesList.locator('.instance-item').first()).toBeVisible({ timeout: 30000 });
  });

  test('Command Timeout Handling', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Execute long-running command
    await agentFeedPage.executeCommand('sleep 60');
    
    // Should show loading/processing state
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    
    // Wait for potential timeout (implementation dependent)
    await page.waitForTimeout(10000);
    
    // System should still be responsive
    await agentFeedPage.verifyErrorHandling();
    
    // Try to cancel or interrupt if possible
    const cancelButton = page.getByRole('button', { name: /cancel|stop|interrupt/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    // Should be able to execute new command
    await agentFeedPage.executeCommand('echo "After timeout"');
    await expect(agentFeedPage.terminalOutput).toContainText('After timeout', { timeout: 10000 });
  });

  test('Memory/Resource Exhaustion', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Try to execute memory-intensive command
    await agentFeedPage.executeCommand('dd if=/dev/zero of=/tmp/large-file bs=1M count=100');
    
    // Monitor for potential resource errors
    await page.waitForTimeout(5000);
    await agentFeedPage.verifyErrorHandling();
    
    // System should handle resource limits gracefully
    const errors = await page.evaluate(() => {
      const consoleErrors = (window as any).consoleErrors || [];
      return consoleErrors.filter((error: string) => 
        error.toLowerCase().includes('memory') || 
        error.toLowerCase().includes('resource')
      );
    });
    
    if (errors.length > 0) {
      console.log('Resource-related errors detected:', errors);
    }
    
    // Should still be able to execute simple commands
    await agentFeedPage.executeCommand('echo "Resource test recovery"');
    await expect(agentFeedPage.terminalOutput).toContainText('Resource test recovery', { timeout: 10000 });
  });

  test('Malformed Response Handling', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Mock malformed API responses
    await page.route('**/api/execute', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    // Try to execute command
    await agentFeedPage.executeCommand('echo "Malformed response test"');
    
    // Should handle malformed response gracefully
    await page.waitForTimeout(5000);
    await agentFeedPage.verifyErrorHandling();
    
    // Error should be user-friendly, not showing raw JSON parse errors
    if (await agentFeedPage.errorMessage.isVisible()) {
      const errorText = await agentFeedPage.errorMessage.textContent();
      expect(errorText).not.toContain('JSON');
      expect(errorText).not.toContain('parse');
      expect(errorText).not.toContain('undefined');
    }
    
    // Restore normal responses
    await page.unroute('**/api/execute');
    
    // Should work normally
    await agentFeedPage.executeCommand('echo "Normal response test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Normal response test', { timeout: 10000 });
  });

  test('Browser Compatibility Issues', async ({ page, browserName }) => {
    console.log('Testing browser compatibility for:', browserName);
    
    await agentFeedPage.createNewInstance();
    
    // Test basic functionality across browsers
    await agentFeedPage.executeCommand('echo "Browser compatibility test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Browser compatibility test');
    
    // Test WebSocket functionality
    if (await agentFeedPage.websocketStatus.isVisible()) {
      await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i, { timeout: 10000 });
    }
    
    // Test JavaScript features
    const features = await page.evaluate(() => {
      return {
        websocket: typeof WebSocket !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        es6: typeof Symbol !== 'undefined'
      };
    });
    
    console.log('Browser features:', features);
    
    // All modern features should be available
    expect(features.websocket).toBe(true);
    expect(features.fetch).toBe(true);
    expect(features.promises).toBe(true);
  });

  test('Rapid Error Recovery', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Cause multiple errors in sequence
    const errorCommands = [
      'invalidcommand1',
      'invalidcommand2',
      'invalidcommand3'
    ];
    
    for (const command of errorCommands) {
      await agentFeedPage.executeCommand(command);
      await page.waitForTimeout(1000);
    }
    
    // Verify system handles multiple errors
    await agentFeedPage.verifyErrorHandling();
    
    // Should still be functional after multiple errors
    await agentFeedPage.executeCommand('echo "Error recovery test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Error recovery test');
    
    // Should be able to create new instance after errors
    await agentFeedPage.createInstanceButton.click();
    await expect(agentFeedPage.instancesList.locator('.instance-item')).toHaveCount(2, { timeout: 30000 });
  });
});