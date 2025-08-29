/**
 * Claude Process I/O Failure Detector - NLD System
 *
 * Detects and monitors specific Claude CLI process failures:
 * - PRINT_FLAG_INPUT_REQUIRED: "--print requires input" errors
 * - INTERACTIVE_MODE_BLOCKED: Interactive Claude sessions that fail to initialize
 * - PTY_STDIN_DISCONNECT: PTY processes losing stdin connection
 * - AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT: Auth works but processes remain silent
 */
export interface ClaudeProcessIOMetrics {
    instanceId: string;
    command: string;
    args: string[];
    workingDirectory: string;
    processType: 'pty' | 'pipe';
    spawnTime: number;
    firstOutputTime?: number;
    authenticationTime?: number;
    stdinConnected: boolean;
    stdoutActive: boolean;
    stderrActive: boolean;
    processState: 'spawning' | 'initializing' | 'authenticated' | 'interactive' | 'silent' | 'failed' | 'terminated';
    errorPatterns: ClaudeProcessIOErrorPattern[];
    sessionMetrics: {
        inputsSent: number;
        outputsReceived: number;
        interactivePrompts: number;
        silentDuration: number;
        lastActivity: number;
    };
}
export interface ClaudeProcessIOErrorPattern {
    patternId: string;
    detectedAt: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'PRINT_FLAG_INPUT_REQUIRED' | 'INTERACTIVE_MODE_BLOCKED' | 'PTY_STDIN_DISCONNECT' | 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT';
    errorMessage?: string;
    diagnosticInfo: {
        hasStdinInput: boolean;
        hasPromptArgument: boolean;
        isPrintMode: boolean;
        isInteractiveMode: boolean;
        authenticationSucceeded: boolean;
        expectedOutput: boolean;
        actualOutput: boolean;
    };
    resolutionSuggestions: string[];
    preventionStrategy: string;
}
export interface ClaudeProcessIOTriggerCondition {
    conditionId: string;
    pattern: ClaudeProcessIOErrorPattern['category'];
    triggerLogic: (metrics: ClaudeProcessIOMetrics) => boolean;
    timeThreshold?: number;
    errorThreshold?: number;
    silentThreshold?: number;
}
export declare class ClaudeProcessIOFailureDetector {
    private activeProcesses;
    private triggerConditions;
    private detectionCallbacks;
    private patternHistory;
    constructor();
    private initializeTriggerConditions;
    registerProcess(instanceId: string, command: string, args: string[], workingDirectory: string, processType?: 'pty' | 'pipe'): void;
    recordProcessOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void;
    recordProcessInput(instanceId: string, input: string): void;
    recordProcessError(instanceId: string, error: Error): void;
    updateProcessState(instanceId: string, state: ClaudeProcessIOMetrics['processState']): void;
    private analyzeErrorOutput;
    private startPeriodicCheck;
    private buildDiagnosticInfo;
    private detectPattern;
    private getPatternSeverity;
    private getResolutionSuggestions;
    private getPreventionStrategy;
    onPatternDetected(callback: (pattern: ClaudeProcessIOErrorPattern, metrics: ClaudeProcessIOMetrics) => void): void;
    getProcessMetrics(instanceId: string): ClaudeProcessIOMetrics | undefined;
    getAllActiveProcesses(): ClaudeProcessIOMetrics[];
    getPatternHistory(category?: ClaudeProcessIOErrorPattern['category']): ClaudeProcessIOErrorPattern[];
    generateSystemReport(): {
        activeProcesses: number;
        totalPatternsDetected: number;
        patternsByCategory: Record<string, number>;
        criticalProcesses: ClaudeProcessIOMetrics[];
        resolutionSuggestions: string[];
    };
}
export declare const claudeProcessIODetector: ClaudeProcessIOFailureDetector;
//# sourceMappingURL=claude-process-io-failure-detector.d.ts.map