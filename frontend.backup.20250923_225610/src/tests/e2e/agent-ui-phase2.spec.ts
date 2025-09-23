/**
 * Phase 2 Enhanced Agent UI - End-to-End Tests
 * Comprehensive testing suite for enhanced agent listing and detail views
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('SPARC Phase 2: Enhanced Agent UI', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/agents');
  });

  test.describe('AgentsList Component', () => {
    test('should render enhanced agents list with modern UI', async () => {
      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Agents');
      
      // Check for modern UI elements
      await expect(page.locator('[data-testid="agents-grid"]')).toBeVisible();
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search agents"]')).toBeVisible();
    });

    test('should switch between grid and list view modes', async () => {
      // Check grid view is default
      await expect(page.locator('[aria-selected="true"]')).toContainText('Grid');
      
      // Switch to list view
      await page.click('button[aria-label="List view"]');
      await expect(page.locator('[aria-selected="true"]')).toContainText('List');
      
      // Verify URL parameter is updated
      await expect(page).toHaveURL(/view=list/);
    });

    test('should filter agents by search term', async () => {
      const searchInput = page.locator('input[placeholder*="Search agents"]');
      
      // Get initial agent count
      const initialAgents = await page.locator('[data-testid="agent-card"]').count();
      
      // Search for specific agent
      await searchInput.fill('SPARC');
      
      // Verify filtered results
      const filteredAgents = await page.locator('[data-testid="agent-card"]').count();
      expect(filteredAgents).toBeLessThanOrEqual(initialAgents);
      
      // Verify search results contain the term
      const agentNames = await page.locator('[data-testid="agent-name"]').allTextContents();
      agentNames.forEach(name => {
        expect(name.toLowerCase()).toContain('sparc');
      });
    });

    test('should filter agents by category', async () => {
      // Open category filter
      const categorySelect = page.locator('select[data-testid="category-filter"]');
      await categorySelect.selectOption('Development');
      
      // Verify URL is updated
      await expect(page).toHaveURL(/category=Development/);
      
      // Verify filtered results
      const agentCategories = await page.locator('[data-testid="agent-category"]').allTextContents();
      agentCategories.forEach(category => {
        expect(category).toBe('Development');
      });
    });

    test('should sort agents by different criteria', async () => {
      const sortSelect = page.locator('select[data-testid="sort-filter"]');
      
      // Sort by name
      await sortSelect.selectOption('name');
      const namesSorted = await page.locator('[data-testid="agent-name"]').allTextContents();
      const namesExpected = [...namesSorted].sort();
      expect(namesSorted).toEqual(namesExpected);
      
      // Sort by status
      await sortSelect.selectOption('status');
      await expect(page).toHaveURL(/sort=status/);
    });

    test('should display real-time update information', async () => {
      // Check for last updated timestamp
      await expect(page.locator('text=/Last updated:/i')).toBeVisible();
      
      // Test refresh functionality
      await page.click('button:has-text("Refresh")');
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle error states gracefully', async () => {
      // Mock API failure
      await page.route('/api/agents', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.reload();
      
      // Check error display
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('text=/Connection Error/i')).toBeVisible();
    });

    test('should navigate to agent detail on card click', async () => {
      // Click on first agent card
      const firstAgentCard = page.locator('[data-testid="agent-card"]').first();
      const agentName = await firstAgentCard.locator('[data-testid="agent-name"]').textContent();
      
      await firstAgentCard.click();
      
      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/agents\/[^/]+$/);
      await expect(page.locator('h1')).toContainText(agentName || '');
    });
  });

  test.describe('AgentDetail Component', () => {
    test.beforeEach(async () => {
      // Navigate to a specific agent detail page
      await page.goto('/agents/sparc-researcher');
    });

    test('should render agent detail with comprehensive information', async () => {
      // Check main sections are present
      await expect(page.locator('h1')).toContainText('SPARC Researcher');
      await expect(page.locator('[data-testid="agent-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-status-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-capabilities"]')).toBeVisible();
    });

    test('should have functional tab navigation', async () => {
      // Check all tabs are present
      const tabs = ['Definition', 'Profile', 'Pages', 'Workspace'];
      
      for (const tabName of tabs) {
        await expect(page.locator(`[role="tab"]:has-text("${tabName}")`)).toBeVisible();
      }
      
      // Test tab switching
      await page.click('[role="tab"]:has-text("Profile")');
      await expect(page.locator('[data-testid="agent-profile-content"]')).toBeVisible();
      
      await page.click('[role="tab"]:has-text("Workspace")');
      await expect(page.locator('[data-testid="file-system-browser"]')).toBeVisible();
    });

    test('should display agent definition with markdown rendering', async () => {
      await page.click('[role="tab"]:has-text("Definition")');
      
      // Check for markdown content
      await expect(page.locator('[data-testid="definition-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="table-of-contents"]')).toBeVisible();
      
      // Test view mode switching
      await page.click('button:has-text("Source")');
      await expect(page.locator('[data-testid="markdown-source"]')).toBeVisible();
      
      await page.click('button:has-text("Rendered")');
      await expect(page.locator('[data-testid="markdown-rendered"]')).toBeVisible();
    });

    test('should show agent profile with human-friendly information', async () => {
      await page.click('[role="tab"]:has-text("Profile")');
      
      // Check profile sections
      await expect(page.locator('[data-testid="agent-purpose"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-strengths"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-use-cases"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-statistics"]')).toBeVisible();
    });

    test('should display dynamic pages with external links', async () => {
      await page.click('[role="tab"]:has-text("Pages")');
      
      // Check for pages grid
      await expect(page.locator('[data-testid="pages-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-access-cards"]')).toBeVisible();
      
      // Test page search
      const searchInput = page.locator('input[placeholder*="Search pages"]');
      await searchInput.fill('getting started');
      
      await expect(page.locator('[data-testid="page-card"]:has-text("Getting Started")')).toBeVisible();
    });

    test('should show file system browser with interactive features', async () => {
      await page.click('[role="tab"]:has-text("Workspace")');
      
      // Check file browser components
      await expect(page.locator('[data-testid="file-tree"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="workspace-stats"]')).toBeVisible();
      
      // Test file selection
      const firstFile = page.locator('[data-testid="file-item"]').first();
      await firstFile.click();
      
      await expect(page.locator('[data-testid="file-content-preview"]')).toBeVisible();
    });

    test('should handle back navigation correctly', async () => {
      await page.click('button:has-text("Back to Agents")');
      await expect(page).toHaveURL('/agents');
      await expect(page.locator('h1')).toContainText('Agents');
    });

    test('should refresh agent data when requested', async () => {
      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should render agents list properly on mobile', async () => {
      await page.goto('/agents');
      
      // Check mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="agents-grid"]')).toBeVisible();
      
      // Test mobile search
      const searchInput = page.locator('input[placeholder*="Search agents"]');
      await expect(searchInput).toBeVisible();
    });

    test('should handle mobile navigation in agent detail', async () => {
      await page.goto('/agents/sparc-researcher');
      
      // Check mobile tab layout
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      
      // Test tab switching on mobile
      await page.click('[role="tab"]:has-text("Profile")');
      await expect(page.locator('[data-testid="agent-profile-content"]')).toBeVisible();
    });

    test('should maintain functionality on touch devices', async () => {
      await page.goto('/agents');
      
      // Test touch interactions
      const firstCard = page.locator('[data-testid="agent-card"]').first();
      await firstCard.tap();
      
      await expect(page).toHaveURL(/\/agents\/[^/]+$/);
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should meet performance benchmarks', async () => {
      // Start performance monitoring
      await page.goto('/agents');
      
      // Check page load time
      const navigationStart = await page.evaluate(() => performance.timing.navigationStart);
      const loadComplete = await page.evaluate(() => performance.timing.loadEventEnd);
      const loadTime = loadComplete - navigationStart;
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
    });

    test('should be accessible with keyboard navigation', async () => {
      await page.goto('/agents');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Navigate through search and filters
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async () => {
      await page.goto('/agents/sparc-researcher');
      
      // Check for proper ARIA attributes
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toBeVisible();
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();
      
      // Check for alt text on images/icons
      const icons = page.locator('svg[aria-label]');
      const iconCount = await icons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should work with screen readers', async () => {
      await page.goto('/agents');
      
      // Check for proper heading hierarchy
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();
      
      // Check for descriptive text
      await expect(page.locator('[aria-describedby]')).toBeVisible();
    });
  });

  test.describe('Integration with Backend APIs', () => {
    test('should handle API responses correctly', async () => {
      // Mock successful API response
      await page.route('/api/agents', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            agents: [
              {
                id: 'test-agent',
                name: 'Test Agent',
                description: 'Test description',
                status: 'active',
                version: '1.0.0'
              }
            ]
          })
        });
      });
      
      await page.goto('/agents');
      await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(1);
      await expect(page.locator('text="Test Agent"')).toBeVisible();
    });

    test('should handle API errors gracefully', async () => {
      await page.route('/api/agents', route => {
        route.fulfill({ status: 404 });
      });
      
      await page.goto('/agents');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should implement real-time updates when available', async () => {
      await page.goto('/agents');
      
      // Check for polling or websocket connections
      const refreshButton = page.locator('button:has-text("Refresh")');
      await refreshButton.click();
      
      // Verify data refresh
      await expect(page.locator('text=/Last updated:/i')).toBeVisible();
    });
  });
});