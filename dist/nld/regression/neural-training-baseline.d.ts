/**
 * Neural Training Baseline - Captures Current Working State as Golden Standard
 *
 * Creates comprehensive baseline from current working Claude process system
 * for neural network training and regression detection.
 */
export interface BaselineConfiguration {
    timestamp: Date;
    systemVersion: string;
    claudeProcessConfig: ClaudeProcessBaseline;
    authenticationBaseline: AuthenticationBaseline;
    directoryBaseline: DirectoryBaseline;
    sseConnectionBaseline: SSEConnectionBaseline;
    processSpawningBaseline: ProcessSpawningBaseline;
    neuralSignatures: NeuralSignature[];
}
export interface ClaudeProcessBaseline {
    commandStructure: string[];
    workingDirectoryPattern: string;
    processTypeExpected: 'pty' | 'pipe';
    usePtyDefault: boolean;
    printFlagsProhibited: boolean;
    interactiveModeEnabled: boolean;
    stdioConfiguration: string[];
    environmentVariables: Record<string, string>;
}
export interface AuthenticationBaseline {
    expectedAuthMethods: string[];
    credentialsPath: string;
    authValidationFlow: AuthFlow[];
    fallbackMethods: string[];
    timeoutThresholds: Record<string, number>;
}
export interface AuthFlow {
    step: number;
    action: string;
    expectedResult: any;
    timeoutMs: number;
}
export interface DirectoryBaseline {
    baseDirectory: string;
    validDirectoryMappings: Record<string, string>;
    securityConstraints: string[];
    validationFlow: DirectoryValidationStep[];
    fallbackBehavior: string;
}
export interface DirectoryValidationStep {
    step: number;
    validation: string;
    expectedOutcome: boolean;
    fallbackAction?: string;
}
export interface SSEConnectionBaseline {
    expectedConnectionTypes: string[];
    connectionEstablishmentFlow: SSEConnectionStep[];
    heartbeatInterval: number;
    reconnectionStrategy: string;
    errorHandlingPatterns: string[];
}
export interface SSEConnectionStep {
    step: number;
    action: string;
    expectedHeaders: Record<string, string>;
    timeoutMs: number;
}
export interface ProcessSpawningBaseline {
    spawnCommands: Record<string, string[]>;
    spawnOptions: Record<string, any>;
    spawnFlow: SpawnFlow[];
    errorRecoveryPatterns: string[];
    performanceThresholds: Record<string, number>;
}
export interface SpawnFlow {
    step: number;
    phase: string;
    expectedDuration: number;
    successCriteria: string[];
    failureTriggers: string[];
}
export interface NeuralSignature {
    id: string;
    name: string;
    signatureType: 'success' | 'failure' | 'pattern';
    features: number[];
    labels: string[];
    confidence: number;
    trainingWeight: number;
}
export declare class NeuralTrainingBaseline {
    private baseline;
    private captureStartTime;
    private observationPeriod;
    private observedEvents;
    /**
     * Capture comprehensive baseline from current working system
     */
    captureBaseline(): Promise<BaselineConfiguration>;
    /**
     * Get current system version information
     */
    private getSystemVersion;
    /**
     * Capture Claude process configuration baseline
     */
    private captureClaudeProcessBaseline;
    /**
     * Capture authentication system baseline
     */
    private captureAuthenticationBaseline;
    /**
     * Capture directory resolution baseline
     */
    private captureDirectoryBaseline;
    /**
     * Capture SSE connection baseline
     */
    private captureSSEConnectionBaseline;
    /**
     * Capture process spawning baseline
     */
    private captureProcessSpawningBaseline;
    /**
     * Generate neural signatures from baseline data
     */
    private generateNeuralSignatures;
    /**
     * Export baseline for neural network training
     */
    exportForTraining(): any;
    /**
     * Extract features from baseline for ML training
     */
    private extractFeatures;
    /**
     * Extract labels from baseline
     */
    private extractLabels;
    /**
     * Generate validation data for testing neural network
     */
    private generateValidationData;
    /**
     * Generate test cases for neural network validation
     */
    private generateTestCases;
    /**
     * Get current baseline
     */
    getBaseline(): BaselineConfiguration | null;
    /**
     * Validate current system against baseline
     */
    validateAgainstBaseline(currentConfig: any): any;
}
export declare const neuralTrainingBaseline: NeuralTrainingBaseline;
//# sourceMappingURL=neural-training-baseline.d.ts.map