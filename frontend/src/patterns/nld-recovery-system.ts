/**
 * NLD Recovery System
 * 
 * This module provides automated recovery mechanisms for detected failure patterns
 * including circuit breakers, fallback strategies, and self-healing capabilities.
 */

import { NLTRecord, NLDPattern } from './nld-core-monitor';
import { NLDLoggingSystem } from './nld-logging-system';

export interface RecoveryAction {
  id: string;
  name: string;
  category: string;
  description: string;
  execute: () => Promise<boolean>;
  prerequisites: string[];
  successRate: number;
  lastUsed?: Date;
  usageCount: number;
}

export interface RecoveryStrategy {
  patternId: string;
  actions: RecoveryAction[];
  circuitBreaker: {
    threshold: number;
    timeout: number;
    isOpen: boolean;
    failureCount: number;
    lastFailure?: Date;
  };
  fallbackStrategy?: () => void;
}

/**
 * NLD Recovery System for Automated Failure Recovery
 */
export class NLDRecoverySystem {
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private loggingSystem: NLDLoggingSystem;
  private recoveryHistory: Array<{
    timestamp: Date;
    patternId: string;
    actionId: string;
    success: boolean;
    duration: number;
  }> = [];

  constructor(loggingSystem: NLDLoggingSystem) {
    this.loggingSystem = loggingSystem;
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize recovery strategies for each pattern category
   */
  private initializeRecoveryStrategies(): void {
    // White Screen Recovery Strategies
    this.addRecoveryStrategy('nld-001', [
      {
        id: 'force-rerender',
        name: 'Force Component Re-render',
        category: 'white-screen',
        description: 'Trigger a forced re-render of the component tree',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-force-rerender', { 
            detail: { timestamp: Date.now() }
          }));
          return true;
        },
        prerequisites: [],
        successRate: 0.7,
        usageCount: 0
      },
      {
        id: 'clear-local-storage',
        name: 'Clear Local Storage',
        category: 'white-screen',
        description: 'Clear potentially corrupted local storage data',
        execute: async () => {
          try {
            const keysToPreserve = ['nld-patterns', 'nld-logged-patterns'];
            const storage: Record<string, string> = {};
            
            keysToPreserve.forEach(key => {
              const value = localStorage.getItem(key);
              if (value) storage[key] = value;
            });
            
            localStorage.clear();
            
            Object.entries(storage).forEach(([key, value]) => {
              localStorage.setItem(key, value);
            });
            
            return true;
          } catch (error) {
            console.error('Failed to clear local storage:', error);
            return false;
          }
        },
        prerequisites: [],
        successRate: 0.8,
        usageCount: 0
      },
      {
        id: 'refresh-page',
        name: 'Refresh Page',
        category: 'white-screen',
        description: 'Last resort: refresh the entire page',
        execute: async () => {
          // Save current state before refresh
          sessionStorage.setItem('nld-recovery-refresh', JSON.stringify({
            timestamp: Date.now(),
            url: window.location.href,
            reason: 'white-screen-recovery'
          }));
          
          window.location.reload();
          return true; // We won't know the result, but assume success
        },
        prerequisites: ['force-rerender', 'clear-local-storage'],
        successRate: 0.95,
        usageCount: 0
      }
    ]);

    // WebSocket Recovery Strategies
    this.addRecoveryStrategy('nld-002', [
      {
        id: 'exponential-backoff',
        name: 'Implement Exponential Backoff',
        category: 'websocket',
        description: 'Add exponential backoff to WebSocket reconnection',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-websocket-backoff', {
            detail: { 
              backoffTime: Math.min(1000 * Math.pow(2, 3), 30000),
              timestamp: Date.now()
            }
          }));
          return true;
        },
        prerequisites: [],
        successRate: 0.85,
        usageCount: 0
      },
      {
        id: 'connection-health-check',
        name: 'WebSocket Health Check',
        category: 'websocket',
        description: 'Verify network connectivity before reconnection',
        execute: async () => {
          try {
            const response = await fetch('/api/health', { 
              method: 'HEAD',
              cache: 'no-cache'
            });
            
            if (response.ok) {
              window.dispatchEvent(new CustomEvent('nld-websocket-health-ok'));
              return true;
            } else {
              window.dispatchEvent(new CustomEvent('nld-websocket-health-fail'));
              return false;
            }
          } catch (error) {
            window.dispatchEvent(new CustomEvent('nld-websocket-health-fail'));
            return false;
          }
        },
        prerequisites: [],
        successRate: 0.9,
        usageCount: 0
      }
    ]);

    // Memory Leak Recovery Strategies
    this.addRecoveryStrategy('nld-003', [
      {
        id: 'force-gc',
        name: 'Force Garbage Collection',
        category: 'memory-leak',
        description: 'Force garbage collection if available',
        execute: async () => {
          if ('gc' in window) {
            (window as any).gc();
            return true;
          }
          return false;
        },
        prerequisites: [],
        successRate: 0.6,
        usageCount: 0
      },
      {
        id: 'cleanup-image-urls',
        name: 'Cleanup Image URLs',
        category: 'memory-leak',
        description: 'Revoke object URLs to prevent memory leaks',
        execute: async () => {
          try {
            window.dispatchEvent(new CustomEvent('nld-memory-cleanup', {
              detail: { 
                action: 'cleanup-image-urls',
                timestamp: Date.now()
              }
            }));
            return true;
          } catch (error) {
            console.error('Failed to cleanup image URLs:', error);
            return false;
          }
        },
        prerequisites: [],
        successRate: 0.8,
        usageCount: 0
      },
      {
        id: 'component-remount',
        name: 'Remount Heavy Components',
        category: 'memory-leak',
        description: 'Remount components that may be leaking memory',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-component-remount', {
            detail: { 
              reason: 'memory-leak-prevention',
              timestamp: Date.now()
            }
          }));
          return true;
        },
        prerequisites: ['cleanup-image-urls'],
        successRate: 0.75,
        usageCount: 0
      }
    ]);

    // Race Condition Recovery Strategies
    this.addRecoveryStrategy('nld-004', [
      {
        id: 'operation-debounce',
        name: 'Debounce Operations',
        category: 'race-condition',
        description: 'Add debouncing to prevent rapid operations',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-operation-lock', {
            detail: { 
              lockTime: 1000,
              timestamp: Date.now()
            }
          }));
          return true;
        },
        prerequisites: [],
        successRate: 0.9,
        usageCount: 0
      },
      {
        id: 'cancel-pending',
        name: 'Cancel Pending Operations',
        category: 'race-condition',
        description: 'Cancel any pending async operations',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-cancel-pending', {
            detail: { timestamp: Date.now() }
          }));
          return true;
        },
        prerequisites: [],
        successRate: 0.85,
        usageCount: 0
      }
    ]);

    // Performance Recovery Strategies
    this.addRecoveryStrategy('nld-005', [
      {
        id: 'optimize-renders',
        name: 'Optimize Render Cycles',
        category: 'performance',
        description: 'Trigger render optimization',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-performance-optimize', {
            detail: { 
              action: 'optimize-renders',
              timestamp: Date.now()
            }
          }));
          return true;
        },
        prerequisites: [],
        successRate: 0.7,
        usageCount: 0
      },
      {
        id: 'reduce-complexity',
        name: 'Reduce UI Complexity',
        category: 'performance',
        description: 'Temporarily reduce UI complexity',
        execute: async () => {
          window.dispatchEvent(new CustomEvent('nld-reduce-complexity', {
            detail: { 
              level: 'high',
              timestamp: Date.now()
            }
          }));
          return true;
        },
        prerequisites: ['optimize-renders'],
        successRate: 0.8,
        usageCount: 0
      }
    ]);
  }

  /**
   * Add a recovery strategy for a pattern
   */
  private addRecoveryStrategy(patternId: string, actions: Omit<RecoveryAction, 'id' | 'usageCount'>[]): void {
    const recoveryActions: RecoveryAction[] = actions.map((action, index) => ({
      ...action,
      id: action.id || `${patternId}-action-${index}`,
      usageCount: 0
    }));

    this.recoveryStrategies.set(patternId, {
      patternId,
      actions: recoveryActions,
      circuitBreaker: {
        threshold: 5, // Open circuit after 5 failures
        timeout: 60000, // 1 minute timeout
        isOpen: false,
        failureCount: 0
      }
    });
  }

  /**
   * Execute recovery for a detected pattern
   */
  public async executeRecovery(record: NLTRecord): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(record.pattern.id);
    if (!strategy) {
      console.warn(`No recovery strategy found for pattern: ${record.pattern.id}`);
      return false;
    }

    // Check circuit breaker
    if (this.isCircuitOpen(strategy)) {
      console.warn(`Circuit breaker open for pattern: ${record.pattern.id}`);
      return false;
    }

    console.log(`🔧 Executing recovery for pattern: ${record.pattern.pattern}`);

    // Try each recovery action in order
    for (const action of strategy.actions) {
      // Check if prerequisites are met
      if (action.prerequisites.length > 0) {
        const prerequisitesMet = action.prerequisites.every(prereqId => 
          this.wasActionRecentlySuccessful(strategy.patternId, prereqId)
        );
        
        if (!prerequisitesMet) {
          console.log(`Prerequisites not met for action: ${action.name}`);
          continue;
        }
      }

      const startTime = Date.now();
      let success = false;

      try {
        success = await action.execute();
        action.usageCount++;
        
        if (success) {
          console.log(`✅ Recovery action successful: ${action.name}`);
          this.recordRecoveryAttempt(strategy.patternId, action.id, true, Date.now() - startTime);
          this.resetCircuitBreaker(strategy);
          
          // Update action success rate
          this.updateActionSuccessRate(action, true);
          
          return true;
        } else {
          console.warn(`❌ Recovery action failed: ${action.name}`);
          this.recordRecoveryAttempt(strategy.patternId, action.id, false, Date.now() - startTime);
          this.incrementCircuitBreakerFailure(strategy);
        }
      } catch (error) {
        console.error(`💥 Recovery action error: ${action.name}`, error);
        this.recordRecoveryAttempt(strategy.patternId, action.id, false, Date.now() - startTime);
        this.incrementCircuitBreakerFailure(strategy);
      }
    }

    // If we get here, all actions failed
    console.error(`🚨 All recovery actions failed for pattern: ${record.pattern.pattern}`);
    
    // Execute fallback strategy if available
    if (strategy.fallbackStrategy) {
      try {
        strategy.fallbackStrategy();
        return true;
      } catch (error) {
        console.error('Fallback strategy failed:', error);
      }
    }

    return false;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(strategy: RecoveryStrategy): boolean {
    if (!strategy.circuitBreaker.isOpen) return false;

    const now = Date.now();
    const lastFailure = strategy.circuitBreaker.lastFailure?.getTime() || 0;

    // Check if timeout period has passed
    if (now - lastFailure > strategy.circuitBreaker.timeout) {
      // Reset circuit breaker to half-open state
      strategy.circuitBreaker.isOpen = false;
      strategy.circuitBreaker.failureCount = 0;
      console.log(`Circuit breaker reset for pattern: ${strategy.patternId}`);
      return false;
    }

    return true;
  }

  /**
   * Reset circuit breaker after successful recovery
   */
  private resetCircuitBreaker(strategy: RecoveryStrategy): void {
    strategy.circuitBreaker.isOpen = false;
    strategy.circuitBreaker.failureCount = 0;
  }

  /**
   * Increment circuit breaker failure count
   */
  private incrementCircuitBreakerFailure(strategy: RecoveryStrategy): void {
    strategy.circuitBreaker.failureCount++;
    strategy.circuitBreaker.lastFailure = new Date();

    if (strategy.circuitBreaker.failureCount >= strategy.circuitBreaker.threshold) {
      strategy.circuitBreaker.isOpen = true;
      console.warn(`Circuit breaker opened for pattern: ${strategy.patternId}`);
    }
  }

  /**
   * Check if an action was recently successful
   */
  private wasActionRecentlySuccessful(patternId: string, actionId: string): boolean {
    const recentAttempts = this.recoveryHistory.filter(
      attempt => attempt.patternId === patternId && 
                 attempt.actionId === actionId &&
                 Date.now() - attempt.timestamp.getTime() < 300000 // Last 5 minutes
    );

    return recentAttempts.some(attempt => attempt.success);
  }

  /**
   * Record a recovery attempt
   */
  private recordRecoveryAttempt(
    patternId: string, 
    actionId: string, 
    success: boolean, 
    duration: number
  ): void {
    this.recoveryHistory.push({
      timestamp: new Date(),
      patternId,
      actionId,
      success,
      duration
    });

    // Keep only last 100 records
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
  }

  /**
   * Update action success rate based on recent performance
   */
  private updateActionSuccessRate(action: RecoveryAction, wasSuccessful: boolean): void {
    const recentAttempts = this.recoveryHistory.filter(
      attempt => attempt.actionId === action.id &&
                 Date.now() - attempt.timestamp.getTime() < 3600000 // Last hour
    ).slice(-10); // Last 10 attempts

    if (recentAttempts.length > 0) {
      const successfulAttempts = recentAttempts.filter(attempt => attempt.success).length;
      action.successRate = successfulAttempts / recentAttempts.length;
      action.lastUsed = new Date();
    }
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStats(): {
    totalAttempts: number;
    successRate: number;
    byPattern: Record<string, {
      attempts: number;
      successes: number;
      successRate: number;
      circuitBreakerStatus: 'closed' | 'open' | 'half-open';
    }>;
    mostEffectiveActions: Array<{
      actionId: string;
      name: string;
      successRate: number;
      usageCount: number;
    }>;
  } {
    const totalAttempts = this.recoveryHistory.length;
    const totalSuccesses = this.recoveryHistory.filter(attempt => attempt.success).length;
    const overallSuccessRate = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;

    // Group by pattern
    const byPattern: Record<string, any> = {};
    Array.from(this.recoveryStrategies.keys()).forEach(patternId => {
      const strategy = this.recoveryStrategies.get(patternId)!;
      const patternAttempts = this.recoveryHistory.filter(attempt => attempt.patternId === patternId);
      const patternSuccesses = patternAttempts.filter(attempt => attempt.success).length;

      byPattern[patternId] = {
        attempts: patternAttempts.length,
        successes: patternSuccesses,
        successRate: patternAttempts.length > 0 ? patternSuccesses / patternAttempts.length : 0,
        circuitBreakerStatus: strategy.circuitBreaker.isOpen ? 'open' : 
                             strategy.circuitBreaker.failureCount > 0 ? 'half-open' : 'closed'
      };
    });

    // Get most effective actions
    const allActions: RecoveryAction[] = [];
    Array.from(this.recoveryStrategies.values()).forEach(strategy => {
      allActions.push(...strategy.actions);
    });

    const mostEffectiveActions = allActions
      .filter(action => action.usageCount > 0)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5)
      .map(action => ({
        actionId: action.id,
        name: action.name,
        successRate: action.successRate,
        usageCount: action.usageCount
      }));

    return {
      totalAttempts,
      successRate: overallSuccessRate,
      byPattern,
      mostEffectiveActions
    };
  }

  /**
   * Add a custom recovery strategy
   */
  public addCustomRecoveryStrategy(
    patternId: string, 
    actions: Omit<RecoveryAction, 'usageCount'>[]
  ): void {
    const existingStrategy = this.recoveryStrategies.get(patternId);
    const recoveryActions: RecoveryAction[] = actions.map(action => ({
      ...action,
      usageCount: 0
    }));

    if (existingStrategy) {
      // Add to existing strategy
      existingStrategy.actions.push(...recoveryActions);
    } else {
      // Create new strategy
      this.addRecoveryStrategy(patternId, actions);
    }
  }

  /**
   * Export recovery data
   */
  public exportRecoveryData(): {
    strategies: Array<{
      patternId: string;
      actions: Array<{
        id: string;
        name: string;
        category: string;
        successRate: number;
        usageCount: number;
      }>;
      circuitBreakerStatus: string;
    }>;
    history: typeof this.recoveryHistory;
    stats: ReturnType<typeof this.getRecoveryStats>;
    exportTime: string;
  } {
    const strategies = Array.from(this.recoveryStrategies.entries()).map(([patternId, strategy]) => ({
      patternId,
      actions: strategy.actions.map(action => ({
        id: action.id,
        name: action.name,
        category: action.category,
        successRate: action.successRate,
        usageCount: action.usageCount
      })),
      circuitBreakerStatus: strategy.circuitBreaker.isOpen ? 'open' : 
                           strategy.circuitBreaker.failureCount > 0 ? 'half-open' : 'closed'
    }));

    return {
      strategies,
      history: this.recoveryHistory,
      stats: this.getRecoveryStats(),
      exportTime: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.recoveryStrategies.clear();
    this.recoveryHistory = [];
  }
}

export default NLDRecoverySystem;