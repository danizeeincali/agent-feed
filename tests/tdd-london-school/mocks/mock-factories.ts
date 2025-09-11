/**
 * TDD London School Mock Factories
 * Provides consistent mock objects for testing external dependencies
 * Follows London School approach of mocking collaborators
 */

import { jest } from '@jest/globals';

// API Response Mock Factory
export class ApiResponseMockFactory {
  static createSuccessResponse<T>(data: T) {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({
        success: true,
        data
      }),
      headers: new Headers({
        'content-type': 'application/json'
      })
    } as Response;
  }

  static createErrorResponse(status: number, error: string) {
    return {
      ok: false,
      status,
      statusText: status === 404 ? 'Not Found' : 'Error',
      json: jest.fn().mockResolvedValue({
        success: false,
        error
      }),
      headers: new Headers({
        'content-type': 'application/json'
      })
    } as Response;
  }

  static createNetworkError() {
    return Promise.reject(new Error('Network error'));
  }
}

// Agent Data Mock Factory
export class AgentDataMockFactory {
  static createMinimalAgent(overrides = {}) {
    return {
      id: 'test-agent-minimal',
      name: 'Minimal Test Agent',
      status: 'active' as const,
      usage_count: 0,
      ...overrides
    };
  }

  static createCompleteAgent(overrides = {}) {
    return {
      id: 'test-agent-complete',
      name: 'Complete Test Agent',
      display_name: 'Complete Test Agent Display',
      description: 'A fully featured test agent',
      status: 'active' as const,
      capabilities: ['testing', 'mocking', 'verification'],
      performance_metrics: {
        success_rate: 92.5,
        average_response_time: 280,
        uptime_percentage: 98.1,
        total_tokens_used: 18500,
        error_count: 1
      },
      health_status: {
        connection_status: 'connected' as const,
        cpu_usage: 38.7,
        memory_usage: 55.2,
        response_time: 265,
        error_count_24h: 0,
        active_tasks: 4
      },
      usage_count: 189,
      last_used: '2024-09-10T12:00:00Z',
      created_at: '2024-01-15T08:00:00Z',
      version: '1.0.0',
      tags: ['test', 'london-school'],
      ...overrides
    };
  }

  static createHighPerformanceAgent(overrides = {}) {
    return this.createCompleteAgent({
      performance_metrics: {
        success_rate: 97.8,
        average_response_time: 150,
        uptime_percentage: 99.9,
        total_tokens_used: 25000,
        error_count: 0
      },
      usage_count: 500,
      ...overrides
    });
  }

  static createLowPerformanceAgent(overrides = {}) {
    return this.createCompleteAgent({
      performance_metrics: {
        success_rate: 65.2,
        average_response_time: 800,
        uptime_percentage: 85.5,
        total_tokens_used: 5000,
        error_count: 15
      },
      health_status: {
        connection_status: 'connected' as const,
        cpu_usage: 85.5,
        memory_usage: 92.1,
        response_time: 950,
        error_count_24h: 8,
        active_tasks: 1
      },
      usage_count: 45,
      status: 'busy' as const,
      ...overrides
    });
  }

  static createAgentWithMissingMetrics(overrides = {}) {
    return {
      id: 'test-agent-missing-metrics',
      name: 'Agent Missing Metrics',
      status: 'active' as const,
      usage_count: 100,
      // Missing performance_metrics and health_status
      ...overrides
    };
  }

  static createAgentWithInvalidData(overrides = {}) {
    return {
      id: 'test-agent-invalid',
      name: 'Invalid Data Agent',
      status: 'active' as const,
      performance_metrics: {
        success_rate: 150, // Invalid: > 100
        average_response_time: -50, // Invalid: < 0
        uptime_percentage: 200, // Invalid: > 100
        error_count: 'invalid' // Invalid: not a number
      },
      health_status: {
        connection_status: 'invalid-status', // Invalid enum
        cpu_usage: -25, // Invalid: < 0
        memory_usage: 150, // Invalid: > 100
        response_time: 'slow' // Invalid: not a number
      },
      usage_count: -10, // Invalid: < 0
      ...overrides
    };
  }
}

// Mock Fetch Factory
export class FetchMockFactory {
  static createMockFetch() {
    return jest.fn() as jest.MockedFunction<typeof fetch>;
  }

  static setupSuccessfulAgentFetch(mockFetch: jest.MockedFunction<typeof fetch>, agentData: any) {
    const response = ApiResponseMockFactory.createSuccessResponse(agentData);
    mockFetch.mockResolvedValue(response);
    return mockFetch;
  }

  static setupFailedAgentFetch(mockFetch: jest.MockedFunction<typeof fetch>, status: number, error: string) {
    const response = ApiResponseMockFactory.createErrorResponse(status, error);
    mockFetch.mockResolvedValue(response);
    return mockFetch;
  }

  static setupNetworkError(mockFetch: jest.MockedFunction<typeof fetch>) {
    mockFetch.mockRejectedValue(new Error('Network error'));
    return mockFetch;
  }
}

// React Router Mock Factory
export class RouterMockFactory {
  static createMockParams(agentId: string = 'test-agent') {
    return { agentId };
  }

  static createMockNavigate() {
    return jest.fn();
  }

  static setupRouterMocks(agentId?: string) {
    const mockNavigate = this.createMockNavigate();
    const mockParams = this.createMockParams(agentId);

    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => mockParams,
      useNavigate: () => mockNavigate
    }));

    return { mockNavigate, mockParams };
  }
}

// Test Data Validator Mock Factory
export class ValidatorMockFactory {
  static createMockValidator(isValid: boolean = true, errors: string[] = []) {
    return jest.fn().mockReturnValue({
      isValid,
      errors
    });
  }

  static createAlwaysValidValidator() {
    return this.createMockValidator(true, []);
  }

  static createAlwaysInvalidValidator(errors: string[] = ['Mock validation error']) {
    return this.createMockValidator(false, errors);
  }
}

// Performance Metrics Mock Factory
export class PerformanceMetricsMockFactory {
  static createOptimalMetrics(overrides = {}) {
    return {
      success_rate: 98.5,
      average_response_time: 120,
      uptime_percentage: 99.8,
      total_tokens_used: 50000,
      error_count: 0,
      ...overrides
    };
  }

  static createPoorMetrics(overrides = {}) {
    return {
      success_rate: 45.2,
      average_response_time: 2500,
      uptime_percentage: 78.3,
      total_tokens_used: 1200,
      error_count: 25,
      ...overrides
    };
  }

  static createZeroMetrics(overrides = {}) {
    return {
      success_rate: 0,
      average_response_time: 0,
      uptime_percentage: 0,
      total_tokens_used: 0,
      error_count: 0,
      ...overrides
    };
  }
}

// Health Status Mock Factory
export class HealthStatusMockFactory {
  static createHealthyStatus(overrides = {}) {
    return {
      connection_status: 'connected' as const,
      cpu_usage: 25.5,
      memory_usage: 45.2,
      response_time: 180,
      error_count_24h: 0,
      active_tasks: 3,
      ...overrides
    };
  }

  static createUnhealthyStatus(overrides = {}) {
    return {
      connection_status: 'disconnected' as const,
      cpu_usage: 95.8,
      memory_usage: 98.5,
      response_time: 5000,
      error_count_24h: 12,
      active_tasks: 0,
      ...overrides
    };
  }

  static createConnectingStatus(overrides = {}) {
    return {
      connection_status: 'connecting' as const,
      cpu_usage: 60.0,
      memory_usage: 70.0,
      response_time: 1000,
      error_count_24h: 2,
      active_tasks: 1,
      ...overrides
    };
  }
}

// Math.random Mock Factory
export class RandomMockFactory {
  static createDetectionMock() {
    let callCount = 0;
    const mockRandom = jest.fn(() => {
      callCount++;
      console.warn(`Math.random() called! Call #${callCount}`);
      return 0.5;
    });

    return {
      mockRandom,
      getCallCount: () => callCount,
      resetCallCount: () => { callCount = 0; }
    };
  }

  static createThrowingMock() {
    return jest.fn(() => {
      throw new Error('Math.random() should not be called in data transformers');
    });
  }

  static setupRandomDetection() {
    const originalRandom = Math.random;
    const detectionMock = this.createDetectionMock();
    
    Math.random = detectionMock.mockRandom;
    
    return {
      ...detectionMock,
      restore: () => { Math.random = originalRandom; }
    };
  }
}

// Mock State Factory for Component Testing
export class ComponentStateMockFactory {
  static createLoadingState() {
    return {
      loading: true,
      error: null,
      agent: null
    };
  }

  static createLoadedState(agent: any) {
    return {
      loading: false,
      error: null,
      agent
    };
  }

  static createErrorState(error: string) {
    return {
      loading: false,
      error,
      agent: null
    };
  }
}

// Export all factories as a collection
export const MockFactories = {
  ApiResponse: ApiResponseMockFactory,
  AgentData: AgentDataMockFactory,
  Fetch: FetchMockFactory,
  Router: RouterMockFactory,
  Validator: ValidatorMockFactory,
  PerformanceMetrics: PerformanceMetricsMockFactory,
  HealthStatus: HealthStatusMockFactory,
  Random: RandomMockFactory,
  ComponentState: ComponentStateMockFactory
};

export default MockFactories;
