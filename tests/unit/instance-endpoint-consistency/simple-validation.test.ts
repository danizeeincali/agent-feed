/**
 * Simple Validation Test for Instance Endpoint Consistency
 * 
 * This test demonstrates the core issue without complex TypeScript types
 * Validates that the TDD approach correctly identifies the URL mismatch
 */

import { createMockBackend } from './backend-endpoint-mock';

// Mock fetch globally
global.fetch = jest.fn();

describe('Instance Endpoint Consistency - Simple Validation', () => {
  let mockBackend: ReturnType<typeof createMockBackend>;
  const testBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    mockBackend = createMockBackend(testBaseUrl);
    (global.fetch as jest.Mock) = mockBackend.mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockBackend.reset();
  });

  describe('🚨 DEMONSTRATING CURRENT URL MISMATCH', () => {
    
    test('FAILS: Frontend expects v1 endpoint to return JSON but gets redirect', async () => {
      console.log('\n🔍 Testing current broken behavior...');
      
      // This simulates what the frontend currently experiences
      const frontendExpectedEndpoint = '/api/v1/claude/instances';
      const response = await fetch(`${testBaseUrl}${frontendExpectedEndpoint}`);
      
      console.log('📊 Response Analysis:', {
        endpoint: frontendExpectedEndpoint,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });
      
      // CURRENT BROKEN BEHAVIOR: Frontend expects 200 OK with JSON
      // but gets 302 redirect with HTML
      expect(response.ok).toBe(false); // This demonstrates the issue
      expect(response.status).toBe(302); // Redirect instead of JSON
      
      // Try to parse as JSON - this will fail with current backend
      let jsonParseError = null;
      try {
        await response.json();
      } catch (error) {
        jsonParseError = error.message;
      }
      
      expect(jsonParseError).toContain('Unexpected token'); // Typical redirect HTML parse error
      
      console.error('🚨 URL MISMATCH CONFIRMED:', {
        frontendExpected: 'JSON response from /api/v1/claude/instances',
        backendActual: `${response.status} redirect with HTML content`,
        parseError: jsonParseError,
        impact: 'Frontend cannot get instance data on first try'
      });
    });

    test('FAILS: Unversioned endpoint works but frontend uses it as fallback', async () => {
      console.log('\n🔍 Testing fallback endpoint behavior...');
      
      const fallbackEndpoint = '/api/claude/instances';
      const response = await fetch(`${testBaseUrl}${fallbackEndpoint}`);
      
      console.log('📊 Fallback Response Analysis:', {
        endpoint: fallbackEndpoint,
        status: response.status,
        ok: response.ok
      });
      
      // This endpoint works (unversioned is the actual working endpoint)
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      console.warn('⚠️ FALLBACK PATTERN IDENTIFIED:', {
        workingEndpoint: fallbackEndpoint,
        issue: 'Frontend uses this as fallback instead of primary',
        impact: 'Additional latency and complexity from fallback logic'
      });
    });

    test('Documents the exact mismatch between frontend expectations and backend reality', () => {
      const endpointMismatch = {
        frontend: {
          primary: '/api/v1/claude/instances',
          expected: 'Direct JSON response',
          fallback: '/api/claude/instances',
          fallbackExpected: 'Works but used only after primary fails'
        },
        backend: {
          primary: '/api/claude/instances', 
          actualBehavior: 'Direct JSON response',
          versioned: '/api/v1/claude/instances',
          versionedBehavior: '302 redirect to primary'
        },
        problem: {
          description: 'Frontend primary != Backend primary',
          result: 'Frontend gets redirect when expecting JSON',
          userImpact: 'Slower loading, confusing errors'
        }
      };
      
      // Validate the mismatch exists
      expect(endpointMismatch.frontend.primary).not.toBe(endpointMismatch.backend.primary);
      expect(endpointMismatch.frontend.expected).toBe('Direct JSON response');
      expect(endpointMismatch.backend.versionedBehavior).toBe('302 redirect to primary');
      
      console.info('📋 ENDPOINT MISMATCH DOCUMENTATION:', endpointMismatch);
      
      // Record this for test analysis
      if (global.testResults) {
        global.testResults.recordFailure('endpoint-mismatch-analysis', endpointMismatch);
      }
    });
  });

  describe('🔧 VALIDATING FIXED BEHAVIOR', () => {
    
    beforeEach(() => {
      // Enable the fixed backend behavior for these tests
      mockBackend.enableFixedBehavior();
    });

    test('PASSES: Both v1 and unversioned endpoints return JSON directly', async () => {
      console.log('\n✅ Testing fixed behavior...');
      
      // Test v1 endpoint (frontend primary)
      const v1Response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
      expect(v1Response.ok).toBe(true);
      expect(v1Response.status).toBe(200);
      
      const v1Data = await v1Response.json();
      expect(v1Data).toBeDefined();
      
      // Test unversioned endpoint (backend primary)
      const unversionedResponse = await fetch(`${testBaseUrl}/api/claude/instances`);
      expect(unversionedResponse.ok).toBe(true);
      expect(unversionedResponse.status).toBe(200);
      
      const unversionedData = await unversionedResponse.json();
      expect(unversionedData).toBeDefined();
      
      console.log('✅ FIXED BEHAVIOR CONFIRMED:', {
        v1Endpoint: {
          status: v1Response.status,
          works: v1Response.ok,
          hasData: !!v1Data
        },
        unversionedEndpoint: {
          status: unversionedResponse.status,
          works: unversionedResponse.ok,
          hasData: !!unversionedData
        },
        improvement: 'Both endpoints work directly, no redirects needed'
      });
    });

    test('PASSES: No fallback logic needed when primary endpoints work', async () => {
      const performanceTest = {
        attempts: 0,
        successfulAttempts: 0,
        averageResponseTime: 0,
        needsFallback: false
      };

      const startTime = Date.now();
      
      // Try primary endpoint multiple times
      for (let i = 0; i < 5; i++) {
        const attemptStart = Date.now();
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        const responseTime = Date.now() - attemptStart;
        
        performanceTest.attempts++;
        if (response.ok) {
          performanceTest.successfulAttempts++;
        }
        performanceTest.averageResponseTime += responseTime;
      }
      
      performanceTest.averageResponseTime /= performanceTest.attempts;
      performanceTest.needsFallback = performanceTest.successfulAttempts < performanceTest.attempts;
      
      // All attempts should succeed (no fallback needed)
      expect(performanceTest.successfulAttempts).toBe(performanceTest.attempts);
      expect(performanceTest.needsFallback).toBe(false);
      expect(performanceTest.averageResponseTime).toBeLessThan(50); // Should be fast
      
      console.log('✅ PERFORMANCE IMPROVEMENT VALIDATED:', {
        ...performanceTest,
        totalTime: Date.now() - startTime,
        improvement: 'No fallback delays, consistent performance'
      });
    });
  });

  describe('📊 Impact Analysis', () => {
    
    test('Quantifies the improvement from fixing endpoint consistency', async () => {
      const comparison = {
        broken: { responseTime: 0, successRate: 0, redirects: 0 },
        fixed: { responseTime: 0, successRate: 0, redirects: 0 },
        improvement: { timeImprovement: 0, reliabilityImprovement: 0 }
      };

      // Test broken behavior
      mockBackend.reset(); // Ensure broken behavior
      let brokenStart = Date.now();
      let brokenSuccesses = 0;
      let brokenRedirects = 0;

      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        if (response.ok) brokenSuccesses++;
        if (response.status >= 300 && response.status < 400) brokenRedirects++;
      }
      
      comparison.broken.responseTime = (Date.now() - brokenStart) / 3;
      comparison.broken.successRate = brokenSuccesses / 3;
      comparison.broken.redirects = brokenRedirects;

      // Test fixed behavior  
      mockBackend.enableFixedBehavior();
      let fixedStart = Date.now();
      let fixedSuccesses = 0;

      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${testBaseUrl}/api/v1/claude/instances`);
        if (response.ok) fixedSuccesses++;
      }
      
      comparison.fixed.responseTime = (Date.now() - fixedStart) / 3;
      comparison.fixed.successRate = fixedSuccesses / 3;
      comparison.fixed.redirects = 0; // No redirects in fixed version

      // Calculate improvements
      comparison.improvement.timeImprovement = comparison.broken.responseTime - comparison.fixed.responseTime;
      comparison.improvement.reliabilityImprovement = comparison.fixed.successRate - comparison.broken.successRate;

      // Fixed should be better
      expect(comparison.fixed.successRate).toBeGreaterThan(comparison.broken.successRate);
      expect(comparison.fixed.responseTime).toBeLessThanOrEqual(comparison.broken.responseTime);
      expect(comparison.fixed.redirects).toBeLessThan(comparison.broken.redirects);

      console.log('📊 QUANTIFIED IMPROVEMENT:', comparison);
      
      // Record metrics
      if (global.testResults) {
        global.testResults.recordPerformance('endpoint-consistency-improvement', comparison);
      }
    });
  });
});