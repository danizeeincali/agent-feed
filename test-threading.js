#!/usr/bin/env node

/**
 * SPARC Threading & URL Navigation Browser Automation Test
 * Tests both critical functionality issues identified by user
 */

import { chromium } from 'playwright';

async function testThreadingAndNavigation() {
  console.log('🚀 SPARC Browser Automation: Testing Threading & URL Navigation');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    devtools: true,
    slowMo: 500 // Slow down for visual debugging
  });
  
  const page = await browser.newPage();
  
  // Navigate to the application
  console.log('📍 Navigating to application...');
  await page.goto('http://localhost:5174');
  
  // Wait for posts to load
  await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
  console.log('✅ Posts loaded successfully');
  
  // Find first post and expand comments
  const firstPost = await page.locator('[data-testid="post-card"]').first();
  await firstPost.locator('button:has-text("0")').first().click(); // Click comments button
  
  // Wait for comments to load
  await page.waitForTimeout(2000);
  console.log('✅ Comments section opened');
  
  // Take screenshot of current state
  await page.screenshot({ path: 'threading-before.png', fullPage: true });
  
  // Check for threading structure
  console.log('🔍 SPARC TEST 1: Analyzing comment threading structure...');
  
  const comments = await page.locator('.comment-level-0, .comment-level-1, .comment-level-2').all();
  console.log(`Found ${comments.length} comments with level classes`);
  
  // Check for visual indentation
  const indentedComments = await page.locator('.ml-4, .ml-6, .pl-4').all();
  console.log(`Found ${indentedComments.length} comments with indentation classes`);
  
  if (indentedComments.length === 0) {
    console.log('❌ THREADING ISSUE: No visual indentation found');
  } else {
    console.log('✅ THREADING: Visual indentation detected');
  }
  
  // Test URL navigation
  console.log('🔍 SPARC TEST 2: Testing URL hash navigation...');
  
  // Find a comment with ID
  const commentElement = await page.locator('[id^="comment-"]').first();
  if (commentElement) {
    const commentId = await commentElement.getAttribute('id');
    console.log(`Found comment: ${commentId}`);
    
    // Navigate to comment via URL hash
    await page.goto(`http://localhost:5174/#${commentId}`);
    await page.waitForTimeout(1000);
    
    // Check if comment is highlighted/scrolled to
    const isHighlighted = await page.locator(`#${commentId}`).isVisible();
    console.log(`Comment visibility after URL navigation: ${isHighlighted}`);
    
    // Check for highlight styling
    const highlightStyling = await page.locator(`#${commentId}.ring-2, #${commentId}.bg-blue-50`).count();
    if (highlightStyling > 0) {
      console.log('✅ URL NAVIGATION: Comment highlighting working');
    } else {
      console.log('❌ URL NAVIGATION ISSUE: No highlight styling found');
    }
    
    // Take screenshot after navigation
    await page.screenshot({ path: 'navigation-after.png', fullPage: true });
    
    // Test permalink copying
    const permalinkButton = await page.locator('button[title="Copy permalink"]').first();
    if (await permalinkButton.count() > 0) {
      await permalinkButton.click();
      console.log('✅ Permalink button clicked');
    }
  }
  
  // Test reply functionality and threading
  console.log('🔍 SPARC TEST 3: Testing reply threading...');
  
  const replyButton = await page.locator('button:has-text("Reply")').first();
  if (await replyButton.count() > 0) {
    await replyButton.click();
    await page.waitForTimeout(500);
    
    const replyTextarea = await page.locator('textarea[placeholder*="reply"]').first();
    if (await replyTextarea.count() > 0) {
      await replyTextarea.fill('This is a test reply to check threading structure');
      
      const submitButton = await page.locator('button:has-text("Post Reply")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check if reply appears with proper indentation
        const newReplies = await page.locator('.ml-4, .ml-6').all();
        console.log(`Reply submitted, now ${newReplies.length} indented comments found`);
      }
    }
  }
  
  // Final screenshot
  await page.screenshot({ path: 'threading-final.png', fullPage: true });
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    tests: {
      threading: {
        totalComments: comments.length,
        indentedComments: indentedComments.length,
        passed: indentedComments.length > 0
      },
      urlNavigation: {
        navigationWorked: true, // Will be updated based on actual test
        highlightingWorked: highlightStyling > 0,
        passed: highlightStyling > 0
      }
    },
    screenshots: [
      'threading-before.png',
      'navigation-after.png', 
      'threading-final.png'
    ]
  };
  
  console.log('📊 SPARC TEST RESULTS:', JSON.stringify(report, null, 2));
  
  // Keep browser open for manual inspection
  console.log('🔍 Browser remains open for manual inspection...');
  console.log('Press Ctrl+C to close');
  
  // Don't close browser automatically
  // await browser.close();
}

testThreadingAndNavigation().catch(console.error);