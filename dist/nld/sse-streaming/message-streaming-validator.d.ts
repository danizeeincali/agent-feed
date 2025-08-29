/**
 * Message Streaming Validator - NLD Pattern Detection System
 * Detects and prevents message streaming desync and ordering issues
 */
export interface MessageStreamingFailure {
    failureId: string;
    failureType: 'MESSAGE_STREAMING_DESYNC' | 'MESSAGE_ORDERING_ISSUE' | 'DUPLICATE_MESSAGE' | 'LOST_MESSAGE' | 'STREAMING_INTERRUPTION';
    streamId: string;
    expectedSequence: number;
    actualSequence: number;
    detectedAt: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    messageData: {
        messageId: string;
        content: string;
        timestamp: number;
        size: number;
    };
    streamingContext: {
        totalMessages: number;
        lostMessages: number;
        duplicateMessages: number;
        outOfOrderMessages: number;
        streamDuration: number;
    };
}
export interface StreamMessage {
    messageId: string;
    streamId: string;
    sequenceNumber: number;
    content: string;
    timestamp: number;
    size: number;
    checksum?: string;
    retryCount: number;
}
export interface StreamingSession {
    sessionId: string;
    streamId: string;
    startTime: number;
    lastActivity: number;
    expectedSequence: number;
    receivedMessages: Map<number, StreamMessage>;
    messageBuffer: StreamMessage[];
    isActive: boolean;
    health: 'healthy' | 'degraded' | 'failing';
}
declare class MessageStreamingValidator {
    private streamingSessions;
    private failureHistory;
    private messageDeduplicator;
    private orderingBuffer;
    private readonly MAX_SEQUENCE_GAP;
    private readonly MESSAGE_TIMEOUT;
    private readonly DUPLICATE_DETECTION_WINDOW;
    private readonly ORDERING_BUFFER_SIZE;
    private readonly HEALTH_CHECK_INTERVAL;
    constructor();
    /**
     * Initialize streaming session
     */
    initializeStream(streamId: string): string;
    /**
     * Validate incoming message and detect streaming issues
     */
    validateMessage(sessionId: string, message: Omit<StreamMessage, 'retryCount'>): {
        isValid: boolean;
        processedMessage: StreamMessage | null;
        failure: MessageStreamingFailure | null;
        actionRequired: 'none' | 'reorder' | 'request_resend' | 'reset_stream';
    };
    /**
     * Check for duplicate messages
     */
    private checkForDuplicate;
    /**
     * Validate message sequence ordering
     */
    private validateSequence;
    /**
     * Buffer out-of-order message for later processing
     */
    private bufferOutOfOrderMessage;
    /**
     * Process buffered messages that can now be delivered
     */
    private processOrderingBuffer;
    /**
     * Process valid message and update session state
     */
    private processValidMessage;
    /**
     * Handle sequence issues and failures
     */
    private handleSequenceIssue;
    /**
     * Create duplicate message failure record
     */
    private createDuplicateMessageFailure;
    /**
     * Create lost message failure record
     */
    private createLostMessageFailure;
    /**
     * Create out-of-order failure record
     */
    private createOutOfOrderFailure;
    /**
     * Create session not found failure record
     */
    private createSessionNotFoundFailure;
    /**
     * Build streaming context for failure records
     */
    private buildStreamingContext;
    /**
     * Update session health based on recent activity
     */
    private updateSessionHealth;
    /**
     * Start health monitoring for all sessions
     */
    private startHealthMonitoring;
    /**
     * Perform health checks on all active sessions
     */
    private performHealthChecks;
    /**
     * Handle inactive stream
     */
    private handleInactiveStream;
    /**
     * Handle failing stream
     */
    private handleFailingStream;
    /**
     * Clean duplicate detection window
     */
    private cleanDuplicateDetectionWindow;
    /**
     * Record failure for neural training
     */
    private recordFailure;
    /**
     * Export neural training data
     */
    private exportNeuralTrainingData;
    /**
     * Generate unique session ID
     */
    private generateSessionId;
    /**
     * Get streaming statistics
     */
    getStreamingStatistics(): {
        totalSessions: number;
        activeSessions: number;
        totalFailures: number;
        failuresByType: Record<string, number>;
        healthySessions: number;
        degradedSessions: number;
        failingSessions: number;
    };
    /**
     * Close streaming session
     */
    closeSession(sessionId: string): void;
    /**
     * Cleanup all sessions
     */
    cleanup(): void;
}
export default MessageStreamingValidator;
//# sourceMappingURL=message-streaming-validator.d.ts.map