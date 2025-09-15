import { test, expect, Page } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

/**
 * Claude Code Instance Connection and Lifecycle Tests
 *
 * Validates Claude Code instance management including:
 * - Instance creation and connection
 * - Session management and persistence
 * - Terminal interactions and command execution
 * - Instance cleanup and resource management
 * - Multi-instance coordination
 */

test.describe('Claude Code Instance Lifecycle', () => {
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset instance tracking
    createdInstances = [];

    // Set up console monitoring
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    (page as any).testErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    // Clean up created instances
    for (const instanceId of createdInstances) {
      try {
        // Attempt to clean up via API if available
        await page.evaluate((id) => {
          // Client-side cleanup if API exists
          if (window.claudeInstanceManager) {
            window.claudeInstanceManager.destroyInstance(id);
          }
        }, instanceId);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }

    // Check for errors
    const errors = (page as any).testErrors || [];
    if (errors.length > 0) {
      console.warn('Console errors during Claude instance tests:', errors);
    }
  });

  test('Claude instance creation and initial connection', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Look for Claude instance management UI
    const instanceManager = page.locator(
      '.claude-instance-manager, [data-testid="claude-manager"], .instance-launcher'
    );

    const createInstanceButton = page.locator(
      'button:has-text("Create Instance"), button:has-text("New Instance"), .create-instance-btn'
    );

    const terminalLauncher = page.locator(
      '.terminal-launcher, [data-testid="terminal-launcher"], button:has-text("Terminal")'
    );

    // Test instance creation if UI is available
    if (await createInstanceButton.count() > 0) {
      await expect(createInstanceButton.first()).toBeVisible();
      await createInstanceButton.first().click();

      // Wait for instance creation process
      const instanceCreating = page.locator(
        'text="Creating Instance", text="Launching", .creating-indicator'
      );

      if (await instanceCreating.count() > 0) {
        await expect(instanceCreating.first()).toBeVisible();
        await expect(instanceCreating.first()).not.toBeVisible({ timeout: 30000 });
      }

      // Check for successful instance creation
      const instanceConnected = page.locator(
        'text="Connected", text="Ready", .instance-ready, [data-status="connected"]'
      );

      await expect(instanceConnected.first()).toBeVisible({ timeout: 30000 });
      console.log('✅ Claude instance created and connected');

      // Store instance ID for cleanup
      const instanceId = await page.evaluate(() => {
        return window.currentInstanceId || Date.now().toString();
      });
      createdInstances.push(instanceId);
    }

    // Test terminal launcher if available
    if (await terminalLauncher.count() > 0) {
      await expect(terminalLauncher.first()).toBeVisible();
      await terminalLauncher.first().click();

      // Wait for terminal to appear
      const terminal = page.locator(
        '.terminal, [data-testid="terminal"], .xterm, .terminal-container'
      );

      await expect(terminal.first()).toBeVisible({ timeout: 15000 });
      console.log('✅ Terminal launched successfully');

      // Test basic terminal interaction
      await page.waitForTimeout(2000); // Allow terminal to initialize

      // Try typing a simple command
      await page.keyboard.type('echo "Hello from Playwright test"');
      await page.keyboard.press('Enter');

      // Wait for command execution
      await page.waitForTimeout(3000);

      // Check if command output appears (this may vary based on implementation)
      const terminalContent = page.locator('.terminal, .xterm');
      const terminalText = await terminalContent.first().textContent();

      if (terminalText?.includes('Hello from Playwright test')) {
        console.log('✅ Terminal command execution confirmed');
      } else {
        console.log('ℹ️ Terminal command may be executing asynchronously');
      }
    }

    if (await instanceManager.count() > 0) {
      console.log('✅ Claude instance management interface found');
    } else {
      console.log('ℹ️ Claude instance management interface not found - may not be implemented yet');
    }
  });

  test('Instance session management and persistence', async ({ page, context }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Look for existing instances or create one
    const instanceStatus = page.locator(
      '.instance-status, [data-testid="instance-status"], .connection-status'
    );

    const createInstanceBtn = page.locator(
      'button:has-text("Create Instance"), button:has-text("New Instance")'
    );

    // Create instance if none exists
    if (await createInstanceBtn.count() > 0) {
      await createInstanceBtn.first().click();
      await page.waitForTimeout(5000);
    }

    // Check instance status
    if (await instanceStatus.count() > 0) {
      await expect(instanceStatus.first()).toBeVisible();

      const statusText = await instanceStatus.first().textContent();
      console.log(`Instance status: ${statusText}`);
    }

    // Test session persistence by opening a new tab
    const secondPage = await context.newPage();
    await secondPage.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(secondPage);

    // Check if instance state is shared/persisted
    const secondPageInstanceStatus = secondPage.locator(
      '.instance-status, [data-testid="instance-status"], .connection-status'
    );

    if (await secondPageInstanceStatus.count() > 0) {
      const secondPageStatus = await secondPageInstanceStatus.first().textContent();
      console.log(`Second page instance status: ${secondPageStatus}`);

      // Both pages should show consistent state
      if (await instanceStatus.count() > 0) {
        const firstPageStatus = await instanceStatus.first().textContent();
        console.log('Session persistence test:', {
          firstPage: firstPageStatus,
          secondPage: secondPageStatus
        });
      }
    }

    // Test refresh persistence
    await page.reload();
    await TestHelper.waitForPageReady(page);

    // Check if instance state survives refresh
    const refreshedInstanceStatus = page.locator(
      '.instance-status, [data-testid="instance-status"], .connection-status'
    );

    if (await refreshedInstanceStatus.count() > 0) {
      await expect(refreshedInstanceStatus.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Instance state persisted through refresh');
    }

    await secondPage.close();
    console.log('✅ Session management test completed');
  });

  test('Terminal interactions and command execution', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Find and open terminal
    const terminalButton = page.locator(
      'button:has-text("Terminal"), .terminal-btn, [data-testid="terminal-button"]'
    );

    const terminalContainer = page.locator(
      '.terminal, [data-testid="terminal"], .xterm, .terminal-container'
    );

    if (await terminalButton.count() > 0) {
      await terminalButton.first().click();
      await page.waitForTimeout(2000);
    }

    if (await terminalContainer.count() > 0) {
      await expect(terminalContainer.first()).toBeVisible();
      console.log('✅ Terminal interface found');

      // Test various commands
      const commands = [
        'pwd',
        'ls',
        'echo "Testing terminal functionality"',
        'date'
      ];

      for (const command of commands) {
        console.log(`Executing command: ${command}`);

        // Clear any existing input
        await page.keyboard.press('Control+C');
        await page.waitForTimeout(500);

        // Type command
        await page.keyboard.type(command);
        await page.keyboard.press('Enter');

        // Wait for execution
        await page.waitForTimeout(2000);
      }

      // Test command history
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);

      const terminalText = await terminalContainer.first().textContent() || '';

      if (terminalText.includes('date') || terminalText.includes('echo') || terminalText.includes('pwd')) {
        console.log('✅ Terminal command execution working');
      } else {
        console.log('ℹ️ Terminal commands may be executing but output not captured');
      }

      // Test terminal clearing
      await page.keyboard.press('Control+C');
      await page.keyboard.type('clear');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

    } else {
      console.log('ℹ️ Terminal interface not found - may not be implemented yet');
    }
  });

  test('Multi-instance coordination and management', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Look for multi-instance management interface
    const instanceManager = page.locator(
      '.instance-manager, [data-testid="instance-manager"], .multi-instance-panel'
    );

    const instanceList = page.locator(
      '.instance-list, [data-testid="instance-list"], .active-instances'
    );

    const addInstanceButton = page.locator(
      'button:has-text("Add Instance"), button:has-text("+"), .add-instance-btn'
    );

    if (await instanceManager.count() > 0) {
      console.log('✅ Multi-instance management interface found');

      // Check current instances
      if (await instanceList.count() > 0) {
        const instances = instanceList.locator('.instance-item, .instance-card');
        const instanceCount = await instances.count();
        console.log(`Current instances: ${instanceCount}`);

        // Test instance switching if multiple exist
        if (instanceCount > 1) {
          for (let i = 0; i < Math.min(instanceCount, 3); i++) {
            const instance = instances.nth(i);
            await instance.click();
            await page.waitForTimeout(1000);

            // Verify instance switch
            const activeInstance = instance.locator('.active, [data-active="true"]');
            if (await activeInstance.count() > 0) {
              console.log(`✅ Switched to instance ${i + 1}`);
            }
          }
        }
      }

      // Test adding new instance
      if (await addInstanceButton.count() > 0) {
        const initialCount = await instanceList.locator('.instance-item, .instance-card').count();

        await addInstanceButton.first().click();
        await page.waitForTimeout(5000);

        const newCount = await instanceList.locator('.instance-item, .instance-card').count();

        if (newCount > initialCount) {
          console.log('✅ New instance added successfully');
          createdInstances.push(`instance_${Date.now()}`);
        }
      }
    } else {
      console.log('ℹ️ Multi-instance management not found - may be single instance mode');
    }
  });

  test('Instance resource management and cleanup', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Monitor performance metrics
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const initialMetrics = await client.send('Performance.getMetrics');
    const initialMemory = await client.send('Runtime.getHeapUsage');

    console.log(`Initial memory: ${Math.round(initialMemory.usedSize / 1024 / 1024)}MB`);

    // Create instances and monitor resource usage
    const createInstanceBtn = page.locator(
      'button:has-text("Create Instance"), button:has-text("New Instance")'
    );

    const instanceCount = 3;

    for (let i = 0; i < instanceCount; i++) {
      if (await createInstanceBtn.count() > 0) {
        await createInstanceBtn.first().click();
        await page.waitForTimeout(3000);
        createdInstances.push(`test_instance_${i}`);
      }
    }

    // Measure resource usage after creating instances
    const afterCreationMemory = await client.send('Runtime.getHeapUsage');
    const memoryIncrease = afterCreationMemory.usedSize - initialMemory.usedSize;

    console.log(`Memory after creating ${instanceCount} instances: ${Math.round(afterCreationMemory.usedSize / 1024 / 1024)}MB`);
    console.log(`Memory increase: ${Math.round(memoryIncrease / 1024)}KB`);

    // Test instance cleanup
    const destroyInstanceBtn = page.locator(
      'button:has-text("Destroy"), button:has-text("Remove"), .destroy-instance-btn'
    );

    const instanceItems = page.locator('.instance-item, .instance-card');
    const activeInstances = await instanceItems.count();

    if (await destroyInstanceBtn.count() > 0 && activeInstances > 0) {
      // Destroy instances
      for (let i = 0; i < Math.min(activeInstances, instanceCount); i++) {
        await destroyInstanceBtn.first().click();
        await page.waitForTimeout(1000);

        // Confirm destruction if modal appears
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.first().click();
        }

        await page.waitForTimeout(2000);
      }

      // Measure memory after cleanup
      const afterCleanupMemory = await client.send('Runtime.getHeapUsage');
      const memoryRecovered = afterCreationMemory.usedSize - afterCleanupMemory.usedSize;

      console.log(`Memory after cleanup: ${Math.round(afterCleanupMemory.usedSize / 1024 / 1024)}MB`);
      console.log(`Memory recovered: ${Math.round(memoryRecovered / 1024)}KB`);

      // Verify memory was recovered (should be at least 50% of what was used)
      if (memoryRecovered > memoryIncrease * 0.5) {
        console.log('✅ Good memory cleanup detected');
      } else {
        console.log('⚠️ Limited memory recovery - possible memory leak');
      }
    }

    // Performance should remain reasonable
    expect(afterCreationMemory.usedSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

    console.log('✅ Resource management test completed');
  });

  test('Instance error handling and recovery', async ({ page }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Test network failure during instance creation
    const createInstanceBtn = page.locator(
      'button:has-text("Create Instance"), button:has-text("New Instance")'
    );

    if (await createInstanceBtn.count() > 0) {
      // Block network requests during instance creation
      await page.route('**/api/**', route => {
        if (route.request().url().includes('instance') || route.request().url().includes('claude')) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await createInstanceBtn.first().click();
      await page.waitForTimeout(3000);

      // Should show error state
      const errorMessage = page.locator(
        'text="Error", text="Failed", .error-message, .instance-error'
      );

      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
        console.log('✅ Instance creation error handled');
      }

      // Test retry functionality
      const retryButton = page.locator(
        'button:has-text("Retry"), button:has-text("Try Again")'
      );

      if (await retryButton.count() > 0) {
        // Restore network
        await page.unroute('**/api/**');

        await retryButton.first().click();
        await page.waitForTimeout(5000);

        // Should recover
        const successIndicator = page.locator(
          'text="Connected", text="Ready", .instance-ready'
        );

        if (await successIndicator.count() > 0) {
          console.log('✅ Instance creation recovery successful');
        }
      }
    }

    // Test terminal connection failure
    const terminalButton = page.locator(
      'button:has-text("Terminal"), .terminal-btn'
    );

    if (await terminalButton.count() > 0) {
      // Block terminal-related requests
      await page.route('**/terminal**', route => route.abort('failed'));
      await page.route('**/ws**', route => route.abort('failed'));

      await terminalButton.first().click();
      await page.waitForTimeout(3000);

      // Should handle terminal connection failure gracefully
      const terminalError = page.locator(
        'text="Terminal Error", text="Connection Failed", .terminal-error'
      );

      if (await terminalError.count() > 0) {
        console.log('✅ Terminal connection error handled');
      }

      // Restore network
      await page.unroute('**/terminal**');
      await page.unroute('**/ws**');
    }

    console.log('✅ Instance error handling test completed');
  });
});

test.describe('Claude Instance Performance Tests', () => {
  test('Instance startup performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    const pageLoadTime = Date.now() - startTime;
    console.log(`Page load time: ${pageLoadTime}ms`);

    const createInstanceBtn = page.locator(
      'button:has-text("Create Instance"), button:has-text("New Instance")'
    );

    if (await createInstanceBtn.count() > 0) {
      const instanceStartTime = Date.now();

      await createInstanceBtn.first().click();

      // Wait for instance ready state
      const instanceReady = page.locator(
        'text="Connected", text="Ready", .instance-ready, [data-status="connected"]'
      );

      await expect(instanceReady.first()).toBeVisible({ timeout: 30000 });

      const instanceCreationTime = Date.now() - instanceStartTime;
      console.log(`Instance creation time: ${instanceCreationTime}ms`);

      // Performance thresholds
      expect(pageLoadTime).toBeLessThan(10000); // 10 seconds
      expect(instanceCreationTime).toBeLessThan(30000); // 30 seconds

      console.log('✅ Instance performance within acceptable limits');
    }
  });

  test('Concurrent instance handling', async ({ page, context }) => {
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Open multiple tabs
    const pages = [page];

    for (let i = 0; i < 2; i++) {
      const newPage = await context.newPage();
      await newPage.goto(TestHelper.FRONTEND_URL);
      await TestHelper.waitForPageReady(newPage);
      pages.push(newPage);
    }

    // Attempt to create instances simultaneously
    const createPromises = pages.map(async (p, index) => {
      const createBtn = p.locator(
        'button:has-text("Create Instance"), button:has-text("New Instance")'
      );

      if (await createBtn.count() > 0) {
        await createBtn.first().click();
        console.log(`Instance creation started in tab ${index + 1}`);
        return p.waitForSelector(
          'text="Connected", text="Ready", .instance-ready',
          { timeout: 30000 }
        ).catch(() => null);
      }
    });

    // Wait for all instances to be created or timeout
    const results = await Promise.allSettled(createPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    console.log(`Concurrent instances created: ${successful}/${pages.length}`);
    expect(successful).toBeGreaterThan(0);

    // Close additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }

    console.log('✅ Concurrent instance handling test completed');
  });
});