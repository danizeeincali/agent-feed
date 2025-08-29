/**
 * Output Buffer Management Failure Patterns Documentation
 * Documents and analyzes output buffer management failures in SSE streaming
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
interface BufferState {
    size: number;
    position: number;
    capacity: number;
    lastWrite: string;
    lastRead: string;
    overflowCount: number;
    underflowCount: number;
}
interface BufferFailurePattern {
    patternId: string;
    instanceId: string;
    failureType: 'overflow' | 'position_reset' | 'parser_corruption' | 'memory_leak' | 'duplicate_write';
    bufferType: 'global_output' | 'instance_buffer' | 'connection_buffer' | 'parser_buffer';
    bufferState: BufferState;
    failureDetails: {
        triggerCondition: string;
        reproducibilityRate: number;
        impactSeverity: 'low' | 'medium' | 'high' | 'critical';
        affectedConnections: number;
        dataLoss: boolean;
    };
    technicalCause: string;
    manifestation: string;
    detectedAt: string;
    stackTrace?: string;
}
interface ClaudeOutputParserFailure {
    patternId: string;
    instanceId: string;
    parserState: 'buffering' | 'processing' | 'outputting' | 'corrupted' | 'deadlocked';
    inputBuffer: {
        size: number;
        content: string;
        lastPosition: number;
    };
    outputBuffer: {
        size: number;
        content: string;
        writePosition: number;
        readPosition: number;
    };
    processingFailure: {
        stage: 'input_capture' | 'parsing' | 'output_generation' | 'streaming';
        errorType: 'infinite_loop' | 'position_corruption' | 'buffer_overflow' | 'state_corruption';
        errorMessage: string;
    };
    detectedAt: string;
}
interface SSEStreamingFailure {
    patternId: string;
    instanceId: string;
    streamingStage: 'connection_init' | 'message_broadcast' | 'buffer_write' | 'connection_cleanup';
    failureMode: 'broadcast_storm' | 'connection_leak' | 'message_duplication' | 'buffer_corruption';
    connectionDetails: {
        totalConnections: number;
        activeConnections: number;
        zombieConnections: number;
        failedBroadcasts: number;
    };
    messageDetails: {
        totalMessages: number;
        duplicateMessages: number;
        corruptedMessages: number;
        lostMessages: number;
    };
    detectedAt: string;
}
export declare class OutputBufferManagementFailurePatterns extends EventEmitter {
    private bufferFailures;
    private parserFailures;
    private streamingFailures;
    private patternStorage;
    private bufferMonitoring;
    constructor(storageDir: string);
    /**
     * Document buffer overflow failure pattern
     */
    documentBufferOverflowFailure(instanceId: string, bufferType: string, currentSize: number, capacity: number, triggerCondition: string, stackTrace?: string): void;
    /**
     * Document buffer position reset failure
     */
    documentPositionResetFailure(instanceId: string, bufferType: string, expectedPosition: number, actualPosition: number, content: string): void;
    /**
     * Document Claude output parser failure
     */
    documentClaudeOutputParserFailure(instanceId: string, parserState: string, inputSize: number, inputContent: string, outputSize: number, outputContent: string, errorStage: string, errorType: string, errorMessage: string): void;
    /**
     * Document SSE streaming failure
     */
    documentSSEStreamingFailure(instanceId: string, streamingStage: string, failureMode: string, connectionStats: {
        total: number;
        active: number;
        zombie: number;
        failed: number;
    }, messageStats: {
        total: number;
        duplicates: number;
        corrupted: number;
        lost: number;
    }): void;
    /**
     * Analyze buffer state changes over time
     */
    analyzeBufferStateProgression(instanceId: string, currentState: BufferState): void;
    /**
     * Identify memory leak patterns in buffer management
     */
    identifyMemoryLeakPatterns(): void;
    /**
     * Calculate reproducibility rate for failure types
     */
    private calculateReproducibilityRate;
    /**
     * Record buffer failure pattern
     */
    private recordBufferFailure;
    /**
     * Get detected buffer failures
     */
    getBufferFailures(): BufferFailurePattern[];
    /**
     * Get parser failures
     */
    getParserFailures(): ClaudeOutputParserFailure[];
    /**
     * Get streaming failures
     */
    getStreamingFailures(): SSEStreamingFailure[];
    /**
     * Get failure statistics
     */
    getFailureStatistics(): {
        bufferFailures: {
            [key: string]: number;
        };
        parserFailures: {
            [key: string]: number;
        };
        streamingFailures: {
            [key: string]: number;
        };
        totalFailures: number;
        criticalFailures: number;
    };
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
     * Generate comprehensive buffer management failure report
     */
    generateFailureReport(): string;
}
export default OutputBufferManagementFailurePatterns;
//# sourceMappingURL=output-buffer-management-failure-patterns.d.ts.map