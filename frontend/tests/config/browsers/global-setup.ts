import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting comprehensive test suite setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 30000 });
    console.log('✅ Application is ready');
    
    // Setup test data if needed
    console.log('📊 Setting up test data...');
    await setupTestAgents(page);
    
    // Verify API endpoints
    console.log('🔌 Verifying API endpoints...');
    await verifyAPIEndpoints(page);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestAgents(page: any) {
  // Navigate to agents and ensure test agents exist
  await page.goto('http://localhost:3000/agents');
  await page.waitForLoadState('networkidle');
  
  // Check if test agents exist, create if needed
  const testAgents = [
    { name: 'Test Agent 1', description: 'Test agent for e2e testing' },
    { name: 'Test Agent 2', description: 'Another test agent' },
  ];
  
  for (const agent of testAgents) {
    const exists = await page.locator(`text="${agent.name}"`).count() > 0;
    if (!exists) {
      console.log(`Creating test agent: ${agent.name}`);
      // Add agent creation logic here if needed
    }
  }
}

async function verifyAPIEndpoints(page: any) {
  // Test critical API endpoints
  const endpoints = [
    '/api/agents',
    '/api/agent-pages',
    '/api/health',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await page.request.get(`http://localhost:3001${endpoint}`);
      if (!response.ok()) {
        throw new Error(`Endpoint ${endpoint} returned ${response.status()}`);
      }
      console.log(`✅ Endpoint ${endpoint} is working`);
    } catch (error) {
      console.error(`❌ Endpoint ${endpoint} failed:`, error);
      throw error;
    }
  }
}

export default globalSetup;