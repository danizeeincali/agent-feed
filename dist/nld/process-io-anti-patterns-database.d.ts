/**
 * NLD Process I/O Capture Anti-Patterns Database
 * Captures failure patterns in stdout/stderr event handling for Claude processes
 * Generated: 2025-08-27
 */
export interface ProcessIOFailurePattern {
    patternId: string;
    patternName: string;
    description: string;
    failureSymptoms: string[];
    rootCauseAnalysis: string;
    commonTriggers: string[];
    detectionSignatures: string[];
    impactAssessment: {
        severity: 'critical' | 'high' | 'medium' | 'low';
        userExperience: string;
        businessImpact: string;
    };
    tddPreventionStrategy: string;
    realWorldExample: {
        file: string;
        lineNumbers: number[];
        codeSnippet: string;
        actualBehavior: string;
        expectedBehavior: string;
    };
}
export declare class ProcessIOAntiPatternsDatabase {
    private patterns;
    constructor();
    private initializePatterns;
    getAllPatterns(): ProcessIOFailurePattern[];
    getPatternById(patternId: string): ProcessIOFailurePattern | undefined;
    getPatternsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): ProcessIOFailurePattern[];
    searchPatterns(query: string): ProcessIOFailurePattern[];
    recordNewPattern(pattern: ProcessIOFailurePattern): void;
    generatePreventionReport(): {
        totalPatterns: number;
        criticalPatterns: number;
        tddCoverage: number;
        recommendations: string[];
    };
}
//# sourceMappingURL=process-io-anti-patterns-database.d.ts.map