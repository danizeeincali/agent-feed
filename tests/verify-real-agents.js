/**
 * Verification test for real agent data in frontend
 * Ensures frontend displays real agents instead of mock data
 */

const puppeteer = require('puppeteer');

async function verifyRealAgentsInFrontend() {
  let browser;
  try {
    console.log('🚀 Starting real agent data verification...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Navigate to frontend
    console.log('📄 Loading frontend page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for potential API calls to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check page title and content
    const title = await page.title();
    console.log(`📋 Page title: ${title}`);
    
    // Look for agent-related content in the page
    const pageContent = await page.content();
    
    // Check if real agent names are present (not mock names)
    const realAgentNames = [
      'agent-feedback-agent',
      'agent-ideas-agent',
      'follow-ups-agent',
      'get-to-know-you-agent',
      'link-logger-agent',
      'meeting-next-steps-agent',
      'meeting-prep-agent',
      'meta-agent',
      'meta-update-agent',
      'personal-todos-agent'
    ];
    
    const mockAgentNames = [
      'ProductionValidator',
      'DatabaseManager',
      'ContentModerator',
      'SystemOptimizer',
      'UserEngagement',
      'QualityAssurance'
    ];
    
    let realAgentsFound = 0;
    let mockAgentsFound = 0;
    
    for (const agentName of realAgentNames) {
      if (pageContent.includes(agentName)) {
        realAgentsFound++;
        console.log(`✅ Real agent found: ${agentName}`);
      }
    }
    
    for (const mockName of mockAgentNames) {
      if (pageContent.includes(mockName)) {
        mockAgentsFound++;
        console.log(`❌ Mock agent found: ${mockName}`);
      }
    }
    
    // Results
    console.log(`\n📊 VERIFICATION RESULTS:`);
    console.log(`✅ Real agents found: ${realAgentsFound}/${realAgentNames.length}`);
    console.log(`❌ Mock agents found: ${mockAgentsFound}/${mockAgentNames.length}`);
    
    if (realAgentsFound > 0 && mockAgentsFound === 0) {
      console.log(`\n🎉 SUCCESS: Frontend is displaying real agent data!`);
      return true;
    } else if (realAgentsFound === 0 && mockAgentsFound > 0) {
      console.log(`\n❌ FAILURE: Frontend is still displaying mock data`);
      return false;
    } else if (realAgentsFound === 0 && mockAgentsFound === 0) {
      console.log(`\n⚠️ WARNING: No agent data found in frontend`);
      
      // Check if we can find any agent-related elements
      const agentElements = await page.$$eval('[data-testid*="agent"], .agent, [class*="agent"]', 
        elements => elements.length);
      console.log(`🔍 Agent-related elements found: ${agentElements}`);
      
      return false;
    } else {
      console.log(`\n🤔 MIXED: Both real and mock data found - transition in progress?`);
      return realAgentsFound > mockAgentsFound;
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run verification
verifyRealAgentsInFrontend()
  .then(success => {
    console.log(`\n🏁 Final Result: ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification crashed:', error);
    process.exit(1);
  });