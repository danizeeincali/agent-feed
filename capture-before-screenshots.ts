import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to capture "BEFORE" screenshots with the counter intact
 * This runs against the reverted version of CommentSystem.tsx
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SCREENSHOTS_DIR = '/workspaces/agent-feed/screenshots';

async function captureBeforeScreenshots() {
  console.log('🎬 Starting BEFORE screenshot capture...');
  console.log(`Frontend URL: ${FRONTEND_URL}`);

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for hot reload

    console.log('📸 Capturing feed view...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'BEFORE-1-feed-view.png'),
      fullPage: true
    });

    // Try to find and click a comment button
    console.log('🔍 Looking for comment button...');
    const commentButton = page.locator('[data-testid="comment-button"], [aria-label*="comment"], button:has-text("Comment")').first();

    let commentSystemOpened = false;

    if (await commentButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found comment button, clicking...');
      await commentButton.click();
      await page.waitForTimeout(1000);
      commentSystemOpened = true;
    } else {
      console.log('⚠️  Comment button not found, trying post card...');
      const postCard = page.locator('[data-testid="post-card"]').first();
      if (await postCard.isVisible({ timeout: 5000 })) {
        await postCard.click();
        await page.waitForTimeout(1000);
        commentSystemOpened = true;
      }
    }

    if (commentSystemOpened) {
      console.log('📸 Capturing comment system...');

      // Wait for comment system header
      try {
        await page.waitForSelector('.comment-system-header, h3:has-text("Comments")', { timeout: 5000 });

        // Capture full page with comments
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'BEFORE-2-comments-opened.png'),
          fullPage: false
        });

        // Capture header closeup
        const header = page.locator('.comment-system-header h3, h3:has-text("Comments")').first();
        if (await header.isVisible({ timeout: 3000 })) {
          await header.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'BEFORE-header-closeup.png')
          });

          const headerText = await header.textContent();
          console.log(`📝 Header text captured: "${headerText?.trim()}"`);
        }

        // Capture header with context (more of the page)
        const commentSystemHeader = page.locator('.comment-system-header').first();
        if (await commentSystemHeader.isVisible({ timeout: 3000 })) {
          await commentSystemHeader.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'BEFORE-header-with-context.png')
          });
        }

        console.log('✅ BEFORE screenshots captured successfully!');
      } catch (error) {
        console.error('❌ Failed to capture comment system:', error);
      }
    } else {
      console.log('⚠️  Could not open comment system');
    }

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureBeforeScreenshots()
  .then(() => {
    console.log('✅ BEFORE screenshot capture complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ BEFORE screenshot capture failed:', error);
    process.exit(1);
  });
