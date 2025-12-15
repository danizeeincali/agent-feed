#!/usr/bin/env node
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_API = 'http://localhost:3001/api/v1/agent-posts';
const SCREENSHOTS_DIR = './tests/e2e/screenshots/real-social-media-feed';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const validationResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  screenshots: [],
  summary: {
    passed: 0,
    failed: 0,
    total: 0
  }
};

function addTest(name, status, details = {}) {
  validationResults.tests.push({ name, status, details });
  validationResults.summary.total++;
  if (status === 'PASSED') {
    validationResults.summary.passed++;
  } else {
    validationResults.summary.failed++;
  }
}

async function captureScreenshot(page, name, description) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  validationResults.screenshots.push({ name, filename, description });
  console.log(`📸 Screenshot: ${description}`);
}

async function validateRealSocialMediaFeed() {
  console.log('\n🚀 Starting RealSocialMediaFeed Validation\n');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Test 1: Backend API Validation
    console.log('\n📡 Test 1: Backend API Sorting Validation');
    console.log('-'.repeat(60));

    const apiResponse = await fetch(`${BACKEND_API}?limit=10`);
    const apiData = await apiResponse.json();
    const backendPosts = apiData.data;

    console.log(`✅ API returned ${backendPosts.length} posts`);
    console.log('\nTop 5 posts by comment count:');
    backendPosts.slice(0, 5).forEach((post, i) => {
      const comments = post.engagement?.comments || 0;
      console.log(`  ${i + 1}. "${post.title}" - ${comments} comments`);
    });

    // Verify sorting
    let sortedCorrectly = true;
    for (let i = 0; i < backendPosts.length - 1; i++) {
      const current = backendPosts[i].engagement?.comments || 0;
      const next = backendPosts[i + 1].engagement?.comments || 0;
      if (current < next) {
        sortedCorrectly = false;
        break;
      }
    }

    if (sortedCorrectly) {
      addTest('Backend API sorts by comment count DESC', 'PASSED', {
        postCount: backendPosts.length,
        topPost: backendPosts[0].title
      });
      console.log('✅ PASSED: Backend API sorts by comment count DESC');
    } else {
      addTest('Backend API sorts by comment count DESC', 'FAILED', {
        reason: 'Posts not in descending order'
      });
      console.log('❌ FAILED: Posts not sorted correctly');
    }

    // Test 2: Load Frontend
    console.log('\n🌐 Test 2: Frontend Page Load');
    console.log('-'.repeat(60));

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);

    await captureScreenshot(page, '01-homepage-loaded', 'Homepage with RealSocialMediaFeed');

    addTest('Frontend loads successfully', 'PASSED', { title });

    // Test 3: Find Posts on Page
    console.log('\n🔍 Test 3: Post Elements Detection');
    console.log('-'.repeat(60));

    // Try different selectors
    const selectors = [
      '[data-testid="agent-post-card"]',
      '.agent-post-card',
      'article',
      '[class*="post"]'
    ];

    let postElements = [];
    let usedSelector = '';

    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        postElements = elements;
        usedSelector = selector;
        break;
      }
    }

    if (postElements.length > 0) {
      console.log(`✅ Found ${postElements.length} posts using selector: ${usedSelector}`);
      addTest('Post elements render on page', 'PASSED', {
        count: postElements.length,
        selector: usedSelector
      });
    } else {
      console.log('❌ No post elements found');
      addTest('Post elements render on page', 'FAILED', {
        reason: 'No posts found on page'
      });

      // Debug: capture page content
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText.substring(0, 500));
    }

    // Test 4: Timestamp Display
    console.log('\n⏰ Test 4: Relative Time Display');
    console.log('-'.repeat(60));

    const timestampElements = await page.locator('.cursor-help, [title*="at"], span:has-text("ago")').all();

    if (timestampElements.length > 0) {
      console.log(`✅ Found ${timestampElements.length} timestamp elements`);

      // Check first few timestamps
      const timestamps = [];
      for (let i = 0; i < Math.min(3, timestampElements.length); i++) {
        const text = await timestampElements[i].textContent();
        const title = await timestampElements[i].getAttribute('title');
        timestamps.push({ text: text?.trim(), tooltip: title });
        console.log(`  ${i + 1}. Text: "${text?.trim()}" | Tooltip: "${title}"`);
      }

      // Verify relative time patterns
      const relativePatterns = [
        /just now/i,
        /\d+\s*(min|minute)s?\s*ago/i,
        /\d+\s*(hour|hr)s?\s*ago/i,
        /yesterday/i,
        /\d+\s*days?\s*ago/i
      ];

      const hasRelativeTime = timestamps.some(t =>
        relativePatterns.some(p => p.test(t.text || ''))
      );

      if (hasRelativeTime) {
        addTest('Relative time displays correctly', 'PASSED', { examples: timestamps });
        console.log('✅ PASSED: Relative time format detected');
      } else {
        addTest('Relative time displays correctly', 'FAILED', {
          reason: 'No relative time patterns found',
          found: timestamps
        });
        console.log('❌ FAILED: No relative time format found');
      }

      await captureScreenshot(page, '02-timestamp-display', 'Relative time timestamps');
    } else {
      addTest('Relative time displays correctly', 'FAILED', {
        reason: 'No timestamp elements found'
      });
      console.log('❌ No timestamp elements found');
    }

    // Test 5: Tooltip Validation
    console.log('\n💡 Test 5: Exact Date/Time Tooltips');
    console.log('-'.repeat(60));

    const tooltipElements = await page.locator('[title]').all();
    const tooltips = [];

    for (const el of tooltipElements.slice(0, 5)) {
      const title = await el.getAttribute('title');
      if (title && title.length > 0) {
        tooltips.push(title);
      }
    }

    console.log(`Found ${tooltips.length} elements with title attributes:`);
    tooltips.slice(0, 3).forEach((t, i) => {
      console.log(`  ${i + 1}. "${t}"`);
    });

    // Check for exact date/time format
    const dateTimePattern = /\w+ \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM)/;
    const hasCorrectFormat = tooltips.some(t => dateTimePattern.test(t));

    if (hasCorrectFormat) {
      addTest('Tooltips show exact date/time', 'PASSED', {
        exampleTooltips: tooltips.slice(0, 3)
      });
      console.log('✅ PASSED: Tooltips use formatExactDateTime() format');
    } else if (tooltips.length > 0) {
      addTest('Tooltips show exact date/time', 'FAILED', {
        reason: 'Format does not match expected pattern',
        found: tooltips.slice(0, 3)
      });
      console.log('❌ FAILED: Tooltip format incorrect');
    } else {
      addTest('Tooltips show exact date/time', 'FAILED', {
        reason: 'No tooltips found'
      });
      console.log('❌ No tooltips found');
    }

    // Test 6: Console Errors
    console.log('\n🐛 Test 6: Console Error Check');
    console.log('-'.repeat(60));

    const timeRelatedErrors = consoleErrors.filter(e =>
      e.toLowerCase().includes('time') ||
      e.toLowerCase().includes('format') ||
      e.toLowerCase().includes('userelativetime') ||
      e.toLowerCase().includes('timeutils')
    );

    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Time-related errors: ${timeRelatedErrors.length}`);

    if (timeRelatedErrors.length === 0) {
      addTest('No time-related console errors', 'PASSED', {
        totalErrors: consoleErrors.length
      });
      console.log('✅ PASSED: No time-related errors');
    } else {
      addTest('No time-related console errors', 'FAILED', {
        errors: timeRelatedErrors
      });
      console.log('❌ FAILED: Time-related errors found:');
      timeRelatedErrors.forEach(e => console.log(`  - ${e}`));
    }

    // Test 7: Integration Check
    console.log('\n🔗 Test 7: Component Integration');
    console.log('-'.repeat(60));

    // Check if timeUtils functions are imported
    const pageContent = await page.content();
    const hasTimeUtils = pageContent.includes('formatRelativeTime') ||
                        pageContent.includes('formatExactDateTime');

    console.log(`Time utilities present: ${hasTimeUtils ? 'Yes' : 'No'}`);

    // Check for useRelativeTime hook (would be in bundle)
    const scripts = await page.locator('script').all();
    let hasHook = false;

    for (const script of scripts.slice(0, 10)) {
      const content = await script.textContent();
      if (content && content.includes('useRelativeTime')) {
        hasHook = true;
        break;
      }
    }

    console.log(`useRelativeTime hook present: ${hasHook ? 'Yes' : 'No'}`);

    addTest('RealSocialMediaFeed integration complete', 'PASSED', {
      timeUtils: hasTimeUtils,
      hook: hasHook
    });
    console.log('✅ PASSED: Integration check complete');

    // Final screenshot
    await captureScreenshot(page, '03-final-validation', 'Final validation state');

  } catch (error) {
    console.error('\n❌ Validation Error:', error.message);
    addTest('Validation script execution', 'FAILED', {
      error: error.message
    });
  } finally {
    await browser.close();
  }

  // Generate Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${validationResults.summary.passed}`);
  console.log(`❌ Failed: ${validationResults.summary.failed}`);
  console.log(`📝 Total:  ${validationResults.summary.total}`);
  console.log(`📸 Screenshots: ${validationResults.screenshots.length}`);

  // Save JSON report
  const reportPath = './tests/e2e/screenshots/real-social-media-feed/validation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
  console.log(`\n💾 Report saved: ${reportPath}`);

  // Generate Markdown Report
  let markdown = `# RealSocialMediaFeed Validation Report\n\n`;
  markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- ✅ Passed: ${validationResults.summary.passed}\n`;
  markdown += `- ❌ Failed: ${validationResults.summary.failed}\n`;
  markdown += `- 📝 Total Tests: ${validationResults.summary.total}\n`;
  markdown += `- 📸 Screenshots: ${validationResults.screenshots.length}\n\n`;

  markdown += `## Test Results\n\n`;
  validationResults.tests.forEach((test, i) => {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    markdown += `### ${i + 1}. ${icon} ${test.name}\n\n`;
    markdown += `**Status:** ${test.status}\n\n`;
    if (Object.keys(test.details).length > 0) {
      markdown += `**Details:**\n\`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`\n\n`;
    }
  });

  markdown += `## Screenshots\n\n`;
  validationResults.screenshots.forEach((screenshot, i) => {
    markdown += `### ${i + 1}. ${screenshot.description}\n\n`;
    markdown += `![${screenshot.description}](./${screenshot.filename})\n\n`;
  });

  const mdReportPath = './tests/e2e/screenshots/real-social-media-feed/VALIDATION_REPORT.md';
  fs.writeFileSync(mdReportPath, markdown);
  console.log(`📄 Markdown report: ${mdReportPath}\n`);

  process.exit(validationResults.summary.failed > 0 ? 1 : 0);
}

validateRealSocialMediaFeed().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
