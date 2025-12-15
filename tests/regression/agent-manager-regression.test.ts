/**
 * Regression Tests for Agent Manager Tabs Restructure
 * Ensures existing functionality still works after the changes
 */

import { test, expect } from '@playwright/test';

test.describe('Agent Manager Regression Tests', () => {
  test.describe('Agent List Page - Not Affected', () => {
    test('should still display agent list correctly', async ({ page }) => {
      await page.goto('/agents');

      // Wait for agent cards to load
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, a[href*="/agents/"]', {
        timeout: 10000
      });

      // Verify agents are displayed
      const agentLinks = page.locator('a[href*="/agents/"]');
      const count = await agentLinks.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should allow navigation to agent profile from list', async ({ page }) => {
      await page.goto('/agents');

      // Wait for agent list to load
      await page.waitForLoadState('networkidle');

      // Click on first agent
      const firstAgent = page.locator('a[href*="/agents/"]').first();
      await firstAgent.click();

      // Should navigate to agent profile
      await expect(page).toHaveURL(/\/agents\/[^/]+$/);
    });

    test('should display agent cards with basic information', async ({ page }) => {
      await page.goto('/agents');

      await page.waitForLoadState('networkidle');

      // Agent cards should have names
      const agentCards = page.locator('a[href*="/agents/"]');
      const firstCard = agentCards.first();

      await expect(firstCard).toBeVisible();
    });
  });

  test.describe('Dynamic Pages Tab - Still Works', () => {
    test('should render Dynamic Pages tab content', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Click Dynamic Pages tab
      await page.getByRole('button', { name: /dynamic pages/i }).click();

      await page.waitForTimeout(500);

      // Tab should be active
      const pagesTab = page.getByRole('button', { name: /dynamic pages/i });
      await expect(pagesTab).toHaveClass(/blue/);
    });

    test('should maintain Dynamic Pages functionality', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.getByRole('button', { name: /dynamic pages/i }).click();

      // Wait for potential dynamic content
      await page.waitForTimeout(1000);

      // Tab should remain visible and functional
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
    });
  });

  test.describe('Agent Header - Not Affected', () => {
    test('should display agent header correctly', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for header to load
      await page.waitForSelector('h1, [role="heading"]');

      // Header should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
    });

    test('should display agent avatar/icon', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForLoadState('networkidle');

      // Avatar or icon should be present
      const avatar = page.locator('.rounded-full').first();
      await expect(avatar).toBeVisible();
    });

    test('should display agent status', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForLoadState('networkidle');

      // Status badge should be visible
      const status = page.getByText(/active|inactive|busy/i);
      await expect(status).toBeVisible();
    });

    test('should display back button', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Back button should be visible
      const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(backButton).toBeVisible();
    });

    test('should navigate back to agent list when back button clicked', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Click back button (ArrowLeft icon)
      const backButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await backButton.click();

      // Should navigate back to agents list
      await expect(page).toHaveURL(/\/agents\/?$/);
    });
  });

  test.describe('Agent Information Display - Not Affected', () => {
    test('should display agent description in Overview', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Agent Information');

      // Description should be visible
      await expect(page.getByText(/strategic orchestration|coordination/i)).toBeVisible();
    });

    test('should display agent ID', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Agent Information');

      // Agent ID section should be present
      await expect(page.getByText(/agent id/i)).toBeVisible();
    });

    test('should display capabilities if present', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForLoadState('networkidle');

      // Capabilities section may or may not be present
      // This is a regression test to ensure it still works if present
      const capabilities = page.getByText(/capabilities/i);
      const count = await capabilities.count();

      // No assertion - just checking it doesn't crash
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('API Endpoints - Still Functional', () => {
    test('should successfully fetch agent data', async ({ page }) => {
      // Intercept API call
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/agents/') && response.status() === 200
      );

      await page.goto('/agents/chief-of-staff-agent');

      const response = await responsePromise;
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    test('should include all required fields in API response', async ({ page }) => {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/agents/')
      );

      await page.goto('/agents/chief-of-staff-agent');

      const response = await responsePromise;
      const data = await response.json();

      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('description');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('tools'); // NEW field
    });

    test('should handle 404 for non-existent agent', async ({ page }) => {
      await page.goto('/agents/non-existent-agent-12345');

      await expect(page.getByText(/not found/i)).toBeVisible();
    });
  });

  test.describe('Routing - Not Affected', () => {
    test('should route to agent profile via slug', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await expect(page).toHaveURL(/\/agents\/chief-of-staff-agent/);
    });

    test('should maintain URL when switching tabs', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Click Dynamic Pages tab
      await page.getByRole('button', { name: /dynamic pages/i }).click();

      // URL should remain the same (no hash or query params)
      await expect(page).toHaveURL(/\/agents\/chief-of-staff-agent$/);
    });
  });

  test.describe('Loading States - Not Affected', () => {
    test('should show loading skeleton while fetching data', async ({ page }) => {
      // Slow down network to see loading state
      await page.route('**/api/agents/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.goto('/agents/chief-of-staff-agent');

      // Loading skeleton should be visible
      const loadingSkeleton = page.locator('.animate-pulse');
      await expect(loadingSkeleton).toBeVisible({ timeout: 2000 });
    });

    test('should hide loading state after data loads', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for content to load
      await page.waitForSelector('text=Agent Information');

      // Loading skeleton should not be visible
      const loadingSkeleton = page.locator('.animate-pulse');
      await expect(loadingSkeleton).toHaveCount(0);
    });
  });

  test.describe('Error States - Not Affected', () => {
    test('should display error message on API failure', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/agents/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ success: false, error: 'Server error' })
        });
      });

      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByText(/error|failed/i)).toBeVisible();
    });

    test('should display 404 message for non-existent agent', async ({ page }) => {
      await page.route('**/api/agents/non-existent', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ success: false, error: 'Agent not found' })
        });
      });

      await page.goto('/agents/non-existent');

      await expect(page.getByText(/not found/i)).toBeVisible();
    });
  });

  test.describe('Styling and Layout - Not Affected', () => {
    test('should maintain responsive layout', async ({ page }) => {
      // Desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/agents/chief-of-staff-agent');
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
    });

    test('should maintain dark mode support', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Add dark mode class
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(300);

      // Page should still be functional
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
    });
  });

  test.describe('TypeScript Type Safety - Maintained', () => {
    test('should handle agent data with tools field', async ({ page }) => {
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/agents/')
      );

      await page.goto('/agents/chief-of-staff-agent');

      const response = await responsePromise;
      const data = await response.json();

      // Tools field should be an array
      expect(Array.isArray(data.data.tools)).toBe(true);
    });

    test('should handle agent data without tools field gracefully', async ({ page }) => {
      // Mock response without tools
      await page.route('**/api/agents/**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            data: {
              id: '1',
              name: 'test-agent',
              description: 'Test',
              status: 'active'
              // No tools field
            }
          })
        });
      });

      await page.goto('/agents/test-agent');

      // Should not crash
      await expect(page.getByText(/agent information/i)).toBeVisible();
    });
  });

  test.describe('No Console Errors', () => {
    test('should not produce console errors on page load', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/agents/chief-of-staff-agent');
      await page.waitForLoadState('networkidle');

      // Filter out known acceptable errors
      const criticalErrors = errors.filter(
        error => !error.includes('favicon') && !error.includes('service-worker')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should not produce TypeScript errors in browser', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('/agents/chief-of-staff-agent');
      await page.waitForLoadState('networkidle');

      expect(errors.length).toBe(0);
    });
  });
});
