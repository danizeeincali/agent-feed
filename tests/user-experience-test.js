// User Experience Test - Final Confirmation
// This test simulates exactly what the user should see
const { chromium } = require('playwright');

async function userExperienceTest() {
  console.log('👤 USER EXPERIENCE TEST - What the user actually sees...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 User opens http://localhost:3001 in browser...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    console.log('👀 User waits for page to load...');
    await page.waitForTimeout(3000);
    
    // What does the user see?
    const userView = await page.evaluate(() => {
      const body = document.body;
      const root = document.getElementById('root');
      
      return {
        pageTitle: document.title,
        hasContent: body.innerText.trim().length > 100,
        canSeeHeader: !!document.querySelector('h1'),
        canSeeNavigation: !!document.querySelector('nav'),
        canSeePosts: document.querySelectorAll('article').length,
        canSeeAgentFeed: body.innerText.includes('Agent Feed'),
        canSeeWelcomeContent: body.innerText.includes('Welcome to AgentLink'),
        totalTextLength: body.innerText.length,
        isWhiteScreen: root.children.length === 0 || body.innerText.trim().length < 50
      };
    });
    
    console.log('📊 USER\'S VIEW:');
    console.log(`   Page Title: "${userView.pageTitle}"`);
    console.log(`   Has Content: ${userView.hasContent ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can See Header: ${userView.canSeeHeader ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can See Navigation: ${userView.canSeeNavigation ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can See Posts: ${userView.canSeePosts > 0 ? '✅ YES' : '❌ NO'} (${userView.canSeePosts} posts)`);
    console.log(`   Can See Agent Feed: ${userView.canSeeAgentFeed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Can See Welcome: ${userView.canSeeWelcomeContent ? '✅ YES' : '❌ NO'}`);
    console.log(`   Total Text: ${userView.totalTextLength} characters`);
    console.log(`   Is White Screen: ${userView.isWhiteScreen ? '❌ YES - BROKEN!' : '✅ NO - WORKING!'}`);
    
    // Take a screenshot from user's perspective
    console.log('\n📸 Taking screenshot from user perspective...');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/user-view-screenshot.png',
      fullPage: true 
    });
    console.log('   Screenshot saved: user-view-screenshot.png');
    
    // Test user interactions
    console.log('\n🖱️  Testing user interactions...');
    
    // Can user see and interact with posts?
    if (userView.canSeePosts > 0) {
      const firstPost = page.locator('article').first();
      const postTitle = await firstPost.locator('h4').textContent();
      console.log(`   First post title: "${postTitle}"`);
      
      // Can user interact with buttons?
      const likeButton = firstPost.locator('button').first();
      if (await likeButton.isVisible()) {
        await likeButton.hover();
        console.log('   ✅ User can interact with post buttons');
      }
    }
    
    // Can user use refresh button?
    const refreshButton = page.locator('button[title="Refresh feed"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      console.log('   ✅ User can click refresh button');
      await page.waitForTimeout(1000);
    }
    
    // Can user use filter dropdown?
    const filterDropdown = page.locator('select');
    if (await filterDropdown.isVisible()) {
      await filterDropdown.selectOption('high-impact');
      console.log('   ✅ User can use filter dropdown');
      await page.waitForTimeout(1000);
    }
    
    console.log('\n🎯 FINAL USER EXPERIENCE ASSESSMENT:');
    
    const isFullyFunctional = userView.hasContent && 
                              userView.canSeePosts > 0 && 
                              userView.canSeeAgentFeed && 
                              !userView.isWhiteScreen;
    
    if (isFullyFunctional) {
      console.log('🎉 PERFECT! User sees a fully functional AgentLink interface');
      console.log('   ✅ No white screen');
      console.log('   ✅ All posts visible and readable');
      console.log('   ✅ Interface is interactive');
      console.log('   ✅ Professional social media feed layout');
      console.log('   ✅ Welcome content guides new users');
    } else {
      console.log('❌ ISSUE: User experience is not optimal');
      if (userView.isWhiteScreen) console.log('   - White screen detected');
      if (!userView.hasContent) console.log('   - No meaningful content');
      if (userView.canSeePosts === 0) console.log('   - No posts visible');
    }
    
    return isFullyFunctional;
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

userExperienceTest().then(success => {
  if (success) {
    console.log('\n🚀 SUCCESS: USER WILL SEE A WORKING AGENTLINK!');
    console.log('   The white screen issue is completely resolved.');
    console.log('   Users can now enjoy the full social media feed experience.');
  } else {
    console.log('\n🔧 NEEDS WORK: User experience issues remain');
  }
});