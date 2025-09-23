/**
 * CRITICAL PRODUCTION DEBUGGING - Browser Automation
 * Target: React component execution flow for persistent "Page not found" error
 * URL: http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ProductionDebugAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.debugData = {
      timeline: [],
      apiCalls: [],
      consoleLog: [],
      reactState: [],
      domChanges: [],
      networkRequests: [],
      errorEvents: [],
      performanceMetrics: {}
    };
    this.startTime = Date.now();
  }

  async initialize() {
    console.log('🚀 Initializing Browser Automation for Production Debug...');
    
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      devtools: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable all debugging features
    await this.setupNetworkInterception();
    await this.setupConsoleLogging();
    await this.setupReactDevToolsMonitoring();
    await this.setupDOMObserver();
    await this.setupPerformanceMonitoring();
    
    this.log('Browser initialized with full monitoring enabled');
  }

  async setupNetworkInterception() {
    this.page.on('request', (request) => {
      const timestamp = Date.now() - this.startTime;
      const requestData = {
        timestamp,
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      };
      
      this.debugData.networkRequests.push(requestData);
      this.log(`📡 REQUEST [${timestamp}ms]: ${request.method()} ${request.url()}`);
    });

    this.page.on('response', async (response) => {
      const timestamp = Date.now() - this.startTime;
      let responseBody = null;
      
      try {
        if (response.url().includes('/api/')) {
          responseBody = await response.text();
        }
      } catch (e) {
        this.log(`⚠️ Could not read response body for ${response.url()}: ${e.message}`);
      }

      const responseData = {
        timestamp,
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        body: responseBody
      };
      
      this.debugData.networkRequests.push(responseData);
      this.log(`📨 RESPONSE [${timestamp}ms]: ${response.status()} ${response.url()}`);
      
      // Track API responses specifically
      if (response.url().includes('/api/')) {
        this.debugData.apiCalls.push({
          timestamp,
          url: response.url(),
          status: response.status(),
          body: responseBody,
          duration: timestamp - this.findRequestTimestamp(response.url())
        });
      }
    });
  }

  async setupConsoleLogging() {
    this.page.on('console', (msg) => {
      const timestamp = Date.now() - this.startTime;
      const logEntry = {
        timestamp,
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      this.debugData.consoleLog.push(logEntry);
      this.log(`🖥️ CONSOLE [${timestamp}ms] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    this.page.on('pageerror', (error) => {
      const timestamp = Date.now() - this.startTime;
      const errorData = {
        timestamp,
        type: 'pageerror',
        message: error.message,
        stack: error.stack
      };
      
      this.debugData.errorEvents.push(errorData);
      this.log(`❌ PAGE ERROR [${timestamp}ms]: ${error.message}`);
    });
  }

  async setupReactDevToolsMonitoring() {
    // Inject React state monitoring script
    await this.page.addInitScript(() => {
      window.__REACT_DEBUG_DATA__ = {
        componentStates: [],
        stateChanges: [],
        renderCycles: []
      };

      // Hook into React setState
      const originalSetState = React.Component.prototype.setState;
      React.Component.prototype.setState = function(partialState, callback) {
        const timestamp = Date.now();
        window.__REACT_DEBUG_DATA__.stateChanges.push({
          timestamp,
          component: this.constructor.name,
          currentState: JSON.parse(JSON.stringify(this.state || {})),
          newState: typeof partialState === 'function' ? 'function' : partialState,
          stackTrace: new Error().stack
        });
        
        console.log('🔄 REACT setState called:', {
          component: this.constructor.name,
          timestamp,
          state: this.state,
          newState: partialState
        });
        
        return originalSetState.call(this, partialState, callback);
      };

      // Hook into function components with state
      if (window.React && window.React.useState) {
        const originalUseState = window.React.useState;
        window.React.useState = function(initialState) {
          const result = originalUseState(initialState);
          const [state, setState] = result;
          
          const wrappedSetState = function(newState) {
            const timestamp = Date.now();
            window.__REACT_DEBUG_DATA__.stateChanges.push({
              timestamp,
              component: 'FunctionComponent',
              currentState: state,
              newState: typeof newState === 'function' ? 'function' : newState,
              stackTrace: new Error().stack
            });
            
            console.log('🔄 REACT useState setState called:', {
              timestamp,
              currentState: state,
              newState
            });
            
            return setState(newState);
          };
          
          return [state, wrappedSetState];
        };
      }
    });
  }

  async setupDOMObserver() {
    await this.page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const timestamp = Date.now();
          
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                console.log('🔧 DOM ADDED:', {
                  timestamp,
                  tagName: node.tagName,
                  className: node.className,
                  textContent: node.textContent?.substring(0, 100)
                });
                
                // Specifically watch for "Page not found" text
                if (node.textContent && node.textContent.includes('Page not found')) {
                  console.log('🚨 "Page not found" DETECTED:', {
                    timestamp,
                    element: node.outerHTML,
                    parentElement: node.parentElement?.outerHTML
                  });
                }
              }
            });
          }
          
          if (mutation.type === 'attributes') {
            console.log('🔧 DOM ATTR CHANGED:', {
              timestamp,
              target: mutation.target.tagName,
              attribute: mutation.attributeName,
              oldValue: mutation.oldValue,
              newValue: mutation.target.getAttribute(mutation.attributeName)
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
      });
    });
  }

  async setupPerformanceMonitoring() {
    // Enable performance metrics
    await this.page.evaluate(() => {
      window.performance.mark('debug-start');
      
      // Monitor component render timing
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          const perfEntries = window.performance.getEntriesByType('measure');
          console.log('📊 PERFORMANCE MEASURES:', perfEntries);
        });
      }
    });
  }

  async navigateAndMonitor(targetUrl) {
    this.log(`🎯 Navigating to target URL: ${targetUrl}`);
    
    const startNavigation = Date.now() - this.startTime;
    this.debugData.timeline.push({
      timestamp: startNavigation,
      event: 'navigation_start',
      url: targetUrl
    });

    try {
      // Navigate with extended timeout
      await this.page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const navigationComplete = Date.now() - this.startTime;
      this.debugData.timeline.push({
        timestamp: navigationComplete,
        event: 'navigation_complete',
        duration: navigationComplete - startNavigation
      });

      this.log(`✅ Navigation completed in ${navigationComplete - startNavigation}ms`);
      
      // Wait for React to initialize
      await this.page.waitForFunction(() => {
        return window.React !== undefined;
      }, { timeout: 10000 });

      this.log('⚛️ React detected');

      // Monitor initial render
      await this.monitorInitialRender();
      
      // Wait and monitor for state changes
      await this.monitorStateChanges();
      
      // Check final page state
      await this.analyzeFinalState();
      
    } catch (error) {
      this.log(`❌ Navigation failed: ${error.message}`);
      this.debugData.errorEvents.push({
        timestamp: Date.now() - this.startTime,
        type: 'navigation_error',
        message: error.message,
        stack: error.stack
      });
    }
  }

  async monitorInitialRender() {
    this.log('👀 Monitoring initial render...');
    
    // Wait for main content to load
    try {
      await this.page.waitForSelector('[data-testid="agent-page-content"], .agent-page, main', {
        timeout: 5000
      });
      
      const renderComplete = Date.now() - this.startTime;
      this.debugData.timeline.push({
        timestamp: renderComplete,
        event: 'initial_render_complete'
      });
      
      this.log(`📱 Initial render completed at ${renderComplete}ms`);
    } catch (e) {
      this.log(`⚠️ Initial render timeout: ${e.message}`);
    }

    // Capture initial page state
    const pageContent = await this.page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500),
        hasPageNotFound: document.body.textContent.includes('Page not found'),
        reactDevData: window.__REACT_DEBUG_DATA__ || null
      };
    });

    this.debugData.timeline.push({
      timestamp: Date.now() - this.startTime,
      event: 'initial_state_captured',
      data: pageContent
    });

    this.log(`📋 Initial state: ${pageContent.hasPageNotFound ? 'Page not found visible' : 'Content loaded'}`);
  }

  async monitorStateChanges() {
    this.log('🔍 Monitoring state changes for 10 seconds...');
    
    const monitorStart = Date.now();
    const monitorDuration = 10000; // 10 seconds
    
    while (Date.now() - monitorStart < monitorDuration) {
      // Capture React debug data
      const reactData = await this.page.evaluate(() => {
        return window.__REACT_DEBUG_DATA__ || null;
      });

      if (reactData && reactData.stateChanges.length > this.debugData.reactState.length) {
        const newChanges = reactData.stateChanges.slice(this.debugData.reactState.length);
        this.debugData.reactState.push(...newChanges);
        
        newChanges.forEach(change => {
          this.log(`🔄 State change detected: ${change.component} at ${change.timestamp}ms`);
        });
      }

      // Check for DOM changes
      const currentState = await this.page.evaluate(() => {
        return {
          hasPageNotFound: document.body.textContent.includes('Page not found'),
          mainContent: document.querySelector('[data-testid="agent-page-content"], .agent-page, main')?.textContent?.substring(0, 200),
          timestamp: Date.now()
        };
      });

      this.debugData.domChanges.push(currentState);

      await this.page.waitForTimeout(500); // Check every 500ms
    }
    
    this.log('⏱️ State monitoring completed');
  }

  async analyzeFinalState() {
    this.log('🔬 Analyzing final page state...');
    
    const finalState = await this.page.evaluate(() => {
      const pageData = {
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title,
        hasPageNotFound: document.body.textContent.includes('Page not found'),
        bodyText: document.body.textContent,
        reactDevData: window.__REACT_DEBUG_DATA__,
        consoleLogs: [],
        networkCalls: window.performance.getEntriesByType('navigation'),
        domTree: document.documentElement.outerHTML.length
      };

      // Get all React components in the page
      const reactElements = document.querySelectorAll('[data-reactroot], [data-react-helmet]');
      pageData.reactElementsCount = reactElements.length;

      // Check for any error boundaries
      const errorElements = document.querySelectorAll('[data-testid*="error"], .error, .error-boundary');
      pageData.errorElements = Array.from(errorElements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 100)
      }));

      return pageData;
    });

    this.debugData.timeline.push({
      timestamp: Date.now() - this.startTime,
      event: 'final_analysis_complete',
      data: finalState
    });

    this.log(`🎯 Final analysis: ${finalState.hasPageNotFound ? 'ISSUE CONFIRMED - Page not found visible' : 'SUCCESS - Content loaded'}`);
    
    return finalState;
  }

  findRequestTimestamp(url) {
    const request = this.debugData.networkRequests
      .reverse()
      .find(req => req.type === 'request' && req.url === url);
    return request ? request.timestamp : 0;
  }

  log(message) {
    const timestamp = Date.now() - this.startTime;
    const logEntry = `[${timestamp}ms] ${message}`;
    console.log(logEntry);
    this.debugData.timeline.push({
      timestamp,
      event: 'debug_log',
      message
    });
  }

  async generateReport() {
    this.log('📄 Generating comprehensive debug report...');
    
    const report = {
      executionSummary: {
        totalDuration: Date.now() - this.startTime,
        targetUrl: 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723',
        timestamp: new Date().toISOString(),
        browserUsed: 'Chromium via Playwright'
      },
      timeline: this.debugData.timeline,
      apiCallAnalysis: this.analyzeApiCalls(),
      reactStateAnalysis: this.analyzeReactState(),
      domAnalysis: this.analyzeDomChanges(),
      networkAnalysis: this.analyzeNetworkRequests(),
      errorAnalysis: this.analyzeErrors(),
      performanceAnalysis: this.analyzePerformance(),
      rootCauseAnalysis: this.performRootCauseAnalysis(),
      recommendedFixes: this.generateFixRecommendations()
    };

    // Save detailed report
    const reportPath = path.join(__dirname, 'production-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate summary report
    const summaryPath = path.join(__dirname, 'production-debug-summary.md');
    fs.writeFileSync(summaryPath, this.generateMarkdownSummary(report));
    
    this.log(`📋 Reports saved: ${reportPath} and ${summaryPath}`);
    
    return report;
  }

  analyzeApiCalls() {
    const apiCalls = this.debugData.apiCalls;
    const analysis = {
      totalCalls: apiCalls.length,
      successfulCalls: apiCalls.filter(call => call.status >= 200 && call.status < 300).length,
      failedCalls: apiCalls.filter(call => call.status >= 400).length,
      averageResponseTime: apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length || 0,
      callsByEndpoint: {}
    };

    apiCalls.forEach(call => {
      const endpoint = call.url.split('?')[0];
      if (!analysis.callsByEndpoint[endpoint]) {
        analysis.callsByEndpoint[endpoint] = [];
      }
      analysis.callsByEndpoint[endpoint].push(call);
    });

    return analysis;
  }

  analyzeReactState() {
    const stateChanges = this.debugData.reactState;
    return {
      totalStateChanges: stateChanges.length,
      componentsByStateChanges: stateChanges.reduce((acc, change) => {
        acc[change.component] = (acc[change.component] || 0) + 1;
        return acc;
      }, {}),
      stateChangeTimeline: stateChanges.map(change => ({
        timestamp: change.timestamp,
        component: change.component,
        hasNewState: !!change.newState
      }))
    };
  }

  analyzeDomChanges() {
    const changes = this.debugData.domChanges;
    const pageNotFoundStates = changes.map(change => change.hasPageNotFound);
    const stateTransitions = [];
    
    for (let i = 1; i < pageNotFoundStates.length; i++) {
      if (pageNotFoundStates[i] !== pageNotFoundStates[i-1]) {
        stateTransitions.push({
          timestamp: changes[i].timestamp,
          from: pageNotFoundStates[i-1] ? 'page_not_found' : 'content_visible',
          to: pageNotFoundStates[i] ? 'page_not_found' : 'content_visible'
        });
      }
    }

    return {
      totalDomSnapshots: changes.length,
      finalState: changes[changes.length - 1]?.hasPageNotFound ? 'page_not_found' : 'content_visible',
      stateTransitions,
      persistentPageNotFound: pageNotFoundStates.every(state => state)
    };
  }

  analyzeNetworkRequests() {
    const requests = this.debugData.networkRequests;
    return {
      totalRequests: requests.filter(r => r.type === 'request').length,
      totalResponses: requests.filter(r => r.type === 'response').length,
      requestsByDomain: requests.reduce((acc, req) => {
        if (req.type === 'request') {
          const domain = new URL(req.url).origin;
          acc[domain] = (acc[domain] || 0) + 1;
        }
        return acc;
      }, {})
    };
  }

  analyzeErrors() {
    return {
      totalErrors: this.debugData.errorEvents.length,
      errorTypes: this.debugData.errorEvents.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {}),
      criticalErrors: this.debugData.errorEvents.filter(error => 
        error.message?.includes('network') || 
        error.message?.includes('failed') ||
        error.message?.includes('404')
      )
    };
  }

  analyzePerformance() {
    const timeline = this.debugData.timeline;
    const navigationStart = timeline.find(t => t.event === 'navigation_start')?.timestamp || 0;
    const navigationComplete = timeline.find(t => t.event === 'navigation_complete')?.timestamp || 0;
    const renderComplete = timeline.find(t => t.event === 'initial_render_complete')?.timestamp || 0;

    return {
      navigationTime: navigationComplete - navigationStart,
      renderTime: renderComplete - navigationComplete,
      totalLoadTime: renderComplete - navigationStart,
      apiResponseTimes: this.debugData.apiCalls.map(call => call.duration)
    };
  }

  performRootCauseAnalysis() {
    const domAnalysis = this.analyzeDomChanges();
    const apiAnalysis = this.analyzeApiCalls();
    const reactAnalysis = this.analyzeReactState();
    const errorAnalysis = this.analyzeErrors();

    const possibleCauses = [];

    // Check if API is responding
    if (apiAnalysis.failedCalls > 0) {
      possibleCauses.push({
        category: 'API_FAILURE',
        confidence: 'HIGH',
        description: `${apiAnalysis.failedCalls} API calls failed`,
        evidence: this.debugData.apiCalls.filter(call => call.status >= 400)
      });
    }

    // Check if React state is updating
    if (reactAnalysis.totalStateChanges === 0) {
      possibleCauses.push({
        category: 'REACT_STATE_NOT_UPDATING',
        confidence: 'HIGH',
        description: 'No React state changes detected',
        evidence: 'Zero setState calls captured'
      });
    }

    // Check for race conditions
    if (domAnalysis.stateTransitions.length > 0) {
      possibleCauses.push({
        category: 'RACE_CONDITION',
        confidence: 'MEDIUM',
        description: 'UI state transitions detected',
        evidence: domAnalysis.stateTransitions
      });
    }

    // Check for persistent "Page not found"
    if (domAnalysis.persistentPageNotFound) {
      possibleCauses.push({
        category: 'PERSISTENT_NOT_FOUND',
        confidence: 'HIGH',
        description: 'Page not found message never cleared',
        evidence: 'All DOM snapshots show page not found'
      });
    }

    return {
      possibleCauses,
      mostLikelyCause: possibleCauses.reduce((prev, current) => {
        const confidenceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return confidenceOrder[current.confidence] > confidenceOrder[prev?.confidence || 'LOW'] ? current : prev;
      }, null)
    };
  }

  generateFixRecommendations() {
    const rootCause = this.performRootCauseAnalysis();
    const recommendations = [];

    if (rootCause.mostLikelyCause) {
      switch (rootCause.mostLikelyCause.category) {
        case 'API_FAILURE':
          recommendations.push({
            priority: 'CRITICAL',
            fix: 'Implement proper error handling for API failures',
            code: `
// Add error boundary and retry logic
const [error, setError] = useState(null);
const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await api.get(endpoint);
      if (!response.ok) throw new Error(\`API returned \${response.status}\`);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      if (retryCount < 3) {
        setTimeout(() => setRetryCount(prev => prev + 1), 1000);
      }
    }
  };
  fetchData();
}, [endpoint, retryCount]);`
          });
          break;

        case 'REACT_STATE_NOT_UPDATING':
          recommendations.push({
            priority: 'CRITICAL',
            fix: 'Fix React state update mechanism',
            code: `
// Ensure state updates are properly triggering re-renders
const [pageData, setPageData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadPage = async () => {
    setLoading(true);
    try {
      const data = await fetchPageData(pageId);
      setPageData(data); // This should trigger re-render
    } catch (error) {
      setPageData(null);
    } finally {
      setLoading(false);
    }
  };
  loadPage();
}, [pageId]);

// Use loading state to prevent showing "not found" prematurely
if (loading) return <div>Loading...</div>;
if (!pageData) return <div>Page not found</div>;`
          });
          break;

        case 'RACE_CONDITION':
          recommendations.push({
            priority: 'HIGH',
            fix: 'Implement proper loading states to prevent race conditions',
            code: `
// Use useEffect cleanup to prevent state updates after unmount
useEffect(() => {
  let isMounted = true;
  
  const loadData = async () => {
    try {
      const data = await api.get(endpoint);
      if (isMounted) {
        setPageData(data);
        setLoading(false);
      }
    } catch (error) {
      if (isMounted) {
        setError(error);
        setLoading(false);
      }
    }
  };
  
  loadData();
  
  return () => {
    isMounted = false;
  };
}, [endpoint]);`
          });
          break;
      }
    }

    // Add general recommendations
    recommendations.push({
      priority: 'MEDIUM',
      fix: 'Add comprehensive logging for debugging',
      code: `
// Add debugging hooks
useEffect(() => {
  console.log('Component mounted:', { pageId, endpoint });
}, []);

useEffect(() => {
  console.log('Data state changed:', { pageData, loading, error });
}, [pageData, loading, error]);`
    });

    return recommendations;
  }

  generateMarkdownSummary(report) {
    return `# Production Debug Report - Agent Page Issue

## Executive Summary
- **Target URL**: ${report.executionSummary.targetUrl}
- **Execution Time**: ${report.executionSummary.totalDuration}ms
- **Timestamp**: ${report.executionSummary.timestamp}

## Root Cause Analysis
${report.rootCauseAnalysis.mostLikelyCause ? `
**Most Likely Cause**: ${report.rootCauseAnalysis.mostLikelyCause.category}
- **Confidence**: ${report.rootCauseAnalysis.mostLikelyCause.confidence}
- **Description**: ${report.rootCauseAnalysis.mostLikelyCause.description}
` : 'No clear root cause identified'}

## API Analysis
- **Total API Calls**: ${report.apiCallAnalysis.totalCalls}
- **Successful**: ${report.apiCallAnalysis.successfulCalls}
- **Failed**: ${report.apiCallAnalysis.failedCalls}
- **Average Response Time**: ${report.apiCallAnalysis.averageResponseTime.toFixed(2)}ms

## React State Analysis
- **Total State Changes**: ${report.reactStateAnalysis.totalStateChanges}
- **Components with State Changes**: ${Object.keys(report.reactStateAnalysis.componentsByStateChanges).length}

## DOM Analysis
- **Final State**: ${report.domAnalysis.finalState}
- **State Transitions**: ${report.domAnalysis.stateTransitions.length}
- **Persistent "Page Not Found"**: ${report.domAnalysis.persistentPageNotFound}

## Performance Metrics
- **Navigation Time**: ${report.performanceAnalysis.navigationTime}ms
- **Render Time**: ${report.performanceAnalysis.renderTime}ms
- **Total Load Time**: ${report.performanceAnalysis.totalLoadTime}ms

## Recommended Fixes
${report.recommendedFixes.map((fix, index) => `
### ${index + 1}. ${fix.fix} (Priority: ${fix.priority})
\`\`\`javascript
${fix.code}
\`\`\`
`).join('\n')}

## Next Steps
1. Implement the highest priority fixes first
2. Add comprehensive error handling
3. Implement proper loading states
4. Add debugging hooks for future issues
`;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Export for module usage
module.exports = ProductionDebugAutomation;

// CLI execution
if (require.main === module) {
  (async () => {
    const debugger = new ProductionDebugAutomation();
    
    try {
      await debugger.initialize();
      await debugger.navigateAndMonitor('http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');
      const report = await debugger.generateReport();
      
      console.log('\n' + '='.repeat(80));
      console.log('🎯 PRODUCTION DEBUG AUTOMATION COMPLETE');
      console.log('='.repeat(80));
      console.log(`📊 Total Duration: ${report.executionSummary.totalDuration}ms`);
      console.log(`🔍 Root Cause: ${report.rootCauseAnalysis.mostLikelyCause?.category || 'Not determined'}`);
      console.log(`📈 API Calls: ${report.apiCallAnalysis.totalCalls} (${report.apiCallAnalysis.failedCalls} failed)`);
      console.log(`⚛️ React State Changes: ${report.reactStateAnalysis.totalStateChanges}`);
      console.log(`🎨 DOM Final State: ${report.domAnalysis.finalState}`);
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('❌ Debug automation failed:', error);
    } finally {
      await debugger.cleanup();
    }
  })();
}