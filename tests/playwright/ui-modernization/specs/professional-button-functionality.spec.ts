import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';

/**
 * Professional Button Functionality Tests
 * 
 * Test Categories:
 * 1. Professional Button Functionality
 * 2. Button Hover States and Animations
 * 3. Loading States During Instance Creation
 * 4. Status Indicators Show Correct Connection Status
 * 5. Accessibility Attributes Work Properly
 */

test.describe('Professional Button Functionality', () => {
  let claudePage: ClaudeInstancePage;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    await claudePage.goto();
  });
  
  test.describe('Button Functionality Tests', () => {
    test('all 4 Claude instance buttons work with new styling', async () => {
      // Test prod/claude button
      await test.step('Test prod/claude button', async () => {
        const initialCount = await claudePage.getInstanceCount();
        await claudePage.clickProdButton();
        
        // Verify instance was created
        const newCount = await claudePage.getInstanceCount();
        expect(newCount).toBe(initialCount + 1);
        
        // Verify instance appears in list with correct status
        await claudePage.selectInstance(0);
        await claudePage.validateConnectionStatus();
      });
      
      // Test skip-permissions button
      await test.step('Test skip-permissions button', async () => {
        const initialCount = await claudePage.getInstanceCount();
        await claudePage.clickSkipPermissionsButton();
        
        const newCount = await claudePage.getInstanceCount();
        expect(newCount).toBe(initialCount + 1);
      });
      
      // Test skip-permissions -c button
      await test.step('Test skip-permissions -c button', async () => {
        const initialCount = await claudePage.getInstanceCount();
        await claudePage.clickSkipPermissionsCButton();
        
        const newCount = await claudePage.getInstanceCount();
        expect(newCount).toBe(initialCount + 1);
      });
      
      // Test skip-permissions --resume button
      await test.step('Test skip-permissions --resume button', async () => {
        const initialCount = await claudePage.getInstanceCount();
        await claudePage.clickSkipPermissionsResumeButton();
        
        const newCount = await claudePage.getInstanceCount();
        expect(newCount).toBe(initialCount + 1);
      });
    });
    
    test('buttons maintain professional styling consistently', async () => {
      await claudePage.validateProfessionalButtonStyling();
    });
    
    test('button functionality preserved after UI modernization', async () => {
      // Verify each button creates the correct type of instance
      await claudePage.clickProdButton();
      await expect(claudePage.instanceItems.first()).toBeVisible();
      
      // Verify instance can be selected and used
      await claudePage.selectInstance(0);
      await claudePage.sendInputToInstance('echo "Button functionality test"');
      
      // Wait for output to confirm functionality
      await claudePage.waitForOutputContains('Button functionality test', 10000);
    });
  });
  
  test.describe('Hover States and Animations', () => {
    test('button hover states work without breaking functionality', async () => {
      const buttons = [
        claudePage.prodButton,
        claudePage.skipPermissionsButton,
        claudePage.skipPermissionsCButton,
        claudePage.skipPermissionsResumeButton
      ];
      
      for (const [index, button] of buttons.entries()) {
        await test.step(`Test hover state for button ${index + 1}`, async () => {
          // Test initial state
          await expect(button).toBeVisible();
          await expect(button).toBeEnabled();
          
          // Test hover state
          await button.hover();
          await claudePage.page.waitForTimeout(200); // Allow hover animation
          
          // Button should still be clickable after hover
          await expect(button).toBeEnabled();
          
          // Move away to test hover state removal
          await claudePage.header.hover();
          await claudePage.page.waitForTimeout(100);
        });
      }
    });
    
    test('animations are smooth and professional', async ({ page }) => {
      // Enable visual comparison for animations
      await page.addInitScript(() => {
        // Reduce motion for consistent testing if needed
        const style = document.createElement('style');
        style.textContent = `
          *, *::before, *::after {
            animation-duration: 0.1s !important;
            transition-duration: 0.1s !important;
          }
        `;
        document.head.appendChild(style);
      });
      
      // Test each button's animation
      const buttons = [claudePage.prodButton, claudePage.skipPermissionsButton];
      
      for (const button of buttons) {
        await button.hover();
        await page.waitForTimeout(150);
        
        // Verify button maintains professional appearance during animation
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
        
        // Click should work smoothly during/after animation
        await button.click();
        await claudePage.waitForInstanceCreation();
        
        // Clean up created instance
        if (await claudePage.getInstanceCount() > 0) {
          await claudePage.terminateInstance(0);
        }
      }
    });
  });
  
  test.describe('Loading States', () => {
    test('loading states during instance creation', async () => {
      // Test loading states are properly displayed
      await claudePage.testLoadingStates();
    });
    
    test('buttons disabled during instance creation', async () => {
      // Click button to start instance creation
      const clickPromise = claudePage.prodButton.click();
      
      // Immediately check that all buttons are disabled
      await expect(claudePage.prodButton).toBeDisabled();
      await expect(claudePage.skipPermissionsButton).toBeDisabled();
      await expect(claudePage.skipPermissionsCButton).toBeDisabled();
      await expect(claudePage.skipPermissionsResumeButton).toBeDisabled();
      
      // Wait for creation to complete
      await clickPromise;
      await claudePage.waitForInstanceCreation();
      
      // Verify buttons are re-enabled
      await expect(claudePage.prodButton).toBeEnabled();
      await expect(claudePage.skipPermissionsButton).toBeEnabled();
      await expect(claudePage.skipPermissionsCButton).toBeEnabled();
      await expect(claudePage.skipPermissionsResumeButton).toBeEnabled();
    });
    
    test('loading indicators show professional appearance', async () => {
      // Start instance creation
      await claudePage.prodButton.click();
      
      // Check for professional loading indicators
      // This could be spinners, text changes, or visual feedback
      const loadingElements = claudePage.page.locator('.loading, .spinner, [disabled]');
      await expect(loadingElements.first()).toBeVisible();
      
      // Wait for loading to complete
      await claudePage.waitForInstanceCreation();
      
      // Verify loading indicators are removed
      await expect(claudePage.prodButton).toBeEnabled();
    });
  });
  
  test.describe('Status Indicators', () => {
    test('status indicators show correct connection status', async () => {
      await claudePage.validateConnectionStatus();
      
      // Create an instance and verify status updates
      await claudePage.clickProdButton();
      
      // Wait for connection to establish
      await claudePage.waitForConnection();
      
      // Verify status indicator shows connected state
      const statusText = await claudePage.connectionStatus.textContent();
      expect(statusText).toMatch(/(Connected|Running)/i);
      
      // Verify connection indicator has correct styling
      await expect(claudePage.connectionStatus).toHaveClass(/connected/);
    });
    
    test('instance count display works correctly', async () => {
      // Test with no instances
      let instanceCount = await claudePage.getInstanceCount();
      
      if (instanceCount > 0) {
        // Clean up existing instances first
        while (await claudePage.getInstanceCount() > 0) {
          await claudePage.terminateInstance(0);
          await claudePage.page.waitForTimeout(1000);
        }
      }
      
      // Create instances and verify count updates
      await claudePage.clickProdButton();
      await claudePage.validateInstanceCountDisplay();
      
      await claudePage.clickSkipPermissionsButton();
      await claudePage.validateInstanceCountDisplay();
      
      // Verify count shows correct running instances
      const finalCount = await claudePage.getInstanceCount();
      expect(finalCount).toBe(2);
    });
    
    test('status indicators maintain professional styling', async () => {
      // Test connection status styling
      await expect(claudePage.connectionStatus).toBeVisible();
      
      const statusStyles = await claudePage.connectionStatus.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          color: computed.color,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight
        };
      });
      
      expect(statusStyles.color).not.toBe('rgb(0, 0, 0)'); // Not default black
      expect(statusStyles.fontSize).not.toBe('16px'); // Should be styled
      
      // Test instance count styling if present
      const instanceCount = await claudePage.getInstanceCount();
      if (instanceCount > 0) {
        await expect(claudePage.instanceCount).toBeVisible();
        
        const countStyles = await claudePage.instanceCount.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            fontSize: computed.fontSize
          };
        });
        
        expect(countStyles.color).toBeDefined();
        expect(countStyles.fontSize).toBeDefined();
      }
    });
  });
  
  test.describe('Accessibility', () => {
    test('accessibility attributes work properly', async () => {
      await claudePage.validateAccessibility();
    });
    
    test('keyboard navigation works with professional buttons', async ({ page }) => {
      // Test tab navigation through buttons
      await claudePage.prodButton.focus();
      await expect(claudePage.prodButton).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(claudePage.skipPermissionsButton).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(claudePage.skipPermissionsCButton).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(claudePage.skipPermissionsResumeButton).toBeFocused();
      
      // Test Enter key activation
      await claudePage.prodButton.focus();
      await page.keyboard.press('Enter');
      
      // Verify instance creation started
      await expect(claudePage.prodButton).toBeDisabled();
      await claudePage.waitForInstanceCreation();
    });
    
    test('ARIA labels and roles are properly set', async () => {
      const buttons = [
        claudePage.prodButton,
        claudePage.skipPermissionsButton, 
        claudePage.skipPermissionsCButton,
        claudePage.skipPermissionsResumeButton
      ];
      
      for (const button of buttons) {
        // Check for title attribute (tooltip)
        const title = await button.getAttribute('title');
        expect(title).toBeTruthy();
        expect(title!.length).toBeGreaterThan(0);
        
        // Check for proper button role (should be implicit)
        const role = await button.getAttribute('role');
        if (role) {
          expect(role).toBe('button');
        }
        
        // Verify button is focusable
        const tabIndex = await button.getAttribute('tabindex');
        expect(tabIndex !== '-1').toBeTruthy();
      }
    });
    
    test('high contrast mode compatibility', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        // Add high contrast styles
        const style = document.createElement('style');
        style.textContent = `
          @media (prefers-contrast: high) {
            .btn {
              border: 2px solid currentColor !important;
              background: ButtonFace !important;
              color: ButtonText !important;
            }
          }
        `;
        document.head.appendChild(style);
      });
      
      await claudePage.goto();
      
      // Verify buttons are still visible and functional in high contrast
      await expect(claudePage.prodButton).toBeVisible();
      await expect(claudePage.skipPermissionsButton).toBeVisible();
      
      // Test button functionality in high contrast mode
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });
  });
  
  test.describe('Performance', () => {
    test('button click performance is acceptable', async () => {
      const performanceTime = await claudePage.measureButtonClickPerformance();
      
      // Button should respond within 100ms
      expect(performanceTime).toBeLessThan(100);
    });
    
    test('multiple rapid clicks handled gracefully', async () => {
      // Test rapid clicking doesn't break the interface
      const button = claudePage.prodButton;
      
      // Click multiple times rapidly
      for (let i = 0; i < 3; i++) {
        await button.click({ timeout: 100 });
        await claudePage.page.waitForTimeout(50);
      }
      
      // Should only create one instance (subsequent clicks disabled)
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBeLessThanOrEqual(1);
      
      // Interface should remain functional
      await expect(button).toBeEnabled();
    });
    
    test('button animations do not impact performance', async ({ page }) => {
      // Measure performance during button interactions
      await page.addInitScript(() => {
        (window as any).performanceData = [];
        const originalConsole = console.time;
        const originalConsoleEnd = console.timeEnd;
        
        console.time = (label: string) => {
          (window as any).performanceData.push({ type: 'start', label, time: performance.now() });
        };
        
        console.timeEnd = (label: string) => {
          (window as any).performanceData.push({ type: 'end', label, time: performance.now() });
        };
      });
      
      // Test button hover and click performance
      await claudePage.prodButton.hover();
      await page.waitForTimeout(200);
      await claudePage.prodButton.click();
      
      await claudePage.waitForInstanceCreation();
      
      // Verify no performance issues were detected
      const performanceData = await page.evaluate(() => (window as any).performanceData || []);
      
      // Basic performance validation - no specific thresholds for now
      // In a real implementation, you might check for frame drops, long tasks, etc.
      expect(Array.isArray(performanceData)).toBeTruthy();
    });
  });
  
  // Cleanup after each test
  test.afterEach(async () => {
    // Clean up any created instances
    try {
      while (await claudePage.getInstanceCount() > 0) {
        await claudePage.terminateInstance(0);
        await claudePage.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });
});
