/**
 * Test Sequencer for Regression Tests
 * Controls the order of test execution for optimal stability
 */

const { TestSequencer } = require('@jest/test-sequencer').default || require('@jest/test-sequencer');

class RegressionTestSequencer extends TestSequencer {
  /**
   * Sort tests to run in optimal order:
   * 1. Unit tests first (fastest)
   * 2. API tests
   * 3. Integration tests
   * 4. E2E tests last (slowest, most brittle)
   */
  sort(tests) {
    const testOrder = {
      unit: 1,
      api: 2,
      integration: 3,
      e2e: 4,
      browser: 5
    };

    return tests.sort((testA, testB) => {
      // Determine test type from path
      const getTestType = (path) => {
        if (path.includes('unit')) return 'unit';
        if (path.includes('api')) return 'api';
        if (path.includes('integration')) return 'integration';
        if (path.includes('e2e')) return 'e2e';
        if (path.includes('browser')) return 'browser';
        return 'unit'; // default
      };

      const typeA = getTestType(testA.path);
      const typeB = getTestType(testB.path);

      const orderA = testOrder[typeA] || 99;
      const orderB = testOrder[typeB] || 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Within same type, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = RegressionTestSequencer;