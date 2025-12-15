/**
 * Direct Component Debug Test
 * Check if BulletproofAgentManager is causing issues
 */

import { chromium } from 'playwright';

async function debugComponentIssues() {
  console.log('🔍 Debug Component Issues - Direct Test\n');
  
  let browser;
  let page;
  
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Set up console logging
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR]:`, error.message);
      logs.push(`error: ${error.message}`);
    });
    
    console.log('📍 Navigating to /agents with reduced timeout...');
    
    // Try with a shorter timeout and just domcontentloaded
    await page.goto('http://127.0.0.1:3001/agents', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    console.log('✅ Page loaded (domcontentloaded)');
    
    // Wait a bit for React
    await page.waitForTimeout(3000);
    
    // Check what's actually loaded
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if React app loaded
    const reactRoot = await page.$('#root');
    console.log('⚛️ React root found:', reactRoot !== null);
    
    if (reactRoot) {
      const rootContent = await page.$eval('#root', el => el.textContent.slice(0, 200));
      console.log('📝 Root content:', rootContent);
    }
    
    // Check for specific elements step by step
    console.log('\n🔍 Checking for specific elements:');
    
    // 1. Check for sidebar
    const sidebar = await page.$('nav');
    console.log('🔹 Sidebar (nav):', sidebar !== null);
    
    // 2. Check for main content
    const main = await page.$('main');
    console.log('🔹 Main element:', main !== null);
    
    // 3. Check for agent feed container
    const agentFeed = await page.$('[data-testid="agent-feed"]');
    console.log('🔹 Agent feed container:', agentFeed !== null);
    
    // 4. Check for any h1 elements
    const h1Count = await page.$$eval('h1', elements => elements.length);
    console.log('🔹 H1 elements count:', h1Count);
    
    if (h1Count > 0) {
      const h1Texts = await page.$$eval('h1', elements => 
        elements.map(el => el.textContent.trim())
      );
      console.log('🔹 H1 texts:', h1Texts);
    }
    
    // 5. Check for any content with "Agent" or "agent"
    const agentContent = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.toLowerCase().includes('agent')) {
          textNodes.push(node.textContent.trim());
        }
      }
      return textNodes.slice(0, 5); // First 5 matches
    });
    console.log('🔹 Agent-related content:', agentContent);
    
    // 6. Check for loading states
    const loadingElements = await page.$$eval('[class*="loading"], [class*="spinner"]', 
      elements => elements.length
    );
    console.log('🔹 Loading elements:', loadingElements);
    
    // 7. Check for error states
    const errorElements = await page.$$eval('[class*="error"]', 
      elements => elements.length
    );
    console.log('🔹 Error elements:', errorElements);
    
    // 8. Take screenshot
    await page.screenshot({ 
      path: 'tests/debug-screenshot.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved to tests/debug-screenshot.png');
    
    // 9. Check computed styles of main container
    if (agentFeed) {
      const styles = await page.$eval('[data-testid="agent-feed"]', el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          height: computed.height,
          width: computed.width,
          overflow: computed.overflow,
          position: computed.position
        };
      });
      console.log('🔹 Main container styles:', styles);
    }
    
    // 10. Check for React errors in console
    const reactErrors = logs.filter(log => 
      log.includes('React') || 
      log.includes('Warning') || 
      log.includes('Error')
    );
    console.log('🔹 React/Error logs:', reactErrors);
    
    console.log('\n📋 SUMMARY:');
    if (h1Count === 0 && agentContent.length === 0) {
      console.log('❌ No Agent Manager content found - component not rendering');
    } else if (agentContent.length > 0) {
      console.log('✅ Some agent content found - investigating layout issues');
    } else {
      console.log('⚠️ Mixed results - need deeper investigation');
    }
    
  } catch (error) {
    console.error('❌ Debug test error:', error.message);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// Run debug test
debugComponentIssues().then(() => {
  console.log('\n✅ Component debug test complete');
  process.exit(0);
}).catch(error => {
  console.error('Debug test failed:', error);
  process.exit(1);
});