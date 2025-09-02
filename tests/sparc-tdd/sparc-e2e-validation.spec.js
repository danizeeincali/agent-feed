#!/usr/bin/env node

/**
 * SPARC E2E Validation - Complete workflow testing
 * Tests the entire user journey: button click -> instance launch -> prompt -> response
 */

const { test, expect } = require('@playwright/test');

test.describe('SPARC Claude API Timeout Fix - E2E Validation', () => {
  
  test.beforeAll(async () => {
    // Ensure backend services are running
    console.log('🧪 Starting SPARC E2E validation...');
  });

  test('Complete user workflow - button to response without timeout', async ({ page }) => {
    console.log('🎯 Testing complete user workflow...');
    
    // Step 1: Navigate to frontend
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/Claude Code/);
    
    // Step 2: Click "Launch Claude Code Instance" button
    const launchButton = page.locator('button:has-text("Launch Claude Code Instance")');
    await expect(launchButton).toBeVisible();
    await launchButton.click();
    
    // Step 3: Wait for WebSocket connection establishment
    await page.waitForTimeout(2000);
    
    // Step 4: Type prompt in terminal
    const terminalInput = page.locator('input[placeholder*="Type your command"]');
    await expect(terminalInput).toBeVisible();
    
    const testPrompt = 'What is 2+2?';
    await terminalInput.fill(testPrompt);
    
    // Step 5: Press Enter to send prompt
    await terminalInput.press('Enter');
    
    // Step 6: Verify response appears within 60 seconds (not 15)
    const responseLocator = page.locator('.terminal-output').last();
    
    // This is the critical test - should not timeout after 15 seconds
    await expect(responseLocator).toContainText('4', { timeout: 60000 });
    
    // Step 7: Check WebSocket connection remains active
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).not.toContainText('Connection lost');
    
    console.log('✅ Complete workflow test PASSED');
  });

  test('Long prompt handling without stdin blocking', async ({ page }) => {
    console.log('🎯 Testing long prompt handling...');
    
    await page.goto('http://localhost:5173');
    
    // Launch instance
    await page.locator('button:has-text("Launch Claude Code Instance")').click();
    await page.waitForTimeout(2000);
    
    // Send a very long prompt that would cause issues with command line arguments
    const longPrompt = 'Please explain quantum computing in great detail. ' + 'Tell me more. '.repeat(200);
    
    const terminalInput = page.locator('input[placeholder*="Type your command"]');
    await terminalInput.fill(longPrompt);
    await terminalInput.press('Enter');
    
    // Should handle long prompts using file-based communication
    const responseLocator = page.locator('.terminal-output').last();
    await expect(responseLocator).toContainText('quantum', { timeout: 60000 });
    
    console.log('✅ Long prompt test PASSED');
  });

  test('Concurrent user simulation', async ({ browser }) => {
    console.log('🎯 Testing concurrent users...');
    
    // Create multiple browser contexts to simulate different users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(), 
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // Launch instances in parallel
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('http://localhost:5173');
      await page.locator('button:has-text("Launch Claude Code Instance")').click();
      await page.waitForTimeout(2000);
    }));
    
    // Send different prompts to each instance simultaneously
    const prompts = [
      'What is 1+1?',
      'What is the capital of France?', 
      'Name three primary colors.'
    ];
    
    const responsePromises = pages.map(async (page, index) => {
      const terminalInput = page.locator('input[placeholder*="Type your command"]');
      await terminalInput.fill(prompts[index]);
      await terminalInput.press('Enter');
      
      // Wait for response
      const responseLocator = page.locator('.terminal-output').last();
      return expect(responseLocator).not.toBeEmpty({ timeout: 60000 });
    });
    
    // All should complete without interference
    await Promise.all(responsePromises);
    
    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
    
    console.log('✅ Concurrent users test PASSED');
  });

  test('Error handling and recovery', async ({ page }) => {
    console.log('🎯 Testing error handling...');
    
    await page.goto('http://localhost:5173');
    
    // Launch instance
    await page.locator('button:has-text("Launch Claude Code Instance")').click();
    await page.waitForTimeout(2000);
    
    // Send an invalid prompt that might cause issues
    const terminalInput = page.locator('input[placeholder*="Type your command"]');
    await terminalInput.fill(''); // Empty prompt
    await terminalInput.press('Enter');
    
    // Should handle gracefully without crashing
    await page.waitForTimeout(1000);
    
    // Send a valid prompt after the invalid one
    await terminalInput.fill('What is the weather like?');
    await terminalInput.press('Enter');
    
    // Should still work
    const responseLocator = page.locator('.terminal-output').last();
    await expect(responseLocator).not.toBeEmpty({ timeout: 60000 });
    
    console.log('✅ Error handling test PASSED');
  });

  test('Performance - response time under 30 seconds', async ({ page }) => {
    console.log('🎯 Testing performance requirements...');
    
    await page.goto('http://localhost:5173');
    
    // Launch instance
    await page.locator('button:has-text("Launch Claude Code Instance")').click();
    await page.waitForTimeout(2000);
    
    const startTime = Date.now();
    
    // Send prompt
    const terminalInput = page.locator('input[placeholder*="Type your command"]');
    await terminalInput.fill('What is artificial intelligence?');
    await terminalInput.press('Enter');
    
    // Wait for response
    const responseLocator = page.locator('.terminal-output').last();
    await expect(responseLocator).toContainText('artificial', { timeout: 30000 });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`📊 Response time: ${responseTime}ms`);
    
    // Should be under 30 seconds (30000ms)
    expect(responseTime).toBeLessThan(30000);
    
    console.log('✅ Performance test PASSED');
  });
});

// Run tests if called directly
if (require.main === module) {
  console.log('🧪 Running SPARC E2E Validation Tests...');
  console.log('Make sure both backend and frontend are running:');
  console.log('- Backend: node sparc-fixed-backend.js');
  console.log('- Frontend: npm run dev');
  console.log('');
  console.log('Run with: npx playwright test sparc-e2e-validation.spec.js');
}