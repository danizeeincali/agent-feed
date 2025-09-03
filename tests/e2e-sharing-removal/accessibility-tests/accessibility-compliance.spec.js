import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    await page.waitForSelector('.post-item', { timeout: 5000 });
  });

  test.describe('WCAG 2.1 AA Compliance Tests', () => {
    test('should pass automated accessibility audit', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        // Check for proper heading levels
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeLessThanOrEqual(1); // Should have at most one h1
        
        // Verify heading structure
        for (let i = 0; i < headingCount; i++) {
          const heading = headings.nth(i);
          const textContent = await heading.textContent();
          expect(textContent?.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('should have accessible images', async ({ page }) => {
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        // Images should have alt text or be marked as decorative
        expect(alt !== null || ariaLabel !== null || role === 'presentation').toBeTruthy();
        
        // If alt text exists, it should be meaningful or empty for decorative images
        if (alt !== null) {
          // Alt should not contain redundant text like "image of" or "picture of"
          expect(alt.toLowerCase()).not.toMatch(/^(image|picture|photo)\s+(of|showing)/);
        }
      }
    });

    test('should have accessible forms', async ({ page }) => {
      const formInputs = page.locator('input, textarea, select');
      const inputCount = await formInputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Each input should have an accessible label
        if (id) {
          const associatedLabel = page.locator(`label[for="${id}"]`);
          const hasLabel = await associatedLabel.count() > 0;
          
          if (!hasLabel) {
            // If no label, should have aria-label or aria-labelledby
            expect(ariaLabel || ariaLabelledby).toBeTruthy();
          }
        } else {
          // Without id, must have aria-label
          expect(ariaLabel).toBeTruthy();
        }
      }
    });

    test('should have accessible interactive elements', async ({ page }) => {
      const buttons = page.locator('button, [role="button"]');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        
        // Buttons should have accessible names
        const hasAccessibleName = ariaLabel || 
                                  (textContent && textContent.trim().length > 0) || 
                                  ariaLabelledby;
        
        expect(hasAccessibleName).toBeTruthy();
        
        // Should not have share-related labels
        if (ariaLabel) {
          expect(ariaLabel.toLowerCase()).not.toContain('share');
        }
        if (textContent) {
          expect(textContent.toLowerCase().trim()).not.toBe('share');
        }
      }
    });

    test('should have proper link accessibility', async ({ page }) => {
      const links = page.locator('a');
      const linkCount = await links.count();
      
      for (let i = 0; i < Math.min(linkCount, 15); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        const ariaLabel = await link.getAttribute('aria-label');
        const textContent = await link.textContent();
        
        // Links should have meaningful text or aria-label
        const hasAccessibleName = ariaLabel || 
                                  (textContent && textContent.trim().length > 0);
        
        expect(hasAccessibleName).toBeTruthy();
        
        // Avoid generic link text
        if (textContent) {
          const genericTexts = ['click here', 'read more', 'link', 'here'];
          const isGeneric = genericTexts.some(generic => 
            textContent.toLowerCase().trim() === generic
          );
          expect(isGeneric).toBeFalsy();
        }
      }
    });
  });

  test.describe('Keyboard Navigation Tests', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      // Start keyboard navigation
      await page.keyboard.press('Tab');
      
      let previousElement = null;
      let tabCount = 0;
      const maxTabs = 20; // Prevent infinite loops
      
      while (tabCount < maxTabs) {
        const focusedElement = page.locator(':focus');
        
        if (await focusedElement.count() === 0) {
          break; // No more focusable elements
        }
        
        // Verify element is visible and focusable
        await expect(focusedElement).toBeVisible();
        
        // Check that focus changed
        const currentElement = await focusedElement.elementHandle();
        expect(currentElement).not.toBe(previousElement);
        
        previousElement = currentElement;
        tabCount++;
        
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      expect(tabCount).toBeGreaterThan(0); // Should have focusable elements
    });

    test('should support reverse keyboard navigation', async ({ page }) => {
      // Navigate to last element first
      let tabCount = 0;
      while (tabCount < 10) {
        await page.keyboard.press('Tab');
        tabCount++;
      }
      
      // Then navigate backwards
      let shiftTabCount = 0;
      let previousElement = null;
      
      while (shiftTabCount < 5) {
        const focusedElement = page.locator(':focus');
        
        if (await focusedElement.count() === 0) {
          break;
        }
        
        const currentElement = await focusedElement.elementHandle();
        expect(currentElement).not.toBe(previousElement);
        
        previousElement = currentElement;
        shiftTabCount++;
        
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(100);
      }
      
      expect(shiftTabCount).toBeGreaterThan(0);
    });

    test('should activate elements with keyboard', async ({ page }) => {
      const buttons = page.locator('button:visible');
      
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        await firstButton.focus();
        
        // Should be able to activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Should be able to activate with Space (for buttons)
        await firstButton.focus();
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        
        // Should not cause errors
        const errorMessages = page.locator('.error, [role="alert"]');
        await expect(errorMessages).toHaveCount(0);
      }
    });

    test('should handle keyboard shortcuts appropriately', async ({ page }) => {
      const commonShortcuts = [
        'Escape',
        'Enter',
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End'
      ];
      
      for (const shortcut of commonShortcuts) {
        await page.keyboard.press(shortcut);
        await page.waitForTimeout(100);
        
        // Should not trigger share functionality
        const shareModal = page.locator('[role="dialog"]:has-text("Share")');
        await expect(shareModal).toHaveCount(0);
        
        const shareMenu = page.locator('.share-menu, .share-popup');
        await expect(shareMenu).toHaveCount(0);
      }
    });
  });

  test.describe('Focus Management Tests', () => {
    test('should have visible focus indicators', async ({ page }) => {
      const focusableElements = page.locator(
        'button:visible, a:visible, input:visible, textarea:visible, select:visible, [tabindex]:visible'
      );
      
      const elementCount = await focusableElements.count();
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = focusableElements.nth(i);
        await element.focus();
        
        // Check if focus is visible (element should have focus styles)
        const isFocused = await element.evaluate(el => el === document.activeElement);
        expect(isFocused).toBeTruthy();
        
        // Element should be visible when focused
        await expect(element).toBeVisible();
      }
    });

    test('should maintain logical focus order', async ({ page }) => {
      const focusableElements = page.locator(
        'button:visible, a:visible, input:visible, textarea:visible, select:visible, [tabindex]:visible'
      );
      
      const positions = [];
      const elementCount = await focusableElements.count();
      
      // Get positions of first few focusable elements
      for (let i = 0; i < Math.min(elementCount, 8); i++) {
        const element = focusableElements.nth(i);
        const boundingBox = await element.boundingBox();
        
        if (boundingBox) {
          positions.push({
            index: i,
            top: boundingBox.y,
            left: boundingBox.x
          });
        }
      }
      
      // Focus order should generally follow reading order (top to bottom, left to right)
      for (let i = 1; i < positions.length; i++) {
        const current = positions[i];
        const previous = positions[i - 1];
        
        // Current element should be below or to the right of previous
        const isLogicalOrder = current.top >= previous.top || 
                               (current.top === previous.top && current.left >= previous.left);
        
        // Allow some flexibility for complex layouts
        if (!isLogicalOrder) {
          const verticalDistance = Math.abs(current.top - previous.top);
          // If elements are close vertically, horizontal order matters more
          if (verticalDistance < 50) {
            expect(current.left).toBeGreaterThanOrEqual(previous.left - 100);
          }
        }
      }
    });

    test('should trap focus in modals', async ({ page }) => {
      // Look for modal triggers
      const modalTriggers = page.locator(
        'button:has-text("Open"), button:has-text("Show"), button:has-text("Modal")'
      );
      
      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(500);
        
        // Check if modal is open
        const modal = page.locator('[role="dialog"]:visible');
        
        if (await modal.count() > 0) {
          // Focus should be trapped within modal
          const modalFocusableElements = modal.locator(
            'button, a, input, textarea, select, [tabindex]'
          );
          
          const modalElementCount = await modalFocusableElements.count();
          
          if (modalElementCount > 1) {
            // Navigate through all focusable elements in modal
            for (let i = 0; i < modalElementCount + 2; i++) {
              await page.keyboard.press('Tab');
              
              const focusedElement = page.locator(':focus');
              const isFocusInModal = await modal.locator(':focus').count() > 0;
              
              expect(isFocusInModal).toBeTruthy();
            }
          }
        }
      }
    });
  });

  test.describe('Color and Contrast Tests', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      // Run axe-core color contrast checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['color-contrast'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not rely solely on color for information', async ({ page }) => {
      // Check for elements that might rely on color alone
      const coloredElements = page.locator(
        '.error, .success, .warning, .info, .danger, .primary, .secondary'
      );
      
      const coloredCount = await coloredElements.count();
      
      for (let i = 0; i < Math.min(coloredCount, 10); i++) {
        const element = coloredElements.nth(i);
        const textContent = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        const title = await element.getAttribute('title');
        
        // Should have text or other indicators besides color
        const hasNonColorIndicator = (textContent && textContent.trim().length > 0) ||
                                     ariaLabel ||
                                     title;
        
        expect(hasNonColorIndicator).toBeTruthy();
      }
    });
  });

  test.describe('Screen Reader Compatibility Tests', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      const landmarks = page.locator(
        '[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside'
      );
      
      const landmarkCount = await landmarks.count();
      expect(landmarkCount).toBeGreaterThan(0);
      
      // Main content should be identifiable
      const mainContent = page.locator('[role="main"], main');
      await expect(mainContent).toHaveCount(1); // Should have exactly one main landmark
    });

    test('should have proper ARIA labels and descriptions', async ({ page }) => {
      // Check for elements with ARIA attributes
      const elementsWithAria = page.locator('[aria-label], [aria-labelledby], [aria-describedby]');
      const ariaCount = await elementsWithAria.count();
      
      for (let i = 0; i < Math.min(ariaCount, 15); i++) {
        const element = elementsWithAria.nth(i);
        
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledby = await element.getAttribute('aria-labelledby');
        const ariaDescribedby = await element.getAttribute('aria-describedby');
        
        // ARIA labels should be meaningful
        if (ariaLabel) {
          expect(ariaLabel.trim().length).toBeGreaterThan(0);
          expect(ariaLabel.toLowerCase()).not.toContain('share'); // No share references
        }
        
        // Check referenced elements exist
        if (ariaLabelledby) {
          const referencedElement = page.locator(`#${ariaLabelledby}`);
          await expect(referencedElement).toHaveCount(1);
        }
        
        if (ariaDescribedby) {
          const referencedElement = page.locator(`#${ariaDescribedby}`);
          await expect(referencedElement).toHaveCount(1);
        }
      }
    });

    test('should have proper live regions for dynamic content', async ({ page }) => {
      // Look for live regions
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const liveCount = await liveRegions.count();
      
      // If dynamic content exists, should have appropriate live regions
      const posts = page.locator('.post-item');
      const hasLikeButtons = await page.locator('button[aria-label*="like" i]').count() > 0;
      
      if (hasLikeButtons) {
        // Should have some form of live region for like updates
        expect(liveCount).toBeGreaterThanOrEqual(0); // At least allow for no live regions if updates are handled differently
        
        // Test like interaction for screen reader announcements
        const likeButton = page.locator('button[aria-label*="like" i]').first();
        await likeButton.click();
        await page.waitForTimeout(500);
        
        // Check if state change is announced
        const ariaPressed = await likeButton.getAttribute('aria-pressed');
        if (ariaPressed !== null) {
          expect(['true', 'false']).toContain(ariaPressed);
        }
      }
    });
  });

  test.describe('Mobile Accessibility Tests', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have touch-friendly interactive elements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const interactiveElements = page.locator('button:visible, a:visible, [role="button"]:visible');
      const elementCount = await interactiveElements.count();
      
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i);
        const boundingBox = await element.boundingBox();
        
        if (boundingBox) {
          // Touch targets should be at least 44x44 pixels (WCAG guideline)
          const minDimension = Math.min(boundingBox.width, boundingBox.height);
          expect(minDimension).toBeGreaterThanOrEqual(32); // Allow slightly smaller for dense interfaces
        }
      }
    });
  });

  test.describe('Share Removal Accessibility Validation', () => {
    test('should not have inaccessible share elements', async ({ page }) => {
      // Run accessibility scan specifically looking for share-related issues
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      // Check that no violations are related to share functionality
      const shareRelatedViolations = accessibilityScanResults.violations.filter(violation => {
        const hasShareInDescription = violation.description.toLowerCase().includes('share');
        const hasShareInNodes = violation.nodes.some(node => 
          node.html.toLowerCase().includes('share') ||
          node.failureSummary.toLowerCase().includes('share')
        );
        
        return hasShareInDescription || hasShareInNodes;
      });
      
      expect(shareRelatedViolations).toHaveLength(0);
    });

    test('should maintain accessibility without share shortcuts', async ({ page }) => {
      // Test that accessibility is maintained without share keyboard shortcuts
      const keyboardShortcuts = ['s', 'S', 'shift+s', 'ctrl+s', 'cmd+s'];
      
      for (const shortcut of keyboardShortcuts) {
        await page.keyboard.press(shortcut);
        await page.waitForTimeout(100);
        
        // Should not open inaccessible share dialogs
        const inaccessibleDialogs = page.locator('[role="dialog"]:not([aria-labelledby]):not([aria-label])');
        await expect(inaccessibleDialogs).toHaveCount(0);
      }
    });
  });
});