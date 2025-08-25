import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { ClaudeE2ETestFramework } from '@/test-utils/claude-e2e-framework';
import { waitFor, timeout } from '@/test-utils/async-helpers';

describe('Claude Instance E2E Communication', () => {
  let testFramework: ClaudeE2ETestFramework;
  let backendProcess: ChildProcess;
  let claudeInstances: Array<{
    id: string;
    process: ChildProcess;
    websocket: WebSocket;
    port: number;
  }> = [];

  beforeAll(async () => {
    // Start backend server
    backendProcess = spawn('node', ['backend-terminal-server-emergency-fix.js'], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for backend to be ready
    await waitFor(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3001');
        ws.on('open', () => {
          ws.close();
          resolve(true);
        });
        ws.on('error', () => resolve(false));
      });
    }, 10000);

    testFramework = new ClaudeE2ETestFramework();
    await testFramework.initialize();
  }, 30000);

  afterAll(async () => {
    // Clean up all Claude instances
    for (const instance of claudeInstances) {
      instance.websocket?.close();
      instance.process?.kill();
    }
    claudeInstances = [];

    // Stop backend server
    backendProcess?.kill();
    
    await testFramework?.cleanup();
  }, 10000);

  beforeEach(async () => {
    await testFramework.reset();
  });

  afterEach(async () => {
    // Clean up instances created in test
    for (const instance of claudeInstances) {
      await testFramework.terminateInstance(instance.id);
    }
    claudeInstances = [];
  });

  describe('Single Instance Communication', () => {
    test('should create Claude chat instance and establish communication', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3002,
        name: 'E2E Test Chat Instance'
      };

      // Create instance via API
      const instance = await testFramework.createInstance(config);
      expect(instance.id).toBeDefined();
      expect(instance.status).toBe('starting');

      // Wait for instance to be ready
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      // Establish WebSocket connection
      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Test basic communication
      const response = await testFramework.sendMessage(instance.id, {
        content: 'Hello Claude, this is a test message',
        role: 'user'
      });

      expect(response).toMatchObject({
        role: 'assistant',
        content: expect.stringContaining('Hello')
      });
    }, 20000);

    test('should create Claude terminal instance and execute commands', async () => {
      const config = {
        mode: 'terminal' as const,
        port: 3003,
        name: 'E2E Test Terminal Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Execute simple command
      const commandResult = await testFramework.executeCommand(instance.id, 'echo "Hello Terminal"');
      
      expect(commandResult.output).toContain('Hello Terminal');
      expect(commandResult.exitCode).toBe(0);
    }, 20000);

    test('should handle instance startup failures gracefully', async () => {
      const config = {
        mode: 'chat' as const,
        port: 80, // Privileged port, should fail
        name: 'Failing Instance'
      };

      await expect(testFramework.createInstance(config))
        .rejects.toThrow(/failed|error|permission/i);
    });

    test('should maintain persistent session state', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3004,
        name: 'Session Test Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Send first message
      await testFramework.sendMessage(instance.id, {
        content: 'Please remember that my name is Alice',
        role: 'user'
      });

      // Send follow-up message
      const response = await testFramework.sendMessage(instance.id, {
        content: 'What is my name?',
        role: 'user'
      });

      expect(response.content.toLowerCase()).toContain('alice');
    }, 25000);
  });

  describe('Multi-Instance Communication', () => {
    test('should create and manage multiple Claude instances simultaneously', async () => {
      const configs = [
        { mode: 'chat' as const, port: 3005, name: 'Chat Instance 1' },
        { mode: 'chat' as const, port: 3006, name: 'Chat Instance 2' },
        { mode: 'terminal' as const, port: 3007, name: 'Terminal Instance 1' }
      ];

      // Create all instances
      const instances = await Promise.all(
        configs.map(config => testFramework.createInstance(config))
      );

      // Wait for all to be ready
      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await testFramework.getInstanceStatus(instance.id);
            return status.state === 'running';
          }, 15000)
        )
      );

      // Connect WebSockets to all instances
      const websockets = await Promise.all(
        instances.map(instance => testFramework.connectWebSocket(instance.id))
      );

      instances.forEach((instance, i) => {
        claudeInstances.push({
          id: instance.id,
          process: null as any,
          websocket: websockets[i],
          port: configs[i].port
        });
      });

      // Test independent communication to each instance
      const chatResponse1 = await testFramework.sendMessage(instances[0].id, {
        content: 'You are instance 1',
        role: 'user'
      });
      
      const chatResponse2 = await testFramework.sendMessage(instances[1].id, {
        content: 'You are instance 2',
        role: 'user'
      });

      const terminalResult = await testFramework.executeCommand(
        instances[2].id,
        'echo "Terminal instance working"'
      );

      expect(chatResponse1.content).toBeDefined();
      expect(chatResponse2.content).toBeDefined();
      expect(terminalResult.output).toContain('Terminal instance working');
    }, 30000);

    test('should isolate instance states properly', async () => {
      const configs = [
        { mode: 'chat' as const, port: 3008, name: 'Isolation Test 1' },
        { mode: 'chat' as const, port: 3009, name: 'Isolation Test 2' }
      ];

      const instances = await Promise.all(
        configs.map(config => testFramework.createInstance(config))
      );

      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await testFramework.getInstanceStatus(instance.id);
            return status.state === 'running';
          }, 15000)
        )
      );

      const websockets = await Promise.all(
        instances.map(instance => testFramework.connectWebSocket(instance.id))
      );

      instances.forEach((instance, i) => {
        claudeInstances.push({
          id: instance.id,
          process: null as any,
          websocket: websockets[i],
          port: configs[i].port
        });
      });

      // Set different context for each instance
      await testFramework.sendMessage(instances[0].id, {
        content: 'My favorite color is blue',
        role: 'user'
      });

      await testFramework.sendMessage(instances[1].id, {
        content: 'My favorite color is red',
        role: 'user'
      });

      // Query each instance
      const response1 = await testFramework.sendMessage(instances[0].id, {
        content: 'What is my favorite color?',
        role: 'user'
      });

      const response2 = await testFramework.sendMessage(instances[1].id, {
        content: 'What is my favorite color?',
        role: 'user'
      });

      expect(response1.content.toLowerCase()).toContain('blue');
      expect(response2.content.toLowerCase()).toContain('red');
    }, 25000);
  });

  describe('Real-time WebSocket Communication', () => {
    test('should handle real-time streaming responses', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3010,
        name: 'Streaming Test Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      const streamChunks: string[] = [];
      
      // Set up streaming listener
      const streamPromise = new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'stream_chunk') {
            streamChunks.push(message.content);
          } else if (message.type === 'stream_end') {
            resolve();
          }
        });
      });

      // Send message with streaming enabled
      ws.send(JSON.stringify({
        type: 'message',
        content: 'Please count from 1 to 10',
        stream: true
      }));

      await streamPromise;
      
      expect(streamChunks.length).toBeGreaterThan(1);
      expect(streamChunks.join('')).toMatch(/1.*2.*3.*4.*5/);
    }, 20000);

    test('should maintain WebSocket connection stability', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3011,
        name: 'Stability Test Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Send multiple messages rapidly
      const messages = Array.from({ length: 10 }, (_, i) => 
        `Test message ${i + 1}`
      );

      const responses = [];
      for (const message of messages) {
        const response = await testFramework.sendMessage(instance.id, {
          content: message,
          role: 'user'
        });
        responses.push(response);
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.content).toBeDefined();
        expect(response.role).toBe('assistant');
      });
    }, 25000);

    test('should handle WebSocket reconnection gracefully', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3012,
        name: 'Reconnection Test Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      let ws = await testFramework.connectWebSocket(instance.id);
      
      // Send initial message
      const initialResponse = await testFramework.sendMessage(instance.id, {
        content: 'Remember my name is Bob',
        role: 'user'
      });
      expect(initialResponse.content).toBeDefined();

      // Force disconnect
      ws.close();
      
      // Wait and reconnect
      await new Promise(resolve => setTimeout(resolve, 1000));
      ws = await testFramework.connectWebSocket(instance.id);
      
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Test if session state persisted
      const followupResponse = await testFramework.sendMessage(instance.id, {
        content: 'What is my name?',
        role: 'user'
      });
      
      expect(followupResponse.content.toLowerCase()).toContain('bob');
    }, 20000);
  });

  describe('Error Handling and Recovery', () => {
    test('should handle Claude process crashes gracefully', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3013,
        name: 'Crash Recovery Test',
        autoRestart: true
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      
      // Force crash the Claude process
      await testFramework.crashInstance(instance.id);
      
      // Wait for auto-restart
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running' && status.restartCount > 0;
      }, 20000);

      // Reconnect WebSocket
      const newWs = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: newWs,
        port: config.port
      });

      // Test if instance is responsive after restart
      const response = await testFramework.sendMessage(instance.id, {
        content: 'Are you working after restart?',
        role: 'user'
      });
      
      expect(response.content).toBeDefined();
    }, 30000);

    test('should timeout unresponsive instances', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3014,
        name: 'Timeout Test Instance',
        responseTimeout: 5000
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      // Simulate unresponsive instance
      await testFramework.makeInstanceUnresponsive(instance.id);
      
      // Attempt to send message (should timeout)
      await expect(
        timeout(
          testFramework.sendMessage(instance.id, {
            content: 'This should timeout',
            role: 'user'
          }),
          6000
        )
      ).rejects.toThrow(/timeout/i);
    }, 15000);
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent requests to single instance', async () => {
      const config = {
        mode: 'chat' as const,
        port: 3015,
        name: 'Load Test Instance'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Send 5 concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        testFramework.sendMessage(instance.id, {
          content: `Concurrent message ${i + 1}`,
          role: 'user'
        })
      );

      const responses = await Promise.all(concurrentRequests);
      
      expect(responses).toHaveLength(5);
      responses.forEach((response, i) => {
        expect(response.content).toBeDefined();
        expect(response.role).toBe('assistant');
      });
    }, 20000);

    test('should monitor resource usage during operations', async () => {
      const config = {
        mode: 'terminal' as const,
        port: 3016,
        name: 'Resource Monitor Test'
      };

      const instance = await testFramework.createInstance(config);
      await waitFor(async () => {
        const status = await testFramework.getInstanceStatus(instance.id);
        return status.state === 'running';
      }, 15000);

      const ws = await testFramework.connectWebSocket(instance.id);
      claudeInstances.push({
        id: instance.id,
        process: null as any,
        websocket: ws,
        port: config.port
      });

      // Get initial stats
      const initialStats = await testFramework.getInstanceStats(instance.id);
      
      // Perform resource-intensive operation
      await testFramework.executeCommand(
        instance.id,
        'for i in {1..100}; do echo "Resource test $i"; done'
      );

      // Get final stats
      const finalStats = await testFramework.getInstanceStats(instance.id);
      
      expect(initialStats.memoryUsage).toBeDefined();
      expect(finalStats.memoryUsage).toBeDefined();
      expect(finalStats.messageCount).toBeGreaterThan(initialStats.messageCount);
    }, 15000);
  });
});
