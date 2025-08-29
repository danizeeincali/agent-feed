"use strict";
/**
 * Network Failure Pattern Detector - NLD System
 *
 * Captures and analyzes network error patterns from frontend console logs,
 * failed requests, CORS issues, timeouts, and endpoint mismatches.
 *
 * This system builds a comprehensive database of network failure patterns
 * for neural training and future prevention.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkFailurePatternDetector = void 0;
class NetworkFailurePatternDetector {
    patterns = new Map();
    metrics;
    consoleObserver = null;
    networkInterceptor = null;
    constructor() {
        this.metrics = {
            totalFailures: 0,
            failuresByType: {},
            averageResponseTime: 0,
            peakFailureHours: [],
            mostFailedEndpoints: [],
            corsFailureRate: 0,
            timeoutRate: 0
        };
        this.initializeMonitoring();
    }
    initializeMonitoring() {
        // Monitor console errors
        this.interceptConsoleErrors();
        // Monitor fetch requests
        this.interceptNetworkRequests();
        // Monitor WebSocket connections
        this.interceptWebSocketConnections();
        // Monitor unhandled promise rejections
        this.interceptPromiseRejections();
        console.log('🔍 Network Failure Pattern Detector initialized');
    }
    interceptConsoleErrors() {
        const originalError = console.error;
        const originalWarn = console.warn;
        console.error = (...args) => {
            originalError.apply(console, args);
            this.analyzeConsoleError('error', args);
        };
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.analyzeConsoleError('warn', args);
        };
    }
    interceptNetworkRequests() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const method = args[1]?.method || 'GET';
            try {
                const response = await originalFetch(...args);
                const responseTime = performance.now() - startTime;
                if (!response.ok) {
                    this.captureNetworkFailure({
                        url,
                        method,
                        statusCode: response.status,
                        responseTime,
                        errorType: this.classifyStatusCode(response.status),
                        message: `HTTP ${response.status}: ${response.statusText}`
                    });
                }
                return response;
            }
            catch (error) {
                const responseTime = performance.now() - startTime;
                this.captureNetworkFailure({
                    url,
                    method,
                    responseTime,
                    errorType: this.classifyNetworkError(error),
                    message: error.message,
                    stack: error.stack
                });
                throw error;
            }
        };
        // Intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._method = method;
            this._url = typeof url === 'string' ? url : url.href;
            this._startTime = performance.now();
            return originalXHROpen.call(this, method, url, ...args);
        };
        XMLHttpRequest.prototype.send = function (...args) {
            this.addEventListener('error', () => {
                const responseTime = performance.now() - this._startTime;
                this.captureNetworkFailure({
                    url: this._url,
                    method: this._method,
                    responseTime,
                    errorType: 'NETWORK_ERROR',
                    message: 'XMLHttpRequest network error'
                });
            }, bind(this));
            this.addEventListener('timeout', () => {
                const responseTime = performance.now() - this._startTime;
                this.captureNetworkFailure({
                    url: this._url,
                    method: this._method,
                    responseTime,
                    errorType: 'TIMEOUT',
                    message: 'XMLHttpRequest timeout'
                });
            }, bind(this));
            return originalXHRSend.call(this, ...args);
        };
    }
    interceptWebSocketConnections() {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
            constructor(url, protocols) {
                super(url, protocols);
                const wsUrl = typeof url === 'string' ? url : url.href;
                this.addEventListener('error', (event) => {
                    this.captureNetworkFailure({
                        url: wsUrl,
                        method: 'WS_CONNECT',
                        errorType: 'NETWORK_ERROR',
                        message: 'WebSocket connection error'
                    });
                }, bind(this));
                this.addEventListener('close', (event) => {
                    if (event.code !== 1000) { // Not normal closure
                        this.captureNetworkFailure({
                            url: wsUrl,
                            method: 'WS_CLOSE',
                            statusCode: event.code,
                            errorType: 'NETWORK_ERROR',
                            message: `WebSocket closed abnormally: ${event.reason || 'No reason'}`
                        });
                    }
                }, bind(this));
            }
        };
    }
    interceptPromiseRejections() {
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason;
            if (this.isNetworkError(error)) {
                this.captureNetworkFailure({
                    errorType: 'NETWORK_ERROR',
                    message: error?.message || 'Unhandled network error',
                    stack: error?.stack
                });
            }
        });
    }
    analyzeConsoleError(level, args) {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        // Check for network-related console errors
        const networkPatterns = [
            /network error/i,
            /cors/i,
            /failed to fetch/i,
            /timeout/i,
            /connection refused/i,
            /endpoint.*not found/i,
            /api.*error/i,
            /websocket.*error/i
        ];
        if (networkPatterns.some(pattern => pattern.test(message))) {
            this.captureNetworkFailure({
                errorType: this.classifyConsoleError(message),
                message,
                consoleLevel: level
            });
        }
    }
    captureNetworkFailure(details) {
        const pattern = {
            id: `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            errorType: details.errorType || 'NETWORK_ERROR',
            severity: this.calculateSeverity(details),
            context: {
                url: details.url,
                method: details.method,
                statusCode: details.statusCode,
                responseTime: details.responseTime,
                userAgent: navigator.userAgent,
                referer: document.referrer
            },
            errorDetails: {
                message: details.message,
                stack: details.stack,
                consoleErrors: this.getRecentConsoleErrors(),
                networkLogs: this.getRecentNetworkLogs()
            },
            patterns: {
                isRecurring: this.checkIfRecurring(details),
                frequency: this.calculateFrequency(details),
                relatedErrors: this.findRelatedErrors(details),
                preventionStrategies: this.generatePreventionStrategies(details)
            },
            tddImpact: {
                wouldTddPrevent: this.assessTddPrevention(details),
                testingGap: this.identifyTestingGap(details),
                recommendedTests: this.generateTestRecommendations(details)
            }
        };
        this.patterns.set(pattern.id, pattern);
        this.updateMetrics(pattern);
        this.logPattern(pattern);
    }
    classifyStatusCode(status) {
        if (status >= 400 && status < 500) {
            if (status === 401 || status === 403)
                return 'AUTH_FAILURE';
            if (status === 404)
                return 'ENDPOINT_MISMATCH';
            return 'NETWORK_ERROR';
        }
        if (status >= 500)
            return 'SERVER_ERROR';
        return 'NETWORK_ERROR';
    }
    classifyNetworkError(error) {
        const message = error?.message?.toLowerCase() || '';
        if (message.includes('cors'))
            return 'CORS';
        if (message.includes('timeout'))
            return 'TIMEOUT';
        if (message.includes('auth'))
            return 'AUTH_FAILURE';
        if (message.includes('endpoint') || message.includes('not found'))
            return 'ENDPOINT_MISMATCH';
        return 'NETWORK_ERROR';
    }
    classifyConsoleError(message) {
        const msg = message.toLowerCase();
        if (msg.includes('cors'))
            return 'CORS';
        if (msg.includes('timeout'))
            return 'TIMEOUT';
        if (msg.includes('endpoint') || msg.includes('not found'))
            return 'ENDPOINT_MISMATCH';
        if (msg.includes('auth'))
            return 'AUTH_FAILURE';
        return 'NETWORK_ERROR';
    }
    calculateSeverity(details) {
        // Critical: Auth failures, CORS issues that block functionality
        if (details.errorType === 'AUTH_FAILURE' || details.errorType === 'CORS') {
            return 'critical';
        }
        // High: Server errors, timeouts
        if (details.errorType === 'SERVER_ERROR' || details.errorType === 'TIMEOUT') {
            return 'high';
        }
        // Medium: Endpoint mismatches
        if (details.errorType === 'ENDPOINT_MISMATCH') {
            return 'medium';
        }
        return 'low';
    }
    checkIfRecurring(details) {
        const similarErrors = Array.from(this.patterns.values()).filter(pattern => {
            return pattern.errorType === details.errorType &&
                pattern.context.url === details.url &&
                pattern.timestamp > Date.now() - (30 * 60 * 1000); // Last 30 minutes
        });
        return similarErrors.length > 2;
    }
    calculateFrequency(details) {
        const similarErrors = Array.from(this.patterns.values()).filter(pattern => {
            return pattern.errorType === details.errorType &&
                pattern.context.url === details.url;
        });
        return similarErrors.length;
    }
    findRelatedErrors(details) {
        const related = Array.from(this.patterns.values())
            .filter(pattern => pattern.timestamp > Date.now() - (10 * 60 * 1000) && // Last 10 minutes
            (pattern.context.url === details.url || pattern.errorType === details.errorType))
            .map(pattern => pattern.id)
            .slice(0, 5);
        return related;
    }
    generatePreventionStrategies(details) {
        const strategies = [];
        switch (details.errorType) {
            case 'CORS':
                strategies.push('Add CORS headers to backend');
                strategies.push('Use proxy configuration in development');
                strategies.push('Implement preflight request handling');
                break;
            case 'TIMEOUT':
                strategies.push('Implement request timeout handling');
                strategies.push('Add retry mechanism with exponential backoff');
                strategies.push('Use loading states to improve UX');
                break;
            case 'ENDPOINT_MISMATCH':
                strategies.push('Implement API versioning');
                strategies.push('Add endpoint validation');
                strategies.push('Use OpenAPI/Swagger for API contracts');
                break;
            case 'AUTH_FAILURE':
                strategies.push('Implement token refresh mechanism');
                strategies.push('Add proper authentication flow');
                strategies.push('Handle 401/403 responses gracefully');
                break;
        }
        return strategies;
    }
    assessTddPrevention(details) {
        // TDD could prevent many network issues through:
        // - Integration tests for API endpoints
        // - Mock testing for network failures
        // - Contract testing for API agreements
        return ['ENDPOINT_MISMATCH', 'AUTH_FAILURE'].includes(details.errorType);
    }
    identifyTestingGap(details) {
        switch (details.errorType) {
            case 'CORS':
                return 'Missing CORS integration tests';
            case 'TIMEOUT':
                return 'Missing timeout handling tests';
            case 'ENDPOINT_MISMATCH':
                return 'Missing API contract tests';
            case 'AUTH_FAILURE':
                return 'Missing authentication flow tests';
            default:
                return 'Missing network error handling tests';
        }
    }
    generateTestRecommendations(details) {
        const tests = [];
        switch (details.errorType) {
            case 'CORS':
                tests.push('Test CORS preflight requests');
                tests.push('Verify cross-origin request headers');
                break;
            case 'TIMEOUT':
                tests.push('Test request timeout scenarios');
                tests.push('Verify timeout error handling');
                tests.push('Test retry mechanism');
                break;
            case 'ENDPOINT_MISMATCH':
                tests.push('Test API endpoint existence');
                tests.push('Validate request/response contracts');
                tests.push('Test 404 error handling');
                break;
            case 'AUTH_FAILURE':
                tests.push('Test authentication token validation');
                tests.push('Test unauthorized request handling');
                tests.push('Test token refresh flow');
                break;
        }
        return tests;
    }
    isNetworkError(error) {
        if (!error)
            return false;
        const message = error.message?.toLowerCase() || '';
        const stack = error.stack?.toLowerCase() || '';
        const networkKeywords = [
            'network', 'fetch', 'cors', 'timeout', 'connection',
            'endpoint', 'api', 'http', 'websocket', 'xhr'
        ];
        return networkKeywords.some(keyword => message.includes(keyword) || stack.includes(keyword));
    }
    getRecentConsoleErrors() {
        // This would need to be implemented with actual console log capture
        return [];
    }
    getRecentNetworkLogs() {
        // This would capture recent network request logs
        return [];
    }
    updateMetrics(pattern) {
        this.metrics.totalFailures++;
        this.metrics.failuresByType[pattern.errorType] =
            (this.metrics.failuresByType[pattern.errorType] || 0) + 1;
        if (pattern.context.responseTime) {
            this.metrics.averageResponseTime =
                (this.metrics.averageResponseTime + pattern.context.responseTime) / 2;
        }
        // Update endpoint failure tracking
        if (pattern.context.url) {
            const existing = this.metrics.mostFailedEndpoints.find(e => e.endpoint === pattern.context.url);
            if (existing) {
                existing.count++;
            }
            else {
                this.metrics.mostFailedEndpoints.push({ endpoint: pattern.context.url, count: 1 });
            }
            this.metrics.mostFailedEndpoints.sort((a, b) => b.count - a.count);
            this.metrics.mostFailedEndpoints = this.metrics.mostFailedEndpoints.slice(0, 10);
        }
    }
    logPattern(pattern) {
        console.log(`🚨 [NLD] Network Failure Captured:`, {
            type: pattern.errorType,
            severity: pattern.severity,
            url: pattern.context.url,
            message: pattern.errorDetails.message,
            tddPrevention: pattern.tddImpact.wouldTddPrevent
        });
    }
    // Public API
    getPatterns() {
        return Array.from(this.patterns.values());
    }
    getMetrics() {
        return { ...this.metrics };
    }
    exportForNeuralTraining() {
        return {
            patterns: this.getPatterns(),
            metrics: this.getMetrics(),
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }
    getPatternsForTDD() {
        return this.getPatterns()
            .filter(p => p.tddImpact.wouldTddPrevent)
            .map(pattern => ({
            pattern,
            testSuggestions: pattern.tddImpact.recommendedTests,
            preventionStrategy: pattern.patterns.preventionStrategies.join(', ')
        }));
    }
}
exports.NetworkFailurePatternDetector = NetworkFailurePatternDetector;
// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.NLD_NetworkDetector = new NetworkFailurePatternDetector();
}
//# sourceMappingURL=network-failure-pattern-detector.js.map