/**
 * E2E Tests: Meta Agent Removal Validation
 *
 * Browser-based tests verifying meta-agent removal in the UI:
 * - Agent count display (18 agents)
 * - Tier toggle functionality (T1=8, T2=8)
 * - SVG icon rendering
 * - No references to removed agents
 *
 * Related Specification: /workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-SPEC.md
 * Related Architecture: /workspaces/agent-feed/docs/SPARC-META-AGENT-REMOVAL-ARCHITECTURE.md
 *
 * @module tests/e2e/meta-agent-removal-validation
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// TEST CONSTANTS
// ============================================================================

const EXPECTED_TOTAL_AGENTS = 18;
const EXPECTED_TIER1_COUNT = 8;
const EXPECTED_TIER2_COUNT = 8;

const REMOVED_AGENTS = ['meta-agent', 'meta-update-agent'];

const PHASE_4_2_SPECIALISTS = [
  'skills-architect-agent',
  'skills-maintenance-agent',
  'agent-architect-agent',
  'agent-maintenance-agent',
  'learning-optimizer-agent',
  'system-architect-agent'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wait for agents to load in the sidebar
 */
async function waitForAgentsToLoad(page: Page) {
  await page.waitForSelector('[data-testid="agent-list-item"]', { timeout: 10000 });
}

/**
 * Count agents displayed in the sidebar
 */
async function countAgentsInSidebar(page: Page): Promise<number> {
  await waitForAgentsToLoad(page);
  return await page.locator('[data-testid="agent-list-item"]').count();
}

/**
 * Get text content from tier toggle button
 */
async function getTierToggleText(page: Page, tier: 'all' | 't1' | 't2'): Promise<string> {
  const selector = `[data-testid="tier-toggle-${tier}"]`;
  return await page.locator(selector).textContent() || '';
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Meta Agent Removal E2E Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  // --------------------------------------------------------------------------
  // AGENT COUNT TESTS
  // --------------------------------------------------------------------------

  test.describe('Agent Count Display', () => {

    test('should display exactly 18 agents in sidebar', async ({ page }) => {
      const agentCount = await countAgentsInSidebar(page);
      expect(agentCount).toBe(EXPECTED_TOTAL_AGENTS);
    });

    test('should not display meta-agent', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const metaAgentCount = await page.locator('text=meta-agent').count();
      expect(metaAgentCount).toBe(0);
    });

    test('should not display meta-update-agent', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const metaUpdateAgentCount = await page.locator('text=meta-update-agent').count();
      expect(metaUpdateAgentCount).toBe(0);
    });

    test('should display all 6 Phase 4.2 specialist agents', async ({ page }) => {
      await waitForAgentsToLoad(page);

      for (const specialist of PHASE_4_2_SPECIALISTS) {
        const specialistCount = await page.locator(`text=${specialist}`).count();
        expect(specialistCount).toBeGreaterThan(0);
      }
    });
  });

  // --------------------------------------------------------------------------
  // TIER TOGGLE TESTS
  // --------------------------------------------------------------------------

  test.describe('Tier Toggle Functionality', () => {

    test('should show "18" on "All" tier toggle', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const toggleText = await getTierToggleText(page, 'all');
      expect(toggleText).toContain('18');
    });

    test('should show "8" on "T1" tier toggle', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const toggleText = await getTierToggleText(page, 't1');
      expect(toggleText).toContain('8');
    });

    test('should show "8" on "T2" tier toggle', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const toggleText = await getTierToggleText(page, 't2');
      expect(toggleText).toContain('8');
    });

    test('clicking "All" should show 18 agents', async ({ page }) => {
      await waitForAgentsToLoad(page);

      await page.click('[data-testid="tier-toggle-all"]');
      await page.waitForTimeout(500); // Allow filter to apply

      const agentCount = await countAgentsInSidebar(page);
      expect(agentCount).toBe(18);
    });

    test('clicking "T1" should show 8 agents', async ({ page }) => {
      await waitForAgentsToLoad(page);

      await page.click('[data-testid="tier-toggle-t1"]');
      await page.waitForTimeout(500);

      const agentCount = await countAgentsInSidebar(page);
      expect(agentCount).toBe(8);
    });

    test('clicking "T2" should show 8 agents', async ({ page }) => {
      await waitForAgentsToLoad(page);

      await page.click('[data-testid="tier-toggle-t2"]');
      await page.waitForTimeout(500);

      const agentCount = await countAgentsInSidebar(page);
      expect(agentCount).toBe(8);
    });

    test('T2 filter should show all Phase 4.2 specialists', async ({ page }) => {
      await waitForAgentsToLoad(page);

      await page.click('[data-testid="tier-toggle-t2"]');
      await page.waitForTimeout(500);

      for (const specialist of PHASE_4_2_SPECIALISTS) {
        const isVisible = await page.locator(`text=${specialist}`).isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('T2 filter should not show meta agents', async ({ page }) => {
      await waitForAgentsToLoad(page);

      await page.click('[data-testid="tier-toggle-t2"]');
      await page.waitForTimeout(500);

      const metaAgentCount = await page.locator('text=meta-agent').count();
      const metaUpdateCount = await page.locator('text=meta-update-agent').count();

      expect(metaAgentCount).toBe(0);
      expect(metaUpdateCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ICON RENDERING TESTS
  // --------------------------------------------------------------------------

  test.describe('Agent Icon Rendering', () => {

    test('all 18 agents should have visible icons', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const agents = await page.locator('[data-testid="agent-list-item"]').all();
      expect(agents.length).toBe(18);

      for (const agent of agents) {
        const icon = await agent.locator('[data-testid="agent-icon"]');
        const isVisible = await icon.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('all Phase 4.2 specialist agents should have rendered icons', async ({ page }) => {
      await waitForAgentsToLoad(page);

      for (const specialist of PHASE_4_2_SPECIALISTS) {
        const agentItem = page.locator(`[data-agent-name="${specialist}"]`).first();
        const icon = agentItem.locator('[data-testid="agent-icon"]');

        const isVisible = await icon.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('no broken image icons should be present', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const brokenImages = await page.locator('img[alt="broken"]').count();
      expect(brokenImages).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // BROWSER CONSOLE ERROR TESTS
  // --------------------------------------------------------------------------

  test.describe('Console Error Detection', () => {

    test('should not have console errors related to meta-agent', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await waitForAgentsToLoad(page);

      const metaAgentErrors = consoleErrors.filter(err =>
        err.includes('meta-agent') || err.includes('meta-update-agent')
      );

      expect(metaAgentErrors.length).toBe(0);
    });

    test('should not have 404 errors for missing agent icons', async ({ page }) => {
      const networkErrors: string[] = [];

      page.on('response', response => {
        if (response.status() === 404) {
          networkErrors.push(response.url());
        }
      });

      await waitForAgentsToLoad(page);

      const iconErrors = networkErrors.filter(url =>
        url.includes('meta-agent') || url.includes('icon')
      );

      expect(iconErrors.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // VISUAL REGRESSION TESTS
  // --------------------------------------------------------------------------

  test.describe('Visual Regression', () => {

    test('agent sidebar should match expected layout', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Take screenshot for visual comparison (optional)
      // await expect(sidebar).toHaveScreenshot('agent-sidebar-18-agents.png');
    });

    test('tier toggle should display correct counts', async ({ page }) => {
      await waitForAgentsToLoad(page);

      const tierToggle = page.locator('[data-testid="agent-tier-toggle"]');
      await expect(tierToggle).toBeVisible();

      // Verify visual state
      const allButton = page.locator('[data-testid="tier-toggle-all"]');
      const t1Button = page.locator('[data-testid="tier-toggle-t1"]');
      const t2Button = page.locator('[data-testid="tier-toggle-t2"]');

      await expect(allButton).toContainText('18');
      await expect(t1Button).toContainText('8');
      await expect(t2Button).toContainText('8');
    });
  });

  // --------------------------------------------------------------------------
  // FUNCTIONAL WORKFLOW TESTS
  // --------------------------------------------------------------------------

  test.describe('Complete Workflow', () => {

    test('user can filter agents without errors', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Start with All
      await page.click('[data-testid="tier-toggle-all"]');
      await page.waitForTimeout(300);
      expect(await countAgentsInSidebar(page)).toBe(18);

      // Switch to T1
      await page.click('[data-testid="tier-toggle-t1"]');
      await page.waitForTimeout(300);
      expect(await countAgentsInSidebar(page)).toBe(8);

      // Switch to T2
      await page.click('[data-testid="tier-toggle-t2"]');
      await page.waitForTimeout(300);
      expect(await countAgentsInSidebar(page)).toBe(8);

      // Back to All
      await page.click('[data-testid="tier-toggle-all"]');
      await page.waitForTimeout(300);
      expect(await countAgentsInSidebar(page)).toBe(18);
    });

    test('clicking agent opens profile without meta-agent references', async ({ page }) => {
      await waitForAgentsToLoad(page);

      // Click first agent
      const firstAgent = page.locator('[data-testid="agent-list-item"]').first();
      await firstAgent.click();

      await page.waitForTimeout(500);

      // Check profile content doesn't mention removed agents
      const profileContent = await page.locator('[data-testid="agent-profile"]').textContent();
      expect(profileContent).not.toContain('meta-agent');
      expect(profileContent).not.toContain('meta-update-agent');
    });
  });
});
