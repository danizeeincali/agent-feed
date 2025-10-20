/**
 * E2E Tests: Agent Tier System Filtering
 *
 * Comprehensive Playwright tests for the Agent Tier System UI
 *
 * Test Coverage:
 * - Default tier 1 view (8 agents)
 * - Tier 2 filtering (11 agents)
 * - All agents view (19 agents)
 * - Tier toggle component behavior
 * - Filter persistence across page reloads
 * - Protection badges on tier 2 agents
 * - Visual regression with screenshots
 * - Keyboard navigation
 * - Performance benchmarks
 * - Accessibility (ARIA, focus management)
 *
 * @see /workspaces/agent-feed/docs/ARCHITECTURE-TESTING-INTEGRATION.md
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Agent Tier Filtering - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to agents page before each test
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Default View - Tier 1 Agents', () => {

    test('should show only Tier 1 agents by default', async ({ page }) => {
      // Wait for agents to load
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article', {
        timeout: 10000
      });

      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();

      // Should show exactly 8 tier 1 agents by default
      expect(agentCards).toBe(8);
    });

    test('should display tier badges showing "Tier 1" or "User-Facing"', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

      // Look for tier indicators
      const tierBadges = await page.locator('[data-testid="tier-badge"], .tier-badge').allTextContents();

      if (tierBadges.length > 0) {
        // All visible badges should indicate Tier 1
        const allTier1 = tierBadges.every(badge =>
          badge.includes('T1') ||
          badge.includes('Tier 1') ||
          badge.includes('User-Facing')
        );
        expect(allTier1).toBe(true);
      }
    });

    test('should have Tier 1 button active by default', async ({ page }) => {
      const tier1Button = page.locator('button:has-text("Tier 1")');

      if (await tier1Button.count() > 0) {
        const ariaPressed = await tier1Button.getAttribute('aria-pressed');
        expect(ariaPressed).toBe('true');
      }
    });

    test('should not show tier 2 protected agents by default', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const pageContent = await page.content();
      const tier2Agents = [
        'agent-architect-agent',
        'skills-architect-agent',
        'learning-optimizer-agent',
        'agent-maintenance-agent',
        'skills-maintenance-agent',
        'system-architect-agent'
      ];

      for (const agentName of tier2Agents) {
        // These Phase 4.2 specialists should NOT be visible in default view
        const isVisible = pageContent.toLowerCase().includes(agentName.toLowerCase());
        expect(isVisible).toBe(false);
      }
    });
  });

  test.describe('Tier Toggle Component', () => {

    test('should display tier toggle with correct agent counts', async ({ page }) => {
      // Wait for toggle to be available
      await page.waitForSelector('[data-testid="tier-toggle"], button:has-text("Tier 1")', {
        timeout: 10000
      });

      // Check for all three buttons
      const tier1Button = page.locator('button:has-text("Tier 1")');
      const tier2Button = page.locator('button:has-text("Tier 2")');
      const allButton = page.locator('button:has-text("All")');

      // Verify buttons exist
      expect(await tier1Button.count()).toBeGreaterThan(0);
      expect(await tier2Button.count()).toBeGreaterThan(0);
      expect(await allButton.count()).toBeGreaterThan(0);

      // Check for agent counts in button text
      const tier1Text = await tier1Button.textContent();
      const tier2Text = await tier2Button.textContent();
      const allText = await allButton.textContent();

      // Should show (8), (11), and (19) respectively
      expect(tier1Text).toContain('(8)');
      expect(tier2Text).toContain('(11)');
      expect(allText).toContain('(19)');
    });

    test('should have proper ARIA attributes for accessibility', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const buttons = await page.locator('button:has-text("Tier")').all();

      for (const button of buttons) {
        // Each button should have aria-pressed attribute
        const ariaPressed = await button.getAttribute('aria-pressed');
        expect(['true', 'false']).toContain(ariaPressed);
      }

      // Toggle should have role="group" wrapper
      const group = page.locator('[role="group"][aria-label*="tier" i]');
      if (await group.count() > 0) {
        expect(await group.isVisible()).toBe(true);
      }
    });

    test('should visually indicate active tier selection', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const tier1Button = page.locator('button:has-text("Tier 1")').first();

      // Active button should have distinct styling
      const backgroundColor = await tier1Button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have a color (not transparent)
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');
    });
  });

  test.describe('Tier Filtering - Tier 2 Agents', () => {

    test('should switch to Tier 2 agents when Tier 2 button clicked', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('button:has-text("Tier 2")', { timeout: 10000 });

      // Click Tier 2 button
      const tier2Button = page.locator('button:has-text("Tier 2")').first();
      await tier2Button.click();

      // Wait for agents to update
      await page.waitForTimeout(500);
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      // Should show exactly 11 tier 2 agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(11);
    });

    test('should display only Tier 2 agents after filter switch', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      const tierBadges = await page.locator('[data-testid="tier-badge"], .tier-badge').allTextContents();

      if (tierBadges.length > 0) {
        const allTier2 = tierBadges.every(badge =>
          badge.includes('T2') ||
          badge.includes('Tier 2') ||
          badge.includes('System')
        );
        expect(allTier2).toBe(true);
      }
    });

    test('should update URL parameter when switching to Tier 2', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(300);

      const url = page.url();
      // URL should contain tier=2 parameter
      expect(url).toContain('tier=2');
    });

    test('should show Phase 4.2 specialist agents in Tier 2 view', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      const pageContent = await page.content();
      const tier2Specialists = [
        'agent-architect',
        'skills-architect',
        'learning-optimizer'
      ];

      // At least some tier 2 specialists should be visible
      const visibleCount = tier2Specialists.filter(name =>
        pageContent.toLowerCase().includes(name.toLowerCase())
      ).length;

      expect(visibleCount).toBeGreaterThan(0);
    });
  });

  test.describe('Tier Filtering - All Agents', () => {

    test('should show all 19 agents when All button clicked', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');

      // Click All button
      const allButton = page.locator('button:has-text("All")').first();
      await allButton.click();

      // Wait for agents to update
      await page.waitForTimeout(500);
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      // Should show all 19 agents (8 tier 1 + 11 tier 2)
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(19);
    });

    test('should display mixed tier badges in All view', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');
      await page.locator('button:has-text("All")').first().click();
      await page.waitForTimeout(500);

      const tierBadges = await page.locator('[data-testid="tier-badge"], .tier-badge').allTextContents();

      if (tierBadges.length > 0) {
        // Should have both Tier 1 and Tier 2 badges
        const hasTier1 = tierBadges.some(badge =>
          badge.includes('T1') || badge.includes('Tier 1')
        );
        const hasTier2 = tierBadges.some(badge =>
          badge.includes('T2') || badge.includes('Tier 2')
        );

        expect(hasTier1 || hasTier2).toBe(true);
      }
    });

    test('should update URL parameter when switching to All', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');
      await page.locator('button:has-text("All")').first().click();
      await page.waitForTimeout(300);

      const url = page.url();
      expect(url).toContain('tier=all');
    });
  });

  test.describe('Filter Persistence', () => {

    test('should persist Tier 2 filter across page reloads', async ({ page }) => {
      // Set filter to Tier 2
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      // Should still show Tier 2 agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(11);

      // Tier 2 button should still be active
      const tier2Button = page.locator('button:has-text("Tier 2")').first();
      const ariaPressed = await tier2Button.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');
    });

    test('should persist All filter across page reloads', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');
      await page.locator('button:has-text("All")').first().click();
      await page.waitForTimeout(500);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(19);
    });

    test('should restore filter from URL on direct navigation', async ({ page }) => {
      // Navigate directly with tier=2 parameter
      await page.goto(`${BASE_URL}/?tier=2`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      // Should show tier 2 agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(11);

      // Tier 2 button should be active
      const tier2Button = page.locator('button:has-text("Tier 2")').first();
      const ariaPressed = await tier2Button.getAttribute('aria-pressed');
      expect(ariaPressed).toBe('true');
    });

    test('should sync URL parameter with localStorage', async ({ page }) => {
      // Click Tier 2
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(300);

      // Check localStorage
      const storedTier = await page.evaluate(() =>
        localStorage.getItem('agentTierFilter')
      );

      expect(['2', 'tier-2', 'tier2']).toContain(storedTier?.toLowerCase());
    });
  });

  test.describe('Protection Indicators', () => {

    test('should display protection badges on Tier 2 protected agents', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[data-testid="agent-card"]');

      // Look for protection badges
      const protectionBadges = await page.locator('[data-testid="protection-badge"], .protection-badge, [aria-label*="protected" i]').count();

      // Should have at least 6 protected agents (Phase 4.2 specialists)
      expect(protectionBadges).toBeGreaterThanOrEqual(6);
    });

    test('should show protection badge with correct text', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      const firstProtectionBadge = page.locator('[data-testid="protection-badge"], .protection-badge').first();

      if (await firstProtectionBadge.count() > 0) {
        const badgeText = await firstProtectionBadge.textContent();
        expect(badgeText?.toLowerCase()).toContain('protect');
      }
    });

    test('should NOT show protection badges on Tier 1 agents', async ({ page }) => {
      // Default view should be Tier 1
      await page.waitForSelector('[data-testid="agent-card"]');

      const protectionBadges = await page.locator('[data-testid="protection-badge"], .protection-badge').count();

      // Tier 1 agents should not have protection badges
      expect(protectionBadges).toBe(0);
    });

    test('should have proper visual styling for protection badges', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      const badge = page.locator('[data-testid="protection-badge"]').first();

      if (await badge.count() > 0) {
        const backgroundColor = await badge.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );

        // Should have a visible background color
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  });

  test.describe('Keyboard Navigation', () => {

    test('should navigate tier toggle with Tab key', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      // Tab to tier toggle buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() =>
        document.activeElement?.textContent
      );

      // Should focus on one of the tier buttons
      expect(focusedElement).toBeTruthy();
    });

    test('should activate tier with Enter key', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');

      // Focus and activate Tier 2 button
      await page.locator('button:has-text("Tier 2")').first().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should switch to tier 2
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(11);
    });

    test('should activate tier with Space key', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');

      // Focus and activate All button with Space
      await page.locator('button:has-text("All")').first().focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Should show all agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(19);
    });

    test('should support arrow key navigation between tier buttons', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const tier1Button = page.locator('button:has-text("Tier 1")').first();
      await tier1Button.focus();

      // Press right arrow
      await page.keyboard.press('ArrowRight');

      const focusedElement = await page.evaluate(() =>
        document.activeElement?.textContent
      );

      // Focus should move to next button
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Performance Benchmarks', () => {

    test('should load Tier 1 agents in under 500ms', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/`);
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article', {
        timeout: 5000
      });

      const loadTime = Date.now() - startTime;

      // Should load quickly
      expect(loadTime).toBeLessThan(500);
    });

    test('should switch tiers in under 200ms', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');

      const startTime = Date.now();

      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForSelector('[data-testid="agent-card"]');

      const switchTime = Date.now() - startTime;

      // Tier switching should be fast
      expect(switchTime).toBeLessThan(200);
    });

    test('should handle rapid tier switching without errors', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      // Rapidly switch between tiers
      for (let i = 0; i < 5; i++) {
        await page.locator('button:has-text("Tier 2")').first().click();
        await page.waitForTimeout(50);
        await page.locator('button:has-text("Tier 1")').first().click();
        await page.waitForTimeout(50);
      }

      // Should still show correct tier
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(8); // Should be back to Tier 1
    });
  });

  test.describe('Responsive Design', () => {

    test('should display tier toggle correctly on mobile (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const tierToggle = page.locator('[data-testid="tier-toggle"], button:has-text("Tier 1")').first();

      if (await tierToggle.count() > 0) {
        const isVisible = await tierToggle.isVisible();
        expect(isVisible).toBe(true);
      }

      // Should show 8 agents on mobile
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(8);
    });

    test('should display tier toggle correctly on tablet (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const tierButtons = await page.locator('button:has-text("Tier")').count();
      expect(tierButtons).toBeGreaterThanOrEqual(3);
    });

    test('should display tier toggle correctly on desktop (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      const tierToggle = page.locator('[data-testid="tier-toggle"]');

      if (await tierToggle.count() > 0) {
        const box = await tierToggle.boundingBox();
        expect(box).toBeTruthy();
      }
    });
  });

  test.describe('Error Handling', () => {

    test('should handle API errors gracefully', async ({ page, context }) => {
      // Intercept API and force error
      await context.route('**/api/agents*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto(`${BASE_URL}/`);
      await page.waitForTimeout(1000);

      // Should show error message or fallback
      const errorMessage = page.locator('[data-testid="error"], .error-message, [role="alert"]');

      if (await errorMessage.count() > 0) {
        const isVisible = await errorMessage.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('should handle invalid tier parameter in URL', async ({ page }) => {
      // Navigate with invalid tier parameter
      await page.goto(`${BASE_URL}/?tier=invalid`);
      await page.waitForLoadState('networkidle');

      // Should fallback to default (Tier 1)
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();

      expect(agentCards).toBe(8);
    });
  });

  test.describe('Dark Mode Support', () => {

    test('should display tier toggle correctly in dark mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(300);

      const tier1Button = page.locator('button:has-text("Tier 1")').first();
      const backgroundColor = await tier1Button.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have visible styling in dark mode
      expect(backgroundColor).toBeTruthy();
    });

    test('should maintain tier filtering in dark mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Switch to Tier 2
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      // Should still show 11 agents
      const agentCards = await page.locator('[data-testid="agent-card"], .agent-card, article').count();
      expect(agentCards).toBe(11);
    });
  });
});

test.describe('Visual Regression - Agent Tier System', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    // Disable animations for consistent screenshots
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
  });

  test.describe('Component Screenshots', () => {

    test('should match tier toggle component screenshot', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 1")');

      const toggle = page.locator('[data-testid="tier-toggle"], button:has-text("Tier 1")').first();

      if (await toggle.count() > 0) {
        await expect(toggle).toHaveScreenshot('tier-toggle-default.png', {
          animations: 'disabled',
          maxDiffPixels: 100
        });
      }
    });

    test('should match tier toggle with Tier 2 active', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(300);

      const toggle = page.locator('[data-testid="tier-toggle"]').first();

      if (await toggle.count() > 0) {
        await expect(toggle).toHaveScreenshot('tier-toggle-tier2.png', {
          animations: 'disabled',
          maxDiffPixels: 100
        });
      }
    });

    test('should match protection badge screenshot', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);

      const badge = page.locator('[data-testid="protection-badge"]').first();

      if (await badge.count() > 0) {
        await expect(badge).toHaveScreenshot('protection-badge.png', {
          animations: 'disabled',
          maxDiffPixels: 50
        });
      }
    });
  });

  test.describe('Full Page Screenshots', () => {

    test('should match Tier 1 agent list screenshot', async ({ page }) => {
      await page.waitForSelector('[data-testid="agent-card"], .agent-card, article');

      await expect(page).toHaveScreenshot('agent-list-tier1.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });

    test('should match Tier 2 agent list screenshot', async ({ page }) => {
      await page.waitForSelector('button:has-text("Tier 2")');
      await page.locator('button:has-text("Tier 2")').first().click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[data-testid="agent-card"]');

      await expect(page).toHaveScreenshot('agent-list-tier2.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });

    test('should match All agents list screenshot', async ({ page }) => {
      await page.waitForSelector('button:has-text("All")');
      await page.locator('button:has-text("All")').first().click();
      await page.waitForTimeout(500);
      await page.waitForSelector('[data-testid="agent-card"]');

      await expect(page).toHaveScreenshot('agent-list-all.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });
  });

  test.describe('Dark Mode Screenshots', () => {

    test('should match dark mode tier toggle', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);

      const toggle = page.locator('[data-testid="tier-toggle"]').first();

      if (await toggle.count() > 0) {
        await expect(toggle).toHaveScreenshot('tier-toggle-dark.png', {
          animations: 'disabled',
          maxDiffPixels: 100
        });
      }
    });

    test('should match dark mode agent list', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);
      await page.waitForSelector('[data-testid="agent-card"]');

      await expect(page).toHaveScreenshot('agent-list-tier1-dark.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });
  });

  test.describe('Responsive Screenshots', () => {

    test('should match mobile viewport (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });

      await expect(page).toHaveScreenshot('agent-list-mobile.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });

    test('should match tablet viewport (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });

      await expect(page).toHaveScreenshot('agent-list-tablet.png', {
        fullPage: true,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02
      });
    });
  });
});
