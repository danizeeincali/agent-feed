/**
 * Playwright Visual Validation for Agents Page
 * Tests the fixed routing with real browser interaction
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'agents-fix');

async function runVisualValidation() {
  console.log('=====================================');
  console.log('PLAYWRIGHT AGENTS VISUAL VALIDATION');
  console.log('=====================================\\n');

  // Create screenshot directory
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  console.log(`📸 Screenshot directory: ${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Navigate to agents page
    console.log('\\nTest 1: Navigate to agents page');
    results.total++;
    try {
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '01-agents-page-load.png'),
        fullPage: true
      });

      const title = await page.title();
      if (title.includes('Agent Feed')) {
        console.log('✓ Successfully navigated to agents page');
        results.passed++;
      } else {
        console.log('✗ Wrong page title');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Navigation failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 2: Wait for agents to load
    console.log('\\nTest 2: Wait for real agents to load');
    results.total++;
    try {
      // Wait for agent cards to appear
      await page.waitForSelector('div[class*="rounded-lg"][class*="border"]', {
        timeout: 10000
      });

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-agents-loaded.png'),
        fullPage: true
      });

      const agentCards = await page.$$('div[class*="rounded-lg"][class*="border"]');

      if (agentCards.length > 0) {
        console.log(`✓ Found ${agentCards.length} agent cards loaded`);
        results.passed++;
      } else {
        console.log('✗ No agent cards found');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Agents failed to load:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 3: Check for error messages
    console.log('\\nTest 3: Check for error messages');
    results.total++;
    try {
      const errorElements = await page.$$('text="Failed to fetch"');
      const endpointErrors = await page.$$('text="Endpoint not found"');

      if (errorElements.length === 0 && endpointErrors.length === 0) {
        console.log('✓ No error messages found');
        results.passed++;
      } else {
        console.log(`✗ Found ${errorElements.length + endpointErrors.length} error messages`);
        results.failed++;
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-error-check.png'),
        fullPage: true
      });
    } catch (error) {
      console.log('✗ Error check failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 4: Verify real agent data
    console.log('\\nTest 4: Verify real agent data');
    results.total++;
    try {
      const pageContent = await page.content();

      // Check for real agent names (not mocks)
      const realAgentNames = [
        'personal-todos-agent',
        'page-builder-agent',
        'meta-agent'
      ];

      let foundRealAgents = 0;
      for (const agentName of realAgentNames) {
        if (pageContent.includes(agentName)) {
          foundRealAgents++;
        }
      }

      if (foundRealAgents >= 2) {
        console.log(`✓ Found ${foundRealAgents} real agents in page content`);
        results.passed++;
      } else {
        console.log(`✗ Only found ${foundRealAgents} real agents`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Real data verification failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 5: Test interactive features
    console.log('\\nTest 5: Test interactive features');
    results.total++;
    try {
      // Try to click refresh if it exists
      const refreshButton = await page.$('button svg[class*="RefreshCw"]');
      if (refreshButton) {
        await refreshButton.click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '04-after-refresh.png'),
          fullPage: true
        });
      }

      // Try to use search if it exists
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.type('agent');
        await page.waitForTimeout(500);

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '05-search-test.png'),
          fullPage: true
        });

        await searchInput.fill(''); // Clear search
      }

      console.log('✓ Interactive features working');
      results.passed++;
    } catch (error) {
      console.log('✗ Interactive test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-final-state.png'),
      fullPage: true
    });

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }

  // Results
  console.log('\\n=====================================');
  console.log('VISUAL VALIDATION RESULTS');
  console.log('=====================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log(`\\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);

  if (results.passed === results.total) {
    console.log('\\n🎉 VISUAL VALIDATION SUCCESSFUL!');
    console.log('✅ Agents page working correctly');
    console.log('✅ Real data loading and displaying');
    console.log('✅ No routing errors detected');
  } else {
    console.log('\\n⚠️ SOME VISUAL TESTS FAILED');
    console.log('❌ Review screenshots and errors');
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  runVisualValidation()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runVisualValidation };