import { test, expect } from '@playwright/test';
import { AgentsListPage, AgentHomePage } from '../../page-objects';
import { testAgents } from '../../fixtures/test-data';

/**
 * Accessibility Compliance Tests for Dynamic Agent Pages
 * Tests WCAG 2.1 AA compliance and screen reader compatibility
 */
test.describe('Accessibility Compliance', () => {
  let agentsListPage: AgentsListPage;
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentsListPage = new AgentsListPage(page);
    agentHomePage = new AgentHomePage(page);
  });

  test('should have proper semantic HTML structure', async () => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Check for proper heading hierarchy
    const headings = await agentHomePage.page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    
    // Should have a main heading (h1 or h2)
    const mainHeading = agentHomePage.page.locator('h1, h2').first();
    await expect(mainHeading).toBeVisible();
    
    // Check for main content area
    const main = agentHomePage.page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    
    // Check for navigation landmarks
    const navigation = agentHomePage.page.locator('nav, [role="navigation"]');
    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible();
    }
  });

  test('should provide proper ARIA labels and roles', async () => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Check for ARIA labels on interactive elements
    const ariaLabels = await agentHomePage.validateAriaLabels();
    expect(ariaLabels.length).toBeGreaterThan(0);
    
    // Tabs should have proper ARIA attributes
    const tabs = agentHomePage.page.locator('[role="tab"]');
    if (await tabs.count() > 0) {
      for (let i = 0; i < await tabs.count(); i++) {
        const tab = tabs.nth(i);
        await expect(tab).toHaveAttribute('aria-selected');
      }
    }
    
    // Buttons should have accessible names
    const buttons = agentHomePage.page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Check first 10 buttons
      const button = buttons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasText = await button.textContent();
      const hasAriaLabelledBy = await button.getAttribute('aria-labelledby');
      
      expect(hasAriaLabel || hasText || hasAriaLabelledBy).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Test basic keyboard navigation
    await agentHomePage.validateKeyboardNavigation();
    
    // Tab through interactive elements
    const interactiveElements = [];
    let currentElement = null;
    
    for (let i = 0; i < 20; i++) { // Test first 20 tab stops
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focused = page.locator(':focus');
      if (await focused.count() > 0) {
        const element = await focused.first().textContent();
        if (element && element !== currentElement) {
          interactiveElements.push(element);
          currentElement = element;
        }
      }
    }
    
    expect(interactiveElements.length).toBeGreaterThan(0);
    
    // Test Enter key on focusable elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    if (await focusedElement.count() > 0) {
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      if (['button', 'a', 'input'].includes(tagName)) {
        await page.keyboard.press('Enter');
        // Should trigger some action without errors
        await page.waitForTimeout(500);
      }
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Test color contrast for text elements
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div:has-text(/\\w+/)');
    const sampleSize = Math.min(await textElements.count(), 10);
    
    for (let i = 0; i < sampleSize; i++) {
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
        
        // Basic check: text should not be transparent or same as background
        expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
        expect(styles.color).not.toBe(styles.backgroundColor);
      }
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Check for screen reader friendly content
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').count();
    expect(landmarks).toBeGreaterThan(0);
    
    // Check for alternative text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaLabelledBy = await img.getAttribute('aria-labelledby');
      
      // Images should have alt text or aria labels
      expect(alt !== null || ariaLabel !== null || ariaLabelledBy !== null).toBe(true);
    }
    
    // Check for skip links or similar navigation aids
    const skipLinks = page.locator('[href="#main"], [href="#content"], :text("Skip to")');
    // Skip links are optional but good for accessibility
  });

  test('should handle focus management correctly', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Test focus trap in modals (if any)
    const modalTriggers = page.locator('button:has-text("Settings"), button:has-text("Edit")');
    
    if (await modalTriggers.count() > 0) {
      await modalTriggers.first().click();
      await page.waitForTimeout(500);
      
      // Check if focus is managed in modal
      const modal = page.locator('[role="dialog"], .modal');
      if (await modal.count() > 0) {
        // Focus should be within modal
        const focusedElement = page.locator(':focus');
        const isInModal = await focusedElement.evaluate(el => {
          const modal = document.querySelector('[role="dialog"], .modal');
          return modal ? modal.contains(el) : false;
        });
        
        expect(isInModal).toBe(true);
      }
    }
    
    // Test focus restoration after tab switching
    const firstTab = page.locator('[role="tab"]').first();
    if (await firstTab.count() > 0) {
      await firstTab.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      
      // Focus should still be manageable
      await page.keyboard.press('Tab');
      const newFocus = page.locator(':focus');
      await expect(newFocus).toBeVisible();
    }
  });

  test('should provide proper form accessibility', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Enable edit mode if available to test form accessibility
    const editButton = agentHomePage.editButton;
    if (await editButton.isVisible()) {
      await editButton.click();
      await agentHomePage.clickTab('Settings');
      
      // Check form labels
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBe(true);
        }
      }
      
      // Check for error message accessibility
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await nameInput.fill(''); // Empty name
        
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(500);
          
          // Error messages should be associated with inputs
          const errorMessages = page.locator('[role="alert"], .error, [aria-live]');
          if (await errorMessages.count() > 0) {
            await expect(errorMessages.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * { 
            background-color: white !important; 
            color: black !important; 
            border-color: black !important; 
          }
        }
      `
    });
    
    // Force high contrast
    await page.evaluate(() => {
      document.documentElement.style.setProperty('background-color', 'white', 'important');
      document.documentElement.style.setProperty('color', 'black', 'important');
    });
    
    await page.waitForTimeout(500);
    
    // Content should still be readable
    const agentName = await agentHomePage.getAgentName();
    expect(agentName).toBeTruthy();
    
    // Interactive elements should still be visible
    const buttons = page.locator('button');
    if (await buttons.count() > 0) {
      await expect(buttons.first()).toBeVisible();
    }
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await agentHomePage.goto(testAgents[0].id);
    
    // Animations should be reduced or disabled
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
    
    if (await animatedElements.count() > 0) {
      // Check that animations respect reduced motion
      const animationDuration = await animatedElements.first().evaluate(el => {
        const computed = window.getComputedStyle(el);
        return computed.animationDuration;
      });
      
      // Animations should be very short or disabled
      expect(animationDuration === '0s' || animationDuration === 'none').toBe(true);
    }
    
    // Tab switching should still work smoothly
    await agentHomePage.clickTab('Posts');
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Posts');
  });

  test('should be readable with screen reader simulation', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Get all text content that would be read by screen reader
    const readableContent = await page.evaluate(() => {
      // Get all visible text content
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        node => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
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
    
    // Should contain meaningful content
    expect(readableContent.length).toBeGreaterThan(100);
    expect(readableContent.toLowerCase()).toContain('agent');
    
    // Should not contain too much repetitive or meaningless text
    const words = readableContent.split(' ');
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniquenessRatio = uniqueWords.size / words.length;
    
    expect(uniquenessRatio).toBeGreaterThan(0.3); // At least 30% unique words
  });

  test('should support assistive technologies', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Check for live regions for dynamic content
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    
    // Live regions are good for dynamic updates
    if (await liveRegions.count() > 0) {
      await expect(liveRegions.first()).toBeAttached();
    }
    
    // Check for proper heading structure
    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headingLevels.length).toBeGreaterThan(0);
    
    // Check for descriptive link text
    const links = page.locator('a');
    const linkCount = await links.count();
    
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = links.nth(i);
      const linkText = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      const meaningfulText = linkText || ariaLabel;
      
      if (meaningfulText) {
        // Links should have descriptive text (not just "click here")
        expect(meaningfulText.toLowerCase()).not.toBe('click here');
        expect(meaningfulText.toLowerCase()).not.toBe('read more');
        expect(meaningfulText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should handle keyboard shortcuts appropriately', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Test common keyboard shortcuts
    await page.keyboard.press('Home');
    await page.waitForTimeout(100);
    
    // Home key should work (go to top)
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    expect(scrollPosition).toBe(0);
    
    // Test escape key functionality (if modals exist)
    const modalTrigger = page.locator('button:has-text("Edit"), button:has-text("Settings")');
    if (await modalTrigger.count() > 0) {
      await modalTrigger.first().click();
      await page.waitForTimeout(300);
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      // Modal should close (if it was opened)
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should provide proper error handling accessibility', async ({ page }) => {
    // Simulate error conditions
    await page.route('**/api/agents/**', route => {
      route.abort();
    });
    
    await agentHomePage.goto('non-existent-agent');
    
    // Error messages should be accessible
    const errorContent = await page.textContent('body');
    expect(errorContent).toBeTruthy();
    
    // Should have proper headings even in error state
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
    
    // Should have focus management in error state
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});