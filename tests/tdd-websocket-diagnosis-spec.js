const { test, expect } = require('@playwright/test');
const WebSocket = require('ws');

/**
 * TDD WEBSOCKET DIAGNOSIS & DEBUGGING TESTS
 * 
 * FOCUS: Specific diagnosis of the reported issue:
 * - Backend: "No connections for claude-6038" 
 * - Frontend: WebSocket not receiving Claude Code responses
 * - Need to verify actual connection vs expected connection
 */

const BACKEND_URL = 'http://localhost:3000';
const WEBSOCKET_URL = 'ws://localhost:3000/terminal';

class ConnectionDiagnostic {
  constructor() {
    this.diagnosticData = {
      backendStatus: [],
      webSocketEvents: [],
      messageFlow: [],
      connectionStates: [],
      errors: []
    };
  }

  logBackendStatus(step, data) {
    this.diagnosticData.backendStatus.push({
      step,
      data,
      timestamp: Date.now()
    });
  }

  logWebSocketEvent(event, details) {
    this.diagnosticData.webSocketEvents.push({
      event,
      details,
      timestamp: Date.now()
    });
  }

  logMessage(direction, message, metadata = {}) {
    this.diagnosticData.messageFlow.push({
      direction,
      message,
      metadata,
      timestamp: Date.now()
    });
  }

  logConnectionState(state, details) {
    this.diagnosticData.connectionStates.push({
      state,
      details,
      timestamp: Date.now()
    });
  }

  logError(error, context) {
    this.diagnosticData.errors.push({
      error: error.message || error,
      context,
      timestamp: Date.now()
    });
  }

  generateDiagnosticReport() {
    const report = {
      summary: {
        backendStatusChecks: this.diagnosticData.backendStatus.length,
        webSocketEvents: this.diagnosticData.webSocketEvents.length,
        messagesExchanged: this.diagnosticData.messageFlow.length,
        connectionStateChanges: this.diagnosticData.connectionStates.length,
        errors: this.diagnosticData.errors.length
      },
      analysis: this.analyzeProblem(),
      rawData: this.diagnosticData,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  analyzeProblem() {
    const analysis = {
      webSocketConnectionEstablished: this.diagnosticData.webSocketEvents.some(e => e.event === 'open'),
      connectMessageSent: this.diagnosticData.messageFlow.some(m => 
        m.direction === 'outbound' && m.message.type === 'connect'
      ),
      connectAcknowledgmentReceived: this.diagnosticData.messageFlow.some(m => 
        m.direction === 'inbound' && m.message.type === 'connect'
      ),
      backendRecognizesConnection: this.diagnosticData.backendStatus.some(s => 
        s.data && s.data.success === true
      ),
      errorsEncountered: this.diagnosticData.errors.length > 0
    };

    // Identify the specific problem
    if (analysis.webSocketConnectionEstablished && analysis.connectMessageSent && !analysis.connectAcknowledgmentReceived) {
      analysis.problemIdentified = 'BACKEND_NOT_PROCESSING_CONNECT';
      analysis.description = 'WebSocket connects but backend does not acknowledge connection messages';
    } else if (!analysis.webSocketConnectionEstablished) {
      analysis.problemIdentified = 'WEBSOCKET_CONNECTION_FAILED';
      analysis.description = 'WebSocket connection could not be established';
    } else if (analysis.connectAcknowledgmentReceived && !analysis.backendRecognizesConnection) {
      analysis.problemIdentified = 'BACKEND_CONNECTION_TRACKING_ISSUE';
      analysis.description = 'Backend acknowledges connection but does not track it properly';
    } else {
      analysis.problemIdentified = 'UNKNOWN_ISSUE';
      analysis.description = 'Issue does not match known patterns';
    }

    return analysis;
  }

  generateRecommendations() {
    const analysis = this.analyzeProblem();
    const recommendations = [];

    switch (analysis.problemIdentified) {
      case 'BACKEND_NOT_PROCESSING_CONNECT':
        recommendations.push('Check backend WebSocket message handler for connect type processing');
        recommendations.push('Verify instance ID matching in backend connection tracking');
        recommendations.push('Check for message parsing errors in backend logs');
        break;
      
      case 'WEBSOCKET_CONNECTION_FAILED':
        recommendations.push('Verify WebSocket server is running on port 3000');
        recommendations.push('Check for firewall or network connectivity issues');
        recommendations.push('Validate WebSocket URL format');
        break;
      
      case 'BACKEND_CONNECTION_TRACKING_ISSUE':
        recommendations.push('Review backend connection storage mechanisms');
        recommendations.push('Check for race conditions in connection tracking');
        recommendations.push('Verify instance creation and connection timing');
        break;
      
      default:
        recommendations.push('Enable detailed logging in both frontend and backend');
        recommendations.push('Run tests with network monitoring tools');
        recommendations.push('Check for version compatibility issues');
    }

    return recommendations;
  }
}

test.describe('TDD WebSocket Connection Diagnosis', () => {
  
  test('DIAGNOSIS: Reproduce "No connections for claude-6038" issue', async ({ page }) => {
    test.setTimeout(60000);
    const diagnostic = new ConnectionDiagnostic();

    // Step 1: Create Claude instance and capture backend state
    diagnostic.logConnectionState('creating_instance', {});
    
    const createResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: {
        instanceType: 'interactive',
        usePty: true
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const instanceData = await createResponse.json();
    const instanceId = instanceData.instance.id;

    diagnostic.logBackendStatus('instance_created', instanceData);
    diagnostic.logConnectionState('instance_created', { instanceId });

    console.log(`🔍 Diagnosing connection for instance: ${instanceId}`);

    // Step 2: Wait for instance to initialize
    await page.waitForTimeout(3000);

    // Step 3: Check initial backend connection state
    const initialStatusResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    if (initialStatusResponse.ok()) {
      const initialStatus = await initialStatusResponse.json();
      diagnostic.logBackendStatus('initial_status_check', initialStatus);
    }

    // Step 4: Create WebSocket connection with detailed logging
    const ws = new WebSocket(WEBSOCKET_URL);
    
    ws.addEventListener('open', () => {
      diagnostic.logWebSocketEvent('open', { url: WEBSOCKET_URL });
      diagnostic.logConnectionState('websocket_opened', {});
      console.log('✅ WebSocket connection opened');
    });

    ws.addEventListener('error', (error) => {
      diagnostic.logWebSocketEvent('error', { error: error.message });
      diagnostic.logError(error, 'websocket_connection');
      console.error('❌ WebSocket error:', error);
    });

    ws.addEventListener('close', (event) => {
      diagnostic.logWebSocketEvent('close', { code: event.code, reason: event.reason });
      console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        diagnostic.logMessage('inbound', message, { raw: event.data });
        console.log('📥 Received message:', message.type, message.terminalId);
      } catch (e) {
        diagnostic.logError(e, 'message_parsing');
        diagnostic.logMessage('inbound_invalid', { raw: event.data });
      }
    });

    // Step 5: Wait for WebSocket to open
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket open timeout')), 10000);
      
      if (ws.readyState === WebSocket.OPEN) {
        clearTimeout(timeout);
        resolve();
      } else {
        ws.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.addEventListener('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      }
    });

    // Step 6: Send connect message and monitor backend response
    const connectMessage = {
      type: 'connect',
      terminalId: instanceId,
      timestamp: Date.now()
    };

    diagnostic.logMessage('outbound', connectMessage);
    ws.send(JSON.stringify(connectMessage));
    console.log(`📤 Sent connect message for ${instanceId}`);

    // Step 7: Monitor for connect acknowledgment with timeout
    let connectAckReceived = false;
    const connectAckPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Connect acknowledgment timeout - this indicates the reported issue');
        resolve(false);
      }, 10000);

      const messageHandler = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'connect' && message.terminalId === instanceId) {
            clearTimeout(timeout);
            connectAckReceived = true;
            console.log('✅ Connect acknowledgment received');
            resolve(true);
          }
        } catch (e) {
          // Continue waiting
        }
      };

      ws.addEventListener('message', messageHandler);
    });

    const ackResult = await connectAckPromise;
    diagnostic.logConnectionState('connect_ack_result', { received: ackResult });

    // Step 8: Check backend connection state after connect message
    await page.waitForTimeout(2000);
    const postConnectStatusResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    if (postConnectStatusResponse.ok()) {
      const postConnectStatus = await postConnectStatusResponse.json();
      diagnostic.logBackendStatus('post_connect_status', postConnectStatus);
    }

    // Step 9: Test actual message sending to reproduce the full issue
    if (connectAckReceived) {
      console.log('🧪 Testing message sending to connected instance...');
      
      const testMessage = {
        type: 'input',
        data: 'echo "Connection diagnosis test"',
        terminalId: instanceId,
        timestamp: Date.now()
      };

      diagnostic.logMessage('outbound', testMessage);
      ws.send(JSON.stringify(testMessage));
      console.log('📤 Sent test message');

      // Wait for response
      await page.waitForTimeout(5000);
    } else {
      console.error('❌ ISSUE CONFIRMED: No connect acknowledgment received');
      console.error('This confirms the "No connections for claude-xxxx" issue');
    }

    // Step 10: Final backend connection check
    const finalStatusResponse = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    if (finalStatusResponse.ok()) {
      const finalStatus = await finalStatusResponse.json();
      diagnostic.logBackendStatus('final_status', finalStatus);
    }

    // Step 11: Generate comprehensive diagnostic report
    const diagnosticReport = diagnostic.generateDiagnosticReport();
    
    console.log('🔍 DIAGNOSTIC REPORT:');
    console.log(JSON.stringify(diagnosticReport, null, 2));

    // Step 12: Save diagnostic report for analysis
    const fs = require('fs');
    const path = require('path');
    const reportDir = path.join(__dirname, '../test-results');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(reportDir, `websocket-diagnosis-${instanceId}.json`),
      JSON.stringify(diagnosticReport, null, 2)
    );

    // Step 13: Validate diagnostic results
    expect(diagnosticReport.analysis.webSocketConnectionEstablished).toBeTruthy();
    expect(diagnosticReport.analysis.connectMessageSent).toBeTruthy();

    // This is the critical test - if this fails, we've reproduced the issue
    if (!diagnosticReport.analysis.connectAcknowledgmentReceived) {
      console.error('❌ CRITICAL ISSUE REPRODUCED: Backend not processing connect messages');
      console.error('Problem identified:', diagnosticReport.analysis.problemIdentified);
      console.error('Recommendations:', diagnosticReport.recommendations);
    } else {
      console.log('✅ Connection flow working correctly');
    }

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });

  test('DIAGNOSIS: Compare working vs non-working connection patterns', async ({ page }) => {
    test.setTimeout(60000);

    const workingPattern = new ConnectionDiagnostic();
    const problematicPattern = new ConnectionDiagnostic();

    // Test Pattern 1: Ideal connection flow
    console.log('🧪 Testing ideal connection pattern...');
    
    const workingInstanceResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const workingInstanceData = await workingInstanceResponse.json();
    const workingInstanceId = workingInstanceData.instance.id;

    await page.waitForTimeout(2000);

    // Working WebSocket connection
    const workingWs = new WebSocket(WEBSOCKET_URL);
    
    workingWs.addEventListener('open', () => {
      workingPattern.logWebSocketEvent('open', {});
      
      // Send connect message immediately on open
      const connectMsg = {
        type: 'connect',
        terminalId: workingInstanceId,
        timestamp: Date.now()
      };
      
      workingPattern.logMessage('outbound', connectMsg);
      workingWs.send(JSON.stringify(connectMsg));
    });

    workingWs.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        workingPattern.logMessage('inbound', message);
      } catch (e) {
        workingPattern.logError(e, 'working_message_parse');
      }
    });

    // Wait for working connection
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test Pattern 2: Problematic connection flow (simulate issues)
    console.log('🧪 Testing problematic connection pattern...');
    
    const problematicInstanceResponse = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const problematicInstanceData = await problematicInstanceResponse.json();
    const problematicInstanceId = problematicInstanceData.instance.id;

    await page.waitForTimeout(2000);

    // Problematic WebSocket connection (delayed connect message)
    const problematicWs = new WebSocket(WEBSOCKET_URL);
    
    problematicWs.addEventListener('open', () => {
      problematicPattern.logWebSocketEvent('open', {});
      
      // Delay connect message to simulate timing issues
      setTimeout(() => {
        const connectMsg = {
          type: 'connect',
          terminalId: problematicInstanceId,
          timestamp: Date.now()
        };
        
        problematicPattern.logMessage('outbound', connectMsg);
        problematicWs.send(JSON.stringify(connectMsg));
      }, 3000); // 3 second delay
    });

    problematicWs.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        problematicPattern.logMessage('inbound', message);
      } catch (e) {
        problematicPattern.logError(e, 'problematic_message_parse');
      }
    });

    // Wait for both patterns to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Generate comparison report
    const workingReport = workingPattern.generateDiagnosticReport();
    const problematicReport = problematicPattern.generateDiagnosticReport();

    const comparison = {
      working: {
        connectAckReceived: workingReport.analysis.connectAcknowledgmentReceived,
        messagesExchanged: workingReport.summary.messagesExchanged,
        errors: workingReport.summary.errors,
        problemType: workingReport.analysis.problemIdentified
      },
      problematic: {
        connectAckReceived: problematicReport.analysis.connectAcknowledgmentReceived,
        messagesExchanged: problematicReport.summary.messagesExchanged,
        errors: problematicReport.summary.errors,
        problemType: problematicReport.analysis.problemIdentified
      }
    };

    console.log('📊 CONNECTION PATTERN COMPARISON:');
    console.log(JSON.stringify(comparison, null, 2));

    // Analysis: Identify differences that might cause the reported issue
    const differences = {
      connectAckDifference: comparison.working.connectAckReceived !== comparison.problematic.connectAckReceived,
      errorDifference: comparison.working.errors !== comparison.problematic.errors,
      messageFlowDifference: Math.abs(comparison.working.messagesExchanged - comparison.problematic.messagesExchanged) > 0
    };

    if (differences.connectAckDifference) {
      console.error('❌ CONNECTION ACK DIFFERENCE DETECTED');
      console.error('This indicates timing or message processing issues');
    }

    if (differences.errorDifference) {
      console.error('❌ ERROR COUNT DIFFERENCE DETECTED');
      console.error('Problematic pattern has more errors');
    }

    expect(workingReport.analysis.webSocketConnectionEstablished).toBeTruthy();
    expect(problematicReport.analysis.webSocketConnectionEstablished).toBeTruthy();

    // Cleanup
    workingWs.close();
    problematicWs.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${workingInstanceId}`);
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${problematicInstanceId}`);
  });

  test('DIAGNOSIS: Backend WebSocket connection tracking verification', async ({ page }) => {
    test.setTimeout(45000);

    // This test specifically checks if the backend is properly tracking WebSocket connections
    console.log('🔍 Diagnosing backend WebSocket connection tracking...');

    const diagnostic = new ConnectionDiagnostic();

    // Create instance
    const response = await page.request.post(`${BACKEND_URL}/api/claude/instances`, {
      data: { instanceType: 'interactive', usePty: true }
    });
    const instanceData = await response.json();
    const instanceId = instanceData.instance.id;

    await page.waitForTimeout(2000);

    // Connect WebSocket
    const ws = new WebSocket(WEBSOCKET_URL);
    
    let connectionEvents = {
      websocketOpened: false,
      connectMessageSent: false,
      backendResponseReceived: false,
      inputMessageSent: false,
      backendProcessedInput: false
    };

    ws.addEventListener('open', () => {
      connectionEvents.websocketOpened = true;
      diagnostic.logConnectionState('websocket_opened', { instanceId });
      console.log('✅ WebSocket opened, sending connect message...');
      
      const connectMsg = {
        type: 'connect',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(connectMsg));
      connectionEvents.connectMessageSent = true;
      diagnostic.logMessage('outbound', connectMsg);
      console.log(`📤 Connect message sent for ${instanceId}`);
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        diagnostic.logMessage('inbound', message);
        
        if (message.type === 'connect') {
          connectionEvents.backendResponseReceived = true;
          console.log('✅ Backend connect response received');
        }
        
        if (message.type === 'output' || message.type === 'terminal_output') {
          connectionEvents.backendProcessedInput = true;
          console.log('✅ Backend processed input and returned output');
        }
      } catch (e) {
        diagnostic.logError(e, 'message_parsing');
      }
    });

    // Wait for initial connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!connectionEvents.websocketOpened) {
          reject(new Error('WebSocket connection failed'));
        } else {
          resolve();
        }
      }, 5000);

      if (ws.readyState === WebSocket.OPEN) {
        clearTimeout(timeout);
        resolve();
      } else {
        ws.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });

    // Wait for backend to process connect message
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if backend recognizes the connection
    console.log('🔍 Checking if backend recognizes WebSocket connection...');
    
    const statusCheck = await page.request.get(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    const statusData = await statusCheck.json();
    diagnostic.logBackendStatus('connection_status_check', statusData);

    // The critical test: Send input and see if backend processes it
    if (connectionEvents.backendResponseReceived) {
      console.log('🧪 Testing input processing through established connection...');
      
      const inputMessage = {
        type: 'input',
        data: 'echo "Backend connection test"',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(inputMessage));
      connectionEvents.inputMessageSent = true;
      diagnostic.logMessage('outbound', inputMessage);
      console.log('📤 Test input sent to backend');
      
      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 8000));
    } else {
      console.error('❌ Backend connect response not received - cannot test input processing');
    }

    // Final analysis
    console.log('📊 BACKEND CONNECTION TRACKING ANALYSIS:');
    console.log('Connection Events:', connectionEvents);

    const trackingIssues = [];
    
    if (!connectionEvents.websocketOpened) {
      trackingIssues.push('WebSocket connection failed');
    }
    
    if (connectionEvents.connectMessageSent && !connectionEvents.backendResponseReceived) {
      trackingIssues.push('Backend not responding to connect messages');
    }
    
    if (connectionEvents.inputMessageSent && !connectionEvents.backendProcessedInput) {
      trackingIssues.push('Backend not processing input messages');
    }

    if (trackingIssues.length > 0) {
      console.error('❌ BACKEND TRACKING ISSUES IDENTIFIED:');
      trackingIssues.forEach((issue, index) => {
        console.error(`  ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ Backend connection tracking appears to be working');
    }

    // Generate final diagnostic report
    const finalReport = diagnostic.generateDiagnosticReport();
    finalReport.connectionEvents = connectionEvents;
    finalReport.trackingIssues = trackingIssues;

    // Save detailed report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '../test-results/backend-tracking-diagnosis.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

    // Critical assertions
    expect(connectionEvents.websocketOpened).toBeTruthy();
    expect(connectionEvents.connectMessageSent).toBeTruthy();
    
    // This assertion will reveal the core issue
    if (!connectionEvents.backendResponseReceived) {
      console.error('❌ CORE ISSUE IDENTIFIED: Backend not responding to WebSocket connect messages');
      console.error('This is the root cause of "No connections for claude-xxxx"');
    }

    // Cleanup
    ws.close();
    await page.request.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
  });
});