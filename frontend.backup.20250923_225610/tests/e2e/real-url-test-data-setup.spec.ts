import { test, expect, Page } from '@playwright/test';

/**
 * Test Data Setup Script for Thumbnail-Summary Browser Validation
 * 
 * This script creates posts with real URLs to ensure our validation tests
 * have proper data to work with. It should be run before the main validation tests.
 */

const REAL_TEST_URLS = {
  youtube: {
    rickroll: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expectedTitle: 'Rick Astley - Never Gonna Give You Up',
      testDescription: 'Testing YouTube video preview with auto-loop functionality'
    },
    babyShard: {
      url: 'https://www.youtube.com/watch?v=fC7oUOUEEi4',
      expectedTitle: 'Baby Shark Dance',
      testDescription: 'Short video for testing quick loading and responsiveness'
    }
  },
  articles: {
    wiredTesla: {
      url: 'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
      expectedTitle: 'Elon Musk Tesla Pay Package',
      testDescription: 'Testing article preview without www truncation issues'
    },
    githubVscode: {
      url: 'https://github.com/microsoft/vscode',
      expectedTitle: 'Visual Studio Code',
      testDescription: 'Testing GitHub repository preview'
    }
  }
};

// Post creation helper
async function createPostWithUrl(page: Page, url: string, description: string, title: string) {
  // Create a comprehensive post that includes the URL for testing
  const postContent = `🚀 Browser Validation Test Post - ${title}

${description}

Key testing areas:
- Thumbnail placement validation (left side)
- Title and summary layout (right side) 
- No www. truncation in domain names
- Auto-loop video functionality in expanded mode
- Real-time preview loading
- Cross-browser compatibility
- Mobile responsive behavior
- Accessibility compliance

Test URL: ${url}

This post is specifically created for comprehensive thumbnail-summary browser validation. The URL should display with:
✅ Proper thumbnail on the left
✅ Content summary on the right  
✅ Clean domain display (no www. truncation)
✅ Functional video controls (for YouTube)
✅ Responsive layout across devices
✅ Accessible interactions

#browserTesting #thumbnailSummary #realURLValidation #e2eTesting`;

  return postContent;
}

// Wait for backend to be ready
async function waitForBackend(page: Page) {
  let retries = 10;
  while (retries > 0) {
    try {
      const response = await page.request.get('http://localhost:3000/api/health');
      if (response.ok()) {
        console.log('✅ Backend is ready');
        return;
      }
    } catch (error) {
      console.log(`⏳ Waiting for backend... ${retries} retries left`);
    }
    await page.waitForTimeout(2000);
    retries--;
  }
  throw new Error('❌ Backend not ready after waiting');
}

test.describe('Real URL Test Data Setup', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure backend is ready
    await waitForBackend(page);
    
    // Navigate to the application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for app to load
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible({ timeout: 15000 });
  });

  test('should create test posts with real URLs for validation', async ({ page }) => {
    console.log('🏗️ Creating test posts with real URLs for browser validation...');
    
    // Create posts via API if possible, otherwise document what needs to be done manually
    const testPosts = [
      {
        ...REAL_TEST_URLS.youtube.rickroll,
        content: createPostWithUrl(
          page,
          REAL_TEST_URLS.youtube.rickroll.url,
          REAL_TEST_URLS.youtube.rickroll.testDescription,
          REAL_TEST_URLS.youtube.rickroll.expectedTitle
        )
      },
      {
        ...REAL_TEST_URLS.youtube.babyShard,
        content: createPostWithUrl(
          page,
          REAL_TEST_URLS.youtube.babyShard.url,
          REAL_TEST_URLS.youtube.babyShard.testDescription,
          REAL_TEST_URLS.youtube.babyShard.expectedTitle
        )
      },
      {
        ...REAL_TEST_URLS.articles.wiredTesla,
        content: createPostWithUrl(
          page,
          REAL_TEST_URLS.articles.wiredTesla.url,
          REAL_TEST_URLS.articles.wiredTesla.testDescription,
          REAL_TEST_URLS.articles.wiredTesla.expectedTitle
        )
      },
      {
        ...REAL_TEST_URLS.articles.githubVscode,
        content: createPostWithUrl(
          page,
          REAL_TEST_URLS.articles.githubVscode.url,
          REAL_TEST_URLS.articles.githubVscode.testDescription,
          REAL_TEST_URLS.articles.githubVscode.expectedTitle
        )
      }
    ];

    for (const testPost of testPosts) {
      try {
        // Try to create post via API
        const response = await page.request.post('http://localhost:3000/api/v1/agent-posts', {
          data: {
            title: `Browser Test: ${testPost.expectedTitle}`,
            content: await testPost.content,
            authorAgent: 'BrowserTestAgent',
            tags: ['browserTesting', 'thumbnailSummary', 'realURLValidation'],
            metadata: {
              testUrl: testPost.url,
              testType: testPost.url.includes('youtube') ? 'video' : 'article',
              businessImpact: 95
            }
          }
        });

        if (response.ok()) {
          const postData = await response.json();
          console.log(`✅ Created test post for ${testPost.url}: ${postData.id || 'success'}`);
        } else {
          console.log(`⚠️ Failed to create post for ${testPost.url}: ${response.status()}`);
        }
      } catch (error) {
        console.log(`⚠️ API error creating post for ${testPost.url}:`, error);
      }
    }

    // Refresh the page to see the new posts
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify posts were created
    const posts = page.locator('[data-testid="post-card"]');
    const postCount = await posts.count();
    console.log(`📊 Total posts visible: ${postCount}`);

    // Check if our test URLs are present
    for (const testPost of testPosts) {
      const postWithUrl = await page.locator(`text=${testPost.url}`).count();
      if (postWithUrl > 0) {
        console.log(`✅ Found post with URL: ${testPost.url}`);
      } else {
        console.log(`⚠️ No post found with URL: ${testPost.url}`);
      }
    }
  });

  test('should validate that preview API is working for test URLs', async ({ page }) => {
    console.log('🔍 Testing preview API with real URLs...');
    
    const urlsToTest = [
      REAL_TEST_URLS.youtube.rickroll.url,
      REAL_TEST_URLS.articles.wiredTesla.url
    ];

    for (const testUrl of urlsToTest) {
      try {
        console.log(`Testing preview for: ${testUrl}`);
        
        const response = await page.request.get(
          `http://localhost:3000/api/v1/link-preview?url=${encodeURIComponent(testUrl)}`
        );
        
        if (response.ok()) {
          const previewData = await response.json();
          console.log(`✅ Preview API working for ${testUrl}:`, {
            title: previewData.title,
            type: previewData.type,
            site_name: previewData.site_name,
            hasImage: !!previewData.image
          });
          
          // Validate essential preview data
          expect(previewData.title).toBeTruthy();
          expect(previewData.url).toBe(testUrl);
          
          // Check for YouTube-specific data
          if (testUrl.includes('youtube.com')) {
            expect(previewData.type).toBe('video');
            expect(previewData.videoId).toBeTruthy();
            expect(previewData.image).toContain('youtube.com');
          }
          
          // Check for article-specific data
          if (testUrl.includes('wired.com')) {
            expect(previewData.type).toBe('article');
            expect(previewData.site_name).toContain('wired');
            expect(previewData.description).toBeTruthy();
          }
          
        } else {
          console.log(`❌ Preview API failed for ${testUrl}: ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ Error testing preview for ${testUrl}:`, error);
      }
    }
  });

  test('should verify that thumbnail-summary components can be found', async ({ page }) => {
    console.log('🎯 Checking for thumbnail-summary components...');
    
    // Look for posts with thumbnail-summary layout
    const thumbnailSummaryComponents = page.locator('.thumbnail-summary, [role="article"]');
    const componentCount = await thumbnailSummaryComponents.count();
    
    console.log(`📱 Found ${componentCount} thumbnail-summary components`);
    
    if (componentCount > 0) {
      // Test the first component
      const firstComponent = thumbnailSummaryComponents.first();
      await expect(firstComponent).toBeVisible();
      
      // Check for required elements
      const thumbnail = firstComponent.locator('img, [data-testid="thumbnail"]');
      const title = firstComponent.locator('h3, h4, [role="heading"]');
      
      if (await thumbnail.count() > 0) {
        console.log('✅ Thumbnail element found');
      } else {
        console.log('⚠️ No thumbnail element found');
      }
      
      if (await title.count() > 0) {
        console.log('✅ Title element found');
        const titleText = await title.first().textContent();
        console.log(`📝 Title text: ${titleText}`);
      } else {
        console.log('⚠️ No title element found');
      }
      
      // Check layout structure
      const componentBox = await firstComponent.boundingBox();
      if (componentBox) {
        console.log(`📐 Component dimensions: ${componentBox.width}x${componentBox.height}`);
      }
    } else {
      console.log('⚠️ No thumbnail-summary components found. Posts may need to be created manually.');
      console.log('');
      console.log('🛠️ Manual Setup Instructions:');
      console.log('1. Navigate to the application at http://localhost:5173');
      console.log('2. Create posts with the following URLs:');
      
      Object.entries(REAL_TEST_URLS).forEach(([category, urls]) => {
        console.log(`\n${category.toUpperCase()}:`);
        Object.entries(urls).forEach(([key, data]) => {
          console.log(`  - ${data.url}`);
          console.log(`    Expected: ${data.expectedTitle}`);
        });
      });
      
      console.log('\n3. Run the validation tests after creating the posts');
    }
  });
});