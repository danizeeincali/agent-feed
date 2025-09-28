/**
 * Jest Test Sequencer for Regression Tests
 *
 * Ensures tests run in optimal order for CSS architecture validation
 */

const Sequencer = require('@jest/test-sequencer').default;

class RegressionTestSequencer extends Sequencer {
  sort(tests) {
    // Define test priority order for optimal execution
    const testPriority = {
      'css-variable-loading.test.js': 1,        // Basic CSS variables first
      'tailwind-class-application.test.js': 2,  // Tailwind utilities second
      'component-rendering.test.js': 3,         // Component rendering third
      'react-hook-integration.test.js': 4,      // React hooks fourth
      'build-process-validation.test.js': 5,    // Build process fifth
      'server-integration.test.js': 6,          // Server integration last
      'multi-viewport-responsive.test.js': 7    // Responsive tests last (slowest)
    };

    return tests.sort((testA, testB) => {
      const testAName = testA.path.split('/').pop();
      const testBName = testB.path.split('/').pop();

      const priorityA = testPriority[testAName] || 99;
      const priorityB = testPriority[testBName] || 99;

      // Sort by priority first, then by name for consistency
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return testAName.localeCompare(testBName);
    });
  }
}

module.exports = RegressionTestSequencer;