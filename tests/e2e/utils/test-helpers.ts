import { Page, expect } from '@playwright/test';

/**
 * Test Helper Utilities for Dynamic Pages E2E Tests
 *
 * Common functions and utilities used across multiple test files
 */

export interface DynamicPage {
  id: string;
  agent_id: string;
  title: string;
  page_type: string;
  content_type: string;
  content_value: string;
  content_metadata?: any;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface AgentPagesListResponse {
  pages: DynamicPage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  agent: {
    id: string;
    name: string;
    display_name: string;
  };
}

export class TestHelper {
  static readonly FRONTEND_URL = 'http://localhost:5173';
  static readonly BACKEND_URL = 'http://localhost:3000';
  static readonly TEST_AGENT_ID = 'personal-todos-agent';

  /**
   * Navigate to the agents page
   */
  static async navigateToAgents(page: Page): Promise<void> {
    await page.goto(this.FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Try multiple selectors for the agents link
    const agentsLink = page.locator(
      '[data-testid="agents-link"], a[href="/agents"], text=Agents, button:has-text("Agents")'
    ).first();

    await expect(agentsLink).toBeVisible({ timeout: 10000 });
    await agentsLink.click();
    await page.waitForURL('**/agents');
  }

  /**
   * Navigate to a specific agent profile
   */
  static async navigateToAgent(page: Page, agentId: string): Promise<void> {
    await this.navigateToAgents(page);

    // Wait for agents to load
    await page.waitForSelector(
      '.agent-card, .agent-item, [data-testid^="agent-"], .border:has(.agent)',
      { timeout: 15000 }
    );

    // Find and click the specific agent
    const agentSelector = `[data-testid="agent-${agentId}"], [data-agent-id="${agentId}"], text=${agentId}`;
    const agentElement = page.locator(agentSelector).first();

    await expect(agentElement).toBeVisible({ timeout: 10000 });
    await agentElement.click();
    await page.waitForURL(`**/agents/${agentId}`);
  }

  /**
   * Navigate to the Dynamic Pages tab of an agent
   */
  static async navigateToDynamicPagesTab(page: Page, agentId: string): Promise<void> {
    await this.navigateToAgent(page, agentId);

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator(
      'text="Dynamic Pages", [data-tab="pages"], button:has-text("Dynamic Pages")'
    );

    await expect(dynamicPagesTab).toBeVisible({ timeout: 10000 });
    await dynamicPagesTab.click();

    // Wait for pages to load or empty state to show
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );
  }

  /**
   * Create a test page via API
   */
  static async createTestPage(pageData: Partial<DynamicPage & { content_type: string; content_value: string; title: string }>): Promise<string> {
    const response = await fetch(`${this.BACKEND_URL}/api/agents/${this.TEST_AGENT_ID}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'published',
        tags: ['test'],
        ...pageData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test page: ${response.status}`);
    }

    const data = await response.json() as ApiResponse<{ page: DynamicPage }>;
    if (!data.success || !data.data.page) {
      throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
    }

    return data.data.page.id;
  }

  /**
   * Delete a test page via API
   */
  static async deleteTestPage(pageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/agents/${this.TEST_AGENT_ID}/pages/${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        console.warn(`Failed to delete test page ${pageId}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Error deleting test page ${pageId}:`, error);
    }
  }

  /**
   * Clean up multiple test pages
   */
  static async cleanupTestPages(pageIds: string[]): Promise<void> {
    const promises = pageIds.map(id => this.deleteTestPage(id));
    await Promise.all(promises);
  }

  /**
   * Wait for page to load and be interactive
   */
  static async waitForPageReady(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('body', { timeout });

    // Wait for any loading indicators to disappear
    const loadingIndicators = page.locator('.loading, .spinner, .animate-spin, [data-loading]');
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators).not.toBeVisible({ timeout });
    }
  }

  /**
   * Take a screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `./test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * Check for console errors
   */
  static async checkForConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    return errors;
  }

  /**
   * Verify page accessibility basics
   */
  static async checkBasicAccessibility(page: Page): Promise<void> {
    // Check for page title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for main landmark or heading
    const mainContent = page.locator('main, [role="main"], h1');
    await expect(mainContent).toBeVisible();

    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    if (headingCount > 0) {
      const firstHeading = headings.first();
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
      expect(['h1', 'h2']).toContain(tagName);
    }
  }

  /**
   * Test responsive design at different viewports
   */
  static async testResponsiveDesign(page: Page, testCallback: (viewport: { width: number; height: number }) => Promise<void>): Promise<void> {
    const viewports = [
      { width: 320, height: 568 },   // Mobile portrait
      { width: 568, height: 320 },   // Mobile landscape
      { width: 768, height: 1024 },  // Tablet portrait
      { width: 1024, height: 768 },  // Tablet landscape
      { width: 1280, height: 720 },  // Desktop
      { width: 1920, height: 1080 }, // Large desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await this.waitForPageReady(page);
      await testCallback(viewport);
    }
  }

  /**
   * Measure page load performance
   */
  static async measurePageLoadTime(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  /**
   * Verify API response structure
   */
  static verifyApiResponse<T>(response: ApiResponse<T>): void {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('timestamp');
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    if (response.success) {
      expect(response).toHaveProperty('data');
    } else {
      expect(response).toHaveProperty('error');
    }
  }

  /**
   * Verify dynamic page structure
   */
  static verifyDynamicPageStructure(page: DynamicPage): void {
    expect(page).toHaveProperty('id');
    expect(page).toHaveProperty('agent_id');
    expect(page).toHaveProperty('title');
    expect(page).toHaveProperty('page_type');
    expect(page).toHaveProperty('content_type');
    expect(page).toHaveProperty('content_value');
    expect(page).toHaveProperty('status');
    expect(page).toHaveProperty('tags');
    expect(page).toHaveProperty('created_at');
    expect(page).toHaveProperty('updated_at');
    expect(page).toHaveProperty('version');

    expect(typeof page.id).toBe('string');
    expect(typeof page.agent_id).toBe('string');
    expect(typeof page.title).toBe('string');
    expect(['published', 'draft', 'archived']).toContain(page.status);
    expect(['text', 'markdown', 'json', 'component']).toContain(page.content_type);
    expect(Array.isArray(page.tags)).toBe(true);
    expect(typeof page.version).toBe('number');
  }

  /**
   * Generate random test data
   */
  static generateTestPageData(contentType: 'text' | 'markdown' | 'json' | 'component' = 'text'): Omit<DynamicPage, 'id' | 'agent_id' | 'created_at' | 'updated_at'> {
    const timestamp = Date.now();
    const baseData = {
      title: `Test Page ${timestamp}`,
      page_type: 'dynamic',
      content_type: contentType,
      status: 'published' as const,
      tags: ['test', 'auto-generated'],
      version: 1
    };

    switch (contentType) {
      case 'text':
        return {
          ...baseData,
          content_value: `This is test text content generated at ${new Date().toISOString()}`,
        };

      case 'markdown':
        return {
          ...baseData,
          content_value: `# Test Markdown Page\n\nGenerated at ${new Date().toISOString()}\n\n## Features\n- Test item 1\n- Test item 2`,
        };

      case 'json':
        return {
          ...baseData,
          content_value: JSON.stringify({
            testData: true,
            timestamp,
            config: { setting1: true, setting2: 'test' }
          }),
        };

      case 'component':
        return {
          ...baseData,
          content_value: JSON.stringify({
            type: 'test-component',
            props: { title: 'Test Component', timestamp },
            widgets: ['test-widget-1', 'test-widget-2']
          }),
        };
    }
  }
}

/**
 * Page Object Model for Dynamic Pages
 */
export class DynamicPagesPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await TestHelper.navigateToDynamicPagesTab(this.page, TestHelper.TEST_AGENT_ID);
  }

  async getPageElements(): Promise<any> {
    return this.page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
  }

  async getPageCount(): Promise<number> {
    const elements = await this.getPageElements();
    return elements.count();
  }

  async clickViewButton(pageIndex: number): Promise<void> {
    const pageElements = await this.getPageElements();
    const viewButton = pageElements.nth(pageIndex).locator('button:has-text("View"), [data-action="view"]');
    await viewButton.click();
  }

  async clickEditButton(pageIndex: number): Promise<void> {
    const pageElements = await this.getPageElements();
    const editButton = pageElements.nth(pageIndex).locator('button:has-text("Edit"), [data-action="edit"]');
    await editButton.click();
  }

  async clickCreatePageButton(): Promise<void> {
    const createButton = this.page.locator('button:has-text("Create"), button:has-text("Create Your First Page")');
    await createButton.click();
  }

  async hasEmptyState(): Promise<boolean> {
    const emptyState = this.page.locator('text="No Dynamic Pages Yet", text="Create Your First Page"');
    return emptyState.isVisible();
  }

  async getPageByTitle(title: string): Promise<any> {
    return this.page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)').filter({ hasText: title });
  }

  async verifyPageMetadata(pageIndex: number): Promise<void> {
    const pageElements = await this.getPageElements();
    const pageElement = pageElements.nth(pageIndex);

    // Verify status badge
    await expect(pageElement.locator('.bg-green-100, .bg-yellow-100, .bg-gray-100, [data-status]')).toBeVisible();

    // Verify page type badge
    await expect(pageElement.locator('.bg-blue-100, [data-page-type]')).toBeVisible();

    // Verify timestamps
    const hasTimestamp = await pageElement.locator('text=/Created|Updated/').count() > 0;
    expect(hasTimestamp).toBe(true);
  }
}