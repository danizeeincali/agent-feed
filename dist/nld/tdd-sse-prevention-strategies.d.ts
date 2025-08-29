/**
 * TDD Prevention Strategies for SSE Streaming Issues
 * Test-driven development patterns to prevent SSE buffer accumulation anti-patterns
 * Part of NLD (Neuro-Learning Development) system
 */
export interface TDDSSETestSuite {
    name: string;
    category: 'connection_establishment' | 'state_synchronization' | 'failure_recovery' | 'ui_integration' | 'performance';
    priority: 'critical' | 'high' | 'medium' | 'low';
    testCases: TDDSSETestCase[];
    mockingStrategy: MockingStrategy;
    assertionPatterns: AssertionPattern[];
    preventedAntiPatterns: string[];
}
export interface TDDSSETestCase {
    name: string;
    description: string;
    given: string;
    when: string;
    then: string;
    code: string;
    mocks: string[];
    assertions: string[];
    edgeCases: string[];
}
export interface MockingStrategy {
    eventSourceMocks: string[];
    backendResponseMocks: string[];
    networkConditionMocks: string[];
    timingMocks: string[];
}
export interface AssertionPattern {
    pattern: string;
    description: string;
    code: string;
    failureMessage: string;
}
export declare class TDDSSEPreventionStrategies {
    private testSuites;
    /**
     * Get all TDD test suites for SSE prevention
     */
    getAllTestSuites(): TDDSSETestSuite[];
    /**
     * Get test suites by category
     */
    getTestSuitesByCategory(category: TDDSSETestSuite['category']): TDDSSETestSuite[];
    /**
     * Get test suites by priority
     */
    getTestSuitesByPriority(priority: TDDSSETestSuite['priority']): TDDSSETestSuite[];
    /**
     * Get test suites that prevent specific anti-patterns
     */
    getTestSuitesForAntiPattern(antiPatternId: string): TDDSSETestSuite[];
    /**
     * Generate complete test implementation for a test suite
     */
    generateTestImplementation(suiteId: string): string;
    /**
     * Generate mocking utilities for SSE testing
     */
    generateMockingUtilities(): string;
    /**
     * Generate implementation checklist for TDD SSE prevention
     */
    generateImplementationChecklist(): {
        critical: string[];
        high: string[];
        medium: string[];
        low: string[];
    };
    /**
     * Generate performance benchmarks for SSE connections
     */
    generatePerformanceBenchmarks(): string;
}
//# sourceMappingURL=tdd-sse-prevention-strategies.d.ts.map