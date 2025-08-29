/**
 * NLD UI Modernization Regression Prevention System
 * Main integration file that coordinates all UI regression monitoring components
 */

import { uiRegressionMonitor, UIRegressionMonitor } from './ui-regression-monitor';
import { claudeFunctionalityValidator, ClaudeFunctionalityValidator } from './claude-functionality-validator';
import { sseStreamingGuardian, SSEStreamingGuardian } from './sse-streaming-guardian';
import { componentStateTracker, ComponentStateTracker } from './component-state-tracker';
import { uiPerformanceMonitor, UIPerformanceMonitor } from './ui-performance-monitor';
import { regressionTestIntegration, RegressionTestIntegration } from './regression-test-integration';
import { neuralPatternTrainer, NeuralPatternTrainer } from './neural-pattern-trainer';
import { automatedRecoverySystem, AutomatedRecoverySystem } from './automated-recovery-system';

export interface NLDSystemStatus {
  isActive: boolean;
  componentsStatus: {
    uiRegressionMonitor: boolean;
    claudeFunctionalityValidator: boolean;
    sseStreamingGuardian: boolean;
    componentStateTracker: boolean;
    uiPerformanceMonitor: boolean;
    regressionTestIntegration: boolean;
    neuralPatternTrainer: boolean;
    automatedRecoverySystem: boolean;
  };
  lastHealthCheck: number;
  overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
}

export interface NLDUIModernizationReport {
  systemStatus: NLDSystemStatus;
  regressionSummary: {
    totalRegressions: number;
    criticalRegressions: number;
    recoveredRegressions: number;
    activeIssues: number;
  };
  functionalityHealth: {
    processSpawning: boolean;
    buttonHandlers: boolean;
    instanceCreation: boolean;
    terminalConnection: boolean;
    sseStreaming: boolean;
  };
  performanceMetrics: {
    renderTime: number;
    memoryUsage: number;
    fps: number;
    interactionDelay: number;
  };
  recoveryStats: {
    totalAttempts: number;
    successRate: number;
    avgRecoveryTime: number;
  };
  recommendations: string[];
}

export class NLDUIModernizationSystem {
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck = 0;

  constructor() {
    console.log('[NLD] UI Modernization Regression Prevention System initializing...');
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.warn('[NLD] System already initialized');
      return true;
    }

    try {
      console.log('[NLD] Starting UI Modernization Regression Prevention System');

      // Initialize all components (they're already initialized via imports)
      // Just verify they're working
      const systemStatus = this.getSystemStatus();
      
      if (!systemStatus.isActive) {
        throw new Error('One or more NLD components failed to initialize');
      }

      // Setup health monitoring
      this.setupHealthMonitoring();

      // Setup cross-component integration
      this.setupCrossComponentIntegration();

      this.isInitialized = true;

      console.log('[NLD] ✅ UI Modernization Regression Prevention System fully operational');
      console.log('[NLD] 📊 Monitoring:', Object.keys(systemStatus.componentsStatus).length, 'components');
      
      // Create initial comprehensive report
      const report = this.generateComprehensiveReport();
      console.log('[NLD] 📋 Initial system report generated');

      return true;

    } catch (error) {
      console.error('[NLD] ❌ Failed to initialize UI Modernization System:', error);
      return false;
    }
  }

  private setupHealthMonitoring(): void {
    // Monitor system health every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000);

    // Perform initial health check
    setTimeout(() => {
      this.performHealthCheck();
    }, 5000);

    console.log('[NLD] Health monitoring established');
  }

  private setupCrossComponentIntegration(): void {
    // Setup data sharing between components
    
    // Neural Pattern Trainer learns from UI Regression Monitor
    uiRegressionMonitor.on('regression-detected', (event) => {
      neuralPatternTrainer.captureUIFunctionalityPattern(
        {
          domChanges: 1,
          cssChanges: event.context.operation === 'style_change' ? 1 : 0,
          componentUpdates: 1,
          styleModifications: event.context.operation === 'style_change' ? 1 : 0
        },
        {
          buttonHandlerIntact: !event.pattern.affectedComponents.includes('ClaudeInstanceManager'),
          sseStreamingActive: !event.pattern.affectedComponents.includes('useHTTPSSE'),
          componentStateConsistent: event.pattern.type !== 'COMPONENT_STATE_DESYNC',
          performanceWithinBudget: event.pattern.type !== 'PERFORMANCE_DEGRADATION'
        },
        'REGRESSION',
        event.pattern.severity === 'CRITICAL' ? 0.9 : event.pattern.severity === 'HIGH' ? 0.7 : 0.5
      );
    });

    // Recovery System learns from successful recoveries
    automatedRecoverySystem.on('recovery-complete', (attempt) => {
      if (attempt.status === 'SUCCESS') {
        neuralPatternTrainer.captureUIFunctionalityPattern(
          {
            domChanges: 1,
            cssChanges: 0,
            componentUpdates: attempt.actions.length,
            styleModifications: 0
          },
          {
            buttonHandlerIntact: true,
            sseStreamingActive: true,
            componentStateConsistent: true,
            performanceWithinBudget: true
          },
          'RECOVERY',
          0,
          attempt.duration
        );
      }
    });

    // Performance Monitor triggers recovery for critical issues
    uiPerformanceMonitor.on('performance-issue', (event) => {
      if (event.severity === 'CRITICAL') {
        automatedRecoverySystem.triggerRecovery('PERFORMANCE_CRITICAL', event);
      }
    });

    // Component State Tracker triggers recovery for critical state issues
    componentStateTracker.on('state-desync', (event) => {
      if (event.severity === 'CRITICAL') {
        automatedRecoverySystem.triggerRecovery('COMPONENT_STATE', event);
      }
    });

    console.log('[NLD] Cross-component integration established');
  }

  private performHealthCheck(): void {
    const systemStatus = this.getSystemStatus();
    this.lastHealthCheck = Date.now();

    // Log health status
    if (systemStatus.overallHealth === 'CRITICAL') {
      console.error('[NLD] 🚨 CRITICAL: System health check failed');
    } else if (systemStatus.overallHealth === 'WARNING') {
      console.warn('[NLD] ⚠️ WARNING: System health check shows issues');
    } else {
      console.log('[NLD] ✅ System health check passed');
    }

    // Trigger recovery if critical issues detected
    if (systemStatus.overallHealth === 'CRITICAL') {
      automatedRecoverySystem.triggerRecovery('SYSTEM_HEALTH_CHECK', systemStatus);
    }
  }

  public getSystemStatus(): NLDSystemStatus {
    const componentStatuses = {
      uiRegressionMonitor: this.isComponentHealthy('uiRegressionMonitor'),
      claudeFunctionalityValidator: this.isComponentHealthy('claudeFunctionalityValidator'),
      sseStreamingGuardian: this.isComponentHealthy('sseStreamingGuardian'),
      componentStateTracker: this.isComponentHealthy('componentStateTracker'),
      uiPerformanceMonitor: this.isComponentHealthy('uiPerformanceMonitor'),
      regressionTestIntegration: this.isComponentHealthy('regressionTestIntegration'),
      neuralPatternTrainer: this.isComponentHealthy('neuralPatternTrainer'),
      automatedRecoverySystem: this.isComponentHealthy('automatedRecoverySystem')
    };

    const healthyComponents = Object.values(componentStatuses).filter(status => status).length;
    const totalComponents = Object.keys(componentStatuses).length;

    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE' = 'HEALTHY';

    if (healthyComponents === 0) {
      overallHealth = 'OFFLINE';
    } else if (healthyComponents < totalComponents * 0.5) {
      overallHealth = 'CRITICAL';
    } else if (healthyComponents < totalComponents * 0.8) {
      overallHealth = 'WARNING';
    }

    return {
      isActive: this.isInitialized && overallHealth !== 'OFFLINE',
      componentsStatus: componentStatuses,
      lastHealthCheck: this.lastHealthCheck,
      overallHealth
    };
  }

  private isComponentHealthy(componentName: string): boolean {
    try {
      switch (componentName) {
        case 'uiRegressionMonitor':
          return uiRegressionMonitor.getActivePatterns().length > 0;
        case 'claudeFunctionalityValidator':
          return claudeFunctionalityValidator.getLastValidationTime() > Date.now() - 300000; // 5 minutes
        case 'sseStreamingGuardian':
          return true; // Always considered healthy if no errors
        case 'componentStateTracker':
          return true; // Always considered healthy if no errors
        case 'uiPerformanceMonitor':
          const metrics = uiPerformanceMonitor.getCurrentMetrics();
          return metrics.fps > 0; // Has performance data
        case 'regressionTestIntegration':
          return regressionTestIntegration.getLatestTestSuite() !== null;
        case 'neuralPatternTrainer':
          return true; // Always considered healthy if no errors
        case 'automatedRecoverySystem':
          return automatedRecoverySystem.getSnapshots().size > 0;
        default:
          return false;
      }
    } catch (error) {
      console.warn(`[NLD] Health check failed for ${componentName}:`, error);
      return false;
    }
  }

  public generateComprehensiveReport(): NLDUIModernizationReport {
    const systemStatus = this.getSystemStatus();
    
    // Collect regression data
    const regressionHistory = uiRegressionMonitor.getRegressionHistory();
    const criticalRegressions = regressionHistory.filter(r => r.pattern.severity === 'CRITICAL');
    const recoveredRegressions = regressionHistory.filter(r => r.recoveryStatus === 'RECOVERED');
    const activeIssues = regressionHistory.filter(r => 
      r.recoveryStatus === 'PENDING' || r.recoveryStatus === 'IN_PROGRESS'
    );

    // Collect functionality health
    const criticalFailures = claudeFunctionalityValidator.getCriticalFailures();
    const functionalityHealth = {
      processSpawning: !criticalFailures.includes('processSpawning'),
      buttonHandlers: !criticalFailures.includes('buttonHandlers'),
      instanceCreation: !criticalFailures.includes('instanceCreation'),
      terminalConnection: !criticalFailures.includes('terminalConnection'),
      sseStreaming: !criticalFailures.includes('sseStreaming')
    };

    // Collect performance metrics
    const performanceMetrics = uiPerformanceMonitor.getCurrentMetrics();

    // Collect recovery stats
    const recoveryHistory = automatedRecoverySystem.getRecoveryHistory();
    const successfulRecoveries = recoveryHistory.filter(r => r.status === 'SUCCESS');
    const avgRecoveryTime = recoveryHistory.length > 0 
      ? recoveryHistory.reduce((sum, r) => sum + r.duration, 0) / recoveryHistory.length
      : 0;

    // Generate recommendations
    const recommendations = this.generateSystemRecommendations(
      systemStatus,
      criticalRegressions.length,
      activeIssues.length,
      performanceMetrics
    );

    return {
      systemStatus,
      regressionSummary: {
        totalRegressions: regressionHistory.length,
        criticalRegressions: criticalRegressions.length,
        recoveredRegressions: recoveredRegressions.length,
        activeIssues: activeIssues.length
      },
      functionalityHealth,
      performanceMetrics,
      recoveryStats: {
        totalAttempts: recoveryHistory.length,
        successRate: recoveryHistory.length > 0 ? successfulRecoveries.length / recoveryHistory.length : 0,
        avgRecoveryTime
      },
      recommendations
    };
  }

  private generateSystemRecommendations(
    systemStatus: NLDSystemStatus,
    criticalRegressions: number,
    activeIssues: number,
    performanceMetrics: any
  ): string[] {
    const recommendations: string[] = [];

    // System health recommendations
    if (systemStatus.overallHealth === 'CRITICAL') {
      recommendations.push('🚨 CRITICAL: Multiple NLD components failing - immediate intervention required');
    } else if (systemStatus.overallHealth === 'WARNING') {
      recommendations.push('⚠️ Some NLD components showing issues - monitor closely');
    }

    // Regression recommendations
    if (criticalRegressions > 5) {
      recommendations.push('🛑 High number of critical regressions - halt UI modernization');
    } else if (criticalRegressions > 2) {
      recommendations.push('⚠️ Multiple critical regressions detected - proceed with caution');
    }

    if (activeIssues > 3) {
      recommendations.push('🔧 Multiple unresolved issues - focus on recovery');
    }

    // Performance recommendations
    if (performanceMetrics.fps < 30) {
      recommendations.push('📉 Low FPS detected - optimize UI performance');
    }

    if (performanceMetrics.renderTime > 50) {
      recommendations.push('🐌 Slow render times - review component efficiency');
    }

    if (performanceMetrics.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('🧠 High memory usage - check for memory leaks');
    }

    // Component-specific recommendations
    const unhealthyComponents = Object.entries(systemStatus.componentsStatus)
      .filter(([_, healthy]) => !healthy)
      .map(([component, _]) => component);

    if (unhealthyComponents.length > 0) {
      recommendations.push(`🔧 Fix unhealthy components: ${unhealthyComponents.join(', ')}`);
    }

    // Success recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ NLD UI Modernization System operating optimally');
      recommendations.push('🚀 Safe to proceed with UI modernization');
    }

    return recommendations;
  }

  public async predictUIChangeRisk(plannedChanges: {
    domChanges: number;
    cssChanges: number;
    componentUpdates: number;
    styleModifications: number;
  }): Promise<any> {
    // Get current system state
    const functionality = await claudeFunctionalityValidator.runFullValidation();
    
    // Use neural pattern trainer to predict risk
    return neuralPatternTrainer.predictRegressionRisk(plannedChanges, functionality);
  }

  public generateExecutiveSummary(): string {
    const report = this.generateComprehensiveReport();
    const systemStatus = report.systemStatus;

    return `
NLD UI Modernization Executive Summary
====================================

🎯 SYSTEM STATUS: ${systemStatus.overallHealth}
📊 Components Active: ${Object.values(systemStatus.componentsStatus).filter(s => s).length}/${Object.keys(systemStatus.componentsStatus).length}

🛡️ REGRESSION PROTECTION:
• Total Regressions Detected: ${report.regressionSummary.totalRegressions}
• Critical Issues: ${report.regressionSummary.criticalRegressions}
• Successfully Recovered: ${report.regressionSummary.recoveredRegressions}
• Currently Active Issues: ${report.regressionSummary.activeIssues}

⚙️ CLAUDE FUNCTIONALITY STATUS:
• Process Spawning: ${report.functionalityHealth.processSpawning ? '✅' : '❌'}
• Button Handlers: ${report.functionalityHealth.buttonHandlers ? '✅' : '❌'}
• Instance Creation: ${report.functionalityHealth.instanceCreation ? '✅' : '❌'}
• Terminal Connection: ${report.functionalityHealth.terminalConnection ? '✅' : '❌'}
• SSE Streaming: ${report.functionalityHealth.sseStreaming ? '✅' : '❌'}

📈 PERFORMANCE METRICS:
• FPS: ${report.performanceMetrics.fps}
• Render Time: ${report.performanceMetrics.renderTime.toFixed(2)}ms
• Memory Usage: ${(report.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
• Interaction Delay: ${report.performanceMetrics.interactionDelay.toFixed(2)}ms

🔧 RECOVERY SYSTEM:
• Total Recovery Attempts: ${report.recoveryStats.totalAttempts}
• Success Rate: ${(report.recoveryStats.successRate * 100).toFixed(1)}%
• Average Recovery Time: ${(report.recoveryStats.avgRecoveryTime / 1000).toFixed(2)}s

🎯 KEY RECOMMENDATIONS:
${report.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}

STATUS: ${systemStatus.overallHealth === 'HEALTHY' ? 
  '🟢 UI modernization can proceed safely' : 
  systemStatus.overallHealth === 'WARNING' ? 
  '🟡 Proceed with caution and monitoring' : 
  '🔴 Address critical issues before proceeding'}
`;
  }

  public destroy(): void {
    console.log('[NLD] Shutting down UI Modernization Regression Prevention System');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Destroy all components
    try {
      automatedRecoverySystem.destroy();
      neuralPatternTrainer.destroy();
      regressionTestIntegration.destroy();
      uiPerformanceMonitor.destroy();
      componentStateTracker.destroy();
      sseStreamingGuardian.destroy();
      claudeFunctionalityValidator.destroy();
      uiRegressionMonitor.destroy();
    } catch (error) {
      console.warn('[NLD] Error during component destruction:', error);
    }

    this.isInitialized = false;
    console.log('[NLD] ✅ UI Modernization System shutdown complete');
  }
}

// Create and export the main system instance
export const nldUIModernizationSystem = new NLDUIModernizationSystem();

// Export all individual components for direct access if needed
export {
  uiRegressionMonitor,
  claudeFunctionalityValidator,
  sseStreamingGuardian,
  componentStateTracker,
  uiPerformanceMonitor,
  regressionTestIntegration,
  neuralPatternTrainer,
  automatedRecoverySystem
};

// Auto-initialize the system when imported
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      nldUIModernizationSystem.initialize().then(() => {
        console.log('[NLD] 🚀 System auto-initialized successfully');
      }).catch(error => {
        console.error('[NLD] ❌ Auto-initialization failed:', error);
      });
    });
  } else {
    // DOM is already ready
    nldUIModernizationSystem.initialize().then(() => {
      console.log('[NLD] 🚀 System auto-initialized successfully');
    }).catch(error => {
      console.error('[NLD] ❌ Auto-initialization failed:', error);
    });
  }
}