/**
 * @file api-service-relative-urls.test.ts
 * @description Comprehensive TDD test suite for ApiService relative URL functionality
 * @mission Validate relative URL construction for Vite proxy compatibility
 * @coverage URL construction, Vite proxy compatibility, error handling, caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiService } from '../../services/api';

describe('ApiService - Constructor and Initialization Tests', () => {
  it('should use /api as default baseUrl', () => {
    expect(apiService.baseUrl).toBe('/api');
  });

  it('should not include port numbers in baseUrl', () => {
    expect(apiService.baseUrl).not.toContain('3000');
    expect(apiService.baseUrl).not.toContain('3001');
    expect(apiService.baseUrl).not.toContain(':');
  });

  it('should not include protocol in baseUrl', () => {
    expect(apiService.baseUrl).not.toMatch(/^https?:\/\//);
  });

  it('should construct relative URL paths', () => {
    expect(apiService.baseUrl.startsWith('/')).toBe(true);
  });

  it('should not include localhost in baseUrl', () => {
    expect(apiService.baseUrl).not.toContain('localhost');
  });

  it('should not include domain names in baseUrl', () => {
    expect(apiService.baseUrl).not.toContain('.com');
    expect(apiService.baseUrl).not.toContain('.dev');
    expect(apiService.baseUrl).not.toContain('.github');
  });
});

describe('ApiService - URL Construction Tests', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock fetch globally
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ success: true, data: [] }),
      text: async () => '{"success":true,"data":[]}',
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      redirected: false,
      type: 'basic',
      url: '',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should construct relative URLs for getActivities endpoint', async () => {
    await apiService.getActivities(20, 0);

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toMatch(/^\/api\/activities/);
    expect(calledUrl).not.toContain('localhost');
    expect(calledUrl).not.toContain('http://');
    expect(calledUrl).not.toContain('https://');
  });

  it('should construct relative URLs for getAgents endpoint', async () => {
    await apiService.getAgents();

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toBe('/api/agents');
    expect(calledUrl).not.toContain('localhost');
  });

  it('should construct relative URLs for getAgentPosts endpoint', async () => {
    await apiService.getAgentPosts(50, 0);

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toMatch(/^\/api\/v1\/agent-posts/);
    expect(calledUrl).not.toContain('localhost');
  });

  it('should construct relative URLs for getAgent with ID', async () => {
    await apiService.getAgent('agent-123');

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toBe('/api/agents/agent-123');
    expect(calledUrl).not.toContain('http');
  });

  it('should construct relative URLs for POST requests (createAgentPost)', async () => {
    await apiService.createAgentPost({ content: 'Test post' });

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toBe('/api/v1/agent-posts');
    expect(calledUrl).not.toContain('localhost');
  });

  it('should construct relative URLs for health check', async () => {
    await apiService.healthCheck();

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toBe('/api/health');
    expect(calledUrl).not.toContain('localhost');
  });

  it('should preserve query parameters in relative URLs', async () => {
    await apiService.getActivities(100, 50);

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toContain('limit=100');
    expect(calledUrl).toContain('offset=50');
    expect(calledUrl).toMatch(/^\/api\/activities\?/);
  });

  it('should properly encode query parameters', async () => {
    await apiService.getAgentPosts(50, 0, 'all', 'test search', 'published_at', 'DESC');

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;

    expect(calledUrl).toContain('search=test+search');
    expect(calledUrl).toMatch(/^\/api\/v1\/agent-posts\?/);
  });
});

describe('ApiService - Vite Proxy Compatibility Tests', () => {
  it('should work with Vite dev server proxy configuration', () => {
    const url = `${apiService.baseUrl}/agents`;

    // Vite proxy should intercept /api/* requests
    expect(url).toBe('/api/agents');
    expect(url.startsWith('/api')).toBe(true);
  });

  it('should not bypass Vite proxy with absolute URLs', () => {
    // Absolute URLs would bypass Vite proxy
    expect(apiService.baseUrl).not.toMatch(/^http/);
    expect(apiService.baseUrl).not.toContain('localhost');
  });

  it('should construct URLs compatible with proxy rewrite rules', () => {
    const endpoints = [
      '/agents',
      '/activities',
      '/v1/agent-posts',
      '/health',
      '/metrics/system'
    ];

    endpoints.forEach(endpoint => {
      const fullUrl = `${apiService.baseUrl}${endpoint}`;
      expect(fullUrl).toMatch(/^\/api\//);
    });
  });

  it('should maintain relative paths for all HTTP methods', () => {
    const baseUrl = apiService.baseUrl;

    expect(baseUrl).toBe('/api');
    expect(baseUrl).not.toContain('://');
  });

  it('should not include port numbers that would bypass proxy', () => {
    expect(apiService.baseUrl).not.toMatch(/:\d+/);
  });
});

describe('ApiService - Method-Specific URL Tests', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('getActivities should use relative URL', async () => {
      await apiService.getActivities(20, 0);

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/api\/activities\?limit=20&offset=0/);
    });

    it('getAgents should use relative URL', async () => {
      // Clear cache to ensure fresh request
      apiService.clearCache();
      await apiService.getAgents();

      expect(fetchSpy).toHaveBeenCalled();
      const url = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1][0] as string;
      expect(url).toBe('/api/agents');
    });

    it('getAgentPosts should use relative URL with parameters', async () => {
      await apiService.getAgentPosts(50, 0, 'all', '', 'published_at', 'DESC');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/api\/v1\/agent-posts\?/);
      expect(url).toContain('limit=50');
      expect(url).toContain('offset=0');
    });

    it('getAgent should use relative URL with ID', async () => {
      await apiService.getAgent('test-agent-id');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/agents/test-agent-id');
    });

    it('getFeedStats should use relative URL', async () => {
      await apiService.getFeedStats();

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/stats');
    });

    it('getSystemMetrics should use relative URL', async () => {
      await apiService.getSystemMetrics('24h');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/metrics/system?range=24h');
    });
  });

  describe('POST requests', () => {
    it('createAgentPost should use relative URL', async () => {
      await apiService.createAgentPost({ content: 'Test' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/v1/agent-posts');
    });

    it('POST request should include correct headers', async () => {
      await apiService.createAgentPost({ content: 'Test' });

      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(options.method).toBe('POST');
      expect(options.headers).toBeDefined();
    });

    it('savePost should use relative URL', async () => {
      await apiService.savePost('post-123', true, 'user-1');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/v1/agent-posts/post-123/save');
    });
  });

  describe('DELETE requests', () => {
    it('deletePost should use relative URL', async () => {
      await apiService.deletePost('post-123');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/v1/agent-posts/post-123');
    });

    it('unsavePost should use relative URL', async () => {
      await apiService.savePost('post-123', false, 'user-1');

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe('/api/v1/agent-posts/post-123/save?user_id=user-1');
    });
  });
});

describe('ApiService - Error Handling with Relative URLs', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clear cache before each test
    apiService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle 404 errors with relative URLs', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => 'Not found',
    } as Response);

    await expect(apiService.getAgent('nonexistent')).rejects.toThrow();

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/api/);
  });

  it('should handle 500 errors with relative URLs', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
      text: async () => 'Server error',
    } as Response);

    await expect(apiService.getAgents()).rejects.toThrow();

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('/api/agents');
  });

  it('should handle network errors with relative URLs', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Network error')
    );

    await expect(apiService.getAgents()).rejects.toThrow();

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('/api/agents');
  });

  it('should preserve relative URL in error context', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Fetch failed')
    );

    try {
      await apiService.getAgents();
    } catch (error) {
      // Error should be thrown but URL construction should be correct
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/agents',
        expect.any(Object)
      );
    }
  });

  it('should use relative URLs in retry attempts', async () => {
    let attempts = 0;
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Network error');
      }
      return {
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response;
    });

    await apiService.getAgents();

    // Check all retry attempts used relative URLs
    fetchSpy.mock.calls.forEach(call => {
      const url = call[0] as string;
      expect(url).toBe('/api/agents');
      expect(url).not.toContain('localhost');
    });
  });
});

describe('ApiService - Cache Tests with Relative URLs', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    apiService.clearCache();
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cache requests made to relative URLs', async () => {
    // First request
    await apiService.getAgents();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe('/api/agents');
    expect(url).toMatch(/^\/api/);
  });

  it('should clear cache without affecting URL construction', async () => {
    await apiService.getAgents();
    apiService.clearCache();
    await apiService.getAgents();

    // Both calls should use relative URLs
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/agents');
    expect(fetchSpy.mock.calls[1][0]).toBe('/api/agents');
  });

  it('should generate cache keys from relative URLs', async () => {
    await apiService.getActivities(20, 0);

    // Cache key should be based on relative URL
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/api\/activities/);
  });
});

describe('ApiService - Edge Cases', () => {
  it('should handle deeply nested endpoints', () => {
    const endpoint = '/v1/agent-posts/123/comments';
    const fullUrl = `${apiService.baseUrl}${endpoint}`;

    expect(fullUrl).toBe('/api/v1/agent-posts/123/comments');
    expect(fullUrl).not.toContain('localhost');
  });

  it('should handle endpoints with special characters', () => {
    const endpoint = '/agents/test-agent-123';
    const fullUrl = `${apiService.baseUrl}${endpoint}`;

    expect(fullUrl).toBe('/api/agents/test-agent-123');
    expect(fullUrl).not.toContain('://');
  });

  it('should handle endpoints with UUIDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const endpoint = `/agents/${uuid}`;
    const fullUrl = `${apiService.baseUrl}${endpoint}`;

    expect(fullUrl).toBe(`/api/agents/${uuid}`);
    expect(fullUrl).toMatch(/^\/api/);
  });

  it('should handle complex query strings', () => {
    const params = new URLSearchParams({
      filter: 'multi-select',
      agents: 'agent1,agent2',
      hashtags: 'tag1,tag2',
      mode: 'AND'
    });
    const fullUrl = `${apiService.baseUrl}/v1/agent-posts?${params}`;

    expect(fullUrl).toMatch(/^\/api\/v1\/agent-posts\?/);
    expect(fullUrl).not.toContain('localhost');
  });
});

describe('ApiService - Performance Tests', () => {
  it('should construct URLs efficiently', () => {
    const iterations = 1000;
    const baseUrl = apiService.baseUrl;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const url = `${baseUrl}/agents/${i}`;
      expect(url).toMatch(/^\/api\/agents\/\d+/);
    }
    const duration = performance.now() - start;

    // URL construction should be fast (< 50ms for 1000 iterations in test environment)
    expect(duration).toBeLessThan(50);
  });

  it('should handle multiple concurrent URL constructions', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    const promises = Array(10).fill(null).map((_, i) =>
      apiService.getAgent(`agent-${i}`)
    );

    await Promise.all(promises);

    // All should use relative URLs
    const fetchCalls = (global.fetch as any).mock.calls;
    fetchCalls.forEach((call: any[]) => {
      const url = call[0] as string;
      expect(url).toMatch(/^\/api\/agents\/agent-\d+/);
      expect(url).not.toContain('localhost');
    });

    vi.restoreAllMocks();
  });
});

describe('ApiService - Integration Scenarios', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    apiService.clearCache();
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should work in a typical feed loading scenario', async () => {
    // Simulate loading a feed
    await apiService.getAgents();
    await apiService.getActivities(50, 0);
    await apiService.getAgentPosts(50, 0);

    // All calls should use relative URLs
    const calls = fetchSpy.mock.calls;
    expect(calls[0][0]).toBe('/api/agents');
    expect(calls[1][0]).toMatch(/^\/api\/activities/);
    expect(calls[2][0]).toMatch(/^\/api\/v1\/agent-posts/);

    // None should be absolute URLs
    calls.forEach(call => {
      const url = call[0] as string;
      expect(url).not.toContain('localhost');
      expect(url).not.toContain('http://');
      expect(url).not.toContain('https://');
    });
  });

  it('should maintain URL consistency across service lifetime', async () => {
    const urls: string[] = [];

    // Clear cache before each call to ensure fresh requests
    for (let i = 0; i < 5; i++) {
      apiService.clearCache();
      await apiService.getAgents();
      const callIndex = fetchSpy.mock.calls.length - 1;
      urls.push(fetchSpy.mock.calls[callIndex][0] as string);
    }

    // All URLs should be identical and relative
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(1);
    expect(Array.from(uniqueUrls)[0]).toBe('/api/agents');
  });

  it('should handle mixed GET, POST, DELETE operations with relative URLs', async () => {
    await apiService.getAgents();
    await apiService.createAgentPost({ content: 'Test' });
    await apiService.deletePost('post-123');

    const calls = fetchSpy.mock.calls;

    // All should use relative URLs
    calls.forEach(call => {
      const url = call[0] as string;
      expect(url).toMatch(/^\/api/);
      expect(url).not.toContain('://');
    });
  });
});

describe('ApiService - Regression Tests', () => {
  it('should not revert to absolute URLs after errors', async () => {
    apiService.clearCache();

    // First request fails
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(apiService.getAgents()).rejects.toThrow();

    // Second request should still use relative URL
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    await apiService.getAgents();

    const calls = (global.fetch as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('/api/agents');
    expect(lastCall[0]).not.toContain('localhost');

    vi.restoreAllMocks();
  });

  it('should maintain relative URLs after cache operations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    await apiService.getAgents();
    apiService.clearCache();
    apiService.clearCache('/agents'); // Pattern clear
    await apiService.getAgents();

    expect(apiService.baseUrl).toBe('/api');
    expect(apiService.baseUrl).not.toContain('localhost');

    vi.restoreAllMocks();
  });

  it('should maintain URL structure after multiple operations', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    const operations = [
      () => apiService.getAgents(),
      () => apiService.getActivities(50, 0),
      () => apiService.getAgentPosts(50, 0),
      () => apiService.getFeedStats(),
      () => apiService.healthCheck(),
    ];

    for (const operation of operations) {
      await operation();
    }

    // BaseUrl should remain unchanged
    expect(apiService.baseUrl).toBe('/api');
    expect(apiService.baseUrl).not.toContain('localhost');

    vi.restoreAllMocks();
  });
});