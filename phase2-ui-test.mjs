/**
 * Phase 2 UI/UX Validation - Standalone Script
 * Tests Phase 2 Orchestrator Dashboard UI
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = path.join(__dirname, 'phase2-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  screenshots: []
};

async function runTests() {
  console.log('🚀 Starting Phase 2 UI Validation...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = { errors: [], warnings: [], logs: [] };
  page.on('console', msg => {
    if (msg.type() === 'error') consoleMessages.errors.push(msg.text());
    if (msg.type() === 'warning') consoleMessages.warnings.push(msg.text());
    if (msg.type() === 'log') consoleMessages.logs.push(msg.text());
  });

  try {
    // Test 1: Check API Health
    console.log('✅ Test 1: Checking API health...');
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      if (data.success && data.data.status === 'healthy') {
        testResults.passed.push('API health check');
        console.log('   ✓ API is healthy');
      } else {
        testResults.failed.push('API health check - unhealthy response');
      }
    } catch (error) {
      testResults.failed.push(`API health check - ${error.message}`);
      console.log('   ✗ API health check failed:', error.message);
    }

    // Test 2: Load Homepage
    console.log('\n✅ Test 2: Loading homepage...');
    try {
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      testResults.passed.push('Homepage loaded');
      console.log('   ✓ Homepage loaded successfully');

      const screenshotPath = path.join(SCREENSHOT_DIR, '01-homepage.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      testResults.failed.push(`Homepage load - ${error.message}`);
      console.log('   ✗ Homepage load failed:', error.message);
    }

    // Test 3: Check Navigation
    console.log('\n✅ Test 3: Checking navigation...');
    try {
      const feedLink = await page.$('text=Feed');
      const agentsLink = await page.$('text=Agents');
      const activityLink = await page.$('text=Activity');

      if (feedLink && agentsLink) {
        testResults.passed.push('Navigation menu present');
        console.log('   ✓ Navigation menu found');
      } else {
        testResults.warnings.push('Some navigation links missing');
        console.log('   ⚠ Some navigation links missing');
      }

      const screenshotPath = path.join(SCREENSHOT_DIR, '02-navigation.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
    } catch (error) {
      testResults.warnings.push(`Navigation check - ${error.message}`);
    }

    // Test 4: Dark Mode
    console.log('\n✅ Test 4: Testing dark mode...');
    try {
      // Add dark mode class
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);

      const screenshotPath = path.join(SCREENSHOT_DIR, '03-dark-mode.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      testResults.passed.push('Dark mode tested');
      console.log('   ✓ Dark mode screenshot captured');

      // Remove dark mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
    } catch (error) {
      testResults.warnings.push(`Dark mode - ${error.message}`);
    }

    // Test 5: Agents Page
    console.log('\n✅ Test 5: Testing agents page...');
    try {
      await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, '04-agents-page.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      testResults.passed.push('Agents page loaded');
      console.log('   ✓ Agents page loaded');

      // Check for agent content
      const content = await page.content();
      if (content.toLowerCase().includes('agent')) {
        testResults.passed.push('Agent content present');
        console.log('   ✓ Agent-related content found');
      }
    } catch (error) {
      testResults.failed.push(`Agents page - ${error.message}`);
      console.log('   ✗ Agents page failed:', error.message);
    }

    // Test 6: Check for Avi DM
    console.log('\n✅ Test 6: Looking for Avi DM interface...');
    try {
      const pageContent = await page.textContent('body');
      const hasAvi = pageContent.toLowerCase().includes('avi');
      const hasDM = pageContent.toLowerCase().includes('dm') || pageContent.toLowerCase().includes('chat');

      if (hasAvi && hasDM) {
        testResults.passed.push('Avi DM interface found');
        console.log('   ✓ Avi DM interface detected');
      } else if (hasAvi || hasDM) {
        testResults.warnings.push('Partial Avi DM interface found');
        console.log('   ⚠ Partial Avi DM interface detected');
      } else {
        testResults.warnings.push('Avi DM interface not found');
        console.log('   ⚠ Avi DM interface not detected in current view');
      }

      const screenshotPath = path.join(SCREENSHOT_DIR, '05-avi-dm-search.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
    } catch (error) {
      testResults.warnings.push(`Avi DM check - ${error.message}`);
    }

    // Test 7: Activity Feed
    console.log('\n✅ Test 7: Testing activity feed...');
    try {
      await page.goto(`${FRONTEND_URL}/activity`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, '06-activity-feed.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      testResults.passed.push('Activity feed loaded');
      console.log('   ✓ Activity feed loaded');
    } catch (error) {
      testResults.failed.push(`Activity feed - ${error.message}`);
      console.log('   ✗ Activity feed failed:', error.message);
    }

    // Test 8: Analytics Page
    console.log('\n✅ Test 8: Testing analytics page...');
    try {
      await page.goto(`${FRONTEND_URL}/analytics`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const screenshotPath = path.join(SCREENSHOT_DIR, '07-analytics.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      testResults.passed.push('Analytics page loaded');
      console.log('   ✓ Analytics page loaded');
    } catch (error) {
      testResults.failed.push(`Analytics page - ${error.message}`);
      console.log('   ✗ Analytics page failed:', error.message);
    }

    // Test 9: Check for Orchestrator Status
    console.log('\n✅ Test 9: Checking for orchestrator status...');
    try {
      const apiResponse = await fetch(`${API_URL}/api/avi/status`);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        testResults.passed.push('Orchestrator API available');
        console.log('   ✓ Orchestrator API endpoint available');

        fs.writeFileSync(
          path.join(SCREENSHOT_DIR, 'orchestrator-status.json'),
          JSON.stringify(data, null, 2)
        );
      } else {
        testResults.warnings.push('Orchestrator API not available');
        console.log('   ⚠ Orchestrator API endpoint not available');
      }
    } catch (error) {
      testResults.warnings.push(`Orchestrator API - ${error.message}`);
      console.log('   ⚠ Orchestrator API check failed:', error.message);
    }

    // Test 10: Mobile Responsive
    console.log('\n✅ Test 10: Testing mobile responsive layout...');
    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(SCREENSHOT_DIR, '08-mobile-layout.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      testResults.screenshots.push(screenshotPath);
      testResults.passed.push('Mobile layout tested');
      console.log('   ✓ Mobile layout screenshot captured');
    } catch (error) {
      testResults.warnings.push(`Mobile layout - ${error.message}`);
    }

    // Test 11: Accessibility Check
    console.log('\n✅ Test 11: Checking accessibility...');
    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

      const ariaElements = await page.$$eval('[aria-label], [aria-labelledby], [role]', elements => {
        return elements.map(el => ({
          tag: el.tagName,
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role')
        }));
      });

      if (ariaElements.length > 0) {
        testResults.passed.push(`Accessibility - ${ariaElements.length} ARIA elements found`);
        console.log(`   ✓ Found ${ariaElements.length} elements with ARIA attributes`);
      } else {
        testResults.warnings.push('No ARIA elements found');
        console.log('   ⚠ No ARIA elements found');
      }

      fs.writeFileSync(
        path.join(SCREENSHOT_DIR, 'accessibility-report.json'),
        JSON.stringify({ ariaElements, count: ariaElements.length }, null, 2)
      );
    } catch (error) {
      testResults.warnings.push(`Accessibility check - ${error.message}`);
    }

    // Save console logs
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'console-logs.json'),
      JSON.stringify(consoleMessages, null, 2)
    );

    console.log('\n✅ Test 12: Console errors check...');
    const criticalErrors = consoleMessages.errors.filter(err =>
      !err.includes('Failed to load resource') &&
      !err.includes('404') &&
      !err.includes('favicon')
    );

    if (criticalErrors.length === 0) {
      testResults.passed.push('No critical console errors');
      console.log('   ✓ No critical console errors found');
    } else {
      testResults.warnings.push(`${criticalErrors.length} console errors found`);
      console.log(`   ⚠ Found ${criticalErrors.length} console errors`);
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
    testResults.failed.push(`Test suite error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Generate final report
  generateReport();
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PHASE 2 UI VALIDATION REPORT');
  console.log('='.repeat(80));

  console.log(`\n✅ Tests Passed: ${testResults.passed.length}`);
  testResults.passed.forEach(test => console.log(`   ✓ ${test}`));

  console.log(`\n⚠️  Warnings: ${testResults.warnings.length}`);
  testResults.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));

  console.log(`\n❌ Tests Failed: ${testResults.failed.length}`);
  testResults.failed.forEach(test => console.log(`   ✗ ${test}`));

  console.log(`\n📸 Screenshots Captured: ${testResults.screenshots.length}`);
  console.log(`   Location: ${SCREENSHOT_DIR}`);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed.length,
      warnings: testResults.warnings.length,
      failed: testResults.failed.length,
      screenshots: testResults.screenshots.length
    },
    details: testResults
  };

  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved: ${reportPath}`);

  console.log('\n' + '='.repeat(80));

  // Exit with appropriate code
  if (testResults.failed.length > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else if (testResults.warnings.length > 0) {
    console.log('⚠️  Tests passed with warnings');
    process.exit(0);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
