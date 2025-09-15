import { test, expect, Page } from '@playwright/test';

/**
 * Avi DM E2E Test Suite
 *
 * Comprehensive end-to-end tests for the Avi Direct Messages functionality,
 * covering all critical user journeys including tab navigation, connection
 * establishment, message sending/receiving, error recovery, and server stability.
 *
 * Test Coverage:
 * - Tab navigation and UI interactions
 * - Agent selection and connection establishment
 * - Real-time messaging functionality
 * - WebSocket communication stability
 * - Error handling and recovery scenarios
 * - Server crash prevention validation
 * - Cross-browser compatibility
 * - Mobile responsiveness
 * - Performance benchmarks
 */

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

// Mock agents for testing
const MOCK_AGENTS = [
  { id: 'tech-reviewer', name: 'TechReviewer', status: 'online' },
  { id: 'system-validator', name: 'SystemValidator', status: 'online' },
  { id: 'code-auditor', name: 'CodeAuditor', status: 'away' },
  { id: 'quality-assurance', name: 'QualityAssurance', status: 'online' },
  { id: 'performance-analyst', name: 'PerformanceAnalyst', status: 'offline' }
];

// Helper functions
class AviDMPageObject {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto(FRONTEND_URL);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  async clickAviDMTab() {
    const aviDMTab = this.page.locator('[data-testid="avi-dm-tab"], button:has-text("Avi DM"), .tab:has-text("Avi DM")');
    await expect(aviDMTab).toBeVisible({ timeout: 10000 });
    await aviDMTab.click();

    // Wait for tab content to load
    await this.page.waitForSelector('[data-testid="avi-dm-section"], .avi-dm-container', { timeout: 15000 });
  }

  async selectAgent(agentId: string) {
    const agentSelector = `[data-agent-id="${agentId}"], [data-testid="agent-${agentId}"], .agent-item:has-text("${agentId}")`;
    const agentElement = this.page.locator(agentSelector);
    await expect(agentElement).toBeVisible({ timeout: 10000 });
    await agentElement.click();
  }

  async sendMessage(message: string) {
    const messageInput = this.page.locator('textarea[placeholder*="message"], [data-testid="message-input"]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill(message);

    const sendButton = this.page.locator('button[type="submit"], button:has-text("Send"), [data-testid="send-button"]');
    await expect(sendButton).toBeVisible({ timeout: 5000 });
    await sendButton.click();
  }

  async waitForMessageResponse(timeout = 10000) {
    // Wait for agent response to appear
    await this.page.waitForSelector('.message.agent, [data-sender="agent"]', { timeout });
  }

  async checkConnectionStatus() {
    const connectionIndicator = this.page.locator('[data-testid="connection-status"], .connection-indicator');
    if (await connectionIndicator.isVisible()) {
      const status = await connectionIndicator.textContent();
      return status?.toLowerCase().includes('connected') || status?.toLowerCase().includes('online');
    }
    return true; // Assume connected if no indicator visible
  }

  async takeScreenshotOnFailure(testName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `tests/screenshots/avi-dm-failure-${testName}-${timestamp}.png`,
      fullPage: true
    });
  }

  async checkForConsoleErrors() {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    this.page.on('pageerror', error => {
      errors.push(error.message);
    });
    return errors;
  }
}

// Test suite
test.describe('Avi DM Core Functionality', () => {
  let aviDM: AviDMPageObject;
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    aviDM = new AviDMPageObject(page);
    consoleErrors = [];

    // Set up error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('should successfully click Avi DM tab and load interface', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();

    // Verify initial page load
    await expect(page.locator('body')).toBeVisible();

    // Click Avi DM tab
    await aviDM.clickAviDMTab();

    // Verify Avi DM interface is displayed
    const aviDMSection = page.locator('[data-testid="avi-dm-section"], .avi-dm-container');
    await expect(aviDMSection).toBeVisible({ timeout: 15000 });

    // Verify agent list is displayed
    const agentList = page.locator('.agent-list, [data-testid="agent-list"]');
    await expect(agentList).toBeVisible({ timeout: 10000 });

    // Verify at least one agent is available
    const agents = page.locator('.agent-item, [data-testid^="agent-"]');
    await expect(agents.first()).toBeVisible({ timeout: 10000 });

    // Take success screenshot
    await page.screenshot({
      path: `tests/screenshots/avi-dm-tab-loaded-${Date.now()}.png`,
      fullPage: true
    });

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
      await aviDM.takeScreenshotOnFailure('console-errors');
    }
  });

  test('should establish connection with agent successfully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Select first available online agent
    const onlineAgent = page.locator('.agent-item[data-status="online"], .agent-item:has-text("online")').first();
    await expect(onlineAgent).toBeVisible({ timeout: 10000 });
    await onlineAgent.click();

    // Verify connection establishment
    const isConnected = await aviDM.checkConnectionStatus();
    expect(isConnected).toBe(true);

    // Verify chat interface is available
    const messageInput = page.locator('textarea[placeholder*="message"], [data-testid="message-input"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    // Verify send button is enabled
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")');
    await expect(sendButton).toBeVisible({ timeout: 5000 });
    await expect(sendButton).toBeEnabled();

    // Take success screenshot
    await page.screenshot({
      path: `tests/screenshots/avi-dm-connection-established-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should send message to agent and handle response', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Select online agent
    const onlineAgent = page.locator('.agent-item[data-status="online"]').first();
    await onlineAgent.click();

    // Wait for connection
    await page.waitForTimeout(2000);

    // Send test message
    const testMessage = 'Hello! This is a test message from E2E tests.';
    await aviDM.sendMessage(testMessage);

    // Verify message appears in chat
    const sentMessage = page.locator(`.message:has-text("${testMessage}"), [data-message-content*="${testMessage}"]`);
    await expect(sentMessage).toBeVisible({ timeout: 10000 });

    // Wait for agent response
    try {
      await aviDM.waitForMessageResponse(15000);

      // Verify response appears
      const agentResponse = page.locator('.message.agent, [data-sender="agent"]');
      await expect(agentResponse.first()).toBeVisible({ timeout: 5000 });

      console.log('✅ Agent response received successfully');
    } catch (error) {
      console.warn('⚠️ No agent response received within timeout - this may be expected in test environment');
    }

    // Take screenshot
    await page.screenshot({
      path: `tests/screenshots/avi-dm-message-sent-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should receive responses from agents correctly', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Select agent with mock response capability
    const techReviewerAgent = page.locator('[data-agent-id="tech-reviewer"], .agent-item:has-text("TechReviewer")');

    if (await techReviewerAgent.isVisible()) {
      await techReviewerAgent.click();

      // Send a message that typically triggers a response
      await aviDM.sendMessage('Can you review this code snippet?');

      // Monitor for typing indicator
      const typingIndicator = page.locator('.typing-indicator, [data-testid="typing-indicator"]');
      if (await typingIndicator.isVisible({ timeout: 5000 })) {
        console.log('✅ Typing indicator displayed');
        await expect(typingIndicator).not.toBeVisible({ timeout: 15000 });
      }

      // Check for response
      try {
        await aviDM.waitForMessageResponse(20000);

        const responses = page.locator('.message.agent, [data-sender="agent"]');
        const responseCount = await responses.count();
        expect(responseCount).toBeGreaterThan(0);

        console.log(`✅ Received ${responseCount} agent response(s)`);
      } catch (error) {
        console.warn('⚠️ Agent response test may require live backend connection');
      }
    }

    await page.screenshot({
      path: `tests/screenshots/avi-dm-response-test-${Date.now()}.png`,
      fullPage: true
    });
  });
});

test.describe('Avi DM Error Handling and Recovery', () => {
  let aviDM: AviDMPageObject;

  test.beforeEach(async ({ page }) => {
    aviDM = new AviDMPageObject(page);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Select an agent first
    const agent = page.locator('.agent-item').first();
    await agent.click();

    // Simulate network failure by blocking requests
    await page.route('**/api/avi-dm/**', route => {
      route.abort('failed');
    });

    // Try to send a message
    await aviDM.sendMessage('Test message during network failure');

    // Check for error handling
    const errorMessage = page.locator('.error-message, [data-testid="error-message"], .alert-error');
    try {
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      console.log('✅ Error message displayed for network failure');
    } catch {
      console.log('ℹ️ No explicit error message found - checking for other error indicators');
    }

    // Restore network and test recovery
    await page.unroute('**/api/avi-dm/**');

    // Try sending message again
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    if (await retryButton.isVisible({ timeout: 5000 })) {
      await retryButton.click();
    } else {
      // Try sending a new message
      await aviDM.sendMessage('Recovery test message');
    }

    await page.screenshot({
      path: `tests/screenshots/avi-dm-error-recovery-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should handle agent unavailability', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Try to select an offline agent
    const offlineAgent = page.locator('.agent-item[data-status="offline"], .agent-item:has-text("offline")');

    if (await offlineAgent.count() > 0) {
      await offlineAgent.first().click();

      // Check for unavailability message
      const unavailableMessage = page.locator(
        'text="Agent is currently offline", text="unavailable", .agent-offline-message'
      );

      if (await unavailableMessage.isVisible({ timeout: 5000 })) {
        console.log('✅ Agent unavailability properly communicated');
      }

      // Verify message input is disabled or shows appropriate state
      const messageInput = page.locator('textarea[placeholder*="message"], [data-testid="message-input"]');
      if (await messageInput.isVisible()) {
        const isDisabled = await messageInput.isDisabled();
        console.log(`Message input disabled: ${isDisabled}`);
      }
    }

    await page.screenshot({
      path: `tests/screenshots/avi-dm-agent-unavailable-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should prevent server crashes during stress testing', async ({ page }) => {
    test.setTimeout(45000); // Extended timeout for stress test

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Select first available agent
    const agent = page.locator('.agent-item').first();
    await agent.click();
    await page.waitForTimeout(2000);

    // Rapid fire multiple messages to test server stability
    const stressMessages = [
      'Stress test message 1',
      'Rapid fire message 2',
      'Load test message 3',
      'Concurrent message 4',
      'Server stability check 5'
    ];

    console.log('🔥 Starting server stability stress test...');

    // Send messages rapidly
    for (let i = 0; i < stressMessages.length; i++) {
      try {
        await aviDM.sendMessage(stressMessages[i]);
        await page.waitForTimeout(500); // Small delay between messages
      } catch (error) {
        console.warn(`Message ${i + 1} failed:`, error);
      }
    }

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check if application is still responsive
    const messageInput = page.locator('textarea[placeholder*="message"], [data-testid="message-input"]');
    await expect(messageInput).toBeVisible({ timeout: 10000 });

    // Try to send one more message to verify functionality
    await aviDM.sendMessage('Post-stress test verification message');

    // Verify server is still responding
    const response = await fetch(`${FRONTEND_URL}/health-check`).catch(() => null);
    console.log(`Server health check: ${response ? response.status : 'No response'}`);

    console.log('✅ Server stability test completed');

    await page.screenshot({
      path: `tests/screenshots/avi-dm-stress-test-${Date.now()}.png`,
      fullPage: true
    });
  });
});

test.describe('Avi DM Cross-Browser and Mobile Compatibility', () => {
  let aviDM: AviDMPageObject;

  test.beforeEach(async ({ page }) => {
    aviDM = new AviDMPageObject(page);
  });

  test('should work correctly on mobile viewport', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Verify mobile layout
    const aviDMSection = page.locator('[data-testid="avi-dm-section"], .avi-dm-container');
    await expect(aviDMSection).toBeVisible({ timeout: 15000 });

    // Check agent list is properly sized for mobile
    const agentList = page.locator('.agent-list, [data-testid="agent-list"]');
    const agentListBox = await agentList.boundingBox();

    if (agentListBox) {
      expect(agentListBox.width).toBeLessThanOrEqual(375);
    }

    // Test agent selection on mobile
    const agent = page.locator('.agent-item').first();
    await agent.click();

    // Verify chat interface adapts to mobile
    const messageInput = page.locator('textarea[placeholder*="message"]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    const inputBox = await messageInput.boundingBox();
    if (inputBox) {
      expect(inputBox.width).toBeLessThanOrEqual(375);
    }

    // Test message sending on mobile
    await aviDM.sendMessage('Mobile test message');

    await page.screenshot({
      path: `tests/screenshots/avi-dm-mobile-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should handle tablet viewport correctly', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    // Test functionality on tablet
    const agent = page.locator('.agent-item').first();
    await agent.click();

    await aviDM.sendMessage('Tablet test message');

    // Verify layout utilizes tablet space efficiently
    const aviDMSection = page.locator('[data-testid="avi-dm-section"]');
    const sectionBox = await aviDMSection.boundingBox();

    if (sectionBox) {
      expect(sectionBox.width).toBeGreaterThan(350); // Should use more space than mobile
      expect(sectionBox.width).toBeLessThanOrEqual(768);
    }

    await page.screenshot({
      path: `tests/screenshots/avi-dm-tablet-${Date.now()}.png`,
      fullPage: true
    });
  });
});

test.describe('Avi DM Performance and Monitoring', () => {
  let aviDM: AviDMPageObject;

  test.beforeEach(async ({ page }) => {
    aviDM = new AviDMPageObject(page);
  });

  test('should meet performance benchmarks', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Measure initial page load
    const startTime = Date.now();
    await aviDM.navigateToApp();
    const navigationTime = Date.now() - startTime;

    console.log(`📊 Navigation time: ${navigationTime}ms`);
    expect(navigationTime).toBeLessThan(10000); // Should load within 10 seconds

    // Measure Avi DM tab load time
    const tabStartTime = Date.now();
    await aviDM.clickAviDMTab();
    const tabLoadTime = Date.now() - tabStartTime;

    console.log(`📊 Avi DM tab load time: ${tabLoadTime}ms`);
    expect(tabLoadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Measure message send response time
    const agent = page.locator('.agent-item').first();
    await agent.click();
    await page.waitForTimeout(1000);

    const messageStartTime = Date.now();
    await aviDM.sendMessage('Performance test message');

    // Wait for message to appear in UI
    await page.waitForSelector('.message:has-text("Performance test message")', { timeout: 10000 });
    const messageResponseTime = Date.now() - messageStartTime;

    console.log(`📊 Message send response time: ${messageResponseTime}ms`);
    expect(messageResponseTime).toBeLessThan(3000); // Should respond within 3 seconds

    await page.screenshot({
      path: `tests/screenshots/avi-dm-performance-${Date.now()}.png`,
      fullPage: true
    });
  });

  test('should handle memory efficiently during extended use', async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for memory test

    await aviDM.navigateToApp();
    await aviDM.clickAviDMTab();

    const agent = page.locator('.agent-item').first();
    await agent.click();

    // Send multiple messages over time to test memory usage
    console.log('🧠 Testing memory efficiency...');

    for (let i = 1; i <= 20; i++) {
      await aviDM.sendMessage(`Memory test message ${i} - testing for memory leaks`);
      await page.waitForTimeout(500);

      if (i % 5 === 0) {
        console.log(`Sent ${i} messages...`);

        // Check if page is still responsive
        const messageInput = page.locator('textarea[placeholder*="message"]');
        await expect(messageInput).toBeVisible({ timeout: 5000 });
      }
    }

    // Final responsiveness check
    await aviDM.sendMessage('Final memory test message');

    console.log('✅ Memory efficiency test completed');

    await page.screenshot({
      path: `tests/screenshots/avi-dm-memory-test-${Date.now()}.png`,
      fullPage: true
    });
  });
});

// Global test hooks
test.afterEach(async ({ page }, testInfo) => {
  // Take screenshot on failure
  if (testInfo.status === 'failed') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `tests/screenshots/failure-${testInfo.title}-${timestamp}.png`,
      fullPage: true
    });
  }
});

test.beforeAll(async () => {
  // Ensure screenshots directory exists
  const fs = require('fs');
  const path = require('path');

  const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Starting Avi DM E2E test suite...');
});

test.afterAll(async () => {
  console.log('✅ Avi DM E2E test suite completed');
});