/**
 * Playwright Script: AVI Chat Dark Mode Validation
 * Takes screenshots proving dark mode text visibility issues exist and are fixed
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateAviChatDarkMode() {
  console.log('🔍 Starting AVI Chat Dark Mode Validation...');

  const screenshotsDir = path.join(__dirname, 'screenshots', 'validation');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  // Track console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(error.message);
  });

  try {
    console.log('📍 Navigating to /avi route...');
    await page.goto('http://localhost:5173/avi', { waitUntil: 'networkidle' });

    // Enable dark mode explicitly
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(1000);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, '01-avi-page-dark-mode.png'),
      fullPage: true
    });
    console.log('✅ Screenshot: AVI page in dark mode');

    // Look for textarea (chat input)
    const textarea = await page.locator('textarea').first();
    const textareaExists = await textarea.count() > 0;

    if (textareaExists) {
      console.log('✓ Found chat textarea');

      // Type a test message with code
      const testMessage = `Hello Avi! Can you help me with this code?

\`\`\`javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

What do you think about this implementation?`;

      await textarea.fill(testMessage);
      await page.waitForTimeout(500);

      // Take screenshot showing the input
      await page.screenshot({
        path: path.join(screenshotsDir, '02-message-input.png'),
        fullPage: true
      });
      console.log('✅ Screenshot: Message input with code');

      // Try to find and click send button
      const sendButton = page.locator('button[type="submit"], button:has-text("Send"), svg').first();
      const sendButtonExists = await sendButton.count() > 0;

      if (sendButtonExists) {
        await sendButton.click();
        console.log('✓ Clicked send button');

        // Wait for response
        await page.waitForTimeout(3000);

        // Take screenshot of chat with messages
        await page.screenshot({
          path: path.join(screenshotsDir, '03-chat-with-messages.png'),
          fullPage: true
        });
        console.log('✅ Screenshot: Chat with messages in dark mode');

        // Scroll to see all messages
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await page.waitForTimeout(500);

        await page.screenshot({
          path: path.join(screenshotsDir, '04-chat-scrolled.png'),
          fullPage: true
        });
        console.log('✅ Screenshot: Chat scrolled to bottom');
      }
    }

    // Check for specific text visibility issues
    console.log('\n🔍 Checking for text visibility issues...');

    const elements = await page.evaluate(() => {
      const results: any[] = [];

      // Check all pre/code elements
      document.querySelectorAll('pre, code').forEach((el) => {
        const styles = window.getComputedStyle(el);
        results.push({
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          classes: el.className
        });
      });

      // Check message divs
      document.querySelectorAll('[class*="message"], [class*="chat"]').forEach((el) => {
        const styles = window.getComputedStyle(el);
        results.push({
          tag: el.tagName,
          text: el.textContent?.substring(0, 50),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          classes: el.className
        });
      });

      return results;
    });

    console.log('\n📊 Text Elements Found:');
    elements.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.tag} - Color: ${el.color}, BG: ${el.backgroundColor}`);
      console.log(`     Classes: ${el.classes}`);
      console.log(`     Text: ${el.text}...`);
    });

    // Save analysis
    fs.writeFileSync(
      path.join(screenshotsDir, 'text-analysis.json'),
      JSON.stringify(elements, null, 2)
    );
    console.log('\n✅ Text analysis saved');

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      fs.writeFileSync(
        path.join(screenshotsDir, 'console-errors.txt'),
        consoleErrors.join('\n\n')
      );
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Validation complete! Screenshots saved to:', screenshotsDir);
    console.log('\nScreenshots:');
    console.log('  1. 01-avi-page-dark-mode.png - Initial AVI page');
    console.log('  2. 02-message-input.png - Message with code input');
    console.log('  3. 03-chat-with-messages.png - Chat with response');
    console.log('  4. 04-chat-scrolled.png - Scrolled view');
    console.log('  5. text-analysis.json - Detailed color analysis');

    return {
      screenshotsDir,
      consoleErrors: consoleErrors.length,
      elementsAnalyzed: elements.length
    };

  } catch (error) {
    console.error('❌ Error during validation:', error);

    await page.screenshot({
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true
    });

    throw error;
  } finally {
    await browser.close();
  }
}

// Run validation
validateAviChatDarkMode()
  .then((result) => {
    console.log('\n✅ Validation Results:');
    console.log(`   Screenshots saved: ${result.screenshotsDir}`);
    console.log(`   Console errors: ${result.consoleErrors}`);
    console.log(`   Elements analyzed: ${result.elementsAnalyzed}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  });
