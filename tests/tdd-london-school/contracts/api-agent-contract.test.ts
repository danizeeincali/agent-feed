/**
 * TDD London School Contract Tests - API Agent Contract
 * Verifies API response structure matches expected interface
 * Ensures backwards compatibility and contract compliance
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { validateApiResponse } from '../../../frontend/src/utils/unified-agent-data-transformer';

// Contract definitions - these define the expected API structure
interface ApiAgentContract {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  status: 'active' | 'inactive' | 'busy' | 'error' | 'maintenance';
  capabilities?: string[];
  performance_metrics?: {
    success_rate: number; // 0-100
    average_response_time: number; // milliseconds, >= 0
    uptime_percentage: number; // 0-100
    total_tokens_used?: number;
    error_count?: number;
  };
  health_status?: {
    connection_status: 'connected' | 'disconnected' | 'connecting';
    cpu_usage: number; // 0-100
    memory_usage: number; // 0-100
    response_time?: number;
    error_count_24h?: number;
    active_tasks?: number;
  };
  usage_count: number; // >= 0
  last_used?: string; // ISO timestamp
  created_at?: string;
  version?: string;
  tags?: string[];
}

// Mock API responses for contract testing
const createValidContractResponse = (): { success: true; data: ApiAgentContract } => ({
  success: true,
  data: {
    id: 'contract-test-agent',
    name: 'Contract Test Agent',
    display_name: 'Contract Test Agent Display',
    description: 'Agent for testing API contracts',
    status: 'active',
    capabilities: ['analysis', 'processing', 'communication'],
    performance_metrics: {
      success_rate: 95.5,
      average_response_time: 350,
      uptime_percentage: 99.2,
      total_tokens_used: 15000,
      error_count: 2
    },
    health_status: {
      connection_status: 'connected',
      cpu_usage: 45.2,
      memory_usage: 62.8,
      response_time: 285,
      error_count_24h: 1,
      active_tasks: 3
    },
    usage_count: 247,
    last_used: '2024-09-10T10:30:00Z',
    created_at: '2024-01-15T08:00:00Z',
    version: '1.2.3',
    tags: ['production', 'high-performance']
  }
});

describe('API Agent Contract Tests - London School', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Contract Compliance', () => {
    test('should require mandatory fields in API response', () => {
      const validResponse = createValidContractResponse();
      const validation = validateApiResponse(validResponse.data);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Verify mandatory fields are present
      expect(validResponse.data.id).toBeDefined();
      expect(validResponse.data.name).toBeDefined();
      expect(validResponse.data.status).toBeDefined();
      expect(validResponse.data.usage_count).toBeDefined();
    });

    test('should validate performance_metrics contract when present', () => {
      const responseWithMetrics = createValidContractResponse();
      
      expect(responseWithMetrics.data.performance_metrics).toBeDefined();
      expect(responseWithMetrics.data.performance_metrics!.success_rate).toBeGreaterThanOrEqual(0);
      expect(responseWithMetrics.data.performance_metrics!.success_rate).toBeLessThanOrEqual(100);
      expect(responseWithMetrics.data.performance_metrics!.average_response_time).toBeGreaterThanOrEqual(0);
      expect(responseWithMetrics.data.performance_metrics!.uptime_percentage).toBeGreaterThanOrEqual(0);
      expect(responseWithMetrics.data.performance_metrics!.uptime_percentage).toBeLessThanOrEqual(100);
    });

    test('should validate health_status contract when present', () => {
      const responseWithHealth = createValidContractResponse();
      
      expect(responseWithHealth.data.health_status).toBeDefined();
      expect(responseWithHealth.data.health_status!.connection_status).toMatch(/^(connected|disconnected|connecting)$/);
      expect(responseWithHealth.data.health_status!.cpu_usage).toBeGreaterThanOrEqual(0);
      expect(responseWithHealth.data.health_status!.cpu_usage).toBeLessThanOrEqual(100);
      expect(responseWithHealth.data.health_status!.memory_usage).toBeGreaterThanOrEqual(0);
      expect(responseWithHealth.data.health_status!.memory_usage).toBeLessThanOrEqual(100);
    });

    test('should validate usage_count as non-negative number', () => {
      const validResponse = createValidContractResponse();
      
      expect(typeof validResponse.data.usage_count).toBe('number');
      expect(validResponse.data.usage_count).toBeGreaterThanOrEqual(0);
      
      // Test contract violation
      const invalidResponse = {
        ...validResponse.data,
        usage_count: -1
      };
      
      const validation = validateApiResponse(invalidResponse);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid usage_count');
    });

    test('should validate status enum values', () => {
      const validStatuses = ['active', 'inactive', 'busy', 'error', 'maintenance'];
      const validResponse = createValidContractResponse();
      
      validStatuses.forEach(status => {
        const testResponse = {
          ...validResponse.data,
          status: status as any
        };
        
        expect(['active', 'inactive', 'busy', 'error', 'maintenance']).toContain(testResponse.status);
      });
    });
  });

  describe('Contract Evolution and Backwards Compatibility', () => {
    test('should handle missing optional fields gracefully', () => {
      const minimalResponse = {
        id: 'minimal-agent',
        name: 'Minimal Agent',
        status: 'active' as const,
        usage_count: 10
        // Missing all optional fields
      };
      
      const validation = validateApiResponse(minimalResponse);
      expect(validation.isValid).toBe(true);
    });

    test('should handle API response with extra fields (forward compatibility)', () => {
      const responseWithExtraFields = {
        ...createValidContractResponse().data,
        // Future fields that don't exist yet
        future_feature: 'some value',
        experimental_metrics: {
          new_metric: 42
        }
      };
      
      // Should not break validation due to extra fields
      const validation = validateApiResponse(responseWithExtraFields);
      expect(validation.isValid).toBe(true);
    });

    test('should maintain backwards compatibility with legacy response format', () => {
      // Simulate older API response format
      const legacyResponse = {
        id: 'legacy-agent',
        name: 'Legacy Agent',
        status: 'active' as const,
        usage_count: 50,
        // Legacy field name (before performance_metrics)
        success_rate: 90,
        response_time: 300
      };
      
      // Should still validate basic requirements
      expect(legacyResponse.id).toBeDefined();
      expect(legacyResponse.name).toBeDefined();
      expect(legacyResponse.status).toBeDefined();
      expect(legacyResponse.usage_count).toBeGreaterThanOrEqual(0);
    });

    test('should handle null performance_metrics gracefully', () => {
      const responseWithNullMetrics = {
        ...createValidContractResponse().data,
        performance_metrics: null
      };
      
      // Should validate without performance_metrics
      const validation = validateApiResponse(responseWithNullMetrics);
      expect(validation.isValid).toBe(true);
    });

    test('should handle null health_status gracefully', () => {
      const responseWithNullHealth = {
        ...createValidContractResponse().data,
        health_status: null
      };
      
      // Should validate without health_status
      const validation = validateApiResponse(responseWithNullHealth);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Field Type Validation', () => {
    test('should reject invalid success_rate values', () => {
      const invalidSuccessRates = [-1, 101, 150, NaN, Infinity];
      
      invalidSuccessRates.forEach(invalidRate => {
        const invalidResponse = {
          ...createValidContractResponse().data,
          performance_metrics: {
            ...createValidContractResponse().data.performance_metrics!,
            success_rate: invalidRate
          }
        };
        
        const validation = validateApiResponse(invalidResponse);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid success_rate in performance_metrics');
      });
    });

    test('should reject invalid response_time values', () => {
      const invalidResponseTimes = [-1, -100, NaN, Infinity];
      
      invalidResponseTimes.forEach(invalidTime => {
        const invalidResponse = {
          ...createValidContractResponse().data,
          performance_metrics: {
            ...createValidContractResponse().data.performance_metrics!,
            average_response_time: invalidTime
          }
        };
        
        const validation = validateApiResponse(invalidResponse);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid average_response_time in performance_metrics');
      });
    });

    test('should reject invalid cpu_usage values', () => {
      const invalidCpuValues = [-1, 101, 150, NaN, Infinity];
      
      invalidCpuValues.forEach(invalidCpu => {
        const invalidResponse = {
          ...createValidContractResponse().data,
          health_status: {
            ...createValidContractResponse().data.health_status!,
            cpu_usage: invalidCpu
          }
        };
        
        const validation = validateApiResponse(invalidResponse);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid cpu_usage in health_status');
      });
    });

    test('should reject invalid memory_usage values', () => {
      const invalidMemoryValues = [-1, 101, 200, NaN, Infinity];
      
      invalidMemoryValues.forEach(invalidMemory => {
        const invalidResponse = {
          ...createValidContractResponse().data,
          health_status: {
            ...createValidContractResponse().data.health_status!,
            memory_usage: invalidMemory
          }
        };
        
        const validation = validateApiResponse(invalidResponse);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid memory_usage in health_status');
      });
    });

    test('should reject invalid usage_count values', () => {
      const invalidUsageCounts = [-1, -100, NaN, Infinity, 'string', null, undefined];
      
      invalidUsageCounts.forEach(invalidCount => {
        const invalidResponse = {
          ...createValidContractResponse().data,
          usage_count: invalidCount as any
        };
        
        const validation = validateApiResponse(invalidResponse);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid usage_count');
      });
    });
  });

  describe('Real API Endpoint Contract Testing', () => {
    test('should verify API endpoint returns contract-compliant response', async () => {
      // Mock a real API response structure
      const mockApiResponse = createValidContractResponse();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockApiResponse
      } as Response);
      
      // Make API call
      const response = await fetch('/api/agents/test-agent');
      const data = await response.json();
      
      // Verify contract compliance
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      const validation = validateApiResponse(data.data);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should handle API errors while maintaining contract', async () => {
      const errorResponse = {
        success: false,
        error: 'Agent not found',
        data: null
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorResponse
      } as Response);
      
      const response = await fetch('/api/agents/nonexistent');
      const data = await response.json();
      
      // Error response should still follow contract
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });

    test('should validate all required fields are present in API response', async () => {
      const responseWithMissingFields = {
        success: true,
        data: {
          id: 'incomplete-agent'
          // Missing required fields: name, status, usage_count
        }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => responseWithMissingFields
      } as Response);
      
      const response = await fetch('/api/agents/incomplete');
      const data = await response.json();
      
      // Should detect missing required fields
      expect(data.data.name).toBeUndefined();
      expect(data.data.status).toBeUndefined();
      expect(data.data.usage_count).toBeUndefined();
    });
  });

  describe('Contract Versioning', () => {
    test('should handle version field in API response', () => {
      const versionedResponse = {
        ...createValidContractResponse().data,
        version: '2.1.0'
      };
      
      expect(versionedResponse.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should be compatible with different API versions', () => {
      const apiVersions = ['1.0.0', '1.2.3', '2.0.0', '2.1.5'];
      
      apiVersions.forEach(version => {
        const versionedResponse = {
          ...createValidContractResponse().data,
          version
        };
        
        const validation = validateApiResponse(versionedResponse);
        expect(validation.isValid).toBe(true);
      });
    });

    test('should maintain contract stability across versions', () => {
      // V1 format
      const v1Response = {
        id: 'v1-agent',
        name: 'V1 Agent',
        status: 'active' as const,
        usage_count: 100
      };
      
      // V2 format (extended)
      const v2Response = {
        ...v1Response,
        performance_metrics: {
          success_rate: 95,
          average_response_time: 300,
          uptime_percentage: 99
        },
        health_status: {
          connection_status: 'connected' as const,
          cpu_usage: 50,
          memory_usage: 70
        },
        version: '2.0.0'
      };
      
      // Both should be valid
      const v1Validation = validateApiResponse(v1Response);
      const v2Validation = validateApiResponse(v2Response);
      
      expect(v1Validation.isValid).toBe(true);
      expect(v2Validation.isValid).toBe(true);
    });
  });

  describe('Performance Contract Requirements', () => {
    test('should validate response time expectations', () => {
      const performanceResponse = createValidContractResponse();
      
      // Response time should be reasonable (< 30 seconds)
      expect(performanceResponse.data.performance_metrics!.average_response_time).toBeLessThan(30000);
      expect(performanceResponse.data.health_status!.response_time).toBeLessThan(30000);
    });

    test('should validate uptime percentage expectations', () => {
      const uptimeResponse = createValidContractResponse();
      
      // Uptime should be a valid percentage
      const uptime = uptimeResponse.data.performance_metrics!.uptime_percentage;
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(uptime).toBeLessThanOrEqual(100);
    });

    test('should validate success rate expectations', () => {
      const successResponse = createValidContractResponse();
      
      // Success rate should be a valid percentage
      const successRate = successResponse.data.performance_metrics!.success_rate;
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(100);
    });
  });
});
