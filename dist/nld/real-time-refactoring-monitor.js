"use strict";
/**
 * Real-Time Refactoring Monitor for NLD
 * Monitors live refactoring activities and captures failure patterns in real-time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeRefactoringMonitor = void 0;
const events_1 = require("events");
const sse_websocket_refactoring_failure_monitor_1 = require("./sse-websocket-refactoring-failure-monitor");
const frontend_console_error_detector_1 = require("./frontend-console-error-detector");
const react_component_refactoring_anti_patterns_database_1 = require("./react-component-refactoring-anti-patterns-database");
const fs_1 = require("fs");
const path_1 = require("path");
class RealTimeRefactoringMonitor extends events_1.EventEmitter {
    refactoringMonitor;
    consoleDetector;
    antiPatternsDb;
    currentSession = null;
    sessions = [];
    realTimeEvents = [];
    dataDir;
    sessionsFile;
    eventsFile;
    isMonitoring = false;
    constructor() {
        super();
        this.dataDir = (0, path_1.join)(process.cwd(), 'src/nld/patterns');
        this.sessionsFile = (0, path_1.join)(this.dataDir, 'refactoring-sessions.json');
        this.eventsFile = (0, path_1.join)(this.dataDir, 'real-time-events.json');
        this.refactoringMonitor = new sse_websocket_refactoring_failure_monitor_1.SSEWebSocketRefactoringMonitor();
        this.consoleDetector = new frontend_console_error_detector_1.FrontendConsoleErrorDetector();
        this.antiPatternsDb = new react_component_refactoring_anti_patterns_database_1.ReactRefactoringAntiPatternsDatabase();
        this.ensureDataDirectory();
        this.setupEventListeners();
        this.loadExistingData();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    loadExistingData() {
        // Load existing sessions
        if ((0, fs_1.existsSync)(this.sessionsFile)) {
            try {
                const sessionData = require(this.sessionsFile);
                this.sessions = Array.isArray(sessionData) ? sessionData : [];
                console.log(`✅ Loaded ${this.sessions.length} existing refactoring sessions`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing sessions');
                this.sessions = [];
            }
        }
        // Load existing events
        if ((0, fs_1.existsSync)(this.eventsFile)) {
            try {
                const eventData = require(this.eventsFile);
                this.realTimeEvents = Array.isArray(eventData) ? eventData : [];
                console.log(`✅ Loaded ${this.realTimeEvents.length} existing real-time events`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing events');
                this.realTimeEvents = [];
            }
        }
    }
    setupEventListeners() {
        // Listen to refactoring monitor events
        this.refactoringMonitor.on('failure_captured', (failure) => {
            this.handleRealTimeEvent({
                type: 'error',
                source: 'refactor_monitor',
                data: failure,
                severity: failure.severity,
                context: {
                    component: failure.component,
                    refactoringPhase: failure.contextData.phase
                }
            });
        });
        // Listen to console error events
        this.consoleDetector.on('error_captured', (error) => {
            this.handleRealTimeEvent({
                type: 'error',
                source: 'console',
                data: error,
                severity: error.severity,
                context: {
                    component: error.context.component,
                    file: error.source,
                    line: error.line
                }
            });
        });
        // Auto-detect patterns and create events
        this.on('pattern_detected', (pattern) => {
            this.handleRealTimeEvent({
                type: 'pattern',
                source: 'anti_patterns',
                data: pattern,
                severity: 'medium',
                context: {
                    component: pattern.component,
                    refactoringPhase: pattern.phase
                }
            });
        });
    }
    startRefactoringSession(type, components) {
        if (this.currentSession && this.currentSession.status === 'active') {
            this.endRefactoringSession('paused');
        }
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.currentSession = {
            id: sessionId,
            startTime: new Date().toISOString(),
            type,
            components,
            status: 'active',
            metrics: {
                errorsDetected: 0,
                patternsFound: 0,
                componentsAffected: components.length,
                severity: 'low'
            },
            failurePatterns: [],
            recoveryActions: []
        };
        this.sessions.push(this.currentSession);
        this.startMonitoring();
        this.handleRealTimeEvent({
            type: 'success',
            source: 'refactor_monitor',
            data: { message: `Refactoring session started: ${type}`, components },
            severity: 'low',
            context: { refactoringPhase: 'session_start' }
        });
        console.log(`🚀 Started refactoring session: ${sessionId} (${type})`);
        this.emit('session_started', this.currentSession);
        return sessionId;
    }
    endRefactoringSession(status = 'completed') {
        if (!this.currentSession) {
            console.warn('⚠️  No active refactoring session to end');
            return;
        }
        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.status = status;
        this.stopMonitoring();
        this.persistData();
        this.handleRealTimeEvent({
            type: status === 'completed' ? 'success' : 'warning',
            source: 'refactor_monitor',
            data: { message: `Refactoring session ended: ${status}`, metrics: this.currentSession.metrics },
            severity: status === 'failed' ? 'high' : 'low',
            context: { refactoringPhase: 'session_end' }
        });
        console.log(`🛑 Ended refactoring session: ${this.currentSession.id} (${status})`);
        this.emit('session_ended', this.currentSession);
        this.currentSession = null;
    }
    startMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        this.refactoringMonitor.startMonitoring();
        this.consoleDetector.startMonitoring();
        console.log('🔍 Real-time refactoring monitoring started');
    }
    stopMonitoring() {
        if (!this.isMonitoring)
            return;
        this.isMonitoring = false;
        this.refactoringMonitor.stopMonitoring();
        this.consoleDetector.stopMonitoring();
        console.log('🛑 Real-time refactoring monitoring stopped');
    }
    handleRealTimeEvent(eventData) {
        const event = {
            id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            sessionId: this.currentSession?.id || 'no-session',
            ...eventData
        };
        this.realTimeEvents.push(event);
        // Update current session metrics
        if (this.currentSession) {
            if (event.type === 'error') {
                this.currentSession.metrics.errorsDetected += 1;
            }
            if (event.type === 'pattern') {
                this.currentSession.metrics.patternsFound += 1;
            }
            // Update severity if this event is more severe
            if (this.getSeverityLevel(event.severity) > this.getSeverityLevel(this.currentSession.metrics.severity)) {
                this.currentSession.metrics.severity = event.severity;
            }
            // Add to failure patterns if applicable
            if (event.type === 'error' || event.type === 'pattern') {
                const patternId = `${event.source}:${event.type}:${event.context.component || 'unknown'}`;
                if (!this.currentSession.failurePatterns.includes(patternId)) {
                    this.currentSession.failurePatterns.push(patternId);
                }
            }
        }
        // Emit the event for real-time listeners
        this.emit('real_time_event', event);
        // Log significant events
        if (event.severity === 'high' || event.severity === 'critical') {
            console.log(`🔴 Critical refactoring event: ${event.type} in ${event.context.component || 'unknown component'}`);
        }
        // Auto-persist critical events immediately
        if (event.severity === 'critical') {
            this.persistData();
        }
    }
    getSeverityLevel(severity) {
        const levels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return levels[severity] || 1;
    }
    captureUserFeedback(feedback) {
        this.handleRealTimeEvent({
            type: feedback.success ? 'success' : 'error',
            source: 'user_feedback',
            data: feedback,
            severity: feedback.success ? 'low' : 'medium',
            context: {
                component: feedback.component,
                refactoringPhase: 'user_validation'
            }
        });
        // Add recovery action if resolution provided
        if (this.currentSession && feedback.resolution) {
            this.currentSession.recoveryActions.push(`${feedback.component}: ${feedback.resolution}`);
        }
    }
    getActiveSession() {
        return this.currentSession;
    }
    getSessionHistory() {
        return [...this.sessions];
    }
    getRealTimeEvents(sessionId, limit) {
        let events = sessionId ?
            this.realTimeEvents.filter(e => e.sessionId === sessionId) :
            this.realTimeEvents;
        if (limit) {
            events = events.slice(-limit); // Get most recent events
        }
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    getEventsByComponent(component) {
        return this.realTimeEvents.filter(e => e.context.component === component);
    }
    getEventsBySeverity(severity) {
        return this.realTimeEvents.filter(e => e.severity === severity);
    }
    generateRealTimeReport() {
        const activeSession = this.currentSession;
        const recentEvents = this.getRealTimeEvents(undefined, 50);
        const criticalEvents = this.getEventsBySeverity('critical');
        const report = {
            monitoring: {
                isActive: this.isMonitoring,
                activeSession: activeSession,
                totalSessions: this.sessions.length,
                totalEvents: this.realTimeEvents.length
            },
            currentMetrics: activeSession ? {
                sessionDuration: this.calculateSessionDuration(activeSession),
                errorsPerMinute: this.calculateErrorRate(activeSession),
                mostAffectedComponent: this.findMostAffectedComponent(activeSession.id),
                severityDistribution: this.getSessionSeverityDistribution(activeSession.id)
            } : null,
            recentActivity: {
                last50Events: recentEvents,
                criticalEvents: criticalEvents,
                errorTrends: this.analyzeErrorTrends(),
                patternFrequency: this.analyzePatternFrequency()
            },
            recommendations: this.generateRealTimeRecommendations(),
            timestamp: new Date().toISOString()
        };
        const reportPath = (0, path_1.join)(this.dataDir, `real-time-refactoring-report-${Date.now()}.json`);
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Real-time refactoring report generated: ${reportPath}`);
        return reportPath;
    }
    calculateSessionDuration(session) {
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : new Date();
        const duration = end.getTime() - start.getTime();
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }
    calculateErrorRate(session) {
        const sessionEvents = this.realTimeEvents.filter(e => e.sessionId === session.id && e.type === 'error');
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : new Date();
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        return durationMinutes > 0 ? sessionEvents.length / durationMinutes : 0;
    }
    findMostAffectedComponent(sessionId) {
        const sessionEvents = this.realTimeEvents.filter(e => e.sessionId === sessionId);
        const componentCounts = {};
        sessionEvents.forEach(event => {
            const component = event.context.component || 'Unknown';
            componentCounts[component] = (componentCounts[component] || 0) + 1;
        });
        return Object.entries(componentCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([component]) => component)[0] || 'None';
    }
    getSessionSeverityDistribution(sessionId) {
        const sessionEvents = this.realTimeEvents.filter(e => e.sessionId === sessionId);
        const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
        sessionEvents.forEach(event => {
            distribution[event.severity] += 1;
        });
        return distribution;
    }
    analyzeErrorTrends() {
        const recentEvents = this.getRealTimeEvents(undefined, 100);
        const errorEvents = recentEvents.filter(e => e.type === 'error');
        // Group by hour to show trends
        const hourlyErrors = {};
        errorEvents.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            const hourKey = `${hour}:00`;
            hourlyErrors[hourKey] = (hourlyErrors[hourKey] || 0) + 1;
        });
        return {
            totalErrors: errorEvents.length,
            hourlyDistribution: hourlyErrors,
            mostCommonErrors: this.getMostCommonErrorTypes(errorEvents),
            severityTrend: this.getRecentSeverityTrend(errorEvents)
        };
    }
    analyzePatternFrequency() {
        const patternEvents = this.realTimeEvents.filter(e => e.type === 'pattern');
        const patterns = {};
        patternEvents.forEach(event => {
            const patternKey = `${event.context.component}:${event.context.refactoringPhase}`;
            patterns[patternKey] = (patterns[patternKey] || 0) + 1;
        });
        return Object.entries(patterns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 patterns
    }
    getMostCommonErrorTypes(errorEvents) {
        const errorTypes = {};
        errorEvents.forEach(event => {
            const errorType = event.data?.errorType || event.data?.category || 'unknown';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
        return Object.entries(errorTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }
    getRecentSeverityTrend(errorEvents) {
        if (errorEvents.length < 5)
            return 'insufficient_data';
        const recent = errorEvents.slice(0, 5);
        const severityLevels = recent.map(e => this.getSeverityLevel(e.severity));
        const average = severityLevels.reduce((sum, level) => sum + level, 0) / severityLevels.length;
        if (average > 3)
            return 'critical_trend';
        if (average > 2)
            return 'high_trend';
        if (average > 1.5)
            return 'medium_trend';
        return 'low_trend';
    }
    generateRealTimeRecommendations() {
        const recommendations = [];
        if (this.currentSession) {
            const session = this.currentSession;
            if (session.metrics.errorsDetected > 5) {
                recommendations.push('High error rate detected - consider pausing refactoring to review issues');
            }
            if (session.metrics.severity === 'critical') {
                recommendations.push('Critical issues detected - immediate attention required');
            }
            if (session.metrics.patternsFound > 3) {
                recommendations.push('Multiple anti-patterns detected - review refactoring approach');
            }
            const mostAffectedComponent = this.findMostAffectedComponent(session.id);
            if (mostAffectedComponent !== 'None' && mostAffectedComponent !== 'Unknown') {
                recommendations.push(`Focus attention on ${mostAffectedComponent} - highest error concentration`);
            }
        }
        const criticalEvents = this.getEventsBySeverity('critical');
        if (criticalEvents.length > 0) {
            recommendations.push('Address critical issues before continuing refactoring');
        }
        const recentErrorRate = this.calculateRecentErrorRate();
        if (recentErrorRate > 2) {
            recommendations.push('Error rate increasing - consider systematic debugging approach');
        }
        if (recommendations.length === 0) {
            recommendations.push('Refactoring proceeding smoothly - continue monitoring');
        }
        return recommendations;
    }
    calculateRecentErrorRate() {
        const recentEvents = this.getRealTimeEvents(undefined, 20);
        const errorEvents = recentEvents.filter(e => e.type === 'error');
        return (errorEvents.length / recentEvents.length) * 100;
    }
    exportAllNeuralTrainingData() {
        const exportPaths = [];
        // Export refactoring patterns
        exportPaths.push(this.refactoringMonitor.exportToNeuralTraining());
        // Export console errors
        exportPaths.push(this.consoleDetector.exportToNeuralTraining());
        // Export anti-patterns
        exportPaths.push(this.antiPatternsDb.exportToNeuralTraining());
        // Export real-time session data
        const sessionTrainingData = {
            dataset: 'real-time-refactoring-sessions',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            sessions: this.sessions,
            events: this.realTimeEvents,
            insights: {
                sessionSuccessRate: this.calculateSessionSuccessRate(),
                commonFailurePatterns: this.getCommonFailurePatterns(),
                recoveryStrategies: this.getRecoveryStrategies(),
                componentRiskScores: this.calculateComponentRiskScores()
            }
        };
        const sessionExportPath = (0, path_1.join)(this.dataDir, 'neural-training-refactoring-sessions.json');
        (0, fs_1.writeFileSync)(sessionExportPath, JSON.stringify(sessionTrainingData, null, 2));
        exportPaths.push(sessionExportPath);
        console.log(`🧠 Exported ${exportPaths.length} neural training datasets`);
        return exportPaths;
    }
    calculateSessionSuccessRate() {
        if (this.sessions.length === 0)
            return 0;
        const successful = this.sessions.filter(s => s.status === 'completed').length;
        return (successful / this.sessions.length) * 100;
    }
    getCommonFailurePatterns() {
        const patterns = this.sessions
            .flatMap(s => s.failurePatterns)
            .reduce((acc, pattern) => {
            acc[pattern] = (acc[pattern] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(patterns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([pattern]) => pattern);
    }
    getRecoveryStrategies() {
        return this.sessions
            .flatMap(s => s.recoveryActions)
            .filter((action, index, array) => array.indexOf(action) === index);
    }
    calculateComponentRiskScores() {
        const componentErrors = {};
        const componentTotal = {};
        this.realTimeEvents.forEach(event => {
            const component = event.context.component || 'Unknown';
            componentTotal[component] = (componentTotal[component] || 0) + 1;
            if (event.type === 'error' || event.severity === 'critical' || event.severity === 'high') {
                componentErrors[component] = (componentErrors[component] || 0) + 1;
            }
        });
        const riskScores = {};
        Object.keys(componentTotal).forEach(component => {
            const errors = componentErrors[component] || 0;
            const total = componentTotal[component];
            riskScores[component] = (errors / total) * 100;
        });
        return riskScores;
    }
    persistData() {
        try {
            (0, fs_1.writeFileSync)(this.sessionsFile, JSON.stringify(this.sessions, null, 2));
            (0, fs_1.writeFileSync)(this.eventsFile, JSON.stringify(this.realTimeEvents, null, 2));
        }
        catch (error) {
            console.error('❌ Failed to persist real-time monitoring data:', error);
        }
    }
}
exports.RealTimeRefactoringMonitor = RealTimeRefactoringMonitor;
//# sourceMappingURL=real-time-refactoring-monitor.js.map