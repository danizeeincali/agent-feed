/**
 * Advanced Error Recovery System with Automated Incident Response
 * Error detection, classification, recovery strategies, and incident management
 */
import { EventEmitter } from 'events';
export interface ErrorEvent {
    id: string;
    timestamp: number;
    type: 'system' | 'application' | 'network' | 'database' | 'security' | 'infrastructure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    component: string;
    message: string;
    stackTrace?: string;
    context: Record<string, any>;
    impact: {
        usersFaced: number;
        servicesAffected: string[];
        dataLoss: boolean;
        securityBreach: boolean;
    };
    status: 'new' | 'investigating' | 'resolved' | 'recurring';
    recoveryAttempts: number;
    autoRecoverable: boolean;
}
export interface RecoveryStrategy {
    id: string;
    name: string;
    errorTypes: string[];
    conditions: string[];
    actions: RecoveryAction[];
    priority: number;
    successRate: number;
    enabled: boolean;
    cooldownPeriod: number;
    maxRetries: number;
    escalationThreshold: number;
}
export interface RecoveryAction {
    type: 'restart_service' | 'scale_resources' | 'failover' | 'rollback' | 'clear_cache' | 'custom_script';
    parameters: Record<string, any>;
    timeout: number;
    retryable: boolean;
    rollbackAction?: RecoveryAction;
}
export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
    priority: number;
    createdAt: number;
    updatedAt: number;
    resolvedAt?: number;
    assignedTo?: string;
    affectedServices: string[];
    errorEvents: string[];
    timeline: IncidentEvent[];
    rootCause?: string;
    resolution?: string;
    postMortemRequired: boolean;
    communicationPlan: CommunicationUpdate[];
}
export interface IncidentEvent {
    timestamp: number;
    type: 'created' | 'updated' | 'escalated' | 'resolved' | 'communication_sent';
    description: string;
    author?: string;
    data?: Record<string, any>;
}
export interface CommunicationUpdate {
    timestamp: number;
    channel: 'email' | 'slack' | 'status_page' | 'sms';
    audience: 'internal' | 'customers' | 'stakeholders';
    message: string;
    sent: boolean;
}
export interface RecoveryMetrics {
    totalErrors: number;
    errorsLast24h: number;
    automaticRecoveries: number;
    recoverySuccessRate: number;
    meanTimeToRecovery: number;
    meanTimeToDetection: number;
    incidentsCreated: number;
    incidentsResolved: number;
    recurringErrors: number;
    escalationsTriggered: number;
}
export declare class ErrorRecoverySystem extends EventEmitter {
    private errorEvents;
    private recoveryStrategies;
    private incidents;
    private recoveryAttempts;
    private lastRecoveryAttempts;
    private monitoringInterval;
    private isMonitoring;
    private readonly checkInterval;
    constructor();
    private setupDefaultRecoveryStrategies;
    startErrorRecovery(): void;
    stopErrorRecovery(): void;
    reportError(errorData: Partial<ErrorEvent>): string;
    private isAutoRecoverable;
    private attemptRecovery;
    private findApplicableStrategies;
    private canExecuteStrategy;
    private executeRecoveryStrategy;
    private executeRecoveryAction;
    private restartService;
    private scaleResources;
    private performFailover;
    private performRollback;
    private clearCache;
    private executeCustomScript;
    private verifyRecovery;
    private updateStrategySuccessRate;
    private escalateError;
    private createIncident;
    private getSeverityPriority;
    private processRecoveries;
    private detectRecurringErrors;
    private updateIncidentStatuses;
    private cleanupRecoveryAttempts;
    private sleep;
    getErrorEvents(filters?: {
        type?: ErrorEvent['type'];
        severity?: ErrorEvent['severity'];
        status?: ErrorEvent['status'];
        timeRange?: number;
    }): ErrorEvent[];
    getIncidents(status?: Incident['status']): Incident[];
    getRecoveryStrategies(): RecoveryStrategy[];
    getRecoveryMetrics(): RecoveryMetrics;
    acknowledgeIncident(incidentId: string, acknowledgedBy: string): boolean;
    resolveIncident(incidentId: string, resolution: string, resolvedBy: string): boolean;
    addRecoveryStrategy(strategy: RecoveryStrategy): void;
    removeRecoveryStrategy(strategyId: string): boolean;
    isActive(): boolean;
}
export default ErrorRecoverySystem;
//# sourceMappingURL=error-recovery.d.ts.map