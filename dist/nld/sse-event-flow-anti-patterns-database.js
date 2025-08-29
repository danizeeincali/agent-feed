"use strict";
/**
 * SSE Event Flow Anti-Patterns Database
 * Comprehensive failure pattern database for SSE connection management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEAntiPatternsDatabase = void 0;
class SSEAntiPatternsDatabase {
    patterns = new Map();
    constructor() {
        this.initializeKnownPatterns();
    }
    initializeKnownPatterns() {
        // Anti-Pattern 1: Immediate Connection Reset
        this.patterns.set('immediate-connection-reset', {
            id: 'immediate-connection-reset',
            name: 'Immediate SSE Connection Reset',
            description: 'SSE connection establishes successfully but immediately drops with ECONNRESET after first interaction',
            symptoms: [
                'Connection count shows 1, then immediately drops to 0',
                'ECONNRESET error after every user input',
                'No persistent connection across multiple commands',
                'Connection lifecycle duration < 1000ms'
            ],
            rootCause: 'Server terminates SSE connection instead of maintaining persistent stream',
            impactLevel: 'critical',
            frequency: 0.95,
            detectionSignatures: [
                '📊 SSE connections for claude-XXXX: 1',
                '📊 SSE connections remaining for claude-XXXX: 0',
                '❌ SSE connection error: ECONNRESET',
                'connection immediately drops'
            ],
            preventionStrategies: [
                'Implement proper SSE event loop without connection termination',
                'Use keep-alive mechanisms in server-side SSE handlers',
                'Avoid closing connection after single message exchange',
                'Implement connection state management with session persistence'
            ],
            tddPreventionRate: 0.85,
            realWorldExamples: [
                {
                    scenario: 'Frontend establishes SSE connection, sends command, connection drops',
                    outcome: 'User sees "disconnected" status after every interaction',
                    solution: 'Modify server to maintain connection state across interactions'
                }
            ]
        });
        // Anti-Pattern 2: Rapid Reconnection Cycling
        this.patterns.set('rapid-reconnection-cycling', {
            id: 'rapid-reconnection-cycling',
            name: 'Rapid SSE Reconnection Cycling',
            description: 'Frontend continuously creates new connections without proper cleanup, causing connection storm',
            symptoms: [
                'Multiple connection attempts in short time spans',
                'Exponential increase in connection count',
                'Server resource exhaustion',
                'Browser tab becomes unresponsive'
            ],
            rootCause: 'Missing exponential backoff and connection state validation in retry logic',
            impactLevel: 'high',
            frequency: 0.78,
            detectionSignatures: [
                'Reconnecting attempt',
                'Multiple SSE connection established',
                'Connection retry loop detected',
                'fallback to HTTP polling'
            ],
            preventionStrategies: [
                'Implement exponential backoff for reconnection attempts',
                'Add connection state validation before creating new connections',
                'Use connection pooling to prevent connection churn',
                'Implement circuit breaker pattern for failed connections'
            ],
            tddPreventionRate: 0.72,
            realWorldExamples: [
                {
                    scenario: 'Connection fails, frontend immediately retries without delay',
                    outcome: 'Browser creates dozens of failed connection attempts',
                    solution: 'Add exponential backoff with maximum retry limit'
                }
            ]
        });
        // Anti-Pattern 3: Zero Connection Persistence
        this.patterns.set('zero-connection-persistence', {
            id: 'zero-connection-persistence',
            name: 'Zero Connection Persistence',
            description: 'Connections drop to zero after every user interaction, preventing real-time communication',
            symptoms: [
                'Connection count consistently returns to 0',
                'No maintained session state',
                'Interactive features require full reconnection',
                'Poor user experience with delays'
            ],
            rootCause: 'Server design treats SSE as request-response rather than persistent stream',
            impactLevel: 'critical',
            frequency: 0.88,
            detectionSignatures: [
                'connections remaining for.*: 0',
                'No persistent connection maintained',
                'SSE treated as HTTP request',
                'Connection cleanup after every response'
            ],
            preventionStrategies: [
                'Design server to maintain long-lived connections',
                'Implement proper SSE stream management',
                'Use connection heartbeat to keep connections alive',
                'Avoid connection cleanup after successful operations'
            ],
            tddPreventionRate: 0.80,
            realWorldExamples: [
                {
                    scenario: 'User sends command, gets response, but connection closes',
                    outcome: 'Next command requires full connection re-establishment',
                    solution: 'Implement persistent connection management with session state'
                }
            ]
        });
        // Anti-Pattern 4: SSE Event Loop Termination
        this.patterns.set('sse-event-loop-termination', {
            id: 'sse-event-loop-termination',
            name: 'SSE Event Loop Premature Termination',
            description: 'Server-side SSE event loop terminates after processing single event instead of maintaining stream',
            symptoms: [
                'Single response followed by connection close',
                'No continuous event streaming',
                'Server logs show event loop exit',
                'Clients receive close event immediately after response'
            ],
            rootCause: 'Event loop implementation lacks proper stream continuation logic',
            impactLevel: 'high',
            frequency: 0.82,
            detectionSignatures: [
                'Event loop terminated',
                'Single event response pattern',
                'Connection close after write',
                'Stream ended prematurely'
            ],
            preventionStrategies: [
                'Implement infinite event loop for SSE streams',
                'Use proper async/await patterns for continuous streaming',
                'Add event queue management for persistent connections',
                'Implement connection lifecycle management'
            ],
            tddPreventionRate: 0.75,
            realWorldExamples: [
                {
                    scenario: 'Server processes terminal input, sends response, then closes connection',
                    outcome: 'Client must reconnect for every command',
                    solution: 'Maintain event loop to keep connection alive for future events'
                }
            ]
        });
        // Anti-Pattern 5: Connection State Desynchronization
        this.patterns.set('connection-state-desync', {
            id: 'connection-state-desync',
            name: 'Connection State Desynchronization',
            description: 'Frontend and backend connection state tracking becomes inconsistent',
            symptoms: [
                'Frontend shows connected but backend has no active connections',
                'Messages sent to non-existent connections',
                'Orphaned connection references',
                'State mismatch errors'
            ],
            rootCause: 'Inconsistent connection tracking between client and server',
            impactLevel: 'medium',
            frequency: 0.65,
            detectionSignatures: [
                'Connection state mismatch',
                'Orphaned connection detected',
                'Frontend connected but backend empty',
                'Message broadcast to closed connection'
            ],
            preventionStrategies: [
                'Implement synchronized connection state management',
                'Use connection heartbeat for state validation',
                'Add connection cleanup event handlers',
                'Implement connection reconciliation mechanisms'
            ],
            tddPreventionRate: 0.68,
            realWorldExamples: [
                {
                    scenario: 'Frontend thinks it\'s connected but server has no active connections',
                    outcome: 'Messages are sent but never delivered to client',
                    solution: 'Add connection state synchronization and validation'
                }
            ]
        });
    }
    /**
     * Retrieves anti-pattern by ID
     */
    getPattern(patternId) {
        return this.patterns.get(patternId);
    }
    /**
     * Gets all patterns matching specific criteria
     */
    getPatternsByImpact(impactLevel) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.impactLevel === impactLevel);
    }
    /**
     * Finds patterns based on detection signatures
     */
    detectPatternsFromLogs(logs) {
        const detectedPatterns = [];
        const confidenceScores = new Map();
        const recommendations = [];
        for (const [patternId, pattern] of this.patterns) {
            let matchScore = 0;
            let totalSignatures = pattern.detectionSignatures.length;
            // Check how many signatures match the logs
            for (const signature of pattern.detectionSignatures) {
                const matches = logs.some(log => log.toLowerCase().includes(signature.toLowerCase()) ||
                    new RegExp(signature, 'i').test(log));
                if (matches) {
                    matchScore++;
                }
            }
            const confidence = matchScore / totalSignatures;
            if (confidence >= 0.5) { // 50% threshold for pattern detection
                detectedPatterns.push(patternId);
                confidenceScores.set(patternId, confidence);
                // Add prevention strategies as recommendations
                recommendations.push(...pattern.preventionStrategies);
            }
        }
        return {
            detectedPatterns,
            confidenceScores,
            recommendations: [...new Set(recommendations)] // Remove duplicates
        };
    }
    /**
     * Generates TDD test strategies for detected patterns
     */
    generateTDDStrategies(patternIds) {
        const testCases = [];
        const mockingStrategies = [];
        const integrationTests = [];
        for (const patternId of patternIds) {
            const pattern = this.patterns.get(patternId);
            if (!pattern)
                continue;
            // Generate specific test cases for each pattern
            switch (patternId) {
                case 'immediate-connection-reset':
                    testCases.push('Test SSE connection maintains state after message exchange');
                    testCases.push('Verify connection persists across multiple user interactions');
                    mockingStrategies.push('Mock EventSource to simulate connection lifecycle');
                    integrationTests.push('End-to-end test of persistent SSE communication');
                    break;
                case 'rapid-reconnection-cycling':
                    testCases.push('Test exponential backoff prevents connection storms');
                    testCases.push('Verify reconnection attempts respect maximum limits');
                    mockingStrategies.push('Mock network failures to test retry logic');
                    integrationTests.push('Load test connection retry under failure conditions');
                    break;
                case 'zero-connection-persistence':
                    testCases.push('Test connection state maintained between operations');
                    testCases.push('Verify session persistence across user interactions');
                    mockingStrategies.push('Mock server responses to test connection handling');
                    integrationTests.push('Full user interaction flow with persistent connections');
                    break;
            }
        }
        return {
            testCases: [...new Set(testCases)],
            mockingStrategies: [...new Set(mockingStrategies)],
            integrationTests: [...new Set(integrationTests)]
        };
    }
    /**
     * Updates pattern frequency based on detection
     */
    updatePatternFrequency(patternId, detected) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
            if (detected) {
                pattern.frequency = Math.min(pattern.frequency + 0.02, 1.0);
            }
            else {
                pattern.frequency = Math.max(pattern.frequency - 0.01, 0.0);
            }
            this.patterns.set(patternId, pattern);
        }
    }
    /**
     * Exports database for neural network training
     */
    exportForTraining() {
        const antiPatterns = Array.from(this.patterns.values());
        const criticalPatterns = antiPatterns.filter(p => p.impactLevel === 'critical');
        const avgTDDRate = antiPatterns.reduce((sum, p) => sum + p.tddPreventionRate, 0) / antiPatterns.length;
        const sortedByFrequency = antiPatterns
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5)
            .map(p => p.id);
        const trainingData = antiPatterns.map(pattern => ({
            input: {
                symptoms: pattern.symptoms,
                detectionSignatures: pattern.detectionSignatures,
                context: 'SSE Connection Management'
            },
            output: {
                patternId: pattern.id,
                preventionStrategies: pattern.preventionStrategies,
                impactLevel: pattern.impactLevel,
                tddEffectiveness: pattern.tddPreventionRate
            }
        }));
        return {
            antiPatterns,
            trainingData,
            metadata: {
                totalPatterns: antiPatterns.length,
                criticalPatterns: criticalPatterns.length,
                avgTDDPreventionRate: avgTDDRate,
                mostCommonPatterns: sortedByFrequency
            }
        };
    }
}
exports.SSEAntiPatternsDatabase = SSEAntiPatternsDatabase;
//# sourceMappingURL=sse-event-flow-anti-patterns-database.js.map