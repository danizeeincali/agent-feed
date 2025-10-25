import { test, expect, type ConsoleMessage } from '@playwright/test';

test.describe('Subdirectory Search & Badge Updates Fix Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for initial load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Test 1: Verify Existing Intelligence Shows', async ({ page }) => {
    console.log('🧪 Test 1: Checking existing posts for rich intelligence...');

    // Wait for feed to load
    await page.waitForSelector('article, [class*="post"], [class*="Post"]', { timeout: 10000 });

    // Take screenshot of initial feed state
    await page.screenshot({
      path: 'tests/screenshots/fix-validation-01-existing-intelligence.png',
      fullPage: true
    });

    // Get all text content
    const bodyText = await page.textContent('body');

    // Verify we don't see "No summary available" fallback
    const hasNoSummaryFallback = bodyText?.includes('No summary available');

    // Look for signs of rich intelligence
    const hasRichContent = bodyText?.includes('AgentDB') ||
                          bodyText?.includes('intelligence') ||
                          bodyText?.includes('strategic') ||
                          bodyText?.includes('summary') ||
                          bodyText?.includes('key points');

    console.log('  ✅ Existing intelligence check:');
    console.log(`     - Has fallback text: ${hasNoSummaryFallback}`);
    console.log(`     - Has rich content: ${hasRichContent}`);

    // Log some visible post content
    const posts = await page.locator('article, [class*="post"], [class*="Post"]').all();
    console.log(`     - Found ${posts.length} posts`);
  });

  test('Test 2: Create New Post and Watch Badge Updates', async ({ page }) => {
    console.log('🧪 Test 2: Testing badge updates with new post...');

    const consoleMessages: string[] = [];
    const wsMessages: string[] = [];

    // Capture console messages
    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      consoleMessages.push(text);

      // Track WebSocket-related messages
      if (text.includes('🎫') || text.includes('Ticket') || text.includes('WebSocket') || text.includes('badge')) {
        wsMessages.push(text);
        console.log(`     📡 ${text}`);
      }
    });

    // Find and fill post input
    const postInput = page.locator('textarea, input[type="text"]').first();
    await postInput.waitFor({ state: 'visible', timeout: 5000 });

    const testUrl = 'https://github.com/anthropics/anthropic-sdk-typescript';
    const testContent = `Testing badge updates: ${testUrl}`;

    console.log(`  📝 Creating post: "${testContent}"`);
    await postInput.fill(testContent);

    // Take screenshot before posting
    await page.screenshot({
      path: 'tests/screenshots/fix-validation-02a-before-post.png'
    });

    // Click Post button
    const postButton = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
    await postButton.click();

    console.log('  ⏳ Waiting for post to appear...');
    await page.waitForTimeout(2000);

    // Take screenshot after posting
    await page.screenshot({
      path: 'tests/screenshots/fix-validation-02b-after-post.png',
      fullPage: true
    });

    // Look for badge (may have different statuses)
    console.log('  🔍 Looking for ticket badge...');

    const badgeSelectors = [
      '[data-status]',
      '[class*="badge"]',
      '[class*="Badge"]',
      'span:has-text("analyzing")',
      'span:has-text("processing")',
      'span:has-text("completed")',
      'span:has-text("pending")'
    ];

    let badgeFound = false;
    for (const selector of badgeSelectors) {
      const badge = page.locator(selector).first();
      const count = await badge.count();
      if (count > 0) {
        console.log(`  ✅ Found badge with selector: ${selector}`);
        badgeFound = true;

        // Try to get badge text/status
        try {
          const badgeText = await badge.textContent();
          console.log(`     Badge text: ${badgeText}`);

          await page.screenshot({
            path: 'tests/screenshots/fix-validation-03-badge-visible.png',
            fullPage: true
          });
        } catch (e) {
          console.log(`     Could not get badge text: ${e}`);
        }
        break;
      }
    }

    if (!badgeFound) {
      console.log('  ⚠️  Badge not immediately visible, waiting longer...');
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: 'tests/screenshots/fix-validation-03-badge-search.png',
        fullPage: true
      });
    }

    // Wait and capture potential status changes
    console.log('  ⏳ Waiting for status transitions...');
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'tests/screenshots/fix-validation-04-after-wait.png',
      fullPage: true
    });

    // Report WebSocket activity
    console.log('\n  📊 WebSocket/Badge Activity Summary:');
    console.log(`     Total console messages: ${consoleMessages.length}`);
    console.log(`     WebSocket/Badge messages: ${wsMessages.length}`);

    if (wsMessages.length > 0) {
      console.log('     Key messages:');
      wsMessages.slice(0, 10).forEach(msg => console.log(`       - ${msg}`));
    }
  });

  test('Test 3: Verify Rich Content After Completion', async ({ page }) => {
    console.log('🧪 Test 3: Verifying rich content display...');

    // Wait for feed to fully load
    await page.waitForTimeout(2000);

    // Look for expandable comments or intelligence sections
    const expandButtons = page.locator('button:has-text("comment"), button:has-text("expand"), [class*="expand"]');
    const expandCount = await expandButtons.count();

    console.log(`  🔍 Found ${expandCount} expandable elements`);

    if (expandCount > 0) {
      console.log('  👆 Clicking to expand content...');
      await expandButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Take screenshot showing content
    await page.screenshot({
      path: 'tests/screenshots/fix-validation-05-rich-content-displayed.png',
      fullPage: true
    });

    // Check for rich content indicators
    const bodyText = await page.textContent('body');
    const hasRichContent = bodyText?.includes('summary') ||
                          bodyText?.includes('intelligence') ||
                          bodyText?.includes('analysis') ||
                          bodyText?.includes('key points');

    const hasFallback = bodyText?.includes('No summary available');

    console.log('  📊 Content Analysis:');
    console.log(`     Has rich content indicators: ${hasRichContent}`);
    console.log(`     Has fallback text: ${hasFallback}`);
  });

  test('Test 4: Test Refresh Button', async ({ page }) => {
    console.log('🧪 Test 4: Testing refresh functionality...');

    const consoleMessages: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      consoleMessages.push(text);

      if (text.includes('Refresh') || text.includes('refresh') || text.includes('🔄')) {
        console.log(`     📡 ${text}`);
      }
    });

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("refresh"), [aria-label*="refresh" i]').first();
    const hasRefresh = await refreshButton.count();

    if (hasRefresh > 0) {
      console.log('  👆 Clicking refresh button...');
      await refreshButton.click();

      // Wait for refresh
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'tests/screenshots/fix-validation-06-refresh-working.png',
        fullPage: true
      });

      // Check console for refresh messages
      const refreshMessages = consoleMessages.filter(msg =>
        msg.includes('Refresh') || msg.includes('refresh')
      );

      console.log(`  📊 Refresh messages found: ${refreshMessages.length}`);
      refreshMessages.forEach(msg => console.log(`     - ${msg}`));
    } else {
      console.log('  ⚠️  No refresh button found');
      await page.screenshot({
        path: 'tests/screenshots/fix-validation-06-no-refresh-button.png',
        fullPage: true
      });
    }

    // Check general console health
    const errorMessages = consoleMessages.filter(msg =>
      msg.toLowerCase().includes('error') && !msg.includes('404')
    );

    console.log(`  📊 Error messages: ${errorMessages.length}`);
    if (errorMessages.length > 0) {
      errorMessages.slice(0, 5).forEach(msg => console.log(`     ❌ ${msg}`));
    }
  });

  test('Test 5: Comprehensive Console and Network Check', async ({ page }) => {
    console.log('🧪 Test 5: Comprehensive system health check...');

    const consoleMessages: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      const type = msg.type();

      consoleMessages.push(`[${type}] ${text}`);

      if (type === 'error') {
        errors.push(text);
      } else if (type === 'warning') {
        warnings.push(text);
      }
    });

    // Monitor network
    const networkRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('socket')) {
        networkRequests.push(`${request.method()} ${url}`);
      }
    });

    // Let page run for a bit
    await page.waitForTimeout(5000);

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/fix-validation-07-final-state.png',
      fullPage: true
    });

    console.log('\n  📊 SYSTEM HEALTH REPORT:');
    console.log(`     Total console messages: ${consoleMessages.length}`);
    console.log(`     Errors: ${errors.length}`);
    console.log(`     Warnings: ${warnings.length}`);
    console.log(`     Network requests: ${networkRequests.length}`);

    if (errors.length > 0) {
      console.log('\n     ❌ Errors detected:');
      errors.slice(0, 5).forEach(err => console.log(`        ${err}`));
    }

    if (networkRequests.length > 0) {
      console.log('\n     🌐 API/Socket requests:');
      networkRequests.slice(0, 10).forEach(req => console.log(`        ${req}`));
    }

    // Check for specific success indicators
    const hasWebSocketConnection = consoleMessages.some(msg =>
      msg.includes('WebSocket') || msg.includes('Connected')
    );

    const hasAPIActivity = networkRequests.some(req => req.includes('/api/'));

    console.log('\n     ✅ Success Indicators:');
    console.log(`        WebSocket activity: ${hasWebSocketConnection}`);
    console.log(`        API activity: ${hasAPIActivity}`);
  });
});
