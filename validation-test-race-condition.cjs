/**
 * React Router useParams Race Condition Validation Test
 * Tests the specific fix for "No pages yet" issue when navigating directly to URLs
 */

const puppeteer = require('puppeteer');

async function validateRaceConditionFix() {
  console.log('🚀 Starting React Router useParams race condition validation...');
  
  let browser;
  let results = {
    serverStatus: { frontend: false, backend: false },
    urlNavigation: { success: false, error: null },
    pageContent: { hasContent: false, showsNoPages: false, details: '' },
    apiCalls: { successful: [], failed: [] },
    reactErrors: [],
    finalResult: 'UNKNOWN'
  };

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Enable request/response interception
    await page.setRequestInterception(true);
    
    // Track API calls
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`📡 API Request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const success = response.status() >= 200 && response.status() < 300;
        const apiCall = {
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        };
        
        if (success) {
          results.apiCalls.successful.push(apiCall);
          console.log(`✅ API Success: ${response.status()} ${response.url()}`);
        } else {
          results.apiCalls.failed.push(apiCall);
          console.log(`❌ API Failed: ${response.status()} ${response.url()}`);
        }
      }
    });
    
    // Track console errors and React errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        console.log(`🔴 Console Error: ${errorText}`);
        
        if (errorText.includes('React') || errorText.includes('useParams') || errorText.includes('Router')) {
          results.reactErrors.push(errorText);
        }
      }
    });
    
    // Step 1: Check server status
    console.log('\n📡 Checking server status...');
    
    try {
      const backendResponse = await page.goto('http://127.0.0.1:3000/api/health', { waitUntil: 'networkidle0', timeout: 5000 });
      results.serverStatus.backend = backendResponse && backendResponse.status() === 200;
      console.log(`Backend (port 3000): ${results.serverStatus.backend ? '✅ Running' : '❌ Not running'}`);
    } catch (e) {
      console.log(`Backend (port 3000): ❌ Not running - ${e.message}`);
    }
    
    try {
      const frontendResponse = await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 5000 });
      results.serverStatus.frontend = frontendResponse && frontendResponse.status() === 200;
      console.log(`Frontend (port 5173): ${results.serverStatus.frontend ? '✅ Running' : '❌ Not running'}`);
    } catch (e) {
      console.log(`Frontend (port 5173): ❌ Not running - ${e.message}`);
      results.serverStatus.frontend = false;
    }
    
    if (!results.serverStatus.frontend || !results.serverStatus.backend) {
      throw new Error('Required servers not running');
    }
    
    // Step 2: Test direct URL navigation
    console.log('\n🎯 Testing direct URL navigation...');
    const targetUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d';
    
    try {
      const response = await page.goto(targetUrl, { 
        waitUntil: 'networkidle0', 
        timeout: 10000 
      });
      
      results.urlNavigation.success = response && response.status() === 200;
      console.log(`Direct URL navigation: ${results.urlNavigation.success ? '✅ Success' : '❌ Failed'}`);
      
      if (!results.urlNavigation.success) {
        results.urlNavigation.error = `HTTP ${response.status()}`;
      }
    } catch (e) {
      results.urlNavigation.error = e.message;
      console.log(`Direct URL navigation: ❌ Failed - ${e.message}`);
    }
    
    // Step 3: Wait for React to finish rendering
    console.log('\n⏳ Waiting for React rendering to complete...');
    
    // Wait for React to be ready and any useEffect hooks to complete
    await page.waitForTimeout(3000);
    
    // Step 4: Check page content
    console.log('\n📄 Analyzing page content...');
    
    const pageText = await page.evaluate(() => document.body.innerText);
    const pageHtml = await page.content();
    
    // Check for the specific "No pages yet" message
    results.pageContent.showsNoPages = pageText.includes('No pages yet');
    
    // Check for expected page content
    const hasExpectedContent = 
      pageText.includes('Personal Todos Dashboard') ||
      pageText.includes('Dynamic Pages') ||
      pageText.includes('Total Tasks') ||
      pageHtml.includes('dashboard') ||
      pageHtml.includes('doughnut');
    
    results.pageContent.hasContent = hasExpectedContent && !results.pageContent.showsNoPages;
    
    // Get detailed content analysis
    results.pageContent.details = {
      containsNoPages: results.pageContent.showsNoPages,
      containsDashboard: pageText.includes('Personal Todos Dashboard'),
      containsDynamicPages: pageText.includes('Dynamic Pages'),
      containsMetrics: pageText.includes('Total Tasks'),
      containsJson: pageHtml.includes('"type":"dashboard"'),
      pageTextLength: pageText.length,
      relevantText: pageText.substring(0, 500)
    };
    
    console.log(`Page shows "No pages yet": ${results.pageContent.showsNoPages ? '❌ YES (PROBLEM)' : '✅ NO'}`);
    console.log(`Page has expected content: ${results.pageContent.hasContent ? '✅ YES' : '❌ NO'}`);
    
    // Step 5: Final determination
    console.log('\n🏁 Final validation result...');
    
    if (results.pageContent.hasContent && !results.pageContent.showsNoPages && results.reactErrors.length === 0) {
      results.finalResult = 'SUCCESS';
      console.log('🎉 SUCCESS: Race condition fix appears to be working!');
    } else if (results.pageContent.showsNoPages) {
      results.finalResult = 'FAILED - STILL SHOWING NO PAGES';
      console.log('❌ FAILED: Still showing "No pages yet" message');
    } else if (results.reactErrors.length > 0) {
      results.finalResult = 'FAILED - REACT ERRORS';
      console.log('❌ FAILED: React errors detected');
    } else {
      results.finalResult = 'FAILED - NO CONTENT';
      console.log('❌ FAILED: No expected content found');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: `/workspaces/agent-feed/validation-screenshot-${Date.now()}.png`, fullPage: true });
    console.log('📷 Screenshot saved for debugging');
    
  } catch (error) {
    console.error(`💥 Test failed with error: ${error.message}`);
    results.finalResult = `ERROR: ${error.message}`;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate detailed report
  console.log('\n📋 DETAILED VALIDATION REPORT');
  console.log('='.repeat(50));
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// Run the validation
if (require.main === module) {
  validateRaceConditionFix()
    .then(results => {
      console.log(`\n🔍 FINAL RESULT: ${results.finalResult}`);
      process.exit(results.finalResult.startsWith('SUCCESS') ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { validateRaceConditionFix };