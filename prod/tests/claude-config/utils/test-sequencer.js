const Sequencer = require('@jest/test-sequencer').default;

class ClaudeConfigTestSequencer extends Sequencer {
  sort(tests) {
    // Define test execution order for Claude Code configuration tests
    const testOrder = [
      'isolation', // Must run first to verify boundaries
      'configuration', // Then validate config loading
      'functionality', // Then test core functionality
      'integration', // Then test integrations
      'regression' // Finally run regression tests
    ];
    
    return tests.sort((testA, testB) => {
      const orderA = this.getTestOrder(testA.path, testOrder);
      const orderB = this.getTestOrder(testB.path, testOrder);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Secondary sort by path for consistent ordering
      return testA.path.localeCompare(testB.path);
    });
  }
  
  getTestOrder(testPath, testOrder) {
    for (let i = 0; i < testOrder.length; i++) {
      if (testPath.includes(testOrder[i])) {
        return i;
      }
    }
    return testOrder.length; // Unknown tests go last
  }
}

module.exports = ClaudeConfigTestSequencer;