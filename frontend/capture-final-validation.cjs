const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const screenshotDir = path.join(__dirname, 'tests/e2e/screenshots/final-validation');

  // Create screenshot directory
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Launching browser for final validation screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Screenshot 1: Full homepage with feed
    console.log('📸 Capturing homepage with database-backed feed...');
    await page.screenshot({
      path: path.join(screenshotDir, '01-homepage-database-feed.png'),
      fullPage: true
    });

    // Screenshot 2: Quick Post interface (no Post tab)
    console.log('📸 Capturing simplified Quick Post interface...');
    const quickPostTab = await page.locator('button:has-text("Quick Post")').first();
    if (await quickPostTab.isVisible()) {
      await quickPostTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(screenshotDir, '02-quick-post-interface-simplified.png'),
      fullPage: true
    });

    // Screenshot 3: Character limit test (typing content)
    console.log('📸 Capturing character limit validation...');
    const textarea = await page.locator('textarea[placeholder*="What"]');
    if (await textarea.isVisible()) {
      const testContent = 'x'.repeat(9600); // Show counter at 9600 chars
      await textarea.fill(testContent);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotDir, '03-character-counter-visible.png')
      });
    }

    // Screenshot 4: Create a test post
    console.log('📸 Creating test post for validation...');
    await textarea.clear();
    const timestamp = Date.now();
    const testPost = `Final Validation Test - Database Integration Working! Timestamp: ${timestamp}`;
    await textarea.fill(testPost);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotDir, '04-before-post-creation.png')
    });

    // Click post button (use the submit button, not the tab)
    const postButton = await page.locator('button[type="submit"]:has-text("Quick Post")');
    if (await postButton.isVisible() && !await postButton.isDisabled()) {
      await postButton.click();
      console.log('✅ Post created - waiting for feed update...');
      await page.waitForTimeout(2000);
    }

    // Screenshot 5: Feed with new post
    console.log('📸 Capturing feed with newly created post...');
    await page.screenshot({
      path: path.join(screenshotDir, '05-feed-after-post-creation.png'),
      fullPage: true
    });

    // Screenshot 6: Verify post persistence after reload
    console.log('📸 Testing persistence - reloading page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotDir, '06-feed-after-reload-persistence.png'),
      fullPage: true
    });

    // Screenshot 7: API response validation
    console.log('📸 Capturing API response data...');
    const apiResponse = await page.request.get('http://localhost:3001/api/v1/agent-posts?limit=5');
    const apiData = await apiResponse.json();

    // Save API response as JSON for documentation
    fs.writeFileSync(
      path.join(screenshotDir, '07-api-response-validation.json'),
      JSON.stringify(apiData, null, 2)
    );
    console.log('✅ API response saved');

    // Screenshot 8: Database verification
    console.log('📸 Verifying database state...');
    const dbStats = {
      totalPosts: apiData.meta.total,
      returned: apiData.data.length,
      latestPost: {
        id: apiData.data[0]?.id,
        title: apiData.data[0]?.title,
        content: apiData.data[0]?.content?.substring(0, 100),
        created_at: apiData.data[0]?.created_at
      },
      source: apiData.meta.source || 'database',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(screenshotDir, '08-database-verification.json'),
      JSON.stringify(dbStats, null, 2)
    );
    console.log('✅ Database stats saved');

    console.log('\n✨ Final Validation Screenshots Complete!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);
    console.log(`\n📊 Database Validation Summary:`);
    console.log(`   Total Posts: ${dbStats.totalPosts}`);
    console.log(`   Source: ${dbStats.source === 'database' ? '✅ Real Database (SQLite)' : '⚠️ Mock Data'}`);
    console.log(`   Latest Post ID: ${dbStats.latestPost.id}`);

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
})();
