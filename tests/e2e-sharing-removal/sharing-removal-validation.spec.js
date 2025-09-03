import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Sharing Removal Validation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    
    // Wait for posts to load
    await page.waitForSelector('.post-item', { timeout: 5000 });
  });

  test.describe('Share Button Removal Tests', () => {
    test('should not display any share buttons in feed posts', async ({ page }) => {
      // Test for common share button selectors
      const shareButtonSelectors = [
        'button[aria-label*="share" i]',
        'button[title*="share" i]',
        'button:has-text("Share")',
        '.share-button',
        '[data-testid*="share"]',
        'button[class*="share" i]',
        'svg[aria-label*="share" i]',
        '.fa-share',
        '.icon-share'
      ];

      for (const selector of shareButtonSelectors) {
        const shareButtons = page.locator(selector);
        await expect(shareButtons).toHaveCount(0, {
          message: `Found share button with selector: ${selector}`
        });
      }
    });

    test('should not display share functionality in post actions', async ({ page }) => {
      const posts = page.locator('.post-item');
      const postCount = await posts.count();
      
      expect(postCount).toBeGreaterThan(0);

      // Check each post for share functionality
      for (let i = 0; i < Math.min(postCount, 10); i++) {
        const post = posts.nth(i);
        
        // Look for share-related elements within the post
        const shareElements = post.locator('[class*="share"], [data-testid*="share"], [aria-label*="share" i]');
        await expect(shareElements).toHaveCount(0);
      }
    });

    test('should not have share keyboard shortcuts', async ({ page }) => {
      const posts = page.locator('.post-item').first();
      await posts.focus();

      // Test common share keyboard shortcuts
      const shortcuts = ['s', 'S', 'shift+s'];
      
      for (const shortcut of shortcuts) {
        await page.keyboard.press(shortcut);
        
        // Check that no share modal or popup appeared
        const shareModal = page.locator('[role="dialog"]:has-text("Share")');
        await expect(shareModal).toHaveCount(0);
        
        const sharePopup = page.locator('.share-popup, .share-modal');
        await expect(sharePopup).toHaveCount(0);
      }
    });

    test('should not have share context menu items', async ({ page }) => {
      const posts = page.locator('.post-item').first();
      
      // Right-click on the post
      await posts.click({ button: 'right' });
      
      // Wait briefly for context menu
      await page.waitForTimeout(500);
      
      // Check for share-related context menu items
      const contextMenu = page.locator('[role="menu"], .context-menu');
      if (await contextMenu.count() > 0) {
        const shareItems = contextMenu.locator('[role="menuitem"]:has-text("Share")');
        await expect(shareItems).toHaveCount(0);
      }
    });
  });

  test.describe('Share API Endpoint Tests', () => {
    test('should return 404 for share endpoints', async ({ page, request }) => {
      const shareEndpoints = [
        '/api/posts/share',
        '/api/posts/1/share',
        '/api/share',
        '/share'
      ];

      for (const endpoint of shareEndpoints) {
        const response = await request.get(`http://localhost:3001${endpoint}`);
        // Should either be 404 (not found) or 405 (method not allowed)
        expect([404, 405]).toContain(response.status());
      }
    });

    test('should not accept share POST requests', async ({ request }) => {
      const shareData = {
        postId: 1,
        platform: 'twitter',
        text: 'Check this out!'
      };

      const endpoints = [
        '/api/posts/share',
        '/api/share'
      ];

      for (const endpoint of endpoints) {
        const response = await request.post(`http://localhost:3001${endpoint}`, {
          data: shareData
        });
        // Should return error status
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('UI Accessibility Validation', () => {
    test('should maintain accessibility compliance without share buttons', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper ARIA labels for remaining interactive elements', async ({ page }) => {
      const interactiveElements = page.locator('button, [role="button"], a, input, [tabindex="0"]');
      const count = await interactiveElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = interactiveElements.nth(i);
        const ariaLabel = await element.getAttribute('aria-label');
        const textContent = await element.textContent();
        
        // Ensure no share-related labels remain
        if (ariaLabel) {
          expect(ariaLabel.toLowerCase()).not.toContain('share');
        }
        if (textContent) {
          expect(textContent.toLowerCase().trim()).not.toBe('share');
        }
      }
    });
  });

  test.describe('DOM Structure Validation', () => {
    test('should not contain share-related CSS classes', async ({ page }) => {
      // Get all elements and check their class names
      const allElements = page.locator('*');
      const count = await allElements.count();
      
      // Sample check on visible elements only
      const visibleElements = page.locator('*:visible');
      const visibleCount = await visibleElements.count();
      
      for (let i = 0; i < Math.min(visibleCount, 100); i++) {
        const element = visibleElements.nth(i);
        const className = await element.getAttribute('class');
        
        if (className) {
          const hasShareClass = className.split(' ').some(cls => 
            cls.toLowerCase().includes('share')
          );
          expect(hasShareClass).toBeFalsy();
        }
      }
    });

    test('should not contain share-related data attributes', async ({ page }) => {
      const elementsWithDataAttrs = page.locator('[data-*]');
      const count = await elementsWithDataAttrs.count();
      
      for (let i = 0; i < Math.min(count, 50); i++) {
        const element = elementsWithDataAttrs.nth(i);
        const attributes = await element.evaluate(el => 
          Array.from(el.attributes).map(attr => attr.name)
        );
        
        const shareDataAttrs = attributes.filter(attr => 
          attr.startsWith('data-') && attr.toLowerCase().includes('share')
        );
        
        expect(shareDataAttrs).toHaveLength(0);
      }
    });
  });

  test.describe('JavaScript Console Validation', () => {
    test('should not have share-related JavaScript errors', async ({ page }) => {
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));
      
      // Navigate and interact with the page
      await page.goto('/');
      await page.waitForSelector('.post-item');
      
      // Click on like buttons to trigger interactions
      const likeButtons = page.locator('button[aria-label*="like" i]');
      const likeCount = await likeButtons.count();
      
      if (likeCount > 0) {
        await likeButtons.first().click();
      }
      
      // Check console messages for share-related errors
      const shareErrors = consoleMessages.filter(msg => 
        msg.toLowerCase().includes('share') && 
        (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('undefined'))
      );
      
      expect(shareErrors).toHaveLength(0);
    });
  });
});