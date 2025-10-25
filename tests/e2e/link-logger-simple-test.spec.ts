import { test, expect } from '@playwright/test';

test.describe('Link Logger Comment - Simple Validation', () => {
  test.setTimeout(120000); // 2 minutes for agent processing

  test('validates link-logger posts comment (not new post) with real intelligence', async ({ page }) => {
    console.log('\n=== LINK LOGGER COMMENT VALIDATION ===\n');

    // Step 1: Navigate and wait for load
    console.log('Step 1: Loading application...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-01-loaded.png', fullPage: true });
    console.log('✓ Application loaded');

    // Step 2: Wait for connection
    console.log('\nStep 2: Waiting for API connection...');
    let retries = 0;
    while (retries < 5) {
      const isDisconnected = await page.locator('text=Disconnected').count();
      if (isDisconnected === 0) {
        console.log('✓ API connected');
        break;
      }
      console.log(`Retry ${retries + 1}/5: Still disconnected, waiting...`);
      await page.waitForTimeout(2000);
      retries++;
    }

    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-02-connected.png', fullPage: true });

    // Step 3: Create post with LinkedIn URL
    console.log('\nStep 3: Creating post with LinkedIn URL...');
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });

    const uniqueId = `test-${Date.now()}`;
    const linkedinUrl = 'https://www.linkedin.com/posts/anthropic-ai-test-post-12345';
    const postContent = `Link Logger Test ${uniqueId} - ${linkedinUrl}`;

    await textarea.click();
    await textarea.fill(postContent);
    await page.waitForTimeout(500);

    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-03-post-filled.png', fullPage: true });
    console.log(`✓ Post content: "${postContent}"`);

    // Step 4: Submit post
    console.log('\nStep 4: Submitting post...');
    const submitButton = page.locator('button:has-text("Quick Post")').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-04-post-submitted.png', fullPage: true });
    console.log('✓ Post submitted');

    // Step 5: Wait for post to appear
    console.log('\nStep 5: Waiting for post to appear in feed...');
    await page.waitForSelector(`text=${uniqueId}`, { timeout: 15000 });
    console.log('✓ Post appeared in feed');

    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-05-post-appeared.png', fullPage: true });

    // Step 6: Wait for link-logger comment (up to 60 seconds)
    console.log('\nStep 6: Waiting for link-logger comment...');
    let commentFound = false;
    let attempt = 0;
    const maxAttempts = 30; // 30 * 2s = 60 seconds

    while (!commentFound && attempt < maxAttempts) {
      attempt++;
      await page.waitForTimeout(2000);

      // Look for link-logger activity
      const pageContent = await page.content();
      if (pageContent.toLowerCase().includes('link-logger') ||
          pageContent.toLowerCase().includes('linkedin') && pageContent.toLowerCase().includes('analysis')) {
        console.log(`✓ Link-logger activity detected after ${attempt * 2} seconds`);
        commentFound = true;
      } else {
        console.log(`Attempt ${attempt}/${maxAttempts}: Waiting for link-logger...`);
      }
    }

    if (!commentFound) {
      await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-06-timeout.png', fullPage: true });
      console.log('⚠ WARNING: Link-logger did not respond within 60 seconds');
      console.log('This may indicate:');
      console.log('1. Agent worker is not processing URLs');
      console.log('2. Link detection is not working');
      console.log('3. Comment posting is failing');
      throw new Error('Link-logger did not respond within 60 seconds');
    }

    // Step 7: Capture final state
    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-07-comment-found.png', fullPage: true });

    // Step 8: Validate comment is a reply (not new post)
    console.log('\nStep 7: Validating comment structure...');

    const fullPageContent = await page.content();

    // Count how many times our test ID appears
    const testIdMatches = (fullPageContent.match(new RegExp(uniqueId, 'g')) || []).length;
    console.log(`Found "${uniqueId}" ${testIdMatches} time(s) in page`);

    // Count link-logger mentions
    const linkLoggerMatches = (fullPageContent.toLowerCase().match(/link-logger/g) || []).length;
    console.log(`Found "link-logger" ${linkLoggerMatches} time(s) in page`);

    // Validate - should only be ONE post with our ID
    expect(testIdMatches).toBe(1);
    console.log('✓ Only ONE post with our test ID (no duplicate standalone post)');

    // Validate - should have at least one link-logger mention
    expect(linkLoggerMatches).toBeGreaterThanOrEqual(1);
    console.log('✓ Link-logger response detected');

    // Step 9: Validate real intelligence (not mock)
    console.log('\nStep 8: Validating real intelligence content...');

    // Check for mock indicators (should NOT be present)
    expect(fullPageContent.toLowerCase()).not.toContain('mock intelligence');
    expect(fullPageContent.toLowerCase()).not.toContain('example.com/mock');
    console.log('✓ No mock content detected');

    // Final screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/link-logger-08-final.png', fullPage: true });

    console.log('\n=== ALL VALIDATIONS PASSED ===');
    console.log('✓ Post created successfully');
    console.log('✓ Link-logger responded');
    console.log('✓ Comment is a reply (not standalone post)');
    console.log('✓ Real intelligence content (not mock)');
    console.log('\nScreenshots saved to: /workspaces/agent-feed/tests/screenshots/link-logger-*.png');
  });
});
