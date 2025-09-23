/**
 * UI State Manager - Optimized UI Update Batching and State Synchronization
 * Prevents UI blocking through intelligent batching and scroll management
 */

import { ProcessedMessage } from './IncrementalMessageProcessor';

export interface UIState {
  instanceId: string;
  outputContent: string;
  lastUpdateTimestamp: number;
  scrollPosition: number;
  isAutoScrollEnabled: boolean;
  pendingUpdates: number;
  totalLines: number;
  memoryUsage: number;
  isVisible: boolean;
  lastSequence: number;
}

export interface ScrollState {
  shouldAutoScroll: boolean;
  userScrolledUp: boolean;
  scrollToBottom: boolean;
  lastScrollTop: number;
}

export interface UpdateBatch {
  instanceId: string;
  updates: (() => void)[];
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

type UIUpdateCallback = (instanceId: string, state: UIState) => void;
type ScrollUpdateCallback = (instanceId: string, scrollState: ScrollState) => void;

export class UIStateManager {
  private states = new Map<string, UIState>();
  private scrollStates = new Map<string, ScrollState>();
  private updateQueues = new Map<string, UpdateBatch>();
  private updateCallbacks = new Set<UIUpdateCallback>();
  private scrollCallbacks = new Set<ScrollUpdateCallback>();
  
  // Batching configuration
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 16; // ~60fps
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_CONTENT_LENGTH = 500 * 1024; // 500KB per instance
  
  // Performance tracking
  private updateMetrics = {
    totalUpdates: 0,
    batchedUpdates: 0,
    averageBatchSize: 0,
    lastBatchTime: 0
  };
  
  /**
   * Queue UI update for batch processing with priority
   */
  queueUpdate(instanceId: string, updateFn: () => void, priority: UpdateBatch['priority'] = 'normal'): void {
    const existing = this.updateQueues.get(instanceId);
    
    if (existing) {
      existing.updates.push(updateFn);
      // Upgrade priority if needed
      if (priority === 'high' && existing.priority !== 'high') {
        existing.priority = priority;
      }
    } else {
      this.updateQueues.set(instanceId, {
        instanceId,
        updates: [updateFn],
        priority,
        timestamp: Date.now()
      });
    }
    
    // Schedule batch processing
    this.scheduleBatchProcessing(priority);
  }
  
  /**
   * Update output content efficiently with content management
   */
  updateOutput(instanceId: string, newMessages: ProcessedMessage[], append = true): void {
    this.queueUpdate(instanceId, () => {
      const state = this.getOrCreateState(instanceId);
      
      if (append) {
        // Append new content
        const newContent = newMessages.map(msg => msg.content).join('');
        state.outputContent += newContent;
        state.totalLines += newContent.split('\\n').length - 1;
      } else {
        // Replace content
        const newContent = newMessages.map(msg => msg.content).join('');
        state.outputContent = newContent;
        state.totalLines = newContent.split('\\n').length;
      }
      
      // Prevent memory overflow by trimming old content
      this.trimContentIfNeeded(state);
      
      state.lastUpdateTimestamp = Date.now();
      state.pendingUpdates++;
      
      // Update sequence tracking
      if (newMessages.length > 0) {
        const maxSequence = Math.max(...newMessages.map(m => m.sequenceNumber));
        state.lastSequence = Math.max(state.lastSequence, maxSequence);
      }
      
      // Trigger React state update
      this.notifyUIUpdate(instanceId, state);
      
    }, newMessages.some(msg => msg.type === 'error') ? 'high' : 'normal');
  }
  
  /**
   * Batch update multiple messages efficiently
   */
  batchUpdateOutput(instanceId: string, messageGroups: ProcessedMessage[][]): void {
    this.queueUpdate(instanceId, () => {
      const state = this.getOrCreateState(instanceId);
      let totalNewContent = '';
      let totalNewLines = 0;
      let maxSequence = state.lastSequence;
      
      for (const messages of messageGroups) {
        const groupContent = messages.map(msg => msg.content).join('');
        totalNewContent += groupContent;
        totalNewLines += groupContent.split('\\n').length - 1;
        
        if (messages.length > 0) {
          maxSequence = Math.max(maxSequence, ...messages.map(m => m.sequenceNumber));
        }
      }
      
      state.outputContent += totalNewContent;
      state.totalLines += totalNewLines;
      state.lastSequence = maxSequence;
      
      this.trimContentIfNeeded(state);
      
      state.lastUpdateTimestamp = Date.now();
      state.pendingUpdates += messageGroups.length;
      
      this.notifyUIUpdate(instanceId, state);
    }, 'normal');
  }
  
  /**
   * Manage scroll position intelligently
   */
  handleScrollUpdate(instanceId: string, element: HTMLElement): void {
    const scrollState = this.getOrCreateScrollState(instanceId);
    const newScrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Determine if user scrolled up
    if (newScrollTop < scrollState.lastScrollTop) {
      scrollState.userScrolledUp = true;
      scrollState.shouldAutoScroll = false;
    }
    
    // Check if user is near bottom (within 50px)
    const isNearBottom = newScrollTop + clientHeight >= scrollHeight - 50;
    
    if (isNearBottom && scrollState.userScrolledUp) {
      // User scrolled back to bottom, re-enable auto-scroll
      scrollState.shouldAutoScroll = true;
      scrollState.userScrolledUp = false;
    }
    
    scrollState.lastScrollTop = newScrollTop;
    
    // Update UI state
    const state = this.getOrCreateState(instanceId);
    state.scrollPosition = newScrollTop;
    
    // Notify scroll callbacks
    this.notifyScrollUpdate(instanceId, scrollState);
  }
  
  /**
   * Enable/disable auto-scroll for instance
   */
  setAutoScroll(instanceId: string, enabled: boolean): void {
    const scrollState = this.getOrCreateScrollState(instanceId);
    scrollState.shouldAutoScroll = enabled;
    
    if (enabled) {
      scrollState.userScrolledUp = false;
      scrollState.scrollToBottom = true;
    }
    
    this.notifyScrollUpdate(instanceId, scrollState);
  }
  
  /**
   * Force scroll to bottom
   */
  scrollToBottom(instanceId: string): void {
    const scrollState = this.getOrCreateScrollState(instanceId);
    scrollState.scrollToBottom = true;
    scrollState.shouldAutoScroll = true;
    scrollState.userScrolledUp = false;
    
    this.notifyScrollUpdate(instanceId, scrollState);
  }
  
  /**
   * Set instance visibility (for performance optimization)
   */
  setInstanceVisibility(instanceId: string, isVisible: boolean): void {
    const state = this.getOrCreateState(instanceId);
    state.isVisible = isVisible;
    
    // If becoming visible, trigger immediate update
    if (isVisible && state.pendingUpdates > 0) {
      this.queueUpdate(instanceId, () => {
        this.notifyUIUpdate(instanceId, state);
      }, 'high');
    }
  }
  
  /**
   * Get current UI state
   */
  getState(instanceId: string): UIState | null {
    return this.states.get(instanceId) || null;
  }
  
  /**
   * Get scroll state
   */
  getScrollState(instanceId: string): ScrollState | null {
    return this.scrollStates.get(instanceId) || null;
  }
  
  /**
   * Add UI update callback
   */
  onUIUpdate(callback: UIUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }
  
  /**
   * Add scroll update callback
   */
  onScrollUpdate(callback: ScrollUpdateCallback): () => void {
    this.scrollCallbacks.add(callback);
    return () => this.scrollCallbacks.delete(callback);
  }
  
  /**
   * Clear state for instance
   */
  clearInstance(instanceId: string): void {
    this.states.delete(instanceId);
    this.scrollStates.delete(instanceId);
    this.updateQueues.delete(instanceId);
    
    console.debug(`Cleared UI state for instance: ${instanceId}`);
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): any {
    return {
      ...this.updateMetrics,
      activeInstances: this.states.size,
      queuedUpdates: Array.from(this.updateQueues.values()).reduce((sum, batch) => sum + batch.updates.length, 0),
      totalMemoryUsage: Array.from(this.states.values()).reduce((sum, state) => sum + state.memoryUsage, 0)
    };
  }
  
  /**
   * Perform maintenance (cleanup old states, optimize memory)
   */
  performMaintenance(): void {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    const staleInstances: string[] = [];
    
    // Find stale instances
    for (const [instanceId, state] of this.states.entries()) {
      if (!state.isVisible && (now - state.lastUpdateTimestamp > staleThreshold)) {
        staleInstances.push(instanceId);
      } else {
        // Trim content for active instances if needed
        this.trimContentIfNeeded(state);
      }
    }
    
    // Remove stale instances
    staleInstances.forEach(instanceId => {
      console.debug(`Removing stale UI state for: ${instanceId}`);
      this.clearInstance(instanceId);
    });
  }
  
  /**
   * Force immediate processing of all queued updates
   */
  flushUpdates(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.processBatchedUpdates();
  }
  
  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.states.clear();
    this.scrollStates.clear();
    this.updateQueues.clear();
    this.updateCallbacks.clear();
    this.scrollCallbacks.clear();
    
    console.log('UIStateManager shutdown completed');
  }
  
  private scheduleBatchProcessing(priority: UpdateBatch['priority']): void {
    // High priority updates get immediate processing
    if (priority === 'high') {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      this.processBatchedUpdates();
      return;
    }
    
    // Normal/low priority updates get batched
    if (this.batchTimeout) {
      return; // Already scheduled
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatchedUpdates();
    }, this.BATCH_DELAY);
  }
  
  private processBatchedUpdates(): void {
    const startTime = performance.now();
    let totalUpdates = 0;
    
    // Sort batches by priority (high first)
    const sortedBatches = Array.from(this.updateQueues.values())
      .sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    for (const batch of sortedBatches) {
      // Process updates for this instance
      const updates = batch.updates.splice(0, this.MAX_BATCH_SIZE);
      
      try {
        updates.forEach(updateFn => updateFn());
        totalUpdates += updates.length;
      } catch (error) {
        console.error(`Error processing batch for ${batch.instanceId}:`, error);
      }
      
      // Remove empty batches
      if (batch.updates.length === 0) {
        this.updateQueues.delete(batch.instanceId);
      }
    }
    
    // Update metrics
    this.updateMetrics.totalUpdates += totalUpdates;
    this.updateMetrics.batchedUpdates++;
    this.updateMetrics.averageBatchSize = this.updateMetrics.totalUpdates / this.updateMetrics.batchedUpdates;
    this.updateMetrics.lastBatchTime = performance.now() - startTime;
    
    this.batchTimeout = null;
    
    // Schedule next batch if there are remaining updates
    if (this.updateQueues.size > 0) {
      this.scheduleBatchProcessing('normal');
    }
  }
  
  private getOrCreateState(instanceId: string): UIState {
    if (!this.states.has(instanceId)) {
      this.states.set(instanceId, {
        instanceId,
        outputContent: '',
        lastUpdateTimestamp: Date.now(),
        scrollPosition: 0,
        isAutoScrollEnabled: true,
        pendingUpdates: 0,
        totalLines: 0,
        memoryUsage: 0,
        isVisible: true,
        lastSequence: 0
      });
    }
    
    return this.states.get(instanceId)!;
  }
  
  private getOrCreateScrollState(instanceId: string): ScrollState {
    if (!this.scrollStates.has(instanceId)) {
      this.scrollStates.set(instanceId, {
        shouldAutoScroll: true,
        userScrolledUp: false,
        scrollToBottom: false,
        lastScrollTop: 0
      });
    }
    
    return this.scrollStates.get(instanceId)!;
  }
  
  private trimContentIfNeeded(state: UIState): void {
    if (state.outputContent.length > this.MAX_CONTENT_LENGTH) {
      // Keep the last portion of content
      const keepLength = Math.floor(this.MAX_CONTENT_LENGTH * 0.75);
      const trimmed = state.outputContent.slice(-keepLength);
      
      // Try to start from a newline to avoid partial lines
      const newlineIndex = trimmed.indexOf('\\n');
      if (newlineIndex > 0 && newlineIndex < 1000) {
        state.outputContent = trimmed.slice(newlineIndex + 1);
      } else {
        state.outputContent = trimmed;
      }
      
      // Recalculate lines
      state.totalLines = state.outputContent.split('\\n').length;
      
      console.debug(`Trimmed content for ${state.instanceId}, new length: ${state.outputContent.length}`);
    }
    
    // Update memory usage estimate
    state.memoryUsage = state.outputContent.length * 2; // UTF-16 estimate
  }
  
  private notifyUIUpdate(instanceId: string, state: UIState): void {
    // Only notify if instance is visible (performance optimization)
    if (!state.isVisible && state.pendingUpdates < 100) {
      return;
    }
    
    this.updateCallbacks.forEach(callback => {
      try {
        callback(instanceId, state);
      } catch (error) {
        console.error('UI update callback error:', error);
      }
    });
  }
  
  private notifyScrollUpdate(instanceId: string, scrollState: ScrollState): void {
    this.scrollCallbacks.forEach(callback => {
      try {
        callback(instanceId, scrollState);
      } catch (error) {
        console.error('Scroll update callback error:', error);
      }
    });
  }
}

export default UIStateManager;