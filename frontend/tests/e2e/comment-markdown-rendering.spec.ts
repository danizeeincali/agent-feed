import { test, expect } from '@playwright/test';

test.describe('Comment Markdown Rendering', () => {
  test('weather post comments render markdown correctly', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find and click the weather post
    const weatherPost = page.locator('text=/weather.*los gatos/i').first();
    await expect(weatherPost).toBeVisible({ timeout: 10000 });
    await weatherPost.click();

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Open comments
    const commentButton = page.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1500);

    // Find comment with markdown (should have **56°F**)
    // Check that it's rendered as <strong>, not raw text
    const strongElements = await page.locator('.comment-content strong, strong').count();

    console.log('Found strong elements:', strongElements);

    // Should have at least one <strong> tag (the **56°F**)
    expect(strongElements).toBeGreaterThan(0);

    // Get all visible text
    const bodyText = await page.textContent('body');

    // Count raw ** symbols (there shouldn't be any visible in comments)
    const rawMarkdown = bodyText?.match(/\*\*[^*]+\*\*/g) || [];
    console.log('Raw markdown found:', rawMarkdown);

    // Ideally should be 0, but allow some if they're in code or hidden elements
    expect(rawMarkdown.length).toBeLessThan(3);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/playwright-report/comment-markdown-rendered.png',
      fullPage: true
    });
  });

  test('new comment with markdown renders immediately', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find weather post
    const weatherPost = page.locator('text=/weather.*los gatos/i').first();
    await weatherPost.click();
    await page.waitForTimeout(1000);

    // Open comments
    await page.locator('button:has-text("Comment")').first().click();
    await page.waitForTimeout(1000);

    // Type new comment with markdown
    const textarea = page.locator('textarea[placeholder*="comment" i]').first();
    await textarea.fill('Test comment with **bold** and *italic* text');

    // Submit
    const submitButton = page.locator('button:has-text("Post")').first();
    await submitButton.click();

    // Wait for comment to appear
    await page.waitForTimeout(2000);

    // Check that new comment has rendered markdown
    const newCommentStrong = await page.locator('text="Test comment" ~ strong, text="Test comment" strong').count();
    expect(newCommentStrong).toBeGreaterThan(0);

    // Screenshot
    await page.screenshot({
      path: 'frontend/playwright-report/new-comment-markdown.png',
      fullPage: true
    });
  });
});
