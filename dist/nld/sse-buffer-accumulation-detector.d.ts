/**
 * SSE Buffer Accumulation Anti-Pattern Detector
 * Detects infinite message repetition patterns in SSE streaming
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
interface SSEMessage {
    type: string;
    data: string;
    instanceId: string;
    timestamp: string;
    source?: string;
    isReal?: boolean;
    processType?: string;
}
interface BufferAccumulationPattern {
    patternId: string;
    instanceId: string;
    messageType: string;
    repetitionCount: number;
    duplicateContent: string;
    timeSpan: number;
    detectedAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    antiPattern: string;
    rootCause: string;
    technicalDetails: {
        bufferSize: number;
        outputPosition: number;
        parserState: string;
        connectionCount: number;
    };
}
interface SSEEventHandlerDuplication {
    patternId: string;
    handlerFunction: string;
    registrationCount: number;
    instances: string[];
    duplicateRegistrations: Array<{
        timestamp: string;
        callStack: string;
    }>;
}
interface OutputBufferFailure {
    patternId: string;
    instanceId: string;
    bufferType: 'global' | 'instance' | 'connection';
    failureMode: 'overflow' | 'corruption' | 'position_tracking' | 'parser_state';
    bufferState: {
        size: number;
        position: number;
        content: string;
    };
    detectedAt: string;
}
export declare class SSEBufferAccumulationDetector extends EventEmitter {
    private messageHistory;
    private patternStorage;
    private detectedPatterns;
    private handlerDuplication;
    private bufferFailures;
    private readonly maxHistorySize;
    private readonly repetitionThreshold;
    private readonly timeWindowMs;
    constructor(storageDir: string);
    /**
     * Analyze SSE message for buffer accumulation patterns
     */
    analyzeSSEMessage(message: SSEMessage): void;
    /**
     * Detect infinite message repetition patterns
     */
    private detectInfiniteRepetition;
    /**
     * Detect SSE buffer replay loop patterns
     */
    private detectBufferReplayLoop;
    /**
     * Detect output position tracking failures
     */
    private detectOutputPositionFailure;
    /**
     * Record event handler duplication patterns
     */
    recordEventHandlerDuplication(handlerFunction: string, instanceId: string, callStack: string): void;
    /**
     * Analyze frontend message state accumulation
     */
    analyzeFrontendMessageAccumulation(messageState: any[]): void;
    /**
     * Calculate severity based on repetition count
     */
    private calculateSeverity;
    /**
     * Analyze root cause of message repetition
     */
    private analyzeRepetitionRootCause;
    /**
     * Find repeating sequences in message array
     */
    private findRepeatingSequences;
    /**
     * Check if two message arrays are equal
     */
    private arraysEqual;
    /**
     * Calculate time span for sequence
     */
    private calculateSequenceTimeSpan;
    /**
     * Find duplicates in array
     */
    private findDuplicatesInArray;
    /**
     * Record detected pattern
     */
    private recordPattern;
    /**
     * Get all detected patterns
     */
    getDetectedPatterns(): BufferAccumulationPattern[];
    /**
     * Get event handler duplications
     */
    getEventHandlerDuplications(): SSEEventHandlerDuplication[];
    /**
     * Get buffer failures
     */
    getBufferFailures(): OutputBufferFailure[];
    /**
     * Load existing patterns from storage
     */
    private loadExistingPatterns;
    /**
     * Persist patterns to storage
     */
    private persistPatterns;
    /**
     * Clear all detected patterns (for testing)
     */
    clearPatterns(): void;
    /**
     * Generate failure analysis report
     */
    generateFailureAnalysisReport(): string;
}
export default SSEBufferAccumulationDetector;
//# sourceMappingURL=sse-buffer-accumulation-detector.d.ts.map