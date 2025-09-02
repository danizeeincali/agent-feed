/**
 * Claude API Concurrent WebSocket Tests - DESIGNED TO FAIL
 * 
 * Tests concurrent Claude API calls during long WebSocket connections
 * These tests will expose issues with API calls causing connection drops
 */

const WebSocket = require('ws');
const axios = require('axios');
const { expect } = require('chai');

describe('Claude API + WebSocket Concurrent Tests', function() {
  this.timeout(90000); // 90 seconds

  let wsConnection;
  let apiCallResults = [];
  let connectionEvents = [];

  beforeEach(function() {
    apiCallResults = [];
    connectionEvents = [];
  });

  afterEach(function() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
    }
  });

  /**
   * TEST 1: WebSocket + Concurrent API Calls
   * This test SHOULD FAIL - API calls may cause connection drops
   */
  it('should maintain WebSocket connection during concurrent Claude API calls', function(done) {
    const startTime = Date.now();
    const testDuration = 60000; // 60 seconds
    let connectionStable = true;
    let apiCallInterval;

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      connectionEvents.push({ type: 'ws_open', timestamp: Date.now() });
      console.log(`[${new Date().toISOString()}] WebSocket connected, starting API calls`);

      // Make Claude API calls every 10 seconds
      apiCallInterval = setInterval(async () => {
        try {
          console.log(`[${new Date().toISOString()}] Making Claude API call...`);
          
          const apiCall = {
            timestamp: Date.now(),
            endpoint: '/api/claude/chat',
            payload: {
              message: 'What directory are you in?',
              sessionId: 'test-session-' + Date.now()
            }
          };

          const response = await axios.post(`http://localhost:3000${apiCall.endpoint}`, apiCall.payload, {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          apiCallResults.push({
            ...apiCall,
            success: true,
            responseTime: Date.now() - apiCall.timestamp,
            status: response.status,
            wsState: wsConnection.readyState
          });

          console.log(`[${new Date().toISOString()}] API call successful, WebSocket state: ${wsConnection.readyState}`);

        } catch (error) {
          apiCallResults.push({
            timestamp: Date.now(),
            success: false,
            error: error.message,
            wsState: wsConnection.readyState
          });
          console.log(`[${new Date().toISOString()}] API call failed:`, error.message);
        }
      }, 10000);
    });

    wsConnection.on('close', (code, reason) => {
      connectionStable = false;
      const elapsed = Date.now() - startTime;
      
      connectionEvents.push({ 
        type: 'ws_close', 
        timestamp: Date.now(), 
        code, 
        reason: reason?.toString(),
        elapsed,
        apiCallCount: apiCallResults.length
      });

      clearInterval(apiCallInterval);

      console.log(`[${new Date().toISOString()}] WebSocket closed during API test`);
      console.log('API call results:', apiCallResults);
      console.log('Connection events:', connectionEvents);

      // THIS TEST SHOULD FAIL - connection drops during API calls
      done(new Error(`WebSocket connection dropped after ${elapsed}ms during concurrent API calls. API calls made: ${apiCallResults.length}, Close code: ${code}, Reason: ${reason}`));
    });

    wsConnection.on('error', (error) => {
      connectionStable = false;
      clearInterval(apiCallInterval);
      
      connectionEvents.push({ type: 'ws_error', timestamp: Date.now(), error: error.message });
      done(new Error(`WebSocket error during API calls: ${error.message}`));
    });

    // Test passes if connection survives the full duration
    setTimeout(() => {
      if (connectionStable) {
        clearInterval(apiCallInterval);
        console.log(`[${new Date().toISOString()}] Test completed successfully`);
        console.log('Final API call results:', apiCallResults);
        console.log('Connection remained stable throughout test');
        done();
      }
    }, testDuration);
  });

  /**
   * TEST 2: Directory Query Workflow Test
   * Tests the specific "what directory are you in" workflow that users report failing
   */
  it('should handle repeated directory queries without dropping connection', function(done) {
    const startTime = Date.now();
    const testDuration = 45000; // 45 seconds
    let queryCount = 0;
    let connectionAlive = true;
    let queryInterval;

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] Starting directory query workflow test`);

      // Query directory every 8 seconds (common user pattern)
      queryInterval = setInterval(async () => {
        if (!connectionAlive) return;

        queryCount++;
        console.log(`[${new Date().toISOString()}] Directory query #${queryCount}`);

        try {
          // Simulate the exact workflow users report failing
          const queries = [
            'pwd',
            'ls -la',
            'echo $PWD'
          ];

          for (const query of queries) {
            const response = await axios.post('http://localhost:3000/api/claude/chat', {
              message: query,
              sessionId: `directory-test-${startTime}`,
              context: 'terminal'
            }, {
              timeout: 25000 // Just under the 30-second threshold
            });

            apiCallResults.push({
              query,
              queryNumber: queryCount,
              timestamp: Date.now(),
              success: true,
              responseTime: Date.now() - startTime,
              wsState: wsConnection.readyState
            });
          }

          // Send a WebSocket message to verify connection
          if (wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify({
              type: 'query_complete',
              queryCount,
              timestamp: Date.now()
            }));
          }

        } catch (error) {
          console.log(`[${new Date().toISOString()}] Directory query failed:`, error.message);
          apiCallResults.push({
            queryNumber: queryCount,
            timestamp: Date.now(),
            success: false,
            error: error.message,
            wsState: wsConnection.readyState
          });
        }
      }, 8000);
    });

    wsConnection.on('close', (code, reason) => {
      connectionAlive = false;
      const elapsed = Date.now() - startTime;
      
      clearInterval(queryInterval);
      
      console.log(`[${new Date().toISOString()}] Connection dropped during directory queries`);
      console.log(`Queries completed: ${queryCount}, Elapsed: ${elapsed}ms`);
      console.log('Query results:', apiCallResults);

      // THIS TEST SHOULD FAIL - connection drops during directory queries
      done(new Error(`Connection dropped after ${elapsed}ms during directory query workflow. Queries completed: ${queryCount}, Close code: ${code}`));
    });

    wsConnection.on('error', (error) => {
      connectionAlive = false;
      clearInterval(queryInterval);
      done(new Error(`WebSocket error during directory queries: ${error.message}`));
    });

    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`[${new Date().toISOString()}] Received WebSocket message:`, message.type);
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Test success condition
    setTimeout(() => {
      if (connectionAlive) {
        clearInterval(queryInterval);
        console.log(`[${new Date().toISOString()}] Directory query test completed successfully`);
        console.log(`Completed ${queryCount} query cycles without connection drops`);
        done();
      }
    }, testDuration);
  });

  /**
   * TEST 3: API Call Timing Analysis
   * Measures if API calls consistently take longer than 30 seconds
   */
  it('should identify if API calls exceed 30-second thresholds', function(done) {
    const apiCallTimings = [];
    const testDuration = 40000; // 40 seconds
    let callCount = 0;

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] Starting API timing analysis`);

      // Make API calls with timing measurements
      const makeTimedCall = async () => {
        callCount++;
        const callStart = Date.now();

        try {
          console.log(`[${new Date().toISOString()}] Starting timed API call #${callCount}`);

          const response = await axios.post('http://localhost:3000/api/claude/chat', {
            message: 'Please analyze this directory structure and provide a summary.',
            sessionId: `timing-test-${callCount}`,
            includeContext: true
          }, {
            timeout: 35000 // 35 second timeout
          });

          const callDuration = Date.now() - callStart;
          
          apiCallTimings.push({
            callNumber: callCount,
            duration: callDuration,
            success: true,
            timestamp: callStart,
            wsStateAtStart: wsConnection.readyState,
            wsStateAtEnd: wsConnection.readyState
          });

          console.log(`[${new Date().toISOString()}] API call #${callCount} completed in ${callDuration}ms`);

          // If call took longer than 30 seconds, flag it
          if (callDuration > 30000) {
            console.log(`⚠️ API call #${callCount} exceeded 30 seconds (${callDuration}ms)`);
          }

        } catch (error) {
          const callDuration = Date.now() - callStart;
          
          apiCallTimings.push({
            callNumber: callCount,
            duration: callDuration,
            success: false,
            error: error.message,
            timeout: error.code === 'ECONNABORTED',
            timestamp: callStart,
            wsStateAtStart: wsConnection.readyState,
            wsStateAtEnd: wsConnection.readyState
          });

          console.log(`[${new Date().toISOString()}] API call #${callCount} failed after ${callDuration}ms: ${error.message}`);
        }

        // Schedule next call
        if (Date.now() - startTime < testDuration) {
          setTimeout(makeTimedCall, 12000); // Every 12 seconds
        }
      };

      const startTime = Date.now();
      makeTimedCall(); // Start first call
    });

    wsConnection.on('close', (code, reason) => {
      const elapsed = Date.now() - Date.now();
      console.log(`[${new Date().toISOString()}] Connection closed during timing test`);
      console.log('API call timings:', apiCallTimings);
      
      // Analyze timing patterns
      const longCalls = apiCallTimings.filter(call => call.duration > 30000);
      const timeoutCalls = apiCallTimings.filter(call => call.timeout);
      
      console.log(`Calls > 30s: ${longCalls.length}/${apiCallTimings.length}`);
      console.log(`Timeout calls: ${timeoutCalls.length}/${apiCallTimings.length}`);
      
      done(new Error(`Connection dropped during timing analysis. Close code: ${code}. Long calls: ${longCalls.length}, Timeouts: ${timeoutCalls.length}`));
    });

    wsConnection.on('error', (error) => {
      console.log('Timing test error:', error);
      done(new Error(`WebSocket error during timing test: ${error.message}`));
    });

    // Test completion
    setTimeout(() => {
      console.log(`[${new Date().toISOString()}] Timing analysis completed`);
      console.log('Final API call timings:', apiCallTimings);
      
      const longCalls = apiCallTimings.filter(call => call.duration > 30000);
      const avgDuration = apiCallTimings.reduce((sum, call) => sum + call.duration, 0) / apiCallTimings.length;
      
      console.log(`Average call duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`Calls exceeding 30s: ${longCalls.length}/${apiCallTimings.length}`);
      
      // This might reveal timing patterns causing drops
      if (longCalls.length > 0) {
        console.log('Long API calls detected - potential cause of connection drops');
      }
      
      done();
    }, testDuration);
  });
});