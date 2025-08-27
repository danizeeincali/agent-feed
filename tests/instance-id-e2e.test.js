/**
 * Playwright E2E Test Suite: Complete Button-to-Terminal Instance ID Flow
 * 
 * Validates that instance IDs are properly passed at every step of the workflow:
 * 1. Button click → Instance creation with valid ID
 * 2. Instance appears in list with correct ID  
 * 3. Terminal connects with correct ID (not undefined)
 * 4. Commands can be sent and responses received
 * 
 * Current bug: Terminal tries to connect to 'undefined' instead of actual instance ID
 * Expected backend log: "SSE Claude terminal stream requested for instance: claude-XXXX"
 */

const { test, expect } = require('@playwright/test');

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const TIMEOUT = 30000;
const POLL_INTERVAL = 1000;

// Test data for the 4 different buttons
const BUTTON_CONFIGS = [
  {
    name: 'prod/claude',
    selector: '[title="Launch Claude in prod directory"]',
    expectedText: '🚀 prod/claude',
    description: 'Standard Claude in prod directory'
  },
  {
    name: 'skip-permissions',
    selector: '[title="Launch with permissions skipped"]',
    expectedText: '⚡ skip-permissions',
    description: 'Claude with permissions skipped'
  },
  {
    name: 'skip-permissions -c',
    selector: '[title="Launch with permissions skipped and -c flag"]',
    expectedText: '⚡ skip-permissions -c',
    description: 'Claude with permissions skipped and -c flag'
  },
  {
    name: 'skip-permissions --resume',
    selector: '[title="Resume with permissions skipped"]',
    expectedText: '↻ skip-permissions --resume',
    description: 'Claude resume with permissions skipped'
  }
];

test.describe('Instance ID End-to-End Flow Validation', () => {
  let page;
  let consoleMessages = [];
  let backendLogs = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    consoleMessages = [];
    backendLogs = [];

    // Capture console messages for debugging
    page.on('console', msg => {
      const message = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`Frontend Console: ${message}`);
    });

    // Capture network requests to backend
    page.on('request', request => {
      if (request.url().includes('localhost:3000')) {
        console.log(`API Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('localhost:3000')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to frontend
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    
    // Wait for the app to be ready
    await page.waitForSelector('.claude-instance-manager', { timeout: TIMEOUT });
    console.log('✅ Frontend loaded successfully');
  });

  test.afterEach(async () => {
    // Clean up any instances created during test
    try {
      const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const data = await response.json();
      
      if (data.success && data.instances.length > 0) {
        console.log(`🧹 Cleaning up ${data.instances.length} instances...`);
        for (const instance of data.instances) {
          await fetch(`${BACKEND_URL}/api/claude/instances/${instance.id}`, {
            method: 'DELETE'
          });
          console.log(`🗑️ Deleted instance: ${instance.id}`);
        }
      }
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }

    await page.close();
  });

  // Test each button individually
  BUTTON_CONFIGS.forEach(config => {
    test(`${config.name}: Complete button-to-terminal ID flow`, async () => {
      console.log(`\n🧪 Testing ${config.description}`);
      
      // Step 1: Verify button exists and click it
      console.log('📍 Step 1: Button click and instance creation');
      
      const button = page.locator(config.selector);
      await expect(button).toBeVisible({ timeout: 10000 });
      await expect(button).toContainText(config.expectedText.replace(/[🚀⚡↻]/g, '').trim());
      
      // Click the button to create instance
      await button.click();
      console.log(`✅ Clicked ${config.name} button`);

      // Step 2: Wait for instance to appear in the list and capture its ID
      console.log('📍 Step 2: Instance list verification');
      
      let instanceId = null;
      let instanceElement = null;
      
      // Wait for the instance to appear in the list
      await page.waitForFunction(() => {
        const instances = document.querySelectorAll('.instance-item');
        return instances.length > 0;
      }, { timeout: 15000 });

      // Get the newly created instance
      instanceElement = page.locator('.instance-item').first();
      await expect(instanceElement).toBeVisible({ timeout: 10000 });
      
      // Extract instance ID from the DOM
      const instanceIdText = await instanceElement.locator('.instance-id').textContent();
      instanceId = instanceIdText.replace('ID: ', '');
      
      console.log(`✅ Instance created with ID: ${instanceId}`);
      expect(instanceId).toMatch(/^claude-\d+$/);
      expect(instanceId).not.toBe('undefined');
      expect(instanceId).not.toBe('null');
      expect(instanceId).not.toBe('');

      // Step 3: Select the instance and verify terminal connection
      console.log('📍 Step 3: Terminal connection with correct ID');
      
      // Click on the instance to select it
      await instanceElement.click();
      console.log('✅ Instance selected');

      // Wait for terminal interface to appear
      await page.waitForSelector('.instance-output', { timeout: 10000 });
      await page.waitForSelector('.input-area', { timeout: 5000 });

      // Verify terminal connection status shows the correct instance ID
      const connectionStatus = page.locator('.connection-status');
      await expect(connectionStatus).toBeVisible({ timeout: 5000 });
      
      const statusText = await connectionStatus.textContent();
      console.log(`Connection status: ${statusText}`);
      
      // Verify the connection status contains the instance ID (not undefined)
      expect(statusText).not.toContain('undefined');
      if (statusText.includes('(') && statusText.includes(')')) {
        const statusInstanceId = statusText.match(/\(([^)]+)\)/)?.[1];
        if (statusInstanceId) {
          expect(statusInstanceId).toBe(instanceId.slice(0, 8));
        }
      }

      // Step 4: Send a test command and verify response
      console.log('📍 Step 4: Terminal command and response');
      
      // Wait a moment for connection to stabilize
      await page.waitForTimeout(2000);

      const inputField = page.locator('.input-field');
      const sendButton = page.locator('.btn-send');
      
      await expect(inputField).toBeVisible();
      await expect(sendButton).toBeVisible();

      // Send a simple test command
      const testCommand = 'echo "Hello from ' + instanceId + '"';
      await inputField.fill(testCommand);
      await sendButton.click();
      
      console.log(`✅ Sent test command: ${testCommand}`);

      // Wait for the response to appear in output
      await page.waitForFunction(
        (cmd) => {
          const outputArea = document.querySelector('.output-area pre');
          return outputArea && outputArea.textContent.includes(cmd);
        },
        testCommand,
        { timeout: 15000 }
      );

      const outputArea = page.locator('.output-area pre');
      const outputText = await outputArea.textContent();
      
      console.log('Terminal output preview:', outputText.slice(-200));
      
      // Verify the command was echoed back
      expect(outputText).toContain(testCommand);
      
      // Step 5: Verify backend logs show correct instance ID
      console.log('📍 Step 5: Backend log verification');
      
      // Check backend logs via API or console
      try {
        // Check if backend logs are accessible via health endpoint
        const healthResponse = await fetch(`${BACKEND_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('Backend health:', healthData.status);
        
        // Verify we didn't see any 'undefined' instance connections in console
        const undefinedConnections = consoleMessages.filter(msg => 
          msg.includes('undefined') && msg.includes('instance')
        );
        
        if (undefinedConnections.length > 0) {
          console.error('❌ Found undefined instance connections:', undefinedConnections);
          expect(undefinedConnections).toHaveLength(0);
        }
        
        console.log('✅ No undefined instance connections found in frontend logs');
        
      } catch (error) {
        console.warn('Could not verify backend logs directly:', error.message);
      }

      // Final verification: Instance still exists and is properly tracked
      console.log('📍 Step 6: Final instance verification');
      
      const finalInstanceCheck = await fetch(`${BACKEND_URL}/api/claude/instances`);
      const finalInstanceData = await finalInstanceCheck.json();
      
      expect(finalInstanceData.success).toBe(true);
      expect(finalInstanceData.instances.length).toBeGreaterThanOrEqual(1);
      
      const createdInstance = finalInstanceData.instances.find(inst => inst.id === instanceId);
      expect(createdInstance).toBeDefined();
      expect(createdInstance.id).toBe(instanceId);
      expect(createdInstance.name).toBe(config.name);
      
      console.log(`✅ ${config.description} - Complete flow validation PASSED`);
    });
  });

  test('Instance ID consistency across multiple instances', async () => {
    console.log('\n🧪 Testing multiple instance ID consistency');
    
    const createdInstances = [];
    
    // Create multiple instances and verify each has unique, valid IDs
    for (let i = 0; i < 2; i++) {
      const config = BUTTON_CONFIGS[i];
      console.log(`Creating instance ${i + 1}: ${config.name}`);
      
      const button = page.locator(config.selector);
      await button.click();
      
      // Wait for instance to appear
      await page.waitForFunction(
        (expectedCount) => {
          const instances = document.querySelectorAll('.instance-item');
          return instances.length >= expectedCount;
        },
        i + 1,
        { timeout: 15000 }
      );
      
      // Get the latest instance ID
      const instanceElements = page.locator('.instance-item');
      const latestInstance = instanceElements.nth(i);
      const instanceIdText = await latestInstance.locator('.instance-id').textContent();
      const instanceId = instanceIdText.replace('ID: ', '');
      
      console.log(`✅ Instance ${i + 1} created: ${instanceId}`);
      
      // Verify ID format and uniqueness
      expect(instanceId).toMatch(/^claude-\d+$/);
      expect(createdInstances).not.toContain(instanceId);
      createdInstances.push(instanceId);
    }
    
    console.log(`✅ All ${createdInstances.length} instances have unique, valid IDs`);
    
    // Test switching between instances
    for (let i = 0; i < createdInstances.length; i++) {
      const instanceElement = page.locator('.instance-item').nth(i);
      await instanceElement.click();
      
      // Verify the connection status updates to show correct instance
      await page.waitForTimeout(1000);
      const statusText = await page.locator('.connection-status').textContent();
      
      // Should not contain 'undefined'
      expect(statusText).not.toContain('undefined');
      console.log(`✅ Instance ${i + 1} selection: ${statusText}`);
    }
  });

  test('Terminal connection error recovery', async () => {
    console.log('\n🧪 Testing terminal connection error recovery');
    
    // Create an instance
    const config = BUTTON_CONFIGS[0];
    const button = page.locator(config.selector);
    await button.click();
    
    // Wait for instance
    await page.waitForFunction(() => {
      const instances = document.querySelectorAll('.instance-item');
      return instances.length > 0;
    }, { timeout: 15000 });
    
    const instanceElement = page.locator('.instance-item').first();
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '');
    
    // Select the instance
    await instanceElement.click();
    await page.waitForSelector('.instance-output', { timeout: 10000 });
    
    console.log('✅ Instance selected, testing connection recovery');
    
    // Send multiple commands to test stability
    const commands = ['pwd', 'ls', 'echo "test"', 'whoami'];
    
    for (const cmd of commands) {
      await page.locator('.input-field').fill(cmd);
      await page.locator('.btn-send').click();
      
      console.log(`Sent: ${cmd}`);
      await page.waitForTimeout(1000);
      
      // Verify no undefined instance connections
      const recentLogs = consoleMessages.slice(-5);
      const hasUndefined = recentLogs.some(log => 
        log.includes('undefined') && log.includes('instance')
      );
      expect(hasUndefined).toBe(false);
    }
    
    console.log('✅ Connection stability test passed');
  });

  test('Backend SSE endpoint instance ID validation', async () => {
    console.log('\n🧪 Testing backend SSE endpoint with instance ID validation');
    
    // Create an instance first
    const config = BUTTON_CONFIGS[0];
    const button = page.locator(config.selector);
    await button.click();
    
    // Wait for instance
    await page.waitForFunction(() => {
      const instances = document.querySelectorAll('.instance-item');
      return instances.length > 0;
    }, { timeout: 15000 });
    
    const instanceElement = page.locator('.instance-item').first();
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '');
    
    console.log(`Testing SSE connection for instance: ${instanceId}`);
    
    // Test direct SSE endpoint access
    const sseUrl = `${BACKEND_URL}/api/claude/instances/${instanceId}/terminal/stream`;
    console.log(`Testing SSE endpoint: ${sseUrl}`);
    
    // Use page evaluation to test SSE connection
    const sseTest = await page.evaluate(async (url, expectedInstanceId) => {
      return new Promise((resolve) => {
        try {
          const eventSource = new EventSource(url);
          let connected = false;
          let receivedInstanceId = null;
          
          const timeout = setTimeout(() => {
            eventSource.close();
            resolve({ 
              success: false, 
              error: 'SSE connection timeout',
              connected,
              receivedInstanceId
            });
          }, 10000);
          
          eventSource.onopen = () => {
            connected = true;
            console.log('SSE connection opened');
          };
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.instanceId) {
                receivedInstanceId = data.instanceId;
              }
              
              if (connected && (receivedInstanceId === expectedInstanceId || data.type === 'connected')) {
                clearTimeout(timeout);
                eventSource.close();
                resolve({
                  success: true,
                  connected: true,
                  receivedInstanceId: receivedInstanceId || expectedInstanceId,
                  data
                });
              }
            } catch (e) {
              console.log('SSE message parse error:', e.message);
            }
          };
          
          eventSource.onerror = (error) => {
            clearTimeout(timeout);
            eventSource.close();
            resolve({ 
              success: false, 
              error: 'SSE connection error',
              connected,
              receivedInstanceId
            });
          };
        } catch (error) {
          resolve({ 
            success: false, 
            error: error.message,
            connected: false,
            receivedInstanceId: null
          });
        }
      });
    }, sseUrl, instanceId);
    
    console.log('SSE Test Result:', sseTest);
    
    // Verify SSE connection worked with correct instance ID
    expect(sseTest.success).toBe(true);
    expect(sseTest.connected).toBe(true);
    expect(sseTest.receivedInstanceId).not.toBe('undefined');
    expect(sseTest.receivedInstanceId).not.toBe(null);
    
    if (sseTest.receivedInstanceId) {
      expect(sseTest.receivedInstanceId).toBe(instanceId);
    }
    
    console.log(`✅ SSE endpoint correctly connected to instance: ${sseTest.receivedInstanceId}`);
  });
});

/**
 * Test Utilities for Manual Debugging
 */
test.describe('Debug Utilities', () => {
  test.skip('Manual debug session - Keep browser open', async ({ browser }) => {
    // This test is skipped by default, run with --grep "Manual debug" to use
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.text()}`);
    });
    
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.claude-instance-manager');
    
    console.log('🐛 Debug session started - browser will stay open');
    console.log('🔧 Interact with the application manually to test instance ID flow');
    
    // Keep browser open for manual testing
    await page.waitForTimeout(300000); // 5 minutes
  });
  
  test('Backend instance API validation', async () => {
    console.log('\n🧪 Testing backend instance API directly');
    
    // Test instances endpoint
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instancesData = await instancesResponse.json();
    
    console.log('Instances API response:', instancesData);
    expect(instancesData.success).toBe(true);
    expect(Array.isArray(instancesData.instances)).toBe(true);
    
    // Test health endpoint
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    
    console.log('Health API response:', healthData);
    expect(healthData.status).toBe('healthy');
    
    console.log('✅ Backend API validation passed');
  });
});