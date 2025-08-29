import { expect, Locator } from '@playwright/test';

/**
 * Custom Matchers for UI-specific Assertions
 * 
 * Professional interface validation utilities and specialized matchers
 * for Claude Instance Manager UI modernization testing.
 */

/**
 * Professional Button Styling Matcher
 */
expect.extend({
  async toBeProfessionalButton(locator: Locator) {
    const element = locator.first();
    
    // Check visibility
    const isVisible = await element.isVisible();
    if (!isVisible) {
      return {
        message: () => 'Expected element to be visible as a professional button',
        pass: false
      };
    }
    
    // Check for professional button classes
    const className = await element.getAttribute('class') || '';
    const hasBtnClass = className.includes('btn');
    
    if (!hasBtnClass) {
      return {
        message: () => `Expected button to have 'btn' class, but got: ${className}`,
        pass: false
      };
    }
    
    // Check for professional styling properties
    const styles = await element.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
        padding: computed.padding,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        cursor: computed.cursor
      };
    });
    
    const issues = [];
    
    // Professional buttons should have rounded corners
    if (styles.borderRadius === '0px') {
      issues.push('missing border-radius');
    }
    
    // Should have padding
    if (styles.padding === '0px') {
      issues.push('missing padding');
    }
    
    // Should have background color (not transparent)
    if (styles.backgroundColor === 'rgba(0, 0, 0, 0)') {
      issues.push('transparent background');
    }
    
    // Should have pointer cursor
    if (styles.cursor !== 'pointer') {
      issues.push('missing pointer cursor');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Professional button styling issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Button meets professional styling requirements',
      pass: true
    };
  }
});

/**
 * Professional Message Bubble Matcher
 */
expect.extend({
  async toBeProfessionalMessageBubble(locator: Locator) {
    const element = locator.first();
    
    const isVisible = await element.isVisible();
    if (!isVisible) {
      return {
        message: () => 'Expected message bubble to be visible',
        pass: false
      };
    }
    
    const styles = await element.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
        padding: computed.padding,
        margin: computed.margin,
        backgroundColor: computed.backgroundColor,
        maxWidth: computed.maxWidth,
        wordWrap: computed.wordWrap
      };
    });
    
    const issues = [];
    
    // Message bubbles should have rounded corners
    if (styles.borderRadius === '0px') {
      issues.push('missing border-radius for bubble effect');
    }
    
    // Should have padding for content spacing
    if (styles.padding === '0px') {
      issues.push('missing padding');
    }
    
    // Should have background color
    if (styles.backgroundColor === 'rgba(0, 0, 0, 0)') {
      issues.push('transparent background');
    }
    
    // Should have word wrapping for long messages
    if (styles.wordWrap === 'normal') {
      issues.push('missing word-wrap for long messages');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Message bubble styling issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Message bubble meets professional styling requirements',
      pass: true
    };
  }
});

/**
 * Professional Layout Matcher
 */
expect.extend({
  async toHaveProfessionalLayout(locator: Locator) {
    const element = locator.first();
    
    const isVisible = await element.isVisible();
    if (!isVisible) {
      return {
        message: () => 'Expected layout container to be visible',
        pass: false
      };
    }
    
    const styles = await element.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        display: computed.display,
        gap: computed.gap,
        padding: computed.padding,
        margin: computed.margin,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent
      };
    });
    
    const issues = [];
    
    // Should use modern layout (flex or grid)
    if (!['flex', 'grid'].includes(styles.display)) {
      issues.push(`should use flex or grid layout, got: ${styles.display}`);
    }
    
    // Should have appropriate spacing
    if (styles.gap === 'normal' && styles.padding === '0px' && styles.margin === '0px') {
      issues.push('missing spacing (gap, padding, or margin)');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Professional layout issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Layout meets professional standards',
      pass: true
    };
  }
});

/**
 * Professional Typography Matcher
 */
expect.extend({
  async toHaveProfessionalTypography(locator: Locator) {
    const element = locator.first();
    
    const styles = await element.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        fontFamily: computed.fontFamily,
        color: computed.color,
        textAlign: computed.textAlign
      };
    });
    
    const issues = [];
    
    // Should have readable font size
    const fontSize = parseInt(styles.fontSize);
    if (fontSize < 12) {
      issues.push(`font size too small: ${fontSize}px`);
    }
    
    // Should have appropriate line height for readability
    const lineHeight = parseFloat(styles.lineHeight);
    if (lineHeight < 1.2) {
      issues.push(`line height too tight: ${lineHeight}`);
    }
    
    // Should have color (not default browser black)
    if (styles.color === 'rgb(0, 0, 0)') {
      issues.push('using default black color - should be styled');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Typography issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Typography meets professional standards',
      pass: true
    };
  }
});

/**
 * Responsive Design Matcher
 */
expect.extend({
  async toBeResponsiveAtViewport(locator: Locator, viewport: { width: number; height: number }) {
    const page = locator.page();
    
    // Set the viewport
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100); // Allow layout to adjust
    
    const element = locator.first();
    
    // Check if element is still visible and accessible
    const isVisible = await element.isVisible();
    if (!isVisible) {
      return {
        message: () => `Element not visible at viewport ${viewport.width}x${viewport.height}`,
        pass: false
      };
    }
    
    // Check if element is within viewport bounds
    const bounds = await element.boundingBox();
    if (!bounds) {
      return {
        message: () => 'Element has no bounding box',
        pass: false
      };
    }
    
    const issues = [];
    
    // Element should be within viewport width
    if (bounds.x + bounds.width > viewport.width) {
      issues.push('extends beyond viewport width');
    }
    
    // Element should be within viewport height (allowing for scrolling)
    if (bounds.y < 0) {
      issues.push('positioned above viewport');
    }
    
    // For mobile, ensure touch target size
    if (viewport.width < 768) {
      if (bounds.width < 44 || bounds.height < 44) {
        issues.push('touch target too small for mobile (min 44px)');
      }
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Responsive design issues at ${viewport.width}x${viewport.height}: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => `Element is responsive at viewport ${viewport.width}x${viewport.height}`,
      pass: true
    };
  }
});

/**
 * Animation Performance Matcher
 */
expect.extend({
  async toHaveSmoothAnimation(locator: Locator, trigger: () => Promise<void>) {
    const page = locator.page();
    
    // Start performance monitoring
    await page.addInitScript(() => {
      (window as any).animationFrames = [];
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        (window as any).animationFrames.push(performance.now());
        return originalRAF(callback);
      };
    });
    
    const startTime = Date.now();
    
    // Trigger animation
    await trigger();
    
    // Wait for animation to potentially complete
    await page.waitForTimeout(500);
    
    // Get animation frame data
    const frameData = await page.evaluate(() => (window as any).animationFrames || []);
    const endTime = Date.now();
    
    const issues = [];
    
    // Check for reasonable frame rate (if animation occurred)
    if (frameData.length > 1) {
      const totalAnimationTime = frameData[frameData.length - 1] - frameData[0];
      const averageFrameTime = totalAnimationTime / frameData.length;
      
      // Smooth animation should maintain ~60fps (16.67ms per frame)
      if (averageFrameTime > 33) { // Allow up to 30fps
        issues.push(`animation frame rate too low: ${1000/averageFrameTime}fps`);
      }
    }
    
    // Animation shouldn't block for too long
    if (endTime - startTime > 1000) {
      issues.push('animation or trigger took too long (>1s)');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Animation performance issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Animation performance is acceptable',
      pass: true
    };
  }
});

/**
 * Professional Color Scheme Matcher
 */
expect.extend({
  async toUseProfessionalColors(locator: Locator) {
    const element = locator.first();
    
    const colors = await element.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor
      };
    });
    
    const issues = [];
    
    // Parse RGB values for validation
    const parseRGB = (colorStr: string) => {
      const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
      return null;
    };
    
    const textColor = parseRGB(colors.color);
    const bgColor = parseRGB(colors.backgroundColor);
    
    // Check for sufficient contrast (basic check)
    if (textColor && bgColor) {
      const luminance = (color: {r: number, g: number, b: number}) => {
        const rs = color.r / 255;
        const gs = color.g / 255;
        const bs = color.b / 255;
        
        const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
        const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
        const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
        
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      
      const textLum = luminance(textColor);
      const bgLum = luminance(bgColor);
      
      const contrast = (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);
      
      // WCAG AA requires 4.5:1 contrast for normal text
      if (contrast < 3) {
        issues.push(`insufficient color contrast: ${contrast.toFixed(2)}:1`);
      }
    }
    
    // Avoid pure black/white (not professional)
    if (colors.color === 'rgb(0, 0, 0)') {
      issues.push('using pure black text - consider softer shade');
    }
    
    if (colors.backgroundColor === 'rgb(255, 255, 255)') {
      issues.push('using pure white background - consider softer shade');
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Color scheme issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Color scheme meets professional standards',
      pass: true
    };
  }
});

/**
 * Accessibility Matcher
 */
expect.extend({
  async toBeAccessible(locator: Locator) {
    const element = locator.first();
    
    const accessibility = await element.evaluate(el => {
      return {
        hasAriaLabel: el.hasAttribute('aria-label'),
        hasTitle: el.hasAttribute('title'),
        hasRole: el.hasAttribute('role'),
        tabIndex: el.tabIndex,
        tagName: el.tagName.toLowerCase(),
        hasText: el.textContent && el.textContent.trim().length > 0
      };
    });
    
    const issues = [];
    
    // Interactive elements should be focusable
    if (['button', 'input', 'select', 'textarea', 'a'].includes(accessibility.tagName)) {
      if (accessibility.tabIndex === -1) {
        issues.push('interactive element should be focusable (tabIndex !== -1)');
      }
    }
    
    // Buttons should have accessible names
    if (accessibility.tagName === 'button') {
      if (!accessibility.hasText && !accessibility.hasAriaLabel && !accessibility.hasTitle) {
        issues.push('button missing accessible name (text, aria-label, or title)');
      }
    }
    
    // Form inputs should have labels
    if (['input', 'select', 'textarea'].includes(accessibility.tagName)) {
      if (!accessibility.hasAriaLabel && !accessibility.hasTitle) {
        issues.push('form element missing label (aria-label or title)');
      }
    }
    
    if (issues.length > 0) {
      return {
        message: () => `Accessibility issues: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Element meets basic accessibility requirements',
      pass: true
    };
  }
});

// Export type extensions for TypeScript
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeProfessionalButton(): R;
      toBeProfessionalMessageBubble(): R;
      toHaveProfessionalLayout(): R;
      toHaveProfessionalTypography(): R;
      toBeResponsiveAtViewport(viewport: { width: number; height: number }): R;
      toHaveSmoothAnimation(trigger: () => Promise<void>): R;
      toUseProfessionalColors(): R;
      toBeAccessible(): R;
    }
  }
}

export {};
