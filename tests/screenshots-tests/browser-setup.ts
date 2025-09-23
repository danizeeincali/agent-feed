import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';

export interface BrowserSetup {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  browserName: string;
}

export class BrowserManager {
  private browsers: Map<string, Browser> = new Map();

  async setupBrowser(browserType: 'chromium' | 'firefox' | 'webkit', options: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    deviceScaleFactor?: number;
    userAgent?: string;
  } = {}): Promise<BrowserSetup> {
    let browser: Browser;

    if (!this.browsers.has(browserType)) {
      switch (browserType) {
        case 'chromium':
          browser = await chromium.launch({
            headless: options.headless ?? true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
          });
          break;
        case 'firefox':
          browser = await firefox.launch({
            headless: options.headless ?? true
          });
          break;
        case 'webkit':
          browser = await webkit.launch({
            headless: options.headless ?? true
          });
          break;
        default:
          throw new Error(`Unsupported browser type: ${browserType}`);
      }
      this.browsers.set(browserType, browser);
    } else {
      browser = this.browsers.get(browserType)!;
    }

    const context = await browser.newContext({
      viewport: options.viewport || { width: 1920, height: 1080 },
      deviceScaleFactor: options.deviceScaleFactor || 1,
      userAgent: options.userAgent,
      // Enable console error capture
      recordVideo: {
        dir: '/workspaces/agent-feed/tests/screenshots/videos/',
        size: options.viewport || { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error on ${page.url()}: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error(`Page error on ${page.url()}: ${error.message}`);
    });

    return {
      browser,
      context,
      page,
      browserName: browserType
    };
  }

  async closeAll() {
    for (const [name, browser] of this.browsers.entries()) {
      await browser.close();
      console.log(`Closed ${name} browser`);
    }
    this.browsers.clear();
  }
}

export const VIEWPORT_PRESETS = {
  'mobile-portrait': { width: 375, height: 667 },
  'mobile-landscape': { width: 667, height: 375 },
  'tablet-portrait': { width: 768, height: 1024 },
  'tablet-landscape': { width: 1024, height: 768 },
  'desktop-small': { width: 1366, height: 768 },
  'desktop-large': { width: 1920, height: 1080 },
  'desktop-ultrawide': { width: 2560, height: 1440 }
};