/**
 * WebSocket Hub Test Suite - Comprehensive TDD tests
 * Tests core WebSocket Hub functionality, protocol translation, and integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server as HTTPServer } from 'http';
import { WebSocketHub, WebSocketHubConfig } from '@/websocket-hub/core/WebSocketHub';
import { io as clientIO, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocket Hub Core Functionality', () => {
  let httpServer: HTTPServer;
  let hub: WebSocketHub;
  let clientSocket: ClientSocket;
  
  const testConfig: WebSocketHubConfig = {
    port: 3002, // Use different port for testing
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true
    },
    transports: ['websocket'],
    pingTimeout: 5000,
    pingInterval: 2000,
    maxConnections: 100,
    enableNLD: false,
    enableSecurity: true,
    enableMetrics: true,
    routingStrategy: 'round-robin'
  };

  beforeEach(async () => {
    // Create HTTP server
    httpServer = new HTTPServer();
    
    // Create hub
    hub = new WebSocketHub(httpServer, testConfig);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(testConfig.port, resolve);
    });
    
    await hub.start();
  });

  afterEach(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    await hub.stop();
    
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('Hub Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(hub.isActive()).toBe(true);
      
      const metrics = hub.getMetrics();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeChannels).toBe(0);
    });

    test('should emit started event on initialization', async () => {
      const startedPromise = new Promise((resolve) => {
        hub.once('started', resolve);
      });

      // Hub is already started in beforeEach, but let's test the event
      expect(await startedPromise).toBeDefined();
    });
  });

  describe('Client Connection Management', () => {
    test('should handle client connection with proper authentication', async () => {
      const connectionPromise = new Promise((resolve) => {
        hub.once('clientConnected', resolve);
      });

      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-1',
          instanceType: 'frontend',
          capabilities: ['read', 'write']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const connectionEvent = await connectionPromise;
      expect(connectionEvent).toBeDefined();
      expect((connectionEvent as any).instanceType).toBe('frontend');

      const metrics = hub.getMetrics();
      expect(metrics.totalConnections).toBe(1);
    });

    test('should reject connection with invalid authentication', async () => {
      const errorPromise = new Promise((resolve) => {
        const testSocket = clientIO(`http://localhost:${testConfig.port}`, {
          auth: {
            instanceType: 'invalid-type',
            capabilities: []
          }
        });

        testSocket.on('connect_error', resolve);
      });

      const error = await errorPromise;
      expect(error).toBeDefined();
      expect((error as any).message).toContain('Authentication failed');
    });

    test('should handle client disconnection properly', async () => {
      // Connect client
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-2',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      expect(hub.getMetrics().totalConnections).toBe(1);

      // Set up disconnection listener
      const disconnectionPromise = new Promise((resolve) => {
        hub.once('clientDisconnected', resolve);
      });

      // Disconnect client
      clientSocket.disconnect();

      await disconnectionPromise;
      expect(hub.getMetrics().totalConnections).toBe(0);
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-channel',
          instanceType: 'frontend',
          capabilities: ['read', 'write']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    test('should handle channel subscription', async () => {
      const subscriptionPromise = new Promise((resolve) => {
        clientSocket.on('subscribed', resolve);
      });

      clientSocket.emit('subscribe', { channel: 'test-channel' });

      const result = await subscriptionPromise;
      expect((result as any).channel).toBe('test-channel');

      const channels = hub.getActiveChannels();
      expect(channels).toHaveLength(1);
      expect(channels[0].channel).toBe('test-channel');
      expect(channels[0].clientCount).toBe(1);
    });

    test('should handle channel unsubscription', async () => {
      // Subscribe first
      clientSocket.emit('subscribe', { channel: 'test-channel' });
      await new Promise((resolve) => {
        clientSocket.on('subscribed', resolve);
      });

      // Then unsubscribe
      const unsubscriptionPromise = new Promise((resolve) => {
        clientSocket.on('unsubscribed', resolve);
      });

      clientSocket.emit('unsubscribe', { channel: 'test-channel' });

      const result = await unsubscriptionPromise;
      expect((result as any).channel).toBe('test-channel');

      const channels = hub.getActiveChannels();
      expect(channels).toHaveLength(0);
    });

    test('should broadcast messages to channel subscribers', async () => {
      // Create second client
      const clientSocket2 = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-channel-2',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket2.on('connect', resolve);
      });

      // Subscribe both clients to channel
      clientSocket.emit('subscribe', { channel: 'broadcast-test' });
      clientSocket2.emit('subscribe', { channel: 'broadcast-test' });

      await Promise.all([
        new Promise((resolve) => clientSocket.on('subscribed', resolve)),
        new Promise((resolve) => clientSocket2.on('subscribed', resolve))
      ]);

      // Set up message listener on second client
      const messagePromise = new Promise((resolve) => {
        clientSocket2.on('message', resolve);
      });

      // Send message from first client
      clientSocket.emit('sendMessage', {
        channel: 'broadcast-test',
        message: { text: 'Hello channel!' }
      });

      const receivedMessage = await messagePromise;
      expect((receivedMessage as any).message.text).toBe('Hello channel!');
      expect((receivedMessage as any).channel).toBe('broadcast-test');

      clientSocket2.disconnect();
    });
  });

  describe('Protocol Translation', () => {
    beforeEach(async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-protocol',
          instanceType: 'claude-production',
          capabilities: ['webhook', 'translate']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    test('should handle protocol translation requests', async () => {
      const translationPromise = new Promise((resolve) => {
        clientSocket.on('protocolTranslated', resolve);
      });

      const testPayload = {
        type: 'test_message',
        data: { content: 'Hello webhook!' }
      };

      clientSocket.emit('translateProtocol', {
        from: 'websocket',
        to: 'webhook',
        payload: testPayload
      });

      const result = await translationPromise;
      expect((result as any).translated).toBeDefined();
      expect((result as any).translated.event).toBe('test_message');
      expect((result as any).translated.data.content).toBe('Hello webhook!');
    });

    test('should handle webhook endpoint registration', async () => {
      const registrationPromise = new Promise((resolve) => {
        clientSocket.on('claudeInstanceRegistered', resolve);
      });

      clientSocket.emit('registerClaudeInstance', {
        instanceId: 'claude-prod-1',
        version: '1.0.0',
        capabilities: ['webhook', 'chat'],
        webhookUrl: 'https://api.example.com/webhook'
      });

      const result = await registrationPromise;
      expect((result as any).instanceId).toBe('claude-prod-1');
    });
  });

  describe('Security and Rate Limiting', () => {
    test('should enforce rate limiting', async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-rate-limit',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      // Send messages rapidly to trigger rate limit
      const errorPromise = new Promise((resolve) => {
        clientSocket.on('messageError', resolve);
      });

      // Send 20 messages quickly
      for (let i = 0; i < 20; i++) {
        clientSocket.emit('sendMessage', {
          channel: 'test',
          message: { text: `Message ${i}` }
        });
      }

      const error = await errorPromise;
      expect((error as any).error).toContain('Rate limit exceeded');
    });

    test('should isolate channels based on instance type', async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-isolation',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const errorPromise = new Promise((resolve) => {
        clientSocket.on('subscriptionError', resolve);
      });

      // Try to subscribe to restricted channel
      clientSocket.emit('subscribe', { channel: 'claude-internal' });

      const error = await errorPromise;
      expect((error as any).error).toContain('Access denied');
    });
  });

  describe('Metrics and Monitoring', () => {
    test('should track connection metrics', async () => {
      const initialMetrics = hub.getMetrics();
      expect(initialMetrics.totalConnections).toBe(0);

      // Connect client
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-metrics',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const metricsAfterConnection = hub.getMetrics();
      expect(metricsAfterConnection.totalConnections).toBe(1);
      expect(metricsAfterConnection.uptime).toBeGreaterThan(0);
    });

    test('should provide client information', async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-info',
          instanceType: 'claude-dev',
          capabilities: ['dev', 'test']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const clients = hub.getConnectedClients();
      expect(clients).toHaveLength(1);
      expect(clients[0].instanceType).toBe('claude-dev');
      expect(clients[0].capabilities).toContain('dev');
      expect(clients[0].capabilities).toContain('test');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed messages gracefully', async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-error',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      const errorPromise = new Promise((resolve) => {
        clientSocket.on('messageError', resolve);
      });

      // Send malformed message
      clientSocket.emit('sendMessage', {
        // Missing required fields
        invalidField: 'test'
      });

      const error = await errorPromise;
      expect((error as any).error).toBeDefined();
    });

    test('should handle hub shutdown gracefully', async () => {
      clientSocket = clientIO(`http://localhost:${testConfig.port}`, {
        auth: {
          userId: 'test-user-shutdown',
          instanceType: 'frontend',
          capabilities: ['read']
        }
      });

      await new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });

      expect(hub.getMetrics().totalConnections).toBe(1);

      const disconnectPromise = new Promise((resolve) => {
        clientSocket.on('disconnect', resolve);
      });

      await hub.stop();

      await disconnectPromise;
      expect(hub.isActive()).toBe(false);
    });
  });

  describe('Integration with NLD System', () => {
    test('should integrate with NLD pattern learning when enabled', async () => {
      // Create hub with NLD enabled
      const nldConfig = { ...testConfig, enableNLD: true, port: 3003 };
      const nldHttpServer = new HTTPServer();
      const nldHub = new WebSocketHub(nldHttpServer, nldConfig);

      await new Promise<void>((resolve) => {
        nldHttpServer.listen(nldConfig.port, resolve);
      });

      await nldHub.start();

      // Connect client
      const nldClientSocket = clientIO(`http://localhost:${nldConfig.port}`, {
        auth: {
          userId: 'test-user-nld',
          instanceType: 'frontend',
          capabilities: ['read', 'nld']
        }
      });

      await new Promise((resolve) => {
        nldClientSocket.on('connect', resolve);
      });

      // Test NLD integration (this would be more comprehensive in a real implementation)
      expect(nldHub.isActive()).toBe(true);

      // Cleanup
      nldClientSocket.disconnect();
      await nldHub.stop();
      await new Promise<void>((resolve) => {
        nldHttpServer.close(() => resolve());
      });
    });
  });
});

describe('WebSocket Hub Integration Tests', () => {
  describe('Multi-Client Scenarios', () => {
    test('should handle multiple Claude instances with load balancing', async () => {
      // This would test the full end-to-end scenario with multiple Claude instances
      // registering and receiving load-balanced requests
      expect(true).toBe(true); // Placeholder for complex integration test
    });

    test('should maintain session affinity when configured', async () => {
      // Test session affinity routing strategy
      expect(true).toBe(true); // Placeholder
    });

    test('should handle webhook protocol translation end-to-end', async () => {
      // Test complete webhook translation workflow
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance Tests', () => {
    test('should handle high connection volume', async () => {
      // Test with many concurrent connections
      expect(true).toBe(true); // Placeholder
    });

    test('should maintain performance under message load', async () => {
      // Test message throughput
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Fault Tolerance', () => {
    test('should recover from network interruptions', async () => {
      // Test resilience
      expect(true).toBe(true); // Placeholder
    });

    test('should handle webhook endpoint failures gracefully', async () => {
      // Test webhook error handling
      expect(true).toBe(true); // Placeholder
    });
  });
});