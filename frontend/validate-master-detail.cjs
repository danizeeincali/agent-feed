#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots/master-detail-validation');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const validationResults = {
  timestamp: new Date().toISOString(),
  testEnvironment: {
    frontendUrl: FRONTEND_URL,
    viewport: '1280x720'
  },
  tests: {},
  screenshots: [],
  successCriteria: {},
  consoleErrors: [],
  consoleWarnings: [],
  overallStatus: 'PENDING'
};

async function validateMasterDetailLayout() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      validationResults.consoleErrors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    } else if (msg.type() === 'warning') {
      validationResults.consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    validationResults.consoleErrors.push(`Page Error: ${error.message}`);
    console.log('❌ Page Error:', error.message);
  });

  try {
    console.log('\n' + '='.repeat(60));
    console.log('MASTER-DETAIL AGENTS LAYOUT VALIDATION');
    console.log('='.repeat(60) + '\n');

    // Test 1: Navigate and verify layout structure
    console.log('Test 1: Layout Structure Validation');
    console.log('─'.repeat(60));

    await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Full page screenshot
    const screenshotPath1 = path.join(SCREENSHOTS_DIR, '01-full-page-layout.png');
    await page.screenshot({ path: screenshotPath1, fullPage: true });
    validationResults.screenshots.push('01-full-page-layout.png');
    console.log('✅ Full page screenshot captured');

    // Check for sidebar
    const sidebarSelectors = [
      '[class*="sidebar"]',
      '[class*="agent-list"]',
      '[class*="AgentList"]',
      'aside',
      '[role="complementary"]'
    ];

    let sidebar = null;
    let sidebarVisible = false;
    for (const selector of sidebarSelectors) {
      try {
        sidebar = await page.locator(selector).first();
        sidebarVisible = await sidebar.isVisible();
        if (sidebarVisible) {
          console.log(`✅ Sidebar found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    validationResults.tests.sidebarVisible = sidebarVisible;

    if (sidebarVisible && sidebar) {
      const screenshotPath2 = path.join(SCREENSHOTS_DIR, '02-sidebar-closeup.png');
      await sidebar.screenshot({ path: screenshotPath2 });
      validationResults.screenshots.push('02-sidebar-closeup.png');
      console.log('✅ Sidebar screenshot captured');

      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        console.log(`📏 Sidebar width: ${sidebarBox.width}px (expected ~320px)`);
        validationResults.tests.sidebarWidth = sidebarBox.width;
        validationResults.tests.sidebarWidthCorrect = sidebarBox.width > 280 && sidebarBox.width < 360;
      }
    } else {
      console.log('❌ Sidebar not visible');
    }

    // Check for detail panel
    const detailSelectors = [
      '[class*="detail"]',
      '[class*="profile"]',
      '[class*="Profile"]',
      '[class*="agent-profile"]',
      'main',
      '[role="main"]'
    ];

    let detailPanel = null;
    let detailVisible = false;
    for (const selector of detailSelectors) {
      try {
        detailPanel = await page.locator(selector).first();
        detailVisible = await detailPanel.isVisible();
        if (detailVisible) {
          console.log(`✅ Detail panel found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    validationResults.tests.detailPanelVisible = detailVisible;

    if (detailVisible && detailPanel) {
      const screenshotPath3 = path.join(SCREENSHOTS_DIR, '03-detail-panel-closeup.png');
      await detailPanel.screenshot({ path: screenshotPath3 });
      validationResults.screenshots.push('03-detail-panel-closeup.png');
      console.log('✅ Detail panel screenshot captured');
    } else {
      console.log('❌ Detail panel not visible');
    }

    console.log('');

    // Test 2: Visual Components
    console.log('Test 2: Visual Component Validation');
    console.log('─'.repeat(60));

    // Search bar
    const searchInput = await page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    validationResults.tests.searchBarPresent = searchVisible;
    console.log(`${searchVisible ? '✅' : '⚠️'} Search bar: ${searchVisible ? 'present' : 'not found'}`);

    // Agent cards
    const agentCardSelectors = [
      '[class*="agent-card"]',
      '[class*="agent-item"]',
      '[class*="AgentCard"]',
      'li[class*="agent"]',
      '[data-testid="agent-card"]'
    ];

    let agentCards = null;
    let cardCount = 0;
    for (const selector of agentCardSelectors) {
      agentCards = page.locator(selector);
      cardCount = await agentCards.count();
      if (cardCount > 0) {
        console.log(`✅ Found ${cardCount} agent cards with selector: ${selector}`);
        break;
      }
    }

    validationResults.tests.agentCardsFound = cardCount;

    if (cardCount > 0 && agentCards) {
      const screenshotPath4 = path.join(SCREENSHOTS_DIR, '04-agent-card-sample.png');
      await agentCards.first().screenshot({ path: screenshotPath4 });
      validationResults.screenshots.push('04-agent-card-sample.png');
      console.log('✅ Agent card screenshot captured');
    }

    // Check for avatars
    const avatars = page.locator('img[alt*="avatar" i], [class*="avatar"], img[src*="avatar"]');
    const avatarCount = await avatars.count();
    validationResults.tests.avatarsFound = avatarCount;
    console.log(`${avatarCount > 0 ? '✅' : '⚠️'} Avatars: ${avatarCount} found`);

    // Check for selected agent
    const selectedAgent = page.locator('[class*="selected"], [class*="active"], [aria-selected="true"]').first();
    const hasSelection = await selectedAgent.isVisible().catch(() => false);
    validationResults.tests.agentSelected = hasSelection;
    console.log(`${hasSelection ? '✅' : '⚠️'} Agent highlighted: ${hasSelection ? 'yes' : 'no'}`);

    // Verify NO Home/Details/Trash buttons
    const homeButton = page.locator('button:has-text("Home")');
    const detailsButton = page.locator('button:has-text("Details")');
    const trashButton = page.locator('button:has-text("Trash")');

    const homeExists = await homeButton.isVisible().catch(() => false);
    const detailsExists = await detailsButton.isVisible().catch(() => false);
    const trashExists = await trashButton.isVisible().catch(() => false);

    validationResults.tests.noHomeButton = !homeExists;
    validationResults.tests.noDetailsButton = !detailsExists;
    validationResults.tests.noTrashButton = !trashExists;

    console.log(`${!homeExists ? '✅' : '❌'} Home button absent: ${!homeExists}`);
    console.log(`${!detailsExists ? '✅' : '❌'} Details button absent: ${!detailsExists}`);
    console.log(`${!trashExists ? '✅' : '❌'} Trash button absent: ${!trashExists}`);

    console.log('');

    // Test 3: Agent Selection Functionality
    if (cardCount >= 2) {
      console.log('Test 3: Agent Selection Functionality');
      console.log('─'.repeat(60));

      const initialContent = await page.textContent('body');

      console.log('Clicking second agent...');
      await agentCards.nth(1).click();
      await page.waitForTimeout(1000);

      const updatedContent = await page.textContent('body');
      const contentChanged = updatedContent !== initialContent;
      validationResults.tests.agentSelectionWorks = contentChanged;
      console.log(`${contentChanged ? '✅' : '⚠️'} Detail panel updated: ${contentChanged}`);

      const screenshotPath5 = path.join(SCREENSHOTS_DIR, '05-after-agent-selection.png');
      await page.screenshot({ path: screenshotPath5, fullPage: true });
      validationResults.screenshots.push('05-after-agent-selection.png');
      console.log('✅ Post-selection screenshot captured');

      const url = page.url();
      const hasAgentParam = url.includes('agent') || url.includes('id=') || url.match(/\/agents\/\w+/);
      validationResults.tests.urlSync = !!hasAgentParam;
      console.log(`${hasAgentParam ? '✅' : '⚠️'} URL syncs with selection: ${hasAgentParam}`);
      console.log(`Current URL: ${url}`);

      console.log('');
    }

    // Test 4: Mobile View
    console.log('Test 4: Mobile Responsive View');
    console.log('─'.repeat(60));

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const screenshotPath8 = path.join(SCREENSHOTS_DIR, '08-mobile-view.png');
    await page.screenshot({ path: screenshotPath8, fullPage: true });
    validationResults.screenshots.push('08-mobile-view.png');
    console.log('✅ Mobile view screenshot captured');

    console.log('');

    // Determine success criteria
    validationResults.successCriteria = {
      masterDetailLayoutVisible: sidebarVisible && detailVisible,
      sidebarShowsAgents: cardCount > 0,
      clickAgentUpdatesDetail: validationResults.tests.agentSelectionWorks || false,
      noHomeDetailsTrashButtons: !homeExists && !detailsExists && !trashExists,
      noCriticalConsoleErrors: validationResults.consoleErrors.length === 0,
      screenshotsCaptured: validationResults.screenshots.length >= 5
    };

    // Determine overall status
    const allPassed = Object.values(validationResults.successCriteria).every(v => v === true);
    validationResults.overallStatus = allPassed ? 'PASS' : 'PARTIAL';

    console.log('');
    console.log('='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log('');
    console.log('Success Criteria:');
    Object.entries(validationResults.successCriteria).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    console.log('');
    console.log(`Console Errors: ${validationResults.consoleErrors.length}`);
    if (validationResults.consoleErrors.length > 0) {
      validationResults.consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }
    console.log('');
    console.log(`Console Warnings: ${validationResults.consoleWarnings.length}`);
    console.log('');
    console.log(`📊 Overall Status: ${validationResults.overallStatus}`);
    console.log(`📁 Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`📄 Report: validation-report.json`);
    console.log('');

  } catch (error) {
    console.error('❌ Validation error:', error);
    validationResults.overallStatus = 'FAIL';
    validationResults.error = error.message;
  } finally {
    // Save report
    const reportPath = path.join(SCREENSHOTS_DIR, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));

    // Save console errors
    const errorsPath = path.join(SCREENSHOTS_DIR, 'console-errors.json');
    fs.writeFileSync(errorsPath, JSON.stringify({
      timestamp: validationResults.timestamp,
      errors: validationResults.consoleErrors,
      warnings: validationResults.consoleWarnings
    }, null, 2));

    await browser.close();
  }

  return validationResults;
}

// Run validation
validateMasterDetailLayout()
  .then(results => {
    console.log('✅ Validation complete');
    process.exit(results.overallStatus === 'PASS' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
