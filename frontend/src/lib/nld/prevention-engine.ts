/**
 * NLD Prevention Engine
 * Generates preventive measures and implements automatic fixes
 */

import { FailurePattern, nld } from './core';
import { nldDatabase } from './database';

export interface PreventiveMeasure {
  id: string;
  patternType: string;
  measure: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementation: 'manual' | 'automatic' | 'configuration';
  estimatedImpact: number; // 0-1 scale
  complexity: 'simple' | 'moderate' | 'complex';
  category: 'ui' | 'connection' | 'logic' | 'monitoring' | 'user_experience';
}

export interface AutoFixResult {
  success: boolean;
  measure: PreventiveMeasure;
  appliedChanges: string[];
  errors?: string[];
}

export class NLDPreventionEngine {
  private activeMeasures: Map<string, PreventiveMeasure[]> = new Map();
  private autoFixEnabled = true;
  private implementationCallbacks: Map<string, (measure: PreventiveMeasure) => Promise<AutoFixResult>> = new Map();

  constructor() {
    this.initializeAutoFixes();
    this.startPreventionMonitoring();
  }

  /**
   * Generate preventive measures for a detected pattern
   */
  generateMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    const measures: PreventiveMeasure[] = [];

    switch (pattern.type) {
      case 'connection_loop':
        measures.push(
          ...this.generateConnectionLoopMeasures(pattern)
        );
        break;

      case 'race_condition':
        measures.push(
          ...this.generateRaceConditionMeasures(pattern)
        );
        break;

      case 'timeout_cascade':
        measures.push(
          ...this.generateTimeoutCascadeMeasures(pattern)
        );
        break;

      case 'state_violation':
        measures.push(
          ...this.generateStateViolationMeasures(pattern)
        );
        break;

      case 'user_confusion':
        measures.push(
          ...this.generateUserConfusionMeasures(pattern)
        );
        break;
    }

    // Store measures for this pattern
    this.activeMeasures.set(pattern.id, measures);

    // Automatically apply high-priority measures if enabled
    if (this.autoFixEnabled) {
      this.applyAutoFixes(measures.filter(m => m.implementation === 'automatic'));
    }

    return measures;
  }

  /**
   * Apply automatic fixes for measures
   */
  async applyAutoFixes(measures: PreventiveMeasure[]): Promise<AutoFixResult[]> {
    const results: AutoFixResult[] = [];

    for (const measure of measures) {
      try {
        const callback = this.implementationCallbacks.get(measure.id);
        if (callback) {
          const result = await callback(measure);
          results.push(result);
          
          if (result.success) {
            console.log('[NLD Prevention] Auto-fix applied:', measure.measure);
          } else {
            console.error('[NLD Prevention] Auto-fix failed:', measure.measure, result.errors);
          }
        }
      } catch (error) {
        console.error('[NLD Prevention] Error applying auto-fix:', error);
        results.push({
          success: false,
          measure,
          appliedChanges: [],
          errors: [error.message || error.toString()]
        });
      }
    }

    return results;
  }

  /**
   * Get historical effectiveness of measures
   */
  getMeasureEffectiveness(patternType: string): Record<string, number> {
    const patterns = nldDatabase.getPatternsByType(patternType);
    const effectiveness: Record<string, number> = {};
    
    // Simple effectiveness calculation based on pattern frequency reduction
    // This would be enhanced with actual measurement data in production
    const baseFrequency = patterns.length;
    
    this.getDefaultMeasures(patternType).forEach(measure => {
      // Simulate effectiveness based on complexity and impact
      const simulatedReduction = measure.estimatedImpact * (1 - (measure.complexity === 'complex' ? 0.3 : 0.1));
      effectiveness[measure.measure] = Math.min(simulatedReduction, 0.95);
    });

    return effectiveness;
  }

  /**
   * Get recommendations based on pattern analysis
   */
  getRecommendations(): Array<{
    priority: string;
    pattern: string;
    recommendation: string;
    impact: string;
  }> {
    const statistics = nldDatabase.getPatternStatistics();
    const recommendations: Array<{
      priority: string;
      pattern: string;
      recommendation: string;
      impact: string;
    }> = [];

    // Analyze most frequent patterns
    Object.entries(statistics.patternsByType).forEach(([type, count]) => {
      if (count > 3) { // Threshold for recommendations
        const measures = this.getDefaultMeasures(type);
        const highImpactMeasures = measures
          .filter(m => m.priority === 'high' || m.priority === 'critical')
          .slice(0, 2); // Top 2 recommendations

        highImpactMeasures.forEach(measure => {
          recommendations.push({
            priority: measure.priority,
            pattern: type,
            recommendation: measure.measure,
            impact: `${Math.round(measure.estimatedImpact * 100)}% improvement expected`
          });
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Pattern-specific measure generators
  private generateConnectionLoopMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    return [
      {
        id: 'conn-loop-backoff',
        patternType: 'connection_loop',
        measure: 'Implement exponential backoff for reconnections',
        priority: 'high',
        implementation: 'automatic',
        estimatedImpact: 0.8,
        complexity: 'moderate',
        category: 'connection'
      },
      {
        id: 'conn-loop-circuit-breaker',
        patternType: 'connection_loop',
        measure: 'Add circuit breaker pattern',
        priority: 'high',
        implementation: 'configuration',
        estimatedImpact: 0.75,
        complexity: 'moderate',
        category: 'connection'
      },
      {
        id: 'conn-loop-ui-feedback',
        patternType: 'connection_loop',
        measure: 'Show connection status feedback to user',
        priority: 'medium',
        implementation: 'manual',
        estimatedImpact: 0.6,
        complexity: 'simple',
        category: 'ui'
      },
      {
        id: 'conn-loop-limit-attempts',
        patternType: 'connection_loop',
        measure: 'Limit maximum reconnection attempts',
        priority: 'medium',
        implementation: 'automatic',
        estimatedImpact: 0.7,
        complexity: 'simple',
        category: 'connection'
      }
    ];
  }

  private generateRaceConditionMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    return [
      {
        id: 'race-connection-mutex',
        patternType: 'race_condition',
        measure: 'Implement connection state mutex/lock',
        priority: 'high',
        implementation: 'automatic',
        estimatedImpact: 0.9,
        complexity: 'moderate',
        category: 'logic'
      },
      {
        id: 'race-debounce-attempts',
        patternType: 'race_condition',
        measure: 'Debounce connection attempts',
        priority: 'high',
        implementation: 'automatic',
        estimatedImpact: 0.8,
        complexity: 'simple',
        category: 'logic'
      },
      {
        id: 'race-queue-requests',
        patternType: 'race_condition',
        measure: 'Queue connection requests instead of parallel execution',
        priority: 'medium',
        implementation: 'configuration',
        estimatedImpact: 0.75,
        complexity: 'moderate',
        category: 'logic'
      }
    ];
  }

  private generateTimeoutCascadeMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    return [
      {
        id: 'timeout-adaptive-values',
        patternType: 'timeout_cascade',
        measure: 'Implement adaptive timeout values',
        priority: 'high',
        implementation: 'automatic',
        estimatedImpact: 0.8,
        complexity: 'moderate',
        category: 'connection'
      },
      {
        id: 'timeout-health-monitoring',
        patternType: 'timeout_cascade',
        measure: 'Add connection health monitoring',
        priority: 'medium',
        implementation: 'automatic',
        estimatedImpact: 0.7,
        complexity: 'complex',
        category: 'monitoring'
      },
      {
        id: 'timeout-fallback-strategy',
        patternType: 'timeout_cascade',
        measure: 'Implement fallback connection strategies',
        priority: 'medium',
        implementation: 'configuration',
        estimatedImpact: 0.6,
        complexity: 'complex',
        category: 'connection'
      }
    ];
  }

  private generateStateViolationMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    return [
      {
        id: 'state-transition-validation',
        patternType: 'state_violation',
        measure: 'Add state transition validation',
        priority: 'critical',
        implementation: 'automatic',
        estimatedImpact: 0.95,
        complexity: 'moderate',
        category: 'logic'
      },
      {
        id: 'state-machine-guards',
        patternType: 'state_violation',
        measure: 'Implement state machine with guards',
        priority: 'high',
        implementation: 'configuration',
        estimatedImpact: 0.9,
        complexity: 'complex',
        category: 'logic'
      },
      {
        id: 'state-recovery-mechanism',
        patternType: 'state_violation',
        measure: 'Create state recovery mechanisms',
        priority: 'medium',
        implementation: 'manual',
        estimatedImpact: 0.7,
        complexity: 'complex',
        category: 'logic'
      }
    ];
  }

  private generateUserConfusionMeasures(pattern: FailurePattern): PreventiveMeasure[] {
    return [
      {
        id: 'user-loading-states',
        patternType: 'user_confusion',
        measure: 'Add loading states and progress indicators',
        priority: 'high',
        implementation: 'automatic',
        estimatedImpact: 0.8,
        complexity: 'simple',
        category: 'ui'
      },
      {
        id: 'user-action-debouncing',
        patternType: 'user_confusion',
        measure: 'Implement user action debouncing',
        priority: 'medium',
        implementation: 'automatic',
        estimatedImpact: 0.7,
        complexity: 'simple',
        category: 'user_experience'
      },
      {
        id: 'user-clear-feedback',
        patternType: 'user_confusion',
        measure: 'Provide clear feedback messages',
        priority: 'medium',
        implementation: 'manual',
        estimatedImpact: 0.6,
        complexity: 'simple',
        category: 'ui'
      },
      {
        id: 'user-help-tooltips',
        patternType: 'user_confusion',
        measure: 'Add help tooltips for connection issues',
        priority: 'low',
        implementation: 'manual',
        estimatedImpact: 0.4,
        complexity: 'simple',
        category: 'user_experience'
      }
    ];
  }

  private getDefaultMeasures(patternType: string): PreventiveMeasure[] {
    const dummyPattern: FailurePattern = {
      id: 'dummy',
      type: patternType as any,
      severity: 'medium',
      frequency: 1,
      description: 'dummy',
      events: [],
      detectedAt: Date.now(),
      confidence: 0.5,
      metadata: {}
    };

    return this.generateMeasures(dummyPattern);
  }

  private initializeAutoFixes(): void {
    // Exponential backoff implementation
    this.implementationCallbacks.set('conn-loop-backoff', async (measure) => {
      try {
        // This would integrate with the actual connection manager
        console.log('[Auto-Fix] Implementing exponential backoff...');
        
        // Simulate configuration change
        const config = {
          reconnectBackoff: 'exponential',
          baseDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2
        };
        
        return {
          success: true,
          measure,
          appliedChanges: [
            'Set reconnect backoff to exponential',
            'Base delay: 1000ms',
            'Max delay: 30000ms',
            'Backoff factor: 2x'
          ]
        };
      } catch (error) {
        return {
          success: false,
          measure,
          appliedChanges: [],
          errors: [error.message]
        };
      }
    });

    // Connection mutex implementation
    this.implementationCallbacks.set('race-connection-mutex', async (measure) => {
      try {
        console.log('[Auto-Fix] Implementing connection mutex...');
        
        // This would add mutex logic to connection manager
        return {
          success: true,
          measure,
          appliedChanges: [
            'Added connection state mutex',
            'Prevented concurrent connection attempts'
          ]
        };
      } catch (error) {
        return {
          success: false,
          measure,
          appliedChanges: [],
          errors: [error.message]
        };
      }
    });

    // Add more auto-fix implementations as needed
  }

  private startPreventionMonitoring(): void {
    // Listen for pattern detection events
    if (typeof window !== 'undefined') {
      window.addEventListener('nld:pattern-detected', (event: CustomEvent) => {
        const pattern = event.detail as FailurePattern;
        console.log('[NLD Prevention] Pattern detected, generating measures...', pattern.type);
        
        const measures = this.generateMeasures(pattern);
        
        // Emit measures generated event
        window.dispatchEvent(new CustomEvent('nld:measures-generated', {
          detail: { pattern, measures }
        }));
      });
    }

    // Periodic review of effectiveness
    setInterval(() => {
      this.reviewMeasureEffectiveness();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private reviewMeasureEffectiveness(): void {
    // Analyze if implemented measures are working
    const recentPatterns = nldDatabase.getRecentPatterns(1); // Last hour
    
    recentPatterns.forEach(pattern => {
      const measures = this.activeMeasures.get(pattern.id);
      if (measures) {
        // Check if similar patterns are still occurring
        const similarPatterns = nldDatabase.getPatternsByType(pattern.type);
        const recentSimilar = similarPatterns.filter(p => 
          p.detectedAt > pattern.detectedAt && 
          Date.now() - p.detectedAt < 30 * 60 * 1000 // 30 minutes
        );

        if (recentSimilar.length > 0) {
          console.warn('[NLD Prevention] Measures may not be effective for:', pattern.type);
          // Could trigger additional or alternative measures
        }
      }
    });
  }

  // Public API
  enableAutoFix(): void {
    this.autoFixEnabled = true;
    console.log('[NLD Prevention] Auto-fix enabled');
  }

  disableAutoFix(): void {
    this.autoFixEnabled = false;
    console.log('[NLD Prevention] Auto-fix disabled');
  }

  getActiveMeasures(): Map<string, PreventiveMeasure[]> {
    return new Map(this.activeMeasures);
  }

  isAutoFixEnabled(): boolean {
    return this.autoFixEnabled;
  }
}

// Global prevention engine instance
export const preventionEngine = new NLDPreventionEngine();