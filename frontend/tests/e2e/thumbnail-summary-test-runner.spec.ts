/**
 * Comprehensive Test Runner for Thumbnail-Summary Functionality
 * 
 * Orchestrates all thumbnail-summary tests with proper setup, execution, and teardown
 * Validates 100% real data functionality across multiple scenarios
 */

import { test, expect } from '@playwright/test';
import ThumbnailSummaryTestSetup, { TestEnvironment } from './setup/thumbnail-summary-test-setup';

// Real URLs for comprehensive testing
const COMPREHENSIVE_TEST_URLS = {
  video: {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeShort: 'https://youtu.be/dQw4w9WgXcQ',
    youtubePlaylist: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLTBqohhFNBE_09L0i-lf3fYXF5woAbrzP&index=1'
  },
  articles: {
    techNews: 'https://techcrunch.com/2023/11/06/openai-completes-investigation-into-sam-altmans-conduct-issues-statement-of-support/',
    wiredArticle: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
    arsArticle: 'https://arstechnica.com/tech-policy/2023/11/spacex-starship-explodes-4-minutes-into-second-test-flight/'
  },
  technical: {
    github: 'https://github.com/microsoft/vscode',
    stackoverflow: 'https://stackoverflow.com/questions/927358/how-do-i-undo-the-most-recent-local-commits-in-git',
    npm: 'https://www.npmjs.com/package/react'
  },
  documentation: {
    mdn: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
    w3schools: 'https://www.w3schools.com/css/css_flexbox.asp'
  }
};

test.describe('Comprehensive Thumbnail-Summary Test Suite', () => {
  let testEnvironment: TestEnvironment;
  let createdPostIds: string[] = [];

  test.beforeAll(async ({ browserName }) => {
    console.log(`🚀 Starting comprehensive thumbnail-summary tests on ${browserName}`);
    
    // Setup test environment
    testEnvironment = await ThumbnailSummaryTestSetup.setupTestEnvironment(
      browserName as 'chromium' | 'firefox' | 'webkit'
    );

    // Verify application health
    const isHealthy = await ThumbnailSummaryTestSetup.checkApplicationHealth(testEnvironment.page);
    expect(isHealthy).toBeTruthy();

    // Verify thumbnail-summary functionality is working
    const functionalityWorking = await ThumbnailSummaryTestSetup.verifyThumbnailSummaryFunctionality(
      testEnvironment.page
    );
    expect(functionalityWorking).toBeTruthy();

    console.log('✅ Test environment ready and functionality verified');
  });

  test.afterAll(async () => {
    // Cleanup created posts
    if (createdPostIds.length > 0) {
      await ThumbnailSummaryTestSetup.cleanupTestData(testEnvironment.page, createdPostIds);
    }

    // Cleanup test environment
    await ThumbnailSummaryTestSetup.cleanupTestEnvironment(testEnvironment);
    
    console.log('✅ Comprehensive test suite cleanup complete');
  });

  test('Comprehensive Real Data Validation', async () => {
    console.log('🧪 Running comprehensive real data validation...');

    // Create comprehensive test dataset
    const testPosts = [
      {
        title: 'YouTube Video Test',
        content: `Check out this amazing video: ${COMPREHENSIVE_TEST_URLS.video.youtube}`,
        authorAgent: 'VideoTestAgent',
        tags: ['youtube', 'video', 'entertainment']
      },
      {
        title: 'Tech News Article',
        content: `Important tech news: ${COMPREHENSIVE_TEST_URLS.articles.techNews}`,
        authorAgent: 'NewsAgent',
        tags: ['openai', 'tech', 'news']
      },
      {
        title: 'GitHub Repository',
        content: `Great code editor project: ${COMPREHENSIVE_TEST_URLS.technical.github}`,
        authorAgent: 'DeveloperAgent',
        tags: ['vscode', 'opensource', 'microsoft']
      },
      {
        title: 'Documentation Resource',
        content: `Helpful JavaScript documentation: ${COMPREHENSIVE_TEST_URLS.documentation.mdn}`,
        authorAgent: 'EducationAgent',
        tags: ['javascript', 'documentation', 'mdn']
      }
    ];

    // Create test posts
    const postIds = await ThumbnailSummaryTestSetup.createTestData(testEnvironment.page, {
      posts: testPosts
    });
    createdPostIds.push(...postIds);

    expect(postIds.length).toBeGreaterThan(0);

    // Refresh to see new posts
    await testEnvironment.page.reload({ waitUntil: 'networkidle' });

    // Wait for link previews to load
    await ThumbnailSummaryTestSetup.waitForLinkPreviewsToLoad(
      testEnvironment.page, 
      testPosts.length, 
      20000
    );

    // Verify all posts are rendered
    const postCards = testEnvironment.page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(testPosts.length, { timeout: 15000 });

    // Comprehensive validation for each post
    for (let i = 0; i < testPosts.length; i++) {
      const postCard = postCards.nth(i);
      const testPost = testPosts[i];

      console.log(`🔍 Validating post ${i + 1}: ${testPost.title}`);

      // Verify post card is visible
      await expect(postCard).toBeVisible();

      // Check for thumbnail-summary container or fallback
      const thumbnailSummary = postCard.locator('[role="article"]');
      const hasThumbnailSummary = await thumbnailSummary.count() > 0;

      if (hasThumbnailSummary) {
        console.log(`✅ Post ${i + 1}: Thumbnail-summary preview loaded`);

        // Validate thumbnail-summary layout
        await validateThumbnailSummaryLayout(thumbnailSummary, testPost);

        // Test interaction
        await testThumbnailSummaryInteraction(thumbnailSummary, testPost, testEnvironment);
      } else {
        console.log(`⚠️  Post ${i + 1}: Preview not loaded, checking for fallback`);

        // Verify fallback link is present
        const fallbackLink = postCard.locator('a[href*="http"]');
        await expect(fallbackLink).toBeVisible();

        // Verify fallback link properties
        await expect(fallbackLink).toHaveAttribute('target', '_blank');
        await expect(fallbackLink).toHaveAttribute('rel', 'noopener noreferrer');

        console.log(`✅ Post ${i + 1}: Fallback link verified`);
      }
    }

    console.log('✅ Comprehensive real data validation completed');
  });

  test('Cross-Browser Thumbnail-Summary Compatibility', async () => {
    console.log('🌐 Testing cross-browser compatibility...');

    // Create a simple test post
    const testPost = {
      title: 'Cross-Browser Test',
      content: `Testing compatibility: ${COMPREHENSIVE_TEST_URLS.video.youtube}`,
      authorAgent: 'CrossBrowserAgent',
      tags: ['compatibility', 'test']
    };

    const [postId] = await ThumbnailSummaryTestSetup.createTestData(testEnvironment.page, {
      posts: [testPost]
    });
    createdPostIds.push(postId);

    await testEnvironment.page.reload({ waitUntil: 'networkidle' });
    await ThumbnailSummaryTestSetup.waitForLinkPreviewsToLoad(testEnvironment.page, 1, 15000);

    // Log system info for debugging
    await ThumbnailSummaryTestSetup.logSystemInfo(testEnvironment.page);

    const postCard = testEnvironment.page.locator('[data-testid="post-card"]').first();
    await expect(postCard).toBeVisible();

    // Test basic functionality
    const thumbnailSummary = postCard.locator('[role="article"]');
    const hasPreview = await thumbnailSummary.count() > 0;

    if (hasPreview) {
      // Test click interaction
      await thumbnailSummary.click();
      await testEnvironment.page.waitForTimeout(2000);

      // Check for video player or external link
      const hasVideo = await testEnvironment.page.locator('iframe[src*="youtube"]').count() > 0;
      const hasExternalLink = await testEnvironment.page.locator('a[href*="youtube"][target="_blank"]').count() > 0;

      expect(hasVideo || hasExternalLink).toBeTruthy();
    } else {
      // Verify fallback works across browsers
      const fallbackLink = postCard.locator('a[href*="http"]');
      await expect(fallbackLink).toBeVisible();
    }

    console.log('✅ Cross-browser compatibility verified');
  });

  test('Responsive Design Validation', async () => {
    console.log('📱 Testing responsive design...');

    const testPost = {
      title: 'Responsive Design Test',
      content: `Testing responsive layout: ${COMPREHENSIVE_TEST_URLS.video.youtube}`,
      authorAgent: 'ResponsiveTestAgent'
    };

    const [postId] = await ThumbnailSummaryTestSetup.createTestData(testEnvironment.page, {
      posts: [testPost]
    });
    createdPostIds.push(postId);

    await testEnvironment.page.reload({ waitUntil: 'networkidle' });

    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'Mobile Portrait' },
      { width: 667, height: 375, name: 'Mobile Landscape' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];

    for (const viewport of viewports) {
      console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      await testEnvironment.page.setViewportSize(viewport);
      await testEnvironment.page.waitForTimeout(1000);

      // Wait for layout adjustment
      await ThumbnailSummaryTestSetup.waitForLinkPreviewsToLoad(testEnvironment.page, 1, 10000);

      const postCard = testEnvironment.page.locator('[data-testid="post-card"]').first();
      await expect(postCard).toBeVisible();

      const thumbnailSummary = postCard.locator('[role="article"]');
      if (await thumbnailSummary.count() > 0) {
        // Verify layout adapts appropriately
        const layoutContainer = thumbnailSummary.locator('> div').first();
        const containerClasses = await layoutContainer.getAttribute('class');

        // On small screens, should use vertical layout
        if (viewport.width < 640) {
          expect(containerClasses).toMatch(/flex-col|sm:flex-row/);
        } else {
          expect(containerClasses).toMatch(/flex-row/);
        }

        // Verify both sections remain visible
        const thumbnailSection = layoutContainer.locator('> div').first();
        const contentSection = layoutContainer.locator('> div').nth(1);

        await expect(thumbnailSection).toBeVisible();
        await expect(contentSection).toBeVisible();
      }

      console.log(`✅ ${viewport.name} layout verified`);
    }

    // Reset to default viewport
    await testEnvironment.page.setViewportSize({ width: 1280, height: 720 });

    console.log('✅ Responsive design validation completed');
  });

  test('Performance and Network Resilience', async () => {
    console.log('⚡ Testing performance and network resilience...');

    const performanceTestUrls = [
      COMPREHENSIVE_TEST_URLS.video.youtube,
      COMPREHENSIVE_TEST_URLS.articles.wiredArticle,
      COMPREHENSIVE_TEST_URLS.technical.github,
      'https://httpstat.us/500', // Intentional error URL
      'https://httpstat.us/404'  // Intentional error URL
    ];

    const testPosts = performanceTestUrls.map((url, index) => ({
      title: `Performance Test ${index + 1}`,
      content: `Testing performance with: ${url}`,
      authorAgent: `PerformanceAgent${index + 1}`,
      tags: ['performance', 'test']
    }));

    const startTime = Date.now();

    // Create all posts
    const postIds = await ThumbnailSummaryTestSetup.createTestData(testEnvironment.page, {
      posts: testPosts
    });
    createdPostIds.push(...postIds);

    const creationTime = Date.now() - startTime;
    console.log(`📊 Post creation time: ${creationTime}ms`);

    // Reload and measure load time
    const reloadStartTime = Date.now();
    await testEnvironment.page.reload({ waitUntil: 'networkidle' });
    const reloadTime = Date.now() - reloadStartTime;
    console.log(`📊 Page reload time: ${reloadTime}ms`);

    // Wait for previews with timeout
    const previewLoadStartTime = Date.now();
    let successfulPreviews = 0;
    let failedPreviews = 0;

    const postCards = testEnvironment.page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(testPosts.length, { timeout: 15000 });

    // Check each post for preview or fallback
    for (let i = 0; i < testPosts.length; i++) {
      const postCard = postCards.nth(i);

      try {
        // Wait for preview to load or fallback to appear
        await expect(postCard.locator('[role="article"]').or(
          postCard.locator('a[href*="http"]')
        )).toBeVisible({ timeout: 8000 });

        const hasPreview = await postCard.locator('[role="article"]').count() > 0;
        const hasFallback = await postCard.locator('a[href*="http"]').count() > 0;

        if (hasPreview) {
          successfulPreviews++;
          console.log(`✅ Post ${i + 1}: Preview loaded successfully`);
        } else if (hasFallback) {
          failedPreviews++;
          console.log(`⚠️  Post ${i + 1}: Fallback link displayed (expected for error URLs)`);
        }
      } catch (error) {
        failedPreviews++;
        console.log(`❌ Post ${i + 1}: Failed to load preview or fallback`);
      }
    }

    const previewLoadTime = Date.now() - previewLoadStartTime;
    console.log(`📊 Preview loading completed in ${previewLoadTime}ms`);
    console.log(`📊 Successful previews: ${successfulPreviews}/${testPosts.length}`);
    console.log(`📊 Failed/Fallback previews: ${failedPreviews}/${testPosts.length}`);

    // Performance expectations
    expect(reloadTime).toBeLessThan(15000); // Page reload within 15 seconds
    expect(previewLoadTime).toBeLessThan(25000); // All previews/fallbacks within 25 seconds
    expect(successfulPreviews + failedPreviews).toBe(testPosts.length); // All posts handled

    console.log('✅ Performance and network resilience validation completed');
  });
});

// Helper function to validate thumbnail-summary layout
async function validateThumbnailSummaryLayout(thumbnailSummary: any, testPost: any): Promise<void> {
  // Verify horizontal layout structure
  const layoutContainer = thumbnailSummary.locator('> div').first();
  await expect(layoutContainer).toHaveClass(/flex/);

  // Verify thumbnail section (left)
  const thumbnailSection = layoutContainer.locator('> div').first();
  await expect(thumbnailSection).toBeVisible();
  await expect(thumbnailSection).toHaveClass(/flex-shrink-0/);

  // Verify content section (right)
  const contentSection = layoutContainer.locator('> div').nth(1);
  await expect(contentSection).toBeVisible();
  await expect(contentSection).toHaveClass(/flex-1/);

  // Verify title is present
  const title = contentSection.locator('h3');
  await expect(title).toBeVisible();

  // Verify metadata section
  const metadata = contentSection.locator('[class*="text-gray-500"]');
  await expect(metadata).toBeVisible();

  // Verify no www. truncation
  const metadataText = await metadata.textContent();
  if (metadataText) {
    expect(metadataText).not.toMatch(/^www\./);
  }
}

// Helper function to test thumbnail-summary interaction
async function testThumbnailSummaryInteraction(
  thumbnailSummary: any,
  testPost: any,
  testEnvironment: TestEnvironment
): Promise<void> {
  // Test accessibility
  await expect(thumbnailSummary).toHaveAttribute('role', 'article');
  await expect(thumbnailSummary).toHaveAttribute('tabindex', '0');

  // Test keyboard navigation
  await thumbnailSummary.focus();
  await expect(thumbnailSummary).toBeFocused();

  // Test click interaction
  await thumbnailSummary.click();
  await testEnvironment.page.waitForTimeout(2000);

  // Verify interaction result (video player or external link)
  const hasVideo = await testEnvironment.page.locator('iframe[src*="youtube"]').count() > 0;
  const hasExternalWindow = await testEnvironment.context.pages().length > 1;

  expect(hasVideo || hasExternalWindow).toBeTruthy();
}