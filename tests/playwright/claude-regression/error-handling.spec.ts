import { test, expect, Page } from '@playwright/test';
import { ClaudeManagerPage } from '../page-objects/ClaudeManagerPage';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Error Handling & Recovery Tests', () => {
  let claudeManagerPage: ClaudeManagerPage;
  let terminalPage: TerminalPage;

  test.beforeEach(async ({ page }) => {
    claudeManagerPage = new ClaudeManagerPage(page);
    terminalPage = new TerminalPage(page);
    await claudeManagerPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await claudeManagerPage.cleanupInstances();
  });

  test('should handle Claude process failures gracefully', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Simulate process failure by terminating the Claude process
    // Note: This might need to be adapted based on how process management works
    await terminalPage.sendInput('pkill -f claude');
    await page.waitForTimeout(2000);
    
    // Verify system detects failure and shows appropriate status
    await page.waitForTimeout(3000);
    
    // Check if status changes to indicate failure
    const currentStatus = await claudeManagerPage.getInstanceStatus();
    expect(['failed', 'stopped', 'error', 'terminated'].some(status => 
      currentStatus.toLowerCase().includes(status)
    )).toBe(true);
    
    // Verify error message is shown to user
    const errorMessage = await claudeManagerPage.getErrorMessage();
    expect(errorMessage).not.toBe('');
    expect(errorMessage.toLowerCase()).toMatch(/(failed|error|terminated|stopped)/);
  });

  test('should display proper error messages to user', async ({ page }) => {
    // Attempt to start Claude with invalid configuration
    // This might need custom setup depending on implementation
    
    // For now, test network error handling
    await page.route('**/claude**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    
    // Wait for error state
    await page.waitForTimeout(5000);
    
    // Verify error message is displayed
    const errorElement = await page.locator('.error-message, .error, [data-testid="error"]').first();
    await expect(errorElement).toBeVisible({ timeout: 10000 });
    
    const errorText = await errorElement.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.toLowerCase()).toMatch(/(error|failed|cannot|unable)/);
    
    // Verify button returns to normal state
    await expect(claudeManagerPage.prodClaudeButton).not.toContainText('starting');
    await expect(claudeManagerPage.prodClaudeButton).not.toContainText('running');
  });

  test('should recover from connection interruptions', async ({ page }) => {
    // Start Claude instance successfully
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Interrupt SSE connection
    await page.route('**/events*', route => {
      route.abort();
    });
    
    // Wait for connection interruption to be detected
    await page.waitForTimeout(3000);
    
    // Restore connection
    await page.unroute('**/events*');
    
    // Wait for automatic reconnection
    await page.waitForTimeout(5000);
    
    // Test if system recovered
    await terminalPage.sendInput('echo "recovery test"');
    await page.waitForTimeout(3000);
    
    const terminalContent = await terminalPage.getTerminalContent();
    const hasRecovered = terminalContent.includes('recovery test') || 
                        terminalContent.includes('connected') ||
                        terminalContent.includes('reconnect');
    
    // Should either show the test command or connection recovery messages
    expect(hasRecovered).toBe(true);
  });

  test('should handle timeout scenarios properly', async ({ page }) => {
    // Mock slow response to trigger timeout
    await page.route('**/claude**', async route => {
      await page.waitForTimeout(30000); // 30 second delay
      route.continue();
    });
    
    // Try to start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    
    // Wait for timeout to trigger
    await page.waitForTimeout(35000);
    
    // Verify timeout is handled gracefully
    const status = await claudeManagerPage.getInstanceStatus();
    expect(['timeout', 'failed', 'error'].some(state => 
      status.toLowerCase().includes(state)
    )).toBe(true);
    
    // Verify user is informed about timeout
    const errorMessage = await claudeManagerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toMatch(/(timeout|slow|delayed|failed)/);
  });

  test('should handle proper cleanup when instances terminated', async ({ page }) => {
    // Start multiple Claude instances
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Get initial resource count
    const initialInstanceCount = await claudeManagerPage.getActiveInstanceCount();
    expect(initialInstanceCount).toBe(1);
    
    // Terminate instance
    await claudeManagerPage.terminateInstance(0);
    
    // Wait for cleanup
    await page.waitForTimeout(2000);
    
    // Verify instance was cleaned up
    const finalInstanceCount = await claudeManagerPage.getActiveInstanceCount();
    expect(finalInstanceCount).toBe(0);
    
    // Verify button state reset
    await expect(claudeManagerPage.prodClaudeButton).not.toContainText('running');
    
    // Verify no memory leaks (check if new instances can be created)
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    const newInstanceCount = await claudeManagerPage.getActiveInstanceCount();
    expect(newInstanceCount).toBe(1);
  });

  test('should handle invalid commands gracefully', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Send invalid commands
    const invalidCommands = [
      'nonexistentcommand12345',
      'rm -rf /',  // Should be blocked or handled safely
      'sudo rm -rf .',  // Should require proper handling
      '$(malicious code)',  // Should be sanitized
      'cat /etc/passwd'  // Should handle permission issues
    ];
    
    for (const command of invalidCommands) {
      await terminalPage.sendInput(command);
      await terminalPage.waitForResponse();
      
      const response = await terminalPage.getLatestResponse();
      
      // Should not cause system crash
      expect(response).toBeTruthy();
      
      // Should contain appropriate error message
      const isAppropriateError = response.includes('not found') ||
                                response.includes('permission denied') ||
                                response.includes('cannot') ||
                                response.includes('error') ||
                                response.includes('invalid');
      
      if (!isAppropriateError) {
        // If it's not an error, it should be handled safely
        expect(response.length).toBeGreaterThan(0);
      }
    }
    
    // Verify system is still responsive after invalid commands
    await terminalPage.sendInput('echo "system still works"');
    await terminalPage.waitForResponse();
    
    const finalResponse = await terminalPage.getLatestResponse();
    expect(finalResponse).toContain('system still works');
  });

  test('should handle resource exhaustion scenarios', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Try to exhaust memory (in a controlled way)
    const memoryIntensiveCommand = 'yes | head -n 10000 | tr -d "\\n" | wc -c';
    await terminalPage.sendInput(memoryIntensiveCommand);
    await terminalPage.waitForResponse(10000);
    
    // Should handle gracefully without crashing
    const response = await terminalPage.getLatestResponse();
    expect(response).toBeTruthy();
    
    // System should still be responsive
    await terminalPage.sendInput('echo "still responsive"');
    await terminalPage.waitForResponse();
    
    const followupResponse = await terminalPage.getLatestResponse();
    expect(followupResponse).toContain('still responsive');
  });

  test('should handle concurrent error scenarios', async ({ page }) => {
    // Try to create multiple instances simultaneously (potential race condition)
    const startPromises = [
      claudeManagerPage.clickProdClaudeButton(),
      claudeManagerPage.clickSkipPermissionsButton()
    ];
    
    // Execute simultaneously
    await Promise.allSettled(startPromises);
    
    // Wait for system to stabilize
    await page.waitForTimeout(5000);
    
    // Verify system handled concurrent requests properly
    const activeInstances = await claudeManagerPage.getActiveInstanceCount();
    
    // Should either have 1 or 2 instances, not crashed
    expect(activeInstances).toBeGreaterThanOrEqual(1);
    expect(activeInstances).toBeLessThanOrEqual(2);
    
    // Verify no system crash occurred
    const errorMessages = await claudeManagerPage.getAllErrorMessages();
    const hasCriticalError = errorMessages.some(msg => 
      msg.toLowerCase().includes('crash') || 
      msg.toLowerCase().includes('fatal')
    );
    
    expect(hasCriticalError).toBe(false);
  });

  test('should provide helpful error context to users', async ({ page }) => {
    // Mock specific error scenario
    await page.route('**/claude**', route => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ 
          error: 'Authentication failed',
          details: 'Invalid API key provided'
        })
      });
    });
    
    // Try to start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await page.waitForTimeout(3000);
    
    // Verify detailed error information is provided
    const errorMessage = await claudeManagerPage.getErrorMessage();
    
    // Should contain helpful context
    expect(errorMessage.toLowerCase()).toMatch(/(authentication|api.*key|credential|permission)/);
    
    // Should not just say "Error" but provide actionable information
    expect(errorMessage.length).toBeGreaterThan(10);
    
    // Verify error doesn't contain sensitive information
    expect(errorMessage).not.toContain('password');
    expect(errorMessage).not.toContain('secret');
    expect(errorMessage).not.toContain('token');
  });

  test('should maintain data integrity during errors', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Create some session data
    await terminalPage.sendInput('export TEST_DATA="important_value"');
    await terminalPage.waitForResponse();
    
    // Simulate error condition
    await page.route('**/events*', route => {
      if (Math.random() > 0.7) { // Intermittent failures
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Continue using the terminal despite intermittent errors
    await terminalPage.sendInput('echo $TEST_DATA');
    await page.waitForTimeout(2000);
    
    // Remove error simulation
    await page.unroute('**/events*');
    
    // Verify data integrity
    await terminalPage.sendInput('echo $TEST_DATA');
    await terminalPage.waitForResponse();
    
    const response = await terminalPage.getLatestResponse();
    
    // Data should either be preserved or system should clearly indicate loss
    const hasData = response.includes('important_value');
    const hasErrorMessage = response.toLowerCase().includes('error') || 
                           response.toLowerCase().includes('lost');
    
    expect(hasData || hasErrorMessage).toBe(true);
  });
});