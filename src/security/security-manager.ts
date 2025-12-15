/**
 * Comprehensive Security Manager with Real-time Threat Detection
 * Security hardening, audit logging, compliance monitoring, and incident response
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

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
  riskScore: number; // 0-100
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
  timeWindow?: number; // minutes
  priority: number;
  metadata: Record<string, any>;
}

export interface ThreatDetection {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
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
  complianceScore: number; // 0-100
  riskScore: number; // 0-100
  alertsGenerated: number;
  incidentsOpen: number;
  meanTimeToDetection: number; // minutes
  meanTimeToResponse: number; // minutes
}

export class SecurityManager extends EventEmitter {
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private securityRules: Map<string, SecurityRule> = new Map();
  private threatDetections: Map<string, ThreatDetection> = new Map();
  private complianceChecks: Map<string, ComplianceCheck> = new Map();
  private activeIncidents: Map<string, any> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private encryptionKey = crypto.randomBytes(32);
  private readonly checkInterval = 60000; // 1 minute

  constructor() {
    super();
    this.setupDefaultSecurityRules();
    this.setupDefaultComplianceChecks();
  }

  private setupDefaultSecurityRules(): void {
    const defaultRules: SecurityRule[] = [
      {
        id: 'failed-login-attempts',
        name: 'Multiple Failed Login Attempts',
        type: 'authentication',
        condition: 'failed_login_count > 5 within 15 minutes',
        action: 'block',
        enabled: true,
        threshold: 5,
        timeWindow: 15,
        priority: 1,
        metadata: {
          blockDuration: 30, // minutes
          notifyAdmin: true
        }
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempt',
        type: 'authorization',
        condition: 'role_change from user to admin',
        action: 'alert',
        enabled: true,
        priority: 1,
        metadata: {
          requireApproval: true,
          auditRequired: true
        }
      },
      {
        id: 'unusual-data-access',
        name: 'Unusual Data Access Pattern',
        type: 'data_access',
        condition: 'data_access_volume > normal_baseline * 5',
        action: 'alert',
        enabled: true,
        threshold: 5,
        timeWindow: 60,
        priority: 2,
        metadata: {
          baselineCheck: true
        }
      },
      {
        id: 'after-hours-access',
        name: 'After Hours System Access',
        type: 'system_change',
        condition: 'system_access outside business_hours',
        action: 'log',
        enabled: true,
        priority: 3,
        metadata: {
          businessHours: '09:00-17:00',
          timezone: 'UTC'
        }
      },
      {
        id: 'suspicious-ip',
        name: 'Access from Suspicious IP',
        type: 'intrusion',
        condition: 'ip_address in threat_intelligence_blacklist',
        action: 'block',
        enabled: true,
        priority: 1,
        metadata: {
          checkThreatFeeds: true,
          geoLocation: true
        }
      },
      {
        id: 'brute-force-attack',
        name: 'Brute Force Attack Detection',
        type: 'intrusion',
        condition: 'request_rate > 100 per minute from single IP',
        action: 'block',
        enabled: true,
        threshold: 100,
        timeWindow: 1,
        priority: 1,
        metadata: {
          blockDuration: 60
        }
      }
    ];

    defaultRules.forEach(rule => {
      this.securityRules.set(rule.id, rule);
    });
  }

  private setupDefaultComplianceChecks(): void {
    const defaultChecks: ComplianceCheck[] = [
      {
        id: 'encryption-at-rest',
        name: 'Data Encryption at Rest',
        standard: 'PCI-DSS',
        requirement: 'All sensitive data must be encrypted at rest',
        status: 'unknown',
        lastChecked: 0,
        evidence: []
      },
      {
        id: 'access-logging',
        name: 'Access Logging Enabled',
        standard: 'SOX',
        requirement: 'All system access must be logged',
        status: 'unknown',
        lastChecked: 0,
        evidence: []
      },
      {
        id: 'data-retention',
        name: 'Data Retention Policy',
        standard: 'GDPR',
        requirement: 'Data retention policies must be enforced',
        status: 'unknown',
        lastChecked: 0,
        evidence: []
      },
      {
        id: 'user-access-review',
        name: 'Regular User Access Review',
        standard: 'SOC2',
        requirement: 'User access must be reviewed quarterly',
        status: 'unknown',
        lastChecked: 0,
        evidence: []
      },
      {
        id: 'vulnerability-scanning',
        name: 'Regular Vulnerability Scanning',
        standard: 'ISO27001',
        requirement: 'Systems must be scanned for vulnerabilities monthly',
        status: 'unknown',
        lastChecked: 0,
        evidence: []
      }
    ];

    defaultChecks.forEach(check => {
      this.complianceChecks.set(check.id, check);
    });
  }

  public startSecurityMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Security monitoring already started');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting security monitoring');

    this.monitoringInterval = setInterval(() => {
      this.performSecurityChecks();
    }, this.checkInterval);

    // Initial security check
    this.performSecurityChecks();

    this.emit('security-monitoring-started');
  }

  public stopSecurityMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Security monitoring stopped');
    this.emit('security-monitoring-stopped');
  }

  private async performSecurityChecks(): Promise<void> {
    try {
      // Analyze recent security events for patterns
      this.analyzeSecurityEvents();
      
      // Check for threat indicators
      this.detectThreats();
      
      // Run compliance checks
      await this.runComplianceChecks();
      
      // Update security metrics
      this.updateSecurityMetrics();
      
      this.emit('security-check-complete');
      
    } catch (error) {
      console.error('Error during security checks:', error);
      this.emit('security-check-error', error);
    }
  }

  public logSecurityEvent(eventData: Partial<SecurityEvent>): string {
    const eventId = `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const securityEvent: SecurityEvent = {
      id: eventId,
      type: eventData.type || 'system_change',
      severity: eventData.severity || 'low',
      timestamp: Date.now(),
      source: eventData.source || 'unknown',
      user: eventData.user,
      ip: eventData.ip,
      userAgent: eventData.userAgent,
      action: eventData.action || 'unknown',
      resource: eventData.resource,
      outcome: eventData.outcome || 'success',
      details: eventData.details || {},
      riskScore: eventData.riskScore || this.calculateRiskScore(eventData),
      alertRequired: eventData.severity === 'high' || eventData.severity === 'critical'
    };

    this.securityEvents.set(eventId, securityEvent);
    
    // Store encrypted audit log
    this.createAuditLog(securityEvent);
    
    // Check security rules
    this.checkSecurityRules(securityEvent);
    
    console.log(`Security event logged: ${eventId} - ${securityEvent.action}`);
    this.emit('security-event', securityEvent);
    
    return eventId;
  }

  private calculateRiskScore(eventData: Partial<SecurityEvent>): number {
    let score = 0;
    
    // Base score by type
    switch (eventData.type) {
      case 'authentication': score += 30; break;
      case 'authorization': score += 40; break;
      case 'intrusion': score += 60; break;
      case 'data_access': score += 50; break;
      case 'system_change': score += 35; break;
      default: score += 20;
    }
    
    // Adjust by severity
    switch (eventData.severity) {
      case 'critical': score += 40; break;
      case 'high': score += 30; break;
      case 'medium': score += 20; break;
      case 'low': score += 10; break;
    }
    
    // Adjust by outcome
    if (eventData.outcome === 'failure') score += 20;
    if (eventData.outcome === 'blocked') score += 15;
    
    // Additional risk factors
    if (eventData.ip && this.isKnownThreatIP(eventData.ip)) score += 25;
    if (eventData.user && this.isHighPrivilegeUser(eventData.user)) score += 15;
    
    return Math.min(100, score);
  }

  private isKnownThreatIP(ip: string): boolean {
    // Mock threat IP check - in real implementation, check against threat feeds
    const knownThreats = ['192.168.1.100', '10.0.0.50']; // Mock threat IPs
    return knownThreats.includes(ip);
  }

  private isHighPrivilegeUser(user: string): boolean {
    // Mock privilege check
    const adminUsers = ['admin', 'root', 'administrator'];
    return adminUsers.includes(user.toLowerCase());
  }

  private createAuditLog(securityEvent: SecurityEvent): void {
    const auditId = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const auditLog: AuditLog = {
      id: auditId,
      timestamp: securityEvent.timestamp,
      userId: securityEvent.user,
      sessionId: securityEvent.details.sessionId,
      ip: securityEvent.ip || 'unknown',
      userAgent: securityEvent.userAgent,
      action: securityEvent.action,
      resource: securityEvent.resource || 'unknown',
      outcome: securityEvent.outcome,
      details: this.encryptSensitiveData(securityEvent.details),
      risk: securityEvent.riskScore
    };
    
    this.auditLogs.set(auditId, auditLog);
    
    // Maintain audit log size (keep last 10000 entries)
    if (this.auditLogs.size > 10000) {
      const oldestKey = this.auditLogs.keys().next().value;
      this.auditLogs.delete(oldestKey);
    }
  }

  private encryptSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    const encrypted = { ...data };
    
    for (const [key, value] of Object.entries(encrypted)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        if (typeof value === 'string') {
          const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
          encrypted[key] = cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
        }
      }
    }
    
    return encrypted;
  }

  private checkSecurityRules(securityEvent: SecurityEvent): void {
    for (const rule of this.securityRules.values()) {
      if (!rule.enabled || rule.type !== securityEvent.type) continue;
      
      if (this.evaluateSecurityRule(rule, securityEvent)) {
        this.executeRuleAction(rule, securityEvent);
      }
    }
  }

  private evaluateSecurityRule(rule: SecurityRule, event: SecurityEvent): boolean {
    // Simple rule evaluation - in a real implementation, use a rule engine
    switch (rule.id) {
      case 'failed-login-attempts':
        return this.checkFailedLoginAttempts(event, rule);
      case 'privilege-escalation':
        return this.checkPrivilegeEscalation(event);
      case 'unusual-data-access':
        return this.checkUnusualDataAccess(event, rule);
      case 'after-hours-access':
        return this.checkAfterHoursAccess(event);
      case 'suspicious-ip':
        return this.checkSuspiciousIP(event);
      case 'brute-force-attack':
        return this.checkBruteForceAttack(event, rule);
      default:
        return false;
    }
  }

  private checkFailedLoginAttempts(event: SecurityEvent, rule: SecurityRule): boolean {
    if (event.action !== 'login' || event.outcome !== 'failure') return false;
    
    const timeWindow = (rule.timeWindow || 15) * 60 * 1000; // Convert to milliseconds
    const threshold = rule.threshold || 5;
    const cutoffTime = Date.now() - timeWindow;
    
    const recentFailures = Array.from(this.securityEvents.values()).filter(e =>
      e.type === 'authentication' &&
      e.action === 'login' &&
      e.outcome === 'failure' &&
      e.ip === event.ip &&
      e.timestamp >= cutoffTime
    );
    
    return recentFailures.length >= threshold;
  }

  private checkPrivilegeEscalation(event: SecurityEvent): boolean {
    return event.action === 'role_change' && 
           event.details.fromRole === 'user' && 
           event.details.toRole === 'admin';
  }

  private checkUnusualDataAccess(event: SecurityEvent, rule: SecurityRule): boolean {
    if (event.type !== 'data_access') return false;
    
    // Mock baseline check - in real implementation, use ML models
    const normalBaseline = 100; // MB per hour
    const accessVolume = event.details.dataVolume || 0;
    const threshold = rule.threshold || 5;
    
    return accessVolume > normalBaseline * threshold;
  }

  private checkAfterHoursAccess(event: SecurityEvent): boolean {
    const hour = new Date(event.timestamp).getUTCHours();
    return hour < 9 || hour > 17; // Outside 9-17 UTC
  }

  private checkSuspiciousIP(event: SecurityEvent): boolean {
    return event.ip ? this.isKnownThreatIP(event.ip) : false;
  }

  private checkBruteForceAttack(event: SecurityEvent, rule: SecurityRule): boolean {
    const timeWindow = (rule.timeWindow || 1) * 60 * 1000; // Convert to milliseconds
    const threshold = rule.threshold || 100;
    const cutoffTime = Date.now() - timeWindow;
    
    const recentRequests = Array.from(this.securityEvents.values()).filter(e =>
      e.ip === event.ip &&
      e.timestamp >= cutoffTime
    );
    
    return recentRequests.length >= threshold;
  }

  private executeRuleAction(rule: SecurityRule, event: SecurityEvent): void {
    console.log(`Executing security rule action: ${rule.action} for rule ${rule.name}`);
    
    switch (rule.action) {
      case 'log':
        console.log(`Security rule triggered: ${rule.name}`);
        break;
      case 'alert':
        this.createSecurityAlert(rule, event);
        break;
      case 'block':
        this.blockSource(event);
        break;
      case 'quarantine':
        this.quarantineUser(event);
        break;
    }
    
    this.emit('security-rule-triggered', { rule, event });
  }

  private createSecurityAlert(rule: SecurityRule, event: SecurityEvent): void {
    console.log(`🚨 SECURITY ALERT: ${rule.name}`);
    console.log(`Event: ${event.action} by ${event.user || 'unknown'} from ${event.ip || 'unknown'}`);
    console.log(`Risk Score: ${event.riskScore}`);
    
    this.emit('security-alert', {
      rule,
      event,
      message: `Security rule "${rule.name}" triggered`,
      severity: event.severity,
      timestamp: Date.now()
    });
  }

  private blockSource(event: SecurityEvent): void {
    console.log(`🛡️ BLOCKING SOURCE: ${event.ip || 'unknown'}`);
    
    // In a real implementation, this would integrate with firewall/WAF
    this.emit('source-blocked', {
      ip: event.ip,
      reason: 'Security rule violation',
      timestamp: Date.now(),
      duration: 3600000 // 1 hour
    });
  }

  private quarantineUser(event: SecurityEvent): void {
    console.log(`🔒 QUARANTINING USER: ${event.user || 'unknown'}`);
    
    // In a real implementation, this would disable user account
    this.emit('user-quarantined', {
      user: event.user,
      reason: 'Security rule violation',
      timestamp: Date.now()
    });
  }

  private analyzeSecurityEvents(): void {
    const recentEvents = Array.from(this.securityEvents.values()).filter(
      event => Date.now() - event.timestamp < 3600000 // Last hour
    );
    
    // Pattern analysis
    this.detectSecurityPatterns(recentEvents);
    
    // Anomaly detection
    this.detectAnomalies(recentEvents);
  }

  private detectSecurityPatterns(events: SecurityEvent[]): void {
    // Group by IP address
    const eventsByIP = new Map<string, SecurityEvent[]>();
    events.forEach(event => {
      if (event.ip) {
        if (!eventsByIP.has(event.ip)) {
          eventsByIP.set(event.ip, []);
        }
        eventsByIP.get(event.ip)!.push(event);
      }
    });
    
    // Detect distributed attacks
    for (const [ip, ipEvents] of eventsByIP) {
      if (ipEvents.length > 50) { // High activity from single IP
        this.createThreatDetection({
          name: 'High Activity from Single IP',
          description: `${ipEvents.length} events from IP ${ip} in the last hour`,
          severity: 'medium',
          confidence: 0.8,
          indicators: [`ip:${ip}`, `event_count:${ipEvents.length}`],
          affectedSystems: [...new Set(ipEvents.map(e => e.source))],
          recommendedActions: ['Block IP address', 'Investigate user accounts']
        });
      }
    }
    
    // Group by user
    const eventsByUser = new Map<string, SecurityEvent[]>();
    events.forEach(event => {
      if (event.user) {
        if (!eventsByUser.has(event.user)) {
          eventsByUser.set(event.user, []);
        }
        eventsByUser.get(event.user)!.push(event);
      }
    });
    
    // Detect suspicious user behavior
    for (const [user, userEvents] of eventsByUser) {
      const failureRate = userEvents.filter(e => e.outcome === 'failure').length / userEvents.length;
      if (failureRate > 0.5 && userEvents.length > 10) {
        this.createThreatDetection({
          name: 'Suspicious User Behavior',
          description: `User ${user} has ${(failureRate * 100).toFixed(1)}% failure rate`,
          severity: 'medium',
          confidence: 0.7,
          indicators: [`user:${user}`, `failure_rate:${failureRate}`],
          affectedSystems: [...new Set(userEvents.map(e => e.source))],
          recommendedActions: ['Review user permissions', 'Check for compromised account']
        });
      }
    }
  }

  private detectAnomalies(events: SecurityEvent[]): void {
    // Time-based anomalies
    const eventsByHour = new Map<number, number>();
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      eventsByHour.set(hour, (eventsByHour.get(hour) || 0) + 1);
    });
    
    const hourlyAverage = events.length / 24;
    for (const [hour, count] of eventsByHour) {
      if (count > hourlyAverage * 3) { // 3x normal activity
        this.createThreatDetection({
          name: 'Unusual Activity Pattern',
          description: `${count} events at hour ${hour} (${(count / hourlyAverage).toFixed(1)}x normal)`,
          severity: 'low',
          confidence: 0.6,
          indicators: [`hour:${hour}`, `event_count:${count}`],
          affectedSystems: ['all'],
          recommendedActions: ['Investigate unusual activity pattern']
        });
      }
    }
  }

  private createThreatDetection(data: Partial<ThreatDetection>): void {
    const threatId = `threat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const threat: ThreatDetection = {
      id: threatId,
      name: data.name || 'Unknown Threat',
      description: data.description || '',
      severity: data.severity || 'medium',
      confidence: data.confidence || 0.5,
      indicators: data.indicators || [],
      affectedSystems: data.affectedSystems || [],
      recommendedActions: data.recommendedActions || [],
      detectedAt: Date.now(),
      lastSeen: Date.now(),
      eventCount: 1,
      mitigated: false
    };
    
    this.threatDetections.set(threatId, threat);
    
    console.log(`🔍 THREAT DETECTED: ${threat.name} (${threat.severity})`);
    this.emit('threat-detected', threat);
  }

  private detectThreats(): void {
    // Update existing threat detections
    for (const threat of this.threatDetections.values()) {
      if (!threat.mitigated) {
        // Check if threat is still active
        const recentEvents = Array.from(this.securityEvents.values()).filter(
          event => Date.now() - event.timestamp < 300000 // Last 5 minutes
        );
        
        const relevantEvents = this.filterEventsByThreat(recentEvents, threat);
        if (relevantEvents.length > 0) {
          threat.lastSeen = Date.now();
          threat.eventCount += relevantEvents.length;
        }
      }
    }
  }

  private filterEventsByThreat(events: SecurityEvent[], threat: ThreatDetection): SecurityEvent[] {
    return events.filter(event => {
      return threat.indicators.some(indicator => {
        const [type, value] = indicator.split(':');
        switch (type) {
          case 'ip': return event.ip === value;
          case 'user': return event.user === value;
          case 'source': return event.source === value;
          default: return false;
        }
      });
    });
  }

  private async runComplianceChecks(): Promise<void> {
    for (const check of this.complianceChecks.values()) {
      await this.performComplianceCheck(check);
    }
  }

  private async performComplianceCheck(check: ComplianceCheck): Promise<void> {
    try {
      let status: ComplianceCheck['status'] = 'unknown';
      const evidence: string[] = [];
      
      switch (check.id) {
        case 'encryption-at-rest':
          status = await this.checkEncryptionAtRest();
          evidence.push('Database encryption: enabled', 'File system encryption: enabled');
          break;
        case 'access-logging':
          status = this.checkAccessLogging();
          evidence.push(`Audit logs: ${this.auditLogs.size} entries`);
          break;
        case 'data-retention':
          status = this.checkDataRetention();
          evidence.push('Data retention policy: configured');
          break;
        case 'user-access-review':
          status = this.checkUserAccessReview();
          evidence.push('Last access review: pending');
          break;
        case 'vulnerability-scanning':
          status = await this.checkVulnerabilityScanning();
          evidence.push('Last scan: pending implementation');
          break;
      }
      
      check.status = status;
      check.lastChecked = Date.now();
      check.evidence = evidence;
      
      this.complianceChecks.set(check.id, check);
      
      if (status === 'non_compliant') {
        this.emit('compliance-violation', check);
      }
      
    } catch (error) {
      console.error(`Compliance check failed for ${check.id}:`, error);
      check.status = 'unknown';
      check.lastChecked = Date.now();
    }
  }

  private async checkEncryptionAtRest(): Promise<ComplianceCheck['status']> {
    // Mock implementation - in real system, check actual encryption status
    return 'compliant';
  }

  private checkAccessLogging(): ComplianceCheck['status'] {
    return this.auditLogs.size > 0 ? 'compliant' : 'non_compliant';
  }

  private checkDataRetention(): ComplianceCheck['status'] {
    // Mock implementation
    return 'warning'; // Partially compliant
  }

  private checkUserAccessReview(): ComplianceCheck['status'] {
    // Mock implementation - check if review was done in last 90 days
    return 'non_compliant';
  }

  private async checkVulnerabilityScanning(): Promise<ComplianceCheck['status']> {
    // Mock implementation
    return 'non_compliant';
  }

  private updateSecurityMetrics(): void {
    const recentEvents = Array.from(this.securityEvents.values()).filter(
      event => Date.now() - event.timestamp < 86400000 // Last 24 hours
    );
    
    const metrics: SecurityMetrics = {
      totalEvents: this.securityEvents.size,
      eventsLast24h: recentEvents.length,
      threatsDetected: this.threatDetections.size,
      threatsBlocked: Array.from(this.threatDetections.values()).filter(t => t.mitigated).length,
      complianceScore: this.calculateComplianceScore(),
      riskScore: this.calculateOverallRiskScore(),
      alertsGenerated: recentEvents.filter(e => e.alertRequired).length,
      incidentsOpen: this.activeIncidents.size,
      meanTimeToDetection: 5, // Mock value
      meanTimeToResponse: 15 // Mock value
    };
    
    this.emit('security-metrics-updated', metrics);
  }

  private calculateComplianceScore(): number {
    const checks = Array.from(this.complianceChecks.values());
    if (checks.length === 0) return 100;
    
    const scores = checks.map(check => {
      switch (check.status) {
        case 'compliant': return 100;
        case 'warning': return 70;
        case 'non_compliant': return 0;
        case 'unknown': return 50;
        default: return 50;
      }
    });
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateOverallRiskScore(): number {
    const recentEvents = Array.from(this.securityEvents.values()).filter(
      event => Date.now() - event.timestamp < 3600000 // Last hour
    );
    
    if (recentEvents.length === 0) return 0;
    
    const riskScores = recentEvents.map(event => event.riskScore);
    const averageRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    // Adjust for active threats
    const activeThreatBonus = this.threatDetections.size * 10;
    
    return Math.min(100, averageRisk + activeThreatBonus);
  }

  public getSecurityEvents(filters?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    timeRange?: number;
  }): SecurityEvent[] {
    let events = Array.from(this.securityEvents.values());
    
    if (filters) {
      if (filters.type) {
        events = events.filter(event => event.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(event => event.severity === filters.severity);
      }
      if (filters.timeRange) {
        const cutoff = Date.now() - filters.timeRange;
        events = events.filter(event => event.timestamp >= cutoff);
      }
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getThreatDetections(): ThreatDetection[] {
    return Array.from(this.threatDetections.values())
      .sort((a, b) => b.detectedAt - a.detectedAt);
  }

  public getComplianceStatus(): ComplianceCheck[] {
    return Array.from(this.complianceChecks.values());
  }

  public getAuditLogs(timeRange?: number): AuditLog[] {
    let logs = Array.from(this.auditLogs.values());
    
    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      logs = logs.filter(log => log.timestamp >= cutoff);
    }
    
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  public mitigateThreat(threatId: string): boolean {
    const threat = this.threatDetections.get(threatId);
    if (!threat) return false;
    
    threat.mitigated = true;
    this.threatDetections.set(threatId, threat);
    
    console.log(`Threat mitigated: ${threat.name}`);
    this.emit('threat-mitigated', threat);
    
    return true;
  }

  public addSecurityRule(rule: SecurityRule): void {
    this.securityRules.set(rule.id, rule);
    console.log(`Added security rule: ${rule.name}`);
  }

  public removeSecurityRule(ruleId: string): boolean {
    return this.securityRules.delete(ruleId);
  }

  public enableSecurityRule(ruleId: string): boolean {
    const rule = this.securityRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.securityRules.set(ruleId, rule);
      return true;
    }
    return false;
  }

  public disableSecurityRule(ruleId: string): boolean {
    const rule = this.securityRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.securityRules.set(ruleId, rule);
      return true;
    }
    return false;
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }

  public getSecurityMetrics(): SecurityMetrics {
    return {
      totalEvents: this.securityEvents.size,
      eventsLast24h: Array.from(this.securityEvents.values()).filter(
        event => Date.now() - event.timestamp < 86400000
      ).length,
      threatsDetected: this.threatDetections.size,
      threatsBlocked: Array.from(this.threatDetections.values()).filter(t => t.mitigated).length,
      complianceScore: this.calculateComplianceScore(),
      riskScore: this.calculateOverallRiskScore(),
      alertsGenerated: Array.from(this.securityEvents.values()).filter(e => e.alertRequired).length,
      incidentsOpen: this.activeIncidents.size,
      meanTimeToDetection: 5,
      meanTimeToResponse: 15
    };
  }
}

export default SecurityManager;