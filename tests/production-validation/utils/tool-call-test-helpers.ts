/**
 * Tool Call Testing Utilities
 * 
 * Shared utilities for testing tool call visualization and WebSocket stability
 */

import { Page, expect } from '@playwright/test';

export interface ToolCallTestConfig {
  timeout: number;
  retries: number;
  command: string;
  expectedPatterns: RegExp[];
  skipPatterns: RegExp[];
}

export interface WebSocketMetrics {
  connectionsOpened: number;
  connectionsClosed: number;
  messagesReceived: number;
  messagesSent: number;
  errors: string[];
  latencyMeasurements: number[];
}

export class ToolCallTestHelper {
  private page: Page;
  private wsMetrics: WebSocketMetrics;
  
  constructor(page: Page) {
    this.page = page;
    this.wsMetrics = {
      connectionsOpened: 0,
      connectionsClosed: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: [],
      latencyMeasurements: []
    };
    
    this.setupWebSocketMonitoring();
  }
  
  private setupWebSocketMonitoring(): void {
    this.page.on('websocket', ws => {
      this.wsMetrics.connectionsOpened++;
      console.log(`[WebSocket] Connection opened (Total: ${this.wsMetrics.connectionsOpened})`);
      
      ws.on('framereceived', event => {
        this.wsMetrics.messagesReceived++;
        const message = event.payload.toString();
        
        // Track latency for ping/pong messages
        if (message.includes('pong')) {
          try {
            const data = JSON.parse(message);
            if (data.timestamp) {
              const latency = Date.now() - data.timestamp;
              this.wsMetrics.latencyMeasurements.push(latency);
            }
          } catch (e) {
            // Ignore JSON parse errors for latency calculation
          }
        }
      });
      
      ws.on('framesent', event => {
        this.wsMetrics.messagesSent++;
      });
      
      ws.on('close', () => {
        this.wsMetrics.connectionsClosed++;
        console.log(`[WebSocket] Connection closed (Total closed: ${this.wsMetrics.connectionsClosed})`);
      });
      
      ws.on('socketerror', error => {
        this.wsMetrics.errors.push(`WebSocket error: ${error}`);
        console.error('[WebSocket] Socket error:', error);
      });
    });
    
    // Monitor page errors
    this.page.on('pageerror', error => {
      this.wsMetrics.errors.push(`Page error: ${error.message}`);
    });
    
    this.page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WebSocket')) {
        this.wsMetrics.errors.push(`Console error: ${msg.text()}`);
      }
    });
  }
  
  async navigateToClaudeInstances(): Promise<void> {
    await this.page.goto('http://localhost:5173/claude-instances');
    await this.page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 60000 });
  }
  
  async createInstance(): Promise<void> {
    const createButton = this.page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
    await createButton.click();
    await this.page.waitForSelector('[data-testid="instance-item"]', { timeout: 60000 });
    
    // Verify instance was created successfully
    const instanceCount = await this.page.locator('[data-testid="instance-item"]').count();
    expect(instanceCount).toBeGreaterThan(0);
  }
  
  async openTerminal(): Promise<void> {
    await this.page.click('[data-testid="instance-item"]');
    
    const terminalSelectors = [
      '.xterm-screen',
      '[data-testid="terminal-output"]',
      '[data-testid="terminal-container"]'
    ];
    
    let terminalFound = false;
    for (const selector of terminalSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 30000 });
        terminalFound = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!terminalFound) {
      throw new Error('Terminal interface not found after opening instance');
    }
  }
  
  async executeToolCall(command: string, config: Partial<ToolCallTestConfig> = {}): Promise<string> {
    const defaultConfig: ToolCallTestConfig = {
      timeout: 60000,
      retries: 1,
      command,
      expectedPatterns: [/.+/], // At least some content
      skipPatterns: [/timeout/, /error/, /failed/i]
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    const initialMessageCount = this.wsMetrics.messagesReceived;
    
    // Clear terminal input field and type command
    const inputSelectors = ['.xterm-helper-textarea', '[data-testid="terminal-input"]'];
    let inputFound = false;
    
    for (const selector of inputSelectors) {
      try {
        const inputElement = this.page.locator(selector);
        if (await inputElement.count() > 0) {
          await inputElement.clear();
          await inputElement.type(command);
          inputFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!inputFound) {
      throw new Error('Terminal input field not found');
    }
    
    // Press Enter to execute
    await this.page.keyboard.press('Enter');
    
    // Wait for tool call response
    const terminalContent = await this.waitForToolCallResponse(finalConfig);
    
    // Verify WebSocket activity occurred
    const finalMessageCount = this.wsMetrics.messagesReceived;
    expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
    
    return terminalContent;
  }
  
  private async waitForToolCallResponse(config: ToolCallTestConfig): Promise<string> {
    const outputSelectors = ['.xterm-screen', '[data-testid="terminal-output"]'];
    
    await this.page.waitForFunction(
      ({ selectors, patterns, skipPatterns, minLength }) => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || '';
            if (text.length > minLength) {
              // Check skip patterns first
              const hasSkipPattern = skipPatterns.some(pattern => 
                new RegExp(pattern.source, pattern.flags).test(text)
              );
              if (hasSkipPattern) {
                return false; // Continue waiting if skip pattern found
              }
              
              // Check expected patterns
              const hasExpectedPattern = patterns.some(pattern => 
                new RegExp(pattern.source, pattern.flags).test(text)
              );
              if (hasExpectedPattern) {
                return true; // Found expected content
              }
            }
          }
        }
        return false;
      },
      {
        selectors: outputSelectors,
        patterns: config.expectedPatterns,
        skipPatterns: config.skipPatterns,
        minLength: 20
      },
      { timeout: config.timeout }
    );
    
    // Get final content
    for (const selector of outputSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.count() > 0) {
          const content = await element.textContent();
          if (content && content.length > 10) {
            return content;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('No terminal content found after tool call execution');
  }
  
  async validateToolCallVisualization(terminalContent: string): Promise<void> {
    // Basic validation
    expect(terminalContent).toBeTruthy();
    expect(terminalContent.length).toBeGreaterThan(20);
    
    // Should not contain error indicators
    expect(terminalContent).not.toMatch(/timeout/i);
    expect(terminalContent).not.toMatch(/connection error/i);
    expect(terminalContent).not.toMatch(/failed to connect/i);
    
    // Should contain some meaningful content
    const hasMeaningfulContent = (
      terminalContent.length > 50 ||
      /\w{3,}/.test(terminalContent) || // At least some words
      /\d/.test(terminalContent) ||     // Or some numbers
      /[a-zA-Z]{10,}/.test(terminalContent) // Or longer text
    );
    
    expect(hasMeaningfulContent).toBe(true);
  }
  
  async testMultipleCommands(commands: string[], options: { 
    sequential?: boolean;
    delayBetween?: number;
    expectAllSuccess?: boolean;
  } = {}): Promise<string[]> {
    const results: string[] = [];
    const { sequential = true, delayBetween = 1000, expectAllSuccess = false } = options;
    
    if (sequential) {
      for (const command of commands) {
        try {
          const result = await this.executeToolCall(command);
          results.push(result);
          await this.page.waitForTimeout(delayBetween);
        } catch (error) {
          if (expectAllSuccess) {
            throw error;
          }
          results.push(`Error: ${error}`);
        }
      }
    } else {
      // Rapid-fire execution
      for (const command of commands) {
        await this.page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(100); // Minimal delay
      }
      
      // Wait for all responses
      await this.page.waitForFunction(
        (expectedCommands) => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > expectedCommands * 30; // Expect substantial output
        },
        commands.length,
        { timeout: 120000 }
      );
      
      const finalContent = await this.page.textContent('.xterm-screen, [data-testid="terminal-output"]');
      results.push(finalContent || '');
    }
    
    return results;
  }
  
  validateWebSocketStability(): void {
    // Connection stability checks
    expect(this.wsMetrics.connectionsOpened).toBeGreaterThan(0);
    expect(this.wsMetrics.connectionsClosed).toBeLessThanOrEqual(1); // At most one reconnection
    
    // Message flow checks
    expect(this.wsMetrics.messagesReceived).toBeGreaterThan(0);
    
    // Error checks
    const criticalErrors = this.wsMetrics.errors.filter(error => 
      error.includes('WebSocket') || error.includes('connection')
    );
    expect(criticalErrors.length).toBe(0);
    
    // Latency checks (if measurements available)
    if (this.wsMetrics.latencyMeasurements.length > 0) {
      const avgLatency = this.wsMetrics.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) 
        / this.wsMetrics.latencyMeasurements.length;
      expect(avgLatency).toBeLessThan(2000); // Under 2 seconds average
    }
  }
  
  getWebSocketMetrics(): WebSocketMetrics {
    return { ...this.wsMetrics };
  }
  
  async simulateNetworkDisruption(durationMs: number = 3000): Promise<void> {
    console.log(`Simulating network disruption for ${durationMs}ms...`);
    await this.page.context().setOffline(true);
    await this.page.waitForTimeout(durationMs);
    await this.page.context().setOffline(false);
    console.log('Network restored');
    
    // Wait for reconnection
    await this.page.waitForTimeout(5000);
  }
  
  async checkConnectionStatus(): Promise<{ connected: boolean; statusText?: string }> {
    const statusSelectors = [
      '[data-testid="connection-status"]',
      '.connection-indicator',
      '.status-badge',
      'text=Connected',
      'text=Online'
    ];
    
    for (const selector of statusSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          const statusText = await element.first().textContent();
          const isConnected = !/(disconnect|offline|error|fail)/i.test(statusText || '');
          return { connected: isConnected, statusText: statusText || undefined };
        }
      } catch (e) {
        continue;
      }
    }
    
    // No status indicator found - infer from WebSocket metrics
    return { 
      connected: this.wsMetrics.connectionsOpened > this.wsMetrics.connectionsClosed 
    };
  }
  
  async performanceTest(commands: string[], duration: number = 60000): Promise<{
    commandCount: number;
    successCount: number;
    averageResponseTime: number;
    wsStability: boolean;
  }> {
    const startTime = Date.now();
    let commandCount = 0;
    let successCount = 0;
    const responseTimes: number[] = [];
    
    while (Date.now() - startTime < duration) {
      const command = commands[commandCount % commands.length];
      const commandStartTime = Date.now();
      
      try {
        await this.executeToolCall(command, { timeout: 30000 });
        const responseTime = Date.now() - commandStartTime;
        responseTimes.push(responseTime);
        successCount++;
      } catch (error) {
        console.warn(`Performance test command failed: ${command}`, error);
      }
      
      commandCount++;
      
      // Brief pause between commands
      await this.page.waitForTimeout(2000);
    }
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    const wsStability = this.wsMetrics.connectionsClosed <= 1 && this.wsMetrics.errors.length === 0;
    
    return {
      commandCount,
      successCount,
      averageResponseTime,
      wsStability
    };
  }
}

export const COMMON_TOOL_CALL_COMMANDS = [
  'help',
  'pwd',
  'ls',
  'whoami',
  'echo "hello world"',
  'date'
];

export const TOOL_CALL_PATTERNS = [
  /tool.*call/i,
  /function.*call/i,
  /executing/i,
  /bash.*command/i,
  /claude.*code/i,
  /\[.*\]/, // Command brackets
  /Running:/i,
  /Output:/i
];

export const ERROR_PATTERNS = [
  /timeout/i,
  /connection.*error/i,
  /failed.*connect/i,
  /websocket.*error/i,
  /network.*error/i
];

// Utility functions
export async function waitForStableConnection(page: Page, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check if terminal is responsive
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'echo "test"');
      await page.keyboard.press('Enter');
      
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.includes('test') || terminalText.length > 50;
        },
        { timeout: 10000 }
      );
      
      // Connection is stable
      return;
    } catch (e) {
      // Wait and retry
      await page.waitForTimeout(2000);
    }
  }
  
  throw new Error('Connection did not stabilize within timeout');
}

export async function measureToolCallLatency(page: Page, command: string): Promise<number> {
  const startTime = Date.now();
  
  await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', command);
  await page.keyboard.press('Enter');
  
  await page.waitForFunction(
    () => {
      const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
      return terminalText.length > 20;
    },
    { timeout: 60000 }
  );
  
  return Date.now() - startTime;
}