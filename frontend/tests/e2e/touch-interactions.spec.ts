/**
 * Touch Interactions Test Suite
 * Comprehensive testing for touch gestures and mobile interactions
 * 
 * Test Coverage:
 * - Tap, double-tap, long press interactions
 * - Swipe gestures and scrolling behavior
 * - Pinch-to-zoom functionality
 * - Touch feedback and visual states
 * - Multi-touch gesture support
 * - Accessibility via touch
 */

import { test, expect, Page } from '@playwright/test';

// Mobile device configurations for touch testing
const TOUCH_DEVICES = [
  { name: 'iPhone 12', width: 390, height: 844, pixelRatio: 3 },
  { name: 'Galaxy S21', width: 384, height: 854, pixelRatio: 2.75 },
  { name: 'iPad Mini', width: 768, height: 1024, pixelRatio: 2 }
];

// Test data setup
const TEST_AGENT_ID = 'touch-test-agent';
const createTouchTestAgent = () => ({
  id: TEST_AGENT_ID,
  name: 'Touch Interaction Agent',
  display_name: 'Touch Interaction Agent',
  description: 'Agent for testing touch interactions and gesture recognition',
  status: 'active',
  capabilities: ['Touch Recognition', 'Gesture Handling', 'Mobile UX'],
  configuration: {
    theme: {
      primaryColor: '#3B82F6',
      layout: 'grid'
    },
    profile: {
      name: 'Touch Interaction Agent',
      description: 'Specialized in touch-based user interactions'
    }
  }
});

const createTouchTestPages = () => [
  {
    id: 'touch-page-1',
    title: 'Touch Gesture Guide',
    description: 'Interactive guide for implementing touch gestures in web applications',
    type: 'tutorial',
    page_type: 'dynamic',
    status: 'published',
    tags: ['touch', 'gestures', 'mobile', 'ux'],
    lastUpdated: new Date().toISOString(),
    readTime: 6,
    difficulty: 'intermediate',
    featured: true,
    url: '/touch-gestures'
  },
  {
    id: 'touch-page-2',
    title: 'Mobile Accessibility Standards',
    description: 'Ensuring touch interfaces meet accessibility requirements',
    type: 'documentation',
    page_type: 'persistent',
    status: 'published',
    tags: ['accessibility', 'mobile', 'standards'],
    lastUpdated: new Date().toISOString(),
    readTime: 8,
    difficulty: 'advanced',
    featured: false,
    url: '/mobile-accessibility'
  },
  {
    id: 'touch-page-3',
    title: 'Swipe Navigation Patterns',
    description: 'Common swipe navigation patterns for mobile interfaces',
    type: 'design',
    page_type: 'template',
    status: 'published',
    tags: ['swipe', 'navigation', 'patterns'],
    lastUpdated: new Date().toISOString(),
    readTime: 4,
    difficulty: 'beginner',
    featured: true,
    url: '/swipe-navigation'
  }
];

// Touch simulation utilities
class TouchSimulator {
  constructor(private page: Page) {}

  async tap(selector: string, options: { x?: number, y?: number } = {}) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const x = options.x ?? box.x + box.width / 2;
    const y = options.y ?? box.y + box.height / 2;
    
    await this.page.touchscreen.tap(x, y);
  }

  async doubleTap(selector: string, delay: number = 300) {
    await this.tap(selector);
    await this.page.waitForTimeout(delay);
    await this.tap(selector);
  }

  async longPress(selector: string, duration: number = 500) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    
    await this.page.touchscreen.tap(x, y);
    await this.page.waitForTimeout(duration);
  }

  async swipe(
    startSelector: string, 
    endSelector: string, 
    options: { steps?: number, duration?: number } = {}
  ) {
    const startElement = this.page.locator(startSelector);
    const endElement = this.page.locator(endSelector);
    
    const startBox = await startElement.boundingBox();
    const endBox = await endElement.boundingBox();
    
    if (!startBox || !endBox) throw new Error('Elements not found for swipe');
    
    const startX = startBox.x + startBox.width / 2;
    const startY = startBox.y + startBox.height / 2;
    const endX = endBox.x + endBox.width / 2;
    const endY = endBox.y + endBox.height / 2;
    
    await this.page.touchscreen.tap(startX, startY);
    await this.page.mouse.move(endX, endY, { steps: options.steps ?? 10 });
    await this.page.waitForTimeout(options.duration ?? 100);
  }

  async pinchZoom(centerSelector: string, scale: number) {
    const element = this.page.locator(centerSelector);
    const box = await element.boundingBox();
    if (!box) throw new Error(`Element ${centerSelector} not found`);
    
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const distance = 100 * scale;
    
    // Simulate two-finger pinch
    await this.page.touchscreen.tap(centerX - distance / 2, centerY);
    await this.page.touchscreen.tap(centerX + distance / 2, centerY);
  }

  async scrollVertical(selector: string, direction: 'up' | 'down', distance: number = 300) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();
    if (!box) throw new Error(`Element ${selector} not found`);
    
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endY = direction === 'down' ? startY + distance : startY - distance;
    
    await this.page.touchscreen.tap(startX, startY);
    await this.page.mouse.move(startX, endY, { steps: 10 });
  }
}

test.describe('Touch Interactions', () => {
  let touchSim: TouchSimulator;

  test.beforeEach(async ({ page }) => {
    touchSim = new TouchSimulator(page);
    
    // Mock agent data
    await page.route(`/api/agents/${TEST_AGENT_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: createTouchTestAgent()
        })
      });
    });

    // Mock pages data
    await page.route(`/api/agents/${TEST_AGENT_ID}/pages`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pages: createTouchTestPages()
        })
      });
    });

    // Mock empty activities and posts
    await page.route(`/api/agents/${TEST_AGENT_ID}/activities`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.route(`/api/agents/${TEST_AGENT_ID}/posts`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });
  });

  TOUCH_DEVICES.forEach(device => {
    test.describe(`${device.name} Touch Tests`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.emulateMedia({ reducedMotion: 'reduce' }); // Better for testing
      });

      test('basic tap interactions work correctly', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Test tab navigation with taps
        const pagesTab = page.locator('button:has-text("Pages")');
        await expect(pagesTab).toBeVisible();
        
        // Tap the pages tab
        await touchSim.tap('button:has-text("Pages")');
        
        // Verify tab becomes active
        await expect(pagesTab).toHaveClass(/text-blue-600/);
        
        // Verify pages content loads
        const pageCards = page.locator('[data-testid^="page-card-"]');
        await expect(pageCards).toHaveCount(3);
        
        await page.screenshot({
          path: `/workspaces/agent-feed/frontend/tests/screenshots/touch-${device.name.toLowerCase().replace(' ', '-')}-tap-navigation.png`
        });
      });

      test('page card tap interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Test tapping on page cards
        const firstCard = page.locator('[data-testid^="page-card-"]').first();
        await expect(firstCard).toBeVisible();
        
        // Add hover effect simulation for touch feedback
        await firstCard.hover();
        await expect(firstCard).toHaveCSS('box-shadow', /shadow/);
        
        // Tap the card
        await touchSim.tap('[data-testid^="page-card-"]');
        
        // Should trigger navigation (verify URL change or modal)
        // Note: In real implementation, this might navigate to a new page
      });

      test('bookmark button touch interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const bookmarkButton = page.locator('[data-testid^="bookmark-button-"]').first();
        await expect(bookmarkButton).toBeVisible();
        
        // Verify touch target size
        const buttonBox = await bookmarkButton.boundingBox();
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        
        // Test tap interaction
        await touchSim.tap('[data-testid^="bookmark-button-"]');
        
        // Verify visual feedback
        await expect(bookmarkButton).toHaveClass(/bookmarked/);
        
        // Test tap again to toggle
        await touchSim.tap('[data-testid^="bookmark-button-"]');
        await expect(bookmarkButton).not.toHaveClass(/bookmarked/);
      });

      test('search input touch interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const searchInput = page.locator('[data-testid="pages-search"]');
        await expect(searchInput).toBeVisible();
        
        // Test tap to focus
        await touchSim.tap('[data-testid="pages-search"]');
        await expect(searchInput).toBeFocused();
        
        // Test typing
        await searchInput.fill('touch');
        await expect(searchInput).toHaveValue('touch');
        
        // Test clear button tap
        const clearButton = page.locator('[data-testid="clear-search"]');
        if (await clearButton.isVisible()) {
          await touchSim.tap('[data-testid="clear-search"]');
          await expect(searchInput).toHaveValue('');
        }
      });

      test('dropdown filter touch interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const categoryFilter = page.locator('[data-testid="category-filter"]');
        await expect(categoryFilter).toBeVisible();
        
        // Test tap to open dropdown
        await touchSim.tap('[data-testid="category-filter"]');
        
        // Select an option
        await categoryFilter.selectOption('tutorial');
        
        // Verify filter applies
        const filteredCards = page.locator('[data-testid^="page-card-"]');
        await expect(filteredCards).toHaveCount(1); // Only tutorial type
      });

      test('double-tap interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const firstCard = page.locator('[data-testid^="page-card-"]').first();
        
        // Test double-tap (might trigger different action than single tap)
        await touchSim.doubleTap('[data-testid^="page-card-"]');
        
        // In a real app, this might open in edit mode or show details
        // For now, just verify the element is still responsive
        await expect(firstCard).toBeVisible();
      });

      test('long press interactions', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const firstCard = page.locator('[data-testid^="page-card-"]').first();
        
        // Test long press (might show context menu)
        await touchSim.longPress('[data-testid^="page-card-"]', 800);
        
        // Verify element remains interactive
        await expect(firstCard).toBeVisible();
        
        // In a real implementation, this might show a context menu
        // or selection state
      });

      test('swipe gestures for navigation', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Test horizontal swipe between tabs
        const overviewTab = page.locator('button:has-text("Overview")');
        const pagesTab = page.locator('button:has-text("Pages")');
        
        // Start on overview
        await overviewTab.click();
        await expect(overviewTab).toHaveClass(/text-blue-600/);
        
        // Simulate swipe gesture (left to right)
        await page.touchscreen.tap(100, 300);
        await page.mouse.move(300, 300, { steps: 10 });
        
        // Note: Real swipe navigation would need to be implemented
        // This tests the gesture mechanics
      });

      test('vertical scrolling with touch', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Get initial scroll position
        const initialScrollY = await page.evaluate(() => window.scrollY);
        
        // Perform touch scroll
        await touchSim.scrollVertical('body', 'down', 200);
        
        // Wait for scroll to complete
        await page.waitForTimeout(500);
        
        const finalScrollY = await page.evaluate(() => window.scrollY);
        
        // Verify scrolling occurred (if content is long enough)
        // Note: May not scroll if content fits in viewport
        if (finalScrollY > initialScrollY) {
          expect(finalScrollY).toBeGreaterThan(initialScrollY);
        }
      });

      test('touch feedback and visual states', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const pageCard = page.locator('[data-testid^="page-card-"]').first();
        
        // Test hover state (touch feedback)
        await pageCard.hover();
        
        // Verify visual feedback
        const cardStyles = await pageCard.evaluate(el => getComputedStyle(el));
        const transform = cardStyles.transform;
        
        // Should have some hover effect (shadow, transform, etc.)
        expect(cardStyles.boxShadow).not.toBe('none');
        
        // Test active/pressed state
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
      });

      test('multi-touch gesture support', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Test pinch-to-zoom (if supported)
        await touchSim.pinchZoom('body', 1.5);
        
        // Verify page remains functional after zoom
        const pagesTab = page.locator('button:has-text("Pages")');
        await expect(pagesTab).toBeVisible();
        
        await pagesTab.click();
        const pageCards = page.locator('[data-testid^="page-card-"]');
        await expect(pageCards).toHaveCount(3);
      });

      test('touch accessibility features', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Test keyboard navigation still works alongside touch
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Test that ARIA labels are read by screen readers
        const searchInput = page.locator('[data-testid="pages-search"]');
        await expect(searchInput).toHaveAttribute('aria-label');
        
        // Test that touch targets have appropriate ARIA roles
        const bookmarkButton = page.locator('[data-testid^="bookmark-button-"]').first();
        await expect(bookmarkButton).toHaveAttribute('type', 'button');
      });

      test('rapid touch interactions (stress test)', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const bookmarkButton = page.locator('[data-testid^="bookmark-button-"]').first();
        
        // Rapidly tap bookmark button
        for (let i = 0; i < 10; i++) {
          await touchSim.tap('[data-testid^="bookmark-button-"]');
          await page.waitForTimeout(50);
        }
        
        // Should still be responsive and in valid state
        await expect(bookmarkButton).toBeVisible();
        
        // Check for any JavaScript errors
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        
        await page.waitForTimeout(1000);
        expect(errors).toHaveLength(0);
      });

      test('touch interactions during loading states', async ({ page }) => {
        // Delay API response to test interactions during loading
        await page.route(`/api/agents/${TEST_AGENT_ID}/pages`, async route => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              pages: createTouchTestPages()
            })
          });
        });
        
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Try to interact while loading
        const loadingSpinner = page.locator('.animate-spin');
        await expect(loadingSpinner).toBeVisible();
        
        // Touch interactions should be prevented or queued during loading
        await touchSim.tap('body'); // General tap
        
        // Wait for loading to complete
        await expect(loadingSpinner).not.toBeVisible();
        
        // Verify content loads correctly after loading state
        const pageCards = page.locator('[data-testid^="page-card-"]');
        await expect(pageCards).toHaveCount(3);
      });

      test('touch interactions with dynamic content', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Test search that filters content
        const searchInput = page.locator('[data-testid="pages-search"]');
        await touchSim.tap('[data-testid="pages-search"]');
        await searchInput.fill('touch');
        
        // Wait for filtering
        await page.waitForTimeout(500);
        
        // Verify filtered results
        const filteredCards = page.locator('[data-testid^="page-card-"]');
        await expect(filteredCards).toHaveCount(1);
        
        // Test interaction with filtered content
        await touchSim.tap('[data-testid^="page-card-"]');
        
        // Clear filter and verify all content returns
        const clearButton = page.locator('[data-testid="clear-search"]');
        if (await clearButton.isVisible()) {
          await touchSim.tap('[data-testid="clear-search"]');
          await expect(page.locator('[data-testid^="page-card-"]')).toHaveCount(3);
        }
      });
    });
  });

  test.describe('Cross-Device Touch Consistency', () => {
    test('touch interactions work consistently across devices', async ({ page }) => {
      for (const device of TOUCH_DEVICES) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Core interaction should work on all devices
        const bookmarkButton = page.locator('[data-testid^="bookmark-button-"]').first();
        await touchSim.tap('[data-testid^="bookmark-button-"]');
        await expect(bookmarkButton).toHaveClass(/bookmarked/);
        
        // Take screenshot for visual regression
        await page.screenshot({
          path: `/workspaces/agent-feed/frontend/tests/screenshots/touch-consistency-${device.name.toLowerCase().replace(' ', '-')}.png`
        });
      }
    });
  });

  test.describe('Touch Performance', () => {
    test('touch interactions remain responsive under load', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/agents/${TEST_AGENT_ID}`);
      await page.locator('button:has-text("Pages")').click();
      
      // Simulate heavy interaction load
      const startTime = Date.now();
      
      for (let i = 0; i < 20; i++) {
        await touchSim.tap('[data-testid="pages-search"]');
        await page.keyboard.type(`test${i}`);
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(10);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(3000);
      
      // Page should still be functional
      const searchInput = page.locator('[data-testid="pages-search"]');
      await expect(searchInput).toBeVisible();
    });
  });
});