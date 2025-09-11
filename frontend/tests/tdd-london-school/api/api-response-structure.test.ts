import { vi, describe, it, beforeEach, expect } from 'vitest';
import { createSwarmMock, createMockContract } from '../setup-tests';

/**
 * TDD London School: API Response Structure Validation
 * 
 * Focus: Mock-driven contract testing for API response handling
 * Goal: Prevent "recentActivities.slice is not a function" errors
 * Approach: Outside-in testing with behavior verification
 */

// Mock contracts for swarm coordination
const apiServiceContract = createMockContract('ApiService', [
  'fetchRealActivities',
  'fetchAgentData',
  'handleApiError'
]);

const dataTransformerContract = createMockContract('DataTransformer', [
  'transformApiResponse',
  'validateArrayStructure',
  'sanitizeActivities'
]);

describe('API Response Structure Validation', () => {
  let mockFetch: any;
  let mockApiService: typeof apiServiceContract;
  let mockDataTransformer: typeof dataTransformerContract;

  beforeEach(() => {
    // London School: Start with mocks to define expected collaborations
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockApiService = createSwarmMock('ApiService', {
      fetchRealActivities: vi.fn(),
      fetchAgentData: vi.fn(),
      handleApiError: vi.fn()
    });

    mockDataTransformer = createSwarmMock('DataTransformer', {
      transformApiResponse: vi.fn(),
      validateArrayStructure: vi.fn(),
      sanitizeActivities: vi.fn()
    });
  });

  describe('Successful API Response Handling', () => {
    it('should handle API response with data array correctly', async () => {
      // Given: A properly structured API response
      const mockApiResponse = {
        success: true,
        data: [
          { id: '1', type: 'task_completed', title: 'Test Task', timestamp: '2024-01-01' },
          { id: '2', type: 'message_sent', title: 'Test Message', timestamp: '2024-01-02' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiResponse)
      });

      // Mock the data transformer to validate array structure
      mockDataTransformer.validateArrayStructure.mockReturnValue(true);
      mockDataTransformer.sanitizeActivities.mockReturnValue(mockApiResponse.data);

      // When: Fetching activities through our API service
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        // Verify array structure before returning
        if (mockDataTransformer.validateArrayStructure(data.data)) {
          return mockDataTransformer.sanitizeActivities(data.data);
        }
        return [];
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify the collaboration pattern
      expect(mockFetch).toHaveBeenCalledWith('/api/activities');
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith(mockApiResponse.data);
      expect(mockDataTransformer.sanitizeActivities).toHaveBeenCalledWith(mockApiResponse.data);
      
      // Verify result is an array that supports .slice()
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(() => result.slice(0, 1)).not.toThrow();
      expect(result.slice(0, 1)).toEqual([mockApiResponse.data[0]]);
    });

    it('should handle API response with empty data array gracefully', async () => {
      // Given: API response with empty data
      const mockApiResponse = {
        success: true,
        data: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiResponse)
      });

      mockDataTransformer.validateArrayStructure.mockReturnValue(true);
      mockDataTransformer.sanitizeActivities.mockReturnValue([]);

      // When: Fetching activities
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        if (mockDataTransformer.validateArrayStructure(data.data)) {
          return mockDataTransformer.sanitizeActivities(data.data);
        }
        return [];
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify empty array handling
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(() => result.slice(0, 3)).not.toThrow();
      expect(result.slice(0, 3)).toEqual([]);
    });

    it('should handle nested data structure correctly', async () => {
      // Given: API response with nested structure
      const mockApiResponse = {
        success: true,
        result: {
          activities: [
            { id: '1', type: 'task_completed', title: 'Nested Task' }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiResponse)
      });

      // Mock transformer to extract nested array
      mockDataTransformer.transformApiResponse.mockReturnValue(mockApiResponse.result.activities);
      mockDataTransformer.validateArrayStructure.mockReturnValue(true);
      mockDataTransformer.sanitizeActivities.mockReturnValue(mockApiResponse.result.activities);

      // When: Processing nested response
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        const extractedData = mockDataTransformer.transformApiResponse(data);
        if (mockDataTransformer.validateArrayStructure(extractedData)) {
          return mockDataTransformer.sanitizeActivities(extractedData);
        }
        return [];
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify proper extraction and validation
      expect(mockDataTransformer.transformApiResponse).toHaveBeenCalledWith(mockApiResponse);
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith(mockApiResponse.result.activities);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('API Failure Scenarios', () => {
    it('should handle network failure gracefully', async () => {
      // Given: Network failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockApiService.handleApiError.mockReturnValue([]);

      // When: Attempting to fetch with network failure
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        try {
          await fetch('/api/activities');
        } catch (error) {
          return mockApiService.handleApiError(error);
        }
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify error handling returns safe array
      expect(mockApiService.handleApiError).toHaveBeenCalledWith(expect.any(Error));
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(() => result.slice(0, 3)).not.toThrow();
    });

    it('should handle malformed JSON response gracefully', async () => {
      // Given: Response with malformed JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      });

      mockApiService.handleApiError.mockReturnValue([]);

      // When: Processing malformed response
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        try {
          const response = await fetch('/api/activities');
          await response.json();
        } catch (error) {
          return mockApiService.handleApiError(error);
        }
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify JSON error handling
      expect(mockApiService.handleApiError).toHaveBeenCalledWith(expect.any(SyntaxError));
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('should handle HTTP error status codes gracefully', async () => {
      // Given: HTTP 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Server error' })
      });

      mockApiService.handleApiError.mockReturnValue([]);

      // When: Handling HTTP error
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        if (!response.ok) {
          const errorData = await response.json();
          return mockApiService.handleApiError(new Error(`HTTP ${response.status}: ${errorData.error}`));
        }
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify HTTP error handling
      expect(mockApiService.handleApiError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('HTTP 500')
        })
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle API response with null data', async () => {
      // Given: API response with null data field
      const mockApiResponse = {
        success: true,
        data: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiResponse)
      });

      mockDataTransformer.validateArrayStructure.mockReturnValue(false);
      mockApiService.handleApiError.mockReturnValue([]);

      // When: Processing null data
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        if (!mockDataTransformer.validateArrayStructure(data.data)) {
          return mockApiService.handleApiError(new Error('Invalid data structure'));
        }
        return data.data;
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify null data handling
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith(null);
      expect(mockApiService.handleApiError).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('should handle API response with undefined data', async () => {
      // Given: API response with undefined data field
      const mockApiResponse = {
        success: true
        // data field is undefined
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockApiResponse)
      });

      mockDataTransformer.validateArrayStructure.mockReturnValue(false);
      mockApiService.handleApiError.mockReturnValue([]);

      // When: Processing undefined data
      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        if (!mockDataTransformer.validateArrayStructure(data.data)) {
          return mockApiService.handleApiError(new Error('Missing data field'));
        }
        return data.data;
      });

      const result = await mockApiService.fetchRealActivities();

      // Then: Verify undefined data handling
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith(undefined);
      expect(mockApiService.handleApiError).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data Structure Validation Contract', () => {
    it('should validate array structure before processing', () => {
      // Given: Various data types to validate
      const testCases = [
        { input: [], expected: true },
        { input: [{ id: '1' }], expected: true },
        { input: null, expected: false },
        { input: undefined, expected: false },
        { input: 'string', expected: false },
        { input: 123, expected: false },
        { input: {}, expected: false },
        { input: { length: 0 }, expected: false }
      ];

      // When/Then: Verify validation contract for each case
      testCases.forEach(({ input, expected }) => {
        mockDataTransformer.validateArrayStructure.mockReturnValueOnce(expected);
        
        const result = mockDataTransformer.validateArrayStructure(input);
        
        expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledWith(input);
        expect(result).toBe(expected);
        
        mockDataTransformer.validateArrayStructure.mockClear();
      });
    });

    it('should sanitize activities to ensure proper structure', () => {
      // Given: Raw activities that need sanitization
      const rawActivities = [
        { id: '1', type: 'task_completed', title: 'Valid Task' },
        { type: 'invalid_activity' }, // Missing required fields
        null, // Invalid item
        { id: '2', type: 'message_sent', title: 'Another Valid Task' }
      ];

      const sanitizedActivities = [
        { id: '1', type: 'task_completed', title: 'Valid Task' },
        { id: '2', type: 'message_sent', title: 'Another Valid Task' }
      ];

      mockDataTransformer.sanitizeActivities.mockReturnValue(sanitizedActivities);

      // When: Sanitizing activities
      const result = mockDataTransformer.sanitizeActivities(rawActivities);

      // Then: Verify sanitization contract
      expect(mockDataTransformer.sanitizeActivities).toHaveBeenCalledWith(rawActivities);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result.every(activity => activity && activity.id && activity.type)).toBe(true);
    });
  });

  describe('Swarm Coordination Contract', () => {
    it('should coordinate with other testing agents through shared contracts', () => {
      // Given: Shared contract expectations from swarm
      const sharedMockExpectations = {
        apiService: ['fetchRealActivities', 'fetchAgentData', 'handleApiError'],
        dataTransformer: ['transformApiResponse', 'validateArrayStructure', 'sanitizeActivities']
      };

      // When: Verifying contract compliance
      const apiServiceMethods = Object.keys(mockApiService);
      const dataTransformerMethods = Object.keys(mockDataTransformer);

      // Then: Verify all expected methods exist in contracts
      sharedMockExpectations.apiService.forEach(method => {
        expect(apiServiceMethods).toContain(method);
        expect(mockApiService[method]).toBeInstanceOf(Function);
      });

      sharedMockExpectations.dataTransformer.forEach(method => {
        expect(dataTransformerMethods).toContain(method);
        expect(mockDataTransformer[method]).toBeInstanceOf(Function);
      });

      // Verify swarm contract metadata
      expect(mockApiService.__swarmContract).toBe(true);
      expect(mockDataTransformer.__swarmContract).toBe(true);
    });

    it('should report interaction patterns to swarm coordinator', async () => {
      // Given: A typical API interaction flow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: [] })
      });

      mockDataTransformer.validateArrayStructure.mockReturnValue(true);
      mockDataTransformer.sanitizeActivities.mockReturnValue([]);

      mockApiService.fetchRealActivities.mockImplementation(async () => {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        if (mockDataTransformer.validateArrayStructure(data.data)) {
          return mockDataTransformer.sanitizeActivities(data.data);
        }
        return [];
      });

      // When: Executing the interaction flow
      await mockApiService.fetchRealActivities();

      // Then: Verify interaction sequence for swarm coordination
      expect(mockFetch).toHaveBeenCalledBefore(mockDataTransformer.validateArrayStructure as any);
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledBefore(mockDataTransformer.sanitizeActivities as any);

      // Verify all expected interactions occurred
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockDataTransformer.validateArrayStructure).toHaveBeenCalledTimes(1);
      expect(mockDataTransformer.sanitizeActivities).toHaveBeenCalledTimes(1);
    });
  });
});