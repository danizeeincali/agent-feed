"use strict";
/**
 * Comprehensive SSE Streaming Anti-Patterns Database
 * Centralized database of all SSE streaming anti-patterns and their characteristics
 * Part of NLD (Neuro-Learning Development) system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEStreamingAntiPatternsDatabase = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
const tdd_sse_prevention_strategies_1 = __importDefault(require("./tdd-sse-prevention-strategies"));
const sse_neural_training_export_1 = __importDefault(require("./sse-neural-training-export"));
class SSEStreamingAntiPatternsDatabase extends events_1.EventEmitter {
    antiPatterns = new Map();
    instances = new Map();
    databaseDir;
    bufferDetector;
    handlerAnalyzer;
    bufferFailureAnalyzer;
    frontendDetector;
    tddStrategies;
    neuralExporter;
    constructor(databaseDir) {
        super();
        this.databaseDir = databaseDir;
        this.ensureDatabaseDirectory();
        this.initializeAntiPatternDefinitions();
        this.loadExistingInstances();
        console.log('🗃️ SSE Streaming Anti-Patterns Database initialized');
    }
    /**
     * Initialize NLD analyzers
     */
    initializeAnalyzers(bufferDetector, handlerAnalyzer, bufferFailureAnalyzer, frontendDetector) {
        this.bufferDetector = bufferDetector;
        this.handlerAnalyzer = handlerAnalyzer;
        this.bufferFailureAnalyzer = bufferFailureAnalyzer;
        this.frontendDetector = frontendDetector;
        // Initialize TDD strategies and neural export
        this.tddStrategies = new tdd_sse_prevention_strategies_1.default(this.databaseDir);
        this.neuralExporter = new sse_neural_training_export_1.default((0, path_1.join)(this.databaseDir, 'neural-training'), bufferDetector, handlerAnalyzer, bufferFailureAnalyzer, frontendDetector);
        // Set up event listeners for real-time instance detection
        this.setupPatternDetectionListeners();
        console.log('🔗 NLD analyzers connected to anti-patterns database');
    }
    /**
     * Initialize comprehensive anti-pattern definitions
     */
    initializeAntiPatternDefinitions() {
        // SSE Buffer Replay Loop Anti-Pattern
        this.antiPatterns.set('SSE_BUFFER_REPLAY_LOOP', {
            id: 'SSE_BUFFER_REPLAY_LOOP',
            name: 'SSE Buffer Replay Loop',
            category: 'buffer_management',
            severity: 'critical',
            description: 'Backend SSE streaming buffer position resets causing infinite message replay to frontend',
            technicalCause: 'Output buffer read position incorrectly resets to 0, causing same messages to be streamed repeatedly',
            manifestation: [
                '1000+ identical messages received by frontend',
                'Browser becomes unresponsive due to message overload',
                'Memory consumption grows exponentially',
                'UI elements duplicate or become corrupted',
                'Network traffic spikes abnormally'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'repetitionCount >= 1000',
                    'identical message content',
                    'timeSpan < 10 seconds for high repetition'
                ],
                secondaryIndicators: [
                    'buffer position reset detected',
                    'output parser state corruption',
                    'client disconnection/reconnection cycles'
                ],
                thresholds: {
                    repetitionCount: 1000,
                    timeSpanMs: 10000,
                    bufferSizeBytes: 1048576 // 1MB
                }
            },
            preventionStrategies: {
                immediate: [
                    'Implement buffer position validation',
                    'Add circular buffer with size limits',
                    'Implement message deduplication at receiver'
                ],
                longTerm: [
                    'Redesign buffer management with immutable position tracking',
                    'Add comprehensive buffer state monitoring',
                    'Implement automatic buffer recovery mechanisms'
                ],
                testingApproach: 'Unit tests for buffer position integrity, integration tests for high-volume streaming'
            },
            realWorldExamples: [
                {
                    scenario: 'Claude terminal output streaming during active development session',
                    frequency: 'occasional',
                    impact: 'Frontend becomes unresponsive, requires page refresh',
                    resolution: 'Backend restart required to reset buffer state'
                },
                {
                    scenario: 'Long-running Claude instance with continuous output',
                    frequency: 'rare',
                    impact: 'Browser crash due to memory exhaustion',
                    resolution: 'Implement buffer size limits and cleanup'
                }
            ],
            relatedPatterns: ['FRONTEND_MESSAGE_STATE_ACCUMULATION', 'OUTPUT_POSITION_TRACKING_FAILURE'],
            references: {
                documentation: [
                    '/workspaces/agent-feed/simple-backend.js:broadcastToAllConnections',
                    '/workspaces/agent-feed/simple-backend.js:safelyBroadcastOutput'
                ],
                codeExamples: [
                    'BoundedSSEBuffer implementation with position validation',
                    'Message deduplication logic'
                ],
                testCases: [
                    'sse-buffer-bounds-test',
                    'position-reset-detection-test'
                ]
            }
        });
        // SSE Event Handler Duplication Anti-Pattern
        this.antiPatterns.set('SSE_EVENT_HANDLER_DUPLICATION', {
            id: 'SSE_EVENT_HANDLER_DUPLICATION',
            name: 'SSE Event Handler Duplication',
            category: 'event_handling',
            severity: 'high',
            description: 'Multiple SSE event handlers registered for same event/instance causing duplicate processing',
            technicalCause: 'React components re-mounting or useEffect dependencies causing multiple EventSource registrations',
            manifestation: [
                'Same SSE message processed multiple times',
                'Multiple EventSource connections to same endpoint',
                'Memory leaks from uncleared event handlers',
                'Exponential growth in event handler count',
                'UI state inconsistencies'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'handlerRegistrationCount >= 3',
                    'multiple EventSource instances for same URL',
                    'duplicate function names in handler registry'
                ],
                secondaryIndicators: [
                    'component re-mount cycles',
                    'cleanup function not called',
                    'memory usage trending upward'
                ],
                thresholds: {
                    handlerRegistrationCount: 3,
                    eventSourceInstanceCount: 2,
                    memoryLeakThresholdMB: 50
                }
            },
            preventionStrategies: {
                immediate: [
                    'Implement handler registry with duplicate prevention',
                    'Add cleanup in useEffect return function',
                    'Use useCallback and useMemo for handler stability'
                ],
                longTerm: [
                    'Create centralized SSE connection manager',
                    'Implement connection pooling and sharing',
                    'Add automated cleanup detection and enforcement'
                ],
                testingApproach: 'Integration tests for component lifecycle, handler registration tracking'
            },
            realWorldExamples: [
                {
                    scenario: 'HTTPPollingTerminal component remounting during route changes',
                    frequency: 'common',
                    impact: 'Multiple terminal outputs displayed, performance degradation',
                    resolution: 'Proper useEffect cleanup implementation'
                },
                {
                    scenario: 'Development hot-reload causing component re-registration',
                    frequency: 'frequent',
                    impact: 'Development server memory usage grows over time',
                    resolution: 'Dev-only handler cleanup on hot reload'
                }
            ],
            relatedPatterns: ['FRONTEND_MESSAGE_STATE_ACCUMULATION', 'SSE_CONNECTION_LEAKAGE'],
            references: {
                documentation: [
                    '/workspaces/agent-feed/frontend/src/App.tsx:useHTTPSSE',
                    'React useEffect cleanup patterns'
                ],
                codeExamples: [
                    'SSEHandlerRegistry implementation',
                    'Proper useEffect cleanup pattern'
                ],
                testCases: [
                    'sse-handler-dedup-test',
                    'component-unmount-cleanup-test'
                ]
            }
        });
        // Frontend Message State Accumulation Anti-Pattern
        this.antiPatterns.set('FRONTEND_MESSAGE_STATE_ACCUMULATION', {
            id: 'FRONTEND_MESSAGE_STATE_ACCUMULATION',
            name: 'Frontend Message State Accumulation',
            category: 'frontend_state',
            severity: 'medium',
            description: 'Frontend React state accumulates messages without bounds or cleanup causing memory bloat',
            technicalCause: 'React useState/useReducer accumulating messages without size limits or time-based cleanup',
            manifestation: [
                'React component state grows unbounded',
                'UI becomes sluggish during rendering',
                'Scroll performance degrades with message count',
                'Browser memory usage increases over time',
                'Component re-renders become expensive'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'messageCount >= 100',
                    'component render time > 100ms',
                    'state size > 1MB'
                ],
                secondaryIndicators: [
                    'duplicate messages in state',
                    'stale messages (>5 minutes old)',
                    'high re-render frequency'
                ],
                thresholds: {
                    messageCount: 100,
                    stateSizeBytes: 1048576, // 1MB
                    renderTimeMs: 100,
                    staleMessageAgeMs: 300000 // 5 minutes
                }
            },
            preventionStrategies: {
                immediate: [
                    'Implement message state size limits',
                    'Add time-based message cleanup',
                    'Use virtual scrolling for large message lists'
                ],
                longTerm: [
                    'Implement message pagination',
                    'Use external state management (Redux, Zustand)',
                    'Add message archiving to persistent storage'
                ],
                testingApproach: 'Component testing with large datasets, memory usage monitoring'
            },
            realWorldExamples: [
                {
                    scenario: 'Terminal component with continuous Claude output over hours',
                    frequency: 'occasional',
                    impact: 'UI becomes unresponsive, scrolling lags',
                    resolution: 'Implement message limits and cleanup'
                },
                {
                    scenario: 'Development session with verbose debug output',
                    frequency: 'common',
                    impact: 'Browser tab consumes excessive memory',
                    resolution: 'Add debug message filtering and limits'
                }
            ],
            relatedPatterns: ['SSE_BUFFER_REPLAY_LOOP', 'UI_RENDER_PERFORMANCE_DEGRADATION'],
            references: {
                documentation: [
                    'React performance optimization guide',
                    'Virtual scrolling implementation patterns'
                ],
                codeExamples: [
                    'useBoundedMessageState hook',
                    'Message cleanup useEffect'
                ],
                testCases: [
                    'frontend-state-bounds-test',
                    'message-cleanup-test'
                ]
            }
        });
        // Output Position Tracking Failure Anti-Pattern
        this.antiPatterns.set('OUTPUT_POSITION_TRACKING_FAILURE', {
            id: 'OUTPUT_POSITION_TRACKING_FAILURE',
            name: 'Output Position Tracking Failure',
            category: 'buffer_management',
            severity: 'critical',
            description: 'ClaudeOutputParser fails to track buffer read/write positions correctly',
            technicalCause: 'Buffer position variables corrupted or reset during parsing operations',
            manifestation: [
                'Same output text parsed and sent multiple times',
                'Missing output chunks due to position skipping',
                'Out-of-order message delivery',
                'Parser state becomes inconsistent',
                'Infinite parsing loops'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'outputPosition reset without buffer clear',
                    'duplicate output content with different timestamps',
                    'parser state = corrupted or deadlocked'
                ],
                secondaryIndicators: [
                    'parsing time > expected duration',
                    'memory usage spike during parsing',
                    'error logs indicating position mismatch'
                ],
                thresholds: {
                    positionResetCount: 1,
                    duplicateContentRatio: 0.5,
                    parsingTimeMs: 5000
                }
            },
            preventionStrategies: {
                immediate: [
                    'Add position validation before each read/write',
                    'Implement position recovery mechanisms',
                    'Add parser state integrity checks'
                ],
                longTerm: [
                    'Redesign parser with immutable position tracking',
                    'Implement parser checkpoint/recovery system',
                    'Add comprehensive parser testing with edge cases'
                ],
                testingApproach: 'Property-based testing for parser state invariants, chaos testing'
            },
            realWorldExamples: [
                {
                    scenario: 'High-volume Claude output during code generation',
                    frequency: 'rare',
                    impact: 'Generated code appears multiple times, confusing user',
                    resolution: 'Parser restart and position reset'
                },
                {
                    scenario: 'Complex Claude output with mixed content types',
                    frequency: 'occasional',
                    impact: 'Output parsing becomes unreliable',
                    resolution: 'Improve parser robustness and validation'
                }
            ],
            relatedPatterns: ['SSE_BUFFER_REPLAY_LOOP', 'CLAUDE_PARSER_STATE_CORRUPTION'],
            references: {
                documentation: [
                    'ClaudeOutputParser implementation',
                    'Buffer management best practices'
                ],
                codeExamples: [
                    'Position validation logic',
                    'Parser recovery mechanisms'
                ],
                testCases: [
                    'parser-position-integrity-test',
                    'position-recovery-test'
                ]
            }
        });
        // Claude Parser State Corruption Anti-Pattern
        this.antiPatterns.set('CLAUDE_PARSER_STATE_CORRUPTION', {
            id: 'CLAUDE_PARSER_STATE_CORRUPTION',
            name: 'Claude Parser State Corruption',
            category: 'parser_corruption',
            severity: 'critical',
            description: 'Claude output parser internal state becomes corrupted leading to unpredictable behavior',
            technicalCause: 'Concurrent access, memory corruption, or exception handling issues in parser logic',
            manifestation: [
                'Parser enters infinite processing loop',
                'Output content becomes garbled or corrupted',
                'Parser crashes with segmentation fault',
                'Memory usage grows indefinitely',
                'Parser produces no output despite input'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'parserState = corrupted or deadlocked',
                    'parsing time > 10 seconds for normal input',
                    'output size = 0 despite input present'
                ],
                secondaryIndicators: [
                    'exception thrown during parsing',
                    'memory allocator errors',
                    'CPU usage at 100% in parser thread'
                ],
                thresholds: {
                    maxParsingTimeMs: 10000,
                    maxMemoryUsageMB: 100,
                    crashCountThreshold: 1
                }
            },
            preventionStrategies: {
                immediate: [
                    'Add parser state validation at each step',
                    'Implement parser timeout and recovery',
                    'Add memory usage monitoring and limits'
                ],
                longTerm: [
                    'Rewrite parser with safer memory management',
                    'Add comprehensive parser fuzzing tests',
                    'Implement parser sandboxing or isolation'
                ],
                testingApproach: 'Stress testing with malformed input, memory leak detection'
            },
            realWorldExamples: [
                {
                    scenario: 'Parsing Claude output with unusual Unicode characters',
                    frequency: 'rare',
                    impact: 'Parser crashes, output lost',
                    resolution: 'Input sanitization and parser hardening'
                },
                {
                    scenario: 'Very large Claude response (>10MB)',
                    frequency: 'rare',
                    impact: 'System becomes unresponsive',
                    resolution: 'Implement streaming parsing and memory limits'
                }
            ],
            relatedPatterns: ['OUTPUT_POSITION_TRACKING_FAILURE', 'MEMORY_EXHAUSTION'],
            references: {
                documentation: [
                    'Parser safety guidelines',
                    'Memory management best practices'
                ],
                codeExamples: [
                    'Safe parser implementation',
                    'Parser timeout handling'
                ],
                testCases: [
                    'parser-corruption-test',
                    'parser-fuzzing-test'
                ]
            }
        });
        // SSE Connection Leakage Anti-Pattern
        this.antiPatterns.set('SSE_CONNECTION_LEAKAGE', {
            id: 'SSE_CONNECTION_LEAKAGE',
            name: 'SSE Connection Leakage',
            category: 'connection_management',
            severity: 'high',
            description: 'EventSource connections not properly closed leading to resource leaks',
            technicalCause: 'Missing cleanup in React useEffect, component unmounting without connection closure',
            manifestation: [
                'Growing number of active EventSource connections',
                'Server-side connection count increases over time',
                'Network activity continues after component unmount',
                'Browser console shows connection errors',
                'Server memory usage grows with abandoned connections'
            ],
            detectionCriteria: {
                primaryIndicators: [
                    'eventSourceCount > expectedCount',
                    'connections remain after component unmount',
                    'server reports zombie connections'
                ],
                secondaryIndicators: [
                    'cleanup functions not called',
                    'network errors in console',
                    'increasing server memory usage'
                ],
                thresholds: {
                    maxConnectionsPerInstance: 2,
                    zombieConnectionThreshold: 5,
                    connectionLeakageRatio: 0.1
                }
            },
            preventionStrategies: {
                immediate: [
                    'Ensure useEffect cleanup functions close connections',
                    'Add connection tracking and monitoring',
                    'Implement connection timeout and cleanup'
                ],
                longTerm: [
                    'Create centralized connection manager',
                    'Add automatic connection pruning',
                    'Implement connection health monitoring'
                ],
                testingApproach: 'Component lifecycle testing, connection leak detection'
            },
            realWorldExamples: [
                {
                    scenario: 'User navigates between pages without proper cleanup',
                    frequency: 'common',
                    impact: 'Server accumulates dead connections, memory usage grows',
                    resolution: 'Implement proper cleanup in page navigation'
                },
                {
                    scenario: 'Browser refresh or tab close without cleanup',
                    frequency: 'frequent',
                    impact: 'Server resources not released until timeout',
                    resolution: 'Add beforeunload event handlers'
                }
            ],
            relatedPatterns: ['SSE_EVENT_HANDLER_DUPLICATION', 'MEMORY_EXHAUSTION'],
            references: {
                documentation: [
                    'EventSource cleanup patterns',
                    'React useEffect cleanup'
                ],
                codeExamples: [
                    'Connection lifecycle management',
                    'Cleanup event handlers'
                ],
                testCases: [
                    'connection-cleanup-test',
                    'connection-leakage-detection-test'
                ]
            }
        });
        console.log(`📚 Initialized ${this.antiPatterns.size} anti-pattern definitions`);
    }
    /**
     * Setup event listeners for real-time pattern detection
     */
    setupPatternDetectionListeners() {
        if (this.bufferDetector) {
            this.bufferDetector.on('patternDetected', (pattern) => {
                this.recordAntiPatternInstance({
                    instanceId: `buffer-${pattern.patternId}`,
                    antiPatternId: pattern.antiPattern,
                    detectedAt: pattern.detectedAt,
                    instanceData: pattern,
                    severity: pattern.severity,
                    context: {
                        environment: 'production',
                        instanceName: pattern.instanceId
                    }
                });
            });
        }
        if (this.handlerAnalyzer) {
            this.handlerAnalyzer.on('duplicationPatternDetected', (pattern) => {
                this.recordAntiPatternInstance({
                    instanceId: `handler-${pattern.patternId}`,
                    antiPatternId: 'SSE_EVENT_HANDLER_DUPLICATION',
                    detectedAt: pattern.detectedAt,
                    instanceData: pattern,
                    severity: pattern.severity,
                    context: {
                        environment: 'production',
                        componentName: pattern.handlerFunction
                    }
                });
            });
        }
        if (this.bufferFailureAnalyzer) {
            this.bufferFailureAnalyzer.on('bufferFailureDetected', (failure) => {
                this.recordAntiPatternInstance({
                    instanceId: `buffer-failure-${failure.patternId}`,
                    antiPatternId: 'OUTPUT_POSITION_TRACKING_FAILURE',
                    detectedAt: failure.detectedAt,
                    instanceData: failure,
                    severity: failure.failureDetails.impactSeverity,
                    context: {
                        environment: 'production',
                        instanceName: failure.instanceId
                    }
                });
            });
        }
        if (this.frontendDetector) {
            this.frontendDetector.on('stateAccumulationDetected', (pattern) => {
                this.recordAntiPatternInstance({
                    instanceId: `frontend-${pattern.patternId}`,
                    antiPatternId: 'FRONTEND_MESSAGE_STATE_ACCUMULATION',
                    detectedAt: pattern.detectedAt,
                    instanceData: pattern,
                    severity: pattern.severity,
                    context: {
                        environment: 'production',
                        componentName: pattern.componentName
                    }
                });
            });
        }
        console.log('👂 Pattern detection listeners setup complete');
    }
    /**
     * Record a new anti-pattern instance
     */
    recordAntiPatternInstance(instance) {
        this.instances.set(instance.instanceId, instance);
        this.persistInstances();
        this.emit('antiPatternInstanceRecorded', instance);
        console.log(`🚨 Anti-pattern instance recorded: ${instance.antiPatternId} (${instance.severity})`);
    }
    /**
     * Get anti-pattern definition by ID
     */
    getAntiPattern(id) {
        return this.antiPatterns.get(id);
    }
    /**
     * Get all anti-pattern definitions
     */
    getAllAntiPatterns() {
        return Array.from(this.antiPatterns.values());
    }
    /**
     * Get anti-patterns by category
     */
    getAntiPatternsByCategory(category) {
        return Array.from(this.antiPatterns.values())
            .filter(pattern => pattern.category === category);
    }
    /**
     * Get anti-patterns by severity
     */
    getAntiPatternsBySeverity(severity) {
        return Array.from(this.antiPatterns.values())
            .filter(pattern => pattern.severity === severity);
    }
    /**
     * Get all recorded instances
     */
    getAllInstances() {
        return Array.from(this.instances.values());
    }
    /**
     * Get instances by anti-pattern ID
     */
    getInstancesByAntiPattern(antiPatternId) {
        return Array.from(this.instances.values())
            .filter(instance => instance.antiPatternId === antiPatternId);
    }
    /**
     * Get database statistics
     */
    getDatabaseStatistics() {
        const instances = this.getAllInstances();
        const antiPatterns = this.getAllAntiPatterns();
        const severityBreakdown = {};
        const categoryBreakdown = {};
        const frequencyAnalysis = {};
        instances.forEach(instance => {
            severityBreakdown[instance.severity] = (severityBreakdown[instance.severity] || 0) + 1;
            frequencyAnalysis[instance.antiPatternId] = (frequencyAnalysis[instance.antiPatternId] || 0) + 1;
        });
        antiPatterns.forEach(pattern => {
            categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + 1;
        });
        // Simple trend analysis based on recent instances
        const recentThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        const recentInstances = instances.filter(i => new Date(i.detectedAt).getTime() > recentThreshold);
        const recentFrequency = {};
        recentInstances.forEach(instance => {
            recentFrequency[instance.antiPatternId] = (recentFrequency[instance.antiPatternId] || 0) + 1;
        });
        const increasingPatterns = Object.keys(recentFrequency)
            .filter(id => (recentFrequency[id] || 0) > (frequencyAnalysis[id] || 0) * 0.3);
        return {
            totalAntiPatterns: antiPatterns.length,
            totalInstances: instances.length,
            severityBreakdown,
            categoryBreakdown,
            frequencyAnalysis,
            trendAnalysis: {
                increasingPatterns,
                decreasingPatterns: [],
                stablePatterns: Object.keys(frequencyAnalysis).filter(id => !increasingPatterns.includes(id))
            }
        };
    }
    /**
     * Generate comprehensive anti-patterns report
     */
    generateComprehensiveReport() {
        const stats = this.getDatabaseStatistics();
        const antiPatterns = this.getAllAntiPatterns();
        let report = '=== Comprehensive SSE Streaming Anti-Patterns Database Report ===\n\n';
        report += `📊 DATABASE STATISTICS:\n`;
        report += `- Total Anti-Pattern Definitions: ${stats.totalAntiPatterns}\n`;
        report += `- Total Recorded Instances: ${stats.totalInstances}\n`;
        report += `- Critical Patterns: ${antiPatterns.filter(p => p.severity === 'critical').length}\n`;
        report += `- High Priority Patterns: ${antiPatterns.filter(p => p.severity === 'high').length}\n\n`;
        report += `🎯 SEVERITY BREAKDOWN:\n`;
        Object.entries(stats.severityBreakdown).forEach(([severity, count]) => {
            report += `- ${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count} instances\n`;
        });
        report += '\n';
        report += `📂 CATEGORY BREAKDOWN:\n`;
        Object.entries(stats.categoryBreakdown).forEach(([category, count]) => {
            report += `- ${category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${count} patterns\n`;
        });
        report += '\n';
        report += `📈 FREQUENCY ANALYSIS:\n`;
        Object.entries(stats.frequencyAnalysis)
            .sort(([, a], [, b]) => b - a)
            .forEach(([patternId, count]) => {
            const pattern = this.getAntiPattern(patternId);
            report += `- ${pattern?.name || patternId}: ${count} instances\n`;
        });
        report += '\n';
        if (stats.trendAnalysis.increasingPatterns.length > 0) {
            report += `⚠️ INCREASING PATTERNS (Last 7 days):\n`;
            stats.trendAnalysis.increasingPatterns.forEach(patternId => {
                const pattern = this.getAntiPattern(patternId);
                report += `- ${pattern?.name || patternId}: Showing increased frequency\n`;
            });
            report += '\n';
        }
        report += `🔍 DETAILED PATTERN DEFINITIONS:\n\n`;
        antiPatterns
            .sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        })
            .forEach(pattern => {
            report += `🚨 ${pattern.name} (${pattern.severity.toUpperCase()})\n`;
            report += `   Category: ${pattern.category.replace('_', ' ')}\n`;
            report += `   Description: ${pattern.description}\n`;
            report += `   Technical Cause: ${pattern.technicalCause}\n`;
            report += `   Instances: ${stats.frequencyAnalysis[pattern.id] || 0}\n`;
            if (pattern.manifestation.length > 0) {
                report += `   Manifestations:\n`;
                pattern.manifestation.forEach(manifestation => {
                    report += `     - ${manifestation}\n`;
                });
            }
            if (pattern.preventionStrategies.immediate.length > 0) {
                report += `   Prevention (Immediate):\n`;
                pattern.preventionStrategies.immediate.forEach(strategy => {
                    report += `     - ${strategy}\n`;
                });
            }
            report += '\n';
        });
        if (this.neuralExporter) {
            report += `🧠 NEURAL TRAINING DATA:\n`;
            const neuralStats = this.neuralExporter.getDatasetStatistics();
            report += `- Training Datasets: ${neuralStats.totalDatasets}\n`;
            report += `- Training Samples: ${neuralStats.totalSamples}\n`;
            report += `- Positive Examples: ${neuralStats.totalPositiveExamples}\n`;
            report += `- Negative Examples: ${neuralStats.totalNegativeExamples}\n\n`;
        }
        if (this.tddStrategies) {
            report += `🧪 TDD PREVENTION STRATEGIES:\n`;
            const strategies = this.tddStrategies.getAllStrategies();
            report += `- Total Test Strategies: ${strategies.length}\n`;
            report += `- Critical Prevention Tests: ${strategies.filter(s => s.complexity === 'simple' && s.effectiveness > 90).length}\n`;
            report += `- Load Test Strategies: ${strategies.filter(s => s.category === 'load_test').length}\n\n`;
        }
        return report;
    }
    /**
     * Export database in JSON format
     */
    exportDatabase() {
        return {
            antiPatterns: this.getAllAntiPatterns(),
            instances: this.getAllInstances(),
            statistics: this.getDatabaseStatistics()
        };
    }
    /**
     * Generate prevention checklist for development teams
     */
    generatePreventionChecklist() {
        const checklist = {};
        this.getAllAntiPatterns().forEach(pattern => {
            const categoryName = pattern.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (!checklist[categoryName]) {
                checklist[categoryName] = [];
            }
            checklist[categoryName].push(`✓ Prevent ${pattern.name}: ${pattern.preventionStrategies.immediate[0] || 'Review implementation'}`);
        });
        return checklist;
    }
    /**
     * Ensure database directory exists
     */
    ensureDatabaseDirectory() {
        if (!(0, fs_1.existsSync)(this.databaseDir)) {
            (0, fs_1.mkdirSync)(this.databaseDir, { recursive: true });
        }
    }
    /**
     * Load existing instances from storage
     */
    loadExistingInstances() {
        try {
            const instancesFile = (0, path_1.join)(this.databaseDir, 'anti-pattern-instances.json');
            if ((0, fs_1.existsSync)(instancesFile)) {
                const data = (0, fs_1.readFileSync)(instancesFile, 'utf8');
                const parsed = JSON.parse(data);
                if (parsed.instances && Array.isArray(parsed.instances)) {
                    parsed.instances.forEach((instance) => {
                        this.instances.set(instance.instanceId, instance);
                    });
                    console.log(`📂 Loaded ${parsed.instances.length} existing anti-pattern instances`);
                }
            }
        }
        catch (error) {
            console.error('Failed to load existing instances:', error);
        }
    }
    /**
     * Persist instances to storage
     */
    persistInstances() {
        try {
            const data = {
                instances: Array.from(this.instances.values()),
                lastUpdated: new Date().toISOString(),
                statistics: this.getDatabaseStatistics()
            };
            const instancesFile = (0, path_1.join)(this.databaseDir, 'anti-pattern-instances.json');
            (0, fs_1.writeFileSync)(instancesFile, JSON.stringify(data, null, 2));
            // Also persist the comprehensive database export
            const databaseExport = this.exportDatabase();
            const exportFile = (0, path_1.join)(this.databaseDir, 'sse-anti-patterns-database.json');
            (0, fs_1.writeFileSync)(exportFile, JSON.stringify(databaseExport, null, 2));
        }
        catch (error) {
            console.error('Failed to persist instances:', error);
        }
    }
}
exports.SSEStreamingAntiPatternsDatabase = SSEStreamingAntiPatternsDatabase;
exports.default = SSEStreamingAntiPatternsDatabase;
//# sourceMappingURL=sse-streaming-anti-patterns-database.js.map