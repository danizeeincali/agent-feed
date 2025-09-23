#!/usr/bin/env node

/**
 * Simple Analytics Page Test
 * Manual validation of the analytics page white screen fix
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5173';
const ANALYTICS_URL = `${FRONTEND_URL}/analytics`;
const SCREENSHOT_DIR = '/workspaces/agent-feed/frontend/test-results';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simpleAnalyticsTest() {
  let browser;

  try {
    console.log('🔧 Starting Simple Analytics Test...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Track console messages
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text,
        timestamp: new Date().toISOString()
      });

      if (msg.type() === 'error') {
        errors.push(text);
        console.log(`🔴 Console Error: ${text}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`🔴 Page Error: ${error.message}`);
    });

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    console.log('📱 Navigating to analytics page...');

    // Navigate to analytics page
    const response = await page.goto(ANALYTICS_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log(`📊 Page Response: ${response.status()}`);

    // Wait for React to load
    await delay(5000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `simple-analytics-test-${Date.now()}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Get page content
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body?.innerText?.substring(0, 500) || '',
        hasRoot: !!document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML?.substring(0, 200) || '',
        hasNavigation: !!document.querySelector('nav'),
        hasAnalytics: !!document.querySelector('[data-testid="real-analytics"]'),
        hasLoading: !!document.querySelector('[data-testid="real-analytics-loading"]'),
        hasError: !!document.querySelector('[data-testid="analytics-fallback-error"]'),
        hasMain: !!document.querySelector('main'),
        elementCount: document.querySelectorAll('*').length,
        visibleText: Array.from(document.querySelectorAll('*'))
          .map(el => el.innerText)
          .filter(text => text && text.trim().length > 0)
          .slice(0, 10)
      };
    });

    console.log('\n📋 PAGE ANALYSIS');
    console.log('================');
    console.log(`Title: ${pageInfo.title}`);
    console.log(`Elements: ${pageInfo.elementCount}`);
    console.log(`Has Root: ${pageInfo.hasRoot}`);
    console.log(`Has Navigation: ${pageInfo.hasNavigation}`);
    console.log(`Has Main: ${pageInfo.hasMain}`);
    console.log(`Has Analytics: ${pageInfo.hasAnalytics}`);
    console.log(`Has Loading: ${pageInfo.hasLoading}`);
    console.log(`Has Error: ${pageInfo.hasError}`);

    if (pageInfo.bodyText.length > 0) {
      console.log(`\n📝 Body Text (first 500 chars):\n${pageInfo.bodyText}`);
    }

    if (pageInfo.visibleText.length > 0) {
      console.log(`\n👁️ Visible Text Elements:`);
      pageInfo.visibleText.forEach((text, i) => {
        console.log(`  ${i + 1}. ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      });
    }

    // Check for white screen
    const isWhiteScreen = pageInfo.elementCount < 10 ||
                         pageInfo.bodyText.length < 50 ||
                         (!pageInfo.hasAnalytics && !pageInfo.hasLoading && !pageInfo.hasNavigation);

    console.log(`\n🎯 WHITE SCREEN CHECK: ${isWhiteScreen ? '❌ DETECTED' : '✅ PREVENTED'}`);

    // Console errors summary
    console.log(`\n🔴 CONSOLE ERRORS: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    // Test tab switching if tabs are found
    const tabInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabs = buttons.filter(btn =>
        btn.innerText.includes('System') ||
        btn.innerText.includes('Claude') ||
        btn.innerText.includes('Analytics')
      );

      return tabs.map(tab => ({
        text: tab.innerText,
        className: tab.className,
        visible: tab.offsetParent !== null
      }));
    });

    console.log(`\n🔄 TAB DETECTION: ${tabInfo.length} tabs found`);
    tabInfo.forEach((tab, i) => {
      console.log(`  ${i + 1}. "${tab.text}" (visible: ${tab.visible})`);
    });

    // If tabs found, test clicking
    if (tabInfo.length >= 2) {
      console.log('\n🖱️ Testing tab switching...');

      try {
        // Try to click Claude SDK tab
        const claudeTabs = await page.$$('button');
        for (let button of claudeTabs) {
          const text = await page.evaluate(el => el.innerText, button);
          if (text.toLowerCase().includes('claude') || text.toLowerCase().includes('sdk')) {
            await button.click();
            await delay(2000);
            console.log('✅ Claude SDK tab clicked');
            break;
          }
        }

        // Take another screenshot
        const tabScreenshotPath = path.join(SCREENSHOT_DIR, `analytics-tab-switch-${Date.now()}.png`);
        await page.screenshot({
          path: tabScreenshotPath,
          fullPage: true
        });
        console.log(`📸 Tab switch screenshot: ${tabScreenshotPath}`);

      } catch (tabError) {
        console.log(`❌ Tab switching failed: ${tabError.message}`);
      }
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      url: ANALYTICS_URL,
      pageLoaded: response.ok(),
      whiteScreenDetected: isWhiteScreen,
      errorCount: errors.length,
      elementCount: pageInfo.elementCount,
      hasAnalyticsComponent: pageInfo.hasAnalytics,
      hasLoadingComponent: pageInfo.hasLoading,
      hasErrorComponent: pageInfo.hasError,
      tabCount: tabInfo.length,
      screenshot: screenshotPath,
      errors: errors,
      pageInfo: pageInfo
    };

    // Save test results
    const resultsPath = path.join(SCREENSHOT_DIR, `simple-analytics-results-${Date.now()}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

    console.log('\n✅ TEST COMPLETED');
    console.log(`📄 Results saved: ${resultsPath}`);

    return testResults;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  simpleAnalyticsTest()
    .then(results => {
      if (results.error) {
        process.exit(1);
      } else {
        process.exit(results.whiteScreenDetected ? 1 : 0);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { simpleAnalyticsTest };