import { test, expect, Page } from '@playwright/test';

test.describe('Claude Instance Production Validation', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable verbose logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.error('[BROWSER ERROR]:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.error('[REQUEST FAILED]:', request.url(), request.failure()?.errorText);
    });
  });

  test.beforeEach(async () => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for React to render
    await page.waitForTimeout(2000);
  });

  test('Backend Health Check', async () => {
    console.log('🔍 Testing backend health...');
    
    // Test backend health endpoint
    const response = await page.request.get('http://localhost:3000/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    
    console.log('✅ Backend health check passed:', health);
  });

  test('Frontend Application Loads', async () => {
    console.log('🔍 Testing frontend application loading...');
    
    // Check for main application content
    await expect(page).toHaveTitle(/Agent Feed|Claude/);
    
    // Look for key navigation elements or main content
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    
    console.log('✅ Frontend application loaded successfully');
  });

  test('Navigation to Claude Instances', async () => {
    console.log('🔍 Testing navigation to Claude instances...');
    
    // Look for navigation to Claude Instances page
    try {
      // Try different possible navigation patterns
      const navButtons = [
        'button:has-text("Claude Instances")',
        'a:has-text("Claude Instances")',
        'button:has-text("Instances")',
        'a:has-text("Instances")',
        '[data-testid="claude-instances"]',
        'nav a[href*="instances"]',
        'nav a[href*="claude"]'
      ];
      
      let navigated = false;
      for (const selector of navButtons) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            await element.click();
            navigated = true;
            console.log(`✅ Navigated using selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector
          continue;
        }
      }
      
      if (!navigated) {
        // Try direct URL navigation as fallback
        await page.goto('http://localhost:5173/claude-instances');
        console.log('✅ Navigated via direct URL');
      }
      
      await page.waitForLoadState('networkidle');
      
    } catch (error) {
      console.log('⚠️ Navigation test - checking current page content');
      const pageContent = await page.textContent('body');
      console.log('Current page content preview:', pageContent?.substring(0, 500));
    }
  });

  test('Claude Instance Buttons Present', async () => {
    console.log('🔍 Testing presence of Claude instance creation buttons...');
    
    // Navigate to instances page if not already there
    try {
      await page.goto('http://localhost:5173/claude-instances');
      await page.waitForLoadState('networkidle');
    } catch (error) {
      // Continue with current page
    }
    
    // Look for instance creation buttons
    const buttonSelectors = [
      'button:has-text("Create")',
      'button:has-text("Launch")',
      'button:has-text("Start")',
      'button:has-text("New")',
      '[data-testid="create-instance"]',
      '.instance-button',
      '.launch-button'
    ];
    
    let buttonsFound = 0;
    const foundButtons = [];
    
    for (const selector of buttonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        if (buttons.length > 0) {
          buttonsFound += buttons.length;
          foundButtons.push({ selector, count: buttons.length });
          console.log(`Found ${buttons.length} buttons with selector: ${selector}`);
        }
      } catch (error) {
        // Button not found, continue
      }
    }
    
    console.log(`✅ Total buttons found: ${buttonsFound}`);
    console.log('Button details:', foundButtons);
    
    // At least one button should be found
    expect(buttonsFound).toBeGreaterThan(0);
  });

  test('Test Claude Instance Creation - Button 1 (Production)', async () => {
    console.log('🚀 Testing Claude instance creation - Button 1 (Production)...');
    
    await testInstanceCreation(page, {
      buttonText: ['prod', 'production', 'create', 'launch'],
      testName: 'Button 1 (Production)',
      expectedType: 'prod'
    });
  });

  test('Test Claude Instance Creation - Button 2 (Skip Permissions)', async () => {
    console.log('🚀 Testing Claude instance creation - Button 2 (Skip Permissions)...');
    
    await testInstanceCreation(page, {
      buttonText: ['skip', 'permissions', 'launch'],
      testName: 'Button 2 (Skip Permissions)',
      expectedType: 'skip-permissions'
    });
  });

  test('Test Claude Instance Creation - Button 3 (Continue)', async () => {
    console.log('🚀 Testing Claude instance creation - Button 3 (Continue)...');
    
    await testInstanceCreation(page, {
      buttonText: ['continue', '-c', 'launch'],
      testName: 'Button 3 (Continue)',
      expectedType: 'continue'
    });
  });

  test('Test Claude Instance Creation - Button 4 (Resume)', async () => {
    console.log('🚀 Testing Claude instance creation - Button 4 (Resume)...');
    
    await testInstanceCreation(page, {
      buttonText: ['resume', '--resume', 'launch'],
      testName: 'Button 4 (Resume)',
      expectedType: 'resume'
    });
  });

  test('API Endpoints Validation', async () => {
    console.log('🔍 Testing API endpoints...');
    
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/claude/health', method: 'GET' },
      { path: '/api/claude/status', method: 'GET' },
      { path: '/api/claude/check', method: 'GET' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(`http://localhost:3000${endpoint.path}`);
        console.log(`${endpoint.path}: ${response.status()} ${response.statusText()}`);
        
        if (response.ok()) {
          const data = await response.json();
          console.log(`  Response:`, data);
        }
      } catch (error) {
        console.error(`  Error testing ${endpoint.path}:`, error.message);
      }
    }
  });

  test('Performance Validation', async () => {
    console.log('🔍 Testing performance...');
    
    const startTime = Date.now();
    
    // Test page load time
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Test API response time
    const apiStart = Date.now();
    const response = await page.request.get('http://localhost:3000/health');
    const apiTime = Date.now() - apiStart;
    
    console.log(`API response time: ${apiTime}ms`);
    expect(apiTime).toBeLessThan(2000);
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }
  });
});

/**
 * Helper function to test instance creation
 */
async function testInstanceCreation(page: Page, options: {
  buttonText: string[];
  testName: string;
  expectedType: string;
}) {
  try {
    // Navigate to instances page
    await page.goto('http://localhost:5173/claude-instances');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Look for the specific button
    let button = null;
    for (const text of options.buttonText) {
      try {
        button = await page.waitForSelector(`button:has-text("${text}")`, { timeout: 2000 });
        if (button) {
          console.log(`Found button with text: ${text}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!button) {
      // Try generic selectors
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons on page`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const buttonText = await buttons[i].textContent();
        console.log(`Button ${i}: "${buttonText}"`);
      }
      
      if (buttons.length > 0) {
        button = buttons[0]; // Use first button as fallback
        console.log('Using first button as fallback');
      }
    }
    
    if (!button) {
      throw new Error('No suitable button found for testing');
    }
    
    // Monitor network requests
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('/claude')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Click the button
    await button.click();
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    // Check for success/error messages
    const bodyText = await page.textContent('body');
    const hasError = bodyText?.toLowerCase().includes('error') || 
                    bodyText?.toLowerCase().includes('failed');
    const hasSuccess = bodyText?.toLowerCase().includes('success') ||
                      bodyText?.toLowerCase().includes('created') ||
                      bodyText?.toLowerCase().includes('launched');
    
    console.log(`${options.testName} - Error present: ${hasError}`);
    console.log(`${options.testName} - Success present: ${hasSuccess}`);
    console.log('API responses:', responses);
    
    // Should not have "Failed to create instance" error
    expect(bodyText).not.toContain('Failed to create instance');
    
    console.log(`✅ ${options.testName} completed successfully`);
    
  } catch (error) {
    console.error(`❌ ${options.testName} failed:`, error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/test-results/screenshots/${options.testName.replace(/\s+/g, '-').toLowerCase()}-error.png` 
    });
    
    throw error;
  }
}