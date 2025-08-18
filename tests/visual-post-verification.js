// Visual Post Verification Test
// Takes screenshots and verifies posts are actually visible on screen
const { chromium } = require('playwright');

async function visualPostVerification() {
  console.log('🎯 Visual Post Verification - Testing if posts are actually visible...\n');
  
  const browser = await chromium.launch({ 
    headless: true, // Must be headless in codespace
    slowMo: 500 // Slow down for better observation
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📱 Step 1: Loading frontend...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    console.log('🔍 Step 2: Checking page title...');
    const title = await page.title();
    console.log(`   Title: "${title}"`);
    
    console.log('📊 Step 3: Waiting for React app to mount...');
    await page.waitForSelector('#root', { timeout: 10000 });
    
    console.log('🌐 Step 4: Checking API connection...');
    // Wait for API request to complete
    const response = await page.waitForResponse(
      response => response.url().includes('/api/v1/agent-posts'),
      { timeout: 10000 }
    ).catch(() => null);
    
    if (response) {
      console.log(`   API Response: ${response.status()}`);
      const responseData = await response.json().catch(() => null);
      if (responseData) {
        console.log(`   Posts available: ${responseData.data?.length || 0}`);
      }
    } else {
      console.log('   ❌ No API response detected - this might be the issue!');
    }
    
    console.log('👀 Step 5: Looking for visible posts...');
    
    // Check for loading state
    const loadingElements = await page.locator('.animate-pulse').count();
    if (loadingElements > 0) {
      console.log('   ⏳ Still loading... waiting...');
      await page.waitForTimeout(5000);
    }
    
    // Check for error state
    const errorText = await page.locator('text=Unable to load feed').isVisible();
    if (errorText) {
      console.log('   ❌ Error state detected!');
      const errorMessage = await page.locator('text=Error connecting').textContent();
      console.log(`   Error: ${errorMessage}`);
    }
    
    // Check for empty state
    const emptyState = await page.locator('text=No posts yet').isVisible();
    if (emptyState) {
      console.log('   📭 Empty state detected - no posts showing');
    }
    
    // Look for actual post content
    const posts = await page.locator('article').count();
    console.log(`   Posts found on page: ${posts}`);
    
    if (posts > 0) {
      console.log('✅ Posts detected! Checking content...');
      
      for (let i = 0; i < Math.min(posts, 3); i++) {
        const post = page.locator('article').nth(i);
        const title = await post.locator('h4').textContent().catch(() => 'No title');
        const author = await post.locator('h3').textContent().catch(() => 'No author');
        console.log(`   Post ${i + 1}: "${title}" by ${author}`);
      }
    } else {
      console.log('❌ NO POSTS VISIBLE - This is the white screen issue!');
    }
    
    console.log('📸 Step 6: Taking screenshot for verification...');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/visual-verification-screenshot.png',
      fullPage: true 
    });
    console.log('   Screenshot saved: visual-verification-screenshot.png');
    
    // Check network tab for failed requests
    console.log('🌐 Step 7: Checking for network errors...');
    const networkLogs = [];
    page.on('response', response => {
      if (!response.ok()) {
        networkLogs.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    console.log('🔄 Step 8: Manual refresh to trigger network activity...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    if (networkLogs.length > 0) {
      console.log('   Network errors detected:');
      networkLogs.forEach(log => console.log(`     ${log}`));
    }
    
    // Final assessment
    const finalPosts = await page.locator('article').count();
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return body && body.innerText.includes('Agent Feed');
    });
    
    console.log('\n🏁 FINAL ASSESSMENT:');
    console.log(`   Page loads: ${hasContent ? '✅' : '❌'}`);
    console.log(`   Posts visible: ${finalPosts > 0 ? '✅' : '❌'} (${finalPosts} found)`);
    console.log(`   API working: ${response ? '✅' : '❌'}`);
    
    const isWorkingCorrectly = hasContent && finalPosts > 0 && response;
    
    if (isWorkingCorrectly) {
      console.log('\n🎉 SUCCESS: Posts are visible! White screen issue resolved.');
    } else {
      console.log('\n🚨 ISSUE CONFIRMED: User still sees white screen/no posts.');
      console.log('   Likely causes:');
      if (!response) console.log('     - API connection failure');
      if (!hasContent) console.log('     - React app not mounting');
      if (finalPosts === 0) console.log('     - Posts not rendering despite API data');
    }
    
    return isWorkingCorrectly;
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/error-screenshot.png' 
    });
    return false;
  } finally {
    await browser.close();
  }
}

// Run verification
visualPostVerification().then(success => {
  console.log(`\n🎯 RESULT: ${success ? 'POSTS ARE VISIBLE' : 'WHITE SCREEN CONFIRMED'}`);
  process.exit(success ? 0 : 1);
});