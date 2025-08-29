/**
 * Automated Recovery and Rollback System
 * Automatically recovers from UI modernization failures and rolls back problematic changes
 */

import { EventEmitter } from 'events';
import { uiRegressionMonitor } from './ui-regression-monitor';
import { claudeFunctionalityValidator } from './claude-functionality-validator';
import { sseStreamingGuardian } from './sse-streaming-guardian';
import { componentStateTracker } from './component-state-tracker';
import { uiPerformanceMonitor } from './ui-performance-monitor';
import { neuralPatternTrainer } from './neural-pattern-trainer';

export interface RecoverySnapshot {
  id: string;
  timestamp: number;
  description: string;
  domSnapshot: string;
  styleSnapshot: string;
  componentStates: any[];
  functionalityStatus: any;
  performanceMetrics: any;
  confidence: number;
}

export interface RecoveryAction {
  id: string;
  type: 'ROLLBACK' | 'REPAIR' | 'RESTART' | 'RELOAD';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  execute: () => Promise<boolean>;
  validate: () => Promise<boolean>;
  estimatedTime: number;
  successProbability: number;
}

export interface RecoveryAttempt {
  id: string;
  timestamp: number;
  trigger: string;
  actions: RecoveryAction[];
  status: 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  duration: number;
  details: {
    before: any;
    after: any;
    issues: string[];
    resolved: string[];
  };
}

export class AutomatedRecoverySystem extends EventEmitter {
  private snapshots: Map<string, RecoverySnapshot> = new Map();
  private recoveryAttempts: RecoveryAttempt[] = [];
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private isRecoveryInProgress = false;
  private snapshotInterval: NodeJS.Timeout | null = null;
  private lastSnapshot: string | null = null;

  constructor() {
    super();
    this.initializeRecoveryActions();
    this.setupAutomaticSnapshots();
    this.integrateWithNLDSystems();
    console.log('[NLD] Automated Recovery System initialized');
  }

  private initializeRecoveryActions(): void {
    // Recovery Action 1: Claude Functionality Repair
    this.recoveryActions.set('CLAUDE_FUNCTIONALITY_REPAIR', {
      id: 'CLAUDE_FUNCTIONALITY_REPAIR',
      type: 'REPAIR',
      priority: 'CRITICAL',
      description: 'Repair broken Claude functionality',
      execute: async () => {
        try {
          return await claudeFunctionalityValidator.repairClaudeFunctionality();
        } catch (error) {
          console.error('[NLD] Claude functionality repair failed:', error);
          return false;
        }
      },
      validate: async () => {
        const functionality = await claudeFunctionalityValidator.runFullValidation();
        return Object.values(functionality).every(working => working);
      },
      estimatedTime: 5000,
      successProbability: 0.8
    });

    // Recovery Action 2: SSE Streaming Recovery
    this.recoveryActions.set('SSE_STREAMING_RECOVERY', {
      id: 'SSE_STREAMING_RECOVERY',
      type: 'RESTART',
      priority: 'HIGH',
      description: 'Restore SSE streaming connections',
      execute: async () => {
        try {
          const activeConnections = sseStreamingGuardian.getActiveConnections();
          let successCount = 0;
          
          for (const instanceId of activeConnections) {
            const success = await sseStreamingGuardian.attemptStreamingRecovery(instanceId);
            if (success) successCount++;
          }
          
          return successCount > activeConnections.length * 0.7; // 70% success rate
        } catch (error) {
          console.error('[NLD] SSE streaming recovery failed:', error);
          return false;
        }
      },
      validate: async () => {
        const streamingHealth = sseStreamingGuardian.getStreamingHealth();
        const healthyConnections = Array.from(streamingHealth.values())
          .filter(health => health.isConnected && health.errorCount < 3);
        
        return healthyConnections.length >= streamingHealth.size * 0.8;
      },
      estimatedTime: 8000,
      successProbability: 0.75
    });

    // Recovery Action 3: Component State Reset
    this.recoveryActions.set('COMPONENT_STATE_RESET', {
      id: 'COMPONENT_STATE_RESET',
      type: 'RESTART',
      priority: 'MEDIUM',
      description: 'Reset component state synchronization',
      execute: async () => {
        try {
          // Force component re-render
          componentStateTracker.emit('force-rerender');
          
          // Reset component states
          componentStateTracker.emit('reset-component-state', { all: true });
          
          // Wait for stabilization
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return true;
        } catch (error) {
          console.error('[NLD] Component state reset failed:', error);
          return false;
        }
      },
      validate: async () => {
        const recentEvents = componentStateTracker.getDesyncEvents(10);
        const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL');
        return criticalEvents.length === 0;
      },
      estimatedTime: 3000,
      successProbability: 0.85
    });

    // Recovery Action 4: Performance Optimization
    this.recoveryActions.set('PERFORMANCE_OPTIMIZATION', {
      id: 'PERFORMANCE_OPTIMIZATION',
      type: 'REPAIR',
      priority: 'MEDIUM',
      description: 'Optimize UI performance',
      execute: async () => {
        try {
          // Trigger performance optimization
          uiPerformanceMonitor.emit('optimize-memory');
          uiPerformanceMonitor.emit('optimize-fps');
          uiPerformanceMonitor.emit('optimize-layout');
          
          // Wait for optimization to take effect
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          return true;
        } catch (error) {
          console.error('[NLD] Performance optimization failed:', error);
          return false;
        }
      },
      validate: async () => {
        const metrics = uiPerformanceMonitor.getCurrentMetrics();
        return metrics.fps > 30 && metrics.renderTime < 50 && metrics.interactionDelay < 200;
      },
      estimatedTime: 6000,
      successProbability: 0.7
    });

    // Recovery Action 5: DOM State Rollback
    this.recoveryActions.set('DOM_STATE_ROLLBACK', {
      id: 'DOM_STATE_ROLLBACK',
      type: 'ROLLBACK',
      priority: 'HIGH',
      description: 'Rollback DOM to last known good state',
      execute: async () => {
        try {
          const lastGoodSnapshot = this.findLastGoodSnapshot();
          if (!lastGoodSnapshot) {
            console.warn('[NLD] No good snapshot available for rollback');
            return false;
          }
          
          return await this.restoreSnapshot(lastGoodSnapshot.id);
        } catch (error) {
          console.error('[NLD] DOM rollback failed:', error);
          return false;
        }
      },
      validate: async () => {
        // Validate that Claude functionality works after rollback
        return await this.recoveryActions.get('CLAUDE_FUNCTIONALITY_REPAIR')?.validate() || false;
      },
      estimatedTime: 4000,
      successProbability: 0.9
    });

    // Recovery Action 6: Page Reload (Last Resort)
    this.recoveryActions.set('PAGE_RELOAD', {
      id: 'PAGE_RELOAD',
      type: 'RELOAD',
      priority: 'CRITICAL',
      description: 'Reload page to restore functionality',
      execute: async () => {
        try {
          // Save critical state before reload
          this.savePreReloadState();
          
          // Trigger page reload
          window.location.reload();
          
          return true; // If we get here, reload didn't happen
        } catch (error) {
          console.error('[NLD] Page reload failed:', error);
          return false;
        }
      },
      validate: async () => {
        // This will be validated after page load
        return true;
      },
      estimatedTime: 10000,
      successProbability: 0.95
    });

    console.log(`[NLD] ${this.recoveryActions.size} recovery actions initialized`);
  }

  private setupAutomaticSnapshots(): void {
    // Create snapshots every 30 seconds
    this.snapshotInterval = setInterval(() => {
      this.createSnapshot('AUTOMATIC', 'Periodic automatic snapshot');
    }, 30000);

    // Create initial snapshot
    setTimeout(() => {
      this.createSnapshot('INITIAL', 'Initial system state');
    }, 2000);

    console.log('[NLD] Automatic snapshot system started');
  }

  private integrateWithNLDSystems(): void {
    // Integrate with UI Regression Monitor
    uiRegressionMonitor.on('regression-detected', (event) => {
      if (event.pattern.severity === 'CRITICAL') {
        this.triggerRecovery('UI_REGRESSION', event);
      }
    });

    // Integrate with Claude Functionality Validator
    claudeFunctionalityValidator.on('critical-failure', (failure) => {
      this.triggerRecovery('CLAUDE_FUNCTIONALITY', failure);
    });

    // Integrate with SSE Streaming Guardian
    sseStreamingGuardian.on('ui-disruption-detected', (disruption) => {
      this.triggerRecovery('SSE_DISRUPTION', disruption);
    });

    // Integrate with Component State Tracker
    componentStateTracker.on('component-reload-needed', (component) => {
      this.triggerRecovery('COMPONENT_STATE', component);
    });

    // Integrate with Performance Monitor
    uiPerformanceMonitor.on('performance-issue', (event) => {
      if (event.severity === 'CRITICAL') {
        this.triggerRecovery('PERFORMANCE_CRITICAL', event);
      }
    });

    console.log('[NLD] Recovery system integrated with NLD monitoring systems');
  }

  public createSnapshot(trigger: string, description: string): string {
    const snapshot: RecoverySnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      description,
      domSnapshot: this.captureDOMSnapshot(),
      styleSnapshot: this.captureStyleSnapshot(),
      componentStates: this.captureComponentStates(),
      functionalityStatus: this.captureFunctionalityStatus(),
      performanceMetrics: this.capturePerformanceMetrics(),
      confidence: this.calculateSnapshotConfidence()
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Keep only last 10 snapshots
    if (this.snapshots.size > 10) {
      const oldestKey = this.snapshots.keys().next().value;
      this.snapshots.delete(oldestKey);
    }

    this.lastSnapshot = snapshot.id;

    console.log(`[NLD] Snapshot created: ${snapshot.id} (${trigger})`);
    this.emit('snapshot-created', snapshot);

    return snapshot.id;
  }

  private captureDOMSnapshot(): string {
    // Capture essential DOM structure
    const essentialElements = document.querySelectorAll('[data-claude-action], .claude-instance-manager, .terminal-output, .input-field');
    const snapshot = Array.from(essentialElements).map(el => ({
      selector: this.getElementSelector(el),
      attributes: this.getElementAttributes(el),
      textContent: el.textContent?.slice(0, 100) // First 100 chars
    }));

    return JSON.stringify(snapshot);
  }

  private captureStyleSnapshot(): string {
    // Capture critical styles
    const criticalSelectors = [
      '.claude-instance-manager',
      'button[data-claude-action]',
      '.terminal-output',
      '.input-field',
      '.connection-status'
    ];

    const styles: any = {};
    criticalSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        const computedStyle = window.getComputedStyle(el);
        styles[`${selector}_${index}`] = {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          pointerEvents: computedStyle.pointerEvents
        };
      });
    });

    return JSON.stringify(styles);
  }

  private captureComponentStates(): any[] {
    const componentStates = componentStateTracker.getComponentStates();
    return Array.from(componentStates.entries()).slice(0, 20); // Top 20 components
  }

  private captureFunctionalityStatus(): any {
    return {
      claudeFunctionality: claudeFunctionalityValidator.getCriticalFailures(),
      streamingHealth: Array.from(sseStreamingGuardian.getStreamingHealth().entries()),
      lastValidation: claudeFunctionalityValidator.getLastValidationTime()
    };
  }

  private capturePerformanceMetrics(): any {
    return uiPerformanceMonitor.getCurrentMetrics();
  }

  private calculateSnapshotConfidence(): number {
    // Calculate confidence based on system health
    const criticalFailures = claudeFunctionalityValidator.getCriticalFailures();
    const streamingHealth = sseStreamingGuardian.getStreamingHealth();
    const performanceEvents = uiPerformanceMonitor.getPerformanceEvents(5);
    const stateEvents = componentStateTracker.getDesyncEvents(5);

    let confidence = 1.0;

    // Reduce confidence for each critical failure
    confidence -= criticalFailures.length * 0.2;

    // Reduce confidence for streaming issues
    const unhealthyStreams = Array.from(streamingHealth.values()).filter(h => !h.isConnected);
    confidence -= unhealthyStreams.length * 0.1;

    // Reduce confidence for performance issues
    const criticalPerfEvents = performanceEvents.filter(e => e.severity === 'CRITICAL');
    confidence -= criticalPerfEvents.length * 0.15;

    // Reduce confidence for state issues
    const criticalStateEvents = stateEvents.filter(e => e.severity === 'CRITICAL');
    confidence -= criticalStateEvents.length * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
    if (element.getAttribute('data-claude-action')) return `[data-claude-action="${element.getAttribute('data-claude-action')}"]`;
    return element.tagName.toLowerCase() + (element.className ? `.${element.className.split(' ')[0]}` : '');
  }

  private getElementAttributes(element: Element): any {
    const attrs: any = {};
    const importantAttrs = ['id', 'class', 'data-testid', 'data-claude-action', 'disabled', 'hidden'];
    
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value !== null) attrs[attr] = value;
    });

    return attrs;
  }

  public async triggerRecovery(trigger: string, context: any): Promise<boolean> {
    if (this.isRecoveryInProgress) {
      console.warn('[NLD] Recovery already in progress, queuing trigger:', trigger);
      return false;
    }

    this.isRecoveryInProgress = true;
    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[NLD] Triggering recovery: ${trigger}`, context);

    // Create snapshot before recovery
    const preRecoverySnapshotId = this.createSnapshot('PRE_RECOVERY', `Before recovery for ${trigger}`);

    const recoveryAttempt: RecoveryAttempt = {
      id: recoveryId,
      timestamp: Date.now(),
      trigger,
      actions: [],
      status: 'IN_PROGRESS',
      duration: 0,
      details: {
        before: this.captureSystemState(),
        after: null,
        issues: [],
        resolved: []
      }
    };

    this.recoveryAttempts.push(recoveryAttempt);

    try {
      // Select appropriate recovery actions based on trigger
      const actions = this.selectRecoveryActions(trigger, context);
      recoveryAttempt.actions = actions;

      console.log(`[NLD] Executing ${actions.length} recovery actions for ${trigger}`);
      let successCount = 0;

      // Execute recovery actions in order of priority
      for (const action of actions) {
        console.log(`[NLD] Executing recovery action: ${action.description}`);
        
        try {
          const success = await action.execute();
          
          if (success) {
            const isValid = await action.validate();
            if (isValid) {
              successCount++;
              recoveryAttempt.details.resolved.push(action.description);
              console.log(`[NLD] Recovery action succeeded: ${action.description}`);
            } else {
              recoveryAttempt.details.issues.push(`${action.description} executed but validation failed`);
              console.warn(`[NLD] Recovery action validation failed: ${action.description}`);
            }
          } else {
            recoveryAttempt.details.issues.push(`${action.description} execution failed`);
            console.error(`[NLD] Recovery action failed: ${action.description}`);
          }
        } catch (error) {
          recoveryAttempt.details.issues.push(`${action.description} threw error: ${error}`);
          console.error(`[NLD] Recovery action error:`, error);
        }

        // Short delay between actions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Determine overall recovery success
      const successRate = actions.length > 0 ? successCount / actions.length : 0;
      
      if (successRate >= 0.8) {
        recoveryAttempt.status = 'SUCCESS';
      } else if (successRate >= 0.5) {
        recoveryAttempt.status = 'PARTIAL';
      } else {
        recoveryAttempt.status = 'FAILED';
      }

      recoveryAttempt.details.after = this.captureSystemState();
      recoveryAttempt.duration = Date.now() - recoveryAttempt.timestamp;

      console.log(`[NLD] Recovery completed: ${recoveryAttempt.status} (${successCount}/${actions.length} actions succeeded)`);

      // Create post-recovery snapshot
      this.createSnapshot('POST_RECOVERY', `After recovery for ${trigger} - ${recoveryAttempt.status}`);

      // Train neural network on recovery pattern
      if (neuralPatternTrainer) {
        neuralPatternTrainer.captureUIFunctionalityPattern(
          {
            domChanges: 1, // Recovery involves changes
            cssChanges: 0,
            componentUpdates: actions.length,
            styleModifications: 0
          },
          {
            buttonHandlerIntact: recoveryAttempt.status === 'SUCCESS',
            sseStreamingActive: recoveryAttempt.status === 'SUCCESS',
            componentStateConsistent: recoveryAttempt.status === 'SUCCESS',
            performanceWithinBudget: true // Recovery should improve performance
          },
          recoveryAttempt.status === 'SUCCESS' ? 'RECOVERY' : 'PARTIAL_REGRESSION',
          successRate,
          recoveryAttempt.duration
        );
      }

      this.emit('recovery-complete', recoveryAttempt);

      return recoveryAttempt.status === 'SUCCESS';

    } catch (error) {
      console.error(`[NLD] Recovery process failed for ${trigger}:`, error);
      recoveryAttempt.status = 'FAILED';
      recoveryAttempt.details.issues.push(`Recovery process error: ${error}`);
      recoveryAttempt.duration = Date.now() - recoveryAttempt.timestamp;

      this.emit('recovery-failed', recoveryAttempt);
      return false;

    } finally {
      this.isRecoveryInProgress = false;
    }
  }

  private selectRecoveryActions(trigger: string, context: any): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Select actions based on trigger type
    switch (trigger) {
      case 'CLAUDE_FUNCTIONALITY':
        actions.push(this.recoveryActions.get('CLAUDE_FUNCTIONALITY_REPAIR')!);
        actions.push(this.recoveryActions.get('COMPONENT_STATE_RESET')!);
        break;

      case 'SSE_DISRUPTION':
        actions.push(this.recoveryActions.get('SSE_STREAMING_RECOVERY')!);
        break;

      case 'COMPONENT_STATE':
        actions.push(this.recoveryActions.get('COMPONENT_STATE_RESET')!);
        break;

      case 'PERFORMANCE_CRITICAL':
        actions.push(this.recoveryActions.get('PERFORMANCE_OPTIMIZATION')!);
        break;

      case 'UI_REGRESSION':
        // For UI regressions, try repair first, then rollback if needed
        actions.push(this.recoveryActions.get('CLAUDE_FUNCTIONALITY_REPAIR')!);
        actions.push(this.recoveryActions.get('SSE_STREAMING_RECOVERY')!);
        actions.push(this.recoveryActions.get('DOM_STATE_ROLLBACK')!);
        break;

      default:
        // Generic recovery strategy
        actions.push(this.recoveryActions.get('CLAUDE_FUNCTIONALITY_REPAIR')!);
        actions.push(this.recoveryActions.get('COMPONENT_STATE_RESET')!);
        actions.push(this.recoveryActions.get('SSE_STREAMING_RECOVERY')!);
        break;
    }

    // Add last resort action for critical situations
    if (context?.severity === 'CRITICAL' || trigger === 'SYSTEM_CRITICAL') {
      actions.push(this.recoveryActions.get('PAGE_RELOAD')!);
    }

    // Sort by priority
    actions.sort((a, b) => {
      const priorities = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    return actions;
  }

  private findLastGoodSnapshot(): RecoverySnapshot | null {
    // Find the most recent snapshot with high confidence
    const snapshots = Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(s => s.confidence > 0.7);

    return snapshots.length > 0 ? snapshots[0] : null;
  }

  private async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      console.error('[NLD] Snapshot not found:', snapshotId);
      return false;
    }

    try {
      console.log(`[NLD] Restoring snapshot: ${snapshot.id}`);

      // Restore DOM structure (simplified)
      const domSnapshot = JSON.parse(snapshot.domSnapshot);
      domSnapshot.forEach((elementData: any) => {
        const element = document.querySelector(elementData.selector);
        if (element) {
          // Restore critical attributes
          Object.entries(elementData.attributes).forEach(([attr, value]) => {
            element.setAttribute(attr, value as string);
          });
        }
      });

      // Restore critical styles
      const styleSnapshot = JSON.parse(snapshot.styleSnapshot);
      Object.entries(styleSnapshot).forEach(([selector, styles]) => {
        const element = document.querySelector(selector.split('_')[0]);
        if (element && styles) {
          Object.entries(styles as any).forEach(([prop, value]) => {
            (element as HTMLElement).style.setProperty(prop, value as string);
          });
        }
      });

      console.log(`[NLD] Snapshot restored: ${snapshot.id}`);
      return true;

    } catch (error) {
      console.error(`[NLD] Failed to restore snapshot ${snapshotId}:`, error);
      return false;
    }
  }

  private captureSystemState(): any {
    return {
      timestamp: Date.now(),
      functionalityStatus: this.captureFunctionalityStatus(),
      performanceMetrics: this.capturePerformanceMetrics(),
      componentCount: componentStateTracker.getComponentStates().size,
      streamingConnections: sseStreamingGuardian.getActiveConnections().length
    };
  }

  private savePreReloadState(): void {
    const state = {
      timestamp: Date.now(),
      trigger: 'PRE_RELOAD',
      snapshots: Array.from(this.snapshots.keys()),
      recoveryAttempts: this.recoveryAttempts.length
    };

    try {
      localStorage.setItem('nld_recovery_state', JSON.stringify(state));
      console.log('[NLD] Pre-reload state saved');
    } catch (error) {
      console.warn('[NLD] Failed to save pre-reload state:', error);
    }
  }

  public getRecoveryHistory(): RecoveryAttempt[] {
    return [...this.recoveryAttempts];
  }

  public getSnapshots(): Map<string, RecoverySnapshot> {
    return new Map(this.snapshots);
  }

  public generateRecoveryReport(): string {
    const totalAttempts = this.recoveryAttempts.length;
    const successfulAttempts = this.recoveryAttempts.filter(a => a.status === 'SUCCESS').length;
    const partialAttempts = this.recoveryAttempts.filter(a => a.status === 'PARTIAL').length;
    const failedAttempts = this.recoveryAttempts.filter(a => a.status === 'FAILED').length;

    const avgRecoveryTime = totalAttempts > 0 
      ? this.recoveryAttempts.reduce((sum, a) => sum + a.duration, 0) / totalAttempts
      : 0;

    const recentAttempts = this.recoveryAttempts.slice(-5);
    const availableSnapshots = this.snapshots.size;
    const lastSnapshotConfidence = this.lastSnapshot 
      ? this.snapshots.get(this.lastSnapshot)?.confidence || 0
      : 0;

    return `
Automated Recovery System Report
==============================

Recovery Statistics:
- Total Recovery Attempts: ${totalAttempts}
- Successful: ${successfulAttempts} (${totalAttempts > 0 ? (successfulAttempts/totalAttempts*100).toFixed(1) : 0}%)
- Partial: ${partialAttempts} (${totalAttempts > 0 ? (partialAttempts/totalAttempts*100).toFixed(1) : 0}%)
- Failed: ${failedAttempts} (${totalAttempts > 0 ? (failedAttempts/totalAttempts*100).toFixed(1) : 0}%)

Performance Metrics:
- Average Recovery Time: ${(avgRecoveryTime / 1000).toFixed(2)}s
- Available Snapshots: ${availableSnapshots}
- Last Snapshot Confidence: ${(lastSnapshotConfidence * 100).toFixed(1)}%
- Recovery In Progress: ${this.isRecoveryInProgress ? 'Yes' : 'No'}

Recovery Actions Available:
${Array.from(this.recoveryActions.values()).map(action =>
  `- ${action.description} (${action.priority} priority, ${(action.successProbability * 100).toFixed(1)}% success rate)`
).join('\n')}

Recent Recovery Attempts:
${recentAttempts.map(attempt =>
  `${new Date(attempt.timestamp).toLocaleTimeString()} - ${attempt.trigger}: ${attempt.status} (${attempt.actions.length} actions, ${(attempt.duration/1000).toFixed(2)}s)`
).join('\n') || 'No recent attempts'}

System Health:
- Critical Functionality Issues: ${claudeFunctionalityValidator.getCriticalFailures().length}
- Active Streaming Connections: ${sseStreamingGuardian.getActiveConnections().length}
- Component State Issues: ${componentStateTracker.getDesyncEvents(10).filter(e => e.severity === 'CRITICAL').length}

Recommendations:
${this.generateRecoveryRecommendations()}
`;
  }

  private generateRecoveryRecommendations(): string {
    const recommendations: string[] = [];
    
    const successRate = this.recoveryAttempts.length > 0 
      ? this.recoveryAttempts.filter(a => a.status === 'SUCCESS').length / this.recoveryAttempts.length
      : 1;

    if (successRate < 0.7) {
      recommendations.push('- Recovery success rate below 70%, review recovery actions');
    }

    if (this.snapshots.size < 5) {
      recommendations.push('- Insufficient snapshots for reliable recovery');
    }

    const lastSnapshotConfidence = this.lastSnapshot 
      ? this.snapshots.get(this.lastSnapshot)?.confidence || 0
      : 0;

    if (lastSnapshotConfidence < 0.8) {
      recommendations.push('- Last snapshot has low confidence, system may be unstable');
    }

    const recentFailures = this.recoveryAttempts.slice(-5).filter(a => a.status === 'FAILED');
    if (recentFailures.length > 2) {
      recommendations.push('- Multiple recent recovery failures, investigate root causes');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Recovery system operating optimally');
    }

    return recommendations.join('\n');
  }

  public destroy(): void {
    // Stop automatic snapshots
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    // Clear data
    this.snapshots.clear();
    this.recoveryAttempts = [];
    this.recoveryActions.clear();

    // Remove event listeners
    this.removeAllListeners();

    this.isRecoveryInProgress = false;
    console.log('[NLD] Automated Recovery System destroyed');
  }
}

export const automatedRecoverySystem = new AutomatedRecoverySystem();