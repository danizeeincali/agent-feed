const { test, expect } = require('@playwright/test');
const WebSocket = require('ws');

/**
 * TDD WEBSOCKET MESSAGE FLOW TESTING
 * 
 * Focus: Deep validation of message bidirectional flow
 * Tests the core issue: Backend showing "No connections for claude-6038" 
 * while frontend believes it's connected
 */

const BACKEND_URL = 'http://localhost:3000';
const WEBSOCKET_URL = 'ws://localhost:3000/terminal';

class MessageFlowTester {
  constructor() {
    this.messageLog = [];
    this.connectionLog = [];
  }

  logMessage(direction, message, metadata = {}) {
    this.messageLog.push({
      direction,
      message,
      metadata,
      timestamp: Date.now()
    });
  }

  logConnection(event, details = {}) {
    this.connectionLog.push({
      event,
      details,
      timestamp: Date.now()
    });
  }

  async createTestInstance(page) {
    const response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    
    this.logConnection('instance_created', { instanceId: data.instance.id });
    return data.instance.id;
  }

  async connectWebSocket(instanceId) {
    const ws = new WebSocket(WEBSOCKET_URL);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.addEventListener('open', () => {
        clearTimeout(timeout);
        this.logConnection('websocket_opened', { instanceId });
        
        // Send connection message immediately
        const connectMsg = {
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        };
        
        this.logMessage('outbound', connectMsg);
        ws.send(JSON.stringify(connectMsg));
        
        resolve(ws);
      });

      ws.addEventListener('error', (error) => {
        clearTimeout(timeout);
        this.logConnection('websocket_error', { error: error.message });
        reject(error);
      });

      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          this.logMessage('inbound', message, { raw: event.data });
        } catch (e) {
          this.logMessage('inbound_invalid', { raw: event.data, error: e.message });
        }
      });

      ws.addEventListener('close', (event) => {
        this.logConnection('websocket_closed', { code: event.code, reason: event.reason });
      });
    });
  }

  async verifyBackendConnection(page, instanceId) {
    // Check if backend recognizes the connection
    const statusResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    
    if (statusResponse.ok()) {
      const status = await statusResponse.json();
      this.logConnection('backend_status_check', status);
      return status;
    } else {
      this.logConnection('backend_status_check_failed', { status: statusResponse.status() });
      return null;
    }
  }

  generateReport() {
    return {
      messageCount: this.messageLog.length,
      connectionEvents: this.connectionLog.length,
      inboundMessages: this.messageLog.filter(m => m.direction === 'inbound').length,
      outboundMessages: this.messageLog.filter(m => m.direction === 'outbound').length,
      connectionLog: this.connectionLog,
      messageLog: this.messageLog,
      summary: this.generateSummary()
    };
  }

  generateSummary() {
    const summary = {
      websocketConnected: this.connectionLog.some(e => e.event === 'websocket_opened'),
      instanceCreated: this.connectionLog.some(e => e.event === 'instance_created'),
      messagesExchanged: this.messageLog.length > 0,
      connectionAcknowledged: this.messageLog.some(m => 
        m.direction === 'inbound' && 
        m.message.type === 'connect'
      ),
      backendStatus: this.connectionLog.filter(e => e.event === 'backend_status_check')
    };
    
    summary.testPassed = summary.websocketConnected && 
                        summary.instanceCreated && 
                        summary.connectionAcknowledged;
    
    return summary;
  }
}

test.describe('TDD WebSocket Message Flow Deep Validation', () => {
  
  test('DIAGNOSIS: Trace complete message flow from connection to acknowledgment', async ({ page }) => {
    test.setTimeout(30000);
    const tester = new MessageFlowTester();

    // Step 1: Create Claude instance
    const instanceId = await tester.createTestInstance(page);
    console.log(`📋 Created test instance: ${instanceId}`);
    
    // Step 2: Wait for instance to be ready
    await page.waitForTimeout(3000);
    
    // Step 3: Check initial backend status
    await tester.verifyBackendConnection(page, instanceId);

    // Step 4: Connect WebSocket with detailed logging
    const ws = await tester.connectWebSocket(instanceId);
    
    // Step 5: Wait for connection acknowledgment
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection acknowledgment timeout'));
      }, 10000);

      const checkForAck = () => {
        const ackReceived = tester.messageLog.some(m => 
          m.direction === 'inbound' && 
          m.message.type === 'connect' &&
          m.message.terminalId === instanceId
        );
        
        if (ackReceived) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkForAck, 100);
        }
      };
      
      checkForAck();
    });

    // Step 6: Verify backend connection status after WebSocket connection
    const finalStatus = await tester.verifyBackendConnection(page, instanceId);
    
    // Step 7: Send a test input to verify full flow
    const testInput = {
      type: 'input',
      data: 'echo "Message flow test"',
      terminalId: instanceId,
      timestamp: Date.now()
    };
    
    tester.logMessage('outbound', testInput);
    ws.send(JSON.stringify(testInput));
    
    // Step 8: Wait for response
    await page.waitForTimeout(5000);
    
    // Step 9: Generate comprehensive report
    const report = tester.generateReport();
    console.log('📊 MESSAGE FLOW ANALYSIS REPORT:');
    console.log(JSON.stringify(report, null, 2));
    
    // Step 10: Validate results
    expect(report.summary.testPassed).toBeTruthy();
    expect(report.inboundMessages).toBeGreaterThan(0);
    expect(report.outboundMessages).toBeGreaterThan(0);
    
    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('ISOLATION: Test WebSocket connection without frontend interference', async ({ page }) => {
    test.setTimeout(30000);
    const tester = new MessageFlowTester();

    // Create instance directly via API (no frontend)
    const instanceId = await tester.createTestInstance(page);
    await page.waitForTimeout(3000);

    // Raw WebSocket connection test
    const ws = new WebSocket(WEBSOCKET_URL);
    let connectionResults = {
      opened: false,
      connectSent: false,
      ackReceived: false,
      backendRecognized: false,
      messagesSent: 0,
      messagesReceived: 0,
      errors: []
    };

    ws.addEventListener('open', () => {
      connectionResults.opened = true;
      console.log('✅ Raw WebSocket opened');
      
      // Send connection message
      const connectMsg = {
        type: 'connect',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(connectMsg));
      connectionResults.connectSent = true;
      connectionResults.messagesSent++;
      console.log(`📤 Connect message sent for ${instanceId}`);
    });

    ws.addEventListener('message', (event) => {
      connectionResults.messagesReceived++;
      try {
        const message = JSON.parse(event.data);
        console.log(`📥 Received message:`, message.type, message.terminalId);
        
        if (message.type === 'connect' && message.terminalId === instanceId) {
          connectionResults.ackReceived = true;
          console.log('✅ Connection acknowledgment received');
        }
      } catch (e) {
        connectionResults.errors.push(`Message parse error: ${e.message}`);
      }
    });

    ws.addEventListener('error', (error) => {
      connectionResults.errors.push(`WebSocket error: ${error.message}`);
      console.error('❌ WebSocket error:', error);
    });

    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check backend connection tracking
    try {
      const statusResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      if (statusResponse.ok()) {
        const status = await statusResponse.json();
        connectionResults.backendRecognized = status.success;
        console.log('📊 Backend status:', status);
      }
    } catch (e) {
      connectionResults.errors.push(`Backend status check failed: ${e.message}`);
    }

    // Send test command
    if (connectionResults.ackReceived) {
      const testCmd = {
        type: 'input',
        data: 'pwd',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(testCmd));
      connectionResults.messagesSent++;
      console.log('📤 Test command sent');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('📊 ISOLATION TEST RESULTS:');
    console.log(JSON.stringify(connectionResults, null, 2));

    // Validate isolated connection
    expect(connectionResults.opened).toBeTruthy();
    expect(connectionResults.connectSent).toBeTruthy();
    expect(connectionResults.messagesSent).toBeGreaterThan(0);
    expect(connectionResults.errors.length).toBe(0);

    // This is the critical test - backend should recognize the connection
    if (!connectionResults.ackReceived) {
      console.error('❌ CRITICAL: Connection acknowledgment not received');
      console.error('This indicates the "No connections" issue');
    }

    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('COMPARISON: Frontend vs Direct WebSocket connection behavior', async ({ page }) => {
    test.setTimeout(45000);

    // Test 1: Direct WebSocket connection
    console.log('🧪 Testing direct WebSocket connection...');
    
    const directTester = new MessageFlowTester();
    const directInstanceId = await directTester.createTestInstance(page);
    await page.waitForTimeout(2000);
    
    const directWs = await directTester.connectWebSocket(directInstanceId);
    await page.waitForTimeout(3000);
    const directReport = directTester.generateReport();
    
    directWs.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${directInstanceId}`);

    console.log('📊 Direct WebSocket Results:', directReport.summary);

    // Test 2: Frontend-mediated connection
    console.log('🧪 Testing frontend-mediated connection...');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const frontendTester = new MessageFlowTester();
    let frontendInstanceId = null;

    // Try to trigger instance creation through frontend
    const launchButton = page.locator('button:has-text("Launch"), button:has-text("Create"), button:has-text("claude")').first();
    
    if (await launchButton.count() > 0) {
      await launchButton.click();
      await page.waitForTimeout(5000);
      
      // Try to detect created instance
      const instancesResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances`);
      if (instancesResponse.ok()) {
        const instancesData = await instancesResponse.json();
        if (instancesData.instances && instancesData.instances.length > 0) {
          frontendInstanceId = instancesData.instances[instancesData.instances.length - 1].id;
          frontendTester.logConnection('frontend_instance_detected', { instanceId: frontendInstanceId });
        }
      }
    }

    // Monitor WebSocket connections in browser
    const webSocketActivity = await page.evaluate(() => {
      return new Promise((resolve) => {
        const activity = { connections: [], messages: [] };
        
        // Override WebSocket constructor to monitor connections
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          const ws = new OriginalWebSocket(url, protocols);
          activity.connections.push({ url, timestamp: Date.now() });
          
          const originalSend = ws.send.bind(ws);
          ws.send = function(data) {
            activity.messages.push({ type: 'sent', data, timestamp: Date.now() });
            return originalSend(data);
          };
          
          ws.addEventListener('message', (event) => {
            activity.messages.push({ type: 'received', data: event.data, timestamp: Date.now() });
          });
          
          return ws;
        };
        
        // Wait and return activity
        setTimeout(() => resolve(activity), 3000);
      });
    });

    const frontendReport = frontendTester.generateReport();
    console.log('📊 Frontend WebSocket Activity:', webSocketActivity);
    console.log('📊 Frontend Connection Results:', frontendReport.summary);

    // Comparison analysis
    const comparison = {
      directConnection: {
        successful: directReport.summary.testPassed,
        messagesExchanged: directReport.messageCount,
        connectionAck: directReport.summary.connectionAcknowledged
      },
      frontendConnection: {
        instanceDetected: frontendInstanceId !== null,
        webSocketActivity: webSocketActivity.connections.length > 0,
        messagesExchanged: webSocketActivity.messages.length,
        connectionAck: webSocketActivity.messages.some(m => {
          try {
            const parsed = JSON.parse(m.data);
            return parsed.type === 'connect';
          } catch (e) {
            return false;
          }
        })
      }
    };

    console.log('📊 CONNECTION COMPARISON:');
    console.log(JSON.stringify(comparison, null, 2));

    // Critical validation: Both should work
    expect(comparison.directConnection.successful).toBeTruthy();
    
    // If frontend instance was created, cleanup
    if (frontendInstanceId) {
      await page.request.delete(`${BACKEND_URL}/api/claude/instances/${frontendInstanceId}`);
    }
  });

  test('DEBUGGING: Real-time connection monitoring', async ({ page }) => {
    test.setTimeout(60000);
    
    const monitor = {
      backendLogs: [],
      webSocketEvents: [],
      instanceStatus: [],
      messageFlow: []
    };

    // Create instance
    const response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instanceData = await response.json();
    const instanceId = instanceData.instance.id;

    console.log(`🔍 Monitoring connection for instance: ${instanceId}`);

    // Step 1: Monitor backend initial state
    const initialStatus = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    monitor.instanceStatus.push({
      step: 'initial',
      status: await initialStatus.json(),
      timestamp: Date.now()
    });

    await page.waitForTimeout(3000);

    // Step 2: Create WebSocket with detailed monitoring
    const ws = new WebSocket(WEBSOCKET_URL);
    let connectionState = 'connecting';

    ws.addEventListener('open', () => {
      connectionState = 'open';
      monitor.webSocketEvents.push({ event: 'open', timestamp: Date.now() });
      
      // Send connect message
      const connectMsg = {
        type: 'connect',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      monitor.messageFlow.push({ direction: 'sent', message: connectMsg, timestamp: Date.now() });
      ws.send(JSON.stringify(connectMsg));
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        monitor.messageFlow.push({ direction: 'received', message, timestamp: Date.now() });
        
        if (message.type === 'connect') {
          console.log('✅ Connection acknowledgment received');
        }
      } catch (e) {
        monitor.messageFlow.push({ 
          direction: 'received', 
          raw: event.data, 
          parseError: e.message, 
          timestamp: Date.now() 
        });
      }
    });

    // Step 3: Wait and periodically check backend state
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      
      const statusCheck = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
      if (statusCheck.ok()) {
        const status = await statusCheck.json();
        monitor.instanceStatus.push({
          step: `check_${i}`,
          status,
          connectionState,
          timestamp: Date.now()
        });
      }
    }

    // Step 4: Send test input and monitor
    if (connectionState === 'open') {
      const testInput = {
        type: 'input',
        data: 'echo "Debug monitoring test"',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      monitor.messageFlow.push({ direction: 'sent', message: testInput, timestamp: Date.now() });
      ws.send(JSON.stringify(testInput));
      
      await page.waitForTimeout(5000);
    }

    // Step 5: Final status check
    const finalStatus = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    monitor.instanceStatus.push({
      step: 'final',
      status: await finalStatus.json(),
      timestamp: Date.now()
    });

    // Generate detailed monitoring report
    console.log('🔍 DETAILED CONNECTION MONITORING REPORT:');
    console.log('Instance Status Timeline:');
    monitor.instanceStatus.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.step}: ${JSON.stringify(entry.status, null, 2)}`);
    });
    
    console.log('WebSocket Events:');
    monitor.webSocketEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event} at ${new Date(event.timestamp).toISOString()}`);
    });
    
    console.log('Message Flow:');
    monitor.messageFlow.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.direction}: ${JSON.stringify(msg.message || msg.raw, null, 2)}`);
    });

    // Validate monitoring results
    const connectMessagesSent = monitor.messageFlow.filter(m => 
      m.direction === 'sent' && m.message?.type === 'connect'
    ).length;
    
    const connectAcksReceived = monitor.messageFlow.filter(m => 
      m.direction === 'received' && m.message?.type === 'connect'
    ).length;

    expect(connectMessagesSent).toBeGreaterThan(0);
    
    // This is the critical test for the reported issue
    if (connectAcksReceived === 0) {
      console.error('❌ CRITICAL ISSUE CONFIRMED: No connection acknowledgments received');
      console.error('This confirms the "No connections for claude-xxxx" backend issue');
    } else {
      console.log('✅ Connection acknowledgments received correctly');
    }

    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });
});