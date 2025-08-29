/**
 * TDD Prevention Strategies for Process I/O Capture Failures
 * Comprehensive testing patterns to prevent stdout/stderr capture failures
 * Generated: 2025-08-27
 */
export interface TDDTestPattern {
    testId: string;
    testName: string;
    description: string;
    preventedFailures: string[];
    testImplementation: string;
    assertions: string[];
    mockingStrategy: string;
    expectedBehavior: string;
    timeoutThreshold: number;
    testCategory: 'unit' | 'integration' | 'end-to-end';
}
export declare class TDDProcessIOPreventionStrategies {
    private testPatterns;
    constructor();
    private initializeTestPatterns;
    getAllTestPatterns(): TDDTestPattern[];
    getTestPatternById(testId: string): TDDTestPattern | undefined;
    getTestPatternsByCategory(category: 'unit' | 'integration' | 'end-to-end'): TDDTestPattern[];
    getTestPatternsForFailure(failurePatternId: string): TDDTestPattern[];
    generateTestSuite(): string;
    generateMockHelpers(): string;
    generatePreventionReport(): {
        totalTests: number;
        testsByCategory: Record<string, number>;
        coverageByFailure: Record<string, number>;
        recommendations: string[];
    };
}
//# sourceMappingURL=tdd-process-io-prevention-strategies.d.ts.map