/**
 * NLD Working Directory Pattern Detector
 * Monitors hardcoded working directory configurations and detects
 * dynamic directory spawning failures in Claude instance creation
 */
export interface WorkingDirectoryFailure {
    recordId: string;
    timestamp: string;
    taskContext: {
        userExpectation: string;
        buttonType: string;
        expectedDirectory: string;
        actualDirectory: string;
    };
    failurePattern: {
        type: 'HARDCODED_WORKING_DIR';
        location: string;
        lineNumber: number;
        code: string;
        antiPattern: string;
    };
    userFeedback: {
        reportedIssue: string;
        correctedSolution?: string;
    };
    effectivenessScore: number;
    tddFactor: boolean;
    classification: string;
}
export declare class WorkingDirectoryPatternDetector {
    private patterns;
    private dbPath;
    constructor(dbPath?: string);
    /**
     * Detect trigger conditions for working directory failures
     */
    detectTriggerConditions(userFeedback: string): boolean;
    /**
     * Monitor simple-backend.js for hardcoded working directory pattern
     */
    monitorBackendFile(): Promise<WorkingDirectoryFailure | null>;
    /**
     * Create comprehensive failure record for working directory misconfiguration
     */
    private createFailureRecord;
    /**
     * Capture real-time failure pattern when user reports directory spawning issue
     */
    captureFailurePattern(userFeedback: string, taskContext: {
        originalTask: string;
        claudeSolution: string;
        confidenceLevel: number;
    }): Promise<string>;
    /**
     * Calculate effectiveness score based on user success rate and TDD factor
     */
    private calculateEffectivenessScore;
    /**
     * Get failure patterns by classification
     */
    getPatternsByClassification(classification: string): WorkingDirectoryFailure[];
    /**
     * Get all working directory failure patterns
     */
    getAllPatterns(): WorkingDirectoryFailure[];
    /**
     * Export neural training data for claude-flow integration
     */
    exportNeuralTrainingData(): Promise<{
        patternData: any[];
        exportPath: string;
    }>;
    /**
     * Load existing patterns from database
     */
    private loadExistingPatterns;
    /**
     * Save patterns to database
     */
    private savePatterns;
    /**
     * Generate anti-pattern database for prevention
     */
    generateAntiPatterns(): {
        patterns: Array<{
            name: string;
            description: string;
            antiPattern: string;
            solution: string;
            preventionStrategy: string;
        }>;
    };
}
//# sourceMappingURL=working-directory-pattern-detector.d.ts.map