/**
 * Backend Message Sequencing Agent
 * SPARC Implementation - Handles WebSocket message ordering and delivery guarantees
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface SequencedMessage {
  id: string;
  sequenceId: number;
  type: 'chat' | 'system' | 'tool' | 'error';
  instanceId: string;
  content: string;
  metadata: {
    timestamp: string;
    retryCount: number;
    priority: 'high' | 'normal' | 'low';
    clientId?: string;
  };
}

interface MessageQueueEntry {
  message: SequencedMessage;
  callback?: (error?: Error) => void;
  attempts: number;
  nextRetry: Date;
}

export class BackendMessageSequencingAgent extends EventEmitter {
  private messageQueue: Map<string, MessageQueueEntry[]> = new Map();
  private sequenceCounters: Map<string, number> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor() {
    super();
    this.startQueueProcessor();
    logger.info('BackendMessageSequencingAgent initialized');
  }

  /**
   * Add message to sequenced queue for delivery
   */
  public enqueueMessage(
    instanceId: string,
    type: SequencedMessage['type'],
    content: string,
    metadata: Partial<SequencedMessage['metadata']> = {},
    callback?: (error?: Error) => void
  ): string {
    const sequenceId = this.getNextSequenceId(instanceId);
    const messageId = `${instanceId}-${sequenceId}-${Date.now()}`;

    const message: SequencedMessage = {
      id: messageId,
      sequenceId,
      type,
      instanceId,
      content,
      metadata: {
        timestamp: new Date().toISOString(),
        retryCount: 0,
        priority: 'normal',
        ...metadata
      }
    };

    const queueEntry: MessageQueueEntry = {
      message,
      callback,
      attempts: 0,
      nextRetry: new Date()
    };

    this.addToQueue(instanceId, queueEntry);
    this.emit('messageQueued', message);
    
    logger.debug(`Message queued: ${messageId} (seq: ${sequenceId})`);
    return messageId;
  }

  /**
   * Get next sequence ID for instance
   */
  private getNextSequenceId(instanceId: string): number {
    const current = this.sequenceCounters.get(instanceId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(instanceId, next);
    return next;
  }

  /**
   * Add message to instance queue
   */
  private addToQueue(instanceId: string, entry: MessageQueueEntry): void {
    if (!this.messageQueue.has(instanceId)) {
      this.messageQueue.set(instanceId, []);
    }

    const queue = this.messageQueue.get(instanceId)!;
    
    // Insert in sequence order
    const insertIndex = queue.findIndex(
      item => item.message.sequenceId > entry.message.sequenceId
    );
    
    if (insertIndex === -1) {
      queue.push(entry);
    } else {
      queue.splice(insertIndex, 0, entry);
    }

    this.startProcessingForInstance(instanceId);
  }

  /**
   * Start queue processor for specific instance
   */
  private startProcessingForInstance(instanceId: string): void {
    if (this.processingIntervals.has(instanceId)) return;

    const interval = setInterval(() => {
      this.processQueueForInstance(instanceId);
    }, 100); // Process every 100ms

    this.processingIntervals.set(instanceId, interval);
  }

  /**
   * Process queued messages for instance
   */
  private async processQueueForInstance(instanceId: string): Promise<void> {
    const queue = this.messageQueue.get(instanceId);
    if (!queue || queue.length === 0) {
      this.stopProcessingForInstance(instanceId);
      return;
    }

    const now = new Date();
    let processedAny = false;

    // Process messages in sequence order
    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i];
      
      if (entry.nextRetry > now) continue;

      try {
        await this.deliverMessage(entry.message);
        
        // Message delivered successfully
        queue.splice(i, 1);
        i--; // Adjust index after removal
        processedAny = true;
        
        if (entry.callback) {
          entry.callback();
        }

        this.emit('messageDelivered', entry.message);
        logger.debug(`Message delivered: ${entry.message.id}`);

      } catch (error) {
        entry.attempts++;
        entry.message.metadata.retryCount = entry.attempts;

        if (entry.attempts >= this.maxRetries) {
          // Max retries reached, remove from queue
          queue.splice(i, 1);
          i--; // Adjust index after removal
          processedAny = true;

          const errorMessage = `Message delivery failed after ${this.maxRetries} attempts: ${error.message}`;
          logger.error(`Message failed permanently: ${entry.message.id}`, error);

          if (entry.callback) {
            entry.callback(new Error(errorMessage));
          }

          this.emit('messageFailed', entry.message, error);
        } else {
          // Schedule retry with exponential backoff
          const delay = this.baseRetryDelay * Math.pow(2, entry.attempts - 1);
          entry.nextRetry = new Date(now.getTime() + delay);
          
          logger.warn(`Message retry scheduled: ${entry.message.id} (attempt ${entry.attempts}/${this.maxRetries})`);
          this.emit('messageRetry', entry.message, entry.attempts);
        }
      }
    }

    if (processedAny) {
      this.emit('queueProcessed', instanceId, queue.length);
    }
  }

  /**
   * Deliver message to WebSocket clients
   */
  private async deliverMessage(message: SequencedMessage): Promise<void> {
    // This will be implemented by the WebSocket handler
    // For now, emit event that can be caught by the handler
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message delivery timeout'));
      }, 5000);

      this.emit('deliverMessage', message, (error?: Error) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Stop processing for instance
   */
  private stopProcessingForInstance(instanceId: string): void {
    const interval = this.processingIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.processingIntervals.delete(instanceId);
    }
  }

  /**
   * Start global queue processor
   */
  private startQueueProcessor(): void {
    // Global cleanup every 30 seconds
    setInterval(() => {
      this.cleanupEmptyQueues();
    }, 30000);
  }

  /**
   * Clean up empty queues
   */
  private cleanupEmptyQueues(): void {
    for (const [instanceId, queue] of this.messageQueue.entries()) {
      if (queue.length === 0) {
        this.messageQueue.delete(instanceId);
        this.stopProcessingForInstance(instanceId);
      }
    }
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [instanceId, queue] of this.messageQueue.entries()) {
      stats[instanceId] = {
        queueLength: queue.length,
        sequenceId: this.sequenceCounters.get(instanceId) || 0,
        oldestMessage: queue.length > 0 ? queue[0].message.metadata.timestamp : null,
        retryingMessages: queue.filter(entry => entry.attempts > 0).length
      };
    }

    return stats;
  }

  /**
   * Shutdown agent
   */
  public shutdown(): void {
    // Stop all processing intervals
    for (const interval of this.processingIntervals.values()) {
      clearInterval(interval);
    }
    this.processingIntervals.clear();

    // Clear queues
    this.messageQueue.clear();
    this.sequenceCounters.clear();

    logger.info('BackendMessageSequencingAgent shutdown complete');
  }
}

export default BackendMessageSequencingAgent;