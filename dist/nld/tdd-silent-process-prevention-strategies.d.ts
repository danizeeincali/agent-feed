/**
 * TDD Prevention Strategies for Silent Process Failures
 *
 * Comprehensive TDD strategies to prevent silent process failures
 * through test-driven development approaches that catch TTY requirements,
 * authentication prompts, permission issues, and environment dependencies.
 */
export interface SilentProcessTDDTestCase {
    testId: string;
    testName: string;
    category: 'unit' | 'integration' | 'contract' | 'end_to_end';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    testCode: string;
    assertionPattern: string;
    mockingStrategy?: string;
    testEnvironment: {
        requiresTTY?: boolean;
        environmentVars?: Record<string, string>;
        workingDirectory?: string;
        permissions?: string;
    };
    expectedOutcome: string;
    preventedPatterns: string[];
}
export interface SilentProcessTDDSuite {
    suiteId: string;
    suiteName: string;
    description: string;
    category: 'tty_detection' | 'auth_validation' | 'permission_checks' | 'environment_validation' | 'process_health';
    testCases: SilentProcessTDDTestCase[];
    setupRequirements: string[];
    teardownRequirements: string[];
    continuousValidation: boolean;
}
export declare class TDDSilentProcessPreventionStrategies {
    private testSuites;
    private preventionMetrics;
    constructor();
    private initializeTDDSuites;
    private addTestSuite;
    /**
     * Get all test suites
     */
    getAllTestSuites(): SilentProcessTDDSuite[];
    /**
     * Get test suite by ID
     */
    getTestSuite(suiteId: string): SilentProcessTDDSuite | undefined;
    /**
     * Get test suites by category
     */
    getTestSuitesByCategory(category: SilentProcessTDDSuite['category']): SilentProcessTDDSuite[];
    /**
     * Get critical test cases across all suites
     */
    getCriticalTestCases(): SilentProcessTDDTestCase[];
    /**
     * Generate test implementation for specific pattern
     */
    generateTestImplementation(patternId: string): {
        testCode: string;
        mockingStrategy: string;
        assertionPattern: string;
        setupRequirements: string[];
    };
    private getSetupRequirementsForTests;
    /**
     * Get TDD coverage report
     */
    getTDDCoverageReport(): {
        totalTestSuites: number;
        totalTestCases: number;
        criticalTestCases: number;
        patternsCovered: string[];
        coverageByCategory: Record<string, number>;
        recommendedTestPriority: SilentProcessTDDTestCase[];
    };
    private getAllTestCases;
    /**
     * Export TDD strategies for integration with existing systems
     */
    exportTDDStrategies(): {
        testSuites: SilentProcessTDDSuite[];
        criticalTests: SilentProcessTDDTestCase[];
        implementationGuidance: {
            setupInstructions: string[];
            integrationSteps: string[];
            continuousValidation: string[];
        };
    };
    /**
     * Record test execution results
     */
    recordTestResult(testId: string, passed: boolean, preventedPatterns?: string[]): void;
    /**
     * Get prevention metrics
     */
    getPreventionMetrics(): typeof this.preventionMetrics;
}
export declare const tddSilentProcessPrevention: TDDSilentProcessPreventionStrategies;
//# sourceMappingURL=tdd-silent-process-prevention-strategies.d.ts.map