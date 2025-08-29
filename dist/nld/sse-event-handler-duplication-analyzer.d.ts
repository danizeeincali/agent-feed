/**
 * SSE Event Handler Duplication Analyzer
 * Analyzes frontend SSE event handler registration patterns
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
interface DuplicationPattern {
    patternId: string;
    handlerFunction: string;
    eventType: string;
    totalRegistrations: number;
    duplicateInstances: string[];
    timeWindow: number;
    detectedAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    antiPattern: string;
    rootCause: string;
    technicalDetails: {
        componentRenders: number;
        hookExecutions: number;
        eventSourceCreations: number;
        cleanupFailures: number;
    };
}
interface EventSourceLeakage {
    patternId: string;
    instanceId: string;
    eventSourceUrl: string;
    createdAt: string;
    lastActivity: string;
    connectionState: 'open' | 'closed' | 'connecting' | 'abandoned';
    leakageType: 'memory_leak' | 'zombie_connection' | 'cleanup_failure';
}
export declare class SSEEventHandlerDuplicationAnalyzer extends EventEmitter {
    private registrations;
    private detectedPatterns;
    private eventSourceLeakages;
    private patternStorage;
    private readonly duplicateThreshold;
    private readonly timeWindowMs;
    constructor(storageDir: string);
    /**
     * Record event handler registration
     */
    recordEventHandlerRegistration(handlerFunction: string, instanceId: string, eventType: string, callStack: string, componentName?: string, hookName?: string): void;
    /**
     * Record EventSource creation
     */
    recordEventSourceCreation(instanceId: string, url: string): void;
    /**
     * Record EventSource cleanup
     */
    recordEventSourceCleanup(instanceId: string, url: string, success: boolean): void;
    /**
     * Analyze duplication patterns for a handler/event combination
     */
    private analyzeDuplicationPattern;
    /**
     * Calculate severity based on registration count
     */
    private calculateSeverity;
    /**
     * Identify the specific anti-pattern
     */
    private identifyAntiPattern;
    /**
     * Analyze root cause of duplication
     */
    private analyzeRootCause;
    /**
     * Count component renders from registrations
     */
    private countComponentRenders;
    /**
     * Count hook executions from registrations
     */
    private countHookExecutions;
    /**
     * Count EventSource creations from registrations
     */
    private countEventSourceCreations;
    /**
     * Count cleanup failures from registrations
     */
    private countCleanupFailures;
    /**
     * Analyze frontend SSE connection patterns
     */
    analyzeFrontendSSEConnections(connections: Array<{
        instanceId: string;
        url: string;
        state: string;
        createdAt: string;
        messageCount: number;
    }>): void;
    /**
     * Record detected pattern
     */
    private recordPattern;
    /**
     * Get all detected patterns
     */
    getDetectedPatterns(): DuplicationPattern[];
    /**
     * Get event source leakages
     */
    getEventSourceLeakages(): EventSourceLeakage[];
    /**
     * Get handler registration statistics
     */
    getHandlerStatistics(): {
        totalHandlers: number;
        totalRegistrations: number;
        duplicateHandlers: number;
        mostDuplicatedHandler: string;
    };
    /**
     * Setup periodic cleanup of old registrations
     */
    private setupCleanupInterval;
    /**
     * Clean up old registrations
     */
    private cleanupOldRegistrations;
    /**
     * Load existing patterns from storage
     */
    private loadExistingPatterns;
    /**
     * Persist patterns to storage
     */
    private persistPatterns;
    /**
     * Clear all patterns (for testing)
     */
    clearPatterns(): void;
    /**
     * Generate event handler analysis report
     */
    generateAnalysisReport(): string;
}
export default SSEEventHandlerDuplicationAnalyzer;
//# sourceMappingURL=sse-event-handler-duplication-analyzer.d.ts.map