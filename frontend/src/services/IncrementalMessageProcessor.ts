/**
 * Incremental Message Processor - Frontend SSE Stream Handling
 * Processes SSE messages incrementally to prevent UI blocking and memory accumulation
 */

export interface ProcessedMessage {
  id: string;
  instanceId: string;
  content: string;
  timestamp: number;
  sequenceNumber: number;
  processed: boolean;
  type: 'output' | 'error' | 'info' | 'status';
  source?: string;
  checksum?: string;
}

export interface ProcessingStats {
  totalMessages: number;
  processedMessages: number;
  pendingMessages: number;
  memoryUsage: number;
  averageProcessingTime: number;
  lastProcessedSequence: number;
}

export class IncrementalMessageProcessor {
  private messageQueues = new Map<string, ProcessedMessage[]>();
  private lastProcessedSequence = new Map<string, number>();
  private processingBuffer = new Map<string, string>();
  private processingStats = new Map<string, ProcessingStats>();
  private processedMessageIds = new Map<string, Set<string>>();
  
  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_BUFFER_SIZE = 64 * 1024; // 64KB
  private readonly DEDUP_CACHE_SIZE = 500;
  private readonly BATCH_SIZE = 10; // Process messages in batches
  
  // Performance tracking
  private processingTimes: number[] = [];
  
  /**
   * Process incoming SSE message incrementally
   */
  processMessage(instanceId: string, rawMessage: any): ProcessedMessage[] {
    const startTime = performance.now();
    
    try {
      // Validate and extract message data
      const messageData = this.extractMessageData(rawMessage);
      if (!messageData) {
        return [];
      }
      
      // Check for duplicates
      if (this.isDuplicateMessage(instanceId, messageData.id)) {
        console.debug(`Skipping duplicate message: ${messageData.id}`);
        return [];
      }
      
      // Check sequence ordering
      const lastSequence = this.lastProcessedSequence.get(instanceId) || 0;
      if (messageData.sequenceNumber && messageData.sequenceNumber <= lastSequence) {
        console.warn(`Skipping out-of-order message: ${messageData.sequenceNumber} <= ${lastSequence}`);
        return [];
      }
      
      // Process the content
      const processedMessages = this.processContent(instanceId, messageData);
      
      // Update statistics
      this.updateStats(instanceId, processedMessages.length, performance.now() - startTime);
      
      return processedMessages;
      
    } catch (error) {
      console.error(`Error processing message for ${instanceId}:`, error);
      return [];
    }
  }
  
  /**
   * Get unprocessed messages for UI update in batches
   */
  getUnprocessedMessages(instanceId: string, batchSize = this.BATCH_SIZE): ProcessedMessage[] {
    const queue = this.messageQueues.get(instanceId) || [];
    const unprocessed = queue.filter(msg => !msg.processed);
    
    // Return only a batch to prevent UI overwhelming
    const batch = unprocessed.slice(0, batchSize);
    
    // Mark batch as processed
    batch.forEach(msg => { 
      msg.processed = true; 
    });
    
    return batch;
  }
  
  /**
   * Get all unprocessed messages (for final UI sync)
   */
  getAllUnprocessedMessages(instanceId: string): ProcessedMessage[] {
    const queue = this.messageQueues.get(instanceId) || [];
    const unprocessed = queue.filter(msg => !msg.processed);
    
    // Mark all as processed
    unprocessed.forEach(msg => { 
      msg.processed = true; 
    });
    
    return unprocessed;
  }
  
  /**
   * Get processing statistics for monitoring
   */
  getProcessingStats(instanceId: string): ProcessingStats | null {
    return this.processingStats.get(instanceId) || null;
  }
  
  /**
   * Get content for display (combines all processed messages)
   */
  getDisplayContent(instanceId: string): string {
    const queue = this.messageQueues.get(instanceId) || [];
    const processedBuffer = this.processingBuffer.get(instanceId) || '';
    
    const content = queue
      .filter(msg => msg.processed)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map(msg => msg.content)
      .join('');
    
    return content + processedBuffer;
  }
  
  /**
   * Clear old messages to prevent memory leaks
   */
  performMaintenance(): void {
    for (const [instanceId, queue] of this.messageQueues.entries()) {
      // Keep only the last MAX_QUEUE_SIZE messages
      if (queue.length > this.MAX_QUEUE_SIZE) {
        const excess = queue.length - this.MAX_QUEUE_SIZE;
        const removed = queue.splice(0, excess);
        
        console.debug(`Removed ${removed.length} old messages for ${instanceId}`);
      }
      
      // Clear old deduplication cache
      const dedupCache = this.processedMessageIds.get(instanceId);
      if (dedupCache && dedupCache.size > this.DEDUP_CACHE_SIZE) {
        const entries = Array.from(dedupCache);
        const toRemove = entries.slice(0, entries.length - this.DEDUP_CACHE_SIZE + 100);
        toRemove.forEach(id => dedupCache.delete(id));
      }
      
      // Limit processing buffer size
      const buffer = this.processingBuffer.get(instanceId) || '';
      if (buffer.length > this.MAX_BUFFER_SIZE) {
        const trimmed = buffer.slice(-this.MAX_BUFFER_SIZE / 2);
        this.processingBuffer.set(instanceId, trimmed);
        console.debug(`Trimmed processing buffer for ${instanceId}`);
      }
    }
    
    // Limit processing time tracking
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-50);
    }
  }
  
  /**
   * Clear all data for an instance
   */
  clearInstance(instanceId: string): void {
    this.messageQueues.delete(instanceId);
    this.lastProcessedSequence.delete(instanceId);
    this.processingBuffer.delete(instanceId);
    this.processingStats.delete(instanceId);
    this.processedMessageIds.delete(instanceId);
    
    console.debug(`Cleared all data for instance: ${instanceId}`);
  }
  
  /**
   * Get overall memory usage estimate
   */
  getMemoryUsage(): number {
    let totalSize = 0;
    
    for (const queue of this.messageQueues.values()) {
      for (const message of queue) {
        totalSize += message.content.length * 2; // Rough estimate for UTF-16
        totalSize += 200; // Approximate object overhead
      }
    }
    
    for (const buffer of this.processingBuffer.values()) {
      totalSize += buffer.length * 2;
    }
    
    return totalSize;
  }
  
  /**
   * Recovery from sequence gap (request backfill)
   */
  async handleSequenceGap(instanceId: string, expectedSequence: number, receivedSequence: number): Promise<void> {
    console.warn(`Sequence gap detected for ${instanceId}: expected ${expectedSequence}, received ${receivedSequence}`);
    
    try {
      // Request backfill from server
      const response = await fetch(`/api/claude/instances/${instanceId}/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromSequence: expectedSequence,
          toSequence: receivedSequence - 1
        })
      });
      
      if (response.ok) {
        const backfillData = await response.json();
        if (backfillData.success && backfillData.messages) {
          // Process backfilled messages
          for (const message of backfillData.messages) {
            this.processMessage(instanceId, message);
          }
          console.info(`Backfilled ${backfillData.messages.length} messages for ${instanceId}`);
        }
      } else {
        console.error(`Backfill request failed for ${instanceId}: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`Backfill error for ${instanceId}:`, error);
    }
  }
  
  private extractMessageData(rawMessage: any): any {
    // Handle different message formats
    if (typeof rawMessage === 'string') {
      try {
        rawMessage = JSON.parse(rawMessage);
      } catch {
        return null;
      }
    }
    
    // Extract key fields with fallbacks
    return {
      id: rawMessage.id || `${Date.now()}-${Math.random()}`,
      instanceId: rawMessage.instanceId,
      content: rawMessage.output || rawMessage.data || rawMessage.content || '',
      timestamp: rawMessage.timestamp || Date.now(),
      sequenceNumber: rawMessage.sequenceNumber || 0,
      type: this.determineMessageType(rawMessage),
      source: rawMessage.source || 'unknown',
      checksum: rawMessage.checksum
    };
  }
  
  private determineMessageType(rawMessage: any): ProcessedMessage['type'] {
    if (rawMessage.type === 'output' || rawMessage.output) return 'output';
    if (rawMessage.type === 'error' || rawMessage.isError) return 'error';
    if (rawMessage.type === 'status' || rawMessage.type === 'instance:status') return 'status';
    return 'info';
  }
  
  private isDuplicateMessage(instanceId: string, messageId: string): boolean {
    if (!this.processedMessageIds.has(instanceId)) {
      this.processedMessageIds.set(instanceId, new Set());
    }
    
    const idSet = this.processedMessageIds.get(instanceId)!;
    
    if (idSet.has(messageId)) {
      return true;
    }
    
    idSet.add(messageId);
    return false;
  }
  
  private processContent(instanceId: string, messageData: any): ProcessedMessage[] {
    const { content } = messageData;
    
    if (!content || content.length === 0) {
      return [];
    }
    
    // Get existing buffer for this instance
    const existingBuffer = this.processingBuffer.get(instanceId) || '';
    const combinedContent = existingBuffer + content;
    
    // Process complete lines only
    const lines = combinedContent.split('\\n');
    const completeLines = lines.slice(0, -1); // All but last line
    const incompleteBuffer = lines[lines.length - 1]; // Last line (might be incomplete)
    
    // Update buffer with incomplete line
    this.processingBuffer.set(instanceId, incompleteBuffer);
    
    // Create processed messages for complete lines
    const processedMessages: ProcessedMessage[] = completeLines.map((line, index) => ({
      id: `${messageData.id}-${index}`,
      instanceId,
      content: line + '\\n',
      timestamp: messageData.timestamp,
      sequenceNumber: messageData.sequenceNumber,
      processed: false,
      type: messageData.type,
      source: messageData.source,
      checksum: messageData.checksum
    }));
    
    // Add to queue if we have complete lines
    if (processedMessages.length > 0) {
      this.addToQueue(instanceId, processedMessages);
      
      // Update last processed sequence
      this.lastProcessedSequence.set(instanceId, messageData.sequenceNumber);
    }
    
    return processedMessages;
  }
  
  private addToQueue(instanceId: string, messages: ProcessedMessage[]): void {
    if (!this.messageQueues.has(instanceId)) {
      this.messageQueues.set(instanceId, []);
    }
    
    const queue = this.messageQueues.get(instanceId)!;
    queue.push(...messages);
    
    // Limit queue size immediately
    if (queue.length > this.MAX_QUEUE_SIZE) {
      const excess = queue.length - this.MAX_QUEUE_SIZE;
      queue.splice(0, excess);
    }
  }
  
  private updateStats(instanceId: string, messageCount: number, processingTime: number): void {
    if (!this.processingStats.has(instanceId)) {
      this.processingStats.set(instanceId, {
        totalMessages: 0,
        processedMessages: 0,
        pendingMessages: 0,
        memoryUsage: 0,
        averageProcessingTime: 0,
        lastProcessedSequence: 0
      });
    }
    
    const stats = this.processingStats.get(instanceId)!;
    stats.totalMessages += messageCount;
    stats.processedMessages += messageCount;
    stats.lastProcessedSequence = this.lastProcessedSequence.get(instanceId) || 0;
    
    // Update processing time average
    this.processingTimes.push(processingTime);
    stats.averageProcessingTime = this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    
    // Update pending messages count
    const queue = this.messageQueues.get(instanceId) || [];
    stats.pendingMessages = queue.filter(msg => !msg.processed).length;
    
    // Estimate memory usage for this instance
    const queueMemory = queue.reduce((sum, msg) => sum + msg.content.length * 2 + 200, 0);
    const bufferMemory = (this.processingBuffer.get(instanceId) || '').length * 2;
    stats.memoryUsage = queueMemory + bufferMemory;
  }
}

export default IncrementalMessageProcessor;