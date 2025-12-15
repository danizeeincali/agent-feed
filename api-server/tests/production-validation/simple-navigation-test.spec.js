import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join('/workspaces/agent-feed/api-server/tests/production-validation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Simple Agent Navigation Test', () => {
  test('Test agents page and navigation', async ({ page }) => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   SIMPLE AGENT NAVIGATION TEST                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const consoleMessages = [];
    const networkRequests = [];

    // Log all console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      console.log(`[${msg.type().toUpperCase()}]:`, text);
    });

    // Log all network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        networkRequests.push({ url, method: request.method() });
        console.log(`[REQUEST]: ${request.method()} ${url}`);
      }
    });

    // Log network responses
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        console.log(`[RESPONSE]: ${response.status()} ${url}`);
        if (response.status() >= 400) {
          try {
            const body = await response.text();
            console.log(`[ERROR BODY]: ${body.substring(0, 500)}`);
          } catch (e) {
            console.log(`[ERROR]: Could not read response body`);
          }
        }
      }
    });

    // Navigate to homepage
    console.log('\n📍 Loading homepage...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'simple-01-homepage.png'), fullPage: true });
    console.log('✅ Homepage loaded');

    // Navigate to agents page
    console.log('\n📍 Navigating to agents page...');
    await page.goto(`${BASE_URL}/agents`, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for either loading to finish or agents to appear
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'simple-02-agents-page.png'), fullPage: true });

    // Check page content
    const bodyText = await page.locator('body').textContent();
    console.log('\n📄 Page content keywords:');
    console.log(`  - Contains "Loading": ${bodyText.includes('Loading')}`);
    console.log(`  - Contains "agent": ${bodyText.toLowerCase().includes('agent')}`);
    console.log(`  - Contains "Disconnected": ${bodyText.includes('Disconnected')}`);
    console.log(`  - Body text length: ${bodyText.length} characters`);

    // Try to find any agent-related elements
    const agentCardsSelector1 = '[data-agent-slug]';
    const agentCardsSelector2 = '.agent-card';
    const agentCardsSelector3 = '[class*="agent"]';

    const count1 = await page.locator(agentCardsSelector1).count();
    const count2 = await page.locator(agentCardsSelector2).count();
    const count3 = await page.locator(agentCardsSelector3).count();

    console.log('\n📊 Element counts:');
    console.log(`  - [data-agent-slug]: ${count1}`);
    console.log(`  - .agent-card: ${count2}`);
    console.log(`  - [class*="agent"]: ${count3}`);

    // Dump HTML structure
    const html = await page.content();
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'agents-page.html'),
      html
    );
    console.log('✅ Saved page HTML to agents-page.html');

    // Wait longer if still loading
    if (bodyText.includes('Loading')) {
      console.log('\n⏳ Page is still loading, waiting additional 10 seconds...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'simple-03-after-wait.png'), fullPage: true });
    }

    // Try to find any clickable agent elements
    const allLinks = await page.locator('a').all();
    console.log(`\n🔗 Found ${allLinks.length} total links on page`);

    let agentLinks = [];
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/agents/')) {
        const text = await link.textContent();
        agentLinks.push({ href, text: text?.substring(0, 50) });
      }
    }

    console.log(`\n🎯 Found ${agentLinks.length} agent links:`);
    agentLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href} - "${link.text}"`);
    });

    if (agentLinks.length > 0) {
      console.log('\n📍 Testing first agent link...');
      const firstAgentHref = agentLinks[0].href;
      await page.goto(`${BASE_URL}${firstAgentHref}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      const agentUrl = page.url();
      console.log(`✅ Navigated to: ${agentUrl}`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'simple-04-agent-profile.png'), fullPage: true });

      // Check agent profile content
      const profileText = await page.locator('body').textContent();
      console.log(`\n📄 Agent profile:`);
      console.log(`  - URL matches slug pattern: ${/\/agents\/[a-z-]+$/.test(agentUrl)}`);
      console.log(`  - Contains agent data: ${profileText.length > 500}`);
      console.log(`  - Contains "undefined": ${profileText.includes('undefined')}`);
    }

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`API Requests made: ${networkRequests.length}`);
    networkRequests.forEach(req => {
      console.log(`  - ${req.method} ${req.url}`);
    });

    const errors = consoleMessages.filter(m => m.type === 'error' && !m.text.includes('WebSocket'));
    console.log(`\nConsole errors (excluding WebSocket): ${errors.length}`);
    errors.forEach(err => {
      console.log(`  - ${err.text}`);
    });
  });
});
