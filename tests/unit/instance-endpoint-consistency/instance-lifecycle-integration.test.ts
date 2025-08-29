/**
 * TDD Integration Tests: Complete Instance Lifecycle Consistency
 * 
 * Tests the complete user journey: create → list → connect → interact → cleanup
 * Validates that all endpoints work consistently throughout the lifecycle
 * 
 * CURRENT EXPECTATION: These tests will FAIL due to endpoint mismatches
 * AFTER FIX: These tests will PASS showing seamless integration
 */

import { createMockBackend, MockBackendServer, EndpointTestUtils } from './backend-endpoint-mock';
import { APIClient, defaultAPIConfig } from '../../../frontend/src/config/api';

// Mock EventSource for SSE testing
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0; // CONNECTING
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
}

// Mock fetch and EventSource globally
global.fetch = jest.fn();
global.EventSource = MockEventSource as any;

describe('Instance Lifecycle Integration Tests', () => {
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

  describe('🚨 FAILING TESTS: Current Broken Lifecycle', () => {
    
    test('FAILS: Complete create → list → connect workflow breaks on versioned endpoints', async () => {
      const lifecycle = {
        steps: [] as Array<{
          name: string;
          endpoint: string;
          method: string;
          success: boolean;
          status: number;
          error?: string;
          data?: any;
        }>,
        startTime: Date.now(),
        endTime: 0,
        totalDuration: 0,
        success: false
      };

      try {
        // Step 1: Create new instance via primary (v1) endpoint
        const createEndpoint = apiClient.getClaudeInstancesEndpoint();
        const createUrl = apiClient.getURL(createEndpoint);
        
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: 'Lifecycle Test Instance',
            description: 'Testing complete workflow'
          })
        });
        
        const createStep = {
          name: 'create_instance',
          endpoint: createEndpoint,
          method: 'POST',
          success: createResponse.ok,
          status: createResponse.status
        };

        if (!createResponse.ok) {
          createStep.error = `Expected 201, got ${createResponse.status}`;
        } else {
          try {
            createStep.data = await createResponse.json();
          } catch (e) {
            createStep.error = 'Failed to parse response JSON';
            createStep.success = false;
          }
        }
        
        lifecycle.steps.push(createStep);

        // Step 2: List instances to verify creation (using same v1 endpoint)
        const listResponse = await fetch(createUrl);
        
        const listStep = {
          name: 'list_instances',
          endpoint: createEndpoint,
          method: 'GET',
          success: listResponse.ok,
          status: listResponse.status
        };

        if (!listResponse.ok) {
          listStep.error = `Expected 200, got ${listResponse.status}`;
        } else {
          try {
            listStep.data = await listResponse.json();
          } catch (e) {
            listStep.error = 'Failed to parse response JSON';
            listStep.success = false;
          }
        }
        
        lifecycle.steps.push(listStep);

        // Step 3: Connect to terminal stream (if instance was created)
        let instanceId = null;
        if (createStep.success && createStep.data && createStep.data.instance) {
          instanceId = createStep.data.instance.id;
        } else if (listStep.success && listStep.data && listStep.data.instances.length > 0) {
          instanceId = listStep.data.instances[0].id; // Use existing instance
        }

        if (instanceId) {
          const streamEndpoint = apiClient.getTerminalStreamEndpoint(instanceId);
          const streamUrl = apiClient.getURL(streamEndpoint);
          
          const streamResponse = await fetch(streamUrl);
          
          const streamStep = {
            name: 'connect_terminal',
            endpoint: streamEndpoint,
            method: 'GET',
            success: streamResponse.ok,
            status: streamResponse.status
          };

          if (!streamResponse.ok) {
            streamStep.error = `Expected 200, got ${streamResponse.status}`;
          }
          
          lifecycle.steps.push(streamStep);
        } else {
          lifecycle.steps.push({
            name: 'connect_terminal',
            endpoint: 'N/A',
            method: 'GET',
            success: false,
            status: 0,
            error: 'No instance available for connection'
          });
        }

        lifecycle.endTime = Date.now();
        lifecycle.totalDuration = lifecycle.endTime - lifecycle.startTime;
        lifecycle.success = lifecycle.steps.every(step => step.success);

        // ASSERTION: This workflow should succeed but will fail due to redirects
        expect(lifecycle.success).toBe(true); // This will FAIL

        // Detailed assertions for each step
        lifecycle.steps.forEach((step, index) => {
          expect(step.success).toBe(true); // Each step should succeed
          expect(step.status).toBeLessThan(400); // No 4xx/5xx errors
          expect(step.error).toBeUndefined(); // No error messages
        });

      } catch (error) {
        lifecycle.endTime = Date.now();
        lifecycle.totalDuration = lifecycle.endTime - lifecycle.startTime;
        lifecycle.success = false;
        
        console.error('🚨 COMPLETE LIFECYCLE FAILURE:', {
          error: error.message,
          lifecycle,
          impact: 'User cannot complete basic workflow'
        });
        
        throw error;
      }

      console.log('📊 LIFECYCLE ANALYSIS:', lifecycle);
    });

    test('FAILS: Instance creation and listing use inconsistent API paths', async () => {
      const endpointConsistency = {
        createEndpoint: '',
        listEndpoint: '',
        shouldBeIdentical: true,
        actuallyIdentical: false,
        createWorks: false,
        listWorks: false
      };

      // Get endpoints from API client
      const createEndpoint = apiClient.getClaudeInstancesEndpoint();
      const listEndpoint = apiClient.getClaudeInstancesEndpoint(); // Should be same
      
      endpointConsistency.createEndpoint = createEndpoint;
      endpointConsistency.listEndpoint = listEndpoint;
      endpointConsistency.actuallyIdentical = (createEndpoint === listEndpoint);

      // Test create operation
      const createResponse = await fetch(`${testBaseUrl}${createEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Consistency Test Instance' })
      });
      endpointConsistency.createWorks = createResponse.ok;

      // Test list operation
      const listResponse = await fetch(`${testBaseUrl}${listEndpoint}`);
      endpointConsistency.listWorks = listResponse.ok;

      // ASSERTIONS: Both should work if endpoints are consistent
      expect(endpointConsistency.actuallyIdentical).toBe(true); // Should be same endpoint
      expect(endpointConsistency.createWorks).toBe(true); // Create should work
      expect(endpointConsistency.listWorks).toBe(true); // List should work

      // If endpoints are the same but operations have different success, it's a backend issue
      if (endpointConsistency.actuallyIdentical) {
        expect(endpointConsistency.createWorks).toBe(endpointConsistency.listWorks);
      }

      console.error('🔍 ENDPOINT CONSISTENCY ANALYSIS:', endpointConsistency);
    });

    test('FAILS: SSE connection establishment fails due to endpoint version mismatch', async () => {
      const sseConnectionTest = {
        instanceId: 'test-sse-instance',
        primaryStreamEndpoint: '',
        fallbackStreamEndpoint: '',
        primaryConnectionWorks: false,
        fallbackConnectionWorks: false,
        connectionEstablished: false,
        error: null as string | null
      };

      const instanceId = sseConnectionTest.instanceId;
      
      // Get primary (v1) stream endpoint
      const primaryStreamEndpoint = apiClient.getTerminalStreamEndpoint(instanceId);
      sseConnectionTest.primaryStreamEndpoint = primaryStreamEndpoint;
      
      // Get fallback stream endpoint (should be unversioned)
      const fallbackStreamEndpoint = primaryStreamEndpoint.replace('/api/v1/', '/api/');
      sseConnectionTest.fallbackStreamEndpoint = fallbackStreamEndpoint;

      try {
        // Test primary SSE connection
        const primaryStreamUrl = apiClient.getURL(primaryStreamEndpoint);
        const primaryEventSource = new EventSource(primaryStreamUrl);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            primaryEventSource.close();
            reject(new Error('Primary SSE connection timeout'));
          }, 1000);
          
          primaryEventSource.onopen = () => {
            clearTimeout(timeout);
            sseConnectionTest.primaryConnectionWorks = true;
            primaryEventSource.close();
            resolve(true);
          };
          
          primaryEventSource.onerror = (error) => {
            clearTimeout(timeout);
            sseConnectionTest.error = 'Primary SSE connection failed';
            primaryEventSource.close();
            reject(error);
          };
        });

      } catch (error) {
        sseConnectionTest.error = error.message;
        
        // Try fallback connection
        try {
          const fallbackStreamUrl = `${testBaseUrl}${fallbackStreamEndpoint}`;
          const fallbackEventSource = new EventSource(fallbackStreamUrl);
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              fallbackEventSource.close();
              reject(new Error('Fallback SSE connection timeout'));
            }, 1000);
            
            fallbackEventSource.onopen = () => {
              clearTimeout(timeout);
              sseConnectionTest.fallbackConnectionWorks = true;
              fallbackEventSource.close();
              resolve(true);
            };
            
            fallbackEventSource.onerror = (error) => {
              clearTimeout(timeout);
              fallbackEventSource.close();
              reject(error);
            };
          });
          
        } catch (fallbackError) {
          sseConnectionTest.error += `; Fallback also failed: ${fallbackError.message}`;
        }
      }

      sseConnectionTest.connectionEstablished = 
        sseConnectionTest.primaryConnectionWorks || sseConnectionTest.fallbackConnectionWorks;

      // ASSERTIONS: SSE connection should work consistently
      expect(sseConnectionTest.connectionEstablished).toBe(true); // This will FAIL
      expect(sseConnectionTest.primaryConnectionWorks).toBe(true); // Primary should work
      expect(sseConnectionTest.error).toBeNull(); // No errors should occur

      console.error('🔌 SSE CONNECTION ANALYSIS:', sseConnectionTest);
    });
  });

  describe('🔧 PASSING TESTS: Fixed Lifecycle Integration', () => {
    
    beforeEach(() => {
      // Enable fixed backend behavior
      mockBackend.enableFixedBehavior();
    });

    test('PASSES: Complete instance lifecycle works seamlessly end-to-end', async () => {
      const lifecycle = {
        steps: [] as Array<{
          name: string;
          success: boolean;
          duration: number;
          data?: any;
        }>,
        totalDuration: 0,
        success: false
      };

      const startTime = Date.now();

      // Step 1: Create instance
      const stepStart1 = Date.now();
      const createResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'E2E Test Instance' })
      });
      const createData = await createResponse.json();
      lifecycle.steps.push({
        name: 'create',
        success: createResponse.ok,
        duration: Date.now() - stepStart1,
        data: createData
      });

      // Step 2: Verify in list
      const stepStart2 = Date.now();
      const listResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      const listData = await listResponse.json();
      lifecycle.steps.push({
        name: 'list',
        success: listResponse.ok,
        duration: Date.now() - stepStart2,
        data: listData
      });

      // Step 3: Connect to terminal
      const instanceId = createData.instance?.id;
      if (instanceId) {
        const stepStart3 = Date.now();
        const streamResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`);
        lifecycle.steps.push({
          name: 'connect',
          success: streamResponse.ok,
          duration: Date.now() - stepStart3,
          data: { connected: streamResponse.ok }
        });
      }

      lifecycle.totalDuration = Date.now() - startTime;
      lifecycle.success = lifecycle.steps.every(step => step.success);

      // All steps should succeed
      expect(lifecycle.success).toBe(true);
      lifecycle.steps.forEach(step => {
        expect(step.success).toBe(true);
      });

      // Performance should be good (no fallback delays)
      expect(lifecycle.totalDuration).toBeLessThan(500); // Under 500ms

      console.log('✅ COMPLETE LIFECYCLE SUCCESS:', lifecycle);
    });

    test('PASSES: All endpoint variants work consistently', async () => {
      const endpointTests = [
        { path: '/api/v1/claude/instances', version: 'v1', method: 'GET' },
        { path: '/api/claude/instances', version: 'unversioned', method: 'GET' },
        { path: '/api/v1/claude/instances', version: 'v1', method: 'POST' },
        { path: '/api/claude/instances', version: 'unversioned', method: 'POST' }
      ];

      const results = await Promise.all(
        endpointTests.map(async (test) => {
          const options: RequestInit = { method: test.method };
          if (test.method === 'POST') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({ name: `Test ${test.version}` });
          }

          const response = await fetch(`${testBaseUrl}${test.path}`, options);
          return {
            ...test,
            success: response.ok,
            status: response.status
          };
        })
      );

      // All endpoints should work
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.status).toBeLessThan(400);
      });

      // Both versions should behave identically
      const v1GET = results.find(r => r.version === 'v1' && r.method === 'GET');
      const unversionedGET = results.find(r => r.version === 'unversioned' && r.method === 'GET');
      expect(v1GET?.success).toBe(unversionedGET?.success);

      console.log('✅ ALL ENDPOINTS CONSISTENT:', results);
    });

    test('PASSES: Error scenarios are handled consistently across versions', async () => {
      const errorTests = [
        { path: '/api/v1/claude/nonexistent', expectedStatus: 404 },
        { path: '/api/claude/nonexistent', expectedStatus: 404 },
        { path: '/api/v1/claude/instances/invalid-id', expectedStatus: 404 },
        { path: '/api/claude/instances/invalid-id', expectedStatus: 404 }
      ];

      const errorResults = await Promise.all(
        errorTests.map(async (test) => {
          const response = await fetch(`${testBaseUrl}${test.path}`);
          return {
            ...test,
            actualStatus: response.status,
            consistent: response.status === test.expectedStatus
          };
        })
      );

      // All error responses should be consistent
      errorResults.forEach(result => {
        expect(result.consistent).toBe(true);
        expect(result.actualStatus).toBe(result.expectedStatus);
      });

      console.log('✅ ERROR HANDLING CONSISTENT:', errorResults);
    });
  });

  describe('📈 Performance and Reliability Metrics', () => {
    
    test('Measures performance impact of endpoint mismatches', async () => {
      const performanceMetrics = {
        brokenBehavior: { attempts: 0, totalTime: 0, successRate: 0 },
        fixedBehavior: { attempts: 0, totalTime: 0, successRate: 0 },
        improvement: { timeReduction: 0, reliabilityIncrease: 0 }
      };

      // Test broken behavior
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
          performanceMetrics.brokenBehavior.attempts++;
          performanceMetrics.brokenBehavior.totalTime += Date.now() - start;
          if (response.ok) performanceMetrics.brokenBehavior.successRate++;
        } catch (error) {
          performanceMetrics.brokenBehavior.attempts++;
          performanceMetrics.brokenBehavior.totalTime += Date.now() - start;
        }
      }

      // Test fixed behavior
      mockBackend.enableFixedBehavior();
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
          performanceMetrics.fixedBehavior.attempts++;
          performanceMetrics.fixedBehavior.totalTime += Date.now() - start;
          if (response.ok) performanceMetrics.fixedBehavior.successRate++;
        } catch (error) {
          performanceMetrics.fixedBehavior.attempts++;
          performanceMetrics.fixedBehavior.totalTime += Date.now() - start;
        }
      }

      // Calculate improvements
      const brokenAvgTime = performanceMetrics.brokenBehavior.totalTime / performanceMetrics.brokenBehavior.attempts;
      const fixedAvgTime = performanceMetrics.fixedBehavior.totalTime / performanceMetrics.fixedBehavior.attempts;
      
      performanceMetrics.improvement.timeReduction = brokenAvgTime - fixedAvgTime;
      performanceMetrics.improvement.reliabilityIncrease = 
        (performanceMetrics.fixedBehavior.successRate / performanceMetrics.fixedBehavior.attempts) -
        (performanceMetrics.brokenBehavior.successRate / performanceMetrics.brokenBehavior.attempts);

      // Fixed behavior should be better
      expect(performanceMetrics.fixedBehavior.successRate).toBeGreaterThan(
        performanceMetrics.brokenBehavior.successRate
      );
      expect(fixedAvgTime).toBeLessThanOrEqual(brokenAvgTime);

      console.log('📈 PERFORMANCE IMPROVEMENT METRICS:', performanceMetrics);
    });
  });
});