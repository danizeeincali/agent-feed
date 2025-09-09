import { Page, Locator, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the application to be fully loaded and ready
   */
  async waitForAppReady() {
    await this.page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500); // Additional buffer for React hydration
  }

  /**
   * Clear all browser state for clean test starts
   */
  async clearBrowserState() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    });
  }

  /**
   * Navigate to a route with proper waiting
   */
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForAppReady();
  }

  /**
   * Type text with realistic human-like delays
   */
  async typeRealistic(selector: string, text: string, delay: number = 50) {
    const element = this.page.locator(selector);
    await element.click();
    for (const char of text) {
      await element.type(char, { delay });
    }
  }

  /**
   * Wait for mention dropdown to appear and be populated
   */
  async waitForMentionDropdown() {
    const dropdown = this.page.locator('.mention-dropdown, [data-testid="mention-dropdown"]');
    await dropdown.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for dropdown to be populated with items
    const items = dropdown.locator('.mention-item, [data-testid="mention-item"]');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
    
    return dropdown;
  }

  /**
   * Test @ mention functionality in any input field
   */
  async testMentionFunctionality(inputSelector: string, context: string) {
    const input = this.page.locator(inputSelector);
    
    // Clear and focus input
    await input.clear();
    await input.click();
    
    // Type @ symbol to trigger mention dropdown
    await input.type('@');
    
    // Wait for dropdown
    const dropdown = await this.waitForMentionDropdown();
    await expect(dropdown).toBeVisible();
    
    // Verify dropdown has mention options
    const mentionItems = dropdown.locator('.mention-item, [data-testid="mention-item"]');
    await expect(mentionItems.first()).toBeVisible();
    
    // Select first mention item
    await mentionItems.first().click();
    
    // Verify mention was inserted
    const inputValue = await input.inputValue();
    expect(inputValue).toMatch(/@\w+/);
    
    console.log(`✅ @ mention functionality verified in ${context}`);
    return inputValue;
  }

  /**
   * Take a screenshot with timestamp for debugging
   */
  async debugScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `test-results/debug-screenshots/${name}-${timestamp}.png`;
    await this.page.screenshot({ path, fullPage: true });
    console.log(`📸 Debug screenshot saved: ${path}`);
    return path;
  }

  /**
   * Wait for element with retry logic
   */
  async waitForElementWithRetry(selector: string, retries: number = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return this.page.locator(selector);
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Check for React/JS errors in console
   */
  async checkForConsoleErrors() {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    this.page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // Wait a moment for any delayed errors
    await this.page.waitForTimeout(1000);
    
    return errors;
  }

  /**
   * Monitor network requests for API calls
   */
  async monitorNetworkRequests() {
    const requests: any[] = [];
    
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });
    
    this.page.on('response', response => {
      const matchingRequest = requests.find(req => 
        req.url === response.url() && 
        Math.abs(req.timestamp - Date.now()) < 5000
      );
      
      if (matchingRequest) {
        matchingRequest.status = response.status();
        matchingRequest.responseHeaders = response.headers();
      }
    });
    
    return requests;
  }

  /**
   * Simulate realistic user interactions
   */
  async simulateUserBehavior() {
    // Scroll a bit like a real user
    await this.page.mouse.wheel(0, 100);
    await this.page.waitForTimeout(500);
    
    // Move mouse around
    await this.page.mouse.move(200, 200);
    await this.page.waitForTimeout(200);
    await this.page.mouse.move(300, 300);
    await this.page.waitForTimeout(200);
  }

  /**
   * Verify component is properly mounted and functional
   */
  async verifyComponentMount(componentSelector: string, componentName: string) {
    const component = this.page.locator(componentSelector);
    
    // Check if component exists
    await expect(component).toBeVisible();
    
    // Check if component is interactive (not just a static render)
    const boundingBox = await component.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
    
    console.log(`✅ ${componentName} component properly mounted and visible`);
  }

  /**
   * Wait for real-time updates (WebSocket/SSE connections)
   */
  async waitForRealtimeConnection() {
    // Wait for WebSocket connection to be established
    await this.page.waitForFunction(() => {
      return window.WebSocket && 
             Array.from(document.querySelectorAll('[data-connection-status]')).some(
               el => el.getAttribute('data-connection-status') === 'connected'
             );
    }, { timeout: 10000 });
  }
}

export class MentionTestHelpers extends TestHelpers {
  /**
   * Comprehensive @ mention system validation
   */
  async validateMentionSystemAcrossComponents() {
    console.log('🔍 Starting comprehensive @ mention system validation...');
    
    const mentionContexts = [
      {
        name: 'PostCreator',
        selector: '[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input',
        route: '/'
      },
      {
        name: 'QuickPost',
        selector: '[data-testid="quick-post-input"], .quick-post-input, .quick-post textarea',
        route: '/posting'
      },
      {
        name: 'CommentInput',
        selector: '[data-testid="comment-input"], .comment-input, .comment-textarea',
        route: '/'
      }
    ];

    const results = [];

    for (const context of mentionContexts) {
      try {
        console.log(`🧪 Testing @ mentions in ${context.name}...`);
        
        // Navigate to the appropriate route
        await this.navigateTo(context.route);
        
        // If this is a comment input, we might need to click a reply button first
        if (context.name === 'CommentInput') {
          const replyButtons = this.page.locator('[data-testid="reply-button"], .reply-button, button:has-text("Reply")');
          if (await replyButtons.count() > 0) {
            await replyButtons.first().click();
            await this.page.waitForTimeout(500);
          }
        }
        
        // Test mention functionality
        const mentionValue = await this.testMentionFunctionality(context.selector, context.name);
        
        results.push({
          context: context.name,
          success: true,
          mentionValue,
          route: context.route
        });
        
        console.log(`✅ ${context.name} @ mention test passed`);
        
      } catch (error) {
        console.error(`❌ ${context.name} @ mention test failed:`, error);
        results.push({
          context: context.name,
          success: false,
          error: error.message,
          route: context.route
        });
        
        // Take debug screenshot on failure
        await this.debugScreenshot(`mention-failure-${context.name.toLowerCase()}`);
      }
    }

    return results;
  }
}

export class PerformanceHelpers extends TestHelpers {
  /**
   * Measure page load performance
   */
  async measurePageLoadPerformance() {
    const startTime = Date.now();
    await this.page.reload();
    await this.waitForAppReady();
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    console.log(`📊 Page load time: ${loadTime}ms`);
    
    return {
      loadTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Monitor memory usage during test execution
   */
  async monitorMemoryUsage() {
    const metrics = await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    return metrics;
  }
}

export default TestHelpers;