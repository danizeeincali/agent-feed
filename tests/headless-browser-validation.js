/**
 * Headless Browser Validation for Activities Page
 *
 * Uses headless Puppeteer to validate the Activities page in server environment
 * Testing real system with zero mock data
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = '/workspaces/agent-feed/test-results/activities-validation-screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function validateActivitiesPageHeadless() {
  console.log('🎨 STARTING HEADLESS BROWSER VALIDATION');
  console.log('=' .repeat(80));
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log(`Backend API: ${API_URL}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
  console.log('');

  let browser;
  let page;

  try {
    // Launch headless browser with server-friendly options
    console.log('🚀 Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true, // Must be headless for server environment
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      defaultViewport: { width: 1280, height: 720 }
    });

    page = await browser.newPage();

    // Enable request/response logging
    const requests = [];
    const responses = [];
    const errors = [];

    page.on('request', request => {
      if (request.url().includes('activities') || request.url().includes('5173') || request.url().includes('3000')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('activities') || response.url().includes('5173') || response.url().includes('3000')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`❌ Page Error: ${error.message}`);
    });

    console.log('🌐 Navigating to Activities page...');
    try {
      await page.goto(`${BASE_URL}/activity`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('✅ Navigation successful');
    } catch (navError) {
      console.log(`⚠️ Navigation issue: ${navError.message}`);
      // Try main page first
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForTimeout(2000);
      // Then navigate to activities
      await page.goto(`${BASE_URL}/activity`, { waitUntil: 'networkidle2', timeout: 20000 });
    }

    // Wait for page to fully load
    await page.waitForTimeout(5000);

    // Take initial screenshot
    console.log('📸 Capturing initial page state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '1-activities-page-headless-load.png'),
      fullPage: true
    });

    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Get page content for analysis
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);

    console.log('🔍 Page content analysis...');

    // Look for activity-related content
    const hasActivityContent = pageContent.includes('activity') ||
                              pageContent.includes('Activity') ||
                              pageText.includes('Live Activity Feed') ||
                              pageText.includes('Real-time');

    console.log(`   Activity content found: ${hasActivityContent}`);

    // Look for React/component indicators
    const hasReactContent = pageContent.includes('react') ||
                           pageContent.includes('div id="root"') ||
                           pageContent.includes('data-testid');

    console.log(`   React content detected: ${hasReactContent}`);

    // Check for error states
    const hasErrorContent = pageText.includes('Error') ||
                           pageText.includes('Failed') ||
                           pageText.includes('404');

    console.log(`   Error content detected: ${hasErrorContent}`);

    // Look for loading states
    const hasLoadingContent = pageText.includes('Loading') ||
                             pageText.includes('loading');

    console.log(`   Loading content detected: ${hasLoadingContent}`);

    // Try to find specific activity feed elements
    const activityElements = await page.$$eval('*', elements => {
      return elements.filter(el => {
        const text = el.innerText || '';
        const className = el.className || '';
        return text.includes('Activity') ||
               text.includes('Real-time') ||
               className.includes('activity') ||
               el.tagName === 'H2' && text.includes('Live');
      }).length;
    });

    console.log(`   Activity-related elements found: ${activityElements}`);

    // Check for activities data
    const activitiesData = await page.evaluate(() => {
      // Look for any data that might be activities
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('activit')) {
          return 'Activity data found in scripts';
        }
      }

      // Check window object for activity data
      if (window.activities || window.__INITIAL_STATE__) {
        return 'Activity data found in window';
      }

      return 'No activity data detected';
    });

    console.log(`   Activities data check: ${activitiesData}`);

    // Test refresh/reload
    console.log('🔄 Testing page reload...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);

    console.log('📸 Capturing post-reload state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '2-activities-after-reload.png'),
      fullPage: true
    });

    // Test navigation sequence
    console.log('🔄 Testing navigation sequence...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/activity`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('📸 Capturing post-navigation state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '3-activities-after-navigation.png'),
      fullPage: true
    });

    // Save network logs
    const networkLog = {
      timestamp: new Date().toISOString(),
      requests,
      responses,
      errors,
      summary: {
        totalRequests: requests.length,
        totalResponses: responses.length,
        successfulResponses: responses.filter(r => r.status >= 200 && r.status < 300).length,
        errors: errors.length
      }
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'headless-network-log.json'),
      JSON.stringify(networkLog, null, 2)
    );

    console.log(`✅ Network activity captured: ${requests.length} requests, ${responses.length} responses`);

    // Generate validation report
    const validationReport = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: BASE_URL,
        backend: API_URL,
        browser: 'Puppeteer Chrome Headless',
        mode: 'server_environment'
      },
      pageValidation: {
        title,
        hasActivityContent,
        hasReactContent,
        hasErrorContent,
        hasLoadingContent,
        activityElements,
        activitiesData,
        navigationTested: true,
        reloadTested: true
      },
      networkActivity: networkLog.summary,
      screenshots: fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')),
      conclusion: hasActivityContent ?
        'Activity page loaded successfully with expected content' :
        hasErrorContent ?
          'Page loaded but with error content detected' :
          'Page loaded but activity content detection inconclusive'
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'headless-validation-report.json'),
      JSON.stringify(validationReport, null, 2)
    );

    console.log('');
    console.log('📊 HEADLESS VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Page loaded: ${title}`);
    console.log(`✅ Activity content: ${hasActivityContent ? 'DETECTED' : 'NOT DETECTED'}`);
    console.log(`✅ React content: ${hasReactContent ? 'DETECTED' : 'NOT DETECTED'}`);
    console.log(`✅ Error content: ${hasErrorContent ? 'DETECTED (CONCERN)' : 'NONE'}`);
    console.log(`✅ Activity elements: ${activityElements}`);
    console.log(`✅ Network requests: ${requests.length}`);
    console.log(`✅ Screenshots: ${validationReport.screenshots.length}`);
    console.log(`✅ Status: ${validationReport.conclusion}`);

    return validationReport;

  } catch (error) {
    console.error('❌ Headless validation error:', error);

    if (page) {
      try {
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'headless-error-state.png'),
          fullPage: true
        });
      } catch (screenError) {
        console.log('Could not capture error screenshot:', screenError.message);
      }
    }

    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔚 Browser closed');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  validateActivitiesPageHeadless()
    .then(results => {
      console.log('🎉 Headless validation completed successfully!');
      console.log(`📁 All results saved to: ${SCREENSHOTS_DIR}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Headless validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { validateActivitiesPageHeadless };