import { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Global Setup for Agent Feed E2E Testing
 * Initializes test environment, data, and infrastructure
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Agent Feed E2E Test Suite Global Setup...');

  try {
    // Create necessary directories
    await createTestDirectories();
    
    // Initialize test database
    await initializeTestDatabase();
    
    // Setup test data
    await setupTestData();
    
    // Verify test environment
    await verifyTestEnvironment();
    
    // Setup authentication state
    await setupAuthenticationState();
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function createTestDirectories() {
  const directories = [
    'test-results',
    'reports/html',
    'reports/json',
    'reports/junit',
    'screenshots',
    'videos',
    'fixtures/temp'
  ];

  for (const dir of directories) {
    const fullPath = path.join(__dirname, '..', dir);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

async function initializeTestDatabase() {
  // Initialize test database with clean state
  console.log('🗄️ Initializing test database...');
  
  // Create test data fixtures
  const testData = {
    agents: [
      {
        id: 'test-agent-1',
        name: 'Content Creator Agent',
        type: 'content-creator',
        status: 'active',
        capabilities: ['content-generation', 'quality-assessment']
      },
      {
        id: 'test-agent-2',
        name: 'Feed Coordinator Agent',
        type: 'coordinator',
        status: 'active',
        capabilities: ['coordination', 'analytics', 'optimization']
      }
    ],
    feedPosts: [],
    analytics: {
      totalPosts: 0,
      qualityScore: 0,
      engagementRate: 0
    }
  };

  await fs.writeFile(
    path.join(__dirname, '..', 'fixtures', 'test-data.json'),
    JSON.stringify(testData, null, 2)
  );
}

async function setupTestData() {
  console.log('📊 Setting up test data fixtures...');
  
  // Create mock API responses
  const mockResponses = {
    agentTasks: [
      {
        id: 'task-1',
        agentId: 'test-agent-1',
        type: 'content-generation',
        status: 'completed',
        result: {
          content: 'Test content for E2E testing',
          quality: 0.85,
          metadata: {
            keywords: ['test', 'e2e', 'automation'],
            sentiment: 'positive'
          }
        }
      }
    ],
    feedMetrics: {
      realTimeStats: {
        activePosts: 0,
        pendingPosts: 0,
        qualityScore: 0,
        performanceMetrics: {
          avgResponseTime: 150,
          successRate: 100
        }
      }
    }
  };

  await fs.writeFile(
    path.join(__dirname, '..', 'fixtures', 'mock-responses.json'),
    JSON.stringify(mockResponses, null, 2)
  );
}

async function verifyTestEnvironment() {
  console.log('🔍 Verifying test environment...');
  
  const baseURL = process.env.BASE_URL || 'http://localhost:3001';
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Test basic connectivity
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Verify essential elements are present
    const title = await page.title();
    console.log(`📄 Application title: ${title}`);
    
    await browser.close();
  } catch (error) {
    console.warn(`⚠️ Warning: Could not verify environment at ${baseURL}`, error.message);
  }
}

async function setupAuthenticationState() {
  console.log('🔐 Setting up authentication states...');
  
  // Create authenticated state files for different user types
  const authStates = {
    admin: {
      cookies: [],
      origins: []
    },
    agent: {
      cookies: [],
      origins: []
    },
    readonly: {
      cookies: [],
      origins: []
    }
  };

  for (const [role, state] of Object.entries(authStates)) {
    await fs.writeFile(
      path.join(__dirname, '..', 'fixtures', `auth-${role}.json`),
      JSON.stringify(state, null, 2)
    );
  }
}

export default globalSetup;