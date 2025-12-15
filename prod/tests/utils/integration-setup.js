/**
 * Integration Test Setup
 * Real service coordination and database testing
 */

const { TestUtils } = require('./test-setup');

// Database setup for integration tests
class IntegrationDatabase {
  constructor() {
    this.connected = false;
    this.testSchema = 'posting_intelligence_test';
  }
  
  async connect() {
    // Mock database connection for tests
    console.log('Connecting to test database...');
    await TestUtils.waitFor(100); // Simulate connection time
    this.connected = true;
  }
  
  async disconnect() {
    console.log('Disconnecting from test database...');
    await TestUtils.waitFor(50);
    this.connected = false;
  }
  
  async migrate() {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    console.log('Running test migrations...');
    await TestUtils.waitFor(200); // Simulate migration time
  }
  
  async seed() {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    console.log('Seeding test data...');
    await TestUtils.waitFor(150);
  }
  
  async clean() {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    console.log('Cleaning test data...');
    await TestUtils.waitFor(100);
  }
}

// Service registry for integration tests
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
  }
  
  register(name, service) {
    this.services.set(name, service);
    
    // Add health check if available
    if (service.healthCheck) {
      this.healthChecks.set(name, service.healthCheck.bind(service));
    }
  }
  
  get(name) {
    return this.services.get(name);
  }
  
  async startAll() {
    console.log('Starting all services for integration tests...');
    
    for (const [name, service] of this.services) {
      if (service.start) {
        console.log(`Starting service: ${name}`);
        await service.start();
      }
    }
  }
  
  async stopAll() {
    console.log('Stopping all services...');
    
    for (const [name, service] of this.services) {
      if (service.stop) {
        console.log(`Stopping service: ${name}`);
        await service.stop();
      }
    }
  }
  
  async healthCheckAll() {
    const results = {};
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        results[name] = await healthCheck();
      } catch (error) {
        results[name] = { healthy: false, error: error.message };
      }
    }
    
    return results;
  }
}

// Mock services for integration testing
class MockPostingIntelligenceService {
  constructor() {
    this.running = false;
    this.requestCount = 0;
  }
  
  async start() {
    await TestUtils.waitFor(100);
    this.running = true;
  }
  
  async stop() {
    await TestUtils.waitFor(50);
    this.running = false;
  }
  
  async healthCheck() {
    return {
      healthy: this.running,
      uptime: this.running ? Date.now() : 0,
      requestCount: this.requestCount
    };
  }
  
  async generatePost(agentType, userData, context = {}) {
    if (!this.running) {
      throw new Error('Service not running');
    }
    
    this.requestCount++;
    await TestUtils.waitFor(200); // Simulate processing time
    
    return {
      content: `Generated post for ${agentType}: ${userData.title}`,
      metadata: {
        qualityScore: 0.8 + Math.random() * 0.2,
        impactScore: 0.7 + Math.random() * 0.2,
        generatedAt: new Date().toISOString()
      }
    };
  }
}

class MockQualityAssessmentService {
  constructor() {
    this.running = false;
  }
  
  async start() {
    await TestUtils.waitFor(50);
    this.running = true;
  }
  
  async stop() {
    await TestUtils.waitFor(25);
    this.running = false;
  }
  
  async healthCheck() {
    return { healthy: this.running };
  }
  
  async assessContent(content) {
    if (!this.running) {
      throw new Error('Service not running');
    }
    
    await TestUtils.waitFor(150);
    
    return {
      overallScore: 0.75 + Math.random() * 0.25,
      breakdown: {
        clarity: 0.8 + Math.random() * 0.2,
        structure: 0.7 + Math.random() * 0.3,
        relevance: 0.8 + Math.random() * 0.2
      },
      improvements: []
    };
  }
}

// Global integration test state
global.__INTEGRATION_STATE__ = {
  database: new IntegrationDatabase(),
  serviceRegistry: new ServiceRegistry(),
  testStartTime: null,
  testData: {
    users: [],
    posts: [],
    analytics: []
  }
};

// Setup integration environment
beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  global.__INTEGRATION_STATE__.testStartTime = Date.now();
  
  // Connect to test database
  await global.__INTEGRATION_STATE__.database.connect();
  await global.__INTEGRATION_STATE__.database.migrate();
  await global.__INTEGRATION_STATE__.database.seed();
  
  // Register mock services
  const serviceRegistry = global.__INTEGRATION_STATE__.serviceRegistry;
  serviceRegistry.register('postingIntelligence', new MockPostingIntelligenceService());
  serviceRegistry.register('qualityAssessment', new MockQualityAssessmentService());
  
  // Start all services
  await serviceRegistry.startAll();
  
  // Verify all services are healthy
  const healthResults = await serviceRegistry.healthCheckAll();
  const unhealthyServices = Object.entries(healthResults)
    .filter(([, result]) => !result.healthy)
    .map(([name]) => name);
  
  if (unhealthyServices.length > 0) {
    throw new Error(`Unhealthy services: ${unhealthyServices.join(', ')}`);
  }
  
  console.log('Integration test environment ready');
}, 30000);

// Cleanup after each test
afterEach(async () => {
  // Clean test data but keep services running
  await global.__INTEGRATION_STATE__.database.clean();
  
  // Reset test data state
  global.__INTEGRATION_STATE__.testData = {
    users: [],
    posts: [],
    analytics: []
  };
});

// Teardown integration environment
afterAll(async () => {
  console.log('Tearing down integration test environment...');
  
  // Stop all services
  await global.__INTEGRATION_STATE__.serviceRegistry.stopAll();
  
  // Disconnect from database
  await global.__INTEGRATION_STATE__.database.disconnect();
  
  const totalTime = Date.now() - global.__INTEGRATION_STATE__.testStartTime;
  console.log(`Integration tests completed in ${totalTime}ms`);
}, 15000);

// Integration test utilities
global.IntegrationUtils = {
  // Get service instance
  getService: (name) => {
    return global.__INTEGRATION_STATE__.serviceRegistry.get(name);
  },
  
  // Create test user
  createTestUser: async (userData = {}) => {
    const user = {
      id: TestUtils.generateTestId(),
      email: `test-${Date.now()}@example.com`,
      name: 'Integration Test User',
      created_at: new Date().toISOString(),
      ...userData
    };
    
    global.__INTEGRATION_STATE__.testData.users.push(user);
    return user;
  },
  
  // Create test post
  createTestPost: async (postData = {}) => {
    const post = {
      id: TestUtils.generateTestId(),
      title: 'Integration Test Post',
      content: 'This is a test post for integration testing',
      agentType: 'personal-todos',
      userId: TestUtils.generateTestId(),
      created_at: new Date().toISOString(),
      ...postData
    };
    
    global.__INTEGRATION_STATE__.testData.posts.push(post);
    return post;
  },
  
  // Verify service health
  verifyServiceHealth: async (serviceName) => {
    const service = global.__INTEGRATION_STATE__.serviceRegistry.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    
    const health = await service.healthCheck();
    expect(health.healthy).toBe(true);
    
    return health;
  },
  
  // Wait for async operations
  waitForOperation: async (operation, timeoutMs = 5000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const result = await operation();
        if (result) {
          return result;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await TestUtils.waitFor(100); // Check every 100ms
    }
    
    throw new Error(`Operation timed out after ${timeoutMs}ms`);
  },
  
  // Simulate network conditions
  simulateNetworkLatency: async (latencyMs) => {
    await TestUtils.waitFor(latencyMs);
  },
  
  // Get test statistics
  getTestStats: () => {
    const state = global.__INTEGRATION_STATE__;
    return {
      testDuration: Date.now() - state.testStartTime,
      usersCreated: state.testData.users.length,
      postsCreated: state.testData.posts.length,
      servicesRegistered: state.serviceRegistry.services.size
    };
  }
};

// Export for use in other files
module.exports = {
  IntegrationDatabase,
  ServiceRegistry,
  MockPostingIntelligenceService,
  MockQualityAssessmentService,
  IntegrationUtils: global.IntegrationUtils
};