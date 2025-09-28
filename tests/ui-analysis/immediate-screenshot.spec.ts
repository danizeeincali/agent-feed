import { test } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, '../screenshots/ui-analysis');

test.describe('Immediate UI State Capture', () => {
  test.beforeAll(async () => {
    const { existsSync, mkdirSync } = await import('fs');
    if (!existsSync(SCREENSHOT_DIR)) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Capture homepage immediate state', async ({ page }) => {
    console.log('🔍 Capturing immediate homepage state...');

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Navigate with minimal waiting
    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    const timestamp = Date.now();

    // Capture state immediately after DOM content loaded
    const immediateScreenshot = join(SCREENSHOT_DIR, `homepage-immediate-${timestamp}.png`);
    await page.screenshot({
      path: immediateScreenshot,
      fullPage: true,
      animations: 'disabled'
    });

    console.log(`📸 Immediate screenshot: ${immediateScreenshot}`);

    // Check what's actually visible
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText || document.body.textContent,
        hasLoadingText: (document.body.innerText || '').includes('Loading'),
        hasNextDiv: !!document.querySelector('#__next'),
        hasReactRoot: !!document.querySelector('[data-reactroot]'),
        bodyClasses: document.body.className,
        htmlClasses: document.documentElement.className,
        headStyleCount: document.querySelectorAll('head style').length,
        linkStylesheetCount: document.querySelectorAll('head link[rel="stylesheet"]').length,
        scriptCount: document.querySelectorAll('script').length
      };
    });

    console.log('\n=== IMMEDIATE PAGE STATE ===');
    console.log('📰 Title:', pageContent.title);
    console.log('📝 Body text preview:', pageContent.bodyText?.slice(0, 100) + '...');
    console.log('⏳ Is showing loading?', pageContent.hasLoadingText);
    console.log('🆔 Has #__next div?', pageContent.hasNextDiv);
    console.log('⚛️  Has React root?', pageContent.hasReactRoot);
    console.log('🎨 Head styles:', pageContent.headStyleCount);
    console.log('📄 Linked stylesheets:', pageContent.linkStylesheetCount);
    console.log('📜 Script tags:', pageContent.scriptCount);

    // Wait 3 seconds and capture again to see if it changes
    await page.waitForTimeout(3000);

    const afterWaitScreenshot = join(SCREENSHOT_DIR, `homepage-after-wait-${timestamp}.png`);
    await page.screenshot({
      path: afterWaitScreenshot,
      fullPage: true,
      animations: 'disabled'
    });

    const afterWaitContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText || document.body.textContent,
        hasLoadingText: (document.body.innerText || '').includes('Loading'),
        hasMoreContent: (document.body.innerText || '').length > 50
      };
    });

    console.log('📸 After 3s screenshot:', afterWaitScreenshot);
    console.log('📝 After wait text preview:', afterWaitContent.bodyText?.slice(0, 100) + '...');
    console.log('⏳ Still loading?', afterWaitContent.hasLoadingText);
    console.log('📄 Has more content?', afterWaitContent.hasMoreContent);

    // Wait longer to see if app eventually loads
    console.log('⏱️  Waiting longer for app to potentially load...');
    await page.waitForTimeout(5000);

    const finalScreenshot = join(SCREENSHOT_DIR, `homepage-final-${timestamp}.png`);
    await page.screenshot({
      path: finalScreenshot,
      fullPage: true,
      animations: 'disabled'
    });

    const finalContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText || document.body.textContent,
        hasLoadingText: (document.body.innerText || '').includes('Loading'),
        hasAgentFeedText: (document.body.innerText || '').toLowerCase().includes('agent'),
        contentLength: (document.body.innerText || '').length
      };
    });

    console.log('📸 Final screenshot (8s total):', finalScreenshot);
    console.log('📝 Final content length:', finalContent.contentLength);
    console.log('⏳ Still showing loading?', finalContent.hasLoadingText);
    console.log('🤖 Has agent-related content?', finalContent.hasAgentFeedText);

    // Check console messages for clues
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Check for any network failures
    const networkFailures: string[] = [];
    page.on('response', (response) => {
      if (!response.ok()) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    // Generate diagnosis report
    const diagnosis = {
      timestamp: new Date().toISOString(),
      url: BASE_URL,
      immediateState: pageContent,
      afterWaitState: afterWaitContent,
      finalState: finalContent,
      screenshots: {
        immediate: immediateScreenshot,
        afterWait: afterWaitScreenshot,
        final: finalScreenshot
      },
      potentialIssues: []
    };

    // Analyze issues
    if (finalContent.hasLoadingText) {
      diagnosis.potentialIssues.push('🚨 CRITICAL: App stuck in loading state after 8 seconds');
    }

    if (finalContent.contentLength < 100) {
      diagnosis.potentialIssues.push('🚨 CRITICAL: Very little content loaded');
    }

    if (pageContent.linkStylesheetCount === 0) {
      diagnosis.potentialIssues.push('⚠️  No external stylesheets detected');
    }

    if (!finalContent.hasAgentFeedText) {
      diagnosis.potentialIssues.push('⚠️  No agent-related content found (might not be agent-feed app)');
    }

    // Save diagnosis
    const reportPath = join(SCREENSHOT_DIR, `diagnosis-${timestamp}.json`);
    const { writeFileSync } = await import('fs');
    writeFileSync(reportPath, JSON.stringify(diagnosis, null, 2));

    console.log('\n=== DIAGNOSIS SUMMARY ===');
    console.log(`📋 Full diagnosis saved: ${reportPath}`);

    if (diagnosis.potentialIssues.length > 0) {
      console.log('\n🚨 POTENTIAL ISSUES IDENTIFIED:');
      diagnosis.potentialIssues.forEach(issue => console.log(`  ${issue}`));
      console.log('\n💡 This explains the "UI styling is all off" issue!');
      console.log('   The React app appears to be stuck in loading state.');
    } else {
      console.log('\n✅ No obvious loading issues detected');
    }
  });

  test('Capture agents page immediate state', async ({ page }) => {
    console.log('🔍 Capturing agents page immediate state...');

    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
      await page.goto(`${BASE_URL}/agents`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      const timestamp = Date.now();
      const screenshot = join(SCREENSHOT_DIR, `agents-immediate-${timestamp}.png`);
      await page.screenshot({
        path: screenshot,
        fullPage: true,
        animations: 'disabled'
      });

      const content = await page.evaluate(() => {
        return {
          bodyText: (document.body.innerText || '').slice(0, 200),
          hasLoadingText: (document.body.innerText || '').includes('Loading')
        };
      });

      console.log('📸 Agents page screenshot:', screenshot);
      console.log('📝 Agents page content:', content.bodyText);
      console.log('⏳ Agents page loading?', content.hasLoadingText);

    } catch (error) {
      console.log('❌ Agents page failed to load:', error.message);
    }
  });
});