// Test script to validate React app is working
const puppeteer = require('puppeteer');

async function testApp() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for React to render
    await page.waitForSelector('[data-testid="header"]', { timeout: 5000 });
    
    // Check if AgentLink is rendered
    const title = await page.textContent('h1');
    console.log('App Title:', title);
    
    // Check if navigation is rendered
    const navItems = await page.$$('nav a');
    console.log('Navigation items count:', navItems.length);
    
    // Check if the main content area is rendered
    const mainContent = await page.$('[data-testid="agent-feed"]');
    console.log('Main content area exists:', !!mainContent);
    
    console.log('✅ React app is rendering successfully!');
    return true;
  } catch (error) {
    console.error('❌ React app failed to render:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

testApp().then(success => {
  process.exit(success ? 0 : 1);
});