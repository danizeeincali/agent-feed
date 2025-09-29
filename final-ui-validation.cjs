// Final UI validation with Playwright screenshots
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFinalValidation() {
  console.log('🎯 Starting Final UI Validation with Screenshots...');

  // Create screenshots directory
  const screenshotDir = '/workspaces/agent-feed/tests/screenshots/final-validation';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    errors: [],
    success: true
  };

  try {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push(msg.text());
      }
    });

    console.log('📡 Testing API endpoints...');

    // Test API endpoints directly
    const agentsResponse = await page.request.get('http://localhost:5173/api/agents');
    const agentsData = await agentsResponse.json();

    results.tests.push({
      name: 'API Agents Endpoint',
      status: agentsResponse.status(),
      success: agentsResponse.status() === 200,
      data: {
        hasAgents: Array.isArray(agentsData.agents),
        agentCount: agentsData.agents?.length,
        hasSuccess: agentsData.success === true
      }
    });

    console.log(`✅ /api/agents: ${agentsResponse.status()} - ${agentsData.agents?.length} agents`);

    // Test agents page
    console.log('🌐 Testing agents page...');
    await page.goto('http://localhost:5173/agents');

    // Wait for page load
    await page.waitForTimeout(5000);

    // Take screenshot
    const agentsScreenshot = path.join(screenshotDir, 'agents-page-final.png');
    await page.screenshot({ path: agentsScreenshot, fullPage: true });
    results.screenshots.push(agentsScreenshot);
    console.log('📸 Agents page screenshot saved');

    // Check for "Failed to fetch" text
    const hasFailedToFetch = await page.locator('text=Failed to fetch').count() > 0;
    const hasError = await page.locator('text=Error').count() > 0;

    results.tests.push({
      name: 'Agents Page Load',
      success: !hasFailedToFetch && !hasError,
      hasFailedToFetch,
      hasError,
      consoleErrors: results.errors.length
    });

    // Test main homepage
    console.log('🏠 Testing homepage...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    const homepageScreenshot = path.join(screenshotDir, 'homepage-final.png');
    await page.screenshot({ path: homepageScreenshot, fullPage: true });
    results.screenshots.push(homepageScreenshot);
    console.log('📸 Homepage screenshot saved');

    // Test responsive design
    console.log('📱 Testing responsive design...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(2000);

    const mobileScreenshot = path.join(screenshotDir, 'agents-mobile-final.png');
    await page.screenshot({ path: mobileScreenshot, fullPage: true });
    results.screenshots.push(mobileScreenshot);
    console.log('📸 Mobile screenshot saved');

    // Final assessment
    results.success = results.tests.every(test => test.success) && results.errors.length === 0;

    console.log('✅ UI Validation complete!');
    console.log(`📊 Tests passed: ${results.tests.filter(t => t.success).length}/${results.tests.length}`);
    console.log(`🚨 Console errors: ${results.errors.length}`);
    console.log(`📸 Screenshots: ${results.screenshots.length}`);

  } catch (error) {
    console.log('❌ Error during validation:', error.message);
    results.success = false;
    results.errors.push(error.message);
  } finally {
    // Save results
    const resultsFile = path.join(screenshotDir, 'validation-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    await browser.close();
  }

  return results;
}

runFinalValidation().then(results => {
  if (results.success) {
    console.log('🎉 ALL VALIDATION TESTS PASSED!');
  } else {
    console.log('⚠️ Some validation issues found');
  }
  process.exit(results.success ? 0 : 1);
});