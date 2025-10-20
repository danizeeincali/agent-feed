import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('SVG Icon Browser Validation', () => {
  test('should display SVG icons correctly in live browser', async ({ page }) => {
    // Enable console logging
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for rendering

    // 1. Capture full page screenshot
    const screenshotPath = '/workspaces/agent-feed/screenshots/svg-icons-browser-verification.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`✅ Screenshot saved: ${screenshotPath}`);

    // 2. Inspect agent icon elements
    const svgIcons = await page.locator('svg').count();
    const emojiIcons = await page.locator('span[role="img"]').count();

    console.log('\n=== ICON COUNT ANALYSIS ===');
    console.log(`SVG Icons: ${svgIcons}`);
    console.log(`Emoji Icons: ${emojiIcons}`);

    // 3. Get detailed SVG information
    const svgElements = await page.locator('svg').all();
    const svgDetails: any[] = [];

    for (let i = 0; i < Math.min(svgElements.length, 5); i++) {
      const svg = svgElements[i];
      const parent = await svg.locator('xpath=..').first();
      const parentClass = await parent.getAttribute('class');
      const svgClass = await svg.getAttribute('class');
      const innerHTML = await svg.innerHTML();

      svgDetails.push({
        index: i,
        parentClass,
        svgClass,
        hasPath: innerHTML.includes('<path'),
        innerHTML: innerHTML.substring(0, 100) + '...'
      });
    }

    console.log('\n=== SVG ELEMENT DETAILS (first 5) ===');
    console.log(JSON.stringify(svgDetails, null, 2));

    // 4. Check for AgentIcon component rendering
    const agentCards = await page.locator('[class*="agent"], [data-testid*="agent"]').count();
    console.log(`\n=== AGENT CARDS ===`);
    console.log(`Agent Cards Found: ${agentCards}`);

    // 5. Analyze console logs
    const agentIconLogs = consoleLogs.filter(log =>
      log.includes('AgentIcon') ||
      log.includes('🎨') ||
      log.includes('🔍') ||
      log.includes('❌')
    );

    console.log('\n=== AGENTICON DEBUG LOGS ===');
    if (agentIconLogs.length > 0) {
      agentIconLogs.slice(0, 20).forEach(log => console.log(log));
      if (agentIconLogs.length > 20) {
        console.log(`... and ${agentIconLogs.length - 20} more logs`);
      }
    } else {
      console.log('⚠️ No AgentIcon debug logs found');
    }

    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`ERROR: ${err}`));
    } else {
      console.log('✅ No console errors');
    }

    // 6. Fetch API data
    const apiResponse = await page.request.get('http://localhost:3001/api/v1/claude-live/prod/agents?tier=all');
    const agents = await apiResponse.json();

    console.log('\n=== API DATA ANALYSIS ===');
    console.log(`Total Agents from API: ${agents.length}`);

    const iconAnalysis = agents.slice(0, 5).map((agent: any) => ({
      name: agent.name,
      icon: typeof agent.icon,
      icon_type: agent.icon_type,
      icon_emoji: agent.icon_emoji,
      hasIconField: !!agent.icon
    }));

    console.log('Sample Agent Icon Data (first 5):');
    console.log(JSON.stringify(iconAnalysis, null, 2));

    // 7. Inspect specific agent icon element
    const firstAgentIcon = page.locator('[class*="agent-icon"], [data-testid*="agent-icon"], svg').first();
    const firstIconExists = await firstAgentIcon.count() > 0;

    if (firstIconExists) {
      const firstIconHTML = await firstAgentIcon.innerHTML().catch(() => 'N/A');
      console.log('\n=== FIRST ICON HTML ===');
      console.log(firstIconHTML.substring(0, 200));
    }

    // 8. Check if lucide-react icons are being loaded
    const hasLucideClass = await page.locator('[class*="lucide"]').count();
    console.log(`\n=== LUCIDE ICONS ===`);
    console.log(`Elements with lucide class: ${hasLucideClass}`);

    // 9. Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      screenshotPath,
      iconCounts: {
        svg: svgIcons,
        emoji: emojiIcons,
        agentCards
      },
      apiData: {
        totalAgents: agents.length,
        sampleIconData: iconAnalysis
      },
      consoleLogs: {
        total: consoleLogs.length,
        agentIconLogs: agentIconLogs.length,
        errors: consoleErrors.length
      },
      svgDetails: svgDetails.slice(0, 5),
      verdict: svgIcons > 0 ? 'SVG icons are rendering' : 'SVG icons NOT rendering - falling back to emoji'
    };

    const reportPath = '/workspaces/agent-feed/screenshots/svg-icon-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Detailed report saved: ${reportPath}`);

    // 10. Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Screenshot: ${screenshotPath}`);
    console.log(`SVG Icons: ${svgIcons}`);
    console.log(`Emoji Icons: ${emojiIcons}`);
    console.log(`Agent Cards: ${agentCards}`);
    console.log(`API Agents: ${agents.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`\nVERDICT: ${report.verdict}`);
    console.log('='.repeat(60));

    // Assertions
    expect(svgIcons).toBeGreaterThan(0);
    expect(agents.length).toBeGreaterThan(0);
  });

  test('should verify AgentIcon component props and rendering', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if React DevTools data is available
    const reactData = await page.evaluate(() => {
      // Try to access React Fiber data
      const rootElement = document.querySelector('#root');
      if (rootElement) {
        const reactKey = Object.keys(rootElement).find(key =>
          key.startsWith('__reactContainer') || key.startsWith('__reactFiber')
        );
        return reactKey ? 'React detected' : 'React not detected';
      }
      return 'Root element not found';
    });

    console.log('\n=== REACT DETECTION ===');
    console.log(reactData);

    // Check for specific icon names in the DOM
    const iconNames = ['Brain', 'Sparkles', 'Target', 'Users', 'MessageSquare'];
    const foundIcons: string[] = [];

    for (const iconName of iconNames) {
      const iconElement = await page.locator(`[data-icon="${iconName}"], [aria-label*="${iconName}"]`).count();
      if (iconElement > 0) {
        foundIcons.push(iconName);
      }
    }

    console.log('\n=== ICON NAME DETECTION ===');
    console.log(`Searched for: ${iconNames.join(', ')}`);
    console.log(`Found: ${foundIcons.join(', ') || 'none'}`);
  });
});
