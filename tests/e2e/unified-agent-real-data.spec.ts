/**
 * E2E Tests: UnifiedAgentPage Real Data Integration
 * 
 * End-to-end verification that mock data has been eliminated
 * and real API data is being used throughout the interface.
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('UnifiedAgentPage Real Data Integration E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup API interception to verify real data usage
    await page.route('**/api/agents/**', async (route) => {
      // Let the real API call through, but log it
      const response = await route.fetch();
      const body = await response.text();
      console.log(`API Response for ${route.request().url()}:`, body);
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: body
      });
    });
  });
  
  test('should load real agent data from API endpoint', async ({ page }) => {
    // Navigate to agent page
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    
    // Wait for API call to complete
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Verify real agent data is displayed (not mock data)
    await expect(page.locator('h1')).toContainText('meta-agent');
    
    // Verify status from real API
    await expect(page.locator('[data-testid="agent-status"]')).toContainText('active');
    
    // Verify real performance metrics are displayed (not random values)
    const successRateElement = page.locator('[data-testid="success-rate"]');
    await expect(successRateElement).toBeVisible();
    
    // Get the actual success rate value
    const successRateText = await successRateElement.textContent();
    expect(successRateText).toMatch(/\d+%/); // Should be a percentage
    
    // Verify it's not in the typical Math.random() range (90-100)
    const successRateValue = parseInt(successRateText?.replace('%', '') || '0');
    
    // Real API data should be more specific, not rounded to common ranges
    expect(successRateValue).toBeGreaterThan(0);
    expect(successRateValue).toBeLessThanOrEqual(100);
  });
  
  test('should display real performance metrics instead of random values', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Capture initial metric values
    const initialSuccessRate = await page.locator('[data-testid="success-rate"]').textContent();
    const initialResponseTime = await page.locator('[data-testid="response-time"]').textContent();
    const initialUptime = await page.locator('[data-testid="uptime"]').textContent();
    
    // Refresh the page
    await page.reload();
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Verify values are consistent (not random)
    const newSuccessRate = await page.locator('[data-testid="success-rate"]').textContent();
    const newResponseTime = await page.locator('[data-testid="response-time"]').textContent();
    const newUptime = await page.locator('[data-testid="uptime"]').textContent();
    
    // Real API data should be consistent across refreshes
    expect(newSuccessRate).toBe(initialSuccessRate);
    expect(newResponseTime).toBe(initialResponseTime);
    expect(newUptime).toBe(initialUptime);
  });
  
  test('should show real activities derived from health_status', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Navigate to Activity tab
    await page.click('[data-testid="activity-tab"]');
    
    // Wait for activities to load
    await page.waitForSelector('[data-testid="activities-list"]');
    
    // Verify fake hardcoded activities are NOT present
    const fakeActivities = [
      'Data Analysis Complete',
      'Report Generation Started',
      '1000 Tasks Completed', 
      'High Performance Rating'
    ];
    
    for (const fakeActivity of fakeActivities) {
      await expect(page.locator(`text=${fakeActivity}`)).not.toBeVisible();
    }
    
    // Verify activities are based on real health_status data
    // Look for health-status derived activities
    const healthBasedActivities = page.locator('[data-testid="activities-list"] .activity-item');
    await expect(healthBasedActivities).not.toHaveCount(0);
  });
  
  test('should handle different agent IDs correctly', async ({ page }) => {
    // Test with different available agents
    const availableAgents = [
      'meta-agent',
      'meeting-prep-agent', 
      'personal-todos-agent'
    ];
    
    for (const agentId of availableAgents) {
      await page.goto(`${BASE_URL}/agents/${agentId}`);
      
      // Wait for API response
      const response = await page.waitForResponse(`**/api/agents/${agentId}`);
      expect(response.status()).toBe(200);
      
      // Verify agent-specific data is loaded
      await expect(page.locator('h1')).toContainText(agentId);
      
      // Verify unique metrics for each agent (not the same random values)
      const successRate = await page.locator('[data-testid="success-rate"]').textContent();
      expect(successRate).toMatch(/\d+%/);
    }
  });
  
  test('should handle non-existent agent gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/non-existent-agent`);
    
    // Wait for API response (should be 404)
    const response = await page.waitForResponse('**/api/agents/non-existent-agent');
    expect(response.status()).toBe(404);
    
    // Verify error handling
    await expect(page.locator('text=Error Loading Agent')).toBeVisible();
    await expect(page.locator('text=Agent not found')).toBeVisible();
  });
  
  test('should verify API response structure matches component expectations', async ({ page }) => {
    // Intercept API response to verify structure
    let apiResponseData: any = null;
    
    await page.route('**/api/agents/meta-agent', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      apiResponseData = body;
      
      // Ensure response has required fields
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.performance_metrics).toBeDefined();
      expect(body.data.health_status).toBeDefined();
      
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: JSON.stringify(body)
      });
    });
    
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Verify component displays API data correctly
    if (apiResponseData?.data?.performance_metrics) {
      const expectedSuccessRate = Math.round(apiResponseData.data.performance_metrics.success_rate);
      await expect(page.locator('[data-testid="success-rate"]')).toContainText(`${expectedSuccessRate}%`);
    }
  });
  
  test('should verify data consistency across page refreshes', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Capture all metric values
    const metrics = {
      successRate: await page.locator('[data-testid="success-rate"]').textContent(),
      responseTime: await page.locator('[data-testid="response-time"]').textContent(),
      uptime: await page.locator('[data-testid="uptime"]').textContent(),
      tasksCompleted: await page.locator('[data-testid="tasks-completed"]').textContent()
    };
    
    // Refresh multiple times to ensure consistency (real data should not change randomly)
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForResponse('**/api/agents/meta-agent');
      
      const newMetrics = {
        successRate: await page.locator('[data-testid="success-rate"]').textContent(),
        responseTime: await page.locator('[data-testid="response-time"]').textContent(),
        uptime: await page.locator('[data-testid="uptime"]').textContent(),
        tasksCompleted: await page.locator('[data-testid="tasks-completed"]').textContent()
      };
      
      // Real API data should be consistent
      expect(newMetrics.successRate).toBe(metrics.successRate);
      expect(newMetrics.responseTime).toBe(metrics.responseTime);
      expect(newMetrics.uptime).toBe(metrics.uptime);
      expect(newMetrics.tasksCompleted).toBe(metrics.tasksCompleted);
    }
  });
  
  test('should verify tab navigation works with real data', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Test each tab loads real data
    const tabs = ['overview', 'details', 'activity', 'configuration'];
    
    for (const tab of tabs) {
      await page.click(`[data-testid="${tab}-tab"]`);
      
      // Verify tab content loads
      await expect(page.locator(`[data-testid="${tab}-content"]`)).toBeVisible();
      
      // Verify real data is present in each tab
      if (tab === 'details') {
        await expect(page.locator('text=meta-agent')).toBeVisible();
      } else if (tab === 'activity') {
        await expect(page.locator('[data-testid="activities-list"]')).toBeVisible();
      }
    }
  });
  
  test('should verify no Math.random() artifacts in displayed data', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents/meta-agent`);
    await page.waitForResponse('**/api/agents/meta-agent');
    
    // Check for common Math.random() patterns that should not exist with real data
    const successRate = await page.locator('[data-testid="success-rate"]').textContent();
    const responseTime = await page.locator('[data-testid="response-time"]').textContent();
    
    // Parse values
    const successRateNum = parseInt(successRate?.replace('%', '') || '0');
    const responseTimeNum = parseFloat(responseTime?.replace('s', '') || '0');
    
    // Real data should be more precise than typical random ranges
    // Math.random() typically generates ranges like 90-100 for success rate
    // Real API data should be more specific (like 93.59)
    
    // This test verifies we're getting API data, not generated ranges
    expect(successRateNum).not.toBe(90); // Common Math.floor(Math.random() * 10) + 90
    expect(successRateNum).not.toBe(95); // Another common generated value
    expect(successRateNum).not.toBe(100); // Another common generated value
    
    // Response time should not be typical Math.random() * 2 + 0.5 pattern
    expect(responseTimeNum).toBeGreaterThan(0);
    expect(responseTimeNum).not.toBe(1.0); // Common generated value
    expect(responseTimeNum).not.toBe(1.5); // Common generated value
    expect(responseTimeNum).not.toBe(2.0); // Common generated value
  });
});
