"use strict";
/**
 * NLD Pattern Detection: Instance ID Undefined Bug
 *
 * Failure Analysis: Backend creates instance with ID 'claude-2643',
 * frontend receives it, but sends 'undefined' when connecting terminal
 *
 * Pattern Classification: State Management Race Condition
 * Domain: React Frontend - Terminal Connection
 * TDD Factor: 0.2 (Low TDD coverage contributed to this failure)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceIdUndefinedPattern = void 0;
class InstanceIdUndefinedPattern {
    patterns = [];
    /**
     * Core Issue Identified:
     *
     * Line 87 in useHTTPSSE.ts:
     * endpoint = `/api/claude/instances/${connectionState.current.instanceId}/terminal/input`;
     *
     * The connectionState.current.instanceId is null/undefined because:
     * 1. connectSSE() is called with instance ID
     * 2. But connectionState is only updated in onopen callback
     * 3. emit() happens before onopen completes
     *
     * This is a TIMING RACE CONDITION
     */
    capturePattern(data) {
        this.patterns.push({
            ...data,
            triggerCondition: 'Backend creates instance, frontend receives ID, but terminal connection sends undefined'
        });
    }
    /**
     * Critical State Flow Analysis:
     *
     * ClaudeInstanceManager.tsx Flow:
     * 1. Line 250: setSelectedInstance(data.instanceId) ✅ WORKS
     * 2. Line 257: connectSSE(data.instanceId) ✅ CORRECT ID PASSED
     * 3. Line 290: instanceId: selectedInstance ✅ CORRECT ID USED
     *
     * useHTTPSSE.ts Flow:
     * 1. Line 87: connectionState.current.instanceId ❌ NULL/UNDEFINED
     * 2. Line 260-264: connectionState only updated in onopen ❌ TOO LATE
     * 3. Line 80-88: emit() uses connectionState.current.instanceId ❌ RACE CONDITION
     */
    getAntiPatterns() {
        return {
            raceCondition: {
                description: "Using async state before it's initialized",
                location: "useHTTPSSE.ts:87",
                problem: "connectionState.current.instanceId accessed before onopen sets it",
                frequency: "High - occurs on every new connection"
            },
            stateAsyncMismatch: {
                description: "Relying on callback state in synchronous context",
                location: "useHTTPSSE.ts:80-88",
                problem: "emit() called immediately but state updated in async onopen",
                frequency: "Critical - breaks all terminal input"
            },
            missingFallback: {
                description: "No fallback for undefined connection state",
                location: "useHTTPSSE.ts:87",
                problem: "No validation or fallback when instanceId is null",
                frequency: "Every connection attempt"
            }
        };
    }
    /**
     * Neural Pattern Classification:
     * Type: TIMING_RACE_CONDITION
     * Severity: CRITICAL
     * Domain: FRONTEND_STATE_MANAGEMENT
     * TDD_GAP: Missing unit tests for async state transitions
     */
    generateTDDPrevention() {
        return {
            testPatterns: [
                {
                    name: "should_pass_instance_id_directly_to_emit",
                    test: `
          test('emit should use passed instanceId not connectionState', () => {
            const instanceId = 'claude-123';
            const mockEmit = jest.fn();
            
            // Call emit with explicit instanceId
            emit('terminal:input', { input: 'test', instanceId });
            
            expect(mockEmit).toHaveBeenCalledWith(
              expect.stringContaining(instanceId)
            );
          });
          `
                },
                {
                    name: "should_handle_undefined_instanceId_gracefully",
                    test: `
          test('emit should reject undefined instanceId', () => {
            expect(() => {
              emit('terminal:input', { input: 'test', instanceId: undefined });
            }).toThrow('Instance ID required for terminal input');
          });
          `
                },
                {
                    name: "should_validate_connection_state_before_emit",
                    test: `
          test('connection state should be validated before use', () => {
            const result = emitMessage('terminal:input', { 
              input: 'test', 
              instanceId: undefined 
            });
            
            expect(result).rejects.toThrow('Invalid instance ID');
          });
          `
                }
            ],
            fixes: [
                {
                    location: "useHTTPSSE.ts:87",
                    fix: "Use passed instanceId instead of connectionState",
                    code: `
          // BEFORE (BROKEN):
          endpoint = \`/api/claude/instances/\${connectionState.current.instanceId}/terminal/input\`;
          
          // AFTER (FIXED):  
          endpoint = \`/api/claude/instances/\${data.instanceId}/terminal/input\`;
          `
                },
                {
                    location: "useHTTPSSE.ts:80",
                    fix: "Add instanceId validation",
                    code: `
          const emitMessage = useCallback(async (event: string, data?: any) => {
            // Validate instanceId for terminal operations
            if (event === 'terminal:input' && !data?.instanceId) {
              throw new Error('Instance ID required for terminal input');
            }
            
            try {
              // ... rest of function
          `
                }
            ]
        };
    }
    calculateEffectivenessScore() {
        // Formula: (User Success Rate / Claude Confidence) * TDD Factor
        const userSuccessRate = 0.0; // 0% - terminal input completely broken
        const claudeConfidence = 0.9; // 90% - Claude thought this would work
        const tddFactor = 0.2; // 20% - minimal TDD coverage
        return (userSuccessRate / claudeConfidence) * tddFactor;
    }
    getFailureMetrics() {
        return {
            effectivenessScore: this.calculateEffectivenessScore(),
            failureType: "STATE_RACE_CONDITION",
            impactLevel: "CRITICAL",
            userExperience: "COMPLETELY_BROKEN",
            tddscore: "INSUFFICIENT",
            preventability: "HIGH", // This was easily preventable with proper TDD
            recurrenceRisk: "HIGH" // Will happen again without systematic fixes
        };
    }
}
exports.InstanceIdUndefinedPattern = InstanceIdUndefinedPattern;
/**
 * NLD Training Data Export
 *
 * This pattern represents a classic example of where TDD would have prevented
 * a critical production failure. The issue is:
 *
 * 1. Asynchronous state management without proper validation
 * 2. Race conditions between UI actions and connection state
 * 3. Missing error handling for undefined values
 * 4. No unit tests covering the failure path
 *
 * Key Learning: Always validate critical IDs before API calls
 * Key Learning: Use direct parameter passing over shared state for critical operations
 * Key Learning: Add comprehensive error handling for undefined values
 */ 
//# sourceMappingURL=instance-id-undefined-pattern.js.map