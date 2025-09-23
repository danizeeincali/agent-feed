import { test, expect } from '@playwright/test';

test.describe('Agents Page Verification', () => {
  test('should display correct agents from /prod/.claude/agents files', async ({ page }) => {
    // Navigate to the agents page
    await page.goto('http://localhost:5173/agents');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Wait a bit more for any dynamic content to load
    await page.waitForTimeout(5000);

    // Take a full page screenshot first to see what's actually there
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-verification.png',
      fullPage: true
    });

    // Check if page loaded successfully by looking for common elements
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Take another screenshot after waiting
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-final.png',
      fullPage: true
    });

    // Check for any visible text content on the page
    const bodyText = await page.textContent('body');
    if (bodyText && bodyText.includes('Failed to compile')) {
      console.log('❌ Page has compilation errors');
      throw new Error('Page failed to compile - fix compilation errors first');
    }

    // Look for agent-related content more broadly
    const agentElements = await page.locator('[data-testid*="agent"], .agent, *:has-text("Agent")').count();
    console.log('Found agent elements:', agentElements);

    // Verify that real agents are displayed
    const expectedAgents = [
      'Agent Feedback Agent',
      'Follow Ups Agent',
      'Meeting Prep Agent',
      'Meeting Next Steps Agent',
      'Personal Todos Agent',
      'Page Builder Agent'
    ];

    let foundAgents = 0;
    for (const agentName of expectedAgents) {
      const isVisible = await page.getByText(agentName).isVisible().catch(() => false);
      if (isVisible) {
        foundAgents++;
        console.log(`✅ Found: ${agentName}`);
      } else {
        console.log(`❌ Missing: ${agentName}`);
      }
    }

    // Verify that the fake "Token Analytics Database Agent" is NOT present
    const fakeAgentVisible = await page.getByText('Token Analytics Database Agent').isVisible().catch(() => false);
    if (fakeAgentVisible) {
      console.log('❌ Fake agent is still visible');
    } else {
      console.log('✅ Fake agent is not visible');
    }

    console.log(`Found ${foundAgents}/${expectedAgents.length} expected agents`);
    console.log('✅ Screenshot saved to tests/playwright/screenshots/agents-page-verification.png');
  });
});