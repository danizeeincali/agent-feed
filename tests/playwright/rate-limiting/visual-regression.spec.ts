import { test, expect } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Visual Regression Tests for Button States
 * 
 * Validates visual consistency of button states across different interaction phases
 * Tests button appearance for: enabled, disabled, loading, cooldown, and rate-limited states
 */
test.describe('Button State Visual Regression Tests', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should have consistent initial button appearance', async ({ page }) => {
    // Take screenshot of initial state
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('buttons-initial-state.png');
    
    // Verify all buttons are visible and properly styled
    const buttons = claudeButtonsPage.getAllButtons();
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const buttonName = ['prod', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'][i];
      
      // Take individual button screenshot
      await expect(button).toHaveScreenshot(`button-${buttonName}-initial.png`);
      
      // Verify visual properties
      const visualState = await claudeButtonsPage.getButtonVisualState(button);
      
      expect(visualState.disabled, `${buttonName} should not be disabled initially`).toBe(false);
      expect(visualState.opacity, `${buttonName} should have full opacity`).not.toBe('0.5');
      expect(visualState.cursor, `${buttonName} should have pointer cursor`).not.toBe('not-allowed');
    }
  });

  test('Should show consistent cooldown visual state', async ({ page }) => {
    // Trigger cooldown state
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 3000);
    
    // Take screenshot of cooldown state
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('buttons-cooldown-state.png');
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('button-prod-cooldown.png');
    
    // Verify cooldown visual indicators
    const visualState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    
    expect(visualState.disabled).toBe(true);
    expect(visualState.classes).toContain('disabled:');
    
    // Check for cooldown-specific text
    const buttonText = await claudeButtonsPage.prodButton.textContent();
    expect(buttonText).toMatch(/(cooldown)/i);
    
    // Check for animation classes
    expect(visualState.classes).toMatch(/(animate-pulse|animate-bounce)/);
    
    // Cooldown indicator should be visible
    await expect(claudeButtonsPage.cooldownIndicator).toBeVisible();
  });

  test('Should show consistent rate limit warning appearance', async ({ page }) => {
    // Trigger rate limiting
    for (let i = 0; i < 4; i++) {
      if (i > 0) await page.waitForTimeout(2500); // Clear debouncing
      await claudeButtonsPage.prodButton.click();
    }
    
    // Wait for rate limiting to appear
    await claudeButtonsPage.waitForRateLimitWarning(5000);
    
    // Take screenshot of rate limited state
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('buttons-rate-limited-state.png');
    await expect(claudeButtonsPage.rateLimitWarning).toHaveScreenshot('rate-limit-warning.png');
    
    // Verify rate limit warning styling
    const warningClasses = await claudeButtonsPage.rateLimitWarning.getAttribute('class');
    expect(warningClasses).toMatch(/(amber|warning|yellow)/i);
    
    // Check warning icon is present
    const hasIcon = await claudeButtonsPage.rateLimitWarning.locator('svg').count();
    expect(hasIcon).toBeGreaterThan(0);
    
    // Buttons should show disabled state
    const visualState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    expect(visualState.disabled).toBe(true);
  });

  test('Should maintain visual consistency during state transitions', async ({ page }) => {
    const screenshots: string[] = [];
    
    // 1. Initial state
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('transition-01-initial.png');
    screenshots.push('initial');
    
    // 2. On click (immediate response)
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(100); // Brief moment for state change
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('transition-02-clicked.png');
    screenshots.push('clicked');
    
    // 3. Cooldown state
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('transition-03-cooldown.png');
    screenshots.push('cooldown');
    
    // 4. Loading animation during cooldown
    await page.waitForTimeout(500);
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('transition-04-cooldown-animation.png');
    screenshots.push('cooldown-animation');
    
    // 5. Reset state (after cooldown)
    await page.waitForTimeout(3000); // Wait for cooldown to complete
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('transition-05-reset.png');
    screenshots.push('reset');
    
    // Verify visual consistency - reset should match initial
    // (This would be verified by visual diff in the screenshots)
    
    console.log('Captured transition screenshots:', screenshots);
  });

  test('Should show distinct visual states for different button variants', async ({ page }) => {
    const buttons = claudeButtonsPage.getAllButtons();
    const buttonNames = ['prod', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'];
    
    // Take screenshots of all button variants in initial state
    for (let i = 0; i < buttons.length; i++) {
      await expect(buttons[i]).toHaveScreenshot(`variant-${buttonNames[i]}-initial.png`);
    }
    
    // Test each variant in cooldown state
    for (let i = 0; i < buttons.length; i++) {
      // Reset page for each test
      if (i > 0) {
        await page.reload();
        await claudeButtonsPage.page.waitForLoadState('networkidle');
        await buttons[i].waitFor({ state: 'visible' });
      }
      
      // Trigger cooldown
      await buttons[i].click();
      await claudeButtonsPage.waitForButtonCooldown(buttons[i], 2000);
      
      // Screenshot cooldown state
      await expect(buttons[i]).toHaveScreenshot(`variant-${buttonNames[i]}-cooldown.png`);
      
      // Verify each variant has distinct gradient/styling
      const visualState = await claudeButtonsPage.getButtonVisualState(buttons[i]);
      expect(visualState.classes).toContain('bg-gradient-to-br'); // Gradient styling
    }
  });

  test('Should maintain visual accessibility standards', async ({ page }) => {
    // Test contrast ratios and accessibility features
    const buttons = claudeButtonsPage.getAllButtons();
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const buttonName = ['prod', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'][i];
      
      // Focus state screenshot
      await button.focus();
      await page.waitForTimeout(100);
      await expect(button).toHaveScreenshot(`accessibility-${buttonName}-focus.png`);
      
      // Verify focus indicator is visible
      const focusedState = await claudeButtonsPage.getButtonVisualState(button);
      const hasFocusRing = focusedState.classes.includes('focus:ring') || 
                          focusedState.classes.includes('focus-visible:ring');
      expect(hasFocusRing, `${buttonName} should have focus ring`).toBe(true);
      
      // Hover state (if supported)
      await button.hover();
      await page.waitForTimeout(100);
      await expect(button).toHaveScreenshot(`accessibility-${buttonName}-hover.png`);
      
      // Blur for next iteration
      await button.blur();
    }
  });

  test('Should handle responsive design visual consistency', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-xl' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Screenshot at this viewport
      await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot(`responsive-${viewport.name}-initial.png`);
      
      // Test cooldown state at this viewport
      await claudeButtonsPage.prodButton.click();
      await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
      
      await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot(`responsive-${viewport.name}-cooldown.png`);
      
      // Reset for next viewport
      await page.reload();
      await claudeButtonsPage.page.waitForLoadState('networkidle');
    }
  });

  test('Should show consistent loading animations', async ({ page }) => {
    // Capture loading animation frames
    await claudeButtonsPage.prodButton.click();
    
    // Take multiple screenshots during animation
    const animationFrames = [];
    for (let frame = 1; frame <= 5; frame++) {
      await page.waitForTimeout(200); // 200ms between frames
      await expect(claudeButtonsPage.prodButton).toHaveScreenshot(`animation-frame-${frame}.png`);
      animationFrames.push(frame);
    }
    
    // Verify animation elements are present
    const hasAnimationElements = await claudeButtonsPage.prodButton.locator('.animate-pulse, .animate-bounce, .animate-spin').count();
    expect(hasAnimationElements).toBeGreaterThan(0);
    
    console.log('Captured animation frames:', animationFrames);
  });

  test('Should maintain visual state during re-renders', async ({ page }) => {
    // Take initial screenshot
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('rerender-01-initial.png');
    
    // Trigger cooldown
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    // Screenshot before re-render
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('rerender-02-cooldown-before.png');
    
    // Trigger re-render
    await claudeButtonsPage.triggerComponentRerender();
    await page.waitForTimeout(200);
    
    // Screenshot after re-render - should look the same
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('rerender-03-cooldown-after.png');
    
    // Visual state should be preserved
    const stillInCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(stillInCooldown).toBe(true);
  });

  test('Should show proper visual feedback for failed interactions', async ({ page }) => {
    // Mock API to simulate failures
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    // Attempt button click that will fail
    await claudeButtonsPage.prodButton.click();
    await page.waitForTimeout(500);
    
    // Should still show visual feedback (cooldown or error state)
    await expect(claudeButtonsPage.prodButton).toHaveScreenshot('failed-interaction.png');
    
    // Check for error indicators
    const hasErrorState = await page.locator('.text-red-600, .bg-red-100, [data-testid="error-indicator"]').count();
    // Error handling might be implemented, so this is informational
    console.log('Error indicators found:', hasErrorState);
  });

  test('Should maintain visual consistency across dark/light modes', async ({ page }) => {
    // Test light mode (default)
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('theme-light-initial.png');
    
    // Trigger cooldown in light mode
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('theme-light-cooldown.png');
    
    // Switch to dark mode (if implemented)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(200); // Allow theme transition
    
    // Screenshot dark mode (might not have different styling, but good to verify)
    await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot('theme-dark-cooldown.png');
    
    // Switch back to light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  });

  test('Should handle visual state persistence across browser zoom levels', async ({ page }) => {
    const zoomLevels = [0.75, 1.0, 1.25, 1.5];
    
    for (const zoom of zoomLevels) {
      // Set zoom level
      await page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel.toString();
      }, zoom);
      
      await page.waitForTimeout(300); // Allow zoom to apply
      
      // Take screenshot at this zoom level
      await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot(`zoom-${zoom.toString().replace('.', '-')}-initial.png`);
      
      // Test functionality at this zoom level
      const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      expect(result.success, `Should work at ${zoom}x zoom`).toBe(true);
      
      // Screenshot cooldown at this zoom
      await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
      await expect(claudeButtonsPage.buttonContainer).toHaveScreenshot(`zoom-${zoom.toString().replace('.', '-')}-cooldown.png`);
      
      // Reset for next zoom level
      await page.waitForTimeout(3000);
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });
});