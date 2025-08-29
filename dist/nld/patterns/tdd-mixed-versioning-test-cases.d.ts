/**
 * TDD Test Cases for Mixed API Versioning Prevention
 *
 * These test cases are generated based on real detected patterns
 * and provide comprehensive coverage for preventing mixed versioning
 * anti-patterns in API endpoint usage.
 */
export interface TDDTestCase {
    testName: string;
    description: string;
    testCode: string;
    expectedBehavior: string;
    preventionStrategy: string;
}
export declare class MixedVersioningTDDTestCases {
    private readonly testCasesPath;
    constructor();
    /**
     * Generate comprehensive TDD test cases
     */
    generateTDDTestCases(): Promise<TDDTestCase[]>;
    /**
     * Generate test suite summary
     */
    generateTestSuiteSummary(testCases: TDDTestCase[]): Promise<void>;
}
export default MixedVersioningTDDTestCases;
//# sourceMappingURL=tdd-mixed-versioning-test-cases.d.ts.map