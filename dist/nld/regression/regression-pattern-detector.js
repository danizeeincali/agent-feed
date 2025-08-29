"use strict";
/**
 * Regression Pattern Detector - Advanced Pattern Recognition System
 *
 * Uses machine learning-like pattern recognition to detect regression patterns
 * in Claude process behavior before they cause system failures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.regressionPatternDetector = exports.RegressionPatternDetector = void 0;
class RegressionPatternDetector {
    patterns = new Map();
    eventHistory = [];
    detectionCache = new Map();
    performanceMetrics = {
        detectionsPerformed: 0,
        averageDetectionTime: 0,
        cacheHitRate: 0,
        falsePositiveRate: 0
    };
    constructor() {
        this.initializeAdvancedPatterns();
    }
    /**
     * Initialize advanced regression patterns with behavioral detection
     */
    initializeAdvancedPatterns() {
        const advancedPatterns = [
            {
                id: 'PRINT_FLAG_INJECTION_PATTERN',
                name: 'Print Flag Injection Pattern',
                description: 'Detects subtle introduction of --print flags through various injection methods',
                regexPatterns: [
                    /--print(?:$|\s)/,
                    /['"]--print['"]/,
                    /args.*\.push.*print/,
                    /command.*concat.*print/,
                    /\.join.*--print/
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['COMMAND_BUILD', 'PROCESS_SPAWN'],
                        timingConstraints: [
                            { eventA: 'COMMAND_BUILD', eventB: 'PROCESS_SPAWN', maxDeltaMs: 1000, minDeltaMs: 0 }
                        ],
                        valueConstraints: [
                            { field: 'command', expectedValue: '--print', operator: 'contains' }
                        ]
                    }
                ],
                timeWindowMs: 5000,
                minConfidence: 0.8,
                contextRequirements: ['instanceId', 'command']
            },
            {
                id: 'MOCK_CLAUDE_ACTIVATION_SEQUENCE',
                name: 'Mock Claude Activation Sequence',
                description: 'Detects the activation sequence that leads to mock Claude fallback',
                regexPatterns: [
                    /MockClaudeProcess/,
                    /createMockClaudeInstance/,
                    /isMock.*true/,
                    /processType.*mock/
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['AUTH_CHECK', 'PROCESS_CREATION_FAILED', 'MOCK_FALLBACK'],
                        timingConstraints: [
                            { eventA: 'AUTH_CHECK', eventB: 'MOCK_FALLBACK', maxDeltaMs: 3000, minDeltaMs: 100 }
                        ],
                        valueConstraints: [
                            { field: 'processType', expectedValue: 'mock', operator: 'equals' }
                        ]
                    }
                ],
                timeWindowMs: 10000,
                minConfidence: 0.9,
                contextRequirements: ['instanceId', 'processType']
            },
            {
                id: 'AUTH_DEGRADATION_PATTERN',
                name: 'Authentication Degradation Pattern',
                description: 'Detects gradual degradation in authentication system leading to failures',
                regexPatterns: [
                    /authentication.*failed/i,
                    /Claude CLI.*not.*available/i,
                    /credentials.*not.*found/i,
                    /permission.*denied/i
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['AUTH_CHECK', 'AUTH_RETRY', 'AUTH_FAILURE'],
                        timingConstraints: [
                            { eventA: 'AUTH_CHECK', eventB: 'AUTH_FAILURE', maxDeltaMs: 5000, minDeltaMs: 500 }
                        ],
                        valueConstraints: [
                            { field: 'authenticated', expectedValue: false, operator: 'equals' }
                        ]
                    }
                ],
                timeWindowMs: 15000,
                minConfidence: 0.75,
                contextRequirements: ['authResult', 'instanceId']
            },
            {
                id: 'DIRECTORY_RESOLUTION_CASCADE_FAILURE',
                name: 'Directory Resolution Cascade Failure',
                description: 'Detects cascade failures in directory resolution system',
                regexPatterns: [
                    /Directory.*validation.*failed/,
                    /Working directory.*does not exist/,
                    /Security violation.*Directory/,
                    /ENOENT.*no such file/
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['DIR_RESOLVE', 'DIR_VALIDATE', 'DIR_FAILURE', 'FALLBACK_DIR'],
                        timingConstraints: [
                            { eventA: 'DIR_RESOLVE', eventB: 'FALLBACK_DIR', maxDeltaMs: 2000, minDeltaMs: 10 }
                        ],
                        valueConstraints: [
                            { field: 'directoryValid', expectedValue: false, operator: 'equals' }
                        ]
                    }
                ],
                timeWindowMs: 8000,
                minConfidence: 0.85,
                contextRequirements: ['workingDirectory', 'instanceId']
            },
            {
                id: 'PROCESS_SPAWN_REGRESSION_CHAIN',
                name: 'Process Spawn Regression Chain',
                description: 'Detects regression chain that leads to process spawning failures',
                regexPatterns: [
                    /spawn.*ENOENT/,
                    /Failed to spawn.*process/,
                    /Process error.*spawn/,
                    /claudeProcess.*undefined/,
                    /child_process.*spawn.*error/
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['SPAWN_ATTEMPT', 'SPAWN_ERROR', 'PROCESS_CLEANUP'],
                        timingConstraints: [
                            { eventA: 'SPAWN_ATTEMPT', eventB: 'SPAWN_ERROR', maxDeltaMs: 1000, minDeltaMs: 0 }
                        ],
                        valueConstraints: [
                            { field: 'processCreated', expectedValue: false, operator: 'equals' }
                        ]
                    }
                ],
                timeWindowMs: 3000,
                minConfidence: 0.9,
                contextRequirements: ['command', 'spawnResult']
            },
            {
                id: 'SSE_CONNECTION_DEGRADATION',
                name: 'SSE Connection Degradation Pattern',
                description: 'Detects gradual degradation of SSE connections leading to output loss',
                regexPatterns: [
                    /No SSE connections.*buffering/,
                    /Failed to broadcast.*all connections failed/,
                    /SSE connection.*error/,
                    /ECONNRESET.*SSE/
                ],
                behavioralPatterns: [
                    {
                        eventSequence: ['SSE_CONNECT', 'SSE_OUTPUT', 'SSE_ERROR', 'SSE_DISCONNECT'],
                        timingConstraints: [
                            { eventA: 'SSE_CONNECT', eventB: 'SSE_DISCONNECT', maxDeltaMs: 30000, minDeltaMs: 1000 }
                        ],
                        valueConstraints: [
                            { field: 'connectionCount', expectedValue: 0, operator: 'equals' }
                        ]
                    }
                ],
                timeWindowMs: 45000,
                minConfidence: 0.7,
                contextRequirements: ['instanceId', 'connectionCount']
            }
        ];
        advancedPatterns.forEach(pattern => {
            this.patterns.set(pattern.id, pattern);
        });
        console.log(`🧠 Initialized ${advancedPatterns.length} advanced regression detection patterns`);
    }
    /**
     * Perform comprehensive pattern detection on event
     */
    detectPatterns(event) {
        const startTime = performance.now();
        const results = [];
        // Add event to history
        this.addEventToHistory(event);
        // Check each pattern
        for (const pattern of this.patterns.values()) {
            const cacheKey = this.generateCacheKey(pattern, event);
            // Check cache first
            if (this.detectionCache.has(cacheKey)) {
                const cached = this.detectionCache.get(cacheKey);
                if (Date.now() - cached.detectedAt.getTime() < 30000) { // 30 second cache
                    results.push(cached);
                    continue;
                }
            }
            // Perform detection
            const result = this.detectSinglePattern(pattern, event);
            if (result && result.confidence >= pattern.minConfidence) {
                results.push(result);
                this.detectionCache.set(cacheKey, result);
            }
        }
        // Update performance metrics
        const detectionTime = performance.now() - startTime;
        this.updatePerformanceMetrics(detectionTime, results.length);
        return results;
    }
    /**
     * Add event to rolling history
     */
    addEventToHistory(event) {
        event.detectionTimestamp = new Date();
        this.eventHistory.push(event);
        // Keep only recent events (last 500 for performance)
        if (this.eventHistory.length > 500) {
            this.eventHistory.shift();
        }
    }
    /**
     * Detect single pattern against event and history
     */
    detectSinglePattern(pattern, currentEvent) {
        let confidence = 0;
        const evidence = [];
        // Check regex patterns
        const textualEvidence = JSON.stringify(currentEvent);
        let regexMatches = 0;
        for (const regex of pattern.regexPatterns) {
            if (regex.test(textualEvidence)) {
                regexMatches++;
                evidence.push(`Regex match: ${regex.source}`);
            }
        }
        if (pattern.regexPatterns.length > 0) {
            confidence += (regexMatches / pattern.regexPatterns.length) * 0.4;
        }
        // Check behavioral patterns
        let behavioralScore = 0;
        for (const behavioralPattern of pattern.behavioralPatterns) {
            const score = this.evaluateBehavioralPattern(behavioralPattern, currentEvent, pattern.timeWindowMs);
            if (score > 0) {
                behavioralScore += score;
                evidence.push(`Behavioral pattern detected: confidence ${score.toFixed(2)}`);
            }
        }
        if (pattern.behavioralPatterns.length > 0) {
            confidence += (behavioralScore / pattern.behavioralPatterns.length) * 0.5;
        }
        // Check context requirements
        let contextScore = 0;
        for (const requirement of pattern.contextRequirements) {
            if (currentEvent.hasOwnProperty(requirement)) {
                contextScore++;
            }
        }
        if (pattern.contextRequirements.length > 0) {
            confidence += (contextScore / pattern.contextRequirements.length) * 0.1;
        }
        // Return result if meets minimum confidence
        if (confidence >= pattern.minConfidence) {
            return {
                patternId: pattern.id,
                confidence,
                severity: this.determineSeverity(pattern, confidence),
                detectedAt: new Date(),
                evidence,
                preventionAction: this.getPreventionAction(pattern.id),
                recoveryStrategy: this.getRecoveryStrategy(pattern.id)
            };
        }
        return null;
    }
    /**
     * Evaluate behavioral pattern against event history
     */
    evaluateBehavioralPattern(behavioral, currentEvent, timeWindowMs) {
        const cutoffTime = Date.now() - timeWindowMs;
        const relevantHistory = this.eventHistory.filter(e => e.detectionTimestamp && e.detectionTimestamp.getTime() > cutoffTime);
        // Check if event sequence exists
        const sequenceScore = this.checkEventSequence(behavioral.eventSequence, relevantHistory, currentEvent);
        if (sequenceScore === 0)
            return 0;
        // Check timing constraints
        const timingScore = this.checkTimingConstraints(behavioral.timingConstraints, relevantHistory, currentEvent);
        // Check value constraints
        const valueScore = this.checkValueConstraints(behavioral.valueConstraints, currentEvent);
        return (sequenceScore * 0.5) + (timingScore * 0.3) + (valueScore * 0.2);
    }
    /**
     * Check if event sequence exists in history
     */
    checkEventSequence(sequence, history, currentEvent) {
        // Simplified sequence checking - would need more sophisticated implementation
        let matchedEvents = 0;
        for (const expectedEvent of sequence) {
            const found = history.some(event => event.eventType === expectedEvent ||
                (event.type && event.type.includes(expectedEvent)));
            if (found)
                matchedEvents++;
        }
        return matchedEvents / sequence.length;
    }
    /**
     * Check timing constraints
     */
    checkTimingConstraints(constraints, history, currentEvent) {
        if (constraints.length === 0)
            return 1;
        let satisfiedConstraints = 0;
        for (const constraint of constraints) {
            const eventA = history.find(e => e.eventType === constraint.eventA || (e.type && e.type.includes(constraint.eventA)));
            const eventB = history.find(e => e.eventType === constraint.eventB || (e.type && e.type.includes(constraint.eventB)));
            if (eventA && eventB && eventA.detectionTimestamp && eventB.detectionTimestamp) {
                const deltaMs = Math.abs(eventB.detectionTimestamp.getTime() - eventA.detectionTimestamp.getTime());
                if (deltaMs >= constraint.minDeltaMs && deltaMs <= constraint.maxDeltaMs) {
                    satisfiedConstraints++;
                }
            }
        }
        return satisfiedConstraints / constraints.length;
    }
    /**
     * Check value constraints
     */
    checkValueConstraints(constraints, event) {
        if (constraints.length === 0)
            return 1;
        let satisfiedConstraints = 0;
        for (const constraint of constraints) {
            const actualValue = this.getNestedValue(event, constraint.field);
            if (actualValue !== undefined) {
                const satisfied = this.evaluateValueConstraint(actualValue, constraint);
                if (satisfied)
                    satisfiedConstraints++;
            }
        }
        return satisfiedConstraints / constraints.length;
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Evaluate single value constraint
     */
    evaluateValueConstraint(actualValue, constraint) {
        switch (constraint.operator) {
            case 'equals':
                return actualValue === constraint.expectedValue;
            case 'contains':
                return String(actualValue).includes(String(constraint.expectedValue));
            case 'regex':
                return new RegExp(constraint.expectedValue).test(String(actualValue));
            case 'range':
                const tolerance = constraint.tolerance || 0;
                return Math.abs(actualValue - constraint.expectedValue) <= tolerance;
            default:
                return false;
        }
    }
    /**
     * Determine severity based on pattern and confidence
     */
    determineSeverity(pattern, confidence) {
        if (pattern.id.includes('CRITICAL') || confidence > 0.9)
            return 'CRITICAL';
        if (pattern.id.includes('AUTH') || pattern.id.includes('SPAWN') || confidence > 0.8)
            return 'HIGH';
        if (confidence > 0.7)
            return 'MEDIUM';
        return 'LOW';
    }
    /**
     * Get prevention action for pattern
     */
    getPreventionAction(patternId) {
        const actions = {
            'PRINT_FLAG_INJECTION_PATTERN': 'Implement command argument sanitization',
            'MOCK_CLAUDE_ACTIVATION_SEQUENCE': 'Force real process creation with fallback validation',
            'AUTH_DEGRADATION_PATTERN': 'Implement authentication health monitoring',
            'DIRECTORY_RESOLUTION_CASCADE_FAILURE': 'Add directory validation pipeline',
            'PROCESS_SPAWN_REGRESSION_CHAIN': 'Implement spawn command validation',
            'SSE_CONNECTION_DEGRADATION': 'Add connection health monitoring'
        };
        return actions[patternId] || 'General monitoring and validation';
    }
    /**
     * Get recovery strategy for pattern
     */
    getRecoveryStrategy(patternId) {
        const strategies = {
            'PRINT_FLAG_INJECTION_PATTERN': 'Strip flags and restart process',
            'MOCK_CLAUDE_ACTIVATION_SEQUENCE': 'Force real Claude process restart',
            'AUTH_DEGRADATION_PATTERN': 'Reinitialize authentication system',
            'DIRECTORY_RESOLUTION_CASCADE_FAILURE': 'Use validated fallback directory',
            'PROCESS_SPAWN_REGRESSION_CHAIN': 'Use fallback spawn configuration',
            'SSE_CONNECTION_DEGRADATION': 'Reset SSE connection system'
        };
        return strategies[patternId] || 'Manual intervention required';
    }
    /**
     * Generate cache key for pattern detection result
     */
    generateCacheKey(pattern, event) {
        return `${pattern.id}-${event.instanceId || 'global'}-${event.eventType || 'unknown'}`;
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(detectionTime, resultsCount) {
        this.performanceMetrics.detectionsPerformed++;
        // Update average detection time
        const currentAvg = this.performanceMetrics.averageDetectionTime;
        const count = this.performanceMetrics.detectionsPerformed;
        this.performanceMetrics.averageDetectionTime = ((currentAvg * (count - 1)) + detectionTime) / count;
        // Update cache hit rate
        const cacheSize = this.detectionCache.size;
        const totalDetections = this.performanceMetrics.detectionsPerformed;
        this.performanceMetrics.cacheHitRate = cacheSize / totalDetections;
    }
    /**
     * Get performance statistics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            patternsLoaded: this.patterns.size,
            eventHistorySize: this.eventHistory.length,
            cacheSize: this.detectionCache.size
        };
    }
    /**
     * Clear cache and reset metrics
     */
    reset() {
        this.detectionCache.clear();
        this.eventHistory = [];
        this.performanceMetrics = {
            detectionsPerformed: 0,
            averageDetectionTime: 0,
            cacheHitRate: 0,
            falsePositiveRate: 0
        };
        console.log('🔄 Regression pattern detector reset');
    }
}
exports.RegressionPatternDetector = RegressionPatternDetector;
// Export singleton instance
exports.regressionPatternDetector = new RegressionPatternDetector();
console.log('🧠 Advanced Regression Pattern Detector initialized');
//# sourceMappingURL=regression-pattern-detector.js.map