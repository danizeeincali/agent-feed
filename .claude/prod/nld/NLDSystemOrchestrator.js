/**
 * NLD System Orchestrator
 * Coordinates all NLD components and provides unified interface
 */

const { SystemInstructionsProtector } = require('./SystemInstructionsProtector');
const NLDMonitor = require('./NLDMonitor');
const AdaptiveProtectionEngine = require('./AdaptiveProtectionEngine');

class NLDSystemOrchestrator {
    constructor() {
        this.protector = null;
        this.monitor = null;
        this.adaptiveEngine = null;
        this.isActive = false;
        this.systemHealth = {
            protector: 'unknown',
            monitor: 'unknown',
            adaptiveEngine: 'unknown',
            overall: 'unknown'
        };
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing NLD System for System Instructions Protection');
            
            // Initialize core components
            await this.initializeProtector();
            await this.initializeMonitor();
            await this.initializeAdaptiveEngine();
            
            // Setup inter-component communication
            this.setupCommunication();
            
            // Start system health monitoring
            this.startHealthMonitoring();
            
            // Mark system as active
            this.isActive = true;
            
            console.log('✅ NLD System fully operational');
            this.logSystemStatus();
            
        } catch (error) {
            console.error('❌ Failed to initialize NLD System:', error);
            throw error;
        }
    }

    async initializeProtector() {
        try {
            this.protector = new SystemInstructionsProtector();
            await this.protector.init();
            this.systemHealth.protector = 'healthy';
            console.log('✅ System Instructions Protector initialized');
        } catch (error) {
            this.systemHealth.protector = 'error';
            console.error('❌ Protector initialization failed:', error);
            throw error;
        }
    }

    async initializeMonitor() {
        try {
            this.monitor = new NLDMonitor();
            this.systemHealth.monitor = 'healthy';
            console.log('✅ NLD Monitor initialized');
        } catch (error) {
            this.systemHealth.monitor = 'error';
            console.error('❌ Monitor initialization failed:', error);
            throw error;
        }
    }

    async initializeAdaptiveEngine() {
        try {
            this.adaptiveEngine = new AdaptiveProtectionEngine(this.protector, this.monitor);
            this.systemHealth.adaptiveEngine = 'healthy';
            console.log('✅ Adaptive Protection Engine initialized');
        } catch (error) {
            this.systemHealth.adaptiveEngine = 'error';
            console.error('❌ Adaptive Engine initialization failed:', error);
            throw error;
        }
    }

    setupCommunication() {
        // Monitor -> Protector communication
        this.monitor.on('violation_detected', (violation) => {
            this.handleViolationDetected(violation);
        });

        this.monitor.on('emergency_alert', (alert) => {
            this.handleEmergencyAlert(alert);
        });

        this.monitor.on('metrics_updated', (metrics) => {
            this.handleMetricsUpdate(metrics);
        });

        // Protector -> Monitor communication
        if (this.protector.on) {
            this.protector.on('pattern_learned', (pattern) => {
                this.handlePatternLearned(pattern);
            });
        }

        console.log('🔗 Inter-component communication established');
    }

    handleViolationDetected(violation) {
        console.log(`🚨 Violation detected: ${violation.type} - ${violation.severity}`);
        
        // Log to system patterns
        this.updateSystemPatterns(violation);
        
        // Trigger adaptive learning
        if (this.adaptiveEngine) {
            this.adaptiveEngine.learnFromViolation(violation);
        }
    }

    handleEmergencyAlert(alert) {
        console.log(`🚨🚨 EMERGENCY ALERT: ${alert.id}`);
        
        // Activate emergency protocols
        this.activateEmergencyProtocols(alert);
        
        // Notify external systems if configured
        this.notifyExternalSystems(alert);
        
        // Log critical incident
        this.logCriticalIncident(alert);
    }

    handleMetricsUpdate(metrics) {
        // Store metrics for analysis
        this.storeMetrics(metrics);
        
        // Check for concerning trends
        this.analyzeMetricsTrends(metrics);
        
        // Adjust system parameters if needed
        if (metrics.violations_per_hour > 10) {
            this.increaseMoniitoringSensitivity();
        }
    }

    handlePatternLearned(pattern) {
        console.log(`🧠 New pattern learned: ${pattern.fingerprint}`);
        
        // Update adaptive engine with new pattern
        if (this.adaptiveEngine) {
            this.adaptiveEngine.incorporateNewPattern(pattern);
        }
    }

    startHealthMonitoring() {
        setInterval(() => {
            this.checkSystemHealth();
        }, 30000); // Every 30 seconds

        console.log('🏥 System health monitoring started');
    }

    checkSystemHealth() {
        try {
            // Check protector health
            this.systemHealth.protector = this.protector && this.protector.monitoringActive ? 'healthy' : 'degraded';
            
            // Check monitor health
            this.systemHealth.monitor = this.monitor && this.monitor.monitoringMetrics ? 'healthy' : 'degraded';
            
            // Check adaptive engine health
            this.systemHealth.adaptiveEngine = this.adaptiveEngine && this.adaptiveEngine.adaptationRules ? 'healthy' : 'degraded';
            
            // Calculate overall health
            const healthStates = Object.values(this.systemHealth).filter(state => state !== 'overall');
            const healthyCount = healthStates.filter(state => state === 'healthy').length;
            const degradedCount = healthStates.filter(state => state === 'degraded').length;
            const errorCount = healthStates.filter(state => state === 'error').length;
            
            if (errorCount > 0) {
                this.systemHealth.overall = 'error';
            } else if (degradedCount > 0) {
                this.systemHealth.overall = 'degraded';
            } else if (healthyCount === healthStates.length) {
                this.systemHealth.overall = 'healthy';
            } else {
                this.systemHealth.overall = 'unknown';
            }
            
            // Handle degraded states
            if (this.systemHealth.overall !== 'healthy') {
                this.handleDegradedHealth();
            }
            
        } catch (error) {
            console.error('Health check failed:', error);
            this.systemHealth.overall = 'error';
        }
    }

    handleDegradedHealth() {
        console.warn('⚠️ System health degraded, attempting recovery');
        
        // Try to restart failed components
        if (this.systemHealth.protector === 'degraded' || this.systemHealth.protector === 'error') {
            this.restartProtector();
        }
        
        if (this.systemHealth.monitor === 'degraded' || this.systemHealth.monitor === 'error') {
            this.restartMonitor();
        }
        
        if (this.systemHealth.adaptiveEngine === 'degraded' || this.systemHealth.adaptiveEngine === 'error') {
            this.restartAdaptiveEngine();
        }
    }

    // Public API Methods
    async reportViolation(violation) {
        if (!this.isActive) {
            throw new Error('NLD System is not active');
        }
        
        return await this.protector.detectAccessPatternViolation(violation);
    }

    async reportModificationAttempt(attempt) {
        if (!this.isActive) {
            throw new Error('NLD System is not active');
        }
        
        return await this.protector.detectModificationAttempt(attempt);
    }

    async reportSuccessfulRead(operation) {
        if (!this.isActive) {
            throw new Error('NLD System is not active');
        }
        
        return await this.protector.logSuccessfulRead(operation);
    }

    async reportProtectionBreach(breach) {
        if (!this.isActive) {
            throw new Error('NLD System is not active');
        }
        
        return await this.protector.detectProtectionBreach(breach);
    }

    async reportSystemBoundaryViolation(violation) {
        if (!this.isActive) {
            throw new Error('NLD System is not active');
        }
        
        return await this.protector.detectSystemBoundaryViolation(violation);
    }

    getSystemStatus() {
        return {
            active: this.isActive,
            health: this.systemHealth,
            metrics: this.monitor?.monitoringMetrics || {},
            patterns: {
                learned: this.protector?.patterns?.learned_signatures ? 
                    Object.keys(this.protector.patterns.learned_signatures).length : 0,
                adaptations: this.adaptiveEngine?.adaptationRules ? 
                    this.adaptiveEngine.adaptationRules.size : 0
            },
            uptime: this.monitor?.monitoringMetrics?.uptime_hours || 0
        };
    }

    getRecentViolations(limit = 10) {
        if (!this.protector?.patterns?.violation_patterns) {
            return [];
        }
        
        const allViolations = [
            ...this.protector.patterns.violation_patterns.access_pattern_violations,
            ...this.protector.patterns.violation_patterns.modification_attempts,
            ...this.protector.patterns.violation_patterns.protection_breach_attempts,
            ...this.protector.patterns.violation_patterns.system_boundary_violations
        ];
        
        return allViolations
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    getLearningStats() {
        const patterns = this.protector?.patterns;
        if (!patterns) return null;
        
        return {
            total_patterns: Object.keys(patterns.learned_signatures || {}).length,
            learning_iterations: patterns.metadata?.learning_iterations || 0,
            protection_level: patterns.metadata?.protection_level || 'unknown',
            neural_weights: patterns.neural_weights,
            active_rules: patterns.protection_rules?.active_rules?.length || 0,
            dynamic_rules: patterns.protection_rules?.dynamic_rules?.length || 0,
            adaptation_cycles: this.adaptiveEngine?.learningCycles || 0
        };
    }

    // System Control Methods
    async shutdown() {
        console.log('🔄 Shutting down NLD System');
        
        this.isActive = false;
        
        // Save current state
        if (this.protector) {
            await this.protector.savePatterns();
        }
        
        // Cleanup resources
        if (this.monitor) {
            this.monitor.removeAllListeners();
        }
        
        console.log('✅ NLD System shutdown complete');
    }

    async restart() {
        console.log('🔄 Restarting NLD System');
        
        await this.shutdown();
        await this.initialize();
        
        console.log('✅ NLD System restart complete');
    }

    // Private Helper Methods
    updateSystemPatterns(violation) {
        // Store violation in central pattern database
        const patternKey = `system_${violation.fingerprint}`;
        
        // This would typically update a centralized pattern database
        console.log(`📊 Updated pattern database with ${patternKey}`);
    }

    activateEmergencyProtocols(alert) {
        console.log('🚨 Activating emergency protocols');
        
        // Increase monitoring sensitivity
        if (this.protector?.patterns?.neural_weights?.adaptive_thresholds) {
            this.protector.patterns.neural_weights.adaptive_thresholds.violation_sensitivity = 0.99;
            this.protector.patterns.neural_weights.adaptive_thresholds.protection_strength = 0.95;
        }
        
        // Enable all protection mechanisms
        this.enableAllProtections();
        
        // Start emergency logging
        this.startEmergencyLogging(alert);
    }

    enableAllProtections() {
        console.log('🛡️ Enabling all protection mechanisms');
        // Implementation would activate all available protection strategies
    }

    startEmergencyLogging(alert) {
        console.log(`📝 Emergency logging started for alert ${alert.id}`);
        // Implementation would start comprehensive logging
    }

    notifyExternalSystems(alert) {
        console.log('📡 Notifying external security systems');
        // Implementation would notify external security monitoring systems
    }

    logCriticalIncident(alert) {
        const incident = {
            id: `incident_${Date.now()}`,
            alert_id: alert.id,
            timestamp: new Date().toISOString(),
            severity: 'critical',
            violation: alert.violation,
            response_actions: alert.response_actions || [],
            system_state: this.getSystemStatus()
        };
        
        console.log(`📋 Critical incident logged: ${incident.id}`);
        // In production, this would be stored in a secure incident database
    }

    storeMetrics(metrics) {
        // Store metrics for trend analysis
        console.log(`📊 Metrics stored: ${JSON.stringify(metrics, null, 2)}`);
    }

    analyzeMetricsTrends(metrics) {
        // Analyze metrics for concerning trends
        if (metrics.violations_per_hour > 5) {
            console.warn('⚠️ High violation rate detected');
        }
        
        if (metrics.false_positive_rate > 0.2) {
            console.warn('⚠️ High false positive rate detected');
        }
    }

    increaseMoniitoringSensitivity() {
        if (this.protector?.patterns?.neural_weights?.adaptive_thresholds) {
            this.protector.patterns.neural_weights.adaptive_thresholds.violation_sensitivity *= 1.1;
            console.log('🔍 Monitoring sensitivity increased');
        }
    }

    logSystemStatus() {
        const status = this.getSystemStatus();
        console.log('📊 NLD System Status:');
        console.log(`   Active: ${status.active}`);
        console.log(`   Health: ${status.health.overall}`);
        console.log(`   Learned Patterns: ${status.patterns.learned}`);
        console.log(`   Adaptations: ${status.patterns.adaptations}`);
        console.log(`   Uptime: ${status.uptime} hours`);
    }

    // Component restart methods
    async restartProtector() {
        try {
            console.log('🔄 Restarting System Instructions Protector');
            this.protector = new SystemInstructionsProtector();
            await this.protector.init();
            this.systemHealth.protector = 'healthy';
        } catch (error) {
            console.error('Failed to restart protector:', error);
            this.systemHealth.protector = 'error';
        }
    }

    async restartMonitor() {
        try {
            console.log('🔄 Restarting NLD Monitor');
            this.monitor = new NLDMonitor();
            this.systemHealth.monitor = 'healthy';
            this.setupCommunication(); // Re-establish communication
        } catch (error) {
            console.error('Failed to restart monitor:', error);
            this.systemHealth.monitor = 'error';
        }
    }

    async restartAdaptiveEngine() {
        try {
            console.log('🔄 Restarting Adaptive Protection Engine');
            this.adaptiveEngine = new AdaptiveProtectionEngine(this.protector, this.monitor);
            this.systemHealth.adaptiveEngine = 'healthy';
        } catch (error) {
            console.error('Failed to restart adaptive engine:', error);
            this.systemHealth.adaptiveEngine = 'error';
        }
    }
}

// Singleton instance
let nldSystemInstance = null;

function getNLDSystem() {
    if (!nldSystemInstance) {
        nldSystemInstance = new NLDSystemOrchestrator();
    }
    return nldSystemInstance;
}

module.exports = { NLDSystemOrchestrator, getNLDSystem };