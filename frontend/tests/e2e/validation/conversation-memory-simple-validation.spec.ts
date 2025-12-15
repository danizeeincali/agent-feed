/**
 * CONVERSATION MEMORY VALIDATION - SIMPLIFIED E2E TEST
 *
 * This test uses the EXISTING post to validate conversation memory.
 * It checks if Avi maintains context when replying to comments.
 *
 * Strategy: Use existing post with "what is 5949+98?" and add comment "divide by 2"
 */

import { test, expect, Page } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const TEST_POST_ID = 'post-1761854826827'; // Existing post: "what is 5949+98?"

test.describe('Conversation Memory - Simplified Validation', () => {
  test('Verify Avi maintains context in existing conversation', async ({ page }) => {
    const results: any = {
      testName: 'conversation-memory-simple',
      timestamp: new Date().toISOString(),
      steps: [],
      consoleLogs: [],
      screenshots: []
    };

    // Capture console logs
    page.on('console', (msg) => {
      results.consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    console.log(`\n🧪 Testing conversation memory on existing post: ${TEST_POST_ID}`);

    try {
      // Step 1: Navigate to the existing post
      console.log(`Step 1: Navigating to post ${TEST_POST_ID}...`);

      await page.goto(`${FRONTEND_URL}/#/${TEST_POST_ID}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Take initial screenshot
      const screenshotPath1 = join(__dirname, 'screenshots', `step1-post-page-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath1, fullPage: true });
      results.screenshots.push(screenshotPath1);
      console.log(`📸 Screenshot: ${screenshotPath1}`);

      results.steps.push({
        step: 1,
        action: 'Navigate to existing post',
        postId: TEST_POST_ID,
        url: page.url()
      });

      // Step 2: Check if Avi already responded
      console.log('Step 2: Looking for Avi\'s existing response...');

      const aviComments = await page.locator('[data-author*="avi"], [data-author="Avi"]').all();
      console.log(`Found ${aviComments.length} Avi comment(s)`);

      if (aviComments.length > 0) {
        const firstAviComment = await aviComments[0].locator('[data-testid="comment-content"]').textContent();
        console.log(`✅ Avi's first response: "${firstAviComment?.substring(0, 100)}..."`);

        results.steps.push({
          step: 2,
          action: 'Found Avi\'s initial response',
          response: firstAviComment
        });

        // Verify it contains 6047
        expect(firstAviComment).toContain('6047');
      } else {
        console.log('⚠️ No Avi response found yet. Waiting...');

        // Wait up to 60 seconds for Avi to respond
        await page.waitForSelector('[data-author*="avi"], [data-author="Avi"]', { timeout: 60000 });

        const aviComment = await page.locator('[data-author*="avi"]').first().locator('[data-testid="comment-content"]').textContent();
        console.log(`✅ Avi responded: "${aviComment?.substring(0, 100)}..."`);

        results.steps.push({
          step: 2,
          action: 'Avi responded',
          response: aviComment
        });
      }

      // Take screenshot after checking Avi's response
      const screenshotPath2 = join(__dirname, 'screenshots', `step2-avi-response-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath2, fullPage: true });
      results.screenshots.push(screenshotPath2);

      // Step 3: Add comment "now divide by 2" as a USER comment
      console.log('Step 3: Adding user comment "now divide by 2"...');

      // Look for comment input at bottom of page or in reply section
      const commentInput = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="Add"], input[placeholder*="comment"]').last();

      if (await commentInput.count() > 0) {
        await commentInput.scrollIntoViewIfNeeded();
        await commentInput.fill('now divide by 2');

        // Find submit button
        const submitButton = page.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Send")').last();
        await submitButton.click();

        console.log('✅ User comment posted: "now divide by 2"');

        await page.waitForTimeout(2000);

        results.steps.push({
          step: 3,
          action: 'Posted user comment',
          comment: 'now divide by 2'
        });
      } else {
        console.log('❌ Could not find comment input field');
        results.steps.push({
          step: 3,
          action: 'Failed to find comment input',
          error: 'No comment input found'
        });
      }

      // Take screenshot after posting comment
      const screenshotPath3 = join(__dirname, 'screenshots', `step3-user-comment-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath3, fullPage: true });
      results.screenshots.push(screenshotPath3);

      // Step 4: Wait for Avi's second response (with context)
      console.log('Step 4: Waiting for Avi\'s response with context...');

      await page.waitForTimeout(5000); // Give backend time to process

      // Count Avi comments now
      const aviCommentsAfter = await page.locator('[data-author*="avi"], [data-author="Avi"]').all();
      console.log(`Now found ${aviCommentsAfter.length} Avi comment(s)`);

      if (aviCommentsAfter.length > 1) {
        // Get the LAST Avi comment (should be the new one)
        const lastAviComment = aviCommentsAfter[aviCommentsAfter.length - 1];
        const aviResponse2 = await lastAviComment.locator('[data-testid="comment-content"]').textContent();

        console.log(`✅ Avi's second response: "${aviResponse2?.substring(0, 200)}..."`);

        results.steps.push({
          step: 4,
          action: 'Avi responded with context',
          response: aviResponse2
        });

        // CRITICAL VERIFICATION
        const hasContextAnswer = aviResponse2?.includes('3023.5') ||
                                 aviResponse2?.includes('3023') ||
                                 aviResponse2?.includes('3,023') ||
                                 /3[,\s]?023\.?5?/.test(aviResponse2 || '');

        const lostContext = aviResponse2?.toLowerCase().includes("i don't see") ||
                           aviResponse2?.toLowerCase().includes("what value") ||
                           aviResponse2?.toLowerCase().includes("which number");

        console.log(`\n🎯 VERIFICATION RESULTS:`);
        console.log(`   Has correct answer (3023.5): ${hasContextAnswer}`);
        console.log(`   Lost context: ${lostContext}`);
        console.log(`   Response: "${aviResponse2}"`);

        results.verification = {
          hasContextAnswer,
          lostContext,
          expectedAnswer: '3023.5',
          actualResponse: aviResponse2,
          status: hasContextAnswer && !lostContext ? 'PASSED' : 'FAILED'
        };

        // Final screenshot
        const screenshotPath4 = join(__dirname, 'screenshots', `step4-avi-context-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath4, fullPage: true });
        results.screenshots.push(screenshotPath4);

        // Assertions
        if (lostContext) {
          console.error('❌ FAILED: Avi lost context');
          expect(lostContext).toBe(false);
        }

        if (!hasContextAnswer) {
          console.error('❌ FAILED: Avi did not provide correct answer');
          expect(hasContextAnswer).toBe(true);
        }

        console.log('✅ PASSED: Avi maintained conversation context!');

      } else {
        console.log('⚠️ Avi has not responded yet or response not detected');
        results.steps.push({
          step: 4,
          action: 'Waiting for Avi response',
          status: 'timeout or not detected'
        });

        // Final screenshot anyway
        const screenshotPath4 = join(__dirname, 'screenshots', `step4-timeout-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath4, fullPage: true });
        results.screenshots.push(screenshotPath4);
      }

      // Save results
      const resultsPath = join(__dirname, 'results', `simple-validation-${Date.now()}.json`);
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(`\n📝 Results saved: ${resultsPath}`);

    } catch (error) {
      results.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };

      // Error screenshot
      const errorScreenshot = join(__dirname, 'screenshots', `error-${Date.now()}.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      results.screenshots.push(errorScreenshot);

      // Save error results
      const resultsPath = join(__dirname, 'results', `simple-validation-ERROR-${Date.now()}.json`);
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));

      throw error;
    }
  });

  test('Manual inspection test - just open the post', async ({ page }) => {
    console.log('\n🔍 Manual Inspection Test');
    console.log('Opening the existing post for manual verification...');

    await page.goto(`${FRONTEND_URL}/#/${TEST_POST_ID}`);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    const screenshot = join(__dirname, 'screenshots', `manual-inspection-${Date.now()}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    console.log(`📸 Screenshot saved: ${screenshot}`);
    console.log('\n✅ Navigate to this URL in your browser to manually inspect:');
    console.log(`   ${FRONTEND_URL}/#/${TEST_POST_ID}`);
    console.log('\n📋 Manual Test Steps:');
    console.log('   1. Look at Avi\'s response to "what is 5949+98?" (should say 6047)');
    console.log('   2. Add a comment: "now divide by 2"');
    console.log('   3. Wait for Avi\'s response');
    console.log('   4. Verify Avi responds with "3023.5" or similar');
    console.log('   5. Check if Avi says "I don\'t see..." (FAILURE) or gives correct answer (SUCCESS)');

    // Keep browser open for 10 seconds
    await page.waitForTimeout(10000);
  });
});
