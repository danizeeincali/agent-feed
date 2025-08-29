/**
 * Claude Process I/O TDD Prevention Strategies - NLD System
 *
 * Test-Driven Development prevention strategies specifically for Claude CLI
 * process I/O failures, using London School TDD methodology.
 */
export interface ClaudeProcessIOTDDTestCase {
    testId: string;
    category: 'PRINT_FLAG_INPUT_REQUIRED' | 'INTERACTIVE_MODE_BLOCKED' | 'PTY_STDIN_DISCONNECT' | 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT';
    description: string;
    scenario: string;
    expectedBehavior: string;
    testImplementation: {
        setup: string[];
        execution: string[];
        assertions: string[];
        teardown: string[];
    };
    mockingStrategy: {
        collaborators: string[];
        mockSetup: string[];
        expectations: string[];
    };
    preventionLevel: 'unit' | 'integration' | 'contract' | 'end-to-end';
    priority: 'critical' | 'high' | 'medium' | 'low';
}
export interface ClaudeProcessIOTDDSuite {
    suiteId: string;
    category: ClaudeProcessIOTDDTestCase['category'];
    testCases: ClaudeProcessIOTDDTestCase[];
    coverage: {
        pathsCovered: string[];
        failureScenarios: string[];
        recoveryStrategies: string[];
    };
    londonSchoolPatterns: {
        collaboratorInteractions: string[];
        behaviorVerification: string[];
        outsideInDesign: string[];
    };
}
export declare class ClaudeProcessIOTDDPreventionStrategies {
    private testSuites;
    constructor();
    private initializeTDDSuites;
    private createPrintFlagInputRequiredSuite;
    private createInteractiveModeBlockedSuite;
    private createPTYStdinDisconnectSuite;
    private createAuthSuccessNoOutputSuite;
    getTestSuite(category: ClaudeProcessIOTDDTestCase['category']): ClaudeProcessIOTDDSuite | undefined;
    getAllTestSuites(): ClaudeProcessIOTDDSuite[];
    generateTestImplementation(testCase: ClaudeProcessIOTDDTestCase): string;
    generateFullTestSuite(category: ClaudeProcessIOTDDTestCase['category']): string;
    private getCategoryToSuiteId;
    generateCoverageReport(): {
        totalTestCases: number;
        testsByCategory: Record<string, number>;
        testsByPriority: Record<string, number>;
        testsByLevel: Record<string, number>;
        coverageByCategory: Record<string, {
            pathsCovered: number;
            failureScenarios: number;
            recoveryStrategies: number;
        }>;
    };
}
export declare const claudeProcessIOTDDPrevention: ClaudeProcessIOTDDPreventionStrategies;
//# sourceMappingURL=claude-process-io-tdd-prevention-strategies.d.ts.map