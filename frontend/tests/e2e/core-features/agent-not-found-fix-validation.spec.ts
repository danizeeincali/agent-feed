import { test, expect } from '@playwright/test';

/**
 * CRITICAL TEST: Verify "Agent Not Found" error is completely resolved
 *
 * This test validates that navigating to agent URLs via /agents/{slug}
 * does NOT show "Agent Not Found" errors or "undefined" slug issues.
 */

test.describe('Agent Not Found Error - FIXED', () => {

  test('PROOF: Navigate to 3 agents directly via URL - NO "Agent Not Found" errors', async ({ page }) => {
    console.log('\n=== VALIDATING: Agent Not Found Error Fix ===\n');

    // Get agents from API
    const response = await page.request.get('http://localhost:3001/api/agents');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(3);

    const agents = data.data.slice(0, 3);
    console.log(`Testing 3 agents: ${agents.map(a => a.name).join(', ')}\n`);

    let allPassed = true;
    const results = [];

    // Test each agent
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const slug = agent.slug;
      const testNum = i + 1;

      console.log(`[${testNum}/3] Testing: ${agent.name}`);
      console.log(`    Slug: ${slug}`);
      console.log(`    URL: /agents/${slug}`);

      try {
        // Navigate directly to agent URL
        await page.goto(`http://localhost:5173/agents/${slug}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Give page time to render
        await page.waitForTimeout(2000);

        // Take screenshot for proof
        const screenshotPath = `test-results/proof-agent-${testNum}-${slug}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`    Screenshot: ${screenshotPath}`);

        // CRITICAL CHECK 1: URL must contain the slug (not undefined)
        const currentUrl = page.url();
        const urlCheck = currentUrl.includes(`/agents/${slug}`) && !currentUrl.includes('undefined');
        console.log(`    ✓ URL Check: ${urlCheck ? 'PASS' : 'FAIL'} - ${currentUrl}`);
        expect(urlCheck).toBe(true);

        // CRITICAL CHECK 2: NO "Agent Not Found" error
        const pageContent = await page.content();
        const noAgentNotFound = !pageContent.toLowerCase().includes('agent not found');
        console.log(`    ✓ No "Agent Not Found": ${noAgentNotFound ? 'PASS' : 'FAIL'}`);
        expect(noAgentNotFound).toBe(true);

        // CRITICAL CHECK 3: NO "undefined" in page text
        const bodyText = await page.locator('body').textContent();
        const noUndefined = !bodyText?.toLowerCase().includes('undefined');
        console.log(`    ✓ No "undefined": ${noUndefined ? 'PASS' : 'FAIL'}`);
        expect(noUndefined).toBe(true);

        // CRITICAL CHECK 4: Agent name displays
        const heading = await page.locator('h1, h2, h3').first().textContent();
        const hasValidHeading = heading && heading.trim().length > 0 && !heading.toLowerCase().includes('undefined');
        console.log(`    ✓ Valid Heading: ${hasValidHeading ? 'PASS' : 'FAIL'} - "${heading}"`);
        expect(hasValidHeading).toBe(true);

        results.push({
          agent: agent.name,
          slug,
          status: 'PASS',
          screenshot: screenshotPath
        });

        console.log(`    ✅ RESULT: PASS - Agent loaded successfully!\n`);

      } catch (error) {
        console.log(`    ❌ RESULT: FAIL - ${error}\n`);
        allPassed = false;
        results.push({
          agent: agent.name,
          slug,
          status: 'FAIL',
          error: String(error)
        });
      }
    }

    // Print final summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total Agents Tested: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);

    console.log('\nDetailed Results:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.agent} (${r.slug}): ${r.status}`);
      if (r.screenshot) {
        console.log(`   Screenshot: ${r.screenshot}`);
      }
    });

    if (allPassed) {
      console.log('\n✅✅✅ SUCCESS: "Agent Not Found" error is COMPLETELY FIXED! ✅✅✅');
      console.log('All agents loaded successfully with proper slugs and no errors.\n');
    }

    expect(allPassed).toBe(true);
  });

  test('Verify: URL with valid slug shows agent details (not error)', async ({ page }) => {
    console.log('\nValidating: Direct URL navigation works correctly...');

    // Get one agent
    const response = await page.request.get('http://localhost:3001/api/agents');
    const data = await response.json();
    const agent = data.data[0];

    console.log(`Testing agent: ${agent.name} (${agent.slug})`);

    // Navigate to agent
    await page.goto(`http://localhost:5173/agents/${agent.slug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: 'test-results/direct-url-navigation-proof.png',
      fullPage: true
    });

    // Verify all critical elements
    const currentUrl = page.url();
    const pageContent = await page.content();

    console.log(`URL: ${currentUrl}`);
    console.log(`Expected slug in URL: ${agent.slug}`);

    // Assertions
    expect(currentUrl).toContain(agent.slug);
    expect(currentUrl).not.toContain('undefined');
    expect(pageContent.toLowerCase()).not.toContain('agent not found');

    console.log('✅ Direct URL navigation works correctly - no errors!\n');
  });
});
