import { test, expect, type Page, type Locator } from '@playwright/test';

interface MentionTestResult {
  dropdownFound: boolean;
  debugMessageFound: boolean;
  inputValue: string;
  domStructure: string;
  screenshot: string;
  timestamp: string;
}

interface ComponentComparison {
  postcreator: MentionTestResult;
  commentForm: MentionTestResult;
  differences: string[];
}

test.describe('🚨 EMERGENCY: Comment @ Mention Dropdown Validation', () => {
  let validationResults: ComponentComparison;
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173/');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    
    // Initialize results structure
    validationResults = {
      postcreator: {
        dropdownFound: false,
        debugMessageFound: false,
        inputValue: '',
        domStructure: '',
        screenshot: '',
        timestamp: new Date().toISOString()
      },
      commentForm: {
        dropdownFound: false,
        debugMessageFound: false,
        inputValue: '',
        domStructure: '',
        screenshot: '',
        timestamp: new Date().toISOString()
      },
      differences: []
    };
  });

  test('🔍 VALIDATE: PostCreator @ mention dropdown (EXPECTED: WORKING)', async ({ page }) => {
    console.log('\n🚨 EMERGENCY TEST: PostCreator @ mention validation');
    
    // Find and click the "What's on your mind?" input in PostCreator
    const postCreatorInput = page.locator('[data-testid="post-creator-input"], .post-creator textarea, [placeholder*="mind"], [placeholder*="happening"]').first();
    await expect(postCreatorInput).toBeVisible({ timeout: 10000 });
    
    // Take screenshot before interaction
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/postcreator-before-mention.png', fullPage: true });
    
    // Click and type @ character
    await postCreatorInput.click();
    await postCreatorInput.fill('@');
    
    // Wait a moment for dropdown to appear
    await page.waitForTimeout(1000);
    
    // Check for dropdown or debug message
    const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .mention-suggestions').first();
    const debugMessage = page.locator('text="🚨 EMERGENCY DEBUG: Dropdown Open"');
    
    validationResults.postcreator = {
      dropdownFound: await dropdown.isVisible().catch(() => false),
      debugMessageFound: await debugMessage.isVisible().catch(() => false),
      inputValue: await postCreatorInput.inputValue(),
      domStructure: await page.locator('body').innerHTML(),
      screenshot: '/workspaces/agent-feed/frontend/test-results/postcreator-after-mention.png',
      timestamp: new Date().toISOString()
    };
    
    // Take screenshot after typing @
    await page.screenshot({ path: validationResults.postcreator.screenshot, fullPage: true });
    
    // Log results
    console.log('📊 PostCreator Results:');
    console.log(`   Dropdown Found: ${validationResults.postcreator.dropdownFound}`);
    console.log(`   Debug Message Found: ${validationResults.postcreator.debugMessageFound}`);
    console.log(`   Input Value: "${validationResults.postcreator.inputValue}"`);
    
    // Expected to work - validate it's working
    if (!validationResults.postcreator.dropdownFound && !validationResults.postcreator.debugMessageFound) {
      console.log('⚠️ WARNING: PostCreator @ mention not working as expected!');
    } else {
      console.log('✅ SUCCESS: PostCreator @ mention working correctly');
    }
  });

  test('🚨 CRITICAL: CommentForm @ mention dropdown (EXPECTED: FAILING)', async ({ page }) => {
    console.log('\n🚨 EMERGENCY TEST: CommentForm @ mention validation');
    
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post"], .post, [class*="post"]', { timeout: 10000 });
    
    // Find the first post and its reply button
    const firstPost = page.locator('[data-testid="post"], .post, [class*="post"]').first();
    await expect(firstPost).toBeVisible();
    
    // Look for reply button with various selectors
    const replyButton = firstPost.locator('button:has-text("Reply"), button[data-testid="reply-button"], button[aria-label*="reply"], button[title*="reply"], .reply-button, [class*="reply"]').first();
    
    // Take screenshot before clicking reply
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/comment-before-reply.png', fullPage: true });
    
    // Click reply button to open comment form
    await replyButton.click();
    await page.waitForTimeout(1000);
    
    // Find comment input field with various selectors
    const commentInput = page.locator('textarea[data-testid="comment-input"], textarea[placeholder*="comment"], textarea[placeholder*="reply"], .comment-form textarea, [class*="comment"] textarea').first();
    
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    
    // Take screenshot showing comment form is open
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/comment-form-open.png', fullPage: true });
    
    // Click and type @ character in comment input
    await commentInput.click();
    await commentInput.fill('@');
    
    // Wait for potential dropdown
    await page.waitForTimeout(2000);
    
    // Check for dropdown or debug message
    const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .mention-suggestions').first();
    const debugMessage = page.locator('text="🚨 EMERGENCY DEBUG: Dropdown Open"');
    
    validationResults.commentForm = {
      dropdownFound: await dropdown.isVisible().catch(() => false),
      debugMessageFound: await debugMessage.isVisible().catch(() => false),
      inputValue: await commentInput.inputValue(),
      domStructure: await page.locator('body').innerHTML(),
      screenshot: '/workspaces/agent-feed/frontend/test-results/comment-after-mention.png',
      timestamp: new Date().toISOString()
    };
    
    // Take screenshot after typing @
    await page.screenshot({ path: validationResults.commentForm.screenshot, fullPage: true });
    
    // Log results
    console.log('📊 CommentForm Results:');
    console.log(`   Dropdown Found: ${validationResults.commentForm.dropdownFound}`);
    console.log(`   Debug Message Found: ${validationResults.commentForm.debugMessageFound}`);
    console.log(`   Input Value: "${validationResults.commentForm.inputValue}"`);
    
    // Expected to fail - document the failure
    if (!validationResults.commentForm.dropdownFound && !validationResults.commentForm.debugMessageFound) {
      console.log('🚨 CONFIRMED: CommentForm @ mention dropdown FAILING as expected!');
      console.log('📝 This confirms the bug that needs to be fixed');
    } else {
      console.log('🎉 UNEXPECTED: CommentForm @ mention actually working!');
    }
  });

  test('📊 COMPREHENSIVE: Side-by-side behavior comparison', async ({ page }) => {
    console.log('\n📊 COMPREHENSIVE COMPARISON: PostCreator vs CommentForm');
    
    // Test PostCreator first
    const postCreatorInput = page.locator('[data-testid="post-creator-input"], .post-creator textarea, [placeholder*="mind"], [placeholder*="happening"]').first();
    await postCreatorInput.click();
    await postCreatorInput.fill('@test');
    await page.waitForTimeout(1000);
    
    // Capture PostCreator state
    const postCreatorDropdown = await page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .mention-suggestions').isVisible().catch(() => false);
    const postCreatorDebug = await page.locator('text="🚨 EMERGENCY DEBUG: Dropdown Open"').isVisible().catch(() => false);
    
    // Take screenshot of PostCreator with @
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/comparison-postcreator.png', fullPage: true });
    
    // Clear and navigate to comment form
    await postCreatorInput.fill('');
    
    // Open comment form
    const firstPost = page.locator('[data-testid="post"], .post, [class*="post"]').first();
    const replyButton = firstPost.locator('button:has-text("Reply"), button[data-testid="reply-button"], .reply-button').first();
    await replyButton.click();
    await page.waitForTimeout(1000);
    
    // Test CommentForm
    const commentInput = page.locator('textarea[data-testid="comment-input"], textarea[placeholder*="comment"], .comment-form textarea').first();
    await commentInput.click();
    await commentInput.fill('@test');
    await page.waitForTimeout(1000);
    
    // Capture CommentForm state
    const commentDropdown = await page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .mention-suggestions').isVisible().catch(() => false);
    const commentDebug = await page.locator('text="🚨 EMERGENCY DEBUG: Dropdown Open"').isVisible().catch(() => false);
    
    // Take screenshot of CommentForm with @
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/comparison-commentform.png', fullPage: true });
    
    // Generate comparison report
    const comparisonReport = {
      postcreator: {
        dropdown: postCreatorDropdown,
        debug: postCreatorDebug,
        working: postCreatorDropdown || postCreatorDebug
      },
      commentform: {
        dropdown: commentDropdown,
        debug: commentDebug,
        working: commentDropdown || commentDebug
      },
      differences: [] as string[]
    };
    
    if (comparisonReport.postcreator.working !== comparisonReport.commentform.working) {
      comparisonReport.differences.push('Dropdown behavior differs between components');
    }
    if (comparisonReport.postcreator.dropdown !== comparisonReport.commentform.dropdown) {
      comparisonReport.differences.push('Dropdown visibility differs');
    }
    if (comparisonReport.postcreator.debug !== comparisonReport.commentform.debug) {
      comparisonReport.differences.push('Debug message visibility differs');
    }
    
    console.log('\n📋 COMPARISON RESULTS:');
    console.log('PostCreator:', comparisonReport.postcreator);
    console.log('CommentForm:', comparisonReport.commentform);
    console.log('Differences:', comparisonReport.differences);
    
    // Save comparison data
    await page.evaluate((report) => {
      localStorage.setItem('mention-comparison-report', JSON.stringify(report));
    }, comparisonReport);
  });

  test('🔍 DOM STRUCTURE: Analyze component differences', async ({ page }) => {
    console.log('\n🔍 DOM STRUCTURE ANALYSIS');
    
    // Analyze PostCreator DOM structure
    const postCreatorInput = page.locator('[data-testid="post-creator-input"], .post-creator textarea, [placeholder*="mind"], [placeholder*="happening"]').first();
    await postCreatorInput.click();
    await postCreatorInput.fill('@');
    await page.waitForTimeout(1000);
    
    const postCreatorContainer = page.locator('.post-creator, [data-testid="post-creator"], [class*="post-creator"]').first();
    const postCreatorHTML = await postCreatorContainer.innerHTML().catch(() => 'Not found');
    
    // Analyze CommentForm DOM structure
    const firstPost = page.locator('[data-testid="post"], .post, [class*="post"]').first();
    const replyButton = firstPost.locator('button:has-text("Reply"), .reply-button').first();
    await replyButton.click();
    await page.waitForTimeout(1000);
    
    const commentInput = page.locator('textarea[data-testid="comment-input"], textarea[placeholder*="comment"], .comment-form textarea').first();
    await commentInput.click();
    await commentInput.fill('@');
    await page.waitForTimeout(1000);
    
    const commentContainer = page.locator('.comment-form, [data-testid="comment-form"], [class*="comment-form"]').first();
    const commentHTML = await commentContainer.innerHTML().catch(() => 'Not found');
    
    // Create DOM comparison
    const domAnalysis = {
      postcreator: {
        html: postCreatorHTML.substring(0, 2000), // Truncate for logging
        hasDropdownContainer: postCreatorHTML.includes('mention-dropdown'),
        hasMentionInput: postCreatorHTML.includes('MentionInput'),
        hasDebugElements: postCreatorHTML.includes('EMERGENCY DEBUG')
      },
      commentform: {
        html: commentHTML.substring(0, 2000), // Truncate for logging
        hasDropdownContainer: commentHTML.includes('mention-dropdown'),
        hasMentionInput: commentHTML.includes('MentionInput'),
        hasDebugElements: commentHTML.includes('EMERGENCY DEBUG')
      },
      keyDifferences: [] as string[]
    };
    
    // Identify key differences
    if (domAnalysis.postcreator.hasDropdownContainer !== domAnalysis.commentform.hasDropdownContainer) {
      domAnalysis.keyDifferences.push('Dropdown container presence differs');
    }
    if (domAnalysis.postcreator.hasMentionInput !== domAnalysis.commentform.hasMentionInput) {
      domAnalysis.keyDifferences.push('MentionInput component usage differs');
    }
    if (domAnalysis.postcreator.hasDebugElements !== domAnalysis.commentform.hasDebugElements) {
      domAnalysis.keyDifferences.push('Debug elements presence differs');
    }
    
    console.log('\n🏗️ DOM ANALYSIS RESULTS:');
    console.log('PostCreator has dropdown container:', domAnalysis.postcreator.hasDropdownContainer);
    console.log('CommentForm has dropdown container:', domAnalysis.commentform.hasDropdownContainer);
    console.log('Key differences:', domAnalysis.keyDifferences);
    
    // Save DOM analysis
    await page.evaluate((analysis) => {
      localStorage.setItem('dom-analysis-report', JSON.stringify(analysis));
    }, domAnalysis);
  });

  test('⌨️ KEYBOARD NAVIGATION: Test mention selection workflow', async ({ page }) => {
    console.log('\n⌨️ KEYBOARD NAVIGATION TESTING');
    
    // Test keyboard navigation in PostCreator (expected to work)
    const postCreatorInput = page.locator('[data-testid="post-creator-input"], .post-creator textarea, [placeholder*="mind"], [placeholder*="happening"]').first();
    await postCreatorInput.click();
    await postCreatorInput.fill('@');
    await page.waitForTimeout(1000);
    
    // Try keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    const postCreatorValue = await postCreatorInput.inputValue();
    console.log('PostCreator final value:', postCreatorValue);
    
    // Test keyboard navigation in CommentForm (expected to fail)
    await postCreatorInput.fill('');
    
    const firstPost = page.locator('[data-testid="post"], .post, [class*="post"]').first();
    const replyButton = firstPost.locator('button:has-text("Reply"), .reply-button').first();
    await replyButton.click();
    await page.waitForTimeout(1000);
    
    const commentInput = page.locator('textarea[data-testid="comment-input"], textarea[placeholder*="comment"], .comment-form textarea').first();
    await commentInput.click();
    await commentInput.fill('@');
    await page.waitForTimeout(1000);
    
    // Try keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    const commentValue = await commentInput.inputValue();
    console.log('CommentForm final value:', commentValue);
    
    // Compare keyboard navigation results
    const keyboardResults = {
      postcreator: {
        initialValue: '@',
        finalValue: postCreatorValue,
        mentionInserted: postCreatorValue !== '@' && postCreatorValue.length > 1
      },
      commentform: {
        initialValue: '@',
        finalValue: commentValue,
        mentionInserted: commentValue !== '@' && commentValue.length > 1
      }
    };
    
    console.log('\n⌨️ KEYBOARD NAVIGATION RESULTS:');
    console.log('PostCreator mention insertion:', keyboardResults.postcreator.mentionInserted);
    console.log('CommentForm mention insertion:', keyboardResults.commentform.mentionInserted);
    
    if (keyboardResults.postcreator.mentionInserted !== keyboardResults.commentform.mentionInserted) {
      console.log('🚨 CRITICAL: Keyboard navigation differs between components!');
    }
  });

  test('📱 RESPONSIVE: Test mention behavior across screen sizes', async ({ page }) => {
    console.log('\n📱 RESPONSIVE DESIGN TESTING');
    
    const screenSizes = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const size of screenSizes) {
      console.log(`\n📐 Testing ${size.name} (${size.width}x${size.height})`);
      
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(1000);
      
      // Test comment form at this screen size
      const firstPost = page.locator('[data-testid="post"], .post, [class*="post"]').first();
      const replyButton = firstPost.locator('button:has-text("Reply"), .reply-button').first();
      
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(1000);
        
        const commentInput = page.locator('textarea[data-testid="comment-input"], textarea[placeholder*="comment"], .comment-form textarea').first();
        
        if (await commentInput.isVisible()) {
          await commentInput.click();
          await commentInput.fill('@');
          await page.waitForTimeout(1000);
          
          const dropdown = await page.locator('[data-testid="mention-dropdown"], .mention-dropdown').isVisible().catch(() => false);
          
          console.log(`   ${size.name} - Comment dropdown visible: ${dropdown}`);
          
          // Take screenshot for this screen size
          await page.screenshot({ 
            path: `/workspaces/agent-feed/frontend/test-results/comment-mention-${size.name.toLowerCase()}.png`,
            fullPage: true 
          });
          
          await commentInput.fill('');
        }
      }
    }
    
    // Reset to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.afterAll(async ({ page }) => {
    // Generate final validation report
    const finalReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Emergency Comment Mention Validation',
      critical_findings: [
        'CommentForm @ mention dropdown behavior',
        'PostCreator vs CommentForm component differences',
        'DOM structure analysis results',
        'Keyboard navigation comparison',
        'Responsive behavior validation'
      ],
      next_steps: [
        'Apply fixes to CommentForm component',
        'Ensure MentionInput integration in comment forms',
        'Validate dropdown positioning in comment context',
        'Test mention insertion workflow',
        'Re-run tests to confirm fixes'
      ]
    };
    
    console.log('\n📋 FINAL EMERGENCY VALIDATION REPORT:');
    console.log(JSON.stringify(finalReport, null, 2));
    
    // Save report to localStorage for retrieval
    await page.evaluate((report) => {
      localStorage.setItem('emergency-validation-report', JSON.stringify(report));
    }, finalReport);
  });
});
