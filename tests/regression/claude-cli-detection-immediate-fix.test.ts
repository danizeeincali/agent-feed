/**
 * IMMEDIATE FIX VALIDATION: Claude CLI Detection Regression Test
 * Validates Claude CLI is accessible from terminal sessions
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Claude CLI Detection Immediate Fix', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Should detect Claude CLI and launch successfully', async () => {
    console.log('🔍 Testing Claude CLI detection and launch...');

    // Click Claude CLI button
    const claudeButton = page.locator('button:has-text("Claude CLI")').first();
    await expect(claudeButton).toBeVisible({ timeout: 10000 });
    await claudeButton.click();

    // Wait for terminal to initialize
    await page.waitForSelector('[data-testid="terminal"], .terminal', { timeout: 15000 });
    console.log('✅ Terminal initialized');

    // Wait for Claude CLI interaction
    await page.waitForTimeout(5000);
    
    // Check for success indicators - NO "not found" errors
    const bodyText = await page.textContent('body');
    
    // CRITICAL: Should NOT contain "not found" error
    expect(bodyText?.toLowerCase()).not.toContain('not found');
    expect(bodyText?.toLowerCase()).not.toContain('command not found');
    expect(bodyText?.toLowerCase()).not.toContain('claude code not found');
    
    // Should contain positive indicators
    const hasConnectedIndicator = bodyText?.includes('Connected') || 
                                  bodyText?.includes('Emergency Fix Active') ||
                                  bodyText?.includes('✅');
    
    expect(hasConnectedIndicator).toBeTruthy();
    
    console.log('✅ Claude CLI detection validated - no "not found" errors');
  });

  test('Should maintain cascade fix while restoring CLI functionality', async () => {
    // Launch Claude CLI
    const claudeButton = page.locator('button:has-text("Claude CLI")').first();
    await claudeButton.click();
    await page.waitForSelector('[data-testid="terminal"], .terminal', { timeout: 10000 });
    
    // Monitor for both CLI functionality AND cascade prevention
    await page.waitForTimeout(8000);
    
    // Count UI boxes - should still be limited (cascade fix maintained)
    const totalBoxes = await page.locator('div[class*="bg-"], div[class*="border-"], .terminal').count();
    expect(totalBoxes).toBeLessThanOrEqual(8); // Allow reasonable UI elements
    
    // Verify no CLI errors
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).not.toContain('not found');
    
    console.log(`✅ Cascade fix maintained: ${totalBoxes} UI boxes, no CLI errors`);
  });

  test('Should handle terminal environment properly for CLI access', async () => {
    // Launch terminal
    const claudeButton = page.locator('button:has-text("Claude CLI")').first();  
    await claudeButton.click();
    await page.waitForSelector('[data-testid="terminal"], .terminal', { timeout: 10000 });
    
    // Wait for environment setup
    await page.waitForTimeout(3000);
    
    // Check terminal connection status
    const connectionStatus = page.locator('text=/Connected|Emergency Fix Active|Terminal/i');
    await expect(connectionStatus).toBeVisible({ timeout: 15000 });
    
    // Verify no environment-related errors
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).not.toContain('path');
    expect(bodyText?.toLowerCase()).not.toContain('environment error');
    
    console.log('✅ Terminal environment properly configured for CLI access');
  });
});