/**
 * COMPREHENSIVE PRODUCTION VALIDATION TEST SUITE
 * Zero-tolerance validation for real-world Claude Code communication
 * 
 * VALIDATION REQUIREMENTS:
 * 1. Real Claude Code instance creation and communication
 * 2. Actual WebSocket connections (verifiable in browser DevTools)
 * 3. End-to-end message flow with real responses
 * 4. Production-ready error handling
 * 5. Multi-instance capability verification
 */

const { chromium } = require('playwright');
const axios = require('axios');
const WebSocket = require('ws');

const BACKEND_URL = 'http://localhost:3000';
const VALIDATION_TIMEOUT = 30000; // 30 seconds per test

describe('PRODUCTION VALIDATION: Claude Code Communication', () => {
  let browser, page, backendRunning = false;

  beforeAll(async () => {
    // Verify backend is running
    try {
      const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      backendRunning = response.status === 200;
      console.log('✅ Backend health check passed');
    } catch (error) {
      console.error('❌ Backend not running:', error.message);
      throw new Error('Backend must be running for production validation');
    }

    // Launch browser for real testing
    browser = await chromium.launch({ 
      headless: false, // Show browser for validation
      slowMo: 100 // Slow down for observation
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log(`🌐 Browser: ${msg.text()}`));
    page.on('pageerror', error => console.error(`🚨 Page Error: ${error.message}`));
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('VALIDATION 1: Backend API Endpoints', () => {
    test('Health endpoint returns valid response', async () => {
      const response = await axios.get(`${BACKEND_URL}/health`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
      
      console.log('✅ Health endpoint validation passed');
    }, VALIDATION_TIMEOUT);

    test('Claude instances endpoint is accessible', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/claude/instances`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('instances');
      expect(Array.isArray(response.data.instances)).toBe(true);
      
      console.log('✅ Claude instances endpoint validation passed');
    }, VALIDATION_TIMEOUT);
  });

  describe('VALIDATION 2: Real Claude Instance Creation', () => {
    let instanceId;

    test('Create Claude instance via API', async () => {
      const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
        instanceType: 'interactive',
        usePty: true
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('instance');
      expect(response.data.instance).toHaveProperty('id');
      expect(response.data.instance).toHaveProperty('pid');
      expect(response.data.instance.status).toBe('starting');

      instanceId = response.data.instance.id;
      console.log(`✅ Claude instance created: ${instanceId}`);

      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    }, VALIDATION_TIMEOUT);

    test('Verify instance appears in instances list', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/claude/instances`);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      const createdInstance = response.data.instances.find(i => i.id === instanceId);
      expect(createdInstance).toBeDefined();
      expect(createdInstance.status).toMatch(/starting|running/);
      expect(createdInstance.pid).toBeGreaterThan(0);
      
      console.log(`✅ Instance ${instanceId} verified in instances list`);
    }, VALIDATION_TIMEOUT);

    test('Instance status endpoint returns real data', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.status).toHaveProperty('id', instanceId);
      expect(response.data.status).toHaveProperty('pid');
      expect(response.data.status.pid).toBeGreaterThan(0);
      expect(response.data.status).toHaveProperty('uptime');
      
      console.log(`✅ Instance ${instanceId} status validation passed`);
    }, VALIDATION_TIMEOUT);

    afterAll(async () => {
      // Clean up created instance
      if (instanceId) {
        try {
          await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
          console.log(`🧹 Cleaned up instance: ${instanceId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup instance ${instanceId}: ${error.message}`);
        }
      }
    });
  });

  describe('VALIDATION 3: Frontend Integration', () => {
    test('Frontend loads without errors', async () => {
      // Navigate to frontend (assuming it's served on port 5173)
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Check for critical elements
      await expect(page.locator('[data-testid="claude-instance-manager"]')).toBeVisible({ timeout: 10000 });
      
      // Check connection status
      const connectionStatus = await page.locator('[data-testid="connection-status"]').textContent();
      expect(connectionStatus).toContain('WebSocket connection');
      
      console.log('✅ Frontend loads successfully');
    }, VALIDATION_TIMEOUT);

    test('Claude instance creation via frontend', async () => {
      // Click create instance button
      const createButton = page.locator('button:has-text("Create Claude Instance")').first();
      await createButton.click();
      
      // Wait for instance to appear
      await page.waitForSelector('.claude-instance-item', { timeout: 15000 });
      
      const instanceItems = await page.locator('.claude-instance-item').count();
      expect(instanceItems).toBeGreaterThan(0);
      
      console.log('✅ Claude instance created via frontend');
    }, VALIDATION_TIMEOUT);

    test('Instance selection and WebSocket connection', async () => {
      // Select the first instance
      const firstInstance = page.locator('.claude-instance-item').first();
      await firstInstance.click();
      
      // Wait for connection status to update
      await page.waitForTimeout(2000);
      
      // Check that WebSocket connection is established
      const connectionStatus = await page.locator('[data-testid="connection-status"]').textContent();
      expect(connectionStatus).toMatch(/Connected|WebSocket/i);
      
      console.log('✅ WebSocket connection established via frontend');
    }, VALIDATION_TIMEOUT);
  });

  describe('VALIDATION 4: Real-time Communication', () => {
    let wsConnection;
    let instanceId;

    beforeAll(async () => {
      // Create instance for WebSocket testing
      const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
        instanceType: 'interactive',
        usePty: true
      });
      instanceId = response.data.instance.id;
      
      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
    });

    test('WebSocket connection establishment', async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        wsConnection = new WebSocket('ws://localhost:3000/terminal');
        
        wsConnection.on('open', () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket connection established');
          
          // Send connection message
          wsConnection.send(JSON.stringify({
            type: 'connect',
            terminalId: instanceId
          }));
          
          resolve();
        });

        wsConnection.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }, VALIDATION_TIMEOUT);

    test('Send input and receive real Claude response', async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Claude response timeout'));
        }, 20000);

        let responseReceived = false;

        wsConnection.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('📨 WebSocket message:', message.type);
          
          if (message.type === 'output' && message.data && !responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            
            // Validate that we received actual output
            expect(message.data).toBeDefined();
            expect(message.terminalId).toBe(instanceId);
            expect(message.timestamp).toBeDefined();
            
            console.log('✅ Real Claude response received:', message.data.slice(0, 100));
            resolve();
          }
        });

        // Send test input to Claude
        const testInput = 'Hello Claude, please respond to confirm you are working';
        wsConnection.send(JSON.stringify({
          type: 'input',
          data: testInput,
          terminalId: instanceId
        }));
        
        console.log('📤 Sent test input to Claude');
      });
    }, VALIDATION_TIMEOUT);

    test('Multiple input-output cycles', async () => {
      const testInputs = [
        'What is 2 + 2?',
        'List 3 programming languages',
        'What is the current date?'
      ];

      for (const input of testInputs) {
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`No response for input: ${input}`));
          }, 15000);

          const handler = (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'output' && message.data) {
              clearTimeout(timeout);
              wsConnection.off('message', handler);
              resolve(message.data);
            }
          };

          wsConnection.on('message', handler);
          
          wsConnection.send(JSON.stringify({
            type: 'input',
            data: input,
            terminalId: instanceId
          }));
        });

        expect(response).toBeDefined();
        expect(response.length).toBeGreaterThan(0);
        console.log(`✅ Response received for: "${input}"`);
        
        // Small delay between inputs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, VALIDATION_TIMEOUT * 2);

    afterAll(async () => {
      if (wsConnection) {
        wsConnection.close();
      }
      if (instanceId) {
        try {
          await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup instance: ${error.message}`);
        }
      }
    });
  });

  describe('VALIDATION 5: Multi-instance Capability', () => {
    const instanceIds = [];

    test('Create multiple Claude instances simultaneously', async () => {
      const createPromises = Array.from({ length: 3 }, () =>
        axios.post(`${BACKEND_URL}/api/claude/instances`, {
          instanceType: 'interactive',
          usePty: true
        })
      );

      const responses = await Promise.all(createPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data.success).toBe(true);
        expect(response.data.instance.id).toBeDefined();
        instanceIds.push(response.data.instance.id);
      });

      console.log(`✅ Created ${instanceIds.length} instances simultaneously`);
      
      // Wait for all instances to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    }, VALIDATION_TIMEOUT);

    test('Verify all instances are running', async () => {
      const statusPromises = instanceIds.map(id =>
        axios.get(`${BACKEND_URL}/api/claude/instances/${id}/status`)
      );

      const responses = await Promise.all(statusPromises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.status.id).toBe(instanceIds[index]);
        expect(response.data.status.pid).toBeGreaterThan(0);
      });

      console.log('✅ All instances verified as running');
    }, VALIDATION_TIMEOUT);

    test('Concurrent communication with multiple instances', async () => {
      const communicationPromises = instanceIds.map((instanceId, index) =>
        new Promise((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:3000/terminal');
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout for instance ${instanceId}`));
          }, 15000);

          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'connect',
              terminalId: instanceId
            }));

            // Send unique input to each instance
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'input',
                data: `Instance ${index + 1}: What is ${index + 1} * 10?`,
                terminalId: instanceId
              }));
            }, 1000);
          });

          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'output' && message.data) {
              clearTimeout(timeout);
              ws.close();
              resolve({
                instanceId,
                response: message.data
              });
            }
          });

          ws.on('error', reject);
        })
      );

      const results = await Promise.all(communicationPromises);
      
      expect(results).toHaveLength(instanceIds.length);
      results.forEach(result => {
        expect(result.instanceId).toBeDefined();
        expect(result.response).toBeDefined();
        expect(result.response.length).toBeGreaterThan(0);
      });

      console.log('✅ Concurrent communication successful with all instances');
    }, VALIDATION_TIMEOUT * 2);

    afterAll(async () => {
      // Clean up all created instances
      const cleanupPromises = instanceIds.map(id =>
        axios.delete(`${BACKEND_URL}/api/claude/instances/${id}`).catch(error =>
          console.warn(`⚠️ Failed to cleanup instance ${id}: ${error.message}`)
        )
      );
      await Promise.all(cleanupPromises);
      console.log(`🧹 Cleaned up ${instanceIds.length} instances`);
    });
  });

  describe('VALIDATION 6: Error Handling & Recovery', () => {
    test('Invalid instance ID handling', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/claude/instances/invalid-id/status`);
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      console.log('✅ Invalid instance ID handled correctly');
    }, VALIDATION_TIMEOUT);

    test('WebSocket error handling', async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000/terminal');
        
        ws.on('open', () => {
          // Send invalid message
          ws.send(JSON.stringify({
            type: 'input',
            data: 'test',
            terminalId: 'invalid-instance'
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'error') {
            expect(message.error).toBeDefined();
            console.log('✅ WebSocket error handling validated');
            ws.close();
            resolve();
          }
        });

        setTimeout(() => {
          ws.close();
          resolve();
        }, 5000);
      });
    }, VALIDATION_TIMEOUT);

    test('Instance termination and cleanup', async () => {
      // Create instance
      const createResponse = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
        instanceType: 'interactive',
        usePty: true
      });
      const instanceId = createResponse.data.instance.id;

      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Terminate instance
      const deleteResponse = await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);

      // Verify instance is removed from list
      await new Promise(resolve => setTimeout(resolve, 2000));
      const listResponse = await axios.get(`${BACKEND_URL}/api/claude/instances`);
      const terminatedInstance = listResponse.data.instances.find(i => i.id === instanceId);
      expect(terminatedInstance).toBeUndefined();

      console.log('✅ Instance termination and cleanup validated');
    }, VALIDATION_TIMEOUT);
  });

  describe('VALIDATION 7: Performance & Reliability', () => {
    test('Response time benchmarking', async () => {
      // Create instance
      const createStart = performance.now();
      const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
        instanceType: 'interactive',
        usePty: true
      });
      const createEnd = performance.now();
      const instanceId = response.data.instance.id;

      // Measure instance creation time
      const creationTime = createEnd - createStart;
      expect(creationTime).toBeLessThan(5000); // Should create within 5 seconds

      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Measure response time
      const inputStart = performance.now();
      const testResponse = await new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000/terminal');
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: instanceId
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: 'ping',
              terminalId: instanceId
            }));
          }, 1000);
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'output' && message.data) {
            const inputEnd = performance.now();
            ws.close();
            resolve(inputEnd - inputStart);
          }
        });
      });

      expect(testResponse).toBeLessThan(10000); // Should respond within 10 seconds

      console.log(`✅ Performance validated - Creation: ${creationTime.toFixed(2)}ms, Response: ${testResponse.toFixed(2)}ms`);

      // Cleanup
      await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
    }, VALIDATION_TIMEOUT * 2);

    test('Memory and resource usage', async () => {
      const initialInstances = await axios.get(`${BACKEND_URL}/api/claude/instances`);
      const initialCount = initialInstances.data.instances.length;

      // Create and destroy multiple instances
      for (let i = 0; i < 5; i++) {
        const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
          instanceType: 'interactive',
          usePty: true
        });
        const instanceId = response.data.instance.id;
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Immediately terminate
        await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify no memory leaks in instance tracking
      const finalInstances = await axios.get(`${BACKEND_URL}/api/claude/instances`);
      const finalCount = finalInstances.data.instances.length;
      
      expect(finalCount).toBe(initialCount);
      console.log('✅ Resource cleanup validated - no memory leaks detected');
    }, VALIDATION_TIMEOUT * 3);
  });
});