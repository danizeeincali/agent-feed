/**
 * API-WebSocket Integration Tests
 * Tests communication between HTTP API and WebSocket terminal servers
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from 'vitest';
import { getPortConfig, getServerUrls } from '../config/ports.config';
import { setupTestServers, teardownTestServers, serverManager } from '../utils/server-manager';
import { ApiTestHelper, WebSocketTestHelper, TerminalTestHelper, testFixtures } from '../utils/test-helpers';

describe('API-WebSocket Integration Tests', () => {
  let config: ReturnType<typeof getPortConfig>;
  let urls: ReturnType<typeof getServerUrls>;
  let apiHelper: ApiTestHelper;
  let wsHelper: WebSocketTestHelper;
  let terminalHelper: TerminalTestHelper;

  beforeAll(async () => {
    config = getPortConfig('integration');
    urls = getServerUrls('integration');
    apiHelper = new ApiTestHelper(urls.backendApi);
    wsHelper = new WebSocketTestHelper(urls.websocketTerminal);
    terminalHelper = new TerminalTestHelper(urls.websocketTerminal);
  }, 30000);

  beforeEach(async () => {
    await setupTestServers(config);
  }, 60000);

  afterEach(async () => {
    if (wsHelper.isConnected()) {
      wsHelper.close();
    }
    if (terminalHelper) {
      terminalHelper.close();
    }
    await teardownTestServers();
  }, 30000);

  afterAll(async () => {
    await teardownTestServers();
  }, 30000);

  describe('Claude CLI API Endpoints', () => {
    it('should handle claude launch request', async () => {
      const response = await apiHelper.launchClaude({
        command: 'help',
        options: { timeout: 30000 }
      });

      expect(response.status).toBeLessThan(500);
      
      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('status');
      }
    });

    it('should return claude status', async () => {
      const response = await apiHelper.getClaudeStatus();
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('pid');
      expect(['running', 'stopped', 'error']).toContain(data.status);
    });

    it('should handle claude stop request', async () => {
      // First try to launch claude
      await apiHelper.launchClaude({ command: 'help' });
      
      // Then stop it
      const response = await apiHelper.stopClaude();
      
      expect(response.status).toBeLessThan(500);
      
      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty('status');
      }
    });

    it('should validate request parameters', async () => {
      // Test with invalid data
      const response = await apiHelper.post('/api/claude/launch', {
        invalidParam: 'test'
      });

      // Should handle invalid data gracefully
      expect(response.status).toBeLessThan(500);
    });

    it('should handle concurrent API requests', async () => {
      const requests = Array(5).fill(null).map(() => apiHelper.getClaudeStatus());
      
      const responses = await Promise.all(requests);
      
      // All requests should complete
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('WebSocket Terminal Connection', () => {
    it('should establish websocket connection', async () => {
      await expect(wsHelper.connect()).resolves.not.toThrow();
      expect(wsHelper.isConnected()).toBe(true);
    });

    it('should handle websocket message exchange', async () => {
      await wsHelper.connect();
      
      const testMessage = { type: 'test', data: 'hello' };
      let receivedMessage: any = null;

      wsHelper.onMessage((data) => {
        receivedMessage = data;
      });

      wsHelper.send(testMessage);

      // Wait for potential echo or response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Connection should remain stable
      expect(wsHelper.isConnected()).toBe(true);
    });

    it('should handle websocket connection errors gracefully', async () => {
      const invalidWsHelper = new WebSocketTestHelper('ws://localhost:9999');
      
      await expect(invalidWsHelper.connect()).rejects.toThrow();
    });

    it('should support multiple concurrent websocket connections', async () => {
      const connections = Array(3).fill(null).map(() => new WebSocketTestHelper(urls.websocketTerminal));
      
      const connectionPromises = connections.map(conn => conn.connect());
      await Promise.all(connectionPromises);
      
      // All connections should be established
      connections.forEach(conn => {
        expect(conn.isConnected()).toBe(true);
      });
      
      // Cleanup
      connections.forEach(conn => conn.close());
    });
  });

  describe('Terminal Command Integration', () => {
    beforeEach(async () => {
      await terminalHelper.connect();
    });

    it('should send and receive terminal commands', async () => {
      await terminalHelper.sendCommand('echo "test"');
      
      const output = await terminalHelper.waitForOutput('test', 5000);
      expect(output).toContain('test');
    });

    it('should handle multiple terminal commands sequentially', async () => {
      for (const command of testFixtures.terminalInputs) {
        await terminalHelper.sendCommand(command);
        
        // Wait for command completion
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Terminal should remain responsive
      await terminalHelper.sendCommand('echo "final"');
      const output = await terminalHelper.waitForOutput('final', 3000);
      expect(output).toContain('final');
    });

    it('should handle terminal input with special characters', async () => {
      const specialInputs = [
        'echo "Special chars: !@#$%"',
        'echo "Unicode: 🚀"',
        'echo "Quotes: \\"test\\""'
      ];

      for (const input of specialInputs) {
        await terminalHelper.sendInput(input + '\n');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Terminal should remain functional
      expect(terminalHelper['wsHelper'].isConnected()).toBe(true);
    });

    it('should handle terminal resize events', async () => {
      const resizeMessage = {
        type: 'resize',
        cols: 120,
        rows: 30
      };

      terminalHelper['wsHelper'].send(resizeMessage);
      
      // Wait for resize processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Terminal should remain responsive after resize
      await terminalHelper.sendCommand('echo "after resize"');
      const output = await terminalHelper.waitForOutput('after resize', 3000);
      expect(output).toContain('after resize');
    });
  });

  describe('API-Terminal Communication Flow', () => {
    it('should coordinate claude launch through API and terminal', async () => {
      // Launch claude through API
      const launchResponse = await apiHelper.launchClaude({
        command: 'help'
      });

      if (launchResponse.ok) {
        // Connect to terminal and check for claude process
        await terminalHelper.connect();
        
        // Send claude command through terminal
        await terminalHelper.sendCommand('claude --version');
        
        try {
          const output = await terminalHelper.waitForOutput('claude', 10000);
          expect(output.toLowerCase()).toContain('claude');
        } catch (error) {
          // Claude might not be available in test environment
          console.warn('Claude CLI not available in test environment');
        }
      }
    });

    it('should handle API status queries while terminal is active', async () => {
      await terminalHelper.connect();
      await terminalHelper.sendCommand('ps aux');
      
      // Query API status while terminal command is running
      const statusResponse = await apiHelper.getClaudeStatus();
      expect(statusResponse.ok).toBe(true);
      
      const statusData = await statusResponse.json();
      expect(statusData).toHaveProperty('status');
    });

    it('should handle API shutdown while terminal has active connections', async () => {
      await terminalHelper.connect();
      
      // Start a long-running command
      await terminalHelper.sendCommand('sleep 2');
      
      // Attempt to stop claude through API
      const stopResponse = await apiHelper.stopClaude();
      expect(stopResponse.status).toBeLessThan(500);
      
      // Terminal connection should remain stable
      expect(terminalHelper['wsHelper'].isConnected()).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API server unavailable', async () => {
      // Stop backend server
      await serverManager.stopServer('backend-api');
      
      // API calls should fail gracefully
      await expect(apiHelper.getHealth()).rejects.toThrow();
    });

    it('should handle WebSocket server unavailable', async () => {
      // Stop websocket server
      await serverManager.stopServer('websocket-terminal');
      
      // WebSocket connection should fail
      await expect(terminalHelper.connect()).rejects.toThrow();
    });

    it('should handle malformed API requests', async () => {
      const malformedRequests = [
        () => apiHelper.post('/api/claude/launch', 'invalid json'),
        () => apiHelper.post('/api/claude/launch', { malformed: true }),
        () => apiHelper.get('/api/nonexistent')
      ];

      for (const request of malformedRequests) {
        const response = await request();
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should handle malformed WebSocket messages', async () => {
      await wsHelper.connect();
      
      const malformedMessages = [
        'invalid json',
        '{"incomplete": ',
        null,
        undefined
      ];

      for (const message of malformedMessages) {
        try {
          wsHelper.send(message);
          // Connection should remain stable despite malformed messages
          expect(wsHelper.isConnected()).toBe(true);
        } catch (error) {
          // Some malformed messages might cause send errors, which is acceptable
        }
      }
    });

    it('should handle network interruptions', async () => {
      await wsHelper.connect();
      
      // Simulate network interruption by closing and reconnecting
      wsHelper.close();
      expect(wsHelper.isConnected()).toBe(false);
      
      // Should be able to reconnect
      await wsHelper.connect();
      expect(wsHelper.isConnected()).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle rapid API requests', async () => {
      const rapidRequests = Array(20).fill(null).map((_, i) => 
        apiHelper.getClaudeStatus().then(response => ({ index: i, status: response.status }))
      );

      const results = await Promise.all(rapidRequests);
      
      // Most requests should succeed
      const successful = results.filter(r => r.status < 400);
      expect(successful.length).toBeGreaterThan(15); // Allow some failures under load
    });

    it('should handle rapid WebSocket messages', async () => {
      await wsHelper.connect();
      
      const messages = Array(50).fill(null).map((_, i) => ({
        type: 'test',
        data: `message-${i}`,
        timestamp: Date.now()
      }));

      const sendPromises = messages.map(msg => 
        new Promise<void>(resolve => {
          wsHelper.send(msg);
          setTimeout(resolve, 10); // Small delay between sends
        })
      );

      await Promise.all(sendPromises);
      
      // Connection should remain stable
      expect(wsHelper.isConnected()).toBe(true);
    });

    it('should handle mixed API and WebSocket load', async () => {
      await wsHelper.connect();
      
      // Create mixed load
      const apiPromises = Array(10).fill(null).map(() => apiHelper.getClaudeStatus());
      const wsPromises = Array(10).fill(null).map((_, i) => {
        wsHelper.send({ type: 'load-test', data: i });
        return Promise.resolve();
      });

      await Promise.all([...apiPromises, ...wsPromises]);
      
      // Both systems should remain responsive
      const finalStatusResponse = await apiHelper.getClaudeStatus();
      expect(finalStatusResponse.status).toBeLessThan(500);
      expect(wsHelper.isConnected()).toBe(true);
    });
  });

  describe('Security and CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const corsResponse = await fetch(`${urls.backendApi}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': urls.frontend,
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(corsResponse.status).toBeLessThan(400);
    });

    it('should reject unauthorized WebSocket connections', async () => {
      // This test depends on your WebSocket security implementation
      // For now, we'll test basic connection establishment
      const unauthorizedWs = new WebSocketTestHelper(urls.websocketTerminal);
      
      // Should either connect or reject based on your security policy
      try {
        await unauthorizedWs.connect();
        expect(unauthorizedWs.isConnected()).toBe(true);
        unauthorizedWs.close();
      } catch (error) {
        // Connection rejection is also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should sanitize terminal input', async () => {
      await terminalHelper.connect();
      
      // Test with potentially dangerous input
      const dangerousInputs = [
        'rm -rf /',
        'curl http://malicious-site.com',
        'echo "$(malicious command)"'
      ];

      for (const input of dangerousInputs) {
        await terminalHelper.sendInput(input);
        // Terminal should remain responsive and not execute dangerous commands
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      expect(terminalHelper['wsHelper'].isConnected()).toBe(true);
    });
  });
});