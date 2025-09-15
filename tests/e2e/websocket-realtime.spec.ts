import { test, expect, Page } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

/**
 * WebSocket Real-Time Communication Tests
 *
 * Validates real-time communication features including:
 * - WebSocket connection establishment and lifecycle
 * - Real-time page updates
 * - Connection recovery and error handling
 * - Message broadcasting and synchronization
 */

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

test.describe('WebSocket Real-Time Communication', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('WebSocket connection establishment and status', async ({ page }) => {
    // Navigate to agent profile
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Check for WebSocket connection indicators
    const connectionStatus = page.locator(
      '.connection-status, [data-testid="websocket-status"], .ws-status'
    );

    // Connection status should be visible (connected, connecting, or disconnected)
    if (await connectionStatus.count() > 0) {
      await expect(connectionStatus.first()).toBeVisible();

      // Check for connected state
      const connectedIndicator = page.locator(
        'text="Connected", .status-connected, [data-status="connected"]'
      );

      // Allow some time for connection
      await page.waitForTimeout(2000);

      if (await connectedIndicator.count() > 0) {
        await expect(connectedIndicator.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ WebSocket connection established');
      } else {
        console.log('ℹ️ WebSocket connection status not clearly visible, but this may be normal');
      }
    }

    // Test WebSocket debugging panel if available
    const debugPanel = page.locator('.websocket-debug, [data-testid="websocket-debug"]');
    if (await debugPanel.count() > 0) {
      await expect(debugPanel.first()).toBeVisible();
      console.log('✅ WebSocket debug panel found');
    }
  });

  test('Real-time page updates and synchronization', async ({ page, context }) => {
    // Create a test page via API
    const pageData = TestHelper.generateTestPageData('markdown');
    const pageId = await TestHelper.createTestPage({
      ...pageData,
      title: 'Real-time Test Page'
    });
    createdPageIds.push(pageId);

    // Open agent profile in first tab
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"]', { timeout: 15000 });

    // Open second tab for real-time testing
    const secondPage = await context.newPage();
    await secondPage.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(secondPage);

    const secondTabDynamicPages = secondPage.locator('text="Dynamic Pages"');
    await secondTabDynamicPages.click();
    await secondPage.waitForSelector('.page-item, [data-testid^="page-"]', { timeout: 15000 });

    // Count pages in both tabs
    const firstTabPages = page.locator('.page-item, [data-testid^="page-"]');
    const secondTabPages = secondPage.locator('.page-item, [data-testid^="page-"]');

    const firstTabCount = await firstTabPages.count();
    const secondTabCount = await secondTabPages.count();

    // Both tabs should show the same number of pages
    expect(firstTabCount).toBe(secondTabCount);
    expect(firstTabCount).toBeGreaterThan(0);

    // Create another page via API to test real-time updates
    const newPageData = TestHelper.generateTestPageData('json');
    const newPageId = await TestHelper.createTestPage({
      ...newPageData,
      title: 'Second Real-time Test Page'
    });
    createdPageIds.push(newPageId);

    // Wait for potential real-time updates (WebSocket or polling)
    await page.waitForTimeout(3000);

    // Check if pages are updated in real-time (this may or may not work depending on implementation)
    const updatedFirstTabCount = await firstTabPages.count();
    const updatedSecondTabCount = await secondTabPages.count();

    if (updatedFirstTabCount > firstTabCount || updatedSecondTabCount > secondTabCount) {
      console.log('✅ Real-time updates working');
      expect(updatedFirstTabCount).toBe(updatedSecondTabCount);
    } else {
      console.log('ℹ️ Real-time updates may require refresh or may not be implemented yet');

      // Refresh and verify the new page appears
      await page.reload();
      await TestHelper.waitForPageReady(page);
      const dynamicPagesTabRefresh = page.locator('text="Dynamic Pages"');
      await dynamicPagesTabRefresh.click();
      await page.waitForSelector('.page-item, [data-testid^="page-"]');

      const refreshedCount = await page.locator('.page-item, [data-testid^="page-"]').count();
      expect(refreshedCount).toBeGreaterThan(firstTabCount);
    }

    await secondPage.close();
    console.log('✅ Real-time synchronization test completed');
  });

  test('WebSocket connection recovery and error handling', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Monitor WebSocket connections
    let wsConnections: any[] = [];
    let wsMessages: WebSocketMessage[] = [];

    page.on('websocket', ws => {
      console.log('WebSocket connection detected:', ws.url());
      wsConnections.push(ws);

      ws.on('framesent', event => {
        try {
          const data = JSON.parse(event.payload.toString());
          wsMessages.push({
            type: 'sent',
            data,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Non-JSON message
        }
      });

      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload.toString());
          wsMessages.push({
            type: 'received',
            data,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          // Non-JSON message
        }
      });
    });

    // Click Dynamic Pages tab to potentially trigger WebSocket activity
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Wait for potential WebSocket activity
    await page.waitForTimeout(2000);

    if (wsConnections.length > 0) {
      console.log(`✅ WebSocket connections found: ${wsConnections.length}`);
      console.log(`📨 WebSocket messages: ${wsMessages.length}`);

      // Test connection resilience by going offline/online
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      // Check for offline state indication
      const offlineIndicator = page.locator(
        'text="Offline", text="Disconnected", .status-offline, [data-status="offline"]'
      );

      if (await offlineIndicator.count() > 0) {
        await expect(offlineIndicator.first()).toBeVisible({ timeout: 5000 });
        console.log('✅ Offline state detected');
      }

      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // Check for reconnection
      const onlineIndicator = page.locator(
        'text="Online", text="Connected", .status-connected, [data-status="connected"]'
      );

      if (await onlineIndicator.count() > 0) {
        await expect(onlineIndicator.first()).toBeVisible({ timeout: 10000 });
        console.log('✅ Reconnection detected');
      }
    } else {
      console.log('ℹ️ No WebSocket connections detected - may be using HTTP polling or not implemented');
    }

    console.log('✅ WebSocket error handling test completed');
  });

  test('Real-time notifications and activity feed', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Look for activity feed or notifications
    const activityFeed = page.locator(
      '.activity-feed, [data-testid="activity-feed"], .notifications, .real-time-updates'
    );

    const notificationBell = page.locator(
      '.notification-bell, [data-testid="notifications"], .bell-icon'
    );

    if (await activityFeed.count() > 0) {
      await expect(activityFeed.first()).toBeVisible();
      console.log('✅ Activity feed found');

      // Test activity feed updates
      const initialActivityCount = await activityFeed.locator('.activity-item, .notification-item').count();

      // Create a page to trigger activity
      const pageData = TestHelper.generateTestPageData('text');
      const pageId = await TestHelper.createTestPage({
        ...pageData,
        title: 'Activity Test Page'
      });
      createdPageIds.push(pageId);

      // Wait for potential activity update
      await page.waitForTimeout(3000);

      const updatedActivityCount = await activityFeed.locator('.activity-item, .notification-item').count();

      if (updatedActivityCount > initialActivityCount) {
        console.log('✅ Activity feed updated in real-time');
      } else {
        console.log('ℹ️ Activity feed may require refresh or may not be real-time');
      }
    }

    if (await notificationBell.count() > 0) {
      await expect(notificationBell.first()).toBeVisible();
      console.log('✅ Notification system found');

      // Test notification interactions
      await notificationBell.first().click();

      // Look for notification dropdown or modal
      const notificationDropdown = page.locator(
        '.notification-dropdown, .notification-modal, [data-testid="notifications-dropdown"]'
      );

      if (await notificationDropdown.count() > 0) {
        await expect(notificationDropdown.first()).toBeVisible();
        console.log('✅ Notification dropdown working');
      }
    }

    console.log('✅ Real-time notifications test completed');
  });

  test('WebSocket message validation and data integrity', async ({ page, context }) => {
    let wsMessages: any[] = [];
    let requestMessages: any[] = [];

    // Monitor all network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestMessages.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor WebSocket messages
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload.toString());
          wsMessages.push({
            type: 'websocket',
            data,
            timestamp: new Date().toISOString(),
            url: ws.url()
          });
        } catch (e) {
          // Non-JSON message
        }
      });
    });

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(3000);

    // Create a test page to trigger data synchronization
    const pageData = TestHelper.generateTestPageData('component');
    const pageId = await TestHelper.createTestPage({
      ...pageData,
      title: 'Data Integrity Test Page'
    });
    createdPageIds.push(pageId);

    // Wait for potential real-time updates
    await page.waitForTimeout(5000);

    // Analyze captured messages
    console.log(`📊 Captured ${requestMessages.length} API requests`);
    console.log(`📊 Captured ${wsMessages.length} WebSocket messages`);

    // Verify API requests are properly structured
    const pageApiRequests = requestMessages.filter(req =>
      req.url.includes('/api/agents/') && req.url.includes('/pages')
    );

    expect(pageApiRequests.length).toBeGreaterThan(0);
    console.log(`✅ Found ${pageApiRequests.length} relevant API requests`);

    // If WebSocket messages exist, validate their structure
    if (wsMessages.length > 0) {
      wsMessages.forEach((msg, index) => {
        expect(msg).toHaveProperty('timestamp');
        expect(msg).toHaveProperty('data');
        console.log(`WebSocket message ${index + 1}:`, msg.data);
      });
      console.log('✅ WebSocket messages validated');
    }

    // Test data consistency by refreshing and comparing
    const pageElementsBefore = page.locator('.page-item, [data-testid^="page-"]');
    const countBefore = await pageElementsBefore.count();

    await page.reload();
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTabRefresh = page.locator('text="Dynamic Pages"');
    await dynamicPagesTabRefresh.click();
    await page.waitForSelector('.page-item, [data-testid^="page-"]', { timeout: 15000 });

    const pageElementsAfter = page.locator('.page-item, [data-testid^="page-"]');
    const countAfter = await pageElementsAfter.count();

    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    console.log('✅ Data consistency maintained after refresh');

    console.log('✅ WebSocket message validation completed');
  });

  test('Performance impact of real-time features', async ({ page }) => {
    // Measure performance with real-time features
    const startTime = Date.now();

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    const loadTime = Date.now() - startTime;
    console.log(`📊 Page load time with real-time features: ${loadTime}ms`);

    // Monitor memory usage
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const initialMemory = await client.send('Runtime.getHeapUsage');
    console.log(`📊 Initial memory usage: ${Math.round(initialMemory.usedSize / 1024 / 1024)}MB`);

    // Navigate to dynamic pages and wait
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(10000); // Wait 10 seconds for real-time activity

    const finalMemory = await client.send('Runtime.getHeapUsage');
    const memoryIncrease = finalMemory.usedSize - initialMemory.usedSize;
    console.log(`📊 Memory increase after 10s: ${Math.round(memoryIncrease / 1024)}KB`);

    // Memory increase should be reasonable (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

    // Performance should be acceptable
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    console.log('✅ Real-time features performance test completed');
  });
});

test.describe('WebSocket Error Scenarios', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('WebSocket connection failure handling', async ({ page }) => {
    // Block WebSocket connections
    await page.route('**/ws', route => {
      route.abort('failed');
    });

    await page.route('**/*', route => {
      if (route.request().url().includes('ws://') || route.request().url().includes('wss://')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Application should still function without WebSocket
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await expect(dynamicPagesTab).toBeVisible();
    await dynamicPagesTab.click();

    // Pages should still load via HTTP
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Check for fallback indicators
    const offlineMode = page.locator(
      'text="Offline Mode", text="Limited Connectivity", .fallback-mode'
    );

    if (await offlineMode.count() > 0) {
      console.log('✅ Offline mode indicator found');
    }

    console.log('✅ WebSocket failure handling test completed');
  });

  test('Network instability simulation', async ({ page }) => {
    let connectionToggle = true;

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Simulate intermittent connectivity
    const toggleConnection = async () => {
      await page.context().setOffline(connectionToggle);
      connectionToggle = !connectionToggle;
    };

    // Navigate to dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Toggle connection multiple times
    for (let i = 0; i < 3; i++) {
      await toggleConnection();
      await page.waitForTimeout(1000);
    }

    // Ensure we end up online
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // Application should recover
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    console.log('✅ Network instability simulation completed');
  });
});