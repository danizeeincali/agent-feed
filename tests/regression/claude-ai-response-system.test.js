/**
 * Claude AI Response System - Regression Test Suite
 * 
 * Comprehensive regression tests to protect the core functionality of the Claude AI response system.
 * This test suite focuses on preventing regressions in the ULTRA FIX pipe-based communication,
 * SSE message flow, and instance management systems.
 */

import { jest, describe, test, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { EventSource } from 'eventsource';

// Test configuration
const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  TEST_TIMEOUT: 30000,
  SSE_TIMEOUT: 10000,
  CLAUDE_RESPONSE_TIMEOUT: 15000
};

// Test utilities for Claude instance management
class ClaudeInstanceTestManager {
  constructor() {
    this.activeInstances = [];
    this.sseConnections = [];
  }

  async createInstance(type = 'skip-permissions') {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'claude --dangerously-skip-permissions',
        name: `test-${type}-${Date.now()}`,
        type: type
      })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.instanceId).toMatch(/^claude-[a-zA-Z0-9]+$/);

    this.activeInstances.push(data.instanceId);
    return data.instanceId;
  }

  async getInstance(instanceId) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
    const data = await response.json();
    return data.instances?.find(instance => instance.id === instanceId);
  }

  async sendInput(instanceId, input) {
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });

    expect(response.ok).toBe(true);
    return response.json();
  }

  createSSEConnection(instanceId) {
    const eventSource = new EventSource(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
    this.sseConnections.push(eventSource);
    return eventSource;
  }

  async cleanup() {
    // Close SSE connections
    this.sseConnections.forEach(eventSource => eventSource.close());
    this.sseConnections = [];

    // Kill instances
    for (const instanceId of this.activeInstances) {
      try {
        await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message);
      }
    }
    this.activeInstances = [];
  }

  async waitForInstanceReady(instanceId, timeoutMs = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const instance = await this.getInstance(instanceId);
      if (instance && (instance.status === 'running' || instance.status === 'ready')) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Instance ${instanceId} not ready within ${timeoutMs}ms`);
  }
}

describe('Claude AI Response System - Regression Tests', () => {
  let testManager;

  beforeAll(async () => {
    // Ensure backend is running
    try {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
      expect(response.ok).toBe(true);
    } catch (error) {
      throw new Error('Backend server is not running. Start with: node simple-backend.js');
    }
  }, TEST_CONFIG.TEST_TIMEOUT);

  beforeEach(() => {
    testManager = new ClaudeInstanceTestManager();
  });

  afterEach(async () => {
    await testManager.cleanup();
  });

  describe('ULTRA FIX Pipe-based Communication', () => {
    test('should spawn individual processes for each input', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Send two different inputs and verify they get separate processes
      const input1 = 'What is 2+2?';
      const input2 = 'What is the capital of France?';

      const [response1, response2] = await Promise.all([
        testManager.sendInput(instanceId, input1),
        testManager.sendInput(instanceId, input2)
      ]);

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response1.message).toContain('pipe-based Claude AI');
      expect(response2.message).toContain('pipe-based Claude AI');
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

    test('should generate unique responses for different inputs (no caching)', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      const sseMessages = [];
      const eventSource = testManager.createSSEConnection(instanceId);
      
      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SSE messages timeout'));
        }, TEST_CONFIG.SSE_TIMEOUT);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'terminal_output' && data.isReal && data.data) {
              sseMessages.push(data.data);
              if (sseMessages.length >= 2) {
                clearTimeout(timeout);
                resolve();
              }
            }
          } catch (error) {
            reject(error);
          }
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      // Send two different questions
      await testManager.sendInput(instanceId, 'What is 5*3?');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      await testManager.sendInput(instanceId, 'What is 7+8?');

      await messagePromise;

      // Verify we got unique responses
      expect(sseMessages.length).toBeGreaterThanOrEqual(2);
      expect(sseMessages[0]).not.toBe(sseMessages[1]);
      expect(sseMessages[0].trim()).not.toBe('');
      expect(sseMessages[1].trim()).not.toBe('');
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

    test('should use pipe communication and bypass PTY terminal echo', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      const response = await testManager.sendInput(instanceId, 'Hello Claude');
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('pipe-based Claude AI');
      
      // Verify the response indicates bypassing PTY
      expect(response.message).not.toContain('PTY');
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle failed Claude process spawning gracefully', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Simulate a scenario that might fail by sending malformed input
      const response = await testManager.sendInput(instanceId, '');
      
      // Should handle gracefully without crashing
      expect(typeof response).toBe('object');
      expect(response).toHaveProperty('success');
    }, TEST_CONFIG.TEST_TIMEOUT);
  });

  describe('SSE Message Flow Integration', () => {
    test('should establish SSE connection successfully', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      const eventSource = testManager.createSSEConnection(instanceId);
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SSE connection timeout'));
        }, TEST_CONFIG.SSE_TIMEOUT);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      await connectionPromise;
      expect(eventSource.readyState).toBe(EventSource.OPEN);
    }, TEST_CONFIG.SSE_TIMEOUT);

    test('should deliver messages via broadcastToConnections', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      const receivedMessages = [];
      const eventSource = testManager.createSSEConnection(instanceId);

      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message delivery timeout'));
        }, TEST_CONFIG.SSE_TIMEOUT);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            receivedMessages.push(data);
            
            if (data.type === 'terminal_output' && data.isReal) {
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      await testManager.sendInput(instanceId, 'Test message delivery');
      await messagePromise;

      expect(receivedMessages.length).toBeGreaterThan(0);
      const realMessage = receivedMessages.find(msg => msg.isReal);
      expect(realMessage).toBeDefined();
      expect(realMessage.type).toBe('terminal_output');
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

    test('should validate message format with data field and isReal flag', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      const eventSource = testManager.createSSEConnection(instanceId);
      
      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message format validation timeout'));
        }, TEST_CONFIG.SSE_TIMEOUT);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'terminal_output' && data.isReal) {
              // Validate message structure
              expect(data).toHaveProperty('type');
              expect(data).toHaveProperty('data');
              expect(data).toHaveProperty('isReal');
              expect(data).toHaveProperty('instanceId');
              expect(data).toHaveProperty('timestamp');
              
              expect(data.type).toBe('terminal_output');
              expect(data.isReal).toBe(true);
              expect(data.instanceId).toBe(instanceId);
              expect(typeof data.data).toBe('string');
              
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        };
      });

      await testManager.sendInput(instanceId, 'Format validation test');
      await messagePromise;
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

    test('should handle race condition fixes with message queueing', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Create multiple SSE connections before sending messages
      const eventSources = [
        testManager.createSSEConnection(instanceId),
        testManager.createSSEConnection(instanceId),
        testManager.createSSEConnection(instanceId)
      ];

      const messagePromises = eventSources.map((eventSource, index) => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Race condition test timeout for connection ${index}`));
          }, TEST_CONFIG.SSE_TIMEOUT);

          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'terminal_output' && data.isReal) {
                clearTimeout(timeout);
                resolve(data);
              }
            } catch (error) {
              reject(error);
            }
          };

          eventSource.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        })
      );

      // Send message quickly after establishing connections
      await testManager.sendInput(instanceId, 'Race condition test message');
      
      // All connections should receive the message
      const messages = await Promise.all(messagePromises);
      
      expect(messages.length).toBe(3);
      messages.forEach(message => {
        expect(message.type).toBe('terminal_output');
        expect(message.isReal).toBe(true);
        expect(message.data).toContain('race condition test message');
      });
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);
  });

  describe('Interactive Control Workflow', () => {
    test('should complete end-to-end workflow: Create → Connect → Send → Receive', async () => {
      // Step 1: Create instance
      const instanceId = await testManager.createInstance();
      expect(instanceId).toMatch(/^claude-[a-zA-Z0-9]+$/);

      // Step 2: Wait for instance to be ready
      await testManager.waitForInstanceReady(instanceId);
      
      // Step 3: Connect via SSE
      const eventSource = testManager.createSSEConnection(instanceId);
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, TEST_CONFIG.SSE_TIMEOUT);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      await connectionPromise;

      // Step 4: Send message
      const testMessage = 'End-to-end test message';
      const responsePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Response timeout'));
        }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'terminal_output' && data.isReal) {
              clearTimeout(timeout);
              resolve(data);
            }
          } catch (error) {
            reject(error);
          }
        };
      });

      await testManager.sendInput(instanceId, testMessage);

      // Step 5: Receive response
      const response = await responsePromise;
      expect(response.type).toBe('terminal_output');
      expect(response.isReal).toBe(true);
      expect(response.data).toBeDefined();
      expect(typeof response.data).toBe('string');
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);

    test('should maintain instance visibility between /claude-manager and /interactive-control', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Check instance is visible in main list
      const allInstancesResponse = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
      const allInstancesData = await allInstancesResponse.json();
      
      const foundInstance = allInstancesData.instances?.find(instance => instance.id === instanceId);
      expect(foundInstance).toBeDefined();
      expect(foundInstance.id).toBe(instanceId);
      expect(['running', 'ready', 'starting']).toContain(foundInstance.status);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle PTY process lifecycle correctly', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Verify instance is running
      let instance = await testManager.getInstance(instanceId);
      expect(instance.status).toMatch(/running|ready/);
      expect(instance.pid).toBeDefined();
      
      const originalPid = instance.pid;

      // Send input to verify process is responsive
      await testManager.sendInput(instanceId, 'Process lifecycle test');
      
      // Verify process is still running
      instance = await testManager.getInstance(instanceId);
      expect(instance.status).toMatch(/running|ready/);
      expect(instance.pid).toBe(originalPid);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle multiple concurrent instances', async () => {
      const instanceIds = await Promise.all([
        testManager.createInstance('skip-permissions'),
        testManager.createInstance('interactive'),
        testManager.createInstance('prod')
      ]);

      await Promise.all(instanceIds.map(id => testManager.waitForInstanceReady(id)));

      // Verify all instances are visible and unique
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
      const data = await response.json();
      
      const foundInstances = data.instances?.filter(instance => 
        instanceIds.includes(instance.id)
      );

      expect(foundInstances.length).toBe(3);
      expect(new Set(foundInstances.map(i => i.id)).size).toBe(3); // All unique
      expect(new Set(foundInstances.map(i => i.pid)).size).toBe(3); // All unique PIDs
    }, TEST_CONFIG.CLAUDE_RESPONSE_TIMEOUT);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid instance IDs gracefully', async () => {
      const invalidId = 'invalid-instance-id';
      
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${invalidId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' })
      });

      expect(response.status).toBe(404);
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle SSE connection errors gracefully', async () => {
      const invalidId = 'invalid-instance-id';
      const eventSource = new EventSource(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${invalidId}/terminal/stream`);
      
      const errorPromise = new Promise((resolve) => {
        eventSource.onerror = (error) => {
          resolve(error);
        };
      });

      const error = await errorPromise;
      expect(error).toBeDefined();
      eventSource.close();
    }, TEST_CONFIG.TEST_TIMEOUT);

    test('should handle empty or malformed input', async () => {
      const instanceId = await testManager.createInstance();
      await testManager.waitForInstanceReady(instanceId);

      // Test empty input
      const response1 = await testManager.sendInput(instanceId, '');
      expect(response1).toHaveProperty('success');

      // Test malformed JSON won't crash the endpoint
      const response2 = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });
      
      expect(response2.status).toBe(400);
    }, TEST_CONFIG.TEST_TIMEOUT);
  });
});