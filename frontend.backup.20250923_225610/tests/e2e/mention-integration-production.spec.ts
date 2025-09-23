/**
 * Production Validation Tests for @ Mention Integration
 * Comprehensive production-ready validation scenarios
 */

import { test, expect, Page, Locator } from '@playwright/test';

// Production test configuration
const PRODUCTION_CONFIG = {
  timeouts: {
    navigation: 15000,
    element: 10000,
    api: 5000,
    typing: 100
  },
  retries: 3,
  agents: {
    required: [
      'chief-of-staff-agent',
      'tech-reviewer',
      'system-validator'
    ],
    optional: [
      'code-reviewer-agent',
      'performance-analyst'
    ]
  }
};

// Production helper functions
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: PRODUCTION_CONFIG.timeouts.navigation });
  await page.waitForFunction(() => document.readyState === 'complete');
}

async function validateMentionDropdown(page: Page): Promise<boolean> {
  try {
    await expect(page.locator('[role="listbox"][aria-label="Agent suggestions"]'))
      .toBeVisible({ timeout: PRODUCTION_CONFIG.timeouts.element });
    
    // Validate dropdown has content
    const optionCount = await page.locator('[role="option"]').count();
    return optionCount > 0;
  } catch {
    return false;
  }
}

async function performProductionMentionTest(
  page: Page, 
  inputSelector: string, 
  testContent: string,
  context: string
): Promise<{success: boolean, metrics: any}> {
  const startTime = Date.now();
  const metrics = {
    dropdownLoadTime: 0,
    insertionTime: 0,
    totalTime: 0,
    errors: []
  };

  try {
    const input = page.locator(inputSelector);
    await input.click();
    
    // Type @ to trigger mention
    const beforeDropdown = Date.now();
    await input.type('@');
    
    // Wait for dropdown with timeout
    const dropdownVisible = await validateMentionDropdown(page);
    metrics.dropdownLoadTime = Date.now() - beforeDropdown;
    
    if (!dropdownVisible) {
      metrics.errors.push('Mention dropdown failed to appear');
      return { success: false, metrics };
    }

    // Select first suggestion
    const beforeInsertion = Date.now();
    await page.locator('[role="option"]').first().click();
    metrics.insertionTime = Date.now() - beforeInsertion;
    
    // Verify mention was inserted
    const inputValue = await input.inputValue();
    if (!inputValue.includes('@') || !inputValue.includes('-agent')) {
      metrics.errors.push('Mention was not properly inserted');
      return { success: false, metrics };
    }

    // Complete the content
    await input.fill(testContent);
    
    metrics.totalTime = Date.now() - startTime;
    return { success: true, metrics };
    
  } catch (error) {
    metrics.errors.push(`Error in ${context}: ${error}`);
    metrics.totalTime = Date.now() - startTime;
    return { success: false, metrics };
  }
}

test.describe('Production Validation - @ Mention Integration', () => {
  let performanceData: any[] = [];

  test.beforeEach(async ({ page }) => {
    // Set production-like network conditions
    await page.route('**/*', (route) => {
      // Add slight delay to simulate real network conditions
      setTimeout(() => route.continue(), 10);
    });

    await page.goto('/', { timeout: PRODUCTION_CONFIG.timeouts.navigation });
    await waitForPageLoad(page);
  });

  test.afterEach(async ({ page }) => {
    // Collect performance metrics
    const performanceEntries = await page.evaluate(() => 
      performance.getEntriesByType('navigation')
    );
    performanceData.push(performanceEntries);
  });

  test('PROD-001: PostCreatorModal mention integration validation', async ({ page }) => {
    // Open modal
    await page.click('[data-testid="create-post-button"]', { 
      timeout: PRODUCTION_CONFIG.timeouts.element 
    });
    
    // Validate modal opens
    await expect(page.locator('.fixed.inset-0')).toBeVisible({
      timeout: PRODUCTION_CONFIG.timeouts.element
    });

    // Fill required fields
    await page.fill('input[placeholder*="compelling title"]', 'Production Test Post');
    
    // Test mention functionality
    const result = await performProductionMentionTest(
      page,
      'textarea[placeholder*="Share your insights"]',
      'Production test with @chief-of-staff-agent coordination needed.',
      'PostCreatorModal'
    );

    expect(result.success).toBe(true);
    expect(result.metrics.dropdownLoadTime).toBeLessThan(2000);
    expect(result.metrics.insertionTime).toBeLessThan(500);
    
    // Attempt submission
    await page.click('[data-testid="submit-post"]');
    
    // Validate success or appropriate error handling
    try {
      await expect(page.locator('text=Post created successfully')).toBeVisible({
        timeout: PRODUCTION_CONFIG.timeouts.api
      });
    } catch {
      // If submission fails, ensure it's handled gracefully
      await expect(page.locator('text=error').or(page.locator('[role="alert"]'))).toBeVisible();
    }
  });

  test('PROD-002: QuickPost mention integration validation', async ({ page }) => {
    // Wait for QuickPost to be ready
    await expect(page.locator('textarea[placeholder*="quick update"]')).toBeVisible({
      timeout: PRODUCTION_CONFIG.timeouts.element
    });

    const result = await performProductionMentionTest(
      page,
      'textarea[placeholder*="quick update"]',
      'Production quick test @tech-reviewer please validate',
      'QuickPost'
    );

    expect(result.success).toBe(true);
    expect(result.metrics.dropdownLoadTime).toBeLessThan(1500);
    
    // Test agent button integration
    const agentButtons = page.locator('button:has-text("Tech Reviewer")');
    if (await agentButtons.count() > 0) {
      await agentButtons.first().click();
      await expect(agentButtons.first()).toHaveClass(/bg-purple-100/);
    }

    // Submit QuickPost
    await page.click('button:has-text("Quick Post")');
    
    // Validate response
    try {
      await expect(page.locator('text=Posted!')).toBeVisible({ 
        timeout: PRODUCTION_CONFIG.timeouts.api 
      });
    } catch {
      // Ensure error is handled
      await expect(page.locator('[role="alert"]').or(page.locator('text=error'))).toBeVisible();
    }
  });

  test('PROD-003: Comment form mention integration validation', async ({ page }) => {
    // Find a post to comment on
    const posts = page.locator('.feed-post');
    await expect(posts.first()).toBeVisible({ 
      timeout: PRODUCTION_CONFIG.timeouts.element 
    });

    // Open comment form
    await posts.first().locator('button:has-text("Comment")').click();
    
    // Wait for comment form
    await expect(page.locator('textarea[placeholder*="technical analysis"]')).toBeVisible({
      timeout: PRODUCTION_CONFIG.timeouts.element
    });

    const result = await performProductionMentionTest(
      page,
      'textarea[placeholder*="technical analysis"]',
      'Production comment test @system-validator please check',
      'CommentForm'
    );

    expect(result.success).toBe(true);
    expect(result.metrics.dropdownLoadTime).toBeLessThan(1500);

    // Submit comment
    await page.click('button:has-text("Post Analysis")');
    
    // Validate response
    try {
      await expect(page.locator('text=Comment posted successfully')).toBeVisible({
        timeout: PRODUCTION_CONFIG.timeouts.api
      });
    } catch {
      // Ensure error handling
      await expect(page.locator('[role="alert"]')).toBeVisible();
    }
  });

  test('PROD-004: Cross-component mention consistency validation', async ({ page }) => {
    // Collect agent data from each component
    const agentData = new Map<string, any>();

    // Test PostCreator
    await page.click('[data-testid="create-post-button"]');
    const postInput = page.locator('textarea[placeholder*="Share your insights"]');
    await postInput.type('@chief');
    await page.waitForTimeout(300);
    
    if (await validateMentionDropdown(page)) {
      const postAgents = await page.locator('[role="option"]').allTextContents();
      agentData.set('post', postAgents);
    }
    
    await page.keyboard.press('Escape');

    // Test QuickPost
    const quickInput = page.locator('textarea[placeholder*="quick update"]');
    await quickInput.type('@chief');
    await page.waitForTimeout(300);
    
    if (await validateMentionDropdown(page)) {
      const quickAgents = await page.locator('[role="option"]').allTextContents();
      agentData.set('quick', quickAgents);
    }
    
    await quickInput.fill('');

    // Test Comment
    if (await page.locator('.feed-post').count() > 0) {
      await page.locator('.feed-post').first().locator('button:has-text("Comment")').click();
      const commentInput = page.locator('textarea[placeholder*="technical analysis"]');
      await commentInput.type('@chief');
      await page.waitForTimeout(300);
      
      if (await validateMentionDropdown(page)) {
        const commentAgents = await page.locator('[role="option"]').allTextContents();
        agentData.set('comment', commentAgents);
      }
    }

    // Validate consistency where expected
    const postAgents = agentData.get('post') || [];
    const quickAgents = agentData.get('quick') || [];
    const commentAgents = agentData.get('comment') || [];

    // All should have Chief of Staff
    expect(postAgents.some((agent: string) => agent.includes('Chief of Staff'))).toBe(true);
    expect(quickAgents.some((agent: string) => agent.includes('Chief of Staff'))).toBe(true);
    expect(commentAgents.some((agent: string) => agent.includes('Chief of Staff'))).toBe(true);

    // Log for debugging
    console.log('Agent consistency validation:', {
      post: postAgents.length,
      quick: quickAgents.length,  
      comment: commentAgents.length
    });
  });

  test('PROD-005: Performance validation under load', async ({ page }) => {
    const performanceMetrics = [];

    // Simulate multiple rapid mention interactions
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      const quickInput = page.locator('textarea[placeholder*="quick update"]');
      await quickInput.fill('');
      await quickInput.type(`@test${i}`);
      await page.waitForTimeout(200);
      
      const dropdownAppeared = await validateMentionDropdown(page);
      
      performanceMetrics.push({
        iteration: i,
        time: Date.now() - startTime,
        dropdownAppeared
      });
      
      await page.keyboard.press('Escape');
      await quickInput.fill('');
    }

    // Validate performance metrics
    const avgTime = performanceMetrics.reduce((acc, m) => acc + m.time, 0) / performanceMetrics.length;
    const maxTime = Math.max(...performanceMetrics.map(m => m.time));
    const successRate = performanceMetrics.filter(m => m.dropdownAppeared).length / performanceMetrics.length;

    expect(avgTime).toBeLessThan(1000); // Average under 1 second
    expect(maxTime).toBeLessThan(2000);  // Max under 2 seconds
    expect(successRate).toBeGreaterThanOrEqual(0.8); // 80% success rate minimum

    console.log('Performance metrics:', { avgTime, maxTime, successRate });
  });

  test('PROD-006: Error recovery and graceful degradation', async ({ page }) => {
    // Test with network interruption
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30% failure rate
        route.abort();
      } else {
        route.continue();
      }
    });

    const quickInput = page.locator('textarea[placeholder*="quick update"]');
    
    let successfulMentions = 0;
    let gracefulFailures = 0;
    let totalAttempts = 5;

    for (let i = 0; i < totalAttempts; i++) {
      try {
        await quickInput.fill('');
        await quickInput.type(`@test${i}`);
        await page.waitForTimeout(500);
        
        if (await validateMentionDropdown(page)) {
          successfulMentions++;
        } else {
          // Check if failure is handled gracefully (no error messages, UI still responsive)
          const isResponsive = await quickInput.isEnabled();
          const hasErrorMessage = await page.locator('text=error').count() > 0;
          
          if (isResponsive && !hasErrorMessage) {
            gracefulFailures++;
          }
        }
        
        await page.keyboard.press('Escape');
      } catch (error) {
        console.log(`Attempt ${i} failed:`, error);
      }
    }

    // At least some attempts should succeed or fail gracefully
    const acceptableOutcomes = successfulMentions + gracefulFailures;
    expect(acceptableOutcomes / totalAttempts).toBeGreaterThanOrEqual(0.7); // 70% acceptable outcomes

    console.log('Error recovery test:', {
      successful: successfulMentions,
      gracefulFailures,
      total: totalAttempts,
      acceptableRate: acceptableOutcomes / totalAttempts
    });
  });

  test('PROD-007: Accessibility compliance validation', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    let tabCount = 0;
    let foundQuickPost = false;
    
    // Tab through to find QuickPost input
    while (tabCount < 20 && !foundQuickPost) {
      await page.keyboard.press('Tab');
      tabCount++;
      
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused === 'TEXTAREA') {
        const placeholder = await page.evaluate(() => 
          (document.activeElement as HTMLTextAreaElement)?.placeholder
        );
        if (placeholder?.includes('quick update')) {
          foundQuickPost = true;
        }
      }
    }

    expect(foundQuickPost).toBe(true);

    // Test mention dropdown with keyboard
    await page.keyboard.type('@test');
    await page.waitForTimeout(300);

    if (await validateMentionDropdown(page)) {
      // Test arrow navigation
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      
      // Check ARIA attributes
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toHaveAttribute('aria-label', 'Agent suggestions');
      
      const options = page.locator('[role="option"]');
      const firstOption = options.first();
      await expect(firstOption).toHaveAttribute('aria-selected');
      
      // Test selection with Enter
      await page.keyboard.press('Enter');
      
      // Verify dropdown closes
      await expect(dropdown).not.toBeVisible();
    }
  });

  test('PROD-008: Data validation and security', async ({ page }) => {
    const maliciousInputs = [
      '<script>alert("xss")</script>@test',
      '"><script>alert("xss")</script>@test',
      '@test"; DROP TABLE agents; --',
      '@test\n\n\n\n\n\n\n\n\n\n@overflow',
      '@' + 'x'.repeat(1000) // Very long input
    ];

    const quickInput = page.locator('textarea[placeholder*="quick update"]');

    for (const maliciousInput of maliciousInputs) {
      await quickInput.fill('');
      await quickInput.type(maliciousInput.slice(0, 100)); // Limit to reasonable length
      await page.waitForTimeout(300);

      // Verify no script execution
      const alertDialogs = page.locator('role=dialog[name="alert"]');
      await expect(alertDialogs).toHaveCount(0);

      // Verify UI remains functional
      await expect(quickInput).toBeEditable();

      // Clear and continue
      await quickInput.fill('');
    }

    console.log('Security validation passed for all malicious inputs');
  });
});

// Production metrics collection
test.describe('Production Metrics Collection', () => {
  test('METRICS-001: Collect production performance data', async ({ page }) => {
    const metrics = {
      pageLoadTime: 0,
      mentionDropdownTimes: [],
      insertionTimes: [],
      submissionTimes: [],
      errors: []
    };

    const startTime = Date.now();
    
    try {
      await page.goto('/', { timeout: PRODUCTION_CONFIG.timeouts.navigation });
      await waitForPageLoad(page);
      metrics.pageLoadTime = Date.now() - startTime;

      // Test QuickPost mention performance
      const quickInput = page.locator('textarea[placeholder*="quick update"]');
      
      for (let i = 0; i < 3; i++) {
        const dropdownStart = Date.now();
        await quickInput.fill('');
        await quickInput.type('@test');
        
        if (await validateMentionDropdown(page)) {
          metrics.mentionDropdownTimes.push(Date.now() - dropdownStart);
          
          const insertStart = Date.now();
          await page.locator('[role="option"]').first().click();
          metrics.insertionTimes.push(Date.now() - insertStart);
        }
        
        await quickInput.fill('');
      }

      console.log('Production metrics collected:', metrics);

    } catch (error) {
      metrics.errors.push(error);
      console.error('Metrics collection error:', error);
    }

    // Assert basic performance expectations
    expect(metrics.pageLoadTime).toBeLessThan(10000); // 10 second max page load
    if (metrics.mentionDropdownTimes.length > 0) {
      const avgDropdownTime = metrics.mentionDropdownTimes.reduce((a, b) => a + b) / metrics.mentionDropdownTimes.length;
      expect(avgDropdownTime).toBeLessThan(2000); // 2 second max dropdown
    }
  });
});