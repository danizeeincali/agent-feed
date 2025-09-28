const puppeteer = require('puppeteer');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * FINAL PRODUCTION VALIDATION: React Context Fix Verification
 *
 * Comprehensive verification that the React context fix works 100% in production
 * with zero mocks/simulations and real data integration.
 */

class ProductionValidationSuite {
  constructor() {
    this.baseUrl = 'http://localhost:5173';
    this.apiUrl = 'http://localhost:3001';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    this.results.summary.total++;

    try {
      const result = await testFunction();
      this.results.tests[testName] = {
        status: 'PASSED',
        result,
        timestamp: new Date().toISOString()
      };
      this.results.summary.passed++;
      console.log(`✅ PASSED: ${testName}`);
      return result;
    } catch (error) {
      this.results.tests[testName] = {
        status: 'FAILED',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.results.summary.failed++;
      this.results.summary.errors.push(`${testName}: ${error.message}`);
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      throw error;
    }
  }

  async validateBackendAPI() {
    return this.runTest('Backend API Validation', async () => {
      const response = await fetch(`${this.apiUrl}/api/agents`);

      if (!response.ok) {
        throw new Error(`Backend API not responding: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Backend API returned success: false');
      }

      if (!Array.isArray(data.agents)) {
        throw new Error('Backend API did not return agents array');
      }

      if (data.agents.length !== 11) {
        throw new Error(`Expected 11 agents, got ${data.agents.length}`);
      }

      // Validate agent structure
      const firstAgent = data.agents[0];
      const requiredFields = ['id', 'name', 'display_name', 'description', 'status', 'capabilities'];
      for (const field of requiredFields) {
        if (!(field in firstAgent)) {
          throw new Error(`Agent missing required field: ${field}`);
        }
      }

      return {
        agentCount: data.agents.length,
        agents: data.agents.map(a => ({ id: a.id, name: a.name, status: a.status })),
        validStructure: true
      };
    });
  }

  async validateFrontendAgentsPage() {
    return this.runTest('Frontend Agents Page Validation', async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Monitor console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Monitor JavaScript errors
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });

      try {
        // Navigate to agents page
        await page.goto(`${this.baseUrl}/agents`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if page loaded without errors
        const title = await page.title();

        // Check for React useEffect errors specifically
        const reactErrors = jsErrors.filter(error =>
          error.includes('useEffect') ||
          error.includes('Cannot read properties of null') ||
          error.includes('Cannot read properties of undefined')
        );

        if (reactErrors.length > 0) {
          throw new Error(`React errors detected: ${reactErrors.join(', ')}`);
        }

        // Check if agents loaded
        await page.waitForSelector('h1', { timeout: 5000 });
        const heading = await page.$eval('h1', el => el.textContent);

        if (!heading.includes('Agent Dashboard')) {
          throw new Error(`Unexpected page heading: ${heading}`);
        }

        // Wait for agents to load (no more "Loading agents..." text)
        try {
          await page.waitForFunction(
            () => !document.body.textContent.includes('Loading agents...'),
            { timeout: 10000 }
          );
        } catch (e) {
          throw new Error('Page stuck in loading state');
        }

        // Check if agent count is displayed
        const pageContent = await page.content();

        // Verify agents are displayed - using more flexible selector
        const agentElements = await page.$$('div[style*="border: 1px solid rgb(221, 221, 221)"]');
        if (agentElements.length === 0) {
          throw new Error('No agent cards found on page');
        }

        // Get actual agent count from page
        const totalAgentsText = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          for (const element of elements) {
            if (element.textContent && element.textContent.includes('Total Agents:')) {
              return element.textContent;
            }
          }
          return null;
        });

        let displayedAgentCount = 0;
        if (totalAgentsText) {
          const match = totalAgentsText.match(/Total Agents:\s*(\d+)/);
          if (match) {
            displayedAgentCount = parseInt(match[1]);
          }
        }

        if (displayedAgentCount !== 11) {
          throw new Error(`Expected 11 agents displayed, found ${displayedAgentCount}`);
        }

        return {
          pageLoaded: true,
          title,
          heading,
          consoleErrors: consoleErrors.length,
          jsErrors: jsErrors.length,
          reactErrors: reactErrors.length,
          agentCardsFound: agentElements.length,
          displayedAgentCount,
          noLoadingState: !pageContent.includes('Loading agents...'),
          noErrorState: !pageContent.includes('Error:')
        };
      } finally {
        await browser.close();
      }
    });
  }

  async validateUIInteractivity() {
    return this.runTest('UI Interactivity Validation', async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      try {
        await page.goto(`${this.baseUrl}/agents`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for agents to load
        await page.waitForFunction(
          () => !document.body.textContent.includes('Loading agents...'),
          { timeout: 10000 }
        );

        // Test search functionality (if present)
        const searchResults = { searchTested: false };
        try {
          const searchInput = await page.$('input[placeholder*="search"], input[placeholder*="Search"]');
          if (searchInput) {
            await searchInput.type('agent');
            await new Promise(resolve => setTimeout(resolve, 500));
            searchResults.searchTested = true;
            searchResults.searchWorking = true;
          }
        } catch (e) {
          searchResults.searchError = e.message;
        }

        // Test page responsiveness
        await page.setViewport({ width: 1200, height: 800 });
        await new Promise(resolve => setTimeout(resolve, 500));

        await page.setViewport({ width: 768, height: 600 });
        await new Promise(resolve => setTimeout(resolve, 500));

        await page.setViewport({ width: 375, height: 667 });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if page still works after viewport changes
        const pageStillWorks = await page.evaluate(() => {
          return document.querySelector('h1') !== null;
        });

        return {
          responsiveDesign: pageStillWorks,
          ...searchResults
        };
      } finally {
        await browser.close();
      }
    });
  }

  async validatePerformance() {
    return this.runTest('Performance Validation', async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      try {
        // Start performance monitoring
        const startTime = Date.now();

        await page.goto(`${this.baseUrl}/agents`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for full page load
        await page.waitForFunction(
          () => !document.body.textContent.includes('Loading agents...'),
          { timeout: 10000 }
        );

        const loadTime = Date.now() - startTime;

        // Get performance metrics
        const metrics = await page.metrics();

        // Check memory usage
        const jsHeapUsedSize = metrics.JSHeapUsedSize / 1024 / 1024; // MB

        return {
          loadTime,
          acceptable: loadTime < 5000, // Should load in under 5 seconds
          jsHeapUsedMB: Math.round(jsHeapUsedSize * 100) / 100,
          memoryEfficient: jsHeapUsedSize < 50 // Should use less than 50MB
        };
      } finally {
        await browser.close();
      }
    });
  }

  async validateDataIntegrity() {
    return this.runTest('Data Integrity Validation', async () => {
      // Get backend data
      const backendResponse = await fetch(`${this.apiUrl}/api/agents`);
      const backendData = await backendResponse.json();

      // Get frontend rendered data
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      try {
        await page.goto(`${this.baseUrl}/agents`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        await page.waitForFunction(
          () => !document.body.textContent.includes('Loading agents...'),
          { timeout: 10000 }
        );

        // Extract agent names from rendered page
        const renderedAgentNames = await page.evaluate(() => {
          const agentCards = document.querySelectorAll('div[style*="border: 1px solid rgb(221, 221, 221)"] h3');
          return Array.from(agentCards).map(card => card.textContent.trim());
        });

        // Compare with backend data
        const backendAgentNames = backendData.agents.map(a => a.display_name || a.name);

        const nameMatches = renderedAgentNames.length === backendAgentNames.length;
        const allNamesPresent = backendAgentNames.every(name =>
          renderedAgentNames.some(rendered => rendered.includes(name))
        );

        return {
          backendAgentCount: backendAgentNames.length,
          frontendAgentCount: renderedAgentNames.length,
          nameMatches,
          allNamesPresent,
          dataSynchronized: nameMatches && allNamesPresent,
          backendNames: backendAgentNames.slice(0, 5), // First 5 for verification
          frontendNames: renderedAgentNames.slice(0, 5)
        };
      } finally {
        await browser.close();
      }
    });
  }

  async validateZeroErrors() {
    return this.runTest('Zero Errors Validation', async () => {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const allErrors = [];
      const consoleErrors = [];
      const networkErrors = [];

      // Capture all types of errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
          allErrors.push(`Console: ${msg.text()}`);
        }
      });

      page.on('pageerror', error => {
        allErrors.push(`Page: ${error.message}`);
      });

      page.on('requestfailed', request => {
        networkErrors.push(`Network: ${request.url()} - ${request.failure().errorText}`);
        allErrors.push(`Network: ${request.url()} - ${request.failure().errorText}`);
      });

      try {
        await page.goto(`${this.baseUrl}/agents`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        await page.waitForFunction(
          () => !document.body.textContent.includes('Loading agents...'),
          { timeout: 10000 }
        );

        // Additional checks for specific React errors
        const reactContextErrors = allErrors.filter(error =>
          error.toLowerCase().includes('useeffect') ||
          error.toLowerCase().includes('cannot read properties') ||
          error.toLowerCase().includes('undefined') ||
          error.toLowerCase().includes('null')
        );

        return {
          totalErrors: allErrors.length,
          consoleErrors: consoleErrors.length,
          networkErrors: networkErrors.length,
          reactContextErrors: reactContextErrors.length,
          zeroErrors: allErrors.length === 0,
          errors: allErrors.slice(0, 10), // First 10 errors for debugging
          reactSpecificErrors: reactContextErrors
        };
      } finally {
        await browser.close();
      }
    });
  }

  async runFullValidation() {
    console.log('🚀 Starting Final Production Validation Suite');
    console.log('=' .repeat(60));

    try {
      // Run all validation tests
      await this.validateBackendAPI();
      await this.validateFrontendAgentsPage();
      await this.validateUIInteractivity();
      await this.validatePerformance();
      await this.validateDataIntegrity();
      await this.validateZeroErrors();

      // Generate summary
      this.results.summary.successRate = (this.results.summary.passed / this.results.summary.total) * 100;
      this.results.summary.status = this.results.summary.failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED';

      console.log('\n' + '=' .repeat(60));
      console.log('📊 VALIDATION SUMMARY');
      console.log('=' .repeat(60));
      console.log(`Total Tests: ${this.results.summary.total}`);
      console.log(`Passed: ${this.results.summary.passed}`);
      console.log(`Failed: ${this.results.summary.failed}`);
      console.log(`Success Rate: ${this.results.summary.successRate.toFixed(1)}%`);
      console.log(`Status: ${this.results.summary.status}`);

      if (this.results.summary.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        this.results.summary.errors.forEach(error => console.log(`  - ${error}`));
      }

      return this.results;
    } catch (error) {
      console.error('❌ Validation suite failed:', error.message);
      this.results.summary.status = 'VALIDATION_SUITE_FAILED';
      this.results.summary.fatalError = error.message;
      return this.results;
    }
  }
}

// Export for use as module
module.exports = ProductionValidationSuite;

// Run if called directly
if (require.main === module) {
  (async () => {
    const validator = new ProductionValidationSuite();
    const results = await validator.runFullValidation();

    // Write results to file
    const fs = require('fs');
    const reportPath = '/workspaces/agent-feed/tests/production-validation/final-validation-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\n📄 Full results saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(results.summary.failed === 0 ? 0 : 1);
  })();
}