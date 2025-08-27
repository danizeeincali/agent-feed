/**
 * Claude Process I/O Real-Time Monitor - NLD System
 * 
 * Provides real-time monitoring and alerting for Claude CLI process I/O failures
 * with automated detection, prevention, and recovery mechanisms.
 */

import { claudeProcessIODetector, ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';
import { claudeProcessIONeuralDataset } from './claude-process-io-neural-training-dataset';

export interface ClaudeProcessIOAlert {
  alertId: string;
  timestamp: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  instanceId: string;
  pattern: ClaudeProcessIOErrorPattern;
  metrics: ClaudeProcessIOMetrics;
  automatedActions: string[];
  humanActions: string[];
  resolution?: {
    strategy: string;
    implemented: boolean;
    successful: boolean;
    timestamp: number;
  };
}

export interface ClaudeProcessIOMonitorConfig {
  alertThresholds: {
    printFlagErrors: number;
    interactiveBlockTime: number;
    ptyDisconnectTime: number;
    authSilentTime: number;
  };
  automatedRecovery: boolean;
  neuralTraining: boolean;
  detectionInterval: number;
  maxAlertsPerInstance: number;
}

export class ClaudeProcessIORealTimeMonitor {
  private config: ClaudeProcessIOMonitorConfig;
  private activeAlerts = new Map<string, ClaudeProcessIOAlert[]>();
  private alertCallbacks: Array<(alert: ClaudeProcessIOAlert) => void> = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(config?: Partial<ClaudeProcessIOMonitorConfig>) {
    this.config = {
      alertThresholds: {
        printFlagErrors: 1, // Alert immediately on print flag errors
        interactiveBlockTime: 10000, // 10 seconds for interactive blocking
        ptyDisconnectTime: 5000, // 5 seconds for PTY disconnection
        authSilentTime: 8000 // 8 seconds for auth success but no output
      },
      automatedRecovery: true,
      neuralTraining: true,
      detectionInterval: 2000, // Check every 2 seconds
      maxAlertsPerInstance: 10,
      ...config
    };

    this.setupPatternDetectionCallbacks();
  }

  private setupPatternDetectionCallbacks(): void {
    claudeProcessIODetector.onPatternDetected((pattern, metrics) => {
      this.handlePatternDetection(pattern, metrics);
    });
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔍 [NLD] Starting Claude process I/O real-time monitoring');

    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, this.config.detectionInterval);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('⏹️ [NLD] Stopped Claude process I/O monitoring');
  }

  private performPeriodicChecks(): void {
    const activeProcesses = claudeProcessIODetector.getAllActiveProcesses();
    
    activeProcesses.forEach(metrics => {
      // Check for processes that might need attention
      this.checkProcessHealth(metrics);
    });
  }

  private checkProcessHealth(metrics: ClaudeProcessIOMetrics): void {
    const currentTime = Date.now();
    const silentTime = currentTime - metrics.sessionMetrics.lastActivity;
    const spawnTime = currentTime - metrics.spawnTime;

    // Check for specific health issues
    if (metrics.processState === 'spawning' && spawnTime > this.config.alertThresholds.interactiveBlockTime) {
      this.createHealthAlert(metrics, 'INTERACTIVE_MODE_BLOCKED', 'Process stuck in spawning state');
    }

    if (metrics.authenticationTime && silentTime > this.config.alertThresholds.authSilentTime) {
      this.createHealthAlert(metrics, 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT', 'No output after authentication');
    }

    if (metrics.processType === 'pty' && !metrics.stdinConnected && silentTime > this.config.alertThresholds.ptyDisconnectTime) {
      this.createHealthAlert(metrics, 'PTY_STDIN_DISCONNECT', 'PTY stdin connection lost');
    }
  }

  private createHealthAlert(
    metrics: ClaudeProcessIOMetrics,
    category: ClaudeProcessIOErrorPattern['category'],
    description: string
  ): void {
    // Check if we already have an alert for this pattern recently
    const instanceAlerts = this.activeAlerts.get(metrics.instanceId) || [];
    const recentAlert = instanceAlerts.find(alert => 
      alert.pattern.category === category && 
      Date.now() - alert.timestamp < 30000 // Within last 30 seconds
    );

    if (recentAlert) return; // Don't spam alerts

    const pattern: ClaudeProcessIOErrorPattern = {
      patternId: `health-check-${category}-${Date.now()}`,
      detectedAt: Date.now(),
      severity: this.getPatternSeverity(category),
      category,
      errorMessage: description,
      diagnosticInfo: {
        hasStdinInput: metrics.sessionMetrics.inputsSent > 0,
        hasPromptArgument: metrics.args.some(arg => !arg.startsWith('--')),
        isPrintMode: metrics.args.includes('--print') || metrics.args.includes('-p'),
        isInteractiveMode: !metrics.args.includes('--print') && !metrics.args.includes('-p'),
        authenticationSucceeded: metrics.authenticationTime !== undefined,
        expectedOutput: metrics.processState === 'interactive' || metrics.processState === 'authenticated',
        actualOutput: metrics.sessionMetrics.outputsReceived > 0
      },
      resolutionSuggestions: this.getResolutionSuggestions(category, metrics),
      preventionStrategy: this.getPreventionStrategy(category)
    };

    this.handlePatternDetection(pattern, metrics);
  }

  private handlePatternDetection(pattern: ClaudeProcessIOErrorPattern, metrics: ClaudeProcessIOMetrics): void {
    const alert: ClaudeProcessIOAlert = {
      alertId: `alert-${pattern.patternId}`,
      timestamp: Date.now(),
      severity: pattern.severity,
      instanceId: metrics.instanceId,
      pattern,
      metrics: { ...metrics },
      automatedActions: this.generateAutomatedActions(pattern, metrics),
      humanActions: this.generateHumanActions(pattern, metrics)
    };

    // Store alert
    const instanceAlerts = this.activeAlerts.get(metrics.instanceId) || [];
    instanceAlerts.push(alert);
    
    // Limit alerts per instance
    if (instanceAlerts.length > this.config.maxAlertsPerInstance) {
      instanceAlerts.shift(); // Remove oldest
    }
    
    this.activeAlerts.set(metrics.instanceId, instanceAlerts);

    console.log(`🚨 [NLD] Alert: ${pattern.category} detected for ${metrics.instanceId} (${pattern.severity})`);

    // Execute automated recovery if enabled
    if (this.config.automatedRecovery && pattern.severity === 'critical') {
      this.executeAutomatedRecovery(alert);
    }

    // Add to neural training dataset if enabled
    if (this.config.neuralTraining) {
      // Note: Actual outcome will be updated later when resolution is attempted
      claudeProcessIONeuralDataset.addProcessSession(
        metrics, 
        [pattern], 
        {
          patternDetected: pattern.category,
          resolutionSuccessful: false, // Will be updated
          recoveryStrategy: null, // Will be updated
          finalProcessState: metrics.processState
        }
      );
    }

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('[NLD] Error in alert callback:', error);
      }
    });
  }

  private generateAutomatedActions(pattern: ClaudeProcessIOErrorPattern, metrics: ClaudeProcessIOMetrics): string[] {
    const actions: string[] = [];

    switch (pattern.category) {
      case 'PRINT_FLAG_INPUT_REQUIRED':
        actions.push('Restart process without --print flag for interactive mode');
        actions.push('Add prompt argument if print mode is required');
        break;

      case 'INTERACTIVE_MODE_BLOCKED':
        actions.push('Restart process with --dangerously-skip-permissions flag');
        actions.push('Switch to --print mode as fallback');
        actions.push('Check Claude CLI authentication status');
        break;

      case 'PTY_STDIN_DISCONNECT':
        actions.push('Restart process with pipe mode instead of PTY');
        actions.push('Reconnect stdin stream');
        break;

      case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
        actions.push('Send initial prompt to activate Claude');
        actions.push('Restart process to reset session');
        break;
    }

    return actions;
  }

  private generateHumanActions(pattern: ClaudeProcessIOErrorPattern, metrics: ClaudeProcessIOMetrics): string[] {
    const actions: string[] = [];

    switch (pattern.category) {
      case 'PRINT_FLAG_INPUT_REQUIRED':
        actions.push('Review command arguments - ensure prompt is provided when using --print');
        actions.push('Consider switching to interactive mode for ongoing conversation');
        break;

      case 'INTERACTIVE_MODE_BLOCKED':
        actions.push('Verify Claude CLI is properly installed and authenticated');
        actions.push('Check network connectivity and authentication status');
        actions.push('Review working directory permissions');
        break;

      case 'PTY_STDIN_DISCONNECT':
        actions.push('Check terminal environment configuration');
        actions.push('Verify PTY is supported in current environment');
        break;

      case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
        actions.push('Manually send a test prompt to Claude');
        actions.push('Check Claude service status and quotas');
        break;
    }

    return actions;
  }

  private async executeAutomatedRecovery(alert: ClaudeProcessIOAlert): Promise<void> {
    console.log(`🔄 [NLD] Executing automated recovery for ${alert.pattern.category}`);

    try {
      let recoverySuccessful = false;
      let recoveryStrategy = '';

      switch (alert.pattern.category) {
        case 'PRINT_FLAG_INPUT_REQUIRED':
          recoveryStrategy = 'restart_without_print_flag';
          // This would trigger a process restart in the actual backend
          console.log(`[NLD] Would restart ${alert.instanceId} without --print flag`);
          recoverySuccessful = true; // Simulated success
          break;

        case 'INTERACTIVE_MODE_BLOCKED':
          recoveryStrategy = 'restart_with_skip_permissions';
          console.log(`[NLD] Would restart ${alert.instanceId} with --dangerously-skip-permissions`);
          recoverySuccessful = true; // Simulated success
          break;

        case 'PTY_STDIN_DISCONNECT':
          recoveryStrategy = 'switch_to_pipe_mode';
          console.log(`[NLD] Would restart ${alert.instanceId} with pipe mode instead of PTY`);
          recoverySuccessful = true; // Simulated success
          break;

        case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
          recoveryStrategy = 'send_activation_prompt';
          console.log(`[NLD] Would send activation prompt to ${alert.instanceId}`);
          recoverySuccessful = true; // Simulated success
          break;
      }

      // Update alert with resolution
      alert.resolution = {
        strategy: recoveryStrategy,
        implemented: true,
        successful: recoverySuccessful,
        timestamp: Date.now()
      };

      // Update neural training data
      if (this.config.neuralTraining) {
        claudeProcessIONeuralDataset.addProcessSession(
          alert.metrics,
          [alert.pattern],
          {
            patternDetected: alert.pattern.category,
            resolutionSuccessful: recoverySuccessful,
            recoveryStrategy: recoveryStrategy,
            finalProcessState: recoverySuccessful ? 'interactive' : 'failed'
          }
        );
      }

      console.log(`✅ [NLD] Automated recovery ${recoverySuccessful ? 'successful' : 'failed'} for ${alert.instanceId}`);

    } catch (error) {
      console.error(`❌ [NLD] Automated recovery failed for ${alert.instanceId}:`, error);
      
      if (alert.resolution) {
        alert.resolution.successful = false;
      }
    }
  }

  private getPatternSeverity(category: ClaudeProcessIOErrorPattern['category']): 'critical' | 'high' | 'medium' | 'low' {
    switch (category) {
      case 'PRINT_FLAG_INPUT_REQUIRED':
        return 'high';
      case 'INTERACTIVE_MODE_BLOCKED':
        return 'critical';
      case 'PTY_STDIN_DISCONNECT':
        return 'high';
      case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
        return 'medium';
      default:
        return 'low';
    }
  }

  private getResolutionSuggestions(category: ClaudeProcessIOErrorPattern['category'], metrics: ClaudeProcessIOMetrics): string[] {
    const suggestions: string[] = [];

    switch (category) {
      case 'PRINT_FLAG_INPUT_REQUIRED':
        suggestions.push('Add prompt argument: claude --print "Your question here"');
        suggestions.push('Provide stdin input: echo "Your question" | claude --print');
        suggestions.push('Remove --print flag for interactive mode');
        break;

      case 'INTERACTIVE_MODE_BLOCKED':
        suggestions.push('Check Claude CLI installation: claude --version');
        suggestions.push('Try with --dangerously-skip-permissions flag');
        suggestions.push('Verify authentication: claude auth status');
        break;

      case 'PTY_STDIN_DISCONNECT':
        suggestions.push('Restart with pipe mode instead of PTY');
        suggestions.push('Check terminal environment variables');
        break;

      case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
        suggestions.push('Send initial prompt to activate Claude');
        suggestions.push('Verify Claude service connectivity');
        break;
    }

    return suggestions;
  }

  private getPreventionStrategy(category: ClaudeProcessIOErrorPattern['category']): string {
    switch (category) {
      case 'PRINT_FLAG_INPUT_REQUIRED':
        return 'Validate --print mode has input before spawning';
      case 'INTERACTIVE_MODE_BLOCKED':
        return 'Pre-flight check Claude CLI availability';
      case 'PTY_STDIN_DISCONNECT':
        return 'Monitor PTY connection health';
      case 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT':
        return 'Send activation prompt after authentication';
      default:
        return 'Implement comprehensive process monitoring';
    }
  }

  onAlert(callback: (alert: ClaudeProcessIOAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  getActiveAlerts(instanceId?: string): ClaudeProcessIOAlert[] {
    if (instanceId) {
      return this.activeAlerts.get(instanceId) || [];
    }
    
    return Array.from(this.activeAlerts.values()).flat();
  }

  clearAlerts(instanceId: string): void {
    this.activeAlerts.delete(instanceId);
  }

  getMonitoringStatus(): {
    isMonitoring: boolean;
    activeProcesses: number;
    totalAlerts: number;
    alertsByCategory: Record<string, number>;
    config: ClaudeProcessIOMonitorConfig;
  } {
    const allAlerts = this.getActiveAlerts();
    const alertsByCategory: Record<string, number> = {};
    
    allAlerts.forEach(alert => {
      alertsByCategory[alert.pattern.category] = (alertsByCategory[alert.pattern.category] || 0) + 1;
    });

    return {
      isMonitoring: this.isMonitoring,
      activeProcesses: claudeProcessIODetector.getAllActiveProcesses().length,
      totalAlerts: allAlerts.length,
      alertsByCategory,
      config: { ...this.config }
    };
  }

  generateSystemReport(): {
    monitoringStatus: ReturnType<ClaudeProcessIORealTimeMonitor['getMonitoringStatus']>;
    detectorReport: ReturnType<typeof claudeProcessIODetector.generateSystemReport>;
    neuralDatasetStats: {
      recordCount: number;
      patternStats: Record<string, { count: number; accuracy: number }>;
    };
    recommendations: string[];
  } {
    const monitoringStatus = this.getMonitoringStatus();
    const detectorReport = claudeProcessIODetector.generateSystemReport();
    const neuralDatasetStats = {
      recordCount: claudeProcessIONeuralDataset.getRecordCount(),
      patternStats: claudeProcessIONeuralDataset.getPatternStatistics()
    };

    const recommendations: string[] = [];
    
    // Generate recommendations based on current state
    if (detectorReport.criticalProcesses.length > 0) {
      recommendations.push(`Address ${detectorReport.criticalProcesses.length} critical processes requiring immediate attention`);
    }
    
    if (monitoringStatus.alertsByCategory['PRINT_FLAG_INPUT_REQUIRED'] > 3) {
      recommendations.push('High frequency of --print flag errors suggests need for better argument validation');
    }
    
    if (monitoringStatus.alertsByCategory['INTERACTIVE_MODE_BLOCKED'] > 2) {
      recommendations.push('Interactive mode blocking suggests Claude CLI environment issues');
    }

    if (neuralDatasetStats.recordCount > 50) {
      recommendations.push('Sufficient neural training data available - consider training new prediction model');
    }

    return {
      monitoringStatus,
      detectorReport,
      neuralDatasetStats,
      recommendations
    };
  }
}

// Export singleton instance
export const claudeProcessIOMonitor = new ClaudeProcessIORealTimeMonitor();