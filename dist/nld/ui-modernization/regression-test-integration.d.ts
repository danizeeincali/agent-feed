/**
 * Regression Test Integration
 * Integrates NLD UI monitoring with existing regression test suite
 */
import { EventEmitter } from 'events';
import { UIRegressionEvent } from './ui-regression-monitor';
export interface RegressionTestResult {
    testId: string;
    testName: string;
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    timestamp: number;
    duration: number;
    details: {
        functionalityIssues: any[];
        streamingIssues: any[];
        stateIssues: any[];
        performanceIssues: any[];
        uiRegressions: UIRegressionEvent[];
    };
    recommendations: string[];
}
export interface TestSuite {
    name: string;
    tests: RegressionTestResult[];
    overallStatus: 'PASS' | 'FAIL' | 'WARN';
    executionTime: number;
    coverage: {
        functionality: number;
        streaming: number;
        state: number;
        performance: number;
        ui: number;
    };
}
export declare class RegressionTestIntegration extends EventEmitter {
    private testResults;
    private testSuites;
    private continuousTestingInterval;
    private isIntegrated;
    constructor();
    private integrateWithNLDSystems;
    private setupContinuousTesting;
    private handleRegressionDetected;
    private handleCriticalFailure;
    private handleOptimizationAttempt;
    runComprehensiveRegressionTest(): Promise<TestSuite>;
    private runClaudeFunctionalityTest;
    private runSSEStreamingTest;
    private runComponentStateTest;
    private runPerformanceTest;
    private runUIRegressionTest;
    private calculateFunctionalityCoverage;
    private calculateStreamingCoverage;
    private calculateStateCoverage;
    private calculatePerformanceCoverage;
    private calculateUICoverage;
    private generateRecommendationsForEvent;
    private triggerAutoRecovery;
    getTestResults(): Map<string, RegressionTestResult>;
    getTestSuites(): Map<string, TestSuite>;
    getLatestTestSuite(): TestSuite | null;
    generateRegressionReport(): string;
    destroy(): void;
}
export declare const regressionTestIntegration: RegressionTestIntegration;
//# sourceMappingURL=regression-test-integration.d.ts.map