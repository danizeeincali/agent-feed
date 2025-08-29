import { Page, Browser, BrowserContext } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

export interface TestContext {
  claudePage: ClaudeInstancePage;
  terminal: TerminalComponent;
  status: StatusIndicator;
  page: Page;
}

export interface PerformanceMetrics {
  instanceCreationTime: number;
  firstResponseTime: number;
  avgResponseTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

export interface TestConfig {
  timeout?: number;
  retries?: number;
  slowMo?: number;
  screenshots?: boolean;
  video?: boolean;
}

export class TestHelpers {
  static async createTestContext(page: Page): Promise<TestContext> {
    const claudePage = new ClaudeInstancePage(page);
    const terminal = new TerminalComponent(page);
    const status = new StatusIndicator(page);

    await claudePage.goto();
    await page.waitForLoadState('networkidle');

    return {
      claudePage,
      terminal,
      status,
      page
    };
  }

  static async setupClaudeInstance(context: TestContext, buttonType: 'working' | 'prod' | 'source' | 'tests'): Promise<void> {
    const { claudePage } = context;

    switch (buttonType) {
      case 'working':
        await claudePage.clickClaudeWorkingButton();
        break;
      case 'prod':
        await claudePage.clickClaudeProdButton();
        break;
      case 'source':
        await claudePage.clickClaudeSourceButton();
        break;
      case 'tests':
        await claudePage.clickClaudeTestsButton();
        break;
    }

    await claudePage.waitForClaudeInstance();
  }

  static async measureInstanceCreationPerformance(context: TestContext, buttonType: 'working' | 'prod' | 'source' | 'tests'): Promise<number> {
    const startTime = Date.now();
    await this.setupClaudeInstance(context, buttonType);
    return Date.now() - startTime;
  }

  static async measureResponseTime(context: TestContext, command: string): Promise<number> {
    const { terminal } = context;
    
    const startTime = Date.now();
    await terminal.sendCommand(command);
    await terminal.waitForNewLine();
    return Date.now() - startTime;
  }

  static async collectPerformanceMetrics(context: TestContext, commands: string[]): Promise<PerformanceMetrics> {
    const { page, terminal } = context;
    
    // Measure instance creation
    const instanceStartTime = Date.now();
    await this.setupClaudeInstance(context, 'working');
    const instanceCreationTime = Date.now() - instanceStartTime;

    // Measure response times
    const responseTimes: number[] = [];
    
    for (const command of commands) {
      const responseTime = await this.measureResponseTime(context, command);
      responseTimes.push(responseTime);
    }

    const firstResponseTime = responseTimes[0] || 0;
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Collect browser metrics
    const browserMetrics = await page.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      navigation: performance.getEntriesByType('navigation').length,
      resource: performance.getEntriesByType('resource').length
    }));

    return {
      instanceCreationTime,
      firstResponseTime,
      avgResponseTime,
      memoryUsage: browserMetrics.memory,
      networkRequests: browserMetrics.resource
    };
  }

  static async takeDebugScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `screenshots/debug-${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  static async capturePageState(context: TestContext): Promise<{
    url: string;
    title: string;
    terminalContent: string;
    statusText: string;
    timestamp: string;
  }> {
    const { page, terminal, status } = context;

    return {
      url: page.url(),
      title: await page.title(),
      terminalContent: await terminal.getFullContent(),
      statusText: await status.getCurrentStatus(),
      timestamp: new Date().toISOString()
    };
  }

  static async validateClaudeInstance(context: TestContext, expectedDirectory?: string): Promise<boolean> {
    const { claudePage, terminal } = context;

    try {
      // Check welcome message
      const hasWelcome = await claudePage.hasWelcomeMessage();
      if (!hasWelcome) return false;

      // Check working directory if specified
      if (expectedDirectory) {
        const hasCorrectDir = await claudePage.hasWorkingDirectory(expectedDirectory);
        if (!hasCorrectDir) return false;
      }

      // Check interactive prompt
      const hasPrompt = await claudePage.hasInteractivePrompt();
      if (!hasPrompt) return false;

      // Check for errors
      const hasErrors = await claudePage.hasErrorMessage();
      if (hasErrors) return false;

      return true;
    } catch (error) {
      console.error('Claude instance validation failed:', error);
      return false;
    }
  }

  static async waitForStableTerminal(context: TestContext, timeout = 10000): Promise<void> {
    const { terminal } = context;
    
    let previousContent = '';
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentContent = await terminal.getFullContent();
      
      if (currentContent === previousContent) {
        // Content hasn't changed, wait a bit more to confirm stability
        await context.page.waitForTimeout(1000);
        const finalContent = await terminal.getFullContent();
        
        if (finalContent === currentContent) {
          return; // Terminal is stable
        }
      }

      previousContent = currentContent;
      await context.page.waitForTimeout(500);
    }

    throw new Error(`Terminal did not stabilize within ${timeout}ms`);
  }

  static async simulateNetworkConditions(page: Page, conditions: {
    offline?: boolean;
    downloadThroughput?: number;
    uploadThroughput?: number;
    latency?: number;
  }): Promise<void> {
    if (conditions.offline) {
      await page.context().setOffline(true);
    } else {
      await page.context().setOffline(false);
    }

    // Note: Network throttling would require CDP or special browser setup
    // This is a placeholder for more advanced network simulation
  }

  static async cleanupTestArtifacts(context: TestContext): Promise<void> {
    const { page } = context;
    
    try {
      // Clear any ongoing SSE connections
      await page.evaluate(() => {
        if ((window as any).eventSources) {
          (window as any).eventSources.forEach((es: EventSource) => es.close());
        }
      });

      // Clear local storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to about:blank to ensure cleanup
      await page.goto('about:blank');
      
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  static generateTestData(): {
    simpleQueries: string[];
    complexQueries: string[];
    stressTestQueries: string[];
    errorTriggers: string[];
  } {
    return {
      simpleQueries: [
        'Hello',
        'Hi Claude',
        'What is 2+2?',
        'Thank you',
        'Help'
      ],
      complexQueries: [
        'Analyze the structure of this project and suggest improvements',
        'Explain the benefits of test-driven development with examples',
        'Generate a comprehensive guide to JavaScript best practices',
        'Create a detailed technical specification for a REST API',
        'Write and explain a complex algorithm implementation'
      ],
      stressTestQueries: [
        'Generate a very long detailed explanation: ' + 'x'.repeat(1000),
        'Process this large amount of data: ' + Array(100).fill('data').join(' '),
        'Create extensive documentation with many examples and code snippets',
        'Analyze and explain multiple complex programming concepts in detail'
      ],
      errorTriggers: [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'undefined_function_call()',
        '\x00\x01\x02',
        '${process.exit(1)}'
      ]
    };
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('This should never be reached');
  }

  static async setupTestReporting(context: TestContext, testName: string): Promise<void> {
    const { page } = context;
    
    // Setup console logging
    page.on('console', msg => {
      console.log(`[${testName}] Browser Console:`, msg.text());
    });

    // Setup error logging
    page.on('pageerror', error => {
      console.error(`[${testName}] Page Error:`, error);
    });

    // Setup request/response logging for debugging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`[${testName}] API Request:`, request.method(), request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        console.log(`[${testName}] API Error Response:`, response.status(), response.url());
      }
    });
  }
}