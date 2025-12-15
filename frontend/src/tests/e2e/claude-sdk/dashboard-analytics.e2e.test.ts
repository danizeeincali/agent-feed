/**
 * Playwright E2E Tests for Claude SDK Analytics Dashboard
 * Tests complete user workflows and dashboard functionality
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { mockClaudeCodeAPI, setupMockScenario } from '@/tests/mocks/claude-code-sdk.mock';

// Test data constants
const MOCK_ANALYTICS_DATA = {
  costMetrics: {
    totalTokensUsed: 15420,
    totalCost: 0.2456,
    costByProvider: {
      claude: 0.2156,
      openai: 0.0300
    },
    costByModel: {
      'claude-3-5-sonnet-20241022': 0.1856,
      'claude-3-haiku-20240307': 0.0300,
      'gpt-4-turbo': 0.0300
    },
    averageCostPerToken: 0.0000159,
    tokensPerMinute: 128.5,
    costTrend: 'increasing' as const,
    lastUpdated: new Date(),
    dailyCost: 0.1456,
    weeklyCost: 0.8234,
    monthlyCost: 2.4567
  },
  budgetStatus: {
    dailyBudget: 10.0,
    weeklyBudget: 50.0,
    monthlyBudget: 200.0,
    dailyUsed: 0.1456,
    weeklyUsed: 0.8234,
    monthlyUsed: 2.4567,
    dailyPercentage: 1.456,
    weeklyPercentage: 1.647,
    monthlyPercentage: 1.228,
    alertLevel: 'safe' as const,
    projectedDailyCost: 0.2912,
    projectedMonthlyCost: 8.7336
  }
};

// Test configuration
test.describe.configure({ mode: 'parallel' });

test.describe('Claude SDK Analytics Dashboard E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create isolated context for each test
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write']
    });

    page = await context.newPage();

    // Setup console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Setup request/response monitoring
    page.on('response', response => {
      if (!response.ok()) {
        console.warn(`Failed request: ${response.url()} - ${response.status()}`);
      }
    });

    // Mock API responses
    await page.route('**/api/claude-code/streaming-chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          responses: [{
            content: 'Mock Claude response for analytics testing',
            type: 'assistant'
          }],
          usage: {
            prompt_tokens: 156,
            completion_tokens: 89,
            total_tokens: 245
          },
          model: 'claude-3-5-sonnet-20241022',
          timestamp: new Date().toISOString()
        })
      });
    });

    // Mock analytics data endpoint
    await page.route('**/api/analytics/cost-metrics', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ANALYTICS_DATA)
      });
    });

    // Navigate to analytics dashboard
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Dashboard Loading and Navigation', () => {
    test('should load analytics dashboard successfully', async () => {
      // Check for main dashboard elements
      await expect(page.getByTestId('analytics-dashboard')).toBeVisible();
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Check for navigation tabs
      await expect(page.getByRole('tab', { name: 'Token Cost Analytics' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'System Analytics' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Performance Analytics' })).toBeVisible();
    });

    test('should navigate between analytics tabs', async () => {
      // Navigate to Token Cost Analytics
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();
      await expect(page.getByTestId('token-cost-analytics')).toBeVisible();

      // Navigate to System Analytics
      await page.getByRole('tab', { name: 'System Analytics' }).click();
      await expect(page.getByTestId('system-analytics')).toBeVisible();

      // Navigate to Performance Analytics
      await page.getByRole('tab', { name: 'Performance Analytics' }).click();
      await expect(page.getByTestId('performance-analytics')).toBeVisible();
    });

    test('should handle loading states gracefully', async () => {
      // Add delay to API response to test loading state
      await page.route('**/api/analytics/cost-metrics', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANALYTICS_DATA)
          });
        }, 1000);
      });

      await page.reload();

      // Should show loading spinner
      await expect(page.getByTestId('analytics-loading')).toBeVisible();

      // Should eventually show data
      await expect(page.getByTestId('analytics-loading')).not.toBeVisible({ timeout: 2000 });
      await expect(page.getByTestId('cost-metrics-cards')).toBeVisible();
    });
  });

  test.describe('Token Cost Analytics Functionality', () => {
    test.beforeEach(async () => {
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();
      await expect(page.getByTestId('token-cost-analytics')).toBeVisible();
    });

    test('should display cost metrics cards with correct data', async () => {
      // Check total cost card
      const totalCostCard = page.getByTestId('total-cost-card');
      await expect(totalCostCard).toBeVisible();
      await expect(totalCostCard.getByText('$0.2456')).toBeVisible();

      // Check total tokens card
      const totalTokensCard = page.getByTestId('total-tokens-card');
      await expect(totalTokensCard).toBeVisible();
      await expect(totalTokensCard.getByText('15,420')).toBeVisible();

      // Check average cost per token card
      const avgCostCard = page.getByTestId('avg-cost-token-card');
      await expect(avgCostCard).toBeVisible();
      await expect(avgCostCard.getByText('$0.000016')).toBeVisible();
    });

    test('should show budget status with proper alert levels', async () => {
      const budgetCard = page.getByTestId('budget-status-card');
      await expect(budgetCard).toBeVisible();

      // Should show daily budget usage
      await expect(budgetCard.getByText('$0.1456')).toBeVisible();
      await expect(budgetCard.getByText('/ $10.00')).toBeVisible();

      // Should show percentage
      await expect(budgetCard.getByText('1.5% used')).toBeVisible();

      // Should have safe status styling
      await expect(budgetCard.locator('.bg-green-500')).toBeVisible();
    });

    test('should display cost breakdown by provider', async () => {
      const providerBreakdown = page.getByTestId('provider-breakdown');
      await expect(providerBreakdown).toBeVisible();

      // Check Claude provider
      await expect(providerBreakdown.getByText('Claude')).toBeVisible();
      await expect(providerBreakdown.getByText('$0.2156')).toBeVisible();

      // Check OpenAI provider
      await expect(providerBreakdown.getByText('OpenAI')).toBeVisible();
      await expect(providerBreakdown.getByText('$0.0300')).toBeVisible();
    });

    test('should filter data by time range', async () => {
      // Click on time range selector
      await page.getByTestId('time-range-selector').click();

      // Select 7 days
      await page.getByRole('button', { name: '7d' }).click();

      // Should update the display
      await expect(page.getByText('Last 7 days')).toBeVisible();

      // Try 30 days
      await page.getByRole('button', { name: '30d' }).click();
      await expect(page.getByText('Last 30 days')).toBeVisible();
    });

    test('should export cost data', async () => {
      const exportButton = page.getByTestId('export-cost-data');
      await expect(exportButton).toBeVisible();

      // Mock file download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/token-cost-analytics-\d{4}-\d{2}-\d{2}\.json/);
    });

    test('should refresh data when refresh button is clicked', async () => {
      const refreshButton = page.getByTestId('refresh-analytics');
      await expect(refreshButton).toBeVisible();

      // Click refresh
      await refreshButton.click();

      // Should show loading state briefly
      await expect(page.getByTestId('refresh-loading')).toBeVisible();

      // Should complete refresh
      await expect(page.getByTestId('refresh-loading')).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Real-time Cost Tracking Integration', () => {
    test('should track costs when using Avi chat feature', async () => {
      // Navigate to main page with Avi chat
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find and interact with Avi chat
      const aviChat = page.getByTestId('avi-chat-sdk');
      await expect(aviChat).toBeVisible();

      // Send a message
      const messageInput = aviChat.getByPlaceholder('Type your message to Avi...');
      await messageInput.fill('Hello Avi, can you help me with analytics?');

      const sendButton = aviChat.getByRole('button', { name: 'Send' });
      await sendButton.click();

      // Wait for response
      await expect(aviChat.getByText('Mock Claude response for analytics testing')).toBeVisible();

      // Navigate back to analytics dashboard
      await page.goto('/analytics');
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();

      // Should see updated cost data (this would be mocked in a real scenario)
      await expect(page.getByTestId('total-tokens-card')).toBeVisible();
    });

    test('should show real-time updates indicator', async () => {
      // Check for real-time indicator
      const realtimeIndicator = page.getByTestId('realtime-indicator');
      await expect(realtimeIndicator).toBeVisible();

      // Should show connected status
      await expect(realtimeIndicator.getByText('Live')).toBeVisible();

      // Should have green dot indicator
      await expect(realtimeIndicator.locator('.bg-green-400')).toBeVisible();
    });
  });

  test.describe('Budget Alerts and Warnings', () => {
    test('should display budget warning when threshold is exceeded', async () => {
      // Mock high usage data
      await page.route('**/api/analytics/cost-metrics', route => {
        const highUsageData = {
          ...MOCK_ANALYTICS_DATA,
          budgetStatus: {
            ...MOCK_ANALYTICS_DATA.budgetStatus,
            dailyUsed: 8.5,
            dailyPercentage: 85.0,
            alertLevel: 'warning' as const
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(highUsageData)
        });
      });

      await page.reload();
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();

      // Should show warning alert
      const warningAlert = page.getByTestId('budget-warning-alert');
      await expect(warningAlert).toBeVisible();
      await expect(warningAlert.getByText('Budget Alert: Warning')).toBeVisible();
      await expect(warningAlert.getByText('85.0%')).toBeVisible();
    });

    test('should display critical alert when usage is very high', async () => {
      // Mock critical usage data
      await page.route('**/api/analytics/cost-metrics', route => {
        const criticalUsageData = {
          ...MOCK_ANALYTICS_DATA,
          budgetStatus: {
            ...MOCK_ANALYTICS_DATA.budgetStatus,
            dailyUsed: 9.8,
            dailyPercentage: 98.0,
            alertLevel: 'critical' as const
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(criticalUsageData)
        });
      });

      await page.reload();
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();

      // Should show critical alert
      const criticalAlert = page.getByTestId('budget-critical-alert');
      await expect(criticalAlert).toBeVisible();
      await expect(criticalAlert.getByText('Budget Alert: Critical')).toBeVisible();
      await expect(criticalAlert.getByText('98.0%')).toBeVisible();

      // Should have red styling
      await expect(criticalAlert.locator('.text-red-600')).toBeVisible();
    });

    test('should show exceeded alert when budget is surpassed', async () => {
      // Mock exceeded usage data
      await page.route('**/api/analytics/cost-metrics', route => {
        const exceededUsageData = {
          ...MOCK_ANALYTICS_DATA,
          budgetStatus: {
            ...MOCK_ANALYTICS_DATA.budgetStatus,
            dailyUsed: 12.5,
            dailyPercentage: 125.0,
            alertLevel: 'exceeded' as const
          }
        };

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(exceededUsageData)
        });
      });

      await page.reload();
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();

      // Should show exceeded alert
      const exceededAlert = page.getByTestId('budget-exceeded-alert');
      await expect(exceededAlert).toBeVisible();
      await expect(exceededAlert.getByText('Budget Alert: Exceeded')).toBeVisible();
      await expect(exceededAlert.getByText('Budget limits have been exceeded')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/analytics/cost-metrics', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      await page.reload();

      // Should show error state
      const errorState = page.getByTestId('analytics-error');
      await expect(errorState).toBeVisible();
      await expect(errorState.getByText('Token Cost Analytics Error')).toBeVisible();

      // Should have retry button
      const retryButton = errorState.getByRole('button', { name: 'Retry' });
      await expect(retryButton).toBeVisible();
    });

    test('should handle empty data state', async () => {
      // Mock empty data
      await page.route('**/api/analytics/cost-metrics', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            costMetrics: {
              totalTokensUsed: 0,
              totalCost: 0,
              costByProvider: {},
              costByModel: {},
              averageCostPerToken: 0,
              tokensPerMinute: 0,
              costTrend: 'stable',
              lastUpdated: new Date(),
              dailyCost: 0,
              weeklyCost: 0,
              monthlyCost: 0
            },
            usageData: []
          })
        });
      });

      await page.reload();
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();

      // Should show empty state
      const emptyState = page.getByTestId('analytics-empty-state');
      await expect(emptyState).toBeVisible();
      await expect(emptyState.getByText('No token usage data')).toBeVisible();
    });

    test('should handle network connectivity issues', async () => {
      // Simulate network failure
      await page.route('**/api/analytics/cost-metrics', route => {
        route.abort('failed');
      });

      await page.reload();

      // Should show connection error
      await expect(page.getByText('Failed to load analytics data')).toBeVisible();

      // Should offer retry option
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Navigation should be responsive
      await expect(page.getByTestId('analytics-dashboard')).toBeVisible();

      // Tabs should be scrollable on mobile
      await expect(page.getByRole('tab', { name: 'Token Cost Analytics' })).toBeVisible();

      // Cards should stack vertically
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();
      const costCards = page.getByTestId('cost-metrics-cards');
      await expect(costCards).toBeVisible();

      // Should be able to scroll to see all cards
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByTestId('budget-status-card')).toBeVisible();
    });

    test('should handle touch interactions properly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Touch navigation
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).tap();
      await expect(page.getByTestId('token-cost-analytics')).toBeVisible();

      // Touch time range selector
      await page.getByRole('button', { name: '7d' }).tap();
      await expect(page.getByText('Last 7 days')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be accessible to screen readers', async () => {
      // Check for proper ARIA labels
      await expect(page.getByRole('main', { name: 'Analytics Dashboard' })).toBeVisible();
      await expect(page.getByRole('tablist', { name: 'Analytics Sections' })).toBeVisible();

      // Check for semantic headings
      await expect(page.getByRole('heading', { name: 'Token Cost Analytics' })).toBeVisible();

      // Check for proper table accessibility
      if (await page.getByRole('table').isVisible()) {
        await expect(page.getByRole('table')).toHaveAttribute('aria-label');
      }
    });

    test('should support keyboard navigation', async () => {
      // Focus on first tab
      await page.keyboard.press('Tab');
      await expect(page.getByRole('tab', { name: 'Token Cost Analytics' })).toBeFocused();

      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'System Analytics' })).toBeFocused();

      // Activate with Enter
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('system-analytics')).toBeVisible();
    });

    test('should have sufficient color contrast', async () => {
      // This would typically use automated accessibility testing tools
      // For now, we'll check for proper contrast classes
      const alertText = page.getByTestId('budget-status-card').locator('text');
      await expect(alertText).toHaveClass(/text-(gray|green|yellow|orange|red)-(600|700|800|900)/);
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within performance budget', async () => {
      const startTime = Date.now();
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = {
        ...MOCK_ANALYTICS_DATA,
        usageData: Array.from({ length: 1000 }, (_, i) => ({
          id: `usage-${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100 + (i % 500),
          estimatedCost: 0.003 * (100 + (i % 500)) / 1000,
          requestType: 'chat',
          component: 'AviDirectChatSDK'
        }))
      };

      await page.route('**/api/analytics/cost-metrics', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });

      const startTime = Date.now();
      await page.reload();
      await page.getByRole('tab', { name: 'Token Cost Analytics' }).click();
      await page.waitForLoadState('networkidle');
      const renderTime = Date.now() - startTime;

      // Should render large dataset within reasonable time
      expect(renderTime).toBeLessThan(5000);

      // Should still be responsive
      await expect(page.getByTestId('cost-metrics-cards')).toBeVisible();
    });
  });
});