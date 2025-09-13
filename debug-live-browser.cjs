const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔍 STARTING LIVE BROWSER DEBUG');
  console.log('🎯 TARGET: React component execution analysis');
  console.log('🔗 URL: http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');
  
  const browser = await puppeteer.launch({ 
    headless: true, // Changed to headless for container environment
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-extensions',
      '--disable-default-apps'
    ]
  });
  
  const page = await browser.newPage();
  
  // Enable detailed logging
  await page.setRequestInterception(true);
  
  // Capture ALL console messages with enhanced tracking
  const consoleMessages = [];
  page.on('console', msg => {
    const message = {
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
      location: msg.location(),
      args: msg.args().map(arg => arg.toString())
    };
    consoleMessages.push(message);
    
    // Highlight SPARC and React-related messages
    if (message.text.includes('SPARC') || message.text.includes('setPages') || message.text.includes('UnifiedAgentPage')) {
      console.log(`🔥 [${message.type.toUpperCase()}] ${message.text}`);
    } else {
      console.log(`[${message.type}] ${message.text}`);
    }
  });
  
  // Monitor network activity with detailed tracking
  const networkRequests = [];
  page.on('request', request => {
    const requestData = {
      type: 'request',
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: Date.now()
    };
    
    // Pass through the request
    request.continue();
    
    if (request.url().includes('/api/') || request.url().includes('agent') || request.url().includes('page')) {
      networkRequests.push(requestData);
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 POST DATA: ${request.postData()}`);
      }
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/') || response.url().includes('agent') || response.url().includes('page')) {
      let responseData = null;
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (e) {
        responseData = `Error reading response: ${e.message}`;
      }
      
      const responseInfo = {
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        data: responseData,
        timestamp: Date.now()
      };
      
      networkRequests.push(responseInfo);
      
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
      console.log(`📥 RESPONSE DATA:`, JSON.stringify(responseData, null, 2));
    }
  });
  
  // Track page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    };
    pageErrors.push(errorInfo);
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  // Track failed requests
  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });
  
  console.log('🔍 NAVIGATING TO TARGET URL');
  const targetUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
  
  try {
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
  } catch (error) {
    console.log(`⚠️ Navigation timeout/error: ${error.message}`);
  }
  
  console.log('🔍 WAITING FOR INITIAL LOAD');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Take initial screenshot
  await page.screenshot({ 
    path: '/workspaces/agent-feed/debug-screenshots/initial-load.png', 
    fullPage: true 
  });
  
  // Inject React DevTools detection script
  console.log('🔍 INJECTING REACT COMPONENT MONITORING');
  await page.evaluate(() => {
    // Monitor React component state changes
    window.reactDebugInfo = {
      componentUpdates: [],
      stateChanges: [],
      props: [],
      errors: []
    };
    
    // Hook into React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      hook.onCommitFiberRoot = (id, root, priorityLevel) => {
        window.reactDebugInfo.componentUpdates.push({
          timestamp: Date.now(),
          rootId: id,
          priorityLevel: priorityLevel
        });
        console.log('🔥 REACT COMMIT:', { id, priorityLevel });
      };
    }
    
    // Monitor for specific component patterns
    const originalSetState = React.Component.prototype.setState;
    React.Component.prototype.setState = function(updater, callback) {
      window.reactDebugInfo.stateChanges.push({
        timestamp: Date.now(),
        componentName: this.constructor.name,
        state: typeof updater === 'function' ? 'function' : updater
      });
      console.log('🔥 COMPONENT setState:', this.constructor.name, updater);
      return originalSetState.call(this, updater, callback);
    };
  });
  
  // Wait for React to fully initialize and make API calls
  console.log('🔍 WAITING FOR REACT INITIALIZATION AND API CALLS');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check for specific elements and component state
  console.log('🔍 ANALYZING COMPONENT STATE');
  const componentAnalysis = await page.evaluate(() => {
    const analysis = {
      timestamp: Date.now(),
      pageTitle: document.title,
      bodyClasses: document.body.className,
      hasReactRoot: !!document.querySelector('#root'),
      reactDebugInfo: window.reactDebugInfo || {},
      elements: {
        pageNotFound: !!document.querySelector('[class*="not-found"], [class*="error"]'),
        loadingIndicator: !!document.querySelector('[class*="loading"], [class*="spinner"]'),
        agentPageContent: !!document.querySelector('[class*="agent"], [class*="todo"], [class*="dashboard"]'),
        errorBoundary: !!document.querySelector('[class*="error-boundary"]')
      },
      textContent: {
        hasPageNotFoundText: document.body.textContent.includes('Page not found'),
        hasTodoText: document.body.textContent.includes('Todo') || document.body.textContent.includes('task'),
        hasAgentText: document.body.textContent.includes('Agent') || document.body.textContent.includes('personal'),
        fullTextLength: document.body.textContent.length
      },
      reactComponents: []
    };
    
    // Try to find React components
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el._reactInternalFiber || el._reactInternals) {
        analysis.reactComponents.push({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        });
      }
    });
    
    return analysis;
  });
  
  console.log('🔍 COMPONENT ANALYSIS RESULTS:');
  console.log('Elements found:', componentAnalysis.elements);
  console.log('Text content analysis:', componentAnalysis.textContent);
  console.log('React components found:', componentAnalysis.reactComponents.length);
  
  // Take screenshot after analysis
  await page.screenshot({ 
    path: '/workspaces/agent-feed/debug-screenshots/post-analysis.png', 
    fullPage: true 
  });
  
  // Wait for any delayed renders or state updates
  console.log('🔍 WAITING FOR DELAYED UPDATES');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Final state capture
  const finalPageContent = await page.content();
  const finalComponentAnalysis = await page.evaluate(() => {
    return {
      timestamp: Date.now(),
      reactDebugInfo: window.reactDebugInfo || {},
      finalState: {
        isPageNotFound: document.body.textContent.includes('Page not found'),
        hasPageContent: document.body.textContent.includes('Personal Todos Dashboard') || 
                       document.body.textContent.includes('Todo') ||
                       document.body.textContent.includes('task'),
        pageContentLength: document.body.textContent.length,
        visibleText: document.body.textContent.slice(0, 500) // First 500 chars
      }
    };
  });
  
  // Take final screenshot
  await page.screenshot({ 
    path: '/workspaces/agent-feed/debug-screenshots/final-state.png', 
    fullPage: true 
  });
  
  console.log('🔍 FINAL PAGE STATE:');
  console.log('Page Not Found:', finalComponentAnalysis.finalState.isPageNotFound);
  console.log('Has Page Content:', finalComponentAnalysis.finalState.hasPageContent);
  console.log('Page Content Length:', finalComponentAnalysis.finalState.pageContentLength);
  console.log('Visible Text Preview:', finalComponentAnalysis.finalState.visibleText);
  
  // Compile comprehensive debug report
  const debugReport = {
    metadata: {
      timestamp: new Date().toISOString(),
      url: targetUrl,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewport()
    },
    initialAnalysis: componentAnalysis,
    finalAnalysis: finalComponentAnalysis,
    consoleMessages: consoleMessages,
    networkRequests: networkRequests,
    pageErrors: pageErrors,
    performance: {
      totalConsoleMessages: consoleMessages.length,
      totalNetworkRequests: networkRequests.length,
      totalPageErrors: pageErrors.length,
      sparcMessages: consoleMessages.filter(msg => msg.text.includes('SPARC')).length,
      reactMessages: consoleMessages.filter(msg => 
        msg.text.includes('React') || 
        msg.text.includes('setState') || 
        msg.text.includes('setPages')
      ).length
    },
    apiAnalysis: {
      apiCalls: networkRequests.filter(req => req.url.includes('/api/')),
      successfulResponses: networkRequests.filter(req => 
        req.type === 'response' && req.status >= 200 && req.status < 300
      ),
      failedResponses: networkRequests.filter(req => 
        req.type === 'response' && req.status >= 400
      )
    }
  };
  
  // Save debug report
  fs.writeFileSync(
    '/workspaces/agent-feed/live-debug-report.json', 
    JSON.stringify(debugReport, null, 2)
  );
  
  // Create summary
  const summary = `
🔍 LIVE BROWSER DEBUG COMPLETE
=====================================

📊 STATISTICS:
- Console messages: ${debugReport.performance.totalConsoleMessages}
- Network requests: ${debugReport.performance.totalNetworkRequests}
- Page errors: ${debugReport.performance.totalPageErrors}
- SPARC messages: ${debugReport.performance.sparcMessages}
- React messages: ${debugReport.performance.reactMessages}

🎯 FINAL STATE:
- Page Not Found: ${finalComponentAnalysis.finalState.isPageNotFound}
- Has Content: ${finalComponentAnalysis.finalState.hasPageContent}
- Content Length: ${finalComponentAnalysis.finalState.pageContentLength} chars

📡 API ANALYSIS:
- API calls made: ${debugReport.apiAnalysis.apiCalls.length}
- Successful responses: ${debugReport.apiAnalysis.successfulResponses.length}
- Failed responses: ${debugReport.apiAnalysis.failedResponses.length}

📁 FILES CREATED:
- /workspaces/agent-feed/live-debug-report.json
- /workspaces/agent-feed/debug-screenshots/initial-load.png
- /workspaces/agent-feed/debug-screenshots/post-analysis.png
- /workspaces/agent-feed/debug-screenshots/final-state.png

🔥 KEY FINDINGS:
${finalComponentAnalysis.finalState.isPageNotFound ? 
  '❌ COMPONENT STILL SHOWS "Page not found"' : 
  '✅ COMPONENT LOADED SUCCESSFULLY'
}
${debugReport.apiAnalysis.successfulResponses.length > 0 ? 
  '✅ API calls are working' : 
  '❌ No successful API calls detected'
}
  `;
  
  console.log(summary);
  
  fs.writeFileSync('/workspaces/agent-feed/debug-summary.txt', summary);
  
  await browser.close();
  
  console.log('🔍 ALL DEBUG FILES SAVED');
  console.log('🔍 Check live-debug-report.json for detailed analysis');
})().catch(error => {
  console.error('❌ DEBUG SCRIPT ERROR:', error);
  process.exit(1);
});