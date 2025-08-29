import { Page, Locator, expect } from '@playwright/test';

export interface ProcessMetrics {
  pid?: number;
  status: 'running' | 'stopped' | 'error';
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

export interface TerminalMetrics {
  lineCount: number;
  bufferSize: number;
  bufferOverflow: boolean;
  linesDropped: number;
  escapeSequenceCount: number;
}

export interface ButtonState {
  disabled: boolean;
  loading: boolean;
  clickCount: number;
  lastClickTime: number;
}

export class ClaudeTerminalPage {
  private page: Page;
  
  // Selectors
  private readonly spawnButtonSelector = '[data-testid="spawn-claude-button"]';
  private readonly terminalSelector = '[data-testid="terminal"]';
  private readonly terminalInputSelector = '[data-testid="terminal-input"]';
  private readonly processStatusSelector = '[data-testid="process-status"]';
  private readonly terminateButtonSelector = '[data-testid="terminate-button"]';
  private readonly loadingIndicatorSelector = '[data-testid="loading"]';

  // Locators
  readonly spawnButton: Locator;
  readonly terminal: Locator;
  readonly terminalInput: Locator;
  readonly processStatus: Locator;
  readonly terminateButton: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.spawnButton = page.locator(this.spawnButtonSelector);
    this.terminal = page.locator(this.terminalSelector);
    this.terminalInput = page.locator(this.terminalInputSelector);
    this.processStatus = page.locator(this.processStatusSelector);
    this.terminateButton = page.locator(this.terminateButtonSelector);
    this.loadingIndicator = page.locator(this.loadingIndicatorSelector);
  }

  // Navigation methods
  async navigate(url: string = 'http://localhost:3000'): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.spawnButton).toBeVisible();
  }

  // Button interaction methods
  async clickSpawnButton(options: { force?: boolean } = {}): Promise<void> {
    if (options.force) {
      await this.spawnButton.click({ force: true });
    } else {
      await this.spawnButton.click();
    }
  }

  async getSpawnButtonState(): Promise<ButtonState> {
    const disabled = await this.spawnButton.isDisabled();
    const loading = await this.loadingIndicator.isVisible();
    
    const clickCount = await this.page.evaluate(() => {
      const button = document.querySelector('[data-testid="spawn-claude-button"]');
      return button ? parseInt(button.getAttribute('data-click-count') || '0', 10) : 0;
    });

    const lastClickTime = await this.page.evaluate(() => {
      const button = document.querySelector('[data-testid="spawn-claude-button"]');
      return button ? parseInt(button.getAttribute('data-last-click') || '0', 10) : 0;
    });

    return {
      disabled,
      loading,
      clickCount,
      lastClickTime
    };
  }

  async getButtonInteractionMetrics(): Promise<{
    actualClicks: number;
    preventedClicks: number;
    debounceActivations: number;
  }> {
    return await this.page.evaluate(() => {
      const metrics = (window as any).__buttonMetrics || {
        actualClicks: 0,
        preventedClicks: 0,
        debounceActivations: 0
      };
      return metrics;
    });
  }

  async testButtonFunctionality(): Promise<boolean> {
    try {
      const initialState = await this.getSpawnButtonState();
      await this.clickSpawnButton();
      await this.page.waitForTimeout(1000);
      const newState = await this.getSpawnButtonState();
      
      return newState.clickCount > initialState.clickCount || newState.disabled !== initialState.disabled;
    } catch (error) {
      return false;
    }
  }

  // Process management methods
  async waitForProcessSpawn(timeout: number = 10000): Promise<void> {
    await expect(this.processStatus).toContainText('running', { timeout });
  }

  async waitForProcessTermination(timeout: number = 5000): Promise<void> {
    await expect(this.processStatus).toContainText('stopped', { timeout });
  }

  async waitForProcessStabilization(): Promise<void> {
    await this.page.waitForTimeout(2000); // Wait for process to stabilize
    await this.page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="process-status"]');
      return status && (status.textContent === 'running' || status.textContent === 'stopped');
    });
  }

  async getActiveProcessCount(): Promise<number> {
    return await this.page.evaluate(() => {
      const processes = (window as any).__activeProcesses || [];
      return processes.length;
    });
  }

  async terminateProcess(): Promise<void> {
    await this.terminateButton.click();
  }

  async cleanupAllProcesses(): Promise<void> {
    await this.page.evaluate(() => {
      if ((window as any).__cleanupProcesses) {
        (window as any).__cleanupProcesses();
      }
    });
  }

  async getProcessMetrics(): Promise<ProcessMetrics[]> {
    return await this.page.evaluate(() => {
      const processes = (window as any).__activeProcesses || [];
      return processes.map((proc: any) => ({
        pid: proc.pid,
        status: proc.status,
        memoryUsage: proc.memoryUsage || 0,
        cpuUsage: proc.cpuUsage || 0,
        uptime: proc.uptime || 0
      }));
    });
  }

  // Terminal interaction methods
  async waitForTerminalStabilization(): Promise<void> {
    await this.terminal.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(1000); // Wait for terminal to stabilize
    
    // Wait for terminal to stop rapidly updating
    await this.page.waitForFunction(() => {
      const terminal = document.querySelector('[data-testid="terminal"]');
      if (!terminal) return false;
      
      let lastContent = terminal.textContent;
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(terminal.textContent === lastContent);
        }, 500);
      });
    });
  }

  async getTerminalContent(): Promise<string> {
    await this.terminal.waitFor({ state: 'visible' });
    return await this.terminal.textContent() || '';
  }

  async sendTerminalCommand(command: string): Promise<void> {
    await this.terminalInput.fill(command);
    await this.terminalInput.press('Enter');
  }

  async sendTerminalInput(input: string): Promise<void> {
    await this.terminalInput.type(input);
  }

  async pressEnter(): Promise<void> {
    await this.terminalInput.press('Enter');
  }

  async waitForCommandCompletion(): Promise<void> {
    await this.page.waitForTimeout(1000); // Basic wait for command completion
    
    // Wait for terminal to show prompt again
    await this.page.waitForFunction(() => {
      const terminal = document.querySelector('[data-testid="terminal"]');
      const content = terminal?.textContent || '';
      return content.includes('$') || content.includes('>'); // Common prompt indicators
    });
  }

  async getTerminalCount(): Promise<number> {
    const terminals = await this.page.locator('[data-testid="terminal"]').count();
    return terminals;
  }

  async isTerminalVisible(): Promise<boolean> {
    return await this.terminal.isVisible();
  }

  async getTerminalElement(): Promise<Locator> {
    return this.terminal;
  }

  async clickTerminalArea(): Promise<void> {
    await this.terminal.click();
  }

  async testTerminalScrolling(): Promise<boolean> {
    try {
      await this.terminal.scroll({ scrollTop: 100 });
      await this.page.waitForTimeout(500);
      await this.terminal.scroll({ scrollTop: 0 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getTerminalMetrics(): Promise<TerminalMetrics> {
    return await this.page.evaluate(() => {
      const terminal = document.querySelector('[data-testid="terminal"]');
      const content = terminal?.textContent || '';
      
      return {
        lineCount: content.split('\n').length,
        bufferSize: content.length,
        bufferOverflow: (window as any).__terminalBufferOverflow || false,
        linesDropped: (window as any).__terminalLinesDropped || 0,
        escapeSequenceCount: (content.match(/\x1b\[[0-9;]*[A-Za-z]/g) || []).length
      };
    });
  }

  // System health and monitoring methods
  async checkUIFreezing(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.page.evaluate(() => {
        // Test if UI thread is responsive
        return new Promise(resolve => {
          let count = 0;
          const interval = setInterval(() => {
            count++;
            if (count >= 5) {
              clearInterval(interval);
              resolve(true);
            }
          }, 100);
        });
      });
      
      const responseTime = Date.now() - startTime;
      return responseTime > 2000; // Consider frozen if takes > 2 seconds
    } catch (error) {
      return true; // Assume frozen if evaluation fails
    }
  }

  async testUIResponsiveness(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.spawnButton.hover();
      const hoverTime = Date.now() - startTime;
      return hoverTime < 1000; // Should respond within 1 second
    } catch (error) {
      return false;
    }
  }

  async checkTerminalStability(): Promise<boolean> {
    try {
      const initialContent = await this.getTerminalContent();
      await this.page.waitForTimeout(1000);
      const finalContent = await this.getTerminalContent();
      
      // Terminal is stable if content doesn't change unexpectedly
      return initialContent.length <= finalContent.length; // Content should only grow or stay same
    } catch (error) {
      return false;
    }
  }

  async testTerminalBasicFunctionality(): Promise<boolean> {
    try {
      await this.sendTerminalCommand('echo "test"');
      await this.waitForCommandCompletion();
      
      const content = await this.getTerminalContent();
      return content.includes('test');
    } catch (error) {
      return false;
    }
  }

  async testTerminalResponsiveness(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      await this.clickTerminalArea();
      const clickResponseTime = Date.now() - startTime;
      return clickResponseTime < 1000; // Should respond within 1 second
    } catch (error) {
      return false;
    }
  }

  async checkErrorRecovery(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return (window as any).__errorRecovered || false;
    });
  }

  async checkTerminalConnection(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const connection = (window as any).__terminalConnection;
      return connection && connection.readyState === 1; // WebSocket OPEN state
    });
  }

  async checkTerminalContentIntegrity(): Promise<boolean> {
    const content = await this.getTerminalContent();
    
    // Check for common corruption patterns
    const corruptionPatterns = [
      /\x00/g, // Null bytes
      /\uFFFD/g, // Replacement characters
      /[\x01-\x08\x0E-\x1F]/g // Control characters (except tab, line feed, carriage return)
    ];
    
    for (const pattern of corruptionPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }
    
    return true;
  }

  async verifyTerminalContentIntegrity(): Promise<boolean> {
    return await this.checkTerminalContentIntegrity();
  }

  async checkSystemStability(): Promise<boolean> {
    return await this.page.evaluate(() => {
      // Check various system health indicators
      const health = {
        memoryLeaks: (window as any).__memoryLeaks || 0,
        uncaughtErrors: (window as any).__uncaughtErrors || 0,
        connectionLeaks: (window as any).__connectionLeaks || 0,
        systemOverload: (window as any).__systemOverload || false
      };
      
      return health.memoryLeaks === 0 && 
             health.uncaughtErrors === 0 && 
             health.connectionLeaks === 0 && 
             !health.systemOverload;
    });
  }

  async checkSystemRecovery(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return (window as any).__systemRecovered !== false; // Default to true if not set
    });
  }

  async checkUIFunctionality(): Promise<boolean> {
    try {
      // Test basic UI interactions
      await this.spawnButton.hover();
      await this.page.mouse.move(100, 100);
      await this.page.keyboard.press('Tab');
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkTerminalAccessibility(): Promise<boolean> {
    try {
      const terminalAccessible = await this.terminal.isVisible();
      if (!terminalAccessible) return false;
      
      // Test if terminal can receive focus
      await this.terminal.click();
      const focused = await this.page.evaluate(() => {
        const terminal = document.querySelector('[data-testid="terminal"]');
        return document.activeElement === terminal || terminal?.contains(document.activeElement);
      });
      
      return focused;
    } catch (error) {
      return false;
    }
  }

  // Getter for page (used by external utilities)
  get page(): Page {
    return this.page;
  }
}

export default ClaudeTerminalPage;