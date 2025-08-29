/**
 * Network TDD Prevention Strategies - NLD System
 *
 * Comprehensive TDD (Test-Driven Development) prevention strategies
 * specifically designed for network failure patterns and anti-patterns.
 */
export interface TDDPreventionStrategy {
    id: string;
    name: string;
    targetPatterns: string[];
    phase: 'DESIGN' | 'DEVELOPMENT' | 'TESTING' | 'DEPLOYMENT' | 'MONITORING';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    testApproach: {
        methodology: 'London School' | 'Classical' | 'Hybrid' | 'Property-Based';
        testTypes: string[];
        testLevels: string[];
        toolRecommendations: string[];
    };
    implementation: {
        setupSteps: string[];
        testStructure: string;
        mockingStrategy: string;
        assertionPatterns: string[];
        cicdIntegration: string[];
    };
    examples: Array<{
        scenario: string;
        testCode: string;
        explanation: string;
        expectedOutcome: string;
    }>;
    metrics: {
        preventionEffectiveness: number;
        implementationComplexity: number;
        maintenanceOverhead: number;
        detectionSpeed: number;
    };
    relatedStrategies: string[];
}
export interface TDDTestSuite {
    suiteId: string;
    name: string;
    targetPatterns: string[];
    tests: Array<{
        testId: string;
        name: string;
        type: 'unit' | 'integration' | 'contract' | 'performance' | 'chaos';
        code: string;
        mocks: string[];
        assertions: string[];
        expectedBehavior: string;
    }>;
    coverage: {
        patterns: number;
        scenarios: number;
        edgeCases: number;
    };
    runFrequency: 'commit' | 'push' | 'daily' | 'release';
    dependencies: string[];
}
export declare class NetworkTDDPreventionStrategies {
    private strategies;
    private testSuites;
    private implementationTracker;
    private effectivenessMetrics;
    constructor();
    private initializePreventionStrategies;
    private addPollingStormPreventionStrategy;
    private addDataOverfetchPreventionStrategy;
    private addConnectionLeakPreventionStrategy;
    private addRetryStormPreventionStrategy;
    private addCircuitBreakerPreventionStrategy;
    private initializeTestSuites;
    private initializeMetricsTracking;
    private addPreventionStrategy;
    private addTestSuite;
    private updateEffectivenessMetrics;
    private calculatePreventionRate;
    private calculateDetectionAccuracy;
    private trackImplementationProgress;
    private getTestResults;
    private generateRecommendations;
    getStrategy(id: string): TDDPreventionStrategy | undefined;
    getStrategiesForPattern(patternId: string): TDDPreventionStrategy[];
    getStrategiesByPhase(phase: TDDPreventionStrategy['phase']): TDDPreventionStrategy[];
    getStrategiesByPriority(priority: TDDPreventionStrategy['priority']): TDDPreventionStrategy[];
    getImplementationPlan(patternIds: string[]): any;
    private generateImplementationOrder;
    private calculateImplementationEffort;
    private generateExpectedOutcomes;
    private calculateRiskReduction;
    generateTestCode(strategyId: string, scenario: string): string;
    getEffectivenessMetrics(): any;
    exportForNeuralTraining(): any;
}
//# sourceMappingURL=network-tdd-prevention-strategies.d.ts.map