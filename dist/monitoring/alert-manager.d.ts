/**
 * Advanced Alert Manager with Multi-channel Notifications
 * Real-time alerting, escalation, and notification management
 */
import { EventEmitter } from 'events';
import { PerformanceBottleneck } from './performance-analyzer';
import { HealthCheck } from './health-monitor';
export interface Alert {
    id: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    category: 'performance' | 'health' | 'security' | 'system' | 'application';
    timestamp: number;
    source: string;
    status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
    acknowledgedBy?: string;
    acknowledgedAt?: number;
    resolvedAt?: number;
    metadata: Record<string, any>;
    escalationLevel: number;
    lastNotified: number;
    notificationChannels: string[];
}
export interface AlertRule {
    id: string;
    name: string;
    condition: string;
    severity: Alert['severity'];
    category: Alert['category'];
    enabled: boolean;
    suppressionTime: number;
    escalationRules: EscalationRule[];
    notificationChannels: string[];
    metadata: Record<string, any>;
}
export interface EscalationRule {
    level: number;
    delayMinutes: number;
    channels: string[];
    recipients: string[];
    action?: 'auto-scale' | 'restart-service' | 'rollback' | 'failover';
}
export interface NotificationChannel {
    id: string;
    name: string;
    type: 'email' | 'slack' | 'webhook' | 'sms' | 'teams' | 'pagerduty';
    config: Record<string, any>;
    enabled: boolean;
    rateLimits: {
        maxPerHour: number;
        maxPerDay: number;
        currentHour: number;
        currentDay: number;
        lastReset: number;
    };
}
export interface AlertMetrics {
    totalAlerts: number;
    activeAlerts: number;
    alertsByCategory: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    averageResolutionTime: number;
    escalationRate: number;
    falsePositiveRate: number;
}
export declare class AlertManager extends EventEmitter {
    private alerts;
    private alertRules;
    private notificationChannels;
    private suppressedAlerts;
    private escalationInterval;
    private isRunning;
    private readonly escalationCheckInterval;
    constructor();
    private setupDefaultAlertRules;
    private setupDefaultNotificationChannels;
    startAlertManager(): void;
    stopAlertManager(): void;
    processBottlenecks(bottlenecks: PerformanceBottleneck[]): void;
    processHealthChecks(healthChecks: HealthCheck[]): void;
    private createAlertFromBottleneck;
    private createAlertFromHealthCheck;
    private mapBottleneckSeverityToAlertSeverity;
    private getChannelsForSeverity;
    private processAlert;
    private shouldSuppressAlert;
    private sendNotifications;
    private getAlertRule;
    private checkRateLimit;
    private updateRateLimit;
    private sendNotificationToChannel;
    private formatNotificationMessage;
    private sendSlackNotification;
    private sendEmailNotification;
    private sendWebhookNotification;
    private sendPagerDutyNotification;
    private sendSMSNotification;
    private checkEscalations;
    private escalateAlert;
    private executeEscalationAction;
    acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean;
    resolveAlert(alertId: string): boolean;
    suppressAlert(alertId: string): boolean;
    getActiveAlerts(): Alert[];
    getAlertsByCategory(category: string): Alert[];
    getAlertsBySeverity(severity: string): Alert[];
    getAlertMetrics(): AlertMetrics;
    isActive(): boolean;
    addNotificationChannel(channel: NotificationChannel): void;
    removeNotificationChannel(channelId: string): boolean;
    addAlertRule(rule: AlertRule): void;
    removeAlertRule(ruleId: string): boolean;
    private getColorForSeverity;
}
export default AlertManager;
//# sourceMappingURL=alert-manager.d.ts.map