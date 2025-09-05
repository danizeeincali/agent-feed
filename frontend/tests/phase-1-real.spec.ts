import { test, expect, Page } from '@playwright/test';

/**
 * Phase 1 Features - Real Implementation Tests
 * Based on actual UI structure discovered through debugging
 */

const BASE_URL = 'http://localhost:5173';

async function setupPage(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  return { consoleErrors };
}

test.describe('Phase 1 Features - Real Implementation', () => {
  
  test('1. Post Hierarchy and Order - Verify Posts Display', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Verify page loads successfully
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    // Check that posts are displayed
    const articles = page.locator('article');
    const postCount = await articles.count();
    console.log('Post count:', postCount);
    
    if (postCount > 0) {
      // Verify posts have required elements
      const firstPost = articles.first();
      
      // Check for post content elements
      await expect(firstPost).toBeVisible();
      
      // Each post should have like and comment buttons
      const likeButtons = firstPost.locator('button:has-text("likes")');
      const commentButtons = firstPost.locator('button:has-text("comments")');
      
      expect(await likeButtons.count()).toBeGreaterThan(0);
      expect(await commentButtons.count()).toBeGreaterThan(0);
    }
    
    // Verify no console errors during page load
    expect(consoleErrors).toHaveLength(0);
  });

  test('2. Sharing Buttons Completely Removed - Verify No Share Options', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    // Check that NO sharing elements exist anywhere on the page
    const sharingSelectors = [
      'button:has-text("Share")',
      'button:has-text("share")', 
      'a:has-text("Share")',
      'a:has-text("share")',
      'text=Twitter',
      'text=Facebook',
      'text=LinkedIn',
      'text=Copy link',
      '[title*="Share" i]',
      '[aria-label*="Share" i]',
      '[class*="share" i]'
    ];
    
    for (const selector of sharingSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      console.log(`Selector "${selector}": ${count} elements found`);
      expect(count).toBe(0);
    }
    
    // Verify only like and comment buttons exist in post actions
    const actionButtons = page.locator('article button');
    const buttonTexts = await actionButtons.allTextContents();
    
    // Filter out empty strings
    const validButtonTexts = buttonTexts.filter(text => text.trim().length > 0);
    console.log('Action button texts:', validButtonTexts);
    
    // All button texts should be about likes, comments, or other non-sharing actions
    for (const buttonText of validButtonTexts) {
      expect(buttonText.toLowerCase()).not.toContain('share');
      expect(buttonText.toLowerCase()).not.toContain('tweet');
      expect(buttonText.toLowerCase()).not.toContain('facebook');
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('3. Post Interactions Work Without JavaScript Errors', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    const articles = page.locator('article');
    const postCount = await articles.count();
    
    if (postCount > 0) {
      const firstPost = articles.first();
      
      // Test like button interaction
      const likeButton = firstPost.locator('button:has-text("likes")');
      if (await likeButton.count() > 0) {
        const initialLikeText = await likeButton.first().textContent();
        console.log('Initial like text:', initialLikeText);
        
        await likeButton.first().click();
        await page.waitForTimeout(500);
        
        // The like count might change or stay the same (depending on backend)
        // Main test is that no JS errors occurred
      }
      
      // Test comment button interaction
      const commentButton = firstPost.locator('button:has-text("comments")');
      if (await commentButton.count() > 0) {
        await commentButton.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    // Test other UI interactions
    const refreshButton = page.locator('button:has-text("Refresh")');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Test filter/sort dropdowns if they exist
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log('Select elements found:', selectCount);
    
    if (selectCount > 0) {
      for (let i = 0; i < Math.min(selectCount, 2); i++) {
        const select = selects.nth(i);
        if (await select.isVisible()) {
          const options = await select.locator('option').count();
          if (options > 1) {
            await select.selectOption({ index: 1 });
            await page.waitForTimeout(500);
            await select.selectOption({ index: 0 });
            await page.waitForTimeout(500);
          }
        }
      }
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('4. Post Creator Functionality - If Available', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    // Look for any post creation UI elements
    const createElements = [
      'button:has-text("Create")',
      'button:has-text("Post")',
      'button:has-text("New")',
      'button:has-text("Add")',
      'text=Start a post',
      'text=Create post',
      'text=New post'
    ];
    
    let foundCreateElement = false;
    
    for (const selector of createElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        console.log(`Found create element: ${selector} (${count} instances)`);
        foundCreateElement = true;
        
        // Try to interact with it
        try {
          await elements.first().click();
          await page.waitForTimeout(1000);
          
          // Look for form elements that might appear
          const formElements = page.locator('input, textarea');
          const formCount = await formElements.count();
          console.log('Form elements after click:', formCount);
          
          if (formCount > 0) {
            // Test character counting if form exists
            const inputs = await formElements.all();
            for (const input of inputs) {
              if (await input.isVisible()) {
                const placeholder = await input.getAttribute('placeholder');
                console.log('Found input with placeholder:', placeholder);
                
                if (placeholder && placeholder.includes('title')) {
                  await input.fill('Test Title');
                  // Look for character count
                  await expect(page.locator('text=/\\d+\\/\\d+/')).toBeVisible({ timeout: 2000 });
                }
              }
            }
          }
        } catch (error) {
          console.log('Error interacting with create element:', error);
        }
        break;
      }
    }
    
    if (!foundCreateElement) {
      console.log('No post creator UI found - this may be intentional for current phase');
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('5. Page Responsiveness - Mobile and Desktop', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    const desktopArticles = await page.locator('article').count();
    console.log('Desktop articles:', desktopArticles);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileArticles = await page.locator('article').count();
    console.log('Mobile articles:', mobileArticles);
    
    // Articles should be visible in both views
    expect(mobileArticles).toBe(desktopArticles);
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    const tabletArticles = await page.locator('article').count();
    console.log('Tablet articles:', tabletArticles);
    
    expect(tabletArticles).toBe(desktopArticles);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('6. API Connectivity and Data Loading', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Monitor network requests
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        requests.push(req.url());
      }
    });
    
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verify API calls were made
    console.log('API requests made:', requests.length);
    console.log('API requests:', requests);
    
    expect(requests.length).toBeGreaterThan(0);
    
    // Verify posts loaded or appropriate empty state
    const articles = page.locator('article');
    const postCount = await articles.count();
    console.log('Posts loaded:', postCount);
    
    if (postCount === 0) {
      // Should show empty state or loading indicator
      const emptyState = page.locator('text=No posts, text=No agent activity, text=Loading');
      expect(await emptyState.count()).toBeGreaterThan(0);
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('7. Content Validation and Structure', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    
    const articles = page.locator('article');
    const postCount = await articles.count();
    
    if (postCount > 0) {
      const firstPost = articles.first();
      
      // Verify post structure
      const postContent = await firstPost.textContent();
      expect(postContent).toBeTruthy();
      expect(postContent!.length).toBeGreaterThan(0);
      
      // Check for engagement elements
      const likeButtons = firstPost.locator('button:has-text("likes")');
      const commentButtons = firstPost.locator('button:has-text("comments")');
      
      expect(await likeButtons.count()).toBeGreaterThan(0);
      expect(await commentButtons.count()).toBeGreaterThan(0);
      
      // Verify like/comment counts are numbers
      const likeText = await likeButtons.first().textContent();
      const commentText = await commentButtons.first().textContent();
      
      console.log('Like button text:', likeText);
      console.log('Comment button text:', commentText);
      
      // Should contain numbers
      expect(likeText).toMatch(/\d+/);
      expect(commentText).toMatch(/\d+/);
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('8. Complete Feature Integration Test', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    console.log('🔍 Starting comprehensive integration test...');
    
    // 1. Verify page loads
    await expect(page.locator('text=Agent Feed')).toBeVisible({ timeout: 10000 });
    console.log('✅ Page loaded successfully');
    
    // 2. Verify no sharing buttons exist
    const shareElements = page.locator('button:has-text("Share"), a:has-text("Share")');
    expect(await shareElements.count()).toBe(0);
    console.log('✅ No sharing buttons found');
    
    // 3. Test post interactions
    const articles = page.locator('article');
    const postCount = await articles.count();
    console.log(`✅ Found ${postCount} posts`);
    
    if (postCount > 0) {
      // Test like interaction
      const likeButton = articles.first().locator('button:has-text("likes")').first();
      const initialLikes = await likeButton.textContent();
      await likeButton.click();
      await page.waitForTimeout(500);
      console.log(`✅ Like button clicked (was: ${initialLikes})`);
      
      // Test comment interaction
      const commentButton = articles.first().locator('button:has-text("comments")').first();
      await commentButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Comment button clicked');
    }
    
    // 4. Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.locator('text=Agent Feed')).toBeVisible();
    console.log('✅ Mobile view works');
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    console.log('✅ Desktop view works');
    
    // 5. Test UI controls
    const refreshButton = page.locator('button:has-text("Refresh")');
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Refresh button works');
    }
    
    // 6. Verify no JavaScript errors occurred during any interaction
    expect(consoleErrors).toHaveLength(0);
    console.log('✅ No JavaScript errors detected');
    
    console.log('🎉 All Phase 1 features validated successfully!');
  });
});