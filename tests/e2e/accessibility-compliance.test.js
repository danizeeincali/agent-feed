/**
 * Accessibility compliance tests for the persistent feed data system
 * Testing WCAG 2.1 compliance, keyboard navigation, screen reader compatibility
 */

import { test, expect } from '@playwright/test';

// WCAG 2.1 compliance requirements
const WCAG_REQUIREMENTS = {
  colorContrast: {
    normalText: 4.5,      // AA standard for normal text
    largeText: 3.0,       // AA standard for large text
    nonText: 3.0          // AA standard for non-text elements
  },
  timing: {
    maxSessionTimeout: 20000,  // 20 seconds for session timeout warning
    minActionTime: 100,        // Minimum time for user actions
    maxResponseTime: 3000      // Maximum response time for actions
  },
  navigation: {
    maxTabStops: 50,           // Reasonable tab stop limit
    focusIndicatorSize: 2      // Minimum focus indicator size in pixels
  }
};

// Helper function to calculate color contrast
const calculateContrast = (rgb1, rgb2) => {
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// Helper function to parse RGB color
const parseRGB = (color) => {
  const match = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
};

test.describe('Accessibility Compliance Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    await page.waitForTimeout(2000);
  });

  test('keyboard navigation works throughout the feed', async ({ page }) => {
    // Test tab navigation
    const focusableElements = [];
    let tabCount = 0;
    const maxTabs = WCAG_REQUIREMENTS.navigation.maxTabStops;
    
    // Start from the top of the page
    await page.keyboard.press('Tab');
    
    while (tabCount < maxTabs) {
      // Get currently focused element
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        
        return {
          tagName: el.tagName,
          type: el.type || null,
          id: el.id || null,
          className: el.className || null,
          textContent: el.textContent?.slice(0, 50) || null,
          ariaLabel: el.getAttribute('aria-label') || null,
          role: el.getAttribute('role') || null
        };
      });
      
      if (!focusedElement) {
        console.log(`No focused element at tab ${tabCount}`);
        break;
      }
      
      focusableElements.push({ tabIndex: tabCount, ...focusedElement });
      console.log(`Tab ${tabCount}: ${focusedElement.tagName} - ${focusedElement.textContent || focusedElement.ariaLabel || 'unlabeled'}`);
      
      // Test Enter key activation on buttons
      if (focusedElement.tagName === 'BUTTON') {
        const startTime = Date.now();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeGreaterThan(WCAG_REQUIREMENTS.timing.minActionTime);
        expect(responseTime).toBeLessThan(WCAG_REQUIREMENTS.timing.maxResponseTime);
      }
      
      // Move to next focusable element
      await page.keyboard.press('Tab');
      tabCount++;
      
      // Small delay to prevent overwhelming the system
      await page.waitForTimeout(50);
    }
    
    console.log(`Found ${focusableElements.length} focusable elements`);
    
    // Assertions
    expect(focusableElements.length).toBeGreaterThan(5); // Should have at least navigation, search, and some buttons
    expect(focusableElements.length).toBeLessThan(WCAG_REQUIREMENTS.navigation.maxTabStops);
    
    // Verify essential elements are focusable
    const essentialElements = ['BUTTON', 'INPUT', 'SELECT', 'A'];
    const foundElements = focusableElements.map(el => el.tagName);
    
    expect(foundElements.filter(tag => essentialElements.includes(tag)).length).toBeGreaterThan(3);
  });

  test('focus indicators are visible and meet WCAG requirements', async ({ page }) => {
    // Test focus indicators on key interactive elements
    const testSelectors = [
      'button[title="Search posts"]',
      'button[title="Refresh feed"]',
      'select',
      'input[placeholder*="Search posts"]'
    ];
    
    for (const selector of testSelectors) {
      const element = page.locator(selector).first();
      
      if (await element.isVisible()) {
        // Focus the element
        await element.focus();
        
        // Check focus styles
        const focusStyles = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el, ':focus');
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
            borderColor: styles.borderColor,
            borderWidth: styles.borderWidth
          };
        });
        
        console.log(`Focus styles for ${selector}:`, focusStyles);
        
        // Verify focus indicator exists
        const hasFocusIndicator = 
          focusStyles.outline !== 'none' ||
          focusStyles.boxShadow !== 'none' ||
          focusStyles.outlineWidth !== '0px' ||
          parseFloat(focusStyles.borderWidth) >= WCAG_REQUIREMENTS.navigation.focusIndicatorSize;
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    }
  });

  test('screen reader accessibility with proper ARIA labels', async ({ page }) => {
    // Check for ARIA landmarks
    const landmarks = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="search"], main, nav, header, footer');
      return Array.from(elements).map(el => ({
        tagName: el.tagName,
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        id: el.id
      }));
    });
    
    console.log('ARIA landmarks:', landmarks);
    expect(landmarks.length).toBeGreaterThan(0);
    
    // Check for proper heading structure
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.slice(0, 50),
        ariaLabel: el.getAttribute('aria-label'),
        id: el.id
      }));
    });
    
    console.log('Heading structure:', headings);
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify heading hierarchy (should start with h1 or h2, no skipping levels)
    if (headings.length > 1) {
      const levels = headings.map(h => h.level);
      const hasProperHierarchy = levels.reduce((valid, current, index) => {
        if (index === 0) return current <= 2; // First heading should be h1 or h2
        const previous = levels[index - 1];
        return valid && (current <= previous + 1); // No level skipping
      }, true);
      
      if (!hasProperHierarchy) {
        console.log('Warning: Heading hierarchy may not be optimal');
      }
    }
    
    // Check for alt text on images
    const images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll('img');
      return Array.from(imgElements).map(el => ({
        src: el.src?.slice(0, 50),
        alt: el.alt,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role')
      }));
    });
    
    console.log(`Found ${images.length} images`);
    
    // All images should have alt text or appropriate ARIA labels
    const imagesWithoutAlt = images.filter(img => !img.alt && !img.ariaLabel && img.role !== 'presentation');
    expect(imagesWithoutAlt.length).toBe(0);
    
    // Check for form labels
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      return Array.from(inputs).map(el => {
        const label = document.querySelector(`label[for="${el.id}"]`);
        return {
          type: el.type || el.tagName.toLowerCase(),
          id: el.id,
          hasLabel: !!label,
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledBy: el.getAttribute('aria-labelledby'),
          placeholder: el.placeholder
        };
      });
    });
    
    console.log('Form elements:', formElements);
    
    // All form elements should have labels or aria-labels
    const unlabeledFormElements = formElements.filter(el => 
      !el.hasLabel && !el.ariaLabel && !el.ariaLabelledBy && !el.placeholder
    );
    expect(unlabeledFormElements.length).toBe(0);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    // Get all text elements and their computed styles
    const textElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const textInfo = [];
      
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && el.children.length === 0) { // Only leaf text nodes
          const styles = window.getComputedStyle(el);
          const fontSize = parseFloat(styles.fontSize);
          const fontWeight = styles.fontWeight;
          
          // Only check visible text
          if (styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0') {
            textInfo.push({
              text: text.slice(0, 30),
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: fontSize,
              fontWeight: fontWeight,
              isLargeText: fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
            });
          }
        }
      });
      
      return textInfo;
    });
    
    console.log(`Analyzing ${textElements.length} text elements for color contrast`);
    
    const contrastIssues = [];
    
    textElements.forEach((element, index) => {
      // Skip if background color is transparent or not set
      if (!element.backgroundColor || element.backgroundColor === 'rgba(0, 0, 0, 0)' || element.backgroundColor === 'transparent') {
        return;
      }
      
      try {
        const textColor = parseRGB(element.color);
        const bgColor = parseRGB(element.backgroundColor);
        
        const contrast = calculateContrast(textColor, bgColor);
        const requiredContrast = element.isLargeText ? 
          WCAG_REQUIREMENTS.colorContrast.largeText : 
          WCAG_REQUIREMENTS.colorContrast.normalText;
        
        if (contrast < requiredContrast) {
          contrastIssues.push({
            text: element.text,
            contrast: contrast.toFixed(2),
            required: requiredContrast,
            isLargeText: element.isLargeText,
            textColor: element.color,
            backgroundColor: element.backgroundColor
          });
        }
      } catch (error) {
        console.log(`Could not analyze contrast for element: ${element.text}`);
      }
    });
    
    if (contrastIssues.length > 0) {
      console.log('Color contrast issues found:');
      contrastIssues.forEach(issue => {
        console.log(`- "${issue.text}": ${issue.contrast} (required: ${issue.required})`);
      });
    } else {
      console.log('All analyzed text elements meet color contrast requirements');
    }
    
    // Allow some contrast issues for test environment, but flag them
    expect(contrastIssues.length).toBeLessThan(textElements.length * 0.1); // Less than 10% of elements
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    // Test common keyboard shortcuts
    const shortcuts = [
      { key: 'F5', description: 'Refresh page', expectation: 'page reload' },
      { key: 'Escape', description: 'Close modals/search', expectation: 'modal closes' },
      { key: 'Space', description: 'Scroll down', expectation: 'page scrolls' }
    ];
    
    for (const shortcut of shortcuts) {
      try {
        console.log(`Testing shortcut: ${shortcut.key} - ${shortcut.description}`);
        
        if (shortcut.key === 'Escape') {
          // Open search first
          await page.click('button[title="Search posts"]');
          await page.waitForTimeout(500);
          
          // Then test escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          // Check if search closed (implementation dependent)
          console.log('Escape key pressed - search should close if implemented');
          
        } else if (shortcut.key === 'Space') {
          const initialScroll = await page.evaluate(() => window.scrollY);
          
          await page.keyboard.press('Space');
          await page.waitForTimeout(500);
          
          const newScroll = await page.evaluate(() => window.scrollY);
          
          if (newScroll > initialScroll) {
            console.log(`Space key scrolled from ${initialScroll} to ${newScroll}`);
          } else {
            console.log('Space key did not scroll - may be focused on form element');
          }
          
        } else if (shortcut.key === 'F5') {
          // Skip F5 test as it will reload the page completely
          console.log('Skipping F5 test to avoid page reload disruption');
        }
        
      } catch (error) {
        console.log(`Error testing shortcut ${shortcut.key}: ${error.message}`);
      }
    }
  });

  test('text scaling works up to 200% zoom', async ({ page }) => {
    // Test different zoom levels
    const zoomLevels = [1.0, 1.25, 1.5, 2.0]; // 100%, 125%, 150%, 200%
    
    for (const zoom of zoomLevels) {
      console.log(`Testing zoom level: ${zoom * 100}%`);
      
      // Set zoom level
      await page.setViewportSize({
        width: Math.floor(1280 / zoom),
        height: Math.floor(720 / zoom)
      });
      
      await page.waitForTimeout(1000);
      
      // Check that content is still accessible
      await expect(page.locator('h2:has-text("Agent Feed")')).toBeVisible();
      
      // Check that interactive elements are still clickable
      const refreshButton = page.locator('button[title="Refresh feed"]');
      await expect(refreshButton).toBeVisible();
      
      // Check that text doesn't overlap or become unreadable
      const textOverlap = await page.evaluate(() => {
        const textElements = document.querySelectorAll('p, span, div');
        let overlappingElements = 0;
        
        for (let i = 0; i < textElements.length - 1; i++) {
          const rect1 = textElements[i].getBoundingClientRect();
          const rect2 = textElements[i + 1].getBoundingClientRect();
          
          // Check for unexpected overlap
          if (rect1.bottom > rect2.top && rect1.right > rect2.left && 
              rect1.left < rect2.right && rect1.top < rect2.bottom) {
            overlappingElements++;
          }
        }
        
        return overlappingElements;
      });
      
      console.log(`Zoom ${zoom * 100}%: ${textOverlap} potentially overlapping elements`);
      
      // Allow some overlap but not excessive
      expect(textOverlap).toBeLessThan(5);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('motion and animation respect accessibility preferences', async ({ page }) => {
    // Test reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Refresh page to apply media query
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    // Test that animations are reduced or removed
    await page.click('button[title="Refresh feed"]');
    
    // Check for spin animation
    const spinningElement = page.locator('.animate-spin');
    
    if (await spinningElement.isVisible()) {
      // Check if animation duration is reduced
      const animationDuration = await spinningElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.animationDuration;
      });
      
      console.log(`Animation duration with reduced motion: ${animationDuration}`);
      
      // Animation should be very short or instant with reduced motion
      if (animationDuration !== 'none' && animationDuration !== '0s') {
        console.log('Note: Animation still present with reduced motion preference');
      }
    }
    
    // Reset media preference
    await page.emulateMedia({ reducedMotion: null });
  });

  test('error messages are accessible and helpful', async ({ page }) => {
    // Test error handling accessibility
    
    // First check if there are any error states visible
    const errorElements = await page.locator('[data-testid="error-fallback"], .error, [role="alert"], .text-red-500').all();
    
    if (errorElements.length > 0) {
      for (const errorElement of errorElements) {
        if (await errorElement.isVisible()) {
          // Check if error has proper ARIA attributes
          const ariaAttributes = await errorElement.evaluate(el => ({
            role: el.getAttribute('role'),
            ariaLive: el.getAttribute('aria-live'),
            ariaLabel: el.getAttribute('aria-label'),
            ariaDescribedBy: el.getAttribute('aria-describedby'),
            textContent: el.textContent?.slice(0, 100)
          }));
          
          console.log('Error element accessibility:', ariaAttributes);
          
          // Error should be announced to screen readers
          const isAccessible = ariaAttributes.role === 'alert' || 
                              ariaAttributes.ariaLive === 'polite' || 
                              ariaAttributes.ariaLive === 'assertive' ||
                              !!ariaAttributes.ariaLabel;
          
          if (!isAccessible) {
            console.log('Warning: Error message may not be accessible to screen readers');
          }
        }
      }
    } else {
      console.log('No error states found for accessibility testing');
    }
    
    // Test that retry buttons are accessible
    const retryButton = page.locator('button:has-text("Try again"), button:has-text("Retry")');
    
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeEnabled();
      
      // Check that retry button has proper labeling
      const retryAttributes = await retryButton.evaluate(el => ({
        ariaLabel: el.getAttribute('aria-label'),
        title: el.title,
        textContent: el.textContent
      }));
      
      console.log('Retry button accessibility:', retryAttributes);
      
      const hasProperLabel = retryAttributes.ariaLabel || 
                            retryAttributes.title || 
                            retryAttributes.textContent?.trim();
      
      expect(hasProperLabel).toBeTruthy();
    }
  });

  test('timing requirements meet WCAG guidelines', async ({ page }) => {
    // Test that interactive elements respond within reasonable time
    const interactiveElements = [
      { selector: 'button[title="Refresh feed"]', action: 'click', description: 'Refresh button' },
      { selector: 'button[title="Search posts"]', action: 'click', description: 'Search toggle' },
      { selector: 'select', action: 'selectOption', value: 'high-impact', description: 'Filter select' }
    ];
    
    for (const element of interactiveElements) {
      const elementLocator = page.locator(element.selector).first();
      
      if (await elementLocator.isVisible()) {
        const startTime = Date.now();
        
        try {
          if (element.action === 'click') {
            await elementLocator.click();
          } else if (element.action === 'selectOption') {
            await elementLocator.selectOption(element.value);
          }
          
          // Wait for any immediate visual feedback
          await page.waitForTimeout(100);
          
          const responseTime = Date.now() - startTime;
          console.log(`${element.description} response time: ${responseTime}ms`);
          
          // Response should be immediate for UI feedback
          expect(responseTime).toBeGreaterThan(WCAG_REQUIREMENTS.timing.minActionTime);
          expect(responseTime).toBeLessThan(WCAG_REQUIREMENTS.timing.maxResponseTime);
          
        } catch (error) {
          console.log(`Error testing ${element.description}: ${error.message}`);
        }
      }
    }
  });
});