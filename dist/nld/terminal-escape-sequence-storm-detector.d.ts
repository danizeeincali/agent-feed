/**
 * Terminal Escape Sequence Storm Detector
 * Detects and analyzes ANSI escape sequence storms in terminal output
 * Part of NLD (Neuro-Learning Development) system
 *
 * Patterns detected:
 * - [?25l (hide cursor) repetition storms
 * - [?25h (show cursor) repetition storms
 * - [?2004h (enable bracketed paste) repetition storms
 * - Message duplication patterns (Claude welcome messages)
 * - Transition from escape sequences to text repetition
 */
import { EventEmitter } from 'events';
interface EscapeSequencePattern {
    patternId: string;
    sequence: string;
    sequenceType: 'cursor_control' | 'bracketed_paste' | 'screen_control' | 'unknown';
    repetitionCount: number;
    timeWindow: number;
    detectedAt: string;
    associatedMessage?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    rootCause: 'process_multiplication' | 'pty_config_issue' | 'sse_handler_duplication' | 'button_click_storm' | 'unknown';
    technicalDetails: {
        processSpawns: number;
        sseConnections: number;
        clickEvents: number;
        bufferSize: number;
    };
}
interface TerminalStormPattern {
    stormId: string;
    stormType: 'escape_sequence_storm' | 'message_duplication_storm' | 'mixed_storm';
    sequences: string[];
    messages: string[];
    totalRepetitions: number;
    durationMs: number;
    detectedAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    rootCause: string;
    preventionStrategy: string;
}
export declare class TerminalEscapeSequenceStormDetector extends EventEmitter {
    private detectedPatterns;
    private stormPatterns;
    private patternStorage;
    private sequenceBuffer;
    private readonly stormThreshold;
    private readonly timeWindowMs;
    private readonly knownSequences;
    constructor(storageDir: string);
    /**
     * Analyze terminal output for escape sequence storms
     */
    analyzeTerminalOutput(output: string, instanceId: string): void;
    /**
     * Extract escape sequences and messages from terminal output
     */
    private extractEscapeSequences;
    /**
     * Track escape sequence repetitions
     */
    private trackSequenceRepetition;
    /**
     * Track message repetitions
     */
    private trackMessageRepetition;
    /**
     * Check for storm patterns
     */
    private checkForStormPatterns;
    /**
     * Record individual escape sequence pattern
     */
    private recordEscapeSequencePattern;
    /**
     * Record storm pattern
     */
    private recordStormPattern;
    /**
     * Classify escape sequence type
     */
    private classifySequence;
    /**
     * Calculate pattern severity
     */
    private calculateSeverity;
    /**
     * Analyze root cause of pattern
     */
    private analyzeRootCause;
    /**
     * Estimate process spawns from repetition count
     */
    private estimateProcessSpawns;
    /**
     * Estimate SSE connections from repetition count
     */
    private estimateSSEConnections;
    /**
     * Estimate click events from content and repetition
     */
    private estimateClickEvents;
    /**
     * Classify storm type
     */
    private classifyStorm;
    /**
     * Calculate storm severity
     */
    private calculateStormSeverity;
    /**
     * Analyze storm root cause
     */
    private analyzeStormRootCause;
    /**
     * Suggest prevention strategy
     */
    private suggestPreventionStrategy;
    /**
     * Get detected patterns
     */
    getDetectedPatterns(): EscapeSequencePattern[];
    /**
     * Get storm patterns
     */
    getStormPatterns(): TerminalStormPattern[];
    /**
     * Get pattern statistics
     */
    getPatternStatistics(): {
        totalPatterns: number;
        totalStorms: number;
        severityBreakdown: Record<string, number>;
        rootCauseBreakdown: Record<string, number>;
        mostCommonSequence: string;
        mostCommonMessage: string;
    };
    /**
     * Setup periodic cleanup
     */
    private setupCleanupInterval;
    /**
     * Clean up old patterns from buffer
     */
    private cleanupOldPatterns;
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
     * Simulate storm for testing
     */
    simulateStorm(sequences: string[], repetitions: number, instanceId: string): void;
}
export default TerminalEscapeSequenceStormDetector;
//# sourceMappingURL=terminal-escape-sequence-storm-detector.d.ts.map