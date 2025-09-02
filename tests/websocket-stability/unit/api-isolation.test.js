/**
 * API Isolation Tests
 * Verifies that Claude API subprocess operations don't interfere with WebSocket connections
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep } = require('../utils/test-helpers');

describe('Claude API Isolation Tests', () => {
  let testServer;
  let wsClient;
  let connectionMonitor;

  beforeAll(async () => {
    connectionMonitor = new ConnectionMonitor();
    testServer = new TestServer(3001);
    await testServer.start();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    wsClient = new WebSocketTestClient('ws://localhost:3001');
    connectionMonitor.clear();
  });

  afterEach(async () => {
    if (wsClient) {
      await wsClient.disconnect();
    }
  });

  describe('Subprocess Lifecycle Isolation', () => {
    test('WebSocket survives Claude subprocess creation and termination', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');
      expect(wsClient.isConnected).toBe(true);

      const initialStats = wsClient.getConnectionStats();
      connectionMonitor.logEvent('initial_connection_stats', initialStats);

      // Send command that will create a Claude subprocess
      const subprocessCommand = {
        instanceId: 'subprocess-isolation-test',
        type: 'user_input',
        command: 'claude --version && echo "Subprocess created"',
        timestamp: Date.now()
      };

      const subprocessTimer = performanceUtils.createTimer();
      await wsClient.sendMessage(subprocessCommand);
      connectionMonitor.logEvent('subprocess_command_sent');

      // Wait for response (subprocess should be created and terminated)
      const subprocessResponse = await wsClient.waitForMessage(15000, msg => 
        msg.instanceId === subprocessCommand.instanceId
      );

      const subprocessDuration = subprocessTimer();
      
      expect(subprocessResponse).toBeDefined();
      connectionMonitor.logEvent('subprocess_completed', { 
        duration: subprocessDuration,
        hasResponse: !!subprocessResponse 
      });

      // Verify WebSocket connection is still alive after subprocess termination
      expect(wsClient.isConnected).toBe(true);

      const postSubprocessStats = wsClient.getConnectionStats();
      expect(postSubprocessStats.isConnected).toBe(true);
      expect(postSubprocessStats.messageCount).toBeGreaterThan(initialStats.messageCount);

      connectionMonitor.logEvent('post_subprocess_stats', postSubprocessStats);

      // Send verification command
      const verificationCommand = {
        instanceId: 'subprocess-isolation-test',
        type: 'user_input',
        command: 'echo "WebSocket still works after subprocess"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(verificationCommand);
      const verificationResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === verificationCommand.instanceId
      );

      expect(verificationResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('verification_completed');
      
      console.log(`[TEST] WebSocket survived ${subprocessDuration.toFixed(2)}ms subprocess lifecycle`);
    });

    test('Multiple subprocess operations do not accumulate connection issues', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const subprocessCommands = [
        'echo "First subprocess test"',
        'pwd && echo "Directory check"',
        'ls -la | head -5',
        'echo "Third subprocess test"',
        'date && echo "Time check"'
      ];

      const allResults = [];

      for (let i = 0; i < subprocessCommands.length; i++) {
        const command = {
          instanceId: `multiple-subprocess-${i}`,
          type: 'user_input',
          command: subprocessCommands[i],
          timestamp: Date.now()
        };

        const operationTimer = performanceUtils.createTimer();
        await wsClient.sendMessage(command);
        connectionMonitor.logEvent('subprocess_operation_sent', { index: i, command: command.command });

        const response = await wsClient.waitForMessage(10000, msg => 
          msg.instanceId === command.instanceId
        );

        const operationDuration = operationTimer();
        
        expect(response).toBeDefined();
        expect(wsClient.isConnected).toBe(true);

        allResults.push({
          index: i,
          command: subprocessCommands[i],
          duration: operationDuration,
          hasResponse: !!response,
          connectionAlive: wsClient.isConnected
        });

        connectionMonitor.logEvent('subprocess_operation_completed', { 
          index: i, 
          duration: operationDuration 
        });

        // Brief pause between operations
        await sleep(300);
      }

      // Verify all operations succeeded and connection is still stable
      expect(allResults).toHaveLength(subprocessCommands.length);
      allResults.forEach((result, index) => {
        expect(result.hasResponse).toBe(true);
        expect(result.connectionAlive).toBe(true);
      });

      const finalStats = wsClient.getConnectionStats();
      expect(finalStats.isConnected).toBe(true);

      // Verify no accumulated connection errors
      const errorEvents = finalStats.connectionHistory.filter(e => e.type === 'error');
      expect(errorEvents).toHaveLength(0);

      connectionMonitor.logEvent('multiple_subprocess_test_completed', {
        totalOperations: subprocessCommands.length,
        allSuccessful: allResults.every(r => r.hasResponse && r.connectionAlive)
      });

      console.log(`[TEST] Completed ${subprocessCommands.length} subprocess operations without connection degradation`);
    });
  });

  describe('Process Resource Isolation', () => {
    test('WebSocket unaffected by subprocess memory usage', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Monitor memory usage patterns
      const memoryTest = {
        instanceId: 'memory-isolation-test',
        type: 'user_input',
        command: 'node -e "console.log(process.memoryUsage()); const arr = Array(100000).fill(\\\'test\\\'); console.log(\\\'Memory test complete\\\');"',
        timestamp: Date.now()
      };

      const memoryTimer = performanceUtils.createTimer();
      await wsClient.sendMessage(memoryTest);
      connectionMonitor.logEvent('memory_intensive_command_sent');

      const memoryResponse = await wsClient.waitForMessage(15000, msg => 
        msg.instanceId === memoryTest.instanceId
      );

      const memoryDuration = memoryTimer();
      
      expect(memoryResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('memory_test_completed', { 
        duration: memoryDuration 
      });

      // Send follow-up to verify WebSocket is still responsive
      const followUpCommand = {
        instanceId: 'memory-isolation-test',
        type: 'user_input',
        command: 'echo "WebSocket responsive after memory test"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(followUpCommand);
      const followUpResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === followUpCommand.instanceId
      );

      expect(followUpResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      console.log(`[TEST] WebSocket remained responsive through ${memoryDuration.toFixed(2)}ms memory-intensive subprocess`);
    });

    test('WebSocket connection survives subprocess timeout scenarios', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Send command with potential timeout issues
      const timeoutTest = {
        instanceId: 'timeout-isolation-test',
        type: 'user_input',
        command: 'echo "Starting timeout test" && sleep 5 && echo "Timeout test complete"',
        timeout: 10000,
        timestamp: Date.now()
      };

      const timeoutTimer = performanceUtils.createTimer();
      await wsClient.sendMessage(timeoutTest);
      connectionMonitor.logEvent('timeout_test_sent');

      // Wait for response with appropriate timeout
      const timeoutResponse = await wsClient.waitForMessage(15000, msg => 
        msg.instanceId === timeoutTest.instanceId
      );

      const timeoutDuration = timeoutTimer();
      
      // Response might be a timeout error or completion - both are acceptable
      // What matters is that WebSocket connection remains stable
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('timeout_test_completed', { 
        duration: timeoutDuration,
        hasResponse: !!timeoutResponse 
      });

      // Verify WebSocket can still handle new commands
      const postTimeoutCommand = {
        instanceId: 'timeout-isolation-test',
        type: 'user_input',
        command: 'echo "Post-timeout verification"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(postTimeoutCommand);
      const postTimeoutResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === postTimeoutCommand.instanceId
      );

      expect(postTimeoutResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('post_timeout_verification_completed');

      console.log(`[TEST] WebSocket survived ${timeoutDuration.toFixed(2)}ms timeout scenario`);
    });
  });

  describe('API Call State Isolation', () => {
    test('WebSocket state unaffected by API call failures', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const initialConnectionState = wsClient.getConnectionStats();

      // Send command that might cause API issues
      const problematicAPI = {
        instanceId: 'api-failure-test',
        type: 'user_input',
        command: 'invalid-claude-command-that-should-fail',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(problematicAPI);
      connectionMonitor.logEvent('problematic_api_sent');

      // Wait for response (might be error response)
      try {
        const apiResponse = await wsClient.waitForMessage(10000, msg => 
          msg.instanceId === problematicAPI.instanceId
        );

        connectionMonitor.logEvent('api_response_received', { 
          hasResponse: !!apiResponse,
          responseType: apiResponse?.type 
        });
      } catch (error) {
        connectionMonitor.logEvent('api_response_timeout', { error: error.message });
      }

      // Verify WebSocket connection is unaffected by API failure
      expect(wsClient.isConnected).toBe(true);

      const postAPIState = wsClient.getConnectionStats();
      expect(postAPIState.isConnected).toBe(true);

      // Connection should not have been reset due to API failure
      expect(postAPIState.connectionHistory.length).toEqual(initialConnectionState.connectionHistory.length);

      connectionMonitor.logEvent('post_api_failure_state', postAPIState);

      // Verify WebSocket can still handle valid commands
      const recoveryCommand = {
        instanceId: 'api-failure-test',
        type: 'user_input',
        command: 'echo "Recovery after API failure"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(recoveryCommand);
      const recoveryResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === recoveryCommand.instanceId
      );

      expect(recoveryResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('recovery_after_api_failure_completed');

      console.log('[TEST] WebSocket connection isolated from API call failures');
    });

    test('Concurrent WebSocket and API operations do not interfere', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Start a long-running API operation
      const longAPIOperation = {
        instanceId: 'concurrent-api-test',
        type: 'user_input',
        command: 'echo "Starting long operation" && sleep 3 && echo "Long operation complete"',
        timestamp: Date.now()
      };

      const apiPromise = (async () => {
        await wsClient.sendMessage(longAPIOperation);
        connectionMonitor.logEvent('long_api_operation_sent');
        return wsClient.waitForMessage(15000, msg => 
          msg.instanceId === longAPIOperation.instanceId
        );
      })();

      // While API is running, send other WebSocket messages
      await sleep(500); // Let API operation start

      const concurrentCommands = [
        { instanceId: 'concurrent-ws-1', command: 'echo "Concurrent message 1"' },
        { instanceId: 'concurrent-ws-2', command: 'echo "Concurrent message 2"' },
        { instanceId: 'concurrent-ws-3', command: 'echo "Concurrent message 3"' }
      ];

      const concurrentPromises = concurrentCommands.map(async (cmd) => {
        const message = {
          instanceId: cmd.instanceId,
          type: 'user_input',
          command: cmd.command,
          timestamp: Date.now()
        };

        await wsClient.sendMessage(message);
        connectionMonitor.logEvent('concurrent_command_sent', { instanceId: cmd.instanceId });
        
        return wsClient.waitForMessage(8000, msg => 
          msg.instanceId === cmd.instanceId
        );
      });

      // Wait for all operations to complete
      const [apiResult, ...concurrentResults] = await Promise.all([apiPromise, ...concurrentPromises]);

      // Verify all operations succeeded
      expect(apiResult).toBeDefined();
      concurrentResults.forEach((result, index) => {
        expect(result).toBeDefined();
        connectionMonitor.logEvent('concurrent_result_verified', { 
          index, 
          hasResult: !!result 
        });
      });

      // Verify WebSocket connection remained stable throughout
      expect(wsClient.isConnected).toBe(true);

      const finalStats = wsClient.getConnectionStats();
      expect(finalStats.isConnected).toBe(true);

      connectionMonitor.logEvent('concurrent_operations_completed', {
        apiSuccess: !!apiResult,
        concurrentSuccess: concurrentResults.every(r => !!r),
        totalOperations: 1 + concurrentCommands.length
      });

      console.log(`[TEST] Successfully handled concurrent API and WebSocket operations`);
    });
  });
});