/**
 * Regression Prevention Tests - Will PASS Only When Drops Are Fixed
 * 
 * These tests define the exact behavior expected after the fix is implemented.
 * They serve as the "definition of done" for the WebSocket stability fix.
 */

const WebSocket = require('ws');
const axios = require('axios');
const { expect } = require('chai');

describe('WebSocket Stability - Regression Prevention Suite', function() {
  this.timeout(150000); // 2.5 minutes for thorough testing

  let wsConnection;
  let testMetrics = {};

  beforeEach(function() {
    testMetrics = {
      connectionDrops: 0,
      apiCallsCompleted: 0,
      apiCallsFailed: 0,
      maxConnectionDuration: 0,
      averageApiResponseTime: 0,
      unexpectedErrors: []
    };
  });

  afterEach(function() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close();
    }
    
    // Log test metrics for debugging
    console.log('Test metrics:', testMetrics);
  });

  /**
   * REGRESSION TEST 1: 90-Second Connection Guarantee
   * This test MUST PASS after the fix - no drops within 90 seconds
   */
  it('REGRESSION: must maintain connection for 90+ seconds without any drops', function(done) {
    const requiredDuration = 90000; // 90 seconds
    const startTime = Date.now();
    let heartbeatInterval;
    let connectionLost = false;

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Connection established, target duration: 90s`);
      
      // Send heartbeat every 10 seconds to verify connection health
      heartbeatInterval = setInterval(() => {
        if (wsConnection.readyState === WebSocket.OPEN) {
          const elapsed = Date.now() - startTime;
          wsConnection.send(JSON.stringify({
            type: 'heartbeat',
            elapsed,
            target: requiredDuration
          }));
          console.log(`[${new Date().toISOString()}] Heartbeat sent, elapsed: ${Math.floor(elapsed/1000)}s`);
        }
      }, 10000);
    });

    wsConnection.on('close', (code, reason) => {
      connectionLost = true;
      const elapsed = Date.now() - startTime;
      testMetrics.connectionDrops++;
      testMetrics.maxConnectionDuration = elapsed;
      
      clearInterval(heartbeatInterval);
      
      console.log(`[${new Date().toISOString()}] REGRESSION TEST FAILED: Connection dropped after ${elapsed}ms`);
      console.log(`Close code: ${code}, Reason: ${reason}`);
      
      // REGRESSION: This should NOT happen after fix
      expect.fail(`REGRESSION FAILURE: Connection dropped after ${elapsed}ms (required: ${requiredDuration}ms). Close code: ${code}, Reason: ${reason}`);
    });

    wsConnection.on('error', (error) => {
      connectionLost = true;
      testMetrics.unexpectedErrors.push(error.message);
      clearInterval(heartbeatInterval);
      
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Unexpected error`, error);
      expect.fail(`REGRESSION FAILURE: Unexpected WebSocket error: ${error.message}`);
    });

    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'heartbeat_ack') {
          console.log(`[${new Date().toISOString()}] Heartbeat acknowledged`);
        }
      } catch (e) {
        // Ignore parsing errors for other messages
      }
    });

    // SUCCESS: Connection survived the required duration
    setTimeout(() => {
      if (!connectionLost) {
        const finalElapsed = Date.now() - startTime;
        testMetrics.maxConnectionDuration = finalElapsed;
        
        clearInterval(heartbeatInterval);
        console.log(`[${new Date().toISOString()}] REGRESSION TEST PASSED: Connection survived ${Math.floor(finalElapsed/1000)}s`);
        
        expect(testMetrics.connectionDrops).to.equal(0, 'No connection drops should occur');
        expect(finalElapsed).to.be.at.least(requiredDuration, 'Connection should survive full duration');
        
        done();
      }
    }, requiredDuration + 1000); // Add 1 second buffer
  });

  /**
   * REGRESSION TEST 2: API Calls Must Not Cause Connection Drops
   * This test MUST PASS after the fix - API calls should not affect WebSocket
   */
  it('REGRESSION: must handle 10+ API calls without affecting WebSocket connection', function(done) {
    const targetApiCalls = 12;
    const testDuration = 80000; // 80 seconds
    const startTime = Date.now();
    let apiCallCount = 0;
    let connectionStable = true;
    let apiCallInterval;

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Starting API call stress test`);

      // Make API calls every 6 seconds
      apiCallInterval = setInterval(async () => {
        if (apiCallCount >= targetApiCalls || !connectionStable) {
          clearInterval(apiCallInterval);
          return;
        }

        apiCallCount++;
        const callStart = Date.now();

        try {
          console.log(`[${new Date().toISOString()}] REGRESSION TEST: API call #${apiCallCount}/${targetApiCalls}`);

          const response = await axios.post('http://localhost:3000/api/claude/chat', {
            message: `Directory query #${apiCallCount}: What is the current working directory and list its contents?`,
            sessionId: `regression-test-${startTime}`,
            callNumber: apiCallCount
          }, {
            timeout: 25000
          });

          const responseTime = Date.now() - callStart;
          testMetrics.apiCallsCompleted++;
          testMetrics.averageApiResponseTime = 
            (testMetrics.averageApiResponseTime * (testMetrics.apiCallsCompleted - 1) + responseTime) / testMetrics.apiCallsCompleted;

          console.log(`[${new Date().toISOString()}] API call #${apiCallCount} completed in ${responseTime}ms, WebSocket state: ${wsConnection.readyState}`);

          // Verify WebSocket is still connected after API call
          expect(wsConnection.readyState).to.equal(WebSocket.OPEN, `WebSocket should remain open after API call #${apiCallCount}`);

        } catch (error) {
          testMetrics.apiCallsFailed++;
          testMetrics.unexpectedErrors.push(`API call #${apiCallCount}: ${error.message}`);
          
          console.log(`[${new Date().toISOString()}] REGRESSION TEST: API call #${apiCallCount} failed: ${error.message}`);
          
          // API failures are acceptable, but should not close WebSocket
          expect(wsConnection.readyState).to.equal(WebSocket.OPEN, `WebSocket should remain open even after API call failure #${apiCallCount}`);
        }
      }, 6000);
    });

    wsConnection.on('close', (code, reason) => {
      connectionStable = false;
      testMetrics.connectionDrops++;
      const elapsed = Date.now() - startTime;
      
      clearInterval(apiCallInterval);
      
      console.log(`[${new Date().toISOString()}] REGRESSION TEST FAILED: WebSocket dropped during API calls`);
      console.log(`API calls completed: ${testMetrics.apiCallsCompleted}/${targetApiCalls}`);
      console.log(`Connection lasted: ${elapsed}ms`);
      
      // REGRESSION: This should NOT happen after fix
      expect.fail(`REGRESSION FAILURE: WebSocket connection dropped during API call stress test after ${elapsed}ms. API calls completed: ${testMetrics.apiCallsCompleted}/${targetApiCalls}, Close code: ${code}`);
    });

    wsConnection.on('error', (error) => {
      connectionStable = false;
      testMetrics.unexpectedErrors.push(error.message);
      clearInterval(apiCallInterval);
      
      expect.fail(`REGRESSION FAILURE: WebSocket error during API stress test: ${error.message}`);
    });

    // SUCCESS: All API calls completed without affecting WebSocket
    setTimeout(() => {
      if (connectionStable) {
        clearInterval(apiCallInterval);
        
        console.log(`[${new Date().toISOString()}] REGRESSION TEST PASSED: API stress test completed`);
        console.log(`API calls completed: ${testMetrics.apiCallsCompleted}/${targetApiCalls}`);
        console.log(`Average API response time: ${testMetrics.averageApiResponseTime.toFixed(2)}ms`);
        console.log(`Connection drops: ${testMetrics.connectionDrops}`);
        
        // Assertions for regression prevention
        expect(testMetrics.connectionDrops).to.equal(0, 'No connection drops should occur during API calls');
        expect(testMetrics.apiCallsCompleted).to.be.at.least(targetApiCalls * 0.8, 'At least 80% of API calls should complete');
        expect(wsConnection.readyState).to.equal(WebSocket.OPEN, 'WebSocket should remain open');
        
        done();
      }
    }, testDuration);
  });

  /**
   * REGRESSION TEST 3: Directory Query Workflow Must Be Reliable
   * This test MUST PASS after the fix - the specific failing workflow must work
   */
  it('REGRESSION: must reliably handle the "directory query" workflow that currently fails', function(done) {
    const testDuration = 60000; // 60 seconds
    const queryInterval = 10000; // Every 10 seconds
    const startTime = Date.now();
    let workflowCycles = 0;
    let successfulCycles = 0;
    let connectionHealthy = true;
    let cycleInterval;

    const directoryWorkflow = async (cycleNumber) => {
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Directory workflow cycle #${cycleNumber}`);
      
      const workflowSteps = [
        { command: 'pwd', description: 'Get current directory' },
        { command: 'ls -la', description: 'List directory contents' },
        { command: 'echo "Working directory: $(pwd)"', description: 'Echo current directory' }
      ];

      let cycleSuccess = true;

      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        
        try {
          const stepStart = Date.now();
          
          const response = await axios.post('http://localhost:3000/api/claude/chat', {
            message: step.command,
            sessionId: `directory-workflow-${startTime}`,
            context: {
              workflowCycle: cycleNumber,
              step: i + 1,
              totalSteps: workflowSteps.length,
              description: step.description
            }
          }, {
            timeout: 20000 // 20 second timeout per step
          });

          const stepDuration = Date.now() - stepStart;
          console.log(`[${new Date().toISOString()}] Cycle #${cycleNumber}, Step ${i+1} completed in ${stepDuration}ms`);

          // Verify WebSocket health after each step
          if (wsConnection.readyState !== WebSocket.OPEN) {
            cycleSuccess = false;
            console.log(`[${new Date().toISOString()}] REGRESSION FAILURE: WebSocket closed during workflow step`);
            break;
          }

        } catch (error) {
          cycleSuccess = false;
          testMetrics.unexpectedErrors.push(`Cycle ${cycleNumber}, Step ${i+1}: ${error.message}`);
          console.log(`[${new Date().toISOString()}] Workflow step failed: ${error.message}`);
        }
      }

      if (cycleSuccess) {
        successfulCycles++;
        console.log(`[${new Date().toISOString()}] REGRESSION TEST: Workflow cycle #${cycleNumber} completed successfully`);
      }

      // Send WebSocket confirmation
      if (wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'workflow_cycle_complete',
          cycleNumber,
          success: cycleSuccess,
          timestamp: Date.now()
        }));
      }

      return cycleSuccess;
    };

    wsConnection = new WebSocket('ws://localhost:3000');

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Starting directory workflow test`);

      // Run workflow cycles
      const runWorkflowCycle = async () => {
        if (!connectionHealthy) return;

        workflowCycles++;
        await directoryWorkflow(workflowCycles);
      };

      // Start first cycle immediately, then every 10 seconds
      runWorkflowCycle();
      cycleInterval = setInterval(runWorkflowCycle, queryInterval);
    });

    wsConnection.on('close', (code, reason) => {
      connectionHealthy = false;
      testMetrics.connectionDrops++;
      const elapsed = Date.now() - startTime;
      
      clearInterval(cycleInterval);
      
      console.log(`[${new Date().toISOString()}] REGRESSION TEST FAILED: Connection dropped during directory workflow`);
      console.log(`Workflow cycles completed: ${successfulCycles}/${workflowCycles}`);
      console.log(`Connection duration: ${elapsed}ms`);
      
      // REGRESSION: This should NOT happen after fix
      expect.fail(`REGRESSION FAILURE: Connection dropped during directory workflow test. Successful cycles: ${successfulCycles}/${workflowCycles}, Duration: ${elapsed}ms, Close code: ${code}`);
    });

    wsConnection.on('error', (error) => {
      connectionHealthy = false;
      testMetrics.unexpectedErrors.push(error.message);
      clearInterval(cycleInterval);
      
      expect.fail(`REGRESSION FAILURE: WebSocket error during directory workflow: ${error.message}`);
    });

    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'workflow_ack') {
          console.log(`[${new Date().toISOString()}] Workflow acknowledgment received`);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // SUCCESS: Workflow completed without connection issues
    setTimeout(() => {
      if (connectionHealthy) {
        clearInterval(cycleInterval);
        
        console.log(`[${new Date().toISOString()}] REGRESSION TEST PASSED: Directory workflow test completed`);
        console.log(`Successful workflow cycles: ${successfulCycles}/${workflowCycles}`);
        console.log(`Success rate: ${((successfulCycles/workflowCycles)*100).toFixed(1)}%`);
        
        // Assertions for regression prevention
        expect(testMetrics.connectionDrops).to.equal(0, 'No connection drops should occur during directory workflows');
        expect(successfulCycles).to.equal(workflowCycles, 'All workflow cycles should complete successfully');
        expect(wsConnection.readyState).to.equal(WebSocket.OPEN, 'WebSocket should remain open');
        expect(workflowCycles).to.be.at.least(5, 'At least 5 workflow cycles should be completed');
        
        done();
      }
    }, testDuration);
  });

  /**
   * REGRESSION TEST 4: Connection Must Survive System Load
   * This test MUST PASS after the fix - WebSocket should be resilient to system load
   */
  it('REGRESSION: must maintain connection stability under simulated system load', function(done) {
    const testDuration = 70000; // 70 seconds
    const startTime = Date.now();
    let connectionStable = true;
    let loadSimulationActive = true;

    wsConnection = new WebSocket('ws://localhost:3000');

    // Simulate system load with concurrent operations
    const simulateLoad = () => {
      const operations = [];
      
      // Multiple concurrent API calls
      for (let i = 0; i < 3; i++) {
        operations.push(
          axios.post('http://localhost:3000/api/claude/chat', {
            message: `Load test query ${i}: Analyze system performance`,
            sessionId: `load-test-${startTime}-${i}`,
            priority: 'low'
          }, { timeout: 15000 }).catch(err => {
            console.log(`Load test API call ${i} failed: ${err.message}`);
          })
        );
      }

      // WebSocket message burst
      if (wsConnection.readyState === WebSocket.OPEN) {
        for (let i = 0; i < 5; i++) {
          wsConnection.send(JSON.stringify({
            type: 'load_test_message',
            messageId: i,
            timestamp: Date.now(),
            payload: 'x'.repeat(100) // Small payload
          }));
        }
      }

      return Promise.allSettled(operations);
    };

    wsConnection.on('open', () => {
      console.log(`[${new Date().toISOString()}] REGRESSION TEST: Starting load simulation`);

      // Run load simulation every 8 seconds
      const loadInterval = setInterval(async () => {
        if (!loadSimulationActive || !connectionStable) {
          clearInterval(loadInterval);
          return;
        }

        console.log(`[${new Date().toISOString()}] Running load simulation...`);
        await simulateLoad();
        
        // Verify connection health
        if (wsConnection.readyState !== WebSocket.OPEN) {
          connectionStable = false;
          clearInterval(loadInterval);
        }
      }, 8000);

      // Stop load simulation before test ends
      setTimeout(() => {
        loadSimulationActive = false;
        clearInterval(loadInterval);
        console.log(`[${new Date().toISOString()}] Load simulation stopped`);
      }, testDuration - 5000);
    });

    wsConnection.on('close', (code, reason) => {
      connectionStable = false;
      testMetrics.connectionDrops++;
      const elapsed = Date.now() - startTime;
      
      console.log(`[${new Date().toISOString()}] REGRESSION TEST FAILED: Connection dropped under load`);
      
      // REGRESSION: This should NOT happen after fix
      expect.fail(`REGRESSION FAILURE: Connection dropped under simulated load after ${elapsed}ms. Close code: ${code}, Reason: ${reason}`);
    });

    wsConnection.on('error', (error) => {
      connectionStable = false;
      testMetrics.unexpectedErrors.push(error.message);
      
      expect.fail(`REGRESSION FAILURE: WebSocket error under load: ${error.message}`);
    });

    // SUCCESS: Connection survived the load test
    setTimeout(() => {
      if (connectionStable) {
        const finalElapsed = Date.now() - startTime;
        
        console.log(`[${new Date().toISOString()}] REGRESSION TEST PASSED: Load test completed`);
        console.log(`Connection remained stable for ${Math.floor(finalElapsed/1000)}s under load`);
        
        expect(testMetrics.connectionDrops).to.equal(0, 'No connection drops should occur under load');
        expect(wsConnection.readyState).to.equal(WebSocket.OPEN, 'WebSocket should remain open');
        
        done();
      }
    }, testDuration);
  });
});