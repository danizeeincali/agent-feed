import { test, expect } from '@playwright/test';

test.describe('Final White Screen Fix Verification', () => {
  test('Verify React Application is Now Rendering', async ({ page }) => {
    console.log('\n=== FINAL VERIFICATION TEST ===');
    
    // Capture console messages
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log(`❌ Console Error: ${text}`);
      } else {
        consoleMessages.push(`[${msg.type()}] ${text}`);
      }
    });

    // Navigate and wait for potential React rendering
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Give React time to render

    // Check if React has mounted and rendered content
    const rootElement = page.locator('#root');
    const rootContent = await rootElement.innerHTML();
    const rootText = await rootElement.textContent();
    const hasReactContent = rootContent.length > 0;
    const hasVisibleText = rootText && rootText.trim().length > 0;

    console.log(`\n📊 VERIFICATION RESULTS:`);
    console.log(`Root div content length: ${rootContent.length} characters`);
    console.log(`Visible text length: ${rootText?.trim().length || 0} characters`);
    console.log(`React content present: ${hasReactContent}`);
    console.log(`Visible text present: ${hasVisibleText}`);
    console.log(`Console errors: ${consoleErrors.length}`);

    if (rootContent.length > 50) {
      console.log(`✅ SUCCESS: React is rendering content!`);
      console.log(`Content preview: ${rootContent.substring(0, 200)}...`);
    } else {
      console.log(`❌ ISSUE: Root div still empty`);
    }

    if (hasVisibleText) {
      console.log(`✅ SUCCESS: User can see content!`);
      console.log(`Visible text preview: "${rootText?.substring(0, 100)}..."`);
    } else {
      console.log(`❌ ISSUE: No visible text for user`);
    }

    if (consoleErrors.length === 0) {
      console.log(`✅ SUCCESS: No JavaScript errors!`);
    } else {
      console.log(`⚠️  JavaScript errors still present:`);
      consoleErrors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-verification.png', fullPage: true });

    // These are verification checks
    expect.soft(hasReactContent).toBe(true);
    expect.soft(consoleErrors.length).toBe(0);
  });

  test('Check Both Routes for Functionality', async ({ page }) => {
    console.log('\n=== ROUTE FUNCTIONALITY TEST ===');
    
    const routes = ['/', '/simple-launcher'];
    const results: Record<string, any> = {};

    for (const route of routes) {
      console.log(`\nTesting route: ${route}`);
      
      await page.goto(route);
      await page.waitForTimeout(2000);

      const title = await page.title();
      const rootContent = await page.locator('#root').innerHTML();
      const bodyText = await page.locator('body').textContent();
      
      results[route] = {
        title,
        hasContent: rootContent.length > 0,
        hasVisibleText: bodyText && bodyText.trim().length > 50,
        contentLength: rootContent.length
      };

      console.log(`  Title: ${title}`);
      console.log(`  Has content: ${results[route].hasContent}`);
      console.log(`  Has visible text: ${results[route].hasVisibleText}`);
      console.log(`  Content length: ${results[route].contentLength}`);
    }

    // Compare results
    const rootResult = results['/'];
    const launcherResult = results['/simple-launcher'];
    
    console.log(`\n📊 COMPARISON:`);
    console.log(`Root route working: ${rootResult.hasContent && rootResult.hasVisibleText}`);
    console.log(`Launcher route working: ${launcherResult.hasContent && launcherResult.hasVisibleText}`);

    // Expectations
    expect.soft(rootResult.hasContent).toBe(true);
    expect.soft(launcherResult.hasContent).toBe(true);
  });
});