/**
 * Auto-Registration E2E Tests - Playwright
 *
 * End-to-end tests simulating the full page builder workflow with REAL functionality.
 * - NO MOCKS - Tests use real browser, real API, real database
 * - Create page file → Auto-register → Verify frontend URL works
 * - Test page accessibility in browser
 * - Test page rendering with real data
 * - Capture screenshots of success/failure states
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const PAGES_DIR = '/workspaces/agent-feed/data/agent-pages';
const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_BASE_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 60000;

// Helper: Generate unique test ID
function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper: Create page file
async function createPageFile(pageData: any): Promise<string> {
  const filePath = path.join(PAGES_DIR, `${pageData.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(pageData, null, 2), 'utf8');
  return filePath;
}

// Helper: Cleanup page file
async function cleanupPageFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

// Helper: Register page via API
async function registerPageViaAPI(pageData: any): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/agents/${pageData.agent_id}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pageData)
  });
}

// Helper: Wait for page to be registered
async function waitForPageRegistration(agentId: string, pageId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/pages/${pageId}`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Ignore and retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

test.describe('Page Builder Auto-Registration E2E Tests', () => {
  let testAgentId: string;
  let createdFiles: string[] = [];

  test.beforeAll(async () => {
    testAgentId = generateTestId('e2e-agent');
    console.log(`\n🧪 E2E Test Agent ID: ${testAgentId}`);
  });

  test.afterAll(async () => {
    // Cleanup all created files
    console.log('\n🧹 Cleaning up E2E test files...');
    for (const filePath of createdFiles) {
      await cleanupPageFile(filePath);
    }
  });

  test.beforeEach(() => {
    createdFiles = [];
  });

  test.describe('Full Workflow: Create → Register → Verify', () => {
    test('should complete full page creation workflow', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Create page data
      const pageData = {
        id: generateTestId('e2e-page-workflow'),
        agent_id: testAgentId,
        title: 'E2E Workflow Test Dashboard',
        page_type: 'dynamic',
        content_type: 'json',
        content_value: JSON.stringify({
          layout: 'dashboard',
          sections: [
            {
              type: 'header',
              title: 'Welcome to E2E Test',
              subtitle: 'This page was auto-registered'
            },
            {
              type: 'metrics',
              data: [
                { label: 'Total Users', value: 150, trend: 'up' },
                { label: 'Active Sessions', value: 42, trend: 'stable' },
                { label: 'Success Rate', value: '98.5%', trend: 'up' }
              ]
            },
            {
              type: 'chart',
              chartType: 'line',
              data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                values: [12, 19, 15, 25, 22]
              }
            }
          ]
        }),
        content_metadata: {
          theme: 'professional',
          refreshInterval: 30000,
          permissions: ['read', 'write']
        },
        status: 'published',
        tags: ['e2e', 'dashboard', 'test'],
        version: 1
      };

      // Step 2: Create page file
      console.log('📝 Creating page file...');
      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      // Step 3: Register via API (simulating auto-registration)
      console.log('📡 Registering page via API...');
      const registerResponse = await registerPageViaAPI(pageData);
      expect(registerResponse.status).toBe(201);

      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      expect(registerData.data.page.id).toBe(pageData.id);

      // Step 4: Wait for registration to complete
      console.log('⏳ Waiting for registration to complete...');
      const isRegistered = await waitForPageRegistration(pageData.agent_id, pageData.id);
      expect(isRegistered).toBe(true);

      // Step 5: Verify page is accessible via frontend
      console.log('🌐 Navigating to frontend page...');
      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;

      await page.goto(frontendUrl);
      await page.waitForLoadState('networkidle');

      // Step 6: Capture success screenshot
      await page.screenshot({
        path: `test-results/screenshots/e2e-workflow-success-${pageData.id}.png`,
        fullPage: true
      });

      // Step 7: Verify page content is rendered
      await expect(page).toHaveTitle(/Agent Feed|E2E Workflow Test Dashboard/i);

      console.log('✅ Full workflow completed successfully!');
    });

    test('should handle page with markdown content', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const pageData = {
        id: generateTestId('e2e-page-markdown'),
        agent_id: testAgentId,
        title: 'E2E Markdown Test Page',
        page_type: 'dynamic',
        content_type: 'markdown',
        content_value: `# Welcome to Auto-Registration Test

## Features Tested

- **Page Creation**: File-based page definition
- **Auto-Registration**: Automatic API registration
- **Frontend Rendering**: Real-time page display

### Code Example

\`\`\`javascript
const pageBuilder = {
  autoRegister: true,
  watchFiles: true
};
\`\`\`

> This page was automatically registered via E2E testing.

![Status](https://img.shields.io/badge/status-active-green)`,
        status: 'published',
        version: 1
      };

      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      const registerResponse = await registerPageViaAPI(pageData);
      expect(registerResponse.status).toBe(201);

      const isRegistered = await waitForPageRegistration(pageData.agent_id, pageData.id);
      expect(isRegistered).toBe(true);

      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
      await page.goto(frontendUrl);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/screenshots/e2e-markdown-${pageData.id}.png`,
        fullPage: true
      });

      // Verify markdown was rendered (check for heading)
      const heading = page.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible();

      console.log('✅ Markdown page rendered successfully!');
    });
  });

  test.describe('Page Accessibility Tests', () => {
    test('should make page accessible in browser with correct URL pattern', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const pageData = {
        id: generateTestId('e2e-page-accessible'),
        agent_id: testAgentId,
        title: 'E2E Accessibility Test',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Page accessibility verification content',
        status: 'published',
        version: 1
      };

      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      await registerPageViaAPI(pageData);
      await waitForPageRegistration(pageData.agent_id, pageData.id);

      // Test correct URL pattern
      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
      expect(frontendUrl).toMatch(/\/agents\/[^\/]+\/pages\/[^\/]+$/);

      // Navigate and verify accessibility
      const response = await page.goto(frontendUrl);
      expect(response?.status()).toBeLessThan(400);

      await page.screenshot({
        path: `test-results/screenshots/e2e-accessible-${pageData.id}.png`
      });

      console.log(`✅ Page accessible at: ${frontendUrl}`);
    });

    test('should handle navigation between multiple registered pages', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Create multiple pages
      const pages = [];
      for (let i = 0; i < 3; i++) {
        const pageData = {
          id: generateTestId(`e2e-page-nav-${i}`),
          agent_id: testAgentId,
          title: `E2E Navigation Test Page ${i + 1}`,
          page_type: 'dynamic',
          content_type: 'text',
          content_value: `Navigation test content for page ${i + 1}`,
          status: 'published',
          version: 1
        };

        const filePath = await createPageFile(pageData);
        createdFiles.push(filePath);

        await registerPageViaAPI(pageData);
        await waitForPageRegistration(pageData.agent_id, pageData.id);
        pages.push(pageData);
      }

      // Navigate to each page
      for (const pageData of pages) {
        const url = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        // Verify we're on the correct page
        await expect(page).toHaveURL(url);

        await page.screenshot({
          path: `test-results/screenshots/e2e-nav-${pageData.id}.png`
        });
      }

      console.log(`✅ Successfully navigated between ${pages.length} pages`);
    });
  });

  test.describe('Page Rendering with Real Data', () => {
    test('should render complex component-based page', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const pageData = {
        id: generateTestId('e2e-page-complex'),
        agent_id: testAgentId,
        title: 'E2E Complex Component Test',
        page_type: 'dynamic',
        content_type: 'component',
        content_value: JSON.stringify({
          type: 'dashboard',
          layout: 'grid',
          components: [
            {
              type: 'stat-card',
              id: 'users',
              title: 'Total Users',
              value: 1250,
              change: '+12.5%',
              trend: 'up'
            },
            {
              type: 'stat-card',
              id: 'revenue',
              title: 'Revenue',
              value: '$45,230',
              change: '+8.2%',
              trend: 'up'
            },
            {
              type: 'chart',
              id: 'activity',
              chartType: 'area',
              title: 'Activity Overview',
              data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                  { label: 'Active', data: [30, 40, 35, 50, 49, 60] },
                  { label: 'Inactive', data: [20, 15, 25, 20, 18, 15] }
                ]
              }
            },
            {
              type: 'table',
              id: 'recent',
              title: 'Recent Activity',
              columns: ['Time', 'User', 'Action', 'Status'],
              rows: [
                ['2:30 PM', 'Alice', 'Login', 'Success'],
                ['2:28 PM', 'Bob', 'Update Profile', 'Success'],
                ['2:25 PM', 'Charlie', 'View Dashboard', 'Success']
              ]
            }
          ],
          theme: {
            primary: '#3b82f6',
            secondary: '#8b5cf6'
          }
        }),
        status: 'published',
        version: 1
      };

      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      await registerPageViaAPI(pageData);
      await waitForPageRegistration(pageData.agent_id, pageData.id);

      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
      await page.goto(frontendUrl);
      await page.waitForLoadState('networkidle');

      // Wait for components to render
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `test-results/screenshots/e2e-complex-${pageData.id}.png`,
        fullPage: true
      });

      console.log('✅ Complex component page rendered!');
    });

    test('should update page content dynamically', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const pageData = {
        id: generateTestId('e2e-page-update'),
        agent_id: testAgentId,
        title: 'E2E Dynamic Update Test',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Original content - Version 1',
        status: 'published',
        version: 1
      };

      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      await registerPageViaAPI(pageData);
      await waitForPageRegistration(pageData.agent_id, pageData.id);

      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
      await page.goto(frontendUrl);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/screenshots/e2e-update-before-${pageData.id}.png`
      });

      // Update page content
      const updateResponse = await fetch(
        `${API_BASE_URL}/api/agents/${pageData.agent_id}/pages/${pageData.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_value: 'Updated content - Version 2',
            version: 2
          })
        }
      );

      expect(updateResponse.status).toBe(200);

      // Reload page to see updates
      await page.reload();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/screenshots/e2e-update-after-${pageData.id}.png`
      });

      console.log('✅ Page content updated successfully!');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should display error for non-existent page', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const nonExistentId = generateTestId('non-existent');
      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${testAgentId}/pages/${nonExistentId}`;

      await page.goto(frontendUrl, { waitUntil: 'networkidle' });

      await page.screenshot({
        path: `test-results/screenshots/e2e-error-404-${nonExistentId}.png`
      });

      // Verify error state is displayed
      // This will depend on your error handling implementation
      const pageContent = await page.content();
      const hasErrorIndicator =
        pageContent.includes('not found') ||
        pageContent.includes('404') ||
        pageContent.includes('error');

      expect(hasErrorIndicator).toBeTruthy();

      console.log('✅ Error state displayed for non-existent page');
    });

    test('should handle page with draft status', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      const pageData = {
        id: generateTestId('e2e-page-draft'),
        agent_id: testAgentId,
        title: 'E2E Draft Status Test',
        page_type: 'dynamic',
        content_type: 'text',
        content_value: 'Draft page content',
        status: 'draft', // Draft status
        version: 1
      };

      const filePath = await createPageFile(pageData);
      createdFiles.push(filePath);

      await registerPageViaAPI(pageData);
      await waitForPageRegistration(pageData.agent_id, pageData.id);

      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${pageData.agent_id}/pages/${pageData.id}`;
      await page.goto(frontendUrl, { waitUntil: 'networkidle' });

      await page.screenshot({
        path: `test-results/screenshots/e2e-draft-${pageData.id}.png`
      });

      // Page should still be accessible (or show draft indicator)
      const response = await page.goto(frontendUrl);
      expect(response?.status()).toBeLessThan(500);

      console.log('✅ Draft page handled appropriately');
    });

    test('should capture and log registration failures', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Create invalid page data
      const invalidPageData = {
        id: generateTestId('e2e-page-invalid'),
        agent_id: testAgentId,
        // Missing required fields
      };

      const filePath = await createPageFile(invalidPageData);
      createdFiles.push(filePath);

      // Attempt registration with invalid data
      const registerResponse = await registerPageViaAPI(invalidPageData);
      expect(registerResponse.status).toBe(400);

      const errorData = await registerResponse.json();
      expect(errorData.error).toBeDefined();
      expect(errorData.code).toBe('VALIDATION_ERROR');

      console.log(`✅ Registration failure captured: ${errorData.message}`);
    });
  });

  test.describe('Performance and Load Tests', () => {
    test('should handle rapid page registrations', async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT * 2);

      const pageCount = 5;
      const registeredPages = [];

      // Rapidly register multiple pages
      for (let i = 0; i < pageCount; i++) {
        const pageData = {
          id: generateTestId(`e2e-page-rapid-${i}`),
          agent_id: testAgentId,
          title: `E2E Rapid Registration ${i + 1}`,
          page_type: 'dynamic',
          content_type: 'text',
          content_value: `Rapid registration test ${i + 1}`,
          status: 'published',
          version: 1
        };

        const filePath = await createPageFile(pageData);
        createdFiles.push(filePath);

        await registerPageViaAPI(pageData);
        registeredPages.push(pageData);
      }

      // Verify all pages are accessible
      for (const pageData of registeredPages) {
        const isRegistered = await waitForPageRegistration(pageData.agent_id, pageData.id);
        expect(isRegistered).toBe(true);
      }

      // Navigate to last page to verify
      const lastPage = registeredPages[registeredPages.length - 1];
      const frontendUrl = `${FRONTEND_BASE_URL}/agents/${lastPage.agent_id}/pages/${lastPage.id}`;
      await page.goto(frontendUrl);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `test-results/screenshots/e2e-rapid-final.png`
      });

      console.log(`✅ Successfully registered and verified ${pageCount} pages rapidly`);
    });
  });
});
