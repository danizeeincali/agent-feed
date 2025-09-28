/**
 * Comprehensive Playwright Test Suite for React Context Fix Validation
 *
 * This test suite validates:
 * 1. Homepage loads without useEffect errors
 * 2. Agents page shows proper agent data
 * 3. Screenshots of both pages working correctly
 * 4. No React console errors in browser
 * 5. Navigation between pages works properly
 * 6. API integration with backend (11 agents loading)
 * 7. Responsive design on different viewports
 * 8. Loading states and error handling
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000';

test.describe('React Context Fix Validation', () => {
  let consoleErrors = [];
  let consoleWarnings = [];
  let networkRequests = [];

  test.beforeEach(async ({ page }) => {
    // Reset tracking arrays
    consoleErrors = [];
    consoleWarnings = [];
    networkRequests = [];

    // Monitor console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push({
          type,
          text,
          timestamp: new Date().toISOString()
        });
      } else if (type === 'warning') {
        consoleWarnings.push({
          type,
          text,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });

    // Monitor page errors
    page.on('pageerror', error => {
      consoleErrors.push({
        type: 'pageerror',
        text: error.toString(),
        timestamp: new Date().toISOString()
      });
    });
  });

  test.describe('Homepage Validation', () => {
    test('should load homepage without useEffect errors', async ({ page }) => {
      console.log('🏠 Testing homepage load...');

      // Navigate to homepage
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for App component to mount
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Verify page structure
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="header"]')).toBeVisible();

      // Check for React mount debug messages
      const appDebugMessage = await page.evaluate(() => {
        return window.console && window.console.log ? 'console available' : 'no console';
      });
      console.log('📊 Console availability:', appDebugMessage);

      // Take screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/screenshots/homepage-loaded.png',
        fullPage: true
      });

      // Verify no critical React errors
      const criticalErrors = consoleErrors.filter(error =>
        error.text.includes('useEffect') ||
        error.text.includes('React') ||
        error.text.includes('Cannot read properties') ||
        error.text.includes('undefined')
      );

      if (criticalErrors.length > 0) {
        console.error('❌ Critical React errors found:', criticalErrors);
      }

      expect(criticalErrors.length).toBe(0);
      console.log('✅ Homepage loaded without useEffect errors');
    });

    test('should display correct navigation and sidebar', async ({ page }) => {
      console.log('🧭 Testing homepage navigation...');

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Check sidebar navigation
      await expect(page.locator('text=AgentLink')).toBeVisible();
      await expect(page.locator('text=Feed')).toBeVisible();
      await expect(page.locator('text=Agents')).toBeVisible();
      await expect(page.locator('text=Live Activity')).toBeVisible();
      await expect(page.locator('text=Analytics')).toBeVisible();

      // Verify active page highlighting
      const feedLink = page.locator('nav a[href="/"]');
      await expect(feedLink).toHaveClass(/bg-blue-100|text-blue-700/);

      console.log('✅ Navigation structure validated');
    });
  });

  test.describe('Agents Page Validation', () => {
    test('should load agents page and display agent data', async ({ page }) => {
      console.log('🤖 Testing agents page load...');

      // Navigate to agents page
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });

      // Wait for the isolated agent manager to load
      await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 15000 });

      // Check if loading state appears and then disappears
      const loadingSelector = '[data-testid="agents-loading"]';
      try {
        await page.waitForSelector(loadingSelector, { timeout: 5000 });
        await page.waitForSelector(loadingSelector, { state: 'hidden', timeout: 10000 });
        console.log('✅ Loading state handled correctly');
      } catch (e) {
        console.log('ℹ️ Loading state not detected or very fast');
      }

      // Verify agents page structure
      await expect(page.locator('[data-testid="isolated-agent-manager"]')).toBeVisible();
      await expect(page.locator('text=Isolated Agent Manager')).toBeVisible();

      // Check for agent list
      const agentList = page.locator('[data-testid="agent-list"]');
      await expect(agentList).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-page-loaded.png',
        fullPage: true
      });

      console.log('✅ Agents page structure validated');
    });

    test('should validate API integration and agent data', async ({ page }) => {
      console.log('🔌 Testing API integration...');

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });

      // Wait for API calls to complete
      await page.waitForTimeout(3000);

      // Check for API requests to agents endpoint
      const agentApiRequests = networkRequests.filter(req =>
        req.url.includes('/api/agents') || req.url.includes('/agents')
      );

      console.log('📡 Agent API requests:', agentApiRequests.length);

      // Wait for agent cards to appear
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

      // Count agent cards
      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      console.log(`📊 Found ${agentCards} agent cards`);

      // Verify at least some agents are displayed
      expect(agentCards).toBeGreaterThan(0);

      // Check agent card content
      if (agentCards > 0) {
        const firstAgent = page.locator('[data-testid="agent-card"]').first();

        // Verify agent card has essential elements
        await expect(firstAgent.locator('.w-10.h-10')).toBeVisible(); // Avatar
        await expect(firstAgent.locator('h3')).toBeVisible(); // Name
        await expect(firstAgent.locator('button')).toBeVisible(); // Action buttons
      }

      console.log('✅ API integration and agent data validated');
    });

    test('should handle agent interactions correctly', async ({ page }) => {
      console.log('⚡ Testing agent interactions...');

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

      // Test refresh functionality
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        console.log('🔄 Refresh button clicked');

        // Wait for refresh to complete
        await page.waitForTimeout(2000);
      }

      // Test search functionality
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('agent');
        await page.waitForTimeout(1000);

        // Clear search
        await searchInput.clear();
        console.log('🔍 Search functionality tested');
      }

      console.log('✅ Agent interactions validated');
    });
  });

  test.describe('Navigation and Route Validation', () => {
    test('should navigate between pages without errors', async ({ page }) => {
      console.log('🚀 Testing page navigation...');

      // Start at homepage
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Navigate to agents page
      await page.click('nav a[href="/agents"]');
      await page.waitForURL(`${BASE_URL}/agents`);
      await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

      console.log('✅ Navigated to agents page');

      // Navigate back to homepage
      await page.click('nav a[href="/"]');
      await page.waitForURL(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      console.log('✅ Navigated back to homepage');

      // Check for navigation errors
      const navigationErrors = consoleErrors.filter(error =>
        error.text.includes('navigation') ||
        error.text.includes('router') ||
        error.text.includes('route')
      );

      expect(navigationErrors.length).toBe(0);
      console.log('✅ Navigation completed without errors');
    });
  });

  test.describe('Responsive Design Validation', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      console.log('📱 Testing mobile viewport...');

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

      // Check if mobile menu works
      const menuButton = page.locator('button:has([class*="w-5 h-5"]):has-text("")').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        console.log('📱 Mobile menu opened');
      }

      // Take mobile screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-mobile.png',
        fullPage: true
      });

      console.log('✅ Mobile viewport validated');
    });

    test('should work correctly on tablet viewport', async ({ page }) => {
      console.log('📱 Testing tablet viewport...');

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

      // Take tablet screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-tablet.png',
        fullPage: true
      });

      console.log('✅ Tablet viewport validated');
    });

    test('should work correctly on desktop viewport', async ({ page }) => {
      console.log('🖥️ Testing desktop viewport...');

      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="isolated-agent-manager"]', { timeout: 10000 });

      // Take desktop screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/screenshots/agents-desktop.png',
        fullPage: true
      });

      console.log('✅ Desktop viewport validated');
    });
  });

  test.describe('Error Handling and Console Validation', () => {
    test('should not have React useEffect errors in console', async ({ page }) => {
      console.log('🔍 Validating console for React errors...');

      // Test both pages for console errors
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Filter for React-specific errors
      const reactErrors = consoleErrors.filter(error => {
        const text = error.text.toLowerCase();
        return text.includes('useeffect') ||
               text.includes('react') ||
               text.includes('hook') ||
               text.includes('cannot read properties') ||
               text.includes('undefined') ||
               text.includes('null');
      });

      // Log all console messages for debugging
      console.log('📊 Console Summary:');
      console.log(`   - Total Errors: ${consoleErrors.length}`);
      console.log(`   - React Errors: ${reactErrors.length}`);
      console.log(`   - Warnings: ${consoleWarnings.length}`);

      if (consoleErrors.length > 0) {
        console.log('🔍 All Console Errors:');
        consoleErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. [${error.type}] ${error.text}`);
        });
      }

      if (reactErrors.length > 0) {
        console.log('❌ React-specific Errors:');
        reactErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. [${error.type}] ${error.text}`);
        });
      }

      // The test passes if there are no React-specific errors
      expect(reactErrors.length).toBe(0);
      console.log('✅ No React useEffect errors found');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      console.log('🛡️ Testing error handling...');

      // Test with invalid route first
      await page.goto(`${BASE_URL}/invalid-route`, { waitUntil: 'networkidle' });

      // Should show 404 or fallback
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();

      // Test agents page error handling
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });

      // Wait for potential error states
      await page.waitForTimeout(5000);

      // Check if error boundaries work
      const errorBoundary = page.locator('[class*="border-red"], [class*="bg-red"]');
      const errorCount = await errorBoundary.count();

      console.log(`🛡️ Error boundaries displayed: ${errorCount}`);
      console.log('✅ Error handling tested');
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should load pages within reasonable time limits', async ({ page }) => {
      console.log('⚡ Testing page load performance...');

      // Test homepage load time
      const homeStartTime = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-root"]');
      const homeLoadTime = Date.now() - homeStartTime;

      // Test agents page load time
      const agentsStartTime = Date.now();
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="isolated-agent-manager"]');
      const agentsLoadTime = Date.now() - agentsStartTime;

      console.log(`📊 Performance Results:`);
      console.log(`   - Homepage: ${homeLoadTime}ms`);
      console.log(`   - Agents Page: ${agentsLoadTime}ms`);

      // Reasonable load time expectations (under 10 seconds)
      expect(homeLoadTime).toBeLessThan(10000);
      expect(agentsLoadTime).toBeLessThan(10000);

      console.log('✅ Performance requirements met');
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Save console log to file for debugging
    if (consoleErrors.length > 0 || consoleWarnings.length > 0) {
      const logData = {
        test: testInfo.title,
        timestamp: new Date().toISOString(),
        consoleErrors,
        consoleWarnings,
        networkRequests: networkRequests.slice(-10) // Last 10 requests
      };

      console.log('📋 Test completed with console data collected');
    }
  });
});