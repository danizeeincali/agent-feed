import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: First Click Immediate Response
 * 
 * Validates that the first button click works immediately without debouncing or rate limiting
 * This ensures the fix allows normal user interactions while preventing abuse
 */
test.describe('First Click Immediate Response', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should respond immediately to first button click', async ({ page }) => {
    const logs: string[] = [];
    
    // Monitor console for button interaction messages
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Click the prod button for the first time
    const startTime = Date.now();
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    const endTime = Date.now();
    
    // First click should succeed immediately
    expect(result.success).toBe(true);
    expect(result.responseTime).toBeLessThan(500); // Very fast response
    expect(endTime - startTime).toBeLessThan(1000);
    
    // Should see acceptance message in console
    const acceptedLogs = logs.filter(log => 
      log.includes('Button click accepted') || log.includes('✅')
    );
    expect(acceptedLogs.length).toBeGreaterThan(0);
    
    // Should NOT see blocking messages
    const blockedLogs = logs.filter(log => 
      log.includes('blocked') || log.includes('🚫')
    );
    expect(blockedLogs).toHaveLength(0);
  });

  test('Should trigger debouncing AFTER first click, not before', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // First click should work immediately
    const firstClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(firstClick.success).toBe(true);
    
    // Wait a moment for debouncing to activate
    await page.waitForTimeout(100);
    
    // Second immediate click should be blocked by debouncing
    const secondClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    
    // Check logs for debouncing activation
    const debounceLogs = logs.filter(log => 
      log.includes('cooldown') || log.includes('debounce')
    );
    expect(debounceLogs.length).toBeGreaterThan(0);
    
    // Button should now be in cooldown state
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown).toBe(true);
  });

  test('Should work for all button variants on first click', async ({ page }) => {
    const buttons = claudeButtonsPage.getAllButtons();
    const buttonNames = ['prod', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'];
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const buttonName = buttonNames[i];
      
      // Refresh page to reset state for each button test
      if (i > 0) {
        await page.reload();
        await claudeButtonsPage.page.waitForLoadState('networkidle');
        await button.waitFor({ state: 'visible', timeout: 10000 });
      }
      
      // First click should work immediately for each button
      const result = await claudeButtonsPage.clickButtonWithTiming(button);
      
      expect(result.success, `${buttonName} button first click should succeed`).toBe(true);
      expect(result.responseTime, `${buttonName} button should respond quickly`).toBeLessThan(500);
    }
  });

  test('Should not apply rate limiting to first click within time window', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Wait to ensure clean slate (no previous rate limiting)
    await page.waitForTimeout(1000);
    
    // First click in a fresh session
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    
    expect(result.success).toBe(true);
    
    // Should NOT see rate limiting warnings
    await page.waitForTimeout(500); // Allow time for any async rate limit checks
    
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Check logs for rate limiting messages
    const rateLimitLogs = logs.filter(log => 
      log.includes('Rate limited') || log.includes('rate limit exceeded')
    );
    expect(rateLimitLogs).toHaveLength(0);
  });

  test('Should maintain UI responsiveness during first click', async () => {
    // Capture initial visual state
    const initialState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    
    // Perform first click
    await claudeButtonsPage.prodButton.click();
    
    // Wait for any immediate visual changes
    await claudeButtonsPage.page.waitForTimeout(100);
    
    // Button should show loading or cooldown state, not disabled state from rate limiting
    const afterClickState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    
    // Visual changes should be from legitimate state changes, not rate limiting
    if (afterClickState.disabled !== initialState.disabled) {
      // If disabled, it should be due to loading/cooldown, not rate limiting
      const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
      const isLoading = await claudeButtonsPage.isButtonLoading(claudeButtonsPage.prodButton);
      
      expect(inCooldown || isLoading).toBe(true);
    }
  });

  test('Should handle first click with proper accessibility', async () => {
    // Verify button accessibility before click
    const accessibility = await claudeButtonsPage.verifyButtonAccessibility(claudeButtonsPage.prodButton);
    
    expect(accessibility.hasKeyboardSupport).toBe(true);
    expect(accessibility.hasFocusIndicator).toBe(true);
    expect(accessibility.hasProperRole).toBe(true);
    
    // First click via keyboard should work
    await claudeButtonsPage.prodButton.focus();
    await claudeButtonsPage.page.keyboard.press('Enter');
    
    // Should enter loading/cooldown state, not disabled due to rate limiting
    await claudeButtonsPage.page.waitForTimeout(500);
    
    const afterKeyboardClick = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(afterKeyboardClick).toBe(true);
  });

  test('Should handle first click under various timing conditions', async ({ page }) => {
    const testConditions = [
      { name: 'immediate', delay: 0 },
      { name: 'after 100ms', delay: 100 },
      { name: 'after 500ms', delay: 500 },
      { name: 'after 1s', delay: 1000 }
    ];
    
    for (const condition of testConditions) {
      // Refresh page for clean state
      await page.reload();
      await claudeButtonsPage.page.waitForLoadState('networkidle');
      await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
      
      // Wait for the specified delay
      if (condition.delay > 0) {
        await page.waitForTimeout(condition.delay);
      }
      
      // First click should always work regardless of timing
      const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      
      expect(result.success, `First click should work ${condition.name}`).toBe(true);
      expect(result.responseTime, `Response should be fast ${condition.name}`).toBeLessThan(1000);
    }
  });

  test('Should differentiate between first click and subsequent rapid clicks', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform rapid clicking sequence
    const rapidClicks = await claudeButtonsPage.performRapidClicking(
      claudeButtonsPage.prodButton, 
      5, // 5 clicks
      50  // 50ms intervals
    );
    
    // First click should have succeeded
    expect(rapidClicks.clicks[0].success).toBe(true);
    
    // Subsequent clicks should be blocked by debouncing
    const successfulClicks = rapidClicks.clicks.filter(click => click.success);
    expect(successfulClicks).toHaveLength(1); // Only the first click
    
    // Verify debouncing messages in logs
    const debounceMessages = logs.filter(log => 
      log.includes('cooldown') || log.includes('debounce')
    );
    expect(debounceMessages.length).toBeGreaterThan(0);
  });
});