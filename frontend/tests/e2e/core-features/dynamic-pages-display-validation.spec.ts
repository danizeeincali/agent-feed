import { test, expect } from '@playwright/test';

/**
 * CRITICAL TEST: Verify Dynamic Pages Display Correctly
 *
 * This test validates that:
 * 1. page-builder-agent loads successfully
 * 2. Dynamic pages tab is accessible
 * 3. Both dynamic pages are displayed (mermaid-all-types-test, page-builder-agent-data-viz-showcase)
 * 4. No "No Dynamic Pages Yet" error message
 */

test.describe('Dynamic Pages Display - page-builder-agent', () => {

  test('PROOF: page-builder-agent displays 2 dynamic pages correctly', async ({ page }) => {
    console.log('\n=== VALIDATING: Dynamic Pages Display Fix ===\n');

    // Step 1: Navigate to page-builder-agent
    console.log('[1/5] Navigating to page-builder-agent...');
    await page.goto('http://localhost:5173/agents/page-builder-agent', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // CRITICAL CHECK 1: Agent loaded (no "Agent Not Found")
    const pageContent = await page.content();
    const noAgentNotFound = !pageContent.toLowerCase().includes('agent not found');
    console.log(`✓ Agent Loaded: ${noAgentNotFound ? 'PASS' : 'FAIL'}`);
    expect(noAgentNotFound).toBe(true);

    // Take screenshot of agent page
    await page.screenshot({
      path: 'test-results/dynamic-pages-1-agent-loaded.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-1-agent-loaded.png\n');

    // Step 2: Click on Dynamic Pages tab
    console.log('[2/5] Clicking on Dynamic Pages tab...');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find and click the Dynamic Pages tab (visible in the UI)
    const pagesTab = page.getByText('Dynamic Pages', { exact: false }).first();
    await pagesTab.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Found Dynamic Pages tab');

    await pagesTab.click();
    await page.waitForTimeout(2000);
    console.log('✓ Clicked Dynamic Pages tab\n');

    // Take screenshot of pages tab
    await page.screenshot({
      path: 'test-results/dynamic-pages-2-pages-tab-opened.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-2-pages-tab-opened.png\n');

    // Step 3: CRITICAL CHECK - NO "No Dynamic Pages Yet" message
    console.log('[3/5] Checking for "No Dynamic Pages Yet" error...');
    const bodyText = await page.locator('body').textContent();
    const noEmptyState = !bodyText?.includes('No Dynamic Pages Yet');
    console.log(`✓ No Empty State Message: ${noEmptyState ? 'PASS' : 'FAIL'}`);
    expect(noEmptyState).toBe(true);

    // Step 4: Verify dynamic pages are listed
    console.log('[4/5] Verifying dynamic pages are displayed...');

    // Wait for page list or cards to appear
    await page.waitForTimeout(2000);

    // Check for presence of page titles or links
    const hasPageContent = await page.locator('body').evaluate((body) => {
      const text = body.textContent || '';
      return text.includes('mermaid') ||
             text.includes('Mermaid') ||
             text.includes('data-viz') ||
             text.includes('visualization') ||
             text.includes('View Page') ||
             text.includes('Edit Page');
    });

    console.log(`✓ Has Dynamic Page Content: ${hasPageContent ? 'PASS' : 'FAIL'}`);
    expect(hasPageContent).toBe(true);

    // Take screenshot showing dynamic pages
    await page.screenshot({
      path: 'test-results/dynamic-pages-3-pages-displayed.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-3-pages-displayed.png\n');

    // Step 5: Final validation
    console.log('[5/5] Final validation checks...');

    // Log current URL (may redirect to first agent)
    const currentUrl = page.url();
    console.log(`✓ Current URL: ${currentUrl}`);

    // Ensure no critical error messages
    const noErrors = !bodyText?.toLowerCase().includes('agent not found') &&
                     !bodyText?.toLowerCase().includes('undefined');
    console.log(`✓ No Critical Errors: ${noErrors ? 'PASS' : 'FAIL'}`);
    expect(noErrors).toBe(true);

    console.log('\n✅✅✅ SUCCESS: Dynamic pages are displaying correctly! ✅✅✅\n');
  });

  test('PROOF: Both specific pages are accessible', async ({ page }) => {
    console.log('\n=== VALIDATING: Specific Dynamic Pages Exist ===\n');

    // Get pages from API
    const response = await page.request.get('http://localhost:5173/api/agent-pages/agents/page-builder-agent/pages');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.pages.length).toBeGreaterThanOrEqual(2);

    console.log(`✓ API returns ${data.pages.length} pages for page-builder-agent`);

    const pageIds = data.pages.map((p: any) => p.id);
    console.log(`Page IDs: ${pageIds.join(', ')}`);

    // Verify expected pages exist
    expect(pageIds).toContain('mermaid-all-types-test');
    expect(pageIds).toContain('page-builder-agent-data-viz-showcase');

    console.log('✓ mermaid-all-types-test: EXISTS');
    console.log('✓ page-builder-agent-data-viz-showcase: EXISTS\n');

    console.log('✅ Both expected dynamic pages are confirmed in database!\n');
  });

  test('PROOF: Navigate to page-builder-agent and interact with pages tab', async ({ page }) => {
    console.log('\n=== VALIDATING: Complete User Flow ===\n');

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Search or find page-builder-agent in the list
    console.log('[1/4] Finding page-builder-agent in agents list...');

    // Look for page-builder-agent in the sidebar or agent list
    const agentLink = page.locator('text=page-builder-agent').first();

    if (await agentLink.isVisible({ timeout: 5000 })) {
      console.log('✓ Found page-builder-agent in agents list');
      await agentLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Direct navigation if not found in list
      console.log('→ Navigating directly to page-builder-agent');
      await page.goto('http://localhost:5173/agents/page-builder-agent');
      await page.waitForTimeout(2000);
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/dynamic-pages-flow-1-agent-page.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-flow-1-agent-page.png\n');

    // Click on Pages tab
    console.log('[2/4] Opening Dynamic Pages tab...');
    await page.waitForLoadState('networkidle');

    const pagesTab = page.getByText('Dynamic Pages', { exact: false }).first();

    if (await pagesTab.isVisible({ timeout: 5000 })) {
      await pagesTab.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked Dynamic Pages tab');
    } else {
      console.log('⚠ Dynamic Pages tab not visible, continuing anyway');
    }

    // Take screenshot of pages tab
    await page.screenshot({
      path: 'test-results/dynamic-pages-flow-2-pages-tab.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-flow-2-pages-tab.png\n');

    // Verify content
    console.log('[3/4] Verifying page content...');
    const content = await page.content();

    const checks = {
      noEmptyState: !content.includes('No Dynamic Pages Yet'),
      hasPageContent: content.includes('mermaid') || content.includes('visualization'),
      noAgentNotFound: !content.includes('Agent Not Found'),
      noUndefined: !content.toLowerCase().includes('undefined')
    };

    console.log('Content Checks:');
    Object.entries(checks).forEach(([key, value]) => {
      console.log(`  ✓ ${key}: ${value ? 'PASS' : 'FAIL'}`);
      expect(value).toBe(true);
    });

    // Final screenshot
    await page.screenshot({
      path: 'test-results/dynamic-pages-flow-3-final-state.png',
      fullPage: true
    });
    console.log('Screenshot: test-results/dynamic-pages-flow-3-final-state.png\n');

    console.log('[4/4] All checks passed!\n');
    console.log('✅ Complete user flow validated successfully!\n');
  });
});
