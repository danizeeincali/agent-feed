import { chromium } from '@playwright/test';

async function validateWithConsole() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });

  // Capture errors
  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]:', error.message);
  });

  try {
    console.log('Navigating to agents page...');
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 15000 });

    await page.waitForTimeout(3000);

    // Check API response in browser
    console.log('\n=== API Response Check ===');
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/claude-live/prod/agents?tier=all');
      const data = await response.json();
      return {
        totalAgents: data.agents?.length || 0,
        tier1: data.agents?.filter((a: any) => a.tier === 1).length || 0,
        tier2: data.agents?.filter((a: any) => a.tier === 2).length || 0,
        hasMeta: data.agents?.some((a: any) => a.slug.includes('meta')) || false
      };
    });

    console.log(JSON.stringify(apiResponse, null, 2));

    // Check DOM state
    console.log('\n=== DOM State Check ===');
    const domState = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid*="agent"], [class*="agent-card"]');
      const agentManagerVisible = document.querySelector('[data-testid="agent-manager"]') !== null;
      const sidebarVisible = document.querySelector('[data-testid*="sidebar"]') !== null;

      return {
        cardCount: cards.length,
        cardSelectors: Array.from(cards).map(c => c.className),
        agentManagerVisible,
        sidebarVisible,
        bodyClasses: document.body.className
      };
    });

    console.log(JSON.stringify(domState, null, 2));

    // Take screenshot with console state
    await page.screenshot({
      path: '/workspaces/agent-feed/screenshots/meta-removal-debug.png',
      fullPage: true
    });

    console.log('\n✅ Debug screenshot saved');

  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await browser.close();
  }
}

validateWithConsole();
