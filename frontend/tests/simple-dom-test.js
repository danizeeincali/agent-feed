/**
 * Simple DOM Test using Puppeteer-like approach
 * Check if Agent Manager is actually rendered
 */

import { chromium } from 'playwright';

async function testAgentManagerVisibility() {
  console.log('🔍 Testing Agent Manager visibility with direct browser automation...\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch({ 
      headless: true,   // Use headless mode for CI environment
      slowMo: 500      // Slow down for debugging
    });
    
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to agents page
    console.log('📍 Navigating to http://127.0.0.1:3001/agents...');
    await page.goto('http://127.0.0.1:3001/agents', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for React to render
    console.log('⏳ Waiting for React to render...');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'tests/agent-page-debug.png', 
      fullPage: true 
    });
    
    // Check for Agent Manager content
    console.log('🔍 Checking for Agent Manager content...');
    
    // Look for the main heading
    const heading = await page.$('h1:has-text("Agent Manager")');
    console.log('Agent Manager heading found:', heading !== null);
    
    // Look for any h1 elements
    const allH1s = await page.$$eval('h1', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log('All H1 elements found:', allH1s);
    
    // Look for any text containing "Agent"
    const agentText = await page.$$eval('*', elements => {
      return elements
        .map(el => el.textContent || '')
        .filter(text => text.toLowerCase().includes('agent'))
        .slice(0, 10); // First 10 matches
    });
    console.log('Text containing "agent":', agentText);
    
    // Check what's actually in the body
    const bodyContent = await page.$eval('body', el => el.textContent.slice(0, 500));
    console.log('Body content (first 500 chars):', bodyContent);
    
    // Check if main container exists
    const mainContainer = await page.$('main[data-testid="agent-feed"]');
    console.log('Main container found:', mainContainer !== null);
    
    if (mainContainer) {
      const mainContent = await page.$eval('main[data-testid="agent-feed"]', el => el.textContent.slice(0, 300));
      console.log('Main container content:', mainContent);
    }
    
    // Check for sidebar
    const sidebar = await page.$('nav');
    console.log('Sidebar found:', sidebar !== null);
    
    // Check current URL
    const currentURL = page.url();
    console.log('Current URL:', currentURL);
    
    // Check page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for any async console errors
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:', consoleErrors);
    } else {
      console.log('✅ No console errors');
    }
    
    // Save full HTML for debugging
    const html = await page.content();
    require('fs').writeFileSync('tests/agent-page-full.html', html);
    console.log('💾 Full HTML saved to tests/agent-page-full.html');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run the test
testAgentManagerVisibility().then(() => {
  console.log('\n✅ Visibility test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});