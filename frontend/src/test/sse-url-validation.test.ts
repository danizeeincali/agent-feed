/**
 * SSE URL Fix Validation Test
 * Tests that SSE connections use the correct versioned API endpoints
 */

import { apiClient } from '../config/api';

describe('SSE URL Fix Validation', () => {
  const testInstanceId = 'test-instance-123';

  beforeEach(() => {
    // Reset API client to default configuration
    apiClient.updateConfig({
      baseUrl: 'http://localhost:3000',
      version: 'v1'
    });
  });

  describe('API Configuration', () => {
    it('should use versioned API endpoints', () => {
      const config = apiClient.getConfig();
      
      expect(config.endpoints.claude.instances).toBe('/api/v1/claude/instances');
      expect(config.endpoints.claude.terminalStream(testInstanceId))
        .toBe(`/api/v1/claude/instances/${testInstanceId}/terminal/stream`);
      expect(config.endpoints.claude.terminalInput(testInstanceId))
        .toBe(`/api/v1/claude/instances/${testInstanceId}/terminal/input`);
    });

    it('should have fallback endpoints for backward compatibility', () => {
      const config = apiClient.getConfig();
      
      expect(config.fallbackEndpoints?.claude.instances).toBe('/api/claude/instances');
      expect(config.fallbackEndpoints?.claude.terminalStream(testInstanceId))
        .toBe(`/api/claude/instances/${testInstanceId}/terminal/stream`);
      expect(config.fallbackEndpoints?.claude.terminalInput(testInstanceId))
        .toBe(`/api/claude/instances/${testInstanceId}/terminal/input`);
    });
  });

  describe('API Client Methods', () => {
    it('should generate correct URLs for versioned endpoints', () => {
      const instancesURL = apiClient.getURL(apiClient.getClaudeInstancesEndpoint());
      const streamURL = apiClient.getURL(apiClient.getTerminalStreamEndpoint(testInstanceId));
      const inputURL = apiClient.getURL(apiClient.getTerminalInputEndpoint(testInstanceId));

      expect(instancesURL).toBe('http://localhost:3000/api/v1/claude/instances');
      expect(streamURL).toBe(`http://localhost:3000/api/v1/claude/instances/${testInstanceId}/terminal/stream`);
      expect(inputURL).toBe(`http://localhost:3000/api/v1/claude/instances/${testInstanceId}/terminal/input`);
    });

    it('should support custom base URL configuration', () => {
      apiClient.updateConfig({
        baseUrl: 'https://api.example.com'
      });

      const instancesURL = apiClient.getURL(apiClient.getClaudeInstancesEndpoint());
      expect(instancesURL).toBe('https://api.example.com/api/v1/claude/instances');
    });
  });

  describe('Endpoint Migration', () => {
    it('should map legacy endpoints to versioned endpoints', () => {
      const config = apiClient.getConfig();
      
      // Old endpoint format
      const legacyStreamEndpoint = `/api/claude/instances/${testInstanceId}/terminal/stream`;
      const legacyInputEndpoint = `/api/claude/instances/${testInstanceId}/terminal/input`;
      
      // New endpoint format
      const versionedStreamEndpoint = config.endpoints.claude.terminalStream(testInstanceId);
      const versionedInputEndpoint = config.endpoints.claude.terminalInput(testInstanceId);
      
      expect(versionedStreamEndpoint).toBe(`/api/v1/claude/instances/${testInstanceId}/terminal/stream`);
      expect(versionedInputEndpoint).toBe(`/api/v1/claude/instances/${testInstanceId}/terminal/input`);
      
      // Ensure they are different from legacy
      expect(versionedStreamEndpoint).not.toBe(legacyStreamEndpoint);
      expect(versionedInputEndpoint).not.toBe(legacyInputEndpoint);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing instance ID gracefully', () => {
      expect(() => {
        apiClient.getTerminalStreamEndpoint('');
      }).not.toThrow();
      
      const result = apiClient.getTerminalStreamEndpoint('');
      expect(result).toBe('/api/v1/claude/instances//terminal/stream');
    });

    it('should handle special characters in instance ID', () => {
      const specialInstanceId = 'test-instance-123_special-chars';
      const endpoint = apiClient.getTerminalStreamEndpoint(specialInstanceId);
      
      expect(endpoint).toBe(`/api/v1/claude/instances/${specialInstanceId}/terminal/stream`);
    });
  });
});

/**
 * Mock fetch for testing fallback behavior
 */
global.fetch = jest.fn();

describe('SSE Connection Fallback', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should attempt fallback on primary endpoint failure', async () => {
    // Mock primary endpoint failure
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)
      // Mock successful fallback
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      } as Response);

    const endpoint = apiClient.getClaudeInstancesEndpoint();
    const response = await apiClient.fetchWithFallback(endpoint);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.ok).toBe(true);
  });

  it('should not attempt fallback when primary endpoint succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    } as Response);

    const endpoint = apiClient.getClaudeInstancesEndpoint();
    const response = await apiClient.fetchWithFallback(endpoint);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
  });

  it('should throw error when both primary and fallback fail', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Primary failed'))
      .mockRejectedValueOnce(new Error('Fallback failed'));

    const endpoint = apiClient.getClaudeInstancesEndpoint();
    
    await expect(apiClient.fetchWithFallback(endpoint)).rejects.toThrow('Fallback failed');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

export {};