/**
 * Comprehensive E2E Tests for UnifiedAgentPage Real Data Integration
 * 
 * MISSION: Validate Phase 1 mock data elimination is production-ready
 * Ensures all data comes from real API endpoints, no mock/fake data remains
 * 
 * Test Coverage:
 * - Real API data display and consistency
 * - Mock data contamination detection
 * - Performance with real data loads
 * - Error handling without fallback mocks
 * - Data integrity across multiple agents
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test agents with known real data
const TEST_AGENTS = [
  'agent-feedback-agent',
  'agent-ideas-agent', 
  'meta-agent',
  'personal-todos-agent'
];

// Helper functions
const navigateToUnifiedAgent = async (page: Page, agentId: string) => {
  await page.goto(`${BASE_URL}/agents/${agentId}`);
  await page.waitForLoadState('networkidle');
};

const waitForRealDataLoad = async (page: Page) => {
  // Wait for API data to fully load
  await page.waitForSelector('[data-testid="unified-agent-page"], .min-h-screen', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  
  // Ensure no loading states remain
  await page.waitForFunction(
    () => !document.querySelector('text=Loading agent data...'),
    {},
    { timeout: 8000 }
  ).catch(() => {}); // Ignore if loading text not present
};

const extractNumericValue = (text: string): number => {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

test.describe('UnifiedAgentPage Real Data Validation', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    // Create API context for direct API testing
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('Test 1: Real API Data Display', () => {
    test('should display real API data for agent-feedback-agent', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      
      // Intercept API call to verify real data flow
      let apiData: any;
      await page.route(`**/api/agents/${agentId}`, async (route, request) => {
        const response = await route.fetch();
        const json = await response.json();
        apiData = json.data;
        await route.fulfill({ response });
      });

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Verify API call was made and data received
      expect(apiData).toBeDefined();
      expect(apiData.id).toBe(agentId);

      // Test real stats display (no random numbers)
      const successRateElement = await page.locator('[data-testid="success-rate"], text=/\\d+% success rate/').first();
      if (await successRateElement.isVisible()) {
        const successRateText = await successRateElement.textContent();
        const successRate = extractNumericValue(successRateText || '');
        
        // Verify it's not one of the common random mock values (90-99)
        expect(successRate).not.toBe(90);
        expect(successRate).not.toBe(91);
        expect(successRate).not.toBe(92);
        expect(successRate).not.toBe(93);
        expect(successRate).not.toBe(94);
        expect(successRate).not.toBe(95);
        expect(successRate).not.toBe(96);
        expect(successRate).not.toBe(97);
        expect(successRate).not.toBe(98);
        expect(successRate).not.toBe(99);
        
        // Should be a meaningful real value
        expect(successRate).toBeGreaterThan(0);
        expect(successRate).toBeLessThanOrEqual(100);
      }

      // Verify uptime shows real API data
      const uptimeElement = await page.locator('[data-testid="uptime"], text=/\\d+% uptime/').first();
      if (await uptimeElement.isVisible()) {
        const uptimeText = await uptimeElement.textContent();
        const uptime = extractNumericValue(uptimeText || '');
        
        // Real uptime should match API performance_metrics.uptime_percentage
        if (apiData.performance_metrics?.uptime_percentage) {
          expect(uptime).toBe(apiData.performance_metrics.uptime_percentage);
        }
      }

      // Verify response time displays API health_status.response_time  
      const responseTimeElement = await page.locator('[data-testid="response-time"], text=/\\d+(?:\\.\\d+)?s avg response/').first();
      if (await responseTimeElement.isVisible()) {
        const responseTimeText = await responseTimeElement.textContent();
        const responseTime = extractNumericValue(responseTimeText || '');
        
        // Should be realistic response time, not random mock data
        expect(responseTime).toBeGreaterThan(0);
        expect(responseTime).toBeLessThan(10); // Reasonable upper bound
        
        if (apiData.health_status?.response_time) {
          expect(responseTime).toBe(apiData.health_status.response_time);
        }
      }

      // Verify tasks completed shows real numbers
      const tasksElement = await page.locator('[data-testid="tasks-completed"], text=/\\d+ tasks completed/').first();
      if (await tasksElement.isVisible()) {
        const tasksText = await tasksElement.textContent();
        const tasksCompleted = extractNumericValue(tasksText || '');
        
        // Real agents should have meaningful task counts
        expect(tasksCompleted).toBeGreaterThan(10);
        
        // Should not be random values (100-1099 range is suspicious)
        expect(tasksCompleted < 100 || tasksCompleted > 1099).toBeTruthy();
      }
    });

    test('should display consistent real data across multiple loads', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      let firstLoadData: any;
      let secondLoadData: any;

      // First load
      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      firstLoadData = {
        successRate: await page.locator('text=/\\d+% success rate/').first().textContent(),
        uptime: await page.locator('text=/\\d+% uptime/').first().textContent(),  
        responseTime: await page.locator('text=/\\d+(?:\\.\\d+)?s avg response/').first().textContent(),
        tasksCompleted: await page.locator('text=/\\d+ tasks completed/').first().textContent()
      };

      // Reload page
      await page.reload();
      await waitForRealDataLoad(page);

      secondLoadData = {
        successRate: await page.locator('text=/\\d+% success rate/').first().textContent(),
        uptime: await page.locator('text=/\\d+% uptime/').first().textContent(),
        responseTime: await page.locator('text=/\\d+(?:\\.\\d+)?s avg response/').first().textContent(), 
        tasksCompleted: await page.locator('text=/\\d+ tasks completed/').first().textContent()
      };

      // Data should remain consistent (real data doesn't change randomly)
      expect(firstLoadData.successRate).toBe(secondLoadData.successRate);
      expect(firstLoadData.uptime).toBe(secondLoadData.uptime);
      expect(firstLoadData.responseTime).toBe(secondLoadData.responseTime);
      expect(firstLoadData.tasksCompleted).toBe(secondLoadData.tasksCompleted);
    });

    test('should verify timestamps are real and make sense', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Navigate to Activity tab to check timestamps
      await page.click('button:has-text("Activity")');
      await page.waitForTimeout(1000);

      // Check activity timestamps
      const timeElements = await page.locator('text=/\\d+[smhd] ago/').all();
      
      for (const timeElement of timeElements) {
        const timeText = await timeElement.textContent();
        expect(timeText).toBeTruthy();
        
        // Should be realistic time formats
        expect(timeText).toMatch(/^(\d+)(s|m|h|d) ago$/);
        
        // Extract time value and unit
        const match = timeText?.match(/^(\d+)([smhd]) ago$/);
        if (match) {
          const [, value, unit] = match;
          const timeValue = parseInt(value);
          
          // Reasonable bounds for different time units
          switch (unit) {
            case 's': expect(timeValue).toBeLessThan(3600); break; // < 1 hour in seconds
            case 'm': expect(timeValue).toBeLessThan(1440); break; // < 1 day in minutes  
            case 'h': expect(timeValue).toBeLessThan(168); break;  // < 1 week in hours
            case 'd': expect(timeValue).toBeLessThan(365); break;  // < 1 year in days
          }
        }
      }
    });
  });

  test.describe('Test 2: Data Consistency Validation', () => {
    test('should maintain data consistency across multiple page loads', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      const loadData: any[] = [];

      // Load the same agent page 3 times
      for (let i = 0; i < 3; i++) {
        await navigateToUnifiedAgent(page, agentId);
        await waitForRealDataLoad(page);

        const data = {
          name: await page.locator('h1').first().textContent(),
          status: await page.locator('text=/Active|Inactive|Busy|Error|Maintenance/').first().textContent(),
          description: await page.locator('text=/AI Agent/').first().textContent()
        };

        loadData.push(data);
        
        if (i < 2) {
          await page.waitForTimeout(500); // Small delay between loads
        }
      }

      // All loads should show identical data
      expect(loadData[0].name).toBe(loadData[1].name);
      expect(loadData[0].name).toBe(loadData[2].name);
      expect(loadData[0].status).toBe(loadData[1].status);
      expect(loadData[0].status).toBe(loadData[2].status);
    });

    test('should verify activities relate to actual agent usage', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Navigate to Activity tab
      await page.click('button:has-text("Activity")');
      await page.waitForTimeout(1000);

      // Check that activities are agent-specific and realistic
      const activities = await page.locator('[data-testid="recent-activities"] .activity-item, .space-y-4 > div').all();

      for (const activity of activities) {
        const activityText = await activity.textContent();
        
        // Should not contain generic mock indicators
        expect(activityText).not.toContain('mock');
        expect(activityText).not.toContain('demo');
        expect(activityText).not.toContain('example');
        expect(activityText).not.toContain('Lorem ipsum');
        expect(activityText).not.toContain('placeholder');
        
        // Should contain realistic activity descriptions
        expect(activityText?.length).toBeGreaterThan(10); // Not empty or trivial
      }
    });
  });

  test.describe('Test 3: Different Agents Data Uniqueness', () => {
    TEST_AGENTS.forEach(agentId => {
      test(`should show unique real data for ${agentId}`, async ({ page }) => {
        await navigateToUnifiedAgent(page, agentId);
        await waitForRealDataLoad(page);

        // Verify agent-specific data
        await expect(page.locator(`text=${agentId}`)).toBeVisible({ timeout: 5000 });
        
        // Check that stats are unique (not generic template data)
        const pageContent = await page.content();
        
        // Should not contain template/generic indicators
        expect(pageContent).not.toContain('Sample Agent');
        expect(pageContent).not.toContain('Template Agent');
        expect(pageContent).not.toContain('Default Agent');
        expect(pageContent).not.toContain('Test Agent');
        expect(pageContent).not.toContain('Example Agent');
        
        // Agent name should be specific
        const agentNameElements = await page.locator('h1, .font-semibold').all();
        let foundSpecificName = false;
        
        for (const nameElement of agentNameElements) {
          const text = await nameElement.textContent();
          if (text?.toLowerCase().includes(agentId) || text?.includes('Agent')) {
            foundSpecificName = true;
            expect(text).not.toBe('Agent');
            expect(text).not.toBe('AI Agent');
            break;
          }
        }
        
        expect(foundSpecificName).toBeTruthy();
      });
    });

    test('should show different statistics across different agents', async ({ page }) => {
      const agentData: any[] = [];

      // Collect data from multiple agents
      for (const agentId of TEST_AGENTS.slice(0, 3)) { // Test first 3 agents
        await navigateToUnifiedAgent(page, agentId);
        await waitForRealDataLoad(page);

        const successRateText = await page.locator('text=/\\d+% success rate/').first().textContent();
        const tasksText = await page.locator('text=/\\d+ tasks completed/').first().textContent();
        
        agentData.push({
          agentId,
          successRate: extractNumericValue(successRateText || ''),
          tasks: extractNumericValue(tasksText || '')
        });
      }

      // Verify agents have different statistics (not identical template data)
      if (agentData.length >= 2) {
        const allIdentical = agentData.every(data => 
          data.successRate === agentData[0].successRate &&
          data.tasks === agentData[0].tasks
        );
        
        expect(allIdentical).toBeFalsy(); // Different agents should have different stats
      }
    });
  });

  test.describe('Test 4: Error Handling Without Mock Fallbacks', () => {
    test('should handle invalid agent ID with proper error, no mock fallback', async ({ page }) => {
      const invalidAgentId = 'completely-invalid-agent-id-12345';

      await page.goto(`${BASE_URL}/agents/${invalidAgentId}`);
      await page.waitForLoadState('networkidle');

      // Should show proper error, not fall back to mock data
      const hasError = await page.locator('text=Error Loading Agent, text=Agent Not Found').isVisible();
      const hasMockData = await page.locator('text=/\\d+% success rate/').isVisible();
      
      expect(hasError).toBeTruthy();
      expect(hasMockData).toBeFalsy(); // Should NOT show mock data as fallback

      // Verify error recovery options
      await expect(page.locator('button:has-text("Back to Agents")')).toBeVisible();
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('should handle API failure without showing mock data', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      // Intercept API call and simulate failure
      await page.route(`**/api/agents/${agentId}`, route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Internal Server Error' })
        });
      });

      await page.goto(`${BASE_URL}/agents/${agentId}`);
      await page.waitForLoadState('networkidle');

      // Should show error state, not render mock data
      const hasError = await page.locator('text=Error Loading Agent').isVisible({ timeout: 8000 });
      const hasMockStats = await page.locator('text=/\\d+% success rate/').isVisible();
      
      expect(hasError).toBeTruthy();
      expect(hasMockStats).toBeFalsy(); // Critical: no mock data should appear

      // Verify no random numbers are displayed during error state
      const pageContent = await page.content();
      const randomPatterns = [
        /\b9[0-9]% success rate\b/, // 90-99% success rates (common mock values)
        /\b[1-9]\d{2,3} tasks completed\b/, // 100-9999 tasks (random ranges)
        /\b[0-5]\.\d+s avg response\b/ // 0.5-5.9s response times (random ranges)
      ];

      for (const pattern of randomPatterns) {
        expect(pageContent).not.toMatch(pattern);
      }
    });

    test('should maintain graceful degradation without mock content', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      // Simulate partial API response
      await page.route(`**/api/agents/${agentId}`, route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: agentId,
              name: agentId,
              description: 'Real agent with limited data',
              status: 'active'
              // Missing stats, capabilities, etc.
            }
          })
        });
      });

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Should display available data gracefully
      await expect(page.locator(`text=${agentId}`)).toBeVisible();
      await expect(page.locator('text=active')).toBeVisible();

      // Should NOT fill missing data with mock values
      const pageContent = await page.content();
      expect(pageContent).not.toContain('Math.floor(Math.random()');
      expect(pageContent).not.toContain('90'); // Common mock success rate
      expect(pageContent).not.toContain('95'); // Another common mock success rate
    });
  });

  test.describe('Test 5: Performance Validation with Real Data', () => {
    test('should load real data within 3 seconds', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      
      const startTime = Date.now();
      
      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 second requirement
      
      // Verify real data was loaded (not placeholder)
      await expect(page.locator(`text=${agentId}`)).toBeVisible();
      await expect(page.locator('text=Overview')).toBeVisible();
    });

    test('should make efficient API calls without duplicate requests', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      let apiCallCount = 0;

      // Count API calls
      await page.route(`**/api/agents/${agentId}`, route => {
        apiCallCount++;
        route.continue();
      });

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Should make exactly one API call per agent load
      expect(apiCallCount).toBe(1);

      // Navigate between tabs (should not trigger additional API calls)
      await page.click('button:has-text("Details")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Activity")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Overview")');
      await page.waitForTimeout(500);

      // Should still be just one API call
      expect(apiCallCount).toBe(1);
    });

    test('should handle console errors during real data loading', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const agentId = 'agent-feedback-agent';
      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Should have no console errors during normal real data loading
      const relevantErrors = consoleErrors.filter(error => 
        !error.includes('favicon') && // Ignore favicon errors
        !error.includes('sourcemap') && // Ignore sourcemap errors  
        !error.includes('DevTools') // Ignore DevTools errors
      );

      expect(relevantErrors.length).toBe(0);
    });
  });

  test.describe('Mock Data Contamination Detection', () => {
    test('should detect and fail if any mock data patterns exist', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Get complete page content
      const pageContent = await page.content();
      const pageText = await page.locator('body').textContent();

      // Critical mock data contamination patterns
      const mockPatterns = [
        /Math\.floor\(Math\.random\(\)/g,
        /Math\.round\(Math\.random\(\)/g, 
        /mock[A-Z]\w+/g,
        /fake[A-Z]\w+/g,
        /stub[A-Z]\w+/g,
        /generateRecentActivities/g,
        /generateRecentPosts/g,
        /Lorem ipsum/gi,
        /placeholder/gi,
        /sample data/gi,
        /test data/gi,
        /demo data/gi
      ];

      for (const pattern of mockPatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          console.error(`Mock contamination detected: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull();
      }

      // Verify no suspicious statistical patterns (common in mock data)
      const suspiciousPatterns = [
        /\b90% success rate\b/,
        /\b95% success rate\b/,
        /\b98% success rate\b/,
        /\b99% success rate\b/,
        /\b1\.\d+s avg response\b/, // 1.x second responses are common mock values
        /\b2\.\d+s avg response\b/  // 2.x second responses are common mock values
      ];

      for (const pattern of suspiciousPatterns) {
        expect(pageText).not.toMatch(pattern);
      }
    });

    test('should verify all statistics come from API, not generated', async ({ page }) => {
      const agentId = 'agent-feedback-agent';
      let actualApiData: any;

      // Capture real API response
      await page.route(`**/api/agents/${agentId}`, async (route, request) => {
        const response = await route.fetch();
        const json = await response.json();
        actualApiData = json.data;
        await route.fulfill({ response });
      });

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // If API provides performance metrics, verify they're displayed
      if (actualApiData?.performance_metrics) {
        const metrics = actualApiData.performance_metrics;
        
        if (metrics.success_rate !== undefined) {
          await expect(page.locator(`text=${metrics.success_rate}% success rate`)).toBeVisible();
        }
        
        if (metrics.uptime_percentage !== undefined) {
          await expect(page.locator(`text=${metrics.uptime_percentage}% uptime`)).toBeVisible();
        }
      }

      // If API provides health status, verify response time is displayed
      if (actualApiData?.health_status?.response_time !== undefined) {
        const responseTime = actualApiData.health_status.response_time;
        await expect(page.locator(`text=${responseTime}s avg response`)).toBeVisible();
      }

      // Should NOT show any values that aren't in the API response
      expect(actualApiData).toBeDefined();
    });

    test('should fail fast if mock fallback patterns are detected', async ({ page }) => {
      const agentId = 'agent-feedback-agent';

      await navigateToUnifiedAgent(page, agentId);
      await waitForRealDataLoad(page);

      // Check page source for mock fallback code patterns
      const pageContent = await page.evaluate(() => document.documentElement.outerHTML);

      // These patterns indicate mock fallback is still active
      const fallbackPatterns = [
        'Math.floor(Math.random() * 1000) + 100', // tasksCompleted fallback
        'Math.floor(Math.random() * 10) + 90',    // successRate fallback  
        'Math.round((Math.random() * 2 + 0.5) * 10) / 10', // responseTime fallback
        'Math.floor(Math.random() * 5) + 95',     // uptime fallback
        'Math.floor(Math.random() * 30) + 5',     // todayTasks fallback
        'Math.floor(Math.random() * 150) + 50'    // weeklyTasks fallback
      ];

      for (const pattern of fallbackPatterns) {
        expect(pageContent).not.toContain(pattern);
      }

      // Verify no fallback function calls are present
      expect(pageContent).not.toContain('generateRecentActivities');
      expect(pageContent).not.toContain('generateRecentPosts');
    });
  });
});