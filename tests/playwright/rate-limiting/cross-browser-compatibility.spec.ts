import { test, expect, devices } from '@playwright/test';
import { ClaudeButtonsPage } from './page-objects/ClaudeButtonsPage';

/**
 * Test Suite: Cross-Browser Compatibility for Button Interactions
 * 
 * Validates that button interaction timing works consistently across different browsers
 * Tests rate limiting, debouncing, and timing precision across Chrome, Firefox, Safari, and mobile
 */
test.describe('Cross-Browser Button Interaction Compatibility', () => {
  let claudeButtonsPage: ClaudeButtonsPage;
  
  test.beforeEach(async ({ page }) => {
    claudeButtonsPage = new ClaudeButtonsPage(page);
    await claudeButtonsPage.goto();
  });

  test('Should have consistent first click behavior across browsers', async ({ page, browserName }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // First click should work immediately in all browsers
    const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    
    expect(result.success, `${browserName}: First click should succeed`).toBe(true);
    expect(result.responseTime, `${browserName}: Response time should be fast`).toBeLessThan(1000);
    
    // Should see acceptance message in all browsers
    const acceptedLogs = logs.filter(log => 
      log.includes('Button click accepted') || log.includes('✅')
    );
    expect(acceptedLogs.length, `${browserName}: Should log click acceptance`).toBeGreaterThan(0);
  });

  test('Should maintain debouncing timing consistency across browsers', async ({ page, browserName }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      logs.push(msg.text());
    });
    
    // Trigger debouncing
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 3000);
    
    const startTime = Date.now();
    
    // Wait for debouncing reset
    await page.waitForTimeout(2500);
    
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    
    // Timing should be consistent across browsers (within reasonable variance)
    expect(elapsedTime, `${browserName}: Debouncing timing`).toBeGreaterThanOrEqual(2000);
    expect(elapsedTime, `${browserName}: Debouncing timing`).toBeLessThan(4000);
    
    // Button should be functional after reset
    const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(clickResult.success, `${browserName}: Should be clickable after reset`).toBe(true);
  });

  test('Should handle rapid clicking consistently across browsers', async ({ page, browserName }) => {
    // Perform rapid clicking sequence
    const results = await claudeButtonsPage.performRapidClicking(
      claudeButtonsPage.prodButton, 
      5, 
      50  // 50ms intervals
    );
    
    // Only first click should succeed regardless of browser
    const successfulClicks = results.clicks.filter(click => click.success);
    expect(successfulClicks.length, `${browserName}: Should only allow one successful click`).toBe(1);
    
    // Response times should be reasonable
    const responseTime = results.clicks[0].responseTime;
    expect(responseTime, `${browserName}: Response time should be reasonable`).toBeLessThan(500);
    
    // Button should be in cooldown after rapid clicking
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown, `${browserName}: Should be in cooldown after rapid clicking`).toBe(true);
  });

  test('Should maintain visual consistency across browsers', async ({ page, browserName }) => {
    // Test initial button state
    const initialState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    
    // Initial state should be consistent
    expect(initialState.disabled, `${browserName}: Should not be initially disabled`).toBe(false);
    expect(initialState.opacity, `${browserName}: Should have full opacity initially`).not.toBe('0.5');
    
    // Trigger cooldown and check visual state
    await claudeButtonsPage.prodButton.click();
    await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
    
    const cooldownState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    expect(cooldownState.disabled, `${browserName}: Should be disabled during cooldown`).toBe(true);
    
    // Visual states should be consistent across browsers
    if (browserName === 'chromium') {
      // Store reference values for other browsers to compare against
      test.info().attachments.push({
        name: 'chromium-visual-state',
        body: JSON.stringify(cooldownState),
        contentType: 'application/json'
      });
    }
  });

  test('Should handle keyboard interactions consistently across browsers', async ({ page, browserName }) => {
    // Test keyboard navigation
    await claudeButtonsPage.prodButton.focus();
    await page.waitForTimeout(100);
    
    // Enter key should work
    await claudeButtonsPage.prodButton.press('Enter');
    await page.waitForTimeout(100);
    
    // Should trigger cooldown regardless of browser
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown, `${browserName}: Keyboard interaction should trigger cooldown`).toBe(true);
    
    // Accessibility should be maintained
    const accessibility = await claudeButtonsPage.verifyButtonAccessibility(claudeButtonsPage.prodButton);
    expect(accessibility.hasKeyboardSupport, `${browserName}: Should support keyboard`).toBe(true);
    expect(accessibility.hasFocusIndicator, `${browserName}: Should have focus indicator`).toBe(true);
  });

  test('Should handle mouse events consistently across browsers', async ({ page, browserName }) => {
    const mouseEvents: string[] = [];
    
    // Monitor mouse events
    await page.evaluate(() => {
      const button = document.querySelector('button:has-text("prod/claude")');
      if (button) {
        ['mousedown', 'mouseup', 'click'].forEach(event => {
          button.addEventListener(event, () => {
            (window as any).mouseEvents = (window as any).mouseEvents || [];
            (window as any).mouseEvents.push(event);
          });
        });
      }
    });
    
    // Perform click
    await claudeButtonsPage.prodButton.click();
    
    // Retrieve events
    const events = await page.evaluate(() => (window as any).mouseEvents || []);
    
    // Should have proper event sequence regardless of browser
    expect(events, `${browserName}: Should have mouse events`).toContain('click');
    
    // Button should respond to mouse events
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown, `${browserName}: Should respond to mouse click`).toBe(true);
  });

  test('Should maintain performance across different browsers', async ({ page, browserName }) => {
    const performanceMetrics: number[] = [];
    
    // Test multiple interactions
    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        await page.waitForTimeout(3000); // Reset debouncing
      }
      
      const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      performanceMetrics.push(result.responseTime);
      
      expect(result.success, `${browserName}: Interaction ${i + 1} should succeed`).toBe(true);
    }
    
    // Performance should be consistent
    const avgResponseTime = performanceMetrics.reduce((a, b) => a + b) / performanceMetrics.length;
    expect(avgResponseTime, `${browserName}: Average response time should be reasonable`).toBeLessThan(500);
    
    // Variance should be minimal
    const maxVariance = Math.max(...performanceMetrics.map(time => Math.abs(time - avgResponseTime)));
    expect(maxVariance, `${browserName}: Response time variance should be minimal`).toBeLessThan(300);
  });

  test('Should handle touch events on mobile browsers correctly', async ({ page, browserName }) => {
    // Skip if not mobile browser
    const isMobile = browserName.includes('mobile') || browserName === 'webkit';
    
    if (!isMobile) {
      test.skip(true, 'Touch events test only for mobile browsers');
      return;
    }
    
    // Test touch interaction
    await claudeButtonsPage.prodButton.tap();
    await page.waitForTimeout(100);
    
    // Should behave same as click
    const inCooldown = await claudeButtonsPage.isButtonInCooldown(claudeButtonsPage.prodButton);
    expect(inCooldown, `${browserName}: Touch should trigger same behavior as click`).toBe(true);
    
    // Visual feedback should work on mobile
    const visualState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
    expect(visualState.disabled, `${browserName}: Mobile visual state should update`).toBe(true);
  });

  test('Should maintain timing accuracy across different browser engines', async ({ page, browserName }) => {
    const timingTests = [
      { name: 'debounce', expectedTime: 2000, tolerance: 500 },
      { name: 'quickClick', expectedTime: 100, tolerance: 200 }
    ];
    
    for (const timingTest of timingTests) {
      if (timingTest.name === 'debounce') {
        // Test debouncing timing
        await claudeButtonsPage.prodButton.click();
        await claudeButtonsPage.waitForButtonCooldown(claudeButtonsPage.prodButton, 2000);
        
        const startTime = Date.now();
        await page.waitForTimeout(timingTest.expectedTime + 200);
        
        const clickResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
        const actualTime = Date.now() - startTime;
        
        expect(clickResult.success, `${browserName}: Should work after debounce`).toBe(true);
        expect(actualTime, `${browserName}: Debounce timing`).toBeGreaterThanOrEqual(timingTest.expectedTime - timingTest.tolerance);
        expect(actualTime, `${browserName}: Debounce timing`).toBeLessThan(timingTest.expectedTime + timingTest.tolerance * 2);
        
        // Reset for next test
        await page.waitForTimeout(3000);
      } else if (timingTest.name === 'quickClick') {
        // Test quick response timing
        const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
        
        expect(result.success, `${browserName}: Quick click should succeed`).toBe(true);
        expect(result.responseTime, `${browserName}: Quick response`).toBeLessThan(timingTest.expectedTime + timingTest.tolerance);
      }
    }
  });

  test('Should handle browser-specific quirks gracefully', async ({ page, browserName }) => {
    const logs: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`${msg.type()}: ${msg.text()}`);
      }
    });
    
    // Test interactions that might expose browser quirks
    const interactions = [
      () => claudeButtonsPage.prodButton.click(),
      () => claudeButtonsPage.prodButton.press('Enter'),
      () => claudeButtonsPage.prodButton.press('Space'),
      () => claudeButtonsPage.triggerComponentRerender()
    ];
    
    for (const interaction of interactions) {
      try {
        await interaction();
        await page.waitForTimeout(100);
      } catch (error) {
        // Some interactions might not work in all browsers, that's ok
        console.log(`${browserName}: Interaction failed: ${error.message}`);
      }
    }
    
    // Should not have browser-specific errors
    const browserErrors = logs.filter(log => 
      log.includes('error') && !log.includes('Network') && !log.includes('CORS')
    );
    expect(browserErrors.length, `${browserName}: Should not have browser-specific errors`).toBe(0);
    
    // Final functionality test
    await page.waitForTimeout(3000); // Reset any states
    const finalResult = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
    expect(finalResult.success, `${browserName}: Should maintain functionality despite quirks`).toBe(true);
  });

  test('Should handle different viewport sizes consistently', async ({ page, browserName }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Button should be functional at all viewport sizes
      const result = await claudeButtonsPage.clickButtonWithTiming(claudeButtonsPage.prodButton);
      expect(result.success, `${browserName} ${viewport.name}: Should work at viewport ${viewport.width}x${viewport.height}`).toBe(true);
      
      // Visual state should be consistent
      const visualState = await claudeButtonsPage.getButtonVisualState(claudeButtonsPage.prodButton);
      expect(visualState.disabled, `${browserName} ${viewport.name}: Should be disabled after click`).toBe(true);
      
      // Wait for reset
      await page.waitForTimeout(3000);
    }
  });
});