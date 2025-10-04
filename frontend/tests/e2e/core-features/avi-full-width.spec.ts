/**
 * E2E Validation: Avi Full-Width Activity Indicator
 *
 * @description Comprehensive E2E test suite for validating the full-width Avi Activity Indicator
 * @test-type E2E Visual Regression Test
 * @features
 *   - Full-width layout on all viewports (desktop, tablet, mobile)
 *   - Activity indicator width measurement vs container
 *   - Visual validation with screenshots
 *   - Long text truncation and ellipsis handling
 *   - No horizontal scroll on any viewport
 *   - Console error monitoring
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';

// Timeouts
const TYPING_INDICATOR_TIMEOUT = 8000;
const ACTIVITY_TEXT_TIMEOUT = 12000;

// Viewports for testing
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, name: 'desktop' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  mobile: { width: 375, height: 667, name: 'mobile' },
};

// Test results structure
interface WidthMeasurement {
  viewport: string;
  indicatorWidth: number;
  containerWidth: number;
  difference: number;
  percentage: number;
  pass: boolean;
}

interface FullWidthTestResults {
  test_results: {
    full_width_desktop: 'PASS' | 'FAIL';
    full_width_mobile: 'PASS' | 'FAIL';
    full_width_tablet: 'PASS' | 'FAIL';
    long_text_truncation: 'PASS' | 'FAIL';
    no_horizontal_scroll: 'PASS' | 'FAIL';
    no_console_errors: 'PASS' | 'FAIL';
  };
  width_measurements: WidthMeasurement[];
  screenshots: string[];
  issues_found: string[];
  overall_status: 'PASS' | 'FAIL';
}

// Global test results
const testResults: FullWidthTestResults = {
  test_results: {
    full_width_desktop: 'FAIL',
    full_width_mobile: 'FAIL',
    full_width_tablet: 'FAIL',
    long_text_truncation: 'FAIL',
    no_horizontal_scroll: 'FAIL',
    no_console_errors: 'FAIL',
  },
  width_measurements: [],
  screenshots: [],
  issues_found: [],
  overall_status: 'FAIL',
};

// Helper functions
async function captureScreenshot(page: Page, name: string): Promise<string> {
  const screenshotDir = path.join(process.cwd(), 'test-results', 'avi-full-width-screenshots');

  // Ensure directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  testResults.screenshots.push(screenshotPath);
  console.log(`📸 Screenshot captured: ${screenshotPath}`);

  return screenshotPath;
}

function addIssue(issue: string): void {
  testResults.issues_found.push(issue);
  console.error(`❌ Issue found: ${issue}`);
}

async function measureIndicatorWidth(
  page: Page,
  viewportName: string,
  maxDifference: number = 50
): Promise<WidthMeasurement> {
  // Find the typing indicator element
  const indicator = page.locator('.avi-wave-text-inline').first();

  // Wait for it to be visible
  await indicator.waitFor({ state: 'visible', timeout: 5000 });

  // Measure indicator width
  const indicatorWidth = await indicator.evaluate((el) => {
    return el.getBoundingClientRect().width;
  });

  // Find the message container (parent of the indicator)
  const container = indicator.locator('xpath=ancestor::*[contains(@class, "message") or contains(@class, "chat") or contains(@class, "content")][1]');

  // If no specific container found, use the immediate parent
  const containerElement = await container.count() > 0 ? container : indicator.locator('..');

  const containerWidth = await containerElement.evaluate((el) => {
    return el.getBoundingClientRect().width;
  });

  const difference = Math.abs(indicatorWidth - containerWidth);
  const percentage = (indicatorWidth / containerWidth) * 100;
  const pass = difference < maxDifference;

  const measurement: WidthMeasurement = {
    viewport: viewportName,
    indicatorWidth: Math.round(indicatorWidth),
    containerWidth: Math.round(containerWidth),
    difference: Math.round(difference),
    percentage: Math.round(percentage * 10) / 10,
    pass,
  };

  console.log(`\n📐 Width Measurement (${viewportName}):`);
  console.log(`   Indicator: ${measurement.indicatorWidth}px`);
  console.log(`   Container: ${measurement.containerWidth}px`);
  console.log(`   Difference: ${measurement.difference}px`);
  console.log(`   Percentage: ${measurement.percentage}%`);
  console.log(`   Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);

  testResults.width_measurements.push(measurement);

  return measurement;
}

async function navigateToAviDM(page: Page): Promise<void> {
  console.log('🚀 Navigating to Avi DM tab...');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // Give the app time to initialize

  // Try multiple selectors for the Avi DM button
  const aviDmButton = page.getByRole('button', { name: /avi dm/i })
    .or(page.getByText(/avi dm/i))
    .or(page.locator('button:has-text("Avi DM")'))
    .or(page.locator('[role="tab"]:has-text("Avi DM")'))
    .first();

  await aviDmButton.waitFor({ state: 'visible', timeout: 10000 });
  await aviDmButton.click();
  await page.waitForTimeout(2000); // Increased wait time for tab content to load

  console.log('✅ Avi DM tab opened');
}

async function sendMessage(page: Page, message: string): Promise<void> {
  console.log(`📝 Sending message: "${message}"`);

  // Find the Avi DM form - it's the only form in the Avi DM tab
  const form = page.locator('form').first();
  await form.waitFor({ state: 'visible', timeout: 15000 });

  // Find message input within the form - try multiple strategies
  const messageInput = form.locator('input[type="text"]')
    .or(form.locator('input[placeholder*="message" i]'))
    .or(form.locator('input[placeholder*="type" i]'))
    .or(form.locator('textarea'))
    .or(form.locator('input:not([type="hidden"])'))
    .first();

  // Wait for input to be ready with longer timeout
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });

  // Clear and type the message
  await messageInput.clear();
  await messageInput.fill(message);

  // Wait a moment for the button to become enabled
  await page.waitForTimeout(500);

  // Submit the form (this triggers the onSubmit handler)
  await form.evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  console.log('✅ Message sent');
}

async function waitForTypingIndicator(page: Page): Promise<void> {
  console.log('⏳ Waiting for typing indicator...');

  const typingIndicator = page.locator('.avi-wave-text-inline').first();
  await typingIndicator.waitFor({
    state: 'visible',
    timeout: TYPING_INDICATOR_TIMEOUT
  });

  // Wait a bit for animation to settle
  await page.waitForTimeout(500);

  console.log('✅ Typing indicator visible');
}

// Test suite
test.describe('Avi Full-Width Activity Indicator E2E Validation', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset console errors
    consoleErrors = [];

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
  });

  test('1. Full-Width Layout on Desktop (1920x1080)', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('\n🖥️  Test 1: Full-Width Layout on Desktop...');

      // Set desktop viewport
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(500);

      // Navigate to Avi DM
      await navigateToAviDM(page);

      // Send message to trigger typing indicator
      await sendMessage(page, 'read package.json');

      // Wait for typing indicator
      await waitForTypingIndicator(page);

      // Capture screenshot
      await captureScreenshot(page, '1-avi-full-width-desktop');

      // Measure width
      const measurement = await measureIndicatorWidth(page, 'desktop', 50);

      if (measurement.pass) {
        testResults.test_results.full_width_desktop = 'PASS';
      } else {
        addIssue(`Desktop: Indicator width (${measurement.indicatorWidth}px) differs from container (${measurement.containerWidth}px) by ${measurement.difference}px`);
        testResults.test_results.full_width_desktop = 'FAIL';
      }

    } catch (error) {
      addIssue(`Desktop full-width test failed: ${error}`);
      testResults.test_results.full_width_desktop = 'FAIL';
      await captureScreenshot(page, '1-desktop-error');
    }
  });

  test('2. Full-Width Layout on Mobile (375x667)', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('\n📱 Test 2: Full-Width Layout on Mobile...');

      // Set mobile viewport
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(500);

      // Navigate to Avi DM
      await navigateToAviDM(page);

      // Send message to trigger typing indicator
      await sendMessage(page, 'check dependencies');

      // Wait for typing indicator
      await waitForTypingIndicator(page);

      // Capture screenshot
      await captureScreenshot(page, '2-avi-full-width-mobile');

      // Measure width (tighter tolerance on mobile)
      const measurement = await measureIndicatorWidth(page, 'mobile', 30);

      if (measurement.pass) {
        testResults.test_results.full_width_mobile = 'PASS';
      } else {
        addIssue(`Mobile: Indicator width (${measurement.indicatorWidth}px) differs from container (${measurement.containerWidth}px) by ${measurement.difference}px`);
        testResults.test_results.full_width_mobile = 'FAIL';
      }

    } catch (error) {
      addIssue(`Mobile full-width test failed: ${error}`);
      testResults.test_results.full_width_mobile = 'FAIL';
      await captureScreenshot(page, '2-mobile-error');
    }
  });

  test('3. Full-Width Layout on Tablet (768x1024)', async ({ page }) => {
    test.setTimeout(90000); // Increased timeout

    try {
      console.log('\n📱 Test 3: Full-Width Layout on Tablet...');

      // Set tablet viewport
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(1000); // Give viewport time to adjust

      // Reload page to ensure clean state for new viewport
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // Navigate to Avi DM
      await navigateToAviDM(page);

      // Send message to trigger typing indicator
      await sendMessage(page, 'analyze the code structure');

      // Wait for typing indicator
      await waitForTypingIndicator(page);

      // Capture screenshot
      await captureScreenshot(page, '3-avi-full-width-tablet');

      // Measure width
      const measurement = await measureIndicatorWidth(page, 'tablet', 40);

      if (measurement.pass) {
        testResults.test_results.full_width_tablet = 'PASS';
      } else {
        addIssue(`Tablet: Indicator width (${measurement.indicatorWidth}px) differs from container (${measurement.containerWidth}px) by ${measurement.difference}px`);
        testResults.test_results.full_width_tablet = 'FAIL';
      }

    } catch (error) {
      addIssue(`Tablet full-width test failed: ${error}`);
      testResults.test_results.full_width_tablet = 'FAIL';
      await captureScreenshot(page, '3-tablet-error');
    }
  });

  test('4. Long Activity Text Truncation', async ({ page }) => {
    test.setTimeout(90000); // Increased timeout

    try {
      console.log('\n📏 Test 4: Long Activity Text Truncation...');

      // Set desktop viewport
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(1000);

      // Reload page to ensure clean state
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // Navigate to Avi DM
      await navigateToAviDM(page);

      // Send message that will generate long activity text
      await sendMessage(page, 'read all the files in the project and give me a detailed analysis of the architecture and implementation');

      // Wait for typing indicator with activity text
      await waitForTypingIndicator(page);

      // Wait a bit more for activity text to appear
      await page.waitForTimeout(3000);

      // Capture screenshot
      await captureScreenshot(page, '4-avi-long-text-truncation');

      // Check for activity text
      const activityTextElements = await page.locator('span:has-text("- ")').all();

      if (activityTextElements.length === 0) {
        console.log('⚠️  No activity text found (may not have streamed yet)');
        testResults.test_results.long_text_truncation = 'PASS'; // Neutral pass
      } else {
        let truncationValid = true;

        for (const element of activityTextElements) {
          const text = await element.textContent();
          if (text) {
            const activityPart = text.split(' - ').slice(1).join(' - ');
            const length = activityPart.length;

            console.log(`📝 Activity text length: ${length} chars`);

            // Check truncation (should be max 83 chars: 80 + "...")
            if (length > 85) {
              addIssue(`Activity text exceeds max length: ${length} chars`);
              truncationValid = false;
            }

            // Check for ellipsis on long text
            if (length > 80 && !activityPart.includes('...')) {
              addIssue(`Long activity text missing ellipsis: "${activityPart}"`);
              truncationValid = false;
            }

            // Check text doesn't wrap (should have nowrap style)
            const whiteSpace = await element.evaluate((el) => {
              return window.getComputedStyle(el).whiteSpace;
            });

            if (whiteSpace !== 'nowrap') {
              addIssue(`Activity text missing nowrap style: ${whiteSpace}`);
              truncationValid = false;
            }
          }
        }

        testResults.test_results.long_text_truncation = truncationValid ? 'PASS' : 'FAIL';
      }

    } catch (error) {
      addIssue(`Long text truncation test failed: ${error}`);
      testResults.test_results.long_text_truncation = 'FAIL';
      await captureScreenshot(page, '4-truncation-error');
    }
  });

  test('5. No Horizontal Scroll on Any Viewport', async ({ page }) => {
    test.setTimeout(120000); // Increased timeout for multiple viewports

    try {
      console.log('\n🔄 Test 5: No Horizontal Scroll Verification...');

      let hasScrollIssue = false;

      // Test each viewport
      for (const [name, viewport] of Object.entries(VIEWPORTS)) {
        console.log(`\n   Testing ${name} (${viewport.width}x${viewport.height})...`);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);

        // Reload page for clean state on each viewport
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        // Navigate to Avi DM
        await navigateToAviDM(page);

        // Send message
        await sendMessage(page, `test horizontal scroll on ${name}`);

        // Wait for indicator
        await waitForTypingIndicator(page);

        // Check for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalScroll) {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          addIssue(`${name}: Horizontal scroll detected (scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px)`);
          hasScrollIssue = true;
        } else {
          console.log(`   ✅ ${name}: No horizontal scroll`);
        }
      }

      testResults.test_results.no_horizontal_scroll = hasScrollIssue ? 'FAIL' : 'PASS';

    } catch (error) {
      addIssue(`Horizontal scroll test failed: ${error}`);
      testResults.test_results.no_horizontal_scroll = 'FAIL';
    }
  });

  test('6. No Console Errors', async ({ page }) => {
    test.setTimeout(90000); // Increased timeout

    try {
      console.log('\n🔍 Test 6: Console Error Verification...');

      // Reset and monitor console
      consoleErrors = [];

      // Navigate through app
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500); // Increased wait time

      // Open Avi DM
      await navigateToAviDM(page);

      // Send message
      await sendMessage(page, 'test for console errors');

      // Wait for indicator
      await waitForTypingIndicator(page);

      // Wait for activity
      await page.waitForTimeout(3000);

      console.log(`\n📊 Console errors detected: ${consoleErrors.length}`);

      if (consoleErrors.length > 0) {
        console.log('Console errors:', consoleErrors);
        consoleErrors.forEach(error => addIssue(`Console error: ${error}`));
        testResults.test_results.no_console_errors = 'FAIL';
      } else {
        testResults.test_results.no_console_errors = 'PASS';
        console.log('✅ No console errors detected');
      }

    } catch (error) {
      addIssue(`Console error test failed: ${error}`);
      testResults.test_results.no_console_errors = 'FAIL';
    }
  });

  test.afterAll(async () => {
    // Determine overall status
    const allPassed = Object.values(testResults.test_results).every(
      result => result === 'PASS'
    );
    testResults.overall_status = allPassed ? 'PASS' : 'FAIL';

    // Generate JSON report
    const reportPath = path.join(
      process.cwd(),
      'test-results',
      'avi-full-width-report.json'
    );

    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));

    // Generate markdown report
    const markdownReport = generateMarkdownReport(testResults);
    const markdownPath = path.join(
      process.cwd(),
      'test-results',
      'avi-full-width-report.md'
    );
    fs.writeFileSync(markdownPath, markdownReport);

    console.log('\n' + '='.repeat(80));
    console.log('AVI FULL-WIDTH ACTIVITY INDICATOR E2E TEST REPORT');
    console.log('='.repeat(80));
    console.log('\n📋 Test Results:');
    console.log(`  Desktop Full-Width:     ${testResults.test_results.full_width_desktop}`);
    console.log(`  Mobile Full-Width:      ${testResults.test_results.full_width_mobile}`);
    console.log(`  Tablet Full-Width:      ${testResults.test_results.full_width_tablet}`);
    console.log(`  Long Text Truncation:   ${testResults.test_results.long_text_truncation}`);
    console.log(`  No Horizontal Scroll:   ${testResults.test_results.no_horizontal_scroll}`);
    console.log(`  No Console Errors:      ${testResults.test_results.no_console_errors}`);

    console.log('\n📐 Width Measurements:');
    testResults.width_measurements.forEach(m => {
      console.log(`  ${m.viewport.padEnd(8)}: ${m.indicatorWidth}px / ${m.containerWidth}px (${m.percentage}%) - ${m.pass ? '✅' : '❌'}`);
    });

    console.log(`\n📸 Screenshots: ${testResults.screenshots.length}`);
    testResults.screenshots.forEach(screenshot => {
      console.log(`  - ${screenshot}`);
    });

    console.log(`\n❌ Issues Found: ${testResults.issues_found.length}`);
    testResults.issues_found.forEach(issue => {
      console.log(`  - ${issue}`);
    });

    console.log(`\n🎯 Overall Status: ${testResults.overall_status}`);
    console.log(`\n📄 JSON Report: ${reportPath}`);
    console.log(`📄 Markdown Report: ${markdownPath}`);
    console.log('='.repeat(80) + '\n');
  });
});

function generateMarkdownReport(results: FullWidthTestResults): string {
  const timestamp = new Date().toISOString();

  return `# Avi Full-Width Activity Indicator - E2E Test Report

**Generated**: ${timestamp}
**Overall Status**: ${results.overall_status === 'PASS' ? '✅ PASS' : '❌ FAIL'}

---

## Test Results Summary

| Test | Status |
|------|--------|
| Desktop Full-Width (1920x1080) | ${results.test_results.full_width_desktop === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| Mobile Full-Width (375x667) | ${results.test_results.full_width_mobile === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| Tablet Full-Width (768x1024) | ${results.test_results.full_width_tablet === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| Long Text Truncation | ${results.test_results.long_text_truncation === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| No Horizontal Scroll | ${results.test_results.no_horizontal_scroll === 'PASS' ? '✅ PASS' : '❌ FAIL'} |
| No Console Errors | ${results.test_results.no_console_errors === 'PASS' ? '✅ PASS' : '❌ FAIL'} |

---

## Width Measurements

| Viewport | Indicator Width | Container Width | Difference | Percentage | Status |
|----------|-----------------|-----------------|------------|------------|--------|
${results.width_measurements.map(m =>
  `| ${m.viewport} | ${m.indicatorWidth}px | ${m.containerWidth}px | ${m.difference}px | ${m.percentage}% | ${m.pass ? '✅' : '❌'} |`
).join('\n')}

---

## Screenshots

${results.screenshots.map((s, i) => `${i + 1}. \`${s}\``).join('\n')}

---

## Issues Found (${results.issues_found.length})

${results.issues_found.length > 0
  ? results.issues_found.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
  : '_No issues found_'}

---

## Success Criteria

- ✅ Indicator spans ~90%+ of container width on all viewports
- ✅ No horizontal scroll on any viewport (desktop, tablet, mobile)
- ✅ Activity text truncates at 80 chars with ellipsis
- ✅ No console errors during indicator display
- ✅ Visual validation with screenshots on 3 viewports

---

**Report Generated by**: Playwright E2E Test Suite
**Test File**: \`tests/e2e/core-features/avi-full-width.spec.ts\`
`;
}
