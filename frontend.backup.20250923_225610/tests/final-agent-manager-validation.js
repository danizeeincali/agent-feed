import { chromium } from 'playwright';

(async () => {
  console.log('🎯 FINAL Agent Manager Validation Test');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to desktop size
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    console.log('📍 Navigating to /agents...');
    await page.goto('http://127.0.0.1:3001/agents', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // Wait a moment for any dynamic content
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ 
      path: 'tests/final-agent-manager-validation.png',
      fullPage: true 
    });
    
    // Check for Agent Manager specific content
    const agentManagerVisible = await page.isVisible('text=Agent Manager');
    const hasAgentContent = await page.locator('text=agent').count() > 0;
    const hasSystemContent = await page.locator('text=system').count() > 0;
    
    // Get page content for analysis
    const pageContent = await page.textContent('body');
    const hasErrorMessages = pageContent.includes('Error') || pageContent.includes('error');
    const hasLoadingMessages = pageContent.includes('Loading') || pageContent.includes('loading');
    
    console.log('📊 VALIDATION RESULTS:');
    console.log(`✅ Agent Manager visible: ${agentManagerVisible}`);
    console.log(`✅ Has agent content: ${hasAgentContent}`);
    console.log(`✅ Has system content: ${hasSystemContent}`);
    console.log(`❌ Has error messages: ${hasErrorMessages}`);
    console.log(`⏳ Has loading messages: ${hasLoadingMessages}`);
    
    // Check for specific UI elements
    const sidebarExists = await page.isVisible('nav');
    const mainContentExists = await page.isVisible('main');
    const agentListExists = await page.locator('[class*="agent"]').count() > 0;
    
    console.log('🔍 UI STRUCTURE:');
    console.log(`📱 Sidebar exists: ${sidebarExists}`);
    console.log(`📄 Main content exists: ${mainContentExists}`);
    console.log(`🤖 Agent list exists: ${agentListExists}`);
    
    // Get console errors (excluding WebSocket connection errors which are expected)
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('WebSocket') && !msg.text().includes('net::ERR_CONNECTION_REFUSED')) {
        logs.push(msg.text());
      }
    });
    
    // Final summary
    const allGood = agentManagerVisible && hasAgentContent && mainContentExists && !hasErrorMessages;
    
    console.log('\n🎯 FINAL VALIDATION SUMMARY:');
    console.log(`🎉 Agent Manager Page Status: ${allGood ? 'WORKING ✅' : 'NEEDS ATTENTION ❌'}`);
    console.log('📸 Screenshot saved: tests/final-agent-manager-validation.png');
    
    if (allGood) {
      console.log('🚀 SUCCESS: Agent Manager is displaying properly!');
    } else {
      console.log('⚠️  Issues detected - check screenshot for details');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();