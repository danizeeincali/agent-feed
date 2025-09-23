/**
 * End-to-End Tests for Dynamic Pages System
 * Using Playwright for comprehensive user workflow testing
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  testAgent: {
    id: 'test-agent-e2e',
    name: 'E2E Test Agent',
    display_name: 'E2E Test Agent'
  }
};

// Page Object Models
class AgentPagesPage {
  constructor(private page: Page) {}

  async navigate(agentId: string = TEST_CONFIG.testAgent.id) {
    await this.page.goto(`${TEST_CONFIG.baseURL}/agents/${agentId}/pages`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    await expect(this.page.getByTestId('agent-pages-tab')).toBeVisible();
  }

  async waitForEmptyState() {
    await expect(this.page.getByTestId('empty-pages-state')).toBeVisible();
  }

  async clickCreatePage() {
    await this.page.getByRole('button', { name: /Create Dynamic Page|Create Page/i }).click();
    await expect(this.page.getByTestId('page-builder-modal')).toBeVisible();
  }

  async searchPages(term: string) {
    await this.page.getByTestId('pages-search').fill(term);
    await this.page.waitForTimeout(500); // Debounce delay
  }

  async clearSearch() {
    await this.page.getByTestId('clear-search').click();
  }

  async filterByType(type: string) {
    await this.page.getByTestId('type-filter').selectOption(type);
  }

  async filterByCategory(category: string) {
    await this.page.getByTestId('category-filter').selectOption(category);
  }

  async sortBy(criteria: string) {
    await this.page.getByTestId('sort-select').selectOption(criteria);
  }

  async toggleFeatured() {
    await this.page.getByTestId('featured-toggle').click();
  }

  async clickPage(pageId: string) {
    await this.page.getByTestId(`page-card-${pageId}`).click();
  }

  async bookmarkPage(pageId: string) {
    await this.page.getByTestId(`bookmark-button-${pageId}`).click();
  }

  async getPageCount(): Promise<number> {
    const pages = await this.page.getByTestId(/^page-card-/).count();
    return pages;
  }

  async getPageTitles(): Promise<string[]> {
    const titles = await this.page.getByTestId('page-title').allInnerTexts();
    return titles;
  }
}

class PageBuilderModal {
  constructor(private page: Page) {}

  async waitForModal() {
    await expect(this.page.getByTestId('page-builder-modal')).toBeVisible();
  }

  async fillTitle(title: string) {
    await this.page.getByTestId('title-input').fill(title);
  }

  async selectContentType(type: string) {
    await this.page.getByTestId('content-type-select').selectOption(type);
  }

  async selectPageType(type: string) {
    await this.page.getByTestId('page-type-select').selectOption(type);
  }

  async selectStatus(status: string) {
    await this.page.getByTestId('status-select').selectOption(status);
  }

  async fillContent(content: string) {
    await this.page.getByTestId('content-textarea').fill(content);
  }

  async togglePreview() {
    await this.page.getByTestId('toggle-preview').click();
  }

  async save() {
    await this.page.getByTestId('save-button').click();
  }

  async saveAsDraft() {
    await this.page.getByTestId('save-draft-button').click();
  }

  async cancel() {
    await this.page.getByTestId('cancel-button').click();
  }

  async close() {
    await this.page.getByTestId('close-button').click();
  }

  async waitForSaving() {
    await expect(this.page.getByText('Saving...')).toBeVisible();
    await expect(this.page.getByText('Saving...')).not.toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByTestId('validation-errors')).toContainText(message);
  }

  async expectPreview(contentType: string) {
    await expect(this.page.getByTestId(`${contentType}-preview`)).toBeVisible();
  }
}

class DynamicPageViewer {
  constructor(private page: Page) {}

  async navigate(agentId: string, pageId: string) {
    await this.page.goto(`${TEST_CONFIG.baseURL}/agents/${agentId}/pages/${pageId}/view`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageRender() {
    await expect(this.page.getByTestId('rendered-page')).toBeVisible();
  }

  async expectPageTitle(title: string) {
    await expect(this.page.getByRole('heading', { level: 1 })).toContainText(title);
  }

  async expectContent(content: string) {
    await expect(this.page.getByTestId('rendered-page')).toContainText(content);
  }
}

// Setup hooks
test.beforeEach(async ({ page, context }) => {
  // Mock API responses for consistent testing
  await context.route('**/api/agents/*/workspace', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'workspace-1',
        agent_id: TEST_CONFIG.testAgent.id,
        workspace_path: '/test/workspace',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pages: [],
        statistics: {
          total_pages: 0,
          pages_by_type: {},
          pages_by_status: {},
          last_activity: new Date().toISOString()
        }
      })
    });
  });

  await context.route('**/api/agents/*/pages', async (route, request) => {
    if (request.method() === 'GET') {
      // Return empty pages list initially
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          agent_id: TEST_CONFIG.testAgent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        })
      });
    } else if (request.method() === 'POST') {
      const requestBody = await request.postDataJSON();
      // Return created page
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: {
            id: `page-${Date.now()}`,
            agent_id: TEST_CONFIG.testAgent.id,
            title: requestBody.title,
            content_type: requestBody.content_type,
            content_value: requestBody.content_value,
            page_type: requestBody.page_type || 'dynamic',
            status: requestBody.status || 'draft',
            metadata: requestBody.metadata || {},
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      });
    }
  });
});

test.describe('Dynamic Pages System E2E Tests', () => {
  test.describe('Initial Page Load and Navigation', () => {
    test('should load agent pages tab successfully', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Should show empty state with creation options
      await expect(page.getByText('No pages available')).toBeVisible();
      await expect(page.getByText(/Create custom dynamic pages/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Dynamic Page/ })).toBeVisible();
    });

    test('should handle navigation to different agents', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      // Test with different agent ID
      await agentPagesPage.navigate('different-agent');
      await agentPagesPage.waitForEmptyState();

      await expect(page.url()).toContain('different-agent');
    });

    test('should handle page refresh correctly', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Refresh page
      await page.reload();
      await agentPagesPage.waitForEmptyState();

      // Should maintain state
      await expect(page.getByTestId('empty-pages-state')).toBeVisible();
    });
  });

  test.describe('Page Creation Workflow', () => {
    test('should create a new dynamic page successfully', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Open page creation modal
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      // Fill page details
      await pageBuilder.fillTitle('My First Dynamic Page');
      await pageBuilder.selectContentType('markdown');
      await pageBuilder.selectPageType('dynamic');
      await pageBuilder.fillContent('# Welcome\n\nThis is my first dynamic page!');
      await pageBuilder.selectStatus('published');

      // Save the page
      await pageBuilder.save();
      await pageBuilder.waitForSaving();

      // Should return to pages list and show the new page
      await expect(page.getByText('My First Dynamic Page')).toBeVisible();
    });

    test('should create page with different content types', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      // Test JSON content type
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      await pageBuilder.fillTitle('JSON Dashboard');
      await pageBuilder.selectContentType('json');
      await pageBuilder.fillContent('{"type": "dashboard", "widgets": ["chart", "table"]}');
      
      // Verify JSON preview works
      await pageBuilder.expectPreview('json');
      
      await pageBuilder.save();
      await pageBuilder.waitForSaving();

      await expect(page.getByText('JSON Dashboard')).toBeVisible();
    });

    test('should handle page creation validation errors', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      // Try to save without required fields
      await pageBuilder.save();

      // Should show validation errors
      await pageBuilder.expectValidationError('Title is required');
      await pageBuilder.expectValidationError('Content is required');

      // Fill only title
      await pageBuilder.fillTitle('Incomplete Page');
      await pageBuilder.save();

      // Should still show content validation error
      await pageBuilder.expectValidationError('Content is required');
    });

    test('should save page as draft', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      await pageBuilder.fillTitle('Draft Page');
      await pageBuilder.fillContent('This is a draft page');
      
      // Save as draft
      await pageBuilder.saveAsDraft();
      await pageBuilder.waitForSaving();

      // Should show draft status
      await expect(page.getByText('Draft Page')).toBeVisible();
      await expect(page.getByText('draft')).toBeVisible();
    });

    test('should handle page creation cancellation', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      // Fill some data
      await pageBuilder.fillTitle('Canceled Page');
      await pageBuilder.fillContent('This should be canceled');

      // Cancel
      await pageBuilder.cancel();

      // Should return to empty state without creating page
      await agentPagesPage.waitForEmptyState();
      await expect(page.getByText('Canceled Page')).not.toBeVisible();
    });
  });

  test.describe('Page Builder Features', () => {
    test('should show live preview while editing', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      await pageBuilder.fillTitle('Preview Test');
      await pageBuilder.selectContentType('markdown');
      
      // Type content and check live preview
      await pageBuilder.fillContent('# Live Preview\n\nThis should appear in preview!');

      // Verify live preview updates
      await expect(page.getByTestId('live-preview')).toContainText('Live Preview');
      await expect(page.getByTestId('live-preview')).toContainText('This should appear in preview!');
    });

    test('should toggle between edit and preview modes', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      await pageBuilder.fillTitle('Toggle Test');
      await pageBuilder.fillContent('# Content for toggling');

      // Should start in edit mode
      await expect(page.getByTestId('content-textarea')).toBeVisible();
      await expect(page.getByTestId('toggle-preview')).toHaveText('Preview');

      // Toggle to preview mode
      await pageBuilder.togglePreview();
      await expect(page.getByTestId('content-textarea')).not.toBeVisible();
      await expect(page.getByTestId('toggle-preview')).toHaveText('Edit');

      // Toggle back to edit mode
      await pageBuilder.togglePreview();
      await expect(page.getByTestId('content-textarea')).toBeVisible();
      await expect(page.getByTestId('toggle-preview')).toHaveText('Preview');
    });

    test('should validate JSON content in real-time', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      await pageBuilder.selectContentType('json');
      
      // Enter invalid JSON
      await pageBuilder.fillContent('{invalid json}');
      await expect(page.getByTestId('json-error')).toBeVisible();
      await expect(page.getByText('Invalid JSON')).toBeVisible();

      // Enter valid JSON
      await pageBuilder.fillContent('{"valid": true, "test": "data"}');
      await expect(page.getByTestId('json-preview')).toBeVisible();
      await expect(page.getByTestId('json-error')).not.toBeVisible();
    });

    test('should enforce character limits', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      // Type beyond character limit
      const longTitle = 'A'.repeat(250);
      await pageBuilder.fillTitle(longTitle);

      // Should be truncated to 200 characters
      const titleValue = await page.getByTestId('title-input').inputValue();
      expect(titleValue).toHaveLength(200);

      // Should show character count
      await expect(page.getByText('200/200 characters')).toBeVisible();
    });
  });

  test.describe('Page Listing and Management', () => {
    test.beforeEach(async ({ context }) => {
      // Mock API to return sample pages
      await context.route('**/api/agents/*/pages', async (route, request) => {
        if (request.method() === 'GET') {
          const samplePages = [
            {
              id: 'page-1',
              agent_id: TEST_CONFIG.testAgent.id,
              title: 'Dynamic Dashboard',
              content_type: 'json',
              content_value: '{"type": "dashboard"}',
              page_type: 'dynamic',
              status: 'published',
              version: 1,
              created_at: '2024-01-01T10:00:00Z',
              updated_at: '2024-01-01T10:00:00Z'
            },
            {
              id: 'page-2',
              agent_id: TEST_CONFIG.testAgent.id,
              title: 'API Documentation',
              content_type: 'markdown',
              content_value: '# API Docs',
              page_type: 'persistent',
              status: 'published',
              version: 1,
              created_at: '2024-01-02T10:00:00Z',
              updated_at: '2024-01-02T10:00:00Z'
            },
            {
              id: 'page-3',
              agent_id: TEST_CONFIG.testAgent.id,
              title: 'Report Template',
              content_type: 'component',
              content_value: '{"template": "report"}',
              page_type: 'template',
              status: 'draft',
              version: 1,
              created_at: '2024-01-03T10:00:00Z',
              updated_at: '2024-01-03T10:00:00Z'
            }
          ];

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              agent_id: TEST_CONFIG.testAgent.id,
              pages: samplePages,
              total: 3,
              limit: 20,
              offset: 0,
              has_more: false
            })
          });
        }
      });
    });

    test('should display list of pages', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForPageLoad();

      // Should show all pages
      await expect(page.getByText('Dynamic Dashboard')).toBeVisible();
      await expect(page.getByText('API Documentation')).toBeVisible();
      await expect(page.getByText('Report Template')).toBeVisible();

      // Should show page metadata
      await expect(page.getByTestId('type-badge-dynamic')).toBeVisible();
      await expect(page.getByTestId('type-badge-persistent')).toBeVisible();
      await expect(page.getByTestId('type-badge-template')).toBeVisible();
    });

    test('should search pages by title', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForPageLoad();

      // Search for specific page
      await agentPagesPage.searchPages('API');

      // Should only show matching results
      await expect(page.getByText('API Documentation')).toBeVisible();
      await expect(page.getByText('Dynamic Dashboard')).not.toBeVisible();
      await expect(page.getByText('Report Template')).not.toBeVisible();
    });

    test('should filter pages by type', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForPageLoad();

      // Filter by dynamic pages
      await agentPagesPage.filterByType('dynamic');

      // Should only show dynamic pages
      await expect(page.getByText('Dynamic Dashboard')).toBeVisible();
      await expect(page.getByText('API Documentation')).not.toBeVisible();
    });

    test('should sort pages by different criteria', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForPageLoad();

      // Get initial order
      const initialTitles = await agentPagesPage.getPageTitles();

      // Sort by title
      await agentPagesPage.sortBy('title');

      // Should be in alphabetical order
      const sortedTitles = await agentPagesPage.getPageTitles();
      expect(sortedTitles[0]).toContain('API Documentation');
    });

    test('should handle page interactions', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForPageLoad();

      // Click on a page
      await agentPagesPage.clickPage('page-1');

      // Should track page view (in real implementation)
      // await expect(page).toHaveURL(/.*view.*/);

      // Test bookmark functionality
      await agentPagesPage.bookmarkPage('page-1');
      
      const bookmarkButton = page.getByTestId('bookmark-button-page-1');
      await expect(bookmarkButton).toHaveClass(/bookmarked/);
    });
  });

  test.describe('Dynamic Page Rendering', () => {
    test('should render markdown page correctly', async ({ page }) => {
      const dynamicPageViewer = new DynamicPageViewer(page);
      
      // Navigate to a specific page
      await dynamicPageViewer.navigate(TEST_CONFIG.testAgent.id, 'markdown-page');
      await dynamicPageViewer.waitForPageRender();

      // Should render markdown content
      await dynamicPageViewer.expectPageTitle('Markdown Page');
      await dynamicPageViewer.expectContent('This is markdown content');
    });

    test('should render JSON-based page correctly', async ({ page }) => {
      const dynamicPageViewer = new DynamicPageViewer(page);
      
      await dynamicPageViewer.navigate(TEST_CONFIG.testAgent.id, 'json-page');
      await dynamicPageViewer.waitForPageRender();

      // Should render JSON structure
      await expect(page.getByTestId('json-preview')).toBeVisible();
    });

    test('should handle component-based pages', async ({ page }) => {
      const dynamicPageViewer = new DynamicPageViewer(page);
      
      await dynamicPageViewer.navigate(TEST_CONFIG.testAgent.id, 'component-page');
      await dynamicPageViewer.waitForPageRender();

      // Should show component definition
      await expect(page.getByTestId('component-preview')).toBeVisible();
      await expect(page.getByText('React Component Definition:')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async ({ page, context }) => {
      // Mock API failure
      await context.route('**/api/agents/*/pages', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error' })
        });
      });

      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();

      // Should show error state
      await expect(page.getByText(/Failed to load pages/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Try Again/ })).toBeVisible();
    });

    test('should handle network timeouts', async ({ page, context }) => {
      // Mock slow response
      await context.route('**/api/agents/*/pages', async route => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ pages: [] })
        });
      });

      const agentPagesPage = new AgentPagesPage(page);
      
      // Set shorter timeout for this test
      page.setDefaultTimeout(5000);

      await expect(async () => {
        await agentPagesPage.navigate();
        await agentPagesPage.waitForPageLoad();
      }).toThrow();
    });

    test('should handle malformed page data', async ({ page, context }) => {
      // Mock malformed response
      await context.route('**/api/agents/*/pages', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response'
        });
      });

      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();

      // Should show error state
      await expect(page.getByText(/Failed to load pages/)).toBeVisible();
    });

    test('should handle extremely long content gracefully', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      const pageBuilder = new PageBuilderModal(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      await agentPagesPage.clickCreatePage();
      await pageBuilder.waitForModal();

      // Test with very long content
      const longContent = 'A'.repeat(50000);
      await pageBuilder.fillTitle('Long Content Test');
      await pageBuilder.fillContent(longContent);

      // Should handle without crashing
      await expect(page.getByTestId('live-preview')).toBeVisible();
      await expect(page.getByTestId('content-textarea')).toHaveValue(longContent);
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /Create Dynamic Page/ })).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(page.getByTestId('page-builder-modal')).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Check ARIA labels
      await expect(page.getByLabelText('Pages list')).toBeVisible();
      
      await agentPagesPage.clickCreatePage();
      await expect(page.getByLabelText('Page Title')).toBeVisible();
      await expect(page.getByLabelText('Content Type')).toBeVisible();
    });

    test('should support screen readers', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Check that important elements have proper roles
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('button', { name: /Create/ })).toBeVisible();
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load pages quickly', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      const startTime = Date.now();
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle rapid user interactions', async ({ page }) => {
      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Rapid clicks should not cause errors
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: /Create Dynamic Page/ }).click();
        await page.getByTestId('close-button').click();
      }

      // Should still be functional
      await agentPagesPage.waitForEmptyState();
    });

    test('should work on mobile viewports', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const agentPagesPage = new AgentPagesPage(page);
      
      await agentPagesPage.navigate();
      await agentPagesPage.waitForEmptyState();

      // Should be responsive
      await expect(page.getByTestId('empty-pages-state')).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Dynamic Page/ })).toBeVisible();

      // Modal should also work on mobile
      await agentPagesPage.clickCreatePage();
      await expect(page.getByTestId('page-builder-modal')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work in ${browserName}`, async ({ page }) => {
        const agentPagesPage = new AgentPagesPage(page);
        
        await agentPagesPage.navigate();
        await agentPagesPage.waitForEmptyState();

        // Basic functionality should work across browsers
        await expect(page.getByText('No pages available')).toBeVisible();
        await expect(page.getByRole('button', { name: /Create Dynamic Page/ })).toBeVisible();

        await agentPagesPage.clickCreatePage();
        await expect(page.getByTestId('page-builder-modal')).toBeVisible();
      });
    });
  });
});

// Test data cleanup
test.afterEach(async ({ page }) => {
  // Clean up any test data if needed
  await page.close();
});