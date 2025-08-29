"use strict";
/**
 * API Endpoint Mismatch Analyzer - NLD System
 *
 * Detects and analyzes API endpoint mismatches, version conflicts,
 * and frontend-backend API contract violations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIEndpointMismatchAnalyzer = void 0;
class APIEndpointMismatchAnalyzer {
    mismatches = new Map();
    apiMappings = new Map();
    endpointHitCount = new Map();
    schemaCache = new Map();
    versionHeaders = ['api-version', 'x-api-version', 'version', 'x-version'];
    constructor() {
        this.initializeAPIMapping();
        this.initializeRequestInterception();
        this.initializeSchemaValidation();
        console.log('🔍 API Endpoint Mismatch Analyzer initialized');
    }
    initializeAPIMapping() {
        // Define known API mappings
        this.apiMappings.set('/api/claude-instances', {
            pattern: '/api/claude-instances',
            method: 'GET',
            expectedResponse: { instances: 'array', status: 'string' },
            versions: ['v1', 'v2'],
            deprecated: false,
            alternativeEndpoints: ['/api/v1/instances', '/api/v2/instances']
        });
        this.apiMappings.set('/api/health', {
            pattern: '/api/health',
            method: 'GET',
            expectedResponse: { status: 'string', timestamp: 'number' },
            versions: ['v1'],
            deprecated: false,
            alternativeEndpoints: []
        });
        // SSE endpoints
        this.apiMappings.set('/api/events', {
            pattern: '/api/events',
            method: 'GET',
            expectedResponse: 'text/event-stream',
            versions: ['v1'],
            deprecated: false,
            alternativeEndpoints: ['/api/sse/events']
        });
    }
    initializeRequestInterception() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const options = args[1] || {};
            const method = options.method || 'GET';
            // Track endpoint usage
            this.trackEndpointUsage(url, method);
            try {
                const response = await originalFetch(...args);
                // Analyze response for mismatches
                await this.analyzeResponse(url, method, options, response.clone());
                return response;
            }
            catch (error) {
                this.analyzeNetworkError(url, method, options, error);
                throw error;
            }
        };
        // Intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            this._method = method;
            this._url = typeof url === 'string' ? url : url.href;
            return originalXHROpen.call(this, method, url, ...args);
        };
        XMLHttpRequest.prototype.send = function (body) {
            const analyzer = this;
            this.addEventListener('load', function () {
                analyzer.analyzeXHRResponse(this._url, this._method, this, body);
            }.bind(this));
            this.addEventListener('error', function () {
                analyzer.analyzeXHRError(this._url, this._method, this, body);
            }.bind(this));
            return originalXHRSend.call(this, body);
        };
    }
    initializeSchemaValidation() {
        // Load expected schemas from API documentation or OpenAPI specs
        this.loadAPISchemas();
    }
    trackEndpointUsage(url, method) {
        const key = `${method}:${this.normalizeUrl(url)}`;
        this.endpointHitCount.set(key, (this.endpointHitCount.get(key) || 0) + 1);
    }
    async analyzeResponse(url, method, options, response) {
        const normalizedUrl = this.normalizeUrl(url);
        const key = `${method}:${normalizedUrl}`;
        // Check for status code mismatches
        if (response.status === 404) {
            this.captureEndpointMismatch(url, method, response, 'NOT_FOUND', {
                message: 'Endpoint not found',
                suggestedAlternatives: this.findAlternativeEndpoints(normalizedUrl)
            });
            return;
        }
        if (response.status === 405) {
            this.captureEndpointMismatch(url, method, response, 'METHOD_NOT_ALLOWED', {
                message: 'HTTP method not allowed',
                allowedMethods: this.extractAllowedMethods(response)
            });
            return;
        }
        // Check for version mismatches
        const versionMismatch = this.checkVersionMismatch(response, options);
        if (versionMismatch) {
            this.captureEndpointMismatch(url, method, response, 'VERSION_MISMATCH', versionMismatch);
        }
        // Validate response schema
        try {
            const responseData = await response.json().catch(() => null);
            if (responseData) {
                const schemaMismatch = this.validateResponseSchema(normalizedUrl, method, responseData);
                if (schemaMismatch) {
                    this.captureEndpointMismatch(url, method, response, 'SCHEMA_MISMATCH', schemaMismatch);
                }
            }
        }
        catch (e) {
            // Non-JSON response, skip schema validation
        }
    }
    analyzeNetworkError(url, method, options, error) {
        // Network errors might indicate endpoint mismatches
        if (error.message.includes('404') || error.message.includes('not found')) {
            this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
                message: error.message,
                networkError: true
            });
        }
    }
    analyzeXHRResponse(url, method, xhr, body) {
        if (xhr.status === 404) {
            this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
                message: 'XHR endpoint not found',
                statusText: xhr.statusText
            });
        }
    }
    analyzeXHRError(url, method, xhr, body) {
        this.captureEndpointMismatch(url, method, null, 'NOT_FOUND', {
            message: 'XHR network error',
            statusText: xhr.statusText,
            networkError: true
        });
    }
    captureEndpointMismatch(url, method, response, type, details) {
        const mismatch = {
            id: `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            severity: this.calculateSeverity(type, url, method),
            details: {
                requestedUrl: url,
                expectedUrl: this.findExpectedUrl(url),
                method,
                statusCode: response?.status || 0,
                requestPayload: details.requestPayload,
                responsePayload: details.responsePayload,
                headers: this.extractResponseHeaders(response)
            },
            apiContract: {
                expectedSchema: this.getExpectedSchema(url, method),
                actualSchema: details.actualSchema,
                missingFields: details.missingFields || [],
                extraFields: details.extraFields || [],
                typeConflicts: details.typeConflicts || []
            },
            versionInfo: {
                frontendVersion: this.getFrontendVersion(),
                backendVersion: this.getBackendVersion(response),
                apiVersion: this.getAPIVersion(response),
                compatibility: this.assessVersionCompatibility(response)
            },
            tddPrevention: {
                contractTests: this.generateContractTests(url, method, type),
                mockStrategies: this.generateMockStrategies(url, method, type),
                migrationSteps: this.generateMigrationSteps(url, method, type),
                validationRules: this.generateValidationRules(url, method, type)
            }
        };
        this.mismatches.set(mismatch.id, mismatch);
        this.logMismatch(mismatch);
    }
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.pathname;
        }
        catch {
            return url;
        }
    }
    findAlternativeEndpoints(url) {
        const alternatives = [];
        for (const [pattern, mapping] of this.apiMappings) {
            if (this.isUrlSimilar(url, pattern)) {
                alternatives.push(...mapping.alternativeEndpoints);
            }
        }
        // Add common API versioning patterns
        if (url.includes('/api/')) {
            alternatives.push(url.replace('/api/', '/api/v1/'), url.replace('/api/', '/api/v2/'), url.replace('/v1/', '/v2/'), url.replace('/v2/', '/v1/'));
        }
        return [...new Set(alternatives)];
    }
    isUrlSimilar(url1, url2) {
        // Simple similarity check based on path segments
        const segments1 = url1.split('/').filter(s => s);
        const segments2 = url2.split('/').filter(s => s);
        const commonSegments = segments1.filter(seg => segments2.includes(seg));
        return commonSegments.length >= Math.min(segments1.length, segments2.length) * 0.6;
    }
    extractAllowedMethods(response) {
        const allowHeader = response.headers.get('allow');
        return allowHeader ? allowHeader.split(',').map(m => m.trim()) : [];
    }
    checkVersionMismatch(response, options) {
        const requestVersion = this.extractVersionFromRequest(options);
        const responseVersion = this.extractVersionFromResponse(response);
        if (requestVersion && responseVersion && requestVersion !== responseVersion) {
            return {
                requestedVersion: requestVersion,
                receivedVersion: responseVersion,
                message: 'API version mismatch detected'
            };
        }
        return null;
    }
    validateResponseSchema(url, method, responseData) {
        const expectedSchema = this.getExpectedSchema(url, method);
        if (!expectedSchema)
            return null;
        const validation = this.performSchemaValidation(responseData, expectedSchema);
        if (!validation.valid) {
            return {
                expectedSchema,
                actualSchema: this.generateSchemaFromData(responseData),
                missingFields: validation.missingFields,
                extraFields: validation.extraFields,
                typeConflicts: validation.typeConflicts
            };
        }
        return null;
    }
    getExpectedSchema(url, method) {
        const normalizedUrl = this.normalizeUrl(url);
        const mapping = this.apiMappings.get(normalizedUrl);
        return mapping?.expectedResponse;
    }
    performSchemaValidation(data, schema) {
        const result = {
            valid: true,
            missingFields: [],
            extraFields: [],
            typeConflicts: []
        };
        if (typeof schema === 'string') {
            // Content-type validation
            return { ...result, valid: true };
        }
        if (typeof schema !== 'object' || typeof data !== 'object') {
            return { ...result, valid: false };
        }
        // Check for missing fields
        for (const field in schema) {
            if (!(field in data)) {
                result.missingFields.push(field);
                result.valid = false;
            }
            else {
                // Check type conflicts
                const expectedType = schema[field];
                const actualType = this.getDataType(data[field]);
                if (expectedType !== actualType) {
                    result.typeConflicts.push({
                        field,
                        expected: expectedType,
                        actual: actualType
                    });
                    result.valid = false;
                }
            }
        }
        // Check for extra fields
        for (const field in data) {
            if (!(field in schema)) {
                result.extraFields.push(field);
            }
        }
        return result;
    }
    getDataType(value) {
        if (Array.isArray(value))
            return 'array';
        if (value === null)
            return 'null';
        return typeof value;
    }
    generateSchemaFromData(data) {
        if (Array.isArray(data)) {
            return 'array';
        }
        if (typeof data === 'object' && data !== null) {
            const schema = {};
            for (const key in data) {
                schema[key] = this.getDataType(data[key]);
            }
            return schema;
        }
        return this.getDataType(data);
    }
    extractVersionFromRequest(options) {
        const headers = options.headers;
        if (!headers)
            return null;
        for (const versionHeader of this.versionHeaders) {
            if (headers instanceof Headers) {
                const version = headers.get(versionHeader);
                if (version)
                    return version;
            }
            else if (typeof headers === 'object') {
                const version = headers[versionHeader];
                if (version)
                    return version;
            }
        }
        return null;
    }
    extractVersionFromResponse(response) {
        for (const versionHeader of this.versionHeaders) {
            const version = response.headers.get(versionHeader);
            if (version)
                return version;
        }
        return null;
    }
    extractResponseHeaders(response) {
        if (!response)
            return {};
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return headers;
    }
    findExpectedUrl(url) {
        const normalizedUrl = this.normalizeUrl(url);
        // Find closest matching pattern
        let bestMatch = '';
        let bestScore = 0;
        for (const pattern of this.apiMappings.keys()) {
            const score = this.calculateUrlSimilarity(normalizedUrl, pattern);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = pattern;
            }
        }
        return bestScore > 0.5 ? bestMatch : undefined;
    }
    calculateUrlSimilarity(url1, url2) {
        const segments1 = url1.split('/').filter(s => s);
        const segments2 = url2.split('/').filter(s => s);
        const maxLength = Math.max(segments1.length, segments2.length);
        if (maxLength === 0)
            return 1;
        let matches = 0;
        for (let i = 0; i < Math.min(segments1.length, segments2.length); i++) {
            if (segments1[i] === segments2[i])
                matches++;
        }
        return matches / maxLength;
    }
    calculateSeverity(type, url, method) {
        // Critical: core API endpoints that break functionality
        if (url.includes('/api/claude-instances') || url.includes('/api/health')) {
            return 'critical';
        }
        // High: version mismatches and schema problems
        if (type === 'VERSION_MISMATCH' || type === 'SCHEMA_MISMATCH') {
            return 'high';
        }
        // Medium: method not allowed, parameter mismatches
        if (type === 'METHOD_NOT_ALLOWED' || type === 'PARAMETER_MISMATCH') {
            return 'medium';
        }
        // Low: 404 errors for optional endpoints
        return 'low';
    }
    getFrontendVersion() {
        // Try to get version from package.json or build info
        return window.__APP_VERSION__ || '1.0.0';
    }
    getBackendVersion(response) {
        if (!response)
            return undefined;
        return response.headers.get('x-app-version') || response.headers.get('server-version');
    }
    getAPIVersion(response) {
        if (!response)
            return undefined;
        return this.extractVersionFromResponse(response);
    }
    assessVersionCompatibility(response) {
        const frontendVersion = this.getFrontendVersion();
        const backendVersion = this.getBackendVersion(response);
        if (!frontendVersion || !backendVersion)
            return 'unknown';
        // Simple semantic version check
        const frontendMajor = parseInt(frontendVersion.split('.')[0]);
        const backendMajor = parseInt(backendVersion.split('.')[0]);
        return frontendMajor === backendMajor ? 'compatible' : 'incompatible';
    }
    generateContractTests(url, method, type) {
        const tests = [
            `Test ${method} ${url} endpoint existence`,
            `Test ${method} ${url} response schema validation`,
            `Test ${method} ${url} error handling`,
            `Test ${method} ${url} API version compatibility`
        ];
        switch (type) {
            case 'NOT_FOUND':
                tests.push(`Test alternative endpoints for ${url}`);
                tests.push('Test 404 error handling and fallbacks');
                break;
            case 'VERSION_MISMATCH':
                tests.push('Test API version negotiation');
                tests.push('Test backward compatibility');
                break;
            case 'SCHEMA_MISMATCH':
                tests.push('Test response schema validation');
                tests.push('Test missing field handling');
                tests.push('Test extra field tolerance');
                break;
            case 'METHOD_NOT_ALLOWED':
                tests.push('Test allowed HTTP methods');
                tests.push('Test method fallbacks');
                break;
        }
        return tests;
    }
    generateMockStrategies(url, method, type) {
        const strategies = [
            'Mock successful API responses with correct schema',
            'Mock error responses for robust error handling',
            'Mock different API versions for compatibility testing',
            'Mock network failures and timeouts'
        ];
        switch (type) {
            case 'NOT_FOUND':
                strategies.push('Mock 404 responses and alternative endpoints');
                break;
            case 'SCHEMA_MISMATCH':
                strategies.push('Mock responses with schema variations');
                strategies.push('Mock missing and extra fields');
                break;
        }
        return strategies;
    }
    generateMigrationSteps(url, method, type) {
        const steps = [
            'Update API client to use correct endpoint URLs',
            'Add proper error handling for endpoint failures',
            'Implement graceful degradation strategies'
        ];
        switch (type) {
            case 'VERSION_MISMATCH':
                steps.push('Update API version headers in requests');
                steps.push('Implement version-specific request/response handling');
                break;
            case 'SCHEMA_MISMATCH':
                steps.push('Update response type definitions');
                steps.push('Add runtime schema validation');
                break;
            case 'NOT_FOUND':
                steps.push('Update endpoint URLs to correct paths');
                steps.push('Add endpoint discovery mechanism');
                break;
        }
        return steps;
    }
    generateValidationRules(url, method, type) {
        return [
            'Validate endpoint URLs before making requests',
            'Validate response schemas against expected contracts',
            'Validate API version compatibility',
            'Validate request parameters and headers',
            'Validate HTTP methods against endpoint capabilities'
        ];
    }
    loadAPISchemas() {
        // This would load from OpenAPI specs or API documentation
        // For now, we'll use the hardcoded mappings
    }
    logMismatch(mismatch) {
        const icon = {
            'NOT_FOUND': '❌',
            'VERSION_MISMATCH': '🔄',
            'METHOD_NOT_ALLOWED': '🚫',
            'SCHEMA_MISMATCH': '📋',
            'PARAMETER_MISMATCH': '⚠️'
        }[mismatch.type];
        console.log(`${icon} [NLD API] ${mismatch.type}: ${mismatch.details.requestedUrl}`, {
            severity: mismatch.severity,
            statusCode: mismatch.details.statusCode,
            expectedUrl: mismatch.details.expectedUrl,
            compatibility: mismatch.versionInfo.compatibility
        });
    }
    // Public API
    getMismatches() {
        return Array.from(this.mismatches.values());
    }
    getMismatchMetrics() {
        const mismatches = this.getMismatches();
        return {
            total: mismatches.length,
            byType: this.groupBy(mismatches, 'type'),
            bySeverity: this.groupBy(mismatches, 'severity'),
            mostProblematicEndpoints: this.getMostProblematicEndpoints(mismatches),
            versionCompatibility: this.getVersionCompatibilityStats(mismatches),
            endpointUsage: Object.fromEntries(this.endpointHitCount)
        };
    }
    groupBy(array, key) {
        return array.reduce((acc, item) => {
            const value = item[key];
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
    getMostProblematicEndpoints(mismatches) {
        const endpointIssues = mismatches.reduce((acc, mismatch) => {
            const url = mismatch.details.requestedUrl;
            if (!acc[url]) {
                acc[url] = { count: 0, types: new Set() };
            }
            acc[url].count++;
            acc[url].types.add(mismatch.type);
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
    getVersionCompatibilityStats(mismatches) {
        const compatibility = mismatches.reduce((acc, mismatch) => {
            const compat = mismatch.versionInfo.compatibility;
            acc[compat] = (acc[compat] || 0) + 1;
            return acc;
        }, {});
        return compatibility;
    }
    exportForNeuralTraining() {
        return {
            mismatches: this.getMismatches(),
            metrics: this.getMismatchMetrics(),
            apiMappings: Object.fromEntries(this.apiMappings),
            endpointUsage: Object.fromEntries(this.endpointHitCount),
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }
    getRecommendations() {
        const recommendations = [];
        const mismatches = this.getMismatches();
        const recentMismatches = mismatches.filter(m => m.timestamp > Date.now() - 3600000); // Last hour
        if (recentMismatches.length > 5) {
            recommendations.push({
                type: 'HIGH_ERROR_RATE',
                priority: 'high',
                description: `${recentMismatches.length} API mismatches in the last hour`,
                action: 'Investigate API stability and update endpoint configurations'
            });
        }
        const versionMismatches = mismatches.filter(m => m.type === 'VERSION_MISMATCH');
        if (versionMismatches.length > 0) {
            recommendations.push({
                type: 'VERSION_COMPATIBILITY',
                priority: 'critical',
                description: 'API version mismatches detected',
                action: 'Update API version headers and implement version negotiation'
            });
        }
        const schemaMismatches = mismatches.filter(m => m.type === 'SCHEMA_MISMATCH');
        if (schemaMismatches.length > 0) {
            recommendations.push({
                type: 'SCHEMA_VALIDATION',
                priority: 'medium',
                description: 'Response schema mismatches found',
                action: 'Update TypeScript interfaces and add runtime validation'
            });
        }
        return recommendations;
    }
}
exports.APIEndpointMismatchAnalyzer = APIEndpointMismatchAnalyzer;
// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.NLD_APIAnalyzer = new APIEndpointMismatchAnalyzer();
}
//# sourceMappingURL=api-endpoint-mismatch-analyzer.js.map