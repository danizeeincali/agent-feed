import { test, expect, Page } from '@playwright/test';

/**
 * Claude Instance API End-to-End Tests
 *
 * MISSION: Validate Claude instance API endpoints and real integration
 *
 * This test suite validates:
 * 1. /api/claude-instances endpoint functionality
 * 2. Instance creation and lifecycle management
 * 3. Real messaging API integration
 * 4. Error handling without mock responses
 */

test.describe('Claude Instance API Integration Tests', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:3000';

  // API endpoints to test
  const API_ENDPOINTS = {
    instances: '/api/claude-instances',
    createInstance: '/api/claude-instances',
    getInstance: (id: string) => `/api/claude-instances/${id}`,
    sendMessage: (id: string) => `/api/claude-instances/${id}/message`,
    deleteInstance: (id: string) => `/api/claude-instances/${id}`
  };

  let createdInstanceIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    createdInstanceIds = [];

    // Monitor API calls
    page.on('response', response => {
      if (response.url().includes('/api/claude-instances')) {
        console.log(`API Call: ${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created instances
    for (const instanceId of createdInstanceIds) {
      try {
        await page.request.delete(`${BACKEND_URL}${API_ENDPOINTS.deleteInstance(instanceId)}`);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
  });

  test('Claude Instances Endpoint - Basic Connectivity Test', async ({ page }) => {
    console.log('🚀 Testing Claude Instances Endpoint Basic Connectivity');

    // Test 1: GET /api/claude-instances
    const response = await page.request.get(`${BACKEND_URL}${API_ENDPOINTS.instances}`);

    console.log(`GET /api/claude-instances - Status: ${response.status()}`);

    // Should respond with 200 OK
    expect(response.status()).toBe(200);

    // Should return JSON
    const responseData = await response.json();
    expect(responseData).toBeDefined();
    console.log(`Response data:`, responseData);

    // Should be an array or object with instances
    expect(typeof responseData).toBe('object');

    console.log('✅ Claude instances endpoint connectivity verified');
  });

  test('Instance Creation API Test', async ({ page }) => {
    console.log('🚀 Testing Instance Creation API');

    // Test creating a new instance
    const createInstanceData = {
      name: 'test-instance-' + Date.now(),
      type: 'avi-dm',
      configuration: {
        personality: 'helpful',
        temperature: 0.7
      }
    };

    const createResponse = await page.request.post(`${BACKEND_URL}${API_ENDPOINTS.createInstance}`, {
      data: createInstanceData
    });

    console.log(`POST /api/claude-instances - Status: ${createResponse.status()}`);

    // Should successfully create instance
    expect([200, 201].includes(createResponse.status())).toBe(true);

    if (createResponse.status() === 200 || createResponse.status() === 201) {
      const responseData = await createResponse.json();
      console.log('Instance created:', responseData);

      // Should return instance data
      expect(responseData).toBeDefined();
      expect(responseData.id || responseData._id || responseData.instanceId).toBeDefined();

      const instanceId = responseData.id || responseData._id || responseData.instanceId;
      createdInstanceIds.push(instanceId);

      // Test getting the created instance
      const getInstance = await page.request.get(`${BACKEND_URL}${API_ENDPOINTS.getInstance(instanceId)}`);

      if (getInstance.status() === 200) {
        const instanceData = await getInstance.json();
        console.log('Retrieved instance:', instanceData);
        expect(instanceData).toBeDefined();
      }

      console.log('✅ Instance creation API test passed');
    } else {
      console.log('⚠️ Instance creation returned non-success status, but API is responding');
    }
  });

  test('Messaging API Integration Test', async ({ page }) => {
    console.log('🚀 Testing Messaging API Integration');

    // First, navigate to frontend to ensure instance creation
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM to potentially create instance
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(2000);
    }

    // Test direct API messaging
    const testMessages = [
      'Hello, API test',
      'How are you?',
      'Can you help me with coding?'
    ];

    for (const message of testMessages) {
      console.log(`Testing message: "${message}"`);

      // Try different instance ID formats
      const testInstanceIds = ['default', 'avi-dm', 'test-instance'];

      for (const instanceId of testInstanceIds) {
        try {
          const messageResponse = await page.request.post(
            `${BACKEND_URL}${API_ENDPOINTS.sendMessage(instanceId)}`,
            {
              data: { message }
            }
          );

          console.log(`Message API for ${instanceId}: ${messageResponse.status()}`);

          if (messageResponse.status() === 200) {
            const messageData = await messageResponse.json();
            console.log(`Response:`, messageData);

            // Verify response is not a mock
            const responseText = JSON.stringify(messageData).toLowerCase();
            const mockPatterns = ['mock response', 'available soon', 'settimeout', 'simulate'];

            for (const pattern of mockPatterns) {
              expect(responseText).not.toContain(pattern);
            }

            console.log('✅ Real API response received');
            break; // Found working instance
          }
        } catch (error) {
          console.log(`Message API error for ${instanceId}:`, error);
        }
      }
    }
  });

  test('Frontend API Integration - Live Testing', async ({ page }) => {
    console.log('🚀 Testing Frontend API Integration Live');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    let apiCallsMade = 0;
    let apiResponsesReceived = 0;

    // Monitor API calls from frontend
    page.on('request', request => {
      if (request.url().includes('/api/claude-instances')) {
        apiCallsMade++;
        console.log(`Frontend API Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/claude-instances')) {
        apiResponsesReceived++;
        console.log(`Frontend API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to Avi DM
    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(3000);

      // Send messages to trigger API calls
      const messageInput = page.locator('textarea, input');
      if (await messageInput.count() > 0) {
        const messages = ['frontend api test 1', 'frontend api test 2'];

        for (const message of messages) {
          await messageInput.first().fill(message);
          await messageInput.first().press('Enter');
          await page.waitForTimeout(3000);
        }
      }
    }

    // Verify API integration
    console.log(`API Calls Made: ${apiCallsMade}`);
    console.log(`API Responses Received: ${apiResponsesReceived}`);

    // Should have made at least one API call
    expect(apiCallsMade).toBeGreaterThanOrEqual(1);

    console.log('✅ Frontend API integration test completed');
  });

  test('API Error Handling - Real Error Scenarios', async ({ page }) => {
    console.log('🚀 Testing API Error Handling');

    // Test 1: Invalid endpoint
    const invalidResponse = await page.request.get(`${BACKEND_URL}/api/claude-instances/invalid-id-12345`);
    console.log(`Invalid ID request status: ${invalidResponse.status()}`);

    // Should return proper HTTP error (404, 400, etc.)
    expect([400, 404, 500].includes(invalidResponse.status())).toBe(true);

    // Test 2: Malformed request data
    const malformedResponse = await page.request.post(`${BACKEND_URL}${API_ENDPOINTS.createInstance}`, {
      data: { invalid: 'data structure' }
    });
    console.log(`Malformed request status: ${malformedResponse.status()}`);

    // Test 3: Frontend error handling
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Intercept and force API errors
    await page.route('**/api/claude-instances**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    const aviDmTab = page.locator('text="Avi DM"');
    if (await aviDmTab.count() > 0) {
      await aviDmTab.click();
      await page.waitForTimeout(2000);

      // Try to send message during API error
      const messageInput = page.locator('textarea, input');
      if (await messageInput.count() > 0) {
        await messageInput.first().fill('error test message');
        await messageInput.first().press('Enter');
        await page.waitForTimeout(3000);

        // Check for proper error handling in UI
        const errorElements = page.locator('.error, [data-error], .alert, .notification');
        const errorCount = await errorElements.count();

        if (errorCount > 0) {
          console.log(`Found ${errorCount} error UI elements`);

          // Verify error messages don't contain mock patterns
          for (let i = 0; i < errorCount; i++) {
            const errorText = await errorElements.nth(i).textContent();
            if (errorText) {
              expect(errorText.toLowerCase()).not.toContain('mock');
              expect(errorText.toLowerCase()).not.toContain('simulate');
            }
          }
        }
      }
    }

    // Clear route interception
    await page.unroute('**/api/claude-instances**');

    console.log('✅ API error handling test completed');
  });

  test('Instance Lifecycle Management Test', async ({ page }) => {
    console.log('🚀 Testing Instance Lifecycle Management');

    // Test complete lifecycle: Create -> Use -> Delete

    // Step 1: Create instance
    const instanceData = {
      name: 'lifecycle-test-' + Date.now(),
      type: 'avi-dm'
    };

    const createResponse = await page.request.post(`${BACKEND_URL}${API_ENDPOINTS.createInstance}`, {
      data: instanceData
    });

    if (createResponse.status() === 200 || createResponse.status() === 201) {
      const created = await createResponse.json();
      const instanceId = created.id || created._id || created.instanceId;

      if (instanceId) {
        createdInstanceIds.push(instanceId);
        console.log(`Created instance: ${instanceId}`);

        // Step 2: Use instance (send message)
        const messageResponse = await page.request.post(
          `${BACKEND_URL}${API_ENDPOINTS.sendMessage(instanceId)}`,
          {
            data: { message: 'lifecycle test message' }
          }
        );

        console.log(`Message response status: ${messageResponse.status()}`);

        // Step 3: Retrieve instance status
        const statusResponse = await page.request.get(`${BACKEND_URL}${API_ENDPOINTS.getInstance(instanceId)}`);
        console.log(`Status check response: ${statusResponse.status()}`);

        // Step 4: Delete instance
        const deleteResponse = await page.request.delete(`${BACKEND_URL}${API_ENDPOINTS.deleteInstance(instanceId)}`);
        console.log(`Delete response status: ${deleteResponse.status()}`);

        if (deleteResponse.status() === 200 || deleteResponse.status() === 204) {
          // Remove from cleanup list since it's already deleted
          createdInstanceIds = createdInstanceIds.filter(id => id !== instanceId);

          // Step 5: Verify instance is deleted
          const verifyDeleteResponse = await page.request.get(`${BACKEND_URL}${API_ENDPOINTS.getInstance(instanceId)}`);
          console.log(`Verify delete status: ${verifyDeleteResponse.status()}`);
          expect([404, 410].includes(verifyDeleteResponse.status())).toBe(true);
        }
      }
    }

    console.log('✅ Instance lifecycle management test completed');
  });

  test('Concurrent API Requests Test', async ({ page }) => {
    console.log('🚀 Testing Concurrent API Requests');

    // Test multiple simultaneous API calls
    const promises = [];

    // Create multiple requests
    for (let i = 0; i < 5; i++) {
      const promise = page.request.get(`${BACKEND_URL}${API_ENDPOINTS.instances}`);
      promises.push(promise);
    }

    // Wait for all requests to complete
    const responses = await Promise.all(promises);

    // Verify all responses
    responses.forEach((response, index) => {
      console.log(`Concurrent request ${index + 1} status: ${response.status()}`);
      expect(response.status()).toBe(200);
    });

    // Test concurrent message sending
    if (createdInstanceIds.length > 0) {
      const instanceId = createdInstanceIds[0];
      const messagePromises = [];

      for (let i = 0; i < 3; i++) {
        const messagePromise = page.request.post(
          `${BACKEND_URL}${API_ENDPOINTS.sendMessage(instanceId)}`,
          {
            data: { message: `concurrent test message ${i + 1}` }
          }
        );
        messagePromises.push(messagePromise);
      }

      const messageResponses = await Promise.all(messagePromises);
      messageResponses.forEach((response, index) => {
        console.log(`Concurrent message ${index + 1} status: ${response.status()}`);
      });
    }

    console.log('✅ Concurrent API requests test completed');
  });

  test('API Performance Benchmarking', async ({ page }) => {
    console.log('🚀 Testing API Performance');

    const performanceMetrics = {
      getInstance: [] as number[],
      sendMessage: [] as number[],
      listInstances: [] as number[]
    };

    // Benchmark GET /api/claude-instances
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const response = await page.request.get(`${BACKEND_URL}${API_ENDPOINTS.instances}`);
      const endTime = Date.now();

      if (response.status() === 200) {
        performanceMetrics.listInstances.push(endTime - startTime);
      }
    }

    // Benchmark instance messaging (if instances exist)
    const testInstanceIds = ['default', 'test', 'avi-dm'];
    for (const instanceId of testInstanceIds) {
      const startTime = Date.now();
      const response = await page.request.post(
        `${BACKEND_URL}${API_ENDPOINTS.sendMessage(instanceId)}`,
        {
          data: { message: 'performance test' }
        }
      );
      const endTime = Date.now();

      if (response.status() === 200) {
        performanceMetrics.sendMessage.push(endTime - startTime);
        break; // Found working instance
      }
    }

    // Calculate averages
    const avgListTime = performanceMetrics.listInstances.reduce((a, b) => a + b, 0) / performanceMetrics.listInstances.length || 0;
    const avgMessageTime = performanceMetrics.sendMessage.reduce((a, b) => a + b, 0) / performanceMetrics.sendMessage.length || 0;

    console.log(`📊 API Performance Metrics:`);
    console.log(`  List Instances: ${avgListTime.toFixed(0)}ms avg`);
    console.log(`  Send Message: ${avgMessageTime.toFixed(0)}ms avg`);

    // Performance expectations
    expect(avgListTime).toBeLessThan(5000); // 5 seconds max for list
    if (avgMessageTime > 0) {
      expect(avgMessageTime).toBeLessThan(30000); // 30 seconds max for message
    }

    console.log('✅ API performance benchmarking completed');
  });
});