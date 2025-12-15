import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotDir = '/workspaces/agent-feed/validation-screenshots';

async function validateProduction() {
  console.log('🚀 Starting Production Validation...\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const logs = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });

    if (msg.type() === 'error') {
      errors.push(text);
      console.log('❌ Console Error:', text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
      console.log('⚠️  Console Warning:', text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorMsg = `Page Error: ${error.message}`;
    errors.push(errorMsg);
    console.log('❌', errorMsg);
  });

  try {
    console.log('📍 Step 1: Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('⏳ Step 2: Waiting 5 seconds for full page load');
    await page.waitForTimeout(5000);

    // Screenshot 1: Initial load
    await page.screenshot({
      path: path.join(screenshotDir, '1-initial-load.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 1: Initial page load saved\n');

    // Check for posts
    const postSelectors = [
      '[class*="post"]',
      '[data-testid*="post"]',
      'article',
      '[class*="Post"]',
      '.social-post'
    ];

    let posts = 0;
    for (const selector of postSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        posts = count;
        console.log(`📊 Found ${posts} posts using selector: ${selector}`);
        break;
      }
    }

    // Check for engagement elements
    const engagementSelectors = [
      '[class*="engagement"]',
      '[class*="stats"]',
      '[class*="likes"]',
      '[class*="views"]',
      '[class*="Engagement"]',
      '.engagement-stats'
    ];

    let engagementElements = 0;
    for (const selector of engagementSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        engagementElements = count;
        console.log(`💬 Found ${engagementElements} engagement elements using selector: ${selector}`);
        break;
      }
    }

    // Screenshot 2: Page with data
    await page.screenshot({
      path: path.join(screenshotDir, '2-page-with-data.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 2: Page with data loaded\n');

    // Look for save buttons
    const saveButtonSelectors = [
      'button:has-text("Save")',
      'button[aria-label*="save" i]',
      'button[title*="save" i]',
      '[class*="save" i]'
    ];

    let saveButtons = 0;
    let saveButtonSelector = null;
    for (const selector of saveButtonSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          saveButtons = count;
          saveButtonSelector = selector;
          console.log(`💾 Found ${saveButtons} save buttons using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Selector might not be valid, continue
      }
    }

    // Try to click save button if found
    if (saveButtons > 0 && saveButtonSelector) {
      try {
        const firstSaveButton = page.locator(saveButtonSelector).first();
        await firstSaveButton.scrollIntoViewIfNeeded();

        // Screenshot before save
        await page.screenshot({
          path: path.join(screenshotDir, '3-before-save.png'),
          fullPage: true
        });
        console.log('📸 Screenshot 3: Before save action');

        await firstSaveButton.click();
        await page.waitForTimeout(2000);

        // Screenshot after save
        await page.screenshot({
          path: path.join(screenshotDir, '4-after-save.png'),
          fullPage: true
        });
        console.log('📸 Screenshot 4: After save action\n');
      } catch (e) {
        console.log('⚠️  Could not click save button:', e.message);
      }
    }

    // Get page HTML to check for data
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.length > 1000;

    // Final screenshot
    await page.screenshot({
      path: path.join(screenshotDir, '5-final-state.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 5: Final state\n');

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      validation: {
        zeroConsoleErrors: errors.length === 0,
        postsLoaded: posts > 0,
        engagementDataDisplays: engagementElements > 0,
        saveFunctionalityAvailable: saveButtons > 0,
        pageHasContent: hasContent
      },
      metrics: {
        totalPosts: posts,
        engagementElements,
        saveButtons,
        contentLength: bodyText.length
      },
      consoleErrors: errors,
      consoleWarnings: warnings,
      screenshots: [
        '1-initial-load.png',
        '2-page-with-data.png',
        '3-before-save.png',
        '4-after-save.png',
        '5-final-state.png'
      ]
    };

    fs.writeFileSync(
      path.join(screenshotDir, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Print report
    console.log('='.repeat(80));
    console.log('📊 PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`✅/❌ Zero Console Errors: ${report.validation.zeroConsoleErrors ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   └─ Errors found: ${errors.length}`);
    console.log(`✅/❌ Posts Loaded Successfully: ${report.validation.postsLoaded ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   └─ Total posts: ${posts}`);
    console.log(`✅/❌ Engagement Data Displays: ${report.validation.engagementDataDisplays ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   └─ Engagement elements: ${engagementElements}`);
    console.log(`✅/❌ Save Functionality Available: ${report.validation.saveFunctionalityAvailable ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   └─ Save buttons: ${saveButtons}`);
    console.log(`✅/❌ Page Has Content: ${report.validation.pageHasContent ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   └─ Content length: ${bodyText.length} characters`);
    console.log('='.repeat(80));

    if (errors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS DETECTED:');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  CONSOLE WARNINGS:');
      warnings.slice(0, 5).forEach((warn, i) => {
        console.log(`${i + 1}. ${warn}`);
      });
      if (warnings.length > 5) {
        console.log(`   ... and ${warnings.length - 5} more warnings`);
      }
    }

    console.log(`\n📁 Screenshots saved to: ${screenshotDir}/`);
    console.log(`📄 Full report saved to: ${screenshotDir}/validation-report.json\n`);

    // Overall status
    const allPassed = report.validation.zeroConsoleErrors &&
                      report.validation.postsLoaded &&
                      report.validation.engagementDataDisplays &&
                      report.validation.pageHasContent;

    if (allPassed) {
      console.log('✅ PRODUCTION VALIDATION: PASSED');
    } else {
      console.log('❌ PRODUCTION VALIDATION: FAILED');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
    await page.screenshot({
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true
    });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run validation
validateProduction()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
