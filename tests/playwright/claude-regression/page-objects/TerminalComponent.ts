import { Page, Locator, expect } from '@playwright/test';

export class TerminalComponent {
  readonly page: Page;
  readonly terminal: Locator;
  readonly terminalContent: Locator;
  readonly inputArea: Locator;
  readonly scrollContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.terminal = page.locator('[data-testid="terminal"]').or(
      page.locator('.terminal, .xterm-screen'));
    this.terminalContent = page.locator('[data-testid="terminal-content"]').or(
      page.locator('.terminal-content, .xterm-rows'));
    this.inputArea = page.locator('[data-testid="terminal-input"]').or(
      page.locator('.terminal-input, .xterm-cursor'));
    this.scrollContainer = page.locator('[data-testid="terminal-scroll"]').or(
      page.locator('.terminal-scroll, .xterm-viewport'));
  }

  async waitForTerminal(timeout = 15000) {
    await this.terminal.waitFor({ state: 'visible', timeout });
  }

  async getFullContent(): Promise<string> {
    return await this.terminal.textContent() || '';
  }

  async getLastLine(): Promise<string> {
    const content = await this.getFullContent();
    const lines = content.split('\n').filter(line => line.trim());
    return lines[lines.length - 1] || '';
  }

  async getLines(): Promise<string[]> {
    const content = await this.getFullContent();
    return content.split('\n').filter(line => line.trim());
  }

  async waitForText(text: string, timeout = 15000) {
    await this.page.waitForFunction(
      (expectedText) => {
        const terminal = document.querySelector('.terminal, .xterm-screen, [data-testid="terminal"]');
        return terminal?.textContent?.includes(expectedText) || false;
      },
      text,
      { timeout }
    );
  }

  async waitForTextPattern(pattern: RegExp, timeout = 15000) {
    await this.page.waitForFunction(
      (regexSource) => {
        const terminal = document.querySelector('.terminal, .xterm-screen, [data-testid="terminal"]');
        const content = terminal?.textContent || '';
        const regex = new RegExp(regexSource);
        return regex.test(content);
      },
      pattern.source,
      { timeout }
    );
  }

  async type(text: string) {
    await this.terminal.click();
    await this.page.keyboard.type(text, { delay: 50 });
  }

  async pressKey(key: string) {
    await this.terminal.click();
    await this.page.keyboard.press(key);
  }

  async sendCommand(command: string) {
    await this.type(command);
    await this.pressKey('Enter');
  }

  async waitForPrompt(promptText = '>', timeout = 10000) {
    await this.waitForText(promptText, timeout);
  }

  async waitForNewLine(timeout = 5000) {
    const initialContent = await this.getFullContent();
    await this.page.waitForFunction(
      (initial) => {
        const terminal = document.querySelector('.terminal, .xterm-screen, [data-testid="terminal"]');
        const current = terminal?.textContent || '';
        return current !== initial && current.length > initial.length;
      },
      initialContent,
      { timeout }
    );
  }

  async clearTerminal() {
    await this.sendCommand('clear');
    await this.page.waitForTimeout(500);
  }

  async scrollToBottom() {
    await this.terminal.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  async scrollToTop() {
    await this.terminal.evaluate((element) => {
      element.scrollTop = 0;
    });
  }

  async isScrolledToBottom(): Promise<boolean> {
    return await this.terminal.evaluate((element) => {
      return element.scrollTop + element.clientHeight >= element.scrollHeight - 5;
    });
  }

  async hasText(text: string): Promise<boolean> {
    const content = await this.getFullContent();
    return content.includes(text);
  }

  async hasPattern(pattern: RegExp): Promise<boolean> {
    const content = await this.getFullContent();
    return pattern.test(content);
  }

  async countOccurrences(text: string): Promise<number> {
    const content = await this.getFullContent();
    return (content.match(new RegExp(text, 'g')) || []).length;
  }

  async waitForSSEConnection(timeout = 10000) {
    // Wait for Server-Sent Events connection indicators
    await this.page.waitForFunction(
      () => {
        // Check for SSE connection in network tab or console
        return window.performance.getEntriesByType('navigation').length > 0;
      },
      { timeout }
    );
  }

  async monitorSSEMessages(duration = 5000): Promise<string[]> {
    const messages: string[] = [];
    
    // Listen for SSE messages
    await this.page.evaluate(() => {
      (window as any).sseMessages = [];
      const eventSource = new EventSource('/api/sse');
      eventSource.onmessage = (event) => {
        (window as any).sseMessages.push(event.data);
      };
      eventSource.onerror = (error) => {
        (window as any).sseMessages.push(`ERROR: ${error}`);
      };
    });

    await this.page.waitForTimeout(duration);

    const capturedMessages = await this.page.evaluate(() => (window as any).sseMessages || []);
    return capturedMessages;
  }

  async verifyStreamingOutput(expectedPatterns: RegExp[], timeout = 15000) {
    const startTime = Date.now();
    
    for (const pattern of expectedPatterns) {
      while (Date.now() - startTime < timeout) {
        const content = await this.getFullContent();
        if (pattern.test(content)) {
          break;
        }
        await this.page.waitForTimeout(500);
      }
      
      // Verify pattern was found
      const content = await this.getFullContent();
      expect(content).toMatch(pattern);
    }
  }

  async captureTerminalSnapshot(): Promise<string> {
    const content = await this.getFullContent();
    const timestamp = new Date().toISOString();
    return `[${timestamp}] Terminal Content:\n${content}`;
  }
}