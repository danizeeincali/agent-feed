/**
 * TDD Prevention Strategies for NLD System
 *
 * Generates specific TDD patterns and test strategies to prevent
 * the types of failures captured by NLD pattern detection.
 */
export interface TDDStrategy {
    id: string;
    name: string;
    description: string;
    category: 'UNIT' | 'INTEGRATION' | 'E2E' | 'CONTRACT' | 'PROPERTY';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    testPattern: {
        framework: string;
        setup: string;
        testCase: string;
        assertion: string;
    };
    preventedFailures: string[];
    codeExample: string;
    realWorldScenario: string;
}
export declare class TDDPreventionStrategies {
    private strategies;
    constructor();
    /**
     * Initialize TDD prevention strategies
     */
    private initializeStrategies;
    /**
     * Add a new TDD strategy
     */
    addStrategy(strategy: TDDStrategy): void;
    /**
     * Get prevention strategies for specific failure patterns
     */
    getStrategiesForFailure(failureType: string): TDDStrategy[];
    /**
     * Generate comprehensive TDD prevention plan
     */
    generatePreventionPlan(detectedPatterns: string[]): any;
    /**
     * Get priority value for sorting
     */
    private getPriorityValue;
    /**
     * Get recommended implementation order
     */
    private getImplementationOrder;
    /**
     * Estimate implementation effort
     */
    private estimateEffort;
    /**
     * Calculate what percentage of failures would be prevented
     */
    private calculatePreventionCoverage;
    /**
     * Export strategies for training data
     */
    exportStrategies(): any;
    private getStrategiesByCategory;
    private getStrategiesByPriority;
}
export declare const tddPreventionStrategies: TDDPreventionStrategies;
//# sourceMappingURL=tdd-prevention-strategies.d.ts.map