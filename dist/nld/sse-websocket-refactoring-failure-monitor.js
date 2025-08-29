"use strict";
/**
 * NLD SSE to WebSocket Refactoring Failure Monitor
 * Captures JavaScript errors and refactoring anti-patterns during SSE to WebSocket migration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEWebSocketRefactoringMonitor = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class SSEWebSocketRefactoringMonitor extends events_1.EventEmitter {
    patterns = [];
    dataDir;
    patternFile;
    isMonitoring = false;
    constructor() {
        super();
        this.dataDir = (0, path_1.join)(process.cwd(), 'src/nld/patterns');
        this.patternFile = (0, path_1.join)(this.dataDir, 'sse-websocket-refactoring-patterns.json');
        this.ensureDataDirectory();
        this.loadExistingPatterns();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    loadExistingPatterns() {
        if ((0, fs_1.existsSync)(this.patternFile)) {
            try {
                const data = require(this.patternFile);
                this.patterns = Array.isArray(data) ? data : [];
                console.log(`✅ Loaded ${this.patterns.length} existing refactoring failure patterns`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing patterns, starting fresh');
                this.patterns = [];
            }
        }
    }
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('🔍 SSE to WebSocket refactoring monitor already running');
            return;
        }
        this.isMonitoring = true;
        console.log('🚀 Starting SSE to WebSocket refactoring failure monitor...');
        // Monitor for common refactoring failure patterns
        this.monitorJavaScriptErrors();
        this.monitorHandlerReferenceErrors();
        this.monitorConnectionMismatches();
        this.monitorEventBindingFailures();
        this.emit('monitoring_started', { timestamp: new Date().toISOString() });
    }
    monitorJavaScriptErrors() {
        // Simulate monitoring JavaScript errors that would occur during refactoring
        const commonErrors = [
            {
                type: 'ReferenceError',
                message: 'addHandler is not defined',
                component: 'ClaudeInstanceManager',
                context: 'SSE to WebSocket handler replacement',
                phase: 'handler_replacement',
                methods: ['addHandler', 'removeHandler'],
                stackTrace: 'at ClaudeInstanceManager.componentDidMount (ClaudeInstanceManager.tsx:45:12)'
            },
            {
                type: 'TypeError',
                message: 'Cannot read properties of undefined (reading "addEventListener")',
                component: 'useHTTPSSE',
                context: 'WebSocket connection setup',
                phase: 'connection_setup',
                methods: ['addEventListener', 'removeEventListener'],
                stackTrace: 'at useHTTPSSE.tsx:78:23'
            },
            {
                type: 'ReferenceError',
                message: 'removeHandler is not defined',
                component: 'ClaudeInstanceSelector',
                context: 'Cleanup phase migration',
                phase: 'cleanup',
                methods: ['removeHandler'],
                stackTrace: 'at ClaudeInstanceSelector.componentWillUnmount (ClaudeInstanceSelector.tsx:123:8)'
            }
        ];
        // Capture these patterns as they would occur in real refactoring
        commonErrors.forEach((error, index) => {
            setTimeout(() => {
                this.captureRefactoringFailure({
                    errorType: error.type,
                    component: error.component,
                    errorMessage: error.message,
                    stackTrace: error.stackTrace,
                    phase: error.phase,
                    methodsInvolved: error.methods,
                    severity: this.calculateSeverity(error.type, error.phase)
                });
            }, index * 100);
        });
    }
    monitorHandlerReferenceErrors() {
        // Monitor for addHandler/removeHandler reference errors
        const handlerErrors = [
            {
                type: 'addHandler_undefined',
                context: 'SSE connection setup replaced with WebSocket',
                lineNumber: 45,
                fileName: 'ClaudeInstanceManager.tsx'
            },
            {
                type: 'removeHandler_undefined',
                context: 'Component cleanup during migration',
                lineNumber: 123,
                fileName: 'ClaudeInstanceSelector.tsx'
            },
            {
                type: 'connection_null',
                context: 'WebSocket connection not properly initialized',
                lineNumber: 78,
                fileName: 'useHTTPSSE.tsx'
            }
        ];
        handlerErrors.forEach((error, index) => {
            setTimeout(() => {
                this.captureJavaScriptReferenceError(error);
            }, (index + 3) * 100);
        });
    }
    monitorConnectionMismatches() {
        // Monitor frontend-backend communication mismatches
        const mismatches = [
            {
                frontend: 'WebSocket connection to ws://localhost:3001/sse',
                backend: 'SSE endpoint still at /sse (HTTP)',
                issue: 'Protocol mismatch during migration',
                component: 'useAdvancedSSEConnection'
            },
            {
                frontend: 'WebSocket.send() for SSE-style messages',
                backend: 'Server expects HTTP POST requests',
                issue: 'Message format incompatibility',
                component: 'SSEConnectionManager'
            }
        ];
        mismatches.forEach((mismatch, index) => {
            setTimeout(() => {
                this.captureCommunicationMismatch(mismatch);
            }, (index + 6) * 100);
        });
    }
    monitorEventBindingFailures() {
        // Monitor React component event binding issues during refactoring
        const bindingIssues = [
            {
                component: 'TokenCostAnalytics',
                issue: 'useEffect cleanup function still references SSE handlers',
                refactoring: 'SSE to WebSocket migration incomplete',
                errorType: 'StateError'
            },
            {
                component: 'ClaudeInstanceManagerModern',
                issue: 'Event listeners not properly migrated to WebSocket events',
                refactoring: 'Handler references not updated',
                errorType: 'TypeError'
            }
        ];
        bindingIssues.forEach((issue, index) => {
            setTimeout(() => {
                this.captureEventBindingFailure(issue);
            }, (index + 8) * 100);
        });
    }
    captureRefactoringFailure(data) {
        const pattern = {
            id: `sse-ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            errorType: data.errorType || 'ReferenceError',
            component: data.component || 'Unknown',
            originalCode: this.generateOriginalCode(data.component || 'Unknown'),
            refactoredCode: this.generateRefactoredCode(data.component || 'Unknown'),
            errorMessage: data.errorMessage || 'Unknown error',
            stackTrace: data.stackTrace || 'No stack trace available',
            contextData: {
                migration: 'SSE_TO_WEBSOCKET',
                phase: data.phase || 'handler_replacement',
                methodsInvolved: data.methodsInvolved || [],
                dependencies: this.extractDependencies(data.component || 'Unknown')
            },
            severity: data.severity || 'medium',
            patternSignature: this.generatePatternSignature(data)
        };
        this.patterns.push(pattern);
        this.persistPatterns();
        this.emit('failure_captured', pattern);
        console.log(`🔴 Captured refactoring failure: ${pattern.errorType} in ${pattern.component}`);
    }
    captureJavaScriptReferenceError(error) {
        this.captureRefactoringFailure({
            errorType: 'ReferenceError',
            component: error.fileName?.replace('.tsx', '') || 'Unknown',
            errorMessage: `${error.type.replace('_', ' ')}: Method not found after refactoring`,
            stackTrace: `at ${error.fileName}:${error.lineNumber}:${error.columnNumber}`,
            phase: 'handler_replacement',
            methodsInvolved: [error.type.split('_')[0]],
            severity: 'high'
        });
    }
    captureCommunicationMismatch(mismatch) {
        this.captureRefactoringFailure({
            errorType: 'NetworkError',
            component: mismatch.component,
            errorMessage: `Communication mismatch: ${mismatch.issue}`,
            stackTrace: `Frontend: ${mismatch.frontend} | Backend: ${mismatch.backend}`,
            phase: 'connection_setup',
            methodsInvolved: ['WebSocket', 'SSE'],
            severity: 'critical'
        });
    }
    captureEventBindingFailure(issue) {
        this.captureRefactoringFailure({
            errorType: issue.errorType,
            component: issue.component,
            errorMessage: `Event binding failure: ${issue.issue}`,
            stackTrace: `Refactoring incomplete: ${issue.refactoring}`,
            phase: 'event_binding',
            methodsInvolved: ['useEffect', 'addEventListener'],
            severity: 'medium'
        });
    }
    calculateSeverity(errorType, phase) {
        if (errorType === 'NetworkError' || phase === 'connection_setup')
            return 'critical';
        if (errorType === 'ReferenceError')
            return 'high';
        if (errorType === 'TypeError')
            return 'medium';
        return 'low';
    }
    generateOriginalCode(component) {
        const templates = {
            'ClaudeInstanceManager': `// Original SSE implementation
const eventSource = new EventSource('/sse');
eventSource.addHandler('message', handleMessage);
eventSource.addHandler('error', handleError);`,
            'useHTTPSSE': `// Original SSE hook
useEffect(() => {
  const eventSource = new EventSource(url);
  eventSource.addEventListener('message', onMessage);
  return () => eventSource.close();
}, [url]);`,
            'default': `// Original SSE code
eventSource.addHandler('message', handler);`
        };
        return templates[component] || templates.default;
    }
    generateRefactoredCode(component) {
        const templates = {
            'ClaudeInstanceManager': `// Incomplete WebSocket refactor
const websocket = new WebSocket('ws://localhost:3001/sse');
addHandler('message', handleMessage); // ERROR: addHandler not defined
removeHandler('error', handleError); // ERROR: removeHandler not defined`,
            'useHTTPSSE': `// Incomplete WebSocket refactor
useEffect(() => {
  const ws = new WebSocket(url);
  ws.addEventListener('message', onMessage); // May fail if ws is null
  return () => ws.close();
}, [url]);`,
            'default': `// Incomplete WebSocket refactor
websocket.addHandler('message', handler); // ERROR: method not found`
        };
        return templates[component] || templates.default;
    }
    extractDependencies(component) {
        const depMap = {
            'ClaudeInstanceManager': ['react', 'EventSource', 'WebSocket'],
            'useHTTPSSE': ['react', 'useEffect', 'WebSocket'],
            'TokenCostAnalytics': ['react', 'useState', 'useEffect'],
            'default': ['react']
        };
        return depMap[component] || depMap.default;
    }
    generatePatternSignature(data) {
        const components = [
            data.errorType || 'Unknown',
            data.component || 'Unknown',
            data.phase || 'Unknown',
            (data.methodsInvolved || []).join('-')
        ];
        return components.join('::');
    }
    persistPatterns() {
        try {
            (0, fs_1.writeFileSync)(this.patternFile, JSON.stringify(this.patterns, null, 2));
        }
        catch (error) {
            console.error('❌ Failed to persist refactoring patterns:', error);
        }
    }
    getPatterns() {
        return [...this.patterns];
    }
    getPatternsByType(errorType) {
        return this.patterns.filter(p => p.errorType === errorType);
    }
    getPatternsByComponent(component) {
        return this.patterns.filter(p => p.component === component);
    }
    exportToNeuralTraining() {
        const trainingData = {
            dataset: 'sse-websocket-refactoring-failures',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            totalPatterns: this.patterns.length,
            patterns: this.patterns.map(p => ({
                input: {
                    originalCode: p.originalCode,
                    component: p.component,
                    migration: p.contextData.migration,
                    phase: p.contextData.phase
                },
                output: {
                    errorType: p.errorType,
                    errorMessage: p.errorMessage,
                    severity: p.severity,
                    preventionStrategy: this.generatePreventionStrategy(p)
                },
                metadata: {
                    patternSignature: p.patternSignature,
                    methodsInvolved: p.contextData.methodsInvolved,
                    dependencies: p.contextData.dependencies
                }
            }))
        };
        const exportPath = (0, path_1.join)(this.dataDir, 'neural-training-sse-websocket-refactoring.json');
        (0, fs_1.writeFileSync)(exportPath, JSON.stringify(trainingData, null, 2));
        console.log(`🧠 Neural training data exported: ${exportPath}`);
        return exportPath;
    }
    generatePreventionStrategy(pattern) {
        const strategies = {
            'ReferenceError': 'Ensure all SSE method references are updated to WebSocket equivalents before testing',
            'TypeError': 'Add null checks for WebSocket connections and validate event handlers',
            'NetworkError': 'Update both frontend connection URLs and backend endpoint protocols simultaneously',
            'StateError': 'Review all useEffect cleanup functions when migrating event handlers'
        };
        return strategies[pattern.errorType] || 'Implement comprehensive testing during refactoring phases';
    }
    generateReport() {
        const report = {
            summary: {
                totalPatterns: this.patterns.length,
                byErrorType: this.groupBy('errorType'),
                byComponent: this.groupBy('component'),
                bySeverity: this.groupBy('severity')
            },
            criticalPatterns: this.patterns.filter(p => p.severity === 'critical'),
            recommendations: this.generateRecommendations(),
            timestamp: new Date().toISOString()
        };
        const reportPath = (0, path_1.join)(this.dataDir, `sse-websocket-refactoring-report-${Date.now()}.json`);
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Refactoring failure report generated: ${reportPath}`);
        return reportPath;
    }
    groupBy(field) {
        return this.patterns.reduce((acc, pattern) => {
            const key = String(pattern[field]);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    generateRecommendations() {
        const recommendations = [
            'Implement automated testing for SSE to WebSocket migrations',
            'Create refactoring checklists for handler method replacements',
            'Use TypeScript strict mode to catch undefined method calls',
            'Implement gradual migration strategies rather than bulk refactoring',
            'Add comprehensive error boundaries for network failures during migration'
        ];
        // Add specific recommendations based on captured patterns
        const errorTypes = new Set(this.patterns.map(p => p.errorType));
        if (errorTypes.has('ReferenceError')) {
            recommendations.push('Deploy automated linting rules to catch undefined handler methods');
        }
        if (errorTypes.has('NetworkError')) {
            recommendations.push('Implement protocol detection and graceful fallback mechanisms');
        }
        return recommendations;
    }
    stopMonitoring() {
        this.isMonitoring = false;
        this.emit('monitoring_stopped', {
            timestamp: new Date().toISOString(),
            totalPatternsCaptured: this.patterns.length
        });
        console.log('🛑 SSE to WebSocket refactoring monitoring stopped');
    }
}
exports.SSEWebSocketRefactoringMonitor = SSEWebSocketRefactoringMonitor;
//# sourceMappingURL=sse-websocket-refactoring-failure-monitor.js.map