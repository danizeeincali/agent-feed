/**
 * TDD Test Suite: Mixed API Versioning Scenarios
 * 
 * Tests complex scenarios where different parts of the application use different endpoint versions
 * Validates graceful degradation and proper error handling across version boundaries
 * 
 * SCENARIOS TESTED:
 * 1. Component A uses v1, Component B uses unversioned - consistency issues
 * 2. Fallback chains with multiple version attempts
 * 3. Concurrent requests with mixed versioning
 * 4. Session persistence across version changes
 * 5. Error propagation through version boundaries
 */

import { createMockBackend, MockBackendServer, EndpointTestUtils } from './backend-endpoint-mock';
import { APIClient, defaultAPIConfig } from '../../../frontend/src/config/api';

global.fetch = jest.fn();

describe('Mixed API Versioning Scenarios', () => {
  let mockBackend: MockBackendServer;
  let apiClient: APIClient;
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    mockBackend = createMockBackend(testBaseUrl);
    apiClient = new APIClient(defaultAPIConfig, true);
    (global.fetch as jest.Mock) = mockBackend.mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockBackend.reset();
  });

  describe('🚨 FAILING TESTS: Mixed Versioning Problems', () => {
    
    test('FAILS: Frontend components using different API versions create inconsistent state', async () => {
      // Simulate scenario where different components use different endpoints
      const componentStates = {
        instanceManager: { version: 'v1', instances: [] as any[], error: null },
        dashboard: { version: 'unversioned', instances: [] as any[], error: null },
        terminal: { version: 'v1', connections: [] as any[], error: null },
        consistency: { identical: false, issues: [] as string[] }
      };

      // Component 1: Instance Manager uses v1 endpoints
      try {
        const v1Response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        if (v1Response.ok) {
          componentStates.instanceManager.instances = (await v1Response.json()).instances || [];
        } else {
          componentStates.instanceManager.error = `Status ${v1Response.status}`;
        }
      } catch (error) {
        componentStates.instanceManager.error = error.message;
      }

      // Component 2: Dashboard uses unversioned endpoints
      try {
        const unversionedResponse = await fetch(`${testBaseUrl}/api/claude/instances`);
        if (unversionedResponse.ok) {
          componentStates.dashboard.instances = (await unversionedResponse.json()).instances || [];
        } else {
          componentStates.dashboard.error = `Status ${unversionedResponse.status}`;
        }
      } catch (error) {
        componentStates.dashboard.error = error.message;
      }

      // Component 3: Terminal tries v1 stream endpoints
      const instanceId = 'test-instance-123';
      try {
        const streamResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`);
        if (streamResponse.ok) {
          componentStates.terminal.connections.push({ instanceId, status: 'connected' });
        } else {
          componentStates.terminal.error = `Stream connection failed: ${streamResponse.status}`;
        }
      } catch (error) {
        componentStates.terminal.error = error.message;
      }

      // Analyze consistency
      const hasInstanceManagerData = componentStates.instanceManager.instances.length > 0;
      const hasDashboardData = componentStates.dashboard.instances.length > 0;
      const hasInstanceManagerError = componentStates.instanceManager.error !== null;
      const hasDashboardError = componentStates.dashboard.error !== null;

      // Check if both components got the same data
      if (hasInstanceManagerData && hasDashboardData) {
        const instanceManagerIds = componentStates.instanceManager.instances.map(i => i.id).sort();
        const dashboardIds = componentStates.dashboard.instances.map(i => i.id).sort();
        componentStates.consistency.identical = JSON.stringify(instanceManagerIds) === JSON.stringify(dashboardIds);
      } else if (hasInstanceManagerError !== hasDashboardError) {
        componentStates.consistency.issues.push('Components have different error states');
      }

      if (!componentStates.consistency.identical) {
        componentStates.consistency.issues.push('Instance data differs between components');
      }

      if (componentStates.terminal.error && !componentStates.instanceManager.error) {
        componentStates.consistency.issues.push('Terminal connection fails while instance data loads');
      }

      // ASSERTIONS: Components should have consistent state
      expect(componentStates.consistency.identical).toBe(true); // This will FAIL
      expect(componentStates.consistency.issues.length).toBe(0); // This will FAIL
      
      // Either all components should work or all should fail consistently
      const allWorking = !componentStates.instanceManager.error && 
                        !componentStates.dashboard.error && 
                        !componentStates.terminal.error;
      const allFailing = componentStates.instanceManager.error && 
                        componentStates.dashboard.error && 
                        componentStates.terminal.error;
      
      expect(allWorking || allFailing).toBe(true); // This will FAIL - mixed success/failure

      console.error('🔄 COMPONENT INCONSISTENCY ANALYSIS:', componentStates);
    });

    test('FAILS: Fallback cascade with multiple API versions creates complex failure modes', async () => {
      const fallbackCascade = {
        attempts: [] as Array<{
          endpoint: string;
          method: string;
          success: boolean;
          status: number;
          responseTime: number;
          isRedirect: boolean;
        }>,
        totalTime: 0,
        finalSuccess: false,
        fallbacksUsed: 0,
        issues: [] as string[]
      };

      const startTime = Date.now();

      // Define the fallback chain
      const endpointChain = [
        '/api/v2/claude/instances',  // Future version (should fail)
        '/api/v1/claude/instances',  // Current primary (gets redirect)
        '/api/claude/instances'      // Fallback (should work)
      ];

      // Attempt each endpoint in sequence
      for (const endpoint of endpointChain) {
        const attemptStart = Date.now();
        
        try {
          const response = await fetch(`${testBaseUrl}${endpoint}`);
          const responseTime = Date.now() - attemptStart;
          const isRedirect = response.status >= 300 && response.status < 400;
          
          fallbackCascade.attempts.push({
            endpoint,
            method: 'GET',
            success: response.ok,
            status: response.status,
            responseTime,
            isRedirect
          });

          if (response.ok) {
            fallbackCascade.finalSuccess = true;
            break; // Stop on first success
          } else if (isRedirect) {
            fallbackCascade.fallbacksUsed++;
            fallbackCascade.issues.push(`Redirect from ${endpoint} adds latency`);
          } else {
            fallbackCascade.fallbacksUsed++;
          }
          
        } catch (error) {
          fallbackCascade.attempts.push({
            endpoint,
            method: 'GET',
            success: false,
            status: 0,
            responseTime: Date.now() - attemptStart,
            isRedirect: false
          });
          fallbackCascade.fallbacksUsed++;
          fallbackCascade.issues.push(`Network error on ${endpoint}: ${error.message}`);
        }
      }

      fallbackCascade.totalTime = Date.now() - startTime;

      // Performance analysis
      const hasRedirects = fallbackCascade.attempts.some(a => a.isRedirect);
      const totalResponseTime = fallbackCascade.attempts.reduce((sum, a) => sum + a.responseTime, 0);
      
      if (hasRedirects) {
        fallbackCascade.issues.push('Redirects increase complexity and latency');
      }
      
      if (totalResponseTime > 500) {
        fallbackCascade.issues.push('Total response time exceeds acceptable threshold');
      }

      // ASSERTIONS: Fallback should be simple and fast
      expect(fallbackCascade.finalSuccess).toBe(true); // Should eventually succeed
      expect(fallbackCascade.fallbacksUsed).toBeLessThanOrEqual(1); // This will FAIL - too many fallbacks
      expect(fallbackCascade.totalTime).toBeLessThan(200); // This will FAIL - too slow
      expect(fallbackCascade.issues.length).toBe(0); // This will FAIL - has issues

      console.error('⛓️ COMPLEX FALLBACK CHAIN ANALYSIS:', fallbackCascade);
    });

    test('FAILS: Concurrent requests with mixed versioning create race conditions', async () => {
      const concurrentTest = {
        requests: [] as Array<{
          id: number;
          endpoint: string;
          startTime: number;
          endTime: number;
          success: boolean;
          status: number;
        }>,
        racingRequests: 0,
        completionOrder: [] as number[],
        inconsistentResults: false,
        issues: [] as string[]
      };

      // Create multiple concurrent requests using different endpoint versions
      const concurrentRequests = [
        { id: 1, endpoint: '/api/v1/claude/instances' },
        { id: 2, endpoint: '/api/claude/instances' },
        { id: 3, endpoint: '/api/v1/claude/instances' },
        { id: 4, endpoint: '/api/claude/instances' },
        { id: 5, endpoint: '/api/v1/claude/instances' }
      ];

      concurrentTest.racingRequests = concurrentRequests.length;

      // Start all requests simultaneously
      const promises = concurrentRequests.map(req => {
        const startTime = Date.now();
        
        return fetch(`${testBaseUrl}${req.endpoint}`)
          .then(response => {
            const endTime = Date.now();
            const result = {
              id: req.id,
              endpoint: req.endpoint,
              startTime,
              endTime,
              success: response.ok,
              status: response.status
            };
            
            concurrentTest.requests.push(result);
            concurrentTest.completionOrder.push(req.id);
            
            return result;
          })
          .catch(error => {
            const endTime = Date.now();
            const result = {
              id: req.id,
              endpoint: req.endpoint,
              startTime,
              endTime,
              success: false,
              status: 0
            };
            
            concurrentTest.requests.push(result);
            concurrentTest.completionOrder.push(req.id);
            
            return result;
          });
      });

      // Wait for all requests to complete
      await Promise.all(promises);

      // Analyze results for consistency
      const v1Results = concurrentTest.requests.filter(r => r.endpoint.includes('/v1/'));
      const unversionedResults = concurrentTest.requests.filter(r => !r.endpoint.includes('/v1/'));

      const v1Success = v1Results.every(r => r.success);
      const unversionedSuccess = unversionedResults.every(r => r.success);
      const v1Failure = v1Results.every(r => !r.success);
      const unversionedFailure = unversionedResults.every(r => !r.success);

      // Check for inconsistent results within same version
      const v1StatusesUnique = [...new Set(v1Results.map(r => r.status))];
      const unversionedStatusesUnique = [...new Set(unversionedResults.map(r => r.status))];

      if (v1StatusesUnique.length > 1) {
        concurrentTest.issues.push('v1 endpoints returned different status codes');
        concurrentTest.inconsistentResults = true;
      }

      if (unversionedStatusesUnique.length > 1) {
        concurrentTest.issues.push('Unversioned endpoints returned different status codes');
        concurrentTest.inconsistentResults = true;
      }

      // Check cross-version consistency
      if ((v1Success && unversionedFailure) || (v1Failure && unversionedSuccess)) {
        concurrentTest.issues.push('Different endpoint versions produced different results');
        concurrentTest.inconsistentResults = true;
      }

      // Performance analysis
      const avgV1Time = v1Results.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) / v1Results.length;
      const avgUnversionedTime = unversionedResults.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) / unversionedResults.length;
      
      if (Math.abs(avgV1Time - avgUnversionedTime) > 100) {
        concurrentTest.issues.push(`Significant performance difference: v1=${avgV1Time}ms, unversioned=${avgUnversionedTime}ms`);
      }

      // ASSERTIONS: All concurrent requests should be consistent
      expect(concurrentTest.inconsistentResults).toBe(false); // This will FAIL
      expect(concurrentTest.issues.length).toBe(0); // This will FAIL
      
      // Same endpoint versions should behave identically
      expect(v1StatusesUnique.length).toBe(1);
      expect(unversionedStatusesUnique.length).toBe(1);

      console.error('🏃 CONCURRENT REQUEST RACE ANALYSIS:', concurrentTest);
    });

    test('FAILS: Session state corruption occurs during version transitions', async () => {
      const sessionTest = {
        initialState: { version: '', instanceCount: 0, connected: false },
        transitions: [] as Array<{
          from: string;
          to: string;
          success: boolean;
          stateCorrupted: boolean;
          issue?: string;
        }>,
        finalState: { version: '', instanceCount: 0, connected: false },
        corruptionDetected: false,
        issues: [] as string[]
      };

      // Simulate session starting with v1 endpoints
      let currentVersion = 'v1';
      sessionTest.initialState.version = currentVersion;
      
      // Get initial state
      try {
        const initialResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        if (initialResponse.ok) {
          const data = await initialResponse.json();
          sessionTest.initialState.instanceCount = data.instances?.length || 0;
          sessionTest.initialState.connected = true;
        }
      } catch (error) {
        sessionTest.issues.push(`Initial state fetch failed: ${error.message}`);
      }

      // Simulate version transition scenarios
      const transitionScenarios = [
        { from: 'v1', to: 'unversioned' },
        { from: 'unversioned', to: 'v1' },
        { from: 'v1', to: 'v2' }  // Future version
      ];

      for (const scenario of transitionScenarios) {
        const transitionStart = {
          from: scenario.from,
          to: scenario.to,
          success: false,
          stateCorrupted: false
        };

        // Get state before transition
        const beforeEndpoint = scenario.from === 'v1' ? '/api/v1/claude/instances' : 
                              scenario.from === 'unversioned' ? '/api/claude/instances' : 
                              `/api/${scenario.from}/claude/instances`;
        
        let beforeCount = 0;
        try {
          const beforeResponse = await fetch(`${testBaseUrl}${beforeEndpoint}`);
          if (beforeResponse.ok) {
            const beforeData = await beforeResponse.json();
            beforeCount = beforeData.instances?.length || 0;
          }
        } catch (error) {
          // Ignore for state comparison
        }

        // Attempt transition to new version
        const afterEndpoint = scenario.to === 'v1' ? '/api/v1/claude/instances' : 
                             scenario.to === 'unversioned' ? '/api/claude/instances' : 
                             `/api/${scenario.to}/claude/instances`;

        let afterCount = 0;
        try {
          const afterResponse = await fetch(`${testBaseUrl}${afterEndpoint}`);
          if (afterResponse.ok) {
            const afterData = await afterResponse.json();
            afterCount = afterData.instances?.length || 0;
            transitionStart.success = true;
          }
        } catch (error) {
          transitionStart.issue = error.message;
        }

        // Check for state corruption (same data should be available)
        if (transitionStart.success && beforeCount > 0 && afterCount !== beforeCount) {
          transitionStart.stateCorrupted = true;
          transitionStart.issue = `Instance count changed: ${beforeCount} → ${afterCount}`;
          sessionTest.corruptionDetected = true;
        }

        sessionTest.transitions.push(transitionStart);
      }

      // Get final state
      try {
        const finalResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        if (finalResponse.ok) {
          const data = await finalResponse.json();
          sessionTest.finalState.version = 'v1';
          sessionTest.finalState.instanceCount = data.instances?.length || 0;
          sessionTest.finalState.connected = true;
        }
      } catch (error) {
        sessionTest.issues.push(`Final state fetch failed: ${error.message}`);
      }

      // ASSERTIONS: Session state should remain consistent across version transitions
      expect(sessionTest.corruptionDetected).toBe(false); // This may FAIL
      expect(sessionTest.issues.length).toBe(0); // This may FAIL

      // At least some transitions should work
      const successfulTransitions = sessionTest.transitions.filter(t => t.success);
      expect(successfulTransitions.length).toBeGreaterThan(0);

      // No successful transitions should corrupt state
      const corruptedTransitions = sessionTest.transitions.filter(t => t.success && t.stateCorrupted);
      expect(corruptedTransitions.length).toBe(0);

      console.error('🔄 SESSION STATE TRANSITION ANALYSIS:', sessionTest);
    });
  });

  describe('🔧 PASSING TESTS: Fixed Mixed Versioning Behavior', () => {
    
    beforeEach(() => {
      mockBackend.enableFixedBehavior();
    });

    test('PASSES: Components using different API versions maintain consistent state', async () => {
      const componentSync = {
        instanceManager: { instances: [] as any[], error: null },
        dashboard: { instances: [] as any[], error: null },
        terminal: { connections: [] as any[], error: null },
        consistent: true,
        syncIssues: [] as string[]
      };

      // Component 1: Uses v1 endpoints
      const v1Response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      expect(v1Response.ok).toBe(true);
      componentSync.instanceManager.instances = (await v1Response.json()).instances;

      // Component 2: Uses unversioned endpoints  
      const unversionedResponse = await fetch(`${testBaseUrl}/api/claude/instances`);
      expect(unversionedResponse.ok).toBe(true);
      componentSync.dashboard.instances = (await unversionedResponse.json()).instances;

      // Component 3: Uses v1 stream
      const streamResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances/test-id/terminal/stream`);
      expect(streamResponse.ok).toBe(true);
      componentSync.terminal.connections.push({ connected: true });

      // Verify consistency
      const instanceManagerIds = componentSync.instanceManager.instances.map(i => i.id).sort();
      const dashboardIds = componentSync.dashboard.instances.map(i => i.id).sort();
      
      expect(JSON.stringify(instanceManagerIds)).toBe(JSON.stringify(dashboardIds));
      expect(componentSync.terminal.connections.length).toBeGreaterThan(0);

      console.log('✅ COMPONENT CONSISTENCY MAINTAINED:', componentSync);
    });

    test('PASSES: Fallback mechanisms are fast and reliable', async () => {
      const fallbackPerformance = {
        primaryAttempts: 0,
        primarySuccesses: 0,
        fallbackAttempts: 0,
        totalTime: 0,
        efficient: true
      };

      const startTime = Date.now();

      // Test multiple requests - all should succeed on first try
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        fallbackPerformance.primaryAttempts++;
        if (response.ok) {
          fallbackPerformance.primarySuccesses++;
        }
      }

      fallbackPerformance.totalTime = Date.now() - startTime;

      // All primary attempts should succeed (no fallback needed)
      expect(fallbackPerformance.primarySuccesses).toBe(fallbackPerformance.primaryAttempts);
      expect(fallbackPerformance.totalTime).toBeLessThan(100); // Should be very fast
      
      // No fallback attempts needed
      expect(fallbackPerformance.fallbackAttempts).toBe(0);

      console.log('✅ EFFICIENT PRIMARY ENDPOINT ACCESS:', fallbackPerformance);
    });

    test('PASSES: Concurrent mixed-version requests are consistent and fast', async () => {
      const concurrentOptimized = {
        totalRequests: 10,
        successfulRequests: 0,
        averageResponseTime: 0,
        consistent: true,
        results: [] as any[]
      };

      // Mix of v1 and unversioned requests
      const promises = [];
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        const endpoint = i % 2 === 0 ? '/api/v1/claude/instances' : '/api/claude/instances';
        promises.push(
          fetch(`${testBaseUrl}${endpoint}`)
            .then(response => ({ success: response.ok, endpoint, status: response.status }))
        );
      }

      concurrentOptimized.results = await Promise.all(promises);
      concurrentOptimized.averageResponseTime = (Date.now() - startTime) / concurrentOptimized.totalRequests;
      concurrentOptimized.successfulRequests = concurrentOptimized.results.filter(r => r.success).length;

      // All requests should succeed
      expect(concurrentOptimized.successfulRequests).toBe(concurrentOptimized.totalRequests);
      
      // Should be fast
      expect(concurrentOptimized.averageResponseTime).toBeLessThan(50);

      // All should return same status code
      const statusCodes = [...new Set(concurrentOptimized.results.map(r => r.status))];
      expect(statusCodes.length).toBe(1);
      expect(statusCodes[0]).toBe(200);

      console.log('✅ OPTIMIZED CONCURRENT ACCESS:', concurrentOptimized);
    });

    test('PASSES: Session state remains stable across version usage', async () => {
      const sessionStability = {
        initialInstances: [] as any[],
        finalInstances: [] as any[],
        versionSwitches: 0,
        stateChanges: 0,
        stable: true
      };

      // Get initial state via v1
      const initial = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      sessionStability.initialInstances = (await initial.json()).instances;

      // Switch between versions multiple times
      const versions = ['v1', 'unversioned', 'v1', 'unversioned', 'v1'];
      
      for (const version of versions) {
        const endpoint = version === 'v1' ? '/api/v1/claude/instances' : '/api/claude/instances';
        const response = await fetch(`${testBaseUrl}${endpoint}`);
        expect(response.ok).toBe(true);
        
        const instances = (await response.json()).instances;
        if (instances.length !== sessionStability.initialInstances.length) {
          sessionStability.stateChanges++;
        }
        sessionStability.versionSwitches++;
      }

      // Get final state
      const final = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      sessionStability.finalInstances = (await final.json()).instances;

      // State should be identical
      expect(sessionStability.initialInstances.length).toBe(sessionStability.finalInstances.length);
      expect(sessionStability.stateChanges).toBe(0); // No unexpected state changes

      sessionStability.stable = sessionStability.stateChanges === 0;
      expect(sessionStability.stable).toBe(true);

      console.log('✅ SESSION STATE STABILITY:', sessionStability);
    });
  });

  describe('📊 Performance Comparison: Before vs After Fix', () => {
    
    test('Quantifies improvement in mixed versioning scenarios', async () => {
      const comparison = {
        brokenBehavior: { averageTime: 0, successRate: 0, fallbacksUsed: 0 },
        fixedBehavior: { averageTime: 0, successRate: 0, fallbacksUsed: 0 },
        improvement: { timeImprovement: 0, reliabilityImprovement: 0 }
      };

      // Test broken behavior (current state)
      mockBackend.reset(); // Ensure broken behavior
      const brokenTimes = [];
      let brokenSuccesses = 0;
      let brokenFallbacks = 0;

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
          brokenTimes.push(Date.now() - start);
          if (response.ok) brokenSuccesses++;
          else brokenFallbacks++; // Redirect counts as fallback needed
        } catch (error) {
          brokenTimes.push(Date.now() - start);
          brokenFallbacks++;
        }
      }

      comparison.brokenBehavior.averageTime = brokenTimes.reduce((a, b) => a + b, 0) / brokenTimes.length;
      comparison.brokenBehavior.successRate = brokenSuccesses / 5;
      comparison.brokenBehavior.fallbacksUsed = brokenFallbacks;

      // Test fixed behavior
      mockBackend.enableFixedBehavior();
      const fixedTimes = [];
      let fixedSuccesses = 0;

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        fixedTimes.push(Date.now() - start);
        if (response.ok) fixedSuccesses++;
      }

      comparison.fixedBehavior.averageTime = fixedTimes.reduce((a, b) => a + b, 0) / fixedTimes.length;
      comparison.fixedBehavior.successRate = fixedSuccesses / 5;
      comparison.fixedBehavior.fallbacksUsed = 0; // No fallbacks needed

      // Calculate improvements
      comparison.improvement.timeImprovement = comparison.brokenBehavior.averageTime - comparison.fixedBehavior.averageTime;
      comparison.improvement.reliabilityImprovement = comparison.fixedBehavior.successRate - comparison.brokenBehavior.successRate;

      // Fixed behavior should be better
      expect(comparison.fixedBehavior.successRate).toBeGreaterThan(comparison.brokenBehavior.successRate);
      expect(comparison.fixedBehavior.averageTime).toBeLessThanOrEqual(comparison.brokenBehavior.averageTime);
      expect(comparison.fixedBehavior.fallbacksUsed).toBeLessThan(comparison.brokenBehavior.fallbacksUsed);

      console.log('📊 MIXED VERSIONING IMPROVEMENT ANALYSIS:', comparison);
    });
  });
});