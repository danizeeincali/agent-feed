/**
 * Multiple Commands on Same WebSocket Tests
 * Verifies that a single WebSocket connection can handle multiple sequential commands
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep } = require('../utils/test-helpers');

describe('Multiple Commands on Same WebSocket', () => {
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

  describe('Sequential Command Execution', () => {
    test('Can send multiple commands on same WebSocket connection', async () => {
      // Connect once
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');
      expect(wsClient.isConnected).toBe(true);

      const commands = [
        { command: 'echo "Hello"', expectedResponse: 'Hello' },
        { command: 'pwd', expectedResponse: null }, // Just verify response exists
        { command: 'echo "What directory are you in?"', expectedResponse: 'What directory are you in?' },
        { command: 'ls', expectedResponse: null },
        { command: 'echo "Connection test complete"', expectedResponse: 'Connection test complete' }
      ];

      const responses = [];
      
      for (let i = 0; i < commands.length; i++) {
        const { command, expectedResponse } = commands[i];
        
        // Send command
        const messagePayload = {
          instanceId: 'multi-command-test',
          type: 'user_input',
          command: command,
          timestamp: Date.now()
        };

        connectionMonitor.logEvent('command_sent', { index: i, command });
        await wsClient.sendMessage(messagePayload);

        // Wait for response
        const response = await wsClient.waitForMessage(8000, msg => 
          msg.instanceId === messagePayload.instanceId
        );

        expect(response).toBeDefined();
        responses.push(response);

        connectionMonitor.logEvent('response_received', { 
          index: i, 
          command,
          hasResponse: !!response 
        });

        // Verify connection is still active
        expect(wsClient.isConnected).toBe(true);

        // Small delay between commands to allow processing
        if (i < commands.length - 1) {
          await sleep(300);
        }
      }

      // Verify all commands were processed
      expect(responses).toHaveLength(commands.length);
      
      // Verify same connection was used throughout (no reconnections)
      const stats = wsClient.getConnectionStats();
      const connectionEvents = stats.connectionHistory;
      const openEvents = connectionEvents.filter(e => e.type === 'open');
      const closeEvents = connectionEvents.filter(e => e.type === 'close');
      
      expect(openEvents).toHaveLength(1); // Only one connection
      expect(closeEvents).toHaveLength(0); // No unexpected closures
      
      connectionMonitor.logEvent('test_complete', {
        totalCommands: commands.length,
        totalResponses: responses.length,
        connectionEvents: connectionEvents.length
      });

      console.log(`[TEST] Successfully processed ${commands.length} commands on single WebSocket connection`);
    });

    test('WebSocket handles rapid sequential commands', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const rapidCommands = Array.from({ length: 10 }, (_, i) => ({
        instanceId: 'rapid-test',
        type: 'user_input',
        command: `echo "Rapid command ${i + 1}"`,
        timestamp: Date.now() + i
      }));

      const sendTimer = performanceUtils.createTimer();

      // Send all commands rapidly
      const sendPromises = rapidCommands.map(async (cmd, index) => {
        await wsClient.sendMessage(cmd);
        connectionMonitor.logEvent('rapid_command_sent', { index, command: cmd.command });
      });

      await Promise.all(sendPromises);
      const sendDuration = sendTimer();

      connectionMonitor.logEvent('all_rapid_commands_sent', { 
        count: rapidCommands.length,
        duration: sendDuration 
      });

      // Wait for all responses
      const responseTimer = performanceUtils.createTimer();
      const responses = [];

      for (let i = 0; i < rapidCommands.length; i++) {
        const response = await wsClient.waitForMessage(5000, msg => 
          msg.instanceId === 'rapid-test' && 
          msg.content && msg.content.includes(`Rapid command ${i + 1}`)
        );
        responses.push(response);
        connectionMonitor.logEvent('rapid_response_received', { index: i });
      }

      const responseDuration = responseTimer();

      // Verify all responses received
      expect(responses).toHaveLength(rapidCommands.length);
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('rapid_test_complete', {
        sendDuration,
        responseDuration,
        totalDuration: sendDuration + responseDuration
      });

      console.log(`[TEST] Processed ${rapidCommands.length} rapid commands in ${(sendDuration + responseDuration).toFixed(2)}ms`);
    });
  });

  describe('Command Type Variations', () => {
    test('Mixed command types on same connection', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const mixedCommands = [
        {
          type: 'user_input',
          command: 'echo "User input test"',
          expectedType: 'ai_response'
        },
        {
          type: 'system_command',
          command: 'pwd',
          expectedType: 'system_response'
        },
        {
          type: 'user_input',
          command: 'ls -la',
          expectedType: 'ai_response'
        },
        {
          type: 'tool_call',
          command: 'date',
          expectedType: 'tool_response'
        }
      ];

      const responses = [];
      
      for (let i = 0; i < mixedCommands.length; i++) {
        const { type, command } = mixedCommands[i];
        
        const messagePayload = {
          instanceId: 'mixed-commands-test',
          type: type,
          command: command,
          timestamp: Date.now()
        };

        await wsClient.sendMessage(messagePayload);
        connectionMonitor.logEvent('mixed_command_sent', { index: i, type, command });

        const response = await wsClient.waitForMessage(8000, msg => 
          msg.instanceId === messagePayload.instanceId
        );

        expect(response).toBeDefined();
        responses.push(response);

        connectionMonitor.logEvent('mixed_response_received', { 
          index: i, 
          responseType: response.type 
        });

        // Verify connection stability
        expect(wsClient.isConnected).toBe(true);
        
        await sleep(200);
      }

      expect(responses).toHaveLength(mixedCommands.length);

      // Verify connection remained stable throughout different message types
      const stats = wsClient.getConnectionStats();
      expect(stats.isConnected).toBe(true);
      expect(stats.connectionHistory.filter(e => e.type === 'error')).toHaveLength(0);

      console.log('[TEST] Successfully handled mixed command types on single connection');
    });

    test('Long-running commands do not break connection', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Send a command that might take longer to process
      const longCommand = {
        instanceId: 'long-running-test',
        type: 'user_input',
        command: 'find . -name "*.js" -type f | head -10 && sleep 2 && echo "Long command complete"',
        timestamp: Date.now()
      };

      const longRunTimer = performanceUtils.createTimer();
      await wsClient.sendMessage(longCommand);
      connectionMonitor.logEvent('long_command_sent');

      // Wait for response with extended timeout
      const longResponse = await wsClient.waitForMessage(15000, msg => 
        msg.instanceId === longCommand.instanceId
      );

      const longRunDuration = longRunTimer();
      
      expect(longResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('long_command_completed', { duration: longRunDuration });

      // Send follow-up command to verify connection is still functional
      const followUpCommand = {
        instanceId: 'long-running-test',
        type: 'user_input',
        command: 'echo "Follow-up after long command"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(followUpCommand);
      const followUpResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === followUpCommand.instanceId
      );

      expect(followUpResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('follow_up_completed');

      console.log(`[TEST] Connection survived ${longRunDuration.toFixed(2)}ms long-running command`);
    });
  });

  describe('Connection Resilience', () => {
    test('Connection recovers from temporary issues', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Send successful commands first
      const preIssueCommand = {
        instanceId: 'resilience-test',
        type: 'user_input',
        command: 'echo "Before any issues"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(preIssueCommand);
      const preResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === preIssueCommand.instanceId
      );

      expect(preResponse).toBeDefined();
      connectionMonitor.logEvent('pre_issue_command_success');

      // Try to send potentially problematic command
      const problematicCommand = {
        instanceId: 'resilience-test',
        type: 'user_input',
        command: 'nonexistent-command-that-might-cause-issues',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(problematicCommand);
      connectionMonitor.logEvent('problematic_command_sent');

      // Wait for response (might be error, but connection should remain)
      const problematicResponse = await wsClient.waitForMessage(8000, msg => 
        msg.instanceId === problematicCommand.instanceId
      );

      // Connection should still be alive regardless of command success/failure
      expect(wsClient.isConnected).toBe(true);
      connectionMonitor.logEvent('post_problematic_connection_check', {
        stillConnected: wsClient.isConnected,
        receivedResponse: !!problematicResponse
      });

      // Send recovery command
      const recoveryCommand = {
        instanceId: 'resilience-test',
        type: 'user_input',
        command: 'echo "Recovery successful"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(recoveryCommand);
      const recoveryResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === recoveryCommand.instanceId
      );

      expect(recoveryResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      connectionMonitor.logEvent('recovery_command_success');

      console.log('[TEST] Connection remained resilient through potential issues');
    });
  });
});