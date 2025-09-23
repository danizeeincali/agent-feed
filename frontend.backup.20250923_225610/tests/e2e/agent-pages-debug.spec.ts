import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TestDataFactory } from '../utils/test-factories';

interface NetworkLog {
  url: string;
  method: string;
  status: number;
  response: any;
  timestamp: number;
  duration: number;
}

interface ConsoleLog {
  type: string;
  text: string;
  timestamp: number;
}

interface DOMSnapshot {
  timestamp: number;
  url: string;
  title: string;
  body: string;
  activeElement: string;
}

interface TestMetrics {
  networkLogs: NetworkLog[];
  consoleLogs: ConsoleLog[];
  domSnapshots: DOMSnapshot[];
  screenshots: string[];
  timings: Record<string, number>;
  errors: string[];
}

class DebugTestHarness {
  private metrics: TestMetrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      networkLogs: [],
      consoleLogs: [],
      domSnapshots: [],
      screenshots: [],
      timings: {},
      errors: []
    };
    this.startTime = Date.now();
  }

  async setupNetworkInterception(page: Page) {
    page.on('request', request => {
      const timestamp = Date.now() - this.startTime;
      console.log(`🌐 Request: ${request.method()} ${request.url()} at ${timestamp}ms`);
    });

    page.on('response', async response => {
      const timestamp = Date.now() - this.startTime;
      const request = response.request();
      
      try {
        let responseData = null;
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          responseData = await response.json().catch(() => null);
        } else if (contentType.includes('text/')) {
          responseData = await response.text().catch(() => null);
        }

        const networkLog: NetworkLog = {
          url: response.url(),
          method: request.method(),
          status: response.status(),
          response: responseData,
          timestamp,
          duration: 0 // Will be calculated if needed
        };

        this.metrics.networkLogs.push(networkLog);
        
        console.log(`📡 Response: ${response.status()} ${response.url()} at ${timestamp}ms`);
        
        if (response.status() >= 400) {
          this.metrics.errors.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      } catch (error) {
        this.metrics.errors.push(`Network logging error: ${error}`);
      }
    });
  }

  async setupConsoleCapture(page: Page) {
    page.on('console', msg => {
      const timestamp = Date.now() - this.startTime;
      const consoleLog: ConsoleLog = {
        type: msg.type(),
        text: msg.text(),
        timestamp
      };
      
      this.metrics.consoleLogs.push(consoleLog);
      console.log(`🖥️  Console ${msg.type()}: ${msg.text()} at ${timestamp}ms`);
      
      if (msg.type() === 'error') {
        this.metrics.errors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      const timestamp = Date.now() - this.startTime;
      const errorText = error.toString();
      this.metrics.errors.push(`Page Error: ${errorText}`);
      console.log(`❌ Page Error: ${errorText} at ${timestamp}ms`);
    });
  }

  async captureDOMSnapshot(page: Page, label: string) {
    const timestamp = Date.now() - this.startTime;
    
    const snapshot: DOMSnapshot = {
      timestamp,
      url: page.url(),
      title: await page.title(),
      body: await page.locator('body').innerHTML().catch(() => 'Failed to capture body'),
      activeElement: await page.evaluate(() => document.activeElement?.tagName || 'none')
    };
    
    this.metrics.domSnapshots.push(snapshot);
    console.log(`📸 DOM Snapshot: ${label} at ${timestamp}ms`);
    
    return snapshot;
  }

  async captureScreenshot(page: Page, label: string) {
    const timestamp = Date.now() - this.startTime;
    const filename = `screenshot-${label}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/tests/screenshots/${filename}`,
      fullPage: true 
    });
    
    this.metrics.screenshots.push(filename);
    console.log(`📷 Screenshot: ${filename} at ${timestamp}ms`);
    
    return filename;
  }

  recordTiming(label: string) {
    const timestamp = Date.now() - this.startTime;
    this.metrics.timings[label] = timestamp;
    console.log(`⏱️  Timing: ${label} at ${timestamp}ms`);
  }

  getMetrics(): TestMetrics {
    return { ...this.metrics };
  }

  generateReport(): string {
    const report = [
      '# Agent Pages Debug Test Report',
      `Generated at: ${new Date().toISOString()}`,
      '',
      '## Test Execution Summary',
      `Total Duration: ${Date.now() - this.startTime}ms`,
      `Network Requests: ${this.metrics.networkLogs.length}`,
      `Console Logs: ${this.metrics.consoleLogs.length}`,
      `DOM Snapshots: ${this.metrics.domSnapshots.length}`,
      `Screenshots: ${this.metrics.screenshots.length}`,
      `Errors Found: ${this.metrics.errors.length}`,
      '',
      '## Critical Errors',
      ...this.metrics.errors.map(error => `- ${error}`),
      '',
      '## Network Activity',
      ...this.metrics.networkLogs.map(log => 
        `- ${log.method} ${log.url} → ${log.status} (${log.timestamp}ms)`
      ),
      '',
      '## Console Activity',
      ...this.metrics.consoleLogs.map(log => 
        `- [${log.type.toUpperCase()}] ${log.text} (${log.timestamp}ms)`
      ),
      '',
      '## Timing Milestones',
      ...Object.entries(this.metrics.timings).map(([label, time]) => 
        `- ${label}: ${time}ms`
      )
    ].join('\n');

    return report;
  }
}

test.describe('Agent Pages Debug Suite', () => {
  let testHarness: DebugTestHarness;
  let testFactory: TestDataFactory;

  test.beforeEach(async ({ page }) => {
    testHarness = new DebugTestHarness();
    testFactory = new TestDataFactory();
    
    // Setup comprehensive monitoring
    await testHarness.setupNetworkInterception(page);
    await testHarness.setupConsoleCapture(page);
    
    testHarness.recordTiming('test_start');
  });

  test.afterEach(async ({ page }) => {
    testHarness.recordTiming('test_end');
    
    // Generate and save debug report
    const report = testHarness.generateReport();
    await page.evaluate((reportContent) => {
      console.log('=== DEBUG REPORT ===');
      console.log(reportContent);
    }, report);
  });

  test('Debug: Full agent page navigation journey', async ({ page }) => {
    console.log('🚀 Starting full agent page navigation debug test');
    
    // Step 1: Navigate to home
    testHarness.recordTiming('navigate_to_home');
    await page.goto('http://127.0.0.1:5173/');
    await testHarness.captureDOMSnapshot(page, 'home_loaded');
    await testHarness.captureScreenshot(page, 'home_loaded');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    testHarness.recordTiming('home_network_idle');
    
    // Step 2: Navigate to agents tab
    testHarness.recordTiming('click_agents_tab');
    const agentsTab = page.locator('[data-testid="agents-tab"], a[href="/agents"], button:has-text("Agents")');
    
    // Wait for tab to be available
    await agentsTab.waitFor({ state: 'visible', timeout: 10000 });
    await testHarness.captureDOMSnapshot(page, 'agents_tab_visible');
    
    await agentsTab.click();
    await testHarness.captureScreenshot(page, 'agents_tab_clicked');
    
    // Step 3: Wait for agents page to load
    await page.waitForURL('**/agents**');
    testHarness.recordTiming('agents_page_loaded');
    await testHarness.captureDOMSnapshot(page, 'agents_page_loaded');
    
    // Step 4: Look for agent cards/links
    const agentCards = page.locator('[data-testid="agent-card"], .agent-card, a[href*="/agents/"]');
    await agentCards.first().waitFor({ state: 'visible', timeout: 15000 });
    
    const agentCount = await agentCards.count();
    console.log(`📊 Found ${agentCount} agent cards`);
    
    if (agentCount === 0) {
      testHarness.metrics.errors.push('No agent cards found on agents page');
      await testHarness.captureScreenshot(page, 'no_agent_cards_error');
      return;
    }
    
    // Step 5: Click on first agent (or specific agent)
    testHarness.recordTiming('click_agent_card');
    const targetAgent = agentCards.first();
    const agentHref = await targetAgent.getAttribute('href') || '';
    console.log(`🎯 Clicking agent with href: ${agentHref}`);
    
    await targetAgent.click();
    await testHarness.captureScreenshot(page, 'agent_clicked');
    
    // Step 6: Wait for agent detail page
    await page.waitForLoadState('networkidle');
    testHarness.recordTiming('agent_detail_loaded');
    await testHarness.captureDOMSnapshot(page, 'agent_detail_loaded');
    
    // Step 7: Look for pages tab or pages section
    const pagesTab = page.locator('[data-testid="pages-tab"], button:has-text("Pages"), a:has-text("Pages")');
    
    try {
      await pagesTab.waitFor({ state: 'visible', timeout: 10000 });
      testHarness.recordTiming('pages_tab_found');
      await pagesTab.click();
      await testHarness.captureScreenshot(page, 'pages_tab_clicked');
    } catch (error) {
      console.log('⚠️  No pages tab found, looking for direct page content');
      testHarness.metrics.errors.push('Pages tab not found');
    }
    
    // Step 8: Check for page content or "No pages yet" message
    testHarness.recordTiming('check_page_content');
    
    // Multiple selectors to find page content or empty state
    const pageContentSelectors = [
      '[data-testid="page-content"]',
      '.page-content',
      '.agent-page-content',
      'div:has-text("No pages yet")',
      'div:has-text("no pages")',
      '.empty-state'
    ];
    
    let contentFound = false;
    let emptyStateFound = false;
    
    for (const selector of pageContentSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      
      if (count > 0) {
        const text = await element.first().textContent();
        console.log(`📄 Found content with selector "${selector}": "${text?.substring(0, 100)}..."`);
        
        if (text?.toLowerCase().includes('no pages')) {
          emptyStateFound = true;
          testHarness.metrics.errors.push(`Empty state found: "${text}"`);
        } else {
          contentFound = true;
        }
        
        await testHarness.captureDOMSnapshot(page, `content_${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
      }
    }
    
    // Step 9: Navigate directly to specific page URL
    const specificPageUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d';
    console.log(`🎯 Testing specific page URL: ${specificPageUrl}`);
    
    testHarness.recordTiming('navigate_to_specific_page');
    await page.goto(specificPageUrl);
    await page.waitForLoadState('networkidle');
    
    await testHarness.captureDOMSnapshot(page, 'specific_page_loaded');
    await testHarness.captureScreenshot(page, 'specific_page_loaded');
    
    // Step 10: Analyze page state
    const currentUrl = page.url();
    const pageTitle = await page.title();
    const bodyText = await page.locator('body').textContent();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📝 Page Title: ${pageTitle}`);
    console.log(`📄 Body contains "No pages yet": ${bodyText?.includes('No pages yet')}`);
    
    // Step 11: Check React component state
    const reactState = await page.evaluate(() => {
      // Try to access React DevTools or component state
      const reactRoot = document.querySelector('#root');
      return {
        hasReactRoot: !!reactRoot,
        rootChildren: reactRoot?.children.length || 0,
        url: window.location.href,
        reactRouterLocation: (window as any).__REACT_ROUTER_LOCATION__ || null
      };
    });
    
    console.log('⚛️  React State:', reactState);
    
    // Step 12: Verify API calls were made
    const apiCalls = testHarness.getMetrics().networkLogs.filter(log => 
      log.url.includes('/api/') || log.url.includes('/agents/') || log.url.includes('/pages/')
    );
    
    console.log(`🔌 API Calls Made: ${apiCalls.length}`);
    apiCalls.forEach(call => {
      console.log(`  - ${call.method} ${call.url} → ${call.status}`);
    });
    
    // Step 13: Final assertions and diagnostics
    if (emptyStateFound && !contentFound) {
      testHarness.metrics.errors.push('CRITICAL: Empty state shown instead of page content');
      await testHarness.captureScreenshot(page, 'critical_empty_state_error');
    }
    
    // Capture final metrics
    testHarness.recordTiming('test_complete');
    
    // Generate comprehensive report
    const finalReport = testHarness.generateReport();
    console.log('\n' + finalReport);
    
    // Assert that we found actual content, not empty state
    expect(emptyStateFound).toBe(false);
    expect(contentFound || apiCalls.length > 0).toBe(true);
  });

  test('Debug: API Response Validation', async ({ page }) => {
    console.log('🔍 Testing API responses for agent pages');
    
    // Intercept and validate specific API calls
    const apiResponses = new Map();
    
    page.on('response', async response => {
      const url = response.url();
      
      if (url.includes('/api/agents') || url.includes('/api/pages')) {
        try {
          const data = await response.json();
          apiResponses.set(url, {
            status: response.status(),
            data,
            headers: response.headers()
          });
          console.log(`📊 API Response: ${url} → ${response.status()}`);
        } catch (error) {
          console.log(`❌ Failed to parse API response: ${url}`);
        }
      }
    });
    
    // Navigate and trigger API calls
    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
    await page.waitForLoadState('networkidle');
    
    // Validate API responses
    for (const [url, response] of apiResponses.entries()) {
      console.log(`Validating: ${url}`);
      console.log(`Status: ${response.status}`);
      console.log(`Data:`, response.data);
      
      expect(response.status).toBeLessThan(400);
      
      if (url.includes('/pages/')) {
        expect(response.data).toBeDefined();
        expect(response.data).not.toEqual([]);
      }
    }
    
    await testHarness.captureScreenshot(page, 'api_validation_complete');
  });

  test('Debug: Component State Transitions', async ({ page }) => {
    console.log('🔄 Testing component state transitions');
    
    // Add React DevTools detection
    await page.addInitScript(() => {
      (window as any).__COMPONENT_STATES__ = [];
      
      // Hook into React updates if possible
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        if (args[0]?.includes?.('Component') || args[0]?.includes?.('State')) {
          (window as any).__COMPONENT_STATES__.push({
            timestamp: Date.now(),
            message: args.join(' ')
          });
        }
        return originalConsoleLog.apply(console, args);
      };
    });
    
    await page.goto('http://127.0.0.1:5173/');
    
    // Navigate through the flow and capture state changes
    const agentsLink = page.locator('a[href="/agents"]');
    await agentsLink.waitFor({ state: 'visible' });
    await agentsLink.click();
    
    // Wait for page transition
    await page.waitForURL('**/agents**');
    
    // Get captured state transitions
    const stateTransitions = await page.evaluate(() => {
      return (window as any).__COMPONENT_STATES__ || [];
    });
    
    console.log('🔄 State Transitions:', stateTransitions);
    
    // Navigate to specific page and capture more states
    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
    
    const finalStates = await page.evaluate(() => {
      return (window as any).__COMPONENT_STATES__ || [];
    });
    
    console.log('🏁 Final States:', finalStates);
    
    await testHarness.captureScreenshot(page, 'component_state_analysis');
  });
});