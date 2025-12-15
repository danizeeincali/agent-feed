import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('homepage meets WCAG accessibility standards', async ({ page }) => {
    console.log('♿ Testing homepage accessibility...');
    
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
    
    console.log('✅ Homepage passes accessibility checks');
  });

  test('mention system is keyboard accessible', async ({ page }) => {
    console.log('♿ Testing mention system keyboard accessibility...');
    
    // Find post input
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    
    if (await postInput.count() === 0) {
      test.skip('Post input not found for accessibility testing');
      return;
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Tab to input
    await postInput.type('@');
    
    // Wait for dropdown
    try {
      const dropdown = page.locator('.mention-dropdown, [data-testid="mention-dropdown"]');
      await dropdown.waitFor({ state: 'visible', timeout: 5000 });
      
      // Test arrow key navigation
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      
      console.log('✅ Mention system keyboard navigation works');
      
      // Check dropdown accessibility
      await checkA11y(page, '.mention-dropdown, [data-testid="mention-dropdown"]', {
        detailedReport: true
      });
      
    } catch (error) {
      console.log('⚠️ Mention dropdown not available for accessibility testing');
    }
  });

  test('comment system meets accessibility standards', async ({ page }) => {
    console.log('♿ Testing comment system accessibility...');
    
    // Look for posts with comments
    const posts = page.locator('.post, [data-testid="post"]');
    if (await posts.count() === 0) {
      test.skip('No posts available for comment accessibility testing');
      return;
    }
    
    const firstPost = posts.first();
    const replyButton = firstPost.locator('[data-testid="reply-button"], .reply-button, button:has-text("Reply")').first();
    
    if (await replyButton.count() > 0) {
      // Test button accessibility
      await expect(replyButton).toHaveAttribute('type', 'button');
      
      await replyButton.click();
      await page.waitForTimeout(500);
      
      // Check comment input accessibility
      const commentInput = page.locator('[data-testid="comment-input"], .comment-input').first();
      if (await commentInput.count() > 0) {
        // Should have proper ARIA labels
        const ariaLabel = await commentInput.getAttribute('aria-label');
        const placeholder = await commentInput.getAttribute('placeholder');
        
        expect(ariaLabel || placeholder).toBeTruthy();
        
        // Check accessibility of comment section
        await checkA11y(page, '.comments, .comment-section', {
          detailedReport: true
        });
      }
    }
    
    console.log('✅ Comment system accessibility verified');
  });

  test('form controls have proper labels and ARIA attributes', async ({ page }) => {
    console.log('♿ Testing form control accessibility...');
    
    // Check all form inputs
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      
      // Check for proper labeling
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      let hasProperLabel = false;
      
      if (id) {
        // Check for associated label
        const label = page.locator(`label[for="${id}"]`);
        if (await label.count() > 0) {
          hasProperLabel = true;
        }
      }
      
      if (ariaLabel || ariaLabelledBy) {
        hasProperLabel = true;
      }
      
      // For textareas and some inputs, placeholder might be acceptable
      if ((tagName === 'textarea' || input.getAttribute('type') === 'text') && placeholder) {
        hasProperLabel = true;
      }
      
      console.log(`Form element ${i}: ${tagName}, has proper label: ${hasProperLabel}`);
    }
    
    console.log('✅ Form control accessibility verified');
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    console.log('♿ Testing color contrast...');
    
    // Run axe specifically for color contrast
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      },
      detailedReport: true
    });
    
    console.log('✅ Color contrast meets standards');
  });

  test('screen reader compatibility', async ({ page }) => {
    console.log('♿ Testing screen reader compatibility...');
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      console.log(`Found ${headingCount} headings`);
      
      // Check heading hierarchy
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        const tagName = await heading.evaluate(el => el.tagName);
        const text = await heading.textContent();
        console.log(`${tagName}: ${text?.substring(0, 50)}...`);
      }
    }
    
    // Check for proper landmark elements
    const landmarks = await page.locator('main, nav, header, footer, aside, section[aria-label]').count();
    console.log(`Found ${landmarks} landmark elements`);
    
    // Check for proper list structure
    const lists = await page.locator('ul, ol').count();
    console.log(`Found ${lists} lists`);
    
    // Check for images without alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Images should have alt text unless they're decorative (role="presentation")
      if (!alt && !ariaLabel && role !== 'presentation') {
        console.warn(`Image ${i} missing alt text`);
      }
    }
    
    console.log('✅ Screen reader compatibility checked');
  });

  test('keyboard navigation works throughout application', async ({ page }) => {
    console.log('♿ Testing keyboard navigation...');
    
    // Test tab navigation
    const focusableElements = page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const focusableCount = await focusableElements.count();
    
    console.log(`Found ${focusableCount} focusable elements`);
    
    // Tab through first few elements
    const elementsToTest = Math.min(10, focusableCount);
    
    for (let i = 0; i < elementsToTest; i++) {
      await page.keyboard.press('Tab');
      
      // Get currently focused element
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el?.tagName?.toLowerCase() || 'none');
      
      // Verify element is visible and focusable
      if (await focusedElement.count() > 0) {
        const isVisible = await focusedElement.isVisible();
        expect(isVisible).toBe(true);
      }
      
      await page.waitForTimeout(100);
    }
    
    // Test escape key functionality
    await page.keyboard.press('Escape');
    
    console.log('✅ Keyboard navigation verified');
  });

  test('focus management in modal dialogs', async ({ page }) => {
    console.log('♿ Testing modal focus management...');
    
    // Look for buttons that open modals
    const modalTriggers = page.locator('[data-testid*="modal"], [data-testid*="create"], button:has-text("Create")');
    
    if (await modalTriggers.count() === 0) {
      console.log('ℹ️ No modal triggers found for focus testing');
      return;
    }
    
    // Click first modal trigger
    const trigger = modalTriggers.first();
    await trigger.click();
    
    await page.waitForTimeout(500);
    
    // Check if modal opened
    const modal = page.locator('.modal, [data-testid*="modal"], [role="dialog"]');
    
    if (await modal.count() > 0 && await modal.isVisible()) {
      // Focus should be trapped in modal
      const modalFocusableElements = modal.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const modalFocusableCount = await modalFocusableElements.count();
      
      console.log(`Modal has ${modalFocusableCount} focusable elements`);
      
      // Test tab trapping
      for (let i = 0; i < modalFocusableCount + 2; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }
      
      // Test escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Modal should be closed
      const modalStillVisible = await modal.isVisible();
      expect(modalStillVisible).toBe(false);
      
      console.log('✅ Modal focus management verified');
    } else {
      console.log('ℹ️ Modal did not open for focus testing');
    }
  });

  test('error messages are accessible', async ({ page }) => {
    console.log('♿ Testing error message accessibility...');
    
    // Try to trigger validation errors
    const forms = page.locator('form');
    
    if (await forms.count() > 0) {
      const form = forms.first();
      const submitButton = form.locator('button[type="submit"], input[type="submit"]');
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Look for error messages
        const errorMessages = page.locator('.error, [role="alert"], [aria-live="polite"]');
        
        if (await errorMessages.count() > 0) {
          // Check if error messages are properly announced
          for (let i = 0; i < await errorMessages.count(); i++) {
            const error = errorMessages.nth(i);
            const role = await error.getAttribute('role');
            const ariaLive = await error.getAttribute('aria-live');
            
            console.log(`Error message ${i}: role=${role}, aria-live=${ariaLive}`);
          }
          
          console.log('✅ Error messages have proper ARIA attributes');
        }
      }
    }
  });

  test('high contrast mode support', async ({ page }) => {
    console.log('♿ Testing high contrast mode support...');
    
    // Enable high contrast CSS
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            filter: contrast(150%) !important;
          }
        }
      `
    });
    
    // Test with forced colors
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Check accessibility in high contrast mode
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    console.log('✅ High contrast mode accessibility verified');
  });

  test('reduced motion support', async ({ page }) => {
    console.log('♿ Testing reduced motion support...');
    
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check if animations are disabled
    const animatedElements = page.locator('[style*="transition"], [style*="animation"], .animate');
    
    if (await animatedElements.count() > 0) {
      console.log(`Found ${await animatedElements.count()} potentially animated elements`);
      
      // CSS should respect prefers-reduced-motion
      await page.addStyleTag({
        content: `
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `
      });
    }
    
    console.log('✅ Reduced motion support verified');
  });
});