/**
 * Custom Test Sequencer for CI
 * 
 * Orders tests for optimal CI performance:
 * 1. Fast unit tests first
 * 2. Integration tests
 * 3. E2E tests last
 */

const Sequencer = require('@jest/test-sequencer').default;

class CITestSequencer extends Sequencer {
  sort(tests) {
    const testOrder = {
      unit: 1,
      integration: 2,
      e2e: 3
    };
    
    return Array.from(tests).sort((testA, testB) => {
      const typeA = this.getTestType(testA.path);
      const typeB = this.getTestType(testB.path);
      
      const priorityA = testOrder[typeA] || 2;
      const priorityB = testOrder[typeB] || 2;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same type, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
  
  getTestType(testPath) {
    if (testPath.includes('unit') || testPath.includes('.unit.')) {
      return 'unit';
    }
    if (testPath.includes('e2e') || testPath.includes('.e2e.')) {
      return 'e2e';
    }
    if (testPath.includes('integration') || testPath.includes('.integration.')) {
      return 'integration';
    }
    
    // Default to unit test for fast execution
    return 'unit';
  }
}

module.exports = CITestSequencer;