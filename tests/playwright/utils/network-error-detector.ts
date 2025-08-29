/**
 * Network Error Detector
 * 
 * Advanced error detection system for identifying network-related issues
 * in the browser during E2E testing
 */

import { Page, Request, Response } from '@playwright/test';

export interface NetworkError {
  type: 'request_failed' | 'response_error' | 'console_error' | 'ui_error';
  message: string;
  url?: string;
  statusCode?: number;
  timestamp: Date;
  details?: any;
}

export class NetworkErrorDetector {
  private errors: NetworkError[] = [];
  private isMonitoring = false;

  constructor(private page: Page) {}

  /**
   * Start monitoring for network errors
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.errors = [];

    // Monitor failed requests
    this.page.on('requestfailed', (request: Request) => {
      this.addError({
        type: 'request_failed',
        message: `Request failed: ${request.failure()?.errorText || 'Unknown error'}`,
        url: request.url(),
        timestamp: new Date(),
        details: {
          method: request.method(),
          resourceType: request.resourceType()
        }
      });
    });

    // Monitor responses with error status codes
    this.page.on('response', (response: Response) => {
      if (response.status() >= 400) {
        this.addError({
          type: 'response_error',
          message: `HTTP Error: ${response.status()} ${response.statusText()}`,
          url: response.url(),
          statusCode: response.status(),
          timestamp: new Date(),
          details: {
            request: response.request().method()
          }
        });
      }
    });

    // Monitor console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        
        // Filter for network-related errors
        if (this.isNetworkRelatedError(text)) {
          this.addError({
            type: 'console_error',
            message: `Console error: ${text}`,
            timestamp: new Date(),
            details: {
              args: msg.args()
            }
          });
        }
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      if (this.isNetworkRelatedError(error.message)) {
        this.addError({
          type: 'console_error',
          message: `Page error: ${error.message}`,
          timestamp: new Date(),
          details: {
            stack: error.stack
          }
        });
      }
    });
  }

  /**
   * Stop monitoring for network errors
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.page.removeAllListeners('requestfailed');
    this.page.removeAllListeners('response');
    this.page.removeAllListeners('console');
    this.page.removeAllListeners('pageerror');
  }

  /**
   * Check for UI-based error messages
   */
  async checkUIErrorMessages(): Promise<void> {
    const errorSelectors = [
      // Generic error messages
      'text=Network error',
      'text=Connection failed',
      'text=Failed to fetch',
      'text=Request failed',
      'text=Error occurred',
      'text=Something went wrong',
      
      // HTTP error patterns
      'text=/HTTP \\d{3}/',
      'text=/Error \\d{3}/',
      
      // Component-specific errors
      '[data-testid*="error"]',
      '[class*="error"]',
      '[class*="alert-error"]',
      '.error-message',
      '.network-error',
      '.connection-error',
      
      // Bootstrap/common CSS framework errors
      '.alert-danger',
      '.alert-error',
      '.text-danger',
      '.text-error',
      
      // Custom application errors
      '[role="alert"]',
      '[aria-label*="error" i]',
      '[aria-describedby*="error" i]'
    ];

    for (const selector of errorSelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        
        for (const element of elements) {
          if (await element.isVisible()) {
            const text = await element.textContent() || '';
            const classList = await element.getAttribute('class') || '';
            
            this.addError({
              type: 'ui_error',
              message: `UI Error detected: ${text.trim()}`,
              timestamp: new Date(),
              details: {
                selector,
                classList,
                fullText: text
              }
            });
          }
        }
      } catch (error) {
        // Selector might not be valid, continue with others
        console.debug(`Selector failed: ${selector}`, error);
      }
    }
  }

  /**
   * Get all detected errors
   */
  getErrors(): NetworkError[] {
    return [...this.errors];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: NetworkError['type']): NetworkError[] {
    return this.errors.filter(error => error.type === type);
  }

  /**
   * Check if any network errors were detected
   */
  hasNetworkErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error summary
   */
  getErrorSummary(): string {
    if (this.errors.length === 0) {
      return 'No network errors detected';
    }

    const summary = {
      request_failed: 0,
      response_error: 0,
      console_error: 0,
      ui_error: 0
    };

    this.errors.forEach(error => {
      summary[error.type]++;
    });

    const parts = [];
    Object.entries(summary).forEach(([type, count]) => {
      if (count > 0) {
        parts.push(`${type}: ${count}`);
      }
    });

    return `Network errors detected - ${parts.join(', ')}`;
  }

  /**
   * Generate detailed error report
   */
  generateErrorReport(): string {
    if (this.errors.length === 0) {
      return '✅ No network errors detected during test execution';
    }

    let report = `❌ Network Error Report (${this.errors.length} errors):\n\n`;

    this.errors.forEach((error, index) => {
      report += `${index + 1}. [${error.type.toUpperCase()}] ${error.message}\n`;
      
      if (error.url) {
        report += `   URL: ${error.url}\n`;
      }
      
      if (error.statusCode) {
        report += `   Status: ${error.statusCode}\n`;
      }
      
      report += `   Time: ${error.timestamp.toISOString()}\n`;
      
      if (error.details) {
        report += `   Details: ${JSON.stringify(error.details, null, 2)}\n`;
      }
      
      report += '\n';
    });

    return report;
  }

  /**
   * Add an error to the collection
   */
  private addError(error: NetworkError): void {
    this.errors.push(error);
    console.warn('Network error detected:', error);
  }

  /**
   * Check if an error message is network-related
   */
  private isNetworkRelatedError(message: string): boolean {
    const networkKeywords = [
      'network',
      'connection',
      'fetch',
      'request',
      'response',
      'xhr',
      'ajax',
      'websocket',
      'sse',
      'cors',
      'timeout',
      'refused',
      'unreachable',
      'unavailable',
      'failed to load',
      'loading failed',
      'net::',
      'ERR_NETWORK',
      'ERR_INTERNET',
      'ERR_CONNECTION',
      'http error',
      'status code'
    ];

    const lowerMessage = message.toLowerCase();
    return networkKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Wait for network to be idle (no pending requests)
   */
  async waitForNetworkIdle(timeout = 5000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      this.addError({
        type: 'request_failed',
        message: 'Timeout waiting for network idle state',
        timestamp: new Date(),
        details: { timeout, error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Check for specific error patterns in the current page
   */
  async checkForSpecificErrors(): Promise<void> {
    // Check for common error patterns that might not be caught by other listeners
    const errorPatterns = [
      // Claude-specific errors
      { pattern: 'claude.*error', description: 'Claude service error' },
      { pattern: 'instance.*failed', description: 'Instance creation failure' },
      { pattern: 'terminal.*connection', description: 'Terminal connection issue' },
      
      // Generic application errors
      { pattern: 'authentication.*failed', description: 'Authentication failure' },
      { pattern: 'session.*expired', description: 'Session expiration' },
      { pattern: 'rate.*limit', description: 'Rate limiting error' }
    ];

    for (const { pattern, description } of errorPatterns) {
      try {
        const elements = await this.page.locator(`text=/${pattern}/i`).all();
        
        for (const element of elements) {
          if (await element.isVisible()) {
            const text = await element.textContent() || '';
            
            this.addError({
              type: 'ui_error',
              message: `${description}: ${text.trim()}`,
              timestamp: new Date(),
              details: { pattern, matchedText: text }
            });
          }
        }
      } catch (error) {
        // Pattern might not match anything, continue
        console.debug(`Pattern check failed: ${pattern}`, error);
      }
    }
  }
}