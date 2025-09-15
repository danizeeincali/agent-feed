import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Dynamic Pages E2E Tests
 *
 * This setup runs once before all tests and prepares the test environment:
 * - Verifies backend and frontend servers are running
 * - Sets up test data
 * - Configures test environment
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Dynamic Pages E2E Test Setup...');

  const BACKEND_URL = 'http://localhost:3000';
  const FRONTEND_URL = 'http://localhost:5173';
  const TEST_AGENT_ID = 'personal-todos-agent';

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for backend server to be ready
    console.log('⏳ Waiting for backend server...');
    let backendReady = false;
    const maxBackendRetries = 30;

    for (let i = 0; i < maxBackendRetries; i++) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
          backendReady = true;
          console.log('✅ Backend server is ready');
          break;
        }
      } catch (error) {
        // Server not ready yet, wait
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!backendReady) {
      // Try basic backend endpoint
      try {
        const response = await fetch(`${BACKEND_URL}/api/agents`);
        if (response.ok || response.status === 404) {
          backendReady = true;
          console.log('✅ Backend server is responding');
        }
      } catch (error) {
        throw new Error(`Backend server at ${BACKEND_URL} is not responding after ${maxBackendRetries} seconds`);
      }
    }

    // Wait for frontend server to be ready
    console.log('⏳ Waiting for frontend server...');
    let frontendReady = false;
    const maxFrontendRetries = 30;

    for (let i = 0; i < maxFrontendRetries; i++) {
      try {
        await page.goto(FRONTEND_URL, { timeout: 5000 });
        frontendReady = true;
        console.log('✅ Frontend server is ready');
        break;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!frontendReady) {
      throw new Error(`Frontend server at ${FRONTEND_URL} is not responding after ${maxFrontendRetries} seconds`);
    }

    // Verify test agent exists or create it
    console.log('🔍 Checking test agent...');
    try {
      const agentsResponse = await fetch(`${BACKEND_URL}/api/agents`);
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        const hasTestAgent = agentsData.agents?.some((agent: any) => agent.id === TEST_AGENT_ID);

        if (hasTestAgent) {
          console.log('✅ Test agent found');
        } else {
          console.log('⚠️ Test agent not found, tests may need to handle this');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not verify test agent, tests will handle this');
    }

    // Clean up any existing test pages
    console.log('🧹 Cleaning up existing test data...');
    try {
      const pagesResponse = await fetch(`${BACKEND_URL}/api/agents/${TEST_AGENT_ID}/pages`);
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        if (pagesData.success && pagesData.data.pages) {
          for (const page of pagesData.data.pages) {
            if (page.title.includes('Test') || page.tags?.includes('test')) {
              await fetch(`${BACKEND_URL}/api/agents/${TEST_AGENT_ID}/pages/${page.id}`, {
                method: 'DELETE'
              });
            }
          }
          console.log('✅ Test data cleanup completed');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not clean up test data, continuing anyway');
    }

    // Verify frontend routing works
    console.log('🔍 Verifying frontend routing...');
    try {
      await page.goto(`${FRONTEND_URL}/agents`, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      const agentsPage = page.locator('text=Agents, h1:has-text("Agents"), [data-testid="agents-page"]');
      if (await agentsPage.count() > 0) {
        console.log('✅ Frontend routing is working');
      } else {
        console.log('⚠️ Frontend routing may have issues, but continuing tests');
      }
    } catch (error) {
      console.log('⚠️ Could not verify frontend routing:', error);
    }

    console.log('✅ Dynamic Pages E2E Test Setup Complete!');
    console.log(`📊 Backend: ${BACKEND_URL}`);
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`🤖 Test Agent: ${TEST_AGENT_ID}`);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;