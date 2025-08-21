/**
 * Neuro Learning Development System for System Instructions Protection
 * Monitors, learns from, and prevents various types of violations
 */

class SystemInstructionsProtector {
    constructor(patternsFilePath = '.claude/prod/nld/system-instructions-patterns.json') {
        this.patternsFilePath = patternsFilePath;
        this.patterns = null;
        this.monitoringActive = false;
        this.learningEnabled = true;
        this.alertThreshold = 0.7;
        this.neuralNetwork = new NeuralLearningCore();
        
        this.init();
    }

    async init() {
        await this.loadPatterns();
        this.startMonitoring();
        this.initializeNeuralLearning();
    }

    async loadPatterns() {
        try {
            const fs = require('fs').promises;
            const data = await fs.readFile(this.patternsFilePath, 'utf8');
            this.patterns = JSON.parse(data);
        } catch (error) {
            console.warn('Pattern file not found, initializing empty patterns');
            this.patterns = this.getDefaultPatterns();
        }
    }

    async savePatterns() {
        try {
            const fs = require('fs').promises;
            this.patterns.metadata.last_updated = new Date().toISOString();
            this.patterns.metadata.learning_iterations++;
            await fs.writeFile(this.patternsFilePath, JSON.stringify(this.patterns, null, 2));
        } catch (error) {
            console.error('Failed to save patterns:', error);
        }
    }

    // 1. Access Pattern Violation Detection
    detectAccessPatternViolation(request) {
        const violation = {
            timestamp: new Date().toISOString(),
            type: 'access_pattern_violation',
            source: request.source || 'unknown',
            action: request.action,
            target: request.target,
            severity: this.calculateSeverity(request),
            fingerprint: this.generateFingerprint(request)
        };

        this.patterns.violation_patterns.access_pattern_violations.push(violation);
        this.learnFromViolation(violation);
        this.triggerResponse(violation);
        
        return violation;
    }

    // 2. Modification Attempt Detection
    detectModificationAttempt(attempt) {
        const violation = {
            timestamp: new Date().toISOString(),
            type: 'modification_attempt',
            source: attempt.source,
            target_file: attempt.target,
            attempted_changes: attempt.changes,
            blocked: true,
            severity: 'high',
            fingerprint: this.generateFingerprint(attempt)
        };

        this.patterns.violation_patterns.modification_attempts.push(violation);
        this.learnFromViolation(violation);
        this.enhanceProtection(violation);
        
        return violation;
    }

    // 3. Successful Read Operations Monitoring
    logSuccessfulRead(operation) {
        const log = {
            timestamp: new Date().toISOString(),
            type: 'successful_read',
            source: operation.source,
            target: operation.target,
            access_method: operation.method,
            authorized: this.verifyAuthorization(operation),
            fingerprint: this.generateFingerprint(operation)
        };

        this.patterns.violation_patterns.successful_read_operations.push(log);
        
        // Learn from legitimate patterns
        if (log.authorized) {
            this.reinforcePositivePattern(log);
        }
        
        return log;
    }

    // 4. Protection Breach Attempt Detection
    detectProtectionBreach(breach) {
        const violation = {
            timestamp: new Date().toISOString(),
            type: 'protection_breach_attempt',
            method: breach.method,
            target: breach.target,
            bypass_technique: breach.technique,
            success: false,
            severity: 'critical',
            fingerprint: this.generateFingerprint(breach),
            countermeasures_applied: []
        };

        this.patterns.violation_patterns.protection_breach_attempts.push(violation);
        this.learnFromBreach(violation);
        this.adaptProtection(violation);
        this.alertSecurity(violation);
        
        return violation;
    }

    // 5. System Boundary Violation Detection
    detectSystemBoundaryViolation(violation) {
        const boundaryViolation = {
            timestamp: new Date().toISOString(),
            type: 'system_boundary_violation',
            boundary_type: violation.boundaryType,
            source: violation.source,
            attempted_access: violation.access,
            blocked: true,
            severity: this.calculateBoundarySeverity(violation),
            fingerprint: this.generateFingerprint(violation)
        };

        this.patterns.violation_patterns.system_boundary_violations.push(boundaryViolation);
        this.learnFromBoundaryViolation(boundaryViolation);
        this.strengthenBoundaries(boundaryViolation);
        
        return boundaryViolation;
    }

    // Neural Learning Core
    learnFromViolation(violation) {
        if (!this.learningEnabled) return;

        // Update neural weights based on violation patterns
        this.neuralNetwork.trainPattern(violation);
        
        // Adjust thresholds based on frequency
        this.adaptiveThresholdAdjustment(violation);
        
        // Generate new protection rules
        this.generateDynamicRule(violation);
        
        // Store learned signature
        this.storeLearningSignature(violation);
        
        this.savePatterns();
    }

    adaptiveThresholdAdjustment(violation) {
        const patternType = violation.type;
        const frequency = this.calculatePatternFrequency(violation.fingerprint);
        
        if (frequency > this.patterns.neural_weights.pattern_recognition.frequency_threshold) {
            // Increase sensitivity for frequently occurring patterns
            this.patterns.neural_weights.adaptive_thresholds.violation_sensitivity *= 1.1;
            this.patterns.neural_weights.adaptive_thresholds.protection_strength *= 1.05;
        }
    }

    generateDynamicRule(violation) {
        const rule = {
            id: `dynamic_${Date.now()}`,
            created: new Date().toISOString(),
            pattern: violation.fingerprint,
            action: this.determineOptimalResponse(violation),
            confidence: this.calculateRuleConfidence(violation),
            active: true
        };

        this.patterns.protection_rules.dynamic_rules.push(rule);
        
        // Clean up old low-confidence rules
        this.pruneIneffectiveRules();
    }

    // Advanced Pattern Recognition
    generateFingerprint(data) {
        const crypto = require('crypto');
        const fingerprint = crypto
            .createHash('sha256')
            .update(JSON.stringify({
                type: data.type,
                source: data.source,
                target: data.target,
                action: data.action
            }))
            .digest('hex')
            .substring(0, 16);
            
        return fingerprint;
    }

    calculateSeverity(request) {
        let severity = 'low';
        
        // Check against known attack patterns
        if (this.matchesKnownAttackPattern(request)) {
            severity = 'critical';
        } else if (this.isEscalatedAccess(request)) {
            severity = 'high';
        } else if (this.isSuspiciousPattern(request)) {
            severity = 'medium';
        }
        
        return severity;
    }

    // Real-time Monitoring
    startMonitoring() {
        if (this.monitoringActive) return;
        
        this.monitoringActive = true;
        
        // Monitor file system access
        this.setupFileSystemMonitoring();
        
        // Monitor API calls
        this.setupAPIMonitoring();
        
        // Monitor system calls
        this.setupSystemCallMonitoring();
        
        console.log('NLD System Instructions Protection monitoring started');
    }

    setupFileSystemMonitoring() {
        const fs = require('fs');
        const chokidar = require('chokidar');
        
        // Monitor system instruction files
        const watcher = chokidar.watch('.claude/**/*', {
            persistent: true,
            ignoreInitial: true
        });
        
        watcher.on('all', (event, path) => {
            this.handleFileSystemEvent(event, path);
        });
    }

    handleFileSystemEvent(event, path) {
        if (this.isSystemInstructionFile(path)) {
            const violation = {
                type: 'file_system_access',
                event: event,
                path: path,
                source: this.getProcessInfo(),
                timestamp: new Date().toISOString()
            };
            
            if (event === 'change' || event === 'unlink') {
                this.detectModificationAttempt(violation);
            } else {
                this.logSuccessfulRead(violation);
            }
        }
    }

    // Adaptive Protection Response
    triggerResponse(violation) {
        switch (violation.severity) {
            case 'critical':
                this.emergencyProtocol(violation);
                break;
            case 'high':
                this.elevatedResponse(violation);
                break;
            case 'medium':
                this.standardResponse(violation);
                break;
            case 'low':
                this.logAndMonitor(violation);
                break;
        }
    }

    emergencyProtocol(violation) {
        // Immediate lockdown
        this.activateEmergencyLockdown();
        
        // Alert all systems
        this.broadcastEmergencyAlert(violation);
        
        // Backup critical data
        this.emergencyBackup();
        
        // Isolate threat
        this.isolateThreatSource(violation.source);
    }

    // Learning Feedback Loop
    reinforcePositivePattern(operation) {
        const signature = this.generateFingerprint(operation);
        
        if (this.patterns.learned_signatures[signature]) {
            this.patterns.learned_signatures[signature].positive_reinforcement++;
        } else {
            this.patterns.learned_signatures[signature] = {
                pattern: operation,
                positive_reinforcement: 1,
                negative_reinforcement: 0,
                confidence: 0.8,
                last_seen: new Date().toISOString()
            };
        }
    }

    // Utility Methods
    isSystemInstructionFile(path) {
        const systemPaths = [
            '.claude/dev',
            '.claude/prod', 
            'CLAUDE.md',
            'agent_workspace'
        ];
        
        return systemPaths.some(sysPath => path.includes(sysPath));
    }

    getDefaultPatterns() {
        return {
            metadata: {
                version: '1.0.0',
                created: new Date().toISOString(),
                last_updated: new Date().toISOString(),
                pattern_count: 0,
                learning_iterations: 0,
                protection_level: 'adaptive'
            },
            violation_patterns: {
                access_pattern_violations: [],
                modification_attempts: [],
                successful_read_operations: [],
                protection_breach_attempts: [],
                system_boundary_violations: []
            },
            neural_weights: {
                access_control: {
                    read_weight: 1.0,
                    write_weight: 2.0,
                    modify_weight: 3.0,
                    delete_weight: 4.0
                },
                pattern_recognition: {
                    frequency_threshold: 0.7,
                    severity_multiplier: 1.5,
                    learning_rate: 0.1
                },
                adaptive_thresholds: {
                    violation_sensitivity: 0.8,
                    protection_strength: 0.9,
                    response_time: 100
                }
            },
            learned_signatures: {},
            protection_rules: {
                active_rules: [],
                dynamic_rules: [],
                emergency_protocols: []
            }
        };
    }
}

// Neural Learning Core for pattern recognition
class NeuralLearningCore {
    constructor() {
        this.patterns = new Map();
        this.weights = new Map();
        this.learningRate = 0.1;
    }

    trainPattern(violation) {
        const signature = violation.fingerprint;
        
        if (!this.patterns.has(signature)) {
            this.patterns.set(signature, {
                occurrences: 0,
                severity_sum: 0,
                features: this.extractFeatures(violation),
                last_seen: violation.timestamp
            });
        }
        
        const pattern = this.patterns.get(signature);
        pattern.occurrences++;
        pattern.severity_sum += this.severityToNumber(violation.severity);
        pattern.last_seen = violation.timestamp;
        
        // Update neural weights
        this.updateWeights(signature, violation);
    }

    extractFeatures(violation) {
        return {
            type: violation.type,
            source_entropy: this.calculateEntropy(violation.source),
            target_sensitivity: this.assessTargetSensitivity(violation.target),
            time_pattern: this.extractTimePattern(violation.timestamp),
            frequency: this.calculateFrequency(violation.fingerprint)
        };
    }

    updateWeights(signature, violation) {
        const currentWeight = this.weights.get(signature) || 0;
        const severity = this.severityToNumber(violation.severity);
        const newWeight = currentWeight + (this.learningRate * severity);
        
        this.weights.set(signature, newWeight);
    }

    severityToNumber(severity) {
        const map = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return map[severity] || 1;
    }

    calculateEntropy(data) {
        // Simple entropy calculation for pattern randomness
        const chars = data.split('');
        const freq = {};
        chars.forEach(char => freq[char] = (freq[char] || 0) + 1);
        
        let entropy = 0;
        Object.values(freq).forEach(f => {
            const p = f / chars.length;
            entropy -= p * Math.log2(p);
        });
        
        return entropy;
    }
}

module.exports = { SystemInstructionsProtector, NeuralLearningCore };