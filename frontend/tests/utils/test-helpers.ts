import { Page, expect } from '@playwright/test';

export class WebSocketTestHelper {
  constructor(private page: Page) {}

  async waitForWebSocketConnection(timeout = 15000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isConnected = await this.page.evaluate(() => {
        // Check for connection status indicators
        const statusElements = document.querySelectorAll('[data-testid="connection-status"], .connection-status');
        for (const element of statusElements) {
          if (element.textContent?.includes('Connected')) {
            return true;
          }
        }
        
        // Check for active WebSocket instances
        if ((window as any).webSocketInstances) {
          const activeConnections = (window as any).webSocketInstances.filter(
            (ws: WebSocket) => ws.readyState === WebSocket.OPEN
          );
          return activeConnections.length > 0;
        }
        
        return false;
      });
      
      if (isConnected) {
        return true;
      }
      
      await this.page.waitForTimeout(500);
    }
    
    return false;
  }

  async checkConnectionStatus(): Promise<'connected' | 'disconnected' | 'unknown'> {
    return await this.page.evaluate(() => {
      const statusElements = document.querySelectorAll('[data-testid="connection-status"], .connection-status');
      for (const element of statusElements) {
        const text = element.textContent || '';
        if (text.includes('Connected')) {
          return 'connected';
        } else if (text.includes('Disconnected')) {
          return 'disconnected';
        }
      }
      return 'unknown';
    });
  }

  async getWebSocketMetrics() {
    return await this.page.evaluate(() => {
      return {
        connectionCount: (window as any).webSocketInstances?.length || 0,
        activeConnections: (window as any).webSocketInstances?.filter(
          (ws: WebSocket) => ws.readyState === WebSocket.OPEN
        ).length || 0,
        performanceMetrics: (window as any).performanceMetrics || null
      };
    });
  }

  async simulateNetworkInterruption(): Promise<void> {
    await this.page.evaluate(() => {
      if ((window as any).webSocketInstances) {
        (window as any).webSocketInstances.forEach((ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(4000, 'Simulated network failure');
          }
        });
      }
    });
  }

  async takeScreenshotOnFailure(testName: string): Promise<void> {
    await this.page.screenshot({ 
      path: `tests/screenshots/${testName}-failure-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async logPageState(): Promise<void> {
    const state = await this.page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        connectionStatus: document.querySelector('[data-testid="connection-status"]')?.textContent,
        webSocketCount: (window as any).webSocketInstances?.length || 0,
        consoleErrors: (window as any).consoleErrors || [],
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('Page State:', JSON.stringify(state, null, 2));
  }
}

export class TerminalTestHelper {
  constructor(private page: Page) {}

  async findTerminalTrigger() {
    const selectors = [
      '[data-testid="terminal-launcher"]',
      'button:has-text("Terminal")',
      '.terminal-launcher',
      '[role="button"]:has-text("Launch Terminal")',
      'text="Terminal"'
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          return element;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  async waitForTerminalReady(timeout = 15000): Promise<boolean> {
    const selectors = [
      '.xterm-cursor',
      '.terminal-ready',
      '[data-testid="terminal-ready"]',
      '.xterm-viewport',
      '.xterm-screen'
    ];

    for (const selector of selectors) {
      try {
        await expect(this.page.locator(selector)).toBeVisible({ timeout });
        return true;
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  async checkForStuckStates(): Promise<string[]> {
    const stuckStates = [];
    
    const stuckSelectors = [
      { selector: 'text="Launching"', state: 'launching' },
      { selector: 'text="connecting to terminal"', state: 'connecting' },
      { selector: 'text="Connecting..."', state: 'connecting' },
      { selector: '.loading-spinner:visible', state: 'loading' }
    ];

    for (const { selector, state } of stuckSelectors) {
      try {
        if (await this.page.locator(selector).isVisible({ timeout: 1000 })) {
          stuckStates.push(state);
        }
      } catch (e) {
        // Not stuck in this state
      }
    }

    return stuckStates;
  }

  async interactWithTerminal(): Promise<boolean> {
    try {
      // Try to type in terminal
      await this.page.keyboard.type('echo "test"');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1000);
      
      return true;
    } catch (e) {
      console.log('Terminal interaction failed:', e);
      return false;
    }
  }
}

export class DeviceTestHelper {
  static async emulateSlowNetwork(page: Page): Promise<void> {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.enable');
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50000, // 50KB/s
      uploadThroughput: 20000,   // 20KB/s
      latency: 500               // 500ms latency
    });
  }

  static async restoreNetwork(page: Page): Promise<void> {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  static async simulateTabSwitch(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Simulate background tab behavior
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    });
  }

  static async simulateTabFocus(page: Page): Promise<void> {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
  }
}

export class ValidationHelper {
  static async assertConnectionStatus(page: Page, expectedStatus: 'connected' | 'disconnected'): Promise<void> {
    const helper = new WebSocketTestHelper(page);
    const status = await helper.checkConnectionStatus();
    
    if (status === 'unknown') {
      throw new Error('Connection status could not be determined');
    }
    
    expect(status).toBe(expectedStatus);
  }

  static async assertNoStuckStates(page: Page, stateType: 'terminal' | 'connection' = 'terminal'): Promise<void> {
    if (stateType === 'terminal') {
      const helper = new TerminalTestHelper(page);
      const stuckStates = await helper.checkForStuckStates();
      
      if (stuckStates.length > 0) {
        throw new Error(`Terminal is stuck in states: ${stuckStates.join(', ')}`);
      }
    }
  }

  static async assertPerformanceMetrics(page: Page, maxConnectionTime = 5000): Promise<void> {
    const helper = new WebSocketTestHelper(page);
    const metrics = await helper.getWebSocketMetrics();
    
    if (metrics.performanceMetrics?.connectionTimes?.length > 0) {
      const maxTime = Math.max(...metrics.performanceMetrics.connectionTimes);
      expect(maxTime).toBeLessThan(maxConnectionTime);
    }
  }
}