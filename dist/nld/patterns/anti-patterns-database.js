"use strict";
/**
 * Anti-Patterns Database for NLD System
 *
 * Comprehensive database of failure patterns that cause Claude to claim success
 * while users experience actual failure. Each pattern includes prevention strategies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.antiPatternsDatabase = exports.AntiPatternsDatabase = void 0;
class AntiPatternsDatabase {
    patterns = new Map();
    constructor() {
        this.initializeKnownPatterns();
    }
    /**
     * Initialize database with known anti-patterns
     */
    initializeKnownPatterns() {
        // CRITICAL: Instance ID Undefined Pattern
        this.addPattern({
            id: 'INSTANCE_ID_UNDEFINED',
            name: 'Async State Access Race Condition',
            description: 'Accessing connectionState.instanceId before async onopen callback sets it',
            category: 'TIMING',
            severity: 'CRITICAL',
            frequency: 'VERY_COMMON',
            technicalDetails: {
                location: 'useHTTPSSE.ts:87',
                rootCause: 'Synchronous emit() called before asynchronous onopen() completes',
                triggerConditions: [
                    'connectSSE() called with instanceId',
                    'emit() called immediately after',
                    'onopen callback not yet executed',
                    'connectionState.current.instanceId still null'
                ],
                affectedComponents: [
                    'useHTTPSSE hook',
                    'ClaudeInstanceManager terminal connection',
                    'Backend API endpoint /api/claude/instances/{id}/terminal/input'
                ]
            },
            userImpact: {
                symptom: 'Terminal input completely broken - all commands send to /undefined/ endpoint',
                userExperience: 'Cannot send any commands to Claude instances',
                businessImpact: 'CRITICAL'
            },
            detection: {
                automaticTriggers: [
                    'undefined in user input',
                    'terminal not working',
                    '404 error on terminal endpoint'
                ],
                manualIndicators: [
                    'Backend logs show /api/claude/instances/undefined/terminal/input requests',
                    'Network tab shows undefined in URL',
                    'Console errors about undefined instanceId'
                ],
                logPatterns: [
                    'POST /api/claude/instances/undefined/terminal/input',
                    'connectionState.current.instanceId is undefined',
                    'Failed to emit terminal:input'
                ]
            },
            prevention: {
                tddPatterns: [
                    'Unit test: emit should use passed instanceId parameter',
                    'Unit test: connectionState should be validated before use',
                    'Unit test: undefined instanceId should throw error',
                    'Integration test: full creation -> connection -> input flow'
                ],
                codeReviews: [
                    'Check all async state access patterns',
                    'Verify parameter passing vs shared state',
                    'Review race condition possibilities'
                ],
                typeChecks: [
                    'instanceId: string (not string | undefined)',
                    'Strict null checks enabled',
                    'Required parameter validation'
                ],
                runtime_validation: [
                    'if (!instanceId) throw new Error("Instance ID required")',
                    'Assert instanceId before API calls',
                    'Validate connectionState before use'
                ]
            },
            occurrenceCount: 1,
            lastSeen: new Date().toISOString(),
            examples: [
                'endpoint = `/api/claude/instances/${connectionState.current.instanceId}/terminal/input`; // undefined!',
                'connectSSE(instanceId) -> emit() called -> onopen() not yet called -> instanceId undefined'
            ]
        });
        // STATE MANAGEMENT: Stale Closure Pattern  
        this.addPattern({
            id: 'STALE_CLOSURE_STATE',
            name: 'Stale Closure State Access',
            description: 'React hooks accessing stale state values in closures',
            category: 'STATE_MANAGEMENT',
            severity: 'HIGH',
            frequency: 'COMMON',
            technicalDetails: {
                location: 'React useEffect, useCallback dependencies',
                rootCause: 'Missing dependencies in dependency array causes stale closures',
                triggerConditions: [
                    'useEffect with missing dependencies',
                    'useCallback not updated when state changes',
                    'Event handlers with stale state references'
                ],
                affectedComponents: [
                    'Event handlers',
                    'Async operations',
                    'Timer callbacks'
                ]
            },
            userImpact: {
                symptom: 'Actions work on old data or don\'t reflect current state',
                userExperience: 'UI appears buggy, actions have no effect or wrong effect',
                businessImpact: 'MEDIUM'
            },
            detection: {
                automaticTriggers: [
                    'state not updating as expected',
                    'actions using old values'
                ],
                manualIndicators: [
                    'Console.log shows old values in handlers',
                    'React DevTools shows correct state but handlers use old values'
                ],
                logPatterns: [
                    'Expected X but got Y',
                    'State mismatch in handler'
                ]
            },
            prevention: {
                tddPatterns: [
                    'Test state updates propagate to handlers',
                    'Test async operations use current state',
                    'Test closure captures current values'
                ],
                codeReviews: [
                    'Check useEffect dependency arrays',
                    'Review useCallback dependencies',
                    'Verify async handlers access current state'
                ],
                typeChecks: [
                    'ESLint exhaustive-deps rule',
                    'Strict mode rendering'
                ],
                runtime_validation: [
                    'Log state values at handler entry',
                    'Assert state consistency'
                ]
            },
            occurrenceCount: 0,
            lastSeen: '',
            examples: [
                'useEffect(() => { handler(staleValue); }, []); // Missing dependency',
                'const callback = useCallback(() => { use(oldState); }, []); // Stale closure'
            ]
        });
        // TYPE SAFETY: Undefined Parameter Propagation
        this.addPattern({
            id: 'UNDEFINED_PARAM_PROPAGATION',
            name: 'Undefined Parameter Propagation',
            description: 'Undefined values passed through function chains without validation',
            category: 'TYPE_SAFETY',
            severity: 'HIGH',
            frequency: 'COMMON',
            technicalDetails: {
                location: 'Function parameter passing chains',
                rootCause: 'No validation at function boundaries, TypeScript allows undefined',
                triggerConditions: [
                    'Optional parameters marked as T | undefined',
                    'No runtime validation of required parameters',
                    'Null/undefined values from external APIs'
                ],
                affectedComponents: [
                    'API parameter construction',
                    'Function call chains',
                    'Database queries'
                ]
            },
            userImpact: {
                symptom: 'Functions fail with undefined parameter errors',
                userExperience: 'Cryptic errors, features completely broken',
                businessImpact: 'HIGH'
            },
            detection: {
                automaticTriggers: [
                    'undefined in error messages',
                    'null reference errors'
                ],
                manualIndicators: [
                    'Network requests with undefined in URL/body',
                    'Console errors about undefined properties'
                ],
                logPatterns: [
                    'TypeError: Cannot read property of undefined',
                    'API call failed: undefined parameter'
                ]
            },
            prevention: {
                tddPatterns: [
                    'Test all function inputs with null/undefined',
                    'Test parameter validation throws errors',
                    'Test API calls reject undefined parameters'
                ],
                codeReviews: [
                    'Check all function signatures for required vs optional',
                    'Review parameter validation at boundaries',
                    'Verify error handling for undefined inputs'
                ],
                typeChecks: [
                    'Enable strict null checks',
                    'Use NonNullable<T> for required parameters',
                    'Add runtime type guards'
                ],
                runtime_validation: [
                    'if (param === undefined) throw new Error("Required parameter")',
                    'Use assertion functions for critical parameters',
                    'Validate at API boundaries'
                ]
            },
            occurrenceCount: 0,
            lastSeen: '',
            examples: [
                'function apiCall(id: string | undefined) { return `/api/${id}`; } // No validation!',
                'emit("event", { instanceId: undefined }); // Propagates undefined'
            ]
        });
    }
    /**
     * Add a new pattern to the database
     */
    addPattern(pattern) {
        this.patterns.set(pattern.id, pattern);
    }
    /**
     * Record an occurrence of a pattern
     */
    recordOccurrence(patternId, details) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
            pattern.occurrenceCount++;
            pattern.lastSeen = new Date().toISOString();
            // Update frequency based on occurrences
            if (pattern.occurrenceCount > 10) {
                pattern.frequency = 'VERY_COMMON';
            }
            else if (pattern.occurrenceCount > 5) {
                pattern.frequency = 'COMMON';
            }
            else if (pattern.occurrenceCount > 2) {
                pattern.frequency = 'OCCASIONAL';
            }
        }
    }
    /**
     * Get pattern by ID
     */
    getPattern(id) {
        return this.patterns.get(id);
    }
    /**
     * Get all patterns by category
     */
    getPatternsByCategory(category) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.category === category);
    }
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.severity === severity)
            .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    }
    /**
     * Get most common patterns
     */
    getMostCommonPatterns(limit = 10) {
        return Array.from(this.patterns.values())
            .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
            .slice(0, limit);
    }
    /**
     * Search patterns by description or technical details
     */
    searchPatterns(query) {
        const lowercaseQuery = query.toLowerCase();
        return Array.from(this.patterns.values()).filter(pattern => pattern.name.toLowerCase().includes(lowercaseQuery) ||
            pattern.description.toLowerCase().includes(lowercaseQuery) ||
            pattern.technicalDetails.rootCause.toLowerCase().includes(lowercaseQuery) ||
            pattern.userImpact.symptom.toLowerCase().includes(lowercaseQuery));
    }
    /**
     * Generate prevention report for a specific failure
     */
    generatePreventionReport(failureDescription) {
        const matchingPatterns = this.searchPatterns(failureDescription);
        if (matchingPatterns.length === 0) {
            return { message: 'No matching patterns found', patterns: [] };
        }
        return {
            matchedPatterns: matchingPatterns.map(pattern => ({
                id: pattern.id,
                name: pattern.name,
                severity: pattern.severity,
                prevention: pattern.prevention
            })),
            recommendedActions: this.generateRecommendedActions(matchingPatterns),
            tddGaps: this.identifyTDDGaps(matchingPatterns)
        };
    }
    /**
     * Generate recommended actions based on patterns
     */
    generateRecommendedActions(patterns) {
        const actions = new Set();
        patterns.forEach(pattern => {
            pattern.prevention.tddPatterns.forEach(action => actions.add(action));
            pattern.prevention.runtime_validation.forEach(action => actions.add(action));
            pattern.prevention.typeChecks.forEach(action => actions.add(action));
        });
        return Array.from(actions);
    }
    /**
     * Identify TDD gaps from patterns
     */
    identifyTDDGaps(patterns) {
        const gaps = {
            missingUnitTests: new Set(),
            missingIntegrationTests: new Set(),
            missingValidationTests: new Set()
        };
        patterns.forEach(pattern => {
            pattern.prevention.tddPatterns.forEach(test => {
                if (test.includes('Unit test')) {
                    gaps.missingUnitTests.add(test);
                }
                else if (test.includes('Integration test')) {
                    gaps.missingIntegrationTests.add(test);
                }
                else if (test.includes('validation')) {
                    gaps.missingValidationTests.add(test);
                }
            });
        });
        return {
            missingUnitTests: Array.from(gaps.missingUnitTests),
            missingIntegrationTests: Array.from(gaps.missingIntegrationTests),
            missingValidationTests: Array.from(gaps.missingValidationTests)
        };
    }
    /**
     * Export database for analysis
     */
    exportDatabase() {
        return {
            patterns: Array.from(this.patterns.values()),
            statistics: {
                totalPatterns: this.patterns.size,
                criticalPatterns: this.getPatternsBySeverity('CRITICAL').length,
                commonPatterns: Array.from(this.patterns.values())
                    .filter(p => p.frequency === 'COMMON' || p.frequency === 'VERY_COMMON').length,
                totalOccurrences: Array.from(this.patterns.values())
                    .reduce((sum, p) => sum + p.occurrenceCount, 0)
            }
        };
    }
}
exports.AntiPatternsDatabase = AntiPatternsDatabase;
// Global instance
exports.antiPatternsDatabase = new AntiPatternsDatabase();
//# sourceMappingURL=anti-patterns-database.js.map