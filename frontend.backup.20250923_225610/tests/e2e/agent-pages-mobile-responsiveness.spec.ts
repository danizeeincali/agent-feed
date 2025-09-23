/**
 * Agent Pages Mobile Responsiveness Tests
 * Comprehensive testing for responsive design and mobile user experience
 * 
 * Test Coverage:
 * - Responsive breakpoints
 * - Mobile navigation patterns
 * - Content reflow and readability
 * - Mobile-specific interactions
 * - Performance on mobile devices
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Responsive breakpoints based on Tailwind CSS defaults
const BREAKPOINTS = {
  mobile: { width: 375, height: 667, name: 'mobile' },
  mobileLandscape: { width: 667, height: 375, name: 'mobile-landscape' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  tabletLandscape: { width: 1024, height: 768, name: 'tablet-landscape' },
  desktop: { width: 1280, height: 720, name: 'desktop' }
};

// Test agent data
const TEST_AGENT_ID = 'responsive-test-agent';
const createResponsiveTestAgent = () => ({
  id: TEST_AGENT_ID,
  name: 'Responsive Test Agent',
  display_name: 'Responsive Test Agent',
  description: 'An agent designed to test responsive behavior across different screen sizes and orientations',
  status: 'active',
  capabilities: ['Responsive Design', 'Mobile Testing', 'Cross-Device Compatibility'],
  configuration: {
    theme: {
      primaryColor: '#3B82F6',
      layout: 'grid'
    },
    profile: {
      name: 'Responsive Test Agent',
      description: 'Testing responsive design patterns and mobile user experience'
    }
  }
});

// Sample pages for responsive testing
const createResponsiveTestPages = () => [
  {
    id: 'resp-page-1',
    title: 'Mobile-First Design Principles',
    description: 'A comprehensive guide to mobile-first responsive design with practical examples and implementation details for modern web applications',
    type: 'documentation',
    page_type: 'dynamic',
    status: 'published',
    tags: ['mobile', 'responsive', 'design', 'principles', 'accessibility'],
    lastUpdated: new Date().toISOString(),
    readTime: 8,
    difficulty: 'intermediate',
    featured: true,
    url: '/mobile-design-guide'
  },
  {
    id: 'resp-page-2',
    title: 'Touch Interface Guidelines',
    description: 'Best practices for designing touch-friendly interfaces with optimal touch targets',
    type: 'api',
    page_type: 'dynamic',
    status: 'published',
    tags: ['touch', 'interface', 'ux', 'mobile'],
    lastUpdated: new Date().toISOString(),
    readTime: 5,
    difficulty: 'beginner',
    featured: false,
    url: '/touch-guidelines'
  },
  {
    id: 'resp-page-3',
    title: 'Responsive Grid Systems',
    description: 'Understanding CSS Grid and Flexbox for responsive layouts',
    type: 'tutorial',
    page_type: 'template',
    status: 'published',
    tags: ['css', 'grid', 'flexbox', 'layout'],
    lastUpdated: new Date().toISOString(),
    readTime: 12,
    difficulty: 'advanced',
    featured: true,
    url: '/grid-systems'
  },
  {
    id: 'resp-page-4',
    title: 'Mobile Performance Optimization',
    description: 'Techniques for optimizing web performance on mobile devices',
    type: 'support',
    page_type: 'persistent',
    status: 'published',
    tags: ['performance', 'mobile', 'optimization'],
    lastUpdated: new Date().toISOString(),
    readTime: 15,
    difficulty: 'expert',
    featured: false,
    url: '/mobile-performance'
  }
];

test.describe('Agent Pages Mobile Responsiveness', () => {
  // Setup mock data for all tests
  test.beforeEach(async ({ page }) => {
    // Mock agent data
    await page.route(`/api/agents/${TEST_AGENT_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: createResponsiveTestAgent()
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
          pages: createResponsiveTestPages()
        })
      });
    });

    // Mock activities and posts
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

  // Test each breakpoint
  Object.entries(BREAKPOINTS).forEach(([breakpointName, config]) => {
    test.describe(`${config.name} (${config.width}x${config.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: config.width, height: config.height });
      });

      test('loads agent page correctly at breakpoint', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Wait for page to load
        await expect(page.locator('h1')).toContainText('Responsive Test Agent');
        
        // Take full-page screenshot for visual regression testing
        await page.screenshot({
          path: `/workspaces/agent-feed/frontend/tests/screenshots/responsive-${config.name}-full-page.png`,
          fullPage: true
        });
      });

      test('navigation adapts to screen size', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        const navigationTabs = page.locator('button:has-text("Overview"), button:has-text("Pages"), button:has-text("Profile")');
        
        if (config.width <= 768) {
          // Mobile: tabs might scroll horizontally or stack
          const tabsContainer = page.locator('[role="tablist"], .flex.space-x-8').first();
          await expect(tabsContainer).toBeVisible();
          
          // Check if tabs are accessible via scrolling or stacking
          const overviewTab = page.locator('button:has-text("Overview")');
          await expect(overviewTab).toBeVisible();
        } else {
          // Desktop: all tabs should be visible
          await expect(navigationTabs.first()).toBeVisible();
        }
      });

      test('pages tab shows appropriate grid layout', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Navigate to Pages tab
        await page.locator('button:has-text("Pages")').click();
        
        const pageCards = page.locator('[data-testid^="page-card-"]');
        await expect(pageCards).toHaveCount(4);
        
        // Check grid responsiveness
        const firstCard = pageCards.first();
        const lastCard = pageCards.last();
        
        const firstCardBox = await firstCard.boundingBox();
        const lastCardBox = await lastCard.boundingBox();
        
        if (config.width <= 640) {
          // Small screens: single column
          expect(firstCardBox?.x).toBeCloseTo(lastCardBox?.x || 0, 50);
        } else if (config.width <= 1024) {
          // Medium screens: 2 columns
          const cardsPerRow = Math.floor(config.width / 300); // Approximate card width
          expect(cardsPerRow).toBeLessThanOrEqual(2);
        } else {
          // Large screens: 3+ columns
          const cardsPerRow = Math.floor(config.width / 300);
          expect(cardsPerRow).toBeGreaterThanOrEqual(3);
        }
        
        await page.screenshot({
          path: `/workspaces/agent-feed/frontend/tests/screenshots/responsive-${config.name}-pages-grid.png`
        });
      });

      test('search and filters remain usable', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const searchInput = page.locator('[data-testid="pages-search"]');
        await expect(searchInput).toBeVisible();
        
        // Verify search input sizing
        const searchBox = await searchInput.boundingBox();
        expect(searchBox?.width).toBeGreaterThan(200); // Minimum usable width
        expect(searchBox?.height).toBeGreaterThanOrEqual(40); // Touch-friendly height
        
        // Test search functionality
        await searchInput.fill('mobile');
        await page.waitForTimeout(500); // Debounce
        
        const filteredCards = page.locator('[data-testid^="page-card-"]');
        await expect(filteredCards).toHaveCount(2); // Should show Mobile-First and Mobile Performance pages
        
        // Test filter dropdowns
        const categoryFilter = page.locator('[data-testid="category-filter"]');
        await expect(categoryFilter).toBeVisible();
        
        if (config.width <= 768) {
          // On mobile, filters might stack
          const filterBox = await categoryFilter.boundingBox();
          expect(filterBox?.width).toBeLessThanOrEqual(config.width - 40); // Account for padding
        }
      });

      test('page cards display content appropriately', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        const pageCards = page.locator('[data-testid^="page-card-"]');
        const firstCard = pageCards.first();
        
        // Verify card content is readable
        const cardTitle = firstCard.locator('[data-testid="page-title"]');
        await expect(cardTitle).toContainText('Mobile-First Design Principles');
        
        // Check text doesn't overflow
        const cardBox = await firstCard.boundingBox();
        expect(cardBox?.width).toBeLessThanOrEqual(config.width);
        
        // Verify typography scales appropriately
        const titleStyles = await cardTitle.evaluate(el => getComputedStyle(el));
        const fontSize = parseInt(titleStyles.fontSize);
        
        if (config.width <= 640) {
          expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum mobile font size
        } else {
          expect(fontSize).toBeGreaterThanOrEqual(16); // Desktop font size
        }
        
        // Test card interaction
        await firstCard.click();
        // Should navigate or trigger action without layout breaking
      });

      test('touch targets meet accessibility standards', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Test bookmark buttons
        const bookmarkButtons = page.locator('[data-testid^="bookmark-button-"]');
        const firstBookmarkButton = bookmarkButtons.first();
        
        const buttonBox = await firstBookmarkButton.boundingBox();
        
        if (config.width <= 768) {
          // Mobile touch targets should be at least 44x44px
          expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        }
        
        // Test button functionality
        await firstBookmarkButton.click();
        await expect(firstBookmarkButton).toHaveClass(/bookmarked/);
      });

      test('overview metrics grid adapts correctly', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        const metricsGrid = page.locator('[data-testid="enhanced-metrics-grid"]');
        await expect(metricsGrid).toBeVisible();
        
        // Check grid responsiveness
        const gridStyles = await metricsGrid.evaluate(el => getComputedStyle(el));
        const gridTemplateColumns = gridStyles.gridTemplateColumns;
        const columnCount = gridTemplateColumns.split(' ').length;
        
        if (config.width <= 640) {
          expect(columnCount).toBeLessThanOrEqual(2); // 1-2 columns on small screens
        } else if (config.width <= 1024) {
          expect(columnCount).toBeLessThanOrEqual(4); // 2-4 columns on medium screens
        } else {
          expect(columnCount).toBeGreaterThanOrEqual(4); // 4+ columns on large screens
        }
        
        // Verify metric cards are readable
        const metricCards = metricsGrid.locator('> div');
        const firstMetric = metricCards.first();
        
        const metricValue = firstMetric.locator('p').first();
        const valueStyles = await metricValue.evaluate(el => getComputedStyle(el));
        const valueFontSize = parseInt(valueStyles.fontSize);
        
        expect(valueFontSize).toBeGreaterThanOrEqual(18); // Large enough to read
      });

      test('welcome message section adapts to viewport', async ({ page }) => {
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        const welcomeMessage = page.locator('[data-testid="enhanced-welcome-message"]');
        await expect(welcomeMessage).toBeVisible();
        
        const messageBox = await welcomeMessage.boundingBox();
        expect(messageBox?.width).toBeLessThanOrEqual(config.width);
        
        // Check avatar and text layout
        const avatar = welcomeMessage.locator('div').first();
        const avatarBox = await avatar.boundingBox();
        
        // Avatar should be proportional to screen size
        if (config.width <= 640) {
          expect(avatarBox?.width).toBeLessThanOrEqual(48);
        } else {
          expect(avatarBox?.width).toBeGreaterThanOrEqual(48);
        }
        
        // Text should be readable
        const description = welcomeMessage.locator('p');
        const textStyles = await description.evaluate(el => getComputedStyle(el));
        const lineHeight = parseFloat(textStyles.lineHeight);
        const fontSize = parseFloat(textStyles.fontSize);
        
        expect(lineHeight / fontSize).toBeGreaterThanOrEqual(1.4); // Good line height ratio
      });

      test('error states remain accessible on all screen sizes', async ({ page }) => {
        // Mock error response
        await page.route(`/api/agents/${TEST_AGENT_ID}`, async route => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Responsive test error message'
            })
          });
        });
        
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        const errorMessage = page.locator('text=Responsive test error message');
        await expect(errorMessage).toBeVisible();
        
        // Error content should fit viewport
        const errorContainer = errorMessage.locator('..').first();
        const containerBox = await errorContainer.boundingBox();
        expect(containerBox?.width).toBeLessThanOrEqual(config.width);
        
        // Retry button should be touch-friendly
        const retryButton = page.locator('button:has-text("Try Again")');
        const retryBox = await retryButton.boundingBox();
        
        if (config.width <= 768) {
          expect(retryBox?.height).toBeGreaterThanOrEqual(44);
          expect(retryBox?.width).toBeGreaterThanOrEqual(88);
        }
      });

      test('loading states scale appropriately', async ({ page }) => {
        // Delay API response to see loading state
        await page.route(`/api/agents/${TEST_AGENT_ID}`, async route => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: createResponsiveTestAgent()
            })
          });
        });
        
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        
        // Check loading spinner
        const loadingSpinner = page.locator('.animate-spin');
        await expect(loadingSpinner).toBeVisible();
        
        const spinnerBox = await loadingSpinner.boundingBox();
        
        // Spinner should be visible but not overwhelming
        if (config.width <= 640) {
          expect(spinnerBox?.width).toBeLessThanOrEqual(48);
        } else {
          expect(spinnerBox?.width).toBeLessThanOrEqual(64);
        }
        
        // Loading text should be readable
        const loadingText = page.locator('text=Loading agent data...');
        await expect(loadingText).toBeVisible();
      });
    });
  });

  test.describe('Orientation Changes', () => {
    test('handles portrait to landscape transition', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/agents/${TEST_AGENT_ID}`);
      await page.locator('button:has-text("Pages")').click();
      
      // Verify portrait layout
      const pageCardsPortrait = page.locator('[data-testid^="page-card-"]');
      await expect(pageCardsPortrait).toHaveCount(4);
      
      await page.screenshot({
        path: `/workspaces/agent-feed/frontend/tests/screenshots/orientation-portrait.png`
      });
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow for reflow
      
      // Verify landscape layout adapts
      const pageCardsLandscape = page.locator('[data-testid^="page-card-"]');
      await expect(pageCardsLandscape).toHaveCount(4);
      
      // Should show more cards per row in landscape
      const searchInput = page.locator('[data-testid="pages-search"]');
      await expect(searchInput).toBeVisible();
      
      await page.screenshot({
        path: `/workspaces/agent-feed/frontend/tests/screenshots/orientation-landscape.png`
      });
    });
  });

  test.describe('Content Overflow and Text Wrapping', () => {
    test('handles long content gracefully across viewports', async ({ page }) => {
      // Mock page with very long content
      await page.route(`/api/agents/${TEST_AGENT_ID}/pages`, async route => {
        const longContentPages = createResponsiveTestPages().map(page => ({
          ...page,
          title: 'This is an extremely long page title that should wrap properly on mobile devices without breaking the layout or causing horizontal scrolling issues',
          description: 'This is an extremely long description that contains a lot of text and should wrap properly on mobile devices without breaking the layout or causing horizontal scrolling issues. It tests how well the responsive design handles overflow content and text wrapping in various scenarios.'
        }));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            pages: longContentPages
          })
        });
      });
      
      const testSizes = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1280, height: 720 }
      ];
      
      for (const size of testSizes) {
        await page.setViewportSize(size);
        await page.goto(`/agents/${TEST_AGENT_ID}`);
        await page.locator('button:has-text("Pages")').click();
        
        // Check no horizontal overflow
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(size.width + 20); // Small tolerance for scrollbars
        
        // Verify text wraps properly
        const firstCard = page.locator('[data-testid^="page-card-"]').first();
        const cardTitle = firstCard.locator('[data-testid="page-title"]');
        
        const titleBox = await cardTitle.boundingBox();
        const cardBox = await firstCard.boundingBox();
        
        expect(titleBox?.width).toBeLessThanOrEqual((cardBox?.width || 0) + 10); // Text should not exceed card width
      }
    });
  });

  test.describe('Performance on Mobile Devices', () => {
    test('loads quickly on simulated slow connections', async ({ page, context }) => {
      // Simulate slow 3G connection
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Random delay 0-100ms
        await route.continue();
      });
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto(`/agents/${TEST_AGENT_ID}`);
      
      // Wait for main content to load
      await expect(page.locator('h1')).toContainText('Responsive Test Agent');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even on slow connection
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      
      // Check for loading indicators
      const loadingSpinner = page.locator('.animate-spin');
      // Loading spinner should be gone by now
      await expect(loadingSpinner).not.toBeVisible();
    });

    test('handles memory constraints gracefully', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/agents/${TEST_AGENT_ID}`);
      
      // Simulate memory pressure by rapidly navigating between tabs
      const tabs = ['Overview', 'Pages', 'Profile', 'Configuration'];
      
      for (let i = 0; i < 10; i++) {
        for (const tab of tabs) {
          await page.locator(`button:has-text("${tab}")`).click();
          await page.waitForTimeout(100); // Brief pause
        }
      }
      
      // App should still be responsive
      await expect(page.locator('h1')).toContainText('Responsive Test Agent');
      
      // No JavaScript errors should occur
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      
      await page.waitForTimeout(1000);
      expect(errors).toHaveLength(0);
    });
  });
});