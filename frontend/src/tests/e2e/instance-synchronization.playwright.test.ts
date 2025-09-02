/**
 * Instance Synchronization E2E Tests
 * 
 * Tests the Claude instance synchronization fix to ensure frontend and backend
 * maintain consistent state and proper instance ID matching.
 * 
 * Critical Test Cases:
 * - Instance List Loading and Synchronization
 * - Frontend/Backend ID Consistency
 * - Cache Invalidation and Real-time Updates
 * - Error Handling for Missing Instances
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

// Test utilities
class InstanceSyncTestHelper {
  constructor(private page: Page) {}

  async waitForInstancesLoaded() {
    // Wait for either instances to load or no-instances message
    await this.page.waitForFunction(() => {
      const instancesList = document.querySelector('.instances-list');
      const noInstancesMsg = document.querySelector('.no-instances');
      const instanceItems = document.querySelectorAll('.instance-item');
      return instancesList && (noInstancesMsg || instanceItems.length > 0);
    }, { timeout: 10000 });
  }

  async getInstancesFromUI(): Promise<{ id: string; name: string; status: string }[]> {
    return await this.page.evaluate(() => {
      const instanceElements = document.querySelectorAll('.instance-item');
      return Array.from(instanceElements).map(el => ({
        id: el.getAttribute('data-instance-id') || '',
        name: el.querySelector('.instance-name')?.textContent?.trim() || '',
        status: el.querySelector('.status-text')?.textContent?.trim() || ''
      }));
    });
  }

  async getInstancesFromBackend(): Promise<any[]> {
    const response = await fetch(`${BACKEND_URL}/api/v1/claude/instances`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.instances || [];
  }

  async createInstanceViaBackend(config: any = {}) {
    const response = await fetch(`${BACKEND_URL}/api/v1/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: config.command || ['claude'],
        instanceType: config.instanceType || 'default',
        workingDirectory: config.workingDirectory || '/workspaces/agent-feed'
      })
    });
    const data = await response.json();
    return data.instanceId || data.instance?.id;
  }

  async terminateInstanceViaBackend(instanceId: string) {
    await fetch(`${BACKEND_URL}/api/v1/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
  }

  async waitForSyncUpdate(timeout = 5000) {
    // Wait for sync status indicators to update
    await this.page.waitForFunction(() => {
      const syncStatus = document.querySelector('.sync-status');
      const syncTime = document.querySelector('.sync-time');
      return !syncStatus || syncStatus.textContent !== '⟳ Syncing...';
    }, { timeout });
  }

  async forceSyncRefresh() {
    // Trigger a page refresh to force sync
    await this.page.reload();
    await this.waitForInstancesLoaded();
  }
}

test.describe('Claude Instance Synchronization', () => {
  let helper: InstanceSyncTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new InstanceSyncTestHelper(page);
    
    // Navigate to frontend
    await page.goto(FRONTEND_URL);
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 10000 });
    
    // Wait for initial instances load
    await helper.waitForInstancesLoaded();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: terminate any test instances
    const backendInstances = await helper.getInstancesFromBackend();
    for (const instance of backendInstances) {
      if (instance.id && instance.id.includes('test-')) {
        await helper.terminateInstanceViaBackend(instance.id);
      }
    }
  });

  test('should load and sync initial instances from backend', async ({ page }) => {
    // Get instances from both sources
    const backendInstances = await helper.getInstancesFromBackend();
    const uiInstances = await helper.getInstancesFromUI();

    console.log('Backend instances:', backendInstances);
    console.log('UI instances:', uiInstances);

    // Verify instance count matches
    expect(uiInstances.length).toBe(backendInstances.length);

    // Verify each backend instance appears in UI with correct ID
    for (const backendInstance of backendInstances) {
      const uiInstance = uiInstances.find(ui => ui.id === backendInstance.id);
      expect(uiInstance).toBeDefined();
      expect(uiInstance?.id).toBe(backendInstance.id);
      expect(uiInstance?.status).toBe(backendInstance.status);
    }
  });

  test('should handle the claude-3876 vs claude-7800 sync issue', async ({ page }) => {
    // This test specifically targets the reported sync issue
    
    // Create two instances with specific ID patterns
    const instanceId1 = await helper.createInstanceViaBackend({ 
      instanceType: 'test-sync-1' 
    });
    const instanceId2 = await helper.createInstanceViaBackend({ 
      instanceType: 'test-sync-2' 
    });

    // Wait for sync to pick up new instances
    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();

    // Get current state from both sources
    const backendInstances = await helper.getInstancesFromBackend();
    const uiInstances = await helper.getInstancesFromUI();

    console.log('Sync test - Backend instances:', backendInstances.map(i => i.id));
    console.log('Sync test - UI instances:', uiInstances.map(i => i.id));

    // Verify both instances appear in UI with exact ID match
    expect(backendInstances.length).toBeGreaterThanOrEqual(2);
    expect(uiInstances.length).toBe(backendInstances.length);

    // Test the specific sync issue: clicking on one instance should select the correct one
    if (uiInstances.length >= 2) {
      const firstInstance = uiInstances[0];
      const secondInstance = uiInstances[1];

      // Click on first instance
      await page.click(`[data-instance-id="${firstInstance.id}"]`);
      await page.waitForTimeout(500);

      // Verify correct instance is selected
      const selectedElement = await page.$('.instance-item.selected');
      const selectedId = await selectedElement?.getAttribute('data-instance-id');
      expect(selectedId).toBe(firstInstance.id);

      // Click on second instance
      await page.click(`[data-instance-id="${secondInstance.id}"]`);
      await page.waitForTimeout(500);

      // Verify correct instance is now selected
      const newSelectedElement = await page.$('.instance-item.selected');
      const newSelectedId = await newSelectedElement?.getAttribute('data-instance-id');
      expect(newSelectedId).toBe(secondInstance.id);
    }

    // Cleanup
    if (instanceId1) await helper.terminateInstanceViaBackend(instanceId1);
    if (instanceId2) await helper.terminateInstanceViaBackend(instanceId2);
  });

  test('should maintain sync after page refresh', async ({ page }) => {
    // Create an instance
    const instanceId = await helper.createInstanceViaBackend({ 
      instanceType: 'test-refresh' 
    });

    // Wait for it to appear in UI
    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();

    const uiInstancesBefore = await helper.getInstancesFromUI();
    expect(uiInstancesBefore.some(i => i.id === instanceId)).toBe(true);

    // Refresh the page
    await helper.forceSyncRefresh();

    // Verify instance still appears with correct ID
    const uiInstancesAfter = await helper.getInstancesFromUI();
    expect(uiInstancesAfter.some(i => i.id === instanceId)).toBe(true);

    const backendInstances = await helper.getInstancesFromBackend();
    expect(uiInstancesAfter.length).toBe(backendInstances.length);

    // Cleanup
    await helper.terminateInstanceViaBackend(instanceId);
  });

  test('should handle instance removal synchronization', async ({ page }) => {
    // Create two instances
    const instanceId1 = await helper.createInstanceViaBackend({ 
      instanceType: 'test-remove-1' 
    });
    const instanceId2 = await helper.createInstanceViaBackend({ 
      instanceType: 'test-remove-2' 
    });

    // Wait for them to appear
    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();

    let uiInstances = await helper.getInstancesFromUI();
    expect(uiInstances.some(i => i.id === instanceId1)).toBe(true);
    expect(uiInstances.some(i => i.id === instanceId2)).toBe(true);

    // Remove one instance from backend
    await helper.terminateInstanceViaBackend(instanceId1);

    // Wait for sync update
    await page.waitForTimeout(3000);
    await helper.waitForSyncUpdate();

    // Verify it's removed from UI
    uiInstances = await helper.getInstancesFromUI();
    expect(uiInstances.some(i => i.id === instanceId1)).toBe(false);
    expect(uiInstances.some(i => i.id === instanceId2)).toBe(true);

    // Verify counts match
    const backendInstances = await helper.getInstancesFromBackend();
    expect(uiInstances.length).toBe(backendInstances.length);

    // Cleanup
    await helper.terminateInstanceViaBackend(instanceId2);
  });

  test('should show sync status indicators during updates', async ({ page }) => {
    // Verify sync status elements exist
    const syncStatus = await page.$('.sync-status');
    const syncTime = await page.$('.sync-time');

    // At least one should be present
    expect(syncStatus !== null || syncTime !== null).toBe(true);

    // Create instance to trigger sync
    const instanceId = await helper.createInstanceViaBackend({ 
      instanceType: 'test-sync-status' 
    });

    // Should show syncing status briefly
    await page.waitForSelector('.sync-status', { timeout: 5000 });
    const syncingText = await page.$eval('.sync-status', el => el.textContent);
    expect(syncingText).toContain('Syncing');

    // Should eventually show sync time
    await helper.waitForSyncUpdate();
    const syncTimeElement = await page.$('.sync-time');
    if (syncTimeElement) {
      const syncTimeText = await syncTimeElement.textContent();
      expect(syncTimeText).toContain('Last sync:');
    }

    // Cleanup
    await helper.terminateInstanceViaBackend(instanceId);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block backend API calls to simulate network issues
    await page.route(`${BACKEND_URL}/api/**`, route => route.abort());

    // Try to refresh instances
    await helper.forceSyncRefresh();

    // Should show error state
    const errorElement = await page.$('.error');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      expect(errorText).toBeTruthy();
    }

    // Remove route blocking
    await page.unroute(`${BACKEND_URL}/api/**`);

    // Refresh should work again
    await helper.forceSyncRefresh();
    await helper.waitForInstancesLoaded();
  });

  test('should validate instance existence before operations', async ({ page }) => {
    // Create an instance
    const instanceId = await helper.createInstanceViaBackend({ 
      instanceType: 'test-validation' 
    });

    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();

    // Select the instance
    await page.click(`[data-instance-id="${instanceId}"]`);
    await page.waitForTimeout(500);

    // Remove instance from backend without UI knowing
    await helper.terminateInstanceViaBackend(instanceId);

    // Try to send a command - should validate and sync
    await page.fill('[data-testid="command-input"]', 'test command');
    await page.click('[data-testid="send-command-button"]');

    // Should trigger sync and remove invalid instance
    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();

    const uiInstances = await helper.getInstancesFromUI();
    expect(uiInstances.some(i => i.id === instanceId)).toBe(false);
  });

  test('should maintain consistent state across multiple tabs', async ({ context }) => {
    // Create second page (tab)
    const page2 = await context.newPage();
    const helper2 = new InstanceSyncTestHelper(page2);

    await page2.goto(FRONTEND_URL);
    await page2.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 10000 });
    await helper2.waitForInstancesLoaded();

    // Create instance in first tab
    const instanceId = await helper.createInstanceViaBackend({ 
      instanceType: 'test-multi-tab' 
    });

    // Wait for sync in both tabs
    await page.waitForTimeout(2000);
    await helper.waitForSyncUpdate();
    await helper2.waitForSyncUpdate();

    // Verify both tabs show the instance
    const tab1Instances = await helper.getInstancesFromUI();
    const tab2Instances = await helper2.getInstancesFromUI();

    expect(tab1Instances.some(i => i.id === instanceId)).toBe(true);
    expect(tab2Instances.some(i => i.id === instanceId)).toBe(true);
    expect(tab1Instances.length).toBe(tab2Instances.length);

    // Cleanup
    await helper.terminateInstanceViaBackend(instanceId);
    await page2.close();
  });
});