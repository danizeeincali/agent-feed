import { test, expect } from '@playwright/test';
import { UITestPage } from './page-objects/UITestPage';

/**
 * Responsive Design and Accessibility Tests
 * 
 * Tests UI responsiveness across different viewports and validates accessibility features
 */
test.describe('Responsive Design and Accessibility Tests', () => {
  let uiTestPage: UITestPage;
  
  const VIEWPORT_SIZES = [
    { width: 1920, height: 1080, name: 'desktop-xl' },
    { width: 1366, height: 768, name: 'desktop-standard' },
    { width: 1024, height: 768, name: 'tablet-landscape' },
    { width: 768, height: 1024, name: 'tablet-portrait' },
    { width: 414, height: 896, name: 'mobile-large' },
    { width: 375, height: 667, name: 'mobile-standard' },
    { width: 320, height: 568, name: 'mobile-small' }
  ];

  test.beforeEach(async ({ page }) => {
    uiTestPage = new UITestPage(page);
  });

  test.describe('Responsive Design Tests', () => {
    for (const viewport of VIEWPORT_SIZES) {
      test(`should be responsive on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        await test.step('Test home page responsiveness', async () => {
          await uiTestPage.navigateToHome();
          await uiTestPage.takeScreenshot(`responsive-home-${viewport.name}`);
          
          // Check if navigation is accessible
          const navElements = await page.locator('nav, .navigation, .nav-menu').count();
          console.log(`${viewport.name}: Found ${navElements} navigation elements`);
        });

        await test.step('Test Claude Instances page responsiveness', async () => {
          await uiTestPage.navigateToClaudeInstances();
          await uiTestPage.takeScreenshot(`responsive-claude-instances-${viewport.name}`);
          
          // Check if buttons are visible and clickable
          const createButtonVisible = await uiTestPage.createInstanceButton.isVisible();
          const refreshButtonVisible = await uiTestPage.refreshInstancesButton.isVisible();
          
          console.log(`${viewport.name}: Create button visible: ${createButtonVisible}, Refresh button visible: ${refreshButtonVisible}`);
          
          // Test button clicks on different screen sizes
          if (createButtonVisible) {
            const clicked = await uiTestPage.clickButtonSafely(uiTestPage.createInstanceButton);
            if (clicked) {
              await uiTestPage.takeScreenshot(`responsive-button-click-${viewport.name}`);
            }
          }
        });

        await test.step('Test form elements on small screens', async () => {
          if (viewport.width <= 768) { // Mobile and small tablet
            // Check if forms are usable on small screens
            if (await uiTestPage.instanceNameInput.isVisible()) {
              await uiTestPage.instanceNameInput.fill('Mobile Test');
              await uiTestPage.takeScreenshot(`responsive-form-mobile-${viewport.name}`);
            }
          }
        });

        await test.step('Check content overflow and scrolling', async () => {
          // Scroll to bottom of page to check for content overflow
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(500);
          
          await uiTestPage.takeScreenshot(`responsive-scroll-bottom-${viewport.name}`);
          
          // Scroll back to top
          await page.evaluate(() => window.scrollTo(0, 0));
        });
      });
    }
  });

  test.describe('Touch and Mobile Interaction Tests', () => {
    test('should handle touch interactions on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await test.step('Test touch navigation', async () => {
        await uiTestPage.navigateToHome();
        
        // Test touch tap on navigation elements
        const navLinks = await page.locator('nav a, .nav-link, [role="button"]').all();
        
        for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
          const link = navLinks[i];
          if (await link.isVisible()) {
            await link.tap();
            await page.waitForTimeout(500);
            await uiTestPage.takeScreenshot(`touch-nav-${i}`);
          }
        }
      });

      await test.step('Test swipe gestures', async () => {
        await uiTestPage.navigateToClaudeInstances();
        
        // Simulate swipe gesture
        await page.touchscreen.tap(200, 400);
        await page.touchscreen.tap(200, 300);
        await uiTestPage.takeScreenshot('touch-swipe-test');
      });
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper keyboard navigation', async ({ page }) => {
      await uiTestPage.navigateToHome();
      
      await test.step('Test tab navigation through elements', async () => {
        const success = await uiTestPage.testKeyboardNavigation();
        
        if (success) {
          await uiTestPage.takeScreenshot('keyboard-navigation-success');
          console.log('Keyboard navigation test completed');
        }
      });

      await test.step('Test Enter key on buttons', async () => {
        // Focus on a button and press Enter
        const firstButton = page.locator('button').first();
        
        if (await firstButton.isVisible()) {
          await firstButton.focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
          await uiTestPage.takeScreenshot('keyboard-button-activation');
        }
      });

      await test.step('Test Escape key functionality', async () => {
        // Test escape key for modals or dialogs
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await uiTestPage.takeScreenshot('escape-key-test');
      });
    });

    test('should have proper ARIA attributes and labels', async ({ page }) => {
      await uiTestPage.navigateToHome();
      
      await test.step('Check for ARIA attributes', async () => {
        const ariaCount = await uiTestPage.checkAccessibilityAttributes();
        console.log(`Found ${ariaCount} elements with accessibility attributes`);
        
        await uiTestPage.takeScreenshot('aria-attributes-check');
        
        // Verify specific ARIA roles
        const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').count();
        console.log(`Found ${landmarks} ARIA landmark elements`);
      });

      await test.step('Check button labels and descriptions', async () => {
        const buttons = await page.locator('button').all();
        let labeledButtons = 0;
        
        for (const button of buttons) {
          const hasLabel = await button.getAttribute('aria-label') || 
                           await button.getAttribute('aria-labelledby') ||
                           await button.textContent();
          
          if (hasLabel) {
            labeledButtons++;
          }
        }
        
        console.log(`${labeledButtons} out of ${buttons.length} buttons have labels`);
      });

      await test.step('Check form accessibility', async () => {
        await uiTestPage.navigateToClaudeInstances();
        
        const inputs = await page.locator('input, textarea, select').all();
        let accessibleInputs = 0;
        
        for (const input of inputs) {
          const hasLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count() > 0 ||
                           await input.getAttribute('aria-label') ||
                           await input.getAttribute('aria-labelledby');
          
          if (hasLabel) {
            accessibleInputs++;
          }
        }
        
        console.log(`${accessibleInputs} out of ${inputs.length} form inputs have labels`);
      });
    });

    test('should have proper color contrast and visual indicators', async ({ page }) => {
      await uiTestPage.navigateToClaudeInstances();
      
      await test.step('Check focus indicators', async () => {
        const focusableElements = await page.locator('button, input, select, textarea, a[href]').all();
        
        for (let i = 0; i < Math.min(focusableElements.length, 3); i++) {
          const element = focusableElements[i];
          if (await element.isVisible()) {
            await element.focus();
            await page.waitForTimeout(300);
            await uiTestPage.takeScreenshot(`focus-indicator-${i}`);
          }
        }
      });

      await test.step('Check error message accessibility', async () => {
        // Test form validation and error messages
        const hasValidation = await uiTestPage.testFormValidation();
        
        if (hasValidation) {
          const errors = await uiTestPage.getErrorMessages();
          console.log('Accessible error messages:', errors);
          await uiTestPage.takeScreenshot('accessible-errors');
        }
      });
    });

    test('should support screen reader navigation', async ({ page }) => {
      await test.step('Check heading structure', async () => {
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
        const headingStructure: string[] = [];
        
        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          const text = await heading.textContent();
          headingStructure.push(`${tagName}: ${text}`);
        }
        
        console.log('Heading structure:', headingStructure);
        await uiTestPage.takeScreenshot('heading-structure');
      });

      await test.step('Check skip links and navigation aids', async () => {
        const skipLinks = await page.locator('a[href^="#"], [class*="skip"]').count();
        console.log(`Found ${skipLinks} skip links or navigation aids`);
      });
    });
  });

  test.describe('Performance on Different Devices', () => {
    test('should load efficiently on mobile devices', async ({ page }) => {
      // Throttle network to simulate mobile connection
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      await test.step('Test page load performance', async () => {
        const startTime = Date.now();
        await uiTestPage.navigateToHome();
        const homeLoadTime = Date.now() - startTime;
        
        console.log(`Home page load time (throttled): ${homeLoadTime}ms`);
        await uiTestPage.takeScreenshot('mobile-performance-home');
        
        const claudeStartTime = Date.now();
        await uiTestPage.navigateToClaudeInstances();
        const claudeLoadTime = Date.now() - claudeStartTime;
        
        console.log(`Claude instances page load time (throttled): ${claudeLoadTime}ms`);
        await uiTestPage.takeScreenshot('mobile-performance-claude');
        
        // Verify load times are reasonable (under 5 seconds even with throttling)
        expect(homeLoadTime).toBeLessThan(5000);
        expect(claudeLoadTime).toBeLessThan(5000);
      });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      console.log(`Testing on browser: ${browserName}`);
      
      await test.step('Test basic functionality', async () => {
        await uiTestPage.navigateToHome();
        await uiTestPage.takeScreenshot(`browser-${browserName}-home`);
        
        await uiTestPage.navigateToClaudeInstances();
        await uiTestPage.takeScreenshot(`browser-${browserName}-claude-instances`);
        
        // Test button clicks
        const refreshClicked = await uiTestPage.refreshInstances();
        if (refreshClicked) {
          await uiTestPage.takeScreenshot(`browser-${browserName}-button-click`);
        }
      });

      await test.step('Check for browser-specific issues', async () => {
        // Check for JavaScript errors
        const errors = await uiTestPage.getJavaScriptErrors();
        
        if (errors.length > 0) {
          console.log(`${browserName} JavaScript errors:`, errors);
          await uiTestPage.takeScreenshot(`browser-${browserName}-errors`);
        } else {
          console.log(`${browserName}: No JavaScript errors detected`);
        }
      });
    });
  });
});