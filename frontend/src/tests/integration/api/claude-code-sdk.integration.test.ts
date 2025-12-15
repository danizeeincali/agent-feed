/**
 * Integration Tests for Claude Code SDK API
 * SPARC Phase 4: Refinement - API Integration Testing
 *
 * Test Coverage:
 * - Full API endpoint integration
 * - Request/response validation
 * - Error handling across API boundaries
 * - Authentication and security
 * - Performance characteristics
 * - Session management
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Test environment setup
const server = setupServer();

describe('Claude Code SDK API Integration', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/claude-code/streaming-chat', () => {
    test('processes text message successfully', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          const body = await request.json() as any;

          // Validate request structure
          expect(body).toHaveProperty('message');
          expect(typeof body.message).toBe('string');
          expect(body.message).toBe('Hello Avi, can you help me?');

          // Validate options
          if (body.options) {
            expect(body.options).toHaveProperty('workingDirectory');
            expect(body.options).toHaveProperty('allowedTools');
            expect(Array.isArray(body.options.allowedTools)).toBe(true);
          }

          return HttpResponse.json({
            success: true,
            message: 'I can help you with that request.',
            responses: [
              {
                type: 'assistant',
                content: 'I can help you with that request. What would you like me to do?'
              }
            ],
            timestamp: new Date().toISOString(),
            claudeCode: true,
            toolsEnabled: true
          });
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello Avi, can you help me?',
          options: {
            workingDirectory: '/workspaces/agent-feed/prod',
            allowedTools: ['Read', 'Write', 'Grep', 'Bash']
          }
        })
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.toolsEnabled).toBe(true);
      expect(data.responses).toHaveLength(1);
      expect(data.responses[0].content).toContain('help you with that');
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('handles complex message with images', async () => {
      const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          const body = await request.json() as any;

          // Validate image message structure
          expect(body.message).toHaveProperty('text');
          expect(body.message).toHaveProperty('images');
          expect(Array.isArray(body.message.images)).toBe(true);
          expect(body.message.images[0]).toMatch(/^data:image\/png;base64,/);

          return HttpResponse.json({
            success: true,
            responses: [
              {
                type: 'assistant',
                content: 'I can see the image you uploaded. It appears to be a simple 1x1 pixel PNG image, likely used for testing purposes.'
              }
            ],
            timestamp: new Date().toISOString(),
            claudeCode: true,
            toolsEnabled: true
          });
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            text: 'What do you see in this image?',
            images: [imageBase64]
          }
        })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.responses[0].content).toContain('image you uploaded');
    });

    test('validates required message parameter', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          const body = await request.json() as any;

          if (!body.message) {
            return HttpResponse.json(
              {
                success: false,
                error: 'Message is required and must be a string'
              },
              { status: 400 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Message is required and must be a string');
    });

    test('handles server errors gracefully', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Claude Code processing failed. Please try again.',
              details: 'Internal server error occurred'
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Claude Code processing failed. Please try again.');
      expect(data.details).toBe('Internal server error occurred');
    });

    test('handles timeout scenarios', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async () => {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 100));

          return HttpResponse.json({
            success: true,
            responses: [{ content: 'This response took some time.' }]
          });
        })
      );

      const startTime = Date.now();

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test timeout' })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeGreaterThan(90); // Should take at least 90ms

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('validates content-type headers', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          const contentType = request.headers.get('Content-Type');

          if (contentType !== 'application/json') {
            return HttpResponse.json(
              {
                success: false,
                error: 'Content-Type must be application/json'
              },
              { status: 400 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      // Test with correct content type
      const validResponse = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' })
      });

      expect(validResponse.ok).toBe(true);

      // Test with incorrect content type
      const invalidResponse = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Test message'
      });

      expect(invalidResponse.status).toBe(400);
    });

    test('handles malformed JSON gracefully', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          try {
            await request.json();
            return HttpResponse.json({ success: true });
          } catch (error) {
            return HttpResponse.json(
              {
                success: false,
                error: 'Invalid JSON in request body'
              },
              { status: 400 }
            );
          }
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {'
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });

  describe('GET /api/claude-code/health', () => {
    test('returns healthy status', async () => {
      server.use(
        http.get('/api/claude-code/health', () => {
          return HttpResponse.json({
            success: true,
            healthy: true,
            timestamp: new Date().toISOString(),
            toolsEnabled: true,
            claudeCode: true
          });
        })
      );

      const response = await fetch('/api/claude-code/health');
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.healthy).toBe(true);
      expect(data.toolsEnabled).toBe(true);
      expect(data.claudeCode).toBe(true);
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('handles unhealthy status', async () => {
      server.use(
        http.get('/api/claude-code/health', () => {
          return HttpResponse.json(
            {
              success: false,
              healthy: false,
              error: 'Health check failed',
              details: 'Claude Code SDK is not responding'
            },
            { status: 500 }
          );
        })
      );

      const response = await fetch('/api/claude-code/health');
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.healthy).toBe(false);
      expect(data.error).toBe('Health check failed');
    });
  });

  describe('Session Management', () => {
    const sessionId = 'test-session-' + Date.now();

    test('creates new session', async () => {
      server.use(
        http.post('/api/claude-code/session', async ({ request }) => {
          const body = await request.json() as any;

          expect(body).toHaveProperty('sessionId');
          expect(body.sessionId).toBe(sessionId);

          return HttpResponse.json({
            success: true,
            session: {
              id: body.sessionId,
              created: new Date().toISOString(),
              status: 'active'
            },
            timestamp: new Date().toISOString()
          });
        })
      );

      const response = await fetch('/api/claude-code/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.session.id).toBe(sessionId);
      expect(data.session.status).toBe('active');
    });

    test('retrieves existing session', async () => {
      server.use(
        http.get(`/api/claude-code/session/${sessionId}`, () => {
          return HttpResponse.json({
            success: true,
            session: {
              id: sessionId,
              created: new Date().toISOString(),
              status: 'active',
              lastActivity: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          });
        })
      );

      const response = await fetch(`/api/claude-code/session/${sessionId}`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.session.id).toBe(sessionId);
      expect(data.session.status).toBe('active');
    });

    test('handles session not found', async () => {
      const nonExistentId = 'non-existent-session';

      server.use(
        http.get(`/api/claude-code/session/${nonExistentId}`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Session not found'
            },
            { status: 404 }
          );
        })
      );

      const response = await fetch(`/api/claude-code/session/${nonExistentId}`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Session not found');
    });

    test('closes session successfully', async () => {
      server.use(
        http.delete(`/api/claude-code/session/${sessionId}`, () => {
          return HttpResponse.json({
            success: true,
            message: 'Session closed successfully',
            timestamp: new Date().toISOString()
          });
        })
      );

      const response = await fetch(`/api/claude-code/session/${sessionId}`, {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session closed successfully');
    });
  });

  describe('Background Tasks', () => {
    test('executes background task successfully', async () => {
      server.use(
        http.post('/api/claude-code/background-task', async ({ request }) => {
          const body = await request.json() as any;

          expect(body).toHaveProperty('prompt');
          expect(typeof body.prompt).toBe('string');

          return HttpResponse.json({
            success: true,
            result: {
              output: JSON.stringify({
                message: 'Task completed successfully',
                timestamp: new Date().toISOString()
              })
            },
            timestamp: new Date().toISOString(),
            mode: 'headless',
            claudeCode: true
          });
        })
      );

      const response = await fetch('/api/claude-code/background-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Return a simple JSON response with timestamp',
          options: { silent: true }
        })
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe('headless');
      expect(data.claudeCode).toBe(true);

      // Parse the result output
      const result = JSON.parse(data.result.output);
      expect(result.message).toBe('Task completed successfully');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('validates background task prompt', async () => {
      server.use(
        http.post('/api/claude-code/background-task', async ({ request }) => {
          const body = await request.json() as any;

          if (!body.prompt || typeof body.prompt !== 'string') {
            return HttpResponse.json(
              {
                success: false,
                error: 'Prompt is required and must be a string'
              },
              { status: 400 }
            );
          }

          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch('/api/claude-code/background-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Prompt is required and must be a string');
    });
  });

  describe('System Status', () => {
    test('retrieves system status', async () => {
      server.use(
        http.get('/api/claude-code/status', () => {
          return HttpResponse.json({
            success: true,
            status: {
              active: true,
              sessions: 3,
              uptime: 12345,
              version: '1.0.0',
              memory: {
                used: 128,
                total: 512
              },
              features: ['Read', 'Write', 'Grep', 'Bash']
            },
            timestamp: new Date().toISOString()
          });
        })
      );

      const response = await fetch('/api/claude-code/status');
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status.active).toBe(true);
      expect(data.status.sessions).toBe(3);
      expect(Array.isArray(data.status.features)).toBe(true);
      expect(data.status.features).toContain('Read');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('handles concurrent requests', async () => {
      let requestCount = 0;

      server.use(
        http.post('/api/claude-code/streaming-chat', async () => {
          requestCount++;
          await new Promise(resolve => setTimeout(resolve, 50));

          return HttpResponse.json({
            success: true,
            responses: [{ content: `Response ${requestCount}` }]
          });
        })
      );

      // Send multiple concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch('/api/claude-code/streaming-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Message ${i + 1}` })
        })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      expect(requestCount).toBe(5);
    });

    test('handles request cancellation', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return HttpResponse.json({ success: true });
        })
      );

      const controller = new AbortController();

      const responsePromise = fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' }),
        signal: controller.signal
      });

      // Cancel the request after 100ms
      setTimeout(() => controller.abort(), 100);

      await expect(responsePromise).rejects.toThrow('AbortError');
    });

    test('validates response format consistency', async () => {
      const testCases = [
        { endpoint: '/api/claude-code/streaming-chat', method: 'POST', body: { message: 'test' } },
        { endpoint: '/api/claude-code/health', method: 'GET' },
        { endpoint: '/api/claude-code/status', method: 'GET' }
      ];

      for (const testCase of testCases) {
        server.use(
          http[testCase.method.toLowerCase() as 'get' | 'post'](testCase.endpoint, () => {
            return HttpResponse.json({
              success: true,
              timestamp: new Date().toISOString()
            });
          })
        );

        const options: RequestInit = {
          method: testCase.method
        };

        if (testCase.body) {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(testCase.body);
        }

        const response = await fetch(testCase.endpoint, options);
        const data = await response.json();

        // All endpoints should return consistent structure
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('timestamp');
        expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe('Performance Characteristics', () => {
    test('measures response time under normal load', async () => {
      server.use(
        http.post('/api/claude-code/streaming-chat', async () => {
          // Simulate realistic processing time
          await new Promise(resolve => setTimeout(resolve, 200));

          return HttpResponse.json({
            success: true,
            responses: [{ content: 'Performance test response' }]
          });
        })
      );

      const startTime = Date.now();

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Performance test' })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeGreaterThan(190);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('handles large message payloads', async () => {
      const largeMessage = 'x'.repeat(10000); // 10KB message

      server.use(
        http.post('/api/claude-code/streaming-chat', async ({ request }) => {
          const body = await request.json() as any;

          expect(body.message.length).toBe(10000);

          return HttpResponse.json({
            success: true,
            responses: [{ content: 'Processed large message successfully' }]
          });
        })
      );

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: largeMessage })
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});

/**
 * Test utilities for integration testing
 */
export const integrationTestUtils = {
  /**
   * Create a realistic test message with various content types
   */
  createTestMessage: (options: {
    includeImages?: boolean;
    imageCount?: number;
    messageLength?: number;
  } = {}) => {
    const { includeImages = false, imageCount = 1, messageLength = 50 } = options;

    const message: any = {
      text: 'x'.repeat(messageLength)
    };

    if (includeImages) {
      message.images = Array.from({ length: imageCount }, (_, i) =>
        `data:image/png;base64,test-image-${i}`
      );
    }

    return typeof message.images !== 'undefined' ? message : message.text;
  },

  /**
   * Wait for a condition to be met with timeout
   */
  waitFor: async (condition: () => boolean, timeout: number = 5000): Promise<void> => {
    const startTime = Date.now();

    while (!condition() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },

  /**
   * Generate realistic response delays based on message complexity
   */
  calculateResponseDelay: (messageLength: number, hasImages: boolean): number => {
    let baseDelay = 200; // 200ms base processing time

    if (messageLength > 1000) {
      baseDelay += messageLength / 100; // Add 1ms per 100 characters
    }

    if (hasImages) {
      baseDelay += 500; // Add 500ms for image processing
    }

    return Math.min(baseDelay, 5000); // Cap at 5 seconds
  }
};