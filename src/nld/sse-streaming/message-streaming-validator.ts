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

class MessageStreamingValidator {
  private streamingSessions = new Map<string, StreamingSession>();
  private failureHistory: MessageStreamingFailure[] = [];
  private messageDeduplicator = new Map<string, Set<string>>();
  private orderingBuffer = new Map<string, StreamMessage[]>();
  
  private readonly MAX_SEQUENCE_GAP = 5;
  private readonly MESSAGE_TIMEOUT = 10000;
  private readonly DUPLICATE_DETECTION_WINDOW = 60000;
  private readonly ORDERING_BUFFER_SIZE = 50;
  private readonly HEALTH_CHECK_INTERVAL = 5000;

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Initialize streaming session
   */
  public initializeStream(streamId: string): string {
    const sessionId = this.generateSessionId(streamId);
    
    const session: StreamingSession = {
      sessionId,
      streamId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      expectedSequence: 0,
      receivedMessages: new Map(),
      messageBuffer: [],
      isActive: true,
      health: 'healthy'
    };

    this.streamingSessions.set(sessionId, session);
    this.messageDeduplicator.set(streamId, new Set());
    this.orderingBuffer.set(streamId, []);

    console.log(`[NLD-Stream] Stream initialized: ${streamId} (${sessionId})`);
    return sessionId;
  }

  /**
   * Validate incoming message and detect streaming issues
   */
  public validateMessage(
    sessionId: string, 
    message: Omit<StreamMessage, 'retryCount'>
  ): {
    isValid: boolean;
    processedMessage: StreamMessage | null;
    failure: MessageStreamingFailure | null;
    actionRequired: 'none' | 'reorder' | 'request_resend' | 'reset_stream';
  } {
    const session = this.streamingSessions.get(sessionId);
    if (!session) {
      return {
        isValid: false,
        processedMessage: null,
        failure: this.createSessionNotFoundFailure(sessionId, message),
        actionRequired: 'reset_stream'
      };
    }

    const fullMessage: StreamMessage = { ...message, retryCount: 0 };
    session.lastActivity = Date.now();

    // Check for duplicate messages
    const duplicateCheck = this.checkForDuplicate(session.streamId, fullMessage);
    if (duplicateCheck.isDuplicate) {
      const failure = this.createDuplicateMessageFailure(session, fullMessage, duplicateCheck.originalMessage);
      this.recordFailure(failure);
      return {
        isValid: false,
        processedMessage: null,
        failure,
        actionRequired: 'none'
      };
    }

    // Validate message sequence
    const sequenceValidation = this.validateSequence(session, fullMessage);
    if (!sequenceValidation.isValid) {
      this.handleSequenceIssue(session, fullMessage, sequenceValidation);
      return {
        isValid: false,
        processedMessage: null,
        failure: sequenceValidation.failure,
        actionRequired: sequenceValidation.actionRequired
      };
    }

    // Process message successfully
    this.processValidMessage(session, fullMessage);
    
    // Check for any messages that can now be delivered from buffer
    const bufferedMessages = this.processOrderingBuffer(session);

    return {
      isValid: true,
      processedMessage: fullMessage,
      failure: null,
      actionRequired: 'none'
    };
  }

  /**
   * Check for duplicate messages
   */
  private checkForDuplicate(streamId: string, message: StreamMessage): {
    isDuplicate: boolean;
    originalMessage?: StreamMessage;
  } {
    const duplicateSet = this.messageDeduplicator.get(streamId);
    if (!duplicateSet) return { isDuplicate: false };

    const messageKey = `${message.messageId}_${message.sequenceNumber}`;
    
    if (duplicateSet.has(messageKey)) {
      // Find original message for comparison
      for (const session of this.streamingSessions.values()) {
        if (session.streamId === streamId) {
          const originalMessage = session.receivedMessages.get(message.sequenceNumber);
          if (originalMessage && originalMessage.messageId === message.messageId) {
            return { isDuplicate: true, originalMessage };
          }
        }
      }
      return { isDuplicate: true };
    }

    // Add to duplicate detection set
    duplicateSet.add(messageKey);
    
    // Clean old entries to prevent memory growth
    this.cleanDuplicateDetectionWindow(streamId);
    
    return { isDuplicate: false };
  }

  /**
   * Validate message sequence ordering
   */
  private validateSequence(session: StreamingSession, message: StreamMessage): {
    isValid: boolean;
    failure?: MessageStreamingFailure;
    actionRequired: 'none' | 'reorder' | 'request_resend';
  } {
    const expectedSeq = session.expectedSequence;
    const actualSeq = message.sequenceNumber;

    // Message is in perfect sequence
    if (actualSeq === expectedSeq) {
      return { isValid: true, actionRequired: 'none' };
    }

    // Message arrived early (out of order)
    if (actualSeq > expectedSeq) {
      const gap = actualSeq - expectedSeq;
      
      if (gap <= this.MAX_SEQUENCE_GAP) {
        // Buffer message for later processing
        this.bufferOutOfOrderMessage(session, message);
        return { isValid: false, actionRequired: 'reorder' };
      } else {
        // Large gap indicates lost messages
        const failure = this.createLostMessageFailure(session, expectedSeq, actualSeq);
        return { 
          isValid: false, 
          failure,
          actionRequired: 'request_resend' 
        };
      }
    }

    // Message arrived late (duplicate or very delayed)
    if (actualSeq < expectedSeq) {
      const failure = this.createOutOfOrderFailure(session, message, expectedSeq);
      return { 
        isValid: false, 
        failure,
        actionRequired: 'none' 
      };
    }

    return { isValid: false, actionRequired: 'none' };
  }

  /**
   * Buffer out-of-order message for later processing
   */
  private bufferOutOfOrderMessage(session: StreamingSession, message: StreamMessage): void {
    const buffer = this.orderingBuffer.get(session.streamId) || [];
    
    // Insert message in sequence order
    const insertIndex = buffer.findIndex(m => m.sequenceNumber > message.sequenceNumber);
    if (insertIndex === -1) {
      buffer.push(message);
    } else {
      buffer.splice(insertIndex, 0, message);
    }

    // Limit buffer size to prevent memory issues
    if (buffer.length > this.ORDERING_BUFFER_SIZE) {
      const removedMessage = buffer.shift();
      if (removedMessage) {
        console.warn(`[NLD-Stream] Buffer overflow, dropping message: ${removedMessage.messageId}`);
      }
    }

    this.orderingBuffer.set(session.streamId, buffer);
    console.log(`[NLD-Stream] Message buffered for reordering: seq=${message.sequenceNumber}, expected=${session.expectedSequence}`);
  }

  /**
   * Process buffered messages that can now be delivered
   */
  private processOrderingBuffer(session: StreamingSession): StreamMessage[] {
    const buffer = this.orderingBuffer.get(session.streamId) || [];
    const deliveredMessages: StreamMessage[] = [];
    
    let expectedSeq = session.expectedSequence;
    let messageIndex = 0;

    while (messageIndex < buffer.length) {
      const message = buffer[messageIndex];
      
      if (message.sequenceNumber === expectedSeq) {
        // Message can be delivered
        buffer.splice(messageIndex, 1);
        this.processValidMessage(session, message);
        deliveredMessages.push(message);
        expectedSeq++;
      } else {
        // Gap in sequence, stop processing
        break;
      }
    }

    if (deliveredMessages.length > 0) {
      console.log(`[NLD-Stream] Delivered ${deliveredMessages.length} buffered messages`);
    }

    return deliveredMessages;
  }

  /**
   * Process valid message and update session state
   */
  private processValidMessage(session: StreamingSession, message: StreamMessage): void {
    // Store message
    session.receivedMessages.set(message.sequenceNumber, message);
    session.expectedSequence = message.sequenceNumber + 1;
    
    // Add message to session buffer for recent access
    session.messageBuffer.push(message);
    if (session.messageBuffer.length > 100) {
      session.messageBuffer.shift();
    }

    // Update session health
    this.updateSessionHealth(session);
    
    console.log(`[NLD-Stream] Message processed: ${message.messageId} (seq=${message.sequenceNumber})`);
  }

  /**
   * Handle sequence issues and failures
   */
  private handleSequenceIssue(
    session: StreamingSession, 
    message: StreamMessage, 
    validation: { failure?: MessageStreamingFailure; actionRequired: string }
  ): void {
    if (validation.failure) {
      this.recordFailure(validation.failure);
    }

    session.health = 'degraded';
    console.warn(`[NLD-Stream] Sequence issue detected:`, validation);
  }

  /**
   * Create duplicate message failure record
   */
  private createDuplicateMessageFailure(
    session: StreamingSession, 
    message: StreamMessage,
    originalMessage?: StreamMessage
  ): MessageStreamingFailure {
    return {
      failureId: `STREAM_DUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: 'DUPLICATE_MESSAGE',
      streamId: session.streamId,
      expectedSequence: session.expectedSequence,
      actualSequence: message.sequenceNumber,
      detectedAt: Date.now(),
      severity: 'medium',
      messageData: {
        messageId: message.messageId,
        content: message.content.substring(0, 200),
        timestamp: message.timestamp,
        size: message.size
      },
      streamingContext: this.buildStreamingContext(session)
    };
  }

  /**
   * Create lost message failure record
   */
  private createLostMessageFailure(
    session: StreamingSession, 
    expectedSeq: number, 
    actualSeq: number
  ): MessageStreamingFailure {
    const lostCount = actualSeq - expectedSeq;
    
    return {
      failureId: `STREAM_LOST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: 'LOST_MESSAGE',
      streamId: session.streamId,
      expectedSequence: expectedSeq,
      actualSequence: actualSeq,
      detectedAt: Date.now(),
      severity: lostCount > 3 ? 'critical' : lostCount > 1 ? 'high' : 'medium',
      messageData: {
        messageId: `lost_${expectedSeq}_to_${actualSeq - 1}`,
        content: `${lostCount} messages lost`,
        timestamp: Date.now(),
        size: 0
      },
      streamingContext: {
        ...this.buildStreamingContext(session),
        lostMessages: this.buildStreamingContext(session).lostMessages + lostCount
      }
    };
  }

  /**
   * Create out-of-order failure record
   */
  private createOutOfOrderFailure(
    session: StreamingSession, 
    message: StreamMessage, 
    expectedSeq: number
  ): MessageStreamingFailure {
    return {
      failureId: `STREAM_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: 'MESSAGE_ORDERING_ISSUE',
      streamId: session.streamId,
      expectedSequence: expectedSeq,
      actualSequence: message.sequenceNumber,
      detectedAt: Date.now(),
      severity: 'medium',
      messageData: {
        messageId: message.messageId,
        content: message.content.substring(0, 200),
        timestamp: message.timestamp,
        size: message.size
      },
      streamingContext: {
        ...this.buildStreamingContext(session),
        outOfOrderMessages: this.buildStreamingContext(session).outOfOrderMessages + 1
      }
    };
  }

  /**
   * Create session not found failure record
   */
  private createSessionNotFoundFailure(sessionId: string, message: Omit<StreamMessage, 'retryCount'>): MessageStreamingFailure {
    return {
      failureId: `STREAM_SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: 'STREAMING_INTERRUPTION',
      streamId: message.streamId,
      expectedSequence: 0,
      actualSequence: message.sequenceNumber,
      detectedAt: Date.now(),
      severity: 'high',
      messageData: {
        messageId: message.messageId,
        content: message.content.substring(0, 200),
        timestamp: message.timestamp,
        size: message.size
      },
      streamingContext: {
        totalMessages: 0,
        lostMessages: 0,
        duplicateMessages: 0,
        outOfOrderMessages: 0,
        streamDuration: 0
      }
    };
  }

  /**
   * Build streaming context for failure records
   */
  private buildStreamingContext(session: StreamingSession): MessageStreamingFailure['streamingContext'] {
    const now = Date.now();
    const buffer = this.orderingBuffer.get(session.streamId) || [];
    
    // Calculate statistics
    let duplicateMessages = 0;
    let outOfOrderMessages = 0;
    let lostMessages = 0;

    // Count duplicates from recent failures
    const recentFailures = this.failureHistory.filter(f => 
      f.streamId === session.streamId && 
      now - f.detectedAt < this.DUPLICATE_DETECTION_WINDOW
    );

    duplicateMessages = recentFailures.filter(f => f.failureType === 'DUPLICATE_MESSAGE').length;
    outOfOrderMessages = recentFailures.filter(f => f.failureType === 'MESSAGE_ORDERING_ISSUE').length;
    lostMessages = recentFailures
      .filter(f => f.failureType === 'LOST_MESSAGE')
      .reduce((sum, f) => sum + (f.actualSequence - f.expectedSequence), 0);

    return {
      totalMessages: session.receivedMessages.size,
      lostMessages,
      duplicateMessages,
      outOfOrderMessages: outOfOrderMessages + buffer.length,
      streamDuration: now - session.startTime
    };
  }

  /**
   * Update session health based on recent activity
   */
  private updateSessionHealth(session: StreamingSession): void {
    const now = Date.now();
    const recentFailures = this.failureHistory.filter(f => 
      f.streamId === session.streamId && 
      now - f.detectedAt < 60000 // 1 minute window
    );

    const criticalFailures = recentFailures.filter(f => f.severity === 'critical').length;
    const highFailures = recentFailures.filter(f => f.severity === 'high').length;
    const totalFailures = recentFailures.length;

    if (criticalFailures > 0 || totalFailures > 10) {
      session.health = 'failing';
    } else if (highFailures > 2 || totalFailures > 5) {
      session.health = 'degraded';
    } else {
      session.health = 'healthy';
    }
  }

  /**
   * Start health monitoring for all sessions
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all active sessions
   */
  private performHealthChecks(): void {
    const now = Date.now();

    for (const [sessionId, session] of this.streamingSessions.entries()) {
      if (!session.isActive) continue;

      // Check for inactive streams
      const timeSinceActivity = now - session.lastActivity;
      if (timeSinceActivity > this.MESSAGE_TIMEOUT * 3) {
        this.handleInactiveStream(session);
      }

      // Check for degraded streams
      if (session.health === 'failing') {
        this.handleFailingStream(session);
      }

      // Update session health
      this.updateSessionHealth(session);
    }
  }

  /**
   * Handle inactive stream
   */
  private handleInactiveStream(session: StreamingSession): void {
    const failure: MessageStreamingFailure = {
      failureId: `STREAM_INACTIVE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType: 'STREAMING_INTERRUPTION',
      streamId: session.streamId,
      expectedSequence: session.expectedSequence,
      actualSequence: 0,
      detectedAt: Date.now(),
      severity: 'high',
      messageData: {
        messageId: 'stream_timeout',
        content: 'Stream became inactive',
        timestamp: session.lastActivity,
        size: 0
      },
      streamingContext: this.buildStreamingContext(session)
    };

    this.recordFailure(failure);
    session.health = 'failing';
    
    console.warn(`[NLD-Stream] Stream inactive: ${session.streamId}`);
  }

  /**
   * Handle failing stream
   */
  private handleFailingStream(session: StreamingSession): void {
    console.warn(`[NLD-Stream] Stream failing: ${session.streamId}, considering reset`);
    
    // Could trigger stream reset or recovery procedures
    session.isActive = false;
  }

  /**
   * Clean duplicate detection window
   */
  private cleanDuplicateDetectionWindow(streamId: string): void {
    // This is a simplified cleanup - in practice, you'd need timestamp-based cleanup
    const duplicateSet = this.messageDeduplicator.get(streamId);
    if (duplicateSet && duplicateSet.size > 1000) {
      duplicateSet.clear();
    }
  }

  /**
   * Record failure for neural training
   */
  private recordFailure(failure: MessageStreamingFailure): void {
    this.failureHistory.push(failure);
    
    // Keep only last 200 failures
    if (this.failureHistory.length > 200) {
      this.failureHistory.shift();
    }

    this.exportNeuralTrainingData(failure);
    console.warn(`[NLD-Stream] Streaming failure recorded:`, failure);
  }

  /**
   * Export neural training data
   */
  private exportNeuralTrainingData(failure: MessageStreamingFailure): void {
    const trainingData = {
      failure,
      context: {
        totalSessions: this.streamingSessions.size,
        activeSessions: Array.from(this.streamingSessions.values()).filter(s => s.isActive).length,
        totalFailures: this.failureHistory.length,
        timestamp: Date.now()
      }
    };

    console.log(`[NLD-Stream] Neural training data exported:`, trainingData);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(streamId: string): string {
    return `stream_${streamId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get streaming statistics
   */
  public getStreamingStatistics(): {
    totalSessions: number;
    activeSessions: number;
    totalFailures: number;
    failuresByType: Record<string, number>;
    healthySessions: number;
    degradedSessions: number;
    failingSessions: number;
  } {
    const sessions = Array.from(this.streamingSessions.values());
    const failuresByType = this.failureHistory.reduce((acc, failure) => {
      acc[failure.failureType] = (acc[failure.failureType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.isActive).length,
      totalFailures: this.failureHistory.length,
      failuresByType,
      healthySessions: sessions.filter(s => s.health === 'healthy').length,
      degradedSessions: sessions.filter(s => s.health === 'degraded').length,
      failingSessions: sessions.filter(s => s.health === 'failing').length
    };
  }

  /**
   * Close streaming session
   */
  public closeSession(sessionId: string): void {
    const session = this.streamingSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.messageDeduplicator.delete(session.streamId);
      this.orderingBuffer.delete(session.streamId);
      this.streamingSessions.delete(sessionId);
      console.log(`[NLD-Stream] Session closed: ${sessionId}`);
    }
  }

  /**
   * Cleanup all sessions
   */
  public cleanup(): void {
    for (const sessionId of this.streamingSessions.keys()) {
      this.closeSession(sessionId);
    }
    this.failureHistory.length = 0;
  }
}

export default MessageStreamingValidator;