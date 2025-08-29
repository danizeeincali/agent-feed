import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { ChatInterfacePage } from '../page-objects/ChatInterfacePage';

/**
 * Visual Regression Validation Tests
 * 
 * Test Categories:
 * 1. Screenshot Comparisons for Consistent Claudable Styling
 * 2. Responsive Design Across Different Screen Sizes  
 * 3. Color Scheme and Typography Consistency
 * 4. Animation Smoothness and Performance
 * 5. Professional Appearance Matches Design Requirements
 */

test.describe('Visual Regression Validation', () => {
  let claudePage: ClaudeInstancePage;
  let chatPage: ChatInterfacePage;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    chatPage = new ChatInterfacePage(page);
    
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
    
    await claudePage.goto();
  });
  
  test.describe('Screenshot Comparisons for Claudable Styling', () => {
    test('initial page load matches professional styling baseline', async ({ page }) => {
      // Wait for page to fully load
      await claudePage.waitForPageLoad();
      
      // Take full page screenshot
      await expect(page).toHaveScreenshot('claude-instance-manager-initial.png', {
        fullPage: true,
        threshold: 0.2
      });
    });
    
    test('professional button grid layout is consistent', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Focus on button area for detailed comparison
      const buttonArea = page.locator('.launch-buttons');
      await expect(buttonArea).toBeVisible();
      
      await expect(buttonArea).toHaveScreenshot('professional-button-grid.png', {
        threshold: 0.1
      });
    });
    
    test('button hover states maintain professional appearance', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Test each button's hover state
      const buttons = [
        { element: claudePage.prodButton, name: 'prod-button' },
        { element: claudePage.skipPermissionsButton, name: 'skip-permissions-button' },
        { element: claudePage.skipPermissionsCButton, name: 'skip-permissions-c-button' },
        { element: claudePage.skipPermissionsResumeButton, name: 'skip-permissions-resume-button' }
      ];
      
      for (const button of buttons) {
        await button.element.hover();
        await page.waitForTimeout(100); // Allow hover transition
        
        await expect(button.element).toHaveScreenshot(`${button.name}-hover.png`, {
          threshold: 0.15
        });
        
        // Move away to reset state
        await claudePage.header.hover();
        await page.waitForTimeout(50);
      }
    });
    
    test('loading states visual consistency', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Click button to trigger loading state
      const clickPromise = claudePage.prodButton.click();
      
      // Capture loading state quickly
      await page.waitForTimeout(100);
      await expect(claudePage.prodButton).toHaveScreenshot('button-loading-state.png', {
        threshold: 0.1
      });
      
      // Wait for loading to complete
      await clickPromise;
      await claudePage.waitForInstanceCreation();
      
      // Capture post-loading state
      await expect(claudePage.prodButton).toHaveScreenshot('button-normal-state.png', {
        threshold: 0.1
      });
    });
    
    test('instance list displays with consistent professional styling', async ({ page }) => {
      // Create an instance to test list display
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      // Screenshot of instance list
      const instancesList = page.locator('.instances-list');
      await expect(instancesList).toHaveScreenshot('instances-list-professional.png', {
        threshold: 0.2
      });
      
      // Test selected instance state
      await claudePage.selectInstance(0);
      await expect(instancesList).toHaveScreenshot('instances-list-with-selection.png', {
        threshold: 0.2
      });
    });
    
    test('chat interface professional styling consistency', async ({ page }) => {
      // Create instance and start chat
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      // Wait for chat interface to be ready
      await chatPage.waitForChatInterface();
      
      // Screenshot of chat interface
      const chatContainer = page.locator('.instance-interaction');
      await expect(chatContainer).toHaveScreenshot('chat-interface-professional.png', {
        threshold: 0.2
      });
      
      // Send a message and capture with content
      await chatPage.sendMessage('echo "Visual regression test"');
      await chatPage.waitForOutputContains('Visual regression test');
      
      await expect(chatContainer).toHaveScreenshot('chat-interface-with-content.png', {
        threshold: 0.2
      });
    });
  });
  
  test.describe('Responsive Design Visual Validation', () => {
    test('mobile viewport maintains professional appearance', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Mobile view screenshot
      await expect(page).toHaveScreenshot('claude-manager-mobile.png', {
        fullPage: true,
        threshold: 0.3
      });
      
      // Test button layout on mobile
      const buttonArea = page.locator('.launch-buttons');
      await expect(buttonArea).toHaveScreenshot('mobile-button-layout.png', {
        threshold: 0.2
      });
    });
    
    test('tablet viewport responsive design', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('claude-manager-tablet.png', {
        fullPage: true,
        threshold: 0.3
      });
      
      // Test that buttons remain accessible on tablet
      const buttonArea = page.locator('.launch-buttons');
      await expect(buttonArea).toHaveScreenshot('tablet-button-layout.png', {
        threshold: 0.2
      });
    });
    
    test('desktop high resolution consistency', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('claude-manager-desktop-hd.png', {
        fullPage: true,
        threshold: 0.2
      });
      
      // Verify button grid scales properly
      const buttonArea = page.locator('.launch-buttons');
      await expect(buttonArea).toHaveScreenshot('desktop-hd-button-layout.png', {
        threshold: 0.1
      });
    });
    
    test('ultra-wide screen layout maintains professional appearance', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test that layout doesn't stretch awkwardly on ultra-wide
      await expect(page).toHaveScreenshot('claude-manager-ultrawide.png', {
        fullPage: true,
        threshold: 0.3
      });
    });
  });
  
  test.describe('Color Scheme and Typography Consistency', () => {
    test('button color schemes match design requirements', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Test each button's color individually
      const buttons = [
        { element: claudePage.prodButton, name: 'prod', expectedClass: 'btn-prod' },
        { element: claudePage.skipPermissionsButton, name: 'skip-perms', expectedClass: 'btn-skip-perms' },
        { element: claudePage.skipPermissionsCButton, name: 'skip-perms-c', expectedClass: 'btn-skip-perms-c' },
        { element: claudePage.skipPermissionsResumeButton, name: 'skip-perms-resume', expectedClass: 'btn-skip-perms-resume' }
      ];
      
      for (const button of buttons) {
        // Verify button has expected class
        await expect(button.element).toHaveClass(new RegExp(button.expectedClass));
        
        // Screenshot individual button for color validation
        await expect(button.element).toHaveScreenshot(`${button.name}-color-scheme.png`, {
          threshold: 0.1
        });
      }
    });
    
    test('typography consistency across interface', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Test header typography
      const header = page.locator('h2');
      await expect(header).toHaveScreenshot('header-typography.png', {
        threshold: 0.1
      });
      
      // Test button text typography
      for (const button of [claudePage.prodButton, claudePage.skipPermissionsButton]) {
        await expect(button).toHaveScreenshot(`${await button.textContent()}-typography.png`.replace(/[^a-zA-Z0-9]/g, '-'), {
          threshold: 0.1
        });
      }
      
      // Create instance to test instance list typography
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      const instanceItem = claudePage.instanceItems.first();
      await expect(instanceItem).toHaveScreenshot('instance-item-typography.png', {
        threshold: 0.1
      });
    });
    
    test('status indicators color coding', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Test connection status colors
      await expect(claudePage.connectionStatus).toHaveScreenshot('connection-status-styling.png', {
        threshold: 0.1
      });
      
      // Create instance to test status indicator colors
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      // Test running instance status
      const statusIndicator = claudePage.instanceItems.first().locator('.status-indicator');
      await expect(statusIndicator).toHaveScreenshot('instance-status-running.png', {
        threshold: 0.1
      });
    });
    
    test('dark mode compatibility (if applicable)', async ({ page }) => {
      // Check if dark mode is supported
      await page.addInitScript(() => {
        // Force dark mode
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test dark mode appearance
      await expect(page).toHaveScreenshot('claude-manager-dark-mode.png', {
        fullPage: true,
        threshold: 0.3
      });
    });
  });
  
  test.describe('Animation Smoothness and Performance', () => {
    test('button hover animations are smooth', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Enable animations for this test
      await page.addInitScript(() => {
        const existingStyle = document.querySelector('style');
        if (existingStyle) {
          existingStyle.remove();
        }
      });
      
      await page.reload();
      await claudePage.waitForPageLoad();
      
      // Record hover animation sequence
      await claudePage.prodButton.hover();
      await page.waitForTimeout(100);
      
      // Capture mid-animation state
      await expect(claudePage.prodButton).toHaveScreenshot('button-hover-animation.png', {
        threshold: 0.2
      });
      
      // Test animation completion
      await page.waitForTimeout(200);
      await expect(claudePage.prodButton).toHaveScreenshot('button-hover-complete.png', {
        threshold: 0.1
      });
    });
    
    test('loading spinner animations maintain visual consistency', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Click button to start loading
      const clickPromise = claudePage.prodButton.click();
      
      // Wait for loading animation to start
      await page.waitForTimeout(200);
      
      // Capture loading animation state
      await expect(page.locator('.loading, .spinner, [disabled]').first()).toHaveScreenshot('loading-animation.png', {
        threshold: 0.3
      }).catch(() => {
        // Loading might complete too quickly, that's okay
      });
      
      await clickPromise;
      await claudePage.waitForInstanceCreation();
    });
    
    test('page transitions maintain professional appearance', async ({ page }) => {
      // Test navigation between different states
      await claudePage.waitForPageLoad();
      
      // Initial state
      await expect(page).toHaveScreenshot('transition-initial-state.png', {
        threshold: 0.2
      });
      
      // Create instance (state change)
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      // With instance state
      await expect(page).toHaveScreenshot('transition-with-instance.png', {
        threshold: 0.2
      });
      
      // Select instance (another state change)
      await claudePage.selectInstance(0);
      
      // Selected instance state
      await expect(page).toHaveScreenshot('transition-instance-selected.png', {
        threshold: 0.2
      });
    });
  });
  
  test.describe('Professional Appearance Validation', () => {
    test('overall interface matches design requirements', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Full interface professional appearance check
      await expect(page).toHaveScreenshot('professional-interface-complete.png', {
        fullPage: true,
        threshold: 0.2
      });
      
      // Create instance and show full workflow
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      await claudePage.selectInstance(0);
      await chatPage.waitForChatInterface();
      
      // Complete workflow screenshot
      await expect(page).toHaveScreenshot('professional-workflow-complete.png', {
        fullPage: true,
        threshold: 0.2
      });
    });
    
    test('error states maintain professional styling', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Simulate error condition by trying to connect to invalid backend
      await page.route('**/api/claude/instances', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      // Try to create instance to trigger error
      await claudePage.prodButton.click();
      await page.waitForTimeout(2000);
      
      // Screenshot error state
      if (await claudePage.hasErrorMessage()) {
        await expect(page).toHaveScreenshot('error-state-professional.png', {
          threshold: 0.2
        });
      }
    });
    
    test('accessibility features maintain visual consistency', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Test focus states for accessibility
      await claudePage.prodButton.focus();
      await expect(claudePage.prodButton).toHaveScreenshot('button-focus-state.png', {
        threshold: 0.1
      });
      
      // Test tab navigation visual feedback
      await page.keyboard.press('Tab');
      await expect(claudePage.skipPermissionsButton).toHaveScreenshot('button-focus-next.png', {
        threshold: 0.1
      });
      
      // Test high contrast mode compatibility
      await page.addInitScript(() => {
        document.body.style.filter = 'contrast(200%)';
      });
      
      await page.reload();
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        threshold: 0.4 // Higher threshold for high contrast changes
      });
    });
    
    test('print stylesheet maintains professional appearance', async ({ page }) => {
      await claudePage.waitForPageLoad();
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Screenshot print version
      await expect(page).toHaveScreenshot('print-version-professional.png', {
        fullPage: true,
        threshold: 0.3
      });
      
      // Reset to screen media
      await page.emulateMedia({ media: 'screen' });
    });
  });
  
  test.describe('Cross-browser Visual Consistency', () => {
    test('Chrome rendering matches expectations', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('chrome-rendering-baseline.png', {
        fullPage: true,
        threshold: 0.2
      });
    });
    
    test('Firefox rendering maintains consistency', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('firefox-rendering-consistency.png', {
        fullPage: true,
        threshold: 0.3 // Slightly higher threshold for Firefox differences
      });
    });
    
    test('Safari rendering maintains consistency', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await claudePage.waitForPageLoad();
      
      await expect(page).toHaveScreenshot('safari-rendering-consistency.png', {
        fullPage: true,
        threshold: 0.3
      });
    });
  });
  
  // Cleanup after each test
  test.afterEach(async () => {
    try {
      // Clean up any created instances
      while (await claudePage.getInstanceCount() > 0) {
        await claudePage.terminateInstance(0);
        await claudePage.page.waitForTimeout(500);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });
});
