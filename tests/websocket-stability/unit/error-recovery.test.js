/**
 * Error Recovery and Reconnection Tests
 * Tests WebSocket behavior during error conditions and reconnection scenarios
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep, retry } = require('../utils/test-helpers');

describe('WebSocket Error Recovery and Reconnection', () => {
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

  describe('Connection Error Handling', () => {
    test('WebSocket reconnects only when truly disconnected', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('initial_connection');
      expect(wsClient.isConnected).toBe(true);

      const initialStats = wsClient.getConnectionStats();
      const initialConnectionCount = initialStats.connectionHistory.filter(e => e.type === 'open').length;

      // Send normal commands to verify connection is working
      const testCommands = [
        'echo "Connection test 1"',
        'pwd',
        'echo "Connection test 2"'
      ];

      for (let i = 0; i < testCommands.length; i++) {
        const command = {
          instanceId: 'reconnection-test',
          type: 'user_input',
          command: testCommands[i],
          timestamp: Date.now()
        };

        await wsClient.sendMessage(command);
        connectionMonitor.logEvent('command_sent_during_normal_operation', { index: i });

        const response = await wsClient.waitForMessage(5000, msg => 
          msg.instanceId === command.instanceId
        );

        expect(response).toBeDefined();
        expect(wsClient.isConnected).toBe(true);

        connectionMonitor.logEvent('response_received_during_normal_operation', { index: i });
        
        await sleep(300);
      }

      // Verify no reconnections occurred during normal operation
      const finalStats = wsClient.getConnectionStats();
      const finalConnectionCount = finalStats.connectionHistory.filter(e => e.type === 'open').length;

      expect(finalConnectionCount).toBe(initialConnectionCount);
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('no_unexpected_reconnections_verified', {
        initialConnections: initialConnectionCount,
        finalConnections: finalConnectionCount
      });

      console.log('[TEST] No unexpected reconnections during normal operation');
    });

    test('WebSocket handles server restart gracefully', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('initial_connection');

      // Send command to verify initial connection
      const preRestartCommand = {
        instanceId: 'server-restart-test',
        type: 'user_input',
        command: 'echo "Before server restart"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(preRestartCommand);
      const preRestartResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === preRestartCommand.instanceId
      );

      expect(preRestartResponse).toBeDefined();
      connectionMonitor.logEvent('pre_restart_command_success');

      // Simulate server restart (stop and start server)
      connectionMonitor.logEvent('server_restart_begin');
      await testServer.stop();
      
      // Wait for disconnect to be detected
      await sleep(2000);
      
      // Check that client detected disconnection
      expect(wsClient.isConnected).toBe(false);
      connectionMonitor.logEvent('disconnection_detected');

      // Restart server
      await testServer.start();
      connectionMonitor.logEvent('server_restarted');

      // Reconnect client
      const reconnectTimer = performanceUtils.createTimer();
      await wsClient.connect();
      const reconnectDuration = reconnectTimer();

      expect(wsClient.isConnected).toBe(true);
      connectionMonitor.logEvent('reconnection_successful', { 
        duration: reconnectDuration 
      });

      // Verify functionality after reconnection
      const postRestartCommand = {
        instanceId: 'server-restart-test',
        type: 'user_input',
        command: 'echo "After server restart"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(postRestartCommand);
      const postRestartResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === postRestartCommand.instanceId
      );

      expect(postRestartResponse).toBeDefined();
      connectionMonitor.logEvent('post_restart_command_success');

      console.log(`[TEST] Successfully recovered from server restart in ${reconnectDuration.toFixed(2)}ms`);
    });
  });

  describe('Network Error Scenarios', () => {
    test('WebSocket handles connection timeout gracefully', async () => {
      // Connect to a non-existent server to test timeout behavior
      const timeoutClient = new WebSocketTestClient('ws://localhost:9999');
      
      const timeoutTimer = performanceUtils.createTimer();
      
      try {
        await timeoutClient.connect();
        fail('Should have thrown connection timeout error');
      } catch (error) {
        const timeoutDuration = timeoutTimer();
        
        expect(error.message).toContain('timeout');
        connectionMonitor.logEvent('connection_timeout_handled', { 
          duration: timeoutDuration,
          error: error.message 
        });

        console.log(`[TEST] Connection timeout handled gracefully in ${timeoutDuration.toFixed(2)}ms`);
      }

      // Verify we can still connect to valid server
      await wsClient.connect();
      expect(wsClient.isConnected).toBe(true);
      connectionMonitor.logEvent('valid_connection_after_timeout_test');
    });

    test('WebSocket recovers from message send failures', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('initial_connection');

      // Send valid command first
      const validCommand = {
        instanceId: 'send-failure-test',
        type: 'user_input',
        command: 'echo "Valid command before failure test"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(validCommand);
      const validResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === validCommand.instanceId
      );

      expect(validResponse).toBeDefined();
      connectionMonitor.logEvent('valid_command_before_failure_success');

      // Artificially close the WebSocket to simulate network failure
      wsClient.ws.close();
      await sleep(100); // Wait for close to be processed

      expect(wsClient.isConnected).toBe(false);
      connectionMonitor.logEvent('connection_artificially_closed');

      // Attempt to send command while disconnected (should fail gracefully)
      const failedCommand = {
        instanceId: 'send-failure-test',
        type: 'user_input',
        command: 'echo "This should fail"',
        timestamp: Date.now()
      };

      try {
        await wsClient.sendMessage(failedCommand);
        fail('Should have thrown error when sending on closed connection');
      } catch (error) {
        expect(error.message).toContain('not connected');
        connectionMonitor.logEvent('send_failure_handled_gracefully', { 
          error: error.message 
        });
      }

      // Reconnect and verify functionality
      await wsClient.connect();
      expect(wsClient.isConnected).toBe(true);
      connectionMonitor.logEvent('reconnection_successful');

      const recoveryCommand = {
        instanceId: 'send-failure-test',
        type: 'user_input',
        command: 'echo "Recovery after send failure"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(recoveryCommand);
      const recoveryResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === recoveryCommand.instanceId
      );

      expect(recoveryResponse).toBeDefined();
      connectionMonitor.logEvent('recovery_after_send_failure_successful');

      console.log('[TEST] Successfully recovered from send failure scenario');
    });
  });

  describe('Automatic Recovery Mechanisms', () => {
    test('WebSocket service handles multiple rapid reconnection attempts', async () => {
      const rapidReconnectClient = new WebSocketTestClient('ws://localhost:3001');
      
      // Perform multiple rapid connection attempts
      const connectionAttempts = 5;
      const connectionResults = [];

      for (let i = 0; i < connectionAttempts; i++) {
        try {
          const connectTimer = performanceUtils.createTimer();
          await rapidReconnectClient.connect();
          const connectDuration = connectTimer();

          connectionResults.push({
            attempt: i + 1,
            success: true,
            duration: connectDuration,
            connected: rapidReconnectClient.isConnected
          });

          connectionMonitor.logEvent('rapid_reconnect_success', { 
            attempt: i + 1, 
            duration: connectDuration 
          });

          // Disconnect before next attempt
          await rapidReconnectClient.disconnect();
          await sleep(200);

        } catch (error) {
          connectionResults.push({
            attempt: i + 1,
            success: false,
            error: error.message,
            connected: rapidReconnectClient.isConnected
          });

          connectionMonitor.logEvent('rapid_reconnect_failure', { 
            attempt: i + 1, 
            error: error.message 
          });
        }
      }

      // Verify most attempts succeeded
      const successfulAttempts = connectionResults.filter(r => r.success);
      expect(successfulAttempts.length).toBeGreaterThanOrEqual(connectionAttempts * 0.8); // At least 80% success

      connectionMonitor.logEvent('rapid_reconnection_test_completed', {
        totalAttempts: connectionAttempts,
        successfulAttempts: successfulAttempts.length,
        successRate: (successfulAttempts.length / connectionAttempts) * 100
      });

      console.log(`[TEST] Rapid reconnection test: ${successfulAttempts.length}/${connectionAttempts} attempts succeeded`);

      // Cleanup
      if (rapidReconnectClient.isConnected) {
        await rapidReconnectClient.disconnect();
      }
    });

    test('Connection state monitoring detects and reports issues correctly', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('monitoring_test_connection');

      // Monitor connection state during normal operation
      const initialStats = wsClient.getConnectionStats();
      expect(initialStats.isConnected).toBe(true);
      expect(initialStats.connectionEvents).toBeGreaterThan(0);

      connectionMonitor.logEvent('initial_monitoring_stats', initialStats);

      // Send commands while monitoring state
      const monitoringCommands = [
        'echo "Monitoring test 1"',
        'echo "Monitoring test 2"',
        'echo "Monitoring test 3"'
      ];

      for (let i = 0; i < monitoringCommands.length; i++) {
        const beforeStats = wsClient.getConnectionStats();
        
        const command = {
          instanceId: 'monitoring-test',
          type: 'user_input',
          command: monitoringCommands[i],
          timestamp: Date.now()
        };

        await wsClient.sendMessage(command);
        
        const response = await wsClient.waitForMessage(5000, msg => 
          msg.instanceId === command.instanceId
        );

        const afterStats = wsClient.getConnectionStats();

        // Verify state consistency
        expect(beforeStats.isConnected).toBe(true);
        expect(afterStats.isConnected).toBe(true);
        expect(afterStats.messageCount).toBeGreaterThan(beforeStats.messageCount);

        connectionMonitor.logEvent('monitoring_state_verified', {
          commandIndex: i,
          beforeConnected: beforeStats.isConnected,
          afterConnected: afterStats.isConnected,
          messageCountIncrease: afterStats.messageCount - beforeStats.messageCount
        });
      }

      const finalStats = wsClient.getConnectionStats();
      connectionMonitor.logEvent('final_monitoring_stats', finalStats);

      // Verify no error events were recorded during monitoring
      const errorEvents = finalStats.connectionHistory.filter(e => e.type === 'error');
      expect(errorEvents).toHaveLength(0);

      console.log('[TEST] Connection state monitoring accurately tracked all operations');
    });
  });
});