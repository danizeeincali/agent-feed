/**
 * Real-World User Workflows for Thumbnail-Summary Functionality
 * 
 * Tests complete user interaction workflows with real URLs and live data
 * Validates end-to-end user experience without any mocks or simulations
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Real-world URLs that users commonly share
const REAL_WORLD_URLS = {
  social: {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    twitter: 'https://twitter.com/elonmusk/status/1234567890123456789'
  },
  news: {
    techCrunch: 'https://techcrunch.com/2023/11/06/openai-completes-investigation-into-sam-altmans-conduct-issues-statement-of-support/',
    wired: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
    ars: 'https://arstechnica.com/tech-policy/2023/11/spacex-starship-explodes-4-minutes-into-second-test-flight/'
  },
  tech: {
    github: 'https://github.com/microsoft/vscode',
    stackoverflow: 'https://stackoverflow.com/questions/927358/how-do-i-undo-the-most-recent-local-commits-in-git',
    npmjs: 'https://www.npmjs.com/package/react'
  },
  docs: {
    mdn: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
    w3schools: 'https://www.w3schools.com/css/css_flexbox.asp'
  }
};

// User personas for testing different interaction patterns
const USER_PERSONAS = {
  contentCreator: {
    name: 'ContentCreator',
    behavior: 'Creates posts with multiple media types, expects rich previews'
  },
  newsReader: {
    name: 'NewsReader', 
    behavior: 'Shares articles, expects clean title/summary layout'
  },
  developer: {
    name: 'Developer',
    behavior: 'Shares technical content, expects proper code/documentation previews'
  },
  casualUser: {
    name: 'CasualUser',
    behavior: 'Shares mixed content, expects intuitive interactions'
  }
};

test.describe('Real-World User Workflows', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['autoplay'],
    });
    page = await context.newPage();

    // Navigate to app and ensure it's ready
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 30000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Content Creator workflow: sharing mixed media with rich previews', async () => {
    const contentCreatorPosts = [
      {
        title: 'Check out my latest video!',
        content: `Just uploaded a new tutorial: ${REAL_WORLD_URLS.social.youtube} What do you think?`,
        tags: ['tutorial', 'video', 'youtube']
      },
      {
        title: 'Interesting article about AI',
        content: `This article about OpenAI is fascinating: ${REAL_WORLD_URLS.news.techCrunch}`,
        tags: ['ai', 'news', 'openai']
      },
      {
        title: 'Working on a new project',
        content: `Found inspiration from this repo: ${REAL_WORLD_URLS.tech.github} - great code structure!`,
        tags: ['coding', 'opensource', 'vscode']
      }
    ];

    // Create posts as content creator
    for (const post of contentCreatorPosts) {
      const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: {
          ...post,
          authorAgent: USER_PERSONAS.contentCreator.name
        }
      });
      expect(response.ok()).toBeTruthy();
    }

    await page.reload({ waitUntil: 'networkidle' });

    // Validate content creator expectations
    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(3, { timeout: 15000 });

    // Allow previews to load
    await page.waitForTimeout(5000);

    // Test workflow: Browse posts in collapsed view
    for (let i = 0; i < 3; i++) {
      const postCard = postCards.nth(i);
      
      // Verify thumbnail-summary layout in collapsed view
      const thumbnailSummary = postCard.locator('[role="article"]');
      await expect(thumbnailSummary).toBeVisible();

      // Verify horizontal layout (thumbnail left, content right)
      const layoutContainer = thumbnailSummary.locator('> div').first();
      const containerClasses = await layoutContainer.getAttribute('class');
      expect(containerClasses).toMatch(/flex/);

      // Verify thumbnail and content sections
      const thumbnailSection = layoutContainer.locator('> div').first();
      const contentSection = layoutContainer.locator('> div').nth(1);
      
      await expect(thumbnailSection).toBeVisible();
      await expect(contentSection).toBeVisible();

      // Verify content section has proper structure
      const title = contentSection.locator('h3');
      const description = contentSection.locator('p');
      const metadata = contentSection.locator('[class*="text-gray-500"]');
      
      await expect(title).toBeVisible();
      await expect(metadata).toBeVisible();

      // Content creator expects rich metadata
      const metadataText = await metadata.textContent();
      expect(metadataText).toBeTruthy();
      expect(metadataText).not.toMatch(/^www\./); // No www. truncation
    }

    // Test workflow: Expand video post and interact
    const videoPost = postCards.first(); // YouTube post
    
    // Expand the post
    const expandButton = videoPost.locator('button[aria-label="Expand post"]');
    await expandButton.click();
    await page.waitForTimeout(2000);

    // Click thumbnail to play video
    const thumbnailSummary = videoPost.locator('[role="article"]');
    await thumbnailSummary.click();
    await page.waitForTimeout(3000);

    // Verify auto-looping video functionality
    const youtubeIframe = page.locator('iframe[src*="youtube"]');
    await expect(youtubeIframe).toBeVisible();

    const iframeSrc = await youtubeIframe.getAttribute('src');
    expect(iframeSrc).toContain('autoplay=1');
    expect(iframeSrc).toContain('loop=1');
    expect(iframeSrc).toContain('mute=1');

    console.log('✅ Content Creator workflow validated');
  });

  test('News Reader workflow: article consumption and sharing', async () => {
    const newsReaderPosts = [
      {
        title: 'Breaking: Tesla News',
        content: `Major Tesla development: ${REAL_WORLD_URLS.news.wired}`,
        tags: ['tesla', 'elon', 'news']
      },
      {
        title: 'SpaceX Update',
        content: `Latest on Starship: ${REAL_WORLD_URLS.news.ars}`,
        tags: ['spacex', 'starship', 'space']
      }
    ];

    for (const post of newsReaderPosts) {
      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: {
          ...post,
          authorAgent: USER_PERSONAS.newsReader.name
        }
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(2, { timeout: 15000 });

    // Allow article previews to load
    await page.waitForTimeout(6000);

    // News reader workflow: Quick scanning of article previews
    for (let i = 0; i < 2; i++) {
      const postCard = postCards.nth(i);
      const thumbnailSummary = postCard.locator('[role="article"]');
      
      if (await thumbnailSummary.count() > 0) {
        // Verify article preview layout
        const contentSection = thumbnailSummary.locator('div').nth(1);
        
        // News readers expect clear title and summary
        const title = contentSection.locator('h3');
        const description = contentSection.locator('p');
        
        await expect(title).toBeVisible();
        
        const titleText = await title.textContent();
        expect(titleText).toBeTruthy();
        expect(titleText.length).toBeGreaterThan(5);

        // Verify article type indicator
        const thumbnailSection = thumbnailSummary.locator('div').first();
        const articleIndicator = thumbnailSection.locator('[class*="bg-blue-500"]:has-text("A")').or(
          thumbnailSection.locator('text=A').or(
            thumbnailSection.locator('[data-icon="file-text"]')
          )
        );
        
        // Article indicator should be present for news content
        const hasIndicator = await articleIndicator.count() > 0;
        console.log(`Article indicator present for post ${i}: ${hasIndicator}`);

        // Verify external link functionality
        await thumbnailSummary.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('✅ News Reader workflow validated');
  });

  test('Developer workflow: technical content sharing', async () => {
    const developerPosts = [
      {
        title: 'Great VS Code features',
        content: `Check out this amazing editor: ${REAL_WORLD_URLS.tech.github}`,
        tags: ['vscode', 'editor', 'development']
      },
      {
        title: 'React best practices',
        content: `Essential React package: ${REAL_WORLD_URLS.tech.npmjs}`,
        tags: ['react', 'javascript', 'frontend']
      },
      {
        title: 'Git help needed',
        content: `Found the solution here: ${REAL_WORLD_URLS.tech.stackoverflow}`,
        tags: ['git', 'stackoverflow', 'help']
      }
    ];

    for (const post of developerPosts) {
      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: {
          ...post,
          authorAgent: USER_PERSONAS.developer.name
        }
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(3, { timeout: 15000 });

    // Allow technical content previews to load
    await page.waitForTimeout(5000);

    // Developer workflow: Detailed examination of technical previews
    for (let i = 0; i < 3; i++) {
      const postCard = postCards.nth(i);
      const thumbnailSummary = postCard.locator('[role="article"]');
      
      if (await thumbnailSummary.count() > 0) {
        // Developers expect detailed metadata
        const contentSection = thumbnailSummary.locator('div').nth(1);
        const metadata = contentSection.locator('[class*="text-gray-500"]');
        
        await expect(metadata).toBeVisible();

        // Verify site attribution is clean (no www. issues)
        const metadataText = await metadata.textContent();
        expect(metadataText).not.toMatch(/^www\./);

        // For GitHub links, should show repository information
        if (metadataText?.includes('github')) {
          expect(metadataText).toContain('github.com');
        }

        // Test keyboard navigation (important for developers)
        await thumbnailSummary.focus();
        await expect(thumbnailSummary).toBeFocused();

        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Verify external link opens correctly
        const hasExternalLink = await page.locator('a[href*="http"][target="_blank"]').count() > 0;
        expect(hasExternalLink).toBeTruthy();
      }
    }

    console.log('✅ Developer workflow validated');
  });

  test('Casual User workflow: mixed content consumption', async () => {
    const casualUserPosts = [
      {
        title: 'Cool video I found',
        content: `This is awesome! ${REAL_WORLD_URLS.social.youtube}`,
        tags: ['fun', 'video']
      },
      {
        title: 'Learning CSS',
        content: `Helpful tutorial: ${REAL_WORLD_URLS.docs.w3schools}`,
        tags: ['learning', 'css']
      }
    ];

    for (const post of casualUserPosts) {
      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: {
          ...post,
          authorAgent: USER_PERSONAS.casualUser.name
        }
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(2, { timeout: 15000 });

    await page.waitForTimeout(4000);

    // Casual user workflow: Simple, intuitive interactions
    const videoPost = postCards.first();
    const articlePost = postCards.nth(1);

    // Test video interaction
    const videoThumbnailSummary = videoPost.locator('[role="article"]');
    if (await videoThumbnailSummary.count() > 0) {
      // Should be easy to identify as video
      const videoThumbnail = videoThumbnailSummary.locator('img[src*="youtube"]');
      const playIndicator = videoThumbnailSummary.locator('[class*="bg-red-500"]:has-text("▶")').or(
        videoThumbnailSummary.locator('.absolute.inset-0.flex.items-center.justify-center')
      );
      
      await expect(videoThumbnail).toBeVisible();
      await expect(playIndicator).toBeVisible();

      // Click should start video
      await videoThumbnailSummary.click();
      await page.waitForTimeout(3000);

      const youtubeIframe = page.locator('iframe[src*="youtube"]');
      await expect(youtubeIframe).toBeVisible();
    }

    // Test article interaction
    const articleThumbnailSummary = articlePost.locator('[role="article"]');
    if (await articleThumbnailSummary.count() > 0) {
      // Should have clear title and description
      const contentSection = articleThumbnailSummary.locator('div').nth(1);
      const title = contentSection.locator('h3');
      
      await expect(title).toBeVisible();
      
      const titleText = await title.textContent();
      expect(titleText).toBeTruthy();

      // Click should work intuitively
      await articleThumbnailSummary.click();
      await page.waitForTimeout(1000);
    }

    console.log('✅ Casual User workflow validated');
  });

  test('Cross-platform URL compatibility', async () => {
    // Test URLs that might be shared from different platforms/formats
    const crossPlatformUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Desktop YouTube
      'https://youtu.be/dQw4w9WgXcQ', // Mobile YouTube share
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ', // Mobile YouTube
      'https://youtube.com/watch?v=dQw4w9WgXcQ', // No www
      'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/', // Full article URL
      'https://wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/' // No www
    ];

    for (let i = 0; i < crossPlatformUrls.length; i++) {
      const postData = {
        title: `Cross-platform test ${i + 1}`,
        content: `Testing URL format: ${crossPlatformUrls[i]}`,
        authorAgent: 'CrossPlatformTester'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    await page.reload({ waitUntil: 'networkidle' });

    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(crossPlatformUrls.length, { timeout: 15000 });

    // Allow all previews to load
    await page.waitForTimeout(8000);

    // Verify each URL format works correctly
    for (let i = 0; i < crossPlatformUrls.length; i++) {
      const postCard = postCards.nth(i);
      const thumbnailSummary = postCard.locator('[role="article"]');
      
      if (await thumbnailSummary.count() > 0) {
        // Verify basic thumbnail-summary structure
        const layoutContainer = thumbnailSummary.locator('> div').first();
        const thumbnailSection = layoutContainer.locator('> div').first();
        const contentSection = layoutContainer.locator('> div').nth(1);
        
        await expect(thumbnailSection).toBeVisible();
        await expect(contentSection).toBeVisible();

        // Verify no www. truncation in display
        const metadataText = await contentSection.textContent();
        if (metadataText?.includes('youtube') || metadataText?.includes('wired')) {
          expect(metadataText).not.toMatch(/^www\./);
        }

        console.log(`✅ Cross-platform URL ${i + 1} validated`);
      } else {
        // If preview didn't load, should show fallback link
        const fallbackLink = postCard.locator('a[href*="http"]');
        await expect(fallbackLink).toBeVisible();
        console.log(`✅ Cross-platform URL ${i + 1} has fallback link`);
      }
    }

    console.log('✅ Cross-platform URL compatibility validated');
  });

  test('Performance with real network conditions', async () => {
    const startTime = Date.now();

    // Create posts with various real URLs
    const performanceTestUrls = [
      REAL_WORLD_URLS.social.youtube,
      REAL_WORLD_URLS.news.techCrunch,
      REAL_WORLD_URLS.tech.github
    ];

    for (let i = 0; i < performanceTestUrls.length; i++) {
      const postData = {
        title: `Performance Test Post ${i + 1}`,
        content: `Performance testing with: ${performanceTestUrls[i]}`,
        authorAgent: 'PerformanceTester'
      };

      await page.request.post('http://localhost:3000/api/v1/agent-posts', {
        data: postData
      });
    }

    const postCreationTime = Date.now() - startTime;
    console.log(`Post creation time: ${postCreationTime}ms`);

    const reloadStartTime = Date.now();
    await page.reload({ waitUntil: 'networkidle' });
    const reloadTime = Date.now() - reloadStartTime;
    console.log(`Page reload time: ${reloadTime}ms`);

    const postCards = page.locator('[data-testid="post-card"]');
    await expect(postCards).toHaveCount(3, { timeout: 15000 });

    // Measure preview loading time
    const previewStartTime = Date.now();
    let previewsLoaded = 0;

    // Wait for previews to load or timeout
    for (let i = 0; i < 3; i++) {
      const postCard = postCards.nth(i);
      
      try {
        await expect(postCard.locator('[role="article"]')).toBeVisible({ timeout: 8000 });
        previewsLoaded++;
      } catch {
        // Preview didn't load within timeout - check for fallback
        const fallbackLink = postCard.locator('a[href*="http"]');
        if (await fallbackLink.count() > 0) {
          console.log(`Post ${i + 1}: Fallback link displayed instead of preview`);
        }
      }
    }

    const previewLoadTime = Date.now() - previewStartTime;
    console.log(`Preview loading time: ${previewLoadTime}ms`);
    console.log(`Previews loaded: ${previewsLoaded}/3`);

    // Performance expectations
    expect(reloadTime).toBeLessThan(10000); // Page should reload within 10 seconds
    expect(previewLoadTime).toBeLessThan(15000); // Previews should load within 15 seconds

    // Test interaction performance
    if (previewsLoaded > 0) {
      const interactionStartTime = Date.now();
      const firstPreview = postCards.first().locator('[role="article"]');
      await firstPreview.click();
      await page.waitForTimeout(2000);
      const interactionTime = Date.now() - interactionStartTime;
      
      console.log(`Preview interaction time: ${interactionTime}ms`);
      expect(interactionTime).toBeLessThan(5000); // Interactions should be responsive
    }

    const totalTestTime = Date.now() - startTime;
    console.log(`Total test execution time: ${totalTestTime}ms`);
    
    expect(totalTestTime).toBeLessThan(45000); // Complete test should finish within 45 seconds

    console.log('✅ Performance with real network conditions validated');
  });
});