/**
 * NLD (Neuro-Learning Development) - SSE Connection Pattern Detector
 *
 * Specialized in automatically capturing failure patterns when SSE connections
 * fail in coordination scenarios where status broadcasts have 0 connections
 * but terminal streams show 1 connection, causing UI to stay stuck on "starting".
 */
interface SSEConnectionPattern {
    id: string;
    timestamp: string;
    triggerEvent: string;
    failureMode: 'status_sse_missing' | 'terminal_input_broken' | 'connection_coordination' | 'status_broadcast_zero' | 'mixed_connection_state';
    connectionState: {
        statusSSE: {
            connected: boolean;
            connections: number;
            endpoint: string;
        };
        terminalSSE: {
            connected: boolean;
            connections: number;
            instanceId: string | null;
            endpoint: string;
        };
        pollingState: {
            active: boolean;
            instanceId: string | null;
        };
    };
    uiState: {
        instanceStatus: 'starting' | 'running' | 'stopped' | 'error';
        stuck: boolean;
        lastStatusUpdate: string | null;
        connectionType: string;
    };
    contextualData: {
        originalTask: string;
        expectedBehavior: string;
        actualBehavior: string;
        errorMessages: string[];
    };
    effectiveness: {
        claudeConfidence: number;
        userSuccessRate: number;
        tddUsed: boolean;
        score: number;
    };
}
interface SSETriggerCondition {
    type: 'status_connection_zero' | 'terminal_connection_established' | 'ui_stuck_starting' | 'manual_trigger';
    data: any;
    source: string;
}
declare class SSEConnectionPatternDetector {
    private patterns;
    private patternDir;
    private isMonitoring;
    private connectionStates;
    constructor();
    private ensureDirectoryExists;
    /**
     * Start monitoring for SSE connection failure patterns
     */
    startMonitoring(): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Detect trigger conditions for pattern capture
     */
    detectTrigger(condition: SSETriggerCondition): boolean;
    /**
     * Capture SSE connection failure pattern
     */
    captureFailurePattern(triggerCondition: SSETriggerCondition, contextualInfo: {
        task: string;
        expectedBehavior: string;
        actualBehavior: string;
        errorMessages?: string[];
    }, connectionState: any, uiState: any, effectiveness?: {
        claudeConfidence?: number;
        userSuccessRate?: number;
        tddUsed?: boolean;
    }): Promise<SSEConnectionPattern>;
    /**
     * Classify the type of failure mode based on connection state
     */
    private classifyFailureMode;
    /**
     * Normalize connection state for consistent storage
     */
    private normalizeConnectionState;
    /**
     * Calculate effectiveness score
     */
    private calculateEffectivenessScore;
    /**
     * Store pattern to file system
     */
    private storePattern;
    /**
     * Analyze patterns for common failure modes
     */
    analyzePatterns(): {
        totalPatterns: number;
        failureModes: Record<string, number>;
        commonCauses: string[];
        recommendations: string[];
    };
    /**
     * Get patterns by failure mode
     */
    getPatternsByFailureMode(failureMode: SSEConnectionPattern['failureMode']): SSEConnectionPattern[];
    /**
     * Export patterns for neural training
     */
    exportForNeuralTraining(): {
        trainingData: any[];
        metadata: {
            totalPatterns: number;
            exportTimestamp: string;
            version: string;
        };
    };
    private generateRecommendationsForPattern;
    /**
     * Update connection state for monitoring
     */
    updateConnectionState(instanceId: string, state: any): void;
    /**
     * Get current connection states
     */
    getConnectionStates(): Map<string, any>;
    /**
     * Load existing patterns from storage
     */
    loadExistingPatterns(): Promise<void>;
}
export { SSEConnectionPatternDetector, SSEConnectionPattern, SSETriggerCondition };
//# sourceMappingURL=sse-connection-pattern-detector.d.ts.map