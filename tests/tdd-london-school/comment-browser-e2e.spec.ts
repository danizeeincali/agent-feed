import { test, expect, Page } from '@playwright/test';

// London School TDD: End-to-end browser tests with mock coordination
describe('Comment System Browser E2E - London School TDD', () => {
  
  test.describe('Comment Count Display Validation', () => {
    test('should display comment counts as integers in browser', async ({ page }) => {
      // FAILING TEST - Browser display shows decimal counts
      
      // Navigate to test page with comments
      await page.goto('/posts/test-post-browser-counts');
      
      // Wait for comment system to load
      await page.waitForSelector('[data-testid="comment-system"]');
      
      // FAILS: Comment count header should show integer
      const commentHeader = page.locator('[data-testid="comment-header"]');
      await expect(commentHeader).toBeVisible();
      
      const headerText = await commentHeader.textContent();
      
      // Should match integer pattern "Comments (N)" not "Comments (N.0)"
      expect(headerText).toMatch(/Comments \(\d+\)$/);
      expect(headerText).not.toMatch(/Comments \(\d+\.\d+\)$/);
      expect(headerText).not.toMatch(/Comments \(\d+\.0+\)$/);
    });

    test('should update comment count as integer after adding comment', async ({ page }) => {
      // FAILING TEST - Dynamic count updates show decimals
      
      await page.goto('/posts/test-post-browser-dynamic');
      
      // Get initial count
      const commentCountElement = page.locator('[data-testid="comment-count"]');
      const initialCount = await commentCountElement.textContent();
      const initialNumber = parseInt(initialCount?.match(/\d+/)?.[0] || '0');
      
      // Add new comment
      await page.click('[data-testid="add-comment-button"]');
      await page.fill('[data-testid="comment-input"]', 'Test browser comment');
      await page.click('[data-testid="submit-comment"]');
      
      // Wait for comment to be added and count to update
      await page.waitForTimeout(1000);
      
      // FAILS: Updated count should be integer
      const updatedCount = await commentCountElement.textContent();
      const updatedNumber = parseInt(updatedCount?.match(/\d+/)?.[0] || '0');
      
      expect(updatedNumber).toBe(initialNumber + 1);
      expect(updatedCount).toMatch(/Comments \(\d+\)$/);
      expect(updatedCount).not.toMatch(/Comments \(\d+\.\d+\)$/);
    });

    test('should display reply counts as integers in threaded view', async ({ page }) => {
      // FAILING TEST - Reply counts show as decimals
      
      await page.goto('/posts/test-post-browser-replies');
      
      // Wait for comments to load
      await page.waitForSelector('[data-testid="comment-thread"]');
      
      // Find comment with replies
      const commentWithReplies = page.locator('[data-testid="comment-with-replies"]').first();
      await expect(commentWithReplies).toBeVisible();
      
      // FAILS: Reply count text should be integer format
      const replyCountText = await commentWithReplies
        .locator('[data-testid="reply-count"]')
        .textContent();
      
      if (replyCountText) {
        expect(replyCountText).toMatch(/\d+ repl(y|ies)$/);
        expect(replyCountText).not.toMatch(/\d+\.\d+ repl(y|ies)$/);
        expect(replyCountText).not.toMatch(/\d+\.0+ repl(y|ies)$/);
      }
    });

    test('should show zero counts as integers not decimals', async ({ page }) => {
      // FAILING TEST - Zero counts display as "0.0"
      
      await page.goto('/posts/test-post-browser-zero-counts');
      
      // Check comment header with zero count
      const zeroCountHeader = page.locator('[data-testid="comment-header"]');
      const zeroHeaderText = await zeroCountHeader.textContent();
      
      // FAILS: Should show "Comments (0)" not "Comments (0.0)"
      expect(zeroHeaderText).toBe('Comments (0)');
      expect(zeroHeaderText).not.toBe('Comments (0.0)');
      expect(zeroHeaderText).not.toBe('Comments (0.00)');
    });
  });

  test.describe('Comment Section Labeling', () => {
    test('should display "Comments" header not "Technical Analysis"', async ({ page }) => {
      // FAILING TEST - Section header shows wrong label
      
      await page.goto('/posts/test-post-browser-labeling');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="comment-system"]');
      
      // FAILS: Should find "Comments" header, not technical analysis
      const commentsHeader = page.locator('h1, h2, h3', { hasText: 'Comments' });
      await expect(commentsHeader).toBeVisible();
      
      // Should NOT find technical analysis headers
      const technicalAnalysisHeader = page.locator('h1, h2, h3', { hasText: /technical.?analysis/i });
      await expect(technicalAnalysisHeader).toHaveCount(0);
      
      const techAnalysisHeader = page.locator('h1, h2, h3', { hasText: /tech.?analysis/i });
      await expect(techAnalysisHeader).toHaveCount(0);
    });

    test('should use "Add Comment" button text not analysis-related text', async ({ page }) => {
      // FAILING TEST - Add button shows wrong text
      
      await page.goto('/posts/test-post-browser-buttons');
      
      // FAILS: Should find "Add Comment" button
      const addCommentButton = page.locator('button', { hasText: 'Add Comment' });
      await expect(addCommentButton).toBeVisible();
      
      // Should NOT find technical analysis buttons
      const addAnalysisButton = page.locator('button', { hasText: /add.*analysis/i });
      await expect(addAnalysisButton).toHaveCount(0);
      
      const addTechButton = page.locator('button', { hasText: /add.*technical/i });
      await expect(addTechButton).toHaveCount(0);
    });

    test('should show correct empty state message', async ({ page }) => {
      // FAILING TEST - Empty state references wrong section type
      
      await page.goto('/posts/test-post-browser-empty');
      
      // Wait for empty state to appear
      await page.waitForSelector('[data-testid="empty-state"]');
      
      // FAILS: Should show correct empty message
      const emptyMessage = page.locator('[data-testid="empty-state"]');
      const emptyText = await emptyMessage.textContent();
      
      expect(emptyText).toMatch(/no comments yet/i);
      expect(emptyText).not.toMatch(/no.*technical.*analysis/i);
      expect(emptyText).not.toMatch(/no.*tech.*analysis/i);
      
      // Start discussion button should reference comments
      const startButton = page.locator('button', { hasText: /start.*discussion/i });
      await expect(startButton).toBeVisible();
      
      const startButtonText = await startButton.textContent();
      expect(startButtonText).not.toMatch(/technical/i);
      expect(startButtonText).not.toMatch(/analysis/i);
    });
  });

  test.describe('Comment Count API Browser Integration', () => {
    test('should load integer counts from API in browser', async ({ page }) => {
      // FAILING TEST - Browser receives decimal strings from API
      
      // Intercept API calls to verify data format
      await page.route('/api/v1/posts/*/comments/stats', async route => {
        // Mock API response that might have decimal strings
        const mockResponse = {
          totalComments: "25.0", // PROBLEM: String instead of number
          rootThreads: "8.0",
          maxDepth: "3.0", 
          agentComments: "5.0",
          userComments: "20.0",
          averageDepth: 1.8,
          mostActiveThread: "thread-123",
          recentActivity: 4
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse)
        });
      });
      
      await page.goto('/posts/test-post-browser-api');
      
      // Wait for stats to load
      await page.waitForSelector('[data-testid="comment-stats"]');
      
      // FAILS: Displayed counts should be integers despite API returning strings
      const totalDisplay = page.locator('[data-testid="total-comments"]');
      const totalText = await totalDisplay.textContent();
      expect(totalText).toBe('25');
      expect(totalText).not.toBe('25.0');
    });

    test('should handle API response transformation correctly', async ({ page }) => {
      // FAILING TEST - Frontend doesn't parse API strings to integers
      
      // Monitor network requests
      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/v1/posts') && response.url().includes('/comments')) {
          responses.push(response);
        }
      });
      
      await page.goto('/posts/test-post-browser-transform');
      
      // Wait for API calls to complete
      await page.waitForTimeout(2000);
      
      // Verify API was called
      expect(responses.length).toBeGreaterThan(0);
      
      // Check that frontend displays integers
      const commentHeader = page.locator('[data-testid="comment-header"]');
      const headerText = await commentHeader.textContent();
      
      // Should show integer format regardless of API response format
      if (headerText) {
        const match = headerText.match(/Comments \((\d+)\)/);
        if (match) {
          const displayedCount = match[1];
          expect(displayedCount).toMatch(/^\d+$/); // Only digits
          expect(displayedCount).not.toMatch(/\./); // No decimal points
        }
      }
    });
  });

  test.describe('Real-time Comment Count Updates', () => {
    test('should update counts as integers via WebSocket', async ({ page }) => {
      // FAILING TEST - Real-time updates show decimal counts
      
      await page.goto('/posts/test-post-browser-websocket');
      
      // Wait for initial load
      await page.waitForSelector('[data-testid="comment-system"]');
      
      // Get initial count
      const initialHeader = await page.locator('[data-testid="comment-header"]').textContent();
      const initialCount = parseInt(initialHeader?.match(/\d+/)?.[0] || '0');
      
      // Simulate real-time comment addition (mock WebSocket message)
      await page.evaluate((count) => {
        // Simulate receiving WebSocket update with decimal count
        const mockWebSocketMessage = {
          type: 'comment_added',
          data: {
            postId: 'test-post-browser-websocket',
            totalComments: `${count + 1}.0`, // PROBLEM: Decimal string from WebSocket
            newComment: {
              id: 'new-comment-ws',
              content: 'Real-time comment'
            }
          }
        };
        
        // Trigger the WebSocket handler
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: mockWebSocketMessage
        }));
      }, initialCount);
      
      await page.waitForTimeout(1000);
      
      // FAILS: Count should update as integer
      const updatedHeader = await page.locator('[data-testid="comment-header"]').textContent();
      expect(updatedHeader).toMatch(/Comments \(\d+\)$/);
      expect(updatedHeader).not.toMatch(/Comments \(\d+\.\d+\)$/);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should display integer counts correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);
        
        // FAILING TEST - Different browsers might handle number formatting differently
        
        await page.goto('/posts/test-post-browser-compatibility');
        
        // Test number display consistency across browsers
        const commentCount = page.locator('[data-testid="comment-count"]');
        const countText = await commentCount.textContent();
        
        if (countText) {
          // Should be consistent integer format across all browsers
          expect(countText).toMatch(/^\d+$/);
          expect(countText).not.toMatch(/\d+\.\d+/);
        }
        
        // Test that number inputs don't show decimal places
        await page.click('[data-testid="add-comment-button"]');
        const likesDisplay = page.locator('[data-testid="likes-count"]').first();
        
        if (await likesDisplay.isVisible()) {
          const likesText = await likesDisplay.textContent();
          expect(likesText).toMatch(/^\d+$/);
        }
      });
    });
  });

  test.describe('Accessibility Validation', () => {
    test('should have accessible comment count labels', async ({ page }) => {
      // FAILING TEST - Screen readers might receive decimal count announcements
      
      await page.goto('/posts/test-post-browser-accessibility');
      
      // Check aria-label for comment counts
      const commentSection = page.locator('[data-testid="comment-system"]');
      const ariaLabel = await commentSection.getAttribute('aria-label');
      
      if (ariaLabel) {
        // FAILS: Aria labels should announce integer counts
        expect(ariaLabel).toMatch(/\d+ comments?/);
        expect(ariaLabel).not.toMatch(/\d+\.\d+ comments?/);
      }
      
      // Check that screen reader text uses integers
      const srOnly = page.locator('.sr-only, .visually-hidden');
      const srTexts = await srOnly.allTextContents();
      
      srTexts.forEach(text => {
        if (text.includes('comment')) {
          expect(text).not.toMatch(/\d+\.\d+/);
        }
      });
    });

    test('should properly announce comment section as "Comments" to screen readers', async ({ page }) => {
      // FAILING TEST - Screen readers might announce wrong section type
      
      await page.goto('/posts/test-post-browser-sr-labels');
      
      // Check main heading accessibility
      const mainHeading = page.locator('h1, h2, h3', { hasText: /comments/i }).first();
      await expect(mainHeading).toBeVisible();
      
      const headingRole = await mainHeading.getAttribute('role');
      const headingLevel = await mainHeading.getAttribute('aria-level');
      
      // Should be properly structured for screen readers
      expect(await mainHeading.textContent()).toMatch(/comments/i);
      expect(await mainHeading.textContent()).not.toMatch(/technical.*analysis/i);
    });
  });

  test.describe('Performance and Rendering', () => {
    test('should render comment counts efficiently without layout shifts', async ({ page }) => {
      // FAILING TEST - Decimal formatting causes layout shifts
      
      await page.goto('/posts/test-post-browser-performance');
      
      // Monitor Cumulative Layout Shift
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const cls = entries.reduce((sum, entry) => {
              return sum + (entry as any).value;
            }, 0);
            resolve({ cls });
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve({ cls: 0 }), 3000);
        });
      });
      
      // FAILS: Layout shifts from decimal -> integer formatting
      expect((performanceMetrics as any).cls).toBeLessThan(0.1);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display integer counts properly on mobile viewports', async ({ page }) => {
      // FAILING TEST - Mobile view shows formatting issues with decimals
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/posts/test-post-browser-mobile');
      
      // Wait for mobile layout
      await page.waitForSelector('[data-testid="comment-system"]');
      
      // Check comment count display on mobile
      const mobileCommentCount = page.locator('[data-testid="mobile-comment-count"]');
      
      if (await mobileCommentCount.isVisible()) {
        const mobileCountText = await mobileCommentCount.textContent();
        
        // FAILS: Mobile should show integer counts
        expect(mobileCountText).toMatch(/\d+/);
        expect(mobileCountText).not.toMatch(/\d+\.\d+/);
      }
    });
  });
});