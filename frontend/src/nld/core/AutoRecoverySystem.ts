/**
 * NLD Auto Recovery System
 * Implements automatic recovery strategies for detected failure patterns
 */

import { FailurePattern, NeuralPattern } from './FailureDetectionEngine';

export interface RecoveryStrategy {
  name: string;
  priority: number;
  conditions: (pattern: FailurePattern) => boolean;
  execute: (pattern: FailurePattern, context?: any) => Promise<RecoveryResult>;
  rollback?: (pattern: FailurePattern) => Promise<void>;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  data?: any;
  followupActions?: string[];
}

export interface RecoveryContext {
  claudeInstanceManager?: any;
  webSocketManager?: any;
  stateManager?: any;
  notificationSystem?: any;
}

class AutoRecoverySystem {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private context: RecoveryContext = {};
  private recoveryHistory: Array<{ pattern: FailurePattern; result: RecoveryResult; timestamp: number }> = [];
  private isRecovering: boolean = false;

  constructor(context: RecoveryContext = {}) {
    this.context = context;
    this.initializeStrategies();
  }

  /**
   * Initialize recovery strategies
   */
  private initializeStrategies(): void {
    // Strategy 1: Refresh Instance List
    this.registerStrategy({
      name: 'refresh_instance_list',
      priority: 1,
      conditions: (pattern) => pattern.type === 'STALE_INSTANCE_ID',
      execute: this.refreshInstanceList.bind(this)
    });

    // Strategy 2: Reconnect with Validation
    this.registerStrategy({
      name: 'reconnect_with_validation',
      priority: 2,
      conditions: (pattern) => pattern.type === 'CONNECTION_MISMATCH',
      execute: this.reconnectWithValidation.bind(this)
    });

    // Strategy 3: Cache Invalidation
    this.registerStrategy({
      name: 'invalidate_cache',
      priority: 3,
      conditions: (pattern) => pattern.type === 'CACHE_DESYNC',
      execute: this.invalidateCache.bind(this)
    });

    // Strategy 4: Full System Refresh
    this.registerStrategy({
      name: 'full_system_refresh',
      priority: 9,
      conditions: () => true, // Last resort
      execute: this.fullSystemRefresh.bind(this)
    });

    // Strategy 5: Smart Reconnection (Neural-guided)
    this.registerStrategy({
      name: 'smart_reconnection',
      priority: 0, // Highest priority for neural-guided recovery
      conditions: (pattern) => this.hasHighConfidenceNeuralPattern(pattern),
      execute: this.smartReconnection.bind(this)
    });
  }

  /**
   * Execute recovery for a detected failure pattern
   */
  async executeRecovery(pattern: FailurePattern): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        success: false,
        message: 'Recovery already in progress'
      };
    }

    this.isRecovering = true;

    try {
      // Find best strategy for this pattern
      const strategy = this.findBestStrategy(pattern);
      
      if (!strategy) {
        return {
          success: false,
          message: 'No suitable recovery strategy found'
        };
      }

      console.log(`NLD: Executing recovery strategy: ${strategy.name}`, pattern);

      // Execute the strategy
      const result = await strategy.execute(pattern, this.context);
      
      // Record recovery attempt
      this.recoveryHistory.push({
        pattern,
        result,
        timestamp: Date.now()
      });

      // If recovery failed and we have a rollback, execute it
      if (!result.success && strategy.rollback) {
        await strategy.rollback(pattern);
      }

      // Notify about recovery result
      this.notifyRecoveryResult(pattern, result, strategy.name);

      return result;

    } catch (error) {
      console.error('NLD: Recovery execution failed', error);
      
      const errorResult: RecoveryResult = {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      this.recoveryHistory.push({
        pattern,
        result: errorResult,
        timestamp: Date.now()
      });

      return errorResult;

    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Find the best recovery strategy for a pattern
   */
  private findBestStrategy(pattern: FailurePattern): RecoveryStrategy | null {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.conditions(pattern))
      .sort((a, b) => a.priority - b.priority);

    return applicableStrategies[0] || null;
  }

  /**
   * Strategy: Refresh Instance List
   */
  private async refreshInstanceList(pattern: FailurePattern): Promise<RecoveryResult> {
    try {
      // Fetch fresh instance list from backend
      const response = await fetch('/api/claude/instances', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const instances = await response.json();
      
      // Update context managers
      if (this.context.claudeInstanceManager) {
        this.context.claudeInstanceManager.updateInstances(instances);
      }

      // Clear stale cache
      this.clearInstanceCache();

      // Trigger UI refresh
      this.triggerUIRefresh();

      return {
        success: true,
        message: `Instance list refreshed. Found ${instances.length} instances.`,
        data: { instances },
        followupActions: ['select_valid_instance', 'reconnect']
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to refresh instance list: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Strategy: Reconnect with Validation
   */
  private async reconnectWithValidation(pattern: FailurePattern): Promise<RecoveryResult> {
    try {
      // First, validate available instances
      const validationResult = await this.validateInstances();
      
      if (!validationResult.success) {
        return validationResult;
      }

      const availableInstances = validationResult.data?.instances || [];
      
      // Find best instance to connect to
      let targetInstance: string;
      
      if (availableInstances.length === 1) {
        targetInstance = availableInstances[0];
      } else {
        // Use neural patterns to choose best instance
        targetInstance = this.selectBestInstance(availableInstances, pattern);
      }

      // Attempt connection
      const connectionResult = await this.connectToInstance(targetInstance);
      
      if (connectionResult.success) {
        // Update state to use new instance
        this.updateCurrentInstance(targetInstance);
        
        return {
          success: true,
          message: `Successfully connected to instance ${targetInstance}`,
          data: { instanceId: targetInstance },
          followupActions: ['verify_connection', 'resume_operations']
        };
      } else {
        return connectionResult;
      }

    } catch (error) {
      return {
        success: false,
        message: `Reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Strategy: Invalidate Cache
   */
  private async invalidateCache(pattern: FailurePattern): Promise<RecoveryResult> {
    try {
      // Clear various cache layers
      this.clearInstanceCache();
      this.clearConnectionCache();
      this.clearStateCache();

      // Force refresh of cached data
      if (this.context.stateManager) {
        this.context.stateManager.invalidateAll();
      }

      return {
        success: true,
        message: 'Cache invalidated successfully',
        followupActions: ['refresh_instance_list', 'reconnect']
      };

    } catch (error) {
      return {
        success: false,
        message: `Cache invalidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Strategy: Full System Refresh
   */
  private async fullSystemRefresh(pattern: FailurePattern): Promise<RecoveryResult> {
    try {
      // Step 1: Clear all caches
      await this.invalidateCache(pattern);

      // Step 2: Refresh instance list
      const refreshResult = await this.refreshInstanceList(pattern);
      
      if (!refreshResult.success) {
        return refreshResult;
      }

      // Step 3: Reset all connections
      if (this.context.webSocketManager) {
        await this.context.webSocketManager.resetAll();
      }

      // Step 4: Reinitialize components
      this.triggerSystemReinit();

      return {
        success: true,
        message: 'Full system refresh completed',
        data: refreshResult.data,
        followupActions: ['verify_all_connections']
      };

    } catch (error) {
      return {
        success: false,
        message: `Full system refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Strategy: Smart Reconnection (Neural-guided)
   */
  private async smartReconnection(pattern: FailurePattern): Promise<RecoveryResult> {
    try {
      // Use neural patterns to predict best recovery approach
      const neuralGuidance = this.getNeuralGuidance(pattern);
      
      if (neuralGuidance.confidence < 0.7) {
        // Fall back to standard strategies
        return this.reconnectWithValidation(pattern);
      }

      // Execute neural-recommended actions
      for (const action of neuralGuidance.recommendedActions) {
        const result = await this.executeNeuralAction(action, pattern);
        
        if (result.success) {
          return {
            success: true,
            message: `Neural-guided recovery successful: ${action}`,
            data: result.data,
            followupActions: neuralGuidance.followupActions
          };
        }
      }

      // If all neural recommendations failed, fallback
      return this.reconnectWithValidation(pattern);

    } catch (error) {
      return {
        success: false,
        message: `Smart reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Helper methods

  private clearInstanceCache(): void {
    if (typeof window !== 'undefined') {
      ['claude_instances', 'instance_states', 'connection_cache'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
  }

  private clearConnectionCache(): void {
    if (typeof window !== 'undefined') {
      ['ws_connections', 'active_connections', 'connection_states'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
  }

  private clearStateCache(): void {
    if (typeof window !== 'undefined') {
      ['app_state', 'component_states', 'user_preferences'].forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  private triggerUIRefresh(): void {
    // Trigger React re-renders
    window.dispatchEvent(new CustomEvent('nld:instances_updated'));
    window.dispatchEvent(new CustomEvent('nld:refresh_ui'));
  }

  private triggerSystemReinit(): void {
    window.dispatchEvent(new CustomEvent('nld:system_reinit'));
  }

  private async validateInstances(): Promise<RecoveryResult> {
    try {
      const response = await fetch('/api/claude/instances/validate', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        message: 'Instance validation successful',
        data
      };

    } catch (error) {
      return {
        success: false,
        message: `Instance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private selectBestInstance(instances: string[], pattern: FailurePattern): string {
    // Use neural patterns or simple heuristics to select best instance
    // For now, select the first available instance
    return instances[0];
  }

  private async connectToInstance(instanceId: string): Promise<RecoveryResult> {
    try {
      const response = await fetch(`/api/claude/instances/${instanceId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: `Connected to ${instanceId}`,
        data: { instanceId }
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private updateCurrentInstance(instanceId: string): void {
    if (this.context.claudeInstanceManager) {
      this.context.claudeInstanceManager.setCurrentInstance(instanceId);
    }
    
    // Update local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_claude_instance', instanceId);
    }
  }

  private hasHighConfidenceNeuralPattern(pattern: FailurePattern): boolean {
    // This would check against stored neural patterns
    // Placeholder implementation
    return false;
  }

  private getNeuralGuidance(pattern: FailurePattern): any {
    // This would use neural patterns to recommend recovery actions
    return {
      confidence: 0.8,
      recommendedActions: ['refresh_and_reconnect'],
      followupActions: ['verify_connection']
    };
  }

  private async executeNeuralAction(action: string, pattern: FailurePattern): Promise<RecoveryResult> {
    switch (action) {
      case 'refresh_and_reconnect':
        const refresh = await this.refreshInstanceList(pattern);
        if (refresh.success) {
          return this.reconnectWithValidation(pattern);
        }
        return refresh;
      
      default:
        return {
          success: false,
          message: `Unknown neural action: ${action}`
        };
    }
  }

  private notifyRecoveryResult(pattern: FailurePattern, result: RecoveryResult, strategyName: string): void {
    if (this.context.notificationSystem) {
      const message = result.success 
        ? `Recovery successful: ${result.message}`
        : `Recovery failed: ${result.message}`;
        
      this.context.notificationSystem.notify({
        type: result.success ? 'success' : 'error',
        title: 'NLD Auto Recovery',
        message,
        data: { pattern, strategy: strategyName }
      });
    }

    // Dispatch custom events for components to listen
    window.dispatchEvent(new CustomEvent('nld:recovery_result', {
      detail: { pattern, result, strategy: strategyName }
    }));
  }

  // Public API

  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  public updateContext(context: Partial<RecoveryContext>): void {
    this.context = { ...this.context, ...context };
  }

  public getRecoveryHistory(): Array<{ pattern: FailurePattern; result: RecoveryResult; timestamp: number }> {
    return [...this.recoveryHistory];
  }

  public getStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  public isCurrentlyRecovering(): boolean {
    return this.isRecovering;
  }

  public getSuccessRate(): number {
    if (this.recoveryHistory.length === 0) return 0;
    
    const successful = this.recoveryHistory.filter(h => h.result.success).length;
    return successful / this.recoveryHistory.length;
  }
}

export default AutoRecoverySystem;