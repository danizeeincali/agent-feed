/**
 * WebSocket Connection Persistence Tests
 * Tests that verify WebSocket connections remain stable during and after Claude API calls
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep, retry } = require('../utils/test-helpers');

describe('WebSocket Connection Persistence', () => {
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

  describe('Basic Connection Stability', () => {
    test('WebSocket remains connected after Claude API call', async () => {
      // Connect WebSocket
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');
      expect(wsClient.isConnected).toBe(true);

      // Send a command that triggers Claude API
      const testCommand = {
        instanceId: 'test-instance-001',
        type: 'user_input',
        command: 'echo "Hello Claude"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(testCommand);
      connectionMonitor.logEvent('command_sent', testCommand);

      // Wait for response (this should trigger Claude API call)
      const response = await wsClient.waitForMessage(10000, msg => 
        msg.instanceId === testCommand.instanceId && msg.type === 'ai_response'
      );

      connectionMonitor.logEvent('api_response_received', response);
      expect(response).toBeDefined();
      
      // Verify WebSocket is still connected after API call
      expect(wsClient.isConnected).toBe(true);
      connectionMonitor.logEvent('connection_verified_after_api');

      // Send another command to verify connection is still functional
      const secondCommand = {
        instanceId: 'test-instance-001',
        type: 'user_input',
        command: 'pwd',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(secondCommand);
      connectionMonitor.logEvent('second_command_sent', secondCommand);

      const secondResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === secondCommand.instanceId
      );

      connectionMonitor.logEvent('second_response_received', secondResponse);
      expect(secondResponse).toBeDefined();
      expect(wsClient.isConnected).toBe(true);

      // Verify no unexpected disconnections occurred
      const closeEvents = connectionMonitor.getEvents('close');
      expect(closeEvents).toHaveLength(0);

      console.log('[TEST] Connection remained stable throughout API calls');
    });

    test('No dead connection cleanup during normal operation', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const startTime = Date.now();
      const commands = [
        'ls -la',
        'echo "test message 1"',
        'date',
        'echo "test message 2"',
        'whoami'
      ];

      // Send multiple commands in sequence
      for (let i = 0; i < commands.length; i++) {
        const command = {
          instanceId: 'test-instance-002',
          type: 'user_input',
          command: commands[i],
          timestamp: Date.now()
        };

        await wsClient.sendMessage(command);
        connectionMonitor.logEvent('command_sent', { index: i, command: commands[i] });
        
        // Wait for response
        await wsClient.waitForMessage(5000, msg => 
          msg.instanceId === command.instanceId
        );
        
        connectionMonitor.logEvent('response_received', { index: i });
        
        // Small delay between commands
        await sleep(500);
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Verify connection remained stable
      expect(wsClient.isConnected).toBe(true);

      // Verify no "dead connection" cleanup messages in the timeline
      const events = connectionMonitor.getEvents();
      const hasDeadConnectionCleanup = events.some(event => 
        event.data && JSON.stringify(event.data).includes('dead connection')
      );

      expect(hasDeadConnectionCleanup).toBe(false);

      console.log(`[TEST] Processed ${commands.length} commands in ${totalDuration}ms without dead connection cleanup`);
    });
  });

  describe('API Call Isolation', () => {
    test('Claude API subprocess completion does not affect WebSocket', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      // Monitor connection stats before API call
      const statsBefore = wsClient.getConnectionStats();
      connectionMonitor.logEvent('stats_before_api', statsBefore);

      // Trigger a Claude API call that will create a subprocess
      const complexCommand = {
        instanceId: 'test-instance-003',
        type: 'user_input',
        command: 'ls -la && echo "Processing complete" && pwd',
        timestamp: Date.now()
      };

      const apiCallTimer = performanceUtils.createTimer();
      await wsClient.sendMessage(complexCommand);
      connectionMonitor.logEvent('complex_command_sent');

      // Wait for API response (subprocess should complete)
      const apiResponse = await wsClient.waitForMessage(15000, msg => 
        msg.instanceId === complexCommand.instanceId
      );

      const apiCallDuration = apiCallTimer();
      connectionMonitor.logEvent('api_call_completed', { 
        duration: apiCallDuration,
        hasResponse: !!apiResponse 
      });

      // Monitor connection stats after API call
      const statsAfter = wsClient.getConnectionStats();
      connectionMonitor.logEvent('stats_after_api', statsAfter);

      // Verify WebSocket connection is still alive
      expect(wsClient.isConnected).toBe(true);
      expect(statsAfter.isConnected).toBe(true);

      // Verify we can still send messages
      const verificationCommand = {
        instanceId: 'test-instance-003',
        type: 'user_input',
        command: 'echo "Connection verification"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(verificationCommand);
      const verificationResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === verificationCommand.instanceId
      );

      expect(verificationResponse).toBeDefined();
      connectionMonitor.logEvent('connection_verified_post_subprocess');

      // Ensure no disconnection events occurred
      const disconnectionEvents = connectionMonitor.getEvents().filter(event =>
        event.type === 'close' || event.type === 'error' || 
        (event.data && JSON.stringify(event.data).includes('disconnect'))
      );

      expect(disconnectionEvents).toHaveLength(0);
      
      console.log(`[TEST] WebSocket remained connected through ${apiCallDuration.toFixed(2)}ms API call`);
    });

    test('Multiple concurrent API calls do not interfere with WebSocket', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('websocket_connected');

      const instanceIds = ['test-concurrent-001', 'test-concurrent-002', 'test-concurrent-003'];
      const commands = instanceIds.map((id, index) => ({
        instanceId: id,
        type: 'user_input',
        command: `echo "Concurrent command ${index + 1}" && sleep 2 && echo "Command ${index + 1} complete"`,
        timestamp: Date.now()
      }));

      // Send all commands concurrently
      const sendPromises = commands.map(async (command, index) => {
        await sleep(index * 100); // Slight delay to stagger sends
        await wsClient.sendMessage(command);
        connectionMonitor.logEvent('concurrent_command_sent', { index, instanceId: command.instanceId });
      });

      await Promise.all(sendPromises);
      connectionMonitor.logEvent('all_concurrent_commands_sent');

      // Wait for all responses
      const responsePromises = instanceIds.map(instanceId => 
        wsClient.waitForMessage(10000, msg => 
          msg.instanceId === instanceId && msg.type === 'ai_response'
        )
      );

      const responses = await Promise.all(responsePromises);
      connectionMonitor.logEvent('all_concurrent_responses_received', { 
        responseCount: responses.length 
      });

      // Verify all responses received
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
      });

      // Verify WebSocket is still connected and functional
      expect(wsClient.isConnected).toBe(true);

      const finalVerification = {
        instanceId: 'test-concurrent-final',
        type: 'user_input',
        command: 'echo "All concurrent tests complete"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(finalVerification);
      const finalResponse = await wsClient.waitForMessage(5000, msg => 
        msg.instanceId === finalVerification.instanceId
      );

      expect(finalResponse).toBeDefined();
      connectionMonitor.logEvent('final_verification_complete');

      console.log('[TEST] WebSocket remained stable through concurrent API calls');
    });
  });

  describe('Connection State Monitoring', () => {
    test('Connection state remains consistent during API operations', async () => {
      await wsClient.connect();
      
      const initialStats = wsClient.getConnectionStats();
      expect(initialStats.isConnected).toBe(true);
      expect(initialStats.connectionEvents.some(e => e.type === 'open')).toBe(true);

      // Perform API operation
      const command = {
        instanceId: 'test-state-monitor',
        type: 'user_input',
        command: 'echo "State monitoring test"',
        timestamp: Date.now()
      };

      await wsClient.sendMessage(command);
      
      // Check state during operation
      const duringStats = wsClient.getConnectionStats();
      expect(duringStats.isConnected).toBe(true);

      await wsClient.waitForMessage(5000, msg => msg.instanceId === command.instanceId);
      
      // Check state after operation
      const afterStats = wsClient.getConnectionStats();
      expect(afterStats.isConnected).toBe(true);
      expect(afterStats.messageCount).toBeGreaterThan(initialStats.messageCount);

      // Verify no error events
      const errorEvents = afterStats.connectionHistory.filter(e => e.type === 'error');
      expect(errorEvents).toHaveLength(0);

      console.log('[TEST] Connection state remained consistent throughout operation');
    });
  });
});