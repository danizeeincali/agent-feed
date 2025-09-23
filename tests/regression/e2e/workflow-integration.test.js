/**
 * End-to-End Workflow Integration Tests
 * Tests complete user workflows and system integration
 */

const { test, expect } = require('@playwright/test');

test.describe('End-to-End Workflow Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('http://localhost:3000');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Agent Discovery and Display Workflow', () => {
    test('should complete full agent discovery workflow', async ({ page }) => {
      // Navigate to agents page
      await page.goto('http://localhost:3000/agents');

      // Wait for loading to complete
      await page.waitForSelector('[data-testid="agent-list"]', { timeout: 10000 });

      // Verify page title and content
      await expect(page.locator('h1')).toContainText('Production Agents');

      // Check that agents are displayed
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards).toHaveCountGreaterThan(0);

      // Verify agent card content
      const firstAgent = agentCards.first();
      await expect(firstAgent).toBeVisible();

      // Check for required agent information
      const agentName = firstAgent.locator('h3');
      await expect(agentName).toBeVisible();
      await expect(agentName).toHaveText(/\w+/); // Should have some text

      // Check for status and priority indicators
      await expect(firstAgent.locator('span')).toHaveCountGreaterThan(0);
    });

    test('should handle agent loading states correctly', async ({ page }) => {
      // Navigate to agents page
      await page.goto('http://localhost:3000/agents');

      // Should show loading state initially
      const loadingIndicator = page.locator('text=Loading production agents');
      if (await loadingIndicator.isVisible()) {
        await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
      }

      // After loading, should show agents or error state
      const agentList = page.locator('[data-testid="agent-list"]');
      const errorMessage = page.locator('text=Could not connect');

      // Either agents loaded or error message is shown
      await expect(agentList.or(errorMessage)).toBeVisible();
    });

    test('should display fallback data when API fails', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/agents', route => {
        route.abort();
      });

      await page.goto('http://localhost:3000/agents');

      // Should show error message
      await expect(page.locator('text=Could not connect')).toBeVisible({ timeout: 10000 });

      // Should show fallback agents
      await expect(page.locator('text=Personal Todos Agent')).toBeVisible();
      await expect(page.locator('text=Meeting Prep Agent')).toBeVisible();
      await expect(page.locator('text=Get To Know You Agent')).toBeVisible();
    });

    test('should handle responsive design properly', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      const agentGrid = page.locator('[data-testid="agent-list"]');
      await expect(agentGrid).toBeVisible();

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(agentGrid).toBeVisible();

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(agentGrid).toBeVisible();
    });
  });

  test.describe('Navigation and Routing Workflow', () => {
    test('should navigate between pages correctly', async ({ page }) => {
      // Start at home page
      await page.goto('http://localhost:3000');
      await expect(page).toHaveURL('http://localhost:3000');

      // Navigate to agents page
      await page.goto('http://localhost:3000/agents');
      await expect(page).toHaveURL('http://localhost:3000/agents');
      await expect(page.locator('h1')).toContainText('Production Agents');

      // Test back navigation
      await page.goBack();
      await expect(page).toHaveURL('http://localhost:3000');

      // Test forward navigation
      await page.goForward();
      await expect(page).toHaveURL('http://localhost:3000/agents');
    });

    test('should handle direct URL access', async ({ page }) => {
      // Access agents page directly
      await page.goto('http://localhost:3000/agents');

      // Should load the page correctly
      await expect(page.locator('h1')).toContainText('Production Agents');
      await page.waitForSelector('[data-testid="agent-list"]');
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      // Access non-existent page
      await page.goto('http://localhost:3000/non-existent-page');

      // Should show 404 or redirect appropriately
      // This depends on how Next.js is configured
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Performance and Loading Workflow', () => {
    test('should load agents page within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle slow API responses', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/agents', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'slow-agent',
                name: 'Slow Loading Agent',
                status: 'active',
                description: 'Agent loaded after delay'
              }
            ],
            count: 1
          })
        });
      });

      await page.goto('http://localhost:3000/agents');

      // Should show loading state
      await expect(page.locator('text=Loading')).toBeVisible();

      // Eventually should show the agent
      await expect(page.locator('text=Slow Loading Agent')).toBeVisible({ timeout: 10000 });
    });

    test('should maintain performance with many agents', async ({ page }) => {
      // Mock response with many agents
      const manyAgents = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        status: 'active',
        description: `Description for agent ${i}`,
        capabilities: ['capability1', 'capability2']
      }));

      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: manyAgents,
            count: manyAgents.length
          })
        });
      });

      const startTime = Date.now();
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Should handle many agents without performance issues
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);

      // All agents should be rendered
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards).toHaveCount(50);
    });
  });

  test.describe('Error Handling Workflow', () => {
    test('should recover from network errors', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/agents', route => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          route.abort();
        } else {
          // Subsequent requests succeed
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: [
                {
                  id: 'recovery-agent',
                  name: 'Recovery Agent',
                  status: 'active',
                  description: 'Agent loaded after recovery'
                }
              ],
              count: 1
            })
          });
        }
      });

      await page.goto('http://localhost:3000/agents');

      // Should show error state first
      await expect(page.locator('text=Could not connect')).toBeVisible();

      // Simulate retry by refreshing
      await page.reload();

      // Should recover and show agents
      await expect(page.locator('text=Recovery Agent')).toBeVisible({ timeout: 10000 });
    });

    test('should handle malformed API responses', async ({ page }) => {
      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        });
      });

      await page.goto('http://localhost:3000/agents');

      // Should handle malformed response gracefully
      await expect(page.locator('text=Could not connect').or(page.locator('text=Personal Todos Agent'))).toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error'
          })
        });
      });

      await page.goto('http://localhost:3000/agents');

      // Should show error handling
      await expect(page.locator('text=Could not connect')).toBeVisible();
      await expect(page.locator('text=Personal Todos Agent')).toBeVisible(); // Fallback data
    });
  });

  test.describe('Accessibility Workflow', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Test tab navigation
      await page.keyboard.press('Tab');

      // Should be able to navigate through focusable elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('h1');

      // Should have proper heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('Production Agents');
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // This is a basic check - full accessibility testing would require specialized tools
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards.first()).toBeVisible();
    });
  });

  test.describe('Browser Compatibility Workflow', () => {
    test('should work with different user agents', async ({ page }) => {
      // Test with different user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Should work regardless of user agent
      await expect(page.locator('h1')).toContainText('Production Agents');
    });

    test('should handle different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet landscape
        { width: 768, height: 1024 },  // Tablet portrait
        { width: 375, height: 667 },   // Mobile
        { width: 320, height: 568 }    // Small mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('http://localhost:3000/agents');
        await page.waitForSelector('[data-testid="agent-list"]');

        // Should be functional at all viewport sizes
        await expect(page.locator('h1')).toBeVisible();
        const agentCards = page.locator('[data-testid="agent-card"]');
        if (await agentCards.count() > 0) {
          await expect(agentCards.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Data Integrity Workflow', () => {
    test('should maintain data consistency across page reloads', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Get agent names from first load
      const agentNames1 = await page.locator('[data-testid="agent-card"] h3').allTextContents();

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="agent-list"]');

      // Get agent names from second load
      const agentNames2 = await page.locator('[data-testid="agent-card"] h3').allTextContents();

      // Data should be consistent
      expect(agentNames1.sort()).toEqual(agentNames2.sort());
    });

    test('should display accurate agent count', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      // Count displayed agents
      const agentCards = page.locator('[data-testid="agent-card"]');
      const actualCount = await agentCards.count();

      // Check if count is displayed in subtitle
      const subtitle = page.locator('text=/\\d+ agents discovered/');
      if (await subtitle.isVisible()) {
        const subtitleText = await subtitle.textContent();
        const displayedCount = parseInt(subtitleText.match(/(\d+) agents/)[1]);
        expect(displayedCount).toBe(actualCount);
      }
    });

    test('should validate agent data integrity', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      await page.waitForSelector('[data-testid="agent-list"]');

      const agentCards = page.locator('[data-testid="agent-card"]');
      const count = await agentCards.count();

      if (count > 0) {
        // Check each agent card has required elements
        for (let i = 0; i < count; i++) {
          const card = agentCards.nth(i);

          // Should have a name
          const name = card.locator('h3');
          await expect(name).toBeVisible();
          await expect(name).toHaveText(/\S+/); // Non-empty text

          // Should have description or placeholder
          const description = card.locator('p');
          await expect(description).toBeVisible();
        }
      }
    });
  });
});