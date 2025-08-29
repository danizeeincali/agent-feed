import { Page, Locator, expect } from '@playwright/test';

export type ClaudeStatus = 'idle' | 'starting' | 'running' | 'error' | 'stopped';

export class StatusIndicator {
  readonly page: Page;
  readonly statusContainer: Locator;
  readonly statusText: Locator;
  readonly statusIcon: Locator;
  readonly progressBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statusContainer = page.locator('[data-testid="status-container"]').or(
      page.locator('.status-container, .status-indicator'));
    this.statusText = page.locator('[data-testid="status-text"]').or(
      page.locator('.status-text, .status-message'));
    this.statusIcon = page.locator('[data-testid="status-icon"]').or(
      page.locator('.status-icon, .indicator-icon'));
    this.progressBar = page.locator('[data-testid="progress-bar"]').or(
      page.locator('.progress-bar, .loading-bar'));
  }

  async waitForStatus(status: ClaudeStatus, timeout = 30000) {
    await this.page.waitForFunction(
      (expectedStatus) => {
        const statusElement = document.querySelector('.status-text, .status-message, [data-testid="status-text"]');
        const content = statusElement?.textContent?.toLowerCase() || '';
        return content.includes(expectedStatus.toLowerCase());
      },
      status,
      { timeout }
    );
  }

  async waitForStatusChange(fromStatus: ClaudeStatus, toStatus: ClaudeStatus, timeout = 30000) {
    // First ensure we're in the from status
    await this.waitForStatus(fromStatus, 5000);
    
    // Then wait for transition to new status
    await this.waitForStatus(toStatus, timeout);
  }

  async getCurrentStatus(): Promise<string> {
    try {
      return await this.statusText.textContent() || 'unknown';
    } catch {
      // Fallback to searching in page content
      const pageContent = await this.page.textContent('body');
      
      // Look for status keywords in order of specificity
      const statusKeywords = ['error', 'stopped', 'running', 'starting', 'idle'];
      for (const keyword of statusKeywords) {
        if (pageContent?.toLowerCase().includes(keyword)) {
          return keyword;
        }
      }
      return 'unknown';
    }
  }

  async isStatus(expectedStatus: ClaudeStatus): Promise<boolean> {
    const currentStatus = await this.getCurrentStatus();
    return currentStatus.toLowerCase().includes(expectedStatus.toLowerCase());
  }

  async waitForStatusProgression(expectedSequence: ClaudeStatus[], timeout = 60000) {
    const startTime = Date.now();
    
    for (let i = 0; i < expectedSequence.length; i++) {
      const status = expectedSequence[i];
      const remainingTime = timeout - (Date.now() - startTime);
      
      if (remainingTime <= 0) {
        throw new Error(`Status progression timeout. Expected: ${expectedSequence.join(' → ')}`);
      }
      
      await this.waitForStatus(status, Math.min(remainingTime, 15000));
      
      // Small delay between status checks to allow for transitions
      if (i < expectedSequence.length - 1) {
        await this.page.waitForTimeout(1000);
      }
    }
  }

  async hasErrorStatus(): Promise<boolean> {
    return await this.isStatus('error');
  }

  async hasRunningStatus(): Promise<boolean> {
    return await this.isStatus('running');
  }

  async hasStartingStatus(): Promise<boolean> {
    return await this.isStatus('starting');
  }

  async getStatusIcon(): Promise<string | null> {
    try {
      const iconClass = await this.statusIcon.getAttribute('class');
      return iconClass;
    } catch {
      return null;
    }
  }

  async isProgressBarVisible(): Promise<boolean> {
    try {
      return await this.progressBar.isVisible();
    } catch {
      return false;
    }
  }

  async getProgressBarValue(): Promise<number> {
    try {
      const value = await this.progressBar.getAttribute('value');
      return value ? parseInt(value) : 0;
    } catch {
      return 0;
    }
  }

  async waitForProgressComplete(timeout = 30000) {
    await this.page.waitForFunction(
      () => {
        const progressBar = document.querySelector('.progress-bar, .loading-bar, [data-testid="progress-bar"]');
        if (!progressBar) return true; // No progress bar means complete
        
        const value = progressBar.getAttribute('value');
        const max = progressBar.getAttribute('max') || '100';
        
        return value === max || progressBar.getAttribute('aria-valuenow') === '100';
      },
      { timeout }
    );
  }

  async captureStatusSnapshot(): Promise<{
    status: string;
    icon: string | null;
    hasProgressBar: boolean;
    progressValue: number;
    timestamp: string;
  }> {
    return {
      status: await this.getCurrentStatus(),
      icon: await this.getStatusIcon(),
      hasProgressBar: await this.isProgressBarVisible(),
      progressValue: await this.getProgressBarValue(),
      timestamp: new Date().toISOString()
    };
  }

  async verifyStatusTransition(sequence: ClaudeStatus[]) {
    await expect(async () => {
      await this.waitForStatusProgression(sequence);
    }).toPass({ timeout: 60000 });
  }

  async verifyNoErrorStatus() {
    const hasError = await this.hasErrorStatus();
    expect(hasError).toBeFalsy();
  }

  async verifyRunningStatus() {
    const isRunning = await this.hasRunningStatus();
    expect(isRunning).toBeTruthy();
  }
}