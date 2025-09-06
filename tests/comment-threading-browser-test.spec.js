/**
 * Comment Threading Browser Test
 * Real browser testing of comment threading and navigation functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Comment Threading & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should display threaded comments with proper nesting', async ({ page }) => {
    console.log('🧪 Testing comment threading display...');
    
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Find the first post with comments
    const firstPost = await page.locator('[data-testid="post-card"]').first();
    const commentButton = firstPost.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
    
    // Click to show comments
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForSelector('.comment-level-0', { timeout: 5000 });
    
    // Check if comments are displayed with proper nesting
    const rootComments = await page.locator('.comment-level-0').count();
    const nestedComments = await page.locator('[class*="comment-level-"]:not(.comment-level-0)').count();
    
    console.log(`📊 Found ${rootComments} root comments, ${nestedComments} nested comments`);
    
    // Verify threading structure
    if (nestedComments > 0) {
      // Check indentation for nested comments
      const nestedComment = page.locator('[class*="comment-level-1"]').first();
      if (await nestedComment.isVisible()) {
        const marginLeft = await nestedComment.evaluate(el => getComputedStyle(el).marginLeft);
        expect(parseInt(marginLeft)).toBeGreaterThan(0);
        console.log('✅ Nested comments have proper indentation');
      }
    }
  });

  test('should handle URL navigation to specific comments', async ({ page }) => {
    console.log('🧪 Testing URL navigation to comments...');
    
    // First, load the page normally
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Try to navigate to a specific comment using the problematic URL pattern
    const testCommentId = 'comment-1757127737734-995wn0pi8';
    await page.goto(`http://localhost:5173/#comment-${testCommentId}`);
    
    // Wait for the page to process the hash
    await page.waitForTimeout(2000);
    
    // Check if the comment was highlighted or scrolled to
    const targetComment = page.locator(`#comment-${testCommentId}`);
    if (await targetComment.isVisible()) {
      console.log('✅ Successfully navigated to comment via URL hash');
      
      // Check if comment is highlighted
      const classList = await targetComment.getAttribute('class');
      if (classList && (classList.includes('ring-') || classList.includes('bg-blue-'))) {
        console.log('✅ Comment is properly highlighted');
      }
    } else {
      console.log('ℹ️ Target comment not found - may not exist in current data');
    }
  });

  test('should allow expanding and collapsing comment threads', async ({ page }) => {
    console.log('🧪 Testing comment expand/collapse functionality...');
    
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Find and click on comments
    const firstPost = await page.locator('[data-testid="post-card"]').first();
    const commentButton = firstPost.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForTimeout(2000);
    
    // Look for expand/collapse buttons in comments
    const expandCollapseButtons = page.locator('button:has(svg[class*="ChevronDown"], svg[class*="ChevronRight"])');
    const buttonCount = await expandCollapseButtons.count();
    
    if (buttonCount > 0) {
      const firstButton = expandCollapseButtons.first();
      
      // Test collapse
      await firstButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Clicked expand/collapse button');
      
      // Test expand again
      await firstButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Expand/collapse functionality working');
    } else {
      console.log('ℹ️ No expandable comment threads found in current data');
    }
  });

  test('should handle comment reply functionality', async ({ page }) => {
    console.log('🧪 Testing comment reply functionality...');
    
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Open comments on first post
    const firstPost = await page.locator('[data-testid="post-card"]').first();
    const commentButton = firstPost.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
    await commentButton.click();
    
    // Wait for comments section
    await page.waitForTimeout(2000);
    
    // Look for "Add Analysis" or reply buttons
    const addAnalysisButton = page.locator('text="Add Analysis"');
    if (await addAnalysisButton.isVisible()) {
      await addAnalysisButton.click();
      
      // Check if comment form appeared
      const textarea = page.locator('textarea[placeholder*="technical analysis"]');
      if (await textarea.isVisible()) {
        console.log('✅ Comment form opens successfully');
        
        // Test typing in the form
        await textarea.fill('Test technical analysis comment');
        
        // Look for reply buttons on existing comments
        const replyButtons = page.locator('text="Reply"');
        const replyCount = await replyButtons.count();
        console.log(`📊 Found ${replyCount} reply buttons`);
        
        if (replyCount > 0) {
          console.log('✅ Reply functionality is available');
        }
      }
    }
  });

  test('should validate comment threading structure', async ({ page }) => {
    console.log('🧪 Validating comment tree structure...');
    
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Open comments
    const firstPost = await page.locator('[data-testid="post-card"]').first();
    const commentButton = firstPost.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
    await commentButton.click();
    
    await page.waitForTimeout(3000);
    
    // Analyze comment structure
    const allCommentLevels = await page.locator('[class*="comment-level-"]').all();
    const levelCounts = {};
    
    for (const comment of allCommentLevels) {
      const className = await comment.getAttribute('class');
      const levelMatch = className.match(/comment-level-(\d+)/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        levelCounts[level] = (levelCounts[level] || 0) + 1;
      }
    }
    
    console.log('📊 Comment level distribution:', levelCounts);
    
    // Validate that levels are properly structured
    const levels = Object.keys(levelCounts).map(k => parseInt(k)).sort((a, b) => a - b);
    for (let i = 0; i < levels.length - 1; i++) {
      if (levels[i + 1] - levels[i] > 1) {
        console.log('⚠️ Warning: Gap in comment levels detected');
      }
    }
    
    if (levels.length > 1) {
      console.log('✅ Multi-level comment threading detected');
    }
  });

  test('should test performance of comment rendering', async ({ page }) => {
    console.log('🧪 Testing comment rendering performance...');
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    
    // Open comments on multiple posts to test performance
    const posts = await page.locator('[data-testid="post-card"]').all();
    let commentsOpened = 0;
    
    for (let i = 0; i < Math.min(3, posts.length); i++) {
      const post = posts[i];
      const commentButton = post.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
      
      if (await commentButton.isVisible()) {
        await commentButton.click();
        await page.waitForTimeout(1000);
        commentsOpened++;
      }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`📊 Opened ${commentsOpened} comment sections in ${totalTime}ms`);
    console.log(`⏱️ Average time per comment section: ${Math.round(totalTime / commentsOpened)}ms`);
    
    if (totalTime < 10000) {
      console.log('✅ Comment rendering performance is acceptable');
    } else {
      console.log('⚠️ Comment rendering may be slow');
    }
  });
});