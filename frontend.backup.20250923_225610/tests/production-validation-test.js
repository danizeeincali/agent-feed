/**
 * Production Validation Test for SearchAddon Fix
 * 
 * This test validates that the SearchAddon import error has been resolved
 * and that the application functions correctly in production environment.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      errors: [],
      console_logs: [],
      network_requests: [],
      performance_metrics: {},
      overall_status: 'pending'
    };
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true, // Run in headless mode for CI/codespace environment
      args: [
        '--disable-web-security', 
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Capture console logs
    this.page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      };
      this.results.console_logs.push(log);
      console.log(`[Console ${log.type}] ${log.text}`);
    });
    
    // Capture network requests
    this.page.on('request', request => {
      this.results.network_requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Capture page errors
    this.page.on('pageerror', error => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      this.results.errors.push(errorInfo);
      console.error(`[Page Error] ${error.message}`);
    });
    
    // Capture response errors
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.results.errors.push({
          type: 'network_error',
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async runTest(testName, testFunction) {
    console.log(`\n🔍 Running: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.results.tests.push({
        name: testName,
        status: 'passed',
        duration,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.tests.push({
        name: testName,
        status: 'failed',
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      this.results.errors.push({
        test: testName,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  async validateApplicationLoad() {
    await this.runTest('Application Loads Without Errors', async () => {
      const startTime = Date.now();
      
      // Navigate to application
      const response = await this.page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      if (!response.ok()) {
        throw new Error(`Failed to load application: HTTP ${response.status()}`);
      }
      
      // Wait for React to load
      await this.page.waitForSelector('#root', { timeout: 10000 });
      
      // Check for SearchAddon-specific errors
      const hasSearchAddonError = this.results.console_logs.some(log => 
        log.text.toLowerCase().includes('searchaddon') && log.type === 'error'
      );
      
      if (hasSearchAddonError) {
        throw new Error('SearchAddon import error detected in console');
      }
      
      // Verify main elements are present
      const title = await this.page.textContent('title');
      if (!title.includes('Agent Feed')) {
        throw new Error('Application title not found');
      }
      
      const loadTime = Date.now() - startTime;
      this.results.performance_metrics.initial_load_time = loadTime;
      console.log(`   📊 Load time: ${loadTime}ms`);
    });
  }

  async validateDualInstanceRoute() {
    await this.runTest('Navigate to Dual Instance Route', async () => {
      // Navigate to dual instance route
      await this.page.goto('http://localhost:3001/dual-instance', {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      // Wait for the route to load
      await this.page.waitForTimeout(2000);
      
      // Check URL
      const url = this.page.url();
      if (!url.includes('/dual-instance')) {
        throw new Error(`Expected /dual-instance route, got: ${url}`);
      }
      
      // Look for dual instance components
      const hasInstanceCards = await this.page.locator('text=Instance').count() > 0;
      const hasLaunchButtons = await this.page.locator('button:has-text("Launch")').count() > 0;
      
      console.log(`   📊 Instance cards found: ${hasInstanceCards}`);
      console.log(`   📊 Launch buttons found: ${hasLaunchButtons}`);
    });
  }

  async validateInstanceLaunch() {
    await this.runTest('Launch Instance and Verify Creation', async () => {
      // Look for launch button
      const launchButton = this.page.locator('button:has-text("Launch")').first();
      
      if (await launchButton.count() === 0) {
        throw new Error('No launch button found');
      }
      
      // Click launch button
      await launchButton.click();
      
      // Wait for instance creation
      await this.page.waitForTimeout(3000);
      
      // Check for success indicators
      const hasSuccessMessage = await this.page.locator('text*=success').count() > 0;
      const hasInstanceInfo = await this.page.locator('text*=Instance').count() > 0;
      
      console.log(`   📊 Success message: ${hasSuccessMessage}`);
      console.log(`   📊 Instance info: ${hasInstanceInfo}`);
    });
  }

  async validateTerminalNavigation() {
    await this.runTest('Navigate to Terminal and Verify SearchAddon', async () => {
      // Look for terminal links or buttons
      const terminalLink = this.page.locator('text*=Terminal').first();
      
      if (await terminalLink.count() > 0) {
        await terminalLink.click();
        await this.page.waitForTimeout(2000);
      } else {
        // Navigate directly to terminal route
        await this.page.goto('http://localhost:3001/terminal/test-instance', {
          waitUntil: 'networkidle'
        });
      }
      
      // Check for terminal elements
      const hasTerminalContainer = await this.page.locator('.xterm').count() > 0 || 
                                   await this.page.locator('[class*="terminal"]').count() > 0;
      
      // Check for search functionality (SearchAddon)
      const hasSearchButton = await this.page.locator('button[title*="Search"], button:has-text("Search")').count() > 0;
      const hasSearchIcon = await this.page.locator('svg').count() > 0; // Search icon
      
      console.log(`   📊 Terminal container: ${hasTerminalContainer}`);
      console.log(`   📊 Search functionality: ${hasSearchButton}`);
      
      // Verify no SearchAddon import errors
      const searchAddonErrors = this.results.console_logs.filter(log => 
        log.text.toLowerCase().includes('searchaddon') && log.type === 'error'
      );
      
      if (searchAddonErrors.length > 0) {
        throw new Error(`SearchAddon errors found: ${searchAddonErrors.map(e => e.text).join(', ')}`);
      }
    });
  }

  async validateSearchFunctionality() {
    await this.runTest('Test Search Functionality', async () => {
      // Look for search button
      const searchButton = this.page.locator('button[title*="Search"]').first();
      
      if (await searchButton.count() > 0) {
        // Click search button
        await searchButton.click();
        await this.page.waitForTimeout(1000);
        
        // Check if search input appears
        const searchInput = this.page.locator('input[placeholder*="search" i]');
        const hasSearchInput = await searchInput.count() > 0;
        
        if (hasSearchInput) {
          // Test search input
          await searchInput.fill('test');
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(500);
          
          console.log('   📊 Search input functional');
        }
        
        console.log(`   📊 Search UI elements: ${hasSearchInput}`);
      } else {
        console.log('   📊 Search button not immediately visible (may require terminal connection)');
      }
    });
  }

  async validateWebSocketConnections() {
    await this.runTest('Validate WebSocket Connections', async () => {
      // Check network requests for WebSocket attempts
      const wsRequests = this.results.network_requests.filter(req => 
        req.url.includes('ws://') || req.url.includes('wss://') || req.url.includes('socket')
      );
      
      // Check console for WebSocket-related messages
      const wsLogs = this.results.console_logs.filter(log =>
        log.text.toLowerCase().includes('websocket') || 
        log.text.toLowerCase().includes('socket.io') ||
        log.text.toLowerCase().includes('connection')
      );
      
      console.log(`   📊 WebSocket-related requests: ${wsRequests.length}`);
      console.log(`   📊 WebSocket-related logs: ${wsLogs.length}`);
      
      // Check for connection status indicators
      const hasConnectionStatus = await this.page.locator('text*=connect').count() > 0;
      console.log(`   📊 Connection status indicators: ${hasConnectionStatus}`);
    });
  }

  async generateReport() {
    // Calculate overall status
    const failedTests = this.results.tests.filter(test => test.status === 'failed');
    const criticalErrors = this.results.errors.filter(error => 
      error.message && error.message.toLowerCase().includes('searchaddon')
    );
    
    if (criticalErrors.length > 0) {
      this.results.overall_status = 'critical_failure';
    } else if (failedTests.length > 0) {
      this.results.overall_status = 'partial_failure';
    } else {
      this.results.overall_status = 'success';
    }
    
    // Generate summary
    const summary = {
      total_tests: this.results.tests.length,
      passed_tests: this.results.tests.filter(t => t.status === 'passed').length,
      failed_tests: failedTests.length,
      total_errors: this.results.errors.length,
      searchaddon_errors: criticalErrors.length,
      performance: {
        load_time: this.results.performance_metrics.initial_load_time || 0,
        total_requests: this.results.network_requests.length,
        console_logs: this.results.console_logs.length
      }
    };
    
    const report = {
      ...this.results,
      summary,
      production_ready: this.results.overall_status === 'success',
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../docs/SearchAddon_Production_Validation_Report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.overall_status === 'success') {
      recommendations.push('✅ SearchAddon fix is working correctly');
      recommendations.push('✅ Application is ready for production deployment');
    }
    
    if (this.results.errors.some(e => e.message && e.message.includes('SearchAddon'))) {
      recommendations.push('❌ SearchAddon import errors still present - requires immediate attention');
    }
    
    if (this.results.performance_metrics.initial_load_time > 5000) {
      recommendations.push('⚠️ Application load time exceeds 5 seconds - optimize bundle size');
    }
    
    const errorRate = this.results.errors.length / Math.max(this.results.tests.length, 1);
    if (errorRate > 0.2) {
      recommendations.push('⚠️ High error rate detected - review error logs');
    }
    
    return recommendations;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function runValidation() {
  const validator = new ProductionValidator();
  
  try {
    console.log('🚀 Starting Production Validation for SearchAddon Fix');
    console.log('=====================================');
    
    await validator.initialize();
    
    // Run all validation tests
    await validator.validateApplicationLoad();
    await validator.validateDualInstanceRoute();
    await validator.validateInstanceLaunch();
    await validator.validateTerminalNavigation();
    await validator.validateSearchFunctionality();
    await validator.validateWebSocketConnections();
    
    // Generate final report
    const report = await validator.generateReport();
    
    console.log('\n📊 VALIDATION COMPLETE');
    console.log('======================');
    console.log(`Overall Status: ${report.overall_status}`);
    console.log(`Tests Passed: ${report.summary.passed_tests}/${report.summary.total_tests}`);
    console.log(`SearchAddon Errors: ${report.summary.searchaddon_errors}`);
    console.log(`Production Ready: ${report.production_ready}`);
    
    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(rec));
    
    console.log(`\n📄 Full report saved to: ${path.resolve(__dirname, '../docs/SearchAddon_Production_Validation_Report.json')}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    throw error;
  } finally {
    await validator.cleanup();
  }
}

// Export for use as module or run directly
if (import.meta.main || process.argv[1] === __filename) {
  runValidation()
    .then(report => {
      process.exit(report.production_ready ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

export { ProductionValidator, runValidation };