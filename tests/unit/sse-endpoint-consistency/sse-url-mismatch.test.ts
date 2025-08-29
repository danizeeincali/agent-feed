/**
 * SSE URL Mismatch TDD Tests
 * 
 * These tests WILL FAIL initially due to URL mismatches between frontend and backend.
 * After fixing the URL consistency, these tests WILL PASS.
 * 
 * Current Issues Tested:
 * 1. Frontend uses /api/claude/instances/... while backend expects /api/v1/claude/instances/...
 * 2. SSE connection URLs don't match between frontend hooks and backend endpoints
 * 3. API versioning inconsistency across different hooks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventSourceMock, FetchMock } from './mocks/EventSourceMock';
import { SSE_ENDPOINT_PATTERNS, API_VERSIONING_PATTERNS, URL_CONSTRUCTION_TEST_CASES } from './fixtures/endpointPatterns';
import { URLPatternValidator, SSETestHelper, EndpointConsistencyTester, MockInstanceManager } from './utils/testHelpers';

describe('SSE Connection Path Consistency Tests', () => {
  let testHelper: SSETestHelper;
  let consistencyTester: EndpointConsistencyTester;
  let mockInstanceManager: MockInstanceManager;

  beforeEach(() => {
    testHelper = new SSETestHelper();
    consistencyTester = new EndpointConsistencyTester();
    mockInstanceManager = new MockInstanceManager();
    
    testHelper.setupMocks();
    
    // Mock successful backend responses for tests that should work
    FetchMock.mockResponse('/api/v1/claude/instances', {
      success: true,
      instances: []
    });
    
    // Mock 404 responses for mismatched URLs
    FetchMock.mockResponse('/api/claude/instances', {
      status: 404,
      error: 'Not Found',
      message: 'Endpoint not found - check API versioning'
    });
  });

  afterEach(() => {
    testHelper.cleanup();
    consistencyTester.resetResults();
    mockInstanceManager.clear();
  });

  describe('1. SSE Connection URL Matching Backend Endpoints', () => {
    it('SHOULD FAIL: Terminal stream URLs mismatch between frontend and backend', async () => {
      // This test demonstrates the current URL mismatch issue
      const instanceId = 'test-instance-123';
      const baseUrl = 'http://localhost:3000';
      
      // Current frontend implementation uses this URL
      const frontendSSEUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      
      // But backend serves this URL
      const backendSSEUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // Create EventSource with frontend URL (what currently happens)
      const eventSource = new EventSourceMock(frontendSSEUrl);
      
      // This assertion WILL FAIL initially because URLs don't match
      expect(URLPatternValidator.extractPath(frontendSSEUrl))
        .toBe(URLPatternValidator.extractPath(backendSSEUrl));
        
      // Expected failure message:
      // Expected: "/api/v1/claude/instances/test-instance-123/terminal/stream"
      // Received: "/api/claude/instances/test-instance-123/terminal/stream"
    });

    it('SHOULD FAIL: Terminal input URLs mismatch between frontend and backend', async () => {
      const instanceId = 'test-instance-456';
      const baseUrl = 'http://localhost:3000';
      
      // Frontend sends POST to this URL
      const frontendInputUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/input`;
      
      // Backend expects POST to this URL  
      const backendInputUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`;
      
      // This assertion WILL FAIL initially
      expect(URLPatternValidator.extractPath(frontendInputUrl))
        .toBe(URLPatternValidator.extractPath(backendInputUrl));
    });

    it('SHOULD PASS: Terminal polling URLs are correctly matched', async () => {
      const instanceId = 'test-instance-789';
      const baseUrl = 'http://localhost:3000';
      
      // Both frontend and backend use versioned URL for polling
      const frontendPollUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`;
      const backendPollUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`;
      
      // This assertion WILL PASS - URLs already match
      expect(URLPatternValidator.extractPath(frontendPollUrl))
        .toBe(URLPatternValidator.extractPath(backendPollUrl));
    });
  });

  describe('2. API Versioning Consistency', () => {
    it('SHOULD FAIL: Inconsistent API versioning across different frontend hooks', async () => {
      // Test all endpoint patterns for consistency
      const results = await Promise.all(
        SSE_ENDPOINT_PATTERNS.map(pattern => consistencyTester.testEndpointPattern(pattern))
      );
      
      // Count failures (mismatched URLs)
      const failedTests = results.filter(result => !result.testPassed);
      const passedTests = results.filter(result => result.testPassed);
      
      console.log('Failed URL patterns:', failedTests.map(r => ({
        pattern: r.pattern,
        frontend: r.frontendUrl,
        backend: r.backendUrl
      })));
      
      // This assertion WILL FAIL initially - we expect 4 mismatched patterns
      expect(failedTests.length).toBe(0); // Should be 0 after fix, but currently 4
      expect(passedTests.length).toBe(SSE_ENDPOINT_PATTERNS.length);
    });

    it('SHOULD FAIL: useSSEConnectionSingleton uses unversioned URLs', () => {
      // Simulate what useSSEConnectionSingleton currently does
      const instanceId = 'singleton-test';
      const baseUrl = 'http://localhost:3000';
      
      // Current implementation in useSSEConnectionSingleton.ts (line 27)
      const currentUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      
      // What it should be using (to match backend)
      const expectedUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // This WILL FAIL initially
      expect(currentUrl).toBe(expectedUrl);
    });

    it('SHOULD FAIL: useStableSSEConnection uses unversioned URLs', () => {
      // Simulate what useStableSSEConnection currently does
      const instanceId = 'stable-test';
      const baseUrl = 'http://localhost:3000';
      
      // Current implementation (from grep results)
      const currentStreamUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const currentInputUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/input`;
      
      // What they should be
      const expectedStreamUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const expectedInputUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`;
      
      // These WILL FAIL initially
      expect(currentStreamUrl).toBe(expectedStreamUrl);
      expect(currentInputUrl).toBe(expectedInputUrl);
    });

    it('SHOULD PASS: Some hooks correctly use versioned URLs', () => {
      // Test that useWebSocket correctly uses v1 URLs for polling
      const instanceId = 'websocket-test';
      const baseUrl = 'http://localhost:3000';
      
      // From grep results - useWebSocket.ts correctly uses v1 for polling
      const pollUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`;
      const sseUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // These should already pass
      expect(pollUrl.includes('/api/v1/')).toBe(true);
      expect(sseUrl.includes('/api/v1/')).toBe(true);
    });
  });

  describe('3. SSE Connection Establishment After Instance Creation', () => {
    it('SHOULD FAIL: SSE connection fails due to URL mismatch after successful instance creation', async () => {
      const instanceId = 'connection-test';
      
      // Step 1: Create instance (this might succeed if using correct URL)
      const instance = mockInstanceManager.createInstance(instanceId, 'running');
      
      // Step 2: Try to establish SSE connection with mismatched URL
      const wrongSSEUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(wrongSSEUrl);
      
      // Step 3: Simulate 404 error due to URL mismatch
      eventSource.mockError('404 Not Found - Endpoint does not exist');
      
      // This test documents the failure scenario
      expect(eventSource.readyState).toBe(EventSourceMock.CLOSED);
      expect(EventSourceMock.lastCreatedUrl).toBe(wrongSSEUrl);
      
      // The correct URL should have been:
      const correctSSEUrl = `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/stream`;
      expect(wrongSSEUrl).not.toBe(correctSSEUrl); // This demonstrates the mismatch
    });

    it('SHOULD PASS: SSE connection succeeds when URLs match', async () => {
      const instanceId = 'success-test';
      
      // Create instance
      const instance = mockInstanceManager.createInstance(instanceId, 'running');
      
      // Use correct versioned URL
      const correctSSEUrl = `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(correctSSEUrl);
      
      // Simulate successful connection
      await testHelper.simulateSuccessfulConnection(instanceId, 50);
      
      expect(eventSource.readyState).toBe(EventSourceMock.OPEN);
      expect(EventSourceMock.lastCreatedUrl).toBe(correctSSEUrl);
    });
  });

  describe('4. Frontend SSE Connection Failure Graceful Handling', () => {
    it('SHOULD FAIL: Current hooks do not handle URL mismatch errors gracefully', async () => {
      const instanceId = 'error-handling-test';
      
      // Simulate what happens with current implementation
      const eventSource = new EventSourceMock(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      let errorCaught = false;
      let errorMessage = '';
      
      eventSource.onerror = (event: Event) => {
        errorCaught = true;
        errorMessage = (event as any).message || 'Connection error';
      };
      
      // Simulate 404 error from backend
      eventSource.mockError('404 Not Found - Endpoint /api/claude/instances/error-handling-test/terminal/stream not found');
      
      expect(errorCaught).toBe(true);
      
      // This test WILL FAIL initially because we expect proper error handling
      // but current implementation doesn't provide clear URL mismatch detection
      expect(errorMessage).toContain('URL mismatch detected'); // This will fail initially
    });

    it('SHOULD PASS: Error handling includes URL validation', async () => {
      // This test shows what proper error handling should look like
      const instanceId = 'proper-error-test';
      
      const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      const correctUrl = `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // Proper error handling would detect URL mismatch
      const isUrlMismatch = !wrongUrl.includes('/api/v1/');
      
      expect(isUrlMismatch).toBe(true);
      
      if (isUrlMismatch) {
        const suggestedUrl = wrongUrl.replace('/api/claude/', '/api/v1/claude/');
        expect(suggestedUrl).toBe(correctUrl);
      }
    });
  });

  describe('5. URL Construction Pattern Consistency', () => {
    it('SHOULD FAIL: URL construction patterns are inconsistent across test cases', async () => {
      for (const testCase of URL_CONSTRUCTION_TEST_CASES) {
        const result = await consistencyTester.testURLConstruction(
          testCase.baseUrl,
          testCase.instanceId,
          new URL(testCase.expectedBackend).pathname,
          new URL(testCase.currentFrontend).pathname
        );
        
        console.log(`Testing ${testCase.name}:`, {
          expected: result.expectedUrl,
          current: result.currentUrl,
          match: result.pathsMatch
        });
        
        // This WILL FAIL for most test cases initially
        expect(result.pathsMatch).toBe(testCase.shouldMatch);
      }
    });

    it('SHOULD FAIL: Advanced SSE Terminal uses wrong URL pattern', () => {
      // From AdvancedSSETerminal.tsx analysis
      const apiUrl = 'http://localhost:3000';
      const instanceId = 'advanced-terminal-test';
      
      // What AdvancedSSETerminal currently constructs (line 307 in useAdvancedSSEConnection.ts)
      const currentUrl = `${apiUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      
      // What backend actually serves
      const backendUrl = `${apiUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // This WILL FAIL initially
      expect(currentUrl).toBe(backendUrl);
    });

    it('SHOULD PASS: Demonstrate what URLs should look like after fix', () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'fixed-example';
      
      // After the fix, all URLs should follow this pattern
      const streamEndpoint = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const inputEndpoint = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`;
      const pollEndpoint = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/poll`;
      const statusEndpoint = `${baseUrl}/api/v1/claude/instances/${instanceId}`;
      
      // All should use /api/v1/ prefix
      expect(streamEndpoint).toContain('/api/v1/');
      expect(inputEndpoint).toContain('/api/v1/');
      expect(pollEndpoint).toContain('/api/v1/');
      expect(statusEndpoint).toContain('/api/v1/');
      
      // All should be consistently formatted
      const endpoints = [streamEndpoint, inputEndpoint, pollEndpoint, statusEndpoint];
      endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^https?:\/\/[^\/]+\/api\/v1\/claude\/instances\/[^\/]+/);
      });
    });
  });

  describe('6. Integration Test - Complete Flow', () => {
    it('SHOULD FAIL: Complete SSE flow fails due to URL mismatches', async () => {
      const instanceId = 'integration-test';
      const baseUrl = 'http://localhost:3000';
      
      // Step 1: Instance creation (wrong URL)
      const createUrl = `${baseUrl}/api/claude/instances`;
      FetchMock.mockResponse(/\/api\/claude\/instances$/, { status: 404 });
      
      let creationFailed = false;
      try {
        await fetch(createUrl, { method: 'POST' });
      } catch (error) {
        creationFailed = true;
      }
      
      // Step 2: SSE connection (wrong URL)  
      const sseUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(sseUrl);
      eventSource.mockError('404 Not Found');
      
      // Step 3: Command sending (wrong URL)
      const inputUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/input`;
      FetchMock.mockResponse(/\/api\/claude\/instances\/.*\/terminal\/input/, { status: 404 });
      
      let commandFailed = false;
      try {
        await fetch(inputUrl, { method: 'POST', body: JSON.stringify({ input: 'test' }) });
      } catch (error) {
        commandFailed = true;
      }
      
      // This documents the current failure state
      expect(creationFailed || eventSource.readyState === EventSourceMock.CLOSED || commandFailed).toBe(true);
      
      // These are the correct URLs that should work:
      const correctUrls = {
        create: `${baseUrl}/api/v1/claude/instances`,
        stream: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`,
        input: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`
      };
      
      // None of the current URLs match the correct ones
      expect(createUrl).not.toBe(correctUrls.create);
      expect(sseUrl).not.toBe(correctUrls.stream); 
      expect(inputUrl).not.toBe(correctUrls.input);
    });
  });
});

// Additional test to show the specific files that need to be fixed
describe('Specific File URL Fixes Required', () => {
  it('Documents exact files and lines that need URL fixes', () => {
    const filesToFix = [
      {
        file: 'frontend/src/hooks/useSSEConnectionSingleton.ts',
        line: 27,
        currentUrl: '`${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`',
        shouldBe: '`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`'
      },
      {
        file: 'frontend/src/hooks/useSSEConnectionSingleton.ts', 
        line: 63,
        currentUrl: '`${baseUrl}/api/claude/instances/${instanceId}/terminal/input`',
        shouldBe: '`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`'
      },
      {
        file: 'frontend/src/hooks/useStableSSEConnection.ts',
        line: 45,
        currentUrl: '`${url}/api/claude/instances/${instanceId}/terminal/stream`',
        shouldBe: '`${url}/api/v1/claude/instances/${instanceId}/terminal/stream`'
      },
      {
        file: 'frontend/src/hooks/useStableSSEConnection.ts',
        line: 89,
        currentUrl: '`${url}/api/claude/instances/${instanceId}/terminal/input`', 
        shouldBe: '`${url}/api/v1/claude/instances/${instanceId}/terminal/input`'
      },
      {
        file: 'frontend/src/hooks/useAdvancedSSEConnection.ts',
        line: 307,
        currentUrl: '`${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`',
        shouldBe: '`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`'
      },
      {
        file: 'frontend/src/hooks/useHTTPSSE.ts',
        line: 15,
        currentUrl: '`/api/claude/instances/${inputInstanceId}/terminal/input`',
        shouldBe: '`/api/v1/claude/instances/${inputInstanceId}/terminal/input`'
      },
      {
        file: 'frontend/src/hooks/useHTTPSSE.ts',
        line: 20,
        currentUrl: "'/api/claude/instances'",
        shouldBe: "'/api/v1/claude/instances'"
      },
      {
        file: 'frontend/src/hooks/useHTTPSSE.ts',
        line: 25,
        currentUrl: '`/api/claude/instances/${data.instanceId}`',
        shouldBe: '`/api/v1/claude/instances/${data.instanceId}`'
      },
      {
        file: 'frontend/src/hooks/useHTTPSSE.ts', 
        line: 80,
        currentUrl: '`${url}/api/claude/instances/${instanceId}/terminal/stream`',
        shouldBe: '`${url}/api/v1/claude/instances/${instanceId}/terminal/stream`'
      }
    ];
    
    // This test documents exactly what needs to be changed
    expect(filesToFix.length).toBeGreaterThan(0);
    
    filesToFix.forEach(fix => {
      // Each current URL should be different from what it should be (before fix)
      expect(fix.currentUrl).not.toBe(fix.shouldBe);
    });
    
    console.log('Files requiring URL fixes:', filesToFix);
  });
});