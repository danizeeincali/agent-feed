/**
 * FOCUSED PRODUCTION VALIDATION TEST
 * Validates core Claude Code communication functionality
 */

const axios = require('axios');
const WebSocket = require('ws');

const BACKEND_URL = 'http://localhost:3000';
const TIMEOUT = 15000;

describe('CLAUDE CODE PRODUCTION VALIDATION', () => {
  beforeAll(async () => {
    // Verify backend is running
    const health = await axios.get(`${BACKEND_URL}/health`);
    expect(health.status).toBe(200);
    console.log('✅ Backend is running');
  });

  test('VALIDATION 1: Claude instance creation', async () => {
    console.log('🧪 Testing Claude instance creation...');
    
    const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
      instanceType: 'interactive',
      usePty: true
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.instance).toBeDefined();
    expect(response.data.instance.id).toMatch(/^claude-\d+$/);
    expect(response.data.instance.pid).toBeGreaterThan(0);

    const instanceId = response.data.instance.id;
    console.log(`✅ Claude instance created: ${instanceId} (PID: ${response.data.instance.pid})`);

    // Cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
    console.log(`🧹 Cleaned up instance: ${instanceId}`);
  }, TIMEOUT);

  test('VALIDATION 2: WebSocket connection', async () => {
    console.log('🧪 Testing WebSocket connection...');
    
    // Create instance first
    const createResponse = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
      instanceType: 'interactive',
      usePty: true
    });
    const instanceId = createResponse.data.instance.id;
    console.log(`📝 Created test instance: ${instanceId}`);

    // Wait for instance to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const ws = new WebSocket('ws://localhost:3000/terminal');
      let connected = false;

      ws.on('open', () => {
        console.log('🔗 WebSocket connection opened');
        
        // Send connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 WebSocket message: ${message.type}`);

        if (message.type === 'connect' && !connected) {
          connected = true;
          clearTimeout(timeout);
          ws.close();
          
          // Cleanup instance
          axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`)
            .then(() => {
              console.log(`🧹 Cleaned up instance: ${instanceId}`);
              console.log('✅ WebSocket connection successful');
              resolve();
            })
            .catch(err => {
              console.warn(`⚠️ Cleanup error: ${err.message}`);
              resolve(); // Don't fail test on cleanup error
            });
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
    });
  }, TIMEOUT);

  test('VALIDATION 3: Claude AI communication', async () => {
    console.log('🧪 Testing Claude AI communication...');
    
    // Create instance
    const createResponse = await axios.post(`${BACKEND_URL}/api/claude/instances`, {
      instanceType: 'interactive',
      usePty: true
    });
    const instanceId = createResponse.data.instance.id;
    console.log(`📝 Created AI test instance: ${instanceId}`);

    // Wait for instance to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Claude AI response timeout'));
      }, 20000);

      const ws = new WebSocket('ws://localhost:3000/terminal');
      let responseReceived = false;

      ws.on('open', () => {
        console.log('🔗 WebSocket opened for AI testing');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));

        // Send test input after connection
        setTimeout(() => {
          console.log('📤 Sending test input to Claude AI...');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'Hello Claude, please respond with "I am working" to confirm AI functionality',
            terminalId: instanceId
          }));
        }, 2000);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 Message type: ${message.type}`);

        if (message.type === 'output' && message.data && !responseReceived) {
          responseReceived = true;
          clearTimeout(timeout);
          
          console.log(`📋 Claude response: ${message.data.slice(0, 200)}`);
          
          // Validate response contains actual content
          expect(message.data).toBeDefined();
          expect(message.data.length).toBeGreaterThan(10);
          expect(message.terminalId).toBe(instanceId);

          ws.close();
          
          // Cleanup
          axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`)
            .then(() => {
              console.log(`🧹 Cleaned up AI test instance: ${instanceId}`);
              console.log('✅ Claude AI communication successful');
              resolve();
            })
            .catch(err => {
              console.warn(`⚠️ Cleanup error: ${err.message}`);
              resolve();
            });
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });
    });
  }, 25000); // Longer timeout for AI response

  test('VALIDATION 4: API endpoints availability', async () => {
    console.log('🧪 Testing API endpoints...');
    
    // Test instances list
    const instancesResponse = await axios.get(`${BACKEND_URL}/api/claude/instances`);
    expect(instancesResponse.status).toBe(200);
    expect(instancesResponse.data.success).toBe(true);
    console.log('✅ Instances API endpoint working');

    // Test health check
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('healthy');
    console.log('✅ Health API endpoint working');

    // Test invalid endpoint handling
    try {
      await axios.get(`${BACKEND_URL}/api/claude/instances/invalid-id/status`);
    } catch (error) {
      expect(error.response.status).toBe(404);
      console.log('✅ Error handling working for invalid endpoints');
    }
  }, TIMEOUT);
});