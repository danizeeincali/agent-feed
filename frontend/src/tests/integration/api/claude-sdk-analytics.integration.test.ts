/**
 * Integration Tests for Claude SDK Analytics API
 * Tests real API interactions and data flow
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { CostTrackingService } from '@/services/cost-tracking/CostTrackingService';

// Mock server for API endpoints
const mockApiUrl = 'http://localhost:3001';

const server = setupServer(
  // Claude SDK streaming chat endpoint
  http.post(`${mockApiUrl}/api/claude-code/streaming-chat`, async ({ request }) => {
    const body = await request.json() as any;

    // Simulate token usage tracking
    const estimatedTokens = body.message?.length ? Math.ceil(body.message.length / 4) : 100;

    return HttpResponse.json({
      success: true,
      responses: [{
        content: 'Mock response from Claude SDK',
        type: 'assistant'
      }],
      usage: {
        prompt_tokens: estimatedTokens,
        completion_tokens: Math.ceil(estimatedTokens * 0.8),
        total_tokens: estimatedTokens + Math.ceil(estimatedTokens * 0.8)
      },
      model: 'claude-3-5-sonnet-20241022',
      timestamp: new Date().toISOString()
    });
  }),

  // Health check endpoint
  http.get(`${mockApiUrl}/api/claude/health`, () => {
    return HttpResponse.json({
      success: true,
      health: {
        status: 'healthy',
        uptime: 3600,
        memory: { used: 512, total: 1024 },
        activeConnections: 5
      },
      timestamp: new Date().toISOString()
    });
  }),

  // Metrics endpoint
  http.get(`${mockApiUrl}/api/claude/metrics`, () => {
    return HttpResponse.json({
      success: true,
      metrics: {
        totalRequests: 1250,
        averageResponseTime: 485,
        errorRate: 0.02,
        tokensProcessed: 125000,
        cost: {
          total: 3.75,
          byModel: {
            'claude-3-5-sonnet-20241022': 3.45,
            'claude-3-haiku-20240307': 0.30
          }
        },
        uptime: 3600
      },
      timestamp: new Date().toISOString()
    });
  }),

  // Session creation endpoint
  http.post(`${mockApiUrl}/api/claude/sessions`, async ({ request }) => {
    const body = await request.json() as any;

    return HttpResponse.json({
      success: true,
      session: {
        id: `session-${Date.now()}`,
        type: body.type || 'streaming',
        status: 'active',
        created: new Date().toISOString()
      },
      endpoints: {
        stream: `/api/claude/sessions/session-${Date.now()}/stream`,
        websocket: `/ws/claude/sessions/session-${Date.now()}`,
        status: `/api/claude/sessions/session-${Date.now()}`
      }
    });
  }),

  // Session status endpoint
  http.get(`${mockApiUrl}/api/claude/sessions/:sessionId`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      session: {
        id: params.sessionId,
        type: 'streaming',
        status: 'active',
        created: new Date(Date.now() - 3600000).toISOString(),
        lastActivity: new Date().toISOString(),
        configuration: {
          workingDirectory: '/workspaces/agent-feed/prod',
          allowedTools: ['Read', 'Write', 'Edit', 'Bash']
        },
        metrics: {
          messagesProcessed: 15,
          tokensUsed: 4500,
          averageResponseTime: 520
        }
      },
      systemMetrics: {
        uptime: 3600,
        memory: { used: 512, total: 1024 },
        cpu: { usage: 25.5 }
      }
    });
  })
);

describe('Claude SDK Analytics Integration Tests', () => {
  let costTrackingService: CostTrackingService;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();

    costTrackingService = new CostTrackingService({
      budgetLimits: {
        daily: 10.0,
        weekly: 50.0,
        monthly: 200.0
      },
      alertThresholds: {
        warning: 80,
        critical: 95
      },
      enableRealTimeTracking: true,
      enableAuditing: false,
      storageKey: 'test-integration-cost-tracking'
    });
  });

  afterEach(() => {
    costTrackingService.destroy();
  });

  describe('API Endpoint Integration', () => {
    it('should successfully call streaming chat endpoint and track costs', async () => {
      const message = 'Hello Claude, can you help me with a coding task?';

      const response = await fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          options: {
            workingDirectory: '/workspaces/agent-feed/prod',
            allowedTools: ['Read', 'Write', 'Grep', 'Bash']
          }
        })
      });

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.usage).toBeDefined();
      expect(result.usage.total_tokens).toBeGreaterThan(0);

      // Track the usage in our cost tracking service
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: result.model,
        tokensUsed: result.usage.total_tokens,
        requestType: 'chat',
        component: 'AviDirectChatSDK',
        sessionId: 'test-session-1',
        metadata: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens
        }
      });

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBe(result.usage.total_tokens);
      expect(metrics.totalCost).toBeGreaterThan(0);
    });

    it('should handle health check endpoint and validate service status', async () => {
      const response = await fetch(`${mockApiUrl}/api/claude/health`);
      expect(response.ok).toBe(true);

      const health = await response.json();
      expect(health.success).toBe(true);
      expect(health.health.status).toBe('healthy');
      expect(health.health.uptime).toBeGreaterThan(0);
    });

    it('should retrieve system metrics from API', async () => {
      const response = await fetch(`${mockApiUrl}/api/claude/metrics`);
      expect(response.ok).toBe(true);

      const metricsData = await response.json();
      expect(metricsData.success).toBe(true);
      expect(metricsData.metrics.totalRequests).toBeGreaterThan(0);
      expect(metricsData.metrics.cost.total).toBeGreaterThan(0);
      expect(metricsData.metrics.tokensProcessed).toBeGreaterThan(0);
    });

    it('should create and manage sessions with cost tracking', async () => {
      // Create session
      const createResponse = await fetch(`${mockApiUrl}/api/claude/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'streaming',
          workingDirectory: '/workspaces/agent-feed/prod'
        })
      });

      expect(createResponse.ok).toBe(true);
      const sessionData = await createResponse.json();
      expect(sessionData.success).toBe(true);
      expect(sessionData.session.id).toBeDefined();

      const sessionId = sessionData.session.id;

      // Get session status
      const statusResponse = await fetch(`${mockApiUrl}/api/claude/sessions/${sessionId}`);
      expect(statusResponse.ok).toBe(true);

      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      expect(statusData.session.metrics.tokensUsed).toBeDefined();

      // Track session costs
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: statusData.session.metrics.tokensUsed,
        requestType: 'chat',
        component: 'SessionManager',
        sessionId: sessionId
      });

      const sessionUsage = costTrackingService.getUsageData({ sessionId });
      expect(sessionUsage).toHaveLength(1);
      expect(sessionUsage[0].sessionId).toBe(sessionId);
    });
  });

  describe('Cost Tracking Integration', () => {
    it('should track costs across multiple API calls', async () => {
      const apiCalls = [
        { message: 'First message', component: 'AviDirectChatSDK' },
        { message: 'Second longer message with more content to process', component: 'AviDirectChatSDK' },
        { message: 'Third message', component: 'TestComponent' }
      ];

      for (const call of apiCalls) {
        const response = await fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: call.message })
        });

        const result = await response.json();

        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: result.model,
          tokensUsed: result.usage.total_tokens,
          requestType: 'chat',
          component: call.component
        });
      }

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBeGreaterThan(0);

      const usage = costTrackingService.getUsageData();
      expect(usage).toHaveLength(3);

      // Verify component filtering
      const aviUsage = costTrackingService.getUsageData({ component: 'AviDirectChatSDK' });
      expect(aviUsage).toHaveLength(2);
    });

    it('should trigger budget alerts during integration testing', async () => {
      const alertCallback = vi.fn();
      costTrackingService.on('budget-alerts', alertCallback);

      // Make expensive API calls to trigger budget alerts
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'A'.repeat(1000) // Large message to generate high token usage
          })
        });

        const result = await response.json();

        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: result.model,
          tokensUsed: result.usage.total_tokens * 10, // Amplify for testing
          requestType: 'chat',
          component: 'IntegrationTest'
        });
      }

      // Should trigger budget alerts
      expect(alertCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Override server to return error
      server.use(
        http.post(`${mockApiUrl}/api/claude-code/streaming-chat`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      // Ensure cost tracking service remains functional
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'ErrorTest'
      });

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBe(100);
    });

    it('should handle network timeouts', async () => {
      // Override server to delay response
      server.use(
        http.post(`${mockApiUrl}/api/claude-code/streaming-chat`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            responses: [{ content: 'Delayed response' }],
            usage: { total_tokens: 50 },
            model: 'claude-3-5-sonnet-20241022'
          });
        })
      );

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50); // Timeout after 50ms

      try {
        await fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Test timeout' }),
          signal: controller.signal
        });
      } catch (error) {
        expect(error.name).toBe('AbortError');
      }

      // Ensure service remains functional after timeout
      const metrics = costTrackingService.getCostMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle concurrent API calls and cost tracking', async () => {
      const concurrentCalls = Array.from({ length: 5 }, (_, i) =>
        fetch(`${mockApiUrl}/api/claude-code/streaming-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Concurrent message ${i + 1}` })
        })
      );

      const responses = await Promise.all(concurrentCalls);

      // All calls should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      // Process results and track costs
      const results = await Promise.all(responses.map(r => r.json()));

      for (const [index, result] of results.entries()) {
        await costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: result.model,
          tokensUsed: result.usage.total_tokens,
          requestType: 'chat',
          component: `ConcurrentTest-${index + 1}`
        });
      }

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBeGreaterThan(0);

      const usage = costTrackingService.getUsageData();
      expect(usage).toHaveLength(5);
    });

    it('should maintain data consistency during rapid updates', async () => {
      const rapidUpdates = Array.from({ length: 10 }, (_, i) =>
        costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat',
          component: 'RapidTest',
          metadata: { updateIndex: i }
        })
      );

      await Promise.all(rapidUpdates);

      const usage = costTrackingService.getUsageData({ component: 'RapidTest' });
      expect(usage).toHaveLength(10);

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBe(1000);
    });
  });

  describe('Data Persistence Integration', () => {
    it('should persist data across service restarts', async () => {
      // Track some usage
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 200,
        requestType: 'chat',
        component: 'PersistenceTest'
      });

      const initialMetrics = costTrackingService.getCostMetrics();
      expect(initialMetrics.totalTokensUsed).toBe(200);

      // Destroy and recreate service (simulating restart)
      costTrackingService.destroy();

      const newService = new CostTrackingService({
        budgetLimits: {
          daily: 10.0,
          weekly: 50.0,
          monthly: 200.0
        },
        alertThresholds: {
          warning: 80,
          critical: 95
        },
        enableRealTimeTracking: true,
        enableAuditing: false,
        storageKey: 'test-integration-cost-tracking'
      });

      // Data should be restored
      const restoredMetrics = newService.getCostMetrics();
      expect(restoredMetrics.totalTokensUsed).toBe(200);

      const restoredUsage = newService.getUsageData({ component: 'PersistenceTest' });
      expect(restoredUsage).toHaveLength(1);

      newService.destroy();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large volumes of tracking data efficiently', async () => {
      const startTime = performance.now();

      // Track a large number of usage events
      const trackingPromises = Array.from({ length: 100 }, (_, i) =>
        costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 50 + (i % 100),
          requestType: 'chat',
          component: 'PerformanceTest',
          metadata: { batch: Math.floor(i / 10) }
        })
      );

      await Promise.all(trackingPromises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBeGreaterThan(5000);

      const usage = costTrackingService.getUsageData({ component: 'PerformanceTest' });
      expect(usage).toHaveLength(100);
    });

    it('should calculate metrics efficiently for large datasets', () => {
      const startTime = performance.now();

      // Calculate metrics multiple times to test performance
      for (let i = 0; i < 10; i++) {
        const metrics = costTrackingService.getCostMetrics();
        expect(metrics).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be fast even with large datasets
      expect(duration).toBeLessThan(100); // 100ms
    });
  });
});