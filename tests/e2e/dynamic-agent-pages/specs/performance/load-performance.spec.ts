import { test, expect } from '@playwright/test';
import { AgentsListPage, AgentHomePage } from '../../page-objects';
import { testAgents, PerformanceHelpers } from '../../fixtures/test-data';

/**
 * Performance Tests for Dynamic Agent Pages
 * Tests page load times, interaction responsiveness, and resource usage
 */
test.describe('Load Performance', () => {
  let agentsListPage: AgentsListPage;
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentsListPage = new AgentsListPage(page);
    agentHomePage = new AgentHomePage(page);
  });

  test('should load agents list page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await agentsListPage.goto();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Web Vitals
    const vitals = await PerformanceHelpers.measureWebVitals(page);
    
    // First Contentful Paint should be under 1.5s
    if (vitals.fcp > 0) {
      expect(vitals.fcp).toBeLessThan(1500);
    }
    
    // Largest Contentful Paint should be under 2.5s
    if (vitals.lcp > 0) {
      expect(vitals.lcp).toBeLessThan(2500);
    }
    
    // Cumulative Layout Shift should be minimal
    if (vitals.cls > 0) {
      expect(vitals.cls).toBeLessThan(0.1);
    }
  });

  test('should load agent home page efficiently', async ({ page }) => {
    const performanceData = await agentHomePage.measurePageLoad();
    
    await agentHomePage.goto(testAgents[0].id);
    
    const loadTime = await agentHomePage.measurePageLoad();
    
    // Agent home page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check that all critical content is visible
    const agentName = await agentHomePage.getAgentName();
    expect(agentName).toBeTruthy();
    
    const status = await agentHomePage.getAgentStatus();
    expect(status).toBeTruthy();
    
    // Widgets should be rendered
    const widgets = await agentHomePage.getVisibleWidgets();
    expect(widgets.length).toBeGreaterThan(0);
  });

  test('should handle tab switching with good performance', async () => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Measure tab switch performance
    const tabSwitchTime = await agentHomePage.measureTabSwitch();
    
    // Tab switches should be near-instantaneous (under 200ms)
    expect(tabSwitchTime).toBeLessThan(200);
    
    // Test multiple tab switches
    const tabSwitchTimes: number[] = [];
    const tabs = ['Home', 'Posts', 'Metrics'];
    
    for (const tab of tabs) {
      const switchTime = await agentHomePage.measureTabSwitch();
      await agentHomePage.clickTab(tab);
      tabSwitchTimes.push(switchTime);
    }
    
    // Average tab switch time should be reasonable
    const averageTime = tabSwitchTimes.reduce((a, b) => a + b, 0) / tabSwitchTimes.length;
    expect(averageTime).toBeLessThan(150);
  });

  test('should efficiently handle large numbers of agents', async ({ page }) => {
    await agentsListPage.goto();
    
    // Measure time to load all agent cards
    const startTime = Date.now();
    await agentsListPage.waitForAgentCardsToLoad();
    const loadTime = Date.now() - startTime;
    
    const cardCount = await agentsListPage.getAgentCardCount();
    
    // Even with many agents, should load efficiently
    if (cardCount > 10) {
      expect(loadTime).toBeLessThan(5000); // 5 seconds for many agents
    } else {
      expect(loadTime).toBeLessThan(2000); // 2 seconds for fewer agents
    }
    
    // Check resource usage
    const resourceStats = await PerformanceHelpers.checkResourceLoading(page);
    
    // Should not have excessive failed requests
    expect(resourceStats.failedRequests).toBeLessThan(resourceStats.totalRequests * 0.1);
  });

  test('should handle interaction responsiveness', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Test quick action responsiveness
    const quickActions = await agentHomePage.getQuickActions();
    
    if (quickActions.length > 0) {
      const interactionTime = await agentHomePage.measureInteractionTime(async () => {
        await agentHomePage.clickQuickAction(quickActions[0]);
      });
      
      // User interactions should respond quickly
      expect(interactionTime).toBeLessThan(100); // 100ms for good UX
    }
    
    // Test post interaction responsiveness
    await agentHomePage.clickTab('Posts');
    const postCount = await agentHomePage.getPostCount();
    
    if (postCount > 0) {
      const likeInteractionTime = await agentHomePage.measureInteractionTime(async () => {
        await agentHomePage.clickPostInteraction(0, 'like');
      });
      
      expect(likeInteractionTime).toBeLessThan(200);
    }
  });

  test('should optimize resource loading', async ({ page }) => {
    // Track network requests
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        timestamp: Date.now()
      });
    });
    
    await agentHomePage.goto(testAgents[0].id);
    
    // Allow all resources to load
    await page.waitForLoadState('networkidle');
    
    // Analyze resource loading
    const imageRequests = requests.filter(r => r.resourceType === 'image');
    const scriptRequests = requests.filter(r => r.resourceType === 'script');
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet');
    
    // Should not load excessive resources
    expect(imageRequests.length).toBeLessThan(20);
    expect(scriptRequests.length).toBeLessThan(10);
    expect(cssRequests.length).toBeLessThan(5);
    
    // Should not have too many failed requests
    const failedResponses = responses.filter(r => r.status >= 400);
    expect(failedResponses.length).toBeLessThan(requests.length * 0.05); // Less than 5% failure rate
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await agentHomePage.goto(testAgents[0].id);
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Perform several operations that might increase memory
    await agentHomePage.clickTab('Posts');
    await agentHomePage.clickTab('Metrics');
    await agentHomePage.clickTab('Home');
    
    // Navigate to another agent and back
    await agentHomePage.goto(testAgents[1]?.id || testAgents[0].id);
    await agentHomePage.goto(testAgents[0].id);
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle concurrent page loads efficiently', async ({ context }) => {
    // Open multiple pages simultaneously
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    try {
      const startTime = Date.now();
      
      // Navigate all pages to different agents simultaneously
      await Promise.all(pages.map((page, index) => {
        const agentHomePage = new AgentHomePage(page);
        const agent = testAgents[index] || testAgents[0];
        return agentHomePage.goto(agent.id);
      }));
      
      const totalLoadTime = Date.now() - startTime;
      
      // Concurrent loads should not take much longer than single load
      expect(totalLoadTime).toBeLessThan(6000); // 6 seconds for 3 pages
      
      // All pages should load successfully
      for (const page of pages) {
        const agentHomePage = new AgentHomePage(page);
        const agentName = await agentHomePage.getAgentName();
        expect(agentName).toBeTruthy();
      }
      
    } finally {
      await Promise.all(pages.map(page => page.close()));
    }
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Navigate to agent with potentially large amounts of data
    await agentHomePage.goto(testAgents[0].id);
    
    // Go to posts tab which might have many posts
    await agentHomePage.clickTab('Posts');
    
    const startTime = Date.now();
    const postCount = await agentHomePage.getPostCount();
    const loadTime = Date.now() - startTime;
    
    // Should handle post loading efficiently regardless of count
    expect(loadTime).toBeLessThan(2000);
    
    // If there are many posts, scroll performance should be good
    if (postCount > 5) {
      const scrollStartTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo(0, 500);
      });
      
      await page.waitForTimeout(100);
      
      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(100); // Smooth scrolling
    }
  });

  test('should optimize bundle size and loading strategy', async ({ page }) => {
    const resourceSizes: Record<string, number> = {};
    
    page.on('response', async response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        try {
          const buffer = await response.body();
          resourceSizes[response.url()] = buffer.length;
        } catch (e) {
          // Ignore errors getting response body
        }
      }
    });
    
    await agentHomePage.goto(testAgents[0].id);
    await page.waitForLoadState('networkidle');
    
    // Check bundle sizes
    const totalBundleSize = Object.values(resourceSizes).reduce((a, b) => a + b, 0);
    
    // Total bundle size should be reasonable (less than 2MB)
    expect(totalBundleSize).toBeLessThan(2 * 1024 * 1024);
    
    // Individual bundles should not be too large
    for (const [url, size] of Object.entries(resourceSizes)) {
      if (size > 500 * 1024) { // Files larger than 500KB
        console.warn(`Large bundle detected: ${url} (${Math.round(size / 1024)}KB)`);
      }
      expect(size).toBeLessThan(1024 * 1024); // No single file over 1MB
    }
  });

  test('should handle error states without performance degradation', async ({ page }) => {
    // Simulate network errors
    await page.route('**/api/agents/*/metrics', route => {
      route.abort();
    });
    
    const startTime = Date.now();
    await agentHomePage.goto(testAgents[0].id);
    const loadTime = Date.now() - startTime;
    
    // Should still load reasonably fast even with some failed requests
    expect(loadTime).toBeLessThan(5000);
    
    // Should handle tab switching performance even with errors
    const tabSwitchTime = await agentHomePage.measureTabSwitch();
    await agentHomePage.clickTab('Metrics');
    
    expect(tabSwitchTime).toBeLessThan(300); // Slightly higher threshold due to errors
    
    // Page should remain functional
    const agentName = await agentHomePage.getAgentName();
    expect(agentName).toBeTruthy();
  });
});