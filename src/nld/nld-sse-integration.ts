/**
 * NLD SSE Integration System
 * 
 * Integrates the NLD pattern detection system with the existing SSE implementation
 * Provides validation of the NLD system with current SSE connection state
 * Creates hooks for real-time pattern detection and learning
 */

import { SSEConnectionPatternDetector, SSETriggerCondition } from './sse-connection-pattern-detector';
import { RealTimeSSEFailureMonitor, SSEConnectionMetrics } from './real-time-sse-failure-monitor';
import { SSEAntiPatternsDatabase } from './sse-anti-patterns-database';
import { NeuralTrainingExportSystem } from './neural-training-export-system';
import { TDDSSEPreventionStrategies } from './tdd-sse-prevention-strategies';

interface NLDSSEValidationResult {
  systemStatus: 'healthy' | 'warning' | 'critical';
  detectedPatterns: Array<{
    patternId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: string;
  }>;
  connectionHealth: {
    statusSSE: 'healthy' | 'degraded' | 'failed';
    terminalSSE: 'healthy' | 'degraded' | 'failed';
    coordination: 'synchronized' | 'drift' | 'desynchronized';
  };
  recommendations: {
    immediate: string[];
    preventive: string[];
    tddImplementation: string[];
  };
  neuralInsights: {
    failurePredictions: Array<{
      instanceId: string;
      probability: number;
      failureType: string;
      recommendedActions: string[];
    }>;
  };
  metrics: {
    totalInstances: number;
    activeAlerts: number;
    patternsCaptured: number;
    preventionEffectiveness: number;
  };
}

export class NLDSSEIntegrationSystem {
  private patternDetector: SSEConnectionPatternDetector;
  private failureMonitor: RealTimeSSEFailureMonitor;
  private antiPatternsDB: SSEAntiPatternsDatabase;
  private neuralExportSystem: NeuralTrainingExportSystem;
  private tddStrategies: TDDSSEPreventionStrategies;
  
  private isIntegrated: boolean = false;
  private validationResults: NLDSSEValidationResult | null = null;

  constructor() {
    this.patternDetector = new SSEConnectionPatternDetector();
    this.failureMonitor = new RealTimeSSEFailureMonitor();
    this.antiPatternsDB = new SSEAntiPatternsDatabase();
    this.neuralExportSystem = new NeuralTrainingExportSystem();
    this.tddStrategies = new TDDSSEPreventionStrategies();
    
    this.setupIntegrationHooks();
  }

  /**
   * Initialize the NLD system integration
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing NLD SSE Integration System...');

    // Start pattern detection and monitoring
    this.patternDetector.startMonitoring();
    this.failureMonitor.startMonitoring();
    
    // Load existing patterns for learning
    await this.patternDetector.loadExistingPatterns();
    
    this.isIntegrated = true;
    console.log('✅ NLD SSE Integration System initialized successfully');
    
    // Perform initial validation
    await this.validateWithCurrentState();
  }

  /**
   * Setup integration hooks with existing SSE implementation
   */
  private setupIntegrationHooks(): void {
    // Hook into connection events
    this.failureMonitor.on('failure_alert', (alert) => {
      this.handleFailureAlert(alert);
    });
    
    this.failureMonitor.on('auto_recovery', (recovery) => {
      this.handleAutoRecovery(recovery);
    });
    
    this.failureMonitor.on('alert_resolved', (alert) => {
      this.handleAlertResolved(alert);
    });
  }

  /**
   * Validate NLD system with current SSE connection state
   */
  public async validateWithCurrentState(): Promise<NLDSSEValidationResult> {
    console.log('🔍 Validating NLD system with current SSE connection state...');
    
    if (!this.isIntegrated) {
      await this.initialize();
    }
    
    // Get current connection metrics
    const connectionMetrics = this.failureMonitor.getAllConnectionMetrics();
    const activeAlerts = this.failureMonitor.getActiveAlerts();
    const monitoringReport = this.failureMonitor.generateReport();
    
    // Analyze patterns
    const patternAnalysis = this.patternDetector.analyzePatterns();
    const antiPatternAnalytics = this.antiPatternsDB.getAnalytics();
    
    // Generate validation result
    this.validationResults = {
      systemStatus: this.determineSystemStatus(activeAlerts, connectionMetrics),
      detectedPatterns: this.summarizeDetectedPatterns(),
      connectionHealth: this.assessConnectionHealth(connectionMetrics),
      recommendations: this.generateRecommendations(activeAlerts, patternAnalysis),
      neuralInsights: await this.generateNeuralInsights(connectionMetrics),
      metrics: {
        totalInstances: connectionMetrics.size,
        activeAlerts: activeAlerts.length,
        patternsCaptured: patternAnalysis.totalPatterns,
        preventionEffectiveness: antiPatternAnalytics.avgPreventionEffectiveness
      }
    };
    
    console.log(`📊 Validation complete - System Status: ${this.validationResults.systemStatus}`);
    console.log(`🎯 Captured ${this.validationResults.metrics.patternsCaptured} patterns, ${this.validationResults.metrics.activeAlerts} active alerts`);
    
    return this.validationResults;
  }

  /**
   * Hook for integrating with useHTTPSSE hook
   */
  public createSSEHooks(): {
    onConnectionEvent: (instanceId: string, eventType: string, data?: any) => void;
    onUIStateChange: (instanceId: string, status: string) => void;
    onUserFeedback: (feedback: string, context: any) => void;
  } {
    return {
      onConnectionEvent: (instanceId: string, eventType: string, data?: any) => {
        // Report event to failure monitor
        this.failureMonitor.reportSSEEvent(instanceId, eventType as any, data);
        
        // Detect potential trigger conditions
        const triggerCondition: SSETriggerCondition = {
          type: this.mapEventToTriggerType(eventType),
          data: { eventType, data, instanceId },
          source: 'useHTTPSSE'
        };
        
        if (this.patternDetector.detectTrigger(triggerCondition)) {
          this.handleTriggerDetected(triggerCondition, instanceId);
        }
      },
      
      onUIStateChange: (instanceId: string, status: string) => {
        // Report UI state change
        this.failureMonitor.reportUIState(instanceId, status as any);
      },
      
      onUserFeedback: async (feedback: string, context: any) => {
        // Capture user feedback for pattern learning
        if (this.isFailureFeedback(feedback)) {
          await this.captureUserFailurePattern(feedback, context);
        }
      }
    };
  }

  /**
   * Manual trigger for pattern detection
   */
  public async triggerPatternDetection(
    instanceId: string,
    scenario: string,
    context: any
  ): Promise<void> {
    const triggerCondition: SSETriggerCondition = {
      type: 'manual_trigger',
      data: { scenario, context, instanceId },
      source: 'manual'
    };
    
    if (this.patternDetector.detectTrigger(triggerCondition)) {
      await this.handleTriggerDetected(triggerCondition, instanceId);
    }
  }

  /**
   * Export neural training data
   */
  public async exportNeuralTrainingData(): Promise<string> {
    console.log('🧠 Exporting neural training data...');
    return await this.neuralExportSystem.exportTrainingDataset();
  }

  /**
   * Get TDD implementation guidance
   */
  public getTDDGuidance(): {
    criticalTests: string[];
    implementationChecklist: any;
    mockingUtilities: string;
  } {
    return {
      criticalTests: this.tddStrategies.getTestSuitesByPriority('critical').map(s => s.name),
      implementationChecklist: this.tddStrategies.generateImplementationChecklist(),
      mockingUtilities: this.tddStrategies.generateMockingUtilities()
    };
  }

  /**
   * Get comprehensive system report
   */
  public generateSystemReport(): {
    validation: NLDSSEValidationResult | null;
    antiPatterns: any;
    tddGuidance: any;
    monitoringStats: any;
  } {
    return {
      validation: this.validationResults,
      antiPatterns: this.antiPatternsDB.generateReport(),
      tddGuidance: this.getTDDGuidance(),
      monitoringStats: this.failureMonitor.generateReport()
    };
  }

  // Private helper methods

  private handleFailureAlert(alert: any): void {
    console.log(`🚨 NLD Integration: Handling failure alert ${alert.id}`);
    
    // Trigger pattern capture for this alert
    this.patternDetector.captureFailurePattern(
      {
        type: 'status_connection_zero',
        data: alert,
        source: 'RealTimeSSEFailureMonitor'
      },
      {
        task: `SSE Connection Management for ${alert.instanceId}`,
        expectedBehavior: 'Stable SSE connections with working status updates',
        actualBehavior: alert.description,
        errorMessages: [alert.description]
      },
      alert.metrics,
      alert.metrics.uiState,
      {
        claudeConfidence: 0.9,
        userSuccessRate: 0.1,
        tddUsed: false
      }
    );
  }

  private handleAutoRecovery(recovery: any): void {
    console.log(`🔧 NLD Integration: Auto-recovery triggered for ${recovery.instanceId}`);
    
    // Log recovery attempt for learning
    // This data helps train the neural network on what recovery actions work
  }

  private handleAlertResolved(alert: any): void {
    console.log(`✅ NLD Integration: Alert resolved ${alert.id} in ${alert.resolutionTime}ms`);
    
    // Update pattern learning with resolution data
  }

  private mapEventToTriggerType(eventType: string): SSETriggerCondition['type'] {
    switch (eventType) {
      case 'status_disconnected':
      case 'status_connected':
        return 'status_connection_zero';
      case 'terminal_connected':
        return 'terminal_connection_established';
      default:
        return 'manual_trigger';
    }
  }

  private async handleTriggerDetected(triggerCondition: SSETriggerCondition, instanceId: string): Promise<void> {
    console.log(`🎯 NLD Integration: Trigger detected for ${instanceId}: ${triggerCondition.type}`);
    
    const connectionMetrics = this.failureMonitor.getConnectionMetrics(instanceId);
    if (connectionMetrics) {
      await this.patternDetector.captureFailurePattern(
        triggerCondition,
        {
          task: `SSE Connection Management`,
          expectedBehavior: 'Stable connection coordination',
          actualBehavior: `Trigger: ${triggerCondition.type}`,
          errorMessages: []
        },
        connectionMetrics,
        connectionMetrics.uiState
      );
    }
  }

  private isFailureFeedback(feedback: string): boolean {
    const failureKeywords = ['failed', 'broken', 'stuck', 'not working', 'error'];
    return failureKeywords.some(keyword => feedback.toLowerCase().includes(keyword));
  }

  private async captureUserFailurePattern(feedback: string, context: any): Promise<void> {
    // Capture user-reported failures for learning
    console.log(`👤 NLD Integration: User feedback captured: ${feedback}`);
  }

  private determineSystemStatus(activeAlerts: any[], connectionMetrics: Map<string, SSEConnectionMetrics>): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 2 || activeAlerts.length > 5) return 'warning';
    return 'healthy';
  }

  private summarizeDetectedPatterns(): NLDSSEValidationResult['detectedPatterns'] {
    // Get recent patterns from detector
    const analysis = this.patternDetector.analyzePatterns();
    
    return Object.entries(analysis.failureModes).map(([type, count]) => ({
      patternId: `pattern-${type}`,
      severity: this.mapFailureModeToSeverity(type),
      description: `${count} occurrences of ${type.replace(/_/g, ' ')}`,
      timestamp: new Date().toISOString()
    }));
  }

  private assessConnectionHealth(connectionMetrics: Map<string, SSEConnectionMetrics>): NLDSSEValidationResult['connectionHealth'] {
    let statusHealthy = 0, terminalHealthy = 0, synchronized = 0;
    let total = connectionMetrics.size;
    
    if (total === 0) {
      return { statusSSE: 'healthy', terminalSSE: 'healthy', coordination: 'synchronized' };
    }
    
    for (const metrics of connectionMetrics.values()) {
      if (metrics.statusSSE.connected && metrics.statusSSE.connectionCount > 0) statusHealthy++;
      if (metrics.terminalSSE.connected && metrics.terminalSSE.connectionCount > 0) terminalHealthy++;
      if (metrics.statusSSE.connected === metrics.terminalSSE.connected) synchronized++;
    }
    
    return {
      statusSSE: statusHealthy / total > 0.8 ? 'healthy' : statusHealthy / total > 0.5 ? 'degraded' : 'failed',
      terminalSSE: terminalHealthy / total > 0.8 ? 'healthy' : terminalHealthy / total > 0.5 ? 'degraded' : 'failed',
      coordination: synchronized / total > 0.9 ? 'synchronized' : synchronized / total > 0.7 ? 'drift' : 'desynchronized'
    };
  }

  private generateRecommendations(activeAlerts: any[], patternAnalysis: any): NLDSSEValidationResult['recommendations'] {
    const immediate = [];
    const preventive = [];
    const tddImplementation = [];
    
    // Immediate actions based on active alerts
    if (activeAlerts.some(a => a.type === 'status_broadcast_zero')) {
      immediate.push('Restart status SSE connections for affected instances');
      immediate.push('Verify status broadcasting mechanism is active');
    }
    
    if (activeAlerts.some(a => a.type === 'ui_stuck_starting')) {
      immediate.push('Force status refresh for stuck instances');
      immediate.push('Implement status polling fallback');
    }
    
    // Preventive measures
    preventive.push('Implement connection health monitoring');
    preventive.push('Add connection establishment order validation');
    preventive.push('Create automatic recovery mechanisms');
    
    // TDD implementation
    tddImplementation.push('Implement connection order validation tests');
    tddImplementation.push('Add status update timeout tests');
    tddImplementation.push('Create connection state synchronization tests');
    
    return { immediate, preventive, tddImplementation };
  }

  private async generateNeuralInsights(connectionMetrics: Map<string, SSEConnectionMetrics>): Promise<NLDSSEValidationResult['neuralInsights']> {
    const predictions = [];
    
    for (const [instanceId, metrics] of connectionMetrics.entries()) {
      // Simple heuristic-based predictions (would use actual neural network in production)
      let probability = 0;
      let failureType = 'none';
      
      if (metrics.uiState.status === 'starting' && metrics.uiState.stuckDuration > 10000) {
        probability = 0.8;
        failureType = 'ui_stuck_starting';
      } else if (metrics.statusSSE.connectionCount === 0 && metrics.terminalSSE.connectionCount > 0) {
        probability = 0.9;
        failureType = 'status_broadcast_zero';
      } else if (!metrics.statusSSE.connected && metrics.terminalSSE.connected) {
        probability = 0.7;
        failureType = 'status_sse_missing';
      }
      
      if (probability > 0.5) {
        predictions.push({
          instanceId,
          probability,
          failureType,
          recommendedActions: this.antiPatternsDB.getRecoveryActions(failureType)
        });
      }
    }
    
    return { failurePredictions: predictions };
  }

  private mapFailureModeToSeverity(failureMode: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'status_broadcast_zero': 'critical',
      'status_sse_missing': 'high',
      'ui_stuck_starting': 'high',
      'connection_coordination': 'medium',
      'terminal_input_broken': 'medium'
    };
    
    return severityMap[failureMode] || 'medium';
  }
}

export { NLDSSEValidationResult };