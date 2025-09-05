/**
 * Global Test Setup
 * Handles test environment preparation, database seeding, and service initialization
 */

import { chromium } from '@playwright/test';
import { TestDatabase } from '../utils/test-database.js';
import { TestDataGenerator } from '../fixtures/test-data-generator.js';
import { MockServices } from '../utils/mock-services.js';

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');

  // Initialize test database
  const testDb = new TestDatabase();
  await testDb.initialize();
  await testDb.seed();
  console.log('✅ Test database initialized and seeded');

  // Start mock services for testing
  const mockServices = new MockServices();
  await mockServices.start();
  console.log('✅ Mock services started');

  // Generate test data
  const dataGenerator = new TestDataGenerator();
  await dataGenerator.generateBaseData();
  console.log('✅ Base test data generated');

  // Create shared browser context for performance optimization
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Store authentication state for tests
  await context.storageState({ path: 'test-results/auth-state.json' });
  
  await browser.close();
  console.log('✅ Authentication state prepared');

  // Store configuration in global state
  global.__TEST_CONFIG__ = {
    baseURL: config.use.baseURL,
    databaseUrl: testDb.getConnectionString(),
    mockServicesPorts: mockServices.getPorts()
  };

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;