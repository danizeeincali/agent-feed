"use strict";
/**
 * Regression Test Integration
 * Integrates NLD UI monitoring with existing regression test suite
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.regressionTestIntegration = exports.RegressionTestIntegration = void 0;
const events_1 = require("events");
const ui_regression_monitor_1 = require("./ui-regression-monitor");
const claude_functionality_validator_1 = require("./claude-functionality-validator");
const sse_streaming_guardian_1 = require("./sse-streaming-guardian");
const component_state_tracker_1 = require("./component-state-tracker");
const ui_performance_monitor_1 = require("./ui-performance-monitor");
class RegressionTestIntegration extends events_1.EventEmitter {
    testResults = new Map();
    testSuites = new Map();
    continuousTestingInterval = null;
    isIntegrated = false;
    constructor() {
        super();
        this.integrateWithNLDSystems();
        this.setupContinuousTesting();
    }
    integrateWithNLDSystems() {
        // Integrate with UI Regression Monitor
        ui_regression_monitor_1.uiRegressionMonitor.on('regression-detected', (event) => {
            this.handleRegressionDetected('UI_REGRESSION', event);
        });
        // Integrate with Claude Functionality Validator
        claude_functionality_validator_1.claudeFunctionalityValidator.on('validation-failure', (result) => {
            this.handleRegressionDetected('FUNCTIONALITY_REGRESSION', result);
        });
        claude_functionality_validator_1.claudeFunctionalityValidator.on('critical-failure', (failure) => {
            this.handleCriticalFailure('CLAUDE_FUNCTIONALITY', failure);
        });
        // Integrate with SSE Streaming Guardian
        sse_streaming_guardian_1.sseStreamingGuardian.on('streaming-alert', (event) => {
            this.handleRegressionDetected('STREAMING_REGRESSION', event);
        });
        sse_streaming_guardian_1.sseStreamingGuardian.on('ui-disruption-detected', (disruption) => {
            this.handleCriticalFailure('SSE_STREAMING', disruption);
        });
        // Integrate with Component State Tracker
        component_state_tracker_1.componentStateTracker.on('state-desync', (event) => {
            this.handleRegressionDetected('STATE_REGRESSION', event);
        });
        component_state_tracker_1.componentStateTracker.on('component-reload-needed', (component) => {
            this.handleCriticalFailure('COMPONENT_STATE', component);
        });
        // Integrate with Performance Monitor
        ui_performance_monitor_1.uiPerformanceMonitor.on('performance-issue', (event) => {
            this.handleRegressionDetected('PERFORMANCE_REGRESSION', event);
        });
        ui_performance_monitor_1.uiPerformanceMonitor.on('optimization-attempted', (result) => {
            this.handleOptimizationAttempt(result);
        });
        this.isIntegrated = true;
        console.log('[NLD] Regression test integration established');
    }
    setupContinuousTesting() {
        // Run comprehensive regression tests every 2 minutes
        this.continuousTestingInterval = setInterval(() => {
            this.runComprehensiveRegressionTest();
        }, 120000);
        // Run initial test
        setTimeout(() => {
            this.runComprehensiveRegressionTest();
        }, 5000);
        console.log('[NLD] Continuous regression testing started');
    }
    handleRegressionDetected(type, event) {
        const testResult = {
            testId: `${type}_${Date.now()}`,
            testName: `${type} Detection`,
            status: event.severity === 'CRITICAL' ? 'FAIL' : 'WARN',
            timestamp: Date.now(),
            duration: 0,
            details: {
                functionalityIssues: type === 'FUNCTIONALITY_REGRESSION' ? [event] : [],
                streamingIssues: type === 'STREAMING_REGRESSION' ? [event] : [],
                stateIssues: type === 'STATE_REGRESSION' ? [event] : [],
                performanceIssues: type === 'PERFORMANCE_REGRESSION' ? [event] : [],
                uiRegressions: type === 'UI_REGRESSION' ? [event] : []
            },
            recommendations: this.generateRecommendationsForEvent(type, event)
        };
        this.testResults.set(testResult.testId, testResult);
        this.emit('regression-test-result', testResult);
        // Auto-trigger recovery for critical failures
        if (testResult.status === 'FAIL') {
            this.triggerAutoRecovery(type, event);
        }
    }
    handleCriticalFailure(system, failure) {
        const testResult = {
            testId: `CRITICAL_${system}_${Date.now()}`,
            testName: `Critical ${system} Failure`,
            status: 'FAIL',
            timestamp: Date.now(),
            duration: 0,
            details: {
                functionalityIssues: system === 'CLAUDE_FUNCTIONALITY' ? [failure] : [],
                streamingIssues: system === 'SSE_STREAMING' ? [failure] : [],
                stateIssues: system === 'COMPONENT_STATE' ? [failure] : [],
                performanceIssues: [],
                uiRegressions: []
            },
            recommendations: [
                'CRITICAL: Immediate intervention required',
                'Consider rollback to previous working state',
                'Escalate to development team'
            ]
        };
        this.testResults.set(testResult.testId, testResult);
        this.emit('critical-failure-detected', testResult);
        console.error(`[NLD] Critical failure in ${system}:`, failure);
    }
    handleOptimizationAttempt(result) {
        const testResult = {
            testId: `OPTIMIZATION_${Date.now()}`,
            testName: 'Auto-Optimization Attempt',
            status: result.success ? 'PASS' : 'WARN',
            timestamp: Date.now(),
            duration: 0,
            details: {
                functionalityIssues: [],
                streamingIssues: [],
                stateIssues: [],
                performanceIssues: [result],
                uiRegressions: []
            },
            recommendations: result.success
                ? ['Performance optimization successful']
                : ['Manual performance tuning may be required', 'Review optimization logs']
        };
        this.testResults.set(testResult.testId, testResult);
        this.emit('optimization-result', testResult);
    }
    async runComprehensiveRegressionTest() {
        const startTime = Date.now();
        console.log('[NLD] Running comprehensive regression test suite');
        const testSuite = {
            name: `UI_MODERNIZATION_REGRESSION_${startTime}`,
            tests: [],
            overallStatus: 'PASS',
            executionTime: 0,
            coverage: {
                functionality: 0,
                streaming: 0,
                state: 0,
                performance: 0,
                ui: 0
            }
        };
        // Test 1: Claude Functionality Validation
        const functionalityTest = await this.runClaudeFunctionalityTest();
        testSuite.tests.push(functionalityTest);
        testSuite.coverage.functionality = this.calculateFunctionalityCoverage();
        // Test 2: SSE Streaming Health Check
        const streamingTest = await this.runSSEStreamingTest();
        testSuite.tests.push(streamingTest);
        testSuite.coverage.streaming = this.calculateStreamingCoverage();
        // Test 3: Component State Consistency Check
        const stateTest = await this.runComponentStateTest();
        testSuite.tests.push(stateTest);
        testSuite.coverage.state = this.calculateStateCoverage();
        // Test 4: Performance Regression Check
        const performanceTest = await this.runPerformanceTest();
        testSuite.tests.push(performanceTest);
        testSuite.coverage.performance = this.calculatePerformanceCoverage();
        // Test 5: UI Regression Detection
        const uiTest = await this.runUIRegressionTest();
        testSuite.tests.push(uiTest);
        testSuite.coverage.ui = this.calculateUICoverage();
        // Calculate overall status
        const failedTests = testSuite.tests.filter(t => t.status === 'FAIL');
        const warnTests = testSuite.tests.filter(t => t.status === 'WARN');
        if (failedTests.length > 0) {
            testSuite.overallStatus = 'FAIL';
        }
        else if (warnTests.length > 0) {
            testSuite.overallStatus = 'WARN';
        }
        testSuite.executionTime = Date.now() - startTime;
        // Store test suite
        this.testSuites.set(testSuite.name, testSuite);
        console.log(`[NLD] Regression test suite completed: ${testSuite.overallStatus} (${testSuite.executionTime}ms)`);
        this.emit('test-suite-complete', testSuite);
        return testSuite;
    }
    async runClaudeFunctionalityTest() {
        const startTime = Date.now();
        try {
            const functionality = await claude_functionality_validator_1.claudeFunctionalityValidator.runFullValidation();
            const criticalFailures = claude_functionality_validator_1.claudeFunctionalityValidator.getCriticalFailures();
            return {
                testId: `FUNCTIONALITY_${Date.now()}`,
                testName: 'Claude Functionality Validation',
                status: criticalFailures.length > 0 ? 'FAIL' : 'PASS',
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                details: {
                    functionalityIssues: criticalFailures.map(failure => ({ type: failure, critical: true })),
                    streamingIssues: [],
                    stateIssues: [],
                    performanceIssues: [],
                    uiRegressions: []
                },
                recommendations: criticalFailures.length > 0
                    ? ['Restore Claude functionality immediately', 'Check button handlers and process spawning']
                    : ['Claude functionality operating normally']
            };
        }
        catch (error) {
            return {
                testId: `FUNCTIONALITY_ERROR_${Date.now()}`,
                testName: 'Claude Functionality Validation',
                status: 'FAIL',
                timestamp: Date.now(),
                duration: Date.now() - startTime,
                details: {
                    functionalityIssues: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
                    streamingIssues: [],
                    stateIssues: [],
                    performanceIssues: [],
                    uiRegressions: []
                },
                recommendations: ['Fix Claude functionality validation system', 'Check system integration']
            };
        }
    }
    async runSSEStreamingTest() {
        const startTime = Date.now();
        const streamingHealth = sse_streaming_guardian_1.sseStreamingGuardian.getStreamingHealth();
        const recentEvents = sse_streaming_guardian_1.sseStreamingGuardian.getRecentEvents(10);
        const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL');
        return {
            testId: `STREAMING_${Date.now()}`,
            testName: 'SSE Streaming Health Check',
            status: criticalEvents.length > 0 ? 'FAIL' : streamingHealth.size > 0 ? 'PASS' : 'WARN',
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            details: {
                functionalityIssues: [],
                streamingIssues: recentEvents,
                stateIssues: [],
                performanceIssues: [],
                uiRegressions: []
            },
            recommendations: criticalEvents.length > 0
                ? ['Fix SSE streaming disruptions', 'Check connection stability']
                : streamingHealth.size === 0
                    ? ['No active SSE connections - verify connection establishment']
                    : ['SSE streaming operating normally']
        };
    }
    async runComponentStateTest() {
        const startTime = Date.now();
        const componentStates = component_state_tracker_1.componentStateTracker.getComponentStates();
        const desyncEvents = component_state_tracker_1.componentStateTracker.getDesyncEvents(20);
        const criticalEvents = desyncEvents.filter(e => e.severity === 'CRITICAL');
        return {
            testId: `STATE_${Date.now()}`,
            testName: 'Component State Consistency Check',
            status: criticalEvents.length > 0 ? 'FAIL' : desyncEvents.length > 10 ? 'WARN' : 'PASS',
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            details: {
                functionalityIssues: [],
                streamingIssues: [],
                stateIssues: desyncEvents,
                performanceIssues: [],
                uiRegressions: []
            },
            recommendations: criticalEvents.length > 0
                ? ['Fix critical component state issues', 'Review hook usage patterns']
                : desyncEvents.length > 10
                    ? ['High number of state inconsistencies detected', 'Review state management']
                    : ['Component state synchronization normal']
        };
    }
    async runPerformanceTest() {
        const startTime = Date.now();
        const currentMetrics = ui_performance_monitor_1.uiPerformanceMonitor.getCurrentMetrics();
        const performanceEvents = ui_performance_monitor_1.uiPerformanceMonitor.getPerformanceEvents(10);
        const degradation = ui_performance_monitor_1.uiPerformanceMonitor.getPerformanceDegradation();
        const criticalEvents = performanceEvents.filter(e => e.severity === 'CRITICAL');
        return {
            testId: `PERFORMANCE_${Date.now()}`,
            testName: 'UI Performance Regression Check',
            status: criticalEvents.length > 0 ? 'FAIL' : degradation ? 'WARN' : 'PASS',
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            details: {
                functionalityIssues: [],
                streamingIssues: [],
                stateIssues: [],
                performanceIssues: performanceEvents,
                uiRegressions: []
            },
            recommendations: criticalEvents.length > 0
                ? ['Address critical performance issues immediately', 'Consider performance optimization']
                : degradation
                    ? ['Performance degradation detected', 'Monitor for further regression']
                    : ['UI performance within acceptable limits']
        };
    }
    async runUIRegressionTest() {
        const startTime = Date.now();
        const regressionHistory = ui_regression_monitor_1.uiRegressionMonitor.getRegressionHistory();
        const recentRegressions = regressionHistory.slice(-10);
        const criticalRegressions = recentRegressions.filter(r => r.pattern.severity === 'CRITICAL');
        return {
            testId: `UI_REGRESSION_${Date.now()}`,
            testName: 'UI Modernization Regression Check',
            status: criticalRegressions.length > 0 ? 'FAIL' : recentRegressions.length > 5 ? 'WARN' : 'PASS',
            timestamp: Date.now(),
            duration: Date.now() - startTime,
            details: {
                functionalityIssues: [],
                streamingIssues: [],
                stateIssues: [],
                performanceIssues: [],
                uiRegressions: recentRegressions
            },
            recommendations: criticalRegressions.length > 0
                ? ['Roll back UI changes that broke functionality', 'Restore working state']
                : recentRegressions.length > 5
                    ? ['Multiple UI regressions detected', 'Review UI modernization approach']
                    : ['UI modernization not causing regressions']
        };
    }
    calculateFunctionalityCoverage() {
        const validationHistory = claude_functionality_validator_1.claudeFunctionalityValidator.getValidationHistory();
        const recentValidations = validationHistory.slice(-10);
        const passedValidations = recentValidations.filter(v => v.passed).length;
        return recentValidations.length > 0 ? (passedValidations / recentValidations.length) * 100 : 0;
    }
    calculateStreamingCoverage() {
        const activeConnections = sse_streaming_guardian_1.sseStreamingGuardian.getActiveConnections();
        const streamingHealth = sse_streaming_guardian_1.sseStreamingGuardian.getStreamingHealth();
        const healthyConnections = Array.from(streamingHealth.values())
            .filter(health => health.isConnected && health.errorCount < 5).length;
        return activeConnections.length > 0 ? (healthyConnections / activeConnections.length) * 100 : 0;
    }
    calculateStateCoverage() {
        const componentStates = component_state_tracker_1.componentStateTracker.getComponentStates();
        const desyncEvents = component_state_tracker_1.componentStateTracker.getDesyncEvents(50);
        const componentsWithIssues = new Set(desyncEvents.map(e => e.componentId)).size;
        const totalComponents = componentStates.size;
        return totalComponents > 0 ? ((totalComponents - componentsWithIssues) / totalComponents) * 100 : 100;
    }
    calculatePerformanceCoverage() {
        const currentMetrics = ui_performance_monitor_1.uiPerformanceMonitor.getCurrentMetrics();
        const performanceEvents = ui_performance_monitor_1.uiPerformanceMonitor.getPerformanceEvents(20);
        const criticalEvents = performanceEvents.filter(e => e.severity === 'CRITICAL').length;
        return criticalEvents === 0 ? 100 : Math.max(0, 100 - (criticalEvents * 20));
    }
    calculateUICoverage() {
        const regressionHistory = ui_regression_monitor_1.uiRegressionMonitor.getRegressionHistory();
        const recentRegressions = regressionHistory.slice(-20);
        const criticalRegressions = recentRegressions.filter(r => r.pattern.severity === 'CRITICAL').length;
        return criticalRegressions === 0 ? 100 : Math.max(0, 100 - (criticalRegressions * 10));
    }
    generateRecommendationsForEvent(type, event) {
        const recommendations = [];
        switch (type) {
            case 'FUNCTIONALITY_REGRESSION':
                recommendations.push('Restore Claude button handlers');
                recommendations.push('Verify process spawning mechanisms');
                break;
            case 'STREAMING_REGRESSION':
                recommendations.push('Check SSE connection stability');
                recommendations.push('Verify streaming endpoints');
                break;
            case 'STATE_REGRESSION':
                recommendations.push('Review component state management');
                recommendations.push('Check for hook rule violations');
                break;
            case 'PERFORMANCE_REGRESSION':
                recommendations.push('Optimize render performance');
                recommendations.push('Review memory usage patterns');
                break;
            case 'UI_REGRESSION':
                recommendations.push('Review recent UI changes');
                recommendations.push('Consider rollback to working state');
                break;
        }
        if (event.severity === 'CRITICAL') {
            recommendations.unshift('CRITICAL: Immediate attention required');
        }
        return recommendations;
    }
    async triggerAutoRecovery(type, event) {
        console.log(`[NLD] Triggering auto-recovery for ${type}`);
        try {
            switch (type) {
                case 'FUNCTIONALITY_REGRESSION':
                    await claude_functionality_validator_1.claudeFunctionalityValidator.repairClaudeFunctionality();
                    break;
                case 'STREAMING_REGRESSION':
                    await sse_streaming_guardian_1.sseStreamingGuardian.attemptStreamingRecovery(event.instanceId || 'unknown');
                    break;
                case 'UI_REGRESSION':
                    // Trigger UI regression recovery
                    ui_regression_monitor_1.uiRegressionMonitor.emit('auto-recovery-requested', event);
                    break;
            }
            this.emit('auto-recovery-attempted', { type, success: true });
        }
        catch (error) {
            this.emit('auto-recovery-attempted', { type, success: false, error });
            console.error(`[NLD] Auto-recovery failed for ${type}:`, error);
        }
    }
    getTestResults() {
        return new Map(this.testResults);
    }
    getTestSuites() {
        return new Map(this.testSuites);
    }
    getLatestTestSuite() {
        const suites = Array.from(this.testSuites.values());
        return suites.length > 0 ? suites[suites.length - 1] : null;
    }
    generateRegressionReport() {
        const latestSuite = this.getLatestTestSuite();
        if (!latestSuite)
            return 'No regression tests have been run yet.';
        const failedTests = latestSuite.tests.filter(t => t.status === 'FAIL');
        const warnTests = latestSuite.tests.filter(t => t.status === 'WARN');
        const passedTests = latestSuite.tests.filter(t => t.status === 'PASS');
        return `
Regression Test Integration Report
=================================

Latest Test Suite: ${latestSuite.name}
Overall Status: ${latestSuite.overallStatus}
Execution Time: ${latestSuite.executionTime}ms

Test Results Summary:
- Passed: ${passedTests.length}
- Warnings: ${warnTests.length}
- Failed: ${failedTests.length}

Coverage Analysis:
- Functionality: ${latestSuite.coverage.functionality.toFixed(1)}%
- Streaming: ${latestSuite.coverage.streaming.toFixed(1)}%
- State: ${latestSuite.coverage.state.toFixed(1)}%
- Performance: ${latestSuite.coverage.performance.toFixed(1)}%
- UI: ${latestSuite.coverage.ui.toFixed(1)}%

Failed Tests:
${failedTests.map(test => `- ${test.testName}: ${test.details.functionalityIssues.length + test.details.streamingIssues.length + test.details.stateIssues.length + test.details.performanceIssues.length + test.details.uiRegressions.length} issues`).join('\n') || 'None'}

Critical Recommendations:
${failedTests.length > 0
            ? failedTests.flatMap(test => test.recommendations).slice(0, 5).join('\n- ')
            : '✅ All regression tests passing'}

Integration Status: ${this.isIntegrated ? 'Active' : 'Inactive'}
Continuous Testing: ${this.continuousTestingInterval ? 'Enabled' : 'Disabled'}
`;
    }
    destroy() {
        // Stop continuous testing
        if (this.continuousTestingInterval) {
            clearInterval(this.continuousTestingInterval);
            this.continuousTestingInterval = null;
        }
        // Clear data
        this.testResults.clear();
        this.testSuites.clear();
        // Remove event listeners
        this.removeAllListeners();
        this.isIntegrated = false;
        console.log('[NLD] Regression test integration destroyed');
    }
}
exports.RegressionTestIntegration = RegressionTestIntegration;
exports.regressionTestIntegration = new RegressionTestIntegration();
//# sourceMappingURL=regression-test-integration.js.map