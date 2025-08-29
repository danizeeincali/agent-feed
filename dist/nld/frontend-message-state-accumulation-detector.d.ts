/**
 * Frontend Message State Accumulation Detector
 * Detects frontend message state accumulation patterns in React components
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
interface MessageState {
    id: string;
    type: string;
    content: string;
    timestamp: string;
    instanceId: string;
    componentId: string;
}
interface StateAccumulationPattern {
    patternId: string;
    componentName: string;
    instanceId: string;
    accumulationType: 'unbounded_growth' | 'duplicate_accumulation' | 'stale_state' | 'memory_bloat';
    messageCount: number;
    duplicateCount: number;
    staleCount: number;
    memoryImpact: number;
    timeWindow: number;
    detectedAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    rootCause: string;
    manifestation: string;
    technicalDetails: {
        stateSize: number;
        renderCount: number;
        effectExecutions: number;
        cleanupFailures: number;
    };
}
interface ComponentStateAnalysis {
    componentName: string;
    instanceId: string;
    stateVariables: {
        [key: string]: any;
    };
    stateSize: number;
    lastUpdated: string;
    updateFrequency: number;
    renderCount: number;
    memoryUsage: number;
}
interface ReactHookStateFailure {
    patternId: string;
    componentName: string;
    hookType: 'useState' | 'useEffect' | 'useCallback' | 'useMemo' | 'useRef';
    hookName: string;
    failureType: 'dependency_loop' | 'stale_closure' | 'memory_leak' | 'infinite_render';
    stateBeforeFailure: any;
    stateAfterFailure: any;
    errorMessage: string;
    detectedAt: string;
}
export declare class FrontendMessageStateAccumulationDetector extends EventEmitter {
    private stateHistory;
    private componentStates;
    private detectedPatterns;
    private hookFailures;
    private patternStorage;
    private readonly maxHistorySize;
    private readonly accumulationThreshold;
    private readonly duplicateThreshold;
    constructor(storageDir: string);
    /**
     * Track message state update in React component
     */
    trackMessageStateUpdate(componentName: string, instanceId: string, messageState: MessageState[], renderCount?: number): void;
    /**
     * Track React hook state change
     */
    trackHookStateChange(componentName: string, hookType: string, hookName: string, previousState: any, newState: any, dependencies?: any[]): void;
    /**
     * Track component render cycles
     */
    trackComponentRender(componentName: string, instanceId: string, renderReason: string, props: any, state: any): void;
    /**
     * Analyze state accumulation patterns
     */
    private analyzeStateAccumulation;
    /**
     * Detect unbounded state growth
     */
    private detectUnboundedGrowth;
    /**
     * Detect duplicate message accumulation
     */
    private detectDuplicateAccumulation;
    /**
     * Detect stale message accumulation
     */
    private detectStaleStateAccumulation;
    /**
     * Detect excessive component rendering
     */
    private detectExcessiveRendering;
    /**
     * Detect React hook failures
     */
    private detectHookFailures;
    /**
     * Find duplicate messages in state
     */
    private findDuplicateMessages;
    /**
     * Find stale messages (older than 5 minutes)
     */
    private findStaleMessages;
    /**
     * Calculate memory impact of messages
     */
    private calculateMemoryImpact;
    /**
     * Calculate time window for messages
     */
    private calculateTimeWindow;
    /**
     * Calculate severity based on message count
     */
    private calculateSeverity;
    /**
     * Update component state analysis
     */
    private updateComponentStateAnalysis;
    /**
     * Calculate state size
     */
    private calculateStateSize;
    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage;
    /**
     * Check for circular dependencies
     */
    private hasCircularDependencies;
    /**
     * Setup periodic analysis
     */
    private setupPeriodicAnalysis;
    /**
     * Analyze component memory usage patterns
     */
    private analyzeComponentMemoryUsage;
    /**
     * Record detected pattern
     */
    private recordPattern;
    /**
     * Get all detected patterns
     */
    getDetectedPatterns(): StateAccumulationPattern[];
    /**
     * Get hook failures
     */
    getHookFailures(): ReactHookStateFailure[];
    /**
     * Get component state analyses
     */
    getComponentStateAnalyses(): ComponentStateAnalysis[];
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
     * Generate frontend state analysis report
     */
    generateStateAnalysisReport(): string;
}
export default FrontendMessageStateAccumulationDetector;
//# sourceMappingURL=frontend-message-state-accumulation-detector.d.ts.map