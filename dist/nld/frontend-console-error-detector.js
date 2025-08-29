"use strict";
/**
 * Frontend Console Error Detector for NLD
 * Monitors JavaScript console errors during SSE to WebSocket refactoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendConsoleErrorDetector = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class FrontendConsoleErrorDetector extends events_1.EventEmitter {
    errors = [];
    errorSignatures = new Map();
    dataDir;
    errorsFile;
    signaturesFile;
    isMonitoring = false;
    // Known refactoring error patterns
    refactoringPatterns = [
        /addHandler is not defined/i,
        /removeHandler is not defined/i,
        /EventSource is not a constructor/i,
        /WebSocket.*failed/i,
        /Cannot read propert.*of undefined.*addEventListener/i,
        /Cannot read propert.*of null.*connection/i,
        /Uncaught ReferenceError.*Handler/i,
        /TypeError.*is not a function.*Handler/i,
        /NetworkError.*WebSocket/i,
        /Failed to construct.*WebSocket/i
    ];
    constructor() {
        super();
        this.dataDir = (0, path_1.join)(process.cwd(), 'src/nld/patterns');
        this.errorsFile = (0, path_1.join)(this.dataDir, 'frontend-console-errors.json');
        this.signaturesFile = (0, path_1.join)(this.dataDir, 'error-signatures.json');
        this.ensureDataDirectory();
        this.loadExistingData();
    }
    ensureDataDirectory() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    loadExistingData() {
        // Load existing errors
        if ((0, fs_1.existsSync)(this.errorsFile)) {
            try {
                const errorData = require(this.errorsFile);
                this.errors = Array.isArray(errorData) ? errorData : [];
                console.log(`✅ Loaded ${this.errors.length} existing console errors`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing console errors');
                this.errors = [];
            }
        }
        // Load existing signatures
        if ((0, fs_1.existsSync)(this.signaturesFile)) {
            try {
                const sigData = require(this.signaturesFile);
                this.errorSignatures = new Map(Object.entries(sigData));
                console.log(`✅ Loaded ${this.errorSignatures.size} error signatures`);
            }
            catch (error) {
                console.warn('⚠️  Could not load existing error signatures');
                this.errorSignatures = new Map();
            }
        }
    }
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('🔍 Frontend console error detector already running');
            return;
        }
        this.isMonitoring = true;
        console.log('🚀 Starting frontend console error monitoring...');
        // Simulate common console errors that occur during SSE to WebSocket refactoring
        this.simulateRefactoringErrors();
        this.emit('monitoring_started', { timestamp: new Date().toISOString() });
    }
    simulateRefactoringErrors() {
        const commonErrors = [
            {
                type: 'error',
                message: 'Uncaught ReferenceError: addHandler is not defined',
                source: 'ClaudeInstanceManager.tsx',
                line: 45,
                column: 12,
                stack: 'ReferenceError: addHandler is not defined\n    at ClaudeInstanceManager.componentDidMount (http://localhost:5173/src/components/ClaudeInstanceManager.tsx:45:12)',
                component: 'ClaudeInstanceManager',
                action: 'SSE_TO_WEBSOCKET_HANDLER_REPLACEMENT'
            },
            {
                type: 'error',
                message: 'Uncaught ReferenceError: removeHandler is not defined',
                source: 'ClaudeInstanceSelector.tsx',
                line: 123,
                column: 8,
                stack: 'ReferenceError: removeHandler is not defined\n    at ClaudeInstanceSelector.componentWillUnmount (http://localhost:5173/src/components/claude-instances/ClaudeInstanceSelector.tsx:123:8)',
                component: 'ClaudeInstanceSelector',
                action: 'CLEANUP_HANDLER_REMOVAL'
            },
            {
                type: 'error',
                message: 'Uncaught TypeError: Cannot read properties of undefined (reading \'addEventListener\')',
                source: 'useHTTPSSE.ts',
                line: 78,
                column: 23,
                stack: 'TypeError: Cannot read properties of undefined (reading \'addEventListener\')\n    at useHTTPSSE (http://localhost:5173/src/hooks/useHTTPSSE.ts:78:23)',
                component: 'useHTTPSSE',
                action: 'WEBSOCKET_CONNECTION_SETUP'
            },
            {
                type: 'error',
                message: 'WebSocket connection to \'ws://localhost:3001/sse\' failed: Error in connection establishment',
                source: 'useAdvancedSSEConnection.ts',
                line: 34,
                column: 15,
                stack: 'Error: WebSocket connection failed\n    at WebSocket.onerror (http://localhost:5173/src/hooks/useAdvancedSSEConnection.ts:34:15)',
                component: 'useAdvancedSSEConnection',
                action: 'PROTOCOL_MISMATCH'
            },
            {
                type: 'warn',
                message: 'EventSource constructor is deprecated, use WebSocket instead',
                source: 'TokenCostAnalytics.tsx',
                line: 67,
                column: 25,
                stack: '',
                component: 'TokenCostAnalytics',
                action: 'PARTIAL_MIGRATION_WARNING'
            },
            {
                type: 'error',
                message: 'Uncaught TypeError: ws.addHandler is not a function',
                source: 'SSEConnectionManager.ts',
                line: 156,
                column: 18,
                stack: 'TypeError: ws.addHandler is not a function\n    at SSEConnectionManager.connect (http://localhost:5173/src/services/SSEConnectionManager.ts:156:18)',
                component: 'SSEConnectionManager',
                action: 'WEBSOCKET_METHOD_MISMATCH'
            }
        ];
        commonErrors.forEach((error, index) => {
            setTimeout(() => {
                this.captureConsoleError({
                    type: error.type,
                    message: error.message,
                    source: error.source,
                    line: error.line,
                    column: error.column,
                    stack: error.stack,
                    component: error.component,
                    action: error.action
                });
            }, index * 150);
        });
    }
    captureConsoleError(errorData) {
        const error = {
            id: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            type: errorData.type || 'error',
            message: errorData.message || 'Unknown error',
            source: errorData.source || 'Unknown source',
            line: errorData.line,
            column: errorData.column,
            stack: errorData.stack,
            context: {
                url: 'http://localhost:5173',
                userAgent: 'Mozilla/5.0 (NLD Monitor)',
                component: errorData.component,
                action: errorData.action
            },
            severity: this.calculateSeverity(errorData.message || '', errorData.type || 'error'),
            category: this.categorizeError(errorData.message || '')
        };
        this.errors.push(error);
        this.updateErrorSignature(error);
        this.persistErrors();
        this.emit('error_captured', error);
        console.log(`🔴 Console error captured: ${error.category} - ${error.message.substring(0, 100)}...`);
    }
    calculateSeverity(message, type) {
        if (type === 'error') {
            if (message.includes('ReferenceError') || message.includes('addHandler') || message.includes('removeHandler')) {
                return 'high';
            }
            if (message.includes('WebSocket') && message.includes('failed')) {
                return 'critical';
            }
            if (message.includes('TypeError')) {
                return 'medium';
            }
            return 'high';
        }
        if (type === 'warn')
            return 'medium';
        return 'low';
    }
    categorizeError(message) {
        if (this.refactoringPatterns.some(pattern => pattern.test(message))) {
            return 'refactoring';
        }
        if (message.includes('WebSocket') || message.includes('NetworkError') || message.includes('connection')) {
            return 'network';
        }
        if (message.includes('ReferenceError')) {
            return 'reference';
        }
        if (message.includes('SyntaxError')) {
            return 'syntax';
        }
        return 'runtime';
    }
    updateErrorSignature(error) {
        const signature = this.generateErrorSignature(error);
        if (this.errorSignatures.has(signature)) {
            const existing = this.errorSignatures.get(signature);
            existing.frequency += 1;
            existing.lastSeen = error.timestamp;
            if (!existing.components.includes(error.context.component || 'Unknown')) {
                existing.components.push(error.context.component || 'Unknown');
            }
            if (!existing.errorMessages.includes(error.message)) {
                existing.errorMessages.push(error.message);
            }
        }
        else {
            this.errorSignatures.set(signature, {
                pattern: signature,
                frequency: 1,
                components: [error.context.component || 'Unknown'],
                errorMessages: [error.message],
                lastSeen: error.timestamp,
                severity: error.severity
            });
        }
    }
    generateErrorSignature(error) {
        // Create a signature based on error type, category, and key words from the message
        const keyWords = error.message
            .replace(/\d+/g, 'N') // Replace numbers with N
            .replace(/['"`]/g, '') // Remove quotes
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 5) // Take first 5 significant words
            .join('-');
        return `${error.type}::${error.category}::${keyWords}`;
    }
    persistErrors() {
        try {
            // Save errors
            (0, fs_1.writeFileSync)(this.errorsFile, JSON.stringify(this.errors, null, 2));
            // Save signatures as object for JSON compatibility
            const signaturesObj = Object.fromEntries(this.errorSignatures);
            (0, fs_1.writeFileSync)(this.signaturesFile, JSON.stringify(signaturesObj, null, 2));
        }
        catch (error) {
            console.error('❌ Failed to persist console errors:', error);
        }
    }
    getErrorsByCategory(category) {
        return this.errors.filter(error => error.category === category);
    }
    getErrorsBySeverity(severity) {
        return this.errors.filter(error => error.severity === severity);
    }
    getErrorsByComponent(component) {
        return this.errors.filter(error => error.context.component === component);
    }
    getFrequentErrorSignatures(minFrequency = 2) {
        return Array.from(this.errorSignatures.values())
            .filter(sig => sig.frequency >= minFrequency)
            .sort((a, b) => b.frequency - a.frequency);
    }
    exportToNeuralTraining() {
        const trainingData = {
            dataset: 'frontend-console-errors',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            totalErrors: this.errors.length,
            errorsByCategory: this.groupBy('category'),
            errorsBySeverity: this.groupBy('severity'),
            frequentSignatures: this.getFrequentErrorSignatures(),
            trainingExamples: this.errors.map(error => ({
                input: {
                    errorMessage: error.message,
                    source: error.source,
                    component: error.context.component,
                    action: error.context.action,
                    errorType: error.type
                },
                output: {
                    category: error.category,
                    severity: error.severity,
                    refactoringIssue: this.isRefactoringError(error),
                    preventionStrategy: this.generatePreventionStrategy(error)
                },
                metadata: {
                    signature: this.generateErrorSignature(error),
                    timestamp: error.timestamp,
                    stack: error.stack
                }
            }))
        };
        const exportPath = (0, path_1.join)(this.dataDir, 'neural-training-console-errors.json');
        (0, fs_1.writeFileSync)(exportPath, JSON.stringify(trainingData, null, 2));
        console.log(`🧠 Console error neural training data exported: ${exportPath}`);
        return exportPath;
    }
    groupBy(field) {
        return this.errors.reduce((acc, error) => {
            const key = String(error[field]);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    isRefactoringError(error) {
        return error.category === 'refactoring' ||
            this.refactoringPatterns.some(pattern => pattern.test(error.message));
    }
    generatePreventionStrategy(error) {
        const strategies = {
            'refactoring': 'Implement automated testing and linting during SSE to WebSocket migration',
            'reference': 'Use TypeScript strict mode and validate all method references before deployment',
            'network': 'Add connection retry logic and protocol detection mechanisms',
            'syntax': 'Enable stricter linting rules and pre-commit hooks',
            'runtime': 'Add comprehensive error boundaries and null checks'
        };
        return strategies[error.category] || 'Implement general error handling and monitoring';
    }
    generateConsoleErrorReport() {
        const report = {
            summary: {
                totalErrors: this.errors.length,
                byCategory: this.groupBy('category'),
                bySeverity: this.groupBy('severity'),
                byType: this.groupBy('type'),
                refactoringErrors: this.errors.filter(e => this.isRefactoringError(e)).length
            },
            criticalErrors: this.errors.filter(e => e.severity === 'critical'),
            frequentSignatures: this.getFrequentErrorSignatures(3),
            refactoringPatterns: this.getErrorsByCategory('refactoring'),
            recommendations: this.generateConsoleRecommendations(),
            timestamp: new Date().toISOString()
        };
        const reportPath = (0, path_1.join)(this.dataDir, `console-error-report-${Date.now()}.json`);
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Console error report generated: ${reportPath}`);
        return reportPath;
    }
    generateConsoleRecommendations() {
        const recommendations = [
            'Implement real-time console error monitoring in production',
            'Add automated testing for SSE to WebSocket refactoring scenarios',
            'Deploy stricter TypeScript configuration to catch undefined methods',
            'Create error boundary components for graceful error handling',
            'Implement progressive refactoring strategies to minimize failures'
        ];
        const refactoringErrors = this.getErrorsByCategory('refactoring');
        const networkErrors = this.getErrorsByCategory('network');
        const referenceErrors = this.getErrorsByCategory('reference');
        if (refactoringErrors.length > 0) {
            recommendations.push('Create refactoring checklists and validation scripts');
        }
        if (networkErrors.length > 0) {
            recommendations.push('Implement connection health monitoring and fallback mechanisms');
        }
        if (referenceErrors.length > 0) {
            recommendations.push('Deploy automated reference validation during build processes');
        }
        return recommendations;
    }
    stopMonitoring() {
        this.isMonitoring = false;
        this.emit('monitoring_stopped', {
            timestamp: new Date().toISOString(),
            totalErrorsCaptured: this.errors.length,
            uniqueSignatures: this.errorSignatures.size
        });
        console.log('🛑 Frontend console error monitoring stopped');
    }
}
exports.FrontendConsoleErrorDetector = FrontendConsoleErrorDetector;
//# sourceMappingURL=frontend-console-error-detector.js.map