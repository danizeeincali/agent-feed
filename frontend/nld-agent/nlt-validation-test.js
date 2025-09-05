// NLD Agent - Browser-Level Validation Test
// This test validates the actual user experience vs reported success
import { chromium } from 'playwright';

async function validateAppFunctionality() {
  console.log('🔍 NLD VALIDATION: Starting browser-level functionality test...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  const validationResults = {
    serverResponding: false,
    pageLoading: false,
    componentRendering: false,
    routeNavigation: false,
    apiIntegration: false,
    mockDataDetected: false,
    actualErrors: [],
    performanceMetrics: {}
  };
  
  try {
    // Step 1: Test if server is actually responding
    console.log('🔍 Testing server response...');
    const response = await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    validationResults.serverResponding = response && response.status() === 200;
    console.log(`✅ Server responding: ${validationResults.serverResponding}`);
    
    // Step 2: Test actual page loading (not just server response)
    console.log('🔍 Testing page loading...');
    await page.waitForSelector('#root', { timeout: 5000 });
    
    // Check if React app actually mounted
    const rootContent = await page.textContent('#root');
    validationResults.pageLoading = rootContent && rootContent.trim().length > 0;
    console.log(`✅ Page loading: ${validationResults.pageLoading}`);
    
    // Step 3: Test component rendering beyond just mounting
    console.log('🔍 Testing component rendering...');
    await page.waitForTimeout(2000); // Allow React to render
    
    // Look for actual UI elements, not just empty divs
    const components = await page.locator('[data-testid]').count();
    const hasNavigation = await page.locator('nav').count() > 0;
    const hasContent = await page.locator('main').count() > 0;
    
    validationResults.componentRendering = components > 0 && hasNavigation && hasContent;
    console.log(`✅ Component rendering: ${validationResults.componentRendering}`);
    
    // Step 4: Test route navigation (actual functionality)
    console.log('🔍 Testing route navigation...');
    try {
      // Try to navigate to agents page
      await page.click('a[href="/agents"]', { timeout: 3000 });
      await page.waitForTimeout(1000);
      
      const currentUrl = page.url();
      validationResults.routeNavigation = currentUrl.includes('/agents');
      console.log(`✅ Route navigation: ${validationResults.routeNavigation}`);
    } catch (navError) {
      console.log(`❌ Route navigation failed: ${navError.message}`);
      validationResults.actualErrors.push(`Navigation error: ${navError.message}`);
    }
    
    // Step 5: Test API integration (real vs mock data)
    console.log('🔍 Testing API integration...');
    const networkPromises = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkPromises.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });
    
    // Trigger some API calls
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check for actual API responses
    const apiCalls = networkPromises.filter(req => req.url.includes('/api/'));
    validationResults.apiIntegration = apiCalls.length > 0 && apiCalls.some(call => call.status === 200);
    
    // Detect mock data patterns
    const pageContent = await page.textContent('body');
    const mockIndicators = [
      'mock', 'placeholder', 'lorem ipsum', 'test data',
      'sample agent', 'dummy', 'fake'
    ];
    
    validationResults.mockDataDetected = mockIndicators.some(indicator => 
      pageContent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    console.log(`✅ API integration: ${validationResults.apiIntegration}`);
    console.log(`⚠️  Mock data detected: ${validationResults.mockDataDetected}`);
    
    // Step 6: Performance and error detection
    const performanceTimings = await page.evaluate(() => {
      return {
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    });
    
    validationResults.performanceMetrics = performanceTimings;
    
    // Check for console errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    validationResults.actualErrors = [...validationResults.actualErrors, ...errors];
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    validationResults.actualErrors.push(`Test execution error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  return validationResults;
}

// Classification function for NLD pattern detection
function classifyFunctionalityPattern(results) {
  // Determine actual functionality level
  if (results.serverResponding && results.pageLoading && results.componentRendering && 
      results.routeNavigation && results.apiIntegration && !results.mockDataDetected) {
    return 'SUCCESS_CLAIMED_REAL_WORKING';
  }
  
  if (results.serverResponding && results.pageLoading && results.componentRendering && 
      results.mockDataDetected) {
    return 'SUCCESS_CLAIMED_MOCK_SHOWN';
  }
  
  if (results.serverResponding && (!results.pageLoading || !results.componentRendering)) {
    return 'SUCCESS_CLAIMED_BROKEN_APP';
  }
  
  if (!results.serverResponding) {
    return 'FAILURE_DETECTED_HONEST';
  }
  
  return 'UNKNOWN_PATTERN';
}

// Export for use by NLD agent
export {
  validateAppFunctionality,
  classifyFunctionalityPattern
};

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAppFunctionality()
    .then(results => {
      const pattern = classifyFunctionalityPattern(results);
      console.log('\n🎯 NLD VALIDATION COMPLETE');
      console.log('================================');
      console.log(`Pattern Classification: ${pattern}`);
      console.log('Detailed Results:', JSON.stringify(results, null, 2));
      
      // Return appropriate exit code
      const isWorking = pattern === 'SUCCESS_CLAIMED_REAL_WORKING';
      process.exit(isWorking ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation execution failed:', error);
      process.exit(1);
    });
}