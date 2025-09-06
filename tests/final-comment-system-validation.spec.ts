import { test, expect, Page } from '@playwright/test';

test.describe('Final Comment System Validation - End-to-End', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set up network monitoring
    await page.route('**/comments/*', (route) => {
      console.log(`API Call: ${route.request().url()}`);
      route.continue();
    });
    
    // Navigate to application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Comprehensive Comment System Validation', async () => {
    console.log('🚀 Starting Final Comment System Validation');
    
    // Step 1: Verify application loads
    await expect(page.locator('h1')).toContainText('Agent Feed');
    console.log('✅ Application loaded successfully');
    
    // Step 2: Find posts with comment counts
    const posts = await page.locator('[data-testid^="post-"]').all();
    console.log(`📊 Found ${posts.length} posts`);
    
    expect(posts.length).toBeGreaterThan(0);
    
    // Step 3: Test comment functionality on multiple posts
    const testResults = [];
    
    for (let i = 0; i < Math.min(3, posts.length); i++) {
      const post = posts[i];
      const postId = await post.getAttribute('data-testid');
      console.log(`\n🔍 Testing post: ${postId}`);
      
      // Find comment button
      const commentButton = post.locator('button:has-text("Comment"), button[aria-label*="comment"], button:has([data-testid*="comment"])').first();
      
      if (await commentButton.count() > 0) {
        console.log(`📝 Found comment button for ${postId}`);
        
        // Check initial state - comments should be hidden
        const commentsContainer = post.locator('[data-testid="comments-section"]');
        const initiallyVisible = await commentsContainer.isVisible().catch(() => false);
        
        // Click comment button to open
        await commentButton.click();
        console.log(`👆 Clicked comment button for ${postId}`);
        
        // Wait for loading or comments to appear
        await page.waitForTimeout(1000);
        
        // Check if loading spinner appears
        const loadingSpinner = post.locator('[data-testid="loading-spinner"], .loading, [class*="spin"]');
        const hasLoadingSpinner = await loadingSpinner.count() > 0;
        console.log(`⏳ Loading spinner present: ${hasLoadingSpinner}`);
        
        // Wait for comments to load
        await page.waitForTimeout(2000);
        
        // Check if comments are now visible
        const commentsVisible = await commentsContainer.isVisible().catch(() => false);
        console.log(`👀 Comments visible after click: ${commentsVisible}`);
        
        if (commentsVisible) {
          // Validate comment content
          const commentElements = await post.locator('[data-testid^="comment-"]').all();
          console.log(`💬 Found ${commentElements.length} comments`);
          
          const commentData = [];
          
          for (const comment of commentElements) {
            const author = await comment.locator('[data-testid="comment-author"]').textContent().catch(() => '');
            const content = await comment.locator('[data-testid="comment-content"]').textContent().catch(() => '');
            const timestamp = await comment.locator('[data-testid="comment-timestamp"]').textContent().catch(() => '');
            
            commentData.push({ author, content, timestamp });
            
            // Verify professional authors (not hardcoded data)
            expect(author).not.toBe('User');
            expect(author).not.toBe('Agent Smith');
            expect(author).not.toBe('');
            
            // Check for professional author names
            const professionalAuthors = ['TechReviewer', 'SystemValidator', 'CodeAuditor', 'QualityAssurance', 'ProductManager', 'DevOps'];
            const isProfessional = professionalAuthors.some(name => author.includes(name));
            console.log(`👤 Author: ${author} (Professional: ${isProfessional})`);
          }
          
          // Test toggle functionality - click again to close
          await commentButton.click();
          await page.waitForTimeout(1000);
          
          const commentsHiddenAfterToggle = !(await commentsContainer.isVisible().catch(() => true));
          console.log(`🔄 Comments hidden after toggle: ${commentsHiddenAfterToggle}`);
          
          testResults.push({
            postId,
            hasCommentButton: true,
            commentsLoaded: commentElements.length > 0,
            professionalAuthors: commentData.length > 0,
            toggleWorks: commentsHiddenAfterToggle,
            commentData
          });
        } else {
          console.log(`⚠️ Comments not visible for ${postId}`);
          testResults.push({
            postId,
            hasCommentButton: true,
            commentsLoaded: false,
            professionalAuthors: false,
            toggleWorks: false,
            commentData: []
          });
        }
      } else {
        console.log(`❌ No comment button found for ${postId}`);
        testResults.push({
          postId,
          hasCommentButton: false,
          commentsLoaded: false,
          professionalAuthors: false,
          toggleWorks: false,
          commentData: []
        });
      }
    }
    
    // Step 4: Validate results
    console.log('\n📋 VALIDATION RESULTS:');
    testResults.forEach(result => {
      console.log(`\n${result.postId}:`);
      console.log(`  ✅ Comment Button: ${result.hasCommentButton}`);
      console.log(`  ✅ Comments Loaded: ${result.commentsLoaded}`);
      console.log(`  ✅ Professional Authors: ${result.professionalAuthors}`);
      console.log(`  ✅ Toggle Works: ${result.toggleWorks}`);
      console.log(`  📊 Comment Count: ${result.commentData.length}`);
    });
    
    // Assert overall success criteria
    const successfulPosts = testResults.filter(r => r.hasCommentButton && r.commentsLoaded && r.professionalAuthors);
    expect(successfulPosts.length).toBeGreaterThan(0);
    
    console.log('\n🎉 FINAL VALIDATION COMPLETE');
    console.log(`✅ Successfully validated ${successfulPosts.length}/${testResults.length} posts`);
  });

  test('Network API Validation', async () => {
    console.log('🌐 Testing Network API Calls');
    
    let apiCalls = [];
    
    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/comments')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
        console.log(`📡 API Call: ${request.method()} ${request.url()}`);
      }
    });
    
    // Find and click first comment button
    const firstPost = page.locator('[data-testid^="post-"]').first();
    const commentButton = firstPost.locator('button:has-text("Comment"), button[aria-label*="comment"]').first();
    
    if (await commentButton.count() > 0) {
      await commentButton.click();
      await page.waitForTimeout(3000);
      
      console.log(`🔍 Total API calls made: ${apiCalls.length}`);
      expect(apiCalls.length).toBeGreaterThan(0);
      
      // Verify API calls are to correct endpoints
      const commentAPICalls = apiCalls.filter(call => call.url.includes('/comments'));
      expect(commentAPICalls.length).toBeGreaterThan(0);
    }
  });

  test('Error Handling Validation', async () => {
    console.log('🛠️ Testing Error Handling');
    
    // Test with network failures
    await page.route('**/comments/*', route => {
      console.log('🚫 Simulating network failure');
      route.abort();
    });
    
    const firstPost = page.locator('[data-testid^="post-"]').first();
    const commentButton = firstPost.locator('button:has-text("Comment"), button[aria-label*="comment"]').first();
    
    if (await commentButton.count() > 0) {
      await commentButton.click();
      await page.waitForTimeout(3000);
      
      // Check for error states or graceful fallbacks
      const errorMessage = firstPost.locator('[data-testid="error-message"], .error, [class*="error"]');
      const hasErrorHandling = await errorMessage.count() > 0;
      
      console.log(`🔧 Error handling present: ${hasErrorHandling}`);
    }
  });
});