import { test, expect } from '@playwright/test';
import { AgentFeedPage } from './pages/AgentFeedPage';

test.describe('Loading Animations - Visual Feedback Testing', () => {
  let agentFeedPage: AgentFeedPage;

  test.beforeEach(async ({ page }) => {
    agentFeedPage = new AgentFeedPage(page);
    await agentFeedPage.goto();
  });

  test('Instance Creation Loading Animation', async ({ page }) => {
    // Click create instance button
    await agentFeedPage.createInstanceButton.click();
    
    // Verify loading animation appears immediately
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible({ timeout: 1000 });
    
    // Verify animation has proper CSS classes
    const animation = agentFeedPage.loadingAnimations.first();
    await expect(animation).toHaveClass(/loading-animation/);
    
    // Take screenshot during loading
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/loading-animation-active.png',
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
    
    // Verify animation disappears after instance creation
    await expect(animation).toBeHidden({ timeout: 30000 });
    
    // Verify instance appears
    await expect(agentFeedPage.instancesList.locator('.instance-item').first()).toBeVisible();
  });

  test('Command Execution Loading States', async () => {
    await agentFeedPage.createNewInstance();
    
    // Execute command and monitor loading state
    await agentFeedPage.commandInput.fill('sleep 2 && echo "Done"');
    await agentFeedPage.sendButton.click();
    
    // Look for any loading indicators during command execution
    const loadingIndicators = agentFeedPage.page.locator('.loading, .spinner, [data-testid*="loading"]');
    
    // If loading indicators exist, verify they work properly
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
      await expect(loadingIndicators.first()).toBeHidden({ timeout: 10000 });
    }
    
    // Verify command completes
    await expect(agentFeedPage.terminalOutput).toContainText('Done');
  });

  test('Loading Animation Performance', async ({ page }) => {
    // Measure time from click to animation appearance
    const start = Date.now();
    await agentFeedPage.createInstanceButton.click();
    
    // Wait for animation to appear
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    const animationStart = Date.now();
    
    // Animation should appear within 100ms of click
    const timeToAnimation = animationStart - start;
    expect(timeToAnimation).toBeLessThan(100);
    
    console.log(`Loading animation appeared in: ${timeToAnimation}ms`);
  });

  test('Multiple Loading States', async () => {
    // Test scenario where multiple loading states might occur
    await agentFeedPage.createInstanceButton.click();
    
    // Wait for first loading (instance creation)
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    await expect(agentFeedPage.loadingAnimations.first()).toBeHidden({ timeout: 30000 });
    
    // Execute command immediately after instance creation
    await agentFeedPage.executeCommand('echo "Testing multiple loads"');
    
    // Verify no unexpected loading states
    const unexpectedLoading = agentFeedPage.page.locator('.loading-animation:visible');
    const loadingCount = await unexpectedLoading.count();
    
    // Should not have persistent loading states
    if (loadingCount > 0) {
      // Wait for any valid loading to complete
      await expect(unexpectedLoading.first()).toBeHidden({ timeout: 5000 });
    }
  });

  test('Loading Animation Accessibility', async ({ page }) => {
    await agentFeedPage.createInstanceButton.click();
    
    // Verify loading animation has appropriate ARIA attributes
    const animation = agentFeedPage.loadingAnimations.first();
    await expect(animation).toBeVisible();
    
    // Check for accessibility attributes
    const ariaLabel = await animation.getAttribute('aria-label');
    const ariaLive = await animation.getAttribute('aria-live');
    const role = await animation.getAttribute('role');
    
    // Should have proper accessibility attributes
    expect(ariaLabel || ariaLive || role).toBeTruthy();
    
    console.log('Accessibility attributes:', { ariaLabel, ariaLive, role });
  });

  test('Loading Animation Visual Consistency', async ({ page }) => {
    // Test loading animation across different browser states
    
    // Normal state
    await agentFeedPage.createInstanceButton.click();
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/loading-normal.png', clip: { x: 0, y: 0, width: 400, height: 200 } });
    
    // Wait for completion
    await expect(agentFeedPage.loadingAnimations.first()).toBeHidden({ timeout: 30000 });
    
    // Test with slow network simulation
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      route.continue();
    });
    
    // Create another instance with slow network
    await agentFeedPage.createInstanceButton.click();
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/loading-slow-network.png', clip: { x: 0, y: 0, width: 400, height: 200 } });
    
    // Restore normal network
    await page.unroute('**/*');
    await expect(agentFeedPage.loadingAnimations.first()).toBeHidden({ timeout: 30000 });
  });

  test('Loading States During Error Scenarios', async ({ page }) => {
    // Mock backend to simulate errors
    await page.route('**/api/instances', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Try to create instance with error
    await agentFeedPage.createInstanceButton.click();
    
    // Loading should appear
    await expect(agentFeedPage.loadingAnimations.first()).toBeVisible();
    
    // Loading should eventually disappear even with error
    await expect(agentFeedPage.loadingAnimations.first()).toBeHidden({ timeout: 10000 });
    
    // Error should be displayed
    await agentFeedPage.verifyErrorHandling();
    
    // Restore normal behavior
    await page.unroute('**/api/instances');
  });
});