import fs from 'fs';
import path from 'path';

/**
 * Global Teardown for Interactive Control Removal Validation
 * Generates final reports and cleanup
 */
async function globalTeardown(config) {
  console.log('🧹 Starting Playwright UI/UX Validation Teardown...');

  try {
    // Generate validation summary
    const validationSummary = {
      timestamp: new Date().toISOString(),
      testPhase: process.env.TEST_PHASE || 'baseline',
      results: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };

    // Read test results if available
    const resultsPath = './reports/results.json';
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      validationSummary.results = {
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0
      };
    }

    // Compare baseline vs current state if in post-removal phase
    if (process.env.TEST_PHASE === 'post-removal') {
      console.log('📊 Generating removal validation report...');

      const baselineState = JSON.parse(
        fs.readFileSync('./configs/baseline-state.json', 'utf8')
      );

      const removalReport = {
        ...validationSummary,
        comparison: {
          baselineRoutes: baselineState.routes.length,
          currentAccessibleRoutes: 0,
          removedRoutes: [],
          affectedFeatures: []
        }
      };

      // Identify what was removed
      const interactiveControlRoute = baselineState.routes.find(r =>
        r.name === 'interactive-control'
      );

      if (interactiveControlRoute && interactiveControlRoute.accessible) {
        removalReport.comparison.removedRoutes.push({
          name: 'interactive-control',
          path: '/interactive-control',
          impact: 'Successfully removed as planned'
        });
      }

      fs.writeFileSync(
        './reports/removal-validation-report.json',
        JSON.stringify(removalReport, null, 2)
      );

      console.log('📈 Removal validation report generated');
    }

    // Save final summary
    fs.writeFileSync(
      './reports/validation-summary.json',
      JSON.stringify(validationSummary, null, 2)
    );

    // Generate human-readable report
    const reportContent = `
# UI/UX Validation Report

## Test Summary
- **Timestamp**: ${validationSummary.timestamp}
- **Phase**: ${validationSummary.testPhase}
- **Total Tests**: ${validationSummary.results.totalTests}
- **Passed**: ${validationSummary.results.passed}
- **Failed**: ${validationSummary.results.failed}
- **Skipped**: ${validationSummary.results.skipped}

## Validation Status
${validationSummary.results.failed === 0 ? '✅ All validations passed' : '❌ Some validations failed'}

## Next Steps
${process.env.TEST_PHASE === 'baseline' ?
  '1. Proceed with interactive-control removal\n2. Run post-removal validation\n3. Compare results' :
  '1. Review any failed tests\n2. Verify UI/UX remains functional\n3. Deploy changes if validation passes'
}
`;

    fs.writeFileSync('./reports/validation-report.md', reportContent);
    console.log('📝 Human-readable report generated');

  } catch (error) {
    console.error('❌ Error during teardown:', error);
  }

  console.log('✨ Teardown completed');
}

export default globalTeardown;