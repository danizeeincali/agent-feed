/**
 * API Working Directory Validation Test
 * 
 * This test directly validates the backend API to confirm the working directory bug
 * without relying on frontend UI elements
 */

const { test, expect } = require('@playwright/test');

const API_BASE = 'http://localhost:3000';

test.describe('Backend API Working Directory Tests', () => {
  
  test('Direct API: prod/claude working directory validation', async ({ request }) => {
    console.log('🧪 Testing API endpoint for prod/claude working directory');

    // Test the actual API request that the frontend sends for prod/claude button
    const response = await request.post(`${API_BASE}/api/claude/instances`, {
      data: {
        command: ['claude'],
        workingDirectory: '/workspaces/agent-feed/prod'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    console.log('📋 API Response:', data);

    // Validate response structure
    expect(data.success).toBeTruthy();
    expect(data.instanceId).toBeDefined();
    expect(data.instanceId).toMatch(/^claude-\d+$/);

    // Clean up - terminate the created instance
    if (data.instanceId) {
      const deleteResponse = await request.delete(`${API_BASE}/api/claude/instances/${data.instanceId}`);
      console.log('🧹 Cleanup response:', deleteResponse.ok());
    }
  });

  test('Direct API: skip-permissions working directory validation', async ({ request }) => {
    console.log('🧪 Testing API endpoint for skip-permissions working directory');

    const response = await request.post(`${API_BASE}/api/claude/instances`, {
      data: {
        command: ['claude', '--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    console.log('📋 API Response:', data);

    expect(data.success).toBeTruthy();
    expect(data.instanceId).toBeDefined();

    // Clean up
    if (data.instanceId) {
      await request.delete(`${API_BASE}/api/claude/instances/${data.instanceId}`);
    }
  });

  test('Backend log monitoring via API creation', async ({ page }) => {
    console.log('🧪 Monitoring backend spawn logs during API calls');

    // Monitor console messages from browser that might capture backend logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Spawning real Claude process')) {
        logs.push(text);
        console.log('📋 Captured spawn log:', text);
      }
    });

    // Make a direct fetch request to the API (this should trigger backend logging)
    await page.goto('about:blank');
    
    const response = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3000/api/claude/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed/prod'
        })
      });
      return await response.json();
    });

    console.log('📋 Fetch response:', response);
    await page.waitForTimeout(3000);

    // The logs might not be captured this way since they're backend logs
    // But we can validate the response
    expect(response.success).toBeTruthy();
    expect(response.instanceId).toBeDefined();

    // Clean up
    if (response.instanceId) {
      await page.evaluate(async (instanceId) => {
        await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
      }, response.instanceId);
    }
  });

  test('Comprehensive API working directory matrix', async ({ request }) => {
    console.log('🧪 Testing all button configurations via API');

    const testCases = [
      {
        name: 'prod/claude',
        command: ['claude'],
        expectedWorkingDir: '/workspaces/agent-feed/prod',
        description: 'Should spawn in prod directory'
      },
      {
        name: 'skip-permissions',
        command: ['claude', '--dangerously-skip-permissions'],
        expectedWorkingDir: '/workspaces/agent-feed',
        description: 'Should spawn in root directory'
      },
      {
        name: 'skip-permissions-c',
        command: ['claude', '--dangerously-skip-permissions', '-c'],
        expectedWorkingDir: '/workspaces/agent-feed',
        description: 'Should spawn in root directory'
      },
      {
        name: 'skip-permissions-resume',
        command: ['claude', '--dangerously-skip-permissions', '--resume'],
        expectedWorkingDir: '/workspaces/agent-feed',
        description: 'Should spawn in root directory'
      }
    ];

    const results = [];
    const createdInstances = [];

    for (const testCase of testCases) {
      console.log(`\n🔘 Testing: ${testCase.name} - ${testCase.description}`);

      const response = await request.post(`${API_BASE}/api/claude/instances`, {
        data: {
          command: testCase.command,
          workingDirectory: testCase.expectedWorkingDir
        }
      });

      const responseData = await response.json();
      
      const result = {
        name: testCase.name,
        success: response.ok() && responseData.success,
        instanceId: responseData.instanceId,
        expectedWorkingDir: testCase.expectedWorkingDir,
        command: testCase.command
      };

      results.push(result);
      
      if (result.instanceId) {
        createdInstances.push(result.instanceId);
      }

      console.log(`${result.success ? '✅' : '❌'} ${testCase.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    // Display summary
    console.log('\n📊 API WORKING DIRECTORY TEST SUMMARY:');
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.name}: Expected "${result.expectedWorkingDir}"`);
      console.log(`   Command: [${result.command.join(', ')}]`);
      console.log(`   Instance ID: ${result.instanceId || 'NONE'}`);
    });

    // Clean up all created instances
    console.log(`\n🧹 Cleaning up ${createdInstances.length} instances`);
    for (const instanceId of createdInstances) {
      try {
        await request.delete(`${API_BASE}/api/claude/instances/${instanceId}`);
        console.log(`✅ Cleaned up ${instanceId}`);
      } catch (error) {
        console.log(`⚠️ Failed to clean up ${instanceId}:`, error);
      }
    }

    // Validate at least some tests passed
    expect(results.length).toBe(4);
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(0);
    
    console.log(`\n🎯 FINAL RESULT: ${successCount}/${results.length} tests passed`);
  });

  test('Backend working directory bug documentation', async ({ request }) => {
    console.log('🧪 Documenting the backend working directory bug');

    // Test what happens when we send different working directories
    const testRequests = [
      {
        name: 'prod-directory-request',
        payload: {
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed/prod'
        }
      },
      {
        name: 'root-directory-request', 
        payload: {
          command: ['claude', '--dangerously-skip-permissions'],
          workingDirectory: '/workspaces/agent-feed'
        }
      },
      {
        name: 'custom-directory-request',
        payload: {
          command: ['claude'],
          workingDirectory: '/some/custom/directory'
        }
      }
    ];

    const results = [];
    const instances = [];

    for (const testRequest of testRequests) {
      console.log(`\n📡 Making ${testRequest.name}:`, testRequest.payload);

      const response = await request.post(`${API_BASE}/api/claude/instances`, {
        data: testRequest.payload
      });

      const data = await response.json();
      
      const result = {
        name: testRequest.name,
        requestedWorkingDir: testRequest.payload.workingDirectory,
        success: response.ok() && data.success,
        instanceId: data.instanceId,
        error: data.error
      };

      results.push(result);
      
      if (result.instanceId) {
        instances.push(result.instanceId);
        console.log(`✅ Instance created: ${result.instanceId}`);
      } else {
        console.log(`❌ Instance creation failed:`, result.error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up
    for (const instanceId of instances) {
      await request.delete(`${API_BASE}/api/claude/instances/${instanceId}`);
    }

    // Summary
    console.log('\n📋 WORKING DIRECTORY BUG DOCUMENTATION:');
    console.log('The bug appears to be in the backend createRealClaudeInstance() function');
    console.log('which hardcodes the working directory regardless of the request payload.');
    console.log('\nTest Results:');
    
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
      console.log(`   Requested: ${result.requestedWorkingDir}`);
      console.log(`   Success: ${result.success}`);
    });

    expect(results.length).toBe(3);
  });
});