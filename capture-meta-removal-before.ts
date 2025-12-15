import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function captureBeforeState() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 10000 });

    await page.waitForTimeout(2000);

    // Count agents
    const agentCards = await page.locator('[data-testid*="agent-card"], .agent-card, [class*="agent"]').count();
    console.log(`Agent cards found: ${agentCards}`);

    // Capture screenshot
    const screenshotDir = '/workspaces/agent-feed/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({
      path: path.join(screenshotDir, 'meta-removal-before.png'),
      fullPage: true
    });

    console.log('✅ BEFORE screenshot captured');

    // Get tier counts
    const tier2Button = page.locator('button:has-text("Tier 2")');
    if (await tier2Button.count() > 0) {
      await tier2Button.click();
      await page.waitForTimeout(1000);
      const tier2Count = await page.locator('[data-testid*="agent-card"], .agent-card').count();
      console.log(`Tier 2 agents: ${tier2Count}`);
    }

  } catch (error) {
    console.error('Error capturing BEFORE state:', error);
  } finally {
    await browser.close();
  }
}

captureBeforeState();
