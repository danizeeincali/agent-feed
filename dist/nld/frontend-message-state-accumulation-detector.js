"use strict";
/**
 * Frontend Message State Accumulation Detector
 * Detects frontend message state accumulation patterns in React components
 * Part of NLD (Neuro-Learning Development) system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendMessageStateAccumulationDetector = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class FrontendMessageStateAccumulationDetector extends events_1.EventEmitter {
    stateHistory = new Map();
    componentStates = new Map();
    detectedPatterns = [];
    hookFailures = [];
    patternStorage;
    maxHistorySize = 1000;
    accumulationThreshold = 50;
    duplicateThreshold = 10;
    constructor(storageDir) {
        super();
        this.patternStorage = (0, path_1.join)(storageDir, 'frontend-state-accumulation-patterns.json');
        this.loadExistingPatterns();
        this.setupPeriodicAnalysis();
        console.log('📱 Frontend Message State Accumulation Detector initialized');
    }
    /**
     * Track message state update in React component
     */
    trackMessageStateUpdate(componentName, instanceId, messageState, renderCount = 1) {
        const componentKey = `${componentName}-${instanceId}`;
        // Update component state analysis
        this.updateComponentStateAnalysis(componentKey, componentName, instanceId, messageState, renderCount);
        // Store state history
        this.stateHistory.set(componentKey, [...messageState]);
        // Analyze for accumulation patterns
        this.analyzeStateAccumulation(componentKey, componentName, instanceId, messageState);
    }
    /**
     * Track React hook state change
     */
    trackHookStateChange(componentName, hookType, hookName, previousState, newState, dependencies) {
        // Detect hook-specific failures
        this.detectHookFailures(componentName, hookType, hookName, previousState, newState, dependencies);
    }
    /**
     * Track component render cycles
     */
    trackComponentRender(componentName, instanceId, renderReason, props, state) {
        const componentKey = `${componentName}-${instanceId}`;
        if (!this.componentStates.has(componentKey)) {
            this.componentStates.set(componentKey, {
                componentName,
                instanceId,
                stateVariables: {},
                stateSize: 0,
                lastUpdated: new Date().toISOString(),
                updateFrequency: 0,
                renderCount: 0,
                memoryUsage: 0
            });
        }
        const analysis = this.componentStates.get(componentKey);
        analysis.renderCount++;
        analysis.stateVariables = { ...state };
        analysis.stateSize = this.calculateStateSize(state);
        analysis.lastUpdated = new Date().toISOString();
        analysis.memoryUsage = this.estimateMemoryUsage(props, state);
        // Check for excessive rendering
        if (analysis.renderCount > 100) {
            this.detectExcessiveRendering(componentName, instanceId, analysis, renderReason);
        }
    }
    /**
     * Analyze state accumulation patterns
     */
    analyzeStateAccumulation(componentKey, componentName, instanceId, messageState) {
        // Check for unbounded growth
        if (messageState.length > this.accumulationThreshold) {
            this.detectUnboundedGrowth(componentKey, componentName, instanceId, messageState);
        }
        // Check for duplicate accumulation
        const duplicates = this.findDuplicateMessages(messageState);
        if (duplicates.length > this.duplicateThreshold) {
            this.detectDuplicateAccumulation(componentKey, componentName, instanceId, messageState, duplicates);
        }
        // Check for stale message accumulation
        const staleMessages = this.findStaleMessages(messageState);
        if (staleMessages.length > this.duplicateThreshold) {
            this.detectStaleStateAccumulation(componentKey, componentName, instanceId, messageState, staleMessages);
        }
    }
    /**
     * Detect unbounded state growth
     */
    detectUnboundedGrowth(componentKey, componentName, instanceId, messageState) {
        const analysis = this.componentStates.get(componentKey);
        const pattern = {
            patternId: `unbounded-growth-${componentKey}-${Date.now()}`,
            componentName,
            instanceId,
            accumulationType: 'unbounded_growth',
            messageCount: messageState.length,
            duplicateCount: 0,
            staleCount: 0,
            memoryImpact: this.calculateMemoryImpact(messageState),
            timeWindow: this.calculateTimeWindow(messageState),
            detectedAt: new Date().toISOString(),
            severity: this.calculateSeverity(messageState.length),
            rootCause: 'Messages added to state without cleanup or size limits',
            manifestation: 'Component performance degradation, memory bloat, potential browser crashes',
            technicalDetails: {
                stateSize: analysis?.stateSize || 0,
                renderCount: analysis?.renderCount || 0,
                effectExecutions: 0,
                cleanupFailures: 0
            }
        };
        this.recordPattern(pattern);
        console.warn(`📈 Unbounded State Growth: ${componentName} has ${messageState.length} messages`);
    }
    /**
     * Detect duplicate message accumulation
     */
    detectDuplicateAccumulation(componentKey, componentName, instanceId, messageState, duplicates) {
        const pattern = {
            patternId: `duplicate-accumulation-${componentKey}-${Date.now()}`,
            componentName,
            instanceId,
            accumulationType: 'duplicate_accumulation',
            messageCount: messageState.length,
            duplicateCount: duplicates.length,
            staleCount: 0,
            memoryImpact: this.calculateMemoryImpact(duplicates),
            timeWindow: this.calculateTimeWindow(messageState),
            detectedAt: new Date().toISOString(),
            severity: 'medium',
            rootCause: 'Same messages being added to state multiple times without deduplication',
            manifestation: 'UI showing duplicate content, wasted memory, slower rendering',
            technicalDetails: {
                stateSize: duplicates.reduce((size, msg) => size + JSON.stringify(msg).length, 0),
                renderCount: this.componentStates.get(componentKey)?.renderCount || 0,
                effectExecutions: 0,
                cleanupFailures: 0
            }
        };
        this.recordPattern(pattern);
        console.warn(`🔄 Duplicate Message Accumulation: ${componentName} has ${duplicates.length} duplicate messages`);
    }
    /**
     * Detect stale message accumulation
     */
    detectStaleStateAccumulation(componentKey, componentName, instanceId, messageState, staleMessages) {
        const pattern = {
            patternId: `stale-accumulation-${componentKey}-${Date.now()}`,
            componentName,
            instanceId,
            accumulationType: 'stale_state',
            messageCount: messageState.length,
            duplicateCount: 0,
            staleCount: staleMessages.length,
            memoryImpact: this.calculateMemoryImpact(staleMessages),
            timeWindow: this.calculateTimeWindow(messageState),
            detectedAt: new Date().toISOString(),
            severity: 'medium',
            rootCause: 'Old messages not being cleaned up from component state',
            manifestation: 'UI showing outdated information, memory bloat over time',
            technicalDetails: {
                stateSize: staleMessages.reduce((size, msg) => size + JSON.stringify(msg).length, 0),
                renderCount: this.componentStates.get(componentKey)?.renderCount || 0,
                effectExecutions: 0,
                cleanupFailures: 0
            }
        };
        this.recordPattern(pattern);
        console.warn(`📅 Stale State Accumulation: ${componentName} has ${staleMessages.length} stale messages`);
    }
    /**
     * Detect excessive component rendering
     */
    detectExcessiveRendering(componentName, instanceId, analysis, renderReason) {
        const pattern = {
            patternId: `excessive-rendering-${componentName}-${instanceId}-${Date.now()}`,
            componentName,
            instanceId,
            accumulationType: 'memory_bloat',
            messageCount: 0,
            duplicateCount: 0,
            staleCount: 0,
            memoryImpact: analysis.memoryUsage,
            timeWindow: 0,
            detectedAt: new Date().toISOString(),
            severity: 'high',
            rootCause: `Component rendering excessively (${analysis.renderCount} times) due to: ${renderReason}`,
            manifestation: 'UI lag, browser freezing, high CPU usage',
            technicalDetails: {
                stateSize: analysis.stateSize,
                renderCount: analysis.renderCount,
                effectExecutions: 0,
                cleanupFailures: 0
            }
        };
        this.recordPattern(pattern);
        console.warn(`🎀 Excessive Rendering: ${componentName} rendered ${analysis.renderCount} times`);
    }
    /**
     * Detect React hook failures
     */
    detectHookFailures(componentName, hookType, hookName, previousState, newState, dependencies) {
        // Detect useEffect dependency loops
        if (hookType === 'useEffect' && dependencies) {
            if (this.hasCircularDependencies(dependencies)) {
                const failure = {
                    patternId: `hook-failure-${componentName}-${hookName}-${Date.now()}`,
                    componentName,
                    hookType: hookType,
                    hookName,
                    failureType: 'dependency_loop',
                    stateBeforeFailure: previousState,
                    stateAfterFailure: newState,
                    errorMessage: 'useEffect has circular dependencies causing infinite re-execution',
                    detectedAt: new Date().toISOString()
                };
                this.hookFailures.push(failure);
                console.error(`⚙️ Hook Failure: ${componentName}.${hookName} has circular dependencies`);
            }
        }
        // Detect useState infinite updates
        if (hookType === 'useState' &&
            JSON.stringify(previousState) === JSON.stringify(newState) &&
            previousState !== newState) {
            const failure = {
                patternId: `hook-failure-${componentName}-${hookName}-${Date.now()}`,
                componentName,
                hookType: hookType,
                hookName,
                failureType: 'infinite_render',
                stateBeforeFailure: previousState,
                stateAfterFailure: newState,
                errorMessage: 'useState causing infinite renders with equivalent but not identical state',
                detectedAt: new Date().toISOString()
            };
            this.hookFailures.push(failure);
            console.error(`⚙️ Hook Failure: ${componentName}.${hookName} causing infinite renders`);
        }
    }
    /**
     * Find duplicate messages in state
     */
    findDuplicateMessages(messageState) {
        const seen = new Set();
        const duplicates = [];
        messageState.forEach(message => {
            const key = `${message.type}-${message.content}-${message.instanceId}`;
            if (seen.has(key)) {
                duplicates.push(message);
            }
            else {
                seen.add(key);
            }
        });
        return duplicates;
    }
    /**
     * Find stale messages (older than 5 minutes)
     */
    findStaleMessages(messageState) {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return messageState.filter(message => new Date(message.timestamp).getTime() < fiveMinutesAgo);
    }
    /**
     * Calculate memory impact of messages
     */
    calculateMemoryImpact(messages) {
        return messages.reduce((total, message) => {
            return total + JSON.stringify(message).length * 2; // Rough bytes estimate
        }, 0);
    }
    /**
     * Calculate time window for messages
     */
    calculateTimeWindow(messages) {
        if (messages.length < 2)
            return 0;
        const timestamps = messages.map(msg => new Date(msg.timestamp).getTime()).sort();
        return timestamps[timestamps.length - 1] - timestamps[0];
    }
    /**
     * Calculate severity based on message count
     */
    calculateSeverity(messageCount) {
        if (messageCount >= 500)
            return 'critical';
        if (messageCount >= 200)
            return 'high';
        if (messageCount >= 100)
            return 'medium';
        return 'low';
    }
    /**
     * Update component state analysis
     */
    updateComponentStateAnalysis(componentKey, componentName, instanceId, messageState, renderCount) {
        const existing = this.componentStates.get(componentKey);
        const now = new Date().toISOString();
        this.componentStates.set(componentKey, {
            componentName,
            instanceId,
            stateVariables: { messages: messageState },
            stateSize: this.calculateStateSize(messageState),
            lastUpdated: now,
            updateFrequency: existing ? existing.updateFrequency + 1 : 1,
            renderCount: existing ? existing.renderCount + renderCount : renderCount,
            memoryUsage: this.calculateMemoryImpact(messageState)
        });
    }
    /**
     * Calculate state size
     */
    calculateStateSize(state) {
        return JSON.stringify(state).length;
    }
    /**
     * Estimate memory usage
     */
    estimateMemoryUsage(props, state) {
        return this.calculateStateSize(props) + this.calculateStateSize(state);
    }
    /**
     * Check for circular dependencies
     */
    hasCircularDependencies(dependencies) {
        // Simple check - in real implementation, this would be more sophisticated
        const depStrings = dependencies.map(dep => JSON.stringify(dep));
        const unique = new Set(depStrings);
        return depStrings.length !== unique.size;
    }
    /**
     * Setup periodic analysis
     */
    setupPeriodicAnalysis() {
        setInterval(() => {
            this.analyzeComponentMemoryUsage();
        }, 30000); // Every 30 seconds
    }
    /**
     * Analyze component memory usage patterns
     */
    analyzeComponentMemoryUsage() {
        this.componentStates.forEach((analysis, componentKey) => {
            if (analysis.memoryUsage > 1024 * 1024) { // 1MB threshold
                console.warn(`📈 High Memory Usage: ${analysis.componentName} using ${(analysis.memoryUsage / 1024).toFixed(2)}KB`);
            }
        });
    }
    /**
     * Record detected pattern
     */
    recordPattern(pattern) {
        this.detectedPatterns.push(pattern);
        this.persistPatterns();
        this.emit('stateAccumulationDetected', pattern);
    }
    /**
     * Get all detected patterns
     */
    getDetectedPatterns() {
        return [...this.detectedPatterns];
    }
    /**
     * Get hook failures
     */
    getHookFailures() {
        return [...this.hookFailures];
    }
    /**
     * Get component state analyses
     */
    getComponentStateAnalyses() {
        return Array.from(this.componentStates.values());
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
                this.hookFailures = parsed.hookFailures || [];
                console.log(`📂 Loaded ${this.detectedPatterns.length} existing frontend state patterns`);
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
                hookFailures: this.hookFailures,
                componentStates: Array.from(this.componentStates.entries()),
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
        this.hookFailures = [];
        this.componentStates.clear();
        this.stateHistory.clear();
    }
    /**
     * Generate frontend state analysis report
     */
    generateStateAnalysisReport() {
        const critical = this.detectedPatterns.filter(p => p.severity === 'critical');
        const high = this.detectedPatterns.filter(p => p.severity === 'high');
        const componentCount = this.componentStates.size;
        const totalMemory = Array.from(this.componentStates.values())
            .reduce((total, analysis) => total + analysis.memoryUsage, 0);
        let report = '=== Frontend Message State Accumulation Analysis Report ===\n\n';
        report += `📱 COMPONENT STATISTICS:\n`;
        report += `- Tracked Components: ${componentCount}\n`;
        report += `- Total Memory Usage: ${(totalMemory / 1024).toFixed(2)}KB\n`;
        report += `- Total Patterns: ${this.detectedPatterns.length}\n`;
        report += `- Hook Failures: ${this.hookFailures.length}\n\n`;
        if (critical.length > 0) {
            report += `🚨 CRITICAL STATE ISSUES (${critical.length}):\n`;
            critical.forEach(pattern => {
                report += `- ${pattern.componentName}: ${pattern.accumulationType}\n`;
                report += `  Messages: ${pattern.messageCount}, Memory: ${(pattern.memoryImpact / 1024).toFixed(2)}KB\n`;
                report += `  Root Cause: ${pattern.rootCause}\n\n`;
            });
        }
        if (high.length > 0) {
            report += `⚠️  HIGH PRIORITY (${high.length}):\n`;
            high.forEach(pattern => {
                report += `- ${pattern.componentName}: ${pattern.messageCount} messages\n`;
            });
            report += '\n';
        }
        const hookFailures = this.hookFailures.filter(f => f.failureType === 'dependency_loop');
        if (hookFailures.length > 0) {
            report += `⚙️  REACT HOOK FAILURES (${hookFailures.length}):\n`;
            hookFailures.forEach(failure => {
                report += `- ${failure.componentName}.${failure.hookName}: ${failure.failureType}\n`;
            });
        }
        return report;
    }
}
exports.FrontendMessageStateAccumulationDetector = FrontendMessageStateAccumulationDetector;
exports.default = FrontendMessageStateAccumulationDetector;
//# sourceMappingURL=frontend-message-state-accumulation-detector.js.map