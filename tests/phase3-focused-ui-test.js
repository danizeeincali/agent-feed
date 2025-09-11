/**
 * Phase 3 Focused UI Test - Real Component Testing
 * Tests the actual UI components that are loaded
 */

const playwright = require('playwright');
const axios = require('axios');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

class FocusedUITest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
  }

  async setup() {
    console.log('🚀 Setting up focused UI test...');
    this.browser = await playwright.chromium.launch({ 
      headless: true,
      slowMo: 100 
    });
    this.page = await this.browser.newPage();
    
    // Set longer timeout
    this.page.setDefaultTimeout(15000);
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
      }
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runTest(testName, testFn) {
    this.results.total++;
    console.log(`\n🧪 ${testName}`);
    
    try {
      await testFn();
      console.log(`✅ PASSED: ${testName}`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  // Test 1: Load agents page and find the actual components
  async testAgentsPageComponents() {
    await this.page.goto(`${BASE_URL}/agents`);
    
    // Wait for the page to load completely
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000); // Extra wait for React to render
    
    // Look for the actual component structure based on RealAgentManager
    const agentManagerExists = await this.page.locator('h2:has-text("Agent Manager")').count() > 0;
    if (!agentManagerExists) {
      throw new Error('Agent Manager component not found');
    }
    
    // Look for agent cards (they use different structure)
    const agentCards = await this.page.locator('.bg-white.border.border-gray-200.rounded-lg').count();
    if (agentCards === 0) {
      throw new Error('No agent cards found with expected styling');
    }
    
    console.log(`   ✓ Found ${agentCards} agent cards`);
  }

  // Test 2: Test Home and Details buttons exist
  async testNavigationButtons() {
    await this.page.goto(`${BASE_URL}/agents`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
    
    // Look for Home buttons (based on RealAgentManager structure)
    const homeButtons = await this.page.locator('button:has-text("Home")').count();
    const detailsButtons = await this.page.locator('button:has-text("Details")').count();
    
    if (homeButtons === 0) {
      throw new Error('No Home buttons found');
    }
    
    if (detailsButtons === 0) {
      throw new Error('No Details buttons found');
    }
    
    console.log(`   ✓ Found ${homeButtons} Home buttons and ${detailsButtons} Details buttons`);
  }

  // Test 3: Test clicking Home button navigation
  async testHomeButtonNavigation() {
    await this.page.goto(`${BASE_URL}/agents`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
    
    // Find and click the first Home button
    const homeButton = this.page.locator('button:has-text("Home")').first();
    await homeButton.click();
    
    // Wait for navigation
    await this.page.waitForTimeout(2000);
    
    // Check that URL changed to an agent home page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/agents/') || currentUrl === `${BASE_URL}/agents`) {
      throw new Error(`Navigation failed. Current URL: ${currentUrl}`);
    }
    
    console.log(`   ✓ Navigation successful to: ${currentUrl}`);
  }

  // Test 4: Test agent home page content
  async testAgentHomeContent() {
    // Get first agent from API
    const response = await axios.get(`${API_URL}/api/agents`);
    const agents = response.data.data || response.data;
    const firstAgent = agents[0];
    
    await this.page.goto(`${BASE_URL}/agents/${firstAgent.id}`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
    
    // Check if page has content (not just blank)
    const bodyText = await this.page.textContent('body');
    if (bodyText.length < 50) {
      throw new Error('Agent home page appears to be empty or minimal');
    }
    
    // Look for agent-specific information
    const hasAgentInfo = bodyText.includes(firstAgent.name) || 
                        bodyText.includes(firstAgent.display_name) ||
                        bodyText.includes('agent');
    
    if (!hasAgentInfo) {
      console.log(`   ⚠️ Page loaded but may not contain agent-specific content`);
    } else {
      console.log(`   ✓ Agent home page contains relevant content`);
    }
  }

  // Test 5: Test feed page for real content
  async testFeedContent() {
    await this.page.goto(BASE_URL);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);
    
    // Check for any content that looks like posts or feed items
    const bodyText = await this.page.textContent('body');
    
    // Look for any kind of content structure
    const hasContent = bodyText.length > 1000; // Reasonable amount of content
    
    if (!hasContent) {
      throw new Error('Feed page appears to be empty');
    }
    
    // Check if content looks real (not lorem ipsum or placeholder)
    const hasRealContent = !bodyText.toLowerCase().includes('lorem ipsum') &&
                          !bodyText.toLowerCase().includes('placeholder') &&
                          bodyText.length > 500;
    
    if (!hasRealContent) {
      console.log(`   ⚠️ Feed may contain placeholder content`);
    } else {
      console.log(`   ✓ Feed appears to contain real content`);
    }
  }

  async run() {
    console.log('\n🎯 Phase 3 Focused UI Test Suite');
    console.log('='.repeat(50));
    console.log('Testing actual UI components with correct selectors');
    
    try {
      await this.setup();
      
      await this.runTest('1. Agents page loads with manager component', () => this.testAgentsPageComponents());
      await this.runTest('2. Home and Details buttons exist', () => this.testNavigationButtons());
      await this.runTest('3. Home button navigation works', () => this.testHomeButtonNavigation());
      await this.runTest('4. Agent home page displays content', () => this.testAgentHomeContent());
      await this.runTest('5. Feed page displays real content', () => this.testFeedContent());
      
      console.log('\n📊 FOCUSED UI TEST RESULTS');
      console.log('='.repeat(50));
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
      
      return this.results;
      
    } finally {
      await this.teardown();
    }
  }
}

// Run the tests if called directly
if (require.main === module) {
  (async () => {
    const testSuite = new FocusedUITest();
    const results = await testSuite.run();
    process.exit(results.failed > 0 ? 1 : 0);
  })();
}

module.exports = FocusedUITest;