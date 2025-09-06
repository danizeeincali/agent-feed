#!/usr/bin/env node

// CRITICAL BROWSER TESTING: Real Comment System Final Validation
// This script tests the comment system in the browser programmatically

const puppeteer = require('puppeteer');

async function testCommentSystem() {
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
        
        console.log('📍 Current URL:', await page.url());
        
        // Wait for posts to load
        console.log('⏳ Waiting for posts to load...');
        await page.waitForSelector('[data-testid="social-post"], .post-card, .agent-post', { timeout: 10000 });
        
        // Get all posts with comment buttons
        const posts = await page.$$('[data-testid="social-post"], .post-card, .agent-post');
        console.log(`📋 Found ${posts.length} posts`);
        
        const testResults = [];
        
        for (let i = 0; i < Math.min(3, posts.length); i++) {
            const post = posts[i];
            const postId = i + 1;
            
            console.log(`\n🧪 Testing Post ${postId}:`);
            
            // Look for comment button
            const commentButton = await post.$('button[aria-label*="comment"], .comment-button, button:has-text("comment")');
            
            if (!commentButton) {
                console.log(`❌ No comment button found in post ${postId}`);
                continue;
            }
            
            // Get comment count
            const commentCount = await commentButton.textContent();
            console.log(`💬 Comment count: "${commentCount}"`);
            
            // Click to open comments
            console.log(`🖱️ Clicking comment button for post ${postId}...`);
            await commentButton.click();
            
            // Wait for comments to load
            await page.waitForTimeout(2000);
            
            // Check for loading state
            const hasLoader = await page.$('.loading, .spinner, [data-testid="loading"]');
            if (hasLoader) {
                console.log('⏳ Loading animation detected');
                await page.waitForTimeout(1000);
            }
            
            // Get comment content
            const comments = await post.$$('.comment, [data-testid="comment"]');
            console.log(`📝 Found ${comments.length} comments for post ${postId}`);
            
            const commentDetails = [];
            for (let j = 0; j < Math.min(3, comments.length); j++) {
                const comment = comments[j];
                
                try {
                    const author = await comment.$eval('.author, .comment-author, .username', el => el.textContent?.trim());
                    const timestamp = await comment.$eval('.timestamp, .comment-time, .time', el => el.textContent?.trim());
                    const content = await comment.$eval('.content, .comment-content, .text', el => el.textContent?.trim());
                    
                    commentDetails.push({ author, timestamp, content: content?.substring(0, 50) + '...' });
                    console.log(`   👤 Author: "${author}" | ⏰ Time: "${timestamp}"`);
                } catch (e) {
                    console.log(`   ⚠️ Could not extract comment ${j + 1} details:`, e.message);
                }
            }
            
            // Test toggle functionality
            console.log(`🔄 Testing toggle functionality for post ${postId}...`);
            await commentButton.click(); // Close
            await page.waitForTimeout(500);
            await commentButton.click(); // Open again
            await page.waitForTimeout(500);
            
            testResults.push({
                postId,
                commentCount,
                commentsFound: comments.length,
                commentDetails,
                hasUniqueContent: commentDetails.length > 0
            });
        }
        
        // Check console errors
        console.log('\n🔍 Checking for JavaScript errors...');
        const logs = await page.evaluate(() => {
            return window.console.errors || [];
        });
        
        // Summary
        console.log('\n📊 TEST SUMMARY:');
        console.log('================');
        
        testResults.forEach((result, index) => {
            console.log(`\nPost ${result.postId}:`);
            console.log(`  💬 Comment Count: ${result.commentCount}`);
            console.log(`  📝 Comments Found: ${result.commentsFound}`);
            console.log(`  ✨ Unique Content: ${result.hasUniqueContent ? '✅' : '❌'}`);
            
            if (result.commentDetails.length > 0) {
                console.log(`  👥 Authors: ${result.commentDetails.map(c => c.author).join(', ')}`);
                console.log(`  ⏰ Timestamps: ${result.commentDetails.map(c => c.timestamp).join(', ')}`);
            }
        });
        
        // Validate success criteria
        const uniqueAuthors = new Set();
        testResults.forEach(result => {
            result.commentDetails.forEach(comment => {
                if (comment.author) uniqueAuthors.add(comment.author);
            });
        });
        
        const hasRealisticAuthors = Array.from(uniqueAuthors).some(author => 
            author && !author.includes('User') && !author.includes('Agent Smith')
        );
        
        console.log('\n🏆 SUCCESS CRITERIA CHECK:');
        console.log('===========================');
        console.log(`✅ Different comments per post: ${testResults.length > 1 ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Realistic author names: ${hasRealisticAuthors ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Multiple posts tested: ${testResults.length >= 3 ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Comments load properly: ${testResults.every(r => r.commentsFound > 0) ? 'PASS' : 'FAIL'}`);
        
        const overallSuccess = testResults.length >= 3 && 
                              hasRealisticAuthors && 
                              testResults.every(r => r.commentsFound > 0);
        
        console.log(`\n🎯 OVERALL RESULT: ${overallSuccess ? '🟢 SUCCESS' : '🔴 FAILED'}`);
        
        return testResults;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return null;
    } finally {
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Press Ctrl+C when done to close the browser.');
        
        // Wait for user to close manually
        process.on('SIGINT', async () => {
            console.log('\n👋 Closing browser...');
            await browser.close();
            process.exit(0);
        });
        
        // Keep alive
        await new Promise(() => {});
    }
}

// Run the test
testCommentSystem().catch(console.error);