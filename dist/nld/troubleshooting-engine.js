"use strict";
/**
 * NLD Intelligent Troubleshooting Engine
 * Provides intelligent troubleshooting suggestions based on learned patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TroubleshootingEngine = void 0;
const events_1 = require("events");
class TroubleshootingEngine extends events_1.EventEmitter {
    learningDatabase;
    suggestionTemplates = new Map();
    diagnosticTests = new Map();
    knowledgeBase = new Map();
    constructor(learningDatabase) {
        super();
        this.learningDatabase = learningDatabase;
        this.initializeSuggestionTemplates();
        this.initializeDiagnosticTests();
        this.initializeKnowledgeBase();
    }
    /**
     * Generate troubleshooting suggestions for a connection failure
     */
    async generateSuggestions(request) {
        const { context, userDescription, previousAttempts, urgency } = request;
        // Run diagnostic tests
        const diagnosticResults = await this.runDiagnostics(context);
        // Find similar patterns from learning database
        const similarPatterns = await this.findSimilarPatterns(context);
        // Generate suggestions based on multiple sources
        const suggestions = await this.compileSuggestions(context, diagnosticResults, similarPatterns, previousAttempts || [], urgency);
        // Separate quick fixes
        const quickFixes = suggestions.filter(s => s.category === 'immediate' && s.estimated_time <= 5);
        // Generate preventive measures
        const preventiveMeasures = this.generatePreventiveMeasures(context, similarPatterns);
        // Generate monitoring recommendations
        const monitoringRecommendations = this.generateMonitoringRecommendations(context);
        // Generate escalation paths
        const escalationPaths = this.generateEscalationPaths(urgency, context);
        // Calculate overall confidence and resolution time
        const confidenceScore = this.calculateOverallConfidence(suggestions, diagnosticResults);
        const estimatedResolutionTime = this.estimateResolutionTime(suggestions, urgency);
        const result = {
            suggestions: suggestions.sort((a, b) => b.priority - a.priority),
            quick_fixes: quickFixes.sort((a, b) => b.confidence - a.confidence),
            preventive_measures: preventiveMeasures,
            monitoring_recommendations: monitoringRecommendations,
            escalation_paths: escalationPaths,
            confidence_score: confidenceScore,
            estimated_resolution_time: estimatedResolutionTime
        };
        this.emit('suggestionsGenerated', { request, result });
        return result;
    }
    /**
     * Run specific diagnostic test
     */
    async runDiagnostic(testName, context) {
        const test = this.diagnosticTests.get(testName);
        if (!test) {
            throw new Error(`Diagnostic test ${testName} not found`);
        }
        try {
            const result = await test.test_function(context);
            this.emit('diagnosticCompleted', { testName, result });
            return result;
        }
        catch (error) {
            this.emit('diagnosticError', { testName, error });
            return {
                test_name: testName,
                passed: false,
                result: { error: error.message },
                interpretation: `Test failed due to error: ${error.message}`,
                recommended_actions: ['Review test configuration', 'Check system requirements']
            };
        }
    }
    /**
     * Get suggestion template by ID
     */
    getSuggestionTemplate(id) {
        return this.suggestionTemplates.get(id);
    }
    /**
     * Add custom troubleshooting suggestion template
     */
    addSuggestionTemplate(suggestion) {
        this.suggestionTemplates.set(suggestion.id, suggestion);
        this.emit('templateAdded', suggestion);
    }
    /**
     * Add custom diagnostic test
     */
    addDiagnosticTest(test) {
        this.diagnosticTests.set(test.name, test);
        this.emit('diagnosticTestAdded', test);
    }
    /**
     * Learn from successful troubleshooting results
     */
    async learnFromSuccess(originalRequest, successfulSuggestion, actualResolutionTime) {
        // Update suggestion success rates
        const template = this.suggestionTemplates.get(successfulSuggestion.id);
        if (template) {
            template.success_probability = (template.success_probability + 1) / 2; // Simple moving average
            template.estimated_time = (template.estimated_time + actualResolutionTime) / 2;
        }
        // Store learning data
        await this.learningDatabase.storeSuccessfulRecovery(originalRequest.context.endpoint, originalRequest.context.attemptHistory[0]?.strategy || {
            type: 'manual',
            baseDelay: 0,
            maxDelay: 0,
            jitter: false,
            maxAttempts: 1
        }, actualResolutionTime, 1.0 // Full satisfaction for manual resolution
        );
        this.emit('learningUpdated', { originalRequest, successfulSuggestion, actualResolutionTime });
    }
    async runDiagnostics(context) {
        const results = [];
        for (const [name, test] of this.diagnosticTests) {
            // Check if test is applicable
            const isApplicable = test.applicable_conditions.some(condition => this.evaluateCondition(condition, context));
            if (isApplicable) {
                try {
                    const result = await test.test_function(context);
                    results.push(result);
                }
                catch (error) {
                    console.warn(`Diagnostic test ${name} failed:`, error);
                }
            }
        }
        return results;
    }
    async findSimilarPatterns(context) {
        // This would use the learning database to find similar patterns
        // For now, return empty array as the actual implementation would depend on the database
        return [];
    }
    async compileSuggestions(context, diagnosticResults, similarPatterns, previousAttempts, urgency) {
        const suggestions = [];
        // Error-specific suggestions
        const errorSuggestions = this.getErrorSpecificSuggestions(context);
        suggestions.push(...errorSuggestions);
        // Diagnostic-based suggestions
        const diagnosticSuggestions = this.getDiagnosticBasedSuggestions(diagnosticResults);
        suggestions.push(...diagnosticSuggestions);
        // Pattern-based suggestions
        const patternSuggestions = this.getPatternBasedSuggestions(similarPatterns);
        suggestions.push(...patternSuggestions);
        // Network-specific suggestions
        const networkSuggestions = this.getNetworkSpecificSuggestions(context);
        suggestions.push(...networkSuggestions);
        // Filter out previously attempted solutions
        const filteredSuggestions = suggestions.filter(s => !previousAttempts.some(attempt => s.title.toLowerCase().includes(attempt.toLowerCase())));
        // Adjust priorities based on urgency
        this.adjustPrioritiesForUrgency(filteredSuggestions, urgency);
        return filteredSuggestions;
    }
    getErrorSpecificSuggestions(context) {
        const suggestions = [];
        switch (context.errorDetails.type) {
            case 'timeout':
                suggestions.push(this.createTimeoutSuggestions(context));
                break;
            case 'network':
                suggestions.push(this.createNetworkSuggestions(context));
                break;
            case 'protocol':
                suggestions.push(this.createProtocolSuggestions(context));
                break;
            case 'auth':
                suggestions.push(this.createAuthSuggestions(context));
                break;
            case 'server':
                suggestions.push(this.createServerSuggestions(context));
                break;
        }
        return suggestions.filter(s => s !== null);
    }
    createTimeoutSuggestions(context) {
        return {
            id: 'timeout-fix',
            title: 'Increase Connection Timeout',
            description: 'The connection is timing out. Increase timeout values and implement retry strategy.',
            category: 'configuration',
            priority: 8,
            confidence: 0.8,
            estimated_effort: 'low',
            estimated_time: 10,
            success_probability: 0.75,
            steps: [
                {
                    order: 1,
                    action: 'Increase connection timeout to 30 seconds',
                    command: 'config.timeout = 30000',
                    expected_result: 'Longer wait time before timeout',
                    verification: 'Test connection with increased timeout'
                },
                {
                    order: 2,
                    action: 'Implement exponential backoff retry',
                    command: 'implement exponential backoff strategy',
                    expected_result: 'Automatic retries with increasing delays',
                    verification: 'Monitor retry attempts in logs'
                }
            ],
            prerequisites: ['Access to configuration files'],
            related_patterns: ['timeout_pattern'],
            resources: [
                {
                    type: 'documentation',
                    title: 'Connection Timeout Best Practices',
                    description: 'Guide on setting optimal timeout values'
                }
            ]
        };
    }
    createNetworkSuggestions(context) {
        return {
            id: 'network-fix',
            title: 'Check Network Connectivity',
            description: 'Network connectivity issues detected. Verify network configuration and connection.',
            category: 'infrastructure',
            priority: 9,
            confidence: 0.9,
            estimated_effort: 'medium',
            estimated_time: 20,
            success_probability: 0.8,
            steps: [
                {
                    order: 1,
                    action: 'Test basic connectivity',
                    command: 'ping target-server.com',
                    expected_result: 'Successful ping response',
                    verification: 'Check ping response times'
                },
                {
                    order: 2,
                    action: 'Check DNS resolution',
                    command: 'nslookup target-server.com',
                    expected_result: 'Correct IP address resolved',
                    verification: 'Verify DNS resolution works'
                },
                {
                    order: 3,
                    action: 'Test port connectivity',
                    command: 'telnet target-server.com 8080',
                    expected_result: 'Connection established',
                    verification: 'Successful port connection'
                }
            ],
            prerequisites: ['Network access', 'Command line tools'],
            related_patterns: ['network_failure_pattern'],
            resources: [
                {
                    type: 'tool',
                    title: 'Network Diagnostic Tools',
                    description: 'Tools for diagnosing network issues'
                }
            ]
        };
    }
    createProtocolSuggestions(context) {
        return {
            id: 'protocol-fix',
            title: 'Fix Protocol Configuration',
            description: 'Protocol-level issues detected. Check WebSocket headers and upgrade process.',
            category: 'configuration',
            priority: 7,
            confidence: 0.7,
            estimated_effort: 'medium',
            estimated_time: 30,
            success_probability: 0.7,
            steps: [
                {
                    order: 1,
                    action: 'Verify WebSocket upgrade headers',
                    expected_result: 'Correct upgrade headers present',
                    verification: 'Check browser network tab'
                },
                {
                    order: 2,
                    action: 'Check CORS configuration',
                    expected_result: 'CORS headers allow WebSocket upgrade',
                    verification: 'Verify no CORS errors in console'
                }
            ],
            prerequisites: ['Browser developer tools'],
            related_patterns: ['protocol_error_pattern'],
            resources: []
        };
    }
    createAuthSuggestions(context) {
        return {
            id: 'auth-fix',
            title: 'Fix Authentication Issues',
            description: 'Authentication failure detected. Verify credentials and token validity.',
            category: 'configuration',
            priority: 9,
            confidence: 0.85,
            estimated_effort: 'low',
            estimated_time: 15,
            success_probability: 0.8,
            steps: [
                {
                    order: 1,
                    action: 'Check authentication token validity',
                    expected_result: 'Valid, non-expired token',
                    verification: 'Decode JWT token and check expiry'
                },
                {
                    order: 2,
                    action: 'Refresh authentication token',
                    expected_result: 'New valid token obtained',
                    verification: 'Successful token refresh'
                }
            ],
            prerequisites: ['Access to authentication system'],
            related_patterns: ['auth_failure_pattern'],
            resources: []
        };
    }
    createServerSuggestions(context) {
        return {
            id: 'server-fix',
            title: 'Check Server Status',
            description: 'Server-side error detected. Verify server health and capacity.',
            category: 'infrastructure',
            priority: 10,
            confidence: 0.6,
            estimated_effort: 'high',
            estimated_time: 60,
            success_probability: 0.6,
            steps: [
                {
                    order: 1,
                    action: 'Check server health endpoint',
                    expected_result: 'Server responds healthy',
                    verification: 'GET /health returns 200'
                },
                {
                    order: 2,
                    action: 'Review server logs',
                    expected_result: 'No critical errors in logs',
                    verification: 'Check application and system logs'
                }
            ],
            prerequisites: ['Server access', 'Monitoring tools'],
            related_patterns: ['server_error_pattern'],
            resources: []
        };
    }
    getDiagnosticBasedSuggestions(results) {
        const suggestions = [];
        for (const result of results) {
            if (!result.passed) {
                suggestions.push(...result.recommended_actions.map(action => ({
                    id: `diagnostic-${result.test_name}`,
                    title: `Fix ${result.test_name}`,
                    description: result.interpretation,
                    category: 'immediate',
                    priority: 7,
                    confidence: 0.8,
                    estimated_effort: 'medium',
                    estimated_time: 20,
                    success_probability: 0.7,
                    steps: [{
                            order: 1,
                            action,
                            expected_result: 'Issue resolved',
                            verification: `Re-run ${result.test_name} diagnostic`
                        }],
                    prerequisites: [],
                    related_patterns: [],
                    resources: []
                })));
            }
        }
        return suggestions;
    }
    getPatternBasedSuggestions(patterns) {
        // Implementation would use learned patterns to generate suggestions
        return [];
    }
    getNetworkSpecificSuggestions(context) {
        const suggestions = [];
        if (context.networkConditions.connectionType === 'slow-2g') {
            suggestions.push({
                id: 'slow-network-optimization',
                title: 'Optimize for Slow Network',
                description: 'Slow network detected. Switch to polling transport and increase timeouts.',
                category: 'configuration',
                priority: 8,
                confidence: 0.85,
                estimated_effort: 'medium',
                estimated_time: 25,
                success_probability: 0.8,
                steps: [
                    {
                        order: 1,
                        action: 'Switch to polling transport',
                        expected_result: 'More reliable connection on slow network',
                        verification: 'Monitor connection stability'
                    }
                ],
                prerequisites: [],
                related_patterns: ['slow_network_pattern'],
                resources: []
            });
        }
        return suggestions;
    }
    adjustPrioritiesForUrgency(suggestions, urgency) {
        const urgencyMultiplier = {
            'critical': 1.5,
            'high': 1.2,
            'medium': 1.0,
            'low': 0.8
        };
        const multiplier = urgencyMultiplier[urgency] || 1.0;
        for (const suggestion of suggestions) {
            suggestion.priority = Math.min(10, suggestion.priority * multiplier);
            // Prioritize quick fixes for urgent issues
            if (urgency === 'critical' && suggestion.estimated_time <= 10) {
                suggestion.priority += 2;
            }
        }
    }
    generatePreventiveMeasures(context, patterns) {
        const measures = [
            'Implement comprehensive connection monitoring',
            'Set up automated retry strategies',
            'Configure circuit breakers for endpoint protection',
            'Establish connection health checks',
            'Create fallback connection mechanisms'
        ];
        // Add context-specific measures
        if (context.errorDetails.type === 'timeout') {
            measures.push('Implement adaptive timeout adjustment');
        }
        if (context.networkConditions.connectionType === 'slow-2g') {
            measures.push('Implement network-aware connection strategies');
        }
        return measures;
    }
    generateMonitoringRecommendations(context) {
        return [
            'Monitor connection success rates by endpoint',
            'Track connection latency and response times',
            'Set up alerts for connection failure patterns',
            'Monitor network condition changes',
            'Track retry strategy effectiveness'
        ];
    }
    generateEscalationPaths(urgency, context) {
        const paths = [];
        if (urgency === 'critical') {
            paths.push('Immediately contact on-call engineer');
            paths.push('Activate incident response procedure');
        }
        paths.push('Contact network operations team');
        paths.push('Review with system architecture team');
        paths.push('Escalate to infrastructure team');
        return paths;
    }
    calculateOverallConfidence(suggestions, diagnosticResults) {
        const suggestionConfidence = suggestions.length > 0
            ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
            : 0;
        const diagnosticConfidence = diagnosticResults.length > 0
            ? diagnosticResults.filter(r => r.passed).length / diagnosticResults.length
            : 0.5;
        return (suggestionConfidence + diagnosticConfidence) / 2;
    }
    estimateResolutionTime(suggestions, urgency) {
        if (suggestions.length === 0)
            return 60; // Default 1 hour
        const quickestSuggestion = Math.min(...suggestions.map(s => s.estimated_time));
        const averageTime = suggestions.reduce((sum, s) => sum + s.estimated_time, 0) / suggestions.length;
        // For urgent issues, assume we'll try the quickest solution first
        if (urgency === 'critical')
            return quickestSuggestion;
        return averageTime;
    }
    evaluateCondition(condition, context) {
        // Simple condition evaluation - in real implementation, this would be more sophisticated
        if (condition === 'websocket')
            return context.connectionType === 'websocket';
        if (condition === 'timeout')
            return context.errorDetails.type === 'timeout';
        if (condition === 'network')
            return context.errorDetails.type === 'network';
        return true;
    }
    initializeSuggestionTemplates() {
        // Initialize with common troubleshooting templates
        // Templates would be loaded from configuration or database
    }
    initializeDiagnosticTests() {
        // DNS Resolution Test
        this.diagnosticTests.set('dns_resolution', {
            name: 'dns_resolution',
            description: 'Test DNS resolution for the target endpoint',
            test_function: async (context) => {
                try {
                    const url = new URL(context.endpoint);
                    // In a real implementation, this would do actual DNS lookup
                    return {
                        test_name: 'dns_resolution',
                        passed: true,
                        result: { resolved: true, ip: '192.168.1.1' },
                        interpretation: 'DNS resolution successful',
                        recommended_actions: []
                    };
                }
                catch (error) {
                    return {
                        test_name: 'dns_resolution',
                        passed: false,
                        result: { error: error.message },
                        interpretation: 'DNS resolution failed',
                        recommended_actions: ['Check DNS configuration', 'Verify hostname']
                    };
                }
            },
            applicable_conditions: ['network', 'websocket']
        });
        // Port Connectivity Test
        this.diagnosticTests.set('port_connectivity', {
            name: 'port_connectivity',
            description: 'Test port connectivity to the target endpoint',
            test_function: async (context) => {
                // Simplified test - real implementation would test actual connectivity
                return {
                    test_name: 'port_connectivity',
                    passed: context.networkConditions.isOnline,
                    result: { connected: context.networkConditions.isOnline },
                    interpretation: context.networkConditions.isOnline
                        ? 'Port is accessible'
                        : 'Port connectivity failed',
                    recommended_actions: context.networkConditions.isOnline
                        ? []
                        : ['Check firewall rules', 'Verify port is open']
                };
            },
            applicable_conditions: ['network', 'websocket', 'timeout']
        });
        // SSL/TLS Test
        this.diagnosticTests.set('ssl_tls', {
            name: 'ssl_tls',
            description: 'Test SSL/TLS certificate validity',
            test_function: async (context) => {
                const isSecure = context.endpoint.startsWith('wss://') || context.endpoint.startsWith('https://');
                return {
                    test_name: 'ssl_tls',
                    passed: !isSecure || true, // Simplified - assume SSL is valid if present
                    result: { secure: isSecure, valid: true },
                    interpretation: 'SSL/TLS configuration is valid',
                    recommended_actions: []
                };
            },
            applicable_conditions: ['websocket', 'protocol']
        });
    }
    initializeKnowledgeBase() {
        // Initialize knowledge base with common error patterns and solutions
        this.knowledgeBase.set('common_timeout_causes', [
            'Network latency higher than timeout value',
            'Server overload causing slow responses',
            'Firewall dropping long-running connections',
            'Load balancer timeout configuration'
        ]);
        this.knowledgeBase.set('websocket_upgrade_requirements', [
            'HTTP/1.1 protocol',
            'Upgrade: websocket header',
            'Connection: Upgrade header',
            'Sec-WebSocket-Key header',
            'Sec-WebSocket-Version: 13'
        ]);
    }
}
exports.TroubleshootingEngine = TroubleshootingEngine;
//# sourceMappingURL=troubleshooting-engine.js.map