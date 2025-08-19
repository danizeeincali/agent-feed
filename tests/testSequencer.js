const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run unit tests first, then integration, then e2e
    const testOrder = ['unit', 'integration', 'e2e', 'performance', 'security'];
    
    return tests.sort((testA, testB) => {
      const orderA = this.getTestOrder(testA.path);
      const orderB = this.getTestOrder(testB.path);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Within same category, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
  
  getTestOrder(testPath) {
    if (testPath.includes('/unit/')) return 0;
    if (testPath.includes('/integration/')) return 1;
    if (testPath.includes('/e2e/')) return 2;
    if (testPath.includes('/performance/')) return 3;
    if (testPath.includes('/security/')) return 4;
    return 5; // Unknown tests run last
  }
}

module.exports = CustomSequencer;