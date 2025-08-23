import { test, expect } from '@playwright/test';

test.describe('Claude Code Launcher - Comprehensive Tests', () => {
  test('should show Claude Code as available', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the launcher component to load
    await page.waitForSelector('text=Claude Code Launcher', { timeout: 10000 });
    
    // Should show Claude Code as available (✅)
    const claudeStatus = page.locator('text=Claude Code:');
    await expect(claudeStatus).toBeVisible();
    
    // Should NOT show "❌ Not Found"
    await expect(page.locator('text=❌ Not Found')).not.toBeVisible();
    
    // Should show working directory as /prod
    await expect(page.locator('text=Working Directory: /prod')).toBeVisible();
    
    console.log('✅ Claude Code availability verified');
  });

  test('should show process as stopped initially', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=Process Status', { timeout: 5000 });
    
    // Should show stopped status
    await expect(page.locator('text=⚫ Stopped')).toBeVisible();
    
    // Launch button should be available
    await expect(page.locator('text=🚀 Launch Claude')).toBeVisible();
    
    console.log('✅ Initial stopped status verified');
  });

  test('should launch Claude Code successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=🚀 Launch Claude', { timeout: 5000 });
    
    // Click launch button
    await page.locator('text=🚀 Launch Claude').click();
    
    // Wait for status to change
    await page.waitForSelector('text=🟢 Running', { timeout: 15000 });
    
    // Should show running status
    await expect(page.locator('text=🟢 Running')).toBeVisible();
    
    // Should show stop button
    await expect(page.locator('text=🛑 Stop Claude')).toBeVisible();
    
    // Should show process ID
    await expect(page.locator('text=PID:')).toBeVisible();
    
    console.log('✅ Claude Code launch successful');
  });

  test('should show launch status indicator', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=🚀 Launch Claude', { timeout: 5000 });
    
    // Click launch
    await page.locator('text=🚀 Launch Claude').click();
    
    // Should show loading or starting status
    const statusIndicators = [
      'text=🟡 Starting',
      'text=🟢 Running',
      'text=Loading...'
    ];
    
    // Wait for any of these status indicators
    let foundStatus = false;
    for (const indicator of statusIndicators) {
      try {
        await page.waitForSelector(indicator, { timeout: 3000 });
        foundStatus = true;
        break;
      } catch (e) {
        // Try next indicator
      }
    }
    
    expect(foundStatus).toBe(true);
    console.log('✅ Launch status indicators working');
  });

  test('should stop Claude Code successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // First launch Claude
    await page.waitForSelector('text=🚀 Launch Claude', { timeout: 5000 });
    await page.locator('text=🚀 Launch Claude').click();
    await page.waitForSelector('text=🟢 Running', { timeout: 15000 });
    
    // Then stop it
    await page.locator('text=🛑 Stop Claude').click();
    
    // Wait for stopped status
    await page.waitForSelector('text=⚫ Stopped', { timeout: 10000 });
    
    // Should show stopped status
    await expect(page.locator('text=⚫ Stopped')).toBeVisible();
    
    // Should show launch button again
    await expect(page.locator('text=🚀 Launch Claude')).toBeVisible();
    
    console.log('✅ Claude Code stop successful');
  });

  test('should handle API endpoints correctly', async ({ page }) => {
    // Test API endpoints directly
    const checkResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3001/api/claude/check');
      return response.json();
    });
    
    expect(checkResponse.success).toBe(true);
    expect(checkResponse.claudeAvailable).toBe(true);
    expect(checkResponse.workingDirectory).toBe('/workspaces/agent-feed/prod');
    
    console.log('✅ API endpoints working correctly');
  });

  test('should work across different browsers', async ({ page, browserName }) => {
    await page.goto('http://localhost:3000');
    
    // Basic functionality should work in all browsers
    await page.waitForSelector('text=Claude Code Launcher', { timeout: 10000 });
    await expect(page.locator('text=Working Directory: /prod')).toBeVisible();
    
    console.log(`✅ ${browserName} compatibility confirmed`);
  });

  test('should handle process lifecycle correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Test the complete lifecycle: stopped -> starting -> running -> stopped
    await page.waitForSelector('text=⚫ Stopped', { timeout: 5000 });
    
    // Launch
    await page.locator('text=🚀 Launch Claude').click();
    
    // Should eventually reach running state
    await page.waitForSelector('text=🟢 Running', { timeout: 15000 });
    
    // Stop
    await page.locator('text=🛑 Stop Claude').click();
    
    // Should return to stopped state
    await page.waitForSelector('text=⚫ Stopped', { timeout: 10000 });
    
    console.log('✅ Process lifecycle management working');
  });

  test('should show working directory correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Should show the correct working directory
    await expect(page.locator('text=Working Directory: /prod')).toBeVisible();
    
    // The directory should be relative to agent-feed
    await expect(page.locator('text=/workspaces/agent-feed/prod')).toBeVisible();
    
    console.log('✅ Working directory display correct');
  });
});