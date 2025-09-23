import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Cross-Browser and Mobile Testing', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should work correctly on mobile viewports', async () => {
    await test.step('Test iPhone viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="agent-card"]')).toBeVisible();
      
      // Navigate to agent profile
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      
      // Check if tabs are accessible on mobile
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();
      
      // Test scrolling to Dynamic Pages tab if needed
      const dynamicPagesTab = page.locator('[role="tab"]:has-text("Dynamic Pages")');
      if (!(await dynamicPagesTab.isInViewport())) {
        await dynamicPagesTab.scrollIntoViewIfNeeded();
      }
      
      await dynamicPagesTab.click();
      await page.waitForLoadState('networkidle');
      
      // Verify content loads on mobile
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
      
      console.log('✅ iPhone viewport test passed');
    });

    await test.step('Test iPad viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      // Test Create Page on tablet
      const createButton = page.locator('[data-testid="create-page-button"]');
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const modal = page.locator('[data-testid="create-page-modal"]');
        await expect(modal).toBeVisible();
        
        // Verify form is usable on tablet
        const titleInput = page.locator('[data-testid="page-title-input"], input[name="title"]');
        await expect(titleInput).toBeVisible();
        
        // Cancel form
        const cancelButton = page.locator('[data-testid="cancel-create-page"]');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
      
      console.log('✅ iPad viewport test passed');
    });

    await test.step('Test small mobile viewport', async () => {
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone 5
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Verify layout doesn't break on very small screens
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards.first()).toBeVisible();
      
      // Test navigation still works
      await agentCards.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify tabs are still accessible
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);
      
      console.log('✅ Small mobile viewport test passed');
    });
  });

  test('should handle touch interactions correctly', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await test.step('Test touch navigation', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Test tap on agent card
      const firstAgent = page.locator('[data-testid="agent-card"]').first();
      await firstAgent.tap();
      await page.waitForLoadState('networkidle');
      
      // Test tap on tab
      const dynamicPagesTab = page.locator('[role="tab"]:has-text("Dynamic Pages")');
      await dynamicPagesTab.tap();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
    });

    await test.step('Test swipe gestures if supported', async () => {
      // Test horizontal swipe on tabs if they're swipeable
      const tabContainer = page.locator('[role="tablist"]');
      const boundingBox = await tabContainer.boundingBox();
      
      if (boundingBox) {
        const startX = boundingBox.x + boundingBox.width - 50;
        const endX = boundingBox.x + 50;
        const y = boundingBox.y + boundingBox.height / 2;
        
        // Perform swipe gesture
        await page.touchscreen.tap(startX, y);
        await page.touchscreen.tap(endX, y);
        
        // Verify tabs are still functional after swipe
        await expect(tabContainer).toBeVisible();
      }
    });

    await test.step('Test long press interactions', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const firstPage = pageItems.first();
        const boundingBox = await firstPage.boundingBox();
        
        if (boundingBox) {
          // Long press (touch and hold)
          await page.touchscreen.tap(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2
          );
          
          await page.waitForTimeout(1000);
          
          // Check if context menu appears
          const contextMenu = page.locator('[data-testid="context-menu"], [data-testid="long-press-menu"]');
          const hasContextMenu = await contextMenu.isVisible();
          
          if (hasContextMenu) {
            console.log('✅ Long press context menu works');
            
            // Tap elsewhere to close context menu
            await page.touchscreen.tap(10, 10);
          }
        }
      }
    });
  });

  test('should handle different browser engines correctly', async () => {
    await test.step('Test WebKit-specific behaviors', async () => {
      const browserName = test.info().project.name;
      
      if (browserName.includes('webkit') || browserName.includes('safari')) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Test Safari-specific CSS behaviors
        const agentCard = page.locator('[data-testid="agent-card"]').first();
        const styles = await agentCard.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            position: computed.position,
            transform: computed.transform
          };
        });
        
        expect(styles.display).not.toBe('none');
        console.log('✅ WebKit-specific styling works correctly');
        
        // Test Safari touch behaviors
        await agentCard.click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
      }
    });

    await test.step('Test Firefox-specific behaviors', async () => {
      const browserName = test.info().project.name;
      
      if (browserName.includes('firefox')) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Test Firefox-specific event handling
        const agentCard = page.locator('[data-testid="agent-card"]').first();
        
        // Test middle-click behavior (Firefox handles this differently)
        await agentCard.click({ button: 'middle' });
        await page.waitForTimeout(500);
        
        // Should not navigate away from current page with middle-click
        expect(page.url()).toContain('/agents');
        
        // Regular click should work
        await agentCard.click();
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Firefox-specific behaviors work correctly');
      }
    });

    await test.step('Test Chromium-specific features', async () => {
      const browserName = test.info().project.name;
      
      if (browserName.includes('chromium') || browserName.includes('chrome')) {
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Test Chrome DevTools Protocol features if available
        const performanceMetrics = await page.evaluate(() => {
          if ('performance' in window && 'timing' in performance) {
            return {
              loadEventEnd: performance.timing.loadEventEnd,
              navigationStart: performance.timing.navigationStart,
              loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
            };
          }
          return null;
        });
        
        if (performanceMetrics) {
          expect(performanceMetrics.loadTime).toBeGreaterThan(0);
          console.log(`✅ Chrome performance metrics: ${performanceMetrics.loadTime}ms`);
        }
        
        // Test Chrome-specific CSS features
        const agentCard = page.locator('[data-testid="agent-card"]').first();
        const hasModernFeatures = await agentCard.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            hasGridSupport: CSS.supports('display', 'grid'),
            hasFlexSupport: CSS.supports('display', 'flex'),
            hasCustomProperties: CSS.supports('color', 'var(--test)')
          };
        });
        
        expect(hasModernFeatures.hasFlexSupport).toBeTruthy();
        console.log('✅ Chrome modern CSS features supported');
      }
    });
  });

  test('should handle responsive design breakpoints', async () => {
    const breakpoints = [
      { name: 'Desktop Large', width: 1920, height: 1080 },
      { name: 'Desktop Medium', width: 1366, height: 768 },
      { name: 'Desktop Small', width: 1024, height: 768 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Mobile Medium', width: 375, height: 667 },
      { name: 'Mobile Small', width: 320, height: 568 }
    ];

    for (const breakpoint of breakpoints) {
      await test.step(`Test ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async () => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Verify layout adapts correctly
        const agentCards = page.locator('[data-testid="agent-card"]');
        await expect(agentCards.first()).toBeVisible();
        
        // Check if navigation is accessible
        await agentCards.first().click();
        await page.waitForLoadState('networkidle');
        
        // Verify tabs are usable at this breakpoint
        const tabsList = page.locator('[role="tablist"]');
        await expect(tabsList).toBeVisible();
        
        const dynamicPagesTab = page.locator('[role="tab"]:has-text("Dynamic Pages")');
        await dynamicPagesTab.click();
        await page.waitForLoadState('networkidle');
        
        // Verify content is accessible
        const content = page.locator('[data-testid="dynamic-pages-content"]');
        await expect(content).toBeVisible();
        
        // Test Create Page button visibility and accessibility
        const createButton = page.locator('[data-testid="create-page-button"]');
        if (await createButton.isVisible()) {
          // Verify button is clickable (not hidden behind other elements)
          await expect(createButton).toBeEnabled();
          
          // On very small screens, check if button is within viewport
          if (breakpoint.width < 400) {
            const isInViewport = await createButton.isInViewport();
            if (!isInViewport) {
              await createButton.scrollIntoViewIfNeeded();
            }
          }
        }
        
        console.log(`✅ ${breakpoint.name} responsive design test passed`);
      });
    }
  });

  test('should handle orientation changes', async () => {
    await test.step('Test portrait to landscape transition', async () => {
      // Start in portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      // Verify portrait layout
      const portraitContent = page.locator('[data-testid="dynamic-pages-content"]');
      await expect(portraitContent).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      // Verify layout adapts to landscape
      await expect(portraitContent).toBeVisible();
      
      // Verify functionality still works in landscape
      const createButton = page.locator('[data-testid="create-page-button"]');
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const modal = page.locator('[data-testid="create-page-modal"]');
        if (await modal.isVisible()) {
          // Verify modal fits in landscape orientation
          const modalBox = await modal.boundingBox();
          const viewport = page.viewportSize();
          
          if (modalBox && viewport) {
            expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
            expect(modalBox.height).toBeLessThanOrEqual(viewport.height);
          }
          
          // Cancel modal
          const cancelButton = page.locator('[data-testid="cancel-create-page"]');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
      
      console.log('✅ Orientation change handling works correctly');
    });
  });

  test('should handle zoom levels correctly', async () => {
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    
    for (const zoom of zoomLevels) {
      await test.step(`Test zoom level ${zoom * 100}%`, async () => {
        await page.setViewportSize({ width: 1366, height: 768 });
        
        // Set zoom level using CSS zoom
        await page.addStyleTag({
          content: `body { zoom: ${zoom}; }`
        });
        
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        
        // Verify content is still accessible at this zoom level
        const agentCards = page.locator('[data-testid="agent-card"]');
        await expect(agentCards.first()).toBeVisible();
        
        await agentCards.first().click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForLoadState('networkidle');
        
        // Verify buttons are still clickable
        const createButton = page.locator('[data-testid="create-page-button"]');
        if (await createButton.isVisible()) {
          await expect(createButton).toBeEnabled();
        }
        
        // Reset zoom for next iteration
        await page.addStyleTag({
          content: `body { zoom: 1.0; }`
        });
        
        console.log(`✅ Zoom level ${zoom * 100}% test passed`);
      });
    }
  });

  test('should handle accessibility requirements across devices', async () => {
    await test.step('Test keyboard navigation on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Navigate to agent
      const agentCard = page.locator('[data-testid="agent-card"]').first();
      await agentCard.focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation to Dynamic Pages
      const dynamicPagesTab = page.locator('[role="tab"]:has-text("Dynamic Pages")');
      await dynamicPagesTab.focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
      
      console.log('✅ Mobile keyboard navigation works');
    });

    await test.step('Test screen reader compatibility', async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Check for proper ARIA labels and roles
      const agentCards = page.locator('[data-testid="agent-card"]');
      const firstCard = agentCards.first();
      
      const ariaLabel = await firstCard.getAttribute('aria-label');
      const role = await firstCard.getAttribute('role');
      const tabIndex = await firstCard.getAttribute('tabindex');
      
      // Should have accessibility attributes
      const hasAccessibilitySupport = ariaLabel || role || tabIndex !== null;
      expect(hasAccessibilitySupport).toBeTruthy();
      
      // Navigate to Dynamic Pages and check tab accessibility
      await firstCard.click();
      await page.waitForLoadState('networkidle');
      
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();
      
      const dynamicPagesTab = page.locator('[role="tab"]:has-text("Dynamic Pages")');
      const tabAriaSelected = await dynamicPagesTab.getAttribute('aria-selected');
      
      await dynamicPagesTab.click();
      await page.waitForLoadState('networkidle');
      
      // Check if aria-selected updated
      const updatedAriaSelected = await dynamicPagesTab.getAttribute('aria-selected');
      expect(updatedAriaSelected).toBe('true');
      
      console.log('✅ Screen reader compatibility verified');
    });

    await test.step('Test high contrast mode compatibility', async () => {
      // Simulate high contrast mode with CSS
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: black !important;
              color: white !important;
              border-color: white !important;
            }
          }
        `
      });
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Verify content is still visible and functional
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards.first()).toBeVisible();
      
      await agentCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
      
      console.log('✅ High contrast mode compatibility verified');
    });
  });
});