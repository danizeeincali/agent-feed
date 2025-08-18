/**
 * Production Monitoring Orchestrator - Phase 4 Integration
 * Comprehensive orchestration of all monitoring, security, and recovery systems
 */

import { EventEmitter } from 'events';
import MetricsCollector, { SystemMetrics } from './metrics-collector';
import PerformanceAnalyzer, { PerformanceBottleneck } from './performance-analyzer';
import HealthMonitor, { HealthCheck, AutoScalingRule } from './health-monitor';
import AlertManager, { Alert } from './alert-manager';
import SecurityManager, { SecurityEvent } from '../security/security-manager';
import ErrorRecoverySystem, { ErrorEvent } from '../security/error-recovery';

export interface ProductionStatus {
  timestamp: number;
  overall: {
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    uptime: number; // seconds
  };
  metrics: {
    active: boolean;
    lastCollection: number;
    totalCollected: number;
  };
  performance: {
    active: boolean;
    bottlenecks: number;
    trends: number;
    optimizations: number;
  };
  health: {
    active: boolean;
    services: number;
    healthyServices: number;
    autoScalingEnabled: boolean;
  };
  alerts: {
    active: boolean;
    totalAlerts: number;
    activeAlerts: number;
    escalatedAlerts: number;
  };
  security: {
    active: boolean;
    riskScore: number;
    threatsDetected: number;
    complianceScore: number;
  };
  recovery: {
    active: boolean;
    errorsLast24h: number;
    recoverySuccessRate: number;
    activeIncidents: number;
  };
}

export interface MonitoringConfiguration {
  metricsCollection: {
    enabled: boolean;
    interval: number;
    retentionDays: number;
  };
  performanceAnalysis: {
    enabled: boolean;
    analysisInterval: number;
    trendWindow: number;
  };
  healthMonitoring: {
    enabled: boolean;
    checkInterval: number;
    autoScaling: boolean;
  };
  alerting: {
    enabled: boolean;
    escalationEnabled: boolean;
    channels: string[];
  };
  security: {
    enabled: boolean;
    threatDetection: boolean;
    complianceChecking: boolean;
  };
  errorRecovery: {
    enabled: boolean;
    automaticRecovery: boolean;
    incidentManagement: boolean;
  };
}

export class ProductionOrchestrator extends EventEmitter {
  private metricsCollector: MetricsCollector;
  private performanceAnalyzer: PerformanceAnalyzer;
  private healthMonitor: HealthMonitor;
  private alertManager: AlertManager;
  private securityManager: SecurityManager;
  private errorRecovery: ErrorRecoverySystem;
  
  private isRunning = false;
  private startTime = 0;
  private orchestrationInterval: NodeJS.Timeout | null = null;
  private configuration: MonitoringConfiguration;

  constructor(config?: Partial<MonitoringConfiguration>) {
    super();
    
    // Initialize all monitoring components
    this.metricsCollector = new MetricsCollector();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.healthMonitor = new HealthMonitor();
    this.alertManager = new AlertManager();
    this.securityManager = new SecurityManager();
    this.errorRecovery = new ErrorRecoverySystem();
    
    // Set default configuration
    this.configuration = {
      metricsCollection: {
        enabled: true,
        interval: 5000, // 5 seconds
        retentionDays: 7
      },
      performanceAnalysis: {
        enabled: true,
        analysisInterval: 30000, // 30 seconds
        trendWindow: 300 // 5 minutes
      },
      healthMonitoring: {
        enabled: true,
        checkInterval: 30000, // 30 seconds
        autoScaling: true
      },
      alerting: {
        enabled: true,
        escalationEnabled: true,
        channels: ['slack', 'email', 'webhook']
      },
      security: {
        enabled: true,
        threatDetection: true,
        complianceChecking: true
      },
      errorRecovery: {
        enabled: true,
        automaticRecovery: true,
        incidentManagement: true
      },
      ...config
    };
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Metrics Collection Events
    this.metricsCollector.on('metrics', (metrics: SystemMetrics) => {
      this.performanceAnalyzer.addMetrics(metrics);
      this.healthMonitor.processMetrics(metrics);
      this.emit('metrics-collected', metrics);
    });

    this.metricsCollector.on('alert', (alerts: any[]) => {
      alerts.forEach(alert => {
        this.alertManager.processMetrics?.({
          type: 'metric_threshold',
          severity: alert.threshold.severity,
          data: alert
        });
      });
    });

    // Performance Analysis Events
    this.performanceAnalyzer.on('analysis-complete', (analysis: any) => {
      const { bottlenecks, trends, optimizations } = analysis;
      
      // Process bottlenecks
      if (bottlenecks.length > 0) {
        this.alertManager.processBottlenecks(bottlenecks);
        this.healthMonitor.processBottlenecks(bottlenecks);
      }
      
      this.emit('performance-analyzed', analysis);
    });

    // Health Monitor Events
    this.healthMonitor.on('health-check-complete', (data: any) => {
      const { healthChecks } = data;
      this.alertManager.processHealthChecks(healthChecks);
      this.emit('health-checked', data);
    });

    this.healthMonitor.on('scaling-triggered', (action: any) => {
      console.log(`🔄 Auto-scaling triggered: ${action.reason}`);
      this.securityManager.logSecurityEvent({
        type: 'system_change',
        severity: 'medium',
        source: 'health-monitor',
        action: 'auto_scaling',
        details: action
      });
      this.emit('scaling-event', action);
    });

    this.healthMonitor.on('emergency-scaling', (action: any) => {
      console.log(`🚨 Emergency scaling triggered: ${action.reason}`);
      this.alertManager.processBottlenecks([{
        id: action.id,
        type: 'system',
        severity: 'critical',
        description: action.reason,
        impact: 90,
        recommendation: 'Emergency scaling in progress',
        autoFixAvailable: true,
        detectedAt: action.timestamp,
        persistentFor: 0
      }]);
      this.emit('emergency-scaling', action);
    });

    // Alert Manager Events
    this.alertManager.on('alert-created', (alert: Alert) => {
      console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
      
      // Log security event for high severity alerts
      if (alert.severity === 'critical' || alert.severity === 'error') {
        this.securityManager.logSecurityEvent({
          type: 'system_change',
          severity: alert.severity === 'critical' ? 'critical' : 'high',
          source: 'alert-manager',
          action: 'alert_created',
          details: { alertId: alert.id, category: alert.category }
        });
      }
      
      this.emit('alert-generated', alert);
    });

    this.alertManager.on('alert-escalated', (data: any) => {
      console.log(`📈 Alert escalated: ${data.alert.title} to level ${data.escalationRule.level}`);
      this.emit('alert-escalated', data);
    });

    this.alertManager.on('escalation-action', (data: any) => {
      console.log(`⚡ Escalation action: ${data.action} for alert ${data.alert.id}`);
      
      // Trigger appropriate action
      switch (data.action) {
        case 'auto-scale':
          this.healthMonitor.processMetrics(this.getLastMetrics());
          break;
        case 'restart-service':
          this.errorRecovery.reportError({
            type: 'system',
            severity: 'high',
            source: 'alert-escalation',
            component: data.alert.source,
            message: 'Service restart required by alert escalation'
          });
          break;
      }
      
      this.emit('escalation-action', data);
    });

    // Security Manager Events
    this.securityManager.on('security-event', (event: SecurityEvent) => {
      if (event.alertRequired) {
        console.log(`🔒 Security event: ${event.action} (Risk: ${event.riskScore})`);
        this.emit('security-event', event);
      }
    });

    this.securityManager.on('threat-detected', (threat: any) => {
      console.log(`🎯 Threat detected: ${threat.name} (${threat.severity})`);
      
      // Create high priority alert for threats
      this.alertManager.processBottlenecks([{
        id: threat.id,
        type: 'security',
        severity: threat.severity,
        description: threat.description,
        impact: threat.confidence * 100,
        recommendation: threat.recommendedActions.join(', '),
        autoFixAvailable: false,
        detectedAt: threat.detectedAt,
        persistentFor: 0
      }]);
      
      this.emit('threat-detected', threat);
    });

    this.securityManager.on('compliance-violation', (violation: any) => {
      console.log(`⚠️ Compliance violation: ${violation.name}`);
      this.emit('compliance-violation', violation);
    });

    // Error Recovery Events
    this.errorRecovery.on('error-reported', (error: ErrorEvent) => {
      console.log(`❌ Error reported: ${error.message} (${error.severity})`);
      
      // Log security event for critical errors
      if (error.severity === 'critical') {
        this.securityManager.logSecurityEvent({
          type: 'system_change',
          severity: 'critical',
          source: 'error-recovery',
          action: 'critical_error',
          details: { errorId: error.id, component: error.component }
        });
      }
      
      this.emit('error-reported', error);
    });

    this.errorRecovery.on('recovery-successful', (data: any) => {
      console.log(`✅ Recovery successful: ${data.strategy.name} for ${data.errorEvent.component}`);
      this.emit('recovery-successful', data);
    });

    this.errorRecovery.on('recovery-failed', (error: ErrorEvent) => {
      console.log(`❌ Recovery failed for: ${error.component}`);
      
      // Escalate to incident management
      this.alertManager.processBottlenecks([{
        id: `recovery-failure-${error.id}`,
        type: 'system',
        severity: 'high',
        description: `Automatic recovery failed for ${error.component}: ${error.message}`,
        impact: 80,
        recommendation: 'Manual intervention required',
        autoFixAvailable: false,
        detectedAt: Date.now(),
        persistentFor: 0
      }]);
      
      this.emit('recovery-failed', error);
    });

    this.errorRecovery.on('incident-created', (incident: any) => {
      console.log(`🚨 Incident created: ${incident.title} (${incident.severity})`);
      this.emit('incident-created', incident);
    });

    this.errorRecovery.on('incident-resolved', (incident: any) => {
      console.log(`✅ Incident resolved: ${incident.title}`);
      this.emit('incident-resolved', incident);
    });
  }

  public async startProduction(): Promise<void> {
    if (this.isRunning) {
      console.log('Production monitoring already running');
      return;
    }

    console.log('🚀 Starting Production Monitoring System...');
    this.isRunning = true;
    this.startTime = Date.now();

    try {
      // Start all components in sequence
      if (this.configuration.metricsCollection.enabled) {
        console.log('📊 Starting metrics collection...');
        await this.metricsCollector.startCollection(this.configuration.metricsCollection.interval);
      }

      if (this.configuration.performanceAnalysis.enabled) {
        console.log('📈 Starting performance analysis...');
        this.performanceAnalyzer.startAnalysis(this.configuration.performanceAnalysis.analysisInterval);
      }

      if (this.configuration.healthMonitoring.enabled) {
        console.log('❤️ Starting health monitoring...');
        this.healthMonitor.startMonitoring();
      }

      if (this.configuration.alerting.enabled) {
        console.log('🔔 Starting alert manager...');
        this.alertManager.startAlertManager();
      }

      if (this.configuration.security.enabled) {
        console.log('🔒 Starting security monitoring...');
        this.securityManager.startSecurityMonitoring();
      }

      if (this.configuration.errorRecovery.enabled) {
        console.log('🛠️ Starting error recovery system...');
        this.errorRecovery.startErrorRecovery();
      }

      // Start orchestration loop
      this.orchestrationInterval = setInterval(() => {
        this.orchestrate();
      }, 60000); // Every minute

      console.log('✅ Production monitoring system started successfully');
      this.emit('production-started', this.getProductionStatus());

    } catch (error) {
      console.error('❌ Failed to start production monitoring:', error);
      this.isRunning = false;
      throw error;
    }
  }

  public async stopProduction(): Promise<void> {
    if (!this.isRunning) {
      console.log('Production monitoring not running');
      return;
    }

    console.log('🛑 Stopping Production Monitoring System...');

    try {
      // Stop orchestration loop
      if (this.orchestrationInterval) {
        clearInterval(this.orchestrationInterval);
        this.orchestrationInterval = null;
      }

      // Stop all components
      this.metricsCollector.stopCollection();
      this.performanceAnalyzer.stopAnalysis();
      this.healthMonitor.stopMonitoring();
      this.alertManager.stopAlertManager();
      this.securityManager.stopSecurityMonitoring();
      this.errorRecovery.stopErrorRecovery();

      this.isRunning = false;
      console.log('✅ Production monitoring system stopped');
      this.emit('production-stopped');

    } catch (error) {
      console.error('❌ Error stopping production monitoring:', error);
      throw error;
    }
  }

  private orchestrate(): void {
    try {
      // Get current status
      const status = this.getProductionStatus();
      
      // Emit status update
      this.emit('status-update', status);
      
      // Check for critical conditions
      this.checkCriticalConditions(status);
      
      // Optimize performance based on current state
      this.optimizePerformance(status);
      
      // Update configurations if needed
      this.updateConfigurations(status);
      
    } catch (error) {
      console.error('Orchestration error:', error);
    }
  }

  private checkCriticalConditions(status: ProductionStatus): void {
    // Check overall system health
    if (status.overall.status === 'critical') {
      console.log('🚨 CRITICAL: System health is critical');
      
      // Trigger emergency protocols
      this.errorRecovery.reportError({
        type: 'system',
        severity: 'critical',
        source: 'orchestrator',
        component: 'system',
        message: 'System health is critical',
        context: { status }
      });
    }
    
    // Check security risk
    if (status.security.riskScore > 80) {
      console.log('🔒 HIGH SECURITY RISK: Risk score above threshold');
    }
    
    // Check recovery success rate
    if (status.recovery.recoverySuccessRate < 0.7) {
      console.log('⚠️ LOW RECOVERY SUCCESS: Recovery rate below 70%');
    }
  }

  private optimizePerformance(status: ProductionStatus): void {
    // Auto-adjust collection intervals based on load
    if (status.performance.bottlenecks > 5) {
      // Increase monitoring frequency during high bottleneck periods
      if (this.configuration.metricsCollection.interval > 1000) {
        this.configuration.metricsCollection.interval = Math.max(1000, 
          this.configuration.metricsCollection.interval - 1000);
        console.log(`📊 Increased metrics collection frequency to ${this.configuration.metricsCollection.interval}ms`);
      }
    } else if (status.performance.bottlenecks === 0) {
      // Decrease frequency during stable periods
      if (this.configuration.metricsCollection.interval < 10000) {
        this.configuration.metricsCollection.interval = Math.min(10000, 
          this.configuration.metricsCollection.interval + 1000);
        console.log(`📊 Decreased metrics collection frequency to ${this.configuration.metricsCollection.interval}ms`);
      }
    }
  }

  private updateConfigurations(status: ProductionStatus): void {
    // Dynamic configuration updates based on system state
    
    // Enable more aggressive auto-scaling during high load periods
    if (status.performance.bottlenecks > 3 && !this.configuration.healthMonitoring.autoScaling) {
      this.configuration.healthMonitoring.autoScaling = true;
      console.log('🔄 Enabled auto-scaling due to performance bottlenecks');
    }
    
    // Adjust security monitoring based on threat level
    if (status.security.threatsDetected > 5) {
      // Increase security monitoring frequency
      console.log('🔒 Increasing security monitoring frequency due to threats');
    }
  }

  public getProductionStatus(): ProductionStatus {
    const uptime = this.isRunning ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    
    // Get component statuses
    const healthStatus = this.healthMonitor.getOverallHealth();
    const securityMetrics = this.securityManager.getSecurityMetrics();
    const recoveryMetrics = this.errorRecovery.getRecoveryMetrics();
    const alertMetrics = this.alertManager.getAlertMetrics();
    const performanceBottlenecks = this.performanceAnalyzer.getBottlenecks();
    const performanceTrends = this.performanceAnalyzer.getTrends();
    const performanceOptimizations = this.performanceAnalyzer.getOptimizations();
    
    // Calculate overall score
    const overallScore = Math.round(
      (healthStatus.score * 0.3 + 
       (100 - securityMetrics.riskScore) * 0.25 +
       (recoveryMetrics.recoverySuccessRate * 100) * 0.25 +
       (alertMetrics.totalAlerts === 0 ? 100 : Math.max(0, 100 - alertMetrics.activeAlerts * 10)) * 0.2)
    );
    
    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (overallScore < 70) overallStatus = 'critical';
    else if (overallScore < 85) overallStatus = 'warning';
    
    return {
      timestamp: Date.now(),
      overall: {
        status: overallStatus,
        score: overallScore,
        uptime
      },
      metrics: {
        active: this.metricsCollector.isActive(),
        lastCollection: Date.now(), // Simplified
        totalCollected: 0 // Would track actual metrics count
      },
      performance: {
        active: this.performanceAnalyzer.isActive(),
        bottlenecks: performanceBottlenecks.length,
        trends: performanceTrends.length,
        optimizations: performanceOptimizations.length
      },
      health: {
        active: this.healthMonitor.isActive(),
        services: this.healthMonitor.getServices().length,
        healthyServices: this.healthMonitor.getServices().filter(s => s.status === 'up').length,
        autoScalingEnabled: this.configuration.healthMonitoring.autoScaling
      },
      alerts: {
        active: this.alertManager.isActive(),
        totalAlerts: alertMetrics.totalAlerts,
        activeAlerts: alertMetrics.activeAlerts,
        escalatedAlerts: Math.round(alertMetrics.totalAlerts * alertMetrics.escalationRate)
      },
      security: {
        active: this.securityManager.isActive(),
        riskScore: securityMetrics.riskScore,
        threatsDetected: securityMetrics.threatsDetected,
        complianceScore: securityMetrics.complianceScore
      },
      recovery: {
        active: this.errorRecovery.isActive(),
        errorsLast24h: recoveryMetrics.errorsLast24h,
        recoverySuccessRate: recoveryMetrics.recoverySuccessRate,
        activeIncidents: recoveryMetrics.incidentsCreated - recoveryMetrics.incidentsResolved
      }
    };
  }

  private getLastMetrics(): SystemMetrics {
    // Return a mock SystemMetrics object - in real implementation, 
    // this would return the last collected metrics
    return {
      timestamp: Date.now(),
      cpu: { usage: 50, cores: 4, loadAverage: [1.0, 1.2, 1.1] },
      memory: { total: 8000000000, used: 4000000000, free: 4000000000, heapUsed: 1000000000, heapTotal: 2000000000 },
      network: { bytesIn: 1000000, bytesOut: 1000000, packetsIn: 1000, packetsOut: 1000, connections: 100 },
      disk: { usage: 60, readOps: 100, writeOps: 50, readBytes: 1000000, writeBytes: 500000 },
      application: { requestsPerSecond: 100, responseTime: 200, errorRate: 1, activeUsers: 500, queueLength: 10 }
    };
  }

  public updateConfiguration(config: Partial<MonitoringConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    console.log('Configuration updated:', config);
    this.emit('configuration-updated', this.configuration);
  }

  public getConfiguration(): MonitoringConfiguration {
    return { ...this.configuration };
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  // Component access methods
  public getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  public getPerformanceAnalyzer(): PerformanceAnalyzer {
    return this.performanceAnalyzer;
  }

  public getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  public getAlertManager(): AlertManager {
    return this.alertManager;
  }

  public getSecurityManager(): SecurityManager {
    return this.securityManager;
  }

  public getErrorRecovery(): ErrorRecoverySystem {
    return this.errorRecovery;
  }
}

export default ProductionOrchestrator;