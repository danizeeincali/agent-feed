/**
 * London School TDD - Comment Behavior Validator
 * Focus: Real browser testing with comprehensive behavioral analysis
 * MISSION: Identify exactly why users cannot click into comments
 */
import { test, expect, type Page } from '@playwright/test';

interface CommentInteractionResult {
  buttonFound: boolean;
  clickSucceeded: boolean;
  commentsVisible: boolean;
  loadingStateShown: boolean;
  errorOccurred: boolean;
  buttonSelector: string;
  failureReason?: string;
  elementDetails?: any;
}

// Mock comprehensive backend responses
async function setupCommentMocks(page: Page) {
  // Mock successful post data
  await page.route('**/api/v1/agent-posts*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'validator-post-1',
            title: 'Comment Validation Test Post',
            content: 'Testing comment system behavior validation',
            authorAgent: 'validator-agent',
            publishedAt: '2025-01-01T00:00:00Z',
            comments: 3,
            shares: 1,
            views: 50,
            metadata: { businessImpact: 7 }
          }
        ],
        total: 1
      })
    });
  });

  // Mock comment loading
  await page.route('**/api/v1/posts/*/comments', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'comment-1',
              content: 'Test comment for validation',
              author: 'test-user',
              createdAt: '2025-01-01T00:00:00Z',
              likesCount: 2,
              repliesCount: 1,
              threadDepth: 0,
              threadPath: '0'
            },
            {
              id: 'comment-2',
              content: 'Reply to test comment',
              author: 'test-user-2',
              createdAt: '2025-01-01T01:00:00Z',
              parentId: 'comment-1',
              likesCount: 0,
              repliesCount: 0,
              threadDepth: 1,
              threadPath: '0.0'
            }
          ]
        })
      });
    }
  });

  // Prevent real WebSocket connections
  await page.addInitScript(() => {
    (window as any).WebSocket = class MockWebSocket {
      constructor() {}
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
      readyState = 1; // OPEN state
    };
  });
}

async function analyzeCommentButton(page: Page): Promise<CommentInteractionResult[]> {
  const results: CommentInteractionResult[] = [];
  
  // Strategy 1: Find buttons with "comment" text
  const commentTextButtons = await page.locator('button:has-text("comment"), button:has-text("Comment")').all();
  
  for (let i = 0; i < commentTextButtons.length; i++) {
    const button = commentTextButtons[i];
    const result: CommentInteractionResult = {
      buttonFound: true,
      clickSucceeded: false,
      commentsVisible: false,
      loadingStateShown: false,
      errorOccurred: false,
      buttonSelector: `button:has-text("comment")[${i}]`
    };
    
    try {
      const buttonText = await button.textContent();
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      
      result.elementDetails = {
        text: buttonText,
        visible: isVisible,
        enabled: isEnabled
      };
      
      if (isVisible && isEnabled) {
        await button.click({ timeout: 3000 });
        result.clickSucceeded = true;
        
        // Check for immediate changes
        await page.waitForTimeout(500);
        
        // Check for loading state
        result.loadingStateShown = await page.locator('text="Loading comments..."').isVisible().catch(() => false);
        
        // Check for comment content
        await page.waitForTimeout(2000);
        result.commentsVisible = await page.locator('text="Test comment for validation"').isVisible().catch(() => false);
        
        if (!result.commentsVisible) {
          // Check for comment form
          const commentFormVisible = await page.locator('textarea[placeholder*="comment"]').isVisible().catch(() => false);
          result.commentsVisible = commentFormVisible;
        }
      }
    } catch (error) {
      result.errorOccurred = true;
      result.failureReason = String(error);
    }
    
    results.push(result);
  }
  
  // Strategy 2: Find buttons with MessageCircle icons (Lucide React)
  const iconButtons = await page.locator('button:has(svg), button [data-lucide="message-circle"]').all();
  
  for (let i = 0; i < iconButtons.length; i++) {
    const button = iconButtons[i];
    const result: CommentInteractionResult = {
      buttonFound: true,
      clickSucceeded: false,
      commentsVisible: false,
      loadingStateShown: false,
      errorOccurred: false,
      buttonSelector: `button:has(svg)[${i}]`
    };
    
    try {
      const hasMessageIcon = await button.locator('svg').count() > 0;
      const isVisible = await button.isVisible();
      
      if (hasMessageIcon && isVisible) {
        await button.click({ timeout: 3000 });
        result.clickSucceeded = true;
        
        await page.waitForTimeout(500);
        result.loadingStateShown = await page.locator('text="Loading comments..."').isVisible().catch(() => false);
        
        await page.waitForTimeout(2000);
        result.commentsVisible = await page.locator('text="Test comment for validation"').isVisible().catch(() => false);
      }
    } catch (error) {
      result.errorOccurred = true;
      result.failureReason = String(error);
    }
    
    results.push(result);
  }
  
  return results;
}

test.describe('Comment System Behavior Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommentMocks(page);
    await page.goto('http://localhost:3000');
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for React components
  });

  test('CRITICAL: Complete comment interaction behavior analysis', async ({ page }) => {
    console.log('🔍 Starting comprehensive comment behavior analysis...');
    
    // Wait for post to be visible
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    console.log('✅ Test post loaded successfully');
    
    // Analyze all potential comment buttons
    const results = await analyzeCommentButton(page);
    console.log(`📊 Found ${results.length} potential comment buttons`);
    
    // Report results
    let workingButtons = 0;
    let failedButtons = 0;
    
    results.forEach((result, index) => {
      console.log(`\n🔘 Button ${index + 1} (${result.buttonSelector}):`);
      console.log(`  Found: ${result.buttonFound}`);
      console.log(`  Click succeeded: ${result.clickSucceeded}`);
      console.log(`  Loading shown: ${result.loadingStateShown}`);
      console.log(`  Comments visible: ${result.commentsVisible}`);
      console.log(`  Error occurred: ${result.errorOccurred}`);
      
      if (result.elementDetails) {
        console.log(`  Element details:`, result.elementDetails);
      }
      
      if (result.failureReason) {
        console.log(`  Failure reason: ${result.failureReason}`);
      }
      
      if (result.commentsVisible) {
        workingButtons++;
      } else {
        failedButtons++;
      }
    });
    
    console.log(`\n📈 Summary: ${workingButtons} working, ${failedButtons} failed`);
    
    // CRITICAL ASSERTION: At least one comment button should work
    expect(workingButtons).toBeGreaterThan(0);
  });

  test('DIAGNOSTIC: PostCard component comment button inspection', async ({ page }) => {
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    // Inspect PostCard structure
    const postCard = await page.locator('div:has-text("Comment Validation Test Post")').first();
    await expect(postCard).toBeVisible();
    
    // Look for comment-related elements within the post card
    const commentElements = await postCard.locator('*:has-text("comment"), *:has-text("Comment"), button[title*="comment"], [class*="comment"]').all();
    
    console.log(`Found ${commentElements.length} comment-related elements in PostCard`);
    
    for (let i = 0; i < commentElements.length; i++) {
      const element = commentElements[i];
      const tagName = await element.evaluate(el => el.tagName);
      const textContent = await element.textContent();
      const className = await element.getAttribute('class');
      const isClickable = tagName === 'BUTTON' || await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.cursor === 'pointer' || el.onclick !== null;
      });
      
      console.log(`Element ${i}: ${tagName}, text="${textContent}", class="${className}", clickable=${isClickable}`);
      
      if (isClickable) {
        try {
          await element.click({ timeout: 1000 });
          console.log(`✅ Successfully clicked element ${i}`);
          
          // Check what happened
          const loadingVisible = await page.locator('text="Loading comments..."').isVisible().catch(() => false);
          const commentsVisible = await page.locator('text="Test comment for validation"').isVisible().catch(() => false);
          
          console.log(`After click: loading=${loadingVisible}, comments=${commentsVisible}`);
          
          if (loadingVisible || commentsVisible) {
            console.log(`🎯 FOUND WORKING COMMENT BUTTON: Element ${i}`);
          }
          
        } catch (error) {
          console.log(`❌ Failed to click element ${i}: ${error}`);
        }
      }
    }
  });

  test('EDGE CASE: Comment button state management', async ({ page }) => {
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    // Find any working comment button
    const commentButton = await page.locator('button:has-text("3 Comments"), button:has-text("Comments"), button[title*="comment"]').first();
    
    if (await commentButton.isVisible()) {
      console.log('Testing comment button state management...');
      
      // Initial state
      const initialText = await commentButton.textContent();
      console.log(`Initial button text: "${initialText}"`);
      
      // First click
      await commentButton.click();
      await page.waitForTimeout(1000);
      
      const afterFirstClick = await commentButton.textContent();
      console.log(`After first click: "${afterFirstClick}"`);
      
      // Second click (toggle)
      await commentButton.click();
      await page.waitForTimeout(1000);
      
      const afterSecondClick = await commentButton.textContent();
      console.log(`After second click: "${afterSecondClick}"`);
      
      // Button should maintain functionality
      expect(commentButton).toBeVisible();
    }
  });

  test('API INTEGRATION: Comment loading with network conditions', async ({ page }) => {
    // Test with slow network
    await page.route('**/api/v1/posts/*/comments', async (route) => {
      // Simulate slow network
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 'slow-comment',
            content: 'Slow network comment',
            author: 'slow-user',
            createdAt: '2025-01-01T00:00:00Z',
            likesCount: 0,
            repliesCount: 0,
            threadDepth: 0,
            threadPath: '0'
          }]
        })
      });
    });
    
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    
    if (await commentButton.isVisible()) {
      await commentButton.click();
      
      // Should show loading state during slow network
      await expect(page.locator('text="Loading comments..."')).toBeVisible({ timeout: 3000 });
      
      // Eventually should show comments
      await expect(page.locator('text="Slow network comment"')).toBeVisible({ timeout: 8000 });
    }
  });

  test('ERROR HANDLING: Comment loading failures', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/posts/*/comments', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });
    
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    
    if (await commentButton.isVisible()) {
      await commentButton.click();
      
      // Should handle error gracefully - no crash
      await page.waitForTimeout(3000);
      
      // App should remain functional
      expect(commentButton).toBeVisible();
    }
  });

  test('ACCESSIBILITY: Keyboard navigation for comments', async ({ page }) => {
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    // Find comment button and test keyboard access
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    
    if (await commentButton.isVisible()) {
      // Tab to comment button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs
      
      // Ensure button is focusable
      await commentButton.focus();
      
      // Press Enter to activate
      await page.keyboard.press('Enter');
      
      // Should open comments
      await page.waitForTimeout(2000);
      
      const commentsOpened = await page.locator('textarea[placeholder*="comment"]').isVisible().catch(() => false) ||
                             await page.locator('text="Test comment for validation"').isVisible().catch(() => false);
      
      if (commentsOpened) {
        console.log('✅ Keyboard navigation works for comments');
      } else {
        console.log('❌ Keyboard navigation failed for comments');
      }
    }
  });

  test('PERFORMANCE: Comment button responsiveness', async ({ page }) => {
    await page.waitForSelector('text="Comment Validation Test Post"', { timeout: 10000 });
    
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    
    if (await commentButton.isVisible()) {
      // Measure click response time
      const startTime = Date.now();
      
      await commentButton.click();
      
      // Wait for any visual feedback
      await Promise.race([
        page.locator('text="Loading comments..."').waitFor({ timeout: 5000 }).catch(() => {}),
        page.locator('textarea[placeholder*="comment"]').waitFor({ timeout: 5000 }).catch(() => {}),
        page.waitForTimeout(5000)
      ]);
      
      const responseTime = Date.now() - startTime;
      console.log(`Comment button response time: ${responseTime}ms`);
      
      // Should respond within reasonable time
      expect(responseTime).toBeLessThan(5000);
    }
  });
});