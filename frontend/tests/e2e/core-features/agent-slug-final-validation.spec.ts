import { test, expect } from '@playwright/test';

test.describe('Agent Slug Final Validation - No "Agent Not Found" Error', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('should directly navigate to 3 different agent URLs without any "Agent Not Found" errors', async ({ page }) => {
    console.log('Testing direct navigation to agent URLs...');

    // Get agents from API
    const response = await page.request.get('http://localhost:3001/api/agents');
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(3);

    const agents = data.data.slice(0, 3);
    console.log(`Testing ${agents.length} agents:`, agents.map(a => a.slug).join(', '));

    // Test each agent
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const slug = agent.slug;

      console.log(`\n--- Testing Agent ${i + 1}: ${agent.name} (${slug}) ---`);

      // Navigate directly to agent URL
      await page.goto(`http://localhost:5173/agents/${slug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({
        path: `test-results/agent-${i + 1}-${slug}.png`,
        fullPage: true
      });

      // CRITICAL CHECKS: Verify no error states
      const currentUrl = page.url();
      console.log(`URL: ${currentUrl}`);

      // 1. Verify URL contains the slug (NOT undefined)
      expect(currentUrl).toContain(`/agents/${slug}`);
      expect(currentUrl).not.toContain('undefined');

      // 2. Check for "Agent Not Found" error
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain('agent not found');

      // 3. Check for any "undefined" text in error messages
      const errorElements = await page.locator('[class*="error"], [class*="Error"], [role="alert"]').all();
      for (const errorMsg of errorElements) {
        const text = await errorMsg.textContent();
        if (text) {
          console.log(`Error element found: ${text}`);
          expect(text.toLowerCase()).not.toContain('undefined');
          expect(text.toLowerCase()).not.toContain('agent not found');
        }
      }

      // 4. Verify agent name is displayed (not undefined)
      const heading = await page.locator('h1, h2, h3').first();
      const headingText = await heading.textContent();
      console.log(`Agent heading: ${headingText}`);
      expect(headingText).toBeTruthy();
      expect(headingText?.toLowerCase()).not.toContain('undefined');
      expect(headingText?.trim().length).toBeGreaterThan(0);

      // 5. Verify agent description shows
      const descElements = await page.locator('p, [class*="description"], [class*="Description"]').all();
      let foundDescription = false;
      for (const desc of descElements) {
        const descText = await desc.textContent();
        if (descText && descText.trim().length > 20) {
          console.log(`Description preview: ${descText.substring(0, 80)}...`);
          expect(descText.toLowerCase()).not.toContain('undefined');
          foundDescription = true;
          break;
        }
      }
      expect(foundDescription).toBe(true);

      // 6. Check for any "undefined" text anywhere on visible page
      const bodyText = await page.locator('body').textContent();
      const undefinedMatches = bodyText?.match(/\bundefined\b/gi);
      if (undefinedMatches) {
        console.log(`❌ WARNING: Found ${undefinedMatches.length} instances of "undefined"`);
        const snippet = bodyText?.substring(bodyText.indexOf('undefined') - 50, bodyText.indexOf('undefined') + 50);
        console.log(`Context: ...${snippet}...`);
      }
      expect(undefinedMatches).toBeNull();

      console.log(`✅ Agent ${i + 1} (${agent.name}) loaded successfully!`);
    }

    // Final screenshot
    await page.screenshot({
      path: 'test-results/all-agents-tested-successfully.png',
      fullPage: true
    });

    console.log('\n✅✅✅ ALL TESTS PASSED - NO "Agent Not Found" errors detected! ✅✅✅');
  });

  test('should handle browser back/forward navigation without errors', async ({ page }) => {
    console.log('Testing browser back/forward navigation...');

    // Get first agent from API
    const response = await page.request.get('http://localhost:3001/api/agents');
    const data = await response.json();
    const agent = data.data[0];
    const slug = agent.slug;

    console.log(`Testing with agent: ${agent.name} (${slug})`);

    // Navigate to agent
    await page.goto(`http://localhost:5173/agents/${slug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify agent loads
    expect(page.url()).toContain(`/agents/${slug}`);
    const pageContent1 = await page.content();
    expect(pageContent1.toLowerCase()).not.toContain('agent not found');

    await page.screenshot({ path: 'test-results/nav-test-1-initial.png', fullPage: true });

    // Navigate to home
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:5173/');

    // Go back to agent
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/nav-test-2-after-back.png', fullPage: true });

    // Verify agent still loads correctly
    expect(page.url()).toContain(`/agents/${slug}`);
    const pageContent2 = await page.content();
    expect(pageContent2.toLowerCase()).not.toContain('agent not found');
    expect(page.url()).not.toContain('undefined');

    // Go forward to home
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:5173/');

    // Go back to agent again
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/nav-test-3-after-forward-back.png', fullPage: true });

    // Final verification
    expect(page.url()).toContain(`/agents/${slug}`);
    const pageContent3 = await page.content();
    expect(pageContent3.toLowerCase()).not.toContain('agent not found');
    expect(page.url()).not.toContain('undefined');

    console.log('✅ Browser navigation test passed - no errors!');
  });

  test('should load agents page and verify all agents are clickable', async ({ page }) => {
    console.log('Testing agents page load and card interaction...');

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Wait for agent cards to appear
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 20000 });

    await page.screenshot({ path: 'test-results/agents-page-loaded.png', fullPage: true });

    // Get all agent cards
    const agentCards = await page.locator('[data-testid="agent-card"]').all();
    console.log(`Found ${agentCards.length} agent cards`);
    expect(agentCards.length).toBeGreaterThanOrEqual(3);

    // Click on first 3 agents
    for (let i = 0; i < Math.min(3, agentCards.length); i++) {
      console.log(`Clicking agent card ${i + 1}...`);

      // Get fresh reference
      const cards = await page.locator('[data-testid="agent-card"]').all();
      await cards[i].click();
      await page.waitForTimeout(500);

      // Verify no errors appear after clicking
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain('agent not found');
      expect(pageContent.toLowerCase()).not.toContain('error loading agent');

      await page.screenshot({
        path: `test-results/agents-page-card-${i + 1}-clicked.png`,
        fullPage: true
      });

      console.log(`✅ Agent card ${i + 1} clicked successfully`);
    }

    console.log('✅ All agent cards are clickable and working!');
  });
});
