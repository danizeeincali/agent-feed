"use strict";
/**
 * Frontend-Backend Communication Pattern Analyzer - NLD System
 *
 * Analyzes communication patterns between frontend and backend,
 * detects anti-patterns, and provides TDD-based prevention strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendBackendCommunicationAnalyzer = void 0;
class FrontendBackendCommunicationAnalyzer {
    patterns = new Map();
    activeConnections = new Map();
    performanceBuffer = [];
    pollingTracker = new Map();
    memoryTracker = { used: 0, timestamps: [] };
    constructor() {
        this.initializeCommunicationMonitoring();
        this.initializePerformanceTracking();
        this.initializeAntiPatternDetection();
        console.log('🔄 Frontend-Backend Communication Analyzer initialized');
    }
    initializeCommunicationMonitoring() {
        // Monitor HTTP requests
        this.interceptHTTPCommunication();
        // Monitor WebSocket connections
        this.interceptWebSocketCommunication();
        // Monitor Server-Sent Events
        this.interceptSSECommunication();
        // Monitor resource usage
        this.initializeResourceMonitoring();
    }
    interceptHTTPCommunication() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const options = args[1] || {};
            const method = options.method || 'GET';
            // Track request initiation
            const requestId = this.generateRequestId();
            this.trackRequestStart(requestId, url, method, options);
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                // Analyze response
                const responseSize = this.estimateResponseSize(response);
                this.analyzeCommunicationPattern({
                    requestId,
                    url,
                    method,
                    duration,
                    responseSize,
                    success: response.ok,
                    statusCode: response.status,
                    type: 'REQUEST_RESPONSE'
                });
                return response;
            }
            catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.analyzeCommunicationPattern({
                    requestId,
                    url,
                    method,
                    duration,
                    responseSize: 0,
                    success: false,
                    error: error.message,
                    type: 'REQUEST_RESPONSE'
                });
                throw error;
            }
        };
    }
    interceptWebSocketCommunication() {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
            _connectionId;
            _analyzer;
            constructor(url, protocols) {
                super(url, protocols);
                this._connectionId = this.generateConnectionId();
                this._analyzer = this;
                const wsUrl = typeof url === 'string' ? url : url.href;
                const startTime = performance.now();
                // Track connection lifecycle
                this.addEventListener('open', () => {
                    const duration = performance.now() - startTime;
                    this.trackWebSocketConnection(this._connectionId, wsUrl, 'CONNECTED', duration);
                });
                this.addEventListener('message', (event) => {
                    this.trackWebSocketMessage(this._connectionId, 'RECEIVED', event.data);
                });
                this.addEventListener('close', (event) => {
                    this.trackWebSocketConnection(this._connectionId, wsUrl, 'CLOSED', 0, event.code);
                });
                this.addEventListener('error', () => {
                    this.trackWebSocketConnection(this._connectionId, wsUrl, 'ERROR', 0);
                });
                // Override send method
                const originalSend = this.send;
                this.send = function (data) {
                    this._analyzer.trackWebSocketMessage(this._connectionId, 'SENT', data);
                    return originalSend.call(this, data);
                };
            }
            generateConnectionId() {
                return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        };
    }
    interceptSSECommunication() {
        const originalEventSource = window.EventSource;
        window.EventSource = class extends originalEventSource {
            _connectionId;
            _analyzer;
            constructor(url, eventSourceInitDict) {
                super(url, eventSourceInitDict);
                this._connectionId = this.generateConnectionId();
                this._analyzer = this;
                const sseUrl = typeof url === 'string' ? url : url.href;
                const startTime = performance.now();
                this.addEventListener('open', () => {
                    const duration = performance.now() - startTime;
                    this.trackSSEConnection(this._connectionId, sseUrl, 'CONNECTED', duration);
                });
                this.addEventListener('message', (event) => {
                    this.trackSSEMessage(this._connectionId, event.data);
                });
                this.addEventListener('error', () => {
                    this.trackSSEConnection(this._connectionId, sseUrl, 'ERROR', 0);
                });
            }
            generateConnectionId() {
                return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        };
    }
    initializeResourceMonitoring() {
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                this.updateMemoryUsage(memInfo.usedJSHeapSize);
            }, 5000);
        }
        // Monitor connection count
        setInterval(() => {
            this.analyzeConnectionHealth();
        }, 10000);
    }
    initializePerformanceTracking() {
        // Track performance entries
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'resource') {
                        this.analyzeResourcePerformance(entry);
                    }
                }
            });
            try {
                observer.observe({ entryTypes: ['resource'] });
            }
            catch (e) {
                console.warn('[NLD] PerformanceObserver not fully supported');
            }
        }
    }
    initializeAntiPatternDetection() {
        // Detect polling patterns
        setInterval(() => {
            this.detectPollingAntiPatterns();
        }, 30000);
        // Detect connection leaks
        setInterval(() => {
            this.detectConnectionLeaks();
        }, 60000);
        // Detect data overfetching
        setInterval(() => {
            this.detectDataOverfetching();
        }, 45000);
    }
    trackRequestStart(requestId, url, method, options) {
        this.activeConnections.set(requestId, {
            url,
            method,
            startTime: Date.now(),
            type: 'HTTP'
        });
        // Track polling patterns
        this.trackPollingPattern(url, method);
    }
    trackPollingPattern(url, method) {
        const key = `${method}:${url}`;
        const now = Date.now();
        const existing = this.pollingTracker.get(key);
        if (existing) {
            existing.count++;
            existing.lastRequest = now;
        }
        else {
            this.pollingTracker.set(key, { count: 1, lastRequest: now });
        }
    }
    analyzeCommunicationPattern(data) {
        const pattern = {
            id: data.requestId,
            timestamp: Date.now(),
            type: data.type,
            direction: 'FRONTEND_TO_BACKEND',
            status: data.success ? 'SUCCESS' : 'FAILURE',
            details: {
                protocol: 'HTTP',
                url: data.url,
                method: data.method,
                dataSize: data.responseSize || 0,
                duration: data.duration,
                retryCount: 0
            },
            performance: {
                latency: data.duration,
                throughput: data.responseSize ? (data.responseSize / data.duration) * 1000 : 0,
                errorRate: data.success ? 0 : 1,
                resourceUsage: {
                    memory: this.getCurrentMemoryUsage(),
                    cpu: 0, // Would need additional tracking
                    bandwidth: data.responseSize || 0
                }
            },
            tddPrevention: {
                integrationTests: this.generateIntegrationTests(data),
                contractTests: this.generateContractTests(data),
                performanceTests: this.generatePerformanceTests(data),
                monitoringChecks: this.generateMonitoringChecks(data)
            }
        };
        // Detect anti-patterns
        const antiPattern = this.detectAntiPattern(pattern);
        if (antiPattern) {
            pattern.antiPattern = antiPattern;
        }
        this.patterns.set(pattern.id, pattern);
        this.updatePerformanceBuffer(pattern);
        this.logCommunicationPattern(pattern);
        // Clean up tracking
        this.activeConnections.delete(data.requestId);
    }
    trackWebSocketConnection(connectionId, url, status, duration, closeCode) {
        const pattern = {
            id: connectionId,
            timestamp: Date.now(),
            type: 'WEBSOCKET',
            direction: 'BIDIRECTIONAL',
            status: status === 'CONNECTED' ? 'SUCCESS' : status === 'ERROR' ? 'FAILURE' : 'SUCCESS',
            details: {
                protocol: 'WS',
                url,
                dataSize: 0,
                duration,
                retryCount: 0
            },
            performance: {
                latency: duration,
                throughput: 0,
                errorRate: status === 'ERROR' ? 1 : 0,
                resourceUsage: {
                    memory: this.getCurrentMemoryUsage(),
                    cpu: 0,
                    bandwidth: 0
                }
            },
            tddPrevention: {
                integrationTests: ['Test WebSocket connection lifecycle', 'Test WebSocket error handling'],
                contractTests: ['Test WebSocket message format validation'],
                performanceTests: ['Test WebSocket connection performance'],
                monitoringChecks: ['Monitor WebSocket connection status', 'Monitor connection count']
            }
        };
        this.patterns.set(pattern.id, pattern);
        if (status === 'CONNECTED') {
            this.activeConnections.set(connectionId, { type: 'WS', url, startTime: Date.now() });
        }
        else {
            this.activeConnections.delete(connectionId);
        }
    }
    trackWebSocketMessage(connectionId, direction, data) {
        const messageSize = this.estimateDataSize(data);
        const existing = this.patterns.get(connectionId);
        if (existing) {
            existing.details.dataSize += messageSize;
            existing.performance.bandwidth += messageSize;
            existing.performance.throughput = existing.details.dataSize / (Date.now() - existing.timestamp);
        }
    }
    trackSSEConnection(connectionId, url, status, duration) {
        const pattern = {
            id: connectionId,
            timestamp: Date.now(),
            type: 'SSE',
            direction: 'BACKEND_TO_FRONTEND',
            status: status === 'CONNECTED' ? 'SUCCESS' : 'FAILURE',
            details: {
                protocol: 'SSE',
                url,
                dataSize: 0,
                duration,
                retryCount: 0
            },
            performance: {
                latency: duration,
                throughput: 0,
                errorRate: status === 'ERROR' ? 1 : 0,
                resourceUsage: {
                    memory: this.getCurrentMemoryUsage(),
                    cpu: 0,
                    bandwidth: 0
                }
            },
            tddPrevention: {
                integrationTests: ['Test SSE connection establishment', 'Test SSE reconnection logic'],
                contractTests: ['Test SSE event format validation'],
                performanceTests: ['Test SSE streaming performance'],
                monitoringChecks: ['Monitor SSE connection health', 'Monitor event throughput']
            }
        };
        this.patterns.set(pattern.id, pattern);
        if (status === 'CONNECTED') {
            this.activeConnections.set(connectionId, { type: 'SSE', url, startTime: Date.now() });
        }
        else {
            this.activeConnections.delete(connectionId);
        }
    }
    trackSSEMessage(connectionId, data) {
        const messageSize = this.estimateDataSize(data);
        const existing = this.patterns.get(connectionId);
        if (existing) {
            existing.details.dataSize += messageSize;
            existing.performance.bandwidth += messageSize;
            existing.performance.throughput = existing.details.dataSize / (Date.now() - existing.timestamp);
        }
    }
    detectAntiPattern(pattern) {
        // Detect chatty interface
        if (this.isChattyInterface(pattern)) {
            return {
                type: 'CHATTY_INTERFACE',
                severity: 'medium',
                description: 'Too many small requests instead of batching',
                impact: ['High latency', 'Server overhead', 'Network inefficiency']
            };
        }
        // Detect polling storm
        if (this.isPollingStorm(pattern)) {
            return {
                type: 'POLLING_STORM',
                severity: 'high',
                description: 'Excessive polling frequency detected',
                impact: ['Server overload', 'Bandwidth waste', 'Battery drain']
            };
        }
        // Detect data overfetching
        if (this.isDataOverfetching(pattern)) {
            return {
                type: 'DATA_OVERFETCH',
                severity: 'medium',
                description: 'Fetching more data than necessary',
                impact: ['Bandwidth waste', 'Memory bloat', 'Slow rendering']
            };
        }
        return undefined;
    }
    isChattyInterface(pattern) {
        if (pattern.type !== 'REQUEST_RESPONSE')
            return false;
        // Check if there are many small requests to the same endpoint
        const recentPatterns = Array.from(this.patterns.values())
            .filter(p => p.details.url === pattern.details.url &&
            p.timestamp > Date.now() - 60000 && // Last minute
            p.details.dataSize < 1000 // Small requests
        );
        return recentPatterns.length > 10;
    }
    isPollingStorm(pattern) {
        if (pattern.type !== 'REQUEST_RESPONSE')
            return false;
        const key = `${pattern.details.method}:${pattern.details.url}`;
        const polling = this.pollingTracker.get(key);
        return polling ? polling.count > 60 : false; // More than 60 requests tracked
    }
    isDataOverfetching(pattern) {
        // Heuristic: response size > 100KB might be overfetching
        return pattern.details.dataSize > 100000;
    }
    detectPollingAntiPatterns() {
        const now = Date.now();
        for (const [endpoint, data] of this.pollingTracker) {
            // Check if polling too frequently (less than 5 second intervals)
            const avgInterval = (now - (now - 300000)) / data.count; // Last 5 minutes
            if (avgInterval < 5000 && data.count > 20) {
                console.warn(`🚨 [NLD] Polling storm detected: ${endpoint} (${data.count} requests, avg interval: ${avgInterval}ms)`);
                // Create anti-pattern record
                this.recordAntiPattern('POLLING_STORM', endpoint, {
                    frequency: data.count,
                    avgInterval,
                    recommendation: 'Consider WebSocket or SSE for real-time updates'
                });
            }
        }
        // Clean up old entries
        this.cleanupPollingTracker();
    }
    detectConnectionLeaks() {
        const now = Date.now();
        const staleConnections = [];
        for (const [connectionId, connection] of this.activeConnections) {
            const age = now - connection.startTime;
            // Connections older than 30 minutes might be leaks
            if (age > 1800000) {
                staleConnections.push({ connectionId, connection, age });
            }
        }
        if (staleConnections.length > 0) {
            console.warn(`🚨 [NLD] Potential connection leaks detected: ${staleConnections.length} stale connections`);
            this.recordAntiPattern('CONNECTION_LEAK', 'multiple', {
                count: staleConnections.length,
                oldestAge: Math.max(...staleConnections.map(c => c.age)),
                recommendation: 'Implement connection cleanup and timeout handling'
            });
        }
    }
    detectDataOverfetching() {
        const recentPatterns = Array.from(this.patterns.values())
            .filter(p => p.timestamp > Date.now() - 300000) // Last 5 minutes
            .filter(p => p.details.dataSize > 50000); // Large responses
        if (recentPatterns.length > 5) {
            const totalSize = recentPatterns.reduce((sum, p) => sum + p.details.dataSize, 0);
            const avgSize = totalSize / recentPatterns.length;
            console.warn(`🚨 [NLD] Data overfetching detected: ${recentPatterns.length} large responses, avg size: ${(avgSize / 1024).toFixed(1)}KB`);
            this.recordAntiPattern('DATA_OVERFETCH', 'multiple', {
                count: recentPatterns.length,
                totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                recommendation: 'Implement pagination, filtering, or GraphQL for selective data fetching'
            });
        }
    }
    recordAntiPattern(type, endpoint, details) {
        // This would be stored in a persistent anti-pattern database
        console.log(`📊 [NLD Anti-Pattern] ${type} detected for ${endpoint}:`, details);
    }
    analyzeResourcePerformance(entry) {
        const duration = entry.responseEnd - entry.fetchStart;
        const size = entry.transferSize || 0;
        this.performanceBuffer.push({
            timestamp: Date.now(),
            latency: duration,
            size
        });
        // Keep buffer size manageable
        if (this.performanceBuffer.length > 1000) {
            this.performanceBuffer = this.performanceBuffer.slice(-500);
        }
    }
    analyzeConnectionHealth() {
        const activeCount = this.activeConnections.size;
        const now = Date.now();
        // Check for connection count issues
        if (activeCount > 50) {
            console.warn(`🚨 [NLD] High connection count: ${activeCount} active connections`);
        }
        // Check for long-running connections
        const longRunning = Array.from(this.activeConnections.values())
            .filter(conn => now - conn.startTime > 1800000) // 30 minutes
            .length;
        if (longRunning > 10) {
            console.warn(`🚨 [NLD] Too many long-running connections: ${longRunning}`);
        }
    }
    updateMemoryUsage(used) {
        this.memoryTracker.used = used;
        this.memoryTracker.timestamps.push(Date.now());
        // Keep last 60 measurements (5 minutes at 5-second intervals)
        if (this.memoryTracker.timestamps.length > 60) {
            this.memoryTracker.timestamps = this.memoryTracker.timestamps.slice(-60);
        }
    }
    getCurrentMemoryUsage() {
        return this.memoryTracker.used;
    }
    updatePerformanceBuffer(pattern) {
        this.performanceBuffer.push({
            timestamp: pattern.timestamp,
            latency: pattern.performance.latency,
            size: pattern.details.dataSize
        });
    }
    cleanupPollingTracker() {
        const cutoff = Date.now() - 600000; // 10 minutes ago
        for (const [endpoint, data] of this.pollingTracker) {
            if (data.lastRequest < cutoff) {
                this.pollingTracker.delete(endpoint);
            }
        }
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    estimateResponseSize(response) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength) : 0;
    }
    estimateDataSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        }
        if (data instanceof ArrayBuffer) {
            return data.byteLength;
        }
        return JSON.stringify(data || '').length;
    }
    generateIntegrationTests(data) {
        return [
            `Test ${data.method} ${data.url} integration`,
            'Test error handling and retry logic',
            'Test timeout scenarios',
            'Test concurrent request handling',
            'Test network failure recovery'
        ];
    }
    generateContractTests(data) {
        return [
            'Test request/response schema validation',
            'Test API version compatibility',
            'Test data type consistency',
            'Test required field validation',
            'Test backwards compatibility'
        ];
    }
    generatePerformanceTests(data) {
        return [
            'Test response time under normal load',
            'Test response time under high load',
            'Test memory usage during requests',
            'Test bandwidth usage optimization',
            'Test connection pooling efficiency'
        ];
    }
    generateMonitoringChecks(data) {
        return [
            'Monitor request latency percentiles',
            'Monitor error rate trends',
            'Monitor resource utilization',
            'Monitor connection count',
            'Monitor data transfer volumes'
        ];
    }
    logCommunicationPattern(pattern) {
        const icon = {
            'REQUEST_RESPONSE': '🔄',
            'WEBSOCKET': '🔌',
            'SSE': '📡',
            'POLLING': '🔂',
            'BATCH': '📦'
        }[pattern.type];
        const antiPatternWarning = pattern.antiPattern ? ` [⚠️ ${pattern.antiPattern.type}]` : '';
        console.log(`${icon} [NLD Comm] ${pattern.type}: ${pattern.details.url}${antiPatternWarning}`, {
            status: pattern.status,
            latency: `${pattern.performance.latency.toFixed(0)}ms`,
            size: `${(pattern.details.dataSize / 1024).toFixed(1)}KB`,
            throughput: `${(pattern.performance.throughput / 1024).toFixed(1)}KB/s`
        });
    }
    // Public API
    getPatterns() {
        return Array.from(this.patterns.values());
    }
    getCommunicationHealth() {
        const patterns = this.getPatterns();
        const recentPatterns = patterns.filter(p => p.timestamp > Date.now() - 300000); // Last 5 minutes
        const avgLatency = recentPatterns.length > 0
            ? recentPatterns.reduce((sum, p) => sum + p.performance.latency, 0) / recentPatterns.length
            : 0;
        const errorRate = recentPatterns.length > 0
            ? recentPatterns.filter(p => p.status === 'FAILURE').length / recentPatterns.length
            : 0;
        const totalThroughput = recentPatterns.reduce((sum, p) => sum + p.performance.throughput, 0);
        const antiPatterns = patterns.filter(p => p.antiPattern);
        const criticalAntiPatterns = antiPatterns.filter(p => p.antiPattern.severity === 'critical');
        return {
            overall: this.assessOverallHealth(avgLatency, errorRate, antiPatterns.length),
            metrics: {
                averageLatency: avgLatency,
                errorRate,
                throughputMbps: totalThroughput / 1024 / 1024,
                activeConnections: this.activeConnections.size,
                memoryUsageMB: this.getCurrentMemoryUsage() / 1024 / 1024
            },
            antiPatterns: {
                detected: antiPatterns.length,
                critical: criticalAntiPatterns.length,
                trending: this.getTrendingAntiPatterns()
            },
            recommendations: this.generateHealthRecommendations(avgLatency, errorRate, antiPatterns)
        };
    }
    assessOverallHealth(latency, errorRate, antiPatternCount) {
        if (errorRate > 0.1 || latency > 5000 || antiPatternCount > 10) {
            return 'critical';
        }
        if (errorRate > 0.05 || latency > 2000 || antiPatternCount > 3) {
            return 'degraded';
        }
        return 'healthy';
    }
    getTrendingAntiPatterns() {
        const recentPatterns = this.getPatterns().filter(p => p.antiPattern && p.timestamp > Date.now() - 1800000 // Last 30 minutes
        );
        const counts = recentPatterns.reduce((acc, p) => {
            const type = p.antiPattern.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([type]) => type);
    }
    generateHealthRecommendations(latency, errorRate, antiPatterns) {
        const recommendations = [];
        if (errorRate > 0.05) {
            recommendations.push({
                priority: 'high',
                category: 'Error Handling',
                description: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
                action: 'Implement robust error handling and retry mechanisms',
                tddApproach: 'Create comprehensive error scenario tests'
            });
        }
        if (latency > 2000) {
            recommendations.push({
                priority: 'medium',
                category: 'Performance',
                description: `High average latency: ${latency.toFixed(0)}ms`,
                action: 'Optimize API endpoints and implement caching',
                tddApproach: 'Add performance regression tests with latency thresholds'
            });
        }
        for (const pattern of antiPatterns) {
            recommendations.push({
                priority: pattern.antiPattern.severity,
                category: 'Anti-Pattern',
                description: pattern.antiPattern.description,
                action: this.getAntiPatternAction(pattern.antiPattern.type),
                tddApproach: this.getAntiPatternTDDApproach(pattern.antiPattern.type)
            });
        }
        return recommendations;
    }
    getAntiPatternAction(type) {
        const actions = {
            'CHATTY_INTERFACE': 'Implement request batching or GraphQL',
            'POLLING_STORM': 'Switch to WebSocket or SSE for real-time updates',
            'DATA_OVERFETCH': 'Implement pagination and selective field fetching',
            'CONNECTION_LEAK': 'Add proper connection cleanup and timeout handling',
            'STATE_DRIFT': 'Implement state synchronization mechanisms'
        };
        return actions[type] || 'Review communication pattern';
    }
    getAntiPatternTDDApproach(type) {
        const approaches = {
            'CHATTY_INTERFACE': 'Test batch request optimization and response validation',
            'POLLING_STORM': 'Test real-time connection management and fallback strategies',
            'DATA_OVERFETCH': 'Test pagination logic and data filtering',
            'CONNECTION_LEAK': 'Test connection lifecycle and cleanup procedures',
            'STATE_DRIFT': 'Test state consistency across communication channels'
        };
        return approaches[type] || 'Create pattern-specific tests';
    }
    exportForNeuralTraining() {
        return {
            patterns: this.getPatterns(),
            health: this.getCommunicationHealth(),
            antiPatterns: this.getPatterns().filter(p => p.antiPattern),
            performanceMetrics: {
                buffer: this.performanceBuffer.slice(-100), // Last 100 measurements
                memoryUsage: this.memoryTracker,
                activeConnections: this.activeConnections.size,
                pollingPatterns: Object.fromEntries(this.pollingTracker)
            },
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }
    getAntiPatternSummary() {
        const antiPatterns = this.getPatterns().filter(p => p.antiPattern);
        return {
            total: antiPatterns.length,
            byType: this.groupBy(antiPatterns, p => p.antiPattern.type),
            bySeverity: this.groupBy(antiPatterns, p => p.antiPattern.severity),
            mostProblematic: this.getMostProblematicEndpoints(antiPatterns),
            trends: this.getTrendingAntiPatterns()
        };
    }
    groupBy(array, keyFn) {
        return array.reduce((acc, item) => {
            const key = keyFn(item);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }
    getMostProblematicEndpoints(antiPatterns) {
        const endpointIssues = antiPatterns.reduce((acc, pattern) => {
            const url = pattern.details.url;
            if (!acc[url]) {
                acc[url] = { count: 0, types: new Set() };
            }
            acc[url].count++;
            acc[url].types.add(pattern.antiPattern.type);
            return acc;
        }, {});
        return Object.entries(endpointIssues)
            .map(([url, data]) => ({
            url,
            count: data.count,
            types: Array.from(data.types)
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
}
exports.FrontendBackendCommunicationAnalyzer = FrontendBackendCommunicationAnalyzer;
// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.NLD_CommunicationAnalyzer = new FrontendBackendCommunicationAnalyzer();
}
//# sourceMappingURL=frontend-backend-communication-analyzer.js.map