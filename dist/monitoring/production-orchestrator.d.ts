/**
 * Production Monitoring Orchestrator - Phase 4 Integration
 * Comprehensive orchestration of all monitoring, security, and recovery systems
 */
import { EventEmitter } from 'events';
import MetricsCollector from './metrics-collector';
import PerformanceAnalyzer from './performance-analyzer';
import HealthMonitor from './health-monitor';
import AlertManager from './alert-manager';
import SecurityManager from '../security/security-manager';
import ErrorRecoverySystem from '../security/error-recovery';
export interface ProductionStatus {
    timestamp: number;
    overall: {
        status: 'healthy' | 'warning' | 'critical';
        score: number;
        uptime: number;
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
export declare class ProductionOrchestrator extends EventEmitter {
    private metricsCollector;
    private performanceAnalyzer;
    private healthMonitor;
    private alertManager;
    private securityManager;
    private errorRecovery;
    private isRunning;
    private startTime;
    private orchestrationInterval;
    private configuration;
    constructor(config?: Partial<MonitoringConfiguration>);
    private setupEventHandlers;
    startProduction(): Promise<void>;
    stopProduction(): Promise<void>;
    private orchestrate;
    private checkCriticalConditions;
    private optimizePerformance;
    private updateConfigurations;
    getProductionStatus(): ProductionStatus;
    private getLastMetrics;
    updateConfiguration(config: Partial<MonitoringConfiguration>): void;
    getConfiguration(): MonitoringConfiguration;
    isActive(): boolean;
    getMetricsCollector(): MetricsCollector;
    getPerformanceAnalyzer(): PerformanceAnalyzer;
    getHealthMonitor(): HealthMonitor;
    getAlertManager(): AlertManager;
    getSecurityManager(): SecurityManager;
    getErrorRecovery(): ErrorRecoverySystem;
}
export default ProductionOrchestrator;
//# sourceMappingURL=production-orchestrator.d.ts.map