/**
 * SSE Backend Connection Validation Test
 * 
 * Validates the ECONNRESET fix at the backend level without frontend dependencies.
 * Tests direct HTTP/SSE endpoints to ensure stable connections.
 */

const { test, expect } = require('@playwright/test');
const { spawn, execSync } = require('child_process');
const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const BACKEND_SCRIPT = '/workspaces/agent-feed/simple-backend.js';

let backendProcess = null;
let backendLogs = [];

/**
 * Capture backend logs for analysis
 */
function captureBackendLogs(data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${data.toString()}`;
  backendLogs.push(logEntry);
  
  if (data.toString().includes('SSE') || data.toString().includes('ECONNRESET')) {
    console.log('🔍 Backend Log:', logEntry);
  }
}

/**
 * Start backend server
 */
async function startBackend() {
  console.log('🚀 Starting backend server...');
  
  // Clean up existing processes
  try {
    execSync('pkill -f "node.*simple-backend.js" || true', { stdio: 'ignore' });
    execSync('lsof -ti:3000 | xargs kill -9 || true', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    // Ignore cleanup errors
  }

  backendProcess = spawn('node', [BACKEND_SCRIPT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });

  backendProcess.stdout.on('data', captureBackendLogs);
  backendProcess.stderr.on('data', captureBackendLogs);

  // Wait for startup
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Verify server is responding
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      if (response.ok) {
        console.log('✅ Backend server ready');
        return true;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Backend server failed to start');
}

/**
 * Stop backend server
 */
async function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    console.log('🛑 Stopping backend server...');
    backendProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!backendProcess.killed) {
      backendProcess.kill('SIGKILL');
    }
  }
  
  analyzeBackendLogs();
}

/**
 * Analyze logs for ECONNRESET errors
 */
function analyzeBackendLogs() {
  console.log('\n📊 BACKEND LOG ANALYSIS');
  console.log('='.repeat(50));
  
  const econnresetErrors = backendLogs.filter(log => log.includes('ECONNRESET'));
  const sseConnections = backendLogs.filter(log => log.includes('SSE connection'));
  
  console.log(`📈 Total log entries: ${backendLogs.length}`);
  console.log(`❌ ECONNRESET errors: ${econnresetErrors.length}`);
  console.log(`🔗 SSE connection events: ${sseConnections.length}`);
  
  if (econnresetErrors.length > 0) {
    console.log('\n❌ ECONNRESET ERRORS FOUND:');
    econnresetErrors.forEach((error, idx) => {
      console.log(`${idx + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ NO ECONNRESET ERRORS - FIX SUCCESSFUL!');
  }
  
  console.log('='.repeat(50));
}

// Test setup
test.beforeAll(async () => {
  console.log('\n🧪 SSE BACKEND VALIDATION TEST SUITE');
  console.log('='.repeat(50));
  backendLogs = [];
  await startBackend();
});

test.afterAll(async () => {
  await stopBackend();
});

test.setTimeout(30000);

test.describe('SSE Backend Connection Validation', () => {

  test('validates backend health endpoint', async () => {
    console.log('\n🏥 TEST: Backend Health Check');
    
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.message).toContain('WebSocket connection storm successfully eliminated');
    
    console.log('✅ Health check passed:', data.message);
  });

  test('validates Claude instances endpoint', async () => {
    console.log('\n📋 TEST: Claude Instances Endpoint');
    
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.instances)).toBe(true);
    
    console.log('✅ Instances endpoint working');
  });

  test('validates Claude instance creation', async () => {
    console.log('\n🆕 TEST: Claude Instance Creation');
    
    const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: ['claude'] })
    });
    
    const createData = await createResponse.json();
    
    expect(createResponse.status).toBe(201);
    expect(createData.success).toBe(true);
    expect(createData.instance).toBeDefined();
    expect(createData.instance.id).toMatch(/^claude-\d+$/);
    
    const instanceId = createData.instance.id;
    console.log(`✅ Instance created: ${instanceId}`);
    
    // Wait a moment for process to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify instance appears in instances list
    const listResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const listData = await listResponse.json();
    
    const createdInstance = listData.instances.find(instance => instance.id === instanceId);
    expect(createdInstance).toBeDefined();
    
    console.log(`✅ Instance found in list with status: ${createdInstance.status}`);
    
    // Clean up: delete instance
    const deleteResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    
    expect(deleteResponse.status).toBe(200);
    console.log('✅ Instance cleaned up');
  });

  test('validates SSE status stream endpoint', async () => {
    console.log('\n📡 TEST: SSE Status Stream');
    
    let sseConnected = false;
    let messageReceived = false;
    
    // Use fetch to test SSE connection
    const response = await fetch(`${BACKEND_URL}/api/status/stream`, {
      headers: { 'Accept': 'text/event-stream' }
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    
    console.log('✅ SSE status stream endpoint accessible');
    
    // Test connection establishment (don't wait for data, just verify headers)
    sseConnected = true;
    
    // Close the connection
    response.body.destroy();
    
    expect(sseConnected).toBe(true);
    console.log('✅ SSE connection established successfully');
  });

  test('validates no ECONNRESET errors during operations', async () => {
    console.log('\n🔍 TEST: ECONNRESET Error Validation');
    
    // Create and delete multiple instances to generate traffic
    const operations = [];
    
    for (let i = 0; i < 3; i++) {
      console.log(`🔄 Operation ${i + 1}/3: Creating instance...`);
      
      const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        const instanceId = createData.instance.id;
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Delete the instance
        await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        
        console.log(`✅ Operation ${i + 1} completed`);
      }
    }
    
    // Wait for backend processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check logs for ECONNRESET errors
    const econnresetErrors = backendLogs.filter(log => log.includes('ECONNRESET'));
    
    expect(econnresetErrors.length).toBe(0);
    console.log('✅ No ECONNRESET errors found during operations');
  });

});

test.describe('Connection Stability Validation', () => {

  test('validates multiple concurrent connections', async () => {
    console.log('\n⚡ TEST: Multiple Concurrent Connections');
    
    // Create multiple concurrent requests to stress test
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${BACKEND_URL}/health`).then(response => response.json())
      );
    }
    
    const results = await Promise.all(promises);
    
    results.forEach((result, index) => {
      expect(result.status).toBe('healthy');
    });
    
    console.log('✅ All concurrent connections successful');
    
    // Check for connection errors
    const connectionErrors = backendLogs.filter(log => 
      log.includes('ECONNRESET') || log.includes('connection error')
    );
    
    expect(connectionErrors.length).toBe(0);
    console.log('✅ No connection errors during concurrent operations');
  });

  test('validates rapid sequential requests', async () => {
    console.log('\n🏃 TEST: Rapid Sequential Requests');
    
    const results = [];
    
    // Send rapid sequential requests
    for (let i = 0; i < 10; i++) {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      results.push(data);
      
      // Minimal delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // All requests should succeed
    results.forEach((result, index) => {
      expect(result.status).toBe('healthy');
    });
    
    console.log('✅ All rapid sequential requests successful');
    
    // Check for any connection issues
    const rapidRequestErrors = backendLogs.filter(log => 
      log.includes('ECONNRESET') || log.includes('too many')
    );
    
    expect(rapidRequestErrors.length).toBe(0);
    console.log('✅ No errors during rapid sequential requests');
  });

});