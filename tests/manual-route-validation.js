/**
 * Manual Route Validation Test - SPARC:DEBUG Completion
 * Tests both routes manually to verify the fix
 */

const { chromium } = require('playwright');

async function testRouting() {
  console.log('🧪 Starting manual route validation test...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    console.log('1️⃣ Testing Feed Route (/) independently...');
    const feedPage = await context.newPage();
    await feedPage.goto('http://localhost:5173/');
    await feedPage.waitForLoadState('networkidle');
    await feedPage.waitForTimeout(3000);
    
    const feedContent = await feedPage.textContent('body');
    const hasFeedContent = feedContent.includes('Feed') || feedContent.includes('social') || 
                          await feedPage.isVisible('[data-testid="main-content"]');
    
    console.log(`✅ Feed route working: ${hasFeedContent}`);
    
    console.log('2️⃣ Testing Agents Route (/agents) independently...');
    const agentsPage = await context.newPage();
    await agentsPage.goto('http://localhost:5173/agents');
    await agentsPage.waitForLoadState('networkidle');
    await agentsPage.waitForTimeout(5000); // Extra time for agents to load
    
    const agentsContent = await agentsPage.textContent('body');
    const hasAgentsContent = agentsContent.includes('Agent') || agentsContent.includes('Production') ||
                            await agentsPage.isVisible('[data-testid="isolated-agent-manager"]') ||
                            await agentsPage.isVisible('[data-testid="agent-list"]') ||
                            await agentsPage.isVisible('.agents-page');
    
    console.log(`✅ Agents route working: ${hasAgentsContent}`);
    
    console.log('3️⃣ Testing Sequential Navigation...');
    const navPage = await context.newPage();
    await navPage.goto('http://localhost:5173/');
    await navPage.waitForTimeout(2000);
    
    // Try to navigate to agents
    await navPage.goto('http://localhost:5173/agents');
    await navPage.waitForLoadState('networkidle');
    await navPage.waitForTimeout(3000);
    
    const navAgentsContent = await navPage.textContent('body');
    const navWorking = navAgentsContent.includes('Agent') || 
                      await navPage.isVisible('[data-testid="isolated-agent-manager"]');
    
    console.log(`✅ Sequential navigation working: ${navWorking}`);
    
    // Go back to feed
    await navPage.goto('http://localhost:5173/');
    await navPage.waitForTimeout(2000);
    const backToFeed = await navPage.isVisible('[data-testid="main-content"]');
    console.log(`✅ Back to feed working: ${backToFeed}`);
    
    console.log('4️⃣ Testing Simultaneous Access...');
    const simultaneousResults = await Promise.all([
      (async () => {
        const p1 = await context.newPage();
        await p1.goto('http://localhost:5173/');
        await p1.waitForLoadState('networkidle');
        return p1.isVisible('[data-testid="main-content"]');
      })(),
      (async () => {
        const p2 = await context.newPage();
        await p2.goto('http://localhost:5173/agents');
        await p2.waitForLoadState('networkidle');
        await p2.waitForTimeout(3000);
        return (await p2.textContent('body')).includes('Agent') ||
               await p2.isVisible('[data-testid="isolated-agent-manager"]');
      })()
    ]);
    
    console.log(`✅ Simultaneous access: Feed=${simultaneousResults[0]}, Agents=${simultaneousResults[1]}`);
    
    // Final test summary
    const allTests = hasFeedContent && hasAgentsContent && navWorking && backToFeed && 
                     simultaneousResults[0] && simultaneousResults[1];
    
    console.log('\n🎯 SPARC:DEBUG COMPLETION REPORT');
    console.log('================================');
    console.log(`Feed Route Independent: ${hasFeedContent ? '✅' : '❌'}`);
    console.log(`Agents Route Independent: ${hasAgentsContent ? '✅' : '❌'}`);
    console.log(`Sequential Navigation: ${navWorking ? '✅' : '❌'}`);
    console.log(`Back Navigation: ${backToFeed ? '✅' : '❌'}`);
    console.log(`Simultaneous Access: ${simultaneousResults[0] && simultaneousResults[1] ? '✅' : '❌'}`);
    console.log(`OVERALL SUCCESS: ${allTests ? '✅ SPARC:DEBUG COMPLETE' : '❌ NEEDS FIXES'}`);
    
    return allTests;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testRouting().then(success => {
  console.log(`\n🏁 Test completed. Success: ${success}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});