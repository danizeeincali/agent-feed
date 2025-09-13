/**
 * Playwright Global Setup
 * Sets up test environment and data before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Agent Dynamic Pages E2E tests...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Setup test data
    await setupTestData(page);
    
    // Verify application is running
    await verifyApplication(page);
    
    // Setup authentication if needed
    await setupAuthentication(page);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  console.log('📝 Setting up test data...');
  
  // Setup mock API responses
  await page.route('**/api/agents/*/workspace', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-workspace',
        agent_id: 'test-agent',
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

  await page.route('**/api/agents/*/pages', async (route: any, request: any) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          agent_id: 'test-agent',
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        })
      });
    } else if (request.method() === 'POST') {
      const requestBody = await request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: {
            id: `page-${Date.now()}`,
            agent_id: 'test-agent',
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

  console.log('✅ Test data setup completed');
}

async function verifyApplication(page: any) {
  console.log('🔍 Verifying application is running...');
  
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';
  
  try {
    await page.goto(baseURL, { timeout: 30000 });
    
    // Wait for application to be ready
    await page.waitForSelector('body', { timeout: 10000 });
    
    console.log('✅ Application verification completed');
  } catch (error) {
    console.error('❌ Application verification failed:', error);
    throw new Error(`Application not accessible at ${baseURL}`);
  }
}

async function setupAuthentication(page: any) {
  console.log('🔐 Setting up authentication...');
  
  // If authentication is required, set it up here
  // For now, we'll assume no authentication is needed for tests
  
  console.log('✅ Authentication setup completed');
}

export default globalSetup;