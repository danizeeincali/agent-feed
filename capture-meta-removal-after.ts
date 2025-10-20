import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function captureAfterState() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle', timeout: 10000 });

    await page.waitForTimeout(2000);

    // Count total agents
    const agentCards = await page.locator('[data-testid*="agent-card"], .agent-card, [class*="agent"]').count();
    console.log(`Total agent cards: ${agentCards}`);

    // Capture full page screenshot
    const screenshotDir = '/workspaces/agent-feed/screenshots';
    await page.screenshot({
      path: path.join(screenshotDir, 'meta-removal-after-all.png'),
      fullPage: true
    });

    console.log('✅ AFTER (all agents) screenshot captured');

    // Click Tier 2 filter
    const tier2Button = page.locator('button:has-text("Tier 2")');
    if (await tier2Button.count() > 0) {
      console.log('Clicking Tier 2 filter...');
      await tier2Button.click();
      await page.waitForTimeout(2000);

      const tier2Count = await page.locator('[data-testid*="agent-card"], .agent-card, [class*="agent"]').count();
      console.log(`Tier 2 agent cards: ${tier2Count}`);

      // Capture Tier 2 screenshot
      await page.screenshot({
        path: path.join(screenshotDir, 'meta-removal-after-tier2.png'),
        fullPage: true
      });

      console.log('✅ AFTER (Tier 2 only) screenshot captured');
    }

    // Verify specialist agents visible
    const specialists = [
      'agent-architect-agent',
      'skills-architect-agent',
      'learning-optimizer-agent',
      'system-architect-agent'
    ];

    console.log('\n=== Specialist Agent Verification ===');
    for (const slug of specialists) {
      const visible = await page.locator(`[data-testid*="${slug}"], :has-text("${slug}")`).count();
      console.log(`${slug}: ${visible > 0 ? '✅ VISIBLE' : '❌ NOT FOUND'}`);
    }

    // Check for SVG icons (not emojis)
    const svgIcons = await page.locator('svg[class*="agent-icon"], svg[data-testid*="icon"]').count();
    console.log(`\nSVG icons found: ${svgIcons}`);

    // Verify meta agents NOT present
    console.log('\n=== Meta Agent Verification (should be ABSENT) ===');
    const metaAgent = await page.locator(':has-text("meta-agent")').count();
    const metaUpdateAgent = await page.locator(':has-text("meta-update-agent")').count();
    console.log(`meta-agent: ${metaAgent === 0 ? '✅ REMOVED' : '❌ STILL PRESENT'}`);
    console.log(`meta-update-agent: ${metaUpdateAgent === 0 ? '✅ REMOVED' : '❌ STILL PRESENT'}`);

  } catch (error) {
    console.error('Error capturing AFTER state:', error);
  } finally {
    await browser.close();
  }
}

captureAfterState();
