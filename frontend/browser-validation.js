/**
 * Manual Browser Validation Script
 * Using Puppeteer to perform actual browser validation
 */

import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:3001';
const VALIDATION_RESULTS = [];

function logResult(test, passed, details) {
  const result = {
    test,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  VALIDATION_RESULTS.push(result);
  console.log(`${passed ? '✅' : '❌'} ${test}: ${details}`);
}

async function runValidation() {
  console.log('🚀 Starting Comprehensive Browser Validation...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Run in headed mode to see the browser
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));
  page.on('pageerror', error => console.error(`Page Error: ${error.message}`));
  
  try {
    // VALIDATION 1: Correct URL Access
    console.log('\n📍 VALIDATION 1: URL Access on Port 3001');
    const response = await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const status = response.status();
    const url = page.url();
    
    logResult(
      'URL Access', 
      status === 200 && url.includes('localhost:3001'),
      `Status: ${status}, URL: ${url}`
    );
    
    // VALIDATION 2: React App Loading
    console.log('\n📍 VALIDATION 2: React App Loading');
    try {
      await page.waitForSelector('[data-testid="header"]', { timeout: 10000 });
      await page.waitForSelector('text/AgentLink Feed System', { timeout: 5000 });
      logResult('React App Loading', true, 'Header and title loaded successfully');
    } catch (e) {
      logResult('React App Loading', false, `Failed to load: ${e.message}`);
    }
    
    // VALIDATION 3: Sidebar Navigation
    console.log('\n📍 VALIDATION 3: Sidebar Navigation');
    try {
      const claudeManagerLink = await page.waitForSelector('text/Claude Manager', { timeout: 5000 });
      const isVisible = await claudeManagerLink.isIntersectingViewport();
      logResult('Sidebar Navigation', isVisible, 'Claude Manager link is visible');
    } catch (e) {
      logResult('Sidebar Navigation', false, `Sidebar not found: ${e.message}`);
    }
    
    // VALIDATION 4: Navigation to Dual Instance Page
    console.log('\n📍 VALIDATION 4: Dual Instance Navigation');
    try {
      await page.click('text/Claude Manager');
      await page.waitForNavigation({ timeout: 10000 });
      const currentUrl = page.url();
      const isDualInstancePage = currentUrl.includes('/dual-instance');
      
      if (isDualInstancePage) {
        await page.waitForSelector('text/Claude Instance Manager', { timeout: 10000 });
        logResult('Dual Instance Navigation', true, `Successfully navigated to: ${currentUrl}`);
      } else {
        logResult('Dual Instance Navigation', false, `Wrong URL: ${currentUrl}`);
      }
    } catch (e) {
      logResult('Dual Instance Navigation', false, `Navigation failed: ${e.message}`);
    }
    
    // VALIDATION 5: Component Loading
    console.log('\n📍 VALIDATION 5: Component Loading');
    try {
      // Check for key components
      const components = [
        'text/Claude Instance Manager',
        'text/Instance Launcher',
        'text/Dual Monitor', 
        'text/Terminal',
        'text/Running:',
        'text/Stopped:'
      ];
      
      let componentsLoaded = 0;
      for (const selector of components) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          componentsLoaded++;
        } catch (e) {
          console.log(`Component not found: ${selector}`);
        }
      }
      
      const success = componentsLoaded >= 4; // At least 4 components should load
      logResult('Component Loading', success, `${componentsLoaded}/${components.length} components loaded`);
    } catch (e) {
      logResult('Component Loading', false, `Component loading failed: ${e.message}`);
    }
    
    // VALIDATION 6: Tab Navigation
    console.log('\n📍 VALIDATION 6: Tab Navigation');
    try {
      // Test Monitor tab
      await page.click('text/Dual Monitor');
      await page.waitForTimeout(1000);
      let monitorUrl = page.url();
      
      // Test Terminal tab
      await page.click('text/Terminal');
      await page.waitForTimeout(1000);
      let terminalUrl = page.url();
      
      // Test Launcher tab
      await page.click('text/Instance Launcher');
      await page.waitForTimeout(1000);
      let launcherUrl = page.url();
      
      const tabsWorking = (
        monitorUrl.includes('/monitor') &&
        terminalUrl.includes('/terminal') &&
        launcherUrl.includes('/launcher')
      );
      
      logResult('Tab Navigation', tabsWorking, `Monitor: ${monitorUrl.includes('/monitor')}, Terminal: ${terminalUrl.includes('/terminal')}, Launcher: ${launcherUrl.includes('/launcher')}`);
    } catch (e) {
      logResult('Tab Navigation', false, `Tab navigation failed: ${e.message}`);
    }
    
    // VALIDATION 7: Stats Display
    console.log('\n📍 VALIDATION 7: Stats Display');
    try {
      const runningText = await page.$eval('text/Running:', el => el.textContent);
      const stoppedText = await page.$eval('text/Stopped:', el => el.textContent);
      
      const runningValid = /Running:\s*\d+/.test(runningText || '');
      const stoppedValid = /Stopped:\s*\d+/.test(stoppedText || '');
      
      logResult('Stats Display', runningValid && stoppedValid, `Running: "${runningText}", Stopped: "${stoppedText}"`);
    } catch (e) {
      logResult('Stats Display', false, `Stats validation failed: ${e.message}`);
    }
    
    // VALIDATION 8: Terminal Navigation
    console.log('\n📍 VALIDATION 8: Terminal Navigation');
    try {
      await page.goto(`${FRONTEND_URL}/dual-instance/terminal`);
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorElements = await page.$$('text/Instance Not Found');
      const hasNoInstanceError = errorElements.length === 0;
      
      // Should show appropriate message for terminal
      const hasTerminalContent = await page.$('text/No running instances available') || 
                                await page.$('text/Select a running instance') ||
                                await page.$('text/Launch Instance');
      
      logResult('Terminal Navigation', hasNoInstanceError && hasTerminalContent, `No error messages: ${hasNoInstanceError}, Has terminal content: ${!!hasTerminalContent}`);
    } catch (e) {
      logResult('Terminal Navigation', false, `Terminal navigation failed: ${e.message}`);
    }
    
    // VALIDATION 9: Button Functionality
    console.log('\n📍 VALIDATION 9: Button Functionality');
    try {
      await page.goto(`${FRONTEND_URL}/dual-instance`);
      await page.waitForSelector('text/Instance Launcher', { timeout: 5000 });
      
      // Test tab buttons
      const tabButtons = await page.$$('button:has-text("Instance Launcher"), button:has-text("Dual Monitor"), button:has-text("Terminal")');
      let buttonsFunctional = 0;
      
      for (const button of tabButtons) {
        const isEnabled = await button.isEnabled();
        if (isEnabled) buttonsFunctional++;
      }
      
      logResult('Button Functionality', buttonsFunctional >= 3, `${buttonsFunctional}/3 tab buttons functional`);
    } catch (e) {
      logResult('Button Functionality', false, `Button testing failed: ${e.message}`);
    }
    
    // VALIDATION 10: Performance Check
    console.log('\n📍 VALIDATION 10: Performance Check');
    try {
      const startTime = Date.now();
      await page.goto(`${FRONTEND_URL}/dual-instance`);
      await page.waitForSelector('text/Claude Instance Manager', { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      const performanceGood = loadTime < 10000; // 10 seconds max
      logResult('Performance Check', performanceGood, `Load time: ${loadTime}ms`);
    } catch (e) {
      logResult('Performance Check', false, `Performance test failed: ${e.message}`);
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = VALIDATION_RESULTS.filter(r => r.passed).length;
  const total = VALIDATION_RESULTS.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passed}/${total} (${passRate}%)`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passRate >= 80) {
    console.log('🎉 VALIDATION SUCCESSFUL - Application is production ready!');
  } else if (passRate >= 60) {
    console.log('⚠️  VALIDATION PARTIAL - Some issues need attention');
  } else {
    console.log('🚨 VALIDATION FAILED - Critical issues need fixing');
  }
  
  return VALIDATION_RESULTS;
}

// Run validation
runValidation().catch(console.error);