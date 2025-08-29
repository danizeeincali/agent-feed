import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Rapid Clicking Debounce Validation
 * 
 * Validates that rapid clicking triggers debouncing (not rate limiting)
 * Ensures debouncing prevents multiple rapid executions while maintaining UX
 */
test.describe('Rapid Clicking Debounce Validation', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should trigger debouncing after rapid clicking, not rate limiting', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform rapid clicking sequence (5 clicks in 250ms)
    const rapidClicks = await claudeButtonsPage.performRapidClicking(
      claudeButtonsPage.prodButton, 
      5, 
      50  // 50ms intervals = very rapid
    );
    
    // Only first click should succeed
    const successfulClicks = rapidClicks.clicks.filter(click => click.success);
    expect(successfulClicks).toHaveLength(1);
    
    // Subsequent clicks should be blocked by debouncing
    const failedClicks = rapidClicks.clicks.slice(1);
    expect(failedClicks.every(click => !click.success)).toBe(true);
    
    // Should see debouncing messages, NOT rate limiting messages
    const debounceMessages = logs.filter(log => 
      log.includes('cooldown') || log.includes('debounce') || log.includes('🚫 Button click blocked')
    );
    expect(debounceMessages.length).toBeGreaterThan(0);
    
    // Should NOT see rate limiting messages
    const rateLimitMessages = logs.filter(log => 
      log.includes('Rate limited') || log.includes('rate limit exceeded')
    );
    expect(rateLimitMessages).toHaveLength(0);
    
    // Rate limit warning should NOT appear for debouncing
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
  });

  test('Should show cooldown visual state during debouncing', async ({ page }) => {
    // Perform first click to trigger debouncing
    await claudeButtonsPage.prodButton.click();
    
    // Wait for cooldown state to appear
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 3000);
    
    // Verify visual cooldown indicators
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown).toBe(true);
    
    // Check cooldown visual state
    const visualState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    expect(visualState.disabled).toBe(true);
    
    // Should show cooldown indicator
    await expect(claudeButtonsPage.cooldownIndicator).toBeVisible();
    
    // Should NOT show rate limiting warning
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
  });

  test('Should reset debouncing after cooldown period', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger debouncing with first click
    await claudeButtonsPage.prodButton.click();
    
    // Wait for debouncing to reset (2 seconds based on implementation)
    await page.waitForTimeout(2500); // Wait longer than debounce period
    
    // Should see reset message in logs
    const resetMessages = logs.filter(log => 
      log.includes('debouncing reset') || log.includes('ready for next click')
    );
    expect(resetMessages.length).toBeGreaterThan(0);
    
    // Button should be ready again
    await claudeButtonsPage.waitForButtonReady(claudeButtonsPage.prodButton, 5000);
    
    // Second click should work again
    const secondClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(secondClick.success).toBe(true);
  });

  test('Should handle different rapid clicking patterns', async ({ page }) => {
    const testPatterns = [
      { name: 'very rapid (25ms intervals)', clickCount: 4, interval: 25 },
      { name: 'rapid (50ms intervals)', clickCount: 6, interval: 50 },
      { name: 'moderate (100ms intervals)', clickCount: 8, interval: 100 },
      { name: 'burst (200ms intervals)', clickCount: 3, interval: 200 }
    ];
    
    for (const pattern of testPatterns) {
      // Refresh page for clean state
      await page.reload();
      await claudeButtonsPage.page.waitForLoadState('networkidle');
      await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
      
      const logs: string[] = [];
      page.on('console', (msg) => {
        logs.push(msg.text());
      });
      
      // Perform rapid clicking with this pattern
      const results = await claudeButtonsPage.performRapidClicking(
        claudeButtonsPage.prodButton,
        pattern.clickCount,
        pattern.interval
      );
      
      // Only first click should succeed regardless of pattern
      const successfulClicks = results.clicks.filter(click => click.success);
      expect(successfulClicks, `Pattern: ${pattern.name}`).toHaveLength(1);
      
      // Should trigger debouncing, not rate limiting
      const debounceMessages = logs.filter(log => 
        log.includes('cooldown') || log.includes('debounce')
      );
      expect(debounceMessages.length, `Pattern: ${pattern.name} should trigger debouncing`).toBeGreaterThan(0);
    }
  });

  test('Should maintain debouncing behavior across different browsers', async ({ page, browserName }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform rapid clicking
    const results = await claudeButtonsPage.performRapidClicking(
      claudeButtonsPage.prodButton,
      5,
      75
    );
    
    // Behavior should be consistent across browsers
    const successfulClicks = results.clicks.filter(click => click.success);
    expect(successfulClicks, `Browser: ${browserName}`).toHaveLength(1);
    
    // All browsers should show debouncing behavior
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown, `Browser: ${browserName} should show cooldown`).toBe(true);
    
    // Console messages should be consistent
    const debounceMessages = logs.filter(log => 
      log.includes('cooldown') || log.includes('debounce')
    );
    expect(debounceMessages.length, `Browser: ${browserName} should log debouncing`).toBeGreaterThan(0);
  });

  test('Should prevent double-execution during rapid clicking', async ({ page }) => {
    let executionCount = 0;
    
    // Mock the API call to count actual executions
    await page.route('**/api/**', (route) => {
      executionCount++;
      route.continue();
    });
    
    // Perform rapid clicking
    await claudeButtonsPage.performRapidClicking(
      claudeButtonsPage.prodButton,
      10, // Many rapid clicks
      25  // Very fast intervals
    );
    
    // Wait for any async operations
    await page.waitForTimeout(1000);
    
    // Should only execute once despite multiple clicks
    expect(executionCount).toBeLessThanOrEqual(1);
    
    // Wait for debouncing to reset and try again
    await page.waitForTimeout(3000);
    
    const initialExecutionCount = executionCount;
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(500);
    
    // Should allow execution after debouncing resets
    expect(executionCount).toBeGreaterThan(initialExecutionCount);
  });

  test('Should show appropriate user feedback during debouncing', async () => {
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    
    // Wait for cooldown state
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Check user feedback elements
    const buttonText = await claudeButtonsPage.prodButton.textContent();
    expect(buttonText).toMatch(/(cooldown|wait)/i);
    
    // Should show cooldown description
    const description = await claudeButtonsPage.prodButton.locator('p').textContent();
    expect(description).toMatch(/wait.*before/i);
    
    // Should show visual indicators
    await expect(claudeButtonsPage.cooldownIndicator).toBeVisible();
    
    // Should show loading/waiting animation
    const hasAnimation = await claudeButtonsPage.prodButton.locator('.animate-pulse, .animate-bounce').count();
    expect(hasAnimation).toBeGreaterThan(0);
  });

  test('Should handle rapid clicking on different buttons independently', async () => {
    const buttons = claudeButtonsPage.getAllButtons();
    
    // Click first button to trigger its debouncing
    await buttons[0].click();
    
    // Wait a moment for debouncing to activate
    await claudeButtonsPage.page.waitForTimeout(100);
    
    // Other buttons should still be clickable
    const secondButtonResult = await claudeButtonsPage.clickButtonWithTiming(buttons[1]);
    expect(secondButtonResult.success).toBe(true);
    
    // First button should be in cooldown
    const firstButtonInCooldown = await claudeButtonsPage.isButtonInCooldown(buttons[0]);
    expect(firstButtonInCooldown).toBe(true);
    
    // Second button should also be in cooldown now
    const secondButtonInCooldown = await claudeButtonsPage.isButtonInCooldown(buttons[1]);
    expect(secondButtonInCooldown).toBe(true);
  });

  test('Should maintain debouncing during component re-renders', async ({ page }) => {
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Trigger component re-renders while in cooldown
    await claudeButtonsPage.triggerComponentRerender();
    await claudeButtonsPage.triggerComponentRerender();
    
    // Button should remain in cooldown state
    const stillInCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(stillInCooldown).toBe(true);
    
    // Clicking should still be blocked
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(false);
  });
});