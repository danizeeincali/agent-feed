/**
 * Silent Process Anti-Patterns Database
 *
 * Comprehensive database of anti-patterns for processes that spawn successfully
 * but produce no output due to TTY requirements, authentication prompts,
 * permission issues, or environment problems.
 *
 * This database complements the existing NLD system with patterns specific
 * to silent process failures.
 */
export interface SilentProcessAntiPattern {
    patternId: string;
    patternName: string;
    category: 'tty_requirement' | 'authentication' | 'permissions' | 'environment' | 'binary_issues' | 'resource_limits';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    detectionCriteria: {
        processSpawns: boolean;
        validPID: boolean;
        stdioConfigured: boolean;
        inputForwardingWorks: boolean;
        noStdoutOutput: boolean;
        noStderrOutput: boolean;
        processStillRunning: boolean;
        silentDurationMs: number;
    };
    commonSymptoms: string[];
    rootCauses: string[];
    affectedCommands: string[];
    diagnosticSteps: string[];
    preventionStrategies: string[];
    recoveryActions: string[];
    tddPreventionTests: string[];
    realWorldExamples: Array<{
        scenario: string;
        command: string;
        environment: string;
        expectedBehavior: string;
        actualBehavior: string;
        userImpact: string;
        solution: string;
    }>;
    neuralFeatures: Record<string, any>;
    detectionConfidence: number;
}
export declare class SilentProcessAntiPatternsDatabase {
    private patterns;
    private patternFrequency;
    private detectionHistory;
    constructor();
    private initializeAntiPatterns;
    private addPattern;
    /**
     * Detect anti-patterns in process behavior
     */
    detectAntiPatterns(processInfo: {
        command: string;
        pid?: number;
        exitCode?: number;
        silentDuration: number;
        stdoutReceived: boolean;
        stderrReceived: boolean;
        inputSent: boolean;
        stillRunning: boolean;
    }, context?: any): Array<{
        pattern: SilentProcessAntiPattern;
        confidence: number;
        matchedCriteria: string[];
    }>;
    private evaluatePattern;
    private calculatePatternSpecificConfidence;
    getPattern(patternId: string): SilentProcessAntiPattern | undefined;
    getPatternsByCategory(category: SilentProcessAntiPattern['category']): SilentProcessAntiPattern[];
    getPatternsBySeverity(severity: SilentProcessAntiPattern['severity']): SilentProcessAntiPattern[];
    getAllPatterns(): SilentProcessAntiPattern[];
    recordPatternDetection(patternId: string, instanceId: string, confidence: number): void;
    generateStatisticsReport(): {
        totalPatterns: number;
        byCategory: Record<string, number>;
        bySeverity: Record<string, number>;
        mostFrequent: Array<{
            patternId: string;
            frequency: number;
            pattern: SilentProcessAntiPattern;
        }>;
        detectionHistory: number;
        averageConfidence: number;
    };
    exportForNeuralTraining(): any;
}
export declare const silentProcessAntiPatternsDB: SilentProcessAntiPatternsDatabase;
//# sourceMappingURL=silent-process-anti-patterns-database.d.ts.map