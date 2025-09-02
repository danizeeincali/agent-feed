import { test, expect } from '@playwright/test';
import { AgentFeedPage } from './pages/AgentFeedPage';
import { TestHelpers } from './utils/TestHelpers';
import { testCommands, testScenarios } from './fixtures/TestData';

test.describe('User Workflows - Complete E2E Testing', () => {
  let agentFeedPage: AgentFeedPage;
  let checkErrors: () => string[];

  test.beforeEach(async ({ page }) => {
    agentFeedPage = new AgentFeedPage(page);
    checkErrors = await TestHelpers.verifyNoJavaScriptErrors(page);
    await agentFeedPage.goto();
  });

  test.afterEach(async () => {
    const errors = checkErrors();
    if (errors.length > 0) {
      console.warn('JavaScript errors detected during test:', errors);
    }
  });

  test('Complete Button Click to Instance Creation Flow', async () => {
    // Step 1: Navigate and verify page load
    await expect(agentFeedPage.page).toHaveTitle(/Agent Feed/);
    
    // Step 2: Click Create Instance button
    await agentFeedPage.createInstanceButton.click();
    
    // Step 3: Verify loading animation appears
    await agentFeedPage.verifyLoadingAnimation();
    
    // Step 4: Wait for instance creation
    await expect(agentFeedPage.instancesList.locator('.instance-item').first()).toBeVisible({ timeout: 30000 });
    
    // Step 5: Verify PID tracking
    const pid = await agentFeedPage.getInstancePID();
    expect(pid).toBeTruthy();
    expect(pid).toMatch(/^\d+$/); // Should be a number
    
    // Step 6: Capture screenshot for verification
    await agentFeedPage.captureScreenshot('instance-creation-complete');
  });

  test('Simple Command Execution with Tool Call Visualization', async () => {
    // Create instance first
    await agentFeedPage.createNewInstance();
    
    // Execute simple command
    await agentFeedPage.executeCommand(testCommands.simple.command);
    
    // Verify tool call bullets appear
    await agentFeedPage.verifyToolCallVisualization();
    
    // Verify command output
    await expect(agentFeedPage.terminalOutput).toContainText(testCommands.simple.expectedOutput);
    
    // Wait for command completion
    await agentFeedPage.waitForCommandCompletion();
  });

  test('Complex Command with Interactive Elements', async () => {
    await agentFeedPage.createNewInstance();
    
    // Execute complex command that might require permissions
    await agentFeedPage.executeComplexCommand(
      testCommands.complex.command, 
      false // No permission dialog expected for this command
    );
    
    // Verify multiple tool calls
    const toolCallCount = await agentFeedPage.toolCallBullets.count();
    expect(toolCallCount).toBeGreaterThanOrEqual(1);
    
    // Verify output contains expected content
    await expect(agentFeedPage.terminalOutput).toContainText(testCommands.complex.expectedOutput);
  });

  test('Interactive Command with User Input', async () => {
    await agentFeedPage.createNewInstance();
    
    // Execute interactive command
    await agentFeedPage.executeCommand(testCommands.interactive.command);
    
    // Handle user input if prompt appears
    const inputPrompt = agentFeedPage.page.locator('input[type="text"]').first();
    if (await inputPrompt.isVisible({ timeout: 5000 })) {
      await inputPrompt.fill(testCommands.interactive.userInput);
      await agentFeedPage.page.keyboard.press('Enter');
    }
    
    // Verify expected output
    await expect(agentFeedPage.terminalOutput).toContainText(
      testCommands.interactive.expectedOutput, 
      { timeout: 10000 }
    );
  });

  test('WebSocket Communication Stability', async () => {
    // Verify initial WebSocket connection
    await agentFeedPage.waitForWebSocketConnection();
    
    await agentFeedPage.createNewInstance();
    
    // Test continuous communication
    for (let i = 0; i < 3; i++) {
      await agentFeedPage.executeCommand(`echo "Message ${i + 1}"`);
      await expect(agentFeedPage.terminalOutput).toContainText(`Message ${i + 1}`);
      await agentFeedPage.page.waitForTimeout(1000);
    }
    
    // Verify WebSocket still connected
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i);
  });

  test('Error Handling and Recovery', async () => {
    await agentFeedPage.createNewInstance();
    
    // Execute command that will fail
    await agentFeedPage.executeCommand(testCommands.errorProne.command);
    
    // Verify error is displayed appropriately
    await agentFeedPage.verifyErrorHandling();
    
    // Verify system recovers and can execute valid command
    await agentFeedPage.executeCommand(testCommands.simple.command);
    await expect(agentFeedPage.terminalOutput).toContainText(testCommands.simple.expectedOutput);
  });

  test('Network Failure Simulation and Recovery', async () => {
    await agentFeedPage.createNewInstance();
    
    // Simulate network failure
    await agentFeedPage.simulateNetworkFailure();
    
    // Try to execute command during network failure
    await agentFeedPage.executeCommand('echo "Network test"');
    
    // Verify appropriate error handling
    await agentFeedPage.verifyErrorHandling();
    
    // Restore network
    await agentFeedPage.restoreNetwork();
    
    // Verify recovery
    await agentFeedPage.page.waitForTimeout(2000);
    await agentFeedPage.executeCommand('echo "Recovery test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Recovery test');
  });

  test('Performance Validation - Instance Creation Time', async ({ page }) => {
    const start = Date.now();
    
    await agentFeedPage.createNewInstance();
    
    const end = Date.now();
    const creationTime = end - start;
    
    console.log(`Instance creation took: ${creationTime}ms`);
    
    // Should create instance within 30 seconds
    expect(creationTime).toBeLessThan(30000);
    
    // Capture performance metrics
    const metrics = await page.metrics();
    console.log('Performance metrics:', metrics);
  });

  test('Visual Regression - Loading Animation Consistency', async ({ page }) => {
    // Take screenshot before interaction
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline-before-click.png', fullPage: true });
    
    // Click create instance to trigger loading
    await agentFeedPage.createInstanceButton.click();
    
    // Wait for loading animation to appear
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    
    // Take screenshot during loading
    await page.screenshot({ path: 'tests/e2e/screenshots/loading-animation.png', fullPage: true });
    
    // Wait for completion
    await agentFeedPage.verifyLoadingAnimation();
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/instance-created.png', fullPage: true });
  });

  test('Complete User Journey - End to End', async () => {
    console.log('Starting complete user journey test...');
    
    // Step 1: Page load and initial state
    await expect(agentFeedPage.page).toHaveTitle(/Agent Feed/);
    await expect(agentFeedPage.createInstanceButton).toBeVisible();
    
    // Step 2: Instance creation
    await agentFeedPage.createNewInstance();
    const pid = await agentFeedPage.getInstancePID();
    console.log('Instance created with PID:', pid);
    
    // Step 3: Simple command execution
    await agentFeedPage.executeCommand('echo "Hello E2E Test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Hello E2E Test');
    
    // Step 4: Complex command with tool calls
    await agentFeedPage.executeCommand('ps aux | grep node');
    await agentFeedPage.verifyToolCallVisualization();
    
    // Step 5: File operations
    await agentFeedPage.executeCommand('touch test-file.txt && ls -la test-file.txt');
    await expect(agentFeedPage.terminalOutput).toContainText('test-file.txt');
    
    // Step 6: Cleanup
    await agentFeedPage.executeCommand('rm -f test-file.txt');
    
    console.log('Complete user journey test completed successfully');
  });
});