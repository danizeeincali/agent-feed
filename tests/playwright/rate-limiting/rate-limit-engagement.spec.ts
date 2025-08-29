import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Rate Limiting Engagement Threshold
 * 
 * Validates that rate limiting only engages after actual click attempts
 * Ensures rate limiting threshold (3 clicks per minute) is respected
 */
test.describe('Rate Limiting Engagement Threshold', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should NOT engage rate limiting until threshold is reached', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform 3 clicks (threshold is 3 per minute)
    for (let i = 0; i < 3; i++) {
      // Refresh page to reset debouncing but not rate limiting
      if (i > 0) {
        await page.reload();
        await claudeButtonsPage.page.waitForLoadState('networkidle');
        await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
      }
      
      await claudeButtonsPage.prodButton.click();
      
      // Wait for debouncing to clear
      await page.waitForTimeout(2500);
      
      // Should NOT see rate limiting warning yet
      await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    }
    
    // Check logs for rate limit tracking
    const rateLimitTrackingLogs = logs.filter(log => 
      log.includes('Rate limit check passed') || log.includes('calls in window')
    );
    expect(rateLimitTrackingLogs.length).toBeGreaterThanOrEqual(3);
    
    // Fourth click should trigger rate limiting
    await page.reload();
    await claudeButtonsPage.page.waitForLoadState('networkidle');
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
    
    await claudeButtonsPage.prodButton.click();
    
    // Now rate limiting should be active
    await claudeButtonsPage.waitForRateLimitWarning(5000);
  });

  test('Should track actual click attempts for rate limiting', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform multiple rapid clicks (most should be debounced)
    await claudeButtonsPage.performRapidClicking(claudeButtonsPage.prodButton, 10, 50);
    
    // Wait for debouncing to clear
    await page.waitForTimeout(3000);
    
    // Only first click should count toward rate limiting
    const rateLimitLogs = logs.filter(log => 
      log.includes('Rate limit check passed')
    );
    expect(rateLimitLogs).toHaveLength(1); // Only one actual execution
    
    // Should NOT be rate limited yet
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Can perform more clicks (up to threshold)
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(3000); // Clear debouncing
    
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(1000);
    
    // Should NOT be rate limited after 3 actual executions
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
  });

  test('Should engage rate limiting after exceeding threshold', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform clicks up to threshold (3)
    for (let i = 0; i < 4; i++) { // 4 clicks to exceed threshold of 3
      if (i > 0) {
        // Wait for debouncing to reset between clicks
        await page.waitForTimeout(2500);
      }
      
      await claudeButtonsPage.prodButton.click();
      
      if (i < 3) {
        // First 3 clicks should not trigger rate limiting
        await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
      }
    }
    
    // Fourth click should trigger rate limiting
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Check for rate limiting console messages
    const rateLimitMessages = logs.filter(log => 
      log.includes('Rate limited') || log.includes('rate limit exceeded')
    );
    expect(rateLimitMessages.length).toBeGreaterThan(0);
    
    // Button should show rate limit state
    const buttonDisabled = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(buttonDisabled).toBe(true);
  });

  test('Should differentiate between debouncing and rate limiting states', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // First click - should trigger debouncing
    await claudeButtonsPage.prodButton.click();
    
    // Should be in cooldown (debouncing), NOT rate limited
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    const debounceMessages = logs.filter(log => 
      log.includes('cooldown') || log.includes('debounce')
    );
    expect(debounceMessages.length).toBeGreaterThan(0);
    
    // Wait for debouncing to clear
    await page.waitForTimeout(3000);
    
    // Perform clicks to reach rate limit threshold
    for (let i = 1; i < 4; i++) { // 3 more clicks (total 4)
      await claudeButtonsPage.prodButton.click();
      await page.waitForTimeout(2500); // Clear debouncing
    }
    
    // Now should be rate limited
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Rate limiting state should be different from debouncing
    const rateLimitMessages = logs.filter(log => 
      log.includes('Rate limited')
    );
    expect(rateLimitMessages.length).toBeGreaterThan(0);
  });

  test('Should show different UI indicators for debouncing vs rate limiting', async ({ page }) => {
    // Test debouncing indicators
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Should show cooldown indicator, not rate limit warning
    await expect(claudeButtonsPage.cooldownIndicator).toBeVisible();
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    const cooldownText = await claudeButtonsPage.prodButton.textContent();
    expect(cooldownText).toMatch(/(cooldown)/i);
    
    // Wait for debouncing to clear
    await page.waitForTimeout(3000);
    
    // Trigger rate limiting by exceeding threshold
    for (let i = 1; i < 4; i++) {
      await claudeButtonsPage.prodButton.click();
      await page.waitForTimeout(2500);
    }
    
    // Should show rate limit warning
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Rate limit warning should have different styling
    const rateLimitText = await claudeButtonsPage.rateLimitWarning.textContent();
    expect(rateLimitText).toMatch(/rate limit/i);
    
    // Should have warning/amber styling
    const rateLimitClasses = await claudeButtonsPage.rateLimitWarning.getAttribute('class');
    expect(rateLimitClasses).toMatch(/amber|warning/i);
  });

  test('Should track rate limiting across page refreshes', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform 2 clicks
    for (let i = 0; i < 2; i++) {
      if (i > 0) await page.waitForTimeout(2500);
      await claudeButtonsPage.prodButton.click();
    }
    
    // Refresh page
    await page.reload();
    await claudeButtonsPage.page.waitForLoadState('networkidle');
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
    
    // Rate limiting should still track previous clicks
    // Two more clicks should trigger rate limiting
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(2500);
    
    await claudeButtonsPage.prodButton.click();
    
    // Should now be rate limited (4 total clicks)
    await claudeButtonsPage.waitForRateLimitWarning(3000);
  });

  test('Should handle rate limiting threshold precisely', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Test exact threshold boundary (3 clicks allowed per minute)
    
    // Click 1 - should work
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(2500);
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Click 2 - should work
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(2500);
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Click 3 - should work
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(2500);
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Click 4 - should trigger rate limiting
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Verify rate limiting messages
    const rateLimitMessages = logs.filter(log => 
      log.includes('Rate limited') && log.includes('3 calls per')
    );
    expect(rateLimitMessages.length).toBeGreaterThan(0);
  });

  test('Should not count failed attempts toward rate limiting', async ({ page }) => {
    // Mock API to fail requests
    let apiCallCount = 0;
    await page.route('**/api/**', (route) => {
      apiCallCount++;
      route.abort('failed');
    });
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform multiple clicks that will fail at API level
    for (let i = 0; i < 5; i++) {
      if (i > 0) await page.waitForTimeout(2500);
      await claudeButtonsPage.prodButton.click();
    }
    
    // Wait for processing
    await page.waitForTimeout(2000);
    
    // Rate limiting should only count successful attempts
    // Since API calls fail, rate limiting might not be triggered
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // But attempts should still be logged
    const attemptLogs = logs.filter(log => 
      log.includes('Rate limit check passed')
    );
    expect(attemptLogs.length).toBeGreaterThan(0);
  });
});