/**
 * Example Integration Test Suite
 * Demonstrates integration testing with the regression framework
 */

import {
  createTestSuite,
  createTestCase,
  TestCategory,
  TestPriority,
  TestUtils
} from '../../../src/testing/regression';

// Mock API service for testing
class APIService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl = 'http://localhost:3001', timeout = 5000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async get(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Mock successful response
    if (endpoint === '/health') {
      return { status: 'ok', timestamp: new Date().toISOString() };
    }
    
    if (endpoint === '/users') {
      return [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ];
    }
    
    if (endpoint.startsWith('/users/')) {
      const id = endpoint.split('/')[2];
      return { id, name: `User ${id}`, email: `user${id}@example.com` };
    }
    
    throw new Error(`Endpoint not found: ${endpoint}`);
  }

  async post(endpoint: string, data: any): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    
    if (endpoint === '/users') {
      return {
        id: `user_${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString()
      };
    }
    
    throw new Error(`POST not supported for: ${endpoint}`);
  }

  async put(endpoint: string, data: any): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
    
    if (endpoint.startsWith('/users/')) {
      const id = endpoint.split('/')[2];
      return {
        id,
        ...data,
        updatedAt: new Date().toISOString()
      };
    }
    
    throw new Error(`PUT not supported for: ${endpoint}`);
  }

  async delete(endpoint: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    if (endpoint.startsWith('/users/')) {
      return;
    }
    
    throw new Error(`DELETE not supported for: ${endpoint}`);
  }
}

// Database service mock
class DatabaseService {
  private data = new Map<string, any>();
  private connected = false;

  async connect(): Promise<void> {
    // Simulate connection time
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.data.clear();
  }

  async save(collection: string, document: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const id = `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const key = `${collection}:${id}`;
    
    this.data.set(key, { ...document, id, createdAt: new Date() });
    return id;
  }

  async findById(collection: string, id: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const key = `${collection}:${id}`;
    return this.data.get(key);
  }

  async findAll(collection: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const results: any[] = [];
    for (const [key, value] of this.data.entries()) {
      if (key.startsWith(`${collection}:`)) {
        results.push(value);
      }
    }
    
    return results;
  }

  async update(collection: string, id: string, updates: any): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const key = `${collection}:${id}`;
    const existing = this.data.get(key);
    
    if (!existing) {
      return false;
    }
    
    this.data.set(key, { ...existing, ...updates, updatedAt: new Date() });
    return true;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    
    const key = `${collection}:${id}`;
    return this.data.delete(key);
  }
}

// Create integration test suite
export const integrationTestSuite = createTestSuite({
  id: 'api-integration-tests',
  name: 'API Integration Tests',
  description: 'Integration tests for API and database interactions',
  category: TestCategory.INTEGRATION,
  
  beforeAll: async () => {
    // Setup test environment
    console.log('Setting up integration test environment...');
  },
  
  afterAll: async () => {
    // Cleanup test environment
    console.log('Cleaning up integration test environment...');
  },

  testCases: [
    // API connectivity tests
    createTestCase({
      id: 'api-health-check',
      name: 'API health check should return success',
      description: 'Test basic API connectivity and health endpoint',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.CRITICAL,
      tags: ['api', 'health', 'connectivity'],
      timeout: 10000,
      execute: async () => {
        const api = new APIService();
        const response = await api.get('/health');
        
        if (!response || response.status !== 'ok') {
          throw new Error('Health check failed');
        }
        
        return {
          testId: 'api-health-check',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: `Health check successful: ${JSON.stringify(response)}`,
          metrics: {
            networkRequests: 1,
            responseSize: JSON.stringify(response).length
          }
        };
      }
    }),

    createTestCase({
      id: 'api-users-list',
      name: 'Should fetch users list from API',
      description: 'Test fetching users from the API endpoint',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.HIGH,
      tags: ['api', 'users', 'read'],
      dependencies: ['api-health-check'],
      execute: async () => {
        const api = new APIService();
        const users = await api.get('/users');
        
        if (!Array.isArray(users) || users.length === 0) {
          throw new Error('Users list fetch failed');
        }
        
        // Validate user structure
        const firstUser = users[0];
        if (!firstUser.id || !firstUser.name || !firstUser.email) {
          throw new Error('Invalid user structure');
        }
        
        return {
          testId: 'api-users-list',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: `Retrieved ${users.length} users`,
          metrics: {
            networkRequests: 1,
            recordsRetrieved: users.length
          }
        };
      }
    }),

    createTestCase({
      id: 'api-user-create',
      name: 'Should create new user via API',
      description: 'Test creating a new user through API endpoint',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.HIGH,
      tags: ['api', 'users', 'create'],
      execute: async () => {
        const api = new APIService();
        const userData = {
          name: 'Test User',
          email: 'test@example.com'
        };
        
        const createdUser = await api.post('/users', userData);
        
        if (!createdUser.id || createdUser.name !== userData.name) {
          throw new Error('User creation failed');
        }
        
        return {
          testId: 'api-user-create',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: `Created user: ${createdUser.id}`,
          artifacts: [`user-${createdUser.id}.json`]
        };
      }
    }),

    // Database integration tests
    createTestCase({
      id: 'database-connection',
      name: 'Should connect to database successfully',
      description: 'Test database connection establishment',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.CRITICAL,
      tags: ['database', 'connection'],
      execute: async () => {
        const db = new DatabaseService();
        await db.connect();
        
        // Verify connection by performing a simple operation
        const id = await db.save('test', { message: 'connection test' });
        const retrieved = await db.findById('test', id);
        
        if (!retrieved || retrieved.message !== 'connection test') {
          throw new Error('Database connection verification failed');
        }
        
        await db.disconnect();
        
        return {
          testId: 'database-connection',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Database connection successful'
        };
      }
    }),

    createTestCase({
      id: 'database-crud-operations',
      name: 'Should perform CRUD operations on database',
      description: 'Test complete CRUD workflow with database',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.HIGH,
      tags: ['database', 'crud', 'workflow'],
      timeout: 15000,
      execute: async () => {
        const db = new DatabaseService();
        await db.connect();
        
        try {
          // Create
          const createData = { name: 'Integration Test User', email: 'integration@test.com' };
          const userId = await db.save('users', createData);
          
          // Read
          const user = await db.findById('users', userId);
          if (!user || user.name !== createData.name) {
            throw new Error('Create/Read operation failed');
          }
          
          // Update
          const updateData = { name: 'Updated Integration User' };
          const updateResult = await db.update('users', userId, updateData);
          if (!updateResult) {
            throw new Error('Update operation failed');
          }
          
          const updatedUser = await db.findById('users', userId);
          if (!updatedUser || updatedUser.name !== updateData.name) {
            throw new Error('Update verification failed');
          }
          
          // Delete
          const deleteResult = await db.delete('users', userId);
          if (!deleteResult) {
            throw new Error('Delete operation failed');
          }
          
          const deletedUser = await db.findById('users', userId);
          if (deletedUser) {
            throw new Error('Delete verification failed');
          }
          
          return {
            testId: 'database-crud-operations',
            status: 'passed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            output: 'All CRUD operations successful',
            metrics: {
              databaseOperations: 6
            }
          };
        } finally {
          await db.disconnect();
        }
      }
    }),

    // End-to-end workflow tests
    createTestCase({
      id: 'api-database-integration',
      name: 'Should integrate API and database operations',
      description: 'Test complete workflow from API to database',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.HIGH,
      tags: ['api', 'database', 'workflow', 'e2e'],
      dependencies: ['api-health-check', 'database-connection'],
      timeout: 20000,
      execute: async () => {
        const api = new APIService();
        const db = new DatabaseService();
        
        await db.connect();
        
        try {
          // Simulate API creating data that gets stored in database
          const apiUser = await api.post('/users', {
            name: 'API Integration User',
            email: 'api-integration@test.com'
          });
          
          // Simulate storing the API result in database
          const dbUserId = await db.save('api_users', {
            apiId: apiUser.id,
            name: apiUser.name,
            email: apiUser.email,
            source: 'api_integration_test'
          });
          
          // Verify the integration
          const storedUser = await db.findById('api_users', dbUserId);
          if (!storedUser || storedUser.apiId !== apiUser.id) {
            throw new Error('API-Database integration failed');
          }
          
          // Test retrieval workflow
          const retrievedApiUser = await api.get(`/users/${apiUser.id}`);
          if (retrievedApiUser.name !== storedUser.name) {
            throw new Error('Data consistency check failed');
          }
          
          return {
            testId: 'api-database-integration',
            status: 'passed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            output: 'API-Database integration successful',
            metrics: {
              networkRequests: 2,
              databaseOperations: 2,
              dataConsistencyChecks: 1
            }
          };
        } finally {
          await db.disconnect();
        }
      }
    }),

    // Error handling and resilience tests
    createTestCase({
      id: 'api-error-handling',
      name: 'Should handle API errors gracefully',
      description: 'Test API error handling and recovery',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.MEDIUM,
      tags: ['api', 'error-handling', 'resilience'],
      execute: async () => {
        const api = new APIService();
        
        // Test 404 handling
        try {
          await api.get('/nonexistent-endpoint');
          throw new Error('Should have thrown an error for nonexistent endpoint');
        } catch (error) {
          if (!(error as Error).message.includes('not found')) {
            throw new Error('Unexpected error type');
          }
        }
        
        return {
          testId: 'api-error-handling',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'API error handling working correctly'
        };
      }
    }),

    createTestCase({
      id: 'database-error-handling',
      name: 'Should handle database errors gracefully',
      description: 'Test database error handling and recovery',
      category: TestCategory.INTEGRATION,
      priority: TestPriority.MEDIUM,
      tags: ['database', 'error-handling', 'resilience'],
      execute: async () => {
        const db = new DatabaseService();
        
        // Test operation without connection
        try {
          await db.save('test', { data: 'test' });
          throw new Error('Should have thrown connection error');
        } catch (error) {
          if (!(error as Error).message.includes('not connected')) {
            throw new Error('Unexpected error type');
          }
        }
        
        return {
          testId: 'database-error-handling',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Database error handling working correctly'
        };
      }
    }),

    // Performance integration tests
    TestUtils.createPerformanceTest(
      'api-performance-load',
      'API should handle multiple concurrent requests',
      async () => {
        const api = new APIService();
        const promises = [];
        
        // Create 10 concurrent requests
        for (let i = 0; i < 10; i++) {
          promises.push(api.get('/health'));
        }
        
        const results = await Promise.all(promises);
        
        // Verify all requests succeeded
        for (const result of results) {
          if (!result || result.status !== 'ok') {
            throw new Error('One or more concurrent requests failed');
          }
        }
      },
      5000 // Should complete within 5 seconds
    ),

    TestUtils.createPerformanceTest(
      'database-performance-batch',
      'Database should handle batch operations efficiently',
      async () => {
        const db = new DatabaseService();
        await db.connect();
        
        try {
          // Batch insert 100 records
          const insertPromises = [];
          for (let i = 0; i < 100; i++) {
            insertPromises.push(db.save('performance_test', {
              index: i,
              data: `test-data-${i}`,
              timestamp: new Date()
            }));
          }
          
          await Promise.all(insertPromises);
          
          // Verify all records were inserted
          const allRecords = await db.findAll('performance_test');
          if (allRecords.length < 100) {
            throw new Error('Batch insert failed');
          }
        } finally {
          await db.disconnect();
        }
      },
      3000 // Should complete within 3 seconds
    )
  ]
});

// Export test categories for selective running
export const criticalIntegrationTests = integrationTestSuite.testCases.filter(tc =>
  tc.priority === TestPriority.CRITICAL
);

export const apiTests = integrationTestSuite.testCases.filter(tc =>
  tc.tags.includes('api')
);

export const databaseTests = integrationTestSuite.testCases.filter(tc =>
  tc.tags.includes('database')
);

export const performanceIntegrationTests = integrationTestSuite.testCases.filter(tc =>
  tc.tags.includes('performance') || tc.category === TestCategory.PERFORMANCE
);