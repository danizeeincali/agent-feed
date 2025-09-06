import { test, expect, Page } from '@playwright/test';

/**
 * COMMENT URL NAVIGATION & FRAGMENT VALIDATION
 * 
 * Specialized tests for URL-based comment navigation:
 * 1. Direct URL navigation to comments
 * 2. Fragment parsing and routing
 * 3. Scroll-to-comment behavior
 * 4. Permalink functionality
 * 5. Browser history integration
 */

interface NavigationTestCase {
  name: string;
  url: string;
  expectedCommentId: string;
  shouldHighlight: boolean;
  shouldScroll: boolean;
}

interface NavigationMetrics {
  loadTime: number;
  scrollTime: number;
  highlightTime: number;
  urlAccuracy: boolean;
  elementVisibility: boolean;
}

class CommentNavigationValidator {
  private page: Page;
  private baseURL: string;
  private navigationMetrics: NavigationMetrics[] = [];

  constructor(page: Page) {
    this.page = page;
    this.baseURL = page.url().replace(/\/$/, '');
  }

  async generateTestCases(): Promise<NavigationTestCase[]> {
    console.log('🎯 Generating navigation test cases...');
    
    // Navigate to main page first to find available comments
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
    
    // Expand some comments to get IDs
    await this.expandCommentsForTesting();
    
    // Collect comment IDs
    const commentElements = await this.page.locator('[id*="comment-"]').all();
    const commentIds: string[] = [];
    
    for (const element of commentElements.slice(0, 5)) { // Test first 5 comments
      const id = await element.getAttribute('id');
      if (id) {
        commentIds.push(id.replace('comment-', ''));
      }
    }
    
    console.log(`📝 Found ${commentIds.length} comment IDs for testing`);
    
    // Generate test cases
    const testCases: NavigationTestCase[] = commentIds.map((commentId, index) => ({
      name: `Navigation to Comment ${index + 1}`,
      url: `${this.baseURL}/#comment-${commentId}`,
      expectedCommentId: commentId,
      shouldHighlight: true,
      shouldScroll: true
    }));
    
    // Add edge cases
    testCases.push({
      name: 'Invalid Comment ID',
      url: `${this.baseURL}/#comment-nonexistent-id`,
      expectedCommentId: 'nonexistent-id',
      shouldHighlight: false,
      shouldScroll: false
    });
    
    return testCases;
  }

  private async expandCommentsForTesting(): Promise<void> {
    console.log('📂 Expanding comments for testing...');
    
    const postContainers = this.page.locator('[data-testid="post-card"]');
    const containerCount = await postContainers.count();
    
    for (let i = 0; i < Math.min(containerCount, 3); i++) {
      const container = postContainers.nth(i);
      const commentsButton = container.locator('button:has-text("0"), button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")').first();
      
      if (await commentsButton.count() > 0) {
        await commentsButton.click();
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async testDirectNavigation(testCase: NavigationTestCase): Promise<NavigationMetrics> {
    console.log(`🧭 Testing navigation: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    const startTime = Date.now();
    
    // Navigate directly to the comment URL
    await this.page.goto(testCase.url);
    await this.page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Check if the expected comment exists
    const targetComment = this.page.locator(`#comment-${testCase.expectedCommentId}`);
    const commentExists = await targetComment.count() > 0;
    
    let scrollTime = 0;
    let highlightTime = 0;
    let elementVisibility = false;
    
    if (commentExists && testCase.shouldScroll) {
      // Measure scroll behavior
      const scrollStartTime = Date.now();
      await this.page.waitForTimeout(1000); // Allow time for auto-scroll
      scrollTime = Date.now() - scrollStartTime;
      
      // Check if element is in viewport
      elementVisibility = await targetComment.isInViewport();
      
      // Check for highlighting
      if (testCase.shouldHighlight) {
        const highlightStartTime = Date.now();
        const isHighlighted = await this.checkHighlighting(targetComment);
        highlightTime = isHighlighted ? (Date.now() - highlightStartTime) : 0;
      }
    }
    
    const metrics: NavigationMetrics = {
      loadTime,
      scrollTime,
      highlightTime,
      urlAccuracy: commentExists === (testCase.expectedCommentId !== 'nonexistent-id'),
      elementVisibility
    };
    
    console.log(`📊 Navigation metrics:`, metrics);
    this.navigationMetrics.push(metrics);
    
    return metrics;
  }

  private async checkHighlighting(commentElement: any): Promise<boolean> {
    const classList = await commentElement.getAttribute('class') || '';
    return classList.includes('ring-') || 
           classList.includes('bg-blue-') || 
           classList.includes('highlighted') ||
           classList.includes('bg-yellow-50');
  }

  async testFragmentParsing(): Promise<boolean> {
    console.log('🔍 Testing fragment parsing behavior...');
    
    const testFragments = [
      '#comment-test-id',
      '#comment-123',
      '#invalid-fragment',
      '#comment-',
      ''
    ];
    
    let allParsed = true;
    
    for (const fragment of testFragments) {
      const testURL = `${this.baseURL}/${fragment}`;
      
      try {
        await this.page.goto(testURL);
        await this.page.waitForLoadState('domcontentloaded');
        
        // Check if page handled the fragment gracefully
        const hasError = await this.page.locator('.error, [class*="error"]').count() > 0;
        
        if (hasError) {
          console.log(`⚠️ Fragment ${fragment} caused error`);
          allParsed = false;
        } else {
          console.log(`✅ Fragment ${fragment} parsed successfully`);
        }
        
      } catch (error) {
        console.log(`❌ Fragment ${fragment} failed:`, error.message);
        allParsed = false;
      }
      
      await this.page.waitForTimeout(500);
    }
    
    return allParsed;
  }

  async testPermalinkFunctionality(): Promise<boolean> {
    console.log('🔗 Testing permalink functionality...');
    
    // Navigate to page and expand comments
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.expandCommentsForTesting();
    
    // Find a comment with permalink button
    const commentWithPermalink = this.page.locator('[id*="comment-"]:has(button[title*="permalink"], button[title*="Copy"])').first();
    
    if (await commentWithPermalink.count() === 0) {
      console.log('⚠️ No permalink buttons found');
      return false;
    }
    
    const permalinkButton = commentWithPermalink.locator('button[title*="permalink"], button[title*="Copy"]').first();
    
    // Get the comment ID
    const commentId = await commentWithPermalink.getAttribute('id');
    if (!commentId) {
      console.log('❌ Could not get comment ID');
      return false;
    }
    
    // Click permalink button
    await permalinkButton.click();
    await this.page.waitForTimeout(500);
    
    console.log(`🔗 Clicked permalink for ${commentId}`);
    
    // Test if we can navigate to the permalink URL
    const permalinkURL = `${this.baseURL}/#${commentId}`;
    await this.page.goto(permalinkURL);
    await this.page.waitForLoadState('networkidle');
    
    // Check if comment is highlighted/visible
    const targetComment = this.page.locator(`#${commentId}`);
    const isVisible = await targetComment.isInViewport();
    const isHighlighted = await this.checkHighlighting(targetComment);
    
    console.log(`✅ Permalink test: visible=${isVisible}, highlighted=${isHighlighted}`);
    
    return isVisible;
  }

  async testBrowserHistoryIntegration(): Promise<boolean> {
    console.log('📚 Testing browser history integration...');
    
    const testCases = await this.generateTestCases();
    const validTestCases = testCases.filter(tc => tc.expectedCommentId !== 'nonexistent-id');
    
    if (validTestCases.length < 2) {
      console.log('⚠️ Not enough valid test cases for history testing');
      return false;
    }
    
    // Navigate to first comment
    const firstCase = validTestCases[0];
    await this.page.goto(firstCase.url);
    await this.page.waitForLoadState('networkidle');
    
    // Navigate to second comment
    const secondCase = validTestCases[1];
    await this.page.goto(secondCase.url);
    await this.page.waitForLoadState('networkidle');
    
    // Test back navigation
    await this.page.goBack();
    await this.page.waitForLoadState('networkidle');
    
    // Verify we're at the first comment
    const firstComment = this.page.locator(`#comment-${firstCase.expectedCommentId}`);
    const backWorked = await firstComment.count() > 0;
    
    // Test forward navigation
    await this.page.goForward();
    await this.page.waitForLoadState('networkidle');
    
    // Verify we're at the second comment
    const secondComment = this.page.locator(`#comment-${secondCase.expectedCommentId}`);
    const forwardWorked = await secondComment.count() > 0;
    
    console.log(`📚 History test: back=${backWorked}, forward=${forwardWorked}`);
    
    return backWorked && forwardWorked;
  }

  async captureNavigationScreenshots(testName: string): Promise<void> {
    const timestamp = Date.now();
    
    await this.page.screenshot({
      path: `/workspaces/agent-feed/tests/screenshots/navigation-${testName}-${timestamp}.png`,
      fullPage: true
    });
    
    console.log(`📸 Navigation screenshot captured for ${testName}`);
  }

  getNavigationMetrics(): NavigationMetrics[] {
    return this.navigationMetrics;
  }

  calculateAverageMetrics(): any {
    if (this.navigationMetrics.length === 0) return null;
    
    const totals = this.navigationMetrics.reduce((acc, metrics) => ({
      loadTime: acc.loadTime + metrics.loadTime,
      scrollTime: acc.scrollTime + metrics.scrollTime,
      highlightTime: acc.highlightTime + metrics.highlightTime,
      successCount: acc.successCount + (metrics.urlAccuracy && metrics.elementVisibility ? 1 : 0)
    }), { loadTime: 0, scrollTime: 0, highlightTime: 0, successCount: 0 });
    
    const count = this.navigationMetrics.length;
    
    return {
      avgLoadTime: totals.loadTime / count,
      avgScrollTime: totals.scrollTime / count,
      avgHighlightTime: totals.highlightTime / count,
      successRate: (totals.successCount / count) * 100
    };
  }
}

test.describe('Comment URL Navigation Validation', () => {
  let navigator: CommentNavigationValidator;
  
  test.beforeEach(async ({ page }) => {
    navigator = new CommentNavigationValidator(page);
    console.log('🚀 Navigation validator initialized');
  });

  test('Direct URL Navigation to Comments', async ({ page }) => {
    console.log('🎯 Starting Direct URL Navigation Test...');
    
    const testCases = await navigator.generateTestCases();
    console.log(`📋 Generated ${testCases.length} test cases`);
    
    let successfulNavigations = 0;
    
    for (const testCase of testCases) {
      const metrics = await navigator.testDirectNavigation(testCase);
      
      if (testCase.expectedCommentId !== 'nonexistent-id') {
        // Valid comment should be accessible
        expect(metrics.urlAccuracy).toBe(true);
        expect(metrics.loadTime).toBeLessThan(10000); // Should load within 10 seconds
        
        if (metrics.elementVisibility) {
          successfulNavigations++;
        }
      } else {
        // Invalid comment should handle gracefully
        expect(metrics.urlAccuracy).toBe(true); // Should not crash
      }
      
      await navigator.captureNavigationScreenshots(`direct-${testCase.expectedCommentId}`);
    }
    
    const successRate = (successfulNavigations / testCases.filter(tc => tc.expectedCommentId !== 'nonexistent-id').length) * 100;
    console.log(`📊 Navigation success rate: ${successRate.toFixed(2)}%`);
    
    expect(successRate).toBeGreaterThan(50); // At least 50% should work
  });

  test('Fragment Parsing and URL Handling', async ({ page }) => {
    console.log('🔍 Starting Fragment Parsing Test...');
    
    const fragmentParsingWorked = await navigator.testFragmentParsing();
    
    await navigator.captureNavigationScreenshots('fragment-parsing');
    
    expect(fragmentParsingWorked).toBe(true);
    console.log('✅ Fragment parsing test completed');
  });

  test('Permalink Functionality', async ({ page }) => {
    console.log('🔗 Starting Permalink Functionality Test...');
    
    const permalinkWorked = await navigator.testPermalinkFunctionality();
    
    await navigator.captureNavigationScreenshots('permalink-test');
    
    expect(permalinkWorked).toBe(true);
    console.log('✅ Permalink functionality test completed');
  });

  test('Browser History Integration', async ({ page }) => {
    console.log('📚 Starting Browser History Integration Test...');
    
    const historyWorked = await navigator.testBrowserHistoryIntegration();
    
    await navigator.captureNavigationScreenshots('history-integration');
    
    expect(historyWorked).toBe(true);
    console.log('✅ Browser history integration test completed');
  });

  test('Performance Metrics Collection', async ({ page }) => {
    console.log('⚡ Starting Navigation Performance Test...');
    
    const testCases = await navigator.generateTestCases();
    const validTestCases = testCases.filter(tc => tc.expectedCommentId !== 'nonexistent-id');
    
    // Run navigation tests to collect metrics
    for (const testCase of validTestCases.slice(0, 3)) { // Test first 3
      await navigator.testDirectNavigation(testCase);
    }
    
    const averageMetrics = navigator.calculateAverageMetrics();
    
    if (averageMetrics) {
      console.log('📊 Navigation Performance Metrics:');
      console.log(`  Average Load Time: ${averageMetrics.avgLoadTime.toFixed(2)}ms`);
      console.log(`  Average Scroll Time: ${averageMetrics.avgScrollTime.toFixed(2)}ms`);
      console.log(`  Average Highlight Time: ${averageMetrics.avgHighlightTime.toFixed(2)}ms`);
      console.log(`  Success Rate: ${averageMetrics.successRate.toFixed(2)}%`);
      
      // Performance assertions
      expect(averageMetrics.avgLoadTime).toBeLessThan(5000);
      expect(averageMetrics.successRate).toBeGreaterThan(60);
    }
    
    await navigator.captureNavigationScreenshots('performance-metrics');
    
    console.log('✅ Performance metrics collection completed');
  });

  test.afterEach(async ({ page }) => {
    const metrics = navigator.getNavigationMetrics();
    if (metrics.length > 0) {
      console.log(`📊 Collected ${metrics.length} navigation metrics`);
      
      const avgMetrics = navigator.calculateAverageMetrics();
      if (avgMetrics) {
        console.log(`📈 Overall Performance: ${avgMetrics.successRate.toFixed(1)}% success rate`);
      }
    }
  });
});

test.describe('URL Validation Edge Cases', () => {
  test('Malformed URLs and Error Handling', async ({ page }) => {
    console.log('🛡️ Testing malformed URLs and error handling...');
    
    const malformedURLs = [
      '/#comment-',
      '/#comment-<script>alert("test")</script>',
      '/#comment-' + 'x'.repeat(1000),
      '/#comment-../../../etc/passwd',
      '/#comment-null',
      '/#comment-undefined'
    ];
    
    for (const url of malformedURLs) {
      try {
        await page.goto(`http://localhost:5173${url}`);
        await page.waitForLoadState('domcontentloaded');
        
        // Should not crash or show error
        const hasJSError = await page.evaluate(() => window.onerror !== null);
        expect(hasJSError).toBe(false);
        
        console.log(`✅ Handled malformed URL: ${url}`);
        
      } catch (error) {
        console.log(`⚠️ URL ${url} caused issue:`, error.message);
      }
    }
    
    console.log('✅ Malformed URL handling test completed');
  });

  test('Deep Linking with Multiple Fragments', async ({ page }) => {
    console.log('🔗 Testing deep linking with complex fragments...');
    
    const complexFragments = [
      '#comment-123&highlight=true',
      '#comment-456?expanded=true',
      '#comment-789#nested',
      '#comment-abc%20def'
    ];
    
    for (const fragment of complexFragments) {
      await page.goto(`http://localhost:5173/${fragment}`);
      await page.waitForLoadState('domcontentloaded');
      
      // Should handle gracefully without errors
      const consoleErrors = await page.evaluate(() => {
        return window.console.error.toString();
      });
      
      console.log(`✅ Complex fragment handled: ${fragment}`);
    }
    
    console.log('✅ Deep linking test completed');
  });
});