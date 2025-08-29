"use strict";
/**
 * React Hook NLD Deployment Validator
 * Validates the deployment and functionality of React Hook Side Effect pattern detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactHookNLDDeploymentValidator = void 0;
exports.runNLDValidation = runNLDValidation;
exports.exportValidationReport = exportValidationReport;
const react_hook_side_effect_detector_1 = require("./react-hook-side-effect-detector");
const react_hook_neural_training_dataset_1 = require("./react-hook-neural-training-dataset");
const claude_flow_neural_exporter_1 = require("./claude-flow-neural-exporter");
const nld_logger_1 = require("../utils/nld-logger");
class ReactHookNLDDeploymentValidator {
    results = [];
    constructor() {
        nld_logger_1.nldLogger.renderAttempt('ReactHookNLDDeploymentValidator', 'initialization');
    }
    /**
     * Run comprehensive validation of NLD deployment
     */
    async validateDeployment() {
        try {
            nld_logger_1.nldLogger.renderAttempt('ReactHookNLDDeploymentValidator', 'deployment-validation-start');
            this.results = [];
            // Core functionality tests
            await this.validatePatternDetector();
            await this.validateTrainingDataset();
            await this.validateNeuralExporter();
            // Integration tests
            await this.validateEndToEndWorkflow();
            await this.validatePerformance();
            // Real-world pattern tests
            await this.validateRealWorldPatterns();
            // Generate report
            const report = this.generateValidationReport();
            nld_logger_1.nldLogger.renderSuccess('ReactHookNLDDeploymentValidator', 'deployment-validation-complete', {
                overallStatus: report.overallStatus,
                passedTests: report.passedTests,
                totalTests: report.totalTests
            });
            return report;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ReactHookNLDDeploymentValidator', error);
            throw error;
        }
    }
    /**
     * Validate pattern detector functionality
     */
    async validatePatternDetector() {
        // Test 1: Basic pattern detection
        try {
            const pattern = react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('TestComponent', 'useTestHook', {
                isRendering: true,
                hasUserAction: false,
                sideEffectType: 'rate-limiting',
                sourceLocation: { file: '/test/TestComponent.tsx', line: 10, column: 5 }
            });
            this.addResult({
                testName: 'Pattern Detection - Basic Functionality',
                passed: pattern !== null,
                message: pattern ? 'Pattern detected successfully' : 'Pattern detection failed',
                details: { patternId: pattern?.id, severity: pattern?.severity }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Pattern Detection - Basic Functionality',
                passed: false,
                message: `Pattern detection threw error: ${error}`,
                details: { error }
            });
        }
        // Test 2: Rate limiting pattern detection
        try {
            // Simulate multiple renders
            let pattern = null;
            for (let i = 0; i < 12; i++) {
                pattern = react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('RateLimitComponent', 'useTokenCostTracking', {
                    isRendering: true,
                    hasUserAction: i % 4 === 0, // Only 1 user action per 4 renders
                    sideEffectType: 'rate-limiting',
                    sourceLocation: { file: '/components/TokenCostAnalytics.tsx', line: 96, column: 10 },
                    metadata: { renderCycle: i }
                });
            }
            const rateLimitDetected = pattern && pattern.rateLimitingTriggered;
            this.addResult({
                testName: 'Pattern Detection - Rate Limiting',
                passed: rateLimitDetected || false,
                message: rateLimitDetected ? 'Rate limiting pattern detected correctly' : 'Rate limiting pattern not detected',
                details: {
                    patternDetected: !!pattern,
                    rateLimitTriggered: rateLimitDetected,
                    renderToActionRatio: pattern?.renderToActionRatio
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Pattern Detection - Rate Limiting',
                passed: false,
                message: `Rate limiting test failed: ${error}`,
                details: { error }
            });
        }
        // Test 3: Pattern severity classification
        try {
            const highSeverityPattern = react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('CriticalComponent', 'useCriticalHook', {
                isRendering: true,
                hasUserAction: false,
                sideEffectType: 'state-mutation',
                sourceLocation: { file: '/critical/Component.tsx', line: 15, column: 8 }
            });
            // Generate multiple renders to trigger high severity
            for (let i = 0; i < 15; i++) {
                react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('CriticalComponent', 'useCriticalHook', {
                    isRendering: true,
                    hasUserAction: false,
                    sideEffectType: 'state-mutation',
                    sourceLocation: { file: '/critical/Component.tsx', line: 15, column: 8 }
                });
            }
            const patterns = react_hook_side_effect_detector_1.reactHookSideEffectDetector.getPatternsBySeverity('critical');
            const hasCriticalPattern = patterns.length > 0;
            this.addResult({
                testName: 'Pattern Detection - Severity Classification',
                passed: hasCriticalPattern,
                message: hasCriticalPattern ? 'Critical severity patterns detected' : 'Severity classification failed',
                details: { criticalPatterns: patterns.length }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Pattern Detection - Severity Classification',
                passed: false,
                message: `Severity classification test failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Validate training dataset generation
     */
    async validateTrainingDataset() {
        // Test 1: Training data point creation
        try {
            const patterns = react_hook_side_effect_detector_1.reactHookSideEffectDetector.getPatterns();
            if (patterns.length > 0) {
                const trainingPoint = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.createTrainingDataPoint(patterns[0]);
                this.addResult({
                    testName: 'Training Dataset - Data Point Creation',
                    passed: !!trainingPoint && trainingPoint.inputFeatures && trainingPoint.outputLabels,
                    message: trainingPoint ? 'Training data point created successfully' : 'Failed to create training data point',
                    details: {
                        hasInputFeatures: !!trainingPoint?.inputFeatures,
                        hasOutputLabels: !!trainingPoint?.outputLabels,
                        preventionStrategy: trainingPoint?.outputLabels.preventionStrategy
                    }
                });
            }
            else {
                this.addResult({
                    testName: 'Training Dataset - Data Point Creation',
                    passed: false,
                    message: 'No patterns available for training data creation',
                    details: { availablePatterns: 0 }
                });
            }
        }
        catch (error) {
            this.addResult({
                testName: 'Training Dataset - Data Point Creation',
                passed: false,
                message: `Training data creation failed: ${error}`,
                details: { error }
            });
        }
        // Test 2: Negative sample generation
        try {
            const negativeSamples = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.generateNegativeSamples(10);
            const validNegativeSamples = negativeSamples.filter(sample => sample.outputLabels.isPattern === false &&
                sample.outputLabels.severity === 'low');
            this.addResult({
                testName: 'Training Dataset - Negative Samples',
                passed: validNegativeSamples.length === 10,
                message: `Generated ${validNegativeSamples.length}/10 valid negative samples`,
                details: {
                    requested: 10,
                    generated: negativeSamples.length,
                    valid: validNegativeSamples.length
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Training Dataset - Negative Samples',
                passed: false,
                message: `Negative sample generation failed: ${error}`,
                details: { error }
            });
        }
        // Test 3: Dataset statistics
        try {
            react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.processAllPatterns();
            const statistics = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.getStatistics();
            const hasValidStats = statistics.totalSamples > 0 &&
                Object.keys(statistics.severityDistribution).length > 0;
            this.addResult({
                testName: 'Training Dataset - Statistics Generation',
                passed: hasValidStats,
                message: hasValidStats ? 'Training dataset statistics generated' : 'Statistics generation failed',
                details: {
                    totalSamples: statistics.totalSamples,
                    severityTypes: Object.keys(statistics.severityDistribution).length,
                    patternTypes: Object.keys(statistics.patternDistribution).length
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Training Dataset - Statistics Generation',
                passed: false,
                message: `Statistics generation failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Validate neural exporter functionality
     */
    async validateNeuralExporter() {
        // Test 1: Claude-flow export format
        try {
            const exportData = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.exportForClaudeFlowNeural();
            const hasRequiredFields = exportData.metadata &&
                exportData.trainingData &&
                exportData.crossValidation;
            this.addResult({
                testName: 'Neural Exporter - Claude-flow Format',
                passed: hasRequiredFields,
                message: hasRequiredFields ? 'Claude-flow export format valid' : 'Export format validation failed',
                details: {
                    hasMetadata: !!exportData.metadata,
                    hasTrainingData: !!exportData.trainingData,
                    hasCrossValidation: !!exportData.crossValidation,
                    sampleCount: exportData.metadata?.sampleCount
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Neural Exporter - Claude-flow Format',
                passed: false,
                message: `Export format validation failed: ${error}`,
                details: { error }
            });
        }
        // Test 2: File export capability
        try {
            const exportedFiles = await claude_flow_neural_exporter_1.claudeFlowNeuralExporter.exportReactHookPatterns();
            const validExports = exportedFiles.filter(file => file && file.length > 0);
            this.addResult({
                testName: 'Neural Exporter - File Export',
                passed: validExports.length >= 3, // Expect at least JSON, config, and summary files
                message: `Exported ${validExports.length} files successfully`,
                details: {
                    expectedMinFiles: 3,
                    actualFiles: validExports.length,
                    files: exportedFiles
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Neural Exporter - File Export',
                passed: false,
                message: `File export failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Validate end-to-end workflow
     */
    async validateEndToEndWorkflow() {
        try {
            const startTime = Date.now();
            // Step 1: Detect patterns
            const initialPatterns = react_hook_side_effect_detector_1.reactHookSideEffectDetector.getPatterns().length;
            // Add test patterns
            const testPattern = react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('WorkflowTestComponent', 'useWorkflowTest', {
                isRendering: true,
                hasUserAction: false,
                sideEffectType: 'rate-limiting',
                sourceLocation: { file: '/test/workflow.tsx', line: 20, column: 3 }
            });
            // Step 2: Generate training data
            react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.processAllPatterns();
            const statistics = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.getStatistics();
            // Step 3: Export for claude-flow
            const exportedFiles = await claude_flow_neural_exporter_1.claudeFlowNeuralExporter.exportReactHookPatterns();
            const endTime = Date.now();
            const workflowTime = endTime - startTime;
            const workflowSuccess = testPattern &&
                statistics.totalSamples > 0 &&
                exportedFiles.length > 0;
            this.addResult({
                testName: 'End-to-End Workflow',
                passed: workflowSuccess,
                message: workflowSuccess ? 'Complete workflow executed successfully' : 'Workflow validation failed',
                details: {
                    patternDetected: !!testPattern,
                    trainingDataGenerated: statistics.totalSamples > 0,
                    filesExported: exportedFiles.length,
                    executionTimeMs: workflowTime
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'End-to-End Workflow',
                passed: false,
                message: `End-to-end workflow failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Validate performance characteristics
     */
    async validatePerformance() {
        try {
            // Test pattern detection performance
            const detectionStartTime = Date.now();
            for (let i = 0; i < 100; i++) {
                react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('PerformanceTest', 'usePerformanceHook', {
                    isRendering: true,
                    hasUserAction: i % 10 === 0,
                    sideEffectType: 'state-mutation',
                    sourceLocation: { file: '/perf/test.tsx', line: i, column: 1 }
                });
            }
            const detectionTime = Date.now() - detectionStartTime;
            // Test training data generation performance
            const trainingStartTime = Date.now();
            react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.processAllPatterns();
            const trainingTime = Date.now() - trainingStartTime;
            // Performance thresholds (in milliseconds)
            const detectionThreshold = 1000; // 1 second for 100 detections
            const trainingThreshold = 5000; // 5 seconds for training data processing
            const performanceGood = detectionTime < detectionThreshold && trainingTime < trainingThreshold;
            this.addResult({
                testName: 'Performance Validation',
                passed: performanceGood,
                message: performanceGood ? 'Performance within acceptable limits' : 'Performance below threshold',
                details: {
                    detectionTimeMs: detectionTime,
                    trainingTimeMs: trainingTime,
                    detectionThreshold: detectionThreshold,
                    trainingThreshold: trainingThreshold,
                    detectionsPerSecond: Math.round(100 / (detectionTime / 1000))
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Performance Validation',
                passed: false,
                message: `Performance validation failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Validate real-world pattern scenarios
     */
    async validateRealWorldPatterns() {
        // Test TokenCostAnalytics pattern
        try {
            const tokenPattern = react_hook_side_effect_detector_1.reactHookSideEffectDetector.detectSideEffectPattern('TokenCostAnalytics', 'useTokenCostTracking', {
                isRendering: true,
                hasUserAction: false,
                sideEffectType: 'rate-limiting',
                sourceLocation: { file: '/components/TokenCostAnalytics.tsx', line: 96, column: 10 },
                metadata: {
                    realWorldExample: true,
                    description: 'Button disabled without user interaction due to render-cycle rate limiting'
                }
            });
            this.addResult({
                testName: 'Real-World Pattern - TokenCostAnalytics',
                passed: !!tokenPattern,
                message: tokenPattern ? 'Real-world pattern detected successfully' : 'Failed to detect known real-world pattern',
                details: {
                    patternId: tokenPattern?.id,
                    severity: tokenPattern?.severity,
                    symptom: tokenPattern?.symptom
                }
            });
        }
        catch (error) {
            this.addResult({
                testName: 'Real-World Pattern - TokenCostAnalytics',
                passed: false,
                message: `Real-world pattern validation failed: ${error}`,
                details: { error }
            });
        }
    }
    /**
     * Add validation result
     */
    addResult(result) {
        this.results.push({
            ...result,
            timestamp: new Date()
        });
    }
    /**
     * Generate comprehensive validation report
     */
    generateValidationReport() {
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = this.results.filter(r => !r.passed).length;
        const totalTests = this.results.length;
        const overallStatus = failedTests === 0 ? 'passed' :
            failedTests > totalTests / 2 ? 'failed' : 'warning';
        // Extract performance metrics
        const performanceResult = this.results.find(r => r.testName === 'Performance Validation');
        const performance = {
            detectionLatency: performanceResult?.details?.detectionTimeMs || 0,
            trainingDataGeneration: performanceResult?.details?.trainingTimeMs || 0,
            exportTime: 0 // Will be updated if available
        };
        // Generate recommendations
        const recommendations = this.generateRecommendations();
        return {
            validationTime: new Date(),
            overallStatus,
            totalTests,
            passedTests,
            failedTests,
            results: this.results,
            performance,
            recommendations
        };
    }
    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations() {
        const recommendations = [];
        const failedTests = this.results.filter(r => !r.passed);
        if (failedTests.length === 0) {
            recommendations.push('✅ All tests passed. NLD deployment is ready for production use.');
            recommendations.push('🚀 Consider enabling real-time pattern detection in development environment.');
        }
        else {
            recommendations.push(`⚠️ ${failedTests.length} tests failed. Review failures before production deployment.`);
            failedTests.forEach(test => {
                recommendations.push(`❌ ${test.testName}: ${test.message}`);
            });
        }
        const performanceResult = this.results.find(r => r.testName === 'Performance Validation');
        if (performanceResult && !performanceResult.passed) {
            recommendations.push('🐌 Performance optimization needed. Consider reducing pattern detection frequency.');
        }
        recommendations.push('📊 Monitor pattern detection accuracy in real-world usage.');
        recommendations.push('🔄 Regularly update training dataset with new pattern discoveries.');
        recommendations.push('🧪 Implement TDD tests for identified high-severity patterns.');
        return recommendations;
    }
}
exports.ReactHookNLDDeploymentValidator = ReactHookNLDDeploymentValidator;
/**
 * Run validation and export results
 */
async function runNLDValidation() {
    const validator = new ReactHookNLDDeploymentValidator();
    return await validator.validateDeployment();
}
/**
 * Export validation report for review
 */
async function exportValidationReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `/workspaces/agent-feed/src/nld/patterns/nld-validation-report-${timestamp}.json`;
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        fs.writeFileSync(filename, JSON.stringify(report, null, 2), 'utf8');
        nld_logger_1.nldLogger.renderSuccess('ReactHookNLDDeploymentValidator', 'validation-report-exported', {
            filename,
            overallStatus: report.overallStatus,
            totalTests: report.totalTests
        });
        return filename;
    }
    catch (error) {
        nld_logger_1.nldLogger.renderFailure('ReactHookNLDDeploymentValidator', error);
        throw error;
    }
}
//# sourceMappingURL=validate-react-hook-nld-deployment.js.map