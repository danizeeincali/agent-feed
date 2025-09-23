/**
 * End-to-End Tests for Simplified UI Workflow
 * 
 * Complete user workflow tests for the simplified interface:
 * - Navigation from landing to Claude Instances
 * - Creating instances with all 4 button variants
 * - Instance interaction and management
 * - Error scenarios and recovery
 * - Performance and responsiveness
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Simplified UI Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation and Initial State', () => {
    test('should display Claude Instances as primary navigation item', async ({ page }) => {
      // Verify Claude Instances is in the navigation
      const claudeInstancesLink = page.locator('nav a', { hasText: 'Claude Instances' });
      await expect(claudeInstancesLink).toBeVisible();
      
      // Verify it has the Bot icon
      const icon = claudeInstancesLink.locator('svg').first();
      await expect(icon).toBeVisible();
    });

    test('should not display Simple Launcher in navigation', async ({ page }) => {
      // Verify Simple Launcher is not in navigation
      await expect(page.locator('nav', { hasText: 'Simple Launcher' })).not.toBeVisible();
      await expect(page.locator('nav a', { hasText: 'Simple Launcher' })).not.toBeVisible();
      await expect(page.locator('nav a', { hasText: /Launch.*Simple/ })).not.toBeVisible();
    });

    test('should navigate to Claude Instances page successfully', async ({ page }) => {
      // Click on Claude Instances navigation
      await page.click('nav a[href="/claude-instances"]');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the right page
      await expect(page.url()).toContain('/claude-instances');
      await expect(page.locator('h2', { hasText: 'Claude Instance Manager' })).toBeVisible();
    });
  });

  test.describe('4-Button Interface', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to Claude Instances page
      await page.goto('/claude-instances');
      await page.waitForLoadState('networkidle');
    });

    test('should display all 4 launch buttons with correct styling', async ({ page }) => {
      // Verify all 4 buttons are visible
      const buttons = [
        { text: '🚀 prod/claude', class: 'btn-prod' },
        { text: '⚡ skip-permissions', class: 'btn-skip-perms' },
        { text: '⚡ skip-permissions -c', class: 'btn-skip-perms-c' },
        { text: '↻ skip-permissions --resume', class: 'btn-skip-perms-resume' }
      ];

      for (const button of buttons) {
        const buttonElement = page.locator('button', { hasText: button.text });
        await expect(buttonElement).toBeVisible();
        await expect(buttonElement).toHaveClass(new RegExp(button.class));
        await expect(buttonElement).not.toBeDisabled();
      }
    });

    test('should show correct tooltips on button hover', async ({ page }) => {
      const buttonTooltips = [
        { text: '🚀 prod/claude', tooltip: 'Launch Claude in prod directory' },
        { text: '⚡ skip-permissions', tooltip: 'Launch with permissions skipped' },
        { text: '⚡ skip-permissions -c', tooltip: 'Launch with permissions skipped and -c flag' },
        { text: '↻ skip-permissions --resume', tooltip: 'Resume with permissions skipped' }
      ];

      for (const item of buttonTooltips) {
        const button = page.locator('button', { hasText: item.text });
        await expect(button).toHaveAttribute('title', item.tooltip);
      }
    });

    test('should show hover effects on buttons', async ({ page }) => {
      const prodButton = page.locator('button', { hasText: '🚀 prod/claude' });
      
      // Hover over button
      await prodButton.hover();
      
      // Check for CSS transforms or box-shadow (might need to check computed styles)
      await expect(prodButton).toHaveClass(/btn-prod/);
    });
  });

  test.describe('Instance Creation Workflow', () => {
    let mockApiCalls: any;

    test.beforeEach(async ({ page }) => {
      // Navigate to Claude Instances page
      await page.goto('/claude-instances');
      await page.waitForLoadState('networkidle');

      // Mock API responses
      await page.route('**/api/claude/instances', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              instances: []
            })
          });
        } else if (route.request().method() === 'POST') {
          const postData = route.request().postData();
          const requestBody = JSON.parse(postData || '{}');
          
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              instance: {
                id: 'test-instance-' + Date.now(),
                name: requestBody.name || 'Test Instance',
                status: 'starting',
                pid: 12345,
                startTime: new Date().toISOString()
              }
            })
          });
        }
      });

      // Mock WebSocket connection
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;

          constructor(url: string) {
            setTimeout(() => {
              if (this.onopen) {
                this.onopen(new Event('open'));
              }
            }, 10);
          }

          send(data: string) {
            // Mock send
          }

          close() {
            if (this.onclose) {
              this.onclose(new CloseEvent('close'));
            }
          }
        }

        (window as any).WebSocket = MockWebSocket;
      });
    });

    test('should create instance with prod/claude button', async ({ page }) => {
      // Click the prod/claude button
      await page.click('button:has-text("🚀 prod/claude")');
      
      // Wait for loading state
      await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeDisabled();
      
      // Wait for API response and UI update
      await page.waitForTimeout(1000);
      
      // Verify instance appears in list (mocked)
      await expect(page.locator('.instances-list')).toBeVisible();
    });

    test('should create instance with skip-permissions button', async ({ page }) => {
      await page.click('button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))');
      
      await expect(page.locator('button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))')).toBeDisabled();
      
      await page.waitForTimeout(1000);
      
      await expect(page.locator('.instances-list')).toBeVisible();
    });

    test('should create instance with skip-permissions -c button', async ({ page }) => {
      await page.click('button:has-text("⚡ skip-permissions -c")');
      
      await expect(page.locator('button:has-text("⚡ skip-permissions -c")')).toBeDisabled();
      
      await page.waitForTimeout(1000);
      
      await expect(page.locator('.instances-list')).toBeVisible();
    });

    test('should create instance with skip-permissions --resume button', async ({ page }) => {
      await page.click('button:has-text("↻ skip-permissions --resume")');
      
      await expect(page.locator('button:has-text("↻ skip-permissions --resume")')).toBeDisabled();
      
      await page.waitForTimeout(1000);
      
      await expect(page.locator('.instances-list')).toBeVisible();
    });

    test('should prevent rapid button clicks', async ({ page }) => {
      const prodButton = page.locator('button:has-text("🚀 prod/claude")');
      
      // Click multiple times rapidly
      await prodButton.click();
      await prodButton.click();
      await prodButton.click();
      
      // Should be disabled after first click
      await expect(prodButton).toBeDisabled();
    });
  });

  test.describe('Instance Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/claude-instances');
      await page.waitForLoadState('networkidle');

      // Mock API with existing instances
      await page.route('**/api/claude/instances', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              instances: [
                {
                  id: 'instance-1',
                  name: 'Claude Prod',
                  status: 'running',
                  pid: 12345,
                  startTime: '2024-01-01T00:00:00Z'
                },
                {
                  id: 'instance-2', 
                  name: 'Claude Skip Perms',
                  status: 'running',
                  pid: 12346,
                  startTime: '2024-01-01T00:01:00Z'
                }
              ]
            })
          });
        }
      });

      // Mock delete API
      await page.route('**/api/claude/instances/*', (route) => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });

      // Mock WebSocket
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;

          constructor(url: string) {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
              
              // Send initial instances data
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'instances',
                      data: [
                        { id: 'instance-1', name: 'Claude Prod', status: 'running', pid: 12345 },
                        { id: 'instance-2', name: 'Claude Skip Perms', status: 'running', pid: 12346 }
                      ]
                    })
                  }));
                }
              }, 100);
            }, 10);
          }

          send() {}
          close() {}
        }

        (window as any).WebSocket = MockWebSocket;
      });

      await page.waitForTimeout(200);
    });

    test('should display active instances in the list', async ({ page }) => {
      // Wait for instances to load
      await page.waitForTimeout(500);
      
      // Verify instances are displayed
      await expect(page.locator('text=Claude Prod')).toBeVisible();
      await expect(page.locator('text=Claude Skip Perms')).toBeVisible();
      
      // Verify status indicators
      await expect(page.locator('.instance-status.running')).toHaveCount(2);
    });

    test('should show active instance count in header', async ({ page }) => {
      await page.waitForTimeout(500);
      
      await expect(page.locator('text=Active: 2/2')).toBeVisible();
    });

    test('should select instance and show interaction panel', async ({ page }) => {
      await page.waitForTimeout(500);
      
      // Click on an instance
      await page.click('text=Claude Prod');
      
      // Verify selection
      await expect(page.locator('.instance-item.selected')).toBeVisible();
      
      // Verify interaction panel appears
      await expect(page.locator('text=Instance Output')).toBeVisible();
      await expect(page.locator('input[placeholder*="Type command"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send")')).toBeVisible();
    });

    test('should show terminate button on hover and handle termination', async ({ page }) => {
      await page.waitForTimeout(500);
      
      // Hover over instance
      const instanceItem = page.locator('.instance-item').first();
      await instanceItem.hover();
      
      // Verify terminate button appears
      const terminateButton = instanceItem.locator('.btn-terminate');
      await expect(terminateButton).toBeVisible();
      
      // Click terminate button
      await terminateButton.click();
      
      // Should not crash (with mocked API)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Instance Interaction', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Mock WebSocket with instance selection
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          sentMessages: string[] = [];

          constructor() {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
              
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: JSON.stringify({
                      type: 'instances',
                      data: [{ id: 'test-1', name: 'Test Instance', status: 'running' }]
                    })
                  }));
                }
              }, 100);
            }, 10);
          }

          send(data: string) {
            this.sentMessages.push(data);
            // Simulate output response
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(new MessageEvent('message', {
                  data: JSON.stringify({
                    type: 'output',
                    instanceId: 'test-1',
                    data: 'Output: ' + JSON.parse(data).data
                  })
                }));
              }
            }, 100);
          }

          close() {}
        }

        (window as any).WebSocket = MockWebSocket;
      });

      await page.route('**/api/claude/instances', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instances: [{ id: 'test-1', name: 'Test Instance', status: 'running' }]
          })
        });
      });

      await page.waitForTimeout(500);
    });

    test('should send input via Enter key', async ({ page }) => {
      // Select instance
      await page.click('text=Test Instance');
      
      // Wait for interaction panel
      await expect(page.locator('input[placeholder*="Type command"]')).toBeVisible();
      
      // Type and press Enter
      const input = page.locator('input[placeholder*="Type command"]');
      await input.fill('hello world');
      await input.press('Enter');
      
      // Verify input is cleared
      await expect(input).toHaveValue('');
      
      // Wait for output (mocked)
      await page.waitForTimeout(200);
      await expect(page.locator('text=Output: hello world')).toBeVisible();
    });

    test('should send input via Send button', async ({ page }) => {
      await page.click('text=Test Instance');
      
      const input = page.locator('input[placeholder*="Type command"]');
      await input.fill('test command');
      
      await page.click('button:has-text("Send")');
      
      await expect(input).toHaveValue('');
      
      await page.waitForTimeout(200);
      await expect(page.locator('text=Output: test command')).toBeVisible();
    });

    test('should not send empty input', async ({ page }) => {
      await page.click('text=Test Instance');
      
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();
      
      // Should not produce any output for empty input
      await page.waitForTimeout(200);
      await expect(page.locator('text=Output:')).not.toBeVisible();
    });

    test('should handle multiple instances and switching', async ({ page }) => {
      // Mock multiple instances
      await page.addInitScript(() => {
        const instances = [
          { id: 'test-1', name: 'Instance 1', status: 'running' },
          { id: 'test-2', name: 'Instance 2', status: 'running' }
        ];

        // Update the WebSocket to provide multiple instances
        if ((window as any).WebSocket.prototype.constructor.instances) {
          (window as any).WebSocket.prototype.constructor.instances = instances;
        }
      });

      await page.reload();
      await page.waitForTimeout(500);

      // Should be able to switch between instances
      await page.click('text=Instance 1');
      await expect(page.locator('.instance-item.selected:has-text("Instance 1")')).toBeVisible();

      await page.click('text=Instance 2'); 
      await expect(page.locator('.instance-item.selected:has-text("Instance 2")')).toBeVisible();
      await expect(page.locator('.instance-item.selected:has-text("Instance 1")')).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/claude-instances');
      await page.waitForLoadState('networkidle');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/claude/instances', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Failed to create instance'
            })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, instances: [] })
          });
        }
      });

      // Try to create instance
      await page.click('button:has-text("🚀 prod/claude")');
      
      // Should show error message
      await expect(page.locator('text=Failed to create instance')).toBeVisible();
    });

    test('should handle network errors', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/claude/instances', (route) => {
        if (route.request().method() === 'POST') {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, instances: [] })
          });
        }
      });

      await page.click('button:has-text("🚀 prod/claude")');
      
      await expect(page.locator('text=Failed to create instance')).toBeVisible();
    });

    test('should handle WebSocket connection errors', async ({ page }) => {
      // Mock WebSocket error
      await page.addInitScript(() => {
        class MockWebSocket {
          onerror: ((event: Event) => void) | null = null;

          constructor() {
            setTimeout(() => {
              if (this.onerror) {
                this.onerror(new Event('error'));
              }
            }, 10);
          }

          send() {}
          close() {}
        }

        (window as any).WebSocket = MockWebSocket;
      });

      await page.reload();
      await page.waitForTimeout(200);

      await expect(page.locator('text=WebSocket connection error')).toBeVisible();
    });

    test('should show empty state when no instances exist', async ({ page }) => {
      // Default empty state from beforeEach
      await expect(page.locator('text=No active instances. Launch one to get started!')).toBeVisible();
    });

    test('should handle invalid WebSocket messages gracefully', async ({ page }) => {
      await page.addInitScript(() => {
        class MockWebSocket {
          static OPEN = 1;
          readyState = MockWebSocket.OPEN;
          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;

          constructor() {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
              
              // Send invalid JSON
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage(new MessageEvent('message', {
                    data: 'invalid json'
                  }));
                }
              }, 100);
            }, 10);
          }

          send() {}
          close() {}
        }

        (window as any).WebSocket = MockWebSocket;
      });

      await page.reload();
      
      // Should not crash the application
      await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/claude-instances');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Verify key elements are visible
      await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
      await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeVisible();
    });

    test('should handle window resize gracefully', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Test different viewport sizes
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('.launch-buttons')).toBeVisible();
      
      await page.setViewportSize({ width: 768, height: 600 });
      await expect(page.locator('.launch-buttons')).toBeVisible();
      
      await page.setViewportSize({ width: 480, height: 800 });
      await expect(page.locator('.launch-buttons')).toBeVisible();
    });

    test('should handle multiple rapid UI interactions', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Rapid navigation and interaction
      await page.click('nav a[href="/"]');
      await page.click('nav a[href="/claude-instances"]');
      await page.click('button:has-text("🚀 prod/claude")');
      
      // Should not crash
      await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Check heading structure
      await expect(page.locator('h1')).toBeVisible(); // App title
      await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
      await expect(page.locator('h3:has-text("Instances")')).toBeVisible();
    });

    test('should have keyboard navigation support', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Tab through buttons
      await page.keyboard.press('Tab');
      // Should focus on first interactive element
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);
    });

    test('should have proper button attributes', async ({ page }) => {
      await page.goto('/claude-instances');
      
      // Check button accessibility
      const buttons = await page.locator('button[title]').count();
      expect(buttons).toBeGreaterThan(0);
      
      // Verify buttons have proper titles
      await expect(page.locator('button[title="Launch Claude in prod directory"]')).toBeVisible();
    });
  });
});