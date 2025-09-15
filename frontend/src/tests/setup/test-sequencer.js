/**
 * Test Sequencer for London School TDD
 * Orders tests for optimal execution and dependency management
 */

const TestSequencer = require('@jest/test-sequencer').default;

class AviDMTestSequencer extends TestSequencer {
  /**
   * Sort tests for optimal execution order
   * London School TDD principle: Test contracts and interactions first
   */
  sort(tests) {
    // Define test execution priorities (lower number = higher priority)
    const testPriorities = {
      // 1. Setup and mock tests (highest priority)
      'jest-setup.test': 1,
      'mocks': 1,
      
      // 2. Service and integration tests (test contracts first)
      'AviDMService': 2,
      'WebSocketCommunication': 2,
      'ErrorHandling': 2,
      
      // 3. Component behavior tests (test interactions)
      'AviDirectChat': 3,
      'AviPersonality': 3,
      'StateManagement': 3,
      
      // 4. Integration tests (test full workflows)
      'AviChatInterface.integration': 4,
      'UserWorkflowIntegration': 4,
      
      // 5. Performance and edge case tests (lowest priority)
      'performance': 5,
      'edge-cases': 5
    };
    
    // Custom sorting function
    const sortedTests = [...tests].sort((testA, testB) => {
      // Get priority based on test file name
      const getPriority = (testPath) => {
        const fileName = testPath.split('/').pop() || '';
        
        // Find matching priority key
        const matchingKey = Object.keys(testPriorities).find(key => 
          fileName.includes(key)
        );
        
        return matchingKey ? testPriorities[matchingKey] : 10; // Default priority
      };
      
      const priorityA = getPriority(testA.path);
      const priorityB = getPriority(testB.path);
      
      // Primary sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by file size (smaller files first for faster feedback)
      const sizeA = testA.context.hasteFS.getSize(testA.path) || 0;
      const sizeB = testB.context.hasteFS.getSize(testB.path) || 0;
      
      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }
      
      // Tertiary sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
    
    // Log test execution order in verbose mode
    if (process.env.JEST_VERBOSE === 'true') {
      console.log('\n📋 Test Execution Order:');
      sortedTests.forEach((test, index) => {
        const fileName = test.path.split('/').pop();
        const priority = this.getPriority(test.path);
        console.log(`   ${index + 1}. ${fileName} (priority: ${priority})`);
      });
      console.log('');
    }
    
    return sortedTests;
  }
  
  /**
   * Helper method to get test priority
   */
  getPriority(testPath) {
    const testPriorities = {
      'jest-setup.test': 1,
      'mocks': 1,
      'AviDMService': 2,
      'WebSocketCommunication': 2,
      'ErrorHandling': 2,
      'AviDirectChat': 3,
      'AviPersonality': 3,
      'StateManagement': 3,
      'AviChatInterface.integration': 4,
      'UserWorkflowIntegration': 4,
      'performance': 5,
      'edge-cases': 5
    };
    
    const fileName = testPath.split('/').pop() || '';
    const matchingKey = Object.keys(testPriorities).find(key => 
      fileName.includes(key)
    );
    
    return matchingKey ? testPriorities[matchingKey] : 10;
  }
  
  /**
   * Additional optimization: Group tests by type for better resource usage
   */
  shard(tests, { shardIndex, shardCount }) {
    // Group tests by their type/priority for better parallelization
    const testGroups = {};
    
    tests.forEach(test => {
      const priority = this.getPriority(test.path);
      if (!testGroups[priority]) {
        testGroups[priority] = [];
      }
      testGroups[priority].push(test);
    });
    
    // Distribute groups across shards
    const shardSize = Math.ceil(tests.length / shardCount);
    const startIndex = shardIndex * shardSize;
    const endIndex = Math.min(startIndex + shardSize, tests.length);
    
    return tests.slice(startIndex, endIndex);
  }
}

module.exports = AviDMTestSequencer;
