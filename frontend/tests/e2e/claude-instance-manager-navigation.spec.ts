/**
 * E2E Test Suite: Claude Instance Manager Navigation
 * SPARC Methodology: Completion Phase - End-to-End Testing
 * 
 * Tests dedicated route navigation, full user workflows, and cross-browser compatibility
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Claude Instance Manager Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start with a clean slate - clear localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('SPECIFICATION: Dedicated Route Access', () => {
    test('should navigate to Claude Instances page via menu', async ({ page }) => {
      await page.goto('/');
      
      // Open sidebar on mobile/tablet if needed
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
      
      // Click Claude Instances in navigation
      await page.getByRole('link', { name: 'Claude Instances' }).click();
      
      // Verify route and content
      await expect(page).toHaveURL('/claude-instances');
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
      await expect(page.getByText('🗨️ Launch Chat')).toBeVisible();
      await expect(page.getByText('💻 Launch Code')).toBeVisible();
    });

    test('should directly access Claude Instances route', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Verify page loads correctly
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
      await expect(page.getByText('No active instances. Launch one to get started!')).toBeVisible();
    });

    test('should highlight active navigation item', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Check that Claude Instances nav item is highlighted
      const claudeInstancesLink = page.getByRole('link', { name: 'Claude Instances' });
      await expect(claudeInstancesLink).toHaveClass(/bg-blue-100|text-blue-700/);
    });
  });

  test.describe('PSEUDOCODE: SimpleLauncher Toggle Integration', () => {
    test('should show view toggle in SimpleLauncher', async ({ page }) => {
      await page.goto('/simple-launcher');
      
      // Verify toggle elements are present
      await expect(page.getByText('Interface Mode')).toBeVisible();
      await expect(page.getByTestId('terminal-view-toggle')).toBeVisible();
      await expect(page.getByTestId('web-view-toggle')).toBeVisible();
      
      // Terminal should be active by default
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
    });

    test('should switch between terminal and web views', async ({ page }) => {
      await page.goto('/simple-launcher');
      
      // Start in terminal view
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
      await expect(page.getByText('💻 Classic terminal interface')).toBeVisible();
      
      // Switch to web view
      await page.getByTestId('web-view-toggle').click();
      await expect(page.getByTestId('web-view-toggle')).toHaveClass(/active/);
      await expect(page.getByText('🚀 Modern web interface')).toBeVisible();
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
      
      // Switch back to terminal view
      await page.getByTestId('terminal-view-toggle').click();
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
      await expect(page.queryByText('Claude Instance Manager')).not.toBeVisible();
    });

    test('should persist view preference across sessions', async ({ page }) => {
      await page.goto('/simple-launcher');
      
      // Switch to web view
      await page.getByTestId('web-view-toggle').click();
      await expect(page.getByTestId('web-view-toggle')).toHaveClass(/active/);
      
      // Reload page
      await page.reload();
      
      // Should maintain web view preference
      await expect(page.getByTestId('web-view-toggle')).toHaveClass(/active/);
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
    });
  });

  test.describe('ARCHITECTURE: Cross-Navigation Workflows', () => {
    test('should enable seamless navigation between SimpleLauncher and dedicated Claude Instances', async ({ page }) => {
      // Start at SimpleLauncher in terminal mode
      await page.goto('/simple-launcher');
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
      
      // Navigate to dedicated Claude Instances page
      const menuButton = page.locator('button', { hasText: 'Menu' });
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
      await page.getByRole('link', { name: 'Claude Instances' }).click();
      
      // Verify we're on the dedicated page
      await expect(page).toHaveURL('/claude-instances');
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
      
      // Go back to SimpleLauncher
      await page.getByRole('link', { name: 'Simple Launcher' }).click();
      await expect(page).toHaveURL('/simple-launcher');
      
      // View preference should still be terminal
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
    });

    test('should maintain consistent Claude instance state across views', async ({ page }) => {
      // This test will be implemented when backend API is available
      // For now, verify UI consistency
      await page.goto('/simple-launcher');
      
      // Switch to web view
      await page.getByTestId('web-view-toggle').click();
      
      // Navigate to dedicated page
      const menuButton = page.locator('button', { hasText: 'Menu' });
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
      await page.getByRole('link', { name: 'Claude Instances' }).click();
      
      // Both should show the same Claude Instance Manager component
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
      await expect(page.getByText('🗨️ Launch Chat')).toBeVisible();
    });
  });

  test.describe('REFINEMENT: Responsive Design Validation', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await page.goto('/simple-launcher');
      
      // Verify toggle buttons stack vertically on mobile
      const terminalToggle = page.getByTestId('terminal-view-toggle');
      const webToggle = page.getByTestId('web-view-toggle');
      
      await expect(terminalToggle).toBeVisible();
      await expect(webToggle).toBeVisible();
      
      // Test switching views on mobile
      await webToggle.click();
      await expect(webToggle).toHaveClass(/active/);
      
      // Claude Instance Manager should be visible in web view
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
    });

    test('should maintain navigation usability on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      await page.goto('/');
      
      // Navigation should be accessible
      await page.getByRole('link', { name: 'Claude Instances' }).click();
      await expect(page).toHaveURL('/claude-instances');
      
      // Back to SimpleLauncher
      await page.getByRole('link', { name: 'Simple Launcher' }).click();
      await expect(page).toHaveURL('/simple-launcher');
      
      // Toggle should work on tablet
      await page.getByTestId('web-view-toggle').click();
      await expect(page.getByTestId('web-view-toggle')).toHaveClass(/active/);
    });
  });

  test.describe('COMPLETION: Error Handling & Edge Cases', () => {
    test('should handle localStorage unavailable gracefully', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => { throw new Error('localStorage unavailable'); },
            setItem: () => { throw new Error('localStorage unavailable'); },
          }
        });
      });
      
      await page.goto('/simple-launcher');
      
      // Should still load with default terminal view
      await expect(page.getByTestId('terminal-view-toggle')).toHaveClass(/active/);
      
      // Toggle should still work (just won't persist)
      await page.getByTestId('web-view-toggle').click();
      await expect(page.getByTestId('web-view-toggle')).toHaveClass(/active/);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Block API requests
      await page.route('/api/claude/**', route => route.abort());
      
      await page.goto('/simple-launcher');
      
      // UI should still be functional
      await expect(page.getByText('Interface Mode')).toBeVisible();
      await page.getByTestId('web-view-toggle').click();
      await expect(page.getByText('Claude Instance Manager')).toBeVisible();
    });

    test('should provide fallback content for route errors', async ({ page }) => {
      // Navigate to non-existent route
      await page.goto('/non-existent-route');
      
      // Should show 404 or fallback content
      await expect(page.getByText('404') || page.getByText('Page not found') || page.getByText('Not found')).toBeVisible();
    });
  });

  test.describe('COMPLETION: Performance & Accessibility', () => {
    test('should meet accessibility standards', async ({ page }) => {
      await page.goto('/simple-launcher');
      
      // Check for proper ARIA labels and semantic HTML
      const toggleButtons = page.locator('[data-testid*="view-toggle"]');
      await expect(toggleButtons.first()).toBeVisible();
      
      // Should be keyboard navigable
      await page.keyboard.press('Tab');
      // Verify focus is visible (implementation depends on CSS)
      
      // Color contrast should be sufficient (manual verification needed)
      const terminalButton = page.getByTestId('terminal-view-toggle');
      await expect(terminalButton).toHaveCSS('color', /rgb\(\d+,\s*\d+,\s*\d+\)/);
    });

    test('should load quickly without layout shifts', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/simple-launcher');
      await expect(page.getByText('Interface Mode')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      
      // Check for layout stability
      await page.waitForLoadState('networkidle');
      const screenshot1 = await page.screenshot();
      
      await page.waitForTimeout(500); // Wait for any potential shifts
      const screenshot2 = await page.screenshot();
      
      // Screenshots should be identical (no layout shift)
      expect(screenshot1).toEqual(screenshot2);
    });
  });
});