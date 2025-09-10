/**
 * Verification test for real agent data on agents page
 */

const puppeteer = require('puppeteer');

async function verifyAgentsPage() {
  let browser;
  try {
    console.log('🚀 Starting agents page verification...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Listen for console logs
    page.on('console', msg => {
      if (msg.text().includes('agent') || msg.text().includes('fetch') || msg.text().includes('error')) {
        console.log('🖥️ Browser:', msg.text());
      }
    });
    
    // Navigate to agents page
    console.log('📄 Loading agents page...');
    await page.goto('http://localhost:5173/#/agents', { waitUntil: 'networkidle2' });
    
    // Wait for API call to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Checking page content...');
    
    // Check for loading states
    const loadingText = await page.$eval('body', body => body.innerText).catch(() => '');
    
    // Look for specific agent names in the page
    const realAgentNames = [
      'agent-feedback-agent',
      'agent-ideas-agent', 
      'follow-ups-agent',
      'get-to-know-you-agent',
      'personal-todos-agent'
    ];
    
    let foundAgents = [];
    for (const agentName of realAgentNames) {
      const found = await page.evaluate((name) => {
        return document.body.innerText.includes(name);
      }, agentName);
      
      if (found) {
        foundAgents.push(agentName);
        console.log(`✅ Found: ${agentName}`);
      }
    }
    
    // Check for error messages
    const hasError = await page.evaluate(() => {
      return document.body.innerText.includes('error') || 
             document.body.innerText.includes('Error') ||
             document.body.innerText.includes('failed') ||
             document.body.innerText.includes('Failed');
    });
    
    if (hasError) {
      console.log('⚠️ Error detected on page');
    }
    
    // Check for loading state
    const isLoading = await page.evaluate(() => {
      return document.body.innerText.includes('Loading') || 
             document.body.innerText.includes('loading');
    });
    
    if (isLoading) {
      console.log('🔄 Page still loading...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 RESULTS:`);
    console.log(`✅ Real agents found: ${foundAgents.length}/${realAgentNames.length}`);
    console.log(`Found agents: ${foundAgents.join(', ')}`);
    
    // Test API directly from browser
    console.log('\n🧪 Testing API directly from browser...');
    const apiResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          agentCount: data.data ? data.data.length : 0,
          firstAgent: data.data ? data.data[0]?.id : null
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('API Test Result:', apiResult);
    
    return foundAgents.length > 0;
    
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
verifyAgentsPage()
  .then(success => {
    console.log(`\n🏁 Final Result: ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification crashed:', error);
    process.exit(1);
  });