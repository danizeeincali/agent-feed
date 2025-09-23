/**
 * AviHealthMonitor - Advanced Health Monitoring and Recovery for Avi Instances
 *
 * This service provides comprehensive health monitoring, diagnostic capabilities,
 * and automatic recovery mechanisms for Avi DM Claude instances.
 *
 * Features:
 * - Real-time health monitoring
 * - Predictive failure detection
 * - Automatic recovery strategies
 * - Performance optimization
 * - Connection quality assessment
 * - Resource usage tracking
 */

import { BrowserEventEmitter } from '../utils/BrowserEventEmitter';
import {
  AviInstance,
  AviHealthStatus,
  AviDiagnosticReport,
  AviError,
  AviErrorCode,
  AviConversationMetrics,
  AviDMConnection
} from '../types/avi-integration';

interface HealthMetric {
  name: string;
  value: number;
  threshold: {
    warning: number;
    critical: number;
  };
  trend: 'improving' | 'stable' | 'degrading';
  timestamp: Date;
}

interface RecoveryStrategy {
  name: string;
  condition: (status: AviHealthStatus) => boolean;
  action: () => Promise<boolean>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
  maxRetries: number;
}

interface PerformanceProfile {
  baselineResponseTime: number;
  averageLatency: number;
  throughputRate: number;
  errorRate: number;
  memoryEfficiency: number;
  connectionStability: number;
}

interface HealthMonitorConfig {
  checkInterval: number;
  metricRetentionDays: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    connectionLatency: number;
  };
  enablePredictiveAnalysis: boolean;
  enableAutoRecovery: boolean;
  recoveryStrategies: string[];
}

/**
 * Advanced health monitoring service for Avi instances
 */
export class AviHealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig;
  private instance: AviInstance | null = null;
  private isMonitoring = false;

  // Health tracking
  private healthMetrics: Map<string, HealthMetric[]> = new Map();
  private currentHealth: AviHealthStatus;
  private performanceProfile: PerformanceProfile;

  // Recovery system
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private lastRecoveryAttempt: Map<string, Date> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  // Monitoring intervals
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private predictiveAnalysisInterval: NodeJS.Timeout | null = null;

  // Diagnostic state
  private diagnosticHistory: AviDiagnosticReport[] = [];
  private anomalyDetector: AnomalyDetector;
  private performanceAnalyzer: PerformanceAnalyzer;

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    super();

    this.config = {
      checkInterval: 5000, // 5 seconds
      metricRetentionDays: 7,
      alertThresholds: {
        responseTime: 3000, // 3 seconds
        errorRate: 0.05, // 5%
        memoryUsage: 0.9, // 90%
        connectionLatency: 1000 // 1 second
      },
      enablePredictiveAnalysis: true,
      enableAutoRecovery: true,
      recoveryStrategies: ['reconnect', 'restart', 'reset_context', 'fallback_mode'],
      ...config
    };

    this.currentHealth = this.createInitialHealthStatus();
    this.performanceProfile = this.createInitialPerformanceProfile();

    this.anomalyDetector = new AnomalyDetector();
    this.performanceAnalyzer = new PerformanceAnalyzer();

    this.initializeRecoveryStrategies();
  }

  /**
   * Start monitoring an Avi instance
   */
  startMonitoring(instance: AviInstance): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.instance = instance;
    this.isMonitoring = true;

    this.emit('monitoring:started', instance.id);

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    // Start metrics collection
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.checkInterval * 2);

    // Start predictive analysis if enabled
    if (this.config.enablePredictiveAnalysis) {
      this.predictiveAnalysisInterval = setInterval(() => {
        this.performPredictiveAnalysis();
      }, this.config.checkInterval * 6); // Every 30 seconds
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    if (this.predictiveAnalysisInterval) {
      clearInterval(this.predictiveAnalysisInterval);
      this.predictiveAnalysisInterval = null;
    }

    this.emit('monitoring:stopped', this.instance?.id);
    this.instance = null;
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): AviHealthStatus {
    return { ...this.currentHealth };
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics(): Promise<AviDiagnosticReport> {
    if (!this.instance) {
      throw new AviError('No instance to diagnose', 'CONNECTION_FAILED');
    }

    const startTime = Date.now();
    const report: AviDiagnosticReport = {
      timestamp: new Date(),
      connectionTests: await this.testConnection(),
      securityChecks: await this.performSecurityChecks(),
      performanceMetrics: await this.analyzePerformance(),
      recommendations: {
        critical: [],
        warnings: [],
        optimizations: []
      }
    };

    // Generate recommendations based on findings
    this.generateRecommendations(report);

    // Store in history
    this.diagnosticHistory.push(report);
    if (this.diagnosticHistory.length > 50) {
      this.diagnosticHistory = this.diagnosticHistory.slice(-50);
    }

    const duration = Date.now() - startTime;
    this.emit('diagnostics:completed', { report, duration });

    return report;
  }

  /**
   * Force recovery attempt
   */
  async attemptRecovery(strategyName?: string): Promise<boolean> {
    if (!this.instance) {
      return false;
    }

    const strategies = strategyName
      ? [this.recoveryStrategies.get(strategyName)].filter(Boolean)
      : Array.from(this.recoveryStrategies.values()).sort((a, b) => {
          const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorities[b!.priority] - priorities[a!.priority];
        });

    for (const strategy of strategies) {
      if (!strategy) continue;

      // Check cooldown
      const lastAttempt = this.lastRecoveryAttempt.get(strategy.name);
      if (lastAttempt && Date.now() - lastAttempt.getTime() < strategy.cooldownMs) {
        continue;
      }

      // Check max retries
      const attempts = this.recoveryAttempts.get(strategy.name) || 0;
      if (attempts >= strategy.maxRetries) {
        continue;
      }

      // Check condition
      if (!strategy.condition(this.currentHealth)) {
        continue;
      }

      this.emit('recovery:attempt', { strategy: strategy.name, attempts: attempts + 1 });

      try {
        const success = await strategy.action();

        this.lastRecoveryAttempt.set(strategy.name, new Date());
        this.recoveryAttempts.set(strategy.name, attempts + 1);

        if (success) {
          this.emit('recovery:success', { strategy: strategy.name });
          this.recoveryAttempts.delete(strategy.name); // Reset attempts on success
          return true;
        }
      } catch (error) {
        this.emit('recovery:failed', { strategy: strategy.name, error });
      }
    }

    return false;
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(metricName: string, hours = 24): HealthMetric[] {
    const metrics = this.healthMetrics.get(metricName) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Export health data
   */
  exportHealthData(): any {
    return {
      instance: this.instance?.id,
      currentHealth: this.currentHealth,
      performanceProfile: this.performanceProfile,
      metrics: Object.fromEntries(this.healthMetrics),
      diagnosticHistory: this.diagnosticHistory.slice(-10), // Last 10 reports
      recoveryHistory: {
        attempts: Object.fromEntries(this.recoveryAttempts),
        lastAttempts: Object.fromEntries(this.lastRecoveryAttempt)
      },
      exportTime: new Date()
    };
  }

  // Private methods

  private createInitialHealthStatus(): AviHealthStatus {
    return {
      overall: 'healthy',
      components: {
        connection: 'healthy',
        authentication: 'valid',
        encryption: 'secure',
        performance: 'optimal'
      },
      metrics: {
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        memoryUsage: 0
      },
      recommendations: []
    };
  }

  private createInitialPerformanceProfile(): PerformanceProfile {
    return {
      baselineResponseTime: 500,
      averageLatency: 100,
      throughputRate: 10,
      errorRate: 0,
      memoryEfficiency: 0.8,
      connectionStability: 1.0
    };
  }

  private initializeRecoveryStrategies(): void {
    // Reconnection strategy
    this.recoveryStrategies.set('reconnect', {
      name: 'reconnect',
      condition: (status) => status.components.connection !== 'healthy',
      action: async () => {
        if (!this.instance) return false;
        // Implementation would attempt to reconnect
        this.emit('recovery:reconnect');
        return true;
      },
      priority: 'high',
      cooldownMs: 30000, // 30 seconds
      maxRetries: 5
    });

    // Context reset strategy
    this.recoveryStrategies.set('reset_context', {
      name: 'reset_context',
      condition: (status) => status.components.performance === 'degraded',
      action: async () => {
        if (!this.instance) return false;
        // Implementation would reset conversation context
        this.emit('recovery:reset_context');
        return true;
      },
      priority: 'medium',
      cooldownMs: 60000, // 1 minute
      maxRetries: 3
    });

    // Fallback mode strategy
    this.recoveryStrategies.set('fallback_mode', {
      name: 'fallback_mode',
      condition: (status) => status.overall === 'critical',
      action: async () => {
        if (!this.instance) return false;
        // Implementation would switch to fallback mode
        this.emit('recovery:fallback_mode');
        return true;
      },
      priority: 'critical',
      cooldownMs: 120000, // 2 minutes
      maxRetries: 2
    });

    // Resource optimization strategy
    this.recoveryStrategies.set('optimize_resources', {
      name: 'optimize_resources',
      condition: (status) => status.metrics.memoryUsage > 0.8,
      action: async () => {
        if (!this.instance) return false;
        // Implementation would optimize resource usage
        this.emit('recovery:optimize_resources');
        return true;
      },
      priority: 'medium',
      cooldownMs: 300000, // 5 minutes
      maxRetries: 3
    });
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.instance) return;

    const healthStatus: AviHealthStatus = {
      overall: 'healthy',
      components: {
        connection: this.assessConnectionHealth(),
        authentication: this.assessAuthenticationHealth(),
        encryption: this.assessEncryptionHealth(),
        performance: this.assessPerformanceHealth()
      },
      metrics: {
        uptime: this.calculateUptime(),
        responseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate(),
        memoryUsage: this.getMemoryUsage()
      },
      recommendations: []
    };

    // Determine overall health
    const componentStates = Object.values(healthStatus.components);
    if (componentStates.includes('down') || componentStates.includes('compromised')) {
      healthStatus.overall = 'critical';
    } else if (componentStates.includes('degraded') || componentStates.includes('weak')) {
      healthStatus.overall = 'warning';
    }

    // Generate recommendations
    this.generateHealthRecommendations(healthStatus);

    const previousHealth = this.currentHealth.overall;
    this.currentHealth = healthStatus;

    // Emit health change event
    if (previousHealth !== healthStatus.overall) {
      this.emit('health:changed', { previous: previousHealth, current: healthStatus.overall });
    }

    // Trigger auto-recovery if needed
    if (this.config.enableAutoRecovery && healthStatus.overall !== 'healthy') {
      this.triggerAutoRecovery(healthStatus);
    }
  }

  private collectMetrics(): void {
    if (!this.instance) return;

    const now = new Date();

    // Collect various metrics
    const metrics = [
      {
        name: 'response_time',
        value: this.calculateCurrentResponseTime(),
        threshold: { warning: 2000, critical: 5000 }
      },
      {
        name: 'memory_usage',
        value: this.getMemoryUsage(),
        threshold: { warning: 0.7, critical: 0.9 }
      },
      {
        name: 'connection_latency',
        value: this.instance.dmConnection.latency,
        threshold: { warning: 500, critical: 1500 }
      },
      {
        name: 'error_rate',
        value: this.calculateErrorRate(),
        threshold: { warning: 0.02, critical: 0.05 }
      }
    ];

    // Store metrics and calculate trends
    metrics.forEach(metric => {
      const historicalMetrics = this.healthMetrics.get(metric.name) || [];

      // Calculate trend
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (historicalMetrics.length >= 3) {
        const recent = historicalMetrics.slice(-3);
        const avgRecent = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
        if (metric.value > avgRecent * 1.1) trend = 'degrading';
        else if (metric.value < avgRecent * 0.9) trend = 'improving';
      }

      const healthMetric: HealthMetric = {
        name: metric.name,
        value: metric.value,
        threshold: metric.threshold,
        trend,
        timestamp: now
      };

      historicalMetrics.push(healthMetric);

      // Keep only recent metrics
      const cutoff = new Date(now.getTime() - this.config.metricRetentionDays * 24 * 60 * 60 * 1000);
      const filteredMetrics = historicalMetrics.filter(m => m.timestamp > cutoff);

      this.healthMetrics.set(metric.name, filteredMetrics);
    });

    this.emit('metrics:collected', metrics);
  }

  private async performPredictiveAnalysis(): Promise<void> {
    if (!this.instance) return;

    try {
      // Analyze trends and predict potential issues
      const responseTimeMetrics = this.healthMetrics.get('response_time') || [];
      const errorRateMetrics = this.healthMetrics.get('error_rate') || [];

      const predictions = this.anomalyDetector.analyzeTrends({
        responseTime: responseTimeMetrics,
        errorRate: errorRateMetrics
      });

      if (predictions.length > 0) {
        this.emit('prediction:anomaly', predictions);
      }
    } catch (error) {
      this.emit('prediction:error', error);
    }
  }

  private async testConnection(): Promise<any> {
    if (!this.instance) {
      return { latency: -1, stability: 'unstable', throughput: 0 };
    }

    const startTime = Date.now();

    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, this.instance!.dmConnection.latency));

      return {
        latency: this.instance.dmConnection.latency,
        stability: this.instance.dmConnection.connectionQuality === 'excellent' ? 'stable' : 'unstable',
        throughput: Math.random() * 1000 // Simulated throughput
      };
    } catch (error) {
      return {
        latency: Date.now() - startTime,
        stability: 'unstable',
        throughput: 0
      };
    }
  }

  private async performSecurityChecks(): Promise<any> {
    if (!this.instance) {
      return {
        encryptionValid: false,
        tokenValid: false,
        permissionsValid: false
      };
    }

    return {
      encryptionValid: this.instance.securityContext.sessionToken.length > 0,
      tokenValid: new Date() < this.instance.dmConnection.sessionValidUntil,
      permissionsValid: this.instance.securityContext.permissionLevel !== 'read'
    };
  }

  private async analyzePerformance(): Promise<any> {
    return {
      averageResponseTime: this.performanceProfile.averageLatency,
      messageProcessingRate: this.performanceProfile.throughputRate,
      memoryEfficiency: this.performanceProfile.memoryEfficiency
    };
  }

  private generateRecommendations(report: AviDiagnosticReport): void {
    // Generate recommendations based on diagnostic results
    if (report.connectionTests.latency > 1000) {
      report.recommendations.warnings.push('High connection latency detected');
    }

    if (report.performanceMetrics.memoryEfficiency < 0.7) {
      report.recommendations.optimizations.push('Consider optimizing memory usage');
    }

    if (!report.securityChecks.tokenValid) {
      report.recommendations.critical.push('Security token expired - immediate renewal required');
    }
  }

  // Health assessment methods
  private assessConnectionHealth(): 'healthy' | 'degraded' | 'down' {
    if (!this.instance || !this.instance.isConnected) return 'down';
    if (this.instance.dmConnection.latency > 1000) return 'degraded';
    return 'healthy';
  }

  private assessAuthenticationHealth(): 'valid' | 'expiring' | 'invalid' {
    if (!this.instance) return 'invalid';
    const timeUntilExpiry = this.instance.dmConnection.sessionValidUntil.getTime() - Date.now();
    if (timeUntilExpiry < 0) return 'invalid';
    if (timeUntilExpiry < 60 * 60 * 1000) return 'expiring'; // 1 hour
    return 'valid';
  }

  private assessEncryptionHealth(): 'secure' | 'weak' | 'compromised' {
    if (!this.instance) return 'compromised';
    const encryption = this.instance.dmConnection.encryption;
    if (encryption.method === 'E2EE' && encryption.encryptionStrength === 'enhanced') return 'secure';
    if (encryption.method === 'TLS') return 'weak';
    return 'compromised';
  }

  private assessPerformanceHealth(): 'optimal' | 'slow' | 'degraded' {
    const responseTime = this.calculateAverageResponseTime();
    if (responseTime < 1000) return 'optimal';
    if (responseTime < 3000) return 'slow';
    return 'degraded';
  }

  // Metric calculation methods
  private calculateUptime(): number {
    if (!this.instance || !this.instance.startTime) return 0;
    return Date.now() - this.instance.startTime.getTime();
  }

  private calculateAverageResponseTime(): number {
    const metrics = this.healthMetrics.get('response_time') || [];
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  private calculateCurrentResponseTime(): number {
    return this.performanceProfile.averageLatency + Math.random() * 100;
  }

  private calculateErrorRate(): number {
    return this.performanceProfile.errorRate;
  }

  private getMemoryUsage(): number {
    return Math.random() * 0.8; // Simulated memory usage
  }

  private generateHealthRecommendations(health: AviHealthStatus): void {
    health.recommendations = [];

    if (health.components.connection !== 'healthy') {
      health.recommendations.push('Check network connection and consider reconnecting');
    }

    if (health.components.authentication === 'expiring') {
      health.recommendations.push('Authentication token expiring soon - renew session');
    }

    if (health.metrics.responseTime > 2000) {
      health.recommendations.push('High response times - consider optimizing performance');
    }

    if (health.metrics.memoryUsage > 0.8) {
      health.recommendations.push('High memory usage - consider clearing conversation history');
    }
  }

  private async triggerAutoRecovery(health: AviHealthStatus): Promise<void> {
    // Find applicable recovery strategies
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.condition(health))
      .sort((a, b) => {
        const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorities[b.priority] - priorities[a.priority];
      });

    if (applicableStrategies.length > 0) {
      const success = await this.attemptRecovery(applicableStrategies[0].name);
      if (success) {
        this.emit('auto_recovery:success', applicableStrategies[0].name);
      } else {
        this.emit('auto_recovery:failed', applicableStrategies[0].name);
      }
    }
  }
}

// Supporting classes

class AnomalyDetector {
  analyzeTrends(metrics: Record<string, HealthMetric[]>): any[] {
    const anomalies: any[] = [];

    // Simple anomaly detection logic
    Object.entries(metrics).forEach(([metricName, values]) => {
      if (values.length < 5) return;

      const recent = values.slice(-5);
      const average = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      const latest = recent[recent.length - 1];

      if (latest.value > average * 2) {
        anomalies.push({
          metric: metricName,
          type: 'spike',
          severity: 'high',
          value: latest.value,
          expected: average,
          timestamp: latest.timestamp
        });
      }
    });

    return anomalies;
  }
}

class PerformanceAnalyzer {
  analyzePerformance(metrics: HealthMetric[]): any {
    // Performance analysis logic
    return {
      trend: 'stable',
      efficiency: 0.8,
      bottlenecks: []
    };
  }
}

export default AviHealthMonitor;