import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Page Load Button State Validation
 * 
 * Validates that buttons are NOT disabled on page render/load
 * This ensures the rate limiting fix prevents false positives during initialization
 */
test.describe('Button State on Page Load', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should NOT disable buttons immediately on page load', async () => {
    // Verify all buttons are enabled immediately after page load
    const buttons = claudeButtonsPage.getAllButtons();
    
    for (const button of buttons) {
      // Check that button is visible
      await expect(button).toBeVisible();
      
      // Check that button is NOT disabled on initial render
      const isDisabled = await claudeButtonsPage.isButtonDisabled(button);
      expect(isDisabled).toBe(false);
      
      // Check that button is NOT in loading state on initial render
      const isLoading = await claudeButtonsPage.isButtonLoading(button);
      expect(isLoading).toBe(false);
      
      // Check that button is NOT in cooldown on initial render
      const inCooldown = await claudeButtonsPage.isButtonInCooldown(button);
      expect(inCooldown).toBe(false);
    }
  });

  test('Should show ready indicator on page load', async () => {
    // Check that "Ready to launch" indicator is visible
    await expect(claudeButtonsPage.readyIndicator).toBeVisible();
    
    // Verify no rate limiting warnings are shown initially
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // Verify no cooldown indicators are shown initially
    await expect(claudeButtonsPage.cooldownIndicator).not.toBeVisible();
  });

  test('Should have proper visual state on page load', async () => {
    const prodButton = claudeButtonsPage.prodButton;
    
    const visualState = await claudeButtonsPage.getButtonVisualState(prodButton);
    
    // Button should not have disabled styling
    expect(visualState.disabled).toBe(false);
    expect(visualState.opacity).not.toBe('0.5'); // Not faded out
    expect(visualState.cursor).not.toBe('not-allowed'); // Not blocked cursor
    
    // Button should have normal interaction classes
    expect(visualState.classes).not.toContain('disabled:');
    expect(visualState.classes).not.toContain('cursor-not-allowed');
    expect(visualState.classes).not.toContain('opacity-50');
  });

  test('Should be immediately clickable after page load', async ({ page }) => {
    const logs: string[] = [];
    
    // Monitor console for rate limiting messages
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Click the prod button immediately after page load
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    
    // First click should succeed without rate limiting
    expect(result.success).toBe(true);
    expect(result.responseTime).toBeLessThan(1000); // Should be fast
    
    // Should not see rate limiting warnings in console
    const rateLimitLogs = logs.filter(log => 
      log.includes('rate limit') && log.includes('exceeded')
    );
    expect(rateLimitLogs).toHaveLength(0);
  });

  test('Should handle multiple page refreshes correctly', async ({ page }) => {
    // Test multiple page refreshes to ensure consistent behavior
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await claudeButtonsPage.page.waitForLoadState('networkidle');
      
      // Wait for buttons to be visible
      await claudeButtonsPage.prodButton.waitFor({ state: 'visible', timeout: 10000 });
      
      // Each refresh should result in enabled buttons
      const isDisabled = await claudeButtonsPage.isButtonDisabled(claudeButtonsPage.prodButton);
      expect(isDisabled).toBe(false);
      
      // Should be immediately clickable
      const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      expect(result.success).toBe(true);
      
      // Wait a bit before next refresh
      await page.waitForTimeout(1000);
    }
  });

  test('Should maintain button state during React component mounting', async ({ page }) => {
    const logs: string[] = [];
    
    // Monitor for React warnings or errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Trigger potential component remounting by navigating away and back
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/claude-instances');
    await page.waitForLoadState('networkidle');
    
    // Wait for components to mount
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Buttons should still be enabled after remounting
    const buttons = claudeButtonsPage.getAllButtons();
    for (const button of buttons) {
      const isDisabled = await claudeButtonsPage.isButtonDisabled(button);
      expect(isDisabled).toBe(false);
    }
    
    // Should not have React warnings/errors related to rate limiting
    const rateLimitErrors = logs.filter(log => 
      log.includes('rate limit') || log.includes('useEffect') || log.includes('useState')
    );
    expect(rateLimitErrors).toHaveLength(0);
  });

  test('Should not trigger rate limiting during component initialization', async ({ page }) => {
    let callCount = 0;
    
    // Mock API calls to count initialization attempts
    await page.route('**/api/**', (route) => {
      callCount++;
      route.continue();
    });
    
    // Navigate to page
    await page.goto('/claude-instances');
    await page.waitForLoadState('networkidle');
    
    // Wait for component to fully initialize
    await claudeButtonsPage.prodButton.waitFor({ state: 'visible' });
    await page.waitForTimeout(2000); // Allow time for any initialization calls
    
    // Rate limiting should not be triggered by initialization
    await expect(claudeButtonsPage.rateLimitWarning).not.toBeVisible();
    
    // First user click should still work
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(result.success).toBe(true);
  });

  test('Should handle concurrent component renders correctly', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('rate limit') || text.includes('render')) {
        logs.push(text);
      }
    });
    
    // Trigger multiple rapid re-renders
    await claudeButtonsPage.triggerComponentRerender();
    await claudeButtonsPage.triggerComponentRerender();
    await claudeButtonsPage.triggerComponentRerender();
    
    // Wait for renders to complete
    await page.waitForTimeout(500);
    
    // Buttons should remain functional after multiple re-renders
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(result.success).toBe(true);
    
    // Should not see rate limiting triggered by renders
    const renderRateLimitLogs = logs.filter(log => 
      log.includes('rate limit') && log.includes('exceeded')
    );
    expect(renderRateLimitLogs).toHaveLength(0);
  });
});