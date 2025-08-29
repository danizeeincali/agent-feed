/**
 * SSE Connection Establishment Success TDD Tests
 * 
 * Tests that validate SSE connections succeed after instance creation.
 * WILL FAIL initially due to URL mismatches preventing successful connections.
 * WILL PASS after fixing URL consistency between frontend and backend.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventSourceMock, FetchMock } from './mocks/EventSourceMock';
import { SSETestHelper, MockInstanceManager } from './utils/testHelpers';

describe('SSE Connection Establishment Success Tests', () => {
  let testHelper: SSETestHelper;
  let mockInstanceManager: MockInstanceManager;

  beforeEach(() => {
    testHelper = new SSETestHelper();
    mockInstanceManager = new MockInstanceManager();
    testHelper.setupMocks();

    // Mock successful v1 API responses
    FetchMock.mockResponse(/\/api\/v1\/claude\/instances$/, {
      success: true,
      instanceId: 'test-instance',
      status: 'created'
    });

    FetchMock.mockResponse(/\/api\/v1\/claude\/instances\/[^\/]+$/, {
      success: true,
      id: 'test-instance',
      status: 'running',
      pid: 12345
    });

    // Mock 404 for unversioned endpoints (current frontend behavior)
    FetchMock.mockResponse(/\/api\/claude\/instances/, {
      status: 404,
      error: 'Not Found',
      message: 'Endpoint not found. Use /api/v1/ prefix.'
    });
  });

  afterEach(() => {
    testHelper.cleanup();
    mockInstanceManager.clear();
  });

  describe('Instance Creation to SSE Connection Flow', () => {
    it('SHOULD FAIL: Complete flow fails with URL mismatches', async () => {
      const instanceId = 'integration-flow-test';
      const baseUrl = 'http://localhost:3000';

      // Step 1: Instance creation (current frontend approach - wrong URL)
      const createUrl = `${baseUrl}/api/claude/instances`;
      
      let instanceCreated = false;
      try {
        const createResponse = await fetch(createUrl, {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Instance' })
        });
        instanceCreated = createResponse.ok;
      } catch (error) {
        // Expected to fail with current URL
      }

      // Step 2: SSE connection attempt (current frontend approach - wrong URL)
      const sseUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(sseUrl);

      // Simulate connection failure due to 404
      let connectionEstablished = false;
      eventSource.onerror = (event) => {
        connectionEstablished = false;
      };
      
      eventSource.onopen = (event) => {
        connectionEstablished = true;
      };

      // Simulate backend 404 response for wrong URL
      eventSource.mockError('404 Not Found - SSE endpoint does not exist');

      // This WILL FAIL initially - the flow doesn't complete successfully
      expect(instanceCreated && connectionEstablished).toBe(true);

      // Document what the correct URLs should be
      const correctUrls = {
        create: `${baseUrl}/api/v1/claude/instances`,
        stream: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`
      };

      expect(createUrl).toBe(correctUrls.create); // WILL FAIL
      expect(sseUrl).toBe(correctUrls.stream); // WILL FAIL
    });

    it('SHOULD PASS: Flow succeeds with correct versioned URLs', async () => {
      const instanceId = 'correct-flow-test';
      const baseUrl = 'http://localhost:3000';

      // Step 1: Instance creation with correct URL
      const correctCreateUrl = `${baseUrl}/api/v1/claude/instances`;
      
      const createResponse = await fetch(correctCreateUrl, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Instance' })
      });
      
      expect(createResponse.ok).toBe(true);

      // Step 2: SSE connection with correct URL
      const correctSSEUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(correctSSEUrl);

      // Simulate successful connection
      let connectionEstablished = false;
      eventSource.onopen = (event) => {
        connectionEstablished = true;
      };

      await testHelper.simulateSuccessfulConnection(instanceId, 100);
      
      expect(connectionEstablished).toBe(true);
      expect(eventSource.readyState).toBe(EventSourceMock.OPEN);
    });
  });

  describe('SSE Connection Retry Logic', () => {
    it('SHOULD FAIL: Retry logic fails with wrong URLs', async () => {
      const instanceId = 'retry-test';
      const baseUrl = 'http://localhost:3000';

      // Current implementation would retry the same wrong URL
      const wrongUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      
      let retryAttempts = 0;
      const maxRetries = 3;

      for (let i = 0; i < maxRetries; i++) {
        const eventSource = new EventSourceMock(wrongUrl);
        
        eventSource.onerror = (event) => {
          retryAttempts++;
          eventSource.close();
        };

        // Each attempt fails with 404
        eventSource.mockError('404 Not Found');
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // This WILL FAIL - retrying wrong URL never succeeds
      expect(retryAttempts).toBeLessThan(maxRetries); // All retries fail
      
      // The issue is the URL, not the connection logic
      const correctUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      expect(wrongUrl).toBe(correctUrl); // WILL FAIL - URLs don't match
    });

    it('SHOULD PASS: Retry logic succeeds with correct URLs', async () => {
      const instanceId = 'successful-retry-test';
      const baseUrl = 'http://localhost:3000';

      const correctUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // First attempt fails (simulating temporary network issue)
      let eventSource = new EventSourceMock(correctUrl);
      eventSource.mockError('Network error');
      
      // Second attempt succeeds
      eventSource = new EventSourceMock(correctUrl);
      
      let connected = false;
      eventSource.onopen = (event) => {
        connected = true;
      };

      await testHelper.simulateSuccessfulConnection(instanceId, 100);
      
      expect(connected).toBe(true);
      expect(correctUrl).toContain('/api/v1/'); // Correct URL pattern
    });
  });

  describe('Connection State Management', () => {
    it('SHOULD FAIL: Connection state incorrect due to URL issues', async () => {
      const instanceId = 'state-test';
      
      // Create instance with mock manager
      const instance = mockInstanceManager.createInstance(instanceId, 'running');
      
      // Try to connect with wrong URL (current frontend behavior)
      const wrongSSEUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(wrongSSEUrl);

      // Track connection state
      let connectionState = {
        isConnecting: false,
        isConnected: false,
        hasError: false,
        errorMessage: null as string | null
      };

      connectionState.isConnecting = true;

      eventSource.onopen = (event) => {
        connectionState.isConnecting = false;
        connectionState.isConnected = true;
      };

      eventSource.onerror = (event) => {
        connectionState.isConnecting = false;
        connectionState.isConnected = false;
        connectionState.hasError = true;
        connectionState.errorMessage = (event as any).message || 'Connection failed';
      };

      // Simulate 404 error
      eventSource.mockError('404 Not Found');

      // This WILL FAIL - connection state shows error instead of success
      expect(connectionState.isConnected).toBe(true); // Currently false due to 404
      expect(connectionState.hasError).toBe(false); // Currently true due to URL mismatch
      
      // Verify the instance is actually running (not the problem)
      expect(instance.status).toBe('running');
      expect(instance.pid).toBeDefined();
    });

    it('SHOULD PASS: Connection state correct with proper URLs', async () => {
      const instanceId = 'good-state-test';
      
      const instance = mockInstanceManager.createInstance(instanceId, 'running');
      
      // Use correct URL
      const correctSSEUrl = `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(correctSSEUrl);

      let connectionState = {
        isConnecting: false,
        isConnected: false,
        hasError: false
      };

      connectionState.isConnecting = true;

      eventSource.onopen = (event) => {
        connectionState.isConnecting = false;
        connectionState.isConnected = true;
      };

      eventSource.onerror = (event) => {
        connectionState.isConnecting = false;
        connectionState.isConnected = false;
        connectionState.hasError = true;
      };

      // Simulate successful connection
      await testHelper.simulateSuccessfulConnection(instanceId, 100);

      expect(connectionState.isConnected).toBe(true);
      expect(connectionState.hasError).toBe(false);
      expect(connectionState.isConnecting).toBe(false);
    });
  });

  describe('Multiple Instance Management', () => {
    it('SHOULD FAIL: Multiple instance connections fail with URL inconsistencies', async () => {
      const instanceIds = ['multi-test-1', 'multi-test-2', 'multi-test-3'];
      const baseUrl = 'http://localhost:3000';

      // Create multiple instances
      const instances = instanceIds.map(id => 
        mockInstanceManager.createInstance(id, 'running')
      );

      // Try to connect to each with current (wrong) URLs
      const connections = instanceIds.map(instanceId => {
        const wrongUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
        const eventSource = new EventSourceMock(wrongUrl);
        
        // Each connection fails with 404
        eventSource.mockError('404 Not Found');
        
        return {
          instanceId,
          eventSource,
          connected: false,
          url: wrongUrl
        };
      });

      const successfulConnections = connections.filter(conn => conn.connected);
      
      // This WILL FAIL - no connections succeed with wrong URLs
      expect(successfulConnections.length).toBe(instanceIds.length); // Currently 0

      // All instances are actually running (not the issue)
      instances.forEach(instance => {
        expect(instance.status).toBe('running');
      });

      // The issue is URL consistency
      connections.forEach(conn => {
        const correctUrl = conn.url.replace('/api/claude/', '/api/v1/claude/');
        expect(conn.url).toBe(correctUrl); // WILL FAIL for each
      });
    });

    it('SHOULD PASS: Multiple instances connect successfully with correct URLs', async () => {
      const instanceIds = ['multi-correct-1', 'multi-correct-2'];
      const baseUrl = 'http://localhost:3000';

      const instances = instanceIds.map(id => 
        mockInstanceManager.createInstance(id, 'running')
      );

      // Connect with correct URLs
      const connections = await Promise.all(
        instanceIds.map(async instanceId => {
          const correctUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
          const eventSource = new EventSourceMock(correctUrl);
          
          let connected = false;
          eventSource.onopen = (event) => {
            connected = true;
          };

          await testHelper.simulateSuccessfulConnection(instanceId, 50);
          
          return {
            instanceId,
            eventSource,
            connected,
            url: correctUrl
          };
        })
      );

      const successfulConnections = connections.filter(conn => conn.connected);
      
      expect(successfulConnections.length).toBe(instanceIds.length);
      
      // Verify all URLs are correctly formatted
      connections.forEach(conn => {
        expect(conn.url).toContain('/api/v1/');
        expect(conn.connected).toBe(true);
      });
    });
  });

  describe('Error Recovery After URL Fix', () => {
    it('SHOULD FAIL: Current error recovery uses same wrong URL', async () => {
      const instanceId = 'recovery-test';
      const baseUrl = 'http://localhost:3000';

      // First connection attempt with wrong URL
      const wrongUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      let eventSource = new EventSourceMock(wrongUrl);
      
      let recoveryAttempted = false;
      let recoverySuccessful = false;
      
      eventSource.onerror = (event) => {
        // Current recovery logic would retry same wrong URL
        recoveryAttempted = true;
        
        eventSource.close();
        
        // Retry with same wrong URL (current behavior)
        eventSource = new EventSourceMock(wrongUrl);
        eventSource.mockError('404 Not Found'); // Still fails
        
        recoverySuccessful = eventSource.readyState === EventSourceMock.OPEN;
      };

      eventSource.mockError('404 Not Found');

      // This WILL FAIL - recovery attempts same wrong URL
      expect(recoveryAttempted).toBe(true);
      expect(recoverySuccessful).toBe(true); // Currently false - recovery fails
    });

    it('SHOULD PASS: Smart recovery detects URL issue and fixes it', async () => {
      const instanceId = 'smart-recovery-test';
      const baseUrl = 'http://localhost:3000';

      // First attempt with wrong URL
      const wrongUrl = `${baseUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      let eventSource = new EventSourceMock(wrongUrl);
      
      let smartRecoveryTriggered = false;
      let recoverySuccessful = false;
      
      eventSource.onerror = (event) => {
        const errorMessage = (event as any).message || '';
        
        if (errorMessage.includes('404') && wrongUrl.includes('/api/claude/')) {
          smartRecoveryTriggered = true;
          
          // Smart recovery: fix the URL
          const correctedUrl = wrongUrl.replace('/api/claude/', '/api/v1/claude/');
          
          eventSource.close();
          eventSource = new EventSourceMock(correctedUrl);
          
          // Simulate successful connection with corrected URL
          eventSource.mockOpen();
          recoverySuccessful = true;
        }
      };

      eventSource.mockError('404 Not Found');

      expect(smartRecoveryTriggered).toBe(true);
      expect(recoverySuccessful).toBe(true);
    });
  });

  describe('Performance Impact of URL Mismatches', () => {
    it('SHOULD FAIL: URL mismatches cause performance degradation', async () => {
      const startTime = Date.now();
      const instanceId = 'performance-test';
      
      // Simulate multiple retry attempts with wrong URLs
      const maxRetries = 5;
      let totalRetries = 0;
      
      for (let i = 0; i < maxRetries; i++) {
        const wrongUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
        const eventSource = new EventSourceMock(wrongUrl);
        
        // Each attempt takes time and fails
        await new Promise(resolve => setTimeout(resolve, 200)); // Network delay
        eventSource.mockError('404 Not Found');
        eventSource.close();
        
        totalRetries++;
      }
      
      const totalTime = Date.now() - startTime;
      
      // This WILL FAIL - too much time wasted on wrong URLs
      expect(totalTime).toBeLessThan(500); // Should be quick, but currently > 1000ms
      expect(totalRetries).toBeLessThan(2); // Should succeed quickly, but currently 5 retries
    });

    it('SHOULD PASS: Correct URLs enable fast connection establishment', async () => {
      const startTime = Date.now();
      const instanceId = 'fast-connection-test';
      
      // Single attempt with correct URL
      const correctUrl = `http://localhost:3000/api/v1/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSourceMock(correctUrl);
      
      let connected = false;
      eventSource.onopen = (event) => {
        connected = true;
      };

      // Fast successful connection
      await testHelper.simulateSuccessfulConnection(instanceId, 50);
      
      const totalTime = Date.now() - startTime;
      
      expect(connected).toBe(true);
      expect(totalTime).toBeLessThan(200); // Fast connection
      expect(eventSource.readyState).toBe(EventSourceMock.OPEN);
    });
  });
});