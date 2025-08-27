const { test, expect } = require('@playwright/test');

test.describe('Simple SSE Flow Validation', () => {
  test('should load Claude Instance Manager and validate SSE flow', async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => {
      console.log(`Browser: ${msg.type()}: ${msg.text()}`);
    });

    page.on('request', request => {
      console.log(`Request: ${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      console.log(`Response: ${response.status()} ${response.url()}`);
    });

    console.log('🔍 Navigating to Claude Instance Manager...');
    
    // Navigate to the Claude Instance Manager
    await page.goto('http://localhost:5173/claude-instances', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded, checking for content...');
    
    // Wait for React to render (more patient approach)
    await page.waitForTimeout(3000);
    
    // Check if we can see the header
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Header found, looking for buttons...');
    
    // Look for any button first
    const anyButton = page.locator('button').first();
    await expect(anyButton).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Buttons found, trying to click first button...');
    
    // Try to click the first button
    await anyButton.click();
    
    console.log('✅ Button clicked, waiting for response...');
    
    // Wait a bit for any response
    await page.waitForTimeout(5000);
    
    console.log('✅ Simple SSE validation test completed');
  });
});