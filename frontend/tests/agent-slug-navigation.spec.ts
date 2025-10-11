import { test, expect } from '@playwright/test';

/**
 * Agent Slug Navigation Test Suite
 *
 * This test suite validates slug-based navigation for agent profiles.
 * All tests use REAL API calls (no mocks) and capture screenshots.
 *
 * Prerequisites:
 * - API server must be running
 * - Database must contain agent data with slugs
 */

test.describe('Agent Slug Navigation', () => {
  const BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';
  let agents: Array<{ id: string; name: string; slug: string }> = [];

  test.beforeAll(async ({ request }) => {
    // Fetch agents from the real API to get valid slugs
    const response = await request.get(`${BASE_URL}/api/agent-pages`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    agents = data.agents || [];

    // Ensure we have at least 3 agents for testing
    expect(agents.length).toBeGreaterThanOrEqual(3);

    // Verify all agents have slugs
    agents.forEach((agent, index) => {
      expect(agent.slug).toBeTruthy();
      console.log(`Agent ${index + 1}: ${agent.name} (slug: ${agent.slug})`);
    });
  });

  test('1. Should load agents list from API and verify slugs exist', async ({ page }) => {
    // Navigate to the agents list page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of agents list
    await page.screenshot({
      path: 'test-results/screenshots/01-agents-list.png',
      fullPage: true
    });

    // Verify agents are displayed
    const agentElements = await page.locator('[data-testid*="agent"]').count();
    expect(agentElements).toBeGreaterThan(0);

    // Verify each agent has a slug-based link
    for (const agent of agents.slice(0, 5)) {
      const agentLink = page.locator(`a[href*="/agent/${agent.slug}"]`);
      await expect(agentLink).toBeVisible({ timeout: 5000 });
    }

    console.log(`✓ Verified ${agents.length} agents with valid slugs`);
  });

  test('2. Should navigate to agent profile using slug URL', async ({ page }) => {
    const testAgent = agents[0];

    // Navigate directly to agent profile using slug
    await page.goto(`/agent/${testAgent.slug}`);

    // Wait for navigation and content load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow for any animations

    // Take screenshot
    await page.screenshot({
      path: `test-results/screenshots/02-agent-profile-${testAgent.slug}.png`,
      fullPage: true
    });

    // Verify URL contains the slug
    expect(page.url()).toContain(`/agent/${testAgent.slug}`);

    // Verify agent name is displayed
    const agentName = await page.locator('h1, h2').first().textContent();
    expect(agentName).toContain(testAgent.name);

    console.log(`✓ Successfully navigated to ${testAgent.name} using slug: ${testAgent.slug}`);
  });

  test('3. Should display correct agent when using slug in URL', async ({ page }) => {
    // Test with the second agent
    const testAgent = agents[1];

    // Navigate to agent profile
    await page.goto(`/agent/${testAgent.slug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: `test-results/screenshots/03-correct-agent-${testAgent.slug}.png`,
      fullPage: true
    });

    // Verify the correct agent is displayed
    const pageContent = await page.content();
    expect(pageContent).toContain(testAgent.name);

    // Verify agent details are present
    const agentDetails = await page.locator('[data-testid="agent-details"], .agent-profile, .agent-content').first();
    await expect(agentDetails).toBeVisible({ timeout: 5000 });

    // Verify URL matches the agent slug
    expect(page.url()).toContain(testAgent.slug);
    expect(page.url()).not.toContain(testAgent.id); // Should use slug, not ID

    console.log(`✓ Correct agent displayed: ${testAgent.name} (${testAgent.slug})`);
  });

  test('4. Should handle invalid slug with 404 error', async ({ page }) => {
    const invalidSlug = 'this-agent-does-not-exist-12345';

    // Attempt to navigate to invalid slug
    await page.goto(`/agent/${invalidSlug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of error state
    await page.screenshot({
      path: 'test-results/screenshots/04-invalid-slug-404.png',
      fullPage: true
    });

    // Verify error handling (check for 404, error message, or redirect)
    const pageContent = await page.content().catch(() => '');
    const url = page.url();

    // Check for various error indicators
    const has404 = pageContent.toLowerCase().includes('404') ||
                   pageContent.toLowerCase().includes('not found') ||
                   pageContent.toLowerCase().includes('error');

    const isErrorPage = url.includes('404') ||
                        url.includes('error') ||
                        has404;

    // Either we get an error message or redirect to home
    expect(isErrorPage || url === '/' || url.endsWith('/')).toBeTruthy();

    console.log(`✓ Invalid slug handled correctly: ${invalidSlug}`);
  });

  test('5. Should work with multiple agents (test at least 3 different slugs)', async ({ page }) => {
    // Test first 3 agents
    const testAgents = agents.slice(0, 3);

    for (let i = 0; i < testAgents.length; i++) {
      const agent = testAgents[i];

      // Navigate to agent profile
      await page.goto(`/agent/${agent.slug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/05-multiple-agents-${i + 1}-${agent.slug}.png`,
        fullPage: true
      });

      // Verify correct agent is displayed
      expect(page.url()).toContain(agent.slug);
      const pageContent = await page.content();
      expect(pageContent).toContain(agent.name);

      console.log(`✓ Agent ${i + 1}/3: ${agent.name} (${agent.slug}) - OK`);
    }

    console.log(`✓ Successfully tested ${testAgents.length} different agent slugs`);
  });

  test('6. Should maintain slug in URL when navigating back/forward', async ({ page }) => {
    const agent1 = agents[0];
    const agent2 = agents[1];

    // Navigate to first agent
    await page.goto(`/agent/${agent1.slug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of first agent
    await page.screenshot({
      path: `test-results/screenshots/06-navigation-step1-${agent1.slug}.png`,
      fullPage: true
    });

    expect(page.url()).toContain(agent1.slug);
    console.log(`Step 1: Navigated to ${agent1.name}`);

    // Navigate to second agent
    await page.goto(`/agent/${agent2.slug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot of second agent
    await page.screenshot({
      path: `test-results/screenshots/06-navigation-step2-${agent2.slug}.png`,
      fullPage: true
    });

    expect(page.url()).toContain(agent2.slug);
    console.log(`Step 2: Navigated to ${agent2.name}`);

    // Go back using browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot after back navigation
    await page.screenshot({
      path: 'test-results/screenshots/06-navigation-step3-back.png',
      fullPage: true
    });

    // Verify we're back at first agent with correct slug
    expect(page.url()).toContain(agent1.slug);
    expect(page.url()).not.toContain(agent2.slug);
    console.log(`Step 3: Back button returned to ${agent1.name}`);

    // Go forward using browser forward button
    await page.goForward();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Take screenshot after forward navigation
    await page.screenshot({
      path: 'test-results/screenshots/06-navigation-step4-forward.png',
      fullPage: true
    });

    // Verify we're back at second agent with correct slug
    expect(page.url()).toContain(agent2.slug);
    expect(page.url()).not.toContain(agent1.slug);
    console.log(`Step 4: Forward button returned to ${agent2.name}`);

    console.log('✓ Browser back/forward navigation maintains correct slugs');
  });

  test('7. Should preserve slug format in URL (no ID fallback)', async ({ page }) => {
    const testAgent = agents[0];

    // Navigate to agent profile
    await page.goto(`/agent/${testAgent.slug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/07-slug-format-validation.png',
      fullPage: true
    });

    const currentUrl = page.url();

    // Verify URL uses slug, not ID
    expect(currentUrl).toContain(`/agent/${testAgent.slug}`);
    expect(currentUrl).not.toContain(`/agent/${testAgent.id}`);

    // Verify slug format (lowercase, hyphens, no spaces)
    const slugMatch = currentUrl.match(/\/agent\/([^\/\?#]+)/);
    expect(slugMatch).toBeTruthy();

    const extractedSlug = slugMatch![1];
    expect(extractedSlug).toBe(testAgent.slug);
    expect(extractedSlug).toMatch(/^[a-z0-9-]+$/); // Only lowercase, numbers, hyphens
    expect(extractedSlug).not.toContain(' '); // No spaces
    expect(extractedSlug).not.toContain('_'); // No underscores

    console.log(`✓ Slug format validated: ${extractedSlug}`);
  });

  test('8. Should handle slug with special characters correctly', async ({ page }) => {
    // Find an agent with hyphens or numbers in slug
    const agentWithComplexSlug = agents.find(a =>
      a.slug.includes('-') || /\d/.test(a.slug)
    ) || agents[0];

    await page.goto(`/agent/${agentWithComplexSlug.slug}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: `test-results/screenshots/08-special-chars-${agentWithComplexSlug.slug}.png`,
      fullPage: true
    });

    // Verify navigation succeeded
    expect(page.url()).toContain(agentWithComplexSlug.slug);

    const pageContent = await page.content();
    expect(pageContent).toContain(agentWithComplexSlug.name);

    console.log(`✓ Special characters handled: ${agentWithComplexSlug.slug}`);
  });

  test('9. Should handle direct URL access vs click navigation', async ({ page }) => {
    const testAgent = agents[0];

    // First: Direct URL access
    await page.goto(`/agent/${testAgent.slug}`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/screenshots/09-direct-url-access.png',
      fullPage: true
    });

    const directUrl = page.url();
    expect(directUrl).toContain(testAgent.slug);

    // Second: Click navigation from home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click the agent link
    const agentLink = page.locator(`a[href*="/agent/${testAgent.slug}"]`).first();
    await agentLink.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/screenshots/09-click-navigation.png',
      fullPage: true
    });

    const clickUrl = page.url();

    // Both methods should result in the same URL
    expect(clickUrl).toContain(testAgent.slug);
    expect(clickUrl.split('?')[0]).toBe(directUrl.split('?')[0]); // Compare without query params

    console.log('✓ Direct URL and click navigation both work correctly');
  });

  test('10. Should load agent data from API using slug', async ({ page, request }) => {
    const testAgent = agents[0];

    // Intercept API calls to verify slug is used
    const apiCalls: string[] = [];

    page.on('request', req => {
      if (req.url().includes('/api/')) {
        apiCalls.push(req.url());
      }
    });

    // Navigate to agent profile
    await page.goto(`/agent/${testAgent.slug}`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'test-results/screenshots/10-api-slug-usage.png',
      fullPage: true
    });

    // Verify API was called with slug
    const slugApiCall = apiCalls.find(url =>
      url.includes(testAgent.slug) || url.includes('/api/agent-pages')
    );

    expect(slugApiCall).toBeTruthy();
    console.log('API calls made:', apiCalls);

    // Directly verify API endpoint works with slug
    const apiResponse = await request.get(`${BASE_URL}/api/agent-pages/${testAgent.slug}`);
    expect(apiResponse.ok()).toBeTruthy();

    const agentData = await apiResponse.json();
    expect(agentData.slug).toBe(testAgent.slug);
    expect(agentData.name).toBe(testAgent.name);

    console.log(`✓ API correctly returns data for slug: ${testAgent.slug}`);
  });
});

/**
 * Test Results Summary
 *
 * This suite validates:
 * 1. Agents list loads with valid slugs
 * 2. Direct slug URL navigation works
 * 3. Correct agent displays for each slug
 * 4. Invalid slugs return 404/error
 * 5. Multiple agent slugs work correctly
 * 6. Browser back/forward maintains slugs
 * 7. URL format uses slugs (not IDs)
 * 8. Special characters in slugs work
 * 9. Direct URL vs click navigation consistency
 * 10. API uses slugs correctly
 *
 * All tests use real API calls and capture screenshots in:
 * test-results/screenshots/
 */
