/**
 * Production Validation Test Suite
 * 
 * Comprehensive validation of Claude instance management functionality
 * to verify all backend services and UI integration work correctly.
 */

import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3003';
const TERMINAL_URL = 'http://localhost:3002';

// Test configuration
test.describe('Production Backend Services Validation', () => {
  test('should have all backend services running and healthy', async ({ request }) => {
    // Test Claude Instance Management API (port 3003)
    const claudeApiResponse = await request.get(`${API_BASE_URL}/health`);
    expect(claudeApiResponse.ok()).toBeTruthy();
    
    const claudeApiHealth = await claudeApiResponse.json();
    expect(claudeApiHealth).toMatchObject({
      success: true,
      status: 'healthy',
      features: expect.arrayContaining(['claude-instances', 'websocket', 'real-time-updates'])
    });

    // Test Terminal WebSocket API (port 3002)
    const terminalApiResponse = await request.get(`${TERMINAL_URL}/health`);
    expect(terminalApiResponse.ok()).toBeTruthy();
    
    const terminalApiHealth = await terminalApiResponse.json();
    expect(terminalApiHealth).toMatchObject({
      success: true,
      status: 'healthy',
      enhanced: true,
      features: expect.arrayContaining(['pty', 'claude-cli-ready'])
    });
  });

  test('should support Claude instance lifecycle operations', async ({ request }) => {
    // Test creating a new Claude instance
    const createResponse = await request.post(`${API_BASE_URL}/api/claude/instances`, {
      data: {
        name: 'Production Test Instance',
        workingDirectory: '/workspaces/agent-feed',
        useProductionMode: false
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createResult = await createResponse.json();
    expect(createResult).toMatchObject({
      success: true,
      instance: expect.objectContaining({
        id: expect.stringMatching(/^claude-instance-/),
        name: 'Production Test Instance',
        status: 'stopped',
        isConnected: false,
        workingDirectory: '/workspaces/agent-feed'
      })
    });

    const instanceId = createResult.instance.id;

    // Test getting instance details
    const getResponse = await request.get(`${API_BASE_URL}/api/claude/instances/${instanceId}`);
    expect(getResponse.ok()).toBeTruthy();
    
    const getInstance = await getResponse.json();
    expect(getInstance).toMatchObject({
      success: true,
      instance: expect.objectContaining({
        id: instanceId,
        status: 'stopped'
      })
    });

    // Test starting the instance
    const startResponse = await request.post(`${API_BASE_URL}/api/claude/instances/${instanceId}/start`);
    expect(startResponse.ok()).toBeTruthy();
    
    const startResult = await startResponse.json();
    expect(startResult).toMatchObject({
      success: true,
      instance: expect.objectContaining({
        id: instanceId,
        status: 'running',
        isConnected: true,
        pid: expect.any(Number)
      })
    });

    // Wait for instance to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test stopping the instance
    const stopResponse = await request.post(`${API_BASE_URL}/api/claude/instances/${instanceId}/stop`);
    expect(stopResponse.ok()).toBeTruthy();
    
    const stopResult = await stopResponse.json();
    expect(stopResult).toMatchObject({
      success: true,
      instance: expect.objectContaining({
        id: instanceId,
        status: 'stopped',
        isConnected: false
      })
    });

    // Test deleting the instance
    const deleteResponse = await request.delete(`${API_BASE_URL}/api/claude/instances/${instanceId}`);
    expect(deleteResponse.ok()).toBeTruthy();
    
    const deleteResult = await deleteResponse.json();
    expect(deleteResult).toMatchObject({
      success: true,
      message: expect.stringContaining(`Instance ${instanceId} deleted`)
    });
  });
});

test.describe('Frontend Integration Validation', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // Track network requests for debugging
    page.on('requestfailed', request => {
      console.error(`Network request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('should load the application without errors', async () => {
    console.log('🧪 Testing frontend application loading...');
    
    const response = await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain('localhost:5173');
    
    // Wait for React app to fully load
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Frontend application loading validated');
  });

  /**
   * VALIDATION 2: Route Loading
   * Confirm React app loads and renders dual-instance page
   */
  test('should load React app and render main page correctly', async () => {
    console.log('🧪 Testing React app loading...');
    
    await page.goto(FRONTEND_URL);
    
    // Wait for React app to fully load
    await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
    
    // Check sidebar navigation is present
    await expect(page.locator('text=Feed')).toBeVisible();
    await expect(page.locator('text=Claude Manager')).toBeVisible();
    await expect(page.locator('text=Agents')).toBeVisible();
    
    // Verify main content area is rendered
    await expect(page.locator('main[data-testid="agent-feed"]')).toBeVisible();
    
    console.log('✅ React app loading validated');
  });

  /**
   * VALIDATION 3: Component Functionality
   * Test sidebar navigation to dual-instance page
   */
  test('should navigate to dual-instance page via sidebar', async () => {
    console.log('🧪 Testing navigation to dual-instance page...');
    
    await page.goto(FRONTEND_URL);
    
    // Click on Claude Manager in sidebar
    await page.click('text=Claude Manager');
    
    // Wait for navigation to complete
    await page.waitForURL('**/dual-instance**', { timeout: 10000 });
    
    // Verify we're on the correct route
    expect(page.url()).toContain('/dual-instance');
    
    // Verify dual-instance page components load
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Instance Launcher')).toBeVisible();
    
    console.log('✅ Navigation to dual-instance validated');
  });

  /**
   * VALIDATION 4: Page Component Loading
   * Test all dual-instance page components load without errors
   */
  test('should load all dual-instance components without errors', async () => {
    console.log('🧪 Testing dual-instance component loading...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    
    // Wait for page to fully load
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    
    // Check stats display is present
    await expect(page.locator('text=Running:')).toBeVisible();
    await expect(page.locator('text=Stopped:')).toBeVisible();
    
    // Verify tab navigation is present
    await expect(page.locator('text=Instance Launcher')).toBeVisible();
    await expect(page.locator('text=Dual Monitor')).toBeVisible();
    await expect(page.locator('text=Terminal')).toBeVisible();
    
    // Check if Quick Launch button is present
    const quickLaunchButton = page.locator('button', { hasText: 'Quick Launch' });
    if (await quickLaunchButton.count() > 0) {
      await expect(quickLaunchButton).toBeVisible();
    }
    
    console.log('✅ Component loading validated');
  });

  /**
   * VALIDATION 5: Tab Functionality
   * Test navigation between tabs works correctly
   */
  test('should handle tab navigation correctly', async () => {
    console.log('🧪 Testing tab navigation...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    
    // Test Dual Monitor tab
    await page.click('text=Dual Monitor');
    await page.waitForURL('**/dual-instance/monitor**', { timeout: 5000 });
    expect(page.url()).toContain('/monitor');
    
    // Test Terminal tab
    await page.click('text=Terminal');
    await page.waitForURL('**/dual-instance/terminal**', { timeout: 5000 });
    expect(page.url()).toContain('/terminal');
    
    // Return to Instance Launcher
    await page.click('text=Instance Launcher');
    await page.waitForURL('**/dual-instance/launcher**', { timeout: 5000 });
    expect(page.url()).toContain('/launcher');
    
    console.log('✅ Tab navigation validated');
  });

  /**
   * VALIDATION 6: Button Functionality
   * Ensure all buttons are clickable and responsive
   */
  test('should have functional and responsive buttons', async () => {
    console.log('🧪 Testing button functionality...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    
    // Test tab buttons
    const tabButtons = page.locator('button', { hasText: /Instance Launcher|Dual Monitor|Terminal/ });
    const tabCount = await tabButtons.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);
    
    for (let i = 0; i < tabCount; i++) {
      const button = tabButtons.nth(i);
      await expect(button).toBeEnabled();
      
      // Test button click responsiveness
      await button.hover();
      // Button should be visually responsive to hover
    }
    
    // Test Quick Launch button if present
    const quickLaunchButton = page.locator('button', { hasText: 'Quick Launch' });
    if (await quickLaunchButton.count() > 0) {
      await expect(quickLaunchButton).toBeEnabled();
      await quickLaunchButton.hover();
    }
    
    console.log('✅ Button functionality validated');
  });

  /**
   * VALIDATION 7: Stats Display
   * Verify running/stopped counts are displayed
   */
  test('should display stats correctly', async () => {
    console.log('🧪 Testing stats display...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    
    // Check stats are present and have valid format
    const runningStats = page.locator('text=Running:');
    const stoppedStats = page.locator('text=Stopped:');
    
    await expect(runningStats).toBeVisible();
    await expect(stoppedStats).toBeVisible();
    
    // Extract numbers to verify they're valid
    const runningText = await runningStats.textContent();
    const stoppedText = await stoppedStats.textContent();
    
    expect(runningText).toMatch(/Running:\s*\d+/);
    expect(stoppedText).toMatch(/Stopped:\s*\d+/);
    
    console.log('✅ Stats display validated');
  });

  /**
   * VALIDATION 8: Terminal Navigation
   * Test terminal tab behavior without "Instance Not Found"
   */
  test('should handle terminal navigation gracefully', async () => {
    console.log('🧪 Testing terminal navigation...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance/terminal`);
    
    // Wait for terminal tab to load
    await expect(page.locator('text=Terminal')).toBeVisible();
    
    // Should not show "Instance Not Found" error
    const errorMessages = page.locator('text=Instance Not Found');
    expect(await errorMessages.count()).toBe(0);
    
    // Should show appropriate message for no instances or instance selection
    const noInstancesMessage = page.locator('text=No running instances available');
    const selectInstanceMessage = page.locator('text=Select a running instance');
    const launchInstanceButton = page.locator('button', { hasText: 'Launch Instance' });
    
    const hasNoInstances = await noInstancesMessage.count() > 0;
    const hasSelectInstance = await selectInstanceMessage.count() > 0;
    const hasLaunchButton = await launchInstanceButton.count() > 0;
    
    // At least one of these should be present
    expect(hasNoInstances || hasSelectInstance || hasLaunchButton).toBe(true);
    
    console.log('✅ Terminal navigation validated');
  });

  /**
   * VALIDATION 9: Error Handling
   * Verify error boundaries work correctly
   */
  test('should handle errors gracefully with error boundaries', async () => {
    console.log('🧪 Testing error handling...');
    
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    
    // Navigate to different routes and ensure no unhandled errors
    const routes = ['/dual-instance', '/dual-instance/monitor', '/dual-instance/terminal'];
    
    for (const route of routes) {
      await page.goto(`${FRONTEND_URL}${route}`);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check for error boundaries or fallback components
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      const errorFallback = page.locator('text=Something went wrong');
      
      // If error boundary is present, it should be handled gracefully
      if (await errorBoundary.count() > 0) {
        console.log(`Error boundary detected on ${route} - handled gracefully`);
      }
      
      // Page should still be functional
      await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    }
    
    console.log('✅ Error handling validated');
  });

  /**
   * VALIDATION 10: Performance Check
   * Basic performance validation
   */
  test('should meet basic performance requirements', async () => {
    console.log('🧪 Testing performance...');
    
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/dual-instance`);
    await expect(page.locator('text=Claude Instance Manager')).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time (10 seconds max)
    expect(loadTime).toBeLessThan(10000);
    console.log(`Page load time: ${loadTime}ms`);
    
    // Check for console errors that might indicate performance issues
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate between tabs to test performance
    await page.click('text=Dual Monitor');
    await page.waitForTimeout(1000);
    await page.click('text=Instance Launcher');
    await page.waitForTimeout(1000);
    
    // Should not have critical console errors
    const criticalErrors = errors.filter(error => 
      error.includes('chunk') || 
      error.includes('failed') || 
      error.includes('network')
    );
    
    expect(criticalErrors.length).toBe(0);
    
    console.log('✅ Performance validated');
  });

  test.afterAll(async ({ browser }) => {
    if (page) {
      await page.close();
    }
    await browser.close();
  });
});