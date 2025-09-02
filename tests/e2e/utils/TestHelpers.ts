import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async waitForElement(page: Page, selector: string, timeout = 10000) {
    return await page.waitForSelector(selector, { timeout });
  }

  static async waitForText(page: Page, text: string, timeout = 10000) {
    return await page.waitForSelector(`text=${text}`, { timeout });
  }

  static async waitForNetworkIdle(page: Page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async captureFullPageScreenshot(page: Page, name: string) {
    await page.screenshot({ 
      path: `tests/e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  static async verifyNoJavaScriptErrors(page: Page) {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Return function to check errors later
    return () => {
      if (errors.length > 0) {
        console.warn('JavaScript errors detected:', errors);
      }
      return errors;
    };
  }

  static async measureLoadTime(page: Page, url: string) {
    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle' });
    const end = Date.now();
    return end - start;
  }

  static async simulateSlowNetwork(page: Page) {
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      route.continue();
    });
  }

  static async restoreNetwork(page: Page) {
    await page.unroute('**/*');
  }

  static async getProcessId(): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:3000/api/instances');
      const instances = await response.json();
      return instances.length > 0 ? instances[0].pid : null;
    } catch (error) {
      console.error('Failed to get process ID:', error);
      return null;
    }
  }

  static async waitForWebSocketConnection(page: Page, timeout = 10000) {
    return await page.waitForFunction(
      () => {
        // Check if WebSocket is connected
        return (window as any).websocketConnected === true;
      },
      { timeout }
    );
  }

  static async verifyToolCallStructure(page: Page, expectedCalls: string[]) {
    for (const call of expectedCalls) {
      await expect(page.locator(`[data-testid="tool-call"][data-tool="${call}"]`)).toBeVisible();
    }
  }

  static async mockBackendError(page: Page, errorCode = 500) {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: errorCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error simulation' })
      });
    });
  }

  static async restoreBackend(page: Page) {
    await page.unroute('**/api/**');
  }
}