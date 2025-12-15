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
  cooldownPeriod: number; // seconds
  maxRetries: number;
  escalationThreshold: number;
}

export interface RecoveryAction {
  type: 'restart_service' | 'scale_resources' | 'failover' | 'rollback' | 'clear_cache' | 'custom_script';
  parameters: Record<string, any>;
  timeout: number; // seconds
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
  meanTimeToRecovery: number; // minutes
  meanTimeToDetection: number; // minutes
  incidentsCreated: number;
  incidentsResolved: number;
  recurringErrors: number;
  escalationsTriggered: number;
}

export class ErrorRecoverySystem extends EventEmitter {
  private errorEvents: Map<string, ErrorEvent> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private lastRecoveryAttempts: Map<string, number> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private readonly checkInterval = 30000; // 30 seconds

  constructor() {
    super();
    this.setupDefaultRecoveryStrategies();
  }

  private setupDefaultRecoveryStrategies(): void {
    const defaultStrategies: RecoveryStrategy[] = [
      {
        id: 'service-restart',
        name: 'Service Restart Recovery',
        errorTypes: ['application', 'system'],
        conditions: ['service_unresponsive', 'memory_leak', 'deadlock'],
        actions: [
          {
            type: 'restart_service',
            parameters: { graceful: true, timeout: 30 },
            timeout: 60,
            retryable: true
          }
        ],
        priority: 1,
        successRate: 0.85,
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
        maxRetries: 3,
        escalationThreshold: 2
      },
      {
        id: 'horizontal-scaling',
        name: 'Auto-scaling Recovery',
        errorTypes: ['application', 'system'],
        conditions: ['high_load', 'response_time_degradation', 'queue_overflow'],
        actions: [
          {
            type: 'scale_resources',
            parameters: { direction: 'out', increment: 2, maxInstances: 10 },
            timeout: 300,
            retryable: false
          }
        ],
        priority: 2,
        successRate: 0.90,
        enabled: true,
        cooldownPeriod: 600, // 10 minutes
        maxRetries: 2,
        escalationThreshold: 1
      },
      {
        id: 'database-failover',
        name: 'Database Failover',
        errorTypes: ['database'],
        conditions: ['connection_timeout', 'primary_unavailable', 'corruption_detected'],
        actions: [
          {
            type: 'failover',
            parameters: { target: 'secondary', verifyIntegrity: true },
            timeout: 120,
            retryable: false,
            rollbackAction: {
              type: 'failover',
              parameters: { target: 'primary' },
              timeout: 120,
              retryable: false
            }
          }
        ],
        priority: 1,
        successRate: 0.95,
        enabled: true,
        cooldownPeriod: 1800, // 30 minutes
        maxRetries: 1,
        escalationThreshold: 1
      },
      {
        id: 'cache-clearing',
        name: 'Cache Clear Recovery',
        errorTypes: ['application'],
        conditions: ['cache_corruption', 'stale_data', 'memory_pressure'],
        actions: [
          {
            type: 'clear_cache',
            parameters: { type: 'all', warmup: true },
            timeout: 60,
            retryable: true
          }
        ],
        priority: 3,
        successRate: 0.75,
        enabled: true,
        cooldownPeriod: 180, // 3 minutes
        maxRetries: 2,
        escalationThreshold: 3
      },
      {
        id: 'rollback-deployment',
        name: 'Deployment Rollback',
        errorTypes: ['application'],
        conditions: ['deployment_failure', 'regression_detected', 'critical_bug'],
        actions: [
          {
            type: 'rollback',
            parameters: { target: 'previous_stable', verifyHealth: true },
            timeout: 300,
            retryable: false
          }
        ],
        priority: 1,
        successRate: 0.98,
        enabled: true,
        cooldownPeriod: 3600, // 1 hour
        maxRetries: 1,
        escalationThreshold: 1
      },
      {
        id: 'network-recovery',
        name: 'Network Recovery',
        errorTypes: ['network', 'infrastructure'],
        conditions: ['connection_failure', 'timeout', 'packet_loss'],
        actions: [
          {
            type: 'custom_script',
            parameters: { script: 'network_recovery.sh', args: ['--reset-connections'] },
            timeout: 120,
            retryable: true
          }
        ],
        priority: 2,
        successRate: 0.80,
        enabled: true,
        cooldownPeriod: 240, // 4 minutes
        maxRetries: 3,
        escalationThreshold: 2
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.recoveryStrategies.set(strategy.id, strategy);
    });
  }

  public startErrorRecovery(): void {
    if (this.isMonitoring) {
      console.log('Error recovery system already started');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting error recovery system');

    this.monitoringInterval = setInterval(() => {
      this.processRecoveries();
    }, this.checkInterval);

    this.emit('error-recovery-started');
  }

  public stopErrorRecovery(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Error recovery system stopped');
    this.emit('error-recovery-stopped');
  }

  public reportError(errorData: Partial<ErrorEvent>): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorEvent: ErrorEvent = {
      id: errorId,
      timestamp: Date.now(),
      type: errorData.type || 'application',
      severity: errorData.severity || 'medium',
      source: errorData.source || 'unknown',
      component: errorData.component || 'unknown',
      message: errorData.message || 'Unknown error',
      stackTrace: errorData.stackTrace,
      context: errorData.context || {},
      impact: errorData.impact || {
        usersFaced: 0,
        servicesAffected: [],
        dataLoss: false,
        securityBreach: false
      },
      status: 'new',
      recoveryAttempts: 0,
      autoRecoverable: this.isAutoRecoverable(errorData)
    };

    this.errorEvents.set(errorId, errorEvent);
    
    console.log(`Error reported: ${errorId} - ${errorEvent.message}`);
    this.emit('error-reported', errorEvent);
    
    // Immediate recovery attempt for critical errors
    if (errorEvent.severity === 'critical' || errorEvent.autoRecoverable) {
      this.attemptRecovery(errorEvent);
    }
    
    // Create incident for high severity errors
    if (errorEvent.severity === 'high' || errorEvent.severity === 'critical') {
      this.createIncident(errorEvent);
    }
    
    return errorId;
  }

  private isAutoRecoverable(errorData: Partial<ErrorEvent>): boolean {
    const autoRecoverablePatterns = [
      'connection timeout',
      'service unavailable',
      'memory pressure',
      'high load',
      'cache miss',
      'temporary failure'
    ];
    
    const message = (errorData.message || '').toLowerCase();
    return autoRecoverablePatterns.some(pattern => message.includes(pattern));
  }

  private async attemptRecovery(errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Attempting recovery for error: ${errorEvent.id}`);
    
    // Find applicable recovery strategies
    const applicableStrategies = this.findApplicableStrategies(errorEvent);
    
    if (applicableStrategies.length === 0) {
      console.log(`No recovery strategies found for error: ${errorEvent.id}`);
      return false;
    }
    
    // Sort by priority and success rate
    applicableStrategies.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.successRate - a.successRate;
    });
    
    for (const strategy of applicableStrategies) {
      if (!this.canExecuteStrategy(strategy, errorEvent)) continue;
      
      const success = await this.executeRecoveryStrategy(strategy, errorEvent);
      if (success) {
        this.updateStrategySuccessRate(strategy, true);
        errorEvent.status = 'resolved';
        this.errorEvents.set(errorEvent.id, errorEvent);
        
        console.log(`Recovery successful using strategy: ${strategy.name}`);
        this.emit('recovery-successful', { errorEvent, strategy });
        return true;
      } else {
        this.updateStrategySuccessRate(strategy, false);
        errorEvent.recoveryAttempts++;
        
        // Escalate if threshold reached
        if (errorEvent.recoveryAttempts >= strategy.escalationThreshold) {
          this.escalateError(errorEvent, strategy);
        }
      }
    }
    
    console.log(`Recovery failed for error: ${errorEvent.id}`);
    this.emit('recovery-failed', errorEvent);
    return false;
  }

  private findApplicableStrategies(errorEvent: ErrorEvent): RecoveryStrategy[] {
    return Array.from(this.recoveryStrategies.values()).filter(strategy => {
      if (!strategy.enabled) return false;
      
      // Check error type match
      if (!strategy.errorTypes.includes(errorEvent.type)) return false;
      
      // Check conditions (simplified matching)
      const errorMessage = errorEvent.message.toLowerCase();
      const contextKeys = Object.keys(errorEvent.context).map(k => k.toLowerCase());
      
      return strategy.conditions.some(condition => 
        errorMessage.includes(condition) || 
        contextKeys.some(key => key.includes(condition))
      );
    });
  }

  private canExecuteStrategy(strategy: RecoveryStrategy, errorEvent: ErrorEvent): boolean {
    const now = Date.now();
    const lastAttemptKey = `${strategy.id}-${errorEvent.component}`;
    const lastAttempt = this.lastRecoveryAttempts.get(lastAttemptKey) || 0;
    
    // Check cooldown period
    if (now - lastAttempt < strategy.cooldownPeriod * 1000) {
      return false;
    }
    
    // Check max retries
    const attemptCount = this.recoveryAttempts.get(lastAttemptKey) || 0;
    if (attemptCount >= strategy.maxRetries) {
      return false;
    }
    
    return true;
  }

  private async executeRecoveryStrategy(strategy: RecoveryStrategy, errorEvent: ErrorEvent): Promise<boolean> {
    const attemptKey = `${strategy.id}-${errorEvent.component}`;
    
    try {
      console.log(`Executing recovery strategy: ${strategy.name} for ${errorEvent.component}`);
      
      // Update attempt tracking
      this.lastRecoveryAttempts.set(attemptKey, Date.now());
      this.recoveryAttempts.set(attemptKey, (this.recoveryAttempts.get(attemptKey) || 0) + 1);
      
      // Execute all actions in sequence
      for (const action of strategy.actions) {
        const success = await this.executeRecoveryAction(action, errorEvent);
        if (!success) {
          // If action fails and has rollback, execute it
          if (action.rollbackAction) {
            await this.executeRecoveryAction(action.rollbackAction, errorEvent);
          }
          return false;
        }
      }
      
      // Verify recovery success
      await this.sleep(5000); // Wait 5 seconds for system to stabilize
      return await this.verifyRecovery(errorEvent);
      
    } catch (error) {
      console.error(`Recovery strategy execution failed:`, error);
      return false;
    }
  }

  private async executeRecoveryAction(action: RecoveryAction, errorEvent: ErrorEvent): Promise<boolean> {
    try {
      console.log(`Executing recovery action: ${action.type}`);
      
      switch (action.type) {
        case 'restart_service':
          return await this.restartService(action.parameters, errorEvent);
        case 'scale_resources':
          return await this.scaleResources(action.parameters, errorEvent);
        case 'failover':
          return await this.performFailover(action.parameters, errorEvent);
        case 'rollback':
          return await this.performRollback(action.parameters, errorEvent);
        case 'clear_cache':
          return await this.clearCache(action.parameters, errorEvent);
        case 'custom_script':
          return await this.executeCustomScript(action.parameters, errorEvent);
        default:
          console.log(`Unknown recovery action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Recovery action failed:`, error);
      return false;
    }
  }

  private async restartService(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Restarting service: ${errorEvent.component}`);
    
    // Mock service restart - in real implementation, integrate with orchestrator
    const graceful = parameters.graceful || false;
    const timeout = parameters.timeout || 30;
    
    console.log(`Service restart ${graceful ? 'graceful' : 'forced'} with ${timeout}s timeout`);
    
    // Simulate restart time
    await this.sleep(Math.random() * 5000 + 2000);
    
    // Mock success rate
    return Math.random() > 0.15; // 85% success rate
  }

  private async scaleResources(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Scaling resources for: ${errorEvent.component}`);
    
    const direction = parameters.direction || 'out';
    const increment = parameters.increment || 1;
    const maxInstances = parameters.maxInstances || 10;
    
    console.log(`Scaling ${direction} by ${increment} instances (max: ${maxInstances})`);
    
    // Emit scaling request
    this.emit('scaling-requested', {
      component: errorEvent.component,
      direction,
      increment,
      maxInstances,
      reason: `Recovery for error ${errorEvent.id}`
    });
    
    // Simulate scaling time
    await this.sleep(Math.random() * 10000 + 5000);
    
    return Math.random() > 0.1; // 90% success rate
  }

  private async performFailover(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Performing failover for: ${errorEvent.component}`);
    
    const target = parameters.target || 'secondary';
    const verifyIntegrity = parameters.verifyIntegrity || false;
    
    console.log(`Failing over to ${target}, integrity check: ${verifyIntegrity}`);
    
    // Emit failover request
    this.emit('failover-requested', {
      component: errorEvent.component,
      target,
      verifyIntegrity,
      reason: `Recovery for error ${errorEvent.id}`
    });
    
    // Simulate failover time
    await this.sleep(Math.random() * 15000 + 10000);
    
    return Math.random() > 0.05; // 95% success rate
  }

  private async performRollback(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Performing rollback for: ${errorEvent.component}`);
    
    const target = parameters.target || 'previous_stable';
    const verifyHealth = parameters.verifyHealth || true;
    
    console.log(`Rolling back to ${target}, health check: ${verifyHealth}`);
    
    // Emit rollback request
    this.emit('rollback-requested', {
      component: errorEvent.component,
      target,
      verifyHealth,
      reason: `Recovery for error ${errorEvent.id}`
    });
    
    // Simulate rollback time
    await this.sleep(Math.random() * 20000 + 15000);
    
    return Math.random() > 0.02; // 98% success rate
  }

  private async clearCache(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Clearing cache for: ${errorEvent.component}`);
    
    const type = parameters.type || 'all';
    const warmup = parameters.warmup || false;
    
    console.log(`Clearing ${type} cache, warmup: ${warmup}`);
    
    // Emit cache clear request
    this.emit('cache-clear-requested', {
      component: errorEvent.component,
      type,
      warmup,
      reason: `Recovery for error ${errorEvent.id}`
    });
    
    // Simulate cache clear time
    await this.sleep(Math.random() * 3000 + 1000);
    
    return Math.random() > 0.25; // 75% success rate
  }

  private async executeCustomScript(parameters: Record<string, any>, errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Executing custom script for: ${errorEvent.component}`);
    
    const script = parameters.script || 'recovery.sh';
    const args = parameters.args || [];
    
    console.log(`Running script: ${script} with args: ${args.join(' ')}`);
    
    // Emit script execution request
    this.emit('script-execution-requested', {
      component: errorEvent.component,
      script,
      args,
      reason: `Recovery for error ${errorEvent.id}`
    });
    
    // Simulate script execution time
    await this.sleep(Math.random() * 8000 + 2000);
    
    return Math.random() > 0.2; // 80% success rate
  }

  private async verifyRecovery(errorEvent: ErrorEvent): Promise<boolean> {
    console.log(`Verifying recovery for: ${errorEvent.component}`);
    
    // Mock verification - in real implementation, run health checks
    await this.sleep(2000);
    
    // Emit verification request
    this.emit('recovery-verification-requested', {
      component: errorEvent.component,
      errorId: errorEvent.id
    });
    
    // Mock verification success
    return Math.random() > 0.1; // 90% verification success
  }

  private updateStrategySuccessRate(strategy: RecoveryStrategy, success: boolean): void {
    // Update success rate using exponential moving average
    const alpha = 0.1; // Learning rate
    const newRate = success ? 1.0 : 0.0;
    strategy.successRate = strategy.successRate * (1 - alpha) + newRate * alpha;
    
    this.recoveryStrategies.set(strategy.id, strategy);
  }

  private escalateError(errorEvent: ErrorEvent, strategy: RecoveryStrategy): void {
    console.log(`Escalating error: ${errorEvent.id} after ${errorEvent.recoveryAttempts} attempts`);
    
    // Create or update incident
    let incident = Array.from(this.incidents.values()).find(inc => 
      inc.errorEvents.includes(errorEvent.id)
    );
    
    if (!incident) {
      incident = this.createIncident(errorEvent);
    }
    
    // Add escalation event to incident timeline
    incident.timeline.push({
      timestamp: Date.now(),
      type: 'escalated',
      description: `Automatic recovery failed using strategy: ${strategy.name}`,
      data: {
        strategy: strategy.name,
        attempts: errorEvent.recoveryAttempts
      }
    });
    
    // Increase incident priority
    incident.priority = Math.min(10, incident.priority + 1);
    incident.updatedAt = Date.now();
    
    this.incidents.set(incident.id, incident);
    
    this.emit('error-escalated', { errorEvent, incident, strategy });
  }

  private createIncident(errorEvent: ErrorEvent): Incident {
    const incidentId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: Incident = {
      id: incidentId,
      title: `${errorEvent.type.toUpperCase()}: ${errorEvent.message}`,
      description: `Error in ${errorEvent.component}: ${errorEvent.message}`,
      severity: errorEvent.severity,
      status: 'open',
      priority: this.getSeverityPriority(errorEvent.severity),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      affectedServices: [errorEvent.component, ...errorEvent.impact.servicesAffected],
      errorEvents: [errorEvent.id],
      timeline: [
        {
          timestamp: Date.now(),
          type: 'created',
          description: 'Incident created automatically',
          data: { errorId: errorEvent.id }
        }
      ],
      postMortemRequired: errorEvent.severity === 'critical' || errorEvent.impact.dataLoss,
      communicationPlan: []
    };
    
    this.incidents.set(incidentId, incident);
    
    console.log(`Incident created: ${incidentId} for error ${errorEvent.id}`);
    this.emit('incident-created', incident);
    
    return incident;
  }

  private getSeverityPriority(severity: string): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 5;
    }
  }

  private processRecoveries(): void {
    // Check for recurring errors that need attention
    this.detectRecurringErrors();
    
    // Update incident statuses
    this.updateIncidentStatuses();
    
    // Clean up old recovery attempt counters
    this.cleanupRecoveryAttempts();
  }

  private detectRecurringErrors(): void {
    const recentErrors = Array.from(this.errorEvents.values()).filter(
      error => Date.now() - error.timestamp < 3600000 // Last hour
    );
    
    // Group by component and error type
    const errorGroups = new Map<string, ErrorEvent[]>();
    
    recentErrors.forEach(error => {
      const key = `${error.component}-${error.type}-${error.message}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(error);
    });
    
    // Check for recurring patterns
    for (const [key, errors] of errorGroups) {
      if (errors.length >= 5) { // 5 or more similar errors in an hour
        console.log(`Recurring error pattern detected: ${key} (${errors.length} occurrences)`);
        
        // Mark as recurring
        errors.forEach(error => {
          error.status = 'recurring';
          this.errorEvents.set(error.id, error);
        });
        
        this.emit('recurring-error-detected', {
          pattern: key,
          errors: errors,
          count: errors.length
        });
      }
    }
  }

  private updateIncidentStatuses(): void {
    for (const incident of this.incidents.values()) {
      if (incident.status === 'resolved' || incident.status === 'closed') continue;
      
      // Check if all related errors are resolved
      const relatedErrors = incident.errorEvents.map(id => this.errorEvents.get(id)).filter(Boolean);
      const allResolved = relatedErrors.every(error => error!.status === 'resolved');
      
      if (allResolved && incident.status !== 'resolved') {
        incident.status = 'resolved';
        incident.resolvedAt = Date.now();
        incident.updatedAt = Date.now();
        
        incident.timeline.push({
          timestamp: Date.now(),
          type: 'resolved',
          description: 'All related errors have been automatically resolved'
        });
        
        this.incidents.set(incident.id, incident);
        
        console.log(`Incident auto-resolved: ${incident.id}`);
        this.emit('incident-resolved', incident);
      }
    }
  }

  private cleanupRecoveryAttempts(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    for (const [key, timestamp] of this.lastRecoveryAttempts) {
      if (timestamp < cutoffTime) {
        this.lastRecoveryAttempts.delete(key);
        this.recoveryAttempts.delete(key);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getErrorEvents(filters?: {
    type?: ErrorEvent['type'];
    severity?: ErrorEvent['severity'];
    status?: ErrorEvent['status'];
    timeRange?: number;
  }): ErrorEvent[] {
    let events = Array.from(this.errorEvents.values());
    
    if (filters) {
      if (filters.type) {
        events = events.filter(event => event.type === filters.type);
      }
      if (filters.severity) {
        events = events.filter(event => event.severity === filters.severity);
      }
      if (filters.status) {
        events = events.filter(event => event.status === filters.status);
      }
      if (filters.timeRange) {
        const cutoff = Date.now() - filters.timeRange;
        events = events.filter(event => event.timestamp >= cutoff);
      }
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getIncidents(status?: Incident['status']): Incident[] {
    let incidents = Array.from(this.incidents.values());
    
    if (status) {
      incidents = incidents.filter(incident => incident.status === status);
    }
    
    return incidents.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getRecoveryStrategies(): RecoveryStrategy[] {
    return Array.from(this.recoveryStrategies.values());
  }

  public getRecoveryMetrics(): RecoveryMetrics {
    const recentErrors = Array.from(this.errorEvents.values()).filter(
      error => Date.now() - error.timestamp < 86400000 // Last 24 hours
    );
    
    const automaticRecoveries = recentErrors.filter(error => error.status === 'resolved').length;
    const totalRecoveryAttempts = Array.from(this.errorEvents.values())
      .reduce((sum, error) => sum + error.recoveryAttempts, 0);
    
    return {
      totalErrors: this.errorEvents.size,
      errorsLast24h: recentErrors.length,
      automaticRecoveries,
      recoverySuccessRate: totalRecoveryAttempts > 0 ? automaticRecoveries / totalRecoveryAttempts : 0,
      meanTimeToRecovery: 12, // Mock value in minutes
      meanTimeToDetection: 3, // Mock value in minutes
      incidentsCreated: this.incidents.size,
      incidentsResolved: Array.from(this.incidents.values()).filter(inc => inc.status === 'resolved').length,
      recurringErrors: Array.from(this.errorEvents.values()).filter(error => error.status === 'recurring').length,
      escalationsTriggered: Array.from(this.incidents.values()).filter(inc => 
        inc.timeline.some(event => event.type === 'escalated')
      ).length
    };
  }

  public acknowledgeIncident(incidentId: string, acknowledgedBy: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    incident.assignedTo = acknowledgedBy;
    incident.status = 'investigating';
    incident.updatedAt = Date.now();
    
    incident.timeline.push({
      timestamp: Date.now(),
      type: 'updated',
      description: `Incident acknowledged by ${acknowledgedBy}`,
      author: acknowledgedBy
    });
    
    this.incidents.set(incidentId, incident);
    this.emit('incident-acknowledged', incident);
    
    return true;
  }

  public resolveIncident(incidentId: string, resolution: string, resolvedBy: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;
    
    incident.status = 'resolved';
    incident.resolution = resolution;
    incident.resolvedAt = Date.now();
    incident.updatedAt = Date.now();
    
    incident.timeline.push({
      timestamp: Date.now(),
      type: 'resolved',
      description: `Incident resolved: ${resolution}`,
      author: resolvedBy
    });
    
    this.incidents.set(incidentId, incident);
    this.emit('incident-resolved', incident);
    
    return true;
  }

  public addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
    console.log(`Added recovery strategy: ${strategy.name}`);
  }

  public removeRecoveryStrategy(strategyId: string): boolean {
    return this.recoveryStrategies.delete(strategyId);
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }
}

export default ErrorRecoverySystem;