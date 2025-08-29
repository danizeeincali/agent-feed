"use strict";
/**
 * CORS and Timeout Pattern Detector - NLD System
 *
 * Specialized detector for CORS issues and timeout patterns
 * with advanced pattern recognition and TDD prevention strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkCORSTimeoutDetector = void 0;
class NetworkCORSTimeoutDetector {
    corsPatterns = new Map();
    timeoutPatterns = new Map();
    connectionMetrics = new Map();
    preflight;
    Cache = new Map();
    constructor() {
        this.initializeCORSDetection();
        this.initializeTimeoutDetection();
        this.setupNetworkConditionMonitoring();
        console.log('🛡️ CORS & Timeout Detector initialized');
    }
    initializeCORSDetection() {
        // Monitor CORS errors in fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const options = args[1] || {};
            try {
                // Check for potential CORS issues before making request
                this.analyzePotentialCORSIssue(url, options);
                const response = await originalFetch(...args);
                // Clear preflight cache on success
                this.updatePreflightCache(url, options.method || 'GET', true);
                return response;
            }
            catch (error) {
                if (this.isCORSError(error)) {
                    this.captureCORSPattern(url, options, error);
                }
                throw error;
            }
        };
        // Monitor CORS errors in XMLHttpRequest
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (...args) {
            this.addEventListener('error', (event) => {
                if (this.status === 0 && this.readyState === 4) {
                    // Likely CORS error
                    this.captureCORSPattern(this._url, { method: this._method }, new Error('CORS error'));
                }
            }, bind(this));
            return originalXHRSend.call(this, ...args);
        };
    }
    initializeTimeoutDetection() {
        // Monitor timeout errors in fetch with AbortController
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const options = args[1] || {};
            // Set up timeout detection
            const timeoutId = this.setupTimeoutDetection(url, options, startTime);
            try {
                const response = await originalFetch(...args);
                clearTimeout(timeoutId);
                return response;
            }
            catch (error) {
                clearTimeout(timeoutId);
                const duration = performance.now() - startTime;
                if (this.isTimeoutError(error) || error.name === 'AbortError') {
                    this.captureTimeoutPattern(url, options, duration, error);
                }
                throw error;
            }
        };
        // Monitor XMLHttpRequest timeouts
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._method = method;
            this._url = typeof url === 'string' ? url : url.href;
            this._startTime = performance.now();
            this.addEventListener('timeout', () => {
                const duration = performance.now() - this._startTime;
                this.captureTimeoutPattern(this._url, { method }, duration, new Error('XMLHttpRequest timeout'));
            }, bind(this));
            return originalXHROpen.call(this, method, url, ...args);
        };
    }
    setupNetworkConditionMonitoring() {
        // Monitor connection speed using Navigation Timing API
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.connectionMetrics.set('effectiveType', connection.effectiveType);
            this.connectionMetrics.set('downlink', connection.downlink);
            this.connectionMetrics.set('rtt', connection.rtt);
            connection.addEventListener('change', () => {
                this.connectionMetrics.set('effectiveType', connection.effectiveType);
                this.connectionMetrics.set('downlink', connection.downlink);
                this.connectionMetrics.set('rtt', connection.rtt);
            });
        }
    }
    analyzePotentialCORSIssue(url, options) {
        const origin = window.location.origin;
        const destination = new URL(url, window.location.href).origin;
        // Check if cross-origin
        if (origin !== destination) {
            const method = options.method || 'GET';
            const hasCustomHeaders = this.hasCustomHeaders(options.headers);
            const hasCredentials = options.credentials === 'include';
            // Check if preflight is required
            if (this.requiresPreflight(method, options.headers, hasCredentials)) {
                this.trackPreflightRequest(destination, method, options);
            }
            // Warn about potential issues
            if (hasCredentials && !this.isPreflightCached(destination, method)) {
                console.warn(`🚨 [NLD] Potential CORS credentials issue for ${url}`);
            }
        }
    }
    captureCORSPattern(url, options, error) {
        const origin = window.location.origin;
        const destination = new URL(url, window.location.href).origin;
        const pattern = {
            id: `cors_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type: this.classifyCORSError(error, options),
            severity: this.calculateCORSSeverity(error, options),
            details: {
                origin,
                destination,
                method: options.method || 'GET',
                headers: this.extractHeaders(options.headers),
                credentials: options.credentials === 'include',
                blockedReason: error.message
            },
            browserInfo: {
                userAgent: navigator.userAgent,
                version: this.getBrowserVersion(),
                corsSupport: this.checkCORSSupport()
            },
            tddPrevention: {
                testCases: this.generateCORSTestCases(url, options, error),
                mockStrategies: this.generateCORSMockStrategies(url, options),
                configFixes: this.generateCORSConfigFixes(url, options, error)
            }
        };
        this.corsPatterns.set(pattern.id, pattern);
        this.logCORSPattern(pattern);
    }
    captureTimeoutPattern(url, options, duration, error) {
        const pattern = {
            id: `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type: this.classifyTimeoutError(error, options),
            severity: this.calculateTimeoutSeverity(duration, options),
            details: {
                url,
                method: options.method || 'GET',
                timeoutValue: this.extractTimeoutValue(options),
                actualDuration: duration,
                stage: this.determineTimeoutStage(error, duration),
                retryAttempts: this.getRetryAttempts(url)
            },
            networkConditions: {
                connectionSpeed: this.assessConnectionSpeed(),
                latency: this.connectionMetrics.get('rtt') || 0,
                packetLoss: this.detectPacketLoss(duration)
            },
            tddPrevention: {
                testCases: this.generateTimeoutTestCases(url, options, duration),
                retryStrategies: this.generateRetryStrategies(url, options, duration),
                fallbackApproaches: this.generateTimeoutFallbacks(url, options)
            }
        };
        this.timeoutPatterns.set(pattern.id, pattern);
        this.logTimeoutPattern(pattern);
    }
    isCORSError(error) {
        const message = error.message.toLowerCase();
        return message.includes('cors') ||
            message.includes('cross-origin') ||
            message.includes('access-control') ||
            (error.name === 'TypeError' && message.includes('fetch'));
    }
    isTimeoutError(error) {
        const message = error.message.toLowerCase();
        return message.includes('timeout') ||
            error.name === 'AbortError' ||
            error.name === 'TimeoutError';
    }
    classifyCORSError(error, options) {
        const message = error.message.toLowerCase();
        if (message.includes('preflight'))
            return 'PREFLIGHT_FAILED';
        if (message.includes('method'))
            return 'METHOD_NOT_ALLOWED';
        if (message.includes('header'))
            return 'HEADER_BLOCKED';
        if (message.includes('credentials'))
            return 'CREDENTIALS_ISSUE';
        return 'SIMPLE_REQUEST_BLOCKED';
    }
    classifyTimeoutError(error, options) {
        const message = error.message.toLowerCase();
        if (message.includes('connection'))
            return 'CONNECTION_TIMEOUT';
        if (message.includes('read'))
            return 'READ_TIMEOUT';
        if (message.includes('write'))
            return 'WRITE_TIMEOUT';
        if (error.name === 'AbortError')
            return 'CUSTOM_TIMEOUT';
        return 'REQUEST_TIMEOUT';
    }
    calculateCORSSeverity(error, options) {
        if (options.credentials === 'include')
            return 'critical';
        if (options.method && !['GET', 'POST', 'HEAD'].includes(options.method))
            return 'high';
        if (this.hasCustomHeaders(options.headers))
            return 'medium';
        return 'low';
    }
    calculateTimeoutSeverity(duration, options) {
        if (duration > 30000)
            return 'critical'; // 30+ seconds
        if (duration > 15000)
            return 'high'; // 15+ seconds
        if (duration > 5000)
            return 'medium'; // 5+ seconds
        return 'low';
    }
    hasCustomHeaders(headers) {
        if (!headers)
            return false;
        const customHeaders = Object.keys(headers).filter(header => {
            const lowerHeader = header.toLowerCase();
            return !['accept', 'accept-language', 'content-language', 'content-type'].includes(lowerHeader);
        });
        return customHeaders.length > 0;
    }
    requiresPreflight(method, headers, hasCredentials) {
        // Non-simple methods require preflight
        if (!['GET', 'HEAD', 'POST'].includes(method))
            return true;
        // Custom headers require preflight
        if (this.hasCustomHeaders(headers))
            return true;
        // Content-Type beyond simple values requires preflight
        if (headers && headers['content-type']) {
            const contentType = headers['content-type'].toLowerCase();
            const simpleContentTypes = [
                'application/x-www-form-urlencoded',
                'multipart/form-data',
                'text/plain'
            ];
            if (!simpleContentTypes.some(type => contentType.includes(type))) {
                return true;
            }
        }
        return false;
    }
    trackPreflightRequest(destination, method, options) {
        const key = `${destination}_${method}`;
        this.preflightCache.set(key, {
            timestamp: Date.now(),
            options,
            successful: false
        });
    }
    isPreflightCached(destination, method) {
        const key = `${destination}_${method}`;
        const cached = this.preflightCache.get(key);
        if (!cached)
            return false;
        // Consider cached for 5 minutes
        return cached.successful && (Date.now() - cached.timestamp < 300000);
    }
    updatePreflightCache(url, method, successful) {
        const destination = new URL(url, window.location.href).origin;
        const key = `${destination}_${method}`;
        if (this.preflightCache.has(key)) {
            this.preflightCache.get(key).successful = successful;
        }
    }
    setupTimeoutDetection(url, options, startTime) {
        const timeoutValue = this.extractTimeoutValue(options);
        return setTimeout(() => {
            const duration = performance.now() - startTime;
            console.warn(`🕐 [NLD] Request timeout detected: ${url} (${duration}ms)`);
        }, timeoutValue + 1000); // Add buffer to detect actual timeouts
    }
    extractTimeoutValue(options) {
        // Try to extract timeout from AbortSignal or default to 30 seconds
        if (options.signal && 'timeout' in options.signal) {
            return options.signal.timeout;
        }
        return 30000; // Default 30 seconds
    }
    extractHeaders(headers) {
        if (!headers)
            return [];
        if (headers instanceof Headers) {
            const result = [];
            headers.forEach((value, name) => {
                result.push(`${name}: ${value}`);
            });
            return result;
        }
        if (typeof headers === 'object') {
            return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
        }
        return [];
    }
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const matches = userAgent.match(/(chrome|firefox|safari|edge|opera)\/(\d+)/i);
        return matches ? `${matches[1]} ${matches[2]}` : 'unknown';
    }
    checkCORSSupport() {
        return typeof XMLHttpRequest !== 'undefined' && 'withCredentials' in new XMLHttpRequest();
    }
    determineTimeoutStage(error, duration) {
        if (duration < 1000)
            return 'connection';
        if (duration < 5000)
            return 'request';
        if (duration < 15000)
            return 'response';
        return 'custom';
    }
    getRetryAttempts(url) {
        // Track retry attempts for the same URL
        const attempts = this.timeoutPatterns.size &&
            Array.from(this.timeoutPatterns.values())
                .filter(p => p.details.url === url && p.timestamp > Date.now() - 60000)
                .length;
        return attempts;
    }
    assessConnectionSpeed() {
        const effectiveType = this.connectionMetrics.get('effectiveType');
        if (!effectiveType)
            return 'unknown';
        return ['4g', 'fast-2g'].includes(effectiveType) ? 'fast' : 'slow';
    }
    detectPacketLoss(duration) {
        const rtt = this.connectionMetrics.get('rtt') || 0;
        // Heuristic: if actual duration is much longer than expected RTT
        return duration > rtt * 10;
    }
    generateCORSTestCases(url, options, error) {
        const tests = [
            'Test CORS preflight request handling',
            'Test cross-origin request with credentials',
            'Test custom headers in cross-origin requests',
            'Test OPTIONS request response headers',
            'Test CORS error handling and fallbacks'
        ];
        // Add specific tests based on error type
        if (options.credentials === 'include') {
            tests.push('Test CORS with credentials configuration');
        }
        if (this.hasCustomHeaders(options.headers)) {
            tests.push('Test custom headers allowlist configuration');
        }
        return tests;
    }
    generateCORSMockStrategies(url, options) {
        return [
            'Mock successful CORS preflight responses',
            'Mock CORS error scenarios for error handling',
            'Mock different browser CORS behaviors',
            'Use development proxy to avoid CORS in testing',
            'Mock server responses with proper CORS headers'
        ];
    }
    generateCORSConfigFixes(url, options, error) {
        const fixes = [
            'Add proper Access-Control-Allow-Origin headers',
            'Configure Access-Control-Allow-Methods',
            'Set Access-Control-Allow-Headers for custom headers',
            'Enable Access-Control-Allow-Credentials if needed'
        ];
        if (options.credentials === 'include') {
            fixes.push('Configure server to handle credentials properly');
        }
        return fixes;
    }
    generateTimeoutTestCases(url, options, duration) {
        return [
            'Test request timeout scenarios',
            'Test timeout error handling',
            'Test retry mechanism with exponential backoff',
            'Test graceful degradation on timeout',
            'Test user feedback during slow requests',
            'Test cancel/abort functionality',
            'Test different network conditions'
        ];
    }
    generateRetryStrategies(url, options, duration) {
        return [
            'Implement exponential backoff retry',
            'Add circuit breaker pattern',
            'Use retry with jitter to avoid thundering herd',
            'Implement request deduplication',
            'Add timeout escalation (shorter to longer)',
            'Use different endpoints as fallbacks'
        ];
    }
    generateTimeoutFallbacks(url, options) {
        return [
            'Implement offline-first approach',
            'Cache previous successful responses',
            'Show cached content while retrying',
            'Provide manual retry button',
            'Implement graceful degradation',
            'Use background sync for non-critical requests'
        ];
    }
    logCORSPattern(pattern) {
        console.log(`🚨 [NLD CORS] ${pattern.type} detected:`, {
            severity: pattern.severity,
            origin: pattern.details.origin,
            destination: pattern.details.destination,
            method: pattern.details.method,
            reason: pattern.details.blockedReason
        });
    }
    logTimeoutPattern(pattern) {
        console.log(`⏰ [NLD Timeout] ${pattern.type} detected:`, {
            severity: pattern.severity,
            url: pattern.details.url,
            duration: `${pattern.details.actualDuration.toFixed(0)}ms`,
            expected: `${pattern.details.timeoutValue}ms`,
            stage: pattern.details.stage
        });
    }
    // Public API
    getCORSPatterns() {
        return Array.from(this.corsPatterns.values());
    }
    getTimeoutPatterns() {
        return Array.from(this.timeoutPatterns.values());
    }
    getCORSMetrics() {
        const patterns = this.getCORSPatterns();
        return {
            total: patterns.length,
            byType: this.groupBy(patterns, 'type'),
            bySeverity: this.groupBy(patterns, 'severity'),
            mostProblematicOrigins: this.getMostProblematicOrigins(patterns),
            preventionCoverage: this.calculatePreventionCoverage(patterns)
        };
    }
    getTimeoutMetrics() {
        const patterns = this.getTimeoutPatterns();
        return {
            total: patterns.length,
            byType: this.groupBy(patterns, 'type'),
            bySeverity: this.groupBy(patterns, 'severity'),
            averageDuration: this.calculateAverageDuration(patterns),
            slowestEndpoints: this.getSlowestEndpoints(patterns),
            preventionCoverage: this.calculateTimeoutPreventionCoverage(patterns)
        };
    }
    groupBy(array, key) {
        return array.reduce((acc, item) => {
            const value = item[key];
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
    getMostProblematicOrigins(patterns) {
        const counts = patterns.reduce((acc, pattern) => {
            const origin = pattern.details.destination;
            acc[origin] = (acc[origin] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .map(([origin, count]) => ({ origin, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    calculatePreventionCoverage(patterns) {
        const withPrevention = patterns.filter(p => p.tddPrevention.testCases.length > 0).length;
        return patterns.length > 0 ? withPrevention / patterns.length : 0;
    }
    calculateAverageDuration(patterns) {
        if (patterns.length === 0)
            return 0;
        const total = patterns.reduce((sum, p) => sum + p.details.actualDuration, 0);
        return total / patterns.length;
    }
    getSlowestEndpoints(patterns) {
        const durations = patterns.reduce((acc, pattern) => {
            const url = pattern.details.url;
            if (!acc[url])
                acc[url] = [];
            acc[url].push(pattern.details.actualDuration);
            return acc;
        }, {});
        return Object.entries(durations)
            .map(([url, times]) => ({
            url,
            avgDuration: times.reduce((sum, time) => sum + time, 0) / times.length
        }))
            .sort((a, b) => b.avgDuration - a.avgDuration)
            .slice(0, 10);
    }
    calculateTimeoutPreventionCoverage(patterns) {
        const withPrevention = patterns.filter(p => p.tddPrevention.retryStrategies.length > 0).length;
        return patterns.length > 0 ? withPrevention / patterns.length : 0;
    }
    exportForNeuralTraining() {
        return {
            corsPatterns: this.getCORSPatterns(),
            timeoutPatterns: this.getTimeoutPatterns(),
            metrics: {
                cors: this.getCORSMetrics(),
                timeout: this.getTimeoutMetrics()
            },
            networkConditions: Object.fromEntries(this.connectionMetrics),
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }
}
exports.NetworkCORSTimeoutDetector = NetworkCORSTimeoutDetector;
// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.NLD_CORSTimeoutDetector = new NetworkCORSTimeoutDetector();
}
//# sourceMappingURL=network-cors-timeout-detector.js.map