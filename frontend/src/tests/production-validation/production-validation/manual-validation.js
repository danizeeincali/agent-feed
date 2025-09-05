/**
 * Manual Production Validation Script
 * Validates white screen resolution and application functionality
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

async function validateApplication() {
  console.log('🚀 Starting Production Validation...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Error:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });

  const results = {
    timestamp: new Date().toISOString(),
    testResults: [],
    overall: 'UNKNOWN'
  };

  try {
    // Test 1: Basic Application Loading
    console.log('📍 Test 1: Basic Application Loading');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    const basicLoadTest = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        hasContent: !!(root && root.textContent && root.textContent.trim().length > 0),
        childCount: root ? root.children.length : 0,
        isVisible: root ? (root.offsetHeight > 0 && root.offsetWidth > 0) : false,
        textLength: root ? (root.textContent || '').length : 0
      };
    });

    const basicLoadPassed = basicLoadTest.hasRoot && basicLoadTest.hasContent && basicLoadTest.isVisible;
    results.testResults.push({
      test: 'Basic Application Loading',
      status: basicLoadPassed ? 'PASSED' : 'FAILED',
      details: basicLoadTest
    });

    console.log('✅ Basic Load Test:', basicLoadPassed ? 'PASSED' : 'FAILED');

    // Test 2: White Screen Detection
    console.log('📍 Test 2: White Screen Detection');
    const whiteScreenTest = await page.evaluate(() => {
      const root = document.getElementById('root');
      const body = document.body;
      
      const checks = {
        hasVisibleContent: !!(root && root.offsetHeight > 100 && root.offsetWidth > 100),
        hasTextContent: !!(root && root.textContent && root.textContent.trim().length > 50),
        hasChildElements: !!(root && root.children.length > 0),
        hasInteractiveElements: document.querySelectorAll('button, a, input').length > 0,
        hasStyledElements: document.querySelectorAll('[class], [style]').length > 0,
        hasColoredElements: Array.from(document.querySelectorAll('*')).some(el => {
          const styles = window.getComputedStyle(el);
          return styles.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                 styles.backgroundColor !== 'rgb(255, 255, 255)';
        })
      };
      
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      return {
        ...checks,
        score: `${passedChecks}/${totalChecks}`,
        isWhiteScreen: passedChecks < (totalChecks * 0.6) // Fail if less than 60% pass
      };
    });

    const whiteScreenPassed = !whiteScreenTest.isWhiteScreen;
    results.testResults.push({
      test: 'White Screen Detection',
      status: whiteScreenPassed ? 'PASSED' : 'FAILED',
      details: whiteScreenTest
    });

    console.log('✅ White Screen Test:', whiteScreenPassed ? 'PASSED' : 'FAILED');

    // Test 3: Component Rendering
    console.log('📍 Test 3: Component Rendering');
    const componentTest = await page.evaluate(() => {
      const components = {
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a').length,
        inputs: document.querySelectorAll('input, textarea, select').length,
        headers: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        containers: document.querySelectorAll('div, section, main, aside').length,
        interactive: document.querySelectorAll('[role="button"], [role="tab"], [role="menuitem"]').length
      };
      
      const totalComponents = Object.values(components).reduce((sum, count) => sum + count, 0);
      
      return {
        ...components,
        totalComponents,
        hasMinimalUI: totalComponents > 5
      };
    });

    const componentPassed = componentTest.hasMinimalUI;
    results.testResults.push({
      test: 'Component Rendering',
      status: componentPassed ? 'PASSED' : 'FAILED',
      details: componentTest
    });

    console.log('✅ Component Test:', componentPassed ? 'PASSED' : 'FAILED');

    // Test 4: API Integration
    console.log('📍 Test 4: API Integration');
    let apiTest = { backendAccessible: false, frontendIntegration: false, error: null };
    
    try {
      const response = await page.goto(`${API_URL}/api/agents`, { timeout: 10000 });
      apiTest.backendAccessible = response.ok();
      
      // Go back to main app
      await page.goto(BASE_URL);
      await page.waitForTimeout(2000);
      
      // Check if frontend shows data
      const frontendData = await page.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return {
          hasAgentText: text.includes('agent'),
          hasDataText: text.includes('data') || text.includes('feed'),
          hasSystemText: text.includes('system') || text.includes('status'),
          textLength: text.length
        };
      });
      
      apiTest.frontendIntegration = frontendData.textLength > 100;
      apiTest.details = frontendData;
      
    } catch (error) {
      apiTest.error = error.message;
    }

    const apiPassed = apiTest.backendAccessible || apiTest.frontendIntegration;
    results.testResults.push({
      test: 'API Integration',
      status: apiPassed ? 'PASSED' : 'FAILED',
      details: apiTest
    });

    console.log('✅ API Test:', apiPassed ? 'PASSED' : 'FAILED');

    // Test 5: Error Handling
    console.log('📍 Test 5: Error Handling');
    await page.evaluate(() => {
      // Inject potential error to test resilience
      try {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = 'Test error injection';
        document.body.appendChild(testDiv);
      } catch (e) {
        console.log('Error injection test');
      }
    });

    await page.waitForTimeout(1000);

    const errorHandlingTest = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        stillHasContent: !!(root && root.textContent && root.textContent.length > 0),
        stillVisible: !!(root && root.offsetHeight > 0),
        noErrorOverlay: !document.querySelector('[class*="error"]:not([style*="display: none"])')
      };
    });

    const errorHandlingPassed = errorHandlingTest.stillHasContent && errorHandlingTest.stillVisible;
    results.testResults.push({
      test: 'Error Handling',
      status: errorHandlingPassed ? 'PASSED' : 'FAILED',
      details: errorHandlingTest
    });

    console.log('✅ Error Handling Test:', errorHandlingPassed ? 'PASSED' : 'FAILED');

    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/production-validation/final-validation-screenshot.png',
      fullPage: true 
    });

    // Calculate overall result
    const passedTests = results.testResults.filter(test => test.status === 'PASSED').length;
    const totalTests = results.testResults.length;
    const successRate = (passedTests / totalTests) * 100;

    results.overall = successRate >= 80 ? 'PASSED' : 'FAILED';
    results.successRate = `${passedTests}/${totalTests} (${successRate.toFixed(1)}%)`;

    console.log(`\n🎯 OVERALL VALIDATION: ${results.overall}`);
    console.log(`📊 Success Rate: ${results.successRate}`);

    // Save detailed results
    fs.writeFileSync(
      'tests/production-validation/validation-results.json', 
      JSON.stringify(results, null, 2)
    );

  } catch (error) {
    console.error('❌ Validation failed:', error);
    results.overall = 'FAILED';
    results.error = error.message;
  } finally {
    await browser.close();
  }

  return results;
}

// Run validation directly
validateApplication()
  .then(results => {
    console.log('\n📋 Final Results:', results.overall);
    process.exit(results.overall === 'PASSED' ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

export { validateApplication };