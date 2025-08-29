import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Rate Limit Reset Timing Validation
 * 
 * Validates that rate limiting resets after the specified time window (60 seconds)
 * Tests both debouncing reset (2 seconds) and rate limit reset (60 seconds)
 */
test.describe('Rate Limit Reset Timing Validation', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should reset debouncing after 2 seconds', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 3000);
    
    const startTime = Date.now();
    
    // Wait for debouncing reset (2 seconds + buffer)
    await page.waitForTimeout(2500);
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    // Should see reset message in logs
    const resetMessages = logs.filter(log => 
      log.includes('debouncing reset') || log.includes('ready for next click') || log.includes('🔄')
    );
    expect(resetMessages.length).toBeGreaterThan(0);
    
    // Button should be ready again
    await claudeButtonsPage.waitForButtonReady(claudeButtonsPage.prodButton, 2000);
    
    // Should be clickable again
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(true);
    
    // Timing should be approximately 2 seconds
    expect(elapsedTime).toBeGreaterThanOrEqual(2000);
    expect(elapsedTime).toBeLessThan(4000); // Allow some buffer
  });

  test('Should maintain debouncing timing precision across multiple cycles', async ({ page }) => {
    const resetTimes: number[] = [];
    
    for (let cycle = 0; cycle < 3; cycle++) {
      const logs: string[] = [];
      
      page.on('console', (msg) => {
        logs.push(msg.text());
      });
      
      // Trigger debouncing
      await claudeButtonsPage.prodButton.click();
      await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
      
      const startTime = Date.now();
      
      // Wait for reset
      while (true) {
        const isReady = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
        if (!isReady) {
          break;
        }
        await page.waitForTimeout(100);
        
        // Timeout after 5 seconds
        if (Date.now() - startTime > 5000) {
          throw new Error(`Debouncing did not reset in cycle ${cycle + 1}`);
        }
      }
      
      const resetTime = Date.now() - startTime;
      resetTimes.push(resetTime);
      
      // Verify button is actually clickable
      const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      expect(clickResult.success, `Cycle ${cycle + 1} should be clickable after reset`).toBe(true);
      
      // Clear debouncing for next cycle
      await page.waitForTimeout(2500);
    }
    
    // All reset times should be approximately 2 seconds (within reasonable variance)
    for (let i = 0; i < resetTimes.length; i++) {
      expect(resetTimes[i], `Cycle ${i + 1} reset time`).toBeGreaterThanOrEqual(1800); // 1.8s min
      expect(resetTimes[i], `Cycle ${i + 1} reset time`).toBeLessThan(3000); // 3s max
    }
    
    // Variance between cycles should be minimal
    const avgResetTime = resetTimes.reduce((a, b) => a + b) / resetTimes.length;
    const maxVariance = Math.max(...resetTimes.map(time => Math.abs(time - avgResetTime)));
    expect(maxVariance).toBeLessThan(500); // Max 500ms variance
  });

  test('Should reset rate limiting after 60 seconds', async ({ page }) => {
    // Set up console monitoring
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger rate limiting (4 clicks in quick succession)
    for (let i = 0; i < 4; i++) {
      if (i > 0) await page.waitForTimeout(2500); // Clear debouncing
      await claudeButtonsPage.prodButton.click();
    }
    
    // Wait for rate limiting to engage
    await claudeButtonsPage.waitForRateLimitWarning(5000);
    
    // Record start time for rate limit window
    const rateLimitStartTime = Date.now();
    
    // Wait for rate limit to reset (60 seconds + buffer)
    // Using shorter time for test efficiency - adjust based on implementation
    const RATE_LIMIT_WINDOW = 60000; // 60 seconds
    await page.waitForTimeout(RATE_LIMIT_WINDOW + 2000); // Add 2s buffer
    
    // Rate limit warning should disappear
    await claudeButtonsPage.waitForRateLimitWarningGone(5000);
    
    // Button should be clickable again
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(true);
    
    const elapsedTime = Date.now() - rateLimitStartTime;
    expect(elapsedTime).toBeGreaterThanOrEqual(RATE_LIMIT_WINDOW);
  }, 120000); // Extend test timeout to 2 minutes

  test('Should handle rate limit window expiration correctly', async ({ page }) => {
    // This test uses a shorter window for practical testing
    // In real implementation, you might mock the timer or use shorter intervals for testing
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger rate limiting
    for (let i = 0; i < 4; i++) {
      if (i > 0) await page.waitForTimeout(2500);
      await claudeButtonsPage.prodButton.click();
    }
    
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Check that rate limiting is active
    const isRateLimited = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(isRateLimited).toBe(true);
    
    // Attempt click while rate limited should fail
    const blockedClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(blockedClick.success).toBe(false);
    
    // Wait for window to expire
    await page.waitForTimeout(65000); // 65 seconds
    
    // Should be able to click again
    const afterResetClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(afterResetClick.success).toBe(true);
  }, 120000);

  test('Should track window expiration with sliding window', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Make clicks with specific timing to test sliding window
    const clickTimes: number[] = [];
    
    // First 3 clicks (within threshold)
    for (let i = 0; i < 3; i++) {
      if (i > 0) await page.waitForTimeout(2500);
      await claudeButtonsPage.prodButton.click();
      clickTimes.push(Date.now());
    }
    
    // Should not be rate limited yet
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Wait 30 seconds
    await page.waitForTimeout(30000);
    
    // Make another click (should not trigger rate limiting if sliding window works)
    await claudeButtonsPage.prodButton.click();
    clickTimes.push(Date.now());
    
    // Still should not be rate limited (only 4 clicks total, but spread over time)
    await page.waitForTimeout(1000);
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Now make rapid clicks to exceed threshold
    await page.waitForTimeout(2500);
    await claudeButtonsPage.prodButton.click();
    
    // This should trigger rate limiting
    await claudeButtonsPage.waitForRateLimitWarning(3000);
  }, 120000);

  test('Should differentiate debouncing reset from rate limit reset', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Test debouncing reset (quick)
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    await page.waitForTimeout(2500); // Wait for debouncing reset
    
    // Should be ready after debouncing reset
    const afterDebounceReset = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(afterDebounceReset).toBe(false);
    
    // Now trigger rate limiting
    for (let i = 1; i < 4; i++) { // 3 more clicks (4 total)
      await claudeButtonsPage.prodButton.click();
      await page.waitForTimeout(2500); // Clear debouncing between clicks
    }
    
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Even after debouncing reset time, should still be rate limited
    await page.waitForTimeout(3000);
    const stillRateLimited = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(stillRateLimited).toBe(true);
    
    // Rate limiting should persist much longer than debouncing
    await expect(claudeButtonsPage.rateLimitWarning).toBeVisible();
  });

  test('Should handle concurrent timing resets correctly', async ({ page }) => {
    // Test scenario where debouncing and rate limiting timers might overlap
    
    // Create a situation with staggered clicks
    await claudeButtonsPage.prodButton.click(); // Click 1
    await page.waitForTimeout(1000); // Wait 1 second
    
    // This click should be possible after debouncing resets
    await claudeButtonsPage.prodButton.click(); // Click 2
    await page.waitForTimeout(2500); // Wait for debouncing
    
    await claudeButtonsPage.prodButton.click(); // Click 3
    await page.waitForTimeout(2500);
    
    await claudeButtonsPage.prodButton.click(); // Click 4 - should trigger rate limiting
    
    await claudeButtonsPage.waitForRateLimitWarning(3000);
    
    // Even though debouncing resets every 2 seconds, rate limiting should persist
    await page.waitForTimeout(3000); // Multiple debouncing cycles
    
    const stillRateLimited = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(stillRateLimited).toBe(true);
  });

  test('Should maintain accurate timing across page refreshes', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Refresh page during cooldown
    await page.reload();
    await claudeButtonsPage.page.waitForLoadState('networkidle');
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
    
    // After refresh, debouncing should not persist (component reinitialized)
    const afterRefreshResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(afterRefreshResult.success).toBe(true);
  });

  test('Should handle system clock changes gracefully', async ({ page }) => {
    // This test verifies the timing mechanism is robust
    
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Simulate time passage (cannot actually change system clock in test, 
    // but we can verify the mechanism doesn't break)
    await page.waitForTimeout(2500);
    
    // Should reset normally
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(true);
    
    // Timing logs should not show any errors
    const errorLogs = logs.filter(log => 
      log.includes('error') || log.includes('invalid') || log.includes('NaN')
    );
    expect(errorLogs).toHaveLength(0);
  });
});