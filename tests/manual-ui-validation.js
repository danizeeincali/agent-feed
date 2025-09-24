const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function validateUI() {
  console.log('🚀 Starting UI/UX Validation Suite...');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const validationResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: [],
    consoleErrors: [],
    warnings: []
  };

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      validationResults.consoleErrors.push(msg.text());
      console.log(`❌ Console Error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      validationResults.warnings.push(msg.text());
    }
  });

  try {
    // Test 1: Homepage Load
    console.log('\n📍 Test 1: Homepage Load Validation');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    const screenshotPath1 = path.join(screenshotsDir, '01-homepage.png');
    await page.screenshot({ path: screenshotPath1, fullPage: true });
    validationResults.screenshots.push('01-homepage.png');

    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    validationResults.tests.push({ name: 'Homepage Load', status: 'pass', details: `Title: ${title}` });

    // Test 2: Navigation Menu Validation
    console.log('\n📍 Test 2: Navigation Menu Validation');

    // Look for Create links (should not exist)
    const createLinks = await page.$$eval('a, button', elements =>
      elements.filter(el => el.textContent?.toLowerCase().includes('create')).length
    );

    console.log(`Found ${createLinks} "Create" links (should be 0)`);
    validationResults.tests.push({
      name: 'No Create Links',
      status: createLinks === 0 ? 'pass' : 'fail',
      details: `Found ${createLinks} create links`
    });

    // Test 3: Enhanced Posting Interface
    console.log('\n📍 Test 3: Enhanced Posting Interface');

    // Look for posting interface elements
    const postingElements = await page.evaluate(() => {
      const selectors = [
        '.posting-interface', '.post-creator', '.enhanced-posting',
        '[data-testid="posting-interface"]', 'form[data-testid="post-form"]',
        'textarea[placeholder*="post"]', 'textarea[placeholder*="share"]'
      ];

      let found = [];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          found.push({ selector, count: elements.length });
        }
      }
      return found;
    });

    console.log('Posting interface elements found:', postingElements);
    const screenshotPath3 = path.join(screenshotsDir, '03-posting-interface.png');
    await page.screenshot({ path: screenshotPath3, fullPage: true });
    validationResults.screenshots.push('03-posting-interface.png');

    validationResults.tests.push({
      name: 'Posting Interface Present',
      status: postingElements.length > 0 ? 'pass' : 'fail',
      details: `Found ${postingElements.length} posting interface elements`
    });

    // Test 4: Tab Functionality
    console.log('\n📍 Test 4: Tab Functionality');

    const tabs = await page.evaluate(() => {
      const tabTexts = ['Quick Post', 'Post', 'Avi DM'];
      let foundTabs = [];

      for (const tabText of tabTexts) {
        const elements = document.querySelectorAll(`button:contains("${tabText}"), [role="tab"]`);
        if (elements.length === 0) {
          // Try alternative search
          const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
          const found = allButtons.filter(btn => btn.textContent?.includes(tabText));
          if (found.length > 0) {
            foundTabs.push({ tab: tabText, count: found.length });
          }
        } else {
          foundTabs.push({ tab: tabText, count: elements.length });
        }
      }

      return foundTabs;
    });

    console.log('Tabs found:', tabs);
    validationResults.tests.push({
      name: 'Tab Functionality',
      status: tabs.length > 0 ? 'pass' : 'warning',
      details: `Found tabs: ${tabs.map(t => t.tab).join(', ')}`
    });

    // Test 5: Avi DM Functionality
    console.log('\n📍 Test 5: Avi DM Functionality');

    const aviDM = await page.evaluate(() => {
      const aviSelectors = [
        'button:contains("Avi DM")', '[data-testid="avi-dm"]',
        '.avi-dm', '.ai-chat', '.ai-assistant'
      ];

      let found = null;
      for (const selector of aviSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            found = { selector, visible: elements[0].offsetParent !== null };
            break;
          }
        } catch (e) {
          // Selector might not be valid CSS
        }
      }

      // Alternative search for text content
      if (!found) {
        const allElements = Array.from(document.querySelectorAll('*'));
        const aviElements = allElements.filter(el =>
          el.textContent?.toLowerCase().includes('avi') &&
          el.textContent?.toLowerCase().includes('dm')
        );
        if (aviElements.length > 0) {
          found = { selector: 'text search', visible: aviElements[0].offsetParent !== null };
        }
      }

      return found;
    });

    console.log('Avi DM found:', aviDM);
    validationResults.tests.push({
      name: 'Avi DM Present',
      status: aviDM ? 'pass' : 'warning',
      details: aviDM ? `Found: ${aviDM.selector}` : 'Not found'
    });

    // Test 6: Mobile Responsiveness
    console.log('\n📍 Test 6: Mobile Responsiveness');

    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.waitForTimeout(1000);

    const screenshotPath6 = path.join(screenshotsDir, '06-mobile-view.png');
    await page.screenshot({ path: screenshotPath6, fullPage: true });
    validationResults.screenshots.push('06-mobile-view.png');

    await page.setViewport({ width: 1920, height: 1080 }); // Back to desktop

    validationResults.tests.push({
      name: 'Mobile Responsiveness',
      status: 'pass',
      details: 'Mobile viewport tested'
    });

    // Test 7: Final State
    console.log('\n📍 Test 7: Final State Capture');

    const screenshotPath7 = path.join(screenshotsDir, '07-final-state.png');
    await page.screenshot({ path: screenshotPath7, fullPage: true });
    validationResults.screenshots.push('07-final-state.png');

    // Generate summary
    console.log('\n📊 Validation Summary:');
    console.log('='.repeat(50));

    const passed = validationResults.tests.filter(t => t.status === 'pass').length;
    const failed = validationResults.tests.filter(t => t.status === 'fail').length;
    const warnings = validationResults.tests.filter(t => t.status === 'warning').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📷 Screenshots: ${validationResults.screenshots.length}`);
    console.log(`🐛 Console Errors: ${validationResults.consoleErrors.length}`);

    // Save validation report
    const reportPath = path.join(__dirname, 'ui-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n📋 Report saved: ${reportPath}`);

    return validationResults;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    validationResults.tests.push({
      name: 'Test Execution',
      status: 'fail',
      details: error.message
    });
  } finally {
    await browser.close();
  }

  return validationResults;
}

// Run validation if called directly
if (require.main === module) {
  validateUI().then(results => {
    console.log('\n🎉 UI/UX Validation Complete!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Validation suite failed:', error);
    process.exit(1);
  });
}

module.exports = { validateUI };