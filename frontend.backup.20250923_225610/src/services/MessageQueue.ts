/**
 * Robust Message Queue System for Frontend
 * Handles message ordering, deduplication, and retry mechanisms
 */

export interface QueuedMessage {
  id: string;
  type: 'chat' | 'terminal' | 'tool_usage' | 'system';
  subtype?: string;
  content: any;
  timestamp: number;
  sequence: number;
  instanceId: string;
  acknowledged?: boolean;
  retryCount?: number;
  maxRetries?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface MessageQueueConfig {
  maxSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  deduplicationWindow?: number; // ms
  processingBatchSize?: number;
}

export interface MessageConsumer {
  onMessage: (message: QueuedMessage) => Promise<void> | void;
  onError?: (error: Error, message: QueuedMessage) => void;
  filter?: (message: QueuedMessage) => boolean;
}

const DEFAULT_CONFIG: Required<MessageQueueConfig> = {
  maxSize: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  deduplicationWindow: 5000,
  processingBatchSize: 50
};

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private processed = new Set<string>();
  private processing = new Map<string, Promise<void>>();
  private consumers: MessageConsumer[] = [];
  private config: Required<MessageQueueConfig>;
  private sequenceCounter = 0;
  private isProcessing = false;
  private processingTimer?: NodeJS.Timeout;
  private deduplicationMap = new Map<string, number>();

  constructor(config: MessageQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicProcessing();
    this.startDeduplicationCleanup();
  }

  /**
   * Add message to queue with deduplication
   */
  enqueue(message: Omit<QueuedMessage, 'sequence' | 'timestamp'>): boolean {
    const now = Date.now();
    const messageId = message.id;

    // Deduplication check
    if (this.deduplicationMap.has(messageId)) {
      const lastSeen = this.deduplicationMap.get(messageId)!;
      if (now - lastSeen < this.config.deduplicationWindow) {
        console.log(`[MessageQueue] Duplicate message filtered: ${messageId}`);
        return false;
      }
    }

    // Check if already processed
    if (this.processed.has(messageId)) {
      console.log(`[MessageQueue] Already processed message: ${messageId}`);
      return false;
    }

    // Queue size management
    if (this.queue.length >= this.config.maxSize) {
      // Remove oldest low priority messages
      const removeCount = Math.ceil(this.config.maxSize * 0.1);
      this.queue = this.queue
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            const priorityOrder = { low: 0, normal: 1, high: 2, urgent: 3 };
            return priorityOrder[b.priority || 'normal'] - priorityOrder[a.priority || 'normal'];
          }
          return b.timestamp - a.timestamp;
        })
        .slice(0, -removeCount);
    }

    const queuedMessage: QueuedMessage = {
      ...message,
      sequence: ++this.sequenceCounter,
      timestamp: now,
      acknowledged: false,
      retryCount: 0,
      maxRetries: this.config.retryAttempts,
      priority: message.priority || 'normal'
    };

    // Insert with priority ordering
    this.insertWithPriority(queuedMessage);
    this.deduplicationMap.set(messageId, now);

    console.log(`[MessageQueue] Enqueued message: ${messageId} (type: ${message.type}, priority: ${queuedMessage.priority})`);
    this.scheduleProcessing();
    return true;
  }

  /**
   * Insert message maintaining priority order
   */
  private insertWithPriority(message: QueuedMessage) {
    const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
    const messagePriority = priorityOrder[message.priority!];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority!];
      if (messagePriority > queuePriority || 
          (messagePriority === queuePriority && message.timestamp < this.queue[i].timestamp)) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  /**
   * Register message consumer
   */
  addConsumer(consumer: MessageConsumer) {
    this.consumers.push(consumer);
    console.log(`[MessageQueue] Added consumer (total: ${this.consumers.length})`);
  }

  /**
   * Remove message consumer
   */
  removeConsumer(consumer: MessageConsumer) {
    const index = this.consumers.indexOf(consumer);
    if (index > -1) {
      this.consumers.splice(index, 1);
      console.log(`[MessageQueue] Removed consumer (total: ${this.consumers.length})`);
    }
  }

  /**
   * Acknowledge message processing
   */
  acknowledge(messageId: string) {
    const message = this.queue.find(m => m.id === messageId);
    if (message) {
      message.acknowledged = true;
      this.processed.add(messageId);
      console.log(`[MessageQueue] Acknowledged message: ${messageId}`);
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const typeStats = this.queue.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityStats = this.queue.reduce((acc, msg) => {
      const priority = msg.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      queueSize: this.queue.length,
      processedCount: this.processed.size,
      processingCount: this.processing.size,
      consumerCount: this.consumers.length,
      sequenceCounter: this.sequenceCounter,
      typeStats,
      priorityStats,
      deduplicationMapSize: this.deduplicationMap.size,
      oldestMessage: this.queue.length > 0 ? this.queue[0].timestamp : null,
      newestMessage: this.queue.length > 0 ? this.queue[this.queue.length - 1].timestamp : null
    };
  }

  /**
   * Clear messages for specific instance
   */
  clearInstance(instanceId: string) {
    const oldSize = this.queue.length;
    this.queue = this.queue.filter(msg => msg.instanceId !== instanceId);
    const cleared = oldSize - this.queue.length;
    console.log(`[MessageQueue] Cleared ${cleared} messages for instance: ${instanceId}`);
  }

  /**
   * Process queued messages
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.splice(0, Math.min(this.config.processingBatchSize, this.queue.length));

    console.log(`[MessageQueue] Processing batch of ${batch.length} messages`);

    for (const message of batch) {
      if (this.processing.has(message.id)) {
        console.log(`[MessageQueue] Message ${message.id} already processing`);
        continue;
      }

      const processingPromise = this.processMessage(message)
        .finally(() => {
          this.processing.delete(message.id);
        });
      
      this.processing.set(message.id, processingPromise);
      
      // Don't await here to allow parallel processing
    }

    // Wait for all messages in batch to complete
    await Promise.allSettled(Array.from(this.processing.values()));
    
    this.isProcessing = false;

    // Schedule next batch if more messages exist
    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(message: QueuedMessage) {
    const applicableConsumers = this.consumers.filter(consumer => 
      !consumer.filter || consumer.filter(message)
    );

    if (applicableConsumers.length === 0) {
      console.log(`[MessageQueue] No consumers for message: ${message.id}`);
      this.processed.add(message.id);
      return;
    }

    const results = await Promise.allSettled(
      applicableConsumers.map(async (consumer) => {
        try {
          await consumer.onMessage(message);
        } catch (error) {
          console.error(`[MessageQueue] Consumer error for message ${message.id}:`, error);
          consumer.onError?.(error as Error, message);
          throw error;
        }
      })
    );

    const failures = results.filter(result => result.status === 'rejected');
    
    if (failures.length > 0 && (message.retryCount || 0) < (message.maxRetries || 0)) {
      // Retry with exponential backoff
      const retryDelay = this.config.retryDelay * Math.pow(2, message.retryCount || 0);
      message.retryCount = (message.retryCount || 0) + 1;
      
      console.log(`[MessageQueue] Scheduling retry ${message.retryCount} for message ${message.id} in ${retryDelay}ms`);
      
      setTimeout(() => {
        this.insertWithPriority(message);
        this.scheduleProcessing();
      }, retryDelay);
    } else {
      // Mark as processed even if some consumers failed after max retries
      this.processed.add(message.id);
      if (failures.length > 0) {
        console.error(`[MessageQueue] Message ${message.id} failed after ${message.retryCount || 0} retries`);
      }
    }
  }

  /**
   * Schedule processing with debouncing
   */
  private scheduleProcessing() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }
    
    this.processingTimer = setTimeout(() => {
      this.processQueue();
    }, 10); // Small delay for batching
  }

  /**
   * Start periodic processing
   */
  private startPeriodicProcessing() {
    setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, 1000); // Process every second if needed
  }

  /**
   * Clean up old deduplication entries
   */
  private startDeduplicationCleanup() {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.deduplicationWindow;
      
      for (const [id, timestamp] of this.deduplicationMap.entries()) {
        if (timestamp < cutoff) {
          this.deduplicationMap.delete(id);
        }
      }
      
      // Also clean up processed set periodically
      if (this.processed.size > 50000) {
        const toRemove = Array.from(this.processed).slice(0, 25000);
        toRemove.forEach(id => this.processed.delete(id));
        console.log(`[MessageQueue] Cleaned up ${toRemove.length} processed message IDs`);
      }
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Destroy queue and cleanup resources
   */
  destroy() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }
    
    this.queue.length = 0;
    this.processed.clear();
    this.processing.clear();
    this.consumers.length = 0;
    this.deduplicationMap.clear();
    
    console.log('[MessageQueue] Destroyed and cleaned up resources');
  }
}

// Singleton instance for global use
let globalMessageQueue: MessageQueue | null = null;

export const getGlobalMessageQueue = (config?: MessageQueueConfig): MessageQueue => {
  if (!globalMessageQueue) {
    globalMessageQueue = new MessageQueue(config);
  }
  return globalMessageQueue;
};

export const destroyGlobalMessageQueue = () => {
  if (globalMessageQueue) {
    globalMessageQueue.destroy();
    globalMessageQueue = null;
  }
};
