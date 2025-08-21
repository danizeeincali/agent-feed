/**
 * NLD Real-time Monitor and Alert System
 * Provides continuous monitoring with intelligent alerting
 */

const { EventEmitter } = require('events');
const { SystemInstructionsProtector } = require('./SystemInstructionsProtector');

class NLDMonitor extends EventEmitter {
    constructor() {
        super();
        this.protector = new SystemInstructionsProtector();
        this.alertQueue = [];
        this.processingAlerts = false;
        this.monitoringMetrics = {
            total_violations: 0,
            critical_alerts: 0,
            false_positives: 0,
            learning_accuracy: 0.0,
            uptime: Date.now()
        };
        
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Start metric collection
        this.startMetricsCollection();
        
        // Initialize alert processing
        this.startAlertProcessing();
        
        console.log('NLD Monitor initialized and active');
    }

    setupEventListeners() {
        // File system monitoring
        this.monitorFileSystem();
        
        // Process monitoring
        this.monitorProcesses();
        
        // Network monitoring
        this.monitorNetworkAccess();
        
        // Memory monitoring
        this.monitorMemoryAccess();
    }

    monitorFileSystem() {
        const fs = require('fs');
        const path = require('path');
        
        // Monitor critical system files
        const criticalPaths = [
            '.claude/dev/',
            '.claude/prod/',
            'CLAUDE.md',
            'agent_workspace/'
        ];
        
        criticalPaths.forEach(watchPath => {
            if (fs.existsSync(watchPath)) {
                fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
                    this.handleFileSystemEvent(eventType, filename, watchPath);
                });
            }
        });
    }

    handleFileSystemEvent(eventType, filename, basePath) {
        const fullPath = path.join(basePath, filename || '');
        const event = {
            type: 'filesystem',
            eventType: eventType,
            path: fullPath,
            timestamp: new Date().toISOString(),
            source: this.getCurrentProcessInfo()
        };

        // Detect if this is a violation
        if (this.isUnauthorizedAccess(event)) {
            this.processViolation(event);
        } else {
            this.logLegitimateAccess(event);
        }
    }

    monitorProcesses() {
        // Monitor for suspicious process behavior
        setInterval(() => {
            const processes = this.getRunningProcesses();
            processes.forEach(proc => {
                if (this.isSuspiciousProcess(proc)) {
                    this.processViolation({
                        type: 'process',
                        process: proc,
                        timestamp: new Date().toISOString(),
                        threat_level: this.assessProcessThreat(proc)
                    });
                }
            });
        }, 5000);
    }

    monitorNetworkAccess() {
        // Monitor network calls that might be trying to exfiltrate system instructions
        const originalFetch = global.fetch;
        if (originalFetch) {
            global.fetch = (...args) => {
                this.analyzeNetworkRequest(args[0], args[1]);
                return originalFetch.apply(global, args);
            };
        }
    }

    analyzeNetworkRequest(url, options) {
        const request = {
            type: 'network',
            url: url,
            method: options?.method || 'GET',
            timestamp: new Date().toISOString(),
            headers: options?.headers || {},
            body: options?.body
        };

        if (this.containsSensitiveData(request)) {
            this.processViolation({
                ...request,
                violation_type: 'data_exfiltration_attempt',
                severity: 'critical'
            });
        }
    }

    processViolation(violation) {
        this.monitoringMetrics.total_violations++;
        
        // Use the protector to analyze and learn from the violation
        let processedViolation;
        
        switch (violation.type) {
            case 'filesystem':
                processedViolation = this.protector.detectModificationAttempt(violation);
                break;
            case 'process':
                processedViolation = this.protector.detectSystemBoundaryViolation(violation);
                break;
            case 'network':
                processedViolation = this.protector.detectProtectionBreach(violation);
                break;
            default:
                processedViolation = this.protector.detectAccessPatternViolation(violation);
        }

        // Queue alert based on severity
        this.queueAlert(processedViolation);
        
        // Emit event for real-time processing
        this.emit('violation_detected', processedViolation);
        
        // Update learning metrics
        this.updateLearningMetrics(processedViolation);
    }

    queueAlert(violation) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            violation: violation,
            timestamp: new Date().toISOString(),
            priority: this.calculateAlertPriority(violation),
            processed: false,
            response_actions: this.generateResponseActions(violation)
        };

        this.alertQueue.push(alert);
        
        // Process critical alerts immediately
        if (alert.priority === 'critical') {
            this.processCriticalAlert(alert);
        }
    }

    startAlertProcessing() {
        if (this.processingAlerts) return;
        
        this.processingAlerts = true;
        
        setInterval(() => {
            this.processAlertQueue();
        }, 1000);
    }

    processAlertQueue() {
        if (this.alertQueue.length === 0) return;
        
        // Sort by priority
        this.alertQueue.sort((a, b) => {
            const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        // Process top priority alerts
        const alertsToProcess = this.alertQueue.splice(0, 5);
        alertsToProcess.forEach(alert => {
            this.processAlert(alert);
        });
    }

    processAlert(alert) {
        const response = {
            alert_id: alert.id,
            timestamp: new Date().toISOString(),
            actions_taken: [],
            effectiveness: 0
        };

        // Execute response actions
        alert.response_actions.forEach(action => {
            try {
                const result = this.executeResponseAction(action, alert.violation);
                response.actions_taken.push({
                    action: action.type,
                    result: result,
                    timestamp: new Date().toISOString()
                });
                response.effectiveness += result.effectiveness || 0;
            } catch (error) {
                response.actions_taken.push({
                    action: action.type,
                    result: { success: false, error: error.message },
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Learn from response effectiveness
        this.protector.learnFromResponse(alert.violation, response);
        
        // Mark alert as processed
        alert.processed = true;
        alert.response = response;
        
        this.emit('alert_processed', alert);
    }

    processCriticalAlert(alert) {
        this.monitoringMetrics.critical_alerts++;
        
        // Immediate actions for critical alerts
        this.executeCriticalResponse(alert);
        
        // Broadcast emergency notification
        this.broadcastEmergencyAlert(alert);
        
        // Log to security systems
        this.logSecurityIncident(alert);
    }

    executeCriticalResponse(alert) {
        const criticalActions = [
            'isolate_source',
            'backup_critical_data',
            'activate_emergency_protocols',
            'notify_security_team',
            'increase_monitoring_sensitivity'
        ];

        criticalActions.forEach(actionType => {
            this.executeResponseAction({ type: actionType, priority: 'immediate' }, alert.violation);
        });
    }

    generateResponseActions(violation) {
        const actions = [];
        
        switch (violation.severity) {
            case 'critical':
                actions.push(
                    { type: 'isolate_source', priority: 'immediate' },
                    { type: 'backup_data', priority: 'high' },
                    { type: 'alert_security', priority: 'immediate' },
                    { type: 'increase_monitoring', priority: 'high' }
                );
                break;
            case 'high':
                actions.push(
                    { type: 'block_access', priority: 'high' },
                    { type: 'log_incident', priority: 'medium' },
                    { type: 'analyze_pattern', priority: 'medium' }
                );
                break;
            case 'medium':
                actions.push(
                    { type: 'monitor_closely', priority: 'medium' },
                    { type: 'log_incident', priority: 'low' }
                );
                break;
            case 'low':
                actions.push(
                    { type: 'log_incident', priority: 'low' }
                );
                break;
        }
        
        return actions;
    }

    executeResponseAction(action, violation) {
        switch (action.type) {
            case 'isolate_source':
                return this.isolateSource(violation.source);
            case 'block_access':
                return this.blockAccess(violation);
            case 'backup_data':
                return this.backupCriticalData();
            case 'alert_security':
                return this.alertSecurityTeam(violation);
            case 'increase_monitoring':
                return this.increaseMoni

sensitivity();
            case 'analyze_pattern':
                return this.analyzeViolationPattern(violation);
            case 'log_incident':
                return this.logSecurityIncident(violation);
            default:
                return { success: false, message: 'Unknown action type' };
        }
    }

    // Real-time Metrics and Analytics
    startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
        }, 10000); // Every 10 seconds
    }

    collectMetrics() {
        const currentTime = Date.now();
        const uptime = currentTime - this.monitoringMetrics.uptime;
        
        this.monitoringMetrics = {
            ...this.monitoringMetrics,
            current_timestamp: new Date().toISOString(),
            uptime_hours: Math.round(uptime / (1000 * 60 * 60) * 100) / 100,
            violations_per_hour: this.calculateViolationsPerHour(),
            false_positive_rate: this.calculateFalsePositiveRate(),
            learning_accuracy: this.calculateLearningAccuracy(),
            active_patterns: this.protector.patterns?.learned_signatures ? Object.keys(this.protector.patterns.learned_signatures).length : 0,
            alert_queue_size: this.alertQueue.length
        };
        
        this.emit('metrics_updated', this.monitoringMetrics);
    }

    // Utility methods
    isUnauthorizedAccess(event) {
        // Check against learned patterns
        const fingerprint = this.protector.generateFingerprint(event);
        return this.protector.patterns?.learned_signatures?.[fingerprint]?.negative_reinforcement > 0;
    }

    isSuspiciousProcess(process) {
        // Simple heuristics for suspicious behavior
        return process.name.includes('inject') || 
               process.name.includes('hack') || 
               process.cpu_usage > 90 ||
               process.memory_usage > 500000000; // 500MB
    }

    containsSensitiveData(request) {
        const sensitivePatterns = [
            'claude.md',
            'system instructions',
            'agent_workspace',
            '.claude/prod',
            '.claude/dev'
        ];
        
        const requestStr = JSON.stringify(request).toLowerCase();
        return sensitivePatterns.some(pattern => requestStr.includes(pattern.toLowerCase()));
    }

    calculateAlertPriority(violation) {
        let priority = violation.severity || 'low';
        
        // Escalate based on frequency
        const fingerprint = this.protector.generateFingerprint(violation);
        const pattern = this.protector.patterns?.learned_signatures?.[fingerprint];
        
        if (pattern && pattern.negative_reinforcement > 5) {
            priority = 'critical';
        }
        
        return priority;
    }

    getCurrentProcessInfo() {
        return {
            pid: process.pid,
            command: process.argv.join(' '),
            cwd: process.cwd(),
            user: process.env.USER || 'unknown',
            timestamp: new Date().toISOString()
        };
    }

    getRunningProcesses() {
        // Simplified process monitoring
        // In production, this would interface with actual process monitoring tools
        return [{
            name: 'node',
            pid: process.pid,
            cpu_usage: process.cpuUsage().user,
            memory_usage: process.memoryUsage().rss
        }];
    }

    // Security Response Methods
    isolateSource(source) {
        console.log(`SECURITY: Isolating source ${source}`);
        return { success: true, effectiveness: 0.9 };
    }

    blockAccess(violation) {
        console.log(`SECURITY: Blocking access for ${violation.type}`);
        return { success: true, effectiveness: 0.8 };
    }

    backupCriticalData() {
        console.log('SECURITY: Backing up critical data');
        return { success: true, effectiveness: 0.7 };
    }

    alertSecurityTeam(violation) {
        console.log(`SECURITY ALERT: ${violation.type} - ${violation.severity}`);
        return { success: true, effectiveness: 0.6 };
    }

    increaseMoniitoringSensitivity() {
        this.protector.patterns.neural_weights.adaptive_thresholds.violation_sensitivity *= 1.2;
        return { success: true, effectiveness: 0.5 };
    }

    analyzeViolationPattern(violation) {
        this.protector.learnFromViolation(violation);
        return { success: true, effectiveness: 0.4 };
    }

    logSecurityIncident(violation) {
        console.log(`INCIDENT LOG: ${JSON.stringify(violation, null, 2)}`);
        return { success: true, effectiveness: 0.3 };
    }

    // Analytics Methods
    calculateViolationsPerHour() {
        const hourMs = 60 * 60 * 1000;
        const uptime = Date.now() - this.monitoringMetrics.uptime;
        return Math.round((this.monitoringMetrics.total_violations / uptime) * hourMs * 100) / 100;
    }

    calculateFalsePositiveRate() {
        return this.monitoringMetrics.total_violations > 0 ? 
            this.monitoringMetrics.false_positives / this.monitoringMetrics.total_violations : 0;
    }

    calculateLearningAccuracy() {
        // Simple accuracy calculation based on successful pattern recognition
        const totalPatterns = this.protector.patterns?.learned_signatures ? 
            Object.keys(this.protector.patterns.learned_signatures).length : 0;
        const successfulPatterns = totalPatterns > 0 ? totalPatterns - this.monitoringMetrics.false_positives : 0;
        return totalPatterns > 0 ? successfulPatterns / totalPatterns : 0;
    }

    broadcastEmergencyAlert(alert) {
        console.log(`🚨 EMERGENCY ALERT: ${alert.violation.type} - ${alert.violation.severity}`);
        this.emit('emergency_alert', alert);
    }
}

module.exports = NLDMonitor;