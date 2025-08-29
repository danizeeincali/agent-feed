"use strict";
/**
 * Terminal Anti-Patterns Database
 *
 * Comprehensive database of anti-patterns that occur in terminal pipe failures:
 * - Mock data responses instead of real Claude process output
 * - Hardcoded strings in frontend terminal displays
 * - Broken stdout/stderr event handlers
 * - SSE broadcasting failures
 * - Working directory mismatches
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalAntiPatternsDatabase = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TerminalAntiPatternsDatabase {
    options;
    antiPatterns = new Map();
    patternFrequency = new Map();
    constructor(options = {
        logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
        autoUpdate: true
    }) {
        this.options = options;
        this.initializeAntiPatterns();
    }
    /**
     * Initialize comprehensive anti-pattern database
     */
    initializeAntiPatterns() {
        // Mock Data Anti-Patterns
        this.addAntiPattern({
            id: 'mock-terminal-responses',
            name: 'Mock Terminal Response Injection',
            category: 'mock_data',
            severity: 'high',
            description: 'Frontend displays pre-written mock responses instead of real Claude process output',
            symptoms: [
                'Same response appears for different commands',
                'Responses contain template text like "HTTP/SSE mode active"',
                'Terminal shows success messages when process actually failed',
                'Working directory shown is generic/hardcoded',
                'No real command execution evidence in output'
            ],
            causes: [
                'Frontend uses mock API responses during development',
                'Real process output not properly piped through SSE',
                'Frontend falls back to mock when SSE connection fails',
                'Test fixtures accidentally used in production'
            ],
            detectionRules: {
                patterns: [
                    'HTTP/SSE mode active',
                    'WebSocket eliminated',
                    'mock response',
                    'placeholder data',
                    'Connection active',
                    'polling successful',
                    '[timestamp] HTTP polling active',
                    'no WebSocket needed'
                ],
                contextRules: [
                    'repeated_identical_responses',
                    'no_process_specific_output',
                    'generic_working_directory',
                    'missing_error_responses'
                ],
                evidenceThreshold: 0.75
            },
            tddfactor: 0.9, // High TDD factor - easy to catch with proper tests
            preventionStrategies: [
                'Write integration tests that verify real process output',
                'Use contract testing between backend and frontend',
                'Implement output validation in terminal components',
                'Monitor for mock patterns in production',
                'Set up alerts for repeated identical responses'
            ],
            realWorldExamples: [
                {
                    scenario: 'User runs "pwd" command in Claude terminal',
                    output: '[12:34:56] HTTP polling active - no WebSocket needed!\\r\\n$ ',
                    expectedOutput: '/workspaces/agent-feed/frontend\\r\\n$ ',
                    impact: 'User cannot see real working directory, cannot navigate effectively'
                },
                {
                    scenario: 'User runs "npm install" in production directory',
                    output: 'HTTP/SSE mode active - WebSocket eliminated!',
                    expectedOutput: 'npm WARN package.json: No description\\nnpm WARN package.json: No license field\\nadded 245 packages in 12.3s',
                    impact: 'User thinks command succeeded but packages were not actually installed'
                }
            ],
            neuralFeatures: {
                has_template_text: true,
                response_length_variance: 0.1, // Low variance indicates mock
                contains_timestamp_pattern: true,
                missing_error_cases: true,
                working_directory_generic: true
            }
        });
        // Hardcoded Response Anti-Patterns
        this.addAntiPattern({
            id: 'hardcoded-command-responses',
            name: 'Hardcoded Command Responses',
            category: 'hardcoded_response',
            severity: 'medium',
            description: 'Terminal shows pre-programmed responses for specific commands instead of executing them',
            symptoms: [
                'Commands like "ls" always return same file listing',
                'Directory navigation shows hardcoded paths',
                'Error messages are generic and not command-specific',
                'Command output doesn\'t reflect actual file system state'
            ],
            causes: [
                'Frontend has hardcoded command -> response mapping',
                'Mock terminal session used instead of real process',
                'Broken process execution with fallback responses',
                'Development shortcuts left in production code'
            ],
            detectionRules: {
                patterns: [
                    'total 8\\ndrwxr-xr-x 2 claude claude 4096',
                    'bash: command not found',
                    'System uptime: 2 days, 14 hours, 23 minutes',
                    'Available commands: hello, help, ls, pwd'
                ],
                contextRules: [
                    'identical_ls_output',
                    'generic_error_messages',
                    'static_uptime_values',
                    'command_help_text_static'
                ],
                evidenceThreshold: 0.7
            },
            tddfactor: 0.8,
            preventionStrategies: [
                'Use real shell execution for all commands',
                'Implement command validation tests',
                'Monitor for static response patterns',
                'Use property-based testing for command outputs'
            ],
            realWorldExamples: [
                {
                    scenario: 'User runs "ls" in different directories',
                    output: 'total 8\\ndrwxr-xr-x 2 claude claude 4096 Aug 27 02:00',
                    expectedOutput: 'package.json\\nsrc/\\ntests/\\nREADME.md',
                    impact: 'User cannot see actual directory contents, cannot find files'
                }
            ],
            neuralFeatures: {
                static_file_listings: true,
                generic_timestamps: true,
                repeated_permission_strings: true,
                missing_dynamic_content: true
            }
        });
        // Broken Pipe Anti-Patterns
        this.addAntiPattern({
            id: 'stdout-pipe-disconnection',
            name: 'Stdout Pipe Disconnection',
            category: 'broken_pipe',
            severity: 'critical',
            description: 'Real process stdout/stderr is not properly connected to frontend display',
            symptoms: [
                'Process is running (PID exists) but no output appears',
                'Backend logs show process output but frontend shows nothing',
                'Commands appear to hang with no response',
                'Process continues running but user sees no feedback'
            ],
            causes: [
                'Broken event handlers for process.stdout.on("data")',
                'SSE connection drops after process start',
                'Output buffering prevents real-time display',
                'Process stdio pipes configured incorrectly'
            ],
            detectionRules: {
                patterns: [
                    'process.stdout.on is not properly attached',
                    'SSE connection dropped during output',
                    'Buffer overflow in stdio streams'
                ],
                contextRules: [
                    'process_running_no_output',
                    'backend_logs_show_output',
                    'frontend_terminal_empty',
                    'sse_events_not_sent'
                ],
                evidenceThreshold: 0.9
            },
            tddfactor: 0.7,
            preventionStrategies: [
                'Write integration tests for process output flow',
                'Implement proper error handling for pipe connections',
                'Add monitoring for stdout event handler attachment',
                'Test SSE connection resilience',
                'Use process health checks'
            ],
            realWorldExamples: [
                {
                    scenario: 'Claude process spawns successfully but user sees no output',
                    output: 'Connecting to Claude instance...',
                    expectedOutput: 'Claude Code\\nWorking directory: /workspaces/agent-feed\\n$ ',
                    impact: 'User cannot interact with Claude, appears broken despite working backend'
                }
            ],
            neuralFeatures: {
                process_pid_exists: true,
                no_frontend_output: true,
                backend_output_exists: true,
                sse_connection_broken: true
            }
        });
        // SSE Failure Anti-Patterns
        this.addAntiPattern({
            id: 'sse-broadcast-failure',
            name: 'SSE Broadcasting Failure',
            category: 'sse_failure',
            severity: 'high',
            description: 'SSE events are generated but not properly broadcast to frontend connections',
            symptoms: [
                'Backend generates events but frontend doesn\'t receive them',
                'Intermittent terminal output (some events lost)',
                'Connection appears active but no data flows',
                'Event broadcasting fails silently'
            ],
            causes: [
                'SSE connection list not properly maintained',
                'Connection reference becomes stale',
                'Event serialization errors',
                'Response stream writing failures',
                'CORS or connection management issues'
            ],
            detectionRules: {
                patterns: [
                    'res.write failed',
                    'ECONNRESET',
                    'EPIPE',
                    'connection destroyed',
                    'broadcast failed'
                ],
                contextRules: [
                    'events_generated_not_received',
                    'connection_count_decreases',
                    'write_errors_in_logs',
                    'frontend_missing_events'
                ],
                evidenceThreshold: 0.8
            },
            tddfactor: 0.8,
            preventionStrategies: [
                'Implement connection health monitoring',
                'Add retry logic for failed broadcasts',
                'Use connection heartbeat mechanisms',
                'Monitor event delivery success rates',
                'Implement connection cleanup procedures'
            ],
            realWorldExamples: [
                {
                    scenario: 'User sends command but receives no response',
                    output: '$ help',
                    expectedOutput: '$ help\\nAvailable commands:\\n  echo <text>...\\n$ ',
                    impact: 'Commands appear to be ignored, user thinks terminal is broken'
                }
            ],
            neuralFeatures: {
                connection_errors: true,
                event_generation_success: true,
                event_delivery_failure: true,
                connection_count_inconsistent: true
            }
        });
        // Directory Mismatch Anti-Patterns
        this.addAntiPattern({
            id: 'working-directory-mismatch',
            name: 'Working Directory Mismatch',
            category: 'directory_mismatch',
            severity: 'medium',
            description: 'Frontend displays incorrect working directory compared to actual process location',
            symptoms: [
                'Terminal shows wrong directory path',
                'File operations fail because directory is incorrect',
                'Commands work but show unexpected results',
                'Path navigation appears broken'
            ],
            causes: [
                'Process spawned in wrong directory',
                'Frontend caches old directory information',
                'Directory resolution fails during process creation',
                'Mock directory paths used in frontend'
            ],
            detectionRules: {
                patterns: [
                    '/mock/directory',
                    '/tmp/mock',
                    '/home/user/default',
                    'C:\\\\Users\\\\Default'
                ],
                contextRules: [
                    'directory_not_in_workspaces',
                    'path_contains_mock',
                    'directory_does_not_exist',
                    'permission_denied_errors'
                ],
                evidenceThreshold: 0.6
            },
            tddfactor: 0.6,
            preventionStrategies: [
                'Validate working directory during process creation',
                'Implement directory existence checks',
                'Use absolute paths for process spawning',
                'Add directory validation in frontend',
                'Test directory navigation workflows'
            ],
            realWorldExamples: [
                {
                    scenario: 'User expects to be in frontend directory but shows root',
                    output: 'Working directory: /',
                    expectedOutput: 'Working directory: /workspaces/agent-feed/frontend',
                    impact: 'User cannot find project files, commands operate on wrong directory'
                }
            ],
            neuralFeatures: {
                incorrect_base_path: true,
                directory_not_exists: false,
                path_contains_mock: true,
                permission_issues: false
            }
        });
        console.log(`🗃️ NLD Anti-Patterns Database initialized with ${this.antiPatterns.size} patterns`);
    }
    /**
     * Add an anti-pattern to the database
     */
    addAntiPattern(pattern) {
        this.antiPatterns.set(pattern.id, pattern);
        this.patternFrequency.set(pattern.id, 0);
    }
    /**
     * Detect anti-patterns in given output
     */
    detectAntiPatterns(output, context) {
        const detectedPatterns = [];
        for (const pattern of this.antiPatterns.values()) {
            const detection = this.evaluatePattern(pattern, output, context);
            if (detection.confidence >= pattern.detectionRules.evidenceThreshold) {
                detectedPatterns.push({
                    pattern,
                    confidence: detection.confidence,
                    matchedRules: detection.matchedRules
                });
                // Update frequency
                const currentFreq = this.patternFrequency.get(pattern.id) || 0;
                this.patternFrequency.set(pattern.id, currentFreq + 1);
            }
        }
        return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Evaluate a specific pattern against output and context
     */
    evaluatePattern(pattern, output, context) {
        let confidence = 0;
        const matchedRules = [];
        // Check pattern matches
        const patternMatches = pattern.detectionRules.patterns.filter(p => output.toLowerCase().includes(p.toLowerCase()));
        if (patternMatches.length > 0) {
            confidence += (patternMatches.length / pattern.detectionRules.patterns.length) * 0.6;
            matchedRules.push(...patternMatches.map(p => `pattern:${p}`));
        }
        // Check context rules if provided
        if (context && pattern.detectionRules.contextRules) {
            for (const contextRule of pattern.detectionRules.contextRules) {
                if (this.evaluateContextRule(contextRule, output, context)) {
                    confidence += 0.1;
                    matchedRules.push(`context:${contextRule}`);
                }
            }
        }
        // Pattern-specific confidence boosts
        confidence += this.calculatePatternSpecificConfidence(pattern, output, context);
        return {
            confidence: Math.min(confidence, 1.0),
            matchedRules
        };
    }
    /**
     * Evaluate context rules
     */
    evaluateContextRule(rule, output, context) {
        switch (rule) {
            case 'repeated_identical_responses':
                return context.responseHistory &&
                    context.responseHistory.length > 1 &&
                    context.responseHistory.every((r) => r === context.responseHistory[0]);
            case 'no_process_specific_output':
                return !this.containsProcessSpecificOutput(output);
            case 'generic_working_directory':
                return context.workingDirectory &&
                    (context.workingDirectory === '/' ||
                        context.workingDirectory.includes('mock') ||
                        context.workingDirectory === '/tmp');
            case 'missing_error_responses':
                return context.commandHistory &&
                    context.commandHistory.some((cmd) => cmd.includes('invalid')) &&
                    !output.includes('command not found') &&
                    !output.includes('error');
            case 'process_running_no_output':
                return context.processRunning && (!output || output.trim() === '');
            case 'identical_ls_output':
                return context.lsCommandCount > 1 &&
                    output.includes('total 8') &&
                    output.includes('drwxr-xr-x 2 claude claude 4096');
            default:
                return false;
        }
    }
    /**
     * Calculate pattern-specific confidence boosts
     */
    calculatePatternSpecificConfidence(pattern, output, context) {
        let boost = 0;
        switch (pattern.id) {
            case 'mock-terminal-responses':
                if (output.includes('HTTP/SSE') && output.includes('WebSocket'))
                    boost += 0.2;
                if (output.includes('[timestamp]') || /\[\d{2}:\d{2}:\d{2}\]/.test(output))
                    boost += 0.1;
                break;
            case 'hardcoded-command-responses':
                if (output.includes('total 8') && output.includes('claude claude'))
                    boost += 0.15;
                if (output.includes('System uptime:') && output.includes('days'))
                    boost += 0.1;
                break;
            case 'stdout-pipe-disconnection':
                if (context?.processRunning && (!output || output.trim().length < 5))
                    boost += 0.3;
                break;
            case 'sse-broadcast-failure':
                if (context?.eventsGenerated && context?.eventsReceived < context.eventsGenerated * 0.5)
                    boost += 0.2;
                break;
            case 'working-directory-mismatch':
                if (context?.workingDirectory && !context.workingDirectory.startsWith('/workspaces/agent-feed'))
                    boost += 0.2;
                break;
        }
        return boost;
    }
    /**
     * Check if output contains process-specific information
     */
    containsProcessSpecificOutput(output) {
        const processIndicators = [
            'PID', 'Error:', 'Warning:', 'Exception:',
            '/workspaces/', 'package.json', 'node_modules',
            'npm install', 'git status', 'Command not found',
            'Permission denied', 'File not found'
        ];
        return processIndicators.some(indicator => output.includes(indicator));
    }
    /**
     * Get anti-pattern by ID
     */
    getAntiPattern(id) {
        return this.antiPatterns.get(id);
    }
    /**
     * Get all anti-patterns by category
     */
    getAntiPatternsByCategory(category) {
        return Array.from(this.antiPatterns.values()).filter(p => p.category === category);
    }
    /**
     * Get anti-pattern statistics
     */
    getStatistics() {
        const patterns = Array.from(this.antiPatterns.values());
        const byCategory = patterns.reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        }, {});
        const bySeverity = patterns.reduce((acc, p) => {
            acc[p.severity] = (acc[p.severity] || 0) + 1;
            return acc;
        }, {});
        const mostFrequent = Array.from(this.patternFrequency.entries())
            .map(([id, frequency]) => ({
            id,
            frequency,
            pattern: this.antiPatterns.get(id)
        }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10);
        const avgTDDFactor = patterns.reduce((sum, p) => sum + p.tddfactor, 0) / patterns.length;
        return {
            totalPatterns: patterns.length,
            byCategory,
            bySeverity,
            mostFrequent,
            averageTDDFactor
        };
    }
    /**
     * Export patterns for neural training
     */
    exportForNeuralTraining() {
        const trainingData = Array.from(this.antiPatterns.values()).map(pattern => ({
            pattern_id: pattern.id,
            category: pattern.category,
            severity: pattern.severity,
            tdd_factor: pattern.tddfactor,
            detection_patterns: pattern.detectionRules.patterns,
            neural_features: pattern.neuralFeatures,
            frequency: this.patternFrequency.get(pattern.id) || 0,
            prevention_strategies: pattern.preventionStrategies
        }));
        const exportPath = path.join(this.options.logDirectory, 'anti-patterns-neural-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(trainingData, null, 2));
        return exportPath;
    }
    /**
     * Save database to file
     */
    saveDatabase() {
        const dbPath = path.join(this.options.logDirectory, 'anti-patterns-database.json');
        const dbData = {
            patterns: Object.fromEntries(this.antiPatterns),
            frequency: Object.fromEntries(this.patternFrequency),
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
        console.log(`💾 Anti-patterns database saved to ${dbPath}`);
    }
}
exports.TerminalAntiPatternsDatabase = TerminalAntiPatternsDatabase;
//# sourceMappingURL=terminal-anti-patterns-database.js.map