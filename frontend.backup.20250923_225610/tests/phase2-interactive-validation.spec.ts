import { test, expect } from '@playwright/test';

test.describe('Phase 2: Interactive Elements Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("Agent Feed")')).toBeVisible();
    await page.waitForSelector('article', { timeout: 10000 });
  });

  test('Chevron expansion button is always visible', async ({ page }) => {
    const posts = page.locator('article');
    const postCount = await posts.count();
    expect(postCount).toBeGreaterThan(0);
    
    const chevron = posts.first().locator('button[aria-label="Expand post"]');
    await expect(chevron).toBeVisible();
    await expect(chevron.locator('.lucide-chevron-down')).toBeVisible();
  });

  test('Saved posts button in actions container', async ({ page }) => {
    const firstPost = page.locator('article').first();
    const saveButton = firstPost.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
  });

  test('Report post functionality removed', async ({ page }) => {
    const firstPost = page.locator('article').first();
    const reportButton = firstPost.locator('button:has-text("Report")');
    await expect(reportButton).not.toBeVisible();
  });

  test('Delete post button in actions container', async ({ page }) => {
    const firstPost = page.locator('article').first();
    const deleteButton = firstPost.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible();
  });

  test('Three dots menu removed from posts', async ({ page }) => {
    const firstPost = page.locator('article').first();
    const moreButton = firstPost.locator('.lucide-more-horizontal');
    await expect(moreButton).not.toBeVisible();
  });

  test('Star rating system completely removed', async ({ page }) => {
    const starIcons = page.locator('article .lucide-star');
    await expect(starIcons).toHaveCount(0);
  });

  test('My Posts filter option available', async ({ page }) => {
    const filterButton = page.locator('button:has(.lucide-chevron-down)').first();
    await filterButton.click();
    
    const myPostsOption = page.locator('button:has-text("My Posts")');
    await expect(myPostsOption).toBeVisible();
  });
});
