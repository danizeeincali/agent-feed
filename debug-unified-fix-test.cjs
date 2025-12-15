/**
 * SPARC Ultra Debug Phase 3: Live Browser Test
 * Test the unified state management fix for persistent "Page not found" error
 */

const puppeteer = require('puppeteer');

async function testUnifiedFix() {
  console.log('🚀 SPARC ULTRA DEBUG: Starting browser automation test');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    slowMo: 100,
    devtools: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (text.includes('UNIFIED STATE') || text.includes('SPARC') || text.includes('Error')) {
        console.log(`🖥️ BROWSER [${type.toUpperCase()}]: ${text}`);
      }
    });

    // Capture network requests
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/agents/') && url.includes('workspace')) {
        console.log(`🌐 API CALL: ${response.status()} ${url}`);
        try {
          const responseBody = await response.text();
          console.log(`📊 API RESPONSE: ${responseBody.substring(0, 200)}...`);
        } catch (e) {
          console.log(`📊 API RESPONSE: [Could not read body - ${e.message}]`);
        }
      }
    });

    // Navigate to the problem URL
    const targetUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
    console.log(`🎯 NAVIGATING TO: ${targetUrl}`);
    
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for component to load and settle
    await page.waitForTimeout(3000);

    // Capture the current state
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText,
        hasErrorMessage: document.body.innerText.includes('Page not found'),
        hasLoadingMessage: document.body.innerText.includes('Loading'),
        hasNoPages: document.body.innerText.includes('No pages yet'),
        url: window.location.href,
        reactState: window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? 'React DevTools available' : 'No React DevTools'
      };
    });

    console.log('📸 PAGE STATE CAPTURE:', JSON.stringify(pageContent, null, 2));

    // Take screenshot
    await page.screenshot({ 
      path: 'debug-screenshots/unified-fix-test.png',
      fullPage: true 
    });

    // Test API endpoint directly from the page
    const apiResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/agents/personal-todos-agent/workspace');
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          data: data,
          dataType: typeof data,
          hasPages: data?.data?.length || data?.pages?.length || 0
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    console.log('🔍 DIRECT API TEST FROM BROWSER:', JSON.stringify(apiResult, null, 2));

    // Wait a bit more to see if state updates
    console.log('⏰ Waiting 5 seconds to observe state changes...');
    await page.waitForTimeout(5000);

    // Final state check
    const finalState = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText,
        hasErrorMessage: document.body.innerText.includes('Page not found'),
        hasLoadingMessage: document.body.innerText.includes('Loading'),
        hasContent: document.body.innerText.length > 100
      };
    });

    console.log('🏁 FINAL STATE:', JSON.stringify(finalState, null, 2));

    // Determine test result
    const testResult = {
      success: !finalState.hasErrorMessage && !finalState.hasLoadingMessage,
      errorFixed: !finalState.hasErrorMessage,
      noInfiniteLoading: !finalState.hasLoadingMessage,
      hasContent: finalState.hasContent,
      timestamp: new Date().toISOString()
    };

    console.log('✅ TEST RESULT:', JSON.stringify(testResult, null, 2));

    if (testResult.success) {
      console.log('🎉 SUCCESS: The unified state management fix resolved the issue!');
    } else if (!testResult.errorFixed) {
      console.log('❌ FAILURE: "Page not found" error still persists');
    } else if (!testResult.noInfiniteLoading) {
      console.log('❌ FAILURE: Infinite loading spinner still persists');
    }

    return testResult;

  } catch (error) {
    console.error('💥 BROWSER TEST ERROR:', error);
    return { success: false, error: error.message };
  } finally {
    // Close browser after test
    await browser.close();
  }
}

// Run the test
testUnifiedFix().then(result => {
  console.log('🎯 FINAL TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('💥 TEST EXECUTION ERROR:', error);
  process.exit(1);
});