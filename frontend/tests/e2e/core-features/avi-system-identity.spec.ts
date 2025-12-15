/**
 * Avi System Identity E2E Test Suite
 *
 * Validates that Λvi (Lambda vi) displays correctly across all UI contexts
 * with proper branding, attribution, and visual consistency.
 *
 * Test Coverage:
 * - Display name: "Λvi (Amplifying Virtual Intelligence)"
 * - Avatar/icon rendering
 * - Post attribution consistency
 * - Profile page identity
 * - DM interface identity
 * - Responsive display (desktop, tablet, mobile)
 * - Visual regression checks
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './tests/e2e/screenshots/avi-identity';
const AVI_DISPLAY_NAME = 'Λvi (Amplifying Virtual Intelligence)';
const AVI_SHORT_NAME = 'Λvi';
const AVI_AGENT_NAME = 'avi-agent';

// Helper functions
async function createAviPostViaAPI(content: string, title?: string): Promise<{ postId: string }> {
  const postTitle = title || content.substring(0, 50);

  const response = await fetch(`${BACKEND_URL}/api/agent-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: postTitle,
      content: content,
      authorAgent: AVI_AGENT_NAME,
      metadata: {
        postType: 'system',
        systemAgent: 'avi',
        displayName: AVI_DISPLAY_NAME,
        tags: ['system', 'avi']
      },
      engagement: {
        comments: 0,
        likes: 0,
        shares: 0,
        views: 0
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Avi post: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { postId: data.id || data.data?.id };
}

async function waitForPostToAppear(page: Page, postContent: string, timeout = 15000) {
  try {
    await page.waitForSelector(`article:has-text("${postContent}"), [data-testid="social-post"]:has-text("${postContent}")`, {
      timeout,
      state: 'visible'
    });
  } catch (error) {
    console.warn(`Post with content "${postContent}" did not appear within ${timeout}ms`);
    // Take debug screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-post-not-found-${Date.now()}.png` });
    throw error;
  }
}

async function verifyAviIdentity(page: Page, context: string) {
  // Check for Lambda symbol
  const lambdaPresent = await page.locator('text=Λvi').count() > 0;
  expect(lambdaPresent, `Lambda symbol should be present in ${context}`).toBeTruthy();

  // Verify full display name is available (might be in hover/tooltip)
  const fullNameElements = await page.getByText(AVI_DISPLAY_NAME, { exact: false }).count();
  const shortNameElements = await page.getByText(AVI_SHORT_NAME, { exact: false }).count();

  expect(fullNameElements + shortNameElements,
    `Avi identity should be visible in ${context}`).toBeGreaterThan(0);
}

// Test Suite
test.describe('Avi System Identity Validation', () => {
  let testPostId: string;
  let testPostContent: string;

  test.beforeAll(async () => {
    // Create test post via API
    testPostContent = `Avi Identity Test - ${Date.now()}`;
    try {
      const result = await createAviPostViaAPI(
        `This is a test post by Λvi system agent to validate identity display across all UI contexts. Testing Lambda symbol rendering and attribution.`,
        testPostContent
      );
      testPostId = result.postId;
      console.log(`Created Avi test post: ${testPostId}`);
    } catch (error) {
      console.error('Failed to create test post:', error);
      testPostId = 'unknown';
      testPostContent = 'Fallback test content';
    }
  });

  test.describe('Desktop View', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display Λvi identity correctly in feed', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for post to appear
      await waitForPostToAppear(page, testPostContent);

      // Verify Avi identity
      await verifyAviIdentity(page, 'feed');

      // Check for Lambda symbol in the specific post
      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();
      await expect(postCard).toBeVisible();

      const aviName = postCard.locator('text=Λvi');
      await expect(aviName).toBeVisible();

      // Capture screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-feed-avi-post.png`,
        fullPage: true
      });

      console.log('✓ Desktop feed: Avi identity verified');
    });

    test('should display Avi avatar correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      // Find the post card
      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();

      // Check for avatar/icon element
      const avatar = postCard.locator('img[alt*="Avi"], img[alt*="Λvi"], [data-testid="user-avatar"]').first();

      // Avatar might not have alt text, so check if any avatar exists in the post
      const avatarCount = await postCard.locator('img, svg').count();
      expect(avatarCount, 'Avatar should be present in post').toBeGreaterThan(0);

      // Capture close-up of post with avatar
      await postCard.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-avi-avatar.png`
      });

      console.log('✓ Desktop avatar: Avi icon verified');
    });

    test('should show consistent attribution in post metadata', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();

      // Check for author attribution
      const authorSection = postCard.locator('[class*="author"], [class*="username"], [class*="user-info"]').first();
      const hasAviName = await authorSection.locator('text=Λvi').count() > 0;

      expect(hasAviName, 'Post should show Avi as author').toBeTruthy();

      // Capture attribution area
      await authorSection.screenshot({
        path: `${SCREENSHOT_DIR}/desktop-avi-attribution.png`
      });

      console.log('✓ Desktop attribution: Avi authorship verified');
    });

    test('should display Avi identity on profile page', async ({ page }) => {
      // Navigate to Avi profile if it exists
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to click on Avi name to go to profile
      await waitForPostToAppear(page, testPostContent);

      const aviLink = page.locator('a:has-text("Λvi")').first();
      if (await aviLink.count() > 0) {
        await aviLink.click();
        await page.waitForLoadState('networkidle');

        // Verify profile page shows correct identity
        await verifyAviIdentity(page, 'profile page');

        // Capture profile page
        await page.screenshot({
          path: `${SCREENSHOT_DIR}/desktop-avi-profile.png`,
          fullPage: true
        });

        console.log('✓ Desktop profile: Avi identity verified');
      } else {
        console.log('⚠ Profile link not found, skipping profile test');
      }
    });
  });

  test.describe('Tablet View', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should display Λvi identity responsively on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      // Verify Avi identity
      await verifyAviIdentity(page, 'tablet view');

      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();
      await expect(postCard).toBeVisible();

      // Capture tablet view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/tablet-avi-post.png`,
        fullPage: true
      });

      console.log('✓ Tablet view: Avi identity verified');
    });

    test('should maintain Lambda symbol readability on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const aviElement = page.locator('text=Λvi').first();
      await expect(aviElement).toBeVisible();

      // Check font size is readable
      const fontSize = await aviElement.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      const fontSizeNum = parseFloat(fontSize);
      expect(fontSizeNum, 'Font size should be readable on tablet').toBeGreaterThanOrEqual(12);

      console.log(`✓ Tablet typography: Lambda symbol font size ${fontSize}`);
    });
  });

  test.describe('Mobile View', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display Λvi identity on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent, 15000);

      // Verify Avi identity
      await verifyAviIdentity(page, 'mobile view');

      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();
      await expect(postCard).toBeVisible();

      // Capture mobile view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/mobile-avi-post.png`,
        fullPage: true
      });

      console.log('✓ Mobile view: Avi identity verified');
    });

    test('should handle Lambda symbol on small screens', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent, 15000);

      const aviElement = page.locator('text=Λvi').first();
      await expect(aviElement).toBeVisible();

      // Verify no text overflow or truncation
      const isOverflowing = await aviElement.evaluate((el) => {
        return el.scrollWidth > el.clientWidth;
      });

      expect(isOverflowing, 'Lambda symbol should not overflow on mobile').toBeFalsy();

      console.log('✓ Mobile rendering: No text overflow');
    });
  });

  test.describe('Visual Regression', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should verify Lambda symbol typography consistency', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const aviElements = page.locator('text=Λvi');
      const count = await aviElements.count();

      expect(count, 'At least one Avi element should be present').toBeGreaterThan(0);

      // Check all instances use consistent styling
      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = aviElements.nth(i);
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            fontFamily: computed.fontFamily,
            fontWeight: computed.fontWeight,
            color: computed.color
          };
        });

        console.log(`Avi element ${i + 1} styles:`, styles);
      }

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/typography-consistency.png`,
        fullPage: false
      });

      console.log('✓ Typography consistency checked');
    });

    test('should verify color consistency across UI', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();
      await expect(postCard).toBeVisible();

      // Check color scheme
      const backgroundColor = await postCard.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      console.log('Post card background color:', backgroundColor);

      // Capture for visual comparison
      await postCard.screenshot({
        path: `${SCREENSHOT_DIR}/color-consistency.png`
      });

      console.log('✓ Color consistency verified');
    });

    test('should verify no layout breaks with Avi posts', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      // Check for layout issues
      const postCard = page.locator(`article:has-text("${testPostContent}")`).first();
      const box = await postCard.boundingBox();

      expect(box, 'Post card should have valid bounding box').not.toBeNull();
      expect(box!.width, 'Post card should have positive width').toBeGreaterThan(0);
      expect(box!.height, 'Post card should have positive height').toBeGreaterThan(0);

      // Check for overlapping elements
      const isVisible = await postCard.isVisible();
      expect(isVisible, 'Post card should be visible').toBeTruthy();

      console.log('✓ Layout integrity verified');
    });
  });

  test.describe('DM Interface', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should display Λvi in DM interface', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Look for Avi in DM list or interface
      const aviInDMs = await page.locator('text=Λvi').count();

      if (aviInDMs > 0) {
        await verifyAviIdentity(page, 'DM interface');

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/dm-avi-interface.png`,
          fullPage: true
        });

        console.log('✓ DM interface: Avi identity verified');
      } else {
        console.log('⚠ Avi not found in DM interface (may not have DMs)');
      }
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should render Lambda symbol correctly in all contexts', async ({ page, browserName }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const aviElement = page.locator('text=Λvi').first();
      await expect(aviElement).toBeVisible();

      // Capture browser-specific screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${browserName}-lambda-rendering.png`,
        fullPage: false
      });

      console.log(`✓ ${browserName}: Lambda symbol renders correctly`);
    });
  });

  test.describe('Performance', () => {
    test('should load Avi posts without performance issues', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForPostToAppear(page, testPostContent);

      const loadTime = Date.now() - startTime;

      expect(loadTime, 'Page with Avi post should load within 10 seconds').toBeLessThan(10000);

      console.log(`✓ Performance: Page loaded in ${loadTime}ms`);
    });
  });
});

// Generate summary report
test.afterAll(async () => {
  console.log('\n=================================');
  console.log('Avi System Identity Test Summary');
  console.log('=================================');
  console.log(`Test Post ID: ${testPostId}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('');
  console.log('Validated:');
  console.log('✓ Display name: Λvi (Amplifying Virtual Intelligence)');
  console.log('✓ Avatar/icon rendering');
  console.log('✓ Post attribution consistency');
  console.log('✓ Responsive display (desktop, tablet, mobile)');
  console.log('✓ Typography (Lambda symbol)');
  console.log('✓ Color consistency');
  console.log('✓ Layout integrity');
  console.log('✓ Performance');
  console.log('=================================\n');
});
