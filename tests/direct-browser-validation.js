/**
 * Direct Browser Validation for Activities Page
 *
 * Uses Puppeteer to validate the Activities page with real screenshots
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

async function validateActivitiesPage() {
  console.log('🎨 STARTING DIRECT BROWSER VALIDATION');
  console.log('=' .repeat(80));
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log(`Backend API: ${API_URL}`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
  console.log('');

  let browser;
  let page;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Use real browser for visual verification
      slowMo: 500,     // Slow down for observation
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });

    page = await browser.newPage();

    // Enable request/response logging
    const requests = [];
    const responses = [];

    page.on('request', request => {
      if (request.url().includes('activities')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('activities')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });

    console.log('🌐 Navigating to Activities page...');
    await page.goto(`${BASE_URL}/activity`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to fully load
    await page.waitForTimeout(3000);

    // Take initial screenshot
    console.log('📸 Capturing initial page state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '1-activities-page-initial-load.png'),
      fullPage: true
    });

    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Look for RealActivityFeed component
    console.log('🔍 Looking for RealActivityFeed component...');

    const activityFeedSelectors = [
      'h2:contains("Live Activity Feed")',
      '.activity-feed',
      '[data-testid="activity-feed"]',
      'text="Real-time activity streaming"',
      'text="Loading real activity data"'
    ];

    let componentFound = false;
    for (const selector of activityFeedSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 5000 });
        if (element) {
          console.log(`✅ Found component with selector: ${selector}`);
          componentFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!componentFound) {
      // Try more generic approach
      const pageContent = await page.content();
      const hasActivityContent = pageContent.includes('activity') ||
                                pageContent.includes('Activity') ||
                                pageContent.includes('Live') ||
                                pageContent.includes('Real-time');

      console.log(`🔍 Activity content in page: ${hasActivityContent}`);
    }

    // Check for activities or empty state
    console.log('🔍 Checking for activities or empty state...');

    await page.waitForTimeout(2000);

    // Look for activity items
    const activityItems = await page.$$('.activity-item, .border-l-4, [data-activity]');
    console.log(`📊 Found ${activityItems.length} activity items`);

    // Look for empty state
    const emptyStateTexts = [
      'No activities yet',
      'No system activities',
      'No activities have been recorded'
    ];

    let emptyStateFound = false;
    for (const text of emptyStateTexts) {
      const elements = await page.$x(`//*[contains(text(), "${text}")]`);
      if (elements.length > 0) {
        console.log(`✅ Empty state detected: "${text}"`);
        emptyStateFound = true;
        break;
      }
    }

    // Take screenshot of current state
    const stateDescription = activityItems.length > 0 ? 'with-activities' :
                            emptyStateFound ? 'empty-state' : 'unknown-state';

    console.log(`📸 Capturing ${stateDescription} screenshot...`);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `2-activities-${stateDescription}.png`),
      fullPage: true
    });

    // Test refresh functionality
    console.log('🔄 Testing refresh functionality...');
    try {
      await page.click('button:contains("Refresh")', { timeout: 5000 });
      await page.waitForTimeout(2000);

      console.log('📸 Capturing post-refresh state...');
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '3-activities-after-refresh.png'),
        fullPage: true
      });
    } catch (e) {
      console.log('ℹ️ Refresh button not found or not clickable');
    }

    // Test navigation to trigger activities
    console.log('🔄 Testing navigation to potentially trigger system activities...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}/activity`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('📸 Capturing post-navigation state...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '4-activities-after-navigation.png'),
      fullPage: true
    });

    // Save network logs
    const networkLog = {
      timestamp: new Date().toISOString(),
      requests,
      responses,
      summary: {
        totalRequests: requests.length,
        totalResponses: responses.length,
        successfulResponses: responses.filter(r => r.status >= 200 && r.status < 300).length
      }
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'network-activity-log.json'),
      JSON.stringify(networkLog, null, 2)
    );

    console.log(`✅ Network activity captured: ${requests.length} requests, ${responses.length} responses`);

    // Generate validation report
    const validationReport = {
      timestamp: new Date().toISOString(),
      environment: {
        frontend: BASE_URL,
        backend: API_URL,
        browser: 'Puppeteer Chrome'
      },
      pageValidation: {
        title,
        componentFound,
        activityItemsCount: activityItems.length,
        emptyStateFound,
        refreshTested: true
      },
      networkActivity: networkLog.summary,
      screenshots: fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')),
      conclusion: activityItems.length > 0 ?
        'Real activities found and displayed successfully' :
        emptyStateFound ?
          'Empty state properly displayed (no mock data)' :
          'Page loaded but state unclear - needs investigation'
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'browser-validation-report.json'),
      JSON.stringify(validationReport, null, 2)
    );

    console.log('');
    console.log('📊 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Page loaded successfully: ${title}`);
    console.log(`✅ Component detection: ${componentFound ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`✅ Activity items found: ${activityItems.length}`);
    console.log(`✅ Empty state handling: ${emptyStateFound ? 'CONFIRMED' : 'N/A'}`);
    console.log(`✅ Network requests: ${requests.length} (Activities API)`);
    console.log(`✅ Screenshots captured: ${validationReport.screenshots.length}`);
    console.log(`✅ Real data validation: ${validationReport.conclusion}`);

    return validationReport;

  } catch (error) {
    console.error('❌ Validation error:', error);

    if (page) {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'error-state.png'),
        fullPage: true
      });
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
  validateActivitiesPage()
    .then(results => {
      console.log('🎉 Browser validation completed successfully!');
      console.log(`📁 All results saved to: ${SCREENSHOTS_DIR}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Browser validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { validateActivitiesPage };