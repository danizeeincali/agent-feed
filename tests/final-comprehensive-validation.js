const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function comprehensiveValidation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    errors: [],
    success: true
  };

  // Monitor console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(msg.text());
    }
  });

  try {
    console.log('🔍 Testing main app at http://localhost:3000/');

    // Test 1: Main app homepage
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const homeScreenshot = path.join(__dirname, 'homepage-validation.png');
    await page.screenshot({ path: homeScreenshot, fullPage: true });
    results.screenshots.push(homeScreenshot);

    const homeTitle = await page.title();
    const homeContent = await page.textContent('body');

    results.tests.push({
      name: 'Homepage Load Test',
      url: 'http://localhost:3000/',
      status: 'PASS',
      title: homeTitle,
      hasContent: homeContent.length > 0,
      screenshot: homeScreenshot
    });

    console.log('✅ Homepage loaded successfully');

    // Test 2: Agents dashboard
    console.log('🔍 Testing agents dashboard at http://localhost:3000/agents');

    await page.goto('http://localhost:3000/agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const agentsScreenshot = path.join(__dirname, 'agents-dashboard-validation.png');
    await page.screenshot({ path: agentsScreenshot, fullPage: true });
    results.screenshots.push(agentsScreenshot);

    const agentsTitle = await page.title();
    const agentsContent = await page.textContent('body');

    // Look for agent cards or agent data
    const agentElements = await page.locator('[data-testid*="agent"], .agent-card, .agent-item').count();

    results.tests.push({
      name: 'Agents Dashboard Test',
      url: 'http://localhost:3000/agents',
      status: agentElements > 0 || agentsContent.includes('agent') ? 'PASS' : 'WARN',
      title: agentsTitle,
      hasContent: agentsContent.length > 0,
      agentElementsFound: agentElements,
      screenshot: agentsScreenshot
    });

    console.log('✅ Agents dashboard loaded successfully');

    // Test 3: API endpoint verification
    console.log('🔍 Testing API endpoint');

    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          agentCount: data.agents ? data.agents.length : 0,
          totalAgents: data.totalAgents,
          hasRealData: data.agents && data.agents.length > 0 && data.agents[0].name !== 'mock'
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    results.tests.push({
      name: 'API Agents Endpoint Test',
      url: '/api/agents',
      status: apiResponse.success && apiResponse.agentCount === 11 ? 'PASS' : 'FAIL',
      ...apiResponse
    });

    console.log('✅ API validation completed');

    // Test 4: Check for JavaScript errors
    const jsErrors = results.errors;
    results.tests.push({
      name: 'JavaScript Error Check',
      status: jsErrors.length === 0 ? 'PASS' : 'WARN',
      errorCount: jsErrors.length,
      errors: jsErrors
    });

    // Test 5: Real data verification
    const realDataCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();

        if (!data.agents || data.agents.length === 0) {
          return { hasRealData: false, reason: 'No agents returned' };
        }

        const firstAgent = data.agents[0];
        const hasRealFields = firstAgent.description && firstAgent.capabilities && firstAgent.created_at;
        const noMockData = !JSON.stringify(data).toLowerCase().includes('mock');

        return {
          hasRealData: hasRealFields && noMockData,
          agentCount: data.agents.length,
          sampleAgent: {
            name: firstAgent.name,
            description: firstAgent.description.substring(0, 100) + '...',
            capabilities: firstAgent.capabilities.slice(0, 3)
          },
          noMockData: noMockData
        };
      } catch (error) {
        return { hasRealData: false, error: error.message };
      }
    });

    results.tests.push({
      name: 'Real Data Verification',
      status: realDataCheck.hasRealData ? 'PASS' : 'FAIL',
      ...realDataCheck
    });

    console.log('✅ Real data verification completed');

    // Overall success determination
    const passedTests = results.tests.filter(t => t.status === 'PASS').length;
    const totalTests = results.tests.length;
    results.success = passedTests === totalTests;
    results.passRate = `${passedTests}/${totalTests}`;

    console.log(`\\n🎉 Validation Summary: ${results.passRate} tests passed`);
    results.tests.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} ${test.name}: ${test.status}`);
    });

  } catch (error) {
    console.error('❌ Validation error:', error);
    results.success = false;
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }

  // Save results
  const reportPath = path.join(__dirname, 'final-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`\\n📊 Full report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${results.screenshots.join(', ')}`);

  return results;
}

// Run validation
comprehensiveValidation().then(results => {
  console.log('\\n🏁 Final validation completed');
  process.exit(results.success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});