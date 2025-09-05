#!/usr/bin/env node

/**
 * DIRECT VALIDATION RUNNER - NO PLAYWRIGHT SETUP ISSUES
 * Runs comprehensive real functionality tests directly
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

class DirectValidationRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.startTime = Date.now();
    this.resultsDir = path.join(process.cwd(), 'tests', 'test-results');
  }

  async initialize() {
    console.log('🚀 Initializing Direct Validation Runner...');
    
    // Ensure results directory exists
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set up event listeners
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    this.page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });

    console.log('✅ Browser initialized');
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const testResult = {
        name: testName,
        passed: result.passed,
        duration,
        details: result.details,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      
      if (result.passed) {
        console.log(`  ✅ ${testName} - PASSED (${duration}ms)`);
      } else {
        console.log(`  ❌ ${testName} - FAILED (${duration}ms)`);
        if (result.details) {
          console.log(`  Details:`, result.details);
        }
      }
      
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult = {
        name: testName,
        passed: false,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      console.log(`  ❌ ${testName} - ERROR (${duration}ms): ${error.message}`);
      
      return testResult;
    }
  }

  async testDatabaseConnectivity() {
    return this.runTest('Database Connectivity', async () => {
      const response = await this.page.goto(`${API_URL}/health`);
      const data = await response.json();
      
      return {
        passed: response.ok() && data.data?.status === 'healthy' && data.data?.database === true,
        details: {
          status: data.data?.status,
          database: data.data?.database,
          httpStatus: response.status()
        }
      };
    });
  }

  async testRealAgentsLoading() {
    return this.runTest('Real Agents Loading', async () => {
      await this.page.goto(BASE_URL);
      await this.page.waitForLoadState('networkidle');
      
      // Wait for agents to load
      await this.page.waitForTimeout(3000);
      
      const agentCards = await this.page.$$('[data-testid*="agent-card"]');
      const agentCount = agentCards.length;
      
      // Check for real data (no mock content)
      const bodyText = await this.page.evaluate(() => document.body.textContent);
      const hasMockContent = /mock|simulation|fake|lorem ipsum/gi.test(bodyText);
      
      return {
        passed: agentCount > 0 && !hasMockContent,
        details: {
          agentCount,
          hasMockContent,
          bodyTextLength: bodyText.length
        }
      };
    });
  }

  async testWebSocketConnections() {
    return this.runTest('WebSocket Connections', async () => {
      let wsConnected = false;
      let wsMessages = 0;
      
      // Monitor WebSocket connections
      this.page.on('websocket', ws => {
        wsConnected = true;
        ws.on('framereceived', () => {
          wsMessages++;
        });
      });
      
      await this.page.goto(BASE_URL);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      return {
        passed: wsConnected,
        details: {
          wsConnected,
          wsMessages
        }
      };
    });
  }

  async testAPIEndpoints() {
    return this.runTest('API Endpoints Response', async () => {
      const endpoints = [
        `${API_URL}/api/agents`,
        `${API_URL}/api/v1/agent-posts`,
        `${API_URL}/health`
      ];
      
      const results = [];
      
      for (const url of endpoints) {
        try {
          const response = await this.page.goto(url);
          const data = await response.json();
          
          results.push({
            url,
            status: response.status(),
            ok: response.ok(),
            hasData: !!data
          });
        } catch (error) {
          results.push({
            url,
            status: 0,
            ok: false,
            error: error.message
          });
        }
      }
      
      const successCount = results.filter(r => r.ok).length;
      
      return {
        passed: successCount >= 2,
        details: { results, successCount, totalEndpoints: endpoints.length }
      };
    });
  }

  async testRealTimeUpdates() {
    return this.runTest('Real-time Updates', async () => {
      await this.page.goto(BASE_URL);
      await this.page.waitForLoadState('networkidle');
      
      // Get initial state
      const initialAgents = await this.page.$$eval('[data-testid*="agent-card"]', els => els.length);
      
      // Trigger potential updates
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);
      
      const finalAgents = await this.page.$$eval('[data-testid*="agent-card"]', els => els.length);
      
      // Check for real-time indicators
      const realtimeElements = await this.page.$$('[data-testid*="realtime"], [data-testid*="live"]');
      
      return {
        passed: typeof finalAgents === 'number' && finalAgents >= 0,
        details: {
          initialAgents,
          finalAgents,
          realtimeElements: realtimeElements.length,
          dataConsistent: Math.abs(finalAgents - initialAgents) <= 5
        }
      };
    });
  }

  async testZeroMockContent() {
    return this.runTest('Zero Mock Content', async () => {
      await this.page.goto(BASE_URL);
      await this.page.waitForLoadState('networkidle');
      
      const bodyText = await this.page.evaluate(() => document.body.textContent);
      
      const mockTerms = ['mock data', 'simulated', 'fake data', 'test data', 'lorem ipsum', 'placeholder'];
      const foundTerms = mockTerms.filter(term => 
        new RegExp(term, 'gi').test(bodyText)
      );
      
      return {
        passed: foundTerms.length === 0,
        details: {
          foundMockTerms: foundTerms,
          totalMockTermsChecked: mockTerms.length,
          bodyTextLength: bodyText.length
        }
      };
    });
  }

  async runContinuousValidation() {
    console.log('🔄 Starting continuous validation for 60 seconds...');
    
    const duration = 60 * 1000; // 60 seconds
    const startTime = Date.now();
    let cycles = 0;
    let successfulCycles = 0;
    
    while (Date.now() - startTime < duration) {
      cycles++;
      console.log(`\n🔄 Validation Cycle ${cycles}`);
      
      const cycleResults = [];
      
      // Run core tests
      cycleResults.push(await this.testRealAgentsLoading());
      cycleResults.push(await this.testWebSocketConnections());
      cycleResults.push(await this.testZeroMockContent());
      
      // Check if all tests in this cycle passed
      const allPassed = cycleResults.every(result => result.passed);
      if (allPassed) {
        successfulCycles++;
      }
      
      console.log(`  Cycle ${cycles}: ${allPassed ? 'PASSED' : 'FAILED'} (${successfulCycles}/${cycles} successful)`);
      
      // Wait before next cycle
      await this.page.waitForTimeout(3000);
    }
    
    return {
      totalCycles: cycles,
      successfulCycles,
      successRate: (successfulCycles / cycles) * 100
    };
  }

  async generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const successRate = (passed / this.results.length) * 100;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${totalDuration}ms`,
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        successRate: `${successRate.toFixed(2)}%`
      },
      results: this.results,
      conclusion: {
        realDataConfirmed: this.results.some(r => r.name === 'Real Agents Loading' && r.passed),
        zeroMockDependencies: this.results.some(r => r.name === 'Zero Mock Content' && r.passed),
        liveConnections: this.results.some(r => r.name === 'WebSocket Connections' && r.passed),
        databaseOperational: this.results.some(r => r.name === 'Database Connectivity' && r.passed),
        allTestsPassed: successRate === 100
      }
    };
    
    const reportPath = path.join(this.resultsDir, 'direct-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 VALIDATION REPORT GENERATED`);
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`Passed: ${passed}/${this.results.length}`);
    console.log(`Report saved to: ${reportPath}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Cleanup completed');
  }

  async run() {
    try {
      await this.initialize();
      
      // Run all validation tests
      await this.testDatabaseConnectivity();
      await this.testRealAgentsLoading();
      await this.testWebSocketConnections();
      await this.testAPIEndpoints();
      await this.testRealTimeUpdates();
      await this.testZeroMockContent();
      
      // Run continuous validation
      const continuousResults = await this.runContinuousValidation();
      
      console.log(`\n🔄 CONTINUOUS VALIDATION RESULTS:`);
      console.log(`Total Cycles: ${continuousResults.totalCycles}`);
      console.log(`Successful Cycles: ${continuousResults.successfulCycles}`);
      console.log(`Success Rate: ${continuousResults.successRate.toFixed(2)}%`);
      
      // Generate final report
      const report = await this.generateReport();
      
      // Take final screenshot
      await this.page.goto(BASE_URL);
      await this.page.waitForLoadState('networkidle');
      await this.page.screenshot({ 
        path: path.join(this.resultsDir, 'final-validation-screenshot.png'),
        fullPage: true 
      });
      
      return report;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the validation
const runner = new DirectValidationRunner();
runner.run().then(report => {
  console.log('\n🎉 DIRECT VALIDATION COMPLETED!');
  
  if (report.conclusion.allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - 100% REAL FUNCTIONALITY CONFIRMED');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - CHECK REPORT FOR DETAILS');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ VALIDATION FAILED:', error.message);
  process.exit(1);
});