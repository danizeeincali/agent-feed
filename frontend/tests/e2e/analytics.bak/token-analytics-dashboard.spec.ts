/**
 * End-to-End Tests for Token Analytics Dashboard
 * SPARC COMPLETION: Production-ready validation
 */

import { test, expect } from '@playwright/test';

test.describe('Token Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the analytics page
    await page.goto('/analytics');
  });

  test('should load and display the token analytics dashboard', async ({ page }) => {
    // Wait for the dashboard to load
    await expect(page.getByTestId('token-analytics-dashboard')).toBeVisible();

    // Check header elements
    await expect(page.getByText('Token Analytics')).toBeVisible();
    await expect(page.getByText('Monitor your Claude API usage and costs in real-time')).toBeVisible();

    // Check action buttons
    await expect(page.getByText('Export CSV')).toBeVisible();
    await expect(page.getByText('Refresh')).toBeVisible();
  });

  test('should display charts when data is available', async ({ page }) => {
    // Mock API responses for successful data loading
    await page.route('/api/token-analytics/**', async route => {
      const url = route.request().url();
      if (url.includes('/hourly')) {
        await route.fulfill({
          json: {
            data: {
              labels: ['00:00', '01:00', '02:00'],
              datasets: [{
                label: 'Tokens Used',
                data: [1000, 1500, 800],
                borderColor: 'rgb(59, 130, 246)',
              }]
            }
          }
        });
      } else if (url.includes('/daily')) {
        await route.fulfill({
          json: {
            data: {
              labels: ['Day 1', 'Day 2', 'Day 3'],
              datasets: [{
                label: 'Daily Tokens',
                data: [10000, 15000, 8000],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
              }]
            }
          }
        });
      } else if (url.includes('/summary')) {
        await route.fulfill({
          json: {
            data: {
              summary: {
                total_requests: 150,
                total_tokens: 50000,
                total_cost: 2500,
                avg_processing_time: 1200,
              },
              by_provider: [],
              by_model: [],
            }
          }
        });
      } else if (url.includes('/messages')) {
        await route.fulfill({
          json: {
            data: [{
              id: 1,
              timestamp: '2024-01-01T12:00:00Z',
              provider: 'anthropic',
              model: 'claude-3-sonnet',
              request_type: 'chat',
              total_tokens: 1500,
              cost_total: 75,
              processing_time_ms: 1200,
              message_preview: 'Hello, how can I help you today?',
              response_preview: 'I can assist you with various tasks...',
            }]
          }
        });
      }
    });

    await page.reload();

    // Wait for charts to render
    await expect(page.getByText('Hourly Usage (Last 24 Hours)')).toBeVisible();
    await expect(page.getByText('Daily Usage (Last 30 Days)')).toBeVisible();

    // Wait for summary cards
    await expect(page.getByText('150')).toBeVisible(); // Total Requests
    await expect(page.getByText('50,000')).toBeVisible(); // Total Tokens
  });

  test('should handle search functionality in messages', async ({ page }) => {
    // Mock messages API
    await page.route('/api/token-analytics/messages**', async route => {
      await route.fulfill({
        json: {
          data: [
            {
              id: 1,
              timestamp: '2024-01-01T12:00:00Z',
              provider: 'anthropic',
              model: 'claude-3-sonnet',
              request_type: 'chat',
              total_tokens: 1500,
              cost_total: 75,
              processing_time_ms: 1200,
              message_preview: 'Hello, how can I help you today?',
              response_preview: 'I can assist you with various tasks...',
            },
            {
              id: 2,
              timestamp: '2024-01-01T11:30:00Z',
              provider: 'openai',
              model: 'gpt-4',
              request_type: 'completion',
              total_tokens: 800,
              cost_total: 40,
              processing_time_ms: 800,
              message_preview: 'Write a function to sort an array',
              response_preview: 'Here is a sorting function...',
            }
          ]
        }
      });
    });

    await page.reload();

    // Wait for messages to load
    await expect(page.getByText('Recent Messages')).toBeVisible();
    await expect(page.getByText('Hello, how can I help you today?')).toBeVisible();
    await expect(page.getByText('Write a function to sort an array')).toBeVisible();

    // Test search functionality
    const searchInput = page.getByPlaceholderText('Search messages...');
    await searchInput.fill('function');

    // Should show only the matching message
    await expect(page.getByText('Write a function to sort an array')).toBeVisible();
    await expect(page.getByText('Hello, how can I help you today?')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText('Hello, how can I help you today?')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return errors
    await page.route('/api/token-analytics/**', async route => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.reload();

    // Should show error state
    await expect(page.getByText('Error Loading Token Analytics')).toBeVisible();
    await expect(page.getByText('Retry')).toBeVisible();
  });

  test('should handle refresh functionality', async ({ page }) => {
    let apiCallCount = 0;

    await page.route('/api/token-analytics/**', async route => {
      apiCallCount++;
      await route.fulfill({
        json: {
          data: {
            summary: {
              total_requests: 150 + apiCallCount,
              total_tokens: 50000,
              total_cost: 2500,
              avg_processing_time: 1200,
            },
            by_provider: [],
            by_model: [],
          }
        }
      });
    });

    await page.reload();

    // Initial load
    await expect(page.getByText('151')).toBeVisible(); // 150 + 1

    // Click refresh
    await page.getByText('Refresh').click();

    // Should see updated data
    await expect(page.getByText('155')).toBeVisible(); // 150 + 5 (additional API calls)
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.reload();

    // Dashboard should still be visible and functional
    await expect(page.getByTestId('token-analytics-dashboard')).toBeVisible();
    await expect(page.getByText('Token Analytics')).toBeVisible();

    // Summary cards should stack vertically on mobile
    const summaryCards = page.locator('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    await expect(summaryCards).toBeVisible();
  });

  test('should export data when export button is clicked', async ({ page }) => {
    // Mock export API
    await page.route('/api/token-analytics/export**', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="token-analytics-30d.csv"'
        },
        body: 'timestamp,provider,model,tokens,cost\n2024-01-01,anthropic,claude-3-sonnet,1500,75'
      });
    });

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');

    await page.getByText('Export CSV').click();

    // Wait for and verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('token-analytics-30d.csv');
  });

  test('should handle loading states properly', async ({ page }) => {
    // Mock slow API responses
    await page.route('/api/token-analytics/**', async route => {
      // Delay response by 2 seconds
      await page.waitForTimeout(2000);
      await route.fulfill({
        json: {
          data: {
            summary: {
              total_requests: 150,
              total_tokens: 50000,
              total_cost: 2500,
              avg_processing_time: 1200,
            },
            by_provider: [],
            by_model: [],
          }
        }
      });
    });

    await page.reload();

    // Should show loading indicators
    const loadingSpinners = page.locator('.animate-spin');
    await expect(loadingSpinners.first()).toBeVisible();

    // Wait for data to load
    await expect(page.getByText('150')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain accessibility standards', async ({ page }) => {
    await page.reload();

    // Check for proper heading structure
    await expect(page.getByRole('heading', { name: 'Token Analytics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Messages' })).toBeVisible();

    // Check for proper form labels
    const searchInput = page.getByPlaceholderText('Search messages...');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('type', 'text');

    // Check for proper button accessibility
    const refreshButton = page.getByRole('button', { name: /Refresh/ });
    await expect(refreshButton).toBeVisible();

    const exportButton = page.getByRole('button', { name: /Export CSV/ });
    await expect(exportButton).toBeVisible();
  });
});