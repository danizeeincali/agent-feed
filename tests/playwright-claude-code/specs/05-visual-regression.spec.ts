import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Visual Regression Testing
 * 
 * Tests:
 * - UI component visual stability
 * - Cross-browser visual consistency
 * - Responsive design validation
 * - Dark/light mode rendering
 * - Animation and transition states
 */

test.describe('Visual Regression Testing', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
    
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Wait for fonts and resources to load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should maintain Claude Instances page visual consistency', async ({ page }) => {
    test.setTimeout(90000);
    
    await helpers.navigateToClaudeInstances();
    await page.waitForTimeout(2000); // Allow animations to complete
    
    // Take screenshot of empty instances page
    await expect(page).toHaveScreenshot('claude-instances-empty.png');
    
    // Create an instance and capture the populated state
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Wait for creation animations to complete
    await page.waitForTimeout(3000);
    
    // Take screenshot with instance
    await expect(page).toHaveScreenshot('claude-instances-with-instance.png');
    
    // Test hover state
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.hover();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('claude-instances-hover-state.png');
  });

  test('should maintain chat interface visual consistency', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    await page.waitForTimeout(2000);
    
    // Take screenshot of empty chat interface
    await expect(page).toHaveScreenshot('chat-interface-empty.png');
    
    // Send a message and capture conversation state
    await helpers.sendMessageToInstance(instanceId, "Hello Claude! This is a visual regression test.");
    await page.waitForTimeout(3000);
    
    // Take screenshot with conversation
    await expect(page).toHaveScreenshot('chat-interface-with-conversation.png');
    
    // Test input focus state
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.focus();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('chat-interface-input-focused.png');
  });

  test('should maintain responsive design across viewports', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow layout to adjust
      
      // Take screenshot for this viewport
      await expect(page).toHaveScreenshot(`claude-instances-${viewport.name}.png`);
      
      // Test mobile menu if applicable
      if (viewport.width <= 768) {
        const menuButton = page.locator('button:has([class*="menu"])').first();
        if (await menuButton.isVisible()) {
          await menuButton.click();
          await page.waitForTimeout(500);
          
          await expect(page).toHaveScreenshot(`mobile-menu-open-${viewport.name}.png`);
        }
      }
    }
  });

  test('should maintain consistent button and form element rendering', async ({ page }) => {
    test.setTimeout(90000);
    
    await helpers.navigateToClaudeInstances();
    await page.waitForTimeout(1000);
    
    // Focus on the button area
    const buttonContainer = page.locator('[data-testid="create-buttons"]').first();
    if (await buttonContainer.isVisible()) {
      await expect(buttonContainer).toHaveScreenshot('create-buttons-normal.png');
      
      // Test button hover states
      const firstButton = buttonContainer.locator('button').first();
      await firstButton.hover();
      await page.waitForTimeout(300);
      
      await expect(buttonContainer).toHaveScreenshot('create-buttons-hover.png');
      
      // Test button active state
      await firstButton.focus();
      await page.waitForTimeout(300);
      
      await expect(buttonContainer).toHaveScreenshot('create-buttons-focused.png');
    }
  });

  test('should maintain terminal interface visual consistency', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Switch to terminal view if available
    const terminalTab = page.locator('[data-testid="terminal-tab"]');
    if (await terminalTab.isVisible()) {
      await terminalTab.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of empty terminal
      await expect(page).toHaveScreenshot('terminal-interface-empty.png');
    }
    
    // Send a command that generates terminal output
    await helpers.sendMessageToInstance(instanceId, "List the files in the current directory");
    await page.waitForTimeout(5000);
    
    // Switch back to terminal view to see output
    if (await terminalTab.isVisible()) {
      await terminalTab.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('terminal-interface-with-output.png');
    }
  });

  test('should maintain loading and error state visuals', async ({ page }) => {
    test.setTimeout(90000);
    
    // Test loading states
    await page.route('/api/claude/instances', route => {
      // Delay response to capture loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }, 2000);
    });
    
    const loadingPromise = helpers.navigateToClaudeInstances();
    
    // Capture loading state
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('loading-state.png');
    
    await loadingPromise;
    await page.unroute('/api/claude/instances');
    
    // Test error states
    await page.route('/api/claude/instances', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' })
      });
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Capture error state
    await expect(page).toHaveScreenshot('error-state.png');
    
    await page.unroute('/api/claude/instances');
  });

  test('should maintain consistent typography and spacing', async ({ page }) => {
    test.setTimeout(90000);
    
    await helpers.navigateToClaudeInstances();
    
    // Create instance to have content to test
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send messages with various content types to test typography
    const testMessages = [
      "This is a simple message to test basic typography.",
      "This is a **bold** message with some *italic* text and `code` formatting.",
      "Here's a longer message that should test line wrapping and spacing between multiple lines of text in the chat interface."
    ];
    
    for (const message of testMessages) {
      await helpers.sendMessageToInstance(instanceId, message);
      await page.waitForTimeout(2000);
    }
    
    // Focus on the chat area for typography testing
    const chatArea = page.locator('[data-testid="chat-messages"]');
    if (await chatArea.isVisible()) {
      await expect(chatArea).toHaveScreenshot('typography-and-spacing.png');
    }
  });

  test('should maintain icon and visual element consistency', async ({ page }) => {
    test.setTimeout(90000);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Capture main navigation with icons
    const navigation = page.locator('nav').first();
    if (await navigation.isVisible()) {
      await expect(navigation).toHaveScreenshot('navigation-icons.png');
    }
    
    // Navigate to Claude instances and capture button icons
    await helpers.navigateToClaudeInstances();
    
    const createButtonsArea = page.locator('[data-testid*="create"]').first();
    if (await createButtonsArea.isVisible()) {
      await expect(createButtonsArea.locator('..').first()).toHaveScreenshot('button-icons.png');
    }
  });

  test('should maintain color scheme consistency', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    // Test light mode (default)
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('color-scheme-light.png');
    
    // Test dark mode if available
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('color-scheme-dark.png');
      
      // Switch back to light mode
      await darkModeToggle.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should maintain animation and transition consistency', async ({ page }) => {
    test.setTimeout(120000);
    
    await helpers.navigateToClaudeInstances();
    
    // Test instance creation animation
    const createButton = page.locator('[data-testid="create-claude-interactive"]');
    if (await createButton.isVisible()) {
      // Capture before animation
      await expect(page).toHaveScreenshot('before-create-animation.png');
      
      await createButton.click();
      
      // Capture during animation (midpoint)
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('during-create-animation.png');
      
      // Wait for animation to complete
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot('after-create-animation.png');
      
      // Track created instance for cleanup
      const instances = await page.$$('[data-testid="instance-card"]');
      if (instances.length > 0) {
        const lastInstance = instances[instances.length - 1];
        const instanceId = await lastInstance.getAttribute('data-instance-id');
        if (instanceId) {
          createdInstances.push(instanceId);
        }
      }
    }
  });

  test('should maintain cross-browser visual consistency', async ({ page, browserName }) => {
    test.setTimeout(90000);
    
    await helpers.navigateToClaudeInstances();
    await page.waitForTimeout(1000);
    
    // Take browser-specific screenshot
    await expect(page).toHaveScreenshot(`claude-instances-${browserName}.png`);
    
    // Create instance for more complex UI testing
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    await helpers.waitForElement('[data-testid="chat-input"]');
    await page.waitForTimeout(1000);
    
    // Browser-specific chat interface screenshot
    await expect(page).toHaveScreenshot(`chat-interface-${browserName}.png`);
  });
});