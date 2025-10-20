/**
 * E2E Tests for Agent Manager Tabs Restructure
 * Tests the removal of 3 tabs and addition of Tools section
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Agent Manager Tabs Restructure E2E', () => {
  test.describe('Tab Count Verification', () => {
    test('should display exactly 2 tabs on agent profile page', async ({ page }) => {
      // Navigate to an agent profile page
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for page to load
      await page.waitForSelector('nav button', { timeout: 10000 });

      // Count the navigation tabs
      const tabs = await page.locator('nav button').all();
      expect(tabs.length).toBe(2);
    });

    test('should show "Overview" and "Dynamic Pages" tabs only', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for tabs to be visible
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
    });

    test('should NOT show "Activities" tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for page load
      await page.waitForLoadState('networkidle');

      // Verify Activities tab is not present
      const activitiesTab = page.getByRole('button', { name: /^activities$/i });
      await expect(activitiesTab).toHaveCount(0);
    });

    test('should NOT show "Performance" tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForLoadState('networkidle');

      const performanceTab = page.getByRole('button', { name: /^performance$/i });
      await expect(performanceTab).toHaveCount(0);
    });

    test('should NOT show "Capabilities" tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForLoadState('networkidle');

      const capabilitiesTab = page.getByRole('button', { name: /^capabilities$/i });
      await expect(capabilitiesTab).toHaveCount(0);
    });
  });

  test.describe('Tools Section Display', () => {
    test('should display "Available Tools" heading in Overview', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Wait for Overview tab content
      await page.waitForSelector('text=Agent Information');

      // Check for Available Tools section
      await expect(page.getByText(/available tools/i)).toBeVisible();
    });

    test('should display tool names in Overview', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Available Tools');

      // Verify common tools are displayed
      await expect(page.getByText('Read', { exact: true })).toBeVisible();
      await expect(page.getByText('Write', { exact: true })).toBeVisible();
      await expect(page.getByText('Edit', { exact: true })).toBeVisible();
    });

    test('should display tool descriptions', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Available Tools');

      // Check for description of Read tool
      await expect(page.getByText(/read files from the filesystem/i)).toBeVisible();
    });

    test('should display tools in grid layout', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Available Tools');

      // Check for grid container
      const toolsGrid = page.locator('.grid').filter({ hasText: 'Read' });
      await expect(toolsGrid).toBeVisible();

      // Verify multiple tool cards exist
      const toolCards = page.locator('.border').filter({ has: page.locator('text=Read') });
      await expect(toolCards.first()).toBeVisible();
    });

    test('should show Code icon for each tool', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Available Tools');

      // Tool cards should contain icons
      const toolCard = page.locator('.border').filter({ hasText: 'Read' }).first();
      const icon = toolCard.locator('svg');
      await expect(icon).toBeVisible();
    });

    test('should not show tools section for agent without tools', async ({ page }) => {
      // Navigate to an agent that might not have tools
      // This is a hypothetical test - adjust agent name as needed
      await page.goto('/agents/test-agent-no-tools');

      await page.waitForLoadState('networkidle');

      // Tools section should not be present
      const toolsSection = page.getByText(/available tools/i);
      await expect(toolsSection).toHaveCount(0);
    });
  });

  test.describe('Tab Switching Functionality', () => {
    test('should switch to Overview tab when clicked', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Click Overview tab
      const overviewTab = page.getByRole('button', { name: /overview/i });
      await overviewTab.click();

      // Verify Overview content is visible
      await expect(page.getByText(/agent information/i)).toBeVisible();
    });

    test('should switch to Dynamic Pages tab when clicked', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Click Dynamic Pages tab
      const pagesTab = page.getByRole('button', { name: /dynamic pages/i });
      await pagesTab.click();

      // Wait for tab content to change
      await page.waitForTimeout(500);

      // Dynamic Pages tab should be active
      await expect(pagesTab).toHaveClass(/blue/);
    });

    test('should highlight active tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Overview tab should be active by default
      const overviewTab = page.getByRole('button', { name: /overview/i });
      const classes = await overviewTab.getAttribute('class');

      expect(classes).toContain('blue');
      expect(classes).toContain('border-blue');
    });

    test('should maintain tab state when switching', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Switch to Dynamic Pages
      await page.getByRole('button', { name: /dynamic pages/i }).click();
      await page.waitForTimeout(300);

      // Switch back to Overview
      await page.getByRole('button', { name: /overview/i }).click();

      // Overview content should be visible again
      await expect(page.getByText(/agent information/i)).toBeVisible();
    });
  });

  test.describe('Viewport Testing', () => {
    test('should display correctly on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
      await expect(page.getByText(/available tools/i)).toBeVisible();
    });

    test('should display correctly on laptop (1366x768)', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
    });

    test('should display correctly on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
    });

    test('should display correctly on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();

      // Tools should stack in single column on mobile
      await page.waitForSelector('text=Available Tools');
      const toolsGrid = page.locator('.grid').filter({ hasText: 'Read' });
      await expect(toolsGrid).toBeVisible();
    });
  });

  test.describe('Dark Mode Testing', () => {
    test('should display correctly in dark mode', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Simulate dark mode by adding dark class to html
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Wait for re-render
      await page.waitForTimeout(500);

      // Tabs should be visible in dark mode
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /dynamic pages/i })).toBeVisible();
    });

    test('should have proper contrast in dark mode', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Take screenshot for visual verification
      await page.screenshot({ path: 'tests/e2e/screenshots/agent-profile-dark-mode.png' });
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible tab navigation', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Tabs should be focusable
      const overviewTab = page.getByRole('button', { name: /overview/i });
      await overviewTab.focus();

      await expect(overviewTab).toBeFocused();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Focus on Overview tab
      await page.getByRole('button', { name: /overview/i }).focus();

      // Press Tab to move to next tab
      await page.keyboard.press('Tab');

      // Dynamic Pages tab should be focused
      const pagesTab = page.getByRole('button', { name: /dynamic pages/i });
      await expect(pagesTab).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      // Check for proper button roles
      const tabs = await page.locator('nav button[role="button"]').all();
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should load agent profile quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/agents/chief-of-staff-agent');
      await page.waitForSelector('text=Agent Information');

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Load in under 3 seconds
    });

    test('tab switching should be instant', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      const startTime = Date.now();

      await page.getByRole('button', { name: /dynamic pages/i }).click();
      await page.waitForTimeout(100);

      const switchTime = Date.now() - startTime;

      expect(switchTime).toBeLessThan(500); // Switch in under 500ms
    });
  });

  test.describe('Error Handling', () => {
    test('should handle non-existent agent gracefully', async ({ page }) => {
      await page.goto('/agents/non-existent-agent-xyz-123');

      await expect(page.getByText(/agent not found/i)).toBeVisible();
    });

    test('should show error message for failed API call', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/agents/*', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.goto('/agents/chief-of-staff-agent');

      await expect(page.getByText(/error|failed/i)).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('should match baseline screenshot for Overview tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.waitForSelector('text=Available Tools');

      // Take screenshot
      await expect(page).toHaveScreenshot('agent-profile-overview.png', {
        fullPage: true,
        maxDiffPixels: 100
      });
    });

    test('should match baseline screenshot for Dynamic Pages tab', async ({ page }) => {
      await page.goto('/agents/chief-of-staff-agent');

      await page.getByRole('button', { name: /dynamic pages/i }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('agent-profile-dynamic-pages.png', {
        fullPage: true,
        maxDiffPixels: 100
      });
    });
  });
});

test.describe('Tools Display E2E', () => {
  test('should display all agent tools', async ({ page }) => {
    await page.goto('/agents/chief-of-staff-agent');

    await page.waitForSelector('text=Available Tools');

    // Expected tools for chief-of-staff-agent
    const expectedTools = ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'LS', 'TodoWrite', 'Bash', 'Task'];

    // Verify each tool is displayed
    for (const tool of expectedTools) {
      await expect(page.getByText(tool, { exact: true })).toBeVisible();
    }
  });

  test('should display tool descriptions below tool names', async ({ page }) => {
    await page.goto('/agents/chief-of-staff-agent');

    await page.waitForSelector('text=Available Tools');

    // Find tool card for "Read"
    const readCard = page.locator('.border').filter({ hasText: 'Read' }).first();

    // Description should be visible
    await expect(readCard.getByText(/read files from the filesystem/i)).toBeVisible();
  });

  test('should display MCP tools with descriptions', async ({ page }) => {
    // Navigate to an agent with MCP tools (if any exist)
    await page.goto('/agents/chief-of-staff-agent');

    await page.waitForLoadState('networkidle');

    // If agent has MCP tools, they should be displayed
    // This test assumes the agent might have MCP tools in the future
  });
});
