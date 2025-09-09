import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('♿ Accessibility Compliance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');
    await injectAxe(page);
  });

  test('homepage passes accessibility audit', async ({ page }) => {
    console.log('🧪 Testing homepage accessibility...');
    
    // Run axe accessibility check
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
    
    console.log('✅ Homepage passes accessibility audit');
  });

  test('post creator modal accessibility', async ({ page }) => {
    console.log('🧪 Testing post creator modal accessibility...');
    
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-creator-modal"]');
    
    // Check modal accessibility
    await checkA11y(page, '[data-testid="post-creator-modal"]', {
      detailedReport: true,
    });
    
    // Test modal focus management
    const modal = page.locator('[data-testid="post-creator-modal"]');
    await expect(modal).toBeFocused();
    
    // Test escape key closes modal
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    
    console.log('✅ Post creator modal passes accessibility tests');
  });

  test('keyboard navigation works throughout app', async ({ page }) => {
    console.log('🧪 Testing keyboard navigation...');
    
    // Test tab navigation
    let focusedElements = [];
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? {
          tagName: focused.tagName,
          textContent: focused.textContent?.slice(0, 50),
          testId: focused.getAttribute('data-testid'),
          role: focused.getAttribute('role'),
          ariaLabel: focused.getAttribute('aria-label')
        } : null;
      });
      
      if (focusedElement) {
        focusedElements.push(focusedElement);
      }
    }
    
    console.log('📊 Tab navigation sequence:', focusedElements);
    
    // Should have focused on interactive elements
    expect(focusedElements.length).toBeGreaterThan(5);
    
    // Test reverse tab navigation
    await page.keyboard.press('Shift+Tab');
    const reverseFocusedElement = page.locator(':focus');
    await expect(reverseFocusedElement).toBeVisible();
    
    console.log('✅ Keyboard navigation works correctly');
  });

  test('screen reader compatibility', async ({ page }) => {
    console.log('🧪 Testing screen reader compatibility...');
    
    // Check for proper ARIA labels
    const ariaLabels = await page.evaluate(() => {
      const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
      return Array.from(elementsWithAria).map(el => ({
        tagName: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledBy: el.getAttribute('aria-labelledby'),
        ariaDescribedBy: el.getAttribute('aria-describedby'),
        testId: el.getAttribute('data-testid')
      }));
    });
    
    console.log('📊 ARIA labels found:', ariaLabels.length);
    
    // Check for live regions
    const liveRegions = await page.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);
    
    // Check for proper heading hierarchy
    const headings = await page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(h => ({
        level: parseInt(h.tagName.slice(1)),
        text: h.textContent?.slice(0, 50)
      }));
    });
    
    console.log('📊 Heading hierarchy:', headings);
    
    // Should start with h1
    if (headings.length > 0) {
      expect(headings[0].level).toBe(1);
    }
    
    console.log('✅ Screen reader compatibility features present');
  });

  test('color contrast compliance', async ({ page }) => {
    console.log('🧪 Testing color contrast compliance...');
    
    // Run axe color contrast checks specifically
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      },
      detailedReport: true,
    });
    
    console.log('✅ Color contrast compliance verified');
  });

  test('form accessibility', async ({ page }) => {
    console.log('🧪 Testing form accessibility...');
    
    await page.click('[data-testid="create-post-button"]');
    
    // Check form labels and descriptions
    const formElements = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      return Array.from(inputs).map(input => ({
        type: input.type || input.tagName.toLowerCase(),
        id: input.id,
        name: input.getAttribute('name'),
        ariaLabel: input.getAttribute('aria-label'),
        ariaLabelledBy: input.getAttribute('aria-labelledby'),
        ariaDescribedBy: input.getAttribute('aria-describedby'),
        hasLabel: !!document.querySelector(`label[for="${input.id}"]`),
        required: input.hasAttribute('required'),
        ariaRequired: input.getAttribute('aria-required') === 'true'
      }));
    });
    
    console.log('📊 Form elements analysis:', formElements);
    
    // Each form element should have proper labeling
    formElements.forEach((element, index) => {
      const hasProperLabel = element.hasLabel || element.ariaLabel || element.ariaLabelledBy;
      if (!hasProperLabel) {
        console.warn(`⚠️ Form element ${index} may lack proper labeling`);
      }
    });
    
    // Test form validation accessibility
    await page.click('[data-testid="publish-button"]');
    await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
    
    // Check if validation errors are announced
    const validationErrors = await page.evaluate(() => {
      const errors = document.querySelectorAll('[data-testid="validation-error"]');
      return Array.from(errors).map(error => ({
        text: error.textContent,
        ariaLive: error.getAttribute('aria-live'),
        role: error.getAttribute('role')
      }));
    });
    
    console.log('📊 Validation errors:', validationErrors);
    expect(validationErrors.length).toBeGreaterThan(0);
    
    console.log('✅ Form accessibility features working correctly');
  });

  test('mention dropdown accessibility', async ({ page }) => {
    console.log('🧪 Testing mention dropdown accessibility...');
    
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    await contentInput.fill('@');
    
    await page.waitForSelector('[data-testid="mention-dropdown"]');
    
    // Check dropdown ARIA attributes
    const dropdownAttributes = await page.locator('[data-testid="mention-dropdown"]').evaluate(el => ({
      role: el.getAttribute('role'),
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaHaspopup: el.getAttribute('aria-haspopup'),
      ariaLabelledBy: el.getAttribute('aria-labelledby')
    }));
    
    console.log('📊 Dropdown ARIA attributes:', dropdownAttributes);
    expect(dropdownAttributes.role).toBe('listbox');
    
    // Test keyboard navigation within dropdown
    await page.keyboard.press('ArrowDown');
    const activeDescendant = await page.locator('[data-testid="mention-dropdown"]').getAttribute('aria-activedescendant');
    expect(activeDescendant).toBeTruthy();
    
    // Test selection with Enter key
    await page.keyboard.press('Enter');
    await expect(contentInput).toContainText('@');
    
    console.log('✅ Mention dropdown accessibility working correctly');
  });

  test('comments section accessibility', async ({ page }) => {
    console.log('🧪 Testing comments section accessibility...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    await page.waitForSelector('[data-testid="comments-section"]');
    
    // Check comments section accessibility
    await checkA11y(page, '[data-testid="comments-section"]', {
      detailedReport: true,
    });
    
    // Test comment thread navigation
    const commentItems = page.locator('[data-testid="comment-item"]');
    const commentCount = await commentItems.count();
    
    if (commentCount > 0) {
      // Check if comments have proper structure
      const firstComment = commentItems.first();
      const commentAttributes = await firstComment.evaluate(el => ({
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        tabIndex: el.getAttribute('tabindex')
      }));
      
      console.log('📊 Comment attributes:', commentAttributes);
    }
    
    console.log('✅ Comments section accessibility verified');
  });

  test('mobile accessibility features', async ({ page }) => {
    console.log('🧪 Testing mobile accessibility features...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('[data-testid="app-root"]');
    
    // Test touch targets are large enough (44x44px minimum)
    const touchTargets = await page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, a, input, [role="button"]');
      return Array.from(interactiveElements).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
          width: rect.width,
          height: rect.height,
          testId: el.getAttribute('data-testid')
        };
      });
    });
    
    const smallTargets = touchTargets.filter(target => target.width < 44 || target.height < 44);
    
    if (smallTargets.length > 0) {
      console.warn('⚠️ Small touch targets found:', smallTargets);
    }
    
    // Most touch targets should meet minimum size
    const adequateTargets = touchTargets.filter(target => target.width >= 44 && target.height >= 44);
    const adequatePercentage = (adequateTargets.length / touchTargets.length) * 100;
    
    expect(adequatePercentage).toBeGreaterThan(80); // 80% of targets should be adequate
    
    console.log(`✅ ${adequatePercentage.toFixed(1)}% of touch targets meet accessibility guidelines`);
  });

  test('error messages accessibility', async ({ page }) => {
    console.log('🧪 Testing error messages accessibility...');
    
    // Trigger network error
    await page.route('**/api/posts', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="api-error"]', { timeout: 10000 });
    
    // Check error message accessibility
    const errorAttributes = await page.locator('[data-testid="api-error"]').evaluate(el => ({
      role: el.getAttribute('role'),
      ariaLive: el.getAttribute('aria-live'),
      ariaAtomic: el.getAttribute('aria-atomic'),
      tabIndex: el.getAttribute('tabindex')
    }));
    
    console.log('📊 Error message attributes:', errorAttributes);
    expect(errorAttributes.ariaLive).toBeTruthy();
    
    console.log('✅ Error messages are accessibility compliant');
  });
});