/**
 * Working Directory TDD Prevention Strategies
 * Comprehensive TDD test patterns to prevent directory spawning failures
 * and hardcoded configuration anti-patterns
 */
export interface TDDPreventionStrategy {
    strategyId: string;
    name: string;
    category: string;
    description: string;
    targetAntiPattern: string;
    testPattern: string;
    implementationGuidance: string;
    exampleCode: {
        testCode: string;
        implementationCode: string;
    };
    preventionLevel: 'unit' | 'integration' | 'e2e';
    effectiveness: number;
}
export declare class WorkingDirectoryTDDPreventionStrategies {
    private strategies;
    constructor();
    /**
     * Initialize comprehensive TDD prevention strategies
     */
    private initializeStrategies;
    /**
     * Get prevention strategies by category
     */
    getStrategiesByCategory(category: string): TDDPreventionStrategy[];
    /**
     * Get strategies by prevention level
     */
    getStrategiesByLevel(level: 'unit' | 'integration' | 'e2e'): TDDPreventionStrategy[];
    /**
     * Get high-effectiveness strategies
     */
    getHighEffectivenessStrategies(threshold?: number): TDDPreventionStrategy[];
    /**
     * Generate complete TDD test suite for working directory prevention
     */
    generateCompleteTDDTestSuite(): {
        testSuiteCode: string;
        implementationCode: string;
        setupInstructions: string[];
    };
    /**
     * Export strategies for external analysis
     */
    exportStrategiesForTraining(): Promise<{
        strategies: TDDPreventionStrategy[];
        summary: {
            totalStrategies: number;
            categoryBreakdown: Record<string, number>;
            levelBreakdown: Record<string, number>;
            averageEffectiveness: number;
        };
        exportPath: string;
    }>;
    /**
     * Get all strategies
     */
    getAllStrategies(): TDDPreventionStrategy[];
    /**
     * Get strategy by ID
     */
    getStrategyById(strategyId: string): TDDPreventionStrategy | undefined;
}
//# sourceMappingURL=working-directory-tdd-prevention-strategies.d.ts.map