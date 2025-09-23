import { test, expect } from '@playwright/test';

test.describe('👁️ Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    // Wait for content to be stable
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('homepage layout remains consistent', async ({ page }) => {
    console.log('🧪 Testing homepage visual consistency...');
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="timestamp"]'), // Hide dynamic timestamps
        page.locator('[data-testid="live-indicator"]'), // Hide live status indicators
      ]
    });
    
    console.log('✅ Homepage layout screenshot captured');
  });

  test('post creator modal visual consistency', async ({ page }) => {
    console.log('🧪 Testing post creator modal visuals...');
    
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Screenshot the modal
    await expect(page.locator('[data-testid="post-creator-modal"]')).toHaveScreenshot('post-creator-modal.png');
    
    console.log('✅ Post creator modal screenshot captured');
  });

  test('mention dropdown positioning and styling', async ({ page }) => {
    console.log('🧪 Testing mention dropdown visuals...');
    
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    await contentInput.fill('@');
    
    // Wait for dropdown to appear
    await page.waitForSelector('[data-testid="mention-dropdown"]');
    
    // Screenshot the mention dropdown area
    const dropdownContainer = page.locator('[data-testid="mention-container"]');
    await expect(dropdownContainer).toHaveScreenshot('mention-dropdown.png');
    
    console.log('✅ Mention dropdown screenshot captured');
  });

  test('comment section visual layout', async ({ page }) => {
    console.log('🧪 Testing comment section visuals...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    await page.waitForSelector('[data-testid="comments-section"]');
    
    // Screenshot the comments section
    await expect(page.locator('[data-testid="comments-section"]')).toHaveScreenshot('comments-section.png');
    
    console.log('✅ Comment section screenshot captured');
  });

  test('mobile responsive layout consistency', async ({ page }) => {
    console.log('🧪 Testing mobile layout consistency...');
    
    // Test various mobile breakpoints
    const breakpoints = [
      { width: 320, height: 568, name: 'mobile-xs' },
      { width: 375, height: 667, name: 'mobile-s' },
      { width: 414, height: 896, name: 'mobile-l' },
      { width: 768, height: 1024, name: 'tablet' }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.waitForTimeout(500); // Let layout settle
      
      await expect(page).toHaveScreenshot(`${breakpoint.name}-layout.png`, {
        fullPage: false, // Just viewport for mobile
        mask: [page.locator('[data-testid="timestamp"]')]
      });
      
      console.log(`✅ ${breakpoint.name} layout screenshot captured`);
    }
  });

  test('dark mode visual consistency', async ({ page }) => {
    console.log('🧪 Testing dark mode visuals...');
    
    // Toggle to dark mode (if available)
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
        fullPage: true,
        mask: [page.locator('[data-testid="timestamp"]')]
      });
      
      console.log('✅ Dark mode screenshot captured');
    } else {
      console.log('ℹ️ Dark mode toggle not found - skipping dark mode test');
    }
  });

  test('post filtering UI visual states', async ({ page }) => {
    console.log('🧪 Testing post filtering UI visuals...');
    
    // Test different filter states
    const filterButton = page.locator('[data-testid="filter-button"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForSelector('[data-testid="filter-dropdown"]');
      
      await expect(page.locator('[data-testid="filter-dropdown"]')).toHaveScreenshot('filter-dropdown.png');
      
      // Apply a filter and screenshot the result
      await page.click('[data-testid="filter-option"]:has-text("Recent")');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('[data-testid="posts-container"]')).toHaveScreenshot('filtered-posts.png');
      
      console.log('✅ Post filtering UI screenshots captured');
    }
  });

  test('error states visual consistency', async ({ page }) => {
    console.log('🧪 Testing error states visuals...');
    
    // Trigger network error
    await page.route('**/api/posts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="api-error"]', { timeout: 10000 });
    
    await expect(page.locator('[data-testid="error-container"]')).toHaveScreenshot('api-error-state.png');
    
    console.log('✅ Error state screenshot captured');
  });

  test('loading states visual consistency', async ({ page }) => {
    console.log('🧪 Testing loading states visuals...');
    
    // Intercept API calls to introduce delay
    await page.route('**/api/posts', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    await page.reload();
    
    // Capture loading state
    await expect(page.locator('[data-testid="loading-container"]')).toHaveScreenshot('loading-state.png', {
      timeout: 3000
    });
    
    console.log('✅ Loading state screenshot captured');
  });

  test('form validation visual feedback', async ({ page }) => {
    console.log('🧪 Testing form validation visuals...');
    
    await page.click('[data-testid="create-post-button"]');
    
    // Try to submit empty form to trigger validation
    await page.click('[data-testid="publish-button"]');
    await page.waitForSelector('[data-testid="validation-error"]');
    
    await expect(page.locator('[data-testid="post-creator-modal"]')).toHaveScreenshot('validation-errors.png');
    
    console.log('✅ Form validation screenshot captured');
  });

  test('nested comment threading visual hierarchy', async ({ page }) => {
    console.log('🧪 Testing comment threading visuals...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // If there are nested comments, capture their visual hierarchy
    const nestedComments = page.locator('[data-testid="nested-comment"]');
    if ((await nestedComments.count()) > 0) {
      await expect(page.locator('[data-testid="comments-thread"]')).toHaveScreenshot('nested-comments.png');
      console.log('✅ Nested comments screenshot captured');
    } else {
      console.log('ℹ️ No nested comments found for visual testing');
    }
  });

  test('accessibility visual indicators', async ({ page }) => {
    console.log('🧪 Testing accessibility visual indicators...');
    
    // Test focus indicators
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Screenshot focused element
    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      await expect(focusedElement).toHaveScreenshot('focus-indicator.png');
      console.log('✅ Focus indicator screenshot captured');
    }
    
    // Test high contrast mode (if supported)
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    
    await expect(page.locator('[data-testid="main-navigation"]')).toHaveScreenshot('high-contrast-nav.png');
    
    console.log('✅ Accessibility indicators screenshots captured');
  });
});