#!/usr/bin/env node
/**
 * Playwright Connectivity Tests - Implementation following TDD contracts
 * Automated browser-based regression testing for connectivity validation
 */

import fs from 'fs';
import path from 'path';
import playwright from 'playwright';

class ConnectivityPlaywrightRunner {
  constructor(dependencies = {}) {
    // Dependency injection for testability (London School)
    this.playwright = dependencies.playwright || playwright;
    this.fs = dependencies.fs || fs;
    this.screenshotDir = path.join(process.cwd(), 'connectivity-screenshots');
    
    // Ensure screenshot directory exists
    if (!this.fs.existsSync(this.screenshotDir)) {
      this.fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Test browser connectivity across different engines
   */
  async testBrowserConnectivity(urls, browsers = ['chromium', 'firefox', 'webkit']) {
    const results = {};
    
    for (const browserType of browsers) {
      console.log(`🌐 Testing ${browserType}...`);
      results[browserType] = {};
      
      let browser = null;
      let context = null;
      
      try {
        // Launch browser with Codespaces-friendly options
        browser = await this.playwright[browserType].launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-background-timer-throttling'
          ]
        });
        
        context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent: `ConnectivityTester-${browserType}/1.0`
        });
        
        const page = await context.newPage();
        
        for (const url of urls) {
          console.log(`  🔍 Testing ${url}...`);
          
          try {
            const startTime = Date.now();
            
            await page.goto(url, {
              waitUntil: 'networkidle',
              timeout: 30000
            });
            
            const loadTime = Date.now() - startTime;
            
            // Verify page loaded successfully
            const title = await page.title();
            const bodyContent = await page.evaluate(() => document.body.innerHTML.length);
            
            results[browserType][url] = {
              accessible: true,
              loadTime,
              title,
              hasContent: bodyContent > 0,
              browserEngine: browserType
            };
            
            console.log(`    ✅ Loaded in ${loadTime}ms`);
            
          } catch (error) {
            results[browserType][url] = {
              accessible: false,
              error: error.message,
              browserEngine: browserType,
              recommendation: this.getBrowserErrorRecommendation(error)
            };
            
            console.log(`    ❌ Failed: ${error.message.split('\n')[0]}`);
            
            // Capture screenshot on failure
            try {
              const screenshotPath = path.join(
                this.screenshotDir,
                `${browserType}-${url.replace(/[^a-zA-Z0-9]/g, '-')}-failure.png`
              );
              await page.screenshot({ path: screenshotPath, fullPage: true });
              results[browserType][url].screenshotPath = screenshotPath;
            } catch (screenshotError) {
              console.log(`    ⚠️  Screenshot failed: ${screenshotError.message}`);
            }
          }
        }
        
        await page.close();
        
      } catch (browserError) {
        console.log(`  ❌ ${browserType} launch failed: ${browserError.message}`);
        
        for (const url of urls) {
          results[browserType][url] = {
            accessible: false,
            error: `Browser launch failed: ${browserError.message}`,
            browserEngine: browserType
          };
        }
      } finally {
        if (context) await context.close();
        if (browser) await browser.close();
      }
    }
    
    return results;
  }

  /**
   * Test cross-browser compatibility
   */
  async testCrossBrowserCompatibility(urls) {
    console.log('🌐 CROSS-BROWSER COMPATIBILITY TEST');
    console.log('='.repeat(50));
    
    const results = await this.testBrowserConnectivity(urls);
    
    // Analyze cross-browser issues
    const analysis = this.analyzeCrossBrowserResults(results);
    
    return {
      ...results,
      analysis
    };
  }

  /**
   * Test Codespaces-specific browser access
   */
  async testCodespacesBrowserAccess(ports) {
    const results = {};
    
    if (!process.env.CODESPACES) {
      console.log('⚠️  Not running in Codespaces environment');
      return results;
    }
    
    console.log('🌐 CODESPACES BROWSER ACCESS TEST');
    console.log('='.repeat(50));
    
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'githubpreview.dev';
    const codespaceName = process.env.CODESPACE_NAME;
    
    for (const port of ports) {
      const codespacesUrl = `https://${codespaceName}-${port}.${domain}`;
      console.log(`🔍 Testing port ${port}: ${codespacesUrl}`);
      
      let browser = null;
      let context = null;
      
      try {
        browser = await this.playwright.chromium.launch({ headless: true });
        context = await browser.newContext();
        const page = await context.newPage();
        
        const startTime = Date.now();
        const response = await page.goto(codespacesUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const loadTime = Date.now() - startTime;
        const statusCode = response.status();
        
        if (statusCode === 200) {
          results[port] = {
            codespacesUrl,
            accessible: true,
            loadTime,
            statusCode,
            browserCompatible: true,
            recommendation: 'Codespaces port is publicly accessible and browser-compatible'
          };
          console.log(`  ✅ Public access available (${loadTime}ms)`);
          
        } else if (statusCode === 403) {
          results[port] = {
            codespacesUrl,
            accessible: false,
            statusCode,
            isPrivatePort: true,
            recommendation: 'Port is private - set port visibility to public in VS Code'
          };
          console.log(`  ⚠️  Private port (403 Forbidden)`);
          
        } else {
          results[port] = {
            codespacesUrl,
            accessible: false,
            statusCode,
            recommendation: `Unexpected status code ${statusCode} - check server configuration`
          };
          console.log(`  ❌ Unexpected status: ${statusCode}`);
        }
        
      } catch (error) {
        results[port] = {
          codespacesUrl,
          accessible: false,
          error: error.message,
          recommendation: this.getCodespacesErrorRecommendation(error)
        };
        console.log(`  ❌ Error: ${error.message.split('\n')[0]}`);
      } finally {
        if (context) await context.close();
        if (browser) await browser.close();
      }
    }
    
    return results;
  }

  /**
   * Test real-world user scenarios
   */
  async testUserScenarios(scenarios) {
    const results = {};
    
    console.log('👤 USER SCENARIO TESTING');
    console.log('='.repeat(50));
    
    let browser = null;
    let context = null;
    
    try {
      browser = await this.playwright.chromium.launch({ headless: true });
      context = await browser.newContext();
      
      for (const scenario of scenarios) {
        console.log(`🔍 Testing scenario: ${scenario.name}`);
        
        const page = await context.newPage();
        
        try {
          const startTime = Date.now();
          
          await page.goto(scenario.url, {
            waitUntil: 'networkidle',
            timeout: 30000
          });
          
          const loadTime = Date.now() - startTime;
          
          // Perform scenario-specific checks
          let checksComplete = true;
          const checkResults = {};
          
          if (scenario.checks) {
            for (const check of scenario.checks) {
              try {
                if (check.startsWith('#') || check.startsWith('.')) {
                  // CSS selector check
                  const element = await page.waitForSelector(check, { timeout: 5000 });
                  checkResults[check] = { found: !!element };
                } else if (check.startsWith('/')) {
                  // API endpoint check
                  const response = await page.evaluate(async (endpoint) => {
                    try {
                      const resp = await fetch(endpoint);
                      return { status: resp.status, ok: resp.ok };
                    } catch (err) {
                      return { error: err.message };
                    }
                  }, check);
                  checkResults[check] = response;
                } else {
                  // Text content check
                  const hasText = await page.locator(`text=${check}`).count() > 0;
                  checkResults[check] = { found: hasText };
                }
              } catch (checkError) {
                checksComplete = false;
                checkResults[check] = { error: checkError.message };
              }
            }
          }
          
          results[scenario.name] = {
            accessible: true,
            loadTime,
            checksComplete,
            checkResults,
            url: scenario.url
          };
          
          console.log(`  ✅ Scenario completed (${loadTime}ms)`);
          
        } catch (error) {
          results[scenario.name] = {
            accessible: false,
            error: error.message,
            url: scenario.url,
            recommendation: this.getScenarioErrorRecommendation(error)
          };
          
          console.log(`  ❌ Scenario failed: ${error.message.split('\n')[0]}`);
          
          // Capture failure screenshot
          try {
            const screenshotPath = path.join(
              this.screenshotDir,
              `${scenario.name.toLowerCase().replace(/\s+/g, '-')}-failure.png`
            );
            await page.screenshot({ path: screenshotPath, fullPage: true });
            results[scenario.name].screenshotPath = screenshotPath;
          } catch (screenshotError) {
            console.log(`    ⚠️  Screenshot failed: ${screenshotError.message}`);
          }
        } finally {
          await page.close();
        }
      }
      
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
    
    return results;
  }

  /**
   * Test server performance under load
   */
  async testLoadPerformance(url, concurrentRequests = 5) {
    console.log(`⚡ LOAD PERFORMANCE TEST`);
    console.log(`🔍 Testing ${url} with ${concurrentRequests} concurrent requests`);
    
    const results = {
      url,
      concurrentRequests,
      responses: [],
      averageLoadTime: 0,
      maxLoadTime: 0,
      minLoadTime: Infinity,
      allRequestsSucceeded: true,
      performanceIssue: false
    };
    
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.performSingleLoadTest(url, i));
    }
    
    try {
      const responses = await Promise.all(promises);
      results.responses = responses;
      
      // Calculate performance metrics
      const loadTimes = responses
        .filter(r => r.success)
        .map(r => r.loadTime);
      
      if (loadTimes.length > 0) {
        results.averageLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length;
        results.maxLoadTime = Math.max(...loadTimes);
        results.minLoadTime = Math.min(...loadTimes);
      }
      
      results.allRequestsSucceeded = responses.every(r => r.success);
      results.successRate = (responses.filter(r => r.success).length / responses.length) * 100;
      
      // Detect performance issues
      if (results.averageLoadTime > 3000) {
        results.performanceIssue = true;
        results.recommendation = 'Server response time is slow - optimize server performance';
      } else if (results.successRate < 100) {
        results.performanceIssue = true;
        results.recommendation = 'Some requests failed under load - check server capacity';
      }
      
      console.log(`  📊 Average load time: ${Math.round(results.averageLoadTime)}ms`);
      console.log(`  📈 Success rate: ${results.successRate}%`);
      
      if (results.performanceIssue) {
        console.log(`  ⚠️  Performance issue detected`);
      } else {
        console.log(`  ✅ Performance acceptable`);
      }
      
    } catch (error) {
      results.error = error.message;
      results.allRequestsSucceeded = false;
      console.log(`  ❌ Load test failed: ${error.message}`);
    }
    
    return results;
  }

  /**
   * Perform single load test request
   */
  async performSingleLoadTest(url, requestId) {
    let browser = null;
    let context = null;
    
    try {
      const startTime = Date.now();
      
      browser = await this.playwright.chromium.launch({ headless: true });
      context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      
      const loadTime = Date.now() - startTime;
      
      // Get performance metrics from browser
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: perfData ? perfData.loadEventEnd - perfData.loadEventStart : 0,
          domContentLoaded: perfData ? perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart : 0
        };
      });
      
      return {
        requestId,
        success: true,
        loadTime,
        performanceMetrics
      };
      
    } catch (error) {
      return {
        requestId,
        success: false,
        error: error.message
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Run comprehensive regression suite
   */
  async runRegressionSuite(config) {
    console.log('🧪 COMPREHENSIVE CONNECTIVITY REGRESSION SUITE');
    console.log('='.repeat(60));
    console.log(`📅 ${new Date().toISOString()}`);
    console.log();
    
    const report = {
      timestamp: new Date().toISOString(),
      config,
      browserConnectivity: {},
      userScenarios: {},
      loadPerformance: {},
      codespacesAccess: {},
      summary: {},
      recommendations: []
    };
    
    try {
      // 1. Browser connectivity tests
      if (config.urls && config.browsers) {
        console.log('1️⃣ Browser Connectivity Tests');
        report.browserConnectivity = await this.testBrowserConnectivity(config.urls, config.browsers);
        console.log();
      }
      
      // 2. User scenario tests
      if (config.scenarios) {
        console.log('2️⃣ User Scenario Tests');
        report.userScenarios = await this.testUserScenarios(config.scenarios);
        console.log();
      }
      
      // 3. Load performance tests
      if (config.loadTest) {
        console.log('3️⃣ Load Performance Tests');
        report.loadPerformance = await this.testLoadPerformance(
          config.loadTest.url,
          config.loadTest.concurrency || 3
        );
        console.log();
      }
      
      // 4. Codespaces access tests
      if (process.env.CODESPACES && config.ports) {
        console.log('4️⃣ Codespaces Access Tests');
        report.codespacesAccess = await this.testCodespacesBrowserAccess(config.ports);
        console.log();
      }
      
      // Generate summary and recommendations
      report.summary = this.generateRegressionSummary(report);
      report.recommendations = this.generateRegressionRecommendations(report);
      
    } catch (error) {
      console.error('❌ Regression suite failed:', error.message);
      report.error = error.message;
    }
    
    return report;
  }

  /**
   * Generate regression test summary
   */
  generateRegressionSummary(report) {
    const summary = {
      allBrowsersWorking: true,
      allScenariosPass: true,
      performanceAcceptable: true,
      codespacesReady: true,
      totalIssues: 0
    };
    
    // Analyze browser connectivity
    for (const [browser, results] of Object.entries(report.browserConnectivity)) {
      for (const [url, result] of Object.entries(results)) {
        if (!result.accessible) {
          summary.allBrowsersWorking = false;
          summary.totalIssues++;
        }
      }
    }
    
    // Analyze user scenarios
    for (const [scenario, result] of Object.entries(report.userScenarios)) {
      if (!result.accessible || !result.checksComplete) {
        summary.allScenariosPass = false;
        summary.totalIssues++;
      }
    }
    
    // Analyze performance
    if (report.loadPerformance.performanceIssue) {
      summary.performanceAcceptable = false;
      summary.totalIssues++;
    }
    
    // Analyze Codespaces
    for (const [port, result] of Object.entries(report.codespacesAccess)) {
      if (!result.accessible) {
        summary.codespacesReady = false;
        summary.totalIssues++;
      }
    }
    
    return summary;
  }

  /**
   * Generate regression recommendations
   */
  generateRegressionRecommendations(report) {
    const recommendations = [];
    
    // Browser issues
    for (const [browser, results] of Object.entries(report.browserConnectivity)) {
      for (const [url, result] of Object.entries(results)) {
        if (!result.accessible && result.recommendation) {
          recommendations.push(`🌐 ${browser}: ${result.recommendation}`);
        }
      }
    }
    
    // Scenario issues
    for (const [scenario, result] of Object.entries(report.userScenarios)) {
      if (!result.accessible && result.recommendation) {
        recommendations.push(`👤 ${scenario}: ${result.recommendation}`);
      }
    }
    
    // Performance issues
    if (report.loadPerformance.recommendation) {
      recommendations.push(`⚡ Performance: ${report.loadPerformance.recommendation}`);
    }
    
    // Codespaces issues
    for (const [port, result] of Object.entries(report.codespacesAccess)) {
      if (!result.accessible && result.recommendation) {
        recommendations.push(`🌐 Port ${port}: ${result.recommendation}`);
      }
    }
    
    return recommendations;
  }

  /**
   * Analyze cross-browser results for compatibility issues
   */
  analyzeCrossBrowserResults(results) {
    const analysis = {
      browserSpecificIssues: {},
      universalIssues: [],
      compatibilityScore: 100
    };
    
    const browsers = Object.keys(results);
    const allUrls = new Set();
    
    // Collect all tested URLs
    for (const browserResults of Object.values(results)) {
      Object.keys(browserResults).forEach(url => allUrls.add(url));
    }
    
    // Analyze each URL across browsers
    for (const url of allUrls) {
      const urlResults = {};
      
      for (const browser of browsers) {
        urlResults[browser] = results[browser][url];
      }
      
      // Check for browser-specific issues
      const workingBrowsers = browsers.filter(b => urlResults[b]?.accessible);
      const failingBrowsers = browsers.filter(b => !urlResults[b]?.accessible);
      
      if (failingBrowsers.length === browsers.length) {
        analysis.universalIssues.push(`${url}: Failed in all browsers`);
        analysis.compatibilityScore -= 20;
      } else if (failingBrowsers.length > 0) {
        analysis.browserSpecificIssues[url] = {
          working: workingBrowsers,
          failing: failingBrowsers
        };
        analysis.compatibilityScore -= 10;
      }
    }
    
    analysis.compatibilityScore = Math.max(0, analysis.compatibilityScore);
    
    return analysis;
  }

  /**
   * Get error recommendation for browser issues
   */
  getBrowserErrorRecommendation(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('net::err_connection_refused')) {
      return 'Server is not running or not accepting connections';
    }
    if (errorMessage.includes('timeout')) {
      return 'Server response too slow - optimize performance or increase timeout';
    }
    if (errorMessage.includes('net::err_name_not_resolved')) {
      return 'DNS resolution failed - check hostname and DNS configuration';
    }
    if (errorMessage.includes('browser launch')) {
      return 'Browser engine failed to launch - check system dependencies';
    }
    
    return 'Unknown browser connectivity issue - check server and network configuration';
  }

  /**
   * Get error recommendation for Codespaces issues
   */
  getCodespacesErrorRecommendation(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return 'Port is private - set port visibility to public in VS Code';
    }
    if (errorMessage.includes('timeout')) {
      return 'Request timed out - check server performance and port forwarding';
    }
    if (errorMessage.includes('connection')) {
      return 'Connection failed - ensure server is running and bound to 0.0.0.0';
    }
    
    return 'Check server status and Codespaces port forwarding configuration';
  }

  /**
   * Get error recommendation for scenario issues
   */
  getScenarioErrorRecommendation(error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('selector')) {
      return 'Page element not found - check if page loaded correctly';
    }
    if (errorMessage.includes('navigation')) {
      return 'Page navigation failed - check server response and content';
    }
    if (errorMessage.includes('timeout')) {
      return 'Page load timeout - optimize server response time';
    }
    
    return 'User scenario test failed - check application functionality';
  }

  /**
   * Print regression report
   */
  printRegressionReport(report) {
    console.log('📊 REGRESSION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`🕒 Timestamp: ${report.timestamp}`);
    
    console.log('\n📋 SUMMARY:');
    console.log(`   All Browsers Working: ${report.summary.allBrowsersWorking ? '✅' : '❌'}`);
    console.log(`   All Scenarios Pass: ${report.summary.allScenariosPass ? '✅' : '❌'}`);
    console.log(`   Performance Acceptable: ${report.summary.performanceAcceptable ? '✅' : '❌'}`);
    
    if (process.env.CODESPACES) {
      console.log(`   Codespaces Ready: ${report.summary.codespacesReady ? '✅' : '❌'}`);
    }
    
    console.log(`   Total Issues: ${report.summary.totalIssues}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   ${rec}`));
    } else {
      console.log('\n🎉 All regression tests passed!');
    }
    
    console.log(`\n📄 Screenshots saved to: ${this.screenshotDir}`);
    console.log('='.repeat(60));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ConnectivityPlaywrightRunner();
  
  // Default configuration
  const defaultConfig = {
    urls: ['http://localhost:5173', 'http://localhost:3000'],
    browsers: ['chromium'],
    scenarios: [
      {
        name: 'Frontend Loading',
        url: 'http://localhost:5173',
        checks: ['#root']
      },
      {
        name: 'Backend API',
        url: 'http://localhost:3000',
        checks: ['/api/health']
      }
    ],
    loadTest: {
      url: 'http://localhost:3000',
      concurrency: 3
    },
    ports: [3000, 5173]
  };
  
  runner.runRegressionSuite(defaultConfig)
    .then(report => {
      runner.printRegressionReport(report);
      
      // Save report
      const reportPath = path.join(process.cwd(), 'playwright-connectivity-report.json');
      runner.fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Full report saved to: ${reportPath}`);
      
      // Exit with appropriate code
      process.exit(report.summary.totalIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Playwright regression tests failed:', error.message);
      process.exit(1);
    });
}

export default ConnectivityPlaywrightRunner;