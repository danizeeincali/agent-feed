/**
 * TDD Terminal Prevention Strategies
 *
 * Provides comprehensive TDD strategies to prevent terminal pipe failures
 * Based on real failure patterns detected by NLD system
 * Generates actionable test patterns for London School TDD approach
 */
interface TDDPreventionStrategy {
    id: string;
    name: string;
    targetFailurePattern: string;
    category: 'unit' | 'integration' | 'contract' | 'e2e' | 'property';
    priority: 'low' | 'medium' | 'high' | 'critical';
    testPattern: {
        description: string;
        testCode: string;
        mockingStrategy: string;
        assertions: string[];
    };
    londonSchoolPrinciples: {
        outsideInApproach: string;
        mockingDoubles: string[];
        behaviorVerification: string[];
    };
    preventionEffectiveness: number;
    implementationGuide: string[];
    realWorldScenarios: Array<{
        scenario: string;
        testCase: string;
        expectedPrevention: string;
    }>;
}
export declare class TDDTerminalPreventionStrategies {
    private options;
    private strategies;
    private effectivenessTracking;
    constructor(options?: {
        logDirectory: string;
        generateTestFiles: boolean;
    });
    /**
     * Initialize comprehensive TDD prevention strategies
     */
    private initializePreventionStrategies;
    /**
     * Add a prevention strategy
     */
    private addStrategy;
    /**
     * Get prevention strategies for specific failure pattern
     */
    getStrategiesForFailure(failurePattern: string): TDDPreventionStrategy[];
    /**
     * Generate test code for failure prevention
     */
    generateTestCode(failurePattern: string): string;
    /**
     * Generate complete test file for terminal pipe failure prevention
     */
    generateCompleteTestFile(): string;
    /**
     * Track prevention effectiveness
     */
    trackEffectiveness(strategyId: string, prevented: boolean): void;
    /**
     * Get effectiveness statistics
     */
    getEffectivenessStats(): {
        byStrategy: Record<string, {
            name: string;
            theoreticalEffectiveness: number;
            measuredEffectiveness: number;
            sampleSize: number;
        }>;
        overallEffectiveness: number;
    };
    /**
     * Export strategies for neural training
     */
    exportForNeuralTraining(): void;
    /**
     * Get all strategies
     */
    getAllStrategies(): TDDPreventionStrategy[];
    /**
     * Get strategy by ID
     */
    getStrategy(id: string): TDDPreventionStrategy | undefined;
}
export {};
//# sourceMappingURL=tdd-terminal-prevention-strategies.d.ts.map