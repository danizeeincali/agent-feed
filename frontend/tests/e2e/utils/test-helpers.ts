/**
 * Test Helpers and Utilities for Claude Instance Management E2E Tests
 * Production Readiness Validation Support
 */

import { Page, expect, Locator } from '@playwright/test';
import { ClaudeInstance, ClaudeInstanceType } from '../../../src/types/claude-instances';

// Test configuration constants
export const TEST_CONFIG = {
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000,
    EXTRA_LONG: 60000,
  },
  RETRY_ATTEMPTS: 3,
  POLLING_INTERVAL: 500,
  API_BASE_URL: 'http://localhost:3000',
  WS_BASE_URL: 'ws://localhost:3000',
  FRONTEND_URL: 'http://localhost:5173',
};

// Mock data generators
export class MockDataGenerator {
  static generateInstance(overrides: Partial<ClaudeInstance> = {}): ClaudeInstance {
    const defaultInstance: ClaudeInstance = {
      id: `test-instance-${Date.now()}`,
      type: this.generateInstanceType(),
      status: 'ready',
      connectionState: 'connected',
      createdAt: new Date(),
      processInfo: {
        pid: Math.floor(Math.random() * 65536),
        memoryUsage: Math.floor(Math.random() * 1024),
        cpuUsage: Math.random() * 100,
        uptime: Math.floor(Math.random() * 3600),
        lastHealthCheck: new Date()
      },
      ...overrides
    };
    return defaultInstance;
  }

  static generateInstanceType(overrides: Partial<ClaudeInstanceType> = {}): ClaudeInstanceType {
    const types = ['claude-default', 'claude-prod', 'claude-continue', 'claude-resume'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    return {
      id: randomType,
      name: `Claude ${randomType.split('-')[1] || 'Default'}`,
      command: `claude ${randomType === 'claude-prod' ? '--prod' : ''}`.trim(),
      description: `Test instance of type ${randomType}`,
      available: true,
      configured: true,
      enabled: true,
      models: [{
        id: 'claude-sonnet-4',
        name: 'Claude Sonnet 4',
        capabilities: ['text', 'image', 'code']
      }],
      ...overrides
    };
  }

  static generateChatMessage(type: 'user' | 'assistant' = 'assistant', content?: string) {
    return {
      id: `msg-${Date.now()}`,
      type,
      content: content || (type === 'user' ? 'Test user message' : 'Test assistant response'),
      timestamp: new Date(),
      metadata: type === 'assistant' ? {
        model: 'claude-sonnet-4',
        tokens: { input: 10, output: 20 },
        processingTime: Math.random() * 1000
      } : undefined
    };
  }
}

// Page interaction helpers
export class PageHelpers {
  constructor(private page: Page) {}

  // Wait for element with custom timeout and retry logic
  async waitForElementWithRetry(
    selector: string, 
    options: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' } = {}
  ): Promise<Locator> {
    const { timeout = TEST_CONFIG.TIMEOUTS.MEDIUM, state = 'visible' } = options;
    
    for (let attempt = 1; attempt <= TEST_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        await this.page.waitForSelector(selector, { timeout, state });
        return this.page.locator(selector);
      } catch (error) {
        if (attempt === TEST_CONFIG.RETRY_ATTEMPTS) {
          throw new Error(`Failed to find element '${selector}' after ${TEST_CONFIG.RETRY_ATTEMPTS} attempts: ${error}`);
        }
        await this.page.waitForTimeout(TEST_CONFIG.POLLING_INTERVAL);
      }
    }
    
    throw new Error(`Unreachable code in waitForElementWithRetry`);
  }

  // Wait for multiple elements to be present
  async waitForElements(selectors: string[], timeout = TEST_CONFIG.TIMEOUTS.MEDIUM): Promise<Locator[]> {
    const promises = selectors.map(selector => this.waitForElementWithRetry(selector, { timeout }));
    return Promise.all(promises);
  }

  // Check if element exists without throwing
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000, state: 'attached' });
      return true;
    } catch {
      return false;
    }
  }

  // Get element text with fallback
  async getTextContent(selector: string, fallback = ''): Promise<string> {
    try {
      const element = await this.waitForElementWithRetry(selector, { timeout: TEST_CONFIG.TIMEOUTS.SHORT });
      return await element.textContent() || fallback;
    } catch {
      return fallback;
    }
  }

  // Click with retry logic
  async clickWithRetry(selector: string, attempts = TEST_CONFIG.RETRY_ATTEMPTS): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const element = await this.waitForElementWithRetry(selector);
        await element.click();
        return;
      } catch (error) {
        if (attempt === attempts) {
          throw new Error(`Failed to click '${selector}' after ${attempts} attempts: ${error}`);
        }
        await this.page.waitForTimeout(TEST_CONFIG.POLLING_INTERVAL);
      }
    }
  }

  // Type with retry logic
  async typeWithRetry(selector: string, text: string, attempts = TEST_CONFIG.RETRY_ATTEMPTS): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const element = await this.waitForElementWithRetry(selector);
        await element.clear();
        await element.type(text);
        return;
      } catch (error) {
        if (attempt === attempts) {
          throw new Error(`Failed to type in '${selector}' after ${attempts} attempts: ${error}`);
        }
        await this.page.waitForTimeout(TEST_CONFIG.POLLING_INTERVAL);
      }
    }
  }

  // Wait for condition with polling
  async waitForCondition(
    condition: () => Promise<boolean>, 
    timeout = TEST_CONFIG.TIMEOUTS.MEDIUM
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return;
        }
      } catch {
        // Ignore errors in condition checking
      }
      
      await this.page.waitForTimeout(TEST_CONFIG.POLLING_INTERVAL);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

// API mocking utilities
export class APIMockingHelpers {
  constructor(private page: Page) {}

  async mockInstancesAPI(instances: ClaudeInstance[] = []) {
    await this.page.route('**/api/claude/instances', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instances
          })
        });
      }
    });
  }

  async mockInstanceCreation(response: { success: boolean; instanceId?: string; error?: string }) {
    await this.page.route('**/api/claude/instances', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: response.success ? 200 : 500,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
      }
    });
  }

  async mockChatAPI(responses: Array<{ success: boolean; response?: string; error?: string }>) {
    let responseIndex = 0;
    
    await this.page.route('**/api/claude/instances/*/chat', async (route) => {
      const response = responses[responseIndex % responses.length];
      responseIndex++;
      
      await route.fulfill({
        status: response.success ? 200 : 500,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockFileUpload(response: { success: boolean; fileId?: string; fileName?: string; url?: string; error?: string }) {
    await this.page.route('**/api/claude/instances/*/upload', async (route) => {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await route.fulfill({
        status: response.success ? 200 : 500,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockWebSocketEndpoints() {
    // Mock Socket.IO handshake
    await this.page.route('**/socket.io/**', async (route) => {
      if (route.request().url().includes('transport=polling')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: '97:0{"sid":"test-session-id","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}'
        });
      }
    });
  }
}

// WebSocket testing utilities
export class WebSocketTestHelpers {
  constructor(private page: Page) {}

  async setupWebSocketMocking() {
    await this.page.addInitScript(() => {
      // Store original WebSocket
      (window as any).OriginalWebSocket = window.WebSocket;
      
      // Mock WebSocket implementation
      class MockWebSocket extends EventTarget {
        public readyState = WebSocket.CONNECTING;
        public url: string;
        public protocol = '';
        public binaryType: BinaryType = 'blob';
        
        private mockId = Math.random().toString(36).substr(2, 9);
        
        constructor(url: string, protocols?: string | string[]) {
          super();
          this.url = url;
          
          // Store for testing
          (window as any).mockWebSockets = (window as any).mockWebSockets || [];
          (window as any).mockWebSockets.push(this);
          
          // Simulate async connection
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.dispatchEvent(new Event('open'));
          }, 100);
        }
        
        send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
          if (this.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open');
          }
          
          (window as any).sentWebSocketMessages = (window as any).sentWebSocketMessages || [];
          (window as any).sentWebSocketMessages.push(data);
        }
        
        close(code?: number, reason?: string) {
          this.readyState = WebSocket.CLOSED;
          this.dispatchEvent(new CloseEvent('close', { code, reason }));
        }
        
        // Test helper methods
        simulateMessage(data: any) {
          this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
        
        simulateError(error: string) {
          this.dispatchEvent(new ErrorEvent('error', { error: new Error(error), message: error }));
        }
      }
      
      // Replace WebSocket
      window.WebSocket = MockWebSocket as any;
    });
  }

  async sendWebSocketMessage(message: any) {
    await this.page.evaluate((msg) => {
      const sockets = (window as any).mockWebSockets || [];
      sockets.forEach((ws: any) => {
        if (ws.readyState === 1) { // OPEN
          ws.simulateMessage(msg);
        }
      });
    }, message);
  }

  async simulateWebSocketError(error: string) {
    await this.page.evaluate((err) => {
      const sockets = (window as any).mockWebSockets || [];
      sockets.forEach((ws: any) => ws.simulateError(err));
    }, error);
  }

  async getSentMessages(): Promise<string[]> {
    return await this.page.evaluate(() => (window as any).sentWebSocketMessages || []);
  }
}

// Performance monitoring utilities
export class PerformanceHelpers {
  constructor(private page: Page) {}

  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureActionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  async getMemoryUsage(): Promise<{ used: number; total: number } | null> {
    return await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize
        };
      }
      return null;
    });
  }

  async waitForNoNetworkActivity(timeout = 2000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async monitorNetworkRequests(): Promise<{ url: string; method: string; status: number }[]> {
    const requests: { url: string; method: string; status: number }[] = [];
    
    this.page.on('response', (response) => {
      requests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status()
      });
    });
    
    return requests;
  }
}

// File testing utilities
export class FileTestHelpers {
  static createTestImageBuffer(width = 1, height = 1): Buffer {
    // Create minimal PNG buffer
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk size
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, width, 0x00, 0x00, 0x00, height, // width, height
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk size
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    return png;
  }

  static createTestSVG(width = 100, height = 100, color = 'red'): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>`;
  }

  static generateLargeFile(sizeInBytes: number): Buffer {
    return Buffer.alloc(sizeInBytes, 0);
  }
}

// Accessibility testing helpers
export class AccessibilityHelpers {
  constructor(private page: Page) {}

  async checkKeyboardNavigation(elements: string[]): Promise<void> {
    for (const selector of elements) {
      const element = this.page.locator(selector);
      
      // Tab to element
      await this.page.keyboard.press('Tab');
      
      // Verify element is focused
      await expect(element).toBeFocused();
      
      // Verify element is accessible via keyboard
      await this.page.keyboard.press('Enter');
      
      // Add small delay for any animations
      await this.page.waitForTimeout(100);
    }
  }

  async checkAriaAttributes(selector: string, expectedAttributes: Record<string, string>): Promise<void> {
    const element = this.page.locator(selector);
    
    for (const [attribute, expectedValue] of Object.entries(expectedAttributes)) {
      const actualValue = await element.getAttribute(`aria-${attribute}`);
      expect(actualValue).toBe(expectedValue);
    }
  }

  async checkColorContrast(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    
    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });
    
    // Basic color contrast check (simplified)
    expect(styles.color).not.toBe(styles.backgroundColor);
  }
}

// Custom assertions
export class CustomAssertions {
  static async toHaveInstanceStatus(locator: Locator, expectedStatus: string) {
    const element = locator.getByTestId('instance-status');
    await expect(element).toContainText(expectedStatus);
  }

  static async toBeConnectedToWebSocket(page: Page) {
    const statusElement = page.getByTestId('websocket-status');
    await expect(statusElement).toContainText('Connected');
  }

  static async toHaveUploadedFiles(page: Page, expectedCount: number) {
    const fileElements = page.locator('[data-testid^="uploaded-file-"]');
    await expect(fileElements).toHaveCount(expectedCount);
  }

  static async toHandleErrorGracefully(page: Page, errorMessage: string) {
    const errorElement = page.getByTestId('error-message');
    await expect(errorElement).toContainText(errorMessage);
    
    // Should have dismiss option
    const dismissButton = page.getByTestId('dismiss-error');
    await expect(dismissButton).toBeVisible();
  }
}

// Export all utilities
export {
  PageHelpers,
  APIMockingHelpers,
  WebSocketTestHelpers,
  PerformanceHelpers,
  FileTestHelpers,
  AccessibilityHelpers,
  CustomAssertions,
};