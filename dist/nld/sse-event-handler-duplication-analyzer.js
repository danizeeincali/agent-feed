"use strict";
/**
 * SSE Event Handler Duplication Analyzer
 * Analyzes frontend SSE event handler registration patterns
 * Part of NLD (Neuro-Learning Development) system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEEventHandlerDuplicationAnalyzer = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class SSEEventHandlerDuplicationAnalyzer extends events_1.EventEmitter {
    registrations = new Map();
    detectedPatterns = [];
    eventSourceLeakages = [];
    patternStorage;
    duplicateThreshold = 3;
    timeWindowMs = 30000; // 30 seconds
    constructor(storageDir) {
        super();
        this.patternStorage = (0, path_1.join)(storageDir, 'sse-handler-duplication-patterns.json');
        this.loadExistingPatterns();
        this.setupCleanupInterval();
        console.log('🔍 SSE Event Handler Duplication Analyzer initialized');
    }
    /**
     * Record event handler registration
     */
    recordEventHandlerRegistration(handlerFunction, instanceId, eventType, callStack, componentName, hookName) {
        const registration = {
            handlerFunction,
            instanceId,
            eventType,
            registeredAt: new Date().toISOString(),
            callStack,
            componentName,
            hookName
        };
        const key = `${handlerFunction}-${eventType}`;
        if (!this.registrations.has(key)) {
            this.registrations.set(key, []);
        }
        this.registrations.get(key).push(registration);
        // Check for immediate duplications
        this.analyzeDuplicationPattern(key);
    }
    /**
     * Record EventSource creation
     */
    recordEventSourceCreation(instanceId, url) {
        // Check for existing connections to the same URL for the same instance
        const existingConnections = this.eventSourceLeakages.filter(leak => leak.instanceId === instanceId &&
            leak.eventSourceUrl === url &&
            leak.connectionState !== 'closed');
        if (existingConnections.length > 0) {
            const leakage = {
                patternId: `eventsource-leak-${instanceId}-${Date.now()}`,
                instanceId,
                eventSourceUrl: url,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                connectionState: 'open',
                leakageType: 'zombie_connection'
            };
            this.eventSourceLeakages.push(leakage);
            console.warn(`🧟 EventSource Zombie Connection: Multiple connections to ${url} for instance ${instanceId}`);
        }
    }
    /**
     * Record EventSource cleanup
     */
    recordEventSourceCleanup(instanceId, url, success) {
        const leakages = this.eventSourceLeakages.filter(leak => leak.instanceId === instanceId && leak.eventSourceUrl === url);
        leakages.forEach(leakage => {
            if (success) {
                leakage.connectionState = 'closed';
            }
            else {
                leakage.leakageType = 'cleanup_failure';
                console.warn(`🧟 EventSource Cleanup Failure: Failed to close connection to ${url}`);
            }
        });
    }
    /**
     * Analyze duplication patterns for a handler/event combination
     */
    analyzeDuplicationPattern(key) {
        const registrations = this.registrations.get(key);
        // Group by instance ID
        const instanceGroups = new Map();
        registrations.forEach(reg => {
            if (!instanceGroups.has(reg.instanceId)) {
                instanceGroups.set(reg.instanceId, []);
            }
            instanceGroups.get(reg.instanceId).push(reg);
        });
        // Find instances with duplicate registrations
        const duplicateInstances = [];
        let totalRegistrations = 0;
        instanceGroups.forEach((regs, instanceId) => {
            totalRegistrations += regs.length;
            if (regs.length >= this.duplicateThreshold) {
                duplicateInstances.push(instanceId);
            }
        });
        if (duplicateInstances.length > 0) {
            const firstReg = registrations[0];
            const lastReg = registrations[registrations.length - 1];
            const timeWindow = new Date(lastReg.registeredAt).getTime() -
                new Date(firstReg.registeredAt).getTime();
            const pattern = {
                patternId: `handler-dup-${key}-${Date.now()}`,
                handlerFunction: firstReg.handlerFunction,
                eventType: firstReg.eventType,
                totalRegistrations,
                duplicateInstances,
                timeWindow,
                detectedAt: new Date().toISOString(),
                severity: this.calculateSeverity(totalRegistrations),
                antiPattern: this.identifyAntiPattern(registrations),
                rootCause: this.analyzeRootCause(registrations),
                technicalDetails: {
                    componentRenders: this.countComponentRenders(registrations),
                    hookExecutions: this.countHookExecutions(registrations),
                    eventSourceCreations: this.countEventSourceCreations(registrations),
                    cleanupFailures: this.countCleanupFailures(registrations)
                }
            };
            this.recordPattern(pattern);
            console.warn(`🔄 SSE Handler Duplication: ${firstReg.handlerFunction} registered ${totalRegistrations} times across ${duplicateInstances.length} instances`);
        }
    }
    /**
     * Calculate severity based on registration count
     */
    calculateSeverity(totalRegistrations) {
        if (totalRegistrations >= 50)
            return 'critical';
        if (totalRegistrations >= 20)
            return 'high';
        if (totalRegistrations >= 10)
            return 'medium';
        return 'low';
    }
    /**
     * Identify the specific anti-pattern
     */
    identifyAntiPattern(registrations) {
        // Analyze call stacks to identify patterns
        const callStacks = registrations.map(r => r.callStack);
        const uniqueStacks = new Set(callStacks).size;
        if (uniqueStacks === 1) {
            return 'SSE_HANDLER_INFINITE_REGISTRATION';
        }
        if (registrations.some(r => r.hookName === 'useEffect')) {
            return 'SSE_USEEFFECT_DEPENDENCY_LOOP';
        }
        if (registrations.some(r => r.componentName && r.componentName.includes('Terminal'))) {
            return 'SSE_TERMINAL_COMPONENT_RE_REGISTRATION';
        }
        return 'SSE_EVENT_HANDLER_DUPLICATION';
    }
    /**
     * Analyze root cause of duplication
     */
    analyzeRootCause(registrations) {
        const hookRegistrations = registrations.filter(r => r.hookName);
        const componentRegistrations = registrations.filter(r => r.componentName);
        if (hookRegistrations.length > componentRegistrations.length) {
            return 'React useEffect missing dependency array or incorrect dependencies causing re-registration';
        }
        if (componentRegistrations.some(r => r.componentName === 'HTTPPollingTerminal')) {
            return 'HTTPPollingTerminal component re-mounting without proper cleanup';
        }
        if (registrations.some(r => r.callStack.includes('EventSource'))) {
            return 'EventSource being created multiple times without closing previous connections';
        }
        if (registrations.some(r => r.callStack.includes('broadcastToAllConnections'))) {
            return 'Backend broadcasting system registering duplicate connections';
        }
        return 'Unknown cause - multiple event handler registrations for same function/event type';
    }
    /**
     * Count component renders from registrations
     */
    countComponentRenders(registrations) {
        const componentRenders = new Set();
        registrations.forEach(reg => {
            if (reg.componentName) {
                componentRenders.add(`${reg.componentName}-${reg.registeredAt}`);
            }
        });
        return componentRenders.size;
    }
    /**
     * Count hook executions from registrations
     */
    countHookExecutions(registrations) {
        return registrations.filter(r => r.hookName).length;
    }
    /**
     * Count EventSource creations from registrations
     */
    countEventSourceCreations(registrations) {
        return registrations.filter(r => r.callStack.includes('EventSource')).length;
    }
    /**
     * Count cleanup failures from registrations
     */
    countCleanupFailures(registrations) {
        // This would need to be tracked separately when cleanup is attempted
        return this.eventSourceLeakages.filter(l => l.leakageType === 'cleanup_failure').length;
    }
    /**
     * Analyze frontend SSE connection patterns
     */
    analyzeFrontendSSEConnections(connections) {
        // Group connections by instance and URL
        const connectionGroups = new Map();
        connections.forEach(conn => {
            const key = `${conn.instanceId}-${conn.url}`;
            if (!connectionGroups.has(key)) {
                connectionGroups.set(key, []);
            }
            connectionGroups.get(key).push(conn);
        });
        // Find duplicate connections
        connectionGroups.forEach((conns, key) => {
            if (conns.length > 1) {
                const [instanceId, url] = key.split('-', 2);
                conns.forEach((conn, index) => {
                    if (index > 0) { // First connection is legitimate
                        const leakage = {
                            patternId: `duplicate-conn-${key}-${index}`,
                            instanceId,
                            eventSourceUrl: url,
                            createdAt: conn.createdAt,
                            lastActivity: new Date().toISOString(),
                            connectionState: conn.state,
                            leakageType: 'zombie_connection'
                        };
                        this.eventSourceLeakages.push(leakage);
                    }
                });
                console.warn(`🔗 Duplicate SSE Connections: ${conns.length} connections to ${url} for instance ${instanceId}`);
            }
        });
    }
    /**
     * Record detected pattern
     */
    recordPattern(pattern) {
        this.detectedPatterns.push(pattern);
        this.persistPatterns();
        this.emit('duplicationPatternDetected', pattern);
    }
    /**
     * Get all detected patterns
     */
    getDetectedPatterns() {
        return [...this.detectedPatterns];
    }
    /**
     * Get event source leakages
     */
    getEventSourceLeakages() {
        return [...this.eventSourceLeakages];
    }
    /**
     * Get handler registration statistics
     */
    getHandlerStatistics() {
        let totalRegistrations = 0;
        let duplicateHandlers = 0;
        let mostDuplicatedHandler = '';
        let maxDuplicates = 0;
        this.registrations.forEach((regs, key) => {
            totalRegistrations += regs.length;
            if (regs.length > 1) {
                duplicateHandlers++;
                if (regs.length > maxDuplicates) {
                    maxDuplicates = regs.length;
                    mostDuplicatedHandler = key;
                }
            }
        });
        return {
            totalHandlers: this.registrations.size,
            totalRegistrations,
            duplicateHandlers,
            mostDuplicatedHandler
        };
    }
    /**
     * Setup periodic cleanup of old registrations
     */
    setupCleanupInterval() {
        setInterval(() => {
            this.cleanupOldRegistrations();
        }, 60000); // Clean up every minute
    }
    /**
     * Clean up old registrations
     */
    cleanupOldRegistrations() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        this.registrations.forEach((regs, key) => {
            const filtered = regs.filter(reg => new Date(reg.registeredAt).getTime() > cutoff);
            if (filtered.length === 0) {
                this.registrations.delete(key);
            }
            else {
                this.registrations.set(key, filtered);
            }
        });
    }
    /**
     * Load existing patterns from storage
     */
    loadExistingPatterns() {
        try {
            if ((0, fs_1.existsSync)(this.patternStorage)) {
                const data = (0, fs_1.readFileSync)(this.patternStorage, 'utf8');
                const parsed = JSON.parse(data);
                this.detectedPatterns = parsed.patterns || [];
                this.eventSourceLeakages = parsed.leakages || [];
                console.log(`📂 Loaded ${this.detectedPatterns.length} existing handler duplication patterns`);
            }
        }
        catch (error) {
            console.error('Failed to load existing patterns:', error);
        }
    }
    /**
     * Persist patterns to storage
     */
    persistPatterns() {
        try {
            const data = {
                patterns: this.detectedPatterns,
                leakages: this.eventSourceLeakages,
                lastUpdated: new Date().toISOString()
            };
            (0, fs_1.writeFileSync)(this.patternStorage, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Failed to persist patterns:', error);
        }
    }
    /**
     * Clear all patterns (for testing)
     */
    clearPatterns() {
        this.detectedPatterns = [];
        this.eventSourceLeakages = [];
        this.registrations.clear();
    }
    /**
     * Generate event handler analysis report
     */
    generateAnalysisReport() {
        const stats = this.getHandlerStatistics();
        const critical = this.detectedPatterns.filter(p => p.severity === 'critical');
        const high = this.detectedPatterns.filter(p => p.severity === 'high');
        const leakages = this.eventSourceLeakages.filter(l => l.leakageType !== 'closed');
        let report = '=== SSE Event Handler Duplication Analysis Report ===\n\n';
        report += `📊 HANDLER STATISTICS:\n`;
        report += `- Total Handlers: ${stats.totalHandlers}\n`;
        report += `- Total Registrations: ${stats.totalRegistrations}\n`;
        report += `- Handlers with Duplicates: ${stats.duplicateHandlers}\n`;
        report += `- Most Duplicated: ${stats.mostDuplicatedHandler}\n\n`;
        if (critical.length > 0) {
            report += `🚨 CRITICAL DUPLICATIONS (${critical.length}):\n`;
            critical.forEach(pattern => {
                report += `- ${pattern.handlerFunction} (${pattern.eventType}): ${pattern.totalRegistrations} registrations\n`;
                report += `  Anti-Pattern: ${pattern.antiPattern}\n`;
                report += `  Root Cause: ${pattern.rootCause}\n\n`;
            });
        }
        if (high.length > 0) {
            report += `⚠️  HIGH PRIORITY (${high.length}):\n`;
            high.forEach(pattern => {
                report += `- ${pattern.handlerFunction}: ${pattern.totalRegistrations} registrations\n`;
            });
            report += '\n';
        }
        if (leakages.length > 0) {
            report += `🧟 CONNECTION LEAKAGES (${leakages.length}):\n`;
            leakages.forEach(leakage => {
                report += `- ${leakage.instanceId}: ${leakage.eventSourceUrl} (${leakage.leakageType})\n`;
            });
        }
        return report;
    }
}
exports.SSEEventHandlerDuplicationAnalyzer = SSEEventHandlerDuplicationAnalyzer;
exports.default = SSEEventHandlerDuplicationAnalyzer;
//# sourceMappingURL=sse-event-handler-duplication-analyzer.js.map