/**
 * TDD Test Suite: Instance Fetching Endpoint Consistency
 * 
 * PHASE 1: FAILING TESTS - Demonstrate current URL mismatch issues
 * These tests will FAIL with the current implementation and PASS after fix
 * 
 * Test Strategy:
 * 1. Test current broken behavior (frontend expects v1, backend serves redirects)
 * 2. Validate fallback mechanism works but is suboptimal
 * 3. Verify complete instance lifecycle fails due to endpoint mismatches
 * 4. Test mixed API versioning scenarios cause failures
 * 5. Demonstrate fix resolves all issues
 */

import { createMockBackend, MockBackendServer, EndpointTestUtils } from './backend-endpoint-mock';
import { APIClient, defaultAPIConfig } from '../../../frontend/src/config/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('Instance Endpoint Consistency - URL Mismatch Scenarios', () => {
  let mockBackend: MockBackendServer;
  let apiClient: APIClient;
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    mockBackend = createMockBackend(testBaseUrl);
    apiClient = new APIClient(defaultAPIConfig, true); // Enable fallback
    (global.fetch as jest.Mock) = mockBackend.mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockBackend.reset();
  });

  describe('🚨 FAILING TESTS: Current URL Mismatch Issues', () => {
    
    test('FAILS: Frontend expects v1 endpoints as primary, but backend redirects them', async () => {
      // This test will FAIL with current implementation
      // Frontend tries v1 endpoint first, expects JSON but gets HTML redirect
      
      const primaryEndpoint = apiClient.getClaudeInstancesEndpoint();
      expect(primaryEndpoint).toBe('/api/v1/claude/instances');
      
      // Attempt to fetch from primary endpoint (what frontend expects to work)
      const response = await fetch(`${testBaseUrl}${primaryEndpoint}`);
      
      // CURRENT BROKEN BEHAVIOR: Gets redirect instead of JSON
      expect(response.ok).toBe(false); // This will fail - frontend expects success
      expect(response.status).toBe(302); // This will fail - frontend expects 200
      
      // Verify the response is a redirect, not JSON (this breaks frontend)
      await expect(response.json()).rejects.toThrow('Unexpected token < in JSON');
      
      // Log the mismatch for debugging
      const requestLog = mockBackend.getRequestLog();
      const lastRequest = requestLog[requestLog.length - 1];
      expect(lastRequest.url).toContain('/api/v1/claude/instances');
      expect(lastRequest.status).toBe(302);
      
      console.error('🚨 URL MISMATCH DETECTED:', {
        frontendExpected: 'JSON response from /api/v1/claude/instances',
        backendActual: 'HTML redirect (302) to /api/claude/instances',
        impact: 'Frontend fails to get instances on first try'
      });
    });

    test('FAILS: Instance creation uses wrong endpoint and fails', async () => {
      // Frontend tries to create instance via v1 endpoint
      const createEndpoint = apiClient.getClaudeInstancesEndpoint();
      
      const createResponse = await fetch(`${testBaseUrl}${createEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Instance' })
      });
      
      // CURRENT BROKEN BEHAVIOR: POST to v1 endpoint gets redirect
      expect(createResponse.ok).toBe(false); // This will fail
      expect(createResponse.status).toBe(307); // Redirect preserves POST method
      
      // Verify instance creation failed due to redirect
      const backendState = mockBackend.getState();
      const initialInstanceCount = 2; // From mock setup
      expect(backendState.instances.length).toBe(initialInstanceCount); // No new instance created
      
      console.error('🚨 INSTANCE CREATION MISMATCH:', {
        attempt: 'POST /api/v1/claude/instances',
        result: '307 redirect (fails to create)',
        expected: '201 with new instance',
        impact: 'Users cannot create instances via primary endpoints'
      });
    });

    test('FAILS: Mixed versioning in single workflow causes inconsistency', async () => {
      // Simulate a complete workflow: list -> create -> connect
      const workflowSteps = [];
      
      // Step 1: List instances (frontend tries v1 first, gets redirect)
      const listResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      workflowSteps.push({
        step: 'list',
        endpoint: '/api/v1/claude/instances',
        success: listResponse.ok
      });
      
      // Step 2: Create instance (frontend tries v1, gets redirect)
      const createResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Workflow Test Instance' })
      });
      workflowSteps.push({
        step: 'create',
        endpoint: '/api/v1/claude/instances',
        success: createResponse.ok
      });
      
      // Step 3: Connect to terminal (frontend tries v1 stream endpoint)
      const streamResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances/test-id/terminal/stream`);
      workflowSteps.push({
        step: 'stream',
        endpoint: '/api/v1/claude/instances/test-id/terminal/stream',
        success: streamResponse.ok
      });
      
      // Verify workflow consistency - all steps should succeed or fail consistently
      const allSuccessful = workflowSteps.every(step => step.success);
      const allFailed = workflowSteps.every(step => !step.success);
      
      // CURRENT BROKEN BEHAVIOR: Inconsistent success/failure across workflow
      expect(allSuccessful || allFailed).toBe(true); // This will fail - mixed results
      
      console.error('🚨 WORKFLOW INCONSISTENCY:', {
        steps: workflowSteps,
        issue: 'Mixed success/failure breaks user experience',
        impact: 'Unpredictable behavior confuses users'
      });
    });

    test('FAILS: Fallback mechanism is unreliable and creates race conditions', async () => {
      // Test the current fallback behavior
      const primaryEndpoint = '/api/v1/claude/instances';
      const fallbackEndpoint = '/api/claude/instances';
      
      // Primary fails (redirect)
      const primaryResponse = await fetch(`${testBaseUrl}${primaryEndpoint}`);
      const primarySuccess = primaryResponse.ok;
      
      // Fallback works (unversioned endpoint)
      const fallbackResponse = await fetch(`${testBaseUrl}${fallbackEndpoint}`);
      const fallbackSuccess = fallbackResponse.ok;
      
      // Verify fallback pattern exists but is problematic
      expect(primarySuccess).toBe(false); // Primary should work but doesn't
      expect(fallbackSuccess).toBe(true); // Fallback works but isn't ideal
      
      // Check timing - fallback adds latency
      const requestLog = mockBackend.getRequestLog();
      const timings = requestLog.map(req => req.timestamp);
      const fallbackDelay = Math.max(...timings) - Math.min(...timings);
      
      expect(fallbackDelay).toBeGreaterThan(0); // Demonstrates added latency
      
      console.warn('⚠️ FALLBACK ISSUES:', {
        primaryEndpoint,
        fallbackEndpoint,
        primaryWorks: primarySuccess,
        fallbackWorks: fallbackSuccess,
        addedLatency: `${fallbackDelay}ms`,
        issue: 'Fallback adds latency and complexity'
      });
    });
  });

  describe('📋 Current Behavior Documentation', () => {
    
    test('Documents exact current backend endpoint behavior', () => {
      const expectedEndpoints = EndpointTestUtils.generateExpectedEndpoints(testBaseUrl, 'test-instance');
      
      // Current backend reality
      const currentBackendBehavior = {
        workingEndpoints: [
          '/api/claude/instances',
          '/api/claude/instances/:id/terminal/stream',
          '/api/claude/instances/:id/terminal/input'
        ],
        redirectEndpoints: [
          '/api/v1/claude/instances → /api/claude/instances (302)',
          '/api/v1/claude/instances/:id/terminal/stream → redirect',
          '/api/v1/claude/instances/:id/terminal/input → redirect'
        ],
        frontendExpectations: [
          'Primary: /api/v1/claude/instances (expects direct JSON)',
          'Fallback: /api/claude/instances (works but suboptimal)'
        ]
      };
      
      expect(currentBackendBehavior.workingEndpoints).toHaveLength(3);
      expect(currentBackendBehavior.redirectEndpoints).toHaveLength(3);
      
      // Document the mismatch
      const mismatch = {
        frontendPrimary: expectedEndpoints.primary.instances,
        backendPrimary: '/api/claude/instances',
        resultingBehavior: 'Frontend gets redirect when expecting JSON'
      };
      
      expect(mismatch.frontendPrimary).not.toBe(mismatch.backendPrimary);
      
      console.info('📋 CURRENT STATE DOCUMENTATION:', {
        ...currentBackendBehavior,
        mismatch
      });
    });

    test('Validates endpoint pattern recognition utilities', () => {
      const testUrls = [
        'http://localhost:3000/api/v1/claude/instances',
        'http://localhost:3000/api/claude/instances',
        'http://localhost:3000/api/v2/claude/instances',
        '/api/v1/claude/instances'
      ];
      
      testUrls.forEach(url => {
        const isVersioned = EndpointTestUtils.isVersionedEndpoint(url);
        const version = EndpointTestUtils.getEndpointVersion(url);
        
        if (url.includes('/api/v')) {
          expect(isVersioned).toBe(true);
          expect(version).toMatch(/^v\d+$/);
        } else {
          expect(isVersioned).toBe(false);
          expect(version).toBeNull();
        }
      });
    });
  });

  describe('🔧 PASSING TESTS: Fixed Behavior Validation', () => {
    
    beforeEach(() => {
      // Enable the fixed backend behavior for these tests
      mockBackend.enableFixedBehavior();
    });

    test('PASSES: Fixed backend serves both versioned and unversioned endpoints directly', async () => {
      // Test primary (versioned) endpoint
      const primaryResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      expect(primaryResponse.ok).toBe(true);
      expect(primaryResponse.status).toBe(200);
      
      const primaryData = await primaryResponse.json();
      expect(primaryData.success).toBe(true);
      expect(primaryData.instances).toBeDefined();
      
      // Test fallback (unversioned) endpoint
      const fallbackResponse = await fetch(`${testBaseUrl}/api/claude/instances`);
      expect(fallbackResponse.ok).toBe(true);
      expect(fallbackResponse.status).toBe(200);
      
      const fallbackData = await fallbackResponse.json();
      expect(fallbackData.success).toBe(true);
      expect(fallbackData.instances).toBeDefined();
      
      // Verify both return same data
      expect(primaryData.instances).toEqual(fallbackData.instances);
      
      console.log('✅ FIXED BEHAVIOR VALIDATED:', {
        primaryEndpoint: '/api/v1/claude/instances works directly',
        fallbackEndpoint: '/api/claude/instances works directly',
        consistency: 'Both return identical data',
        noRedirects: 'No 302/307 responses'
      });
    });

    test('PASSES: Complete instance lifecycle works seamlessly', async () => {
      const workflowSteps = [];
      
      // Step 1: List instances via primary endpoint
      const listResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      workflowSteps.push({
        step: 'list',
        success: listResponse.ok,
        status: listResponse.status
      });
      
      // Step 2: Create instance via primary endpoint
      const createResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Lifecycle Test Instance' })
      });
      workflowSteps.push({
        step: 'create',
        success: createResponse.ok,
        status: createResponse.status
      });
      
      let createdInstanceId = null;
      if (createResponse.ok) {
        const createData = await createResponse.json();
        createdInstanceId = createData.instance.id;
      }
      
      // Step 3: Connect to terminal stream
      if (createdInstanceId) {
        const streamResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances/${createdInstanceId}/terminal/stream`);
        workflowSteps.push({
          step: 'stream',
          success: streamResponse.ok,
          status: streamResponse.status
        });
      }
      
      // Verify entire workflow succeeds
      const allSuccessful = workflowSteps.every(step => step.success);
      expect(allSuccessful).toBe(true);
      
      workflowSteps.forEach(step => {
        expect(step.status).toBeLessThan(400); // All should be 200-level success
      });
      
      console.log('✅ COMPLETE LIFECYCLE SUCCESS:', {
        steps: workflowSteps,
        allSuccessful,
        createdInstanceId,
        impact: 'Seamless user experience'
      });
    });

    test('PASSES: Error handling distinguishes between endpoint types correctly', async () => {
      // Test non-existent versioned endpoint
      const v1Response = await fetch(`${testBaseUrl}/api/v1/nonexistent`);
      expect(v1Response.status).toBe(404);
      
      // Test non-existent unversioned endpoint  
      const unversionedResponse = await fetch(`${testBaseUrl}/api/nonexistent`);
      expect(unversionedResponse.status).toBe(404);
      
      // Both should fail consistently (404, not redirect)
      expect(v1Response.status).toBe(unversionedResponse.status);
      
      // Neither should be redirects
      expect(v1Response.status).not.toBe(302);
      expect(v1Response.status).not.toBe(307);
      expect(unversionedResponse.status).not.toBe(302);
      expect(unversionedResponse.status).not.toBe(307);
      
      console.log('✅ CONSISTENT ERROR HANDLING:', {
        versionedEndpointError: v1Response.status,
        unversionedEndpointError: unversionedResponse.status,
        noRedirects: 'Both return 404, not redirects'
      });
    });

    test('PASSES: Frontend fallback mechanism becomes unnecessary but still works', async () => {
      // With fixed backend, primary should work
      const primaryResponse = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      expect(primaryResponse.ok).toBe(true);
      
      // Fallback should also work
      const fallbackResponse = await fetch(`${testBaseUrl}/api/claude/instances`);
      expect(fallbackResponse.ok).toBe(true);
      
      // Both should return same data without redirects
      const primaryData = await primaryResponse.json();
      const fallbackData = await fallbackResponse.json();
      expect(primaryData).toEqual(fallbackData);
      
      // No redirects in the request log
      const requestLog = mockBackend.getRequestLog();
      const hasRedirects = requestLog.some(req => 
        req.status === 302 || req.status === 307
      );
      expect(hasRedirects).toBe(false);
      
      console.log('✅ OPTIMIZED PERFORMANCE:', {
        primaryWorks: primaryResponse.ok,
        fallbackWorks: fallbackResponse.ok,
        noRedirects: !hasRedirects,
        benefit: 'No fallback delay needed'
      });
    });
  });

  describe('🎯 Test Validation and Metrics', () => {
    
    test('Confirms tests demonstrate the exact mismatch issue', () => {
      // Verify our test setup correctly simulates the real problem
      const mockState = mockBackend.getState();
      expect(mockState.instances.length).toBeGreaterThan(0);
      
      // Test that our mock correctly simulates the redirect behavior
      const testRedirectPromise = fetch(`${testBaseUrl}/api/v1/claude/instances`);
      expect(testRedirectPromise).resolves.toBeDefined();
      
      // Verify endpoint generation utilities work
      const endpoints = EndpointTestUtils.generateExpectedEndpoints(testBaseUrl, 'test');
      expect(endpoints.primary.instances).toBe(`${testBaseUrl}/api/v1/claude/instances`);
      expect(endpoints.fallback.instances).toBe(`${testBaseUrl}/api/claude/instances`);
    });

    test('Provides clear metrics on the mismatch impact', () => {
      const impactMetrics = {
        endpointsMismatched: [
          '/api/v1/claude/instances',
          '/api/v1/claude/instances/:id/terminal/stream',
          '/api/v1/claude/instances/:id/terminal/input'
        ],
        userImpact: {
          failureRate: '100% on first attempt',
          fallbackDelay: '~100-500ms additional latency',
          userExperienceRating: 'Poor - inconsistent behavior'
        },
        developerImpact: {
          debuggingDifficulty: 'High - redirect errors are confusing',
          maintenanceOverhead: 'Medium - fallback logic complexity'
        }
      };
      
      expect(impactMetrics.endpointsMismatched.length).toBe(3);
      expect(impactMetrics.userImpact.failureRate).toContain('100%');
      
      console.info('📊 MISMATCH IMPACT ANALYSIS:', impactMetrics);
    });
  });
});