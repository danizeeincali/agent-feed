/**
 * WebSocket Connection Stability Tests - DESIGNED TO FAIL
 * 
 * These tests expose the 30-second WebSocket connection drop issue.
 * They will FAIL until the root cause is fixed, then serve as regression tests.
 */

const WebSocket = require('ws');
const { expect } = require('chai');

describe('WebSocket Connection Stability - Long Duration Tests', function() {
  // Extended timeout for long-running tests
  this.timeout(120000); // 2 minutes

  let wsConnection;
  let connectionEvents = [];
  let messageLog = [];
  let errorLog = [];

  beforeEach(function() {
    connectionEvents = [];
    messageLog = [];
    errorLog = [];
  });

  afterEach(function() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
    }
  });

  /**
   * TEST 1: 60+ Second Connection Persistence
   * This test SHOULD FAIL - exposing the 30-second drop issue
   */
  it('should maintain WebSocket connection for 60+ seconds without dropping', function(done) {
    const startTime = Date.now();
    const targetDuration = 65000; // 65 seconds
    let connectionDropped = false;
    let pingInterval;

    wsConnection = new WebSocket('ws://localhost:3000');

    // Track all connection events
    wsConnection.on('open', () => {
      connectionEvents.push({ type: 'open', timestamp: Date.now() });
      console.log(`[${new Date().toISOString()}] WebSocket connection opened`);
      
      // Send periodic ping messages to keep connection active
      pingInterval = setInterval(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
          const pingData = { 
            type: 'ping', 
            timestamp: Date.now(),
            elapsed: Date.now() - startTime 
          };
          wsConnection.send(JSON.stringify(pingData));
          messageLog.push({ type: 'ping_sent', timestamp: Date.now() });
        }
      }, 5000); // Every 5 seconds
    });

    wsConnection.on('close', (code, reason) => {
      connectionEvents.push({ 
        type: 'close', 
        timestamp: Date.now(), 
        code, 
        reason: reason?.toString(),
        elapsed: Date.now() - startTime
      });
      connectionDropped = true;
      console.log(`[${new Date().toISOString()}] WebSocket connection closed: ${code} - ${reason}`);
      
      clearInterval(pingInterval);
      
      // THIS TEST SHOULD FAIL - connection drops before 60 seconds
      const elapsed = Date.now() - startTime;
      if (elapsed < targetDuration) {
        done(new Error(`Connection dropped after ${elapsed}ms (expected to survive ${targetDuration}ms). Close code: ${code}, reason: ${reason}`));
      } else {
        done(); // Test passes - connection survived
      }
    });

    wsConnection.on('error', (error) => {
      errorLog.push({ error: error.message, timestamp: Date.now() });
      connectionEvents.push({ type: 'error', timestamp: Date.now(), error: error.message });
      console.log(`[${new Date().toISOString()}] WebSocket error:`, error);
    });

    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageLog.push({ type: 'message_received', timestamp: Date.now(), message });
      } catch (e) {
        messageLog.push({ type: 'raw_message', timestamp: Date.now(), data: data.toString() });
      }
    });

    // Test timeout - if connection survives 65 seconds, test passes
    setTimeout(() => {
      if (!connectionDropped) {
        clearInterval(pingInterval);
        console.log(`[${new Date().toISOString()}] Connection survived 65 seconds - TEST PASSES`);
        done();
      }
    }, targetDuration);
  });

  /**
   * TEST 2: Connection State Monitoring
   * Monitors for unexpected state changes
   */
  it('should not experience unexpected connection state changes within 45 seconds', function(done) {
    const startTime = Date.now();
    const monitorDuration = 45000; // 45 seconds
    let stateChanges = [];
    let monitoring = true;

    wsConnection = new WebSocket('ws://localhost:3000');

    // Monitor connection state every second
    const stateMonitor = setInterval(() => {
      if (!monitoring) return;

      const currentState = wsConnection.readyState;
      const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      
      stateChanges.push({
        timestamp: Date.now(),
        state: currentState,
        stateName: stateNames[currentState],
        elapsed: Date.now() - startTime
      });

      // If connection closes unexpectedly
      if (currentState === WebSocket.CLOSED) {
        monitoring = false;
        clearInterval(stateMonitor);
        
        const elapsed = Date.now() - startTime;
        console.log('Connection state changes:', stateChanges);
        
        // THIS SHOULD FAIL - connection closes before 45 seconds
        done(new Error(`Connection closed unexpectedly after ${elapsed}ms (expected to stay open for ${monitorDuration}ms)`));
      }
    }, 1000);

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] Connection established`);
    });

    wsConnection.on('error', (error) => {
      monitoring = false;
      clearInterval(stateMonitor);
      done(new Error(`WebSocket error: ${error.message}`));
    });

    // Success condition - if monitoring completes without issues
    setTimeout(() => {
      if (monitoring) {
        monitoring = false;
        clearInterval(stateMonitor);
        console.log('State monitoring completed successfully');
        console.log('Final state changes:', stateChanges);
        done();
      }
    }, monitorDuration);
  });

  /**
   * TEST 3: Connection Recovery Test
   * Tests if connection can be re-established after drop
   */
  it('should be able to reconnect after connection drop', function(done) {
    let firstConnection = true;
    let reconnectAttempted = false;
    
    function createConnection() {
      const ws = new WebSocket('ws://localhost:3000');
      
      ws.on('open', () => {
        console.log(`[${new Date().toISOString()}] ${firstConnection ? 'Initial' : 'Reconnected'} connection established`);
        
        if (!firstConnection) {
          // Reconnection successful
          ws.close();
          done();
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] Connection closed: ${code} - ${reason}`);
        
        if (firstConnection && !reconnectAttempted) {
          firstConnection = false;
          reconnectAttempted = true;
          
          // Attempt reconnection after brief delay
          setTimeout(() => {
            console.log(`[${new Date().toISOString()}] Attempting reconnection...`);
            createConnection();
          }, 1000);
        } else if (reconnectAttempted) {
          done(new Error('Reconnection failed'));
        }
      });

      ws.on('error', (error) => {
        console.log(`[${new Date().toISOString()}] WebSocket error:`, error);
        if (!reconnectAttempted) {
          done(new Error(`Initial connection error: ${error.message}`));
        }
      });

      return ws;
    }

    wsConnection = createConnection();
    
    // Force close after 35 seconds to simulate the drop
    setTimeout(() => {
      if (firstConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log(`[${new Date().toISOString()}] Simulating connection drop at 35 seconds`);
        wsConnection.close(1000, 'Simulated drop');
      }
    }, 35000);
  });
});