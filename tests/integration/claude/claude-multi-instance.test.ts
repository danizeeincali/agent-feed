import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ClaudeMultiInstanceManager } from '@/services/claude-multi-instance-manager';
import { InstanceMode, InstanceState } from '@/types/claude-types';
import { TestWebSocketClient } from '@/test-utils/websocket-client';
import { waitFor } from '@/test-utils/async-helpers';

describe('Claude Multi-Instance Support', () => {
  let manager: ClaudeMultiInstanceManager;
  let clients: Map<string, TestWebSocketClient> = new Map();
  let createdInstances: string[] = [];

  beforeAll(async () => {
    manager = new ClaudeMultiInstanceManager();
    await manager.initialize();
  });

  afterAll(async () => {
    // Clean up all test instances
    for (const instanceId of createdInstances) {
      await manager.terminateInstance(instanceId);
    }
    
    // Close all WebSocket clients
    for (const client of clients.values()) {
      await client.disconnect();
    }
    
    await manager.shutdown();
  });

  beforeEach(async () => {
    // Reset state between tests
    await manager.reset();
    createdInstances = [];
    
    for (const client of clients.values()) {
      await client.disconnect();
    }
    clients.clear();
  });

  describe('Instance Creation and Management', () => {
    test('should create multiple instances with different modes', async () => {
      const configs = [
        {
          mode: InstanceMode.CHAT,
          name: 'Chat Instance 1',
          port: 3101
        },
        {
          mode: InstanceMode.TERMINAL, 
          name: 'Terminal Instance 1',
          port: 3102
        },
        {
          mode: InstanceMode.CODE,
          name: 'Code Instance 1', 
          port: 3103
        },
        {
          mode: InstanceMode.CHAT,
          name: 'Chat Instance 2',
          port: 3104
        }
      ];

      // Create all instances
      const instances = [];
      for (const config of configs) {
        const instance = await manager.createInstance(config);
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      expect(instances).toHaveLength(4);
      
      // Verify each instance has correct properties
      instances.forEach((instance, index) => {
        expect(instance.id).toBeDefined();
        expect(instance.mode).toBe(configs[index].mode);
        expect(instance.name).toBe(configs[index].name);
        expect(instance.port).toBe(configs[index].port);
        expect(instance.state).toBe(InstanceState.STARTING);
      });

      // Wait for all instances to be running
      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Verify all instances are running
      const runningInstances = await manager.getInstances({ state: InstanceState.RUNNING });
      expect(runningInstances).toHaveLength(4);
    });

    test('should enforce port uniqueness across instances', async () => {
      const config1 = {
        mode: InstanceMode.CHAT,
        name: 'Instance 1',
        port: 3105
      };

      const config2 = {
        mode: InstanceMode.TERMINAL,
        name: 'Instance 2', 
        port: 3105 // Same port
      };

      const instance1 = await manager.createInstance(config1);
      createdInstances.push(instance1.id);
      
      await expect(manager.createInstance(config2))
        .rejects.toThrow(/port.*already.*use/i);
    });

    test('should enforce maximum instance limits', async () => {
      const maxInstances = 3;
      await manager.setMaxInstances(maxInstances);

      // Create maximum allowed instances
      for (let i = 0; i < maxInstances; i++) {
        const instance = await manager.createInstance({
          mode: InstanceMode.CHAT,
          name: `Instance ${i + 1}`,
          port: 3106 + i
        });
        createdInstances.push(instance.id);
      }

      // Attempt to create one more
      await expect(manager.createInstance({
        mode: InstanceMode.CHAT,
        name: 'Excess Instance',
        port: 3109
      })).rejects.toThrow(/maximum.*instance.*limit/i);
    });

    test('should handle instance name uniqueness', async () => {
      const instanceName = 'Unique Test Instance';
      
      const instance1 = await manager.createInstance({
        mode: InstanceMode.CHAT,
        name: instanceName,
        port: 3110
      });
      createdInstances.push(instance1.id);
      
      await expect(manager.createInstance({
        mode: InstanceMode.TERMINAL,
        name: instanceName, // Duplicate name
        port: 3111
      })).rejects.toThrow(/name.*already.*use/i);
    });
  });

  describe('Cross-Instance Communication', () => {
    test('should maintain isolated communication channels', async () => {
      // Create two chat instances
      const instance1 = await manager.createInstance({
        mode: InstanceMode.CHAT,
        name: 'Isolation Test 1',
        port: 3112
      });
      createdInstances.push(instance1.id);

      const instance2 = await manager.createInstance({
        mode: InstanceMode.CHAT,
        name: 'Isolation Test 2', 
        port: 3113
      });
      createdInstances.push(instance2.id);

      // Wait for both to be running
      await Promise.all([
        waitFor(async () => {
          const status = await manager.getInstanceStatus(instance1.id);
          return status.state === InstanceState.RUNNING;
        }, 15000),
        waitFor(async () => {
          const status = await manager.getInstanceStatus(instance2.id);
          return status.state === InstanceState.RUNNING;
        }, 15000)
      ]);

      // Connect WebSocket clients
      const client1 = new TestWebSocketClient(`ws://localhost:${instance1.port}`);
      const client2 = new TestWebSocketClient(`ws://localhost:${instance2.port}`);
      
      await client1.connect();
      await client2.connect();
      
      clients.set(instance1.id, client1);
      clients.set(instance2.id, client2);

      // Send different context to each instance
      await client1.sendMessage({
        type: 'user_message',
        content: 'My favorite animal is a cat'
      });

      await client2.sendMessage({
        type: 'user_message',
        content: 'My favorite animal is a dog'
      });

      // Wait for responses
      await client1.waitForResponse();
      await client2.waitForResponse();

      // Query each instance about the context
      await client1.sendMessage({
        type: 'user_message',
        content: 'What is my favorite animal?'
      });

      await client2.sendMessage({
        type: 'user_message',
        content: 'What is my favorite animal?'
      });

      const response1 = await client1.waitForResponse();
      const response2 = await client2.waitForResponse();

      expect(response1.content.toLowerCase()).toContain('cat');
      expect(response2.content.toLowerCase()).toContain('dog');
    });

    test('should support concurrent operations across instances', async () => {
      // Create multiple instances
      const instanceConfigs = Array.from({ length: 3 }, (_, i) => ({
        mode: InstanceMode.CHAT,
        name: `Concurrent Test ${i + 1}`,
        port: 3114 + i
      }));

      const instances = [];
      for (const config of instanceConfigs) {
        const instance = await manager.createInstance(config);
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      // Wait for all to be running
      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Connect WebSocket clients
      const clients = [];
      for (const instance of instances) {
        const client = new TestWebSocketClient(`ws://localhost:${instance.port}`);
        await client.connect();
        clients.push(client);
        this.clients.set(instance.id, client);
      }

      // Send concurrent messages to all instances
      const messagePromises = clients.map((client, i) => 
        client.sendMessage({
          type: 'user_message',
          content: `Concurrent message to instance ${i + 1}`
        })
      );

      await Promise.all(messagePromises);

      // Wait for all responses
      const responses = await Promise.all(
        clients.map(client => client.waitForResponse())
      );

      expect(responses).toHaveLength(3);
      responses.forEach((response, i) => {
        expect(response.content).toBeDefined();
        expect(response.type).toBe('assistant_message');
      });
    });
  });

  describe('Load Balancing and Resource Management', () => {
    test('should distribute load across available instances', async () => {
      // Create multiple chat instances
      const instanceConfigs = Array.from({ length: 3 }, (_, i) => ({
        mode: InstanceMode.CHAT,
        name: `Load Balance ${i + 1}`,
        port: 3117 + i,
        enableLoadBalancing: true
      }));

      const instances = [];
      for (const config of instanceConfigs) {
        const instance = await manager.createInstance(config);
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Create a load-balanced endpoint
      const loadBalancer = manager.createLoadBalancer({
        instanceIds: instances.map(i => i.id),
        strategy: 'round_robin'
      });

      // Send multiple messages through load balancer
      const messagePromises = Array.from({ length: 9 }, (_, i) => 
        loadBalancer.sendMessage({
          type: 'user_message',
          content: `Load balanced message ${i + 1}`
        })
      );

      const responses = await Promise.all(messagePromises);
      expect(responses).toHaveLength(9);

      // Verify load distribution
      const stats = await Promise.all(
        instances.map(instance => manager.getInstanceStats(instance.id))
      );

      const messageCounts = stats.map(stat => stat.messageCount);
      
      // Each instance should have received approximately equal messages
      const avgMessages = messageCounts.reduce((a, b) => a + b) / messageCounts.length;
      messageCounts.forEach(count => {
        expect(Math.abs(count - avgMessages)).toBeLessThan(2);
      });
    });

    test('should monitor resource usage across all instances', async () => {
      // Create instances with different workloads
      const configs = [
        { mode: InstanceMode.CHAT, name: 'Light Load', port: 3120 },
        { mode: InstanceMode.TERMINAL, name: 'Heavy Load', port: 3121 }
      ];

      const instances = [];
      for (const config of configs) {
        const instance = await manager.createInstance(config);
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Get baseline resource usage
      const baselineStats = await manager.getSystemStats();
      expect(baselineStats.totalInstances).toBe(2);
      expect(baselineStats.runningInstances).toBe(2);
      expect(baselineStats.totalMemoryUsage).toBeGreaterThan(0);
      expect(baselineStats.totalCpuUsage).toBeGreaterThanOrEqual(0);

      // Generate different workloads
      const chatClient = new TestWebSocketClient(`ws://localhost:${instances[0].port}`);
      const terminalClient = new TestWebSocketClient(`ws://localhost:${instances[1].port}`);
      
      await chatClient.connect();
      await terminalClient.connect();
      
      clients.set(instances[0].id, chatClient);
      clients.set(instances[1].id, terminalClient);

      // Light workload for chat
      await chatClient.sendMessage({
        type: 'user_message',
        content: 'Simple question'
      });

      // Heavy workload for terminal
      await terminalClient.sendMessage({
        type: 'terminal_command',
        content: 'find / -type f -name "*.txt" 2>/dev/null | head -100'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check resource usage after workload
      const afterStats = await manager.getSystemStats();
      
      expect(afterStats.totalMemoryUsage).toBeGreaterThanOrEqual(baselineStats.totalMemoryUsage);
      expect(afterStats.instanceStats).toHaveLength(2);
      
      // Terminal instance should show higher resource usage
      const terminalStats = afterStats.instanceStats.find(
        stat => stat.instanceId === instances[1].id
      );
      const chatStats = afterStats.instanceStats.find(
        stat => stat.instanceId === instances[0].id
      );
      
      expect(terminalStats?.memoryUsage).toBeGreaterThan(chatStats?.memoryUsage || 0);
    });
  });

  describe('Instance Lifecycle Management', () => {
    test('should handle cascaded shutdowns gracefully', async () => {
      // Create a cluster of instances
      const clusterSize = 4;
      const instances = [];
      
      for (let i = 0; i < clusterSize; i++) {
        const instance = await manager.createInstance({
          mode: InstanceMode.CHAT,
          name: `Cluster Instance ${i + 1}`,
          port: 3122 + i
        });
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      // Wait for all instances to be running
      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Initiate graceful shutdown of all instances
      const shutdownPromise = manager.gracefulShutdownAll();
      
      // Monitor state transitions
      const stateTransitions: Array<{instanceId: string, state: InstanceState, timestamp: number}> = [];
      
      const stateMonitor = setInterval(async () => {
        try {
          const allInstances = await manager.getInstances();
          allInstances.forEach(instance => {
            stateTransitions.push({
              instanceId: instance.id,
              state: instance.state,
              timestamp: Date.now()
            });
          });
        } catch (error) {
          // Instances may be cleaned up during shutdown
        }
      }, 100);

      await shutdownPromise;
      clearInterval(stateMonitor);

      // Verify graceful shutdown occurred
      const finalInstances = await manager.getInstances();
      expect(finalInstances).toHaveLength(0);
      
      // Verify state transitions included STOPPING state
      const stoppedStates = stateTransitions.filter(
        transition => transition.state === InstanceState.STOPPING
      );
      expect(stoppedStates.length).toBeGreaterThan(0);
    });

    test('should auto-restart failed instances when configured', async () => {
      const instance = await manager.createInstance({
        mode: InstanceMode.CHAT,
        name: 'Auto Restart Test',
        port: 3126,
        autoRestart: true,
        maxRestartAttempts: 3
      });
      createdInstances.push(instance.id);

      await waitFor(async () => {
        const status = await manager.getInstanceStatus(instance.id);
        return status.state === InstanceState.RUNNING;
      }, 15000);

      // Force crash the instance
      await manager.forceTerminateInstance(instance.id);

      // Wait for auto-restart
      await waitFor(async () => {
        const status = await manager.getInstanceStatus(instance.id);
        return status.state === InstanceState.RUNNING && status.restartCount > 0;
      }, 20000);

      const finalStatus = await manager.getInstanceStatus(instance.id);
      expect(finalStatus.restartCount).toBe(1);
      expect(finalStatus.state).toBe(InstanceState.RUNNING);
    });

    test('should respect restart limits and mark as failed', async () => {
      const instance = await manager.createInstance({
        mode: InstanceMode.CHAT,
        name: 'Restart Limit Test',
        port: 3127,
        autoRestart: true,
        maxRestartAttempts: 2
      });
      createdInstances.push(instance.id);

      await waitFor(async () => {
        const status = await manager.getInstanceStatus(instance.id);
        return status.state === InstanceState.RUNNING;
      }, 15000);

      // Force multiple crashes
      for (let i = 0; i < 3; i++) {
        await manager.forceTerminateInstance(instance.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Wait for final state
      await waitFor(async () => {
        const status = await manager.getInstanceStatus(instance.id);
        return status.state === InstanceState.FAILED;
      }, 15000);

      const finalStatus = await manager.getInstanceStatus(instance.id);
      expect(finalStatus.state).toBe(InstanceState.FAILED);
      expect(finalStatus.restartCount).toBe(2); // Should not exceed limit
    });
  });

  describe('Configuration and Customization', () => {
    test('should support per-instance configuration', async () => {
      const customConfigs = [
        {
          mode: InstanceMode.CHAT,
          name: 'Custom Config 1',
          port: 3128,
          config: {
            maxMemoryMB: 256,
            responseTimeoutMs: 10000,
            customEnvironment: {
              CLAUDE_PERSONA: 'helpful_assistant',
              CLAUDE_MAX_TOKENS: '1000'
            }
          }
        },
        {
          mode: InstanceMode.TERMINAL,
          name: 'Custom Config 2', 
          port: 3129,
          config: {
            maxMemoryMB: 512,
            responseTimeoutMs: 30000,
            customEnvironment: {
              CLAUDE_PERSONA: 'coding_assistant',
              CLAUDE_SHELL: '/bin/bash'
            }
          }
        }
      ];

      const instances = [];
      for (const config of customConfigs) {
        const instance = await manager.createInstance(config);
        instances.push(instance);
        createdInstances.push(instance.id);
      }

      await Promise.all(
        instances.map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Verify configurations were applied
      const instance1Config = await manager.getInstanceConfig(instances[0].id);
      const instance2Config = await manager.getInstanceConfig(instances[1].id);

      expect(instance1Config.maxMemoryMB).toBe(256);
      expect(instance1Config.responseTimeoutMs).toBe(10000);
      expect(instance1Config.customEnvironment?.CLAUDE_PERSONA).toBe('helpful_assistant');

      expect(instance2Config.maxMemoryMB).toBe(512);
      expect(instance2Config.responseTimeoutMs).toBe(30000);
      expect(instance2Config.customEnvironment?.CLAUDE_PERSONA).toBe('coding_assistant');
    });

    test('should support instance groups and batch operations', async () => {
      // Create instances in two groups
      const group1Instances = [];
      const group2Instances = [];

      for (let i = 0; i < 2; i++) {
        const instance1 = await manager.createInstance({
          mode: InstanceMode.CHAT,
          name: `Group1 Instance ${i + 1}`,
          port: 3130 + i,
          group: 'development'
        });
        group1Instances.push(instance1);
        createdInstances.push(instance1.id);

        const instance2 = await manager.createInstance({
          mode: InstanceMode.CHAT,
          name: `Group2 Instance ${i + 1}`,
          port: 3132 + i,
          group: 'testing'
        });
        group2Instances.push(instance2);
        createdInstances.push(instance2.id);
      }

      await Promise.all(
        [...group1Instances, ...group2Instances].map(instance => 
          waitFor(async () => {
            const status = await manager.getInstanceStatus(instance.id);
            return status.state === InstanceState.RUNNING;
          }, 15000)
        )
      );

      // Test group-based queries
      const devInstances = await manager.getInstancesByGroup('development');
      const testInstances = await manager.getInstancesByGroup('testing');

      expect(devInstances).toHaveLength(2);
      expect(testInstances).toHaveLength(2);

      // Test batch operations on group
      await manager.broadcastToGroup('development', {
        type: 'system_message',
        content: 'Development group message'
      });

      await manager.broadcastToGroup('testing', {
        type: 'system_message', 
        content: 'Testing group message'
      });

      // Verify messages were received by appropriate groups
      const devStats = await Promise.all(
        devInstances.map(instance => manager.getInstanceStats(instance.id))
      );
      const testStats = await Promise.all(
        testInstances.map(instance => manager.getInstanceStats(instance.id))
      );

      devStats.forEach(stat => {
        expect(stat.messageCount).toBeGreaterThan(0);
      });
      testStats.forEach(stat => {
        expect(stat.messageCount).toBeGreaterThan(0);
      });
    });
  });
});
