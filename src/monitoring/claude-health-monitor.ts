/**
 * Claude Code Health Monitoring System
 * Monitors health and performance of Claude Code integration
 */

import { EventEmitter } from 'events';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { claudeIntegrationService } from '@/services/claude-integration';
import { logger } from '@/utils/logger';
import { spawn } from 'child_process';

export interface HealthMetrics {
  timestamp: Date;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    orchestrator: ServiceHealth;
    integration_service: ServiceHealth;
    claude_server: ServiceHealth;
    database: ServiceHealth;
    websocket: ServiceHealth;
  };
  performance: {
    response_time_ms: number;
    active_sessions: number;
    active_agents: number;
    completed_tasks: number;
    failed_tasks: number;
    success_rate: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  alerts: HealthAlert[];
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  response_time_ms?: number;
  last_check: Date;
  error_count: number;
  uptime_seconds: number;
  details?: any;
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface HealthConfig {
  check_interval_ms: number;
  alert_thresholds: {
    response_time_ms: number;
    success_rate_percent: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
    error_rate_percent: number;
  };
  retention_days: number;
  enable_auto_recovery: boolean;
}

/**
 * Claude Health Monitor
 * Continuous monitoring and alerting for Claude Code integration
 */
export class ClaudeHealthMonitor extends EventEmitter {
  private config: HealthConfig;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private metrics: HealthMetrics;
  private alerts: Map<string, HealthAlert> = new Map();
  private serviceStartTimes: Map<string, Date> = new Map();
  private errorCounts: Map<string, number> = new Map();

  constructor(config: Partial<HealthConfig> = {}) {
    super();
    
    this.config = {
      check_interval_ms: config.check_interval_ms || 30000, // 30 seconds
      alert_thresholds: {
        response_time_ms: config.alert_thresholds?.response_time_ms || 5000,
        success_rate_percent: config.alert_thresholds?.success_rate_percent || 90,
        memory_usage_mb: config.alert_thresholds?.memory_usage_mb || 1024,
        cpu_usage_percent: config.alert_thresholds?.cpu_usage_percent || 80,
        error_rate_percent: config.alert_thresholds?.error_rate_percent || 5
      },
      retention_days: config.retention_days || 7,
      enable_auto_recovery: config.enable_auto_recovery !== false
    };

    this.metrics = this.createInitialMetrics();
    this.initializeServiceStartTimes();
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Claude health monitor already running');
      return;
    }

    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.check_interval_ms);

    // Perform initial health check
    this.performHealthCheck();

    logger.info('Claude health monitor started');
    this.emit('monitor:started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('Claude health monitor stopped');
    this.emit('monitor:stopped');
  }

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get historical metrics (placeholder for database integration)
   */
  async getHistoricalMetrics(hours: number = 24): Promise<HealthMetrics[]> {
    // In a production system, this would query a time-series database
    // For now, return current metrics
    return [this.metrics];
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check all services
      const serviceChecks = await Promise.allSettled([
        this.checkOrchestratorHealth(),
        this.checkIntegrationServiceHealth(),
        this.checkClaudeServerHealth(),
        this.checkDatabaseHealth(),
        this.checkWebSocketHealth()
      ]);

      // Update service health
      this.metrics.services.orchestrator = serviceChecks[0].status === 'fulfilled' ? serviceChecks[0].value : this.createErrorServiceHealth('orchestrator');
      this.metrics.services.integration_service = serviceChecks[1].status === 'fulfilled' ? serviceChecks[1].value : this.createErrorServiceHealth('integration_service');
      this.metrics.services.claude_server = serviceChecks[2].status === 'fulfilled' ? serviceChecks[2].value : this.createErrorServiceHealth('claude_server');
      this.metrics.services.database = serviceChecks[3].status === 'fulfilled' ? serviceChecks[3].value : this.createErrorServiceHealth('database');
      this.metrics.services.websocket = serviceChecks[4].status === 'fulfilled' ? serviceChecks[4].value : this.createErrorServiceHealth('websocket');

      // Update performance metrics
      await this.updatePerformanceMetrics();

      // Update system metrics
      await this.updateSystemMetrics();

      // Determine overall status
      this.updateOverallStatus();

      // Check for alerts
      this.checkAlerts();

      // Update timestamp
      this.metrics.timestamp = new Date();

      const checkDuration = Date.now() - startTime;
      logger.debug(`Health check completed in ${checkDuration}ms`);

      this.emit('health:checked', this.metrics);
    } catch (error) {
      logger.error('Health check failed:', error);
      this.createAlert('system', 'critical', 'Health check system failure', error);
    }
  }

  /**
   * Check orchestrator health
   */
  private async checkOrchestratorHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const metrics = claudeCodeOrchestrator.getMetrics();
      const responseTime = Date.now() - startTime;
      
      return {
        status: metrics.activeSessions >= 0 ? 'up' : 'down',
        response_time_ms: responseTime,
        last_check: new Date(),
        error_count: this.getErrorCount('orchestrator'),
        uptime_seconds: this.getUptime('orchestrator'),
        details: metrics
      };
    } catch (error) {
      this.incrementErrorCount('orchestrator');
      return this.createErrorServiceHealth('orchestrator', error);
    }
  }

  /**
   * Check integration service health
   */
  private async checkIntegrationServiceHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple check - try to access service methods
      const sessions = claudeIntegrationService.getUserSessions('health-check');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        response_time_ms: responseTime,
        last_check: new Date(),
        error_count: this.getErrorCount('integration_service'),
        uptime_seconds: this.getUptime('integration_service'),
        details: { sessions_count: sessions.length }
      };
    } catch (error) {
      this.incrementErrorCount('integration_service');
      return this.createErrorServiceHealth('integration_service', error);
    }
  }

  /**
   * Check Claude server health
   */
  private async checkClaudeServerHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Try to connect to Claude server
      const response = await fetch('http://localhost:8080/health', {
        method: 'GET'
      }).catch(() => null);

      const responseTime = Date.now() - startTime;
      
      if (response && response.ok) {
        return {
          status: 'up',
          response_time_ms: responseTime,
          last_check: new Date(),
          error_count: this.getErrorCount('claude_server'),
          uptime_seconds: this.getUptime('claude_server')
        };
      } else {
        this.incrementErrorCount('claude_server');
        return {
          status: 'down',
          response_time_ms: responseTime,
          last_check: new Date(),
          error_count: this.getErrorCount('claude_server'),
          uptime_seconds: this.getUptime('claude_server')
        };
      }
    } catch (error) {
      this.incrementErrorCount('claude_server');
      return this.createErrorServiceHealth('claude_server', error);
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Try a simple database query
      const { db } = require('@/database/connection');
      await db.query('SELECT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        response_time_ms: responseTime,
        last_check: new Date(),
        error_count: this.getErrorCount('database'),
        uptime_seconds: this.getUptime('database')
      };
    } catch (error) {
      this.incrementErrorCount('database');
      return this.createErrorServiceHealth('database', error);
    }
  }

  /**
   * Check WebSocket health
   */
  private async checkWebSocketHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // For now, assume WebSocket is healthy if the service is running
      // In a production system, you would test actual WebSocket connections
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'up',
        response_time_ms: responseTime,
        last_check: new Date(),
        error_count: this.getErrorCount('websocket'),
        uptime_seconds: this.getUptime('websocket')
      };
    } catch (error) {
      this.incrementErrorCount('websocket');
      return this.createErrorServiceHealth('websocket', error);
    }
  }

  /**
   * Update performance metrics
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      const orchestratorMetrics = claudeCodeOrchestrator.getMetrics();
      
      this.metrics.performance = {
        response_time_ms: orchestratorMetrics.averageResponseTime,
        active_sessions: orchestratorMetrics.activeSessions,
        active_agents: orchestratorMetrics.activeAgents,
        completed_tasks: orchestratorMetrics.completedTasks,
        failed_tasks: orchestratorMetrics.failedTasks,
        success_rate: this.calculateSuccessRate(orchestratorMetrics.completedTasks, orchestratorMetrics.failedTasks),
        memory_usage_mb: orchestratorMetrics.memoryUsage,
        cpu_usage_percent: orchestratorMetrics.systemLoad * 100
      };
    } catch (error) {
      logger.warn('Failed to update performance metrics:', error);
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      this.metrics.performance.memory_usage_mb = memoryUsage.heapUsed / 1024 / 1024;

      // Get CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.metrics.performance.cpu_usage_percent = (cpuUsage.user + cpuUsage.system) / 1000 / 1000 * 100;
    } catch (error) {
      logger.warn('Failed to update system metrics:', error);
    }
  }

  /**
   * Update overall status
   */
  private updateOverallStatus(): void {
    const services = Object.values(this.metrics.services);
    const downServices = services.filter(service => service.status === 'down').length;
    const degradedServices = services.filter(service => service.status === 'degraded').length;

    if (downServices > 0) {
      this.metrics.overall_status = 'unhealthy';
    } else if (degradedServices > 0 || this.metrics.performance.success_rate < this.config.alert_thresholds.success_rate_percent) {
      this.metrics.overall_status = 'degraded';
    } else {
      this.metrics.overall_status = 'healthy';
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(): void {
    // Response time alerts
    if (this.metrics.performance.response_time_ms > this.config.alert_thresholds.response_time_ms) {
      this.createAlert('performance', 'warning', 
        `High response time: ${this.metrics.performance.response_time_ms}ms`);
    }

    // Success rate alerts
    if (this.metrics.performance.success_rate < this.config.alert_thresholds.success_rate_percent) {
      this.createAlert('performance', 'critical', 
        `Low success rate: ${this.metrics.performance.success_rate}%`);
    }

    // Memory usage alerts
    if (this.metrics.performance.memory_usage_mb > this.config.alert_thresholds.memory_usage_mb) {
      this.createAlert('system', 'warning', 
        `High memory usage: ${this.metrics.performance.memory_usage_mb}MB`);
    }

    // CPU usage alerts
    if (this.metrics.performance.cpu_usage_percent > this.config.alert_thresholds.cpu_usage_percent) {
      this.createAlert('system', 'warning', 
        `High CPU usage: ${this.metrics.performance.cpu_usage_percent}%`);
    }

    // Service down alerts
    Object.entries(this.metrics.services).forEach(([serviceName, serviceHealth]) => {
      if (serviceHealth.status === 'down') {
        this.createAlert(serviceName, 'critical', `Service ${serviceName} is down`);
      } else if (serviceHealth.status === 'degraded') {
        this.createAlert(serviceName, 'warning', `Service ${serviceName} is degraded`);
      }
    });
  }

  /**
   * Create an alert
   */
  private createAlert(service: string, severity: 'info' | 'warning' | 'critical', message: string, details?: any): void {
    const alertId = `${service}-${Date.now()}`;
    
    const alert: HealthAlert = {
      id: alertId,
      severity,
      service,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    this.metrics.alerts.push(alert);

    logger.warn(`Health alert [${severity}]: ${message}`, details);
    this.emit('alert:created', alert);

    // Auto-recovery attempt for critical alerts
    if (severity === 'critical' && this.config.enable_auto_recovery) {
      this.attemptAutoRecovery(service, alert);
    }
  }

  /**
   * Attempt auto-recovery for critical issues
   */
  private async attemptAutoRecovery(service: string, alert: HealthAlert): Promise<void> {
    try {
      logger.info(`Attempting auto-recovery for service: ${service}`);
      
      switch (service) {
        case 'claude_server':
          // Try to restart Claude server
          await this.restartClaudeServer();
          break;
        case 'orchestrator':
          // Try to reinitialize orchestrator
          await this.reinitializeOrchestrator();
          break;
        default:
          logger.info(`No auto-recovery available for service: ${service}`);
      }
    } catch (error) {
      logger.error(`Auto-recovery failed for service ${service}:`, error);
    }
  }

  /**
   * Restart Claude server
   */
  private async restartClaudeServer(): Promise<void> {
    // This would need to be implemented based on your deployment strategy
    logger.info('Auto-restart of Claude server not implemented');
  }

  /**
   * Reinitialize orchestrator
   */
  private async reinitializeOrchestrator(): Promise<void> {
    try {
      await claudeCodeOrchestrator.initialize();
      logger.info('Orchestrator reinitialized successfully');
    } catch (error) {
      logger.error('Failed to reinitialize orchestrator:', error);
    }
  }

  /**
   * Helper methods
   */
  private createInitialMetrics(): HealthMetrics {
    return {
      timestamp: new Date(),
      overall_status: 'healthy',
      services: {
        orchestrator: this.createInitialServiceHealth(),
        integration_service: this.createInitialServiceHealth(),
        claude_server: this.createInitialServiceHealth(),
        database: this.createInitialServiceHealth(),
        websocket: this.createInitialServiceHealth()
      },
      performance: {
        response_time_ms: 0,
        active_sessions: 0,
        active_agents: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        success_rate: 100,
        memory_usage_mb: 0,
        cpu_usage_percent: 0
      },
      alerts: []
    };
  }

  private createInitialServiceHealth(): ServiceHealth {
    return {
      status: 'up',
      last_check: new Date(),
      error_count: 0,
      uptime_seconds: 0
    };
  }

  private createErrorServiceHealth(service: string, error?: any): ServiceHealth {
    return {
      status: 'down',
      last_check: new Date(),
      error_count: this.getErrorCount(service),
      uptime_seconds: this.getUptime(service),
      details: error ? { error: error.message } : undefined
    };
  }

  private initializeServiceStartTimes(): void {
    const now = new Date();
    ['orchestrator', 'integration_service', 'claude_server', 'database', 'websocket'].forEach(service => {
      this.serviceStartTimes.set(service, now);
      this.errorCounts.set(service, 0);
    });
  }

  private getErrorCount(service: string): number {
    return this.errorCounts.get(service) || 0;
  }

  private incrementErrorCount(service: string): void {
    const current = this.errorCounts.get(service) || 0;
    this.errorCounts.set(service, current + 1);
  }

  private getUptime(service: string): number {
    const startTime = this.serviceStartTimes.get(service);
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime.getTime()) / 1000);
  }

  private calculateSuccessRate(completed: number, failed: number): number {
    const total = completed + failed;
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }
}

// Create and export health monitor instance
export const claudeHealthMonitor = new ClaudeHealthMonitor({
  check_interval_ms: parseInt(process.env.CLAUDE_HEALTH_CHECK_INTERVAL || '30000'),
  alert_thresholds: {
    response_time_ms: parseInt(process.env.CLAUDE_RESPONSE_TIME_THRESHOLD || '5000'),
    success_rate_percent: parseInt(process.env.CLAUDE_SUCCESS_RATE_THRESHOLD || '90'),
    memory_usage_mb: parseInt(process.env.CLAUDE_MEMORY_THRESHOLD || '1024'),
    cpu_usage_percent: parseInt(process.env.CLAUDE_CPU_THRESHOLD || '80'),
    error_rate_percent: parseInt(process.env.CLAUDE_ERROR_RATE_THRESHOLD || '5')
  },
  enable_auto_recovery: process.env.CLAUDE_AUTO_RECOVERY !== 'false'
});