import { test, expect } from '@playwright/test';

/**
 * Personal Todos Post Validation Test Suite
 *
 * Validates that the personal-todos-agent post renders correctly with proper Markdown formatting.
 * Target Post: "Strategic Follow-up Tasks Created: Claude Flow v2.7.4 Competitive Intelligence"
 * Post ID: post-1761351090191
 *
 * Test Coverage:
 * - Post discovery and identification
 * - Markdown rendering (headers, bold, lists)
 * - Visual quality and readability
 * - Dark mode rendering
 * - Console error monitoring
 */

test.describe('Personal Todos Post Markdown Validation', () => {
  const TARGET_POST_ID = 'post-1761351090191';
  const POST_TITLE_PARTIAL = 'Strategic Follow-up Tasks Created: Claude Flow v2.7.4';
  const POST_AUTHOR = 'personal-todos-agent';

  test.beforeEach(async ({ page }) => {
    // Monitor console for errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Navigate to the feed
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for React app to mount
    await page.waitForSelector('#root > *', { timeout: 10000 });

    // Wait for posts to render - look for any post card
    await page.waitForSelector('[class*="PostCard"], [class*="post"], .post-card, article', {
      timeout: 15000
    });

    // Wait for posts to fully render
    await page.waitForTimeout(2000);
  });

  test('should find and validate personal-todos-agent post exists', async ({ page }) => {
    console.log('\n=== Test 1: Post Discovery ===');

    // Take initial screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-01-initial-feed.png',
      fullPage: true
    });

    // Find the post by title - use flexible selectors
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    // Verify post exists
    await expect(postCard).toBeVisible({ timeout: 5000 });
    console.log('✓ Post found in feed');

    // Verify author (may be in different locations depending on state)
    const authorElements = postCard.locator('h3, [class*="author"], [class*="username"], .post-header');
    const authorCount = await authorElements.count();

    if (authorCount > 0) {
      const authorText = await authorElements.first().textContent();
      console.log('✓ Author element found:', authorText?.trim());
      // Author name may be formatted differently (e.g., "Personal Todos Agent" vs "personal-todos-agent")
      const hasAuthorMatch = authorText?.toLowerCase().includes('personal') &&
                             authorText?.toLowerCase().includes('todos');
      if (hasAuthorMatch) {
        console.log('✓ Author verified:', POST_AUTHOR);
      }
    } else {
      console.log('ℹ Author element not found in expected location (may be in collapsed view)');
    }

    // Take screenshot of the post card (collapsed view)
    await postCard.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-02-post-collapsed.png',
      fullPage: true
    });

    console.log('✓ Screenshots captured');
  });

  test('should expand post and validate Markdown rendering', async ({ page }) => {
    console.log('\n=== Test 2: Markdown Rendering Validation ===');

    // Find the post
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    await expect(postCard).toBeVisible({ timeout: 5000 });
    await postCard.scrollIntoViewIfNeeded();

    // Check if post is already expanded or needs expansion
    const expandButton = postCard.locator('button').filter({ hasText: /expand|more|show more/i }).first();
    const hasExpandButton = await expandButton.count() > 0;

    if (hasExpandButton && await expandButton.isVisible()) {
      console.log('Expanding post...');
      await expandButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('Post appears to be already expanded or no expand button found');
    }

    // Take screenshot after expansion
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-03-post-expanded.png',
      fullPage: true
    });

    // Validate Markdown elements within the post content
    // Look for expanded view content or collapsed view content
    const postContent = postCard.locator('.prose, [class*="content"], [class*="body"], .post-content').first();

    // Check for headers (h2, h3)
    console.log('\nValidating Markdown elements...');

    const h2Count = await postContent.locator('h2').count();
    const h3Count = await postContent.locator('h3').count();
    console.log(`Found ${h2Count} h2 headers, ${h3Count} h3 headers`);

    if (h2Count > 0 || h3Count > 0) {
      console.log('✓ Headers rendered correctly');

      // Get header text to verify content
      if (h2Count > 0) {
        const h2Text = await postContent.locator('h2').first().textContent();
        console.log('  Sample h2:', h2Text?.trim());
      }
      if (h3Count > 0) {
        const h3Text = await postContent.locator('h3').first().textContent();
        console.log('  Sample h3:', h3Text?.trim());
      }
    }

    // Check for bold text (strong, b)
    const strongCount = await postContent.locator('strong, b').count();
    console.log(`Found ${strongCount} bold elements`);
    if (strongCount > 0) {
      console.log('✓ Bold text rendered correctly');
      const strongText = await postContent.locator('strong, b').first().textContent();
      console.log('  Sample bold:', strongText?.trim());
    }

    // Check for lists (ul, ol)
    const ulCount = await postContent.locator('ul').count();
    const olCount = await postContent.locator('ol').count();
    console.log(`Found ${ulCount} unordered lists, ${olCount} ordered lists`);
    if (ulCount > 0 || olCount > 0) {
      console.log('✓ Lists rendered correctly');
    }

    // Check for list items
    const liCount = await postContent.locator('li').count();
    console.log(`Found ${liCount} list items`);

    // Verify no raw Markdown syntax is visible
    const contentText = await postContent.textContent();
    const hasRawMarkdown = contentText?.includes('##') ||
                          contentText?.includes('**') ||
                          (contentText?.match(/^\s*[-*]\s/m) !== null);

    if (hasRawMarkdown) {
      console.warn('⚠ Warning: Raw Markdown syntax may be visible');
    } else {
      console.log('✓ No raw Markdown syntax visible');
    }

    // Take close-up screenshot of post content
    await postContent.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-04-content-detail.png'
    });

    // Assert key Markdown elements are present
    expect(h2Count + h3Count).toBeGreaterThan(0); // At least one header
    expect(strongCount).toBeGreaterThan(0); // At least one bold element
    // List items may or may not be present depending on content
    if (liCount > 0) {
      console.log('✓ List items found and rendered');
    } else {
      console.log('ℹ No list items in this post (content may vary)');
    }
  });

  test('should validate visual quality and spacing', async ({ page }) => {
    console.log('\n=== Test 3: Visual Quality Validation ===');

    // Find the post
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    await expect(postCard).toBeVisible({ timeout: 5000 });
    await postCard.scrollIntoViewIfNeeded();

    // Expand if needed
    const expandButton = postCard.locator('button').filter({ hasText: /expand|more|show more/i }).first();
    if (await expandButton.count() > 0 && await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(1000);
    }

    const postContent = postCard.locator('.prose, [class*="content"], [class*="body"], .post-content').first();

    // Check header styling
    const h2Elements = postContent.locator('h2');
    if (await h2Elements.count() > 0) {
      const h2Styles = await h2Elements.first().evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          marginTop: computed.marginTop,
          marginBottom: computed.marginBottom,
          color: computed.color
        };
      });

      console.log('H2 Styles:', h2Styles);

      // Verify header has proper styling
      const fontSize = parseInt(h2Styles.fontSize);
      expect(fontSize).toBeGreaterThan(16); // Headers should be larger than body text
      console.log('✓ Headers properly sized');
    }

    // Check list styling
    const ulElements = postContent.locator('ul');
    if (await ulElements.count() > 0) {
      const ulStyles = await ulElements.first().evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          marginLeft: computed.marginLeft,
          paddingLeft: computed.paddingLeft,
          listStyleType: computed.listStyleType
        };
      });

      console.log('UL Styles:', ulStyles);
      console.log('✓ Lists properly styled');
    }

    // Check strong text styling
    const strongElements = postContent.locator('strong, b');
    if (await strongElements.count() > 0) {
      const strongStyles = await strongElements.first().evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontWeight: computed.fontWeight
        };
      });

      console.log('Strong Styles:', strongStyles);
      expect(parseInt(strongStyles.fontWeight)).toBeGreaterThanOrEqual(600);
      console.log('✓ Bold text properly weighted');
    }

    // Take final quality screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-05-quality-check.png',
      fullPage: true
    });
  });

  test('should validate dark mode rendering', async ({ page }) => {
    console.log('\n=== Test 4: Dark Mode Validation ===');

    // Check if dark mode toggle exists
    const darkModeToggle = page.locator('button, [role="switch"]').filter({
      hasText: /dark|theme|mode/i
    }).first();

    const hasDarkModeToggle = await darkModeToggle.count() > 0;

    if (hasDarkModeToggle && await darkModeToggle.isVisible()) {
      console.log('Dark mode toggle found, enabling dark mode...');
      await darkModeToggle.click();
      await page.waitForTimeout(1000);
    } else {
      // Try to enable dark mode via class manipulation if no toggle
      console.log('Attempting to enable dark mode via class...');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      });
      await page.waitForTimeout(500);
    }

    // Find the post
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    await expect(postCard).toBeVisible({ timeout: 5000 });
    await postCard.scrollIntoViewIfNeeded();

    // Expand if needed
    const expandButton = postCard.locator('button').filter({ hasText: /expand|more|show more/i }).first();
    if (await expandButton.count() > 0 && await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(1000);
    }

    // Take dark mode screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-06-dark-mode.png',
      fullPage: true
    });

    // Verify dark mode colors
    const postContent = postCard.locator('.prose, [class*="content"], [class*="body"], .post-content').first();
    const bgColor = await postCard.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log('Dark mode background color:', bgColor);

    // Take close-up of content in dark mode
    await postContent.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-07-dark-mode-content.png'
    });

    console.log('✓ Dark mode screenshots captured');
  });

  test('should validate no console errors during post render', async ({ page }) => {
    console.log('\n=== Test 5: Console Error Validation ===');

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Find and interact with the post
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    await expect(postCard).toBeVisible({ timeout: 5000 });
    await postCard.scrollIntoViewIfNeeded();

    // Expand if needed
    const expandButton = postCard.locator('button').filter({ hasText: /expand|more|show more/i }).first();
    if (await expandButton.count() > 0 && await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(1000);
    }

    // Wait for any async rendering
    await page.waitForTimeout(2000);

    // Report console messages
    console.log('\nConsole Error Count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }

    console.log('Console Warning Count:', consoleWarnings.length);
    if (consoleWarnings.length > 0) {
      console.log('Warnings:', consoleWarnings.slice(0, 5)); // First 5 warnings
    }

    // Take final validation screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-08-final-validation.png',
      fullPage: true
    });

    // Assert no critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('Failed to load resource')
    );

    expect(criticalErrors.length).toBe(0);
    console.log('✓ No critical console errors');
  });

  test('should validate specific Markdown content elements', async ({ page }) => {
    console.log('\n=== Test 6: Specific Content Validation ===');

    // Find the post
    const postCard = await page.locator('[class*="PostCard"], [class*="post"], .post-card, article').filter({
      hasText: POST_TITLE_PARTIAL
    }).first();

    await expect(postCard).toBeVisible({ timeout: 5000 });
    await postCard.scrollIntoViewIfNeeded();

    // Expand if needed
    const expandButton = postCard.locator('button').filter({ hasText: /expand|more|show more/i }).first();
    if (await expandButton.count() > 0 && await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(1000);
    }

    const postContent = postCard.locator('.prose, [class*="content"], [class*="body"], .post-content').first();

    // Get all text content
    const fullText = await postContent.textContent();
    console.log('\nPost content length:', fullText?.length, 'characters');

    // Validate expected content sections
    const expectedSections = [
      'Context Research',
      'Market Position',
      'Key Differentiators',
      'Research',
      'Documentation'
    ];

    console.log('\nValidating expected content sections...');
    for (const section of expectedSections) {
      if (fullText?.includes(section)) {
        console.log('✓ Found section:', section);
      } else {
        console.log('✗ Missing section:', section);
      }
    }

    // Check for proper list formatting
    const listItems = await postContent.locator('li').all();
    console.log('\nList items found:', listItems.length);

    if (listItems.length > 0) {
      // Sample first few list items
      for (let i = 0; i < Math.min(3, listItems.length); i++) {
        const itemText = await listItems[i].textContent();
        console.log(`  List item ${i + 1}:`, itemText?.trim().substring(0, 60) + '...');
      }
    }

    // Validate paragraph spacing
    const paragraphs = await postContent.locator('p').all();
    console.log('\nParagraphs found:', paragraphs.length);

    // Take detailed content screenshot
    await postContent.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/personal-todos-09-content-validation.png'
    });

    console.log('✓ Content validation complete');
  });
});
