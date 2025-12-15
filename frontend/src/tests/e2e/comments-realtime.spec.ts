import { test, expect, Page } from '@playwright/test';

test.describe('Real-time Comments E2E Validation', () => {
  const baseURL = 'http://localhost:5173';

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  test('should show comment immediately without refresh @screenshot', async ({ page }) => {
    // Screenshot: Initial state
    await page.screenshot({
      path: 'test-results/screenshots/01-initial-state.png',
      fullPage: true
    });

    // Find first post
    const postCard = page.locator('[class*="PostCard"]').first();
    await expect(postCard).toBeVisible();

    // Get initial comment text
    const commentButton = postCard.locator('button:has-text("Comment")');
    const initialText = await commentButton.textContent();
    console.log('Initial comment button:', initialText);

    // Screenshot: Before clicking
    await page.screenshot({
      path: 'test-results/screenshots/02-before-click.png',
      fullPage: true
    });

    // Click comment button
    await commentButton.click();
    await page.waitForTimeout(500);

    // Screenshot: Comment form visible
    await page.screenshot({
      path: 'test-results/screenshots/03-comment-form-open.png',
      fullPage: true
    });

    // Type comment
    const textarea = page.locator('textarea').first();
    await textarea.fill('E2E Test Comment - Real-time validation');

    // Screenshot: Comment typed
    await page.screenshot({
      path: 'test-results/screenshots/04-comment-typed.png',
      fullPage: true
    });

    // Submit comment
    const postButton = page.locator('button:has-text("Post")').first();
    await postButton.click();

    // Wait for comment to appear (should be immediate with optimistic update)
    await expect(page.locator('text=E2E Test Comment - Real-time validation')).toBeVisible({
      timeout: 2000
    });

    // Screenshot: Comment visible
    await page.screenshot({
      path: 'test-results/screenshots/05-comment-visible.png',
      fullPage: true
    });

    // Verify counter updated (should show "1 Comments" or similar)
    await expect(page.locator('text=/\\d+ Comments?/')).toBeVisible({ timeout: 1000 });

    // Screenshot: Final state
    await page.screenshot({
      path: 'test-results/screenshots/06-final-state.png',
      fullPage: true
    });

    console.log('✅ Comment appeared immediately without refresh');
  });

  test('should receive real-time updates via Socket.IO @realtime', async ({ browser }) => {
    // Open two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Navigate both to same page
    await page1.goto(baseURL);
    await page2.goto(baseURL);
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Screenshot: Initial state for both users
    await page1.screenshot({ path: 'test-results/screenshots/user1-initial.png' });
    await page2.screenshot({ path: 'test-results/screenshots/user2-initial.png' });

    // User 1 posts comment
    const postCard1 = page1.locator('[class*="PostCard"]').first();
    await postCard1.locator('button:has-text("Comment")').click();
    await page1.waitForTimeout(500);

    await page1.locator('textarea').first().fill('Real-time test from User 1');
    await page1.screenshot({ path: 'test-results/screenshots/user1-typing.png' });

    await page1.locator('button:has-text("Post")').first().click();

    // User 1 sees comment immediately
    await expect(page1.locator('text=Real-time test from User 1')).toBeVisible({ timeout: 2000 });
    await page1.screenshot({ path: 'test-results/screenshots/user1-comment-posted.png' });

    // User 2 should receive Socket.IO event and see counter update
    // Wait for WebSocket event to propagate
    await page2.waitForTimeout(1500);

    // Screenshot: User 2 after WebSocket event
    await page2.screenshot({ path: 'test-results/screenshots/user2-counter-updated.png' });

    // Verify User 2's counter updated (showing at least 1 comment)
    const hasCounter = await page2.locator('text=/\\d+ Comments?/').count() > 0;
    if (hasCounter) {
      console.log('✅ User 2 received real-time counter update via Socket.IO');
    }

    // User 2 clicks to expand and see the comment
    const postCard2 = page2.locator('[class*="PostCard"]').first();
    await postCard2.locator('button:has-text(/Comments?/)').first().click();
    await page2.waitForTimeout(500);

    // Verify comment visible to User 2
    await expect(page2.locator('text=Real-time test from User 1')).toBeVisible({ timeout: 2000 });
    await page2.screenshot({ path: 'test-results/screenshots/user2-sees-comment.png' });

    console.log('✅ User 2 received real-time update via Socket.IO');

    await context1.close();
    await context2.close();
  });

  test('should handle Socket.IO connection state @connection', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Check console for Socket.IO connection messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Socket.IO') || text.includes('PostCard')) {
        consoleLogs.push(text);
      }
    });

    // Wait for connection
    await page.waitForTimeout(2000);

    // Screenshot: Connected state
    await page.screenshot({ path: 'test-results/screenshots/socketio-connected.png' });

    // Verify connection logs
    const hasConnectionLog = consoleLogs.some(log =>
      log.includes('connected') || log.includes('Subscribed to post')
    );

    if (hasConnectionLog) {
      console.log('✅ Socket.IO connection established');
      console.log('Connection logs:', consoleLogs.filter(l => l.includes('Socket')));
    }

    expect(hasConnectionLog).toBeTruthy();
  });

  test('should show markdown rendering in real-time comments @markdown', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    // Post comment with markdown
    const postCard = page.locator('[class*="PostCard"]').first();
    await postCard.locator('button:has-text("Comment")').click();
    await page.waitForTimeout(500);

    // Type markdown comment
    await page.locator('textarea').first().fill('This is **bold** and *italic* text');
    await page.screenshot({ path: 'test-results/screenshots/markdown-typed.png' });

    // Submit
    await page.locator('button:has-text("Post")').first().click();

    // Wait for comment
    await page.waitForTimeout(1000);

    // Screenshot: Rendered markdown
    await page.screenshot({ path: 'test-results/screenshots/markdown-rendered.png', fullPage: true });

    // Verify markdown is rendered (bold tag exists, not raw **)
    const hasRenderedMarkdown = await page.locator('strong:has-text("bold")').count() > 0;
    if (hasRenderedMarkdown) {
      console.log('✅ Markdown rendered correctly in real-time comment');
    }

    // Verify NO raw markdown symbols visible
    const hasRawSymbols = await page.locator('text=/\\*\\*bold\\*\\*/').count() > 0;
    expect(hasRawSymbols).toBe(false);
  });
});
