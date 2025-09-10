/**
 * Route Validation Test Runner
 * 
 * This script runs comprehensive route validation tests
 * and generates a detailed report for debugging the /agents 404 issue.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runRouteValidation() {
  console.log('🚀 Starting Comprehensive Route Validation...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      baseUrl: 'http://localhost:5173'
    },
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      critical: 0
    },
    issues: [],
    recommendations: []
  };

  let browser;
  
  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    // Set up error tracking
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('pageerror', error => {
      errors.push({
        type: 'page',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Test 1: CRITICAL - Direct /agents access
    console.log('🔍 Test 1: Direct access to /agents route...');
    const test1 = await runTest(page, 'CRITICAL: Direct /agents access', async () => {
      const response = await page.goto('http://localhost:5173/agents', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      const status = response?.status();
      if (status !== 200) {
        throw new Error(`Expected 200, got ${status}`);
      }
      
      const url = page.url();
      if (!url.includes('/agents')) {
        throw new Error(`URL doesn't contain /agents: ${url}`);
      }
      
      return { status, url };
    });
    results.tests.push(test1);
    
    // Test 2: Navigation to /agents
    console.log('🔍 Test 2: Navigation to /agents via menu...');
    const test2 = await runTest(page, 'Navigation to /agents', async () => {
      await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
      
      const agentsLink = page.locator('a[href="/agents"]').first();
      const isVisible = await agentsLink.isVisible();
      if (!isVisible) {
        throw new Error('Agents link not found in navigation');
      }
      
      await agentsLink.click();
      await page.waitForURL('**/agents', { timeout: 10000 });
      
      const url = page.url();
      return { navigated: true, url };
    });
    results.tests.push(test2);
    
    // Test 3: Browser refresh on /agents
    console.log('🔍 Test 3: Browser refresh on /agents...');
    const test3 = await runTest(page, 'Browser refresh on /agents', async () => {
      await page.goto('http://localhost:5173/agents', { waitUntil: 'domcontentloaded' });
      
      const refreshResponse = await page.reload({ waitUntil: 'domcontentloaded' });
      const status = refreshResponse?.status();
      
      if (status !== 200) {
        throw new Error(`Refresh returned ${status}, expected 200`);
      }
      
      return { refreshStatus: status, url: page.url() };
    });
    results.tests.push(test3);
    
    // Test 4: Multiple route transitions
    console.log('🔍 Test 4: Route transitions...');
    const test4 = await runTest(page, 'Route transitions', async () => {
      const routes = ['/', '/agents', '/', '/agents'];
      const transitions = [];
      
      for (const route of routes) {
        await page.goto(`http://localhost:5173${route}`, { waitUntil: 'domcontentloaded' });
        transitions.push({
          route,
          url: page.url(),
          status: 'success'
        });
      }
      
      return { transitions };
    });
    results.tests.push(test4);
    
    // Test 5: API connectivity
    console.log('🔍 Test 5: API connectivity on /agents...');
    const test5 = await runTest(page, 'API connectivity', async () => {
      const apiCalls = [];
      
      page.on('request', request => {
        if (request.url().includes('api')) {
          apiCalls.push({
            url: request.url(),
            method: request.method()
          });
        }
      });
      
      await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle' });
      
      return { apiCalls: apiCalls.length, calls: apiCalls };
    });
    results.tests.push(test5);
    
    // Test 6: Error handling
    console.log('🔍 Test 6: Error handling...');
    const test6 = await runTest(page, 'Error handling', async () => {
      await page.route('**/api/**', route => route.abort());
      
      const response = await page.goto('http://localhost:5173/agents', { 
        waitUntil: 'domcontentloaded' 
      });
      
      const status = response?.status();
      return { statusWithApiFailure: status };
    });
    results.tests.push(test6);
    
    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'PASS').length;
    results.summary.failed = results.tests.filter(t => t.status === 'FAIL').length;
    results.summary.critical = results.tests.filter(t => t.name.includes('CRITICAL') && t.status === 'FAIL').length;
    
    // Add errors to issues
    if (errors.length > 0) {
      results.issues.push({
        type: 'JavaScript Errors',
        count: errors.length,
        details: errors
      });
    }
    
    // Generate recommendations
    if (results.summary.failed > 0) {
      results.recommendations.push(
        'Check server configuration for SPA routing support',
        'Verify React Router setup and route definitions',
        'Ensure all route components are properly imported',
        'Check for JavaScript errors that might break routing'
      );
    }
    
    if (results.summary.critical > 0) {
      results.recommendations.push(
        'URGENT: Fix critical /agents route 404 issue',
        'Check server-side routing configuration',
        'Verify React Router history mode setup'
      );
    }
    
    await context.close();
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
    results.issues.push({
      type: 'Test Runner Error',
      message: error.message,
      stack: error.stack
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate report
  const reportPath = path.join(process.cwd(), 'frontend', 'route-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Route Validation Results:');
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Critical Issues: ${results.summary.critical}`);
  
  if (results.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  
  return results;
}

async function runTest(page, name, testFn) {
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    console.log(`  ✅ ${name} - PASSED (${duration}ms)`);
    
    return {
      name,
      status: 'PASS',
      duration,
      result
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log(`  ❌ ${name} - FAILED (${duration}ms)`);
    console.log(`     Error: ${error.message}`);
    
    return {
      name,
      status: 'FAIL',
      duration,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run if called directly
if (require.main === module) {
  runRouteValidation().catch(console.error);
}

module.exports = { runRouteValidation };