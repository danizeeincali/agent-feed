"use strict";
/**
 * Comprehensive Health Monitor with Auto-scaling Integration
 * System health tracking, service monitoring, and automatic scaling triggers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const events_1 = require("events");
class HealthMonitor extends events_1.EventEmitter {
    healthChecks = new Map();
    services = new Map();
    scalingRules = new Map();
    scalingActions = new Map();
    monitoringInterval = null;
    isMonitoring = false;
    currentInstances = 1;
    checkInterval = 30000; // 30 seconds
    constructor() {
        super();
        this.setupDefaultHealthChecks();
        this.setupDefaultScalingRules();
    }
    setupDefaultHealthChecks() {
        // System health checks
        this.addHealthCheck({
            id: 'system-cpu',
            name: 'System CPU Health',
            type: 'system',
            status: 'unknown',
            lastChecked: 0,
            responseTime: 0,
            message: 'Not checked yet'
        });
        this.addHealthCheck({
            id: 'system-memory',
            name: 'System Memory Health',
            type: 'system',
            status: 'unknown',
            lastChecked: 0,
            responseTime: 0,
            message: 'Not checked yet'
        });
        this.addHealthCheck({
            id: 'system-disk',
            name: 'System Disk Health',
            type: 'system',
            status: 'unknown',
            lastChecked: 0,
            responseTime: 0,
            message: 'Not checked yet'
        });
        // Application health checks
        this.addHealthCheck({
            id: 'app-health',
            name: 'Application Health',
            type: 'service',
            status: 'unknown',
            lastChecked: 0,
            responseTime: 0,
            message: 'Not checked yet'
        });
    }
    setupDefaultScalingRules() {
        // CPU-based scaling rules
        this.addScalingRule({
            id: 'cpu-scale-out',
            name: 'Scale Out on High CPU',
            metric: 'cpu_usage',
            threshold: 75,
            operator: 'gt',
            action: 'scale_out',
            cooldown: 300, // 5 minutes
            enabled: true,
            parameters: {
                minInstances: 1,
                maxInstances: 10,
                scaleIncrement: 1,
                targetValue: 60
            }
        });
        this.addScalingRule({
            id: 'cpu-scale-in',
            name: 'Scale In on Low CPU',
            metric: 'cpu_usage',
            threshold: 30,
            operator: 'lt',
            action: 'scale_in',
            cooldown: 600, // 10 minutes
            enabled: true,
            parameters: {
                minInstances: 1,
                maxInstances: 10,
                scaleIncrement: 1,
                targetValue: 60
            }
        });
        // Memory-based scaling rules
        this.addScalingRule({
            id: 'memory-scale-out',
            name: 'Scale Out on High Memory',
            metric: 'memory_usage',
            threshold: 80,
            operator: 'gt',
            action: 'scale_out',
            cooldown: 300,
            enabled: true,
            parameters: {
                minInstances: 1,
                maxInstances: 8,
                scaleIncrement: 1
            }
        });
        // Response time-based scaling
        this.addScalingRule({
            id: 'response-time-scale-out',
            name: 'Scale Out on High Response Time',
            metric: 'response_time',
            threshold: 2000, // 2 seconds
            operator: 'gt',
            action: 'scale_out',
            cooldown: 240, // 4 minutes
            enabled: true,
            parameters: {
                minInstances: 1,
                maxInstances: 15,
                scaleIncrement: 2 // Scale more aggressively for response time
            }
        });
    }
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Health monitoring already started');
            return;
        }
        this.isMonitoring = true;
        console.log(`Starting health monitoring with ${this.checkInterval}ms interval`);
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, this.checkInterval);
        // Initial health check
        this.performHealthChecks();
    }
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('Health monitoring stopped');
    }
    async performHealthChecks() {
        const timestamp = Date.now();
        try {
            // Check all registered health checks
            for (const [id, check] of this.healthChecks) {
                await this.performSingleHealthCheck(id, check);
            }
            // Update service health based on health checks
            this.updateServiceHealth();
            // Emit health status
            this.emit('health-check-complete', {
                timestamp,
                healthChecks: Array.from(this.healthChecks.values()),
                services: Array.from(this.services.values())
            });
        }
        catch (error) {
            console.error('Error during health checks:', error);
            this.emit('health-check-error', error);
        }
    }
    async performSingleHealthCheck(id, check) {
        const startTime = Date.now();
        try {
            let status = 'healthy';
            let message = 'Check passed';
            let details = {};
            switch (check.type) {
                case 'system':
                    ({ status, message, details } = await this.performSystemCheck(check));
                    break;
                case 'service':
                    ({ status, message, details } = await this.performServiceCheck(check));
                    break;
                case 'database':
                    ({ status, message, details } = await this.performDatabaseCheck(check));
                    break;
                case 'external':
                    ({ status, message, details } = await this.performExternalCheck(check));
                    break;
                default:
                    status = 'unknown';
                    message = 'Unknown check type';
            }
            const responseTime = Date.now() - startTime;
            this.healthChecks.set(id, {
                ...check,
                status,
                lastChecked: Date.now(),
                responseTime,
                message,
                details
            });
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            this.healthChecks.set(id, {
                ...check,
                status: 'critical',
                lastChecked: Date.now(),
                responseTime,
                message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                details: { error: error instanceof Error ? error.stack : String(error) }
            });
        }
    }
    async performSystemCheck(check) {
        // This would integrate with actual system monitoring
        // For demonstration, using mock health checks
        if (check.id === 'system-cpu') {
            const cpuUsage = Math.random() * 100; // Mock CPU usage
            return {
                status: cpuUsage > 90 ? 'critical' : cpuUsage > 75 ? 'warning' : 'healthy',
                message: `CPU usage: ${cpuUsage.toFixed(1)}%`,
                details: { cpuUsage }
            };
        }
        if (check.id === 'system-memory') {
            const memoryUsage = Math.random() * 100; // Mock memory usage
            return {
                status: memoryUsage > 95 ? 'critical' : memoryUsage > 85 ? 'warning' : 'healthy',
                message: `Memory usage: ${memoryUsage.toFixed(1)}%`,
                details: { memoryUsage }
            };
        }
        if (check.id === 'system-disk') {
            const diskUsage = Math.random() * 100; // Mock disk usage
            return {
                status: diskUsage > 95 ? 'critical' : diskUsage > 85 ? 'warning' : 'healthy',
                message: `Disk usage: ${diskUsage.toFixed(1)}%`,
                details: { diskUsage }
            };
        }
        return {
            status: 'healthy',
            message: 'System check passed',
            details: {}
        };
    }
    async performServiceCheck(check) {
        // Mock service health check
        const isHealthy = Math.random() > 0.1; // 90% chance of being healthy
        const responseTime = Math.random() * 1000; // Mock response time
        return {
            status: isHealthy ? 'healthy' : 'critical',
            message: isHealthy ? 'Service is responsive' : 'Service is not responding',
            details: {
                responseTime,
                endpoint: '/health',
                statusCode: isHealthy ? 200 : 500
            }
        };
    }
    async performDatabaseCheck(check) {
        // Mock database health check
        const connectionTime = Math.random() * 500; // Mock connection time
        const isConnected = Math.random() > 0.05; // 95% chance of connection success
        return {
            status: isConnected && connectionTime < 200 ? 'healthy' :
                isConnected ? 'warning' : 'critical',
            message: isConnected ?
                `Database connected in ${connectionTime.toFixed(0)}ms` :
                'Database connection failed',
            details: {
                connectionTime,
                connected: isConnected
            }
        };
    }
    async performExternalCheck(check) {
        // Mock external service check
        const latency = Math.random() * 2000; // Mock latency
        const isReachable = Math.random() > 0.02; // 98% chance of being reachable
        return {
            status: isReachable && latency < 1000 ? 'healthy' :
                isReachable ? 'warning' : 'critical',
            message: isReachable ?
                `External service responding in ${latency.toFixed(0)}ms` :
                'External service unreachable',
            details: {
                latency,
                reachable: isReachable
            }
        };
    }
    updateServiceHealth() {
        // Update overall service health based on individual health checks
        const systemChecks = Array.from(this.healthChecks.values()).filter(check => check.type === 'system');
        const serviceChecks = Array.from(this.healthChecks.values()).filter(check => check.type === 'service');
        // Calculate system health score
        const systemHealthScore = this.calculateHealthScore(systemChecks);
        // Update main application service
        const appService = {
            serviceName: 'main-application',
            status: systemHealthScore > 80 ? 'up' : systemHealthScore > 50 ? 'degraded' : 'down',
            uptime: Date.now() - (Date.now() % (24 * 60 * 60 * 1000)), // Mock uptime
            failureCount: systemChecks.filter(check => check.status === 'critical').length,
            healthScore: systemHealthScore,
            dependencies: ['database', 'external-api'],
            endpoints: [
                {
                    url: '/health',
                    method: 'GET',
                    status: systemHealthScore > 50 ? 200 : 500,
                    responseTime: Math.random() * 1000
                }
            ]
        };
        this.services.set('main-application', appService);
    }
    calculateHealthScore(checks) {
        if (checks.length === 0)
            return 100;
        const scores = checks.map(check => {
            switch (check.status) {
                case 'healthy': return 100;
                case 'warning': return 70;
                case 'critical': return 20;
                case 'unknown': return 50;
                default: return 50;
            }
        });
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    processMetrics(metrics) {
        // Check scaling rules based on current metrics
        this.evaluateScalingRules(metrics);
    }
    processBottlenecks(bottlenecks) {
        // Trigger scaling based on detected bottlenecks
        for (const bottleneck of bottlenecks) {
            if (bottleneck.autoFixAvailable && bottleneck.severity === 'critical') {
                this.triggerEmergencyScaling(bottleneck);
            }
        }
    }
    evaluateScalingRules(metrics) {
        const currentTime = Date.now();
        for (const rule of this.scalingRules.values()) {
            if (!rule.enabled)
                continue;
            // Check cooldown period
            if (rule.lastTriggered && (currentTime - rule.lastTriggered) < (rule.cooldown * 1000)) {
                continue;
            }
            const metricValue = this.extractMetricValue(metrics, rule.metric);
            if (metricValue === null)
                continue;
            const shouldTrigger = this.evaluateRuleCondition(metricValue, rule);
            if (shouldTrigger) {
                this.triggerScalingAction(rule, metricValue, 'metric threshold exceeded');
            }
        }
    }
    extractMetricValue(metrics, metricName) {
        switch (metricName) {
            case 'cpu_usage':
                return metrics.cpu.usage;
            case 'memory_usage':
                return (metrics.memory.used / metrics.memory.total) * 100;
            case 'response_time':
                return metrics.application.responseTime;
            case 'error_rate':
                return metrics.application.errorRate;
            case 'queue_length':
                return metrics.application.queueLength;
            default:
                return null;
        }
    }
    evaluateRuleCondition(value, rule) {
        switch (rule.operator) {
            case 'gt': return value > rule.threshold;
            case 'lt': return value < rule.threshold;
            case 'gte': return value >= rule.threshold;
            case 'lte': return value <= rule.threshold;
            default: return false;
        }
    }
    triggerScalingAction(rule, metricValue, reason) {
        const actionId = `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let targetInstances = this.currentInstances;
        switch (rule.action) {
            case 'scale_out':
                targetInstances = Math.min(rule.parameters.maxInstances, this.currentInstances + rule.parameters.scaleIncrement);
                break;
            case 'scale_in':
                targetInstances = Math.max(rule.parameters.minInstances, this.currentInstances - rule.parameters.scaleIncrement);
                break;
            case 'scale_up':
            case 'scale_down':
                // Vertical scaling would be handled differently
                console.log(`Vertical scaling not implemented for rule: ${rule.name}`);
                return;
        }
        if (targetInstances === this.currentInstances) {
            return; // No scaling needed
        }
        const scalingAction = {
            id: actionId,
            ruleId: rule.id,
            action: rule.action,
            reason: `${reason} (${rule.metric}: ${metricValue.toFixed(2)})`,
            timestamp: Date.now(),
            currentInstances: this.currentInstances,
            targetInstances,
            status: 'pending'
        };
        this.scalingActions.set(actionId, scalingAction);
        // Update rule trigger time
        rule.lastTriggered = Date.now();
        // Execute scaling action
        this.executeScalingAction(scalingAction);
        console.log(`Triggered scaling action: ${rule.name} - ${this.currentInstances} -> ${targetInstances} instances`);
        this.emit('scaling-triggered', scalingAction);
    }
    triggerEmergencyScaling(bottleneck) {
        let scaleIncrement = 1;
        // Determine scaling increment based on bottleneck severity
        switch (bottleneck.severity) {
            case 'critical':
                scaleIncrement = 3;
                break;
            case 'high':
                scaleIncrement = 2;
                break;
            default:
                scaleIncrement = 1;
        }
        const targetInstances = Math.min(10, this.currentInstances + scaleIncrement);
        const actionId = `emergency-scaling-${Date.now()}`;
        const scalingAction = {
            id: actionId,
            ruleId: 'emergency',
            action: 'scale_out',
            reason: `Emergency scaling due to ${bottleneck.type} bottleneck: ${bottleneck.description}`,
            timestamp: Date.now(),
            currentInstances: this.currentInstances,
            targetInstances,
            status: 'pending'
        };
        this.scalingActions.set(actionId, scalingAction);
        this.executeScalingAction(scalingAction);
        console.log(`Emergency scaling triggered: ${bottleneck.description}`);
        this.emit('emergency-scaling', scalingAction);
    }
    async executeScalingAction(action) {
        try {
            action.status = 'in_progress';
            this.scalingActions.set(action.id, action);
            // Simulate scaling delay
            await new Promise(resolve => setTimeout(resolve, 5000));
            // In a real implementation, this would trigger actual infrastructure scaling
            // For now, just update the instance count
            this.currentInstances = action.targetInstances;
            action.status = 'completed';
            this.scalingActions.set(action.id, action);
            console.log(`Scaling action completed: ${action.currentInstances} -> ${action.targetInstances} instances`);
            this.emit('scaling-completed', action);
        }
        catch (error) {
            action.status = 'failed';
            action.error = error instanceof Error ? error.message : String(error);
            this.scalingActions.set(action.id, action);
            console.error(`Scaling action failed:`, error);
            this.emit('scaling-failed', action);
        }
    }
    addHealthCheck(check) {
        this.healthChecks.set(check.id, check);
        console.log(`Added health check: ${check.name}`);
    }
    removeHealthCheck(id) {
        const removed = this.healthChecks.delete(id);
        if (removed) {
            console.log(`Removed health check: ${id}`);
        }
        return removed;
    }
    addScalingRule(rule) {
        this.scalingRules.set(rule.id, rule);
        console.log(`Added scaling rule: ${rule.name}`);
    }
    removeScalingRule(id) {
        const removed = this.scalingRules.delete(id);
        if (removed) {
            console.log(`Removed scaling rule: ${id}`);
        }
        return removed;
    }
    enableScalingRule(id) {
        const rule = this.scalingRules.get(id);
        if (rule) {
            rule.enabled = true;
            this.scalingRules.set(id, rule);
            console.log(`Enabled scaling rule: ${rule.name}`);
            return true;
        }
        return false;
    }
    disableScalingRule(id) {
        const rule = this.scalingRules.get(id);
        if (rule) {
            rule.enabled = false;
            this.scalingRules.set(id, rule);
            console.log(`Disabled scaling rule: ${rule.name}`);
            return true;
        }
        return false;
    }
    getHealthChecks() {
        return Array.from(this.healthChecks.values());
    }
    getServices() {
        return Array.from(this.services.values());
    }
    getScalingRules() {
        return Array.from(this.scalingRules.values());
    }
    getScalingActions() {
        return Array.from(this.scalingActions.values());
    }
    getCurrentInstances() {
        return this.currentInstances;
    }
    isActive() {
        return this.isMonitoring;
    }
    getOverallHealth() {
        const allChecks = Array.from(this.healthChecks.values());
        const score = this.calculateHealthScore(allChecks);
        let status;
        let summary;
        if (score >= 90) {
            status = 'healthy';
            summary = 'All systems operating normally';
        }
        else if (score >= 70) {
            status = 'warning';
            summary = 'Some systems experiencing issues';
        }
        else {
            status = 'critical';
            summary = 'Critical systems affected';
        }
        return { status, score, summary };
    }
}
exports.HealthMonitor = HealthMonitor;
exports.default = HealthMonitor;
//# sourceMappingURL=health-monitor.js.map