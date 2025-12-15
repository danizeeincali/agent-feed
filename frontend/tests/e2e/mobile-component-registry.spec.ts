/**
 * Mobile Component Registry Tests
 * Comprehensive mobile responsiveness testing for agent page components
 * 
 * Test Coverage:
 * - Component rendering on mobile viewports
 * - Touch interaction functionality
 * - Responsive layout behavior
 * - Mobile-specific UI elements
 * - Component accessibility on mobile
 */

import { test, expect, devices, Page } from '@playwright/test';

// Mobile viewport configurations
const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'Galaxy S21': { width: 384, height: 854 },
  'iPad Mini': { width: 768, height: 1024 },
  'Small Mobile': { width: 320, height: 568 }
};

// Component test selectors
const SELECTORS = {
  agentPagesTab: '[data-testid="agent-pages-tab"]',
  pageCard: '[data-testid^="page-card-"]',
  searchInput: '[data-testid="pages-search"]',
  filterDropdown: '[data-testid="category-filter"]',
  bookmarkButton: '[data-testid^="bookmark-button-"]',
  emptyState: '[data-testid="empty-pages-state"]',
  metricsGrid: '[data-testid="enhanced-metrics-grid"]',
  welcomeMessage: '[data-testid="enhanced-welcome-message"]'
};

// Test data factory for agent pages
const createTestAgentData = () => ({
  id: 'test-agent-mobile',
  name: 'Mobile Test Agent',
  display_name: 'Mobile Test Agent',
  description: 'Agent for mobile responsiveness testing',
  status: 'active',
  capabilities: ['Mobile Testing', 'Responsive Design', 'Touch UI'],
  configuration: {
    theme: {
      primaryColor: '#3B82F6',
      layout: 'grid'
    }
  }
});

test.describe('Mobile Component Registry', () => {
  // Configure mobile device testing
  Object.entries(MOBILE_VIEWPORTS).forEach(([deviceName, viewport]) => {
    test.describe(`${deviceName} (${viewport.width}x${viewport.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
        // Enable mobile simulation
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
          });
        });
        
        // Mock agent data for mobile testing
        await page.route('/api/agents/test-agent-mobile', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: createTestAgentData()
            })
          });
        });

        // Mock pages API for mobile testing
        await page.route('/api/agents/test-agent-mobile/pages', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              pages: [
                {
                  id: 'mobile-page-1',
                  title: 'Mobile Responsive Page',
                  description: 'A test page optimized for mobile devices with touch interactions',
                  type: 'dynamic',
                  page_type: 'dynamic',
                  status: 'published',
                  tags: ['mobile', 'responsive', 'touch'],
                  lastUpdated: new Date().toISOString(),
                  readTime: 3,
                  difficulty: 'beginner',
                  featured: true,
                  url: '/mobile-test-page'
                },
                {
                  id: 'mobile-page-2',
                  title: 'Touch Interaction Demo',
                  description: 'Demonstrates touch gestures and mobile interactions',
                  type: 'dynamic',
                  page_type: 'dynamic',
                  status: 'published',
                  tags: ['touch', 'gestures', 'interaction'],
                  lastUpdated: new Date().toISOString(),
                  readTime: 5,
                  difficulty: 'intermediate',
                  featured: false,
                  url: '/touch-demo-page'
                }
              ]
            })
          });
        });
      });

      test('renders agent pages tab correctly on mobile', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        // Wait for component to load
        await expect(page.locator(SELECTORS.agentPagesTab)).toBeVisible();
        
        // Verify mobile-friendly layout
        const agentTab = page.locator(SELECTORS.agentPagesTab);
        await expect(agentTab).toHaveCSS('padding', /6/); // Should have adequate padding
        
        // Check responsive grid layout
        const pageCards = page.locator(SELECTORS.pageCard);
        await expect(pageCards).toHaveCount(2);
        
        // Verify cards stack properly on mobile
        if (viewport.width <= 768) {
          const firstCard = pageCards.first();
          const secondCard = pageCards.nth(1);
          
          const firstCardBox = await firstCard.boundingBox();
          const secondCardBox = await secondCard.boundingBox();
          
          // Cards should stack vertically on mobile
          expect(firstCardBox?.y).toBeLessThan(secondCardBox?.y || 0);
        }
        
        await page.screenshot({ 
          path: `/workspaces/agent-feed/frontend/tests/screenshots/mobile-${deviceName.toLowerCase().replace(' ', '-')}-agent-pages.png`,
          fullPage: true
        });
      });

      test('search input is touch-friendly', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const searchInput = page.locator(SELECTORS.searchInput);
        await expect(searchInput).toBeVisible();
        
        // Verify touch target size (minimum 44px)
        const inputBox = await searchInput.boundingBox();
        expect(inputBox?.height).toBeGreaterThanOrEqual(44);
        
        // Test touch interaction
        await searchInput.tap();
        await expect(searchInput).toBeFocused();
        
        // Test typing on mobile
        await searchInput.fill('mobile');
        await expect(searchInput).toHaveValue('mobile');
        
        // Verify search results update
        await page.waitForTimeout(500); // Wait for debounce
        const results = page.locator(SELECTORS.pageCard);
        await expect(results).toHaveCount(1); // Should filter to mobile page
      });

      test('filter dropdowns work with touch', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const categoryFilter = page.locator(SELECTORS.filterDropdown);
        await expect(categoryFilter).toBeVisible();
        
        // Verify dropdown is touch-friendly
        const filterBox = await categoryFilter.boundingBox();
        expect(filterBox?.height).toBeGreaterThanOrEqual(44);
        
        // Test touch interaction with dropdown
        await categoryFilter.tap();
        await categoryFilter.selectOption('dynamic');
        
        // Verify filter applies correctly
        const pageCards = page.locator(SELECTORS.pageCard);
        await expect(pageCards).toHaveCount(2); // All test pages are dynamic
      });

      test('bookmark buttons are touch-accessible', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const bookmarkButton = page.locator(SELECTORS.bookmarkButton).first();
        await expect(bookmarkButton).toBeVisible();
        
        // Verify touch target size
        const buttonBox = await bookmarkButton.boundingBox();
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        
        // Test tap interaction
        await bookmarkButton.tap();
        
        // Verify state change (bookmark should toggle)
        await expect(bookmarkButton).toHaveClass(/bookmarked/);
      });

      test('page cards are properly sized for mobile', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const pageCards = page.locator(SELECTORS.pageCard);
        await expect(pageCards).toHaveCount(2);
        
        for (let i = 0; i < 2; i++) {
          const card = pageCards.nth(i);
          const cardBox = await card.boundingBox();
          
          // Cards should not exceed viewport width
          expect(cardBox?.width).toBeLessThanOrEqual(viewport.width);
          
          // Cards should have adequate height for content
          expect(cardBox?.height).toBeGreaterThan(100);
          
          // Verify text is readable (not too small)
          const title = card.locator('[data-testid="page-title"]');
          const titleStyles = await title.evaluate(el => getComputedStyle(el));
          const fontSize = parseInt(titleStyles.fontSize);
          expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
        }
      });

      test('empty state displays correctly on mobile', async ({ page }) => {
        // Mock empty pages response
        await page.route('/api/agents/test-agent-mobile/pages', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              pages: []
            })
          });
        });
        
        await page.goto('/agents/test-agent-mobile');
        
        const emptyState = page.locator(SELECTORS.emptyState);
        await expect(emptyState).toBeVisible();
        
        // Verify empty state is mobile-friendly
        const emptyStateBox = await emptyState.boundingBox();
        expect(emptyStateBox?.width).toBeLessThanOrEqual(viewport.width);
        
        // Check that buttons are touch-friendly
        const createButton = emptyState.locator('button').first();
        const buttonBox = await createButton.boundingBox();
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      });

      test('metrics grid adapts to mobile layout', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        // Navigate to overview tab to see metrics
        await page.locator('button:has-text("Overview")').tap();
        
        const metricsGrid = page.locator(SELECTORS.metricsGrid);
        await expect(metricsGrid).toBeVisible();
        
        // Verify grid adapts to mobile viewport
        const gridStyles = await metricsGrid.evaluate(el => getComputedStyle(el));
        const gridColumns = gridStyles.gridTemplateColumns;
        
        // On small screens, should have fewer columns
        if (viewport.width <= 768) {
          expect(gridColumns.split(' ').length).toBeLessThanOrEqual(3);
        }
        
        // Check metric cards are readable on mobile
        const metricCards = metricsGrid.locator('> div');
        const cardCount = await metricCards.count();
        
        for (let i = 0; i < cardCount; i++) {
          const card = metricCards.nth(i);
          const cardBox = await card.boundingBox();
          
          // Cards should fit within viewport
          expect(cardBox?.width).toBeLessThan(viewport.width);
          
          // Text should be readable
          const valueText = card.locator('p').first();
          const textStyles = await valueText.evaluate(el => getComputedStyle(el));
          const fontSize = parseInt(textStyles.fontSize);
          expect(fontSize).toBeGreaterThanOrEqual(16);
        }
      });

      test('welcome message is mobile-optimized', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const welcomeMessage = page.locator(SELECTORS.welcomeMessage);
        await expect(welcomeMessage).toBeVisible();
        
        // Verify welcome message layout on mobile
        const messageBox = await welcomeMessage.boundingBox();
        expect(messageBox?.width).toBeLessThanOrEqual(viewport.width);
        
        // Check that avatar and text are properly arranged
        const avatar = welcomeMessage.locator('div').first();
        const avatarBox = await avatar.boundingBox();
        
        // Avatar should be visible and properly sized
        expect(avatarBox?.width).toBeGreaterThanOrEqual(48);
        expect(avatarBox?.height).toBeGreaterThanOrEqual(48);
        
        // Text should be readable
        const description = welcomeMessage.locator('p');
        const textStyles = await description.evaluate(el => getComputedStyle(el));
        const lineHeight = parseInt(textStyles.lineHeight);
        expect(lineHeight).toBeGreaterThanOrEqual(20);
      });

      test('navigation tabs work with touch', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        const tabs = ['Overview', 'Definition', 'Profile', 'Pages'];
        
        for (const tabName of tabs) {
          const tab = page.locator(`button:has-text("${tabName}")`);
          await expect(tab).toBeVisible();
          
          // Verify touch target size
          const tabBox = await tab.boundingBox();
          expect(tabBox?.height).toBeGreaterThanOrEqual(44);
          
          // Test tap interaction
          await tab.tap();
          
          // Verify tab becomes active
          await expect(tab).toHaveClass(/text-blue-600/);
        }
      });

      test('accessibility features work on mobile', async ({ page }) => {
        await page.goto('/agents/test-agent-mobile');
        
        // Check keyboard navigation works
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Verify ARIA labels are present
        const searchInput = page.locator(SELECTORS.searchInput);
        await expect(searchInput).toHaveAttribute('aria-label', 'Search pages');
        
        // Check color contrast is adequate for mobile
        const pageTitle = page.locator('h1').first();
        const titleStyles = await pageTitle.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor
          };
        });
        
        // Basic contrast check (simplified)
        expect(titleStyles.color).not.toBe(titleStyles.backgroundColor);
      });

      test('loading states are mobile-friendly', async ({ page }) => {
        // Delay API response to test loading state
        await page.route('/api/agents/test-agent-mobile', async route => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: createTestAgentData()
            })
          });
        });
        
        await page.goto('/agents/test-agent-mobile');
        
        // Verify loading spinner is visible and properly sized
        const loadingSpinner = page.locator('.animate-spin');
        await expect(loadingSpinner).toBeVisible();
        
        const spinnerBox = await loadingSpinner.boundingBox();
        expect(spinnerBox?.width).toBeGreaterThanOrEqual(32);
        expect(spinnerBox?.height).toBeGreaterThanOrEqual(32);
      });

      test('error states are mobile-accessible', async ({ page }) => {
        // Mock error response
        await page.route('/api/agents/test-agent-mobile', async route => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Test error for mobile'
            })
          });
        });
        
        await page.goto('/agents/test-agent-mobile');
        
        // Verify error message is readable on mobile
        const errorMessage = page.locator('text=Test error for mobile');
        await expect(errorMessage).toBeVisible();
        
        // Check retry button is touch-friendly
        const retryButton = page.locator('button:has-text("Try Again")');
        const buttonBox = await retryButton.boundingBox();
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        
        await retryButton.tap();
        // Should trigger retry mechanism
      });
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('maintains functionality across different mobile sizes', async ({ page }) => {
      const testSizes = [
        { width: 320, height: 568, name: 'small' },
        { width: 375, height: 667, name: 'medium' },
        { width: 414, height: 896, name: 'large' }
      ];
      
      for (const size of testSizes) {
        await page.setViewportSize(size);
        await page.goto('/agents/test-agent-mobile');
        
        // Core functionality should work at all sizes
        const searchInput = page.locator(SELECTORS.searchInput);
        await expect(searchInput).toBeVisible();
        
        const pageCards = page.locator(SELECTORS.pageCard);
        await expect(pageCards).toHaveCount(2);
        
        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `/workspaces/agent-feed/frontend/tests/screenshots/mobile-${size.name}-${size.width}x${size.height}.png`,
          fullPage: true
        });
      }
    });
  });
});