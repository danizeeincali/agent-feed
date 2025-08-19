/**
 * Comprehensive Health Monitor with Auto-scaling Integration
 * System health tracking, service monitoring, and automatic scaling triggers
 */
import { EventEmitter } from 'events';
import { SystemMetrics } from './metrics-collector';
import { PerformanceBottleneck } from './performance-analyzer';
export interface HealthCheck {
    id: string;
    name: string;
    type: 'system' | 'service' | 'database' | 'external' | 'custom';
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastChecked: number;
    responseTime: number;
    message: string;
    details?: Record<string, any>;
}
export interface ServiceHealth {
    serviceName: string;
    status: 'up' | 'down' | 'degraded';
    uptime: number;
    lastFailure?: number;
    failureCount: number;
    healthScore: number;
    dependencies: string[];
    endpoints: Array<{
        url: string;
        method: string;
        status: number;
        responseTime: number;
    }>;
}
export interface AutoScalingRule {
    id: string;
    name: string;
    metric: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'gte' | 'lte';
    action: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
    cooldown: number;
    enabled: boolean;
    lastTriggered?: number;
    parameters: {
        minInstances: number;
        maxInstances: number;
        scaleIncrement: number;
        targetValue?: number;
    };
}
export interface ScalingAction {
    id: string;
    ruleId: string;
    action: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
    reason: string;
    timestamp: number;
    currentInstances: number;
    targetInstances: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
}
export declare class HealthMonitor extends EventEmitter {
    private healthChecks;
    private services;
    private scalingRules;
    private scalingActions;
    private monitoringInterval;
    private isMonitoring;
    private currentInstances;
    private readonly checkInterval;
    constructor();
    private setupDefaultHealthChecks;
    private setupDefaultScalingRules;
    startMonitoring(): void;
    stopMonitoring(): void;
    performHealthChecks(): Promise<void>;
    private performSingleHealthCheck;
    private performSystemCheck;
    private performServiceCheck;
    private performDatabaseCheck;
    private performExternalCheck;
    private updateServiceHealth;
    private calculateHealthScore;
    processMetrics(metrics: SystemMetrics): void;
    processBottlenecks(bottlenecks: PerformanceBottleneck[]): void;
    private evaluateScalingRules;
    private extractMetricValue;
    private evaluateRuleCondition;
    private triggerScalingAction;
    private triggerEmergencyScaling;
    private executeScalingAction;
    addHealthCheck(check: HealthCheck): void;
    removeHealthCheck(id: string): boolean;
    addScalingRule(rule: AutoScalingRule): void;
    removeScalingRule(id: string): boolean;
    enableScalingRule(id: string): boolean;
    disableScalingRule(id: string): boolean;
    getHealthChecks(): HealthCheck[];
    getServices(): ServiceHealth[];
    getScalingRules(): AutoScalingRule[];
    getScalingActions(): ScalingAction[];
    getCurrentInstances(): number;
    isActive(): boolean;
    getOverallHealth(): {
        status: 'healthy' | 'warning' | 'critical';
        score: number;
        summary: string;
    };
}
export default HealthMonitor;
//# sourceMappingURL=health-monitor.d.ts.map