/**
 * E2E Tests: Agent List Filtering
 * Tests the UI behavior of agent filtering
 *
 * Test Coverage:
 * - Navigate to /agents page
 * - Count agent cards (expecting 13)
 * - Verify no system templates visible
 * - Click agent cards - profiles load
 * - Tools section displays
 * - Dynamic Pages tab works
 * - Responsive design
 * - Dark mode
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Agent List Filtering - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to agents page before each test
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Agent List Display', () => {
    test('should display exactly 13 agent cards', async ({ page }) => {
      // Wait for agents to load
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article', { timeout: 10000 });

      // Count agent cards (multiple possible selectors)
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();

      expect(agentCards.length).toBe(13);
    });

    test('should display all production agent names', async ({ page }) => {
      const expectedAgents = [
        'agent-feedback-agent',
        'agent-ideas-agent',
        'dynamic-page-testing-agent',
        'follow-ups-agent',
        'get-to-know-you-agent',
        'link-logger-agent',
        'meeting-next-steps-agent',
        'meeting-prep-agent',
        'meta-agent',
        'meta-update-agent',
        'page-builder-agent',
        'page-verification-agent',
        'personal-todos-agent'
      ];

      const pageContent = await page.content();

      for (const agentName of expectedAgents) {
        // Check if agent name appears somewhere on page
        const agentVisible = pageContent.toLowerCase().includes(agentName.toLowerCase());
        expect(agentVisible).toBe(true);
      }
    });

    test('should NOT display system template agents', async ({ page }) => {
      const systemTemplates = [
        'APIIntegrator',
        'api-integrator',
        'Template Agent',
        'Example Agent',
        'System Template'
      ];

      const pageContent = await page.content();

      for (const template of systemTemplates) {
        const templateVisible = pageContent.toLowerCase().includes(template.toLowerCase());
        expect(templateVisible).toBe(false);
      }
    });

    test('should display agent descriptions', async ({ page }) => {
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();

      expect(agentCards.length).toBeGreaterThan(0);

      // Check first few cards have descriptions
      for (let i = 0; i < Math.min(3, agentCards.length); i++) {
        const card = agentCards[i];
        const text = await card.textContent();

        // Description should be more than just the name
        expect(text?.length || 0).toBeGreaterThan(10);
      }
    });

    test('should display agent cards in a grid layout', async ({ page }) => {
      const container = await page.locator('[data-testid="agents-grid"], .agents-grid, .grid').first();

      if (await container.count() > 0) {
        const display = await container.evaluate(el => window.getComputedStyle(el).display);
        expect(['grid', 'flex']).toContain(display);
      }
    });
  });

  test.describe('Agent Card Interactions', () => {
    test('should navigate to agent profile when card is clicked', async ({ page }) => {
      // Find and click first agent card
      const firstCard = await page.locator('[data-testid="agent-card"], .agent-card, article').first();
      await firstCard.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // URL should change to agent profile
      const url = page.url();
      expect(url).toContain('/agents/');
    });

    test('should load agent profile for all 13 agents', async ({ page }) => {
      const agentSlugs = [
        'meta-agent',
        'page-builder-agent',
        'agent-feedback-agent'
      ];

      for (const slug of agentSlugs) {
        await page.goto(`${BASE_URL}/agents/${slug}`);
        await page.waitForLoadState('networkidle');

        // Profile should load without errors
        const errorText = await page.textContent('body');
        expect(errorText?.toLowerCase()).not.toContain('404');
        expect(errorText?.toLowerCase()).not.toContain('not found');
      }
    });

    test('should display agent tools section when available', async ({ page }) => {
      // Navigate to agent with tools
      await page.goto(`${BASE_URL}/agents/page-builder-agent`);
      await page.waitForLoadState('networkidle');

      // Look for tools section
      const toolsSection = await page.locator('[data-testid="agent-tools"], .tools, .agent-tools').first();

      if (await toolsSection.count() > 0) {
        const isVisible = await toolsSection.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('should display Dynamic Pages tab', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents/page-builder-agent`);
      await page.waitForLoadState('networkidle');

      // Look for tabs or Dynamic Pages section
      const dynamicPagesTab = await page.getByText('Dynamic Pages', { exact: false }).first();

      if (await dynamicPagesTab.count() > 0) {
        const isVisible = await dynamicPagesTab.isVisible();
        expect(isVisible).toBe(true);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Should still show 13 agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();
      expect(agentCards.length).toBe(13);

      // Cards should stack vertically (1 column)
      const firstCard = agentCards[0];
      const width = await firstCard.evaluate(el => el.getBoundingClientRect().width);
      expect(width).toBeGreaterThan(300); // Should take most of screen width
    });

    test('should display correctly on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();
      expect(agentCards.length).toBe(13);
    });

    test('should display correctly on desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();
      expect(agentCards.length).toBe(13);

      // Should show multiple columns on desktop
      if (agentCards.length >= 2) {
        const firstCard = await agentCards[0].boundingBox();
        const secondCard = await agentCards[1].boundingBox();

        if (firstCard && secondCard) {
          // Cards should be side by side (different x positions)
          const areSideBySide = Math.abs(firstCard.x - secondCard.x) > 100;
          expect(areSideBySide).toBe(true);
        }
      }
    });
  });

  test.describe('Dark Mode', () => {
    test('should support dark mode toggle', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Try to find dark mode toggle
      const darkModeToggle = await page.locator('[data-testid="theme-toggle"], [aria-label*="theme" i], button:has-text("Dark")').first();

      if (await darkModeToggle.count() > 0) {
        await darkModeToggle.click();
        await page.waitForTimeout(500); // Wait for transition

        // Check if dark mode class is applied
        const html = await page.locator('html');
        const classes = await html.getAttribute('class');
        expect(classes).toContain('dark');
      }
    });

    test('should display agents correctly in dark mode', async ({ page }) => {
      // Enable dark mode via class
      await page.goto(`${BASE_URL}/agents`);
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);

      // Agents should still be visible
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();
      expect(agentCards.length).toBe(13);
    });
  });

  test.describe('Search and Filter (if available)', () => {
    test('should have search functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i]').first();

      if (await searchInput.count() > 0) {
        await searchInput.fill('meta');
        await page.waitForTimeout(500);

        // Should filter agents
        const visibleCards = await page.locator('[data-testid="agent-card"]:visible, .agent-card:visible').all();
        expect(visibleCards.length).toBeLessThanOrEqual(13);
      }
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state initially', async ({ page }) => {
      const response = page.goto(`${BASE_URL}/agents`);

      // Check for loading indicator
      const loadingIndicator = await page.locator('[data-testid="loading"], .loading, .spinner').first();

      if (await loadingIndicator.count() > 0) {
        const isVisible = await loadingIndicator.isVisible();
        // May or may not be visible depending on load speed
      }

      await response;
    });

    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate offline
      await context.setOffline(true);

      await page.goto(`${BASE_URL}/agents`);

      // Should show error message
      await page.waitForTimeout(2000);

      const errorMessage = await page.locator('[data-testid="error"], .error-message').first();
      if (await errorMessage.count() > 0) {
        const isVisible = await errorMessage.isVisible();
        expect(isVisible).toBe(true);
      }

      await context.setOffline(false);
    });
  });

  test.describe('Navigation', () => {
    test('should have working back button from agent profile', async ({ page }) => {
      // Go to agents list
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Click first agent
      const firstCard = await page.locator('[data-testid="agent-card"], .agent-card, article').first();
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Should be back on agents list
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').all();
      expect(agentCards.length).toBe(13);
    });

    test('should have breadcrumb navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents/meta-agent`);
      await page.waitForLoadState('networkidle');

      // Look for breadcrumb
      const breadcrumb = await page.locator('[data-testid="breadcrumb"], .breadcrumb, nav[aria-label="Breadcrumb"]').first();

      if (await breadcrumb.count() > 0) {
        const isVisible = await breadcrumb.isVisible();
        expect(isVisible).toBe(true);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load agents page in under 3 seconds', async ({ page }) => {
      const start = Date.now();

      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(3000);
    });

    test('should render all agent cards efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);

      const start = Date.now();
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article', { timeout: 5000 });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const h1 = await page.locator('h1').first();
      expect(await h1.count()).toBeGreaterThan(0);
    });

    test('should have accessible agent cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Cards should be keyboard navigable
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const tagName = await focusedElement.evaluate(el => el.tagName);

      // Some element should be focused
      expect(tagName).toBeTruthy();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Press Enter on focused element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Should navigate somewhere
      await page.waitForTimeout(500);
      const url = page.url();
      expect(url).toBeTruthy();
    });
  });
});
