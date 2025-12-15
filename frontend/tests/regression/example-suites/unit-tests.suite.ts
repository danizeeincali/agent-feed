/**
 * Example Unit Test Suite
 * Demonstrates how to create comprehensive unit test suites with the regression framework
 */

import {
  createTestSuite,
  createTestCase,
  TestCategory,
  TestPriority,
  TestUtils
} from '../../../src/testing/regression';

// Example service to test
class UserService {
  private users = new Map<string, { id: string; name: string; email: string }>();

  createUser(name: string, email: string): { id: string; name: string; email: string } {
    if (!name || !email) {
      throw new Error('Name and email are required');
    }
    
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  getUser(id: string): { id: string; name: string; email: string } | undefined {
    return this.users.get(id);
  }

  updateUser(id: string, updates: Partial<{ name: string; email: string }>): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }

    Object.assign(user, updates);
    return true;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Create unit test suite
export const unitTestSuite = createTestSuite({
  id: 'user-service-unit-tests',
  name: 'UserService Unit Tests',
  description: 'Comprehensive unit tests for UserService functionality',
  category: TestCategory.UNIT,
  
  beforeEach: async () => {
    // Reset any global state if needed
  },

  testCases: [
    // Basic functionality tests
    createTestCase({
      id: 'user-creation-success',
      name: 'Should create user successfully',
      description: 'Test successful user creation with valid input',
      category: TestCategory.UNIT,
      priority: TestPriority.HIGH,
      tags: ['user', 'creation', 'success'],
      execute: async () => {
        const service = new UserService();
        const user = service.createUser('John Doe', 'john@example.com');
        
        if (!user.id || user.name !== 'John Doe' || user.email !== 'john@example.com') {
          throw new Error('User creation failed');
        }
        
        return {
          testId: 'user-creation-success',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'User created successfully'
        };
      }
    }),

    createTestCase({
      id: 'user-creation-validation',
      name: 'Should validate required fields',
      description: 'Test validation of required fields during user creation',
      category: TestCategory.UNIT,
      priority: TestPriority.HIGH,
      tags: ['user', 'validation', 'error'],
      execute: async () => {
        const service = new UserService();
        
        try {
          service.createUser('', 'john@example.com');
          throw new Error('Should have thrown validation error');
        } catch (error) {
          if (!(error as Error).message.includes('required')) {
            throw new Error('Wrong validation error message');
          }
        }
        
        return {
          testId: 'user-creation-validation',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Validation working correctly'
        };
      }
    }),

    createTestCase({
      id: 'email-validation',
      name: 'Should validate email format',
      description: 'Test email format validation',
      category: TestCategory.UNIT,
      priority: TestPriority.MEDIUM,
      tags: ['user', 'email', 'validation'],
      execute: async () => {
        const service = new UserService();
        
        const invalidEmails = ['invalid', 'test@', '@example.com', 'test@.com'];
        
        for (const email of invalidEmails) {
          try {
            service.createUser('Test User', email);
            throw new Error(`Should have rejected invalid email: ${email}`);
          } catch (error) {
            if (!(error as Error).message.includes('Invalid email')) {
              throw error;
            }
          }
        }
        
        return {
          testId: 'email-validation',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Email validation working correctly'
        };
      }
    }),

    // CRUD operations tests
    createTestCase({
      id: 'user-retrieval',
      name: 'Should retrieve user by ID',
      description: 'Test user retrieval functionality',
      category: TestCategory.UNIT,
      priority: TestPriority.HIGH,
      tags: ['user', 'retrieval', 'crud'],
      execute: async () => {
        const service = new UserService();
        const createdUser = service.createUser('Jane Doe', 'jane@example.com');
        const retrievedUser = service.getUser(createdUser.id);
        
        if (!retrievedUser || retrievedUser.id !== createdUser.id) {
          throw new Error('User retrieval failed');
        }
        
        return {
          testId: 'user-retrieval',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'User retrieval working correctly'
        };
      }
    }),

    createTestCase({
      id: 'user-update',
      name: 'Should update user information',
      description: 'Test user update functionality',
      category: TestCategory.UNIT,
      priority: TestPriority.HIGH,
      tags: ['user', 'update', 'crud'],
      execute: async () => {
        const service = new UserService();
        const user = service.createUser('Original Name', 'original@example.com');
        
        const updateResult = service.updateUser(user.id, {
          name: 'Updated Name',
          email: 'updated@example.com'
        });
        
        if (!updateResult) {
          throw new Error('User update failed');
        }
        
        const updatedUser = service.getUser(user.id);
        if (!updatedUser || updatedUser.name !== 'Updated Name' || 
            updatedUser.email !== 'updated@example.com') {
          throw new Error('User update did not persist');
        }
        
        return {
          testId: 'user-update',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'User update working correctly'
        };
      }
    }),

    createTestCase({
      id: 'user-deletion',
      name: 'Should delete user',
      description: 'Test user deletion functionality',
      category: TestCategory.UNIT,
      priority: TestPriority.MEDIUM,
      tags: ['user', 'deletion', 'crud'],
      execute: async () => {
        const service = new UserService();
        const user = service.createUser('To Delete', 'delete@example.com');
        
        const deleteResult = service.deleteUser(user.id);
        if (!deleteResult) {
          throw new Error('User deletion failed');
        }
        
        const deletedUser = service.getUser(user.id);
        if (deletedUser) {
          throw new Error('User was not actually deleted');
        }
        
        return {
          testId: 'user-deletion',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'User deletion working correctly'
        };
      }
    }),

    // Edge cases and error handling
    createTestCase({
      id: 'nonexistent-user-retrieval',
      name: 'Should handle nonexistent user retrieval',
      description: 'Test behavior when retrieving nonexistent user',
      category: TestCategory.UNIT,
      priority: TestPriority.MEDIUM,
      tags: ['user', 'edge-case', 'error-handling'],
      execute: async () => {
        const service = new UserService();
        const result = service.getUser('nonexistent-id');
        
        if (result !== undefined) {
          throw new Error('Should return undefined for nonexistent user');
        }
        
        return {
          testId: 'nonexistent-user-retrieval',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Nonexistent user handling correct'
        };
      }
    }),

    createTestCase({
      id: 'update-nonexistent-user',
      name: 'Should handle nonexistent user update',
      description: 'Test behavior when updating nonexistent user',
      category: TestCategory.UNIT,
      priority: TestPriority.LOW,
      tags: ['user', 'edge-case', 'update'],
      execute: async () => {
        const service = new UserService();
        const result = service.updateUser('nonexistent-id', { name: 'New Name' });
        
        if (result !== false) {
          throw new Error('Should return false for nonexistent user update');
        }
        
        return {
          testId: 'update-nonexistent-user',
          status: 'passed' as const,
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
          output: 'Nonexistent user update handling correct'
        };
      }
    }),

    // Using utility functions
    TestUtils.createAssertionTest(
      'email-format-assertion',
      'Email format validation assertion',
      () => {
        const service = new UserService();
        try {
          service.createUser('Test', 'invalid-email');
          return false;
        } catch (error) {
          return (error as Error).message.includes('Invalid email');
        }
      }
    ),

    TestUtils.createPerformanceTest(
      'user-creation-performance',
      'User creation should be fast',
      async () => {
        const service = new UserService();
        for (let i = 0; i < 1000; i++) {
          service.createUser(`User ${i}`, `user${i}@example.com`);
        }
      },
      1000 // Should complete within 1 second
    )
  ]
});

// Export individual test cases for selective running
export const criticalUserTests = unitTestSuite.testCases.filter(tc => 
  tc.priority === TestPriority.CRITICAL || tc.priority === TestPriority.HIGH
);

export const userValidationTests = unitTestSuite.testCases.filter(tc =>
  tc.tags.includes('validation')
);

export const userCrudTests = unitTestSuite.testCases.filter(tc =>
  tc.tags.includes('crud')
);