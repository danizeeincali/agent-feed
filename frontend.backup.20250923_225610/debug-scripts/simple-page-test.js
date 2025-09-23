// Simple page test to check React mounting
import { chromium } from 'playwright';

async function testPage() {
  console.log('🔍 Testing React page at http://localhost:5173');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const message = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(message);
    console.log(message);
    
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    const errorMsg = `JavaScript Error: ${error.message}`;
    errors.push(errorMsg);
    console.log(`🚨 ${errorMsg}`);
  });
  
  try {
    // Navigate with timeout
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Wait for potential React rendering
    await page.waitForTimeout(3000);
    
    // Check root element
    const rootElement = await page.$('#root');
    const rootContent = rootElement ? await rootElement.innerHTML() : '';
    
    console.log('\n📊 RESULTS:');
    console.log('='.repeat(40));
    console.log(`Root element found: ${rootElement ? 'YES' : 'NO'}`);
    console.log(`Root content length: ${rootContent.length} characters`);
    
    if (rootContent.length === 0) {
      console.log('❌ React app NOT mounted - root is empty');
    } else if (rootContent.length < 100) {
      console.log('⚠️  React app may be partially mounted');
      console.log(`Content preview: ${rootContent.substring(0, 100)}`);
    } else {
      console.log('✅ React app appears to be mounted');
    }
    
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/debug-scripts/page-test-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved: debug-scripts/page-test-screenshot.png');
    
    // Get page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    
    // Check for specific React indicators
    const reactElements = await page.$$('[data-reactroot], div[class*="react"], [data-testid]');
    console.log(`React-like elements found: ${reactElements.length}`);
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
    
    // Still take screenshot of error state
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/debug-scripts/error-screenshot.png'
    }).catch(() => {});
  } finally {
    await browser.close();
  }
}

// Run the test
testPage().catch(console.error);