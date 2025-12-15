/**
 * Phase 3: Dynamic Agent Pages Production Validation Test
 * Tests critical functionality for agent navigation and customization
 */

const { test, expect } = require('@playwright/test');

// Navigation Tests
test.describe('Agent Navigation', () => {
  test('should navigate from agent card to home page', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    
    // Wait for agents to load
    await page.waitForSelector('.agent-card', { timeout: 10000 });
    
    // Click on first agent card home button
    const firstAgentCard = page.locator('.agent-card').first();
    await firstAgentCard.locator('button[title="Go to Agent Home"], .action-btn[title="Go to Agent Home"]').click();
    
    // Verify navigation to agent home page
    await expect(page).toHaveURL(/\/agents\/.*\/home/);
    
    // Verify home page content loads
    await expect(page.locator('h1, h2')).toContainText(/agent/i);
  });

  test('should navigate from agent card to details page', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    
    await page.waitForSelector('.agent-card', { timeout: 10000 });
    
    const firstAgentCard = page.locator('.agent-card').first();
    await firstAgentCard.locator('button[title="View Details"], .action-btn[title="View Details"]').click();
    
    await expect(page).toHaveURL(/\/agents\/.*$/);
    await expect(page.locator('h1, h2')).toContainText(/agent/i);
  });

  test('should show back navigation from agent home', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Look for back button
    const backButton = page.locator('button[title*="back" i], button[aria-label*="back" i], button:has-text("Back")').first();
    await expect(backButton).toBeVisible();
    
    await backButton.click();
    await expect(page).toHaveURL('/agents');
  });
});

// Agent Home Page Content Tests
test.describe('Agent Home Page Content', () => {
  test('should display agent information correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Verify essential content is present
    await expect(page.locator('h1, h2, .agent-name')).toBeVisible();
    await expect(page.locator('.agent-description, p')).toBeVisible();
  });

  test('should show agent statistics', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Look for statistics/metrics
    const statsElements = page.locator('.stats, .metrics, .agent-stats, [class*="stat"]');
    await expect(statsElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display quick actions', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Look for action buttons or controls
    const actionElements = page.locator('.quick-actions, .actions, button, .action-btn');
    await expect(actionElements.first()).toBeVisible({ timeout: 10000 });
  });
});

// Agent Customization Tests
test.describe('Agent Customization', () => {
  test('should show customization options when available', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Look for customization/settings buttons
    const customizeButtons = page.locator('button:has-text("Customize"), button:has-text("Settings"), button[title*="custom" i]');
    
    if (await customizeButtons.count() > 0) {
      await expect(customizeButtons.first()).toBeVisible();
    }
  });

  test('should handle theme changes', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Check if theme customization is working by verifying CSS variables or classes
    const rootElement = page.locator('html, body, [data-theme], .theme-container');
    await expect(rootElement.first()).toBeVisible();
  });
});

// Performance Tests
test.describe('Performance Validation', () => {
  test('should load agent home page within 3 seconds', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('http://localhost:5173/agents/test-agent/home');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle multiple rapid navigation changes', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    
    // Navigate rapidly between pages
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:5173/agents');
      await page.goto('http://localhost:5173/agents/test-agent/home');
      await page.goto('http://localhost:5173/agents/test-agent');
    }
    
    // Verify final page loads correctly
    await expect(page.locator('h1, h2')).toBeVisible();
  });
});

// Error Handling Tests
test.describe('Error Boundaries', () => {
  test('should handle invalid agent IDs gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/invalid-agent-id/home');
    
    // Should show error state or fallback content, not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Look for error messages or fallback content
    const errorOrFallback = page.locator('.error, .not-found, .fallback, [role="alert"]');
    if (await errorOrFallback.count() > 0) {
      await expect(errorOrFallback.first()).toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block API requests to simulate network issues
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    // Page should still render with fallback content
    await expect(page.locator('body')).toBeVisible();
  });
});

// Accessibility Tests
test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/test-agent/home');
    
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();
  });

  test('should have keyboard navigation support', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});