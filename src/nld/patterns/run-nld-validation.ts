/**
 * NLD Validation Runner
 * Executes the React Hook NLD deployment validation and reports results
 */

import { runNLDValidation, exportValidationReport } from './validate-react-hook-nld-deployment';
import { nldLogger } from '../utils/nld-logger';

async function main() {
  try {
    console.log('🚀 Starting NLD React Hook Pattern Detection Validation...\n');
    
    // Run comprehensive validation
    const report = await runNLDValidation();
    
    // Export report
    const reportFile = await exportValidationReport(report);
    
    // Display summary
    console.log('📊 NLD Validation Summary');
    console.log('========================');
    console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Validation Time: ${report.validationTime.toISOString()}`);
    console.log(`Report Exported: ${reportFile}\n`);
    
    // Display test results
    console.log('🧪 Test Results');
    console.log('===============');
    report.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.testName}`);
      console.log(`   ${result.message}`);
      if (result.details && !result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log('');
    });
    
    // Display performance metrics
    console.log('⚡ Performance Metrics');
    console.log('=====================');
    console.log(`Pattern Detection Latency: ${report.performance.detectionLatency}ms`);
    console.log(`Training Data Generation: ${report.performance.trainingDataGeneration}ms`);
    console.log(`Export Time: ${report.performance.exportTime}ms\n`);
    
    // Display recommendations
    console.log('💡 Recommendations');
    console.log('==================');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\n✨ NLD Validation Complete!');
    
    // Log final status for NLD analysis
    nldLogger.renderSuccess('NLDValidationRunner', 'validation-completed', {
      overallStatus: report.overallStatus,
      passedTests: report.passedTests,
      totalTests: report.totalTests,
      reportFile
    });
    
  } catch (error) {
    console.error('❌ NLD Validation Failed:', error);
    nldLogger.renderFailure('NLDValidationRunner', error as Error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  main();
}