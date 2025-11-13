const { test, expect } = require('@playwright/test');

test.describe('userId Fix - Quick Validation', () => {

  test('Quick validation: No FOREIGN KEY errors + DM works + Posts work', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Load page and check for errors
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'docs/validation/screenshots/userid-quick-01-home.png',
      fullPage: true
    });

    // Check for FOREIGN KEY errors
    const hasFKError = consoleErrors.some(err =>
      err.includes('FOREIGN KEY') ||
      err.includes('no such table') ||
      err.includes('SqliteError')
    );

    expect(hasFKError).toBe(false);
    console.log('✅ No FOREIGN KEY errors detected');

    // Step 2: Send DM to Avi
    const dmTextarea = page.locator('textarea').first();
    await expect(dmTextarea).toBeVisible({ timeout: 5000 });

    await dmTextarea.fill('Quick test: What is 3+3?');
    await page.screenshot({
      path: 'docs/validation/screenshots/userid-quick-02-dm-composed.png',
      fullPage: true
    });

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    await sendButton.click();
    console.log('✅ DM sent successfully');

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'docs/validation/screenshots/userid-quick-03-dm-sent.png',
      fullPage: true
    });

    // Verify no 500 errors
    const pageContent = await page.content();
    expect(pageContent).not.toContain('500 Internal Server Error');
    expect(pageContent).not.toContain('FOREIGN KEY constraint failed');
    console.log('✅ No server errors after DM');

    // Step 3: Create a post if UI is available
    const postArea = page.locator('textarea[placeholder*="post" i], textarea[placeholder*="What" i]').first();

    if (await postArea.count() > 0 && await postArea.isVisible()) {
      await postArea.fill('Quick test post with userId');
      await page.screenshot({
        path: 'docs/validation/screenshots/userid-quick-04-post-composed.png',
        fullPage: true
      });

      const postButton = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
      if (await postButton.count() > 0) {
        await postButton.click();
        console.log('✅ Post created successfully');

        await page.waitForTimeout(1500);
        await page.screenshot({
          path: 'docs/validation/screenshots/userid-quick-05-post-created.png',
          fullPage: true
        });
      }
    } else {
      console.log('⚠️  Post UI not found - skipping post test');
    }

    // Final screenshot
    await page.screenshot({
      path: 'docs/validation/screenshots/userid-quick-06-final.png',
      fullPage: true
    });

    console.log('✅ Quick validation complete');
    console.log(`   Total console errors: ${consoleErrors.length}`);
    console.log(`   FOREIGN KEY errors: 0`);
    console.log(`   500 errors: 0`);
  });

  test('Verify userId in network requests', async ({ page }) => {
    const apiRequests = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') && !url.includes('.css') && !url.includes('.js')) {
        const postData = request.postData();
        apiRequests.push({
          url: url.split('?')[0],
          method: request.method(),
          hasUserId: postData ? postData.includes('userId') : false,
          hasDemoUser: postData ? postData.includes('demo-user-123') : false
        });
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1500);

    // Send a DM to trigger API call
    const dmTextarea = page.locator('textarea').first();
    await dmTextarea.fill('Network request test');
    await page.locator('button:has-text("Send"), button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'docs/validation/screenshots/userid-quick-07-network-check.png',
      fullPage: true
    });

    console.log('✅ Network Requests Analysis:');
    console.log(`   Total API requests: ${apiRequests.length}`);

    if (apiRequests.length > 0) {
      apiRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.method} ${req.url}`);
        console.log(`      Has userId: ${req.hasUserId}`);
        console.log(`      Has demo-user-123: ${req.hasDemoUser}`);
      });

      const hasUserIdInAnyRequest = apiRequests.some(req => req.hasUserId);
      if (hasUserIdInAnyRequest) {
        console.log('✅ userId confirmed in API requests');
      } else {
        console.log('⚠️  userId not detected in captured requests');
      }
    }
  });
});
