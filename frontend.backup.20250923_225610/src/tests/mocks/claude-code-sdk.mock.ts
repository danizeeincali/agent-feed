/**
 * Enhanced Mock Implementation for Claude Code SDK Testing
 * Provides configurable responses, error scenarios, and cost tracking
 */

export interface MockAPIResponse {
  success: boolean;
  responses?: Array<{ content: string; type?: string }>;
  error?: string;
  details?: string;
  timestamp?: string;
  claudeCode?: boolean;
  toolsEnabled?: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  costEstimate?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class MockClaudeCodeAPI {
  private responses: Map<string, MockAPIResponse> = new Map();
  private errors: Map<string, Error> = new Map();
  private delays: Map<string, number> = new Map();
  private callCounts: Map<string, number> = new Map();

  constructor() {
    this.reset();
    this.initializeCostTracking();
  }

  private costTracker = {
    totalTokens: 0,
    totalCost: 0,
    sessionCosts: new Map<string, number>(),
    modelUsage: new Map<string, { tokens: number; cost: number }>()
  };

  /**
   * Reset all mock configurations to defaults
   */
  reset(): void {
    this.responses.clear();
    this.errors.clear();
    this.delays.clear();
    this.callCounts.clear();

    // Default successful response
    this.setResponse({
      success: true,
      responses: [{ content: 'Mock response from Avi', type: 'assistant' }],
      timestamp: new Date().toISOString(),
      claudeCode: true,
      toolsEnabled: true,
      usage: {
        prompt_tokens: 50,
        completion_tokens: 30,
        total_tokens: 80
      },
      model: 'claude-3-5-sonnet-20241022',
      costEstimate: 0.0024,
      sessionId: 'mock-session-default'
    });
  }

  /**
   * Set mock response for API calls
   */
  setResponse(response: MockAPIResponse, endpoint: string = 'streaming-chat'): void {
    this.responses.set(endpoint, response);
    this.errors.delete(endpoint);
  }

  /**
   * Set mock error for API calls
   */
  setError(error: Error, endpoint: string = 'streaming-chat'): void {
    this.errors.set(endpoint, error);
    this.responses.delete(endpoint);
  }

  /**
   * Set artificial delay for API calls
   */
  setDelay(delay: number, endpoint: string = 'streaming-chat'): void {
    this.delays.set(endpoint, delay);
  }

  /**
   * Get call count for specific endpoint
   */
  getCallCount(endpoint: string = 'streaming-chat'): number {
    return this.callCounts.get(endpoint) || 0;
  }

  /**
   * Mock fetch implementation
   */
  async mockFetch(url: string, options?: RequestInit): Promise<Response> {
    const endpoint = this.extractEndpoint(url);

    // Increment call count
    this.callCounts.set(endpoint, (this.callCounts.get(endpoint) || 0) + 1);

    // Apply artificial delay if configured
    const delay = this.delays.get(endpoint);
    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Check for configured error
    const error = this.errors.get(endpoint);
    if (error) {
      throw error;
    }

    // Return configured response
    const response = this.responses.get(endpoint);
    if (response) {
      // Track cost if usage data is present
      if (response.usage && response.model) {
        this.trackCost(response.usage.total_tokens, response.model, response.sessionId);
      }

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 500,
        statusText: response.success ? 'OK' : 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default fallback
    return new Response(JSON.stringify({
      success: false,
      error: 'No mock configured for endpoint: ' + endpoint
    }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Extract endpoint name from URL
   */
  private extractEndpoint(url: string): string {
    if (url.includes('streaming-chat')) return 'streaming-chat';
    if (url.includes('health')) return 'health';
    if (url.includes('session')) return 'session';
    if (url.includes('background-task')) return 'background-task';
    if (url.includes('status')) return 'status';
    if (url.includes('metrics')) return 'metrics';
    if (url.includes('cost-analytics')) return 'cost-analytics';
    return 'unknown';
  }

  /**
   * Initialize cost tracking functionality
   */
  private initializeCostTracking(): void {
    this.costTracker = {
      totalTokens: 0,
      totalCost: 0,
      sessionCosts: new Map(),
      modelUsage: new Map()
    };
  }

  /**
   * Track cost for token usage
   */
  private trackCost(tokens: number, model: string, sessionId?: string): void {
    const costRates = {
      'claude-3-5-sonnet-20241022': 0.003,
      'claude-3-haiku-20240307': 0.00025,
      'claude-3-opus-20240229': 0.015,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.001
    };

    const rate = costRates[model as keyof typeof costRates] || 0.003;
    const cost = (tokens / 1000) * rate;

    this.costTracker.totalTokens += tokens;
    this.costTracker.totalCost += cost;

    if (sessionId) {
      const sessionCost = this.costTracker.sessionCosts.get(sessionId) || 0;
      this.costTracker.sessionCosts.set(sessionId, sessionCost + cost);
    }

    const modelUsage = this.costTracker.modelUsage.get(model) || { tokens: 0, cost: 0 };
    modelUsage.tokens += tokens;
    modelUsage.cost += cost;
    this.costTracker.modelUsage.set(model, modelUsage);
  }

  /**
   * Get current cost tracking data
   */
  getCostTrackingData() {
    return {
      totalTokens: this.costTracker.totalTokens,
      totalCost: this.costTracker.totalCost,
      sessionCosts: Object.fromEntries(this.costTracker.sessionCosts),
      modelUsage: Object.fromEntries(this.costTracker.modelUsage),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset cost tracking data
   */
  resetCostTracking(): void {
    this.initializeCostTracking();
  }

  /**
   * Preset scenarios for common test cases
   */
  scenarios = {
    /**
     * Successful text message scenario
     */
    successfulTextMessage: () => {
      this.setResponse({
        success: true,
        responses: [
          {
            content: 'I understand your request. Let me help you with that.',
            type: 'assistant'
          }
        ],
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true
      });
    },

    /**
     * Successful image processing scenario
     */
    successfulImageProcessing: () => {
      this.setResponse({
        success: true,
        responses: [
          {
            content: 'I can see the image you uploaded. It appears to be a screenshot showing a code editor with some JavaScript functions.',
            type: 'assistant'
          }
        ],
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true
      });
    },

    /**
     * Network error scenario
     */
    networkError: () => {
      this.setError(new Error('Network request failed'));
    },

    /**
     * API server error scenario
     */
    serverError: () => {
      this.setResponse({
        success: false,
        error: 'Claude Code processing failed. Please try again.',
        details: 'Internal server error occurred'
      });
    },

    /**
     * Slow response scenario
     */
    slowResponse: (delay: number = 3000) => {
      this.setDelay(delay);
      this.setResponse({
        success: true,
        responses: [
          {
            content: 'This response took a while to process.',
            type: 'assistant'
          }
        ]
      });
    },

    /**
     * Authentication error scenario
     */
    authenticationError: () => {
      this.setResponse({
        success: false,
        error: 'Authentication failed',
        details: 'API key is invalid or expired'
      });
    },

    /**
     * Rate limiting scenario
     */
    rateLimitError: () => {
      this.setResponse({
        success: false,
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please try again later.'
      });
    },

    /**
     * Tool access denied scenario
     */
    toolAccessDenied: () => {
      this.setResponse({
        success: false,
        error: 'Tool access denied',
        details: 'Requested tools are not available in current context'
      });
    },

    /**
     * Malformed request scenario
     */
    malformedRequest: () => {
      this.setResponse({
        success: false,
        error: 'Invalid request format',
        details: 'Message parameter is required and must be a string'
      });
    },

    /**
     * Multi-response scenario (for complex tasks)
     */
    multipleResponses: () => {
      this.setResponse({
        success: true,
        responses: [
          {
            content: 'I\'ll help you with that task. Let me break it down into steps.',
            type: 'assistant'
          },
          {
            content: 'First, I\'ll analyze the current code structure.',
            type: 'assistant'
          },
          {
            content: 'Based on my analysis, here are my recommendations...',
            type: 'assistant'
          }
        ],
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true
      });
    },

    /**
     * Health check success scenario
     */
    healthCheckSuccess: () => {
      this.setResponse({
        success: true,
        healthy: true,
        timestamp: new Date().toISOString(),
        toolsEnabled: true,
        claudeCode: true
      } as any, 'health');
    },

    /**
     * Health check failure scenario
     */
    healthCheckFailure: () => {
      this.setResponse({
        success: false,
        healthy: false,
        error: 'Health check failed',
        details: 'Claude Code SDK is not responding'
      } as any, 'health');
    },

    /**
     * Cost analytics data scenario
     */
    costAnalyticsData: () => {
      this.setResponse({
        success: true,
        costMetrics: {
          totalTokensUsed: this.costTracker.totalTokens,
          totalCost: this.costTracker.totalCost,
          costByProvider: {
            claude: this.costTracker.totalCost * 0.8,
            openai: this.costTracker.totalCost * 0.2
          },
          costByModel: Object.fromEntries(this.costTracker.modelUsage),
          averageCostPerToken: this.costTracker.totalTokens > 0 ? this.costTracker.totalCost / this.costTracker.totalTokens : 0,
          tokensPerMinute: 125.5,
          costTrend: 'increasing',
          lastUpdated: new Date(),
          dailyCost: this.costTracker.totalCost * 0.1,
          weeklyCost: this.costTracker.totalCost * 0.5,
          monthlyCost: this.costTracker.totalCost
        },
        budgetStatus: {
          dailyBudget: 10.0,
          weeklyBudget: 50.0,
          monthlyBudget: 200.0,
          dailyUsed: this.costTracker.totalCost * 0.1,
          weeklyUsed: this.costTracker.totalCost * 0.5,
          monthlyUsed: this.costTracker.totalCost,
          dailyPercentage: (this.costTracker.totalCost * 0.1 / 10.0) * 100,
          weeklyPercentage: (this.costTracker.totalCost * 0.5 / 50.0) * 100,
          monthlyPercentage: (this.costTracker.totalCost / 200.0) * 100,
          alertLevel: 'safe',
          projectedDailyCost: this.costTracker.totalCost * 0.2,
          projectedMonthlyCost: this.costTracker.totalCost * 2
        },
        usageData: [],
        timestamp: new Date().toISOString()
      } as any, 'cost-analytics');
    },

    /**
     * High cost usage scenario for testing alerts
     */
    highCostUsage: () => {
      this.setResponse({
        success: true,
        responses: [{
          content: 'This is a large response that uses many tokens for testing high cost scenarios. '.repeat(50),
          type: 'assistant'
        }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 2500,
          total_tokens: 3500
        },
        model: 'claude-3-opus-20240229',
        costEstimate: 0.2625, // High cost for testing
        sessionId: 'high-cost-session',
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true
      });
    },

    /**
     * Concurrent session scenario
     */
    concurrentSessions: (sessionCount: number = 5) => {
      const sessions = Array.from({ length: sessionCount }, (_, i) => ({
        sessionId: `concurrent-session-${i + 1}`,
        usage: {
          prompt_tokens: 100 + (i * 20),
          completion_tokens: 150 + (i * 30),
          total_tokens: 250 + (i * 50)
        }
      }));

      this.setResponse({
        success: true,
        responses: [{
          content: 'Response for concurrent session testing',
          type: 'assistant'
        }],
        usage: sessions[0].usage,
        model: 'claude-3-5-sonnet-20241022',
        costEstimate: (sessions[0].usage.total_tokens / 1000) * 0.003,
        sessionId: sessions[0].sessionId,
        timestamp: new Date().toISOString(),
        claudeCode: true,
        toolsEnabled: true,
        metadata: { allSessions: sessions }
      });
    },

    /**
     * Performance testing scenario with metrics
     */
    performanceMetrics: () => {
      this.setResponse({
        success: true,
        metrics: {
          totalRequests: this.getCallCount('streaming-chat'),
          averageResponseTime: 350 + Math.random() * 200,
          errorRate: 0.02,
          tokensProcessed: this.costTracker.totalTokens,
          cost: this.costTracker.totalCost,
          uptime: 3600,
          memoryUsage: {
            used: 512 + Math.random() * 200,
            total: 1024
          },
          cpuUsage: 25 + Math.random() * 30
        },
        timestamp: new Date().toISOString()
      } as any, 'metrics');
    }
  };
}

// Global mock instance
export const mockClaudeCodeAPI = new MockClaudeCodeAPI();

/**
 * Jest mock factory for fetch
 */
export const createFetchMock = () => {
  return jest.fn().mockImplementation((url: string, options?: RequestInit) => {
    return mockClaudeCodeAPI.mockFetch(url, options);
  });
};

/**
 * Test helper for setting up mock scenarios
 */
export const setupMockScenario = (scenarioName: keyof typeof mockClaudeCodeAPI.scenarios) => {
  mockClaudeCodeAPI.reset();
  mockClaudeCodeAPI.scenarios[scenarioName]();
};

/**
 * Test helper for verifying API calls
 */
export const verifyAPICalls = (expectedCalls: Array<{
  endpoint?: string;
  method?: string;
  body?: any;
}>) => {
  expectedCalls.forEach(call => {
    const endpoint = call.endpoint || 'streaming-chat';
    const callCount = mockClaudeCodeAPI.getCallCount(endpoint);
    expect(callCount).toBeGreaterThan(0);
  });
};

/**
 * Mock WebSocket for streaming functionality
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    // Echo the message back for testing
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }));
    }, 10);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

// Make MockWebSocket available globally for tests
(global as any).MockWebSocket = MockWebSocket;