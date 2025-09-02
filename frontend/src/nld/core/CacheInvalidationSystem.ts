/**
 * NLD Cache Invalidation System
 * Intelligent cache invalidation based on failure patterns and neural learning
 */

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  ttl?: number;
  tags: string[];
  dependsOn: string[];
}

export interface InvalidationRule {
  name: string;
  condition: (entry: CacheEntry, context: any) => boolean;
  priority: number;
  cascading: boolean;
  reason: string;
}

export interface InvalidationContext {
  failurePattern?: any;
  userFeedback?: any;
  instanceId?: string;
  component?: string;
  trigger: 'failure_detected' | 'user_feedback' | 'neural_prediction' | 'manual' | 'timeout';
}

class CacheInvalidationSystem {
  private cache: Map<string, CacheEntry> = new Map();
  private rules: InvalidationRule[] = [];
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private invalidationHistory: Array<{
    keys: string[];
    context: InvalidationContext;
    timestamp: number;
    success: boolean;
  }> = [];

  constructor() {
    this.initializeRules();
    this.setupAutomaticCleanup();
  }

  /**
   * Initialize cache invalidation rules
   */
  private initializeRules(): void {
    // Rule 1: Stale instance data invalidation
    this.addRule({
      name: 'stale_instance_invalidation',
      condition: (entry, context) => {
        return entry.tags.includes('instance') && 
               context.failurePattern?.type === 'STALE_INSTANCE_ID';
      },
      priority: 1,
      cascading: true,
      reason: 'Instance data is stale'
    });

    // Rule 2: Connection failure invalidation
    this.addRule({
      name: 'connection_failure_invalidation',
      condition: (entry, context) => {
        return entry.tags.includes('connection') && 
               context.failurePattern?.type === 'CONNECTION_MISMATCH';
      },
      priority: 2,
      cascading: true,
      reason: 'Connection data is invalid'
    });

    // Rule 3: User feedback triggered invalidation
    this.addRule({
      name: 'user_feedback_invalidation',
      condition: (entry, context) => {
        return context.userFeedback?.sentiment === 'negative' &&
               context.userFeedback?.context?.instanceId &&
               entry.key.includes(context.userFeedback.context.instanceId);
      },
      priority: 3,
      cascading: false,
      reason: 'User reported issue with cached data'
    });

    // Rule 4: Neural prediction invalidation
    this.addRule({
      name: 'neural_prediction_invalidation',
      condition: (entry, context) => {
        return context.trigger === 'neural_prediction' &&
               this.isHighRiskCache(entry, context);
      },
      priority: 4,
      cascading: false,
      reason: 'Neural network predicts cache issues'
    });

    // Rule 5: Component-specific invalidation
    this.addRule({
      name: 'component_invalidation',
      condition: (entry, context) => {
        return context.component && 
               entry.tags.includes(`component:${context.component}`);
      },
      priority: 5,
      cascading: false,
      reason: 'Component-specific cache invalidation'
    });

    // Rule 6: TTL expiration
    this.addRule({
      name: 'ttl_expiration',
      condition: (entry, context) => {
        return entry.ttl && (Date.now() - entry.timestamp) > entry.ttl;
      },
      priority: 10,
      cascading: false,
      reason: 'Cache entry expired'
    });

    // Rule 7: Dependency invalidation
    this.addRule({
      name: 'dependency_invalidation',
      condition: (entry, context) => {
        return entry.dependsOn.some(dep => 
          context.invalidatedKeys?.includes(dep)
        );
      },
      priority: 6,
      cascading: true,
      reason: 'Dependent cache invalidated'
    });
  }

  /**
   * Cache data with metadata
   */
  public set(
    key: string, 
    data: any, 
    options: {
      ttl?: number;
      tags?: string[];
      dependsOn?: string[];
    } = {}
  ): void {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      ttl: options.ttl,
      tags: options.tags || [],
      dependsOn: options.dependsOn || []
    };

    this.cache.set(key, entry);
    this.updateDependencyGraph(key, entry.dependsOn);
  }

  /**
   * Get cached data
   */
  public get(key: string): any {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is still valid
    if (this.isEntryValid(entry)) {
      entry.accessCount++;
      entry.lastAccess = Date.now();
      return entry.data;
    } else {
      this.cache.delete(key);
      return null;
    }
  }

  /**
   * Invalidate cache based on context
   */
  public invalidate(context: InvalidationContext): string[] {
    const keysToInvalidate = new Set<string>();
    
    // Find entries matching invalidation rules
    for (const [key, entry] of this.cache.entries()) {
      for (const rule of this.rules.sort((a, b) => a.priority - b.priority)) {
        if (rule.condition(entry, context)) {
          keysToInvalidate.add(key);
          
          console.log(`NLD Cache: Invalidating ${key} - ${rule.reason}`);
          
          // Handle cascading invalidation
          if (rule.cascading) {
            const cascaded = this.getCascadingInvalidations(key);
            cascaded.forEach(k => keysToInvalidate.add(k));
          }
          
          break; // First matching rule wins
        }
      }
    }

    // Actually remove the entries
    const invalidatedKeys = Array.from(keysToInvalidate);
    invalidatedKeys.forEach(key => this.cache.delete(key));

    // Record invalidation history
    this.recordInvalidation(invalidatedKeys, context);

    // Notify components of invalidation
    this.notifyInvalidation(invalidatedKeys, context);

    return invalidatedKeys;
  }

  /**
   * Invalidate specific keys
   */
  public invalidateKeys(keys: string[], reason: string = 'Manual invalidation'): void {
    const context: InvalidationContext = {
      trigger: 'manual'
    };

    keys.forEach(key => {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        console.log(`NLD Cache: Manually invalidated ${key} - ${reason}`);
      }
    });

    this.recordInvalidation(keys, context);
    this.notifyInvalidation(keys, context);
  }

  /**
   * Invalidate by tags
   */
  public invalidateByTags(tags: string[], reason: string = 'Tag-based invalidation'): string[] {
    const keysToInvalidate: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    this.invalidateKeys(keysToInvalidate, reason);
    return keysToInvalidate;
  }

  /**
   * Clear all cache
   */
  public clear(reason: string = 'Full cache clear'): void {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();
    this.dependencyGraph.clear();

    const context: InvalidationContext = {
      trigger: 'manual'
    };

    this.recordInvalidation(keys, context);
    this.notifyInvalidation(keys, context);
    
    console.log(`NLD Cache: Cleared all cache - ${reason}`);
  }

  /**
   * Intelligent cache refresh based on neural patterns
   */
  public smartRefresh(context: InvalidationContext): Promise<void> {
    return new Promise((resolve) => {
      // Analyze which cache entries are most likely to be stale
      const riskAnalysis = this.analyzeStaleRisk();
      
      // Invalidate high-risk entries
      const highRiskKeys = riskAnalysis
        .filter(analysis => analysis.risk > 0.7)
        .map(analysis => analysis.key);

      if (highRiskKeys.length > 0) {
        console.log('NLD Cache: Smart refresh invalidating high-risk entries', highRiskKeys);
        this.invalidateKeys(highRiskKeys, 'Smart refresh - high staleness risk');
      }

      // Trigger refresh of critical data
      this.triggerCriticalDataRefresh(context);

      resolve();
    });
  }

  /**
   * Analyze staleness risk of cache entries
   */
  private analyzeStaleRisk(): Array<{ key: string; risk: number; reasons: string[] }> {
    const analysis: Array<{ key: string; risk: number; reasons: string[] }> = [];

    for (const [key, entry] of this.cache.entries()) {
      let risk = 0;
      const reasons: string[] = [];

      // Age factor
      const age = Date.now() - entry.timestamp;
      const ageHours = age / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        risk += 0.3;
        reasons.push('Cache is over 24 hours old');
      } else if (ageHours > 1) {
        risk += 0.1;
        reasons.push('Cache is over 1 hour old');
      }

      // Access pattern factor
      if (entry.accessCount === 0) {
        risk += 0.2;
        reasons.push('Never accessed');
      } else if (Date.now() - entry.lastAccess > (1000 * 60 * 60)) {
        risk += 0.1;
        reasons.push('Not accessed recently');
      }

      // Instance-related data is higher risk
      if (entry.tags.includes('instance') || entry.tags.includes('connection')) {
        risk += 0.3;
        reasons.push('Instance/connection data has higher staleness risk');
      }

      // Historical failure patterns
      if (this.hasHistoricalFailures(key)) {
        risk += 0.2;
        reasons.push('Historical failures detected');
      }

      analysis.push({ key, risk, reasons });
    }

    return analysis.sort((a, b) => b.risk - a.risk);
  }

  /**
   * Check if entry has valid TTL
   */
  private isEntryValid(entry: CacheEntry): boolean {
    if (entry.ttl) {
      return (Date.now() - entry.timestamp) < entry.ttl;
    }
    return true; // No TTL means always valid until explicitly invalidated
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(key: string, dependencies: string[]): void {
    dependencies.forEach(dep => {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, new Set());
      }
      this.dependencyGraph.get(dep)!.add(key);
    });
  }

  /**
   * Get cascading invalidations based on dependencies
   */
  private getCascadingInvalidations(key: string): string[] {
    const cascaded: string[] = [];
    const dependents = this.dependencyGraph.get(key);
    
    if (dependents) {
      dependents.forEach(dependent => {
        cascaded.push(dependent);
        // Recursively get dependents of dependents
        cascaded.push(...this.getCascadingInvalidations(dependent));
      });
    }

    return cascaded;
  }

  /**
   * Check if cache entry is high risk based on neural predictions
   */
  private isHighRiskCache(entry: CacheEntry, context: any): boolean {
    // This would integrate with neural pattern analysis
    // For now, simple heuristics
    
    const age = Date.now() - entry.timestamp;
    const isInstanceData = entry.tags.includes('instance');
    const hasRecentFailures = this.hasHistoricalFailures(entry.key);
    
    return age > (1000 * 60 * 30) && (isInstanceData || hasRecentFailures); // 30 minutes
  }

  /**
   * Check if key has historical failures
   */
  private hasHistoricalFailures(key: string): boolean {
    // Check invalidation history for patterns
    const recentInvalidations = this.invalidationHistory
      .filter(h => Date.now() - h.timestamp < (1000 * 60 * 60 * 24)) // Last 24 hours
      .filter(h => h.keys.includes(key));

    return recentInvalidations.length > 2; // More than 2 invalidations in 24h
  }

  /**
   * Trigger refresh of critical data
   */
  private triggerCriticalDataRefresh(context: InvalidationContext): void {
    // Dispatch events for components to refresh critical data
    const criticalTags = ['instance', 'connection', 'auth'];
    
    criticalTags.forEach(tag => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(`nld:refresh_${tag}`, {
          detail: { context, reason: 'Smart cache refresh' }
        }));
      }
    });
  }

  /**
   * Record invalidation in history
   */
  private recordInvalidation(
    keys: string[], 
    context: InvalidationContext
  ): void {
    this.invalidationHistory.push({
      keys: [...keys],
      context: { ...context },
      timestamp: Date.now(),
      success: true
    });

    // Keep only recent history (last 1000 entries)
    if (this.invalidationHistory.length > 1000) {
      this.invalidationHistory.splice(0, this.invalidationHistory.length - 1000);
    }
  }

  /**
   * Notify components of cache invalidation
   */
  private notifyInvalidation(keys: string[], context: InvalidationContext): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nld:cache_invalidated', {
        detail: { keys, context, timestamp: Date.now() }
      }));

      // Specific events for different types
      if (keys.some(k => k.includes('instance'))) {
        window.dispatchEvent(new CustomEvent('nld:instances_invalidated'));
      }
      
      if (keys.some(k => k.includes('connection'))) {
        window.dispatchEvent(new CustomEvent('nld:connections_invalidated'));
      }
    }
  }

  /**
   * Setup automatic cleanup of expired entries
   */
  private setupAutomaticCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry)) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      this.invalidateKeys(expiredKeys, 'TTL expiration cleanup');
    }
  }

  // Public API

  /**
   * Add invalidation rule
   */
  public addRule(rule: InvalidationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hitRate: number;
    invalidations: number;
    avgAge: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const totalInvalidations = this.invalidationHistory.length;
    
    const avgAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length
      : 0;

    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? (totalAccesses / (totalAccesses + totalInvalidations)) : 0,
      invalidations: totalInvalidations,
      avgAge: avgAge / (1000 * 60) // in minutes
    };
  }

  /**
   * Get cache entries by tag
   */
  public getByTag(tag: string): CacheEntry[] {
    return Array.from(this.cache.values())
      .filter(entry => entry.tags.includes(tag));
  }

  /**
   * Get invalidation history
   */
  public getInvalidationHistory(): typeof this.invalidationHistory {
    return [...this.invalidationHistory];
  }

  /**
   * Export cache data for analysis
   */
  public exportData(): any {
    return {
      cache: Array.from(this.cache.entries()),
      rules: this.rules,
      dependencies: Array.from(this.dependencyGraph.entries()),
      history: this.invalidationHistory,
      stats: this.getStats(),
      exportTime: Date.now()
    };
  }
}

export default CacheInvalidationSystem;