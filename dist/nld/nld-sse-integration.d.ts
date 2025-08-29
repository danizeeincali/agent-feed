/**
 * NLD SSE Integration System
 *
 * Integrates the NLD pattern detection system with the existing SSE implementation
 * Provides validation of the NLD system with current SSE connection state
 * Creates hooks for real-time pattern detection and learning
 */
interface NLDSSEValidationResult {
    systemStatus: 'healthy' | 'warning' | 'critical';
    detectedPatterns: Array<{
        patternId: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        timestamp: string;
    }>;
    connectionHealth: {
        statusSSE: 'healthy' | 'degraded' | 'failed';
        terminalSSE: 'healthy' | 'degraded' | 'failed';
        coordination: 'synchronized' | 'drift' | 'desynchronized';
    };
    recommendations: {
        immediate: string[];
        preventive: string[];
        tddImplementation: string[];
    };
    neuralInsights: {
        failurePredictions: Array<{
            instanceId: string;
            probability: number;
            failureType: string;
            recommendedActions: string[];
        }>;
    };
    metrics: {
        totalInstances: number;
        activeAlerts: number;
        patternsCaptured: number;
        preventionEffectiveness: number;
    };
}
export declare class NLDSSEIntegrationSystem {
    private patternDetector;
    private failureMonitor;
    private antiPatternsDB;
    private neuralExportSystem;
    private tddStrategies;
    private isIntegrated;
    private validationResults;
    constructor();
    /**
     * Initialize the NLD system integration
     */
    initialize(): Promise<void>;
    /**
     * Setup integration hooks with existing SSE implementation
     */
    private setupIntegrationHooks;
    /**
     * Validate NLD system with current SSE connection state
     */
    validateWithCurrentState(): Promise<NLDSSEValidationResult>;
    /**
     * Hook for integrating with useHTTPSSE hook
     */
    createSSEHooks(): {
        onConnectionEvent: (instanceId: string, eventType: string, data?: any) => void;
        onUIStateChange: (instanceId: string, status: string) => void;
        onUserFeedback: (feedback: string, context: any) => void;
    };
    /**
     * Manual trigger for pattern detection
     */
    triggerPatternDetection(instanceId: string, scenario: string, context: any): Promise<void>;
    /**
     * Export neural training data
     */
    exportNeuralTrainingData(): Promise<string>;
    /**
     * Get TDD implementation guidance
     */
    getTDDGuidance(): {
        criticalTests: string[];
        implementationChecklist: any;
        mockingUtilities: string;
    };
    /**
     * Get comprehensive system report
     */
    generateSystemReport(): {
        validation: NLDSSEValidationResult | null;
        antiPatterns: any;
        tddGuidance: any;
        monitoringStats: any;
    };
    private handleFailureAlert;
    private handleAutoRecovery;
    private handleAlertResolved;
    private mapEventToTriggerType;
    private handleTriggerDetected;
    private isFailureFeedback;
    private captureUserFailurePattern;
    private determineSystemStatus;
    private summarizeDetectedPatterns;
    private assessConnectionHealth;
    private generateRecommendations;
    private generateNeuralInsights;
    private mapFailureModeToSeverity;
}
export { NLDSSEValidationResult };
//# sourceMappingURL=nld-sse-integration.d.ts.map