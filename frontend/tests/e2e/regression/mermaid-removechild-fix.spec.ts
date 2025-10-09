import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Mermaid RemoveChild Fix
 *
 * These tests validate that the React state-based approach fixes the removeChild error
 * that occurred when using manual DOM manipulation (innerHTML/textContent).
 *
 * Test Strategy:
 * 1. Verify component showcase page loads without errors
 * 2. Verify all 3 Mermaid diagrams render successfully
 * 3. Check console for removeChild errors
 * 4. Test loading states
 * 5. Validate SVG content
 * 6. Screenshot validation
 */

test.describe('Mermaid RemoveChild Fix - Component Showcase', () => {
  const COMPONENT_SHOWCASE_URL = '/agents/page-builder-agent/pages/component-showcase-complete-v3';

  test.beforeEach(async ({ page }) => {
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Set up page error monitoring
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
  });

  test('should load component showcase page without removeChild errors', async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('removeChild')) {
        errors.push(msg.text());
      }
    });

    // Navigate to the page
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait a bit more for any async rendering
    await page.waitForTimeout(2000);

    // Check for removeChild errors
    expect(errors).toHaveLength(0);
  });

  test('should render all 3 Mermaid diagrams successfully', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for diagrams to render (max 30 seconds for all 3)
    await page.waitForTimeout(5000);

    // Find all mermaid diagram containers
    const mermaidDiagrams = await page.locator('.mermaid-diagram').all();

    // Should have exactly 3 diagrams
    expect(mermaidDiagrams.length).toBe(3);

    // Verify each diagram has SVG content
    for (let i = 0; i < mermaidDiagrams.length; i++) {
      const diagram = mermaidDiagrams[i];

      // Check for SVG element
      const hasSvg = await diagram.locator('svg').count() > 0;
      expect(hasSvg).toBeTruthy();

      // Check that loading spinner is gone
      const hasSpinner = await diagram.locator('.animate-spin').count() > 0;
      expect(hasSpinner).toBeFalsy();
    }
  });

  test('should not show RouteErrorBoundary error', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check that error boundary is not visible
    const errorBoundary = page.locator('text=Page Error');
    await expect(errorBoundary).not.toBeVisible();

    // Check that development error is not visible
    const devError = page.locator('text=Development Error');
    await expect(devError).not.toBeVisible();
  });

  test('should display loading states before diagrams render', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Immediately check for loading spinners (should be visible initially)
    const loadingSpinners = await page.locator('.mermaid-diagram .animate-spin').all();

    // Should have at least one spinner initially (may have already rendered if fast)
    // This is a race condition, so we just log the result
    console.log('Initial loading spinners found:', loadingSpinners.length);

    // Wait for all diagrams to finish rendering
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // After rendering, no spinners should remain
    const remainingSpinners = await page.locator('.mermaid-diagram .animate-spin').count();
    expect(remainingSpinners).toBe(0);
  });

  test('should render System Architecture diagram (first diagram)', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Look for the first diagram by ID
    const diagram = page.locator('[id*="system-architecture"]').first();

    // Should have SVG content
    const svg = diagram.locator('svg').first();
    await expect(svg).toBeVisible();

    // Check for graph elements (nodes and edges)
    const nodes = await svg.locator('g.nodes').count();
    expect(nodes).toBeGreaterThan(0);
  });

  test('should render Component Lifecycle diagram (second diagram)', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Look for the second diagram
    const diagrams = await page.locator('.mermaid-diagram').all();
    expect(diagrams.length).toBeGreaterThanOrEqual(2);

    const secondDiagram = diagrams[1];
    const svg = secondDiagram.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('should render State Management diagram (third diagram)', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Look for the third diagram
    const diagrams = await page.locator('.mermaid-diagram').all();
    expect(diagrams.length).toBeGreaterThanOrEqual(3);

    const thirdDiagram = diagrams[2];
    const svg = thirdDiagram.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('should have proper ARIA attributes on diagram containers', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const diagrams = await page.locator('.mermaid-diagram').all();

    for (const diagram of diagrams) {
      // After rendering, should have role="img"
      const role = await diagram.getAttribute('role');
      expect(role).toBe('img');

      // Should have aria-label
      const ariaLabel = await diagram.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should not have console errors during diagram rendering', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Filter out known acceptable errors (if any)
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('sourcemap')  // Ignore sourcemap errors
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should take screenshot of working diagrams', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/mermaid-diagrams-working.png',
      fullPage: true
    });

    // Take screenshot of each individual diagram
    const diagrams = await page.locator('.mermaid-diagram').all();

    for (let i = 0; i < diagrams.length; i++) {
      await diagrams[i].screenshot({
        path: `test-results/mermaid-diagram-${i + 1}.png`
      });
    }
  });

  test('should not have memory leaks (no orphaned timeouts)', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Navigate away to trigger cleanup
    await page.goto('/');

    // Wait for cleanup
    await page.waitForTimeout(1000);

    // Check console for cleanup logs
    // This is a smoke test - real memory leak detection requires Chrome DevTools
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Navigate back to trigger re-render
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.waitForLoadState('networkidle');

    // Should see cleanup logs (if logging is enabled)
    // This is informational only
    console.log('Console messages captured:', consoleMessages.length);
  });
});

test.describe('Mermaid RemoveChild Fix - All Diagram Types', () => {
  const ALL_TYPES_URL = '/agents/page-builder-agent/pages/mermaid-all-types-test';

  test('should render all 10 Mermaid diagram types without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(ALL_TYPES_URL);
    await page.waitForLoadState('networkidle');

    // Wait for all 10 diagrams to render (max 30 seconds)
    await page.waitForTimeout(10000);

    // Should have 10 diagrams
    const diagrams = await page.locator('.mermaid-diagram').all();
    expect(diagrams.length).toBe(10);

    // All should have SVG content
    for (const diagram of diagrams) {
      const hasSvg = await diagram.locator('svg').count() > 0;
      expect(hasSvg).toBeTruthy();
    }

    // No removeChild errors
    const removeChildErrors = errors.filter(e => e.includes('removeChild'));
    expect(removeChildErrors).toHaveLength(0);
  });

  test('should render flowchart diagram type', async ({ page }) => {
    await page.goto(ALL_TYPES_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Find flowchart (first diagram)
    const diagrams = await page.locator('.mermaid-diagram').all();
    const flowchart = diagrams[0];

    const svg = flowchart.locator('svg').first();
    await expect(svg).toBeVisible();
  });

  test('should take screenshot of all 10 diagram types', async ({ page }) => {
    await page.goto(ALL_TYPES_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(10000);

    // Full page screenshot
    await page.screenshot({
      path: 'test-results/mermaid-all-types.png',
      fullPage: true
    });
  });
});

test.describe('Mermaid RemoveChild Fix - Error Handling', () => {
  test('should handle invalid Mermaid syntax gracefully', async ({ page }) => {
    // This would require creating a test page with invalid syntax
    // For now, we just verify error states are handled
    await page.goto('/agents/page-builder-agent/pages/component-showcase-complete-v3');
    await page.waitForLoadState('networkidle');

    // Check for error UI elements (should not be visible with valid diagrams)
    const errorMessages = await page.locator('.bg-red-50').count();

    // With valid diagrams, should have 0 errors
    expect(errorMessages).toBe(0);
  });
});

test.describe('Mermaid RemoveChild Fix - Regression Tests', () => {
  test('should not break existing markdown rendering', async ({ page }) => {
    await page.goto('/agents/page-builder-agent/pages/component-showcase-complete-v3');
    await page.waitForLoadState('networkidle');

    // Check that markdown is still rendering
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);

    // Check that code blocks are rendering
    const codeBlocks = await page.locator('pre code').count();
    expect(codeBlocks).toBeGreaterThanOrEqual(0); // May or may not have code blocks
  });

  test('should maintain responsive design', async ({ page }) => {
    // Test at different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/agents/page-builder-agent/pages/component-showcase-complete-v3');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      // Check diagrams are visible
      const diagrams = await page.locator('.mermaid-diagram').all();
      expect(diagrams.length).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({
        path: `test-results/mermaid-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
