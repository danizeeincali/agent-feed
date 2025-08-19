/**
 * Comprehensive Security Manager with Real-time Threat Detection
 * Security hardening, audit logging, compliance monitoring, and incident response
 */
import { EventEmitter } from 'events';
export interface SecurityEvent {
    id: string;
    type: 'authentication' | 'authorization' | 'intrusion' | 'compliance' | 'data_access' | 'system_change';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    source: string;
    user?: string;
    ip?: string;
    userAgent?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure' | 'blocked';
    details: Record<string, any>;
    riskScore: number;
    alertRequired: boolean;
}
export interface SecurityRule {
    id: string;
    name: string;
    type: SecurityEvent['type'];
    condition: string;
    action: 'log' | 'alert' | 'block' | 'quarantine';
    enabled: boolean;
    threshold?: number;
    timeWindow?: number;
    priority: number;
    metadata: Record<string, any>;
}
export interface ThreatDetection {
    id: string;
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    indicators: string[];
    affectedSystems: string[];
    recommendedActions: string[];
    detectedAt: number;
    lastSeen: number;
    eventCount: number;
    mitigated: boolean;
}
export interface AuditLog {
    id: string;
    timestamp: number;
    userId?: string;
    sessionId?: string;
    ip: string;
    userAgent?: string;
    action: string;
    resource: string;
    outcome: 'success' | 'failure';
    details: Record<string, any>;
    risk: number;
}
export interface ComplianceCheck {
    id: string;
    name: string;
    standard: 'SOX' | 'PCI-DSS' | 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001';
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'warning' | 'unknown';
    lastChecked: number;
    evidence: string[];
    remediationSteps?: string[];
    dueDate?: number;
}
export interface SecurityMetrics {
    totalEvents: number;
    eventsLast24h: number;
    threatsDetected: number;
    threatsBlocked: number;
    complianceScore: number;
    riskScore: number;
    alertsGenerated: number;
    incidentsOpen: number;
    meanTimeToDetection: number;
    meanTimeToResponse: number;
}
export declare class SecurityManager extends EventEmitter {
    private securityEvents;
    private auditLogs;
    private securityRules;
    private threatDetections;
    private complianceChecks;
    private activeIncidents;
    private monitoringInterval;
    private isMonitoring;
    private encryptionKey;
    private readonly checkInterval;
    constructor();
    private setupDefaultSecurityRules;
    private setupDefaultComplianceChecks;
    startSecurityMonitoring(): void;
    stopSecurityMonitoring(): void;
    private performSecurityChecks;
    logSecurityEvent(eventData: Partial<SecurityEvent>): string;
    private calculateRiskScore;
    private isKnownThreatIP;
    private isHighPrivilegeUser;
    private createAuditLog;
    private encryptSensitiveData;
    private checkSecurityRules;
    private evaluateSecurityRule;
    private checkFailedLoginAttempts;
    private checkPrivilegeEscalation;
    private checkUnusualDataAccess;
    private checkAfterHoursAccess;
    private checkSuspiciousIP;
    private checkBruteForceAttack;
    private executeRuleAction;
    private createSecurityAlert;
    private blockSource;
    private quarantineUser;
    private analyzeSecurityEvents;
    private detectSecurityPatterns;
    private detectAnomalies;
    private createThreatDetection;
    private detectThreats;
    private filterEventsByThreat;
    private runComplianceChecks;
    private performComplianceCheck;
    private checkEncryptionAtRest;
    private checkAccessLogging;
    private checkDataRetention;
    private checkUserAccessReview;
    private checkVulnerabilityScanning;
    private updateSecurityMetrics;
    private calculateComplianceScore;
    private calculateOverallRiskScore;
    getSecurityEvents(filters?: {
        type?: SecurityEvent['type'];
        severity?: SecurityEvent['severity'];
        timeRange?: number;
    }): SecurityEvent[];
    getThreatDetections(): ThreatDetection[];
    getComplianceStatus(): ComplianceCheck[];
    getAuditLogs(timeRange?: number): AuditLog[];
    mitigateThreat(threatId: string): boolean;
    addSecurityRule(rule: SecurityRule): void;
    removeSecurityRule(ruleId: string): boolean;
    enableSecurityRule(ruleId: string): boolean;
    disableSecurityRule(ruleId: string): boolean;
    isActive(): boolean;
    getSecurityMetrics(): SecurityMetrics;
}
export default SecurityManager;
//# sourceMappingURL=security-manager.d.ts.map