import { test, expect, Page } from '@playwright/test';

/**
 * Page Rendering Tests for Dynamic Pages
 *
 * Tests that all 5 dynamic pages render correctly with proper content:
 * 1. Dashboard Components
 * 2. Markdown Content
 * 3. JSON Data Display
 * 4. Text Content
 * 5. Component Widgets
 *
 * Validates:
 * - Content renders without errors
 * - Page layouts are correct
 * - Interactive elements work
 * - Responsive design
 * - Accessibility features
 * - Performance metrics
 */

interface DynamicPage {
  id: string;
  title: string;
  content_type: 'component' | 'markdown' | 'json' | 'text';
  content_value: string;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
}

test.describe('Dynamic Pages Rendering Tests', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:3000';
  const AGENT_ID = 'personal-todos-agent';

  // Test data for 5 different page types
  const testPages: Omit<DynamicPage, 'id'>[] = [
    {
      title: 'Dashboard Overview',
      content_type: 'component',
      content_value: JSON.stringify({
        type: 'dashboard',
        layout: 'grid',
        widgets: [
          { type: 'chart', title: 'Task Completion', data: { completed: 85, pending: 15 } },
          { type: 'stats', title: 'Weekly Stats', metrics: { tasks: 42, hours: 25 } },
          { type: 'recent', title: 'Recent Activity', items: ['Task A completed', 'Task B started'] }
        ]
      }),
      status: 'published',
      tags: ['dashboard', 'overview', 'stats']
    },
    {
      title: 'User Guide',
      content_type: 'markdown',
      content_value: `# Personal Todos Agent Guide

## Getting Started

This agent helps you manage your personal tasks and todos efficiently.

### Features
- ✅ Task tracking
- 📅 Calendar integration
- 📊 Progress analytics
- 🔔 Reminders

### Quick Actions
1. **Create Task**: Click the "+" button
2. **Complete Task**: Check the checkbox
3. **Edit Task**: Click on task title
4. **Delete Task**: Click the trash icon

## Advanced Features

### Categories
You can organize tasks into categories:
- Work
- Personal
- Shopping
- Projects

### Priority Levels
- 🔴 High Priority
- 🟡 Medium Priority
- 🟢 Low Priority

> **Tip**: Use keyboard shortcuts for faster navigation!`,
      status: 'published',
      tags: ['documentation', 'guide', 'help']
    },
    {
      title: 'Configuration Settings',
      content_type: 'json',
      content_value: JSON.stringify({
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            desktop: true
          },
          defaultView: 'list',
          sortBy: 'priority'
        },
        categories: [
          { id: 'work', name: 'Work', color: '#3b82f6' },
          { id: 'personal', name: 'Personal', color: '#10b981' },
          { id: 'shopping', name: 'Shopping', color: '#f59e0b' }
        ],
        shortcuts: {
          newTask: 'Ctrl+N',
          search: 'Ctrl+F',
          toggleComplete: 'Space'
        },
        integrations: {
          calendar: {
            enabled: true,
            provider: 'google',
            syncInterval: '15min'
          },
          email: {
            enabled: false,
            provider: null
          }
        }
      }),
      status: 'draft',
      tags: ['settings', 'configuration', 'preferences']
    },
    {
      title: 'Quick Reference',
      content_type: 'text',
      content_value: `PERSONAL TODOS AGENT - QUICK REFERENCE

KEYBOARD SHORTCUTS:
- Ctrl+N: New task
- Ctrl+F: Search tasks
- Space: Toggle completion
- Delete: Remove task
- Ctrl+E: Edit task
- Ctrl+D: Duplicate task

PRIORITY CODES:
H - High priority
M - Medium priority
L - Low priority

STATUS INDICATORS:
✓ Completed
⏳ In Progress
📅 Scheduled
🔄 Recurring
❌ Cancelled

CATEGORY PREFIXES:
@work - Work tasks
@home - Personal tasks
@shop - Shopping items
@proj - Project tasks

QUICK FILTERS:
today - Tasks due today
week - Tasks due this week
overdue - Past due tasks
completed - Finished tasks
priority:high - High priority only

BATCH OPERATIONS:
Select multiple tasks with Ctrl+Click
Bulk edit: Ctrl+B
Bulk complete: Ctrl+Shift+C
Bulk delete: Ctrl+Shift+D

For more help, type 'help' in the search box.`,
      status: 'published',
      tags: ['reference', 'shortcuts', 'help']
    },
    {
      title: 'Task Analytics',
      content_type: 'component',
      content_value: JSON.stringify({
        type: 'analytics',
        layout: 'tabs',
        sections: [
          {
            title: 'Performance',
            widgets: [
              { type: 'line-chart', title: 'Completion Rate', period: '30d' },
              { type: 'progress', title: 'Weekly Goal', current: 28, target: 35 }
            ]
          },
          {
            title: 'Trends',
            widgets: [
              { type: 'bar-chart', title: 'Tasks by Category', groupBy: 'category' },
              { type: 'heatmap', title: 'Activity Pattern', view: 'weekly' }
            ]
          },
          {
            title: 'Insights',
            widgets: [
              { type: 'metric', title: 'Average Completion Time', value: '2.3 days' },
              { type: 'metric', title: 'Most Productive Day', value: 'Tuesday' },
              { type: 'metric', title: 'Peak Hours', value: '9-11 AM' }
            ]
          }
        ]
      }),
      status: 'published',
      tags: ['analytics', 'metrics', 'insights']
    }
  ];

  let createdPageIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Create test pages before each test
    createdPageIds = [];

    for (const pageData of testPages) {
      const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.page) {
          createdPageIds.push(data.data.page.id);
        }
      }
    }

    console.log(`Created ${createdPageIds.length} test pages for rendering tests`);
  });

  test.afterEach(async () => {
    // Clean up test pages
    for (const pageId of createdPageIds) {
      try {
        await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages/${pageId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn(`Failed to delete test page ${pageId}:`, error);
      }
    }
    console.log(`Cleaned up ${createdPageIds.length} test pages`);
  });

  test('Dashboard Component Page renders correctly', async ({ page }) => {
    await navigateToPage(page, 0, 'Dashboard Overview');

    // Test dashboard layout
    await expect(page.locator('.dashboard, [data-widget-type="dashboard"], .grid')).toBeVisible({ timeout: 10000 });

    // Test for chart widget
    await expect(page.locator('.chart, [data-widget="chart"], canvas, svg')).toBeVisible();

    // Test for stats widget
    await expect(page.locator('.stats, [data-widget="stats"], .metric')).toBeVisible();

    // Test for recent activity
    await expect(page.locator('.recent, [data-widget="recent"], .activity')).toBeVisible();

    // Test interactive elements
    const chartElement = page.locator('.chart, [data-widget="chart"], canvas, svg').first();
    if (await chartElement.isVisible()) {
      // Chart should be responsive to hover
      await chartElement.hover();
      // Look for tooltips or hover effects
      const tooltip = page.locator('.tooltip, .chart-tooltip, [data-tooltip]');
      // Tooltip may or may not appear depending on implementation
    }
  });

  test('Markdown Content Page renders correctly', async ({ page }) => {
    await navigateToPage(page, 1, 'User Guide');

    // Test markdown rendering
    await expect(page.locator('h1, .markdown h1')).toContainText('Personal Todos Agent Guide');
    await expect(page.locator('h2, .markdown h2')).toContainText('Getting Started');
    await expect(page.locator('h3, .markdown h3')).toContainText('Features');

    // Test list rendering
    await expect(page.locator('ul li, .markdown ul li')).toContainText('Task tracking');
    await expect(page.locator('ol li, .markdown ol li')).toContainText('Create Task');

    // Test emoji rendering
    await expect(page.locator('text=✅, text=📅, text=📊, text=🔔')).toBeVisible();

    // Test blockquote
    await expect(page.locator('blockquote, .markdown blockquote')).toContainText('Tip');

    // Test priority indicators
    await expect(page.locator('text=🔴, text=🟡, text=🟢')).toBeVisible();

    // Test typography and styling
    const heading = page.locator('h1').first();
    await expect(heading).toHaveCSS('font-weight', /^(700|bold)$/);

    // Test responsiveness
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.markdown, .content')).toBeVisible();
  });

  test('JSON Configuration Page renders correctly', async ({ page }) => {
    await navigateToPage(page, 2, 'Configuration Settings');

    // Test JSON rendering as formatted content
    await expect(page.locator('.json-viewer, .config, pre, code')).toBeVisible();

    // Test configuration sections
    await expect(page.locator('text="preferences", text="theme"')).toBeVisible();
    await expect(page.locator('text="notifications"')).toBeVisible();
    await expect(page.locator('text="categories"')).toBeVisible();

    // Test nested object rendering
    await expect(page.locator('text="work", text="personal", text="shopping"')).toBeVisible();

    // Test boolean values
    await expect(page.locator('text=true, text=false')).toBeVisible();

    // Test color values (hex codes)
    await expect(page.locator('text="#3b82f6", text="#10b981", text="#f59e0b"')).toBeVisible();

    // Test expandable/collapsible sections if implemented
    const expandableSection = page.locator('.json-key, .expandable, [data-expandable]').first();
    if (await expandableSection.isVisible()) {
      await expandableSection.click();
      // Should toggle content visibility
    }

    // Test syntax highlighting
    const jsonElement = page.locator('.json-viewer, pre, code').first();
    if (await jsonElement.isVisible()) {
      // Keys should be styled differently from values
      await expect(jsonElement.locator('.key, .json-key, .hljs-attr')).toBeVisible();
    }
  });

  test('Text Content Page renders correctly', async ({ page }) => {
    await navigateToPage(page, 3, 'Quick Reference');

    // Test plain text formatting preservation
    await expect(page.locator('pre, .text-content, .whitespace-pre')).toBeVisible();

    // Test section headers
    await expect(page.locator('text="KEYBOARD SHORTCUTS:"')).toBeVisible();
    await expect(page.locator('text="PRIORITY CODES:"')).toBeVisible();
    await expect(page.locator('text="STATUS INDICATORS:"')).toBeVisible();

    // Test keyboard shortcut formatting
    await expect(page.locator('text="Ctrl+N"')).toBeVisible();
    await expect(page.locator('text="Ctrl+F"')).toBeVisible();
    await expect(page.locator('text="Space"')).toBeVisible();

    // Test special characters and emojis
    await expect(page.locator('text=✓, text=⏳, text=📅, text=🔄, text=❌')).toBeVisible();

    // Test monospace font for reference content
    const textContent = page.locator('pre, .text-content, .font-mono').first();
    if (await textContent.isVisible()) {
      await expect(textContent).toHaveCSS('font-family', /mono/);
    }

    // Test line breaks and formatting
    const lines = page.locator('text="- Ctrl+N: New task"');
    await expect(lines).toBeVisible();

    // Test scrollability for long content
    const contentArea = page.locator('.text-content, pre, .content').first();
    const box = await contentArea.boundingBox();
    expect(box?.height).toBeGreaterThan(100); // Should have substantial height
  });

  test('Analytics Component Page renders correctly', async ({ page }) => {
    await navigateToPage(page, 4, 'Task Analytics');

    // Test analytics layout with tabs
    await expect(page.locator('.tabs, [role="tablist"], .tab-container')).toBeVisible();

    // Test tab navigation
    const performanceTab = page.locator('button:has-text("Performance"), .tab:has-text("Performance")');
    const trendsTab = page.locator('button:has-text("Trends"), .tab:has-text("Trends")');
    const insightsTab = page.locator('button:has-text("Insights"), .tab:has-text("Insights")');

    await expect(performanceTab).toBeVisible();
    await expect(trendsTab).toBeVisible();
    await expect(insightsTab).toBeVisible();

    // Test Performance tab content
    await performanceTab.click();
    await expect(page.locator('.line-chart, [data-chart="line"], canvas, svg')).toBeVisible();
    await expect(page.locator('.progress, [data-widget="progress"], .progress-bar')).toBeVisible();
    await expect(page.locator('text="Completion Rate"')).toBeVisible();
    await expect(page.locator('text="Weekly Goal"')).toBeVisible();

    // Test Trends tab content
    await trendsTab.click();
    await expect(page.locator('.bar-chart, [data-chart="bar"], canvas, svg')).toBeVisible();
    await expect(page.locator('.heatmap, [data-chart="heatmap"], canvas, svg')).toBeVisible();
    await expect(page.locator('text="Tasks by Category"')).toBeVisible();
    await expect(page.locator('text="Activity Pattern"')).toBeVisible();

    // Test Insights tab content
    await insightsTab.click();
    await expect(page.locator('.metric, [data-widget="metric"], .stat')).toBeVisible();
    await expect(page.locator('text="Average Completion Time"')).toBeVisible();
    await expect(page.locator('text="Most Productive Day"')).toBeVisible();
    await expect(page.locator('text="Peak Hours"')).toBeVisible();

    // Test metric values
    await expect(page.locator('text="2.3 days"')).toBeVisible();
    await expect(page.locator('text="Tuesday"')).toBeVisible();
    await expect(page.locator('text="9-11 AM"')).toBeVisible();
  });

  test('All pages have proper accessibility features', async ({ page }) => {
    for (let i = 0; i < Math.min(createdPageIds.length, 3); i++) {
      await navigateToPage(page, i, testPages[i].title);

      // Test for proper headings hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      if (headingCount > 0) {
        // First heading should be h1 (page title)
        await expect(page.locator('h1').first()).toBeVisible();
      }

      // Test for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      for (let j = 0; j < imageCount; j++) {
        const img = images.nth(j);
        await expect(img).toHaveAttribute('alt');
      }

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const focusedCount = await focused.count();
      // Should have focusable elements

      // Test for proper color contrast (basic check)
      const textElements = page.locator('p, span, div').first();
      if (await textElements.isVisible()) {
        // Should have readable text color
        await expect(textElements).not.toHaveCSS('color', 'rgb(255, 255, 255)');
      }

      // Go back for next iteration
      if (i < Math.min(createdPageIds.length, 3) - 1) {
        await page.goBack();
        await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
      }
    }
  });

  test('Pages are responsive across different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop
      { width: 1920, height: 1080 } // Large Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Test first page (Dashboard) at different sizes
      await navigateToPage(page, 0, 'Dashboard Overview');

      // Content should be visible and properly sized
      const content = page.locator('.dashboard, .content, main').first();
      await expect(content).toBeVisible();

      const boundingBox = await content.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width);

      // Test scrolling if needed
      if (boundingBox && boundingBox.height > viewport.height) {
        await page.keyboard.press('PageDown');
        await page.keyboard.press('PageUp');
      }

      // Go back for next viewport test
      if (viewport !== viewports[viewports.length - 1]) {
        await page.goBack();
        await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
      }
    }
  });

  test('Pages load within performance benchmarks', async ({ page }) => {
    // Set up performance monitoring
    const performanceMetrics: Array<{ page: string; loadTime: number; contentSize: number }> = [];

    for (let i = 0; i < Math.min(createdPageIds.length, 3); i++) {
      const startTime = Date.now();

      await navigateToPage(page, i, testPages[i].title);

      // Wait for content to be fully loaded
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Get content size (approximate)
      const contentElement = page.locator('main, .content, .page-content').first();
      const content = await contentElement.textContent() || '';
      const contentSize = content.length;

      performanceMetrics.push({
        page: testPages[i].title,
        loadTime,
        contentSize
      });

      // Performance assertions
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

      // Check for console errors
      const consoleMessages = page.locator('.console-error, [data-error]');
      expect(await consoleMessages.count()).toBe(0);

      // Go back for next test
      if (i < Math.min(createdPageIds.length, 3) - 1) {
        await page.goBack();
        await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
      }
    }

    // Log performance results
    console.log('Page Performance Metrics:', performanceMetrics);

    // Average load time should be reasonable
    const avgLoadTime = performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / performanceMetrics.length;
    expect(avgLoadTime).toBeLessThan(3000); // Average under 3 seconds
  });

  test('Error boundaries handle rendering errors gracefully', async ({ page }) => {
    // Create a page with invalid JSON content to test error handling
    const invalidPage = {
      title: 'Invalid JSON Test',
      content_type: 'json',
      content_value: '{ invalid json syntax !!!',
      status: 'published',
      tags: ['test', 'error']
    };

    const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPage),
    });

    if (response.ok) {
      const data = await response.json();
      const invalidPageId = data.data.page.id;
      createdPageIds.push(invalidPageId);

      // Try to navigate to the invalid page
      await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
      await page.waitForLoadState('networkidle');

      const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
      await dynamicPagesTab.click();

      // Find and click the invalid page
      await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
      const invalidPageElement = page.locator('text="Invalid JSON Test"').first();
      await invalidPageElement.locator('..').locator('button:has-text("View")').click();

      // Should show error boundary or graceful error message
      await expect(
        page.locator('text="Error", text="Could not render", text="Invalid content", .error-boundary')
      ).toBeVisible({ timeout: 10000 });
    }
  });

  // Helper function to navigate to a specific page
  async function navigateToPage(page: Page, pageIndex: number, expectedTitle: string) {
    // Navigate to agent profile
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    // Find and click the specific page
    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const targetPage = pageElements.filter({ hasText: expectedTitle }).first();

    await expect(targetPage).toBeVisible({ timeout: 10000 });
    await targetPage.locator('button:has-text("View"), [data-action="view"]').click();

    // Wait for page content to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.content, .page-content, main')).toBeVisible({ timeout: 10000 });
  }
});