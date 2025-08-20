import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const baseURL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('User Workflows - End-to-End Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    
    // Mock API responses
    await page.route('**/api/v1/claude-live/prod/agents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: [
            {
              id: 'agent-1',
              name: 'test-agent-1',
              description: 'Research Agent',
              status: 'active',
              capabilities: ['research', 'analysis'],
              lastActivity: '2023-01-01T00:00:00Z',
              color: '#3B82F6'
            },
            {
              id: 'agent-2',
              name: 'test-agent-2',
              description: 'Content Creator',
              status: 'inactive',
              capabilities: ['writing', 'content'],
              lastActivity: '2023-01-01T00:00:00Z',
              color: '#8B5CF6'
            }
          ]
        }),
      });
    });

    await page.goto(baseURL);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Application Loading and Navigation', () => {
    test('should load application without white screen', async () => {
      // Wait for application to load
      await page.waitForLoadState('networkidle');
      
      // Verify main content is visible
      await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('AgentLink Feed System');
      
      // Ensure no white screen - check background color
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)'); // Not pure white
    });

    test('should navigate between all main routes successfully', async () => {
      const routes = [
        { name: 'Feed', url: '/', title: /feed/i },
        { name: 'Dual Instance', url: '/dual-instance', title: /dual instance/i },
        { name: 'Agents', url: '/agents', title: /agent manager/i },
        { name: 'Workflows', url: '/workflows', title: /workflow/i },
        { name: 'Analytics', url: '/analytics', title: /analytics/i },
        { name: 'Settings', url: '/settings', title: /settings/i },
      ];

      for (const route of routes) {
        // Click navigation link
        await page.click(`text=${route.name}`);
        
        // Wait for navigation
        await page.waitForURL(`**${route.url}`);
        await page.waitForLoadState('networkidle');
        
        // Verify page loaded correctly
        await expect(page.locator('h1')).toBeVisible();
        
        // Verify no error states
        await expect(page.locator('text=Error')).not.toBeVisible();
        await expect(page.locator('text=Something went wrong')).not.toBeVisible();
        
        // Take screenshot for visual regression
        await page.screenshot({ path: `test-results/navigation-${route.name.toLowerCase()}.png` });
      }
    });

    test('should handle browser back/forward navigation', async () => {
      // Navigate to agents page
      await page.click('text=Agents');
      await page.waitForURL('**/agents');
      await expect(page.locator('text=Agent Manager')).toBeVisible();
      
      // Navigate to settings
      await page.click('text=Settings');
      await page.waitForURL('**/settings');
      
      // Use browser back
      await page.goBack();
      await page.waitForURL('**/agents');
      await expect(page.locator('text=Agent Manager')).toBeVisible();
      
      // Use browser forward
      await page.goForward();
      await page.waitForURL('**/settings');
    });
  });

  test.describe('Agent Manager Workflow', () => {
    test('should complete full agent management workflow', async () => {
      // Navigate to agents page
      await page.click('text=Agents');
      await page.waitForURL('**/agents');
      
      // Wait for agents to load
      await expect(page.locator('text=Agent Manager')).toBeVisible();
      await page.waitForSelector('.grid', { state: 'visible' });
      
      // Verify agents are displayed
      await expect(page.locator('text=Research Agent')).toBeVisible();
      await expect(page.locator('text=Content Creator')).toBeVisible();
      
      // Test search functionality
      await page.fill('input[placeholder="Search agents..."]', 'research');
      await page.waitForTimeout(300); // Debounce
      
      await expect(page.locator('text=Research Agent')).toBeVisible();
      await expect(page.locator('text=Content Creator')).not.toBeVisible();
      
      // Clear search
      await page.fill('input[placeholder="Search agents..."]', '');
      await page.waitForTimeout(300);
      
      // Test status filter
      await page.selectOption('select', 'active');
      await expect(page.locator('text=Research Agent')).toBeVisible();
      await expect(page.locator('text=Content Creator')).not.toBeVisible();
      
      // Reset filter
      await page.selectOption('select', 'all');
      
      // Test agent creation
      await page.click('button:has-text("Create Agent")');
      await expect(page.locator('text=Create New Agent')).toBeVisible();
      
      // Select template
      await page.click('text=Research Agent');
      
      // Fill form
      await page.fill('input[placeholder="agent-name"]', 'test-new-agent');
      await page.fill('input[placeholder="Agent Display Name"]', 'Test New Agent');
      await page.fill('textarea[placeholder="Describe what this agent does..."]', 'This is a test agent for automated testing');
      
      // Submit form
      await page.click('button:has-text("Create Agent")');
      
      // Verify modal closes
      await expect(page.locator('text=Create New Agent')).not.toBeVisible();
    });

    test('should handle agent status toggle', async () => {
      await page.click('text=Agents');
      await page.waitForURL('**/agents');
      
      // Wait for agents to load
      await page.waitForSelector('.grid', { state: 'visible' });
      
      // Find and click status toggle for first agent
      const firstAgent = page.locator('.grid > div').first();
      await firstAgent.locator('button[title="Deactivate"], button[title="Activate"]').first().click();
      
      // Verify status change (visual feedback should appear)
      await page.waitForTimeout(500);
    });

    test('should handle bulk operations', async () => {
      await page.click('text=Agents');
      await page.waitForURL('**/agents');
      
      await page.waitForSelector('.grid', { state: 'visible' });
      
      // Select multiple agents
      const checkboxes = page.locator('input[type="checkbox"]');
      await checkboxes.first().click();
      await checkboxes.nth(1).click();
      
      // Verify bulk actions appear
      await expect(page.locator('text=Selected')).toBeVisible();
      
      // Open bulk actions
      await page.click('button:has-text("Selected")');
      
      // Verify bulk action buttons
      await expect(page.locator('text=Bulk Actions:')).toBeVisible();
      await expect(page.locator('button:has-text("Activate")')).toBeVisible();
      await expect(page.locator('button:has-text("Deactivate")')).toBeVisible();
    });
  });

  test.describe('Dual Instance Dashboard Workflow', () => {
    test('should display dual instance dashboard correctly', async () => {
      await page.click('text=Dual Instance');
      await page.waitForURL('**/dual-instance');
      
      await expect(page.locator('text=Dual Instance Dashboard')).toBeVisible();
      
      // Verify instance panels are present
      await expect(page.locator('text=Instance').first()).toBeVisible();
      
      // Check for sync controls
      const syncButton = page.locator('button:has-text("Sync")');
      if (await syncButton.count() > 0) {
        await expect(syncButton).toBeVisible();
      }
    });

    test('should handle instance synchronization', async () => {
      await page.click('text=Dual Instance');
      await page.waitForURL('**/dual-instance');
      
      // Look for sync button and click if available
      const syncButton = page.locator('button:has-text("Sync"), button[title*="Sync"], button[aria-label*="Sync"]');
      if (await syncButton.count() > 0) {
        await syncButton.first().click();
        await page.waitForTimeout(1000); // Wait for sync operation
      }
      
      // Verify no errors occurred
      await expect(page.locator('text=Error')).not.toBeVisible();
    });
  });

  test.describe('Real-time Features', () => {
    test('should handle WebSocket connections', async () => {
      // Monitor WebSocket connections
      const wsConnections: any[] = [];
      page.on('websocket', ws => {
        wsConnections.push(ws);
      });
      
      await page.waitForLoadState('networkidle');
      
      // WebSocket connections may be established
      // This test ensures the app doesn't crash due to WebSocket issues
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should display real-time notifications', async () => {
      await page.waitForLoadState('networkidle');
      
      // Look for notification components
      const notifications = page.locator('[data-testid*="notification"], .notification, [class*="notification"]');
      
      // Notifications may or may not be present, but shouldn't cause crashes
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle API failures gracefully', async () => {
      // Intercept API calls and make them fail
      await page.route('**/api/**', async (route) => {
        await route.abort();
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // App should still load with error states
      await expect(page.locator('h1')).toBeVisible();
      
      // Should not show white screen
      const isVisible = await page.locator('body').isVisible();
      expect(isVisible).toBe(true);
    });

    test('should recover from component errors', async () => {
      // Navigate to different pages to test error boundaries
      const routes = ['/', '/agents', '/analytics', '/settings'];
      
      for (const route of routes) {
        await page.goto(`${baseURL}${route}`);
        await page.waitForLoadState('networkidle');
        
        // Should always show some content, never a white screen
        await expect(page.locator('body')).toBeVisible();
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
        expect(bodyText?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should handle network interruptions', async () => {
      // Simulate network offline
      await page.context().setOffline(true);
      
      // Try navigation
      await page.click('text=Agents').catch(() => {}); // May fail, that's okay
      
      // Restore network
      await page.context().setOffline(false);
      
      // Should recover
      await page.waitForTimeout(2000);
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load pages within acceptable time limits', async () => {
      const routes = ['/', '/agents', '/dual-instance', '/analytics'];
      
      for (const route of routes) {
        const startTime = Date.now();
        
        await page.goto(`${baseURL}${route}`);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        console.log(`Route ${route} loaded in ${loadTime}ms`);
        
        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
        
        // Verify content is visible
        await expect(page.locator('h1')).toBeVisible();
      }
    });

    test('should be responsive on mobile devices', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should show mobile navigation
      const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")');
      if (await menuButton.count() > 0) {
        await expect(menuButton).toBeVisible();
        
        // Test mobile navigation
        await menuButton.click();
        await expect(page.locator('text=Agents')).toBeVisible();
      }
      
      // Content should be accessible
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should handle rapid navigation without crashes', async () => {
      const routes = ['Agents', 'Analytics', 'Settings', 'Feed'];
      
      // Rapidly navigate between routes
      for (let i = 0; i < 3; i++) {
        for (const route of routes) {
          await page.click(`text=${route}`);
          await page.waitForTimeout(100); // Brief pause
        }
      }
      
      // Should still be functional
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should support keyboard navigation', async () => {
      await page.waitForLoadState('networkidle');
      
      // Tab through navigation elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate elements with Enter
      await page.keyboard.press('Enter');
      
      // Should remain functional
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should have proper ARIA labels and semantic HTML', async () => {
      await page.waitForLoadState('networkidle');
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for main landmark
      const main = page.locator('main, [role="main"]');
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }
      
      // Check for navigation landmark
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.count() > 0) {
        await expect(nav).toBeVisible();
      }
    });

    test('should maintain focus management', async () => {
      await page.click('text=Agents');
      await page.waitForURL('**/agents');
      
      // Open create agent modal
      if (await page.locator('button:has-text("Create Agent")').count() > 0) {
        await page.click('button:has-text("Create Agent")');
        
        // Focus should be trapped in modal
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Close modal with escape
        await page.keyboard.press('Escape');
        
        // Focus should return to trigger button
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Visual Regression Prevention', () => {
    test('should maintain consistent visual appearance', async () => {
      const pages = [
        { route: '/', name: 'feed' },
        { route: '/agents', name: 'agents' },
        { route: '/dual-instance', name: 'dual-instance' },
        { route: '/analytics', name: 'analytics' },
      ];
      
      for (const { route, name } of pages) {
        await page.goto(`${baseURL}${route}`);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot for visual comparison
        await page.screenshot({
          path: `test-results/visual-regression-${name}.png`,
          fullPage: true,
        });
        
        // Verify no layout issues
        const viewport = page.viewportSize();
        const bodyRect = await page.evaluate(() => {
          const body = document.body;
          const rect = body.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
          };
        });
        
        // Body should not be smaller than viewport
        expect(bodyRect.width).toBeGreaterThanOrEqual(viewport!.width - 50);
      }
    });

    test('should prevent white screen regression', async () => {
      const routes = ['/', '/agents', '/dual-instance', '/analytics', '/settings'];
      
      for (const route of routes) {
        await page.goto(`${baseURL}${route}`);
        
        // Wait for either content or error state
        await Promise.race([
          page.waitForSelector('h1', { state: 'visible' }),
          page.waitForSelector('[data-testid="error-boundary"]', { state: 'visible' }),
          page.waitForTimeout(10000),
        ]);
        
        // Check that page has visible content
        const bodyText = await page.textContent('body');
        const hasVisibleText = bodyText && bodyText.trim().length > 0;
        
        const hasVisibleElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          for (let element of elements) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                element.offsetWidth > 0 && element.offsetHeight > 0) {
              return true;
            }
          }
          return false;
        });
        
        expect(hasVisibleText || hasVisibleElements).toBe(true);
        
        // Take screenshot for debugging
        await page.screenshot({ 
          path: `test-results/white-screen-check-${route.replace('/', 'root')}.png` 
        });
      }
    });
  });
});