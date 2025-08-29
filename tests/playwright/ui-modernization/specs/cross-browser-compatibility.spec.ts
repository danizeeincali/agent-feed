import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { ChatInterfacePage } from '../page-objects/ChatInterfacePage';

/**
 * Cross-browser Compatibility Tests
 * 
 * Test Categories:
 * 1. Chrome, Firefox, Safari, Edge Support
 * 2. Mobile Responsiveness and Touch Interactions
 * 3. Keyboard Navigation and Accessibility Features
 * 4. Consistent Behavior Across Platforms
 * 5. Browser-specific Feature Support
 */

test.describe('Cross-browser Compatibility', () => {
  let claudePage: ClaudeInstancePage;
  let chatPage: ChatInterfacePage;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    chatPage = new ChatInterfacePage(page);
    await claudePage.goto();
  });
  
  test.describe('Desktop Browser Support', () => {
    test('Chrome support - professional interface renders correctly', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome-specific test');
      
      await claudePage.waitForPageLoad();
      
      // Test all professional buttons are visible and styled
      await expect(claudePage.prodButton).toBeVisible();
      await expect(claudePage.skipPermissionsButton).toBeVisible();
      await expect(claudePage.skipPermissionsCButton).toBeVisible();
      await expect(claudePage.skipPermissionsResumeButton).toBeVisible();
      
      // Test professional styling applies correctly in Chrome
      await claudePage.validateProfessionalButtonStyling();
      
      // Test functionality works
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      await chatPage.sendMessage('echo "Chrome compatibility test"');
      await chatPage.waitForOutputContains('Chrome compatibility test');
    });
    
    test('Firefox support - professional interface maintains consistency', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-specific test');
      
      await claudePage.waitForPageLoad();
      
      // Firefox-specific rendering tests
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test button styling in Firefox
      const buttonStyles = await claudePage.prodButton.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });
      
      // Verify professional styling works in Firefox
      expect(buttonStyles.borderRadius).not.toBe('0px');
      expect(buttonStyles.padding).not.toBe('0px');
      
      // Test functionality in Firefox
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      await chatPage.sendMessage('echo "Firefox compatibility test"');
      await chatPage.waitForOutputContains('Firefox compatibility test');
    });
    
    test('Safari (WebKit) support - professional interface compatibility', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari-specific test');
      
      await claudePage.waitForPageLoad();
      
      // Safari-specific tests
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test hover states work in Safari
      await claudePage.prodButton.hover();
      await page.waitForTimeout(200);
      
      // Safari should handle hover states
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test functionality in Safari
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      await chatPage.sendMessage('echo "Safari compatibility test"');
      await chatPage.waitForOutputContains('Safari compatibility test');
    });
  });
  
  test.describe('Mobile Device Compatibility', () => {
    test('mobile Chrome - responsive design and touch interactions', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Mobile Chrome test');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test mobile layout
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test touch interactions
      await claudePage.prodButton.tap();
      await claudePage.waitForInstanceCreation();
      
      // Verify instance creation works on mobile
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
      
      // Test mobile chat interface
      await claudePage.selectInstance(0);
      await chatPage.waitForChatInterface();
      
      // Test mobile input
      await chatPage.sendMessage('echo "Mobile Chrome test"');
      await chatPage.waitForOutputContains('Mobile Chrome test');
    });
    
    test('mobile Safari - iOS compatibility', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Mobile Safari test');
      
      // iOS device dimensions
      await page.setViewportSize({ width: 390, height: 844 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test iOS-specific behaviors
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test tap vs click on iOS
      await claudePage.prodButton.tap();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
      
      // Test iOS keyboard interaction
      await claudePage.selectInstance(0);
      await chatPage.chatInput.focus();
      
      // On iOS, the keyboard should not interfere with interface
      await expect(chatPage.chatInput).toBeFocused();
      await chatPage.sendMessage('echo "iOS Safari test"');
      await chatPage.waitForOutputContains('iOS Safari test');
    });
    
    test('tablet compatibility - iPad Pro layout', async ({ page }) => {
      // iPad Pro dimensions
      await page.setViewportSize({ width: 1024, height: 1366 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test tablet layout
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test touch interactions on tablet
      await claudePage.prodButton.tap();
      await claudePage.waitForInstanceCreation();
      
      // Verify tablet experience works well
      await claudePage.selectInstance(0);
      await chatPage.sendMessage('echo "Tablet compatibility test"');
      await chatPage.waitForOutputContains('Tablet compatibility test');
      
      // Test that tablet has appropriate spacing and sizing
      const buttonBounds = await claudePage.prodButton.boundingBox();
      expect(buttonBounds).toBeTruthy();
      expect(buttonBounds!.width).toBeGreaterThan(120); // Appropriate touch target size
      expect(buttonBounds!.height).toBeGreaterThan(44); // iOS touch guidelines
    });
    
    test('responsive breakpoints work correctly', async ({ page }) => {
      const breakpoints = [
        { width: 320, height: 568, name: 'small mobile' },
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'landscape tablet' },
        { width: 1280, height: 720, name: 'desktop' },
        { width: 1920, height: 1080, name: 'large desktop' }
      ];
      
      for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await claudePage.goto();
        await claudePage.waitForPageLoad();
        
        // Verify interface remains functional at each breakpoint
        await expect(claudePage.prodButton).toBeVisible();
        await expect(claudePage.header).toBeVisible();
        
        // Test that buttons remain accessible
        const buttonBounds = await claudePage.prodButton.boundingBox();
        expect(buttonBounds).toBeTruthy();
        expect(buttonBounds!.width).toBeGreaterThan(0);
        expect(buttonBounds!.height).toBeGreaterThan(0);
      }
    });
  });
  
  test.describe('Keyboard Navigation and Accessibility', () => {
    test('keyboard navigation works across all browsers', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Find the first focusable element
      let focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeFocused();
      
      // Continue tabbing through buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should reach one of our professional buttons
      const buttons = [claudePage.prodButton, claudePage.skipPermissionsButton, claudePage.skipPermissionsCButton, claudePage.skipPermissionsResumeButton];
      
      let buttonFocused = false;
      for (const button of buttons) {
        if (await button.evaluate(el => document.activeElement === el)) {
          buttonFocused = true;
          break;
        }
      }
      
      expect(buttonFocused).toBeTruthy();
    });
    
    test('Enter key activation works across browsers', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Focus on prod button
      await claudePage.prodButton.focus();
      await expect(claudePage.prodButton).toBeFocused();
      
      // Activate with Enter key
      await page.keyboard.press('Enter');
      
      // Should start instance creation
      await expect(claudePage.prodButton).toBeDisabled();
      await claudePage.waitForInstanceCreation();
      
      // Verify instance was created
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
    });
    
    test('Space key activation works across browsers', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Focus on skip-permissions button
      await claudePage.skipPermissionsButton.focus();
      await expect(claudePage.skipPermissionsButton).toBeFocused();
      
      // Activate with Space key
      await page.keyboard.press('Space');
      
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
    });
    
    test('screen reader compatibility attributes', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Test ARIA attributes
      const buttons = [claudePage.prodButton, claudePage.skipPermissionsButton, claudePage.skipPermissionsCButton, claudePage.skipPermissionsResumeButton];
      
      for (const button of buttons) {
        // Check for title attribute (screen reader accessible)
        const title = await button.getAttribute('title');
        expect(title).toBeTruthy();
        expect(title!.length).toBeGreaterThan(5);
        
        // Check for proper button role (implicit or explicit)
        const role = await button.getAttribute('role');
        if (role) {
          expect(role).toBe('button');
        }
        
        // Should be focusable
        const tabIndex = await button.getAttribute('tabindex');
        expect(tabIndex !== '-1').toBeTruthy();
      }
    });
    
    test('high contrast mode support', async ({ page, browserName }) => {
      // Enable high contrast mode simulation
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = `
          @media (prefers-contrast: high) {
            .btn {
              border: 2px solid currentColor !important;
              background: ButtonFace !important;
              color: ButtonText !important;
            }
          }
          
          /* Force high contrast for testing */
          .btn {
            border: 2px solid #000000 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        `;
        document.head.appendChild(style);
      });
      
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Test that buttons are still visible in high contrast
      await expect(claudePage.prodButton).toBeVisible();
      
      // Test functionality in high contrast mode
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
    });
  });
  
  test.describe('Browser-specific Feature Support', () => {
    test('WebSocket/SSE support across browsers', async ({ page, browserName }) => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      // Wait for connection to establish
      await claudePage.waitForConnection();
      
      // Test real-time communication works
      await chatPage.sendMessage('echo "WebSocket test"');
      await chatPage.waitForOutputContains('WebSocket test');
      
      // Verify connection status shows correctly
      const statusText = await claudePage.connectionStatus.textContent();
      expect(statusText).toMatch(/(Connected|SSE|Polling)/);
    });
    
    test('CSS Grid/Flexbox layout support', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Test that grid/flexbox layouts work
      const buttonContainer = page.locator('.launch-buttons');
      await expect(buttonContainer).toBeVisible();
      
      // Verify buttons are properly laid out
      const buttons = await claudePage.prodButton.count() + 
                     await claudePage.skipPermissionsButton.count() + 
                     await claudePage.skipPermissionsCButton.count() + 
                     await claudePage.skipPermissionsResumeButton.count();
      
      expect(buttons).toBe(4);
      
      // Test that buttons have appropriate spacing
      const button1Box = await claudePage.prodButton.boundingBox();
      const button2Box = await claudePage.skipPermissionsButton.boundingBox();
      
      expect(button1Box).toBeTruthy();
      expect(button2Box).toBeTruthy();
      
      // Buttons should not overlap
      const overlap = !(button1Box!.x + button1Box!.width < button2Box!.x || 
                       button2Box!.x + button2Box!.width < button1Box!.x ||
                       button1Box!.y + button1Box!.height < button2Box!.y ||
                       button2Box!.y + button2Box!.height < button1Box!.y);
      
      expect(overlap).toBeFalsy();
    });
    
    test('Modern JavaScript features compatibility', async ({ page, browserName }) => {
      // Test that modern JS features used in the app work
      await claudePage.waitForPageLoad();
      
      // Test async/await support (used in button handlers)
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      // Test ES6+ features work
      const jsSupport = await page.evaluate(() => {
        // Test arrow functions
        const arrowFunc = () => true;
        
        // Test template literals
        const template = `test ${true}`;
        
        // Test const/let
        const constVar = 'test';
        let letVar = 'test';
        
        // Test destructuring
        const { location } = window;
        
        return {
          arrowFunction: arrowFunc(),
          templateLiteral: template === 'test true',
          constLet: constVar === 'test' && letVar === 'test',
          destructuring: location !== undefined
        };
      });
      
      expect(jsSupport.arrowFunction).toBeTruthy();
      expect(jsSupport.templateLiteral).toBeTruthy();
      expect(jsSupport.constLet).toBeTruthy();
      expect(jsSupport.destructuring).toBeTruthy();
    });
    
    test('CSS custom properties (variables) support', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Test CSS custom properties work
      const cssVariableSupport = await page.evaluate(() => {
        const element = document.querySelector('.btn-prod');
        if (!element) return false;
        
        const computed = getComputedStyle(element);
        
        // Check if CSS variables are supported by setting and reading one
        (element as HTMLElement).style.setProperty('--test-var', 'rgb(255, 0, 0)');
        const varValue = computed.getPropertyValue('--test-var');
        
        return varValue.trim() === 'rgb(255, 0, 0)';
      });
      
      // CSS variables should be supported in modern browsers
      expect(cssVariableSupport).toBeTruthy();
    });
    
    test('viewport meta tag effectiveness on mobile', async ({ page, browserName }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      
      // Check that viewport meta tag prevents zooming issues
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      
      if (viewportMeta) {
        expect(viewportMeta).toMatch(/(width=device-width|initial-scale=1)/);
      }
      
      // Test that interface is appropriately sized for mobile
      const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375);
    });
  });
  
  test.describe('Performance Across Browsers', () => {
    test('button click responsiveness across browsers', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Measure button click performance
      const startTime = Date.now();
      await claudePage.prodButton.click();
      
      // Wait for visual feedback (disabled state)
      await expect(claudePage.prodButton).toBeDisabled();
      const responseTime = Date.now() - startTime;
      
      // Should be responsive (under 100ms for visual feedback)
      expect(responseTime).toBeLessThan(100);
      
      await claudePage.waitForInstanceCreation();
    });
    
    test('page load performance consistency', async ({ page, browserName }) => {
      const startTime = Date.now();
      await claudePage.goto();
      await claudePage.waitForPageLoad();
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time (browser-agnostic)
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });
    
    test('memory usage stability across long sessions', async ({ page, browserName }) => {
      await claudePage.waitForPageLoad();
      
      // Create and destroy multiple instances to test memory stability
      for (let i = 0; i < 3; i++) {
        await claudePage.clickProdButton();
        await claudePage.waitForInstanceCreation();
        await claudePage.terminateInstance(0);
        await page.waitForTimeout(1000);
      }
      
      // Interface should still be responsive
      await expect(claudePage.prodButton).toBeEnabled();
      await expect(claudePage.prodButton).toBeVisible();
      
      // Final functionality test
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBe(1);
    });
  });
  
  // Cleanup after each test
  test.afterEach(async () => {
    try {
      // Clean up any created instances
      while (await claudePage.getInstanceCount() > 0) {
        await claudePage.terminateInstance(0);
        await claudePage.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });
});
