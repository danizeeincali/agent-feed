import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'tests/e2e/screenshots/backend-sorting-relative-time';

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the feed
    console.log('Navigating to feed...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 1. Full feed showing backend ordering
    console.log('Capturing: Full feed with backend ordering...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-full-feed-backend-ordering.png'),
      fullPage: true
    });

    // 2. Close-up of top posts with comment counts
    console.log('Capturing: Top posts with comment counts...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-top-posts-comment-counts.png'),
      fullPage: false
    });

    // 3. Relative time display examples
    console.log('Capturing: Relative time displays...');
    const timeElements = await page.locator('time, [data-testid="post-timestamp"]').all();
    if (timeElements.length > 0) {
      console.log(`Found ${timeElements.length} time elements`);

      // Get text of first few time elements
      for (let i = 0; i < Math.min(5, timeElements.length); i++) {
        const text = await timeElements[i].textContent();
        console.log(`  Time ${i + 1}: ${text}`);
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-relative-time-examples.png'),
      fullPage: true
    });

    // 4. Hover over timestamp for tooltip
    console.log('Capturing: Tooltip on hover...');
    const firstTimeElement = page.locator('time, [data-testid="post-timestamp"]').first();
    if (await firstTimeElement.count() > 0) {
      await firstTimeElement.scrollIntoViewIfNeeded();
      await firstTimeElement.hover();
      await page.waitForTimeout(500);

      const tooltip = await firstTimeElement.getAttribute('title') ||
                     await firstTimeElement.getAttribute('aria-label');
      console.log(`  Tooltip: ${tooltip}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-tooltip-exact-datetime.png'),
        fullPage: false
      });
    }

    // 5. Scroll to show posts with 0 comments at bottom
    console.log('Capturing: Posts with 0 comments at bottom...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-zero-comments-at-bottom.png'),
      fullPage: true
    });

    // 6. Create a new post to test positioning
    console.log('Capturing: New post creation...');
    const quickPostButton = page.locator('button:has-text("Quick Post"), button:has-text("Create Post")').first();

    if (await quickPostButton.count() > 0) {
      await quickPostButton.click();
      await page.waitForTimeout(500);

      const timestamp = Date.now();
      const testContent = `Backend Sorting Test Post ${timestamp}`;

      const contentInput = page.locator('textarea, [contenteditable="true"]').first();
      await contentInput.fill(testContent);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-creating-new-post.png'),
        fullPage: false
      });

      // Submit the post
      const postButton = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
      if (await postButton.count() > 0) {
        await postButton.click();
        await page.waitForTimeout(2000);

        // Verify post appears and capture
        console.log('Capturing: New post positioned correctly...');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '07-new-post-positioned.png'),
          fullPage: true
        });

        // Find the new post and check its time display
        const newPost = page.locator(`text="${testContent}"`).first();
        if (await newPost.count() > 0) {
          await newPost.scrollIntoViewIfNeeded();
          const timeNearPost = page.locator('time, [data-testid="post-timestamp"]').last();
          const timeText = await timeNearPost.textContent();
          console.log(`  New post time display: ${timeText}`);

          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '08-new-post-just-now.png'),
            fullPage: false,
            clip: await newPost.boundingBox() || undefined
          });
        }
      }
    } else {
      console.log('  Quick Post button not found, skipping new post test');
    }

    // 7. Verify no frontend re-sorting after interaction
    console.log('Capturing: Feed after interactions...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-feed-ordering-maintained.png'),
      fullPage: true
    });

    // 8. Check for console errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000);

    console.log('\nConsole Errors:', consoleMessages.length === 0 ? 'None detected' : consoleMessages);

    console.log('\n✓ Screenshots captured successfully!');
    console.log(`  Location: ${SCREENSHOT_DIR}`);
    console.log(`  Total screenshots: ${fs.readdirSync(SCREENSHOT_DIR).length}`);

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
