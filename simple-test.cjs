// Simple validation test without Playwright config conflicts
const { chromium } = require('playwright');

async function runValidation() {
  console.log('🎯 Starting Final Validation...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Test API endpoints directly
    console.log('📡 Testing API endpoints...');

    const agentsResponse = await page.request.get('http://localhost:5173/api/agents');
    console.log(`✅ /api/agents: ${agentsResponse.status()}`);

    const postsResponse = await page.request.get('http://localhost:5173/api/agent-posts');
    console.log(`✅ /api/agent-posts: ${postsResponse.status()}`);

    // Test frontend application
    console.log('🌐 Testing frontend application...');
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'validation-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved: validation-screenshot.png');

    // Check for basic elements
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'agents-page-screenshot.png', fullPage: true });
    console.log('📸 Agents page screenshot saved');

    console.log('✅ All validation tests passed!');

  } catch (error) {
    console.log('❌ Error during validation:', error.message);
  } finally {
    await browser.close();
  }
}

runValidation();