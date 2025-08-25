/**
 * Playwright E2E Tests for Button Click HTTP 500 Error Scenarios
 * Tests user button interactions and error handling in the UI
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from 'playwright';

// Test data and configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('E2E Button Click HTTP 500 Error Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true'
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Setup network interception for simulating server errors
    await page.route('**/api/claude/**', async (route) => {
      // Default to letting requests through
      await route.continue();
    });
    
    await page.goto(BASE_URL);
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Launch Button HTTP 500 Errors', () => {
    test('should handle 500 error on launch button click', async () => {
      // Mock the launch API to return 500 error
      await page.route('**/api/claude/launch', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Failed to launch Claude',
            error: 'Internal server error'
          })
        });
      });

      // Click the launch button
      await page.click('button[title="Launch Claude in prod directory"]');
      
      // Verify error handling
      await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.error-message')).toContainText('Failed to launch');
      
      // Verify button state returns to normal
      await expect(page.locator('button[title="Launch Claude in prod directory"]')).not.toBeDisabled();
    });

    test('should handle 500 error on skip-permissions launch', async () => {
      await page.route('**/api/claude/launch', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Permission denied: Cannot spawn process'
          })
        });
      });

      await page.click('button[title="Launch with permissions skipped"]');
      
      // Check error display
      await expect(page.locator('[data-testid="error-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-alert"]')).toContainText('Permission denied');
    });

    test('should handle timeout on launch request', async () => {
      // Mock a request that hangs
      await page.route('**/api/claude/launch', async (route) => {
        // Don't fulfill the request to simulate timeout
        await new Promise(resolve => setTimeout(resolve, 10000));
      });

      await page.click('button[title="Launch Claude in prod directory"]');
      
      // Verify loading state
      await expect(page.locator('button:has-text("🔄 Launching...")')).toBeVisible();
      
      // Wait for timeout handling
      await page.waitForTimeout(5000);
      
      // Verify error handling for timeout
      await expect(page.locator('.timeout-error')).toBeVisible();
    });

    test('should handle network errors on launch', async () => {
      // Mock network failure
      await page.route('**/api/claude/launch', async (route) => {
        await route.abort('failed');
      });

      await page.click('button[title="Launch Claude in prod directory"]');
      
      // Verify network error handling
      await expect(page.locator('.network-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.network-error')).toContainText('Network error');
    });

    test('should handle malformed response on launch', async () => {
      await page.route('**/api/claude/launch', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'text/html',
          body: '<html><body>Internal Server Error</body></html>'
        });
      });

      await page.click('button[title="Launch Claude in prod directory"]');
      
      await expect(page.locator('.parse-error')).toBeVisible();
    });
  });

  describe('Stop Button HTTP 500 Errors', () => {
    beforeEach(async () => {
      // Setup a running state first
      await page.route('**/api/claude/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: {
              isRunning: true,
              status: 'running',
              pid: 12345
            }
          })
        });
      });
      
      await page.reload();
      await page.waitForSelector('button:has-text("🛑 Stop Claude")');
    });

    test('should handle 500 error on stop button click', async () => {
      await page.route('**/api/claude/stop', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Error stopping Claude',
            error: 'Process not found'
          })
        });
      });

      await page.click('button:has-text("🛑 Stop Claude")');
      
      await expect(page.locator('.stop-error')).toBeVisible();
      await expect(page.locator('.stop-error')).toContainText('Error stopping');
    });

    test('should handle process kill failure', async () => {
      await page.route('**/api/claude/stop', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'ESRCH: No such process'
          })
        });
      });

      await page.click('button:has-text("🛑 Stop Claude")');
      
      await expect(page.locator('[data-testid="process-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="process-error"]')).toContainText('No such process');
    });
  });

  describe('Status Check HTTP 500 Errors', () => {
    test('should handle 500 error on status polling', async () => {
      let requestCount = 0;
      
      await page.route('**/api/claude/status', async (route) => {
        requestCount++;
        if (requestCount > 2) {
          // Return 500 after first few requests
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Status check failed'
            })
          });
        } else {
          await route.continue();
        }
      });

      await page.reload();
      
      // Wait for status polling to encounter error
      await page.waitForTimeout(6000);
      
      await expect(page.locator('.status-error')).toBeVisible();
    });

    test('should handle intermittent status failures', async () => {
      let failCount = 0;
      
      await page.route('**/api/claude/status', async (route) => {
        failCount++;
        if (failCount % 3 === 0) {
          // Fail every 3rd request
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Intermittent failure'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              status: { isRunning: false, status: 'stopped' }
            })
          });
        }
      });

      await page.reload();
      
      // Should handle intermittent failures gracefully
      await page.waitForTimeout(10000);
      await expect(page.locator('.status-section')).toBeVisible();
    });
  });

  describe('Claude Check HTTP 500 Errors', () => {
    test('should handle 500 error on Claude availability check', async () => {
      await page.route('**/api/claude/check', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Claude CLI detection failed',
            claudeAvailable: false
          })
        });
      });

      await page.reload();
      
      await expect(page.locator('[data-testid="claude-availability"]')).toContainText('⚠️ Check Required');
      await expect(page.locator('.warning')).toBeVisible();
      await expect(page.locator('.warning')).toContainText('Unable to verify Claude Code CLI');
    });

    test('should handle CLI detection timeout', async () => {
      await page.route('**/api/claude/check', async (route) => {
        // Simulate hanging request
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Timeout' })
        });
      });

      await page.reload();
      
      // Should timeout and show appropriate message
      await page.waitForTimeout(6000);
      await expect(page.locator('[data-testid="claude-availability"]')).toContainText('⚠️');
    });
  });

  describe('Terminal Integration Error Handling', () => {
    test('should handle WebSocket connection failures', async () => {
      // Setup running state
      await page.route('**/api/claude/status', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            status: { isRunning: true, status: 'running', pid: 12345 }
          })
        });
      });

      await page.reload();
      await page.click('button:has-text("🔼 Show Terminal")');
      
      // Mock WebSocket connection failure
      await page.evaluate(() => {
        // Override WebSocket to simulate connection failure
        (window as any).WebSocket = class {
          constructor() {
            setTimeout(() => {
              this.onerror?.({ type: 'error', message: 'Connection failed' });
            }, 100);
          }
          close() {}
          send() { throw new Error('WebSocket not connected'); }
        };
      });

      await expect(page.locator('.websocket-error')).toBeVisible({ timeout: 5000 });
    });

    test('should handle terminal spawn failures in UI', async () => {
      await page.route('**/api/claude/launch', async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({
            success: false,
            error: 'PTY allocation failed'
          })
        });
      });

      await page.click('button[title="Launch Claude in prod directory"]');
      
      await expect(page.locator('.terminal-error')).toBeVisible();
      await expect(page.locator('.terminal-error')).toContainText('PTY allocation failed');
    });
  });

  describe('Error Recovery and User Feedback', () => {
    test('should show appropriate error messages for different 500 scenarios', async () => {
      const errorScenarios = [
        {
          endpoint: '**/api/claude/launch',
          error: 'ENOENT: no such file or directory',
          expectedMessage: 'File not found'
        },
        {
          endpoint: '**/api/claude/launch',
          error: 'EACCES: permission denied',
          expectedMessage: 'Permission denied'
        },
        {
          endpoint: '**/api/claude/launch',
          error: 'EMFILE: too many open files',
          expectedMessage: 'Resource limit exceeded'
        }
      ];

      for (const scenario of errorScenarios) {
        await page.route(scenario.endpoint, async (route) => {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({
              success: false,
              error: scenario.error
            })
          });
        });

        await page.click('button[title="Launch Claude in prod directory"]');
        await expect(page.locator('.error-message')).toContainText(scenario.expectedMessage);
        
        // Reset for next scenario
        await page.reload();
      }
    });

    test('should allow retry after 500 errors', async () => {
      let attemptCount = 0;
      
      await page.route('**/api/claude/launch', async (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Temporary failure' })
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              success: true,
              message: 'Success on retry'
            })
          });
        }
      });

      // First attempt - should fail
      await page.click('button[title="Launch Claude in prod directory"]');
      await expect(page.locator('.error-message')).toBeVisible();
      
      // Retry - should succeed
      await page.click('button[title="Launch Claude in prod directory"]');
      await expect(page.locator('.success-message')).toBeVisible();
    });

    test('should maintain UI consistency during error states', async () => {
      await page.route('**/api/claude/launch', async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      // Check initial state
      await expect(page.locator('button[title="Launch Claude in prod directory"]')).toBeEnabled();
      
      // Click and verify loading state
      await page.click('button[title="Launch Claude in prod directory"]');
      await expect(page.locator('button:has-text("🔄 Launching...")')).toBeVisible();
      
      // Wait for error and verify button returns to enabled state
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('button[title="Launch Claude in prod directory"]')).toBeEnabled();
    });
  });

  describe('Concurrent Operations and Race Conditions', () => {
    test('should handle multiple rapid button clicks gracefully', async () => {
      let requestCount = 0;
      
      await page.route('**/api/claude/launch', async (route) => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate slow response
        
        if (requestCount > 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Concurrent request rejected' })
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true })
          });
        }
      });

      // Rapid clicks
      const button = page.locator('button[title="Launch Claude in prod directory"]');
      await Promise.all([
        button.click(),
        button.click(),
        button.click()
      ]);

      // Should handle gracefully without crashing
      await expect(page.locator('.error-message, .success-message')).toBeVisible({ timeout: 5000 });
    });

    test('should handle page navigation during pending requests', async () => {
      await page.route('**/api/claude/launch', async (route) => {
        // Simulate very slow response
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({ status: 200, body: '{}' });
      });

      await page.click('button[title="Launch Claude in prod directory"]');
      
      // Navigate away during pending request
      await page.reload();
      
      // Should not crash or show stale error messages
      await expect(page.locator('button[title="Launch Claude in prod directory"]')).toBeVisible();
    });
  });
});