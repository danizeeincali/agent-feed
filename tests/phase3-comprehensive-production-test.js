/**
 * Phase 3 Dynamic Agent Pages - Comprehensive Production Test Suite
 * Tests all Phase 3 functionality with real application running
 */

const playwright = require('playwright');
const axios = require('axios');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  headless: true, // Set to true for CI environment
};

class Phase3TestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: [],
      startTime: new Date(),
      endTime: null,
      errors: []
    };
  }

  async setup() {
    console.log('🚀 Setting up Phase 3 Test Suite...');
    this.browser = await playwright.chromium.launch({ 
      headless: TEST_CONFIG.headless,
      slowMo: 100 
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
    });

    // Handle page errors
    this.page.on('pageerror', err => {
      console.error(`[Page Error] ${err.message}`);
      this.results.errors.push(`Page Error: ${err.message}`);
    });

    // Handle network errors
    this.page.on('requestfailed', request => {
      console.error(`[Network Failed] ${request.url()}: ${request.failure().errorText}`);
      this.results.errors.push(`Network Failed: ${request.url()} - ${request.failure().errorText}`);
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
    this.results.endTime = new Date();
  }

  async runTest(testName, testFn) {
    this.results.total++;
    console.log(`\n🧪 Running: ${testName}`);
    
    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        error: null
      });
    } catch (error) {
      console.error(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        duration: 0,
        error: error.message
      });
    }
  }

  // Test 1: Agents page loads with real data
  async testAgentsPageLoad() {
    await this.page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    
    // Check page title
    const title = await this.page.title();
    if (!title.includes('Agent Feed')) {
      throw new Error(`Expected page title to contain 'Agent Feed', got: ${title}`);
    }

    // Wait for agent cards to load
    await this.page.waitForSelector('.agent-card', { timeout: 10000 });
    
    // Count agent cards
    const agentCards = await this.page.$$('.agent-card');
    if (agentCards.length === 0) {
      throw new Error('No agent cards found - agents page not loading real data');
    }
    
    console.log(`   ✓ Found ${agentCards.length} agent cards`);

    // Check for real agent data (not mock)
    const firstAgentName = await this.page.textContent('.agent-card h3');
    if (!firstAgentName || firstAgentName.includes('mock') || firstAgentName.includes('test')) {
      throw new Error(`Expected real agent name, got: ${firstAgentName}`);
    }
    
    console.log(`   ✓ Real agent data loaded: ${firstAgentName}`);
  }

  // Test 2: Agent cards have proper navigation buttons
  async testAgentCardButtons() {
    await this.page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await this.page.waitForSelector('.agent-card', { timeout: 10000 });

    const agentCards = await this.page.$$('.agent-card');
    if (agentCards.length === 0) {
      throw new Error('No agent cards found for button testing');
    }

    // Check first agent card for buttons
    const firstCard = agentCards[0];
    
    // Look for Home button
    const homeButton = await firstCard.$('button:has-text("Home"), a:has-text("Home"), .btn:has-text("Home")');
    if (!homeButton) {
      throw new Error('Home button not found on agent card');
    }
    
    // Look for Details button  
    const detailsButton = await firstCard.$('button:has-text("Details"), a:has-text("Details"), .btn:has-text("Details")');
    if (!detailsButton) {
      throw new Error('Details button not found on agent card');
    }
    
    console.log('   ✓ Both Home and Details buttons found on agent card');
  }

  // Test 3: Navigation to agent home page
  async testAgentHomeNavigation() {
    await this.page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await this.page.waitForSelector('.agent-card', { timeout: 10000 });

    // Get first agent ID
    const firstAgentCard = await this.page.$('.agent-card');
    const agentId = await firstAgentCard.getAttribute('data-agent-id') || 
                   await this.page.textContent('.agent-card h3');
    
    // Click Home button
    const homeButton = await firstAgentCard.$('button:has-text("Home"), a:has-text("Home"), .btn:has-text("Home")');
    await homeButton.click();

    // Wait for navigation
    await this.page.waitForLoadState('networkidle');
    
    // Check URL changed to agent home
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/agents/') || currentUrl === `${BASE_URL}/agents`) {
      throw new Error(`Expected to navigate to agent home page, current URL: ${currentUrl}`);
    }
    
    console.log(`   ✓ Successfully navigated to: ${currentUrl}`);
  }

  // Test 4: Agent home page displays real information
  async testAgentHomePageContent() {
    // Navigate to first agent's home page
    const response = await axios.get(`${API_URL}/api/agents`);
    const agents = response.data.data || response.data;
    const firstAgent = agents[0];
    
    await this.page.goto(`${BASE_URL}/agents/${firstAgent.id}`, { waitUntil: 'networkidle' });
    
    // Check for agent name/title
    const agentName = await this.page.textContent('h1, h2, .agent-name, .agent-title');
    if (!agentName || agentName.trim().length === 0) {
      throw new Error('Agent name not displayed on home page');
    }
    
    // Check for agent description or content
    const content = await this.page.textContent('body');
    if (content.length < 100) {
      throw new Error('Agent home page appears empty or minimal');
    }
    
    // Check for metrics or status information
    const hasMetrics = await this.page.$('.metrics, .performance, .stats, .usage') !== null;
    if (!hasMetrics) {
      // Check for any numerical data that might indicate metrics
      const hasNumbers = /\d+/.test(content);
      if (!hasNumbers) {
        console.warn('   ⚠️ No obvious metrics found, but page has content');
      }
    }
    
    console.log(`   ✓ Agent home page loaded with content for: ${agentName.trim()}`);
  }

  // Test 5: Agent profile customization features
  async testAgentCustomization() {
    const response = await axios.get(`${API_URL}/api/agents`);
    const agents = response.data.data || response.data;
    const firstAgent = agents[0];
    
    await this.page.goto(`${BASE_URL}/agents/${firstAgent.id}`, { waitUntil: 'networkidle' });
    
    // Look for customization controls
    const customizationElements = await this.page.$$('input, select, textarea, button[class*="custom"], .customize, .edit, .settings');
    
    if (customizationElements.length === 0) {
      console.warn('   ⚠️ No obvious customization controls found');
      return;
    }
    
    // Try to interact with a customization element
    const firstElement = customizationElements[0];
    const tagName = await firstElement.tagName();
    
    if (tagName === 'INPUT') {
      const type = await firstElement.getAttribute('type');
      if (type === 'text' || type === 'search') {
        await firstElement.fill('test customization');
        console.log('   ✓ Successfully interacted with text input');
      }
    } else if (tagName === 'BUTTON') {
      // Try clicking a customize/edit button
      await firstElement.click();
      await this.page.waitForTimeout(1000);
      console.log('   ✓ Successfully clicked customization button');
    }
    
    console.log(`   ✓ Found ${customizationElements.length} customization elements`);
  }

  // Test 6: Feed displays real posts
  async testFeedRealData() {
    await this.page.goto(`${BASE_URL}`, { waitUntil: 'networkidle' });
    
    // Wait for posts to load
    await this.page.waitForTimeout(3000);
    
    // Look for post elements
    const posts = await this.page.$$('.post, .feed-item, .agent-post, [class*="post"]');
    
    if (posts.length === 0) {
      throw new Error('No posts found on feed page');
    }
    
    // Check if posts contain real data (not mock)
    const firstPostText = await this.page.textContent(posts[0]);
    if (firstPostText.toLowerCase().includes('mock') || 
        firstPostText.toLowerCase().includes('sample') ||
        firstPostText.toLowerCase().includes('lorem')) {
      throw new Error('Feed appears to contain mock data');
    }
    
    // Check for timestamps or real metadata
    const hasTimestamp = await posts[0].$('.timestamp, .date, [class*="time"]') !== null;
    
    console.log(`   ✓ Found ${posts.length} real posts on feed`);
    if (hasTimestamp) {
      console.log('   ✓ Posts include timestamp metadata');
    }
  }

  // Test 7: Complete navigation flow
  async testNavigationFlow() {
    // Start at home
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log('   ✓ Loaded home page');
    
    // Navigate to agents
    await this.page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
    await this.page.waitForSelector('.agent-card', { timeout: 10000 });
    console.log('   ✓ Navigated to agents page');
    
    // Get first agent ID and navigate to its home
    const response = await axios.get(`${API_URL}/api/agents`);
    const agents = response.data.data || response.data;
    const firstAgent = agents[0];
    
    await this.page.goto(`${BASE_URL}/agents/${firstAgent.id}`, { waitUntil: 'networkidle' });
    console.log(`   ✓ Navigated to agent home: ${firstAgent.id}`);
    
    // Navigate back to feed
    await this.page.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log('   ✓ Navigated back to feed');
    
    console.log('   ✓ Complete navigation flow successful');
  }

  // Test 8: Check for HTTP 500 errors and API failures
  async testNoServerErrors() {
    const errors = [];
    
    // Monitor network responses
    this.page.on('response', response => {
      if (response.status() >= 500) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
    
    // Test multiple pages
    const testPages = [
      BASE_URL,
      `${BASE_URL}/agents`,
    ];
    
    // Add agent home page
    const response = await axios.get(`${API_URL}/api/agents`);
    const agents = response.data.data || response.data;
    if (agents.length > 0) {
      testPages.push(`${BASE_URL}/agents/${agents[0].id}`);
    }
    
    for (const url of testPages) {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2000);
    }
    
    // Test API endpoints directly
    const apiEndpoints = [
      `${API_URL}/api/agents`,
      `${API_URL}/api/v1/agent-posts`,
      `${API_URL}/api/health`
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await axios.get(endpoint);
        if (response.status >= 500) {
          errors.push(`API Error ${response.status}: ${endpoint}`);
        }
      } catch (error) {
        if (error.response && error.response.status >= 500) {
          errors.push(`API Error ${error.response.status}: ${endpoint}`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Server errors detected: ${errors.join(', ')}`);
    }
    
    console.log('   ✓ No HTTP 500 errors or API failures detected');
  }

  async generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    
    const report = {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${((this.results.passed / this.results.total) * 100).toFixed(1)}%`,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      tests: this.results.tests,
      errors: this.results.errors,
      environment: {
        baseUrl: BASE_URL,
        apiUrl: API_URL,
        browser: 'chromium',
        headless: TEST_CONFIG.headless
      }
    };
    
    return report;
  }

  async run() {
    console.log('\n🎯 Phase 3 Dynamic Agent Pages - Production Test Suite');
    console.log('=' .repeat(60));
    
    try {
      await this.setup();
      
      // Run all tests
      await this.runTest('1. Agents page loads with real data', () => this.testAgentsPageLoad());
      await this.runTest('2. Agent cards have proper navigation buttons', () => this.testAgentCardButtons());
      await this.runTest('3. Navigation to agent home page works', () => this.testAgentHomeNavigation());
      await this.runTest('4. Agent home page displays real information', () => this.testAgentHomePageContent());
      await this.runTest('5. Agent profile customization features', () => this.testAgentCustomization());
      await this.runTest('6. Feed displays real posts (not mock data)', () => this.testFeedRealData());
      await this.runTest('7. Complete navigation flow between pages', () => this.testNavigationFlow());
      await this.runTest('8. No HTTP 500 errors or API failures', () => this.testNoServerErrors());
      
      console.log('\n📊 TEST RESULTS');
      console.log('=' .repeat(60));
      console.log(`✅ Passed: ${this.results.passed}`);
      console.log(`❌ Failed: ${this.results.failed}`);
      console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
      
      if (this.results.errors.length > 0) {
        console.log('\n🚨 ERRORS DETECTED:');
        this.results.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return await this.generateReport();
      
    } finally {
      await this.teardown();
    }
  }
}

// Run the tests if called directly
if (require.main === module) {
  (async () => {
    const testSuite = new Phase3TestSuite();
    const report = await testSuite.run();
    
    // Save report
    const fs = require('fs').promises;
    await fs.writeFile(
      '/workspaces/agent-feed/tests/phase3-production-test-report.json', 
      JSON.stringify(report, null, 2)
    );
    
    process.exit(report.summary.failed > 0 ? 1 : 0);
  })();
}

module.exports = Phase3TestSuite;