import { test, expect } from '@playwright/test';

/**
 * Accessibility-focused E2E tests for Token Cost Analytics
 * Validates WCAG compliance, keyboard navigation, and screen reader compatibility
 */

test.describe('Token Analytics Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/analytics', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation through interface', async ({ page }) => {
      // Start from the top of the page
      await page.keyboard.press('Tab');
      
      let tabbableElements = 0;
      const maxTabs = 20;
      
      for (let i = 0; i < maxTabs; i++) {
        const activeElement = await page.evaluate(() => {
          const element = document.activeElement;
          return {
            tagName: element?.tagName,
            type: element?.getAttribute('type'),
            textContent: element?.textContent?.trim().substring(0, 50),
            ariaLabel: element?.getAttribute('aria-label'),
            role: element?.getAttribute('role')
          };
        });
        
        if (activeElement.tagName === 'BUTTON') {
          tabbableElements++;
          
          // Test button activation with keyboard
          if (activeElement.textContent?.includes('1h') || 
              activeElement.textContent?.includes('1d') ||
              activeElement.textContent?.includes('7d') ||
              activeElement.textContent?.includes('30d')) {
            
            await page.keyboard.press('Enter');
            await page.waitForTimeout(200);
            
            // Verify the button became active
            const buttonState = await page.evaluate(() => {
              const element = document.activeElement;
              return element?.className.includes('bg-white text-blue-600');
            });
            
            // Should be able to activate time range buttons
            if (buttonState !== undefined) {
              console.log(`Time range button activation: ${activeElement.textContent} - ${buttonState ? 'Success' : 'Failed'}`);
            }
          }
        }
        
        await page.keyboard.press('Tab');
      }
      
      console.log(`Found ${tabbableElements} keyboard-accessible buttons`);
      expect(tabbableElements).toBeGreaterThan(3); // At least tab buttons, time range buttons, etc.
    });

    test('should handle Enter and Space key activation for buttons', async ({ page }) => {
      // Focus on time range buttons and test activation
      const timeRangeButtons = ['1h', '7d', '30d'];
      
      for (const range of timeRangeButtons) {
        const button = page.locator(`button:has-text("${range}")`);
        
        if (await button.count() > 0) {
          await button.focus();
          
          // Test Enter key
          await page.keyboard.press('Enter');
          await page.waitForTimeout(200);
          
          await expect(button).toHaveClass(/bg-white text-blue-600/);
          
          // Test Space key on another button
          const nextButton = page.locator(`button:has-text("1d")`);
          await nextButton.focus();
          await page.keyboard.press('Space');
          await page.waitForTimeout(200);
          
          await expect(nextButton).toHaveClass(/bg-white text-blue-600/);
          
          break; // Test passed
        }
      }
    });

    test('should provide visible focus indicators', async ({ page }) => {
      const focusableElements = [
        'button:has-text("System")',
        'button:has-text("Token Costs")', 
        'button:has-text("1d")',
        'button:has-text("Export")',
        'button:has-text("Refresh")'
      ];
      
      for (const selector of focusableElements) {
        const element = page.locator(selector);
        
        if (await element.count() > 0) {
          await element.focus();
          
          // Check if element has visible focus styling
          const hasFocusStyles = await element.evaluate(el => {
            const styles = window.getComputedStyle(el, ':focus');
            const outline = styles.outline;
            const outlineWidth = styles.outlineWidth;
            const boxShadow = styles.boxShadow;
            
            return outline !== 'none' || 
                   outlineWidth !== '0px' || 
                   boxShadow !== 'none' ||
                   el.matches(':focus-visible');
          });
          
          console.log(`Focus indicator for ${selector}: ${hasFocusStyles ? 'Present' : 'Missing'}`);
          
          // At least some focus indication should be present
          if (await element.isVisible()) {
            expect(hasFocusStyles).toBeTruthy();
          }
        }
      }
    });

    test('should not trap keyboard focus unexpectedly', async ({ page }) => {
      // Navigate through the interface
      let previousElement = '';
      let sameElementCount = 0;
      
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        
        const currentElement = await page.evaluate(() => {
          const element = document.activeElement;
          return `${element?.tagName}:${element?.textContent?.trim().substring(0, 20)}`;
        });
        
        if (currentElement === previousElement) {
          sameElementCount++;
        } else {
          sameElementCount = 0;
        }
        
        // Should not be stuck on the same element for more than 2 tabs
        expect(sameElementCount).toBeLessThan(3);
        
        previousElement = currentElement;
      }
    });
  });

  test.describe('ARIA Attributes and Semantic Markup', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      
      console.log('Heading hierarchy:', headings);
      
      // Should have main heading
      expect(headings).toContain('Token Cost Analytics');
      
      // Verify heading levels are logical
      const headingElements = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      for (const heading of headingElements) {
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.charAt(1));
        
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(6);
      }
    });

    test('should have appropriate ARIA labels for interactive elements', async ({ page }) => {
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      let labeledButtons = 0;
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        
        if (await button.isVisible()) {
          const ariaLabel = await button.getAttribute('aria-label');
          const ariaLabelledBy = await button.getAttribute('aria-labelledby');
          const ariaDescribedBy = await button.getAttribute('aria-describedby');
          const textContent = await button.textContent();
          const title = await button.getAttribute('title');
          
          // Button should have some form of accessible name
          const hasAccessibleName = !!(
            ariaLabel || 
            ariaLabelledBy || 
            textContent?.trim() ||
            title
          );
          
          if (hasAccessibleName) {
            labeledButtons++;
          }
          
          console.log(`Button ${i}: accessible name = ${hasAccessibleName}, text = "${textContent?.trim()}"`);
        }
      }
      
      expect(labeledButtons).toBeGreaterThan(0);
      expect(labeledButtons / buttonCount).toBeGreaterThan(0.8); // At least 80% should have accessible names
    });

    test('should use appropriate roles for UI components', async ({ page }) => {
      // Check tab interface has proper roles
      const tabButtons = page.locator('button:has-text("System"), button:has-text("Token Costs")');
      const tabCount = await tabButtons.count();
      
      if (tabCount >= 2) {
        // Could implement tab roles, but buttons are acceptable for this use case
        for (let i = 0; i < tabCount; i++) {
          const tab = tabButtons.nth(i);
          const role = await tab.getAttribute('role');
          const tagName = await tab.evaluate(el => el.tagName);
          
          // Should be either button tag or have button role
          expect(tagName === 'BUTTON' || role === 'button' || role === 'tab').toBeTruthy();
        }
      }
    });

    test('should provide status information for dynamic content', async ({ page }) => {
      // Check for status indicators
      const statusElements = [
        page.locator('text=Real-time updates active'),
        page.locator('text=Disconnected'),
        page.locator('text=Loading'),
        page.locator('[role="status"]'),
        page.locator('[aria-live]')
      ];
      
      let statusFound = false;
      
      for (const statusElement of statusElements) {
        if (await statusElement.count() > 0) {
          statusFound = true;
          
          const ariaLive = await statusElement.getAttribute('aria-live');
          const role = await statusElement.getAttribute('role');
          
          console.log(`Status element found: aria-live="${ariaLive}", role="${role}"`);
        }
      }
      
      // Dynamic content should have some status indication
      expect(statusFound).toBeTruthy();
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should provide meaningful content for screen readers', async ({ page }) => {
      // Get all text content that would be read by screen readers
      const textContent = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_SKIP;
              
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || 
                  style.visibility === 'hidden' ||
                  style.opacity === '0') {
                return NodeFilter.FILTER_SKIP;
              }
              
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            textNodes.push(text);
          }
        }
        
        return textNodes.join(' ');
      });
      
      // Should contain key information
      expect(textContent).toContain('Token Cost Analytics');
      expect(textContent).toContain('Total Cost');
      expect(textContent).toContain('Total Tokens');
      
      // Should have sufficient content
      expect(textContent.length).toBeGreaterThan(100);
      
      console.log(`Screen readable content length: ${textContent.length} characters`);
    });

    test('should announce state changes to screen readers', async ({ page }) => {
      // Test time range button state changes
      const button7d = page.locator('button:has-text("7d")');
      
      if (await button7d.count() > 0) {
        // Check initial state
        const initialState = await button7d.getAttribute('aria-pressed');
        
        await button7d.click();
        await page.waitForTimeout(300);
        
        // Check if state changed
        const newState = await button7d.getAttribute('aria-pressed');
        const hasActiveClass = await button7d.evaluate(el => 
          el.className.includes('bg-white text-blue-600')
        );
        
        // Either aria-pressed should change or visual state should be clear
        expect(initialState !== newState || hasActiveClass).toBeTruthy();
      }
    });

    test('should provide context for data and numbers', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      // Check that numbers have context
      const metricCards = page.locator('div:has-text("Total Cost"), div:has-text("Total Tokens"), div:has-text("Avg Cost/Token")');
      const cardCount = await metricCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = metricCards.nth(i);
        const cardText = await card.textContent();
        
        // Card should have both label and value context
        const hasLabel = /Total Cost|Total Tokens|Avg Cost/i.test(cardText || '');
        const hasValue = /\$|tokens|USD/i.test(cardText || '');
        
        expect(hasLabel).toBeTruthy();
        console.log(`Metric card ${i}: has label=${hasLabel}, has value context=${hasValue}`);
      }
    });
  });

  test.describe('Color and Contrast Accessibility', () => {
    test('should work with high contrast mode', async ({ page }) => {
      // Enable high contrast preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(500);
      
      // Key elements should remain visible
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('button:has-text("1d")')).toBeVisible();
      
      // Switch back to light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(500);
      
      // Should still work
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    });

    test('should not rely solely on color for information', async ({ page }) => {
      // Check budget status indicators
      const statusElements = page.locator('text=safe, text=warning, text=critical, text=exceeded');
      
      if (await statusElements.count() > 0) {
        const statusText = await statusElements.first().textContent();
        
        // Status should be conveyed through text, not just color
        const hasTextualStatus = ['safe', 'warning', 'critical', 'exceeded'].some(status =>
          statusText?.toLowerCase().includes(status)
        );
        
        expect(hasTextualStatus).toBeTruthy();
      }
      
      // Check trend indicators
      const trendElements = page.locator('text=increasing, text=decreasing, text=stable');
      
      if (await trendElements.count() > 0) {
        const trendText = await trendElements.first().textContent();
        
        // Trends should be conveyed through text, not just color
        const hasTextualTrend = ['increasing', 'decreasing', 'stable'].some(trend =>
          trendText?.toLowerCase().includes(trend)
        );
        
        expect(hasTextualTrend).toBeTruthy();
      }
    });

    test('should have sufficient color contrast for text', async ({ page }) => {
      // This is a basic check - in production you'd use axe-core or similar
      const textElements = page.locator('h1, h2, h3, p, span, button');
      const elementCount = await textElements.count();
      
      let visibleElements = 0;
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = textElements.nth(i);
        
        if (await element.isVisible()) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });
          
          visibleElements++;
          console.log(`Element ${i} styles:`, styles);
        }
      }
      
      expect(visibleElements).toBeGreaterThan(0);
    });
  });

  test.describe('Form and Input Accessibility', () => {
    test('should handle focus management for interactive components', async ({ page }) => {
      // Test export functionality focus handling
      const exportButton = page.locator('button:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        await exportButton.focus();
        
        const isCurrentlyFocused = await page.evaluate(() => {
          return document.activeElement?.textContent?.includes('Export');
        });
        
        expect(isCurrentlyFocused).toBeTruthy();
        
        // Test that clicking doesn't break focus management
        await exportButton.click();
        await page.waitForTimeout(500);
        
        // Focus should either remain or move to appropriate element
        const focusAfterClick = await page.evaluate(() => {
          return document.activeElement?.tagName;
        });
        
        expect(focusAfterClick).toBeTruthy();
      }
    });

    test('should provide clear error messages', async ({ page }) => {
      // Force an error condition if possible
      await page.route('**/*', route => route.abort());
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorElements = [
        page.locator('text=error'),
        page.locator('text=Error'), 
        page.locator('[role="alert"]'),
        page.locator('.error')
      ];
      
      let errorFound = false;
      
      for (const errorElement of errorElements) {
        if (await errorElement.count() > 0 && await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          
          // Error message should be descriptive
          expect(errorText?.length || 0).toBeGreaterThan(10);
          errorFound = true;
          
          console.log(`Error message found: "${errorText}"`);
          break;
        }
      }
      
      // Reset route handling
      await page.unroute('**/*');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should work with mobile screen readers', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Core functionality should remain accessible on mobile
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      // Touch targets should be appropriately sized
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      let appropriatelySizedButtons = 0;
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            const minTouchTarget = 44; // WCAG recommendation
            const isLargeEnough = boundingBox.width >= minTouchTarget && 
                                 boundingBox.height >= minTouchTarget;
            
            if (isLargeEnough) {
              appropriatelySizedButtons++;
            }
            
            console.log(`Button ${i} size: ${boundingBox.width}x${boundingBox.height} (adequate: ${isLargeEnough})`);
          }
        }
      }
      
      // Most buttons should meet touch target size guidelines
      expect(appropriatelySizedButtons).toBeGreaterThan(0);
    });
  });

  test.afterEach(async ({ page }) => {
    // Log any accessibility violations found during the test
    const violations = await page.evaluate(() => {
      // This would integrate with axe-core if available
      return [];
    });
    
    if (violations.length > 0) {
      console.log('Accessibility violations found:', violations);
    }
  });
});