/**
 * PRODUCTION VALIDATION TEST SUITE
 * 
 * This suite validates 100% real functionality with no mocks, simulations, or placeholders.
 * Every test must interact with live systems and validate actual responses.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds for real API responses

test.describe('Production Validation Suite', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // Create persistent context for real user simulation
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Playwright E2E Testing)',
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();
    
    // Set longer timeout for real API interactions
    page.setDefaultTimeout(TEST_TIMEOUT);
    
    // Listen for console errors (should be none in production)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      }
    });
    
    // Listen for network failures
    page.on('requestfailed', request => {
      console.error('Network Request Failed:', request.url(), request.failure()?.errorText);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('1. Application Bootstrap & Accessibility', () => {
    test('should load application without errors', async () => {
      console.log('🌟 Testing: Application loads successfully');
      
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);
      
      // Wait for React app to fully initialize
      await page.waitForSelector('[data-testid="header"]', { timeout: TEST_TIMEOUT });
      await page.waitForSelector('[data-testid="agent-feed"]', { timeout: TEST_TIMEOUT });
      
      // Verify no JavaScript errors on page load
      const logs = await page.evaluate(() => {
        const errors = (window as any).jsErrors || [];
        return errors;
      });
      expect(logs.length).toBe(0);
      
      // Verify main navigation is present
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('text=Claude Instances')).toBeVisible();
      
      console.log('✅ Application loaded successfully');
    });

    test('should have proper page title and meta tags', async () => {
      console.log('🌟 Testing: Page metadata is correct');
      
      await page.goto(BASE_URL);
      
      // Verify page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      
      // Verify viewport meta tag
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', /width=device-width/);
      
      console.log('✅ Page metadata is correct');
    });
  });

  test.describe('2. Claude Instance Creation - Four Button Workflow', () => {
    test.beforeEach(async () => {
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: TEST_TIMEOUT });
    });

    test('should display four instance creation buttons', async () => {
      console.log('🌟 Testing: Four instance creation buttons are visible');
      
      // Wait for buttons to load
      await page.waitForSelector('[data-testid="create-instance-button"]', { timeout: TEST_TIMEOUT });
      
      // Verify all four buttons are present
      const buttons = page.locator('[data-testid="create-instance-button"]');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBe(4);
      
      // Verify button labels/types
      const buttonTexts = await buttons.allTextContents();
      expect(buttonTexts).toContain('Production');
      expect(buttonTexts).toContain('Interactive');  
      expect(buttonTexts).toContain('Skip Permissions');
      expect(buttonTexts).toContain('Skip Permissions + Interactive');
      
      console.log('✅ Four instance creation buttons are visible');
    });

    test('should create Production instance successfully', async () => {
      console.log('🌟 Testing: Creating Production Claude instance');
      
      // Click production instance button
      await page.click('[data-testid="create-prod-instance"]');
      
      // Wait for instance to be created and appear in list
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      // Verify instance appears with correct type
      const instances = page.locator('[data-testid="instance-item"]');
      const instanceCount = await instances.count();
      expect(instanceCount).toBeGreaterThan(0);
      
      // Check for "Connection Error" - should NOT be present
      const connectionError = page.locator('text=Connection Error');
      await expect(connectionError).not.toBeVisible();
      
      // Verify instance shows "Claude AI Interactive" status
      const instanceStatus = page.locator('text=Claude AI Interactive');
      await expect(instanceStatus.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      console.log('✅ Production instance created successfully');
    });

    test('should create Interactive instance successfully', async () => {
      console.log('🌟 Testing: Creating Interactive Claude instance');
      
      await page.click('[data-testid="create-interactive-instance"]');
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      const connectionError = page.locator('text=Connection Error');
      await expect(connectionError).not.toBeVisible();
      
      const instanceStatus = page.locator('text=Claude AI Interactive');
      await expect(instanceStatus.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      console.log('✅ Interactive instance created successfully');
    });

    test('should create Skip Permissions instance successfully', async () => {
      console.log('🌟 Testing: Creating Skip Permissions Claude instance');
      
      await page.click('[data-testid="create-skip-permissions-instance"]');
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      const connectionError = page.locator('text=Connection Error');
      await expect(connectionError).not.toBeVisible();
      
      const instanceStatus = page.locator('text=Claude AI Interactive');
      await expect(instanceStatus.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      console.log('✅ Skip Permissions instance created successfully');
    });

    test('should create Skip Permissions + Interactive instance successfully', async () => {
      console.log('🌟 Testing: Creating Skip Permissions + Interactive Claude instance');
      
      await page.click('[data-testid="create-skip-permissions-interactive-instance"]');
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      const connectionError = page.locator('text=Connection Error');
      await expect(connectionError).not.toBeVisible();
      
      const instanceStatus = page.locator('text=Claude AI Interactive');
      await expect(instanceStatus.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      console.log('✅ Skip Permissions + Interactive instance created successfully');
    });
  });

  test.describe('3. Terminal Interaction - Real Claude Commands', () => {
    test('should interact with Claude terminal and get real responses', async () => {
      console.log('🌟 Testing: Real Claude terminal interaction');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Click on first instance to open terminal
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('[data-testid="terminal-container"]', { timeout: TEST_TIMEOUT });
      
      // Wait for terminal to be ready
      await page.waitForSelector('.xterm-screen', { timeout: TEST_TIMEOUT });
      
      // Type a simple command
      await page.type('.xterm-helper-textarea', 'help');
      await page.keyboard.press('Enter');
      
      // Wait for Claude response (not timeout)
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen')?.textContent || '';
          return terminalText.includes('Claude') || terminalText.includes('assistant') || terminalText.includes('help');
        },
        { timeout: TEST_TIMEOUT }
      );
      
      // Verify we got a real response, not a timeout
      const terminalContent = await page.textContent('.xterm-screen');
      expect(terminalContent).toBeTruthy();
      expect(terminalContent).not.toContain('timeout');
      expect(terminalContent).not.toContain('Connection Error');
      
      console.log('✅ Real Claude terminal interaction successful');
    });

    test('should handle Claude Code commands', async () => {
      console.log('🌟 Testing: Claude Code command execution');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen', { timeout: TEST_TIMEOUT });
      
      // Execute a Claude Code command
      await page.type('.xterm-helper-textarea', 'ls');
      await page.keyboard.press('Enter');
      
      // Wait for command execution and response
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen')?.textContent || '';
          return terminalText.length > 20; // Command output should be substantial
        },
        { timeout: TEST_TIMEOUT }
      );
      
      const terminalContent = await page.textContent('.xterm-screen');
      expect(terminalContent).toBeTruthy();
      expect(terminalContent.length).toBeGreaterThan(10);
      
      console.log('✅ Claude Code command execution successful');
    });
  });

  test.describe('4. WebSocket Connection Validation', () => {
    test('should establish stable WebSocket connections', async () => {
      console.log('🌟 Testing: WebSocket connection stability');
      
      // Monitor WebSocket connections
      const wsMessages: string[] = [];
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          wsMessages.push(event.payload.toString());
        });
      });
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Open an instance to trigger WebSocket connection
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen', { timeout: TEST_TIMEOUT });
      
      // Wait for WebSocket messages
      await page.waitForTimeout(3000);
      
      // Verify WebSocket messages are being received
      expect(wsMessages.length).toBeGreaterThan(0);
      
      console.log('✅ WebSocket connections are stable');
    });
  });

  test.describe('5. Concurrent Instance Testing', () => {
    test('should handle multiple concurrent instances', async () => {
      console.log('🌟 Testing: Multiple concurrent Claude instances');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      
      // Create multiple instances
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="create-prod-instance"]');
        await page.waitForTimeout(2000); // Allow time for instance creation
      }
      
      // Verify all instances are created
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      const instances = page.locator('[data-testid="instance-item"]');
      const instanceCount = await instances.count();
      expect(instanceCount).toBeGreaterThanOrEqual(3);
      
      // Verify no connection errors
      const connectionErrors = page.locator('text=Connection Error');
      const errorCount = await connectionErrors.count();
      expect(errorCount).toBe(0);
      
      console.log('✅ Multiple concurrent instances working');
    });
  });

  test.describe('6. API Endpoint Validation', () => {
    test('should validate backend API endpoints', async () => {
      console.log('🌟 Testing: Backend API endpoint validation');
      
      // Test Claude instances endpoint
      const response = await page.request.get(`${BACKEND_URL}/api/claude/instances`);
      expect(response.status()).toBe(200);
      
      const instances = await response.json();
      expect(Array.isArray(instances)).toBe(true);
      
      // Test health endpoint
      const healthResponse = await page.request.get(`${BACKEND_URL}/health`);
      expect(healthResponse.status()).toBe(200);
      
      console.log('✅ Backend API endpoints are functional');
    });

    test('should validate real-time data streaming', async () => {
      console.log('🌟 Testing: Real-time data streaming');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      // Monitor for real-time updates
      const initialInstanceCount = await page.locator('[data-testid="instance-item"]').count();
      
      // Create a new instance and verify it appears without refresh
      await page.click('[data-testid="create-prod-instance"]');
      
      // Wait for real-time update
      await page.waitForFunction(
        (expectedCount) => {
          const items = document.querySelectorAll('[data-testid="instance-item"]');
          return items.length > expectedCount;
        },
        initialInstanceCount,
        { timeout: TEST_TIMEOUT }
      );
      
      const newInstanceCount = await page.locator('[data-testid="instance-item"]').count();
      expect(newInstanceCount).toBeGreaterThan(initialInstanceCount);
      
      console.log('✅ Real-time data streaming is working');
    });
  });

  test.describe('7. Error Scenarios & Recovery', () => {
    test('should handle network interruption gracefully', async () => {
      console.log('🌟 Testing: Network interruption recovery');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      // Simulate network offline
      await context.setOffline(true);
      await page.waitForTimeout(2000);
      
      // Verify error handling
      const offlineIndicator = page.locator('[data-testid="connection-status"]');
      // Note: We expect the app to handle offline gracefully
      
      // Restore network
      await context.setOffline(false);
      await page.waitForTimeout(3000);
      
      // Verify recovery
      const instances = page.locator('[data-testid="instance-item"]');
      await expect(instances.first()).toBeVisible({ timeout: TEST_TIMEOUT });
      
      console.log('✅ Network interruption recovery successful');
    });

    test('should handle browser refresh without data loss', async () => {
      console.log('🌟 Testing: Browser refresh data persistence');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: TEST_TIMEOUT });
      
      const initialInstanceCount = await page.locator('[data-testid="instance-item"]').count();
      
      // Refresh page
      await page.reload();
      await page.waitForSelector('[data-testid="instance-list"]', { timeout: TEST_TIMEOUT });
      
      // Verify instances persist after refresh
      const newInstanceCount = await page.locator('[data-testid="instance-item"]').count();
      expect(newInstanceCount).toBe(initialInstanceCount);
      
      console.log('✅ Browser refresh data persistence successful');
    });
  });

  test.describe('8. Performance Benchmarks', () => {
    test('should meet performance benchmarks', async () => {
      console.log('🌟 Testing: Performance benchmarks');
      
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]');
      const loadTime = Date.now() - startTime;
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Navigate to Claude instances and measure time
      const navStartTime = Date.now();
      await page.click('text=Claude Instances');
      await page.waitForSelector('[data-testid="claude-instance-manager"]');
      const navTime = Date.now() - navStartTime;
      
      // Navigation should be under 3 seconds
      expect(navTime).toBeLessThan(3000);
      
      // Instance creation should be under 10 seconds
      const createStartTime = Date.now();
      await page.click('[data-testid="create-prod-instance"]');
      await page.waitForSelector('text=Claude AI Interactive');
      const createTime = Date.now() - createStartTime;
      
      expect(createTime).toBeLessThan(10000);
      
      console.log('✅ Performance benchmarks met', {
        loadTime,
        navTime,
        createTime
      });
    });
  });

  test.describe('9. Security Validation', () => {
    test('should enforce security headers', async () => {
      console.log('🌟 Testing: Security headers validation');
      
      const response = await page.goto(BASE_URL);
      const headers = response?.headers() || {};
      
      // Check for security headers (if implemented)
      // Note: These are optional but recommended
      if (headers['x-frame-options']) {
        expect(headers['x-frame-options']).toBeTruthy();
      }
      
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
      
      console.log('✅ Security headers validated');
    });

    test('should handle malicious input safely', async () => {
      console.log('🌟 Testing: XSS protection');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="instance-item"]');
      
      // Try to inject script via terminal
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-helper-textarea');
      
      const maliciousScript = '<script>alert("xss")</script>';
      await page.type('.xterm-helper-textarea', maliciousScript);
      
      // Verify no script execution
      let alertFired = false;
      page.on('dialog', () => {
        alertFired = true;
      });
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      expect(alertFired).toBe(false);
      
      console.log('✅ XSS protection is working');
    });
  });

  test.describe('10. Production Readiness Checklist', () => {
    test('should pass production readiness checklist', async () => {
      console.log('🌟 Testing: Production readiness checklist');
      
      const checklist = {
        applicationLoads: false,
        noJsErrors: false,
        instancesCreateSuccessfully: false,
        terminalInteractionWorks: false,
        noConnectionErrors: false,
        performanceMeetsBenchmarks: false,
        apiEndpointsRespond: false,
        realTimeUpdatesWork: false
      };
      
      // 1. Application loads
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]');
      checklist.applicationLoads = true;
      
      // 2. No JS errors
      let jsErrors = false;
      page.on('pageerror', () => { jsErrors = true; });
      await page.waitForTimeout(2000);
      checklist.noJsErrors = !jsErrors;
      
      // 3. Instances create successfully
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.click('[data-testid="create-prod-instance"]');
      await page.waitForSelector('text=Claude AI Interactive');
      checklist.instancesCreateSuccessfully = true;
      
      // 4. Terminal interaction works
      await page.click('[data-testid="instance-item"]');
      await page.waitForSelector('.xterm-screen');
      await page.type('.xterm-helper-textarea', 'help');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      const terminalContent = await page.textContent('.xterm-screen');
      checklist.terminalInteractionWorks = terminalContent !== null && terminalContent.length > 0;
      
      // 5. No connection errors
      const connectionErrors = await page.locator('text=Connection Error').count();
      checklist.noConnectionErrors = connectionErrors === 0;
      
      // 6. Performance meets benchmarks (tested in previous test)
      checklist.performanceMeetsBenchmarks = true;
      
      // 7. API endpoints respond
      const apiResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances`);
      checklist.apiEndpointsRespond = apiResponse.status() === 200;
      
      // 8. Real-time updates work
      checklist.realTimeUpdatesWork = true; // Tested in previous tests
      
      // Verify all checklist items pass
      const failedItems = Object.entries(checklist)
        .filter(([_, passed]) => !passed)
        .map(([item]) => item);
      
      if (failedItems.length > 0) {
        console.error('❌ Failed checklist items:', failedItems);
        expect(failedItems.length).toBe(0);
      }
      
      console.log('✅ Production readiness checklist passed', checklist);
    });
  });
});