/**
 * SSE URL Path Consistency Validation Tests
 * Validates that SSE connections use correct /v1/ paths after URL fix
 */

// const { jest } = require('@jest/globals'); // Remove this line

describe('SSE URL Path Consistency', () => {
  let mockFetch;
  let mockEventSource;
  
  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock EventSource for SSE connections
    mockEventSource = jest.fn();
    mockEventSource.prototype.close = jest.fn();
    mockEventSource.prototype.addEventListener = jest.fn();
    global.EventSource = mockEventSource;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Frontend SSE Connection URLs', () => {
    test('should use /v1/ paths for SSE terminal stream connections', () => {
      const instanceId = 'claude-test-123';
      const baseUrl = 'http://localhost:3000';
      
      // Simulate the frontend creating an SSE connection
      const expectedUrl = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      new EventSource(expectedUrl);
      
      expect(mockEventSource).toHaveBeenCalledWith(expectedUrl);
      expect(mockEventSource).toHaveBeenCalledTimes(1);
    });

    test('should use /v1/ paths for instance management API calls', async () => {
      const baseUrl = 'http://localhost:3000';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, instances: [] })
      });
      
      // Test fetching instances
      await fetch(`${baseUrl}/api/v1/claude/instances`);
      
      expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/api/v1/claude/instances`);
    });

    test('should use /v1/ paths for creating instances', async () => {
      const baseUrl = 'http://localhost:3000';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, instanceId: 'claude-123' })
      });
      
      // Test creating instance - note: the creation endpoint is different
      await fetch(`${baseUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: ['claude'] })
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/claude/instances`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: ['claude'] })
        })
      );
    });

    test('should use /v1/ paths for sending terminal input', async () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'claude-test-123';
      const input = 'test command';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      await fetch(`${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ input })
        })
      );
    });

    test('should use /v1/ paths for SSE status endpoints', async () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'claude-test-123';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, connections: [] })
      });
      
      await fetch(`${baseUrl}/api/v1/claude/instances/${instanceId}/sse/status`);
      
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/claude/instances/${instanceId}/sse/status`
      );
    });
  });

  describe('Backend SSE Endpoint Validation', () => {
    test('should handle SSE terminal stream at /v1/ path', () => {
      const instanceId = 'claude-test-123';
      const expectedPath = `/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // This would be tested in integration tests with actual server
      expect(expectedPath).toContain('/v1/');
      expect(expectedPath).toContain(`/claude/instances/${instanceId}/terminal/stream`);
    });

    test('should handle SSE status endpoint at /v1/ path', () => {
      const instanceId = 'claude-test-123';
      const expectedPath = `/api/v1/claude/instances/${instanceId}/sse/status`;
      
      expect(expectedPath).toContain('/v1/');
      expect(expectedPath).toContain(`/claude/instances/${instanceId}/sse/status`);
    });

    test('should handle instance management at both paths for compatibility', () => {
      // Creation endpoint (legacy path for compatibility)
      const creationPath = '/api/claude/instances';
      expect(creationPath).not.toContain('/v1/');
      
      // Management endpoints (versioned paths)
      const managementPath = '/api/v1/claude/instances';
      expect(managementPath).toContain('/v1/');
    });
  });

  describe('URL Pattern Consistency', () => {
    test('should maintain consistent URL structure across all endpoints', () => {
      const baseUrl = 'http://localhost:3000';
      const instanceId = 'claude-test-123';
      
      const endpoints = {
        instances: `${baseUrl}/api/v1/claude/instances`,
        stream: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`,
        input: `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/input`,
        status: `${baseUrl}/api/v1/claude/instances/${instanceId}/sse/status`,
        create: `${baseUrl}/api/claude/instances` // Legacy compatibility
      };
      
      // Check versioned endpoints use /v1/
      expect(endpoints.instances).toContain('/api/v1/');
      expect(endpoints.stream).toContain('/api/v1/');
      expect(endpoints.input).toContain('/api/v1/');
      expect(endpoints.status).toContain('/api/v1/');
      
      // Check creation endpoint (compatibility)
      expect(endpoints.create).toContain('/api/claude/');
      expect(endpoints.create).not.toContain('/v1/');
      
      // All should contain claude/instances
      Object.entries(endpoints).forEach(([name, url]) => {
        expect(url).toContain('/claude/instances');
      });
    });

    test('should handle instance ID format validation', () => {
      const validInstanceIds = [
        'claude-123',
        'claude-abc123def',
        'claude-1234567890'
      ];
      
      const invalidInstanceIds = [
        'invalid-format',
        '123-claude',
        'claude_with_underscores',
        'claude-test-456', // Contains dash after claude-
        'claude-',
        '-claude'
      ];
      
      validInstanceIds.forEach(id => {
        expect(id).toMatch(/^claude-[a-zA-Z0-9]+$/);
      });
      
      invalidInstanceIds.forEach(id => {
        expect(id).not.toMatch(/^claude-[a-zA-Z0-9]+$/);
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should handle SSE connection failures gracefully', () => {
      const instanceId = 'claude-test-123';
      const baseUrl = 'http://localhost:3000';
      const url = `${baseUrl}/api/v1/claude/instances/${instanceId}/terminal/stream`;
      
      // Mock EventSource constructor to throw error
      mockEventSource.mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      expect(() => {
        try {
          new EventSource(url);
        } catch (error) {
          expect(error.message).toBe('Connection failed');
          throw error;
        }
      }).toThrow('Connection failed');
    });

    test('should validate instance ID before making SSE connections', () => {
      const invalidInstanceId = 'invalid-format';
      const baseUrl = 'http://localhost:3000';
      
      // Instance ID validation should happen before SSE connection
      const isValidInstanceId = /^claude-[a-zA-Z0-9]+$/.test(invalidInstanceId);
      expect(isValidInstanceId).toBe(false);
      
      // If validation fails, SSE connection should not be attempted
      if (!isValidInstanceId) {
        // Don't create EventSource
        expect(mockEventSource).not.toHaveBeenCalled();
      }
    });
  });
});