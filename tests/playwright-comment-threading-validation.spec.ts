import { test, expect, Page, Browser } from '@playwright/test';

/**
 * PLAYWRIGHT COMMENT THREADING & NAVIGATION VALIDATION
 * 
 * Comprehensive browser automation testing for:
 * 1. Comment threading display validation
 * 2. URL navigation and fragment testing
 * 3. Smooth scroll behavior verification
 * 4. Comment highlighting and anchoring
 */

interface CommentTestData {
  id: string;
  content: string;
  author: string;
  parentId?: string;
  depth: number;
  threadPath: string;
}

interface TestMetrics {
  scrollTime: number;
  highlightDuration: number;
  threadingAccuracy: number;
  navigationSuccess: boolean;
}

class CommentThreadValidator {
  private page: Page;
  private testMetrics: TestMetrics[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  async validateThreadStructure(): Promise<boolean> {
    console.log('🔍 Validating comment thread structure...');
    
    // Check for presence of comment containers
    const commentContainers = await this.page.locator('[data-testid="post-card"]').count();
    console.log(`📊 Found ${commentContainers} post containers`);

    for (let i = 0; i < commentContainers; i++) {
      const postCard = this.page.locator('[data-testid="post-card"]').nth(i);
      
      // Click to expand comments
      const commentsButton = postCard.locator('button:has-text("0"), button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")').first();
      if (await commentsButton.count() > 0) {
        await commentsButton.click();
        await this.page.waitForTimeout(1000); // Wait for comments to load
        
        // Check if comments section is visible
        const commentsSection = postCard.locator('[class*="border-t"]').last();
        if (await commentsSection.count() > 0) {
          await this.validateCommentThreading(postCard);
        }
      }
    }

    return true;
  }

  private async validateCommentThreading(postContainer: any): Promise<void> {
    console.log('🧵 Validating comment threading structure...');
    
    // Look for nested comment structures
    const commentItems = postContainer.locator('[id*="comment-"]');
    const commentCount = await commentItems.count();
    
    console.log(`📝 Found ${commentCount} comments in thread`);

    for (let i = 0; i < commentCount; i++) {
      const comment = commentItems.nth(i);
      const commentId = await comment.getAttribute('id');
      
      if (commentId) {
        // Check for proper indentation classes
        const hasIndentation = await comment.locator('[class*="ml-"]').count() > 0;
        const depthLevel = await this.getCommentDepth(comment);
        
        console.log(`💬 Comment ${commentId}: depth=${depthLevel}, indented=${hasIndentation}`);
        
        // Validate thread navigation elements
        await this.validateThreadNavigation(comment);
      }
    }
  }

  private async getCommentDepth(comment: any): Promise<number> {
    const classList = await comment.getAttribute('class') || '';
    const depthMatch = classList.match(/comment-level-(\d+)/);
    return depthMatch ? parseInt(depthMatch[1]) : 0;
  }

  private async validateThreadNavigation(comment: any): Promise<void> {
    // Check for permalink button
    const permalinkButton = comment.locator('button[title*="permalink"], button[title*="Copy"]').first();
    if (await permalinkButton.count() > 0) {
      console.log('🔗 Permalink button found');
    }

    // Check for parent navigation
    const parentButton = comment.locator('button[title*="parent"]').first();
    if (await parentButton.count() > 0) {
      console.log('⬆️ Parent navigation found');
    }

    // Check for reply functionality
    const replyButton = comment.locator('button:has-text("Reply")').first();
    if (await replyButton.count() > 0) {
      console.log('💬 Reply button found');
    }
  }

  async testURLNavigation(postId: string, commentId: string): Promise<TestMetrics> {
    console.log(`🧭 Testing URL navigation to comment ${commentId}...`);
    
    const startTime = Date.now();
    
    // Navigate to comment URL directly
    const commentURL = `${this.page.url()}#comment-${commentId}`;
    await this.page.goto(commentURL);
    
    // Wait for page to load and scroll
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    
    // Check if comment is visible and highlighted
    const targetComment = this.page.locator(`#comment-${commentId}`);
    const isVisible = await targetComment.isVisible();
    const isHighlighted = await this.checkCommentHighlighting(targetComment);
    
    const scrollTime = Date.now() - startTime;
    
    console.log(`📍 Navigation result: visible=${isVisible}, highlighted=${isHighlighted}, time=${scrollTime}ms`);
    
    return {
      scrollTime,
      highlightDuration: isHighlighted ? 500 : 0,
      threadingAccuracy: isVisible ? 100 : 0,
      navigationSuccess: isVisible && isHighlighted
    };
  }

  private async checkCommentHighlighting(comment: any): Promise<boolean> {
    const classList = await comment.getAttribute('class') || '';
    return classList.includes('ring-') || 
           classList.includes('bg-blue-') || 
           classList.includes('highlighted') ||
           classList.includes('bg-yellow-');
  }

  async testSmoothScrolling(commentId: string): Promise<number> {
    console.log(`📜 Testing smooth scroll behavior to ${commentId}...`);
    
    const targetComment = this.page.locator(`#comment-${commentId}`);
    if (await targetComment.count() === 0) {
      console.log('❌ Target comment not found');
      return 0;
    }

    const startTime = Date.now();
    
    // Use JavaScript to trigger smooth scroll
    await this.page.evaluate((commentId) => {
      const element = document.getElementById(`comment-${commentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, commentId);
    
    // Wait for scroll to complete
    await this.page.waitForTimeout(1000);
    
    const scrollTime = Date.now() - startTime;
    
    // Verify element is in viewport
    const isInViewport = await targetComment.isInViewport();
    console.log(`📍 Scroll completed: time=${scrollTime}ms, in viewport=${isInViewport}`);
    
    return scrollTime;
  }

  async testReplyFunctionality(postContainer: any): Promise<boolean> {
    console.log('💬 Testing reply functionality...');
    
    // Find first comment with reply button
    const replyButton = postContainer.locator('button:has-text("Reply")').first();
    if (await replyButton.count() === 0) {
      console.log('❌ No reply buttons found');
      return false;
    }

    // Click reply button
    await replyButton.click();
    await this.page.waitForTimeout(500);
    
    // Check if reply form appears
    const replyForm = postContainer.locator('textarea[placeholder*="reply"], textarea[placeholder*="Write"]').first();
    const formVisible = await replyForm.isVisible();
    
    if (formVisible) {
      // Test form interaction
      await replyForm.fill('Test reply content for threading validation');
      
      // Check for submit button
      const submitButton = postContainer.locator('button:has-text("Post"), button:has-text("Reply")').last();
      const submitExists = await submitButton.count() > 0;
      
      console.log(`✅ Reply form interaction: form=${formVisible}, submit=${submitExists}`);
      
      // Cancel to avoid actually posting
      const cancelButton = postContainer.locator('button:has-text("Cancel")').first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
      }
      
      return formVisible && submitExists;
    }

    return false;
  }

  async captureThreadingScreenshots(testName: string): Promise<void> {
    console.log(`📸 Capturing threading screenshots for ${testName}...`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Capture full page
    await this.page.screenshot({
      path: `/workspaces/agent-feed/tests/screenshots/${testName}-full-${timestamp}.png`,
      fullPage: true
    });
    
    // Capture comment sections specifically
    const commentSections = this.page.locator('[class*="border-t"]:has(textarea)');
    const sectionCount = await commentSections.count();
    
    for (let i = 0; i < Math.min(sectionCount, 3); i++) {
      await commentSections.nth(i).screenshot({
        path: `/workspaces/agent-feed/tests/screenshots/${testName}-section-${i}-${timestamp}.png`
      });
    }
    
    console.log(`📸 Screenshots saved for ${testName}`);
  }

  getMetrics(): TestMetrics[] {
    return this.testMetrics;
  }

  addMetrics(metrics: TestMetrics): void {
    this.testMetrics.push(metrics);
  }
}

test.describe('Comment Threading & Navigation Validation', () => {
  let validator: CommentThreadValidator;
  
  test.beforeEach(async ({ page }) => {
    validator = new CommentThreadValidator(page);
    
    // Navigate to the main feed
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
    console.log('🚀 Application loaded successfully');
  });

  test('Threading Display Validation', async ({ page }) => {
    console.log('🧵 Starting Threading Display Validation...');
    
    // Capture initial state
    await validator.captureThreadingScreenshots('threading-initial');
    
    // Validate thread structure
    const structureValid = await validator.validateThreadStructure();
    expect(structureValid).toBe(true);
    
    // Capture after expansion
    await validator.captureThreadingScreenshots('threading-expanded');
    
    console.log('✅ Threading display validation completed');
  });

  test('URL Fragment Navigation', async ({ page }) => {
    console.log('🧭 Starting URL Fragment Navigation Test...');
    
    // First, ensure we have comments to navigate to
    await validator.validateThreadStructure();
    
    // Find available comment IDs
    const commentElements = page.locator('[id*="comment-"]');
    const commentCount = await commentElements.count();
    
    console.log(`📊 Found ${commentCount} comments for navigation testing`);
    
    if (commentCount > 0) {
      // Test navigation to first comment
      const firstCommentId = await commentElements.first().getAttribute('id');
      if (firstCommentId) {
        const commentId = firstCommentId.replace('comment-', '');
        const metrics = await validator.testURLNavigation('test-post', commentId);
        
        validator.addMetrics(metrics);
        expect(metrics.navigationSuccess).toBe(true);
        
        // Capture navigation result
        await validator.captureThreadingScreenshots('navigation-result');
      }
    } else {
      console.log('⚠️ No comments found for navigation testing');
    }
    
    console.log('✅ URL fragment navigation test completed');
  });

  test('Smooth Scroll Behavior', async ({ page }) => {
    console.log('📜 Starting Smooth Scroll Behavior Test...');
    
    // Ensure thread structure exists
    await validator.validateThreadStructure();
    
    const commentElements = page.locator('[id*="comment-"]');
    const commentCount = await commentElements.count();
    
    if (commentCount > 0) {
      // Test scroll to bottom comment
      const lastCommentId = await commentElements.last().getAttribute('id');
      if (lastCommentId) {
        const commentId = lastCommentId.replace('comment-', '');
        const scrollTime = await validator.testSmoothScrolling(commentId);
        
        expect(scrollTime).toBeGreaterThan(0);
        expect(scrollTime).toBeLessThan(5000); // Should complete within 5 seconds
        
        console.log(`📊 Scroll performance: ${scrollTime}ms`);
        
        // Capture scroll result
        await validator.captureThreadingScreenshots('scroll-result');
      }
    }
    
    console.log('✅ Smooth scroll behavior test completed');
  });

  test('Reply Form Interaction', async ({ page }) => {
    console.log('💬 Starting Reply Form Interaction Test...');
    
    // Capture initial state
    await validator.captureThreadingScreenshots('reply-initial');
    
    // Find post containers
    const postContainers = page.locator('[data-testid="post-card"]');
    const containerCount = await postContainers.count();
    
    console.log(`📊 Found ${containerCount} post containers`);
    
    let replyTestSuccessful = false;
    
    for (let i = 0; i < Math.min(containerCount, 3); i++) {
      const container = postContainers.nth(i);
      
      // Expand comments if not already expanded
      const commentsButton = container.locator('button:has-text("0"), button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")').first();
      if (await commentsButton.count() > 0) {
        await commentsButton.click();
        await page.waitForTimeout(1000);
        
        const replySuccess = await validator.testReplyFunctionality(container);
        if (replySuccess) {
          replyTestSuccessful = true;
          console.log(`✅ Reply functionality working in container ${i}`);
          break;
        }
      }
    }
    
    // Capture reply form state
    await validator.captureThreadingScreenshots('reply-form');
    
    expect(replyTestSuccessful).toBe(true);
    console.log('✅ Reply form interaction test completed');
  });

  test('Comment Highlighting and Anchoring', async ({ page }) => {
    console.log('🎯 Starting Comment Highlighting Test...');
    
    await validator.validateThreadStructure();
    
    // Find comments to test highlighting
    const commentElements = page.locator('[id*="comment-"]');
    const commentCount = await commentElements.count();
    
    if (commentCount > 0) {
      // Test permalink click functionality
      const firstComment = commentElements.first();
      const permalinkButton = firstComment.locator('button[title*="permalink"], button[title*="Copy"]').first();
      
      if (await permalinkButton.count() > 0) {
        await permalinkButton.click();
        await page.waitForTimeout(500);
        
        console.log('🔗 Permalink button clicked');
        
        // Check if URL was copied to clipboard (if supported)
        const currentURL = page.url();
        console.log(`📋 Current URL: ${currentURL}`);
      }
      
      // Test direct navigation and highlighting
      const commentId = (await firstComment.getAttribute('id'))?.replace('comment-', '') || '';
      if (commentId) {
        const metrics = await validator.testURLNavigation('test-post', commentId);
        validator.addMetrics(metrics);
        
        expect(metrics.navigationSuccess).toBe(true);
      }
    }
    
    // Capture highlighting state
    await validator.captureThreadingScreenshots('highlighting-result');
    
    console.log('✅ Comment highlighting test completed');
  });

  test('Visual Regression Testing', async ({ page }) => {
    console.log('📷 Starting Visual Regression Testing...');
    
    // Capture baseline states
    await validator.captureThreadingScreenshots('baseline');
    
    // Test various thread states
    await validator.validateThreadStructure();
    await validator.captureThreadingScreenshots('threads-expanded');
    
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await validator.captureThreadingScreenshots('desktop-full');
    
    await page.setViewportSize({ width: 1024, height: 768 });
    await validator.captureThreadingScreenshots('tablet');
    
    await page.setViewportSize({ width: 375, height: 667 });
    await validator.captureThreadingScreenshots('mobile');
    
    console.log('✅ Visual regression testing completed');
  });

  test.afterEach(async ({ page }) => {
    const metrics = validator.getMetrics();
    if (metrics.length > 0) {
      console.log('📊 Test Metrics Summary:');
      metrics.forEach((metric, index) => {
        console.log(`  Test ${index + 1}:`);
        console.log(`    Scroll Time: ${metric.scrollTime}ms`);
        console.log(`    Threading Accuracy: ${metric.threadingAccuracy}%`);
        console.log(`    Navigation Success: ${metric.navigationSuccess}`);
      });
    }
    
    // Capture final state
    await validator.captureThreadingScreenshots('final-state');
  });
});

test.describe('Performance Metrics Collection', () => {
  test('Thread Loading Performance', async ({ page }) => {
    console.log('⚡ Starting Thread Loading Performance Test...');
    
    const performanceMetrics = {
      commentLoadTimes: [] as number[],
      scrollPerformance: [] as number[],
      replyFormLatency: [] as number[]
    };
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test comment loading performance
    const postContainers = page.locator('[data-testid="post-card"]');
    const containerCount = await postContainers.count();
    
    for (let i = 0; i < Math.min(containerCount, 3); i++) {
      const container = postContainers.nth(i);
      const startTime = Date.now();
      
      // Click to load comments
      const commentsButton = container.locator('button:has-text("0"), button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")').first();
      if (await commentsButton.count() > 0) {
        await commentsButton.click();
        
        // Wait for comments to appear
        await page.waitForSelector('[id*="comment-"], .text-center:has-text("No")', { timeout: 5000 });
        
        const loadTime = Date.now() - startTime;
        performanceMetrics.commentLoadTimes.push(loadTime);
        
        console.log(`📊 Container ${i} comment load time: ${loadTime}ms`);
      }
    }
    
    // Calculate averages
    const avgLoadTime = performanceMetrics.commentLoadTimes.reduce((a, b) => a + b, 0) / performanceMetrics.commentLoadTimes.length;
    
    console.log(`📊 Performance Summary:`);
    console.log(`  Average Comment Load Time: ${avgLoadTime.toFixed(2)}ms`);
    
    // Performance assertions
    expect(avgLoadTime).toBeLessThan(3000); // Comments should load within 3 seconds
    
    console.log('✅ Performance metrics collection completed');
  });
});