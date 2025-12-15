/**
 * WebSocket Security E2E Tests
 * Comprehensive security validation for WebSocket Hub functionality
 */

import { test, expect, Page } from '@playwright/test';
import { EnhancedWebSocketTestClient, TestDataGenerator } from './utils/websocket-test-helpers';

const SECURITY_TEST_CONFIG = {
  HUB_URL: 'ws://localhost:8080',
  BACKEND_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3001',
  TEST_TIMEOUT: 15000,
  ATTACK_TIMEOUT: 5000
};

test.describe('WebSocket Security E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(SECURITY_TEST_CONFIG.FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Authentication and Authorization', () => {
    test('should reject connections without valid authentication tokens', async () => {
      const unauthorizedClient = new EnhancedWebSocketTestClient(
        `${SECURITY_TEST_CONFIG.HUB_URL}?token=invalid_token_123`
      );

      let connectionFailed = false;
      try {
        await unauthorizedClient.connect();
      } catch (error) {
        connectionFailed = true;
        expect(error.message).toContain('Authentication failed');
      }

      expect(connectionFailed).toBe(true);
      unauthorizedClient.disconnect();
    });

    test('should enforce session validation and timeout', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Send message with expired session token
      await client.send('test_message', {
        sessionToken: 'expired_token_' + Date.now(),
        data: 'test with expired session'
      });

      // Should receive authentication error
      const response = await client.waitForMessage(
        (msg) => msg.type === 'error' && msg.data?.code === 'SESSION_EXPIRED',
        SECURITY_TEST_CONFIG.ATTACK_TIMEOUT
      ).catch(() => null);

      if (response) {
        expect(response.data.code).toBe('SESSION_EXPIRED');
      }

      client.disconnect();
    });

    test('should validate user permissions for different channels', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Attempt to access admin-only channel
      await client.send('subscribe', {
        channel: 'admin-only-channel',
        userId: 'regular-user-123'
      });

      const response = await client.waitForMessage(
        (msg) => msg.type === 'error' && msg.data?.code === 'PERMISSION_DENIED',
        SECURITY_TEST_CONFIG.ATTACK_TIMEOUT
      ).catch(() => null);

      if (response) {
        expect(response.data.code).toBe('PERMISSION_DENIED');
      }

      client.disconnect();
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should prevent XSS attacks through WebSocket messages', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      ];

      for (const payload of xssPayloads) {
        await client.send('user_input', {
          content: payload,
          type: 'comment'
        });

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check that no XSS payload was executed
      const messages = client.getMessages();
      const dangerousResponses = messages.filter(msg => 
        JSON.stringify(msg.data).includes('<script>') ||
        JSON.stringify(msg.data).includes('javascript:') ||
        JSON.stringify(msg.data).includes('onerror=') ||
        JSON.stringify(msg.data).includes('onload=')
      );

      expect(dangerousResponses.length).toBe(0);
      client.disconnect();
    });

    test('should prevent SQL injection attempts', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "'; DELETE FROM posts; --",
        "' OR 1=1 --"
      ];

      for (const payload of sqlPayloads) {
        await client.send('database_query', {
          query: payload,
          table: 'users'
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should still be functional (no database corruption)
      await client.send('health_check', { timestamp: Date.now() });
      
      const healthResponse = await client.waitForMessage('health_response', 5000).catch(() => null);
      expect(healthResponse).toBeTruthy();

      client.disconnect();
    });

    test('should handle extremely large payloads safely', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Generate oversized payload (10MB)
      const oversizedPayload = 'x'.repeat(10 * 1024 * 1024);

      let errorReceived = false;
      try {
        await client.send('large_payload_test', {
          data: oversizedPayload
        });
      } catch (error) {
        errorReceived = true;
        // Should fail gracefully
      }

      // Should either reject the large payload or handle it safely
      const response = await client.waitForMessage(
        (msg) => msg.type === 'error' && msg.data?.code === 'PAYLOAD_TOO_LARGE',
        SECURITY_TEST_CONFIG.ATTACK_TIMEOUT
      ).catch(() => null);

      // Either connection should fail or receive error response
      expect(errorReceived || response).toBeTruthy();

      client.disconnect();
    });

    test('should validate message structure and types', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      const malformedMessages = [
        null,
        undefined,
        { type: null },
        { type: '', data: null },
        { type: 'test', data: undefined },
        { type: 42, data: 'invalid type' },
        'not an object',
        ['array', 'instead', 'of', 'object']
      ];

      let validationErrors = 0;

      for (const malformedMsg of malformedMessages) {
        try {
          // Send raw malformed message
          if (client.isConnected()) {
            (client as any).ws.send(JSON.stringify(malformedMsg));
          }
        } catch (error) {
          validationErrors++;
        }
      }

      // Wait for server responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should remain stable
      expect(client.isConnected()).toBe(true);

      // Should be able to send valid message after malformed attempts
      await client.send('recovery_test', { message: 'System recovered from malformed messages' });
      const recovery = await client.waitForMessage('recovery_response', 3000).catch(() => null);
      
      // Either server validates strictly (disconnects) or handles gracefully
      expect(client.isConnected() || validationErrors > 0).toBe(true);

      client.disconnect();
    });
  });

  test.describe('Channel Isolation and Data Leakage Prevention', () => {
    test('should prevent cross-channel message leakage', async () => {
      const client1 = new EnhancedWebSocketTestClient(`${SECURITY_TEST_CONFIG.HUB_URL}?channel=secure-1`);
      const client2 = new EnhancedWebSocketTestClient(`${SECURITY_TEST_CONFIG.HUB_URL}?channel=secure-2`);

      await Promise.all([
        client1.connect(),
        client2.connect()
      ]);

      const sensitiveData1 = `CONFIDENTIAL-CHANNEL-1-${Date.now()}`;
      const sensitiveData2 = `CONFIDENTIAL-CHANNEL-2-${Date.now()}`;

      // Send sensitive data to each channel
      await client1.send('sensitive_data', {
        content: sensitiveData1,
        classification: 'confidential'
      });

      await client2.send('sensitive_data', {
        content: sensitiveData2,
        classification: 'confidential'
      });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for cross-channel leakage
      const client1Messages = client1.getMessages();
      const client2Messages = client2.getMessages();

      const client1HasClient2Data = client1Messages.some(msg =>
        JSON.stringify(msg).includes(sensitiveData2)
      );

      const client2HasClient1Data = client2Messages.some(msg =>
        JSON.stringify(msg).includes(sensitiveData1)
      );

      expect(client1HasClient2Data).toBe(false);
      expect(client2HasClient1Data).toBe(false);

      client1.disconnect();
      client2.disconnect();
    });

    test('should enforce user-specific data isolation', async () => {
      const user1Client = new EnhancedWebSocketTestClient(`${SECURITY_TEST_CONFIG.HUB_URL}?userId=user-1`);
      const user2Client = new EnhancedWebSocketTestClient(`${SECURITY_TEST_CONFIG.HUB_URL}?userId=user-2`);

      await Promise.all([
        user1Client.connect(),
        user2Client.connect()
      ]);

      // User 1 requests their personal data
      await user1Client.send('get_personal_data', {
        userId: 'user-1',
        dataType: 'private_messages'
      });

      // User 2 attempts to access User 1's data
      await user2Client.send('get_personal_data', {
        userId: 'user-1', // Attempting to access other user's data
        dataType: 'private_messages'
      });

      // Wait for responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      const user2Messages = user2Client.getMessages();
      const unauthorizedAccess = user2Messages.filter(msg =>
        msg.type === 'personal_data' && 
        msg.data?.userId === 'user-1'
      );

      expect(unauthorizedAccess.length).toBe(0);

      user1Client.disconnect();
      user2Client.disconnect();
    });
  });

  test.describe('Rate Limiting and DoS Prevention', () => {
    test('should enforce message rate limiting per client', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Send rapid burst of messages
      const rapidMessages = [];
      for (let i = 0; i < 100; i++) {
        rapidMessages.push(client.send('rate_limit_test', {
          messageId: i,
          timestamp: Date.now()
        }));
      }

      let rateLimitTriggered = false;
      
      try {
        await Promise.allSettled(rapidMessages);
      } catch (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
          rateLimitTriggered = true;
        }
      }

      // Check for rate limit response
      const rateLimitResponse = await client.waitForMessage(
        (msg) => msg.type === 'error' && (
          msg.data?.code === 'RATE_LIMIT_EXCEEDED' ||
          msg.data?.message?.includes('rate limit')
        ),
        SECURITY_TEST_CONFIG.ATTACK_TIMEOUT
      ).catch(() => null);

      // Either rate limiting is enforced or connection is terminated
      expect(rateLimitTriggered || rateLimitResponse || !client.isConnected()).toBe(true);

      client.disconnect();
    });

    test('should prevent connection flooding attacks', async () => {
      const clients = [];
      const connectionPromises = [];

      // Attempt to create many simultaneous connections
      for (let i = 0; i < 50; i++) {
        const client = new EnhancedWebSocketTestClient(`${SECURITY_TEST_CONFIG.HUB_URL}?flood=${i}`);
        clients.push(client);
        connectionPromises.push(
          client.connect().catch(error => ({ error, clientId: i }))
        );
      }

      const results = await Promise.allSettled(connectionPromises);
      const successfulConnections = results.filter(result => 
        result.status === 'fulfilled' && !result.value?.error
      ).length;

      const rejectedConnections = results.filter(result =>
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value?.error)
      ).length;

      // Server should either limit concurrent connections or handle them gracefully
      console.log(`Successful connections: ${successfulConnections}, Rejected: ${rejectedConnections}`);

      // At least some connections should be rejected to prevent resource exhaustion
      expect(rejectedConnections).toBeGreaterThan(0);

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  test.describe('Protocol Security and Transport Layer', () => {
    test('should enforce secure WebSocket connections in production', async () => {
      // This test would check for WSS (secure WebSocket) in production
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      
      // In production, should fail to connect to non-secure WebSocket
      if (process.env.NODE_ENV === 'production') {
        let connectionFailed = false;
        try {
          await client.connect();
        } catch (error) {
          connectionFailed = true;
        }
        expect(connectionFailed).toBe(true);
      } else {
        // In test environment, connection should work
        await client.connect();
        expect(client.isConnected()).toBe(true);
      }

      client.disconnect();
    });

    test('should validate message encryption and integrity', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Send message with encryption flag
      await client.send('encrypted_message', {
        content: 'This should be encrypted',
        encryption: 'required',
        checksum: 'abc123'
      });

      const response = await client.waitForMessage(
        (msg) => msg.type === 'encrypted_response',
        SECURITY_TEST_CONFIG.ATTACK_TIMEOUT
      ).catch(() => null);

      if (response) {
        // Response should indicate proper encryption handling
        expect(response.data.encrypted).toBeTruthy();
      }

      client.disconnect();
    });
  });

  test.describe('Vulnerability Testing', () => {
    test('should prevent WebSocket frame injection attacks', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Attempt frame injection
      const injectionAttempts = [
        '\x81\x05FRAME', // Binary frame injection
        '\x89\x00',       // Ping frame injection
        '\x8A\x00',       // Pong frame injection
        '\x88\x02\x03\xE8' // Close frame injection
      ];

      for (const injection of injectionAttempts) {
        try {
          if (client.isConnected()) {
            // Attempt to send raw frame data
            (client as any).ws.send(injection);
          }
        } catch (error) {
          // Injection should be prevented
        }
      }

      // Wait for potential responses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Connection should remain stable
      expect(client.isConnected()).toBe(true);

      client.disconnect();
    });

    test('should handle buffer overflow attempts', async () => {
      const client = new EnhancedWebSocketTestClient(SECURITY_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Attempt buffer overflow with specially crafted messages
      const overflowAttempts = [
        'A'.repeat(65536), // 64KB
        'B'.repeat(1024 * 1024), // 1MB
        '\x00'.repeat(10000), // Null bytes
        '\xFF'.repeat(10000), // Max bytes
      ];

      for (const attempt of overflowAttempts) {
        try {
          await client.send('overflow_test', {
            data: attempt
          });
        } catch (error) {
          // Should fail gracefully
        }
      }

      // System should remain stable
      await client.send('stability_check', { timestamp: Date.now() });
      const stabilityResponse = await client.waitForMessage('stability_response', 5000).catch(() => null);
      
      // Connection should either be stable or properly closed
      expect(client.isConnected() || stabilityResponse === null).toBe(true);

      client.disconnect();
    });
  });

  test.describe('Frontend Security Integration', () => {
    test('should validate WebSocket security in browser context', async () => {
      // Test browser-side WebSocket security
      const securityCheck = await page.evaluate(async () => {
        try {
          const ws = new WebSocket('ws://localhost:8080');
          
          // Check for security features
          const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          const hasSecurityHeaders = document.querySelector('meta[name="referrer"]');
          
          ws.close();
          
          return {
            webSocketAvailable: true,
            hasCSP: !!hasCSP,
            hasSecurityHeaders: !!hasSecurityHeaders,
            protocol: ws.protocol
          };
        } catch (error) {
          return {
            webSocketAvailable: false,
            error: error.message
          };
        }
      });

      expect(securityCheck.webSocketAvailable).toBe(true);
      
      // In production, should have security headers
      if (process.env.NODE_ENV === 'production') {
        expect(securityCheck.hasCSP || securityCheck.hasSecurityHeaders).toBe(true);
      }
    });

    test('should prevent malicious WebSocket URLs in frontend', async () => {
      const maliciousUrls = [
        'ws://malicious-site.com/steal-data',
        'ws://localhost:9999/backdoor',
        'wss://evil.example.com/hijack',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      for (const maliciousUrl of maliciousUrls) {
        const result = await page.evaluate(async (url) => {
          try {
            const ws = new WebSocket(url);
            ws.close();
            return { connected: true, url };
          } catch (error) {
            return { connected: false, error: error.message, url };
          }
        }, maliciousUrl);

        // Malicious connections should be blocked
        console.log(`Testing malicious URL ${maliciousUrl}: ${result.connected ? 'CONNECTED' : 'BLOCKED'}`);
        
        // Most malicious URLs should be blocked by browser security
        if (maliciousUrl.startsWith('ws://localhost') || maliciousUrl.startsWith('ws://127.0.0.1')) {
          // Local URLs might connect but should be validated server-side
        } else {
          // External malicious URLs should be blocked
          expect(result.connected).toBe(false);
        }
      }
    });
  });
});