import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Component Re-render Button Stability
 * 
 * Validates that component re-renders during interaction do not affect button states
 * Ensures rate limiting and debouncing states persist across re-renders
 */
test.describe('Component Re-render Button Stability', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should maintain button enabled state during re-renders', async ({ page }) => {
    // Capture initial button state
    const initiallyDisabled = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(initiallyDisabled).toBe(false);
    
    // Trigger multiple component re-renders
    for (let i = 0; i < 5; i++) {
      await claudeButtonsPage.triggerComponentRerender();
      await page.waitForTimeout(100); // Allow re-render to complete
      
      // Button should remain enabled
      const stillDisabled = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
      expect(stillDisabled, `Button should remain enabled after re-render ${i + 1}`).toBe(false);
    }
  });

  test('Should preserve cooldown state during re-renders', async ({ page }) => {
    // Trigger debouncing/cooldown
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 3000);
    
    // Capture cooldown state before re-render
    const beforeRerender = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(beforeRerender).toBe(true);
    
    // Trigger re-render while in cooldown
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(200);
    
    // Cooldown state should persist
    const afterRerender = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(afterRerender).toBe(true);
    
    // Visual indicators should persist
    await expect(claudeButtonsPage.cooldownIndicator).toBeVisible();
    
    const buttonText = await claudeButtonsPage.prodButton.textContent();
    expect(buttonText).toMatch(/(cooldown)/i);
  });

  test('Should preserve rate limiting state during re-renders', async ({ page }) => {
    // Trigger rate limiting by exceeding threshold
    for (let i = 0; i < 4; i++) {
      if (i > 0) await page.waitForTimeout(2500); // Clear debouncing
      await claudeButtonsPage.prodButton.click();
    }
    
    // Wait for rate limiting to engage
    await claudeButtonsPage.waitForRateLimitWarning(5000);
    
    // Capture rate limited state before re-render
    await expect(claudeButtonsPage.rateLimitWarning).toBeVisible();
    const beforeRerender = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(beforeRerender).toBe(true);
    
    // Trigger multiple re-renders while rate limited
    for (let i = 0; i < 3; i++) {
      await claudeButtonsPage.triggerComponentRerender();
      await page.waitForTimeout(200);
    }
    
    // Rate limiting state should persist
    await expect(claudeButtonsPage.rateLimitWarning).toBeVisible();
    const afterRerender = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
    expect(afterRerender).toBe(true);
  });

  test('Should not trigger rate limiting during re-render cycles', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Perform many re-renders without actual button clicks
    for (let i = 0; i < 10; i++) {
      await claudeButtonsPage.triggerComponentRerender();
      await page.waitForTimeout(50);
    }
    
    // Should not see rate limiting messages from re-renders
    const rateLimitMessages = logs.filter(log => 
      log.includes('Rate limited') || log.includes('rate limit exceeded')
    );
    expect(rateLimitMessages).toHaveLength(0);
    
    // Rate limiting warning should not appear
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Button should still be clickable after re-renders
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(true);
  });

  test('Should maintain visual consistency during re-renders', async ({ page }) => {
    // Capture initial visual state
    const initialState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    
    // Trigger re-renders and check visual consistency
    for (let i = 0; i < 5; i++) {
      await claudeButtonsPage.triggerComponentRerender();
      await page.waitForTimeout(100);
      
      const currentState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
      
      // Visual state should remain consistent
      expect(currentState.disabled, `Re-render ${i + 1}: disabled state`).toBe(initialState.disabled);
      expect(currentState.opacity, `Re-render ${i + 1}: opacity`).toBe(initialState.opacity);
      expect(currentState.cursor, `Re-render ${i + 1}: cursor`).toBe(initialState.cursor);
    }
  });

  test('Should handle re-renders during cooldown transition', async ({ page }) => {
    // Start cooldown
    await claudeButtonsPage.prodButton.click();
    
    // Trigger re-renders during cooldown transition
    await page.waitForTimeout(500); // Partial cooldown
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(500);
    await claudeButtonsPage.triggerComponentRerender();
    
    // Should still be in cooldown
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown).toBe(true);
    
    // Wait for full cooldown period
    await page.waitForTimeout(2000);
    
    // Trigger re-render after cooldown should complete
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(200);
    
    // Should be ready again
    await claudeButtonsPage.waitForButtonReady(claudeButtonsPage.prodButton, 3000);
  });

  test('Should preserve accessibility during re-renders', async ({ page }) => {
    // Check initial accessibility
    const initialAccessibility = await claudeButtonsPage.verifyButtonAccessibility(claudeButtonsPage.prodButton);
    
    // Trigger re-renders
    for (let i = 0; i < 3; i++) {
      await claudeButtonsPage.triggerComponentRerender();
      await page.waitForTimeout(100);
      
      // Re-check accessibility
      const currentAccessibility = await claudeButtonsPage.verifyButtonAccessibility(claudeButtonsPage.prodButton);
      
      expect(currentAccessibility.hasKeyboardSupport, `Re-render ${i + 1}: keyboard support`).toBe(initialAccessibility.hasKeyboardSupport);
      expect(currentAccessibility.hasFocusIndicator, `Re-render ${i + 1}: focus indicator`).toBe(initialAccessibility.hasFocusIndicator);
      expect(currentAccessibility.hasProperRole, `Re-render ${i + 1}: proper role`).toBe(initialAccessibility.hasProperRole);
    }
  });

  test('Should handle rapid re-renders without performance degradation', async ({ page }) => {
    const startTime = Date.now();
    
    // Trigger rapid re-renders
    const renderPromises = [];
    for (let i = 0; i < 20; i++) {
      renderPromises.push(claudeButtonsPage.triggerComponentRerender());
    }
    
    await Promise.all(renderPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (not hang)
    expect(duration).toBeLessThan(5000); // 5 seconds max
    
    // Button should still be functional
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success).toBe(true);
    expect(clickResult.responseTime).toBeLessThan(1000);
  });

  test('Should maintain state consistency across navigation and re-renders', async ({ page }) => {
    // Trigger cooldown
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Navigate away and back (triggers full re-render)
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/claude-instances');
    await page.waitForLoadState('networkidle');
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
    
    // Trigger additional re-renders
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(200);
    
    // Button state should be consistent with navigation and re-renders
    const isClickable = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    
    // Should be functional (cooldown may have expired during navigation)
    expect(isClickable.success).toBe(true);
  });

  test('Should handle re-renders during state transitions', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Start a state transition
    await claudeButtonsPage.prodButton.click();
    
    // Immediately trigger re-renders during transition
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(100);
    await claudeButtonsPage.triggerComponentRerender();
    
    // Allow transition to complete
    await page.waitForTimeout(1000);
    
    // Should not see state corruption messages
    const errorMessages = logs.filter(log => 
      log.includes('error') || log.includes('warning') || log.includes('setState')
    );
    expect(errorMessages).toHaveLength(0);
    
    // Final state should be consistent
    const finalState = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(finalState).toBe(true);
  });

  test('Should preserve button interactions during background re-renders', async ({ page }) => {
    // Set up background activity that might trigger re-renders
    await page.evaluate(() => {
      // Simulate background React updates
      setInterval(() => {
        const event = new CustomEvent('background-update');
        document.dispatchEvent(event);
      }, 100);
    });
    
    // Wait for background activity to start
    await page.waitForTimeout(500);
    
    // Perform button interactions while background re-renders occur
    const results = await claudeButtonsPage.performRapidClicking(claudeButtonsPage.prodButton, 3, 200);
    
    // First click should succeed despite background activity
    expect(results.clicks[0].success).toBe(true);
    
    // Subsequent clicks should be handled by debouncing
    const successfulClicks = results.clicks.filter(click => click.success);
    expect(successfulClicks).toHaveLength(1);
    
    // Background activity should not interfere with button behavior
    await page.waitForTimeout(3000); // Wait for cooldown
    
    const finalClick = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(finalClick.success).toBe(true);
  });
});