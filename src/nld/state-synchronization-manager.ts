/**
 * State Synchronization Manager - NLD Pattern Prevention
 * Prevents race conditions between SSE data and HTTP API calls
 */

import { mcp__claude_flow__memory_usage, mcp__claude_flow__neural_patterns } from '../utils/mcp-tools';

export interface StateUpdate {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  sequenceNumber: number;
  source: 'sse' | 'http' | 'websocket' | 'local';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

export interface SynchronizationRule {
  id: string;
  name: string;
  condition: (update: StateUpdate, currentState: any) => boolean;
  action: (update: StateUpdate, currentState: any) => any;
  conflictResolution: 'last_write_wins' | 'merge' | 'reject' | 'queue' | 'custom';
  customResolver?: (updates: StateUpdate[]) => StateUpdate;
}

export interface StateConflict {
  id: string;
  type: string;
  conflictingUpdates: StateUpdate[];
  detectedAt: number;
  resolution: 'pending' | 'resolved' | 'failed';
  resolutionStrategy: string;
}

export class StateSynchronizationManager {
  private state: Map<string, any> = new Map();
  private updateQueue: StateUpdate[] = [];
  private processingQueue: Map<string, StateUpdate[]> = new Map();
  private sequenceCounter: number = 0;
  private synchronizationRules: Map<string, SynchronizationRule> = new Map();
  private conflicts: Map<string, StateConflict> = new Map();
  private stateVersions: Map<string, number> = new Map();
  private pendingUpdates: Map<string, StateUpdate[]> = new Map();
  private lockManager = new StateLockManager();
  private isProcessing = false;

  constructor() {
    this.initializeDefaultRules();
    this.startProcessingQueue();
  }

  /**
   * Initialize default synchronization rules
   */
  private initializeDefaultRules(): void {
    const rules: SynchronizationRule[] = [
      {
        id: 'sequence_order',
        name: 'Sequence Order Enforcement',
        condition: (update, state) => {
          const lastSequence = this.getLastSequenceNumber(update.type);
          return update.sequenceNumber <= lastSequence;
        },
        action: (update, state) => {
          console.log(`🔄 [State-Sync] Out of order update detected: ${update.type}#${update.sequenceNumber}`);
          return state; // Don't apply out-of-order updates
        },
        conflictResolution: 'queue'
      },
      {
        id: 'timestamp_validation',
        name: 'Timestamp Validation',
        condition: (update, state) => {
          const stateTimestamp = this.getStateTimestamp(update.type);
          return update.timestamp < stateTimestamp;
        },
        action: (update, state) => {
          console.log(`⏰ [State-Sync] Outdated update rejected: ${update.type}`);
          return state; // Reject outdated updates
        },
        conflictResolution: 'reject'
      },
      {
        id: 'dependency_check',
        name: 'Dependency Validation',
        condition: (update, state) => {
          if (!update.dependencies) return false;
          return update.dependencies.some(dep => !this.state.has(dep));
        },
        action: (update, state) => {
          console.log(`🔗 [State-Sync] Missing dependencies for: ${update.type}`);
          return state; // Queue until dependencies are met
        },
        conflictResolution: 'queue'
      },
      {
        id: 'concurrent_modification',
        name: 'Concurrent Modification Detection',
        condition: (update, state) => {
          return this.lockManager.isLocked(update.type);
        },
        action: (update, state) => {
          console.log(`🔒 [State-Sync] Concurrent modification detected: ${update.type}`);
          return state; // Queue for later processing
        },
        conflictResolution: 'queue'
      }
    ];

    rules.forEach(rule => {
      this.synchronizationRules.set(rule.id, rule);
    });
  }

  /**
   * Apply state update with race condition prevention
   */
  public async applyUpdate(update: StateUpdate): Promise<boolean> {
    // Assign sequence number if not present
    if (!update.sequenceNumber) {
      update.sequenceNumber = ++this.sequenceCounter;
    }

    console.log(`📥 [State-Sync] Applying update: ${update.type}#${update.sequenceNumber} from ${update.source}`);

    // Add to queue for ordered processing
    this.updateQueue.push(update);
    this.sortUpdateQueue();

    // Log for neural pattern learning
    await this.logStateUpdate(update);

    return new Promise((resolve) => {
      // Set up resolution callback
      const checkResolution = () => {
        const processed = this.isUpdateProcessed(update.id);
        if (processed) {
          resolve(true);
        } else {
          setTimeout(checkResolution, 10);
        }
      };
      checkResolution();
    });
  }

  /**
   * Sort update queue by priority and sequence
   */
  private sortUpdateQueue(): void {
    this.updateQueue.sort((a, b) => {
      // First by priority
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by sequence number
      return a.sequenceNumber - b.sequenceNumber;
    });
  }

  /**
   * Process update queue with conflict detection
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) return;

    this.isProcessing = true;

    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()!;
      
      try {
        await this.processUpdate(update);
      } catch (error) {
        console.error('❌ [State-Sync] Update processing error:', error);
        await this.handleProcessingError(update, error as Error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process individual update with conflict detection
   */
  private async processUpdate(update: StateUpdate): Promise<void> {
    console.log(`⚡ [State-Sync] Processing update: ${update.type}#${update.sequenceNumber}`);

    // Check dependencies
    if (update.dependencies && !this.areDependenciesMet(update.dependencies)) {
      console.log(`⏳ [State-Sync] Dependencies not met, queuing: ${update.type}`);
      this.queuePendingUpdate(update);
      return;
    }

    // Acquire lock for this state type
    const lockAcquired = await this.lockManager.acquireLock(update.type, update.id);
    if (!lockAcquired) {
      console.log(`🔒 [State-Sync] Lock acquisition failed, queuing: ${update.type}`);
      this.queuePendingUpdate(update);
      return;
    }

    try {
      // Check for conflicts
      const conflict = this.detectConflict(update);
      if (conflict) {
        await this.resolveConflict(conflict);
        return;
      }

      // Apply synchronization rules
      const currentState = this.state.get(update.type);
      let shouldApply = true;
      let newState = currentState;

      for (const rule of this.synchronizationRules.values()) {
        if (rule.condition(update, currentState)) {
          console.log(`🛡️ [State-Sync] Rule triggered: ${rule.name}`);
          
          if (rule.conflictResolution === 'reject') {
            shouldApply = false;
            break;
          } else if (rule.conflictResolution === 'queue') {
            this.queuePendingUpdate(update);
            return;
          } else {
            newState = rule.action(update, currentState);
          }
        }
      }

      // Apply the update if no rules prevented it
      if (shouldApply) {
        await this.applyStateChange(update, newState);
      }

      // Process any pending updates that might now be ready
      await this.processPendingUpdates(update.type);

    } finally {
      // Always release the lock
      this.lockManager.releaseLock(update.type, update.id);
    }
  }

  /**
   * Detect conflicts between updates
   */
  private detectConflict(update: StateUpdate): StateConflict | null {
    const conflictingUpdates = this.findConflictingUpdates(update);
    
    if (conflictingUpdates.length > 0) {
      const conflict: StateConflict = {
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: update.type,
        conflictingUpdates: [update, ...conflictingUpdates],
        detectedAt: Date.now(),
        resolution: 'pending',
        resolutionStrategy: 'to_be_determined'
      };

      this.conflicts.set(conflict.id, conflict);
      console.log(`⚡ [State-Sync] Conflict detected: ${conflict.id} for ${update.type}`);
      
      return conflict;
    }

    return null;
  }

  /**
   * Find updates that conflict with the given update
   */
  private findConflictingUpdates(update: StateUpdate): StateUpdate[] {
    const conflicting: StateUpdate[] = [];
    
    // Check processing queue
    const processing = this.processingQueue.get(update.type) || [];
    for (const other of processing) {
      if (this.updatesConflict(update, other)) {
        conflicting.push(other);
      }
    }

    return conflicting;
  }

  /**
   * Determine if two updates conflict
   */
  private updatesConflict(update1: StateUpdate, update2: StateUpdate): boolean {
    // Same type and overlapping timestamps
    if (update1.type === update2.type) {
      const timeDiff = Math.abs(update1.timestamp - update2.timestamp);
      if (timeDiff < 1000) { // Within 1 second
        return true;
      }
    }

    // Check for data conflicts (simplified)
    if (update1.data && update2.data && typeof update1.data === 'object' && typeof update2.data === 'object') {
      const keys1 = Object.keys(update1.data);
      const keys2 = Object.keys(update2.data);
      const commonKeys = keys1.filter(key => keys2.includes(key));
      
      return commonKeys.length > 0;
    }

    return false;
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflict(conflict: StateConflict): Promise<void> {
    console.log(`🔧 [State-Sync] Resolving conflict: ${conflict.id}`);

    const updates = conflict.conflictingUpdates;
    let resolution: StateUpdate;

    // Determine resolution strategy
    if (updates.length === 2) {
      const [update1, update2] = updates;
      
      // Source priority: local > sse > websocket > http
      const sourcePriority = { 'local': 0, 'sse': 1, 'websocket': 2, 'http': 3 };
      if (sourcePriority[update1.source] < sourcePriority[update2.source]) {
        resolution = update1;
        conflict.resolutionStrategy = 'source_priority';
      } else if (sourcePriority[update1.source] > sourcePriority[update2.source]) {
        resolution = update2;
        conflict.resolutionStrategy = 'source_priority';
      } else {
        // Same source priority, use timestamp
        resolution = update1.timestamp > update2.timestamp ? update1 : update2;
        conflict.resolutionStrategy = 'last_write_wins';
      }
    } else {
      // Multiple conflicts - use the most recent
      resolution = updates.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      );
      conflict.resolutionStrategy = 'latest_timestamp';
    }

    // Apply the resolved update
    await this.applyStateChange(resolution);
    
    // Mark conflict as resolved
    conflict.resolution = 'resolved';
    
    console.log(`✅ [State-Sync] Conflict resolved using ${conflict.resolutionStrategy}`);

    // Log conflict resolution for neural learning
    await this.logConflictResolution(conflict);
  }

  /**
   * Apply state change with versioning
   */
  private async applyStateChange(update: StateUpdate, newState?: any): Promise<void> {
    const finalState = newState !== undefined ? newState : this.mergeState(update);
    
    // Update state
    this.state.set(update.type, finalState);
    
    // Update version
    const currentVersion = this.stateVersions.get(update.type) || 0;
    this.stateVersions.set(update.type, currentVersion + 1);
    
    // Update sequence tracking
    this.updateLastSequenceNumber(update.type, update.sequenceNumber);
    
    console.log(`✅ [State-Sync] State applied: ${update.type}#${update.sequenceNumber}`);
    
    // Emit state change event
    this.emitStateChange(update.type, finalState, update);
  }

  /**
   * Merge update data with existing state
   */
  private mergeState(update: StateUpdate): any {
    const existingState = this.state.get(update.type) || {};
    
    if (typeof update.data === 'object' && update.data !== null) {
      return { ...existingState, ...update.data, _lastUpdate: update.timestamp };
    } else {
      return update.data;
    }
  }

  /**
   * Check if dependencies are met
   */
  private areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every(dep => this.state.has(dep));
  }

  /**
   * Queue pending update
   */
  private queuePendingUpdate(update: StateUpdate): void {
    if (!this.pendingUpdates.has(update.type)) {
      this.pendingUpdates.set(update.type, []);
    }
    this.pendingUpdates.get(update.type)!.push(update);
  }

  /**
   * Process pending updates for a type
   */
  private async processPendingUpdates(type: string): Promise<void> {
    const pending = this.pendingUpdates.get(type);
    if (!pending || pending.length === 0) return;

    const readyUpdates = pending.filter(update => {
      if (update.dependencies) {
        return this.areDependenciesMet(update.dependencies);
      }
      return !this.lockManager.isLocked(update.type);
    });

    // Remove ready updates from pending
    this.pendingUpdates.set(type, pending.filter(update => !readyUpdates.includes(update)));

    // Add ready updates back to main queue
    for (const update of readyUpdates) {
      this.updateQueue.push(update);
    }

    this.sortUpdateQueue();
  }

  /**
   * Start processing queue
   */
  private startProcessingQueue(): void {
    setInterval(() => {
      this.processUpdateQueue();
    }, 10); // Process every 10ms
  }

  /**
   * Check if update has been processed
   */
  private isUpdateProcessed(updateId: string): boolean {
    // Check if update is no longer in queue or pending
    const inQueue = this.updateQueue.some(u => u.id === updateId);
    const inPending = Array.from(this.pendingUpdates.values())
      .flat()
      .some(u => u.id === updateId);
    
    return !inQueue && !inPending;
  }

  /**
   * Get last sequence number for a type
   */
  private getLastSequenceNumber(type: string): number {
    // This would be stored per type in a real implementation
    return 0;
  }

  /**
   * Update last sequence number for a type
   */
  private updateLastSequenceNumber(type: string, sequence: number): void {
    // Store the sequence number for this type
    console.log(`📊 [State-Sync] Updated sequence for ${type}: ${sequence}`);
  }

  /**
   * Get state timestamp
   */
  private getStateTimestamp(type: string): number {
    const state = this.state.get(type);
    return state?._lastUpdate || 0;
  }

  /**
   * Handle processing errors
   */
  private async handleProcessingError(update: StateUpdate, error: Error): Promise<void> {
    console.error(`❌ [State-Sync] Processing error for ${update.type}:`, error);
    
    // Log error for neural learning
    await mcp__claude_flow__neural_patterns({
      action: 'learn',
      operation: 'state_sync_error',
      outcome: JSON.stringify({
        updateType: update.type,
        error: error.message,
        source: update.source,
        timestamp: Date.now()
      })
    });
  }

  /**
   * Log state update for neural learning
   */
  private async logStateUpdate(update: StateUpdate): Promise<void> {
    const logEntry = {
      updateId: update.id,
      type: update.type,
      source: update.source,
      priority: update.priority,
      timestamp: update.timestamp,
      sequenceNumber: update.sequenceNumber,
      hasDependencies: Boolean(update.dependencies),
      dependencyCount: update.dependencies?.length || 0
    };

    await mcp__claude_flow__memory_usage({
      action: 'store',
      namespace: 'nld-state-sync',
      key: `update_${update.id}`,
      value: JSON.stringify(logEntry),
      ttl: 3600000 // 1 hour
    });
  }

  /**
   * Log conflict resolution for neural learning
   */
  private async logConflictResolution(conflict: StateConflict): Promise<void> {
    const logEntry = {
      conflictId: conflict.id,
      type: conflict.type,
      conflictCount: conflict.conflictingUpdates.length,
      resolutionStrategy: conflict.resolutionStrategy,
      resolutionTime: Date.now() - conflict.detectedAt,
      sources: conflict.conflictingUpdates.map(u => u.source)
    };

    await mcp__claude_flow__neural_patterns({
      action: 'learn',
      operation: 'conflict_resolution',
      outcome: JSON.stringify(logEntry)
    });
  }

  /**
   * Emit state change event
   */
  private emitStateChange(type: string, state: any, update: StateUpdate): void {
    // This would emit to event listeners in a real implementation
    console.log(`📡 [State-Sync] State changed: ${type}`);
  }

  /**
   * Get current state
   */
  public getState(type?: string): any {
    if (type) {
      return this.state.get(type);
    }
    return Object.fromEntries(this.state);
  }

  /**
   * Get synchronization metrics
   */
  public getMetrics(): {
    queueLength: number;
    pendingCount: number;
    conflictCount: number;
    stateCount: number;
  } {
    return {
      queueLength: this.updateQueue.length,
      pendingCount: Array.from(this.pendingUpdates.values()).flat().length,
      conflictCount: this.conflicts.size,
      stateCount: this.state.size
    };
  }
}

/**
 * State Lock Manager for preventing concurrent modifications
 */
class StateLockManager {
  private locks: Map<string, Set<string>> = new Map();
  private lockTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly lockTimeout = 5000; // 5 seconds

  public async acquireLock(type: string, requesterId: string): Promise<boolean> {
    const lockKey = `${type}_${requesterId}`;
    
    if (!this.locks.has(type)) {
      this.locks.set(type, new Set());
    }

    const typeLocks = this.locks.get(type)!;
    
    // Check if already locked by different requester
    if (typeLocks.size > 0 && !typeLocks.has(requesterId)) {
      return false;
    }

    // Acquire lock
    typeLocks.add(requesterId);

    // Set timeout to automatically release lock
    const timeout = setTimeout(() => {
      this.releaseLock(type, requesterId);
    }, this.lockTimeout);

    this.lockTimeouts.set(lockKey, timeout);
    
    return true;
  }

  public releaseLock(type: string, requesterId: string): void {
    const lockKey = `${type}_${requesterId}`;
    
    const typeLocks = this.locks.get(type);
    if (typeLocks) {
      typeLocks.delete(requesterId);
      if (typeLocks.size === 0) {
        this.locks.delete(type);
      }
    }

    const timeout = this.lockTimeouts.get(lockKey);
    if (timeout) {
      clearTimeout(timeout);
      this.lockTimeouts.delete(lockKey);
    }
  }

  public isLocked(type: string): boolean {
    const typeLocks = this.locks.get(type);
    return Boolean(typeLocks && typeLocks.size > 0);
  }
}

// Export singleton instance
export const stateSynchronizationManager = new StateSynchronizationManager();