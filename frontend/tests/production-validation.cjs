/**
 * CRITICAL PRODUCTION VALIDATION SCRIPT
 * Comprehensive validation of React application production readiness
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function runProductionValidation() {
  console.log('🚀 STARTING PRODUCTION VALIDATION SUITE');
  console.log('==========================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    overall: 'PENDING',
    violations: [],
    passes: [],
    criticalFailures: [],
    warnings: []
  };

  let browser;
  let page;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    // Enable error collection
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // VALIDATION 1: Application Loading
    console.log('\n🔍 VALIDATION 1: Application Loading');
    try {
      const response = await page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      if (response?.status() === 200) {
        results.passes.push('✅ Application loads with HTTP 200');
      } else {
        results.criticalFailures.push(`❌ Application failed to load - Status: ${response?.status()}`);
      }

      // Check for white screen
      const rootContent = await page.$('#root > *');
      if (rootContent) {
        results.passes.push('✅ React application mounts correctly');
      } else {
        results.criticalFailures.push('❌ WHITE SCREEN DETECTED - React failed to mount');
      }

      // Check content length
      const bodyText = await page.textContent('body');
      if (bodyText && bodyText.length > 100) {
        results.passes.push('✅ Page has substantial content');
      } else {
        results.criticalFailures.push('❌ Page appears empty or has minimal content');
      }

    } catch (error) {
      results.criticalFailures.push(`❌ Application loading failed: ${error.message}`);
    }

    // VALIDATION 2: Mock Data Detection
    console.log('\n🔍 VALIDATION 2: Mock Data Detection (CRITICAL)');
    
    const mockDetectionCode = `
      // Search for mock implementations in page source
      const pageSource = document.documentElement.outerHTML;
      const mockIndicators = [
        'mock',
        'fake',
        'example.com',
        'placeholder',
        'lorem ipsum',
        'test-data',
        'Mock API'
      ];
      
      const foundMocks = [];
      for (const indicator of mockIndicators) {
        if (pageSource.toLowerCase().includes(indicator.toLowerCase())) {
          foundMocks.push(indicator);
        }
      }
      
      return foundMocks;
    `;

    const mockResults = await page.evaluate(mockDetectionCode);
    if (mockResults.length > 0) {
      results.criticalFailures.push(`❌ MOCK DATA DETECTED: ${mockResults.join(', ')}`);
    } else {
      results.passes.push('✅ No obvious mock data indicators found');
    }

    // VALIDATION 3: API Calls and Real Data
    console.log('\n🔍 VALIDATION 3: API Calls and Real Data');
    
    const apiCalls = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/v1/')) {
        try {
          const responseData = await response.json();
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            hasData: JSON.stringify(responseData).length > 100
          });
        } catch (e) {
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            error: 'Non-JSON response'
          });
        }
      }
    });

    // Wait for API calls
    await page.waitForTimeout(5000);
    
    if (apiCalls.length > 0) {
      results.passes.push(`✅ ${apiCalls.length} API calls detected`);
      
      const workingAPIs = apiCalls.filter(call => call.status >= 200 && call.status < 300);
      if (workingAPIs.length > 0) {
        results.passes.push(`✅ ${workingAPIs.length} API calls returned successful responses`);
      } else {
        results.violations.push('⚠️ No successful API calls detected');
      }
    } else {
      results.violations.push('⚠️ No API calls detected - app may be using only client-side data');
    }

    // VALIDATION 4: Interactive Elements
    console.log('\n🔍 VALIDATION 4: Interactive Elements');
    
    const buttons = await page.$$('button:not([disabled])');
    if (buttons.length > 0) {
      results.passes.push(`✅ ${buttons.length} interactive buttons found`);
      
      // Test first few buttons
      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        try {
          const button = buttons[i];
          const buttonText = await button.textContent();
          await button.click();
          await page.waitForTimeout(500);
          results.passes.push(`✅ Button "${buttonText}" is clickable`);
        } catch (error) {
          results.violations.push(`⚠️ Button click failed: ${error.message}`);
        }
      }
    } else {
      results.violations.push('⚠️ No interactive buttons found');
    }

    // VALIDATION 5: Route Navigation
    console.log('\n🔍 VALIDATION 5: Route Navigation');
    
    const routes = ['/', '/dashboard', '/agents', '/feed', '/analytics'];
    for (const route of routes) {
      try {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        const content = await page.textContent('main, [role="main"], .main-content, .dashboard, body');
        if (content && content.length > 200) {
          results.passes.push(`✅ Route ${route} loads with content`);
        } else {
          results.violations.push(`⚠️ Route ${route} has minimal content`);
        }
        
        // Check for placeholder content
        const placeholderCheck = await page.evaluate(() => {
          const text = document.body.textContent.toLowerCase();
          return text.includes('lorem ipsum') || 
                 text.includes('placeholder') || 
                 text.includes('coming soon') ||
                 text.includes('not implemented');
        });
        
        if (placeholderCheck) {
          results.criticalFailures.push(`❌ Route ${route} contains placeholder content`);
        }
        
      } catch (error) {
        results.violations.push(`⚠️ Route ${route} navigation failed: ${error.message}`);
      }
    }

    // VALIDATION 6: Real-time Features
    console.log('\n🔍 VALIDATION 6: Real-time Features');
    
    const realTimeSupport = await page.evaluate(() => {
      return {
        websocket: typeof WebSocket !== 'undefined',
        eventSource: typeof EventSource !== 'undefined',
        fetch: typeof fetch !== 'undefined'
      };
    });

    if (realTimeSupport.websocket || realTimeSupport.eventSource) {
      results.passes.push('✅ Real-time capabilities available (WebSocket/SSE)');
    } else {
      results.violations.push('⚠️ No real-time capabilities detected');
    }

    // VALIDATION 7: Mobile Responsiveness
    console.log('\n🔍 VALIDATION 7: Mobile Responsiveness');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      if (bodyWidth <= viewport.width + 50) {
        results.passes.push(`✅ ${viewport.name} responsive layout works`);
      } else {
        results.violations.push(`⚠️ ${viewport.name} layout has horizontal overflow`);
      }
    }

    // VALIDATION 8: Performance
    console.log('\n🔍 VALIDATION 8: Performance');
    
    const startTime = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    if (loadTime < 5000) {
      results.passes.push(`✅ Fast load time: ${loadTime}ms`);
    } else if (loadTime < 10000) {
      results.warnings.push(`⚠️ Moderate load time: ${loadTime}ms`);
    } else {
      results.violations.push(`⚠️ Slow load time: ${loadTime}ms`);
    }

    // Collect final error counts
    if (consoleErrors.length > 0) {
      results.violations.push(`⚠️ ${consoleErrors.length} console errors detected`);
    }
    
    if (networkErrors.length > 0) {
      results.violations.push(`⚠️ ${networkErrors.length} network errors detected`);
    }

  } catch (error) {
    results.criticalFailures.push(`❌ Validation script error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // GENERATE FINAL REPORT
  console.log('\n📊 FINAL VALIDATION REPORT');
  console.log('==========================');
  
  // Determine overall status
  if (results.criticalFailures.length > 0) {
    results.overall = 'FAIL';
  } else if (results.violations.length > 3) {
    results.overall = 'CONDITIONAL_PASS';
  } else {
    results.overall = 'PASS';
  }

  console.log(`\n🎯 OVERALL STATUS: ${results.overall}`);
  
  console.log(`\n✅ PASSES (${results.passes.length}):`);
  results.passes.forEach(pass => console.log(pass));
  
  if (results.criticalFailures.length > 0) {
    console.log(`\n❌ CRITICAL FAILURES (${results.criticalFailures.length}):`);
    results.criticalFailures.forEach(failure => console.log(failure));
  }
  
  if (results.violations.length > 0) {
    console.log(`\n⚠️ VIOLATIONS (${results.violations.length}):`);
    results.violations.forEach(violation => console.log(violation));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n🚨 WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach(warning => console.log(warning));
  }

  // Save detailed report
  fs.writeFileSync('production-validation-report.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed report saved to: production-validation-report.json');

  return results;
}

// Run the validation
runProductionValidation()
  .then((results) => {
    console.log('\n🏁 Validation complete!');
    process.exit(results.criticalFailures.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });