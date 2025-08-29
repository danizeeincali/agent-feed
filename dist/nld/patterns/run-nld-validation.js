"use strict";
/**
 * NLD Validation Runner
 * Executes the React Hook NLD deployment validation and reports results
 */
Object.defineProperty(exports, "__esModule", { value: true });
const validate_react_hook_nld_deployment_1 = require("./validate-react-hook-nld-deployment");
const nld_logger_1 = require("../utils/nld-logger");
async function main() {
    try {
        console.log('🚀 Starting NLD React Hook Pattern Detection Validation...\n');
        // Run comprehensive validation
        const report = await (0, validate_react_hook_nld_deployment_1.runNLDValidation)();
        // Export report
        const reportFile = await (0, validate_react_hook_nld_deployment_1.exportValidationReport)(report);
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
        nld_logger_1.nldLogger.renderSuccess('NLDValidationRunner', 'validation-completed', {
            overallStatus: report.overallStatus,
            passedTests: report.passedTests,
            totalTests: report.totalTests,
            reportFile
        });
    }
    catch (error) {
        console.error('❌ NLD Validation Failed:', error);
        nld_logger_1.nldLogger.renderFailure('NLDValidationRunner', error);
        process.exit(1);
    }
}
// Run validation if this file is executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=run-nld-validation.js.map