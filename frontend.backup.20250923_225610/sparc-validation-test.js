#!/usr/bin/env node

// SPARC COMPREHENSIVE VALIDATION TEST
// Tests all aspects of the React application functionality

const { chromium } = require('playwright');

async function runSPARCValidation() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    specification: { status: 'FAIL', issues: [] },
    pseudocode: { status: 'FAIL', issues: [] },
    architecture: { status: 'FAIL', issues: [] },
    refinement: { status: 'FAIL', issues: [] },
    completion: { status: 'FAIL', issues: [] }
  };

  console.log('🔍 SPARC VERIFICATION STARTING...');

  try {
    // SPECIFICATION PHASE - Verify declared functionality works
    console.log('\n📋 S - SPECIFICATION ANALYSIS');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check if page loads without white screen
    const isLoaded = await page.isVisible('text=AgentLink');
    if (!isLoaded) {
      results.specification.issues.push('Application fails to load - white screen detected');
    }

    // Verify all navigation links exist and are functional
    const navigationLinks = [
      'Interactive Control',
      'Claude Manager', 
      'Feed',
      'Agents',
      'Workflows',
      'Claude Code',
      'Live Activity',
      'Analytics',
      'Performance Monitor',
      'Settings'
    ];

    for (const linkText of navigationLinks) {
      const link = page.locator(`text=${linkText}`);
      const exists = await link.isVisible();
      if (!exists) {
        results.specification.issues.push(`Missing navigation link: ${linkText}`);
      }
    }

    if (results.specification.issues.length === 0) {
      results.specification.status = 'PASS';
    }

    // PSEUDOCODE PHASE - Test algorithmic correctness
    console.log('\n🧠 P - PSEUDOCODE VERIFICATION');
    
    // Test routing logic
    await page.click('text=Agents');
    await page.waitForTimeout(2000);
    const agentsPageLoaded = await page.isVisible('text=Agent');
    if (!agentsPageLoaded) {
      results.pseudocode.issues.push('Agent routing logic failure');
    }

    // Test API calls and data flow
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/health');
        return response.ok;
      } catch {
        return false;
      }
    });

    if (!healthResponse) {
      results.pseudocode.issues.push('Health API endpoint not responding');
    }

    if (results.pseudocode.issues.length === 0) {
      results.pseudocode.status = 'PASS';
    }

    // ARCHITECTURE PHASE - Validate component hierarchy
    console.log('\n🏗️  A - ARCHITECTURE VALIDATION');
    
    // Check error boundaries are working
    const errorBoundaryExists = await page.evaluate(() => {
      return window.React !== undefined;
    });

    if (!errorBoundaryExists) {
      results.architecture.issues.push('React not properly loaded');
    }

    // Test WebSocket connections if available
    const wsConnection = await page.evaluate(async () => {
      try {
        const ws = new WebSocket('ws://localhost:3000/terminal');
        return new Promise((resolve) => {
          ws.onopen = () => { ws.close(); resolve(true); };
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 3000);
        });
      } catch {
        return false;
      }
    });

    if (!wsConnection) {
      results.architecture.issues.push('WebSocket connection failed');
    }

    if (results.architecture.issues.length === 0) {
      results.architecture.status = 'PASS';
    }

    // REFINEMENT PHASE - Comprehensive browser testing
    console.log('\n🔧 R - REFINEMENT TESTING');
    
    // Test user interactions
    await page.click('text=Feed');
    await page.waitForTimeout(1000);
    
    // Test search functionality
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.waitForTimeout(500);
    
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileMenuVisible = await page.isVisible('button:has-text("Menu")') || 
                             await page.isVisible('[data-testid="mobile-menu"]');
    
    if (!mobileMenuVisible) {
      results.refinement.issues.push('Mobile navigation not responsive');
    }

    await page.setViewportSize({ width: 1920, height: 1080 });

    if (results.refinement.issues.length === 0) {
      results.refinement.status = 'PASS';
    }

    // COMPLETION PHASE - 100% feature validation
    console.log('\n✅ C - COMPLETION VALIDATION');
    
    // Check if all routes are accessible
    const routes = ['/claude-manager', '/agents', '/workflows', '/analytics', '/settings'];
    
    for (const route of routes) {
      await page.goto(`http://localhost:5173${route}`);
      await page.waitForTimeout(2000);
      
      const hasError = await page.isVisible('text=Error') || 
                      await page.isVisible('text=404') ||
                      await page.locator('body').textContent() === '';
      
      if (hasError) {
        results.completion.issues.push(`Route ${route} has errors or shows blank page`);
      }
    }

    // Verify API endpoints return proper data structure
    const apiTests = [
      '/api/v1/claude-live/prod/agents',
      '/api/v1/claude-live/prod/activities'
    ];

    for (const endpoint of apiTests) {
      const apiWorking = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          const data = await response.json();
          return Array.isArray(data) && data.length > 0;
        } catch {
          return false;
        }
      }, endpoint);

      if (!apiWorking) {
        results.completion.issues.push(`API endpoint ${endpoint} not returning proper data`);
      }
    }

    if (results.completion.issues.length === 0) {
      results.completion.status = 'PASS';
    }

  } catch (error) {
    console.error('Test execution error:', error);
    results.completion.issues.push(`Test execution failed: ${error.message}`);
  }

  await browser.close();

  // Generate comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('🎯 SPARC METHODOLOGY VERIFICATION REPORT');
  console.log('='.repeat(80));

  const phases = [
    { name: 'S - SPECIFICATION', key: 'specification' },
    { name: 'P - PSEUDOCODE', key: 'pseudocode' },
    { name: 'A - ARCHITECTURE', key: 'architecture' },
    { name: 'R - REFINEMENT', key: 'refinement' },
    { name: 'C - COMPLETION', key: 'completion' }
  ];

  let overallPass = true;

  phases.forEach(phase => {
    const result = results[phase.key];
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${phase.name}: ${status}`);
    
    if (result.issues.length > 0) {
      console.log('Issues found:');
      result.issues.forEach(issue => console.log(`  - ${issue}`));
      overallPass = false;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`🎯 OVERALL RESULT: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(80));

  return results;
}

// Run the validation
if (require.main === module) {
  runSPARCValidation()
    .then(results => {
      console.log('\n📊 VALIDATION COMPLETE');
      process.exit(Object.values(results).every(r => r.status === 'PASS') ? 0 : 1);
    })
    .catch(error => {
      console.error('SPARC Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { runSPARCValidation };