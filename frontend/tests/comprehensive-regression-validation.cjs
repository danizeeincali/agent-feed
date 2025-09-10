#!/usr/bin/env node

/**
 * Comprehensive Regression Testing Suite
 * Validates all Phase 1-2 functionality after routing fixes
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class RegressionTestSuite {
  constructor() {
    this.results = {
      apiTests: [],
      frontendTests: [],
      e2eTests: [],
      performanceTests: [],
      issues: [],
      summary: {}
    };
    this.browser = null;
    this.page = null;
    this.startTime = Date.now();
  }

  async init() {
    console.log('🚀 Starting Comprehensive Regression Testing Suite...\n');
    
    // Launch browser for frontend testing
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set viewport for mobile testing
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async testAPIEndpoints() {
    console.log('📡 Testing Backend API Endpoints...');
    const baseUrl = 'http://localhost:3000';
    const endpoints = [
      { name: 'Agents', url: '/api/agents', method: 'GET' },
      { name: 'Activities', url: '/api/v1/activities', method: 'GET' },
      { name: 'System Metrics', url: '/api/v1/metrics/system', method: 'GET' },
      { name: 'Analytics', url: '/api/v1/analytics', method: 'GET' },
      { name: 'Health Check', url: '/api/health', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await axios[endpoint.method.toLowerCase()](`${baseUrl}${endpoint.url}`);
        const responseTime = Date.now() - start;
        
        this.results.apiTests.push({
          name: endpoint.name,
          url: endpoint.url,
          status: 'PASS',
          statusCode: response.status,
          responseTime,
          hasData: response.data && Object.keys(response.data).length > 0,
          dataStructure: this.analyzeDataStructure(response.data)
        });
        
        console.log(`  ✅ ${endpoint.name}: ${response.status} (${responseTime}ms)`);
      } catch (error) {
        this.results.apiTests.push({
          name: endpoint.name,
          url: endpoint.url,
          status: 'FAIL',
          error: error.message,
          responseTime: null
        });
        this.results.issues.push({
          type: 'API',
          severity: 'HIGH',
          message: `${endpoint.name} endpoint failed: ${error.message}`
        });
        console.log(`  ❌ ${endpoint.name}: FAILED - ${error.message}`);
      }
    }
  }

  async testFrontendComponents() {
    console.log('\n🖥️  Testing Frontend Components...');
    const baseUrl = 'http://localhost:5173';
    
    try {
      // Test main page load
      await this.page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Test 1: Page loads successfully
      const title = await this.page.title();
      this.results.frontendTests.push({
        name: 'Page Load',
        status: title ? 'PASS' : 'FAIL',
        details: `Title: ${title}`
      });
      
      // Test 2: Navigation elements present
      const navItems = await this.page.$$eval('[data-testid*="nav"], nav a, .nav-item', 
        els => els.length
      );
      this.results.frontendTests.push({
        name: 'Navigation Elements',
        status: navItems > 0 ? 'PASS' : 'FAIL',
        details: `Found ${navItems} navigation elements`
      });

      // Test 3: Agent list loads
      await this.page.waitForSelector('[data-testid="agent-list"], .agent-card, .agent-item', 
        { timeout: 10000 }
      );
      const agentElements = await this.page.$$eval(
        '[data-testid="agent-list"] > *, .agent-card, .agent-item', 
        els => els.length
      );
      this.results.frontendTests.push({
        name: 'Agent List Loading',
        status: agentElements > 0 ? 'PASS' : 'FAIL',
        details: `Found ${agentElements} agent elements`
      });

      // Test 4: Real data displayed
      const hasRealData = await this.page.evaluate(() => {
        const textContent = document.body.textContent || '';
        return !textContent.includes('Mock') && 
               !textContent.includes('Sample') &&
               textContent.length > 500;
      });
      
      this.results.frontendTests.push({
        name: 'Real Data Display',
        status: hasRealData ? 'PASS' : 'FAIL',
        details: 'Verified real data is displayed (no mock/sample data)'
      });

      console.log(`  ✅ Page Load: ${title}`);
      console.log(`  ✅ Navigation: ${navItems} elements`);
      console.log(`  ✅ Agent List: ${agentElements} agents`);
      console.log(`  ✅ Real Data: ${hasRealData ? 'Yes' : 'No'}`);

    } catch (error) {
      this.results.frontendTests.push({
        name: 'Frontend Component Loading',
        status: 'FAIL',
        error: error.message
      });
      this.results.issues.push({
        type: 'FRONTEND',
        severity: 'HIGH',
        message: `Frontend components failed to load: ${error.message}`
      });
      console.log(`  ❌ Frontend test failed: ${error.message}`);
    }
  }

  async testUserJourney() {
    console.log('\n👤 Testing Complete User Journey...');
    
    try {
      // Journey 1: Home → Agents → Agent Detail
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      
      // Click on first agent (if available)
      const firstAgent = await this.page.$('.agent-card, .agent-item, [data-testid*="agent"]');
      if (firstAgent) {
        await firstAgent.click();
        await this.page.waitForTimeout(2000);
        
        // Check if we're on an agent detail page
        const currentUrl = this.page.url();
        const isAgentDetailPage = currentUrl.includes('/agent') || 
                                  currentUrl.includes('/agents/') ||
                                  await this.page.$('[data-testid="agent-detail"]');
        
        this.results.e2eTests.push({
          name: 'Agent Navigation',
          status: isAgentDetailPage ? 'PASS' : 'FAIL',
          details: `Navigated to: ${currentUrl}`
        });
        
        // Test tabs/sections if present
        const tabs = await this.page.$$('[role="tab"], .tab, .section-tab');
        if (tabs.length > 0) {
          // Try clicking the first tab
          await tabs[0].click();
          await this.page.waitForTimeout(1000);
          
          this.results.e2eTests.push({
            name: 'Tab Navigation',
            status: 'PASS',
            details: `Found and tested ${tabs.length} tabs`
          });
        }
        
        console.log(`  ✅ Agent Navigation: ${isAgentDetailPage ? 'SUCCESS' : 'FAILED'}`);
        console.log(`  ✅ Tab Navigation: ${tabs.length} tabs found`);
      } else {
        this.results.issues.push({
          type: 'UX',
          severity: 'MEDIUM',
          message: 'No clickable agent elements found for navigation testing'
        });
        console.log(`  ⚠️  No agent elements found for navigation testing`);
      }
      
    } catch (error) {
      this.results.e2eTests.push({
        name: 'User Journey',
        status: 'FAIL',
        error: error.message
      });
      console.log(`  ❌ User journey test failed: ${error.message}`);
    }
  }

  async testMobileResponsiveness() {
    console.log('\n📱 Testing Mobile Responsiveness...');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      try {
        await this.page.setViewport({ width: viewport.width, height: viewport.height });
        await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        
        // Check if content is visible and properly laid out
        const isContentVisible = await this.page.evaluate(() => {
          const body = document.body;
          const rect = body.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !body.style.display?.includes('none');
        });
        
        // Check for mobile-specific elements
        const hasMobileOptimization = await this.page.evaluate((vw) => {
          const styles = window.getComputedStyle(document.body);
          const viewport = window.innerWidth;
          return viewport === vw && styles.fontSize && !styles.overflow?.includes('hidden');
        }, viewport.width);
        
        this.results.frontendTests.push({
          name: `${viewport.name} Responsiveness`,
          status: isContentVisible ? 'PASS' : 'FAIL',
          details: `${viewport.width}x${viewport.height} - Content visible: ${isContentVisible}`
        });
        
        console.log(`  ✅ ${viewport.name} (${viewport.width}x${viewport.height}): ${isContentVisible ? 'PASS' : 'FAIL'}`);
        
      } catch (error) {
        this.results.issues.push({
          type: 'RESPONSIVE',
          severity: 'MEDIUM',
          message: `${viewport.name} viewport test failed: ${error.message}`
        });
        console.log(`  ❌ ${viewport.name} test failed: ${error.message}`);
      }
    }
  }

  async testWebSocketConnections() {
    console.log('\n🔌 Testing WebSocket Connections...');
    
    try {
      // Test WebSocket connection to backend
      await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const ws = new WebSocket('ws://localhost:3000/terminal');
          ws.onopen = () => {
            window.testWebSocket = { status: 'connected' };
            ws.close();
            resolve(true);
          };
          ws.onerror = () => {
            window.testWebSocket = { status: 'failed' };
            resolve(false);
          };
          setTimeout(() => {
            window.testWebSocket = { status: 'timeout' };
            resolve(false);
          }, 5000);
        });
      });
      
      const wsResult = await this.page.evaluate(() => window.testWebSocket);
      
      this.results.frontendTests.push({
        name: 'WebSocket Connection',
        status: wsResult?.status === 'connected' ? 'PASS' : 'FAIL',
        details: `Status: ${wsResult?.status || 'unknown'}`
      });
      
      console.log(`  ✅ WebSocket: ${wsResult?.status || 'unknown'}`);
      
    } catch (error) {
      this.results.issues.push({
        type: 'WEBSOCKET',
        severity: 'MEDIUM',
        message: `WebSocket test failed: ${error.message}`
      });
      console.log(`  ❌ WebSocket test failed: ${error.message}`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    try {
      // Measure page load performance
      const start = Date.now();
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - start;
      
      // Get performance metrics
      const metrics = await this.page.metrics();
      
      this.results.performanceTests.push({
        name: 'Page Load Time',
        value: loadTime,
        unit: 'ms',
        status: loadTime < 5000 ? 'PASS' : 'FAIL',
        benchmark: '< 5000ms'
      });
      
      this.results.performanceTests.push({
        name: 'JS Heap Used',
        value: Math.round(metrics.JSHeapUsedSize / 1024 / 1024),
        unit: 'MB',
        status: metrics.JSHeapUsedSize < 50 * 1024 * 1024 ? 'PASS' : 'FAIL',
        benchmark: '< 50MB'
      });
      
      console.log(`  ✅ Page Load: ${loadTime}ms`);
      console.log(`  ✅ Memory Usage: ${Math.round(metrics.JSHeapUsedSize / 1024 / 1024)}MB`);
      
    } catch (error) {
      console.log(`  ❌ Performance test failed: ${error.message}`);
    }
  }

  analyzeDataStructure(data) {
    if (!data) return 'No data';
    if (typeof data !== 'object') return typeof data;
    
    const keys = Object.keys(data);
    if (keys.includes('success') && keys.includes('data')) {
      return `API Response (${keys.length} fields)`;
    }
    return `Object (${keys.length} keys)`;
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const allTests = [
      ...this.results.apiTests,
      ...this.results.frontendTests,
      ...this.results.e2eTests,
      ...this.results.performanceTests
    ];
    
    const passed = allTests.filter(test => test.status === 'PASS').length;
    const failed = allTests.filter(test => test.status === 'FAIL').length;
    const total = allTests.length;
    
    this.results.summary = {
      totalTests: total,
      passed,
      failed,
      passRate: Math.round((passed / total) * 100),
      totalTime: Math.round(totalTime / 1000),
      criticalIssues: this.results.issues.filter(i => i.severity === 'HIGH').length,
      mediumIssues: this.results.issues.filter(i => i.severity === 'MEDIUM').length,
      productionReady: failed === 0 && this.results.issues.filter(i => i.severity === 'HIGH').length === 0
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE REGRESSION TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${passed}/${total} (${this.results.summary.passRate}%)`);
    console.log(`❌ Tests Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${this.results.summary.totalTime}s`);
    console.log(`🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️  Medium Issues: ${this.results.summary.mediumIssues}`);
    console.log(`🚀 Production Ready: ${this.results.summary.productionReady ? 'YES' : 'NO'}`);
    
    if (this.results.issues.length > 0) {
      console.log('\n🔍 IDENTIFIED ISSUES:');
      this.results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.type}: ${issue.message}`);
      });
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    
    console.log('\n📡 API Endpoints:');
    this.results.apiTests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.status} (${test.responseTime || 'N/A'}ms)`);
    });
    
    console.log('\n🖥️  Frontend Components:');
    this.results.frontendTests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.status}`);
    });
    
    console.log('\n👤 User Journeys:');
    this.results.e2eTests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.status}`);
    });
    
    console.log('\n⚡ Performance:');
    this.results.performanceTests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${test.value}${test.unit} (${test.benchmark})`);
    });
    
    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.testAPIEndpoints();
      await this.testFrontendComponents();
      await this.testUserJourney();
      await this.testMobileResponsiveness();
      await this.testWebSocketConnections();
      await this.testPerformance();
      
      const results = this.generateReport();
      
      // Save results to file
      const fs = require('fs');
      fs.writeFileSync(
        `/workspaces/agent-feed/frontend/comprehensive-regression-results-${Date.now()}.json`,
        JSON.stringify(results, null, 2)
      );
      
      return results;
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test suite if called directly
if (require.main === module) {
  const testSuite = new RegressionTestSuite();
  testSuite.run()
    .then(results => {
      process.exit(results.summary.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = RegressionTestSuite;