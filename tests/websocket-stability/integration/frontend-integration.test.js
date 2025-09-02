/**
 * Frontend Integration Tests for WebSocket Connection Stability
 * Tests the complete frontend-backend WebSocket integration
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep } = require('../utils/test-helpers');

describe('Frontend WebSocket Integration', () => {
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

  describe('UI Connection Stability', () => {
    test('Frontend does not show connection errors during normal operation', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('frontend_connection_established');

      // Simulate frontend UI interactions
      const uiInteractions = [
        {
          action: 'create_instance',
          payload: {
            instanceId: 'frontend-ui-test-001',
            type: 'create_instance',
            config: { mode: 'interactive' },
            timestamp: Date.now()
          }
        },
        {
          action: 'send_message',
          payload: {
            instanceId: 'frontend-ui-test-001',
            type: 'user_input',
            command: 'echo "Hello from UI"',
            timestamp: Date.now()
          }
        },
        {
          action: 'send_message',
          payload: {
            instanceId: 'frontend-ui-test-001',
            type: 'user_input',
            command: 'pwd',
            timestamp: Date.now()
          }
        },
        {
          action: 'send_message',
          payload: {
            instanceId: 'frontend-ui-test-001',
            type: 'user_input',
            command: 'echo "UI interaction complete"',
            timestamp: Date.now()
          }
        }
      ];

      const interactionResults = [];
      let hasConnectionError = false;
      let connectionErrorMessage = '';

      // Monitor for connection errors
      const errorMonitor = wsClient.on && wsClient.on('error', (error) => {
        hasConnectionError = true;
        connectionErrorMessage = error.message || 'Unknown connection error';
        connectionMonitor.logEvent('connection_error_detected', { error: connectionErrorMessage });
      });

      for (let i = 0; i < uiInteractions.length; i++) {
        const interaction = uiInteractions[i];
        
        const interactionTimer = performanceUtils.createTimer();
        await wsClient.sendMessage(interaction.payload);
        
        connectionMonitor.logEvent('ui_interaction_sent', {
          action: interaction.action,
          instanceId: interaction.payload.instanceId
        });

        try {
          const response = await wsClient.waitForMessage(8000, msg => 
            msg.instanceId === interaction.payload.instanceId
          );

          const interactionDuration = interactionTimer();
          
          interactionResults.push({
            action: interaction.action,
            success: !!response,
            duration: interactionDuration,
            hasError: hasConnectionError,
            connectionActive: wsClient.isConnected
          });

          connectionMonitor.logEvent('ui_interaction_completed', {
            action: interaction.action,
            success: true,
            duration: interactionDuration
          });

        } catch (error) {
          const interactionDuration = interactionTimer();
          
          interactionResults.push({
            action: interaction.action,
            success: false,
            duration: interactionDuration,
            error: error.message,
            hasError: hasConnectionError,
            connectionActive: wsClient.isConnected
          });

          connectionMonitor.logEvent('ui_interaction_failed', {
            action: interaction.action,
            error: error.message,
            duration: interactionDuration
          });
        }

        // Brief pause between interactions (simulating user behavior)
        await sleep(500);
      }

      // Verify no connection errors occurred during UI interactions
      expect(hasConnectionError).toBe(false);
      if (hasConnectionError) {
        console.error(`[TEST] Unexpected connection error: ${connectionErrorMessage}`);
      }

      // Verify all interactions succeeded
      const successfulInteractions = interactionResults.filter(r => r.success);
      expect(successfulInteractions.length).toBe(uiInteractions.length);

      // Verify connection remained active throughout
      interactionResults.forEach((result, index) => {
        expect(result.connectionActive).toBe(true);
        expect(result.hasError).toBe(false);
      });

      connectionMonitor.logEvent('ui_integration_test_completed', {
        totalInteractions: uiInteractions.length,
        successfulInteractions: successfulInteractions.length,
        hadConnectionErrors: hasConnectionError
      });

      console.log(`[TEST] Frontend UI completed ${successfulInteractions.length}/${uiInteractions.length} interactions without connection errors`);
    });

    test('UI properly displays responses without connection timeouts', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('ui_response_test_started');

      const responseTestCommands = [
        {
          command: 'echo "Response test 1"',
          expectedContent: 'Response test 1',
          timeout: 5000
        },
        {
          command: 'ls -la | head -3',
          expectedContent: null, // Just verify we get a response
          timeout: 8000
        },
        {
          command: 'echo "Multi-line response test\\nLine 1\\nLine 2\\nLine 3"',
          expectedContent: 'Multi-line response test',
          timeout: 5000
        },
        {
          command: 'date && echo "Timestamp response complete"',
          expectedContent: 'Timestamp response complete',
          timeout: 5000
        }
      ];

      const responseResults = [];

      for (let i = 0; i < responseTestCommands.length; i++) {
        const testCmd = responseTestCommands[i];
        
        const command = {
          instanceId: 'ui-response-test',
          type: 'user_input',
          command: testCmd.command,
          timestamp: Date.now()
        };

        const responseTimer = performanceUtils.createTimer();
        await wsClient.sendMessage(command);
        
        connectionMonitor.logEvent('ui_response_command_sent', {
          index: i,
          command: testCmd.command.substring(0, 50)
        });

        try {
          const response = await wsClient.waitForMessage(testCmd.timeout, msg => 
            msg.instanceId === command.instanceId
          );

          const responseDuration = responseTimer();
          
          const responseData = {
            index: i,
            command: testCmd.command,
            receivedResponse: !!response,
            responseDuration: responseDuration,
            connectionActive: wsClient.isConnected,
            responseContent: response?.content || response?.data || 'No content',
            timedOut: false
          };

          // Verify expected content if specified
          if (testCmd.expectedContent && response) {
            const responseText = JSON.stringify(response);
            responseData.hasExpectedContent = responseText.includes(testCmd.expectedContent);
          }

          responseResults.push(responseData);
          
          connectionMonitor.logEvent('ui_response_received', {
            index: i,
            duration: responseDuration,
            hasExpectedContent: responseData.hasExpectedContent
          });

        } catch (error) {
          const responseDuration = responseTimer();
          
          responseResults.push({
            index: i,
            command: testCmd.command,
            receivedResponse: false,
            responseDuration: responseDuration,
            connectionActive: wsClient.isConnected,
            timedOut: true,
            error: error.message
          });

          connectionMonitor.logEvent('ui_response_timeout', {
            index: i,
            duration: responseDuration,
            error: error.message
          });
        }

        await sleep(300);
      }

      // Verify all responses were received without timeouts
      const timeoutResponses = responseResults.filter(r => r.timedOut);
      expect(timeoutResponses.length).toBe(0);

      if (timeoutResponses.length > 0) {
        console.error('[TEST] Responses that timed out:', timeoutResponses.map(r => ({
          command: r.command.substring(0, 30),
          duration: r.responseDuration
        })));
      }

      // Verify connection remained active for all responses
      responseResults.forEach((result, index) => {
        expect(result.connectionActive).toBe(true);
        expect(result.receivedResponse).toBe(true);
      });

      connectionMonitor.logEvent('ui_response_test_completed', {
        totalCommands: responseTestCommands.length,
        successfulResponses: responseResults.filter(r => r.receivedResponse).length,
        timeoutCount: timeoutResponses.length
      });

      console.log(`[TEST] UI received all ${responseResults.length} responses without connection timeouts`);
    });
  });

  describe('Real-time Communication Features', () => {
    test('WebSocket handles real-time typing indicators and status updates', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('realtime_test_started');

      // Simulate typing indicators
      const typingIndicators = [
        {
          instanceId: 'realtime-test',
          type: 'typing_start',
          userId: 'test-user',
          timestamp: Date.now()
        },
        {
          instanceId: 'realtime-test',
          type: 'typing_stop',
          userId: 'test-user',
          timestamp: Date.now() + 100
        }
      ];

      // Send typing indicators
      for (const indicator of typingIndicators) {
        await wsClient.sendMessage(indicator);
        connectionMonitor.logEvent('typing_indicator_sent', {
          type: indicator.type,
          userId: indicator.userId
        });
        
        await sleep(150);
      }

      // Send actual command after typing indicators
      const realCommand = {
        instanceId: 'realtime-test',
        type: 'user_input',
        command: 'echo "Real-time communication test"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(realCommand);
      connectionMonitor.logEvent('realtime_command_sent');

      const response = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === realCommand.instanceId && msg.type === 'ai_response'
      );

      expect(response).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('realtime_test_completed', {
        hadResponse: !!response,
        connectionStable: wsClient.isConnected
      });

      console.log('[TEST] Real-time communication features worked without affecting connection stability');
    });

    test('Multiple concurrent UI sessions maintain stable connections', async () => {
      // Create multiple WebSocket clients to simulate multiple UI sessions
      const sessionClients = [];
      const sessionCount = 3;

      try {
        // Create and connect multiple clients
        for (let i = 0; i < sessionCount; i++) {
          const client = new WebSocketTestClient('ws://localhost:3001');
          await client.connect();
          sessionClients.push(client);
          
          connectionMonitor.logEvent('session_client_connected', { sessionId: i });
        }

        // Send commands from each session concurrently
        const sessionCommands = sessionClients.map((client, index) => ({
          client,
          command: {
            instanceId: `concurrent-ui-session-${index}`,
            type: 'user_input',
            command: `echo "Message from UI session ${index}"`,
            timestamp: Date.now()
          }
        }));

        // Send all commands concurrently
        const sendPromises = sessionCommands.map(async ({ client, command }, index) => {
          await client.sendMessage(command);
          connectionMonitor.logEvent('concurrent_session_command_sent', {
            sessionId: index,
            instanceId: command.instanceId
          });
        });

        await Promise.all(sendPromises);
        connectionMonitor.logEvent('all_concurrent_session_commands_sent');

        // Wait for responses from all sessions
        const responsePromises = sessionCommands.map(async ({ client, command }, index) => {
          const response = await client.waitForMessage(8000, msg => 
            msg.instanceId === command.instanceId
          );

          connectionMonitor.logEvent('concurrent_session_response_received', {
            sessionId: index,
            hasResponse: !!response,
            connectionActive: client.isConnected
          });

          return { sessionId: index, response, connectionActive: client.isConnected };
        });

        const responses = await Promise.all(responsePromises);

        // Verify all sessions received responses and maintained connections
        responses.forEach((result, index) => {
          expect(result.response).toBeDefined();
          expect(result.connectionActive).toBe(true);
        });

        connectionMonitor.logEvent('concurrent_sessions_test_completed', {
          totalSessions: sessionCount,
          successfulResponses: responses.filter(r => r.response).length,
          activeConnections: responses.filter(r => r.connectionActive).length
        });

        console.log(`[TEST] All ${sessionCount} concurrent UI sessions maintained stable connections`);

      } finally {
        // Clean up all session clients
        for (let i = 0; i < sessionClients.length; i++) {
          if (sessionClients[i]) {
            await sessionClients[i].disconnect();
            connectionMonitor.logEvent('session_client_disconnected', { sessionId: i });
          }
        }
      }
    });
  });

  describe('Error Display and Recovery', () => {
    test('UI gracefully handles and displays API errors without breaking connection', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('error_display_test_started');

      // Send command that might cause an error
      const errorCommand = {
        instanceId: 'error-display-test',
        type: 'user_input',
        command: 'nonexistent-command-xyz-123',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(errorCommand);
      connectionMonitor.logEvent('error_command_sent');

      // Wait for response (might be error response)
      const errorResponse = await wsClient.waitForMessage(8000, msg => 
        msg.instanceId === errorCommand.instanceId
      );

      // Regardless of response content, connection should remain stable
      expect(wsClient.isConnected).toBe(true);
      
      connectionMonitor.logEvent('error_response_received', {
        hasResponse: !!errorResponse,
        connectionStillActive: wsClient.isConnected
      });

      // Send recovery command to verify UI can continue working
      const recoveryCommand = {
        instanceId: 'error-display-test',
        type: 'user_input',
        command: 'echo "UI recovered from error"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(recoveryCommand);
      const recoveryResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === recoveryCommand.instanceId
      );

      expect(recoveryResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('error_recovery_completed', {
        recoverySuccessful: !!recoveryResponse,
        finalConnectionState: wsClient.isConnected
      });

      console.log('[TEST] UI handled API error gracefully without breaking WebSocket connection');
    });
  });
});