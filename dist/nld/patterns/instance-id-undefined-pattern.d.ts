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
export interface InstanceIdPatternData {
    triggerCondition: string;
    creationFlow: {
        backendResponse: any;
        frontendReceived: any;
        selectedInstanceState: any;
        terminalConnectionPayload: any;
    };
    stateTransitions: Array<{
        timestamp: string;
        action: string;
        selectedInstance: string | null;
        actualInstanceId?: string;
    }>;
    failurePoint: {
        location: string;
        expected: string;
        actual: string;
    };
}
export declare class InstanceIdUndefinedPattern {
    private patterns;
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
    capturePattern(data: InstanceIdPatternData): void;
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
    getAntiPatterns(): {
        raceCondition: {
            description: string;
            location: string;
            problem: string;
            frequency: string;
        };
        stateAsyncMismatch: {
            description: string;
            location: string;
            problem: string;
            frequency: string;
        };
        missingFallback: {
            description: string;
            location: string;
            problem: string;
            frequency: string;
        };
    };
    /**
     * Neural Pattern Classification:
     * Type: TIMING_RACE_CONDITION
     * Severity: CRITICAL
     * Domain: FRONTEND_STATE_MANAGEMENT
     * TDD_GAP: Missing unit tests for async state transitions
     */
    generateTDDPrevention(): {
        testPatterns: {
            name: string;
            test: string;
        }[];
        fixes: {
            location: string;
            fix: string;
            code: string;
        }[];
    };
    calculateEffectivenessScore(): number;
    getFailureMetrics(): {
        effectivenessScore: number;
        failureType: string;
        impactLevel: string;
        userExperience: string;
        tddscore: string;
        preventability: string;
        recurrenceRisk: string;
    };
}
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
//# sourceMappingURL=instance-id-undefined-pattern.d.ts.map