/**
 * HTTP Command Unit Tests
 * Tests HTTP POST requests, response handling, and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { DEFAULT_TEST_CONFIG } from '../config/sse-migration-test-config';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

interface HTTPCommandOptions {
  baseUrl: string;
  timeout: number;
  retries: number;
}

class HTTPCommandService {
  private options: HTTPCommandOptions;
  private abortController?: AbortController;

  constructor(options: HTTPCommandOptions) {
    this.options = options;
  }

  async sendCommand(endpoint: string, data: any): Promise<any> {
    const url = `${this.options.baseUrl}${endpoint}`;
    this.abortController = new AbortController();

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: this.abortController.signal,
    };

    return this.executeWithRetry(url, requestOptions);
  }

  private async executeWithRetry(url: string, options: RequestInit, attempt = 1): Promise<any> {
    try {
      const response = await this.fetchWithTimeout(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      if (attempt < this.options.retries && this.shouldRetry(error as Error)) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return this.executeWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), this.options.timeout);
    });

    const fetchPromise = fetch(url, options);
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  private shouldRetry(error: Error): boolean {
    // Retry on network errors and 5xx server errors
    return error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

describe('HTTP Command Unit Tests', () => {
  let httpService: HTTPCommandService;

  beforeEach(() => {
    httpService = new HTTPCommandService(DEFAULT_TEST_CONFIG.http);
    vi.clearAllMocks();
  });

  afterEach(() => {
    httpService.cancel();
  });

  describe('Basic Command Sending', () => {
    it('should send POST request with correct headers and body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ result: 'success' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const testData = { command: 'test', args: ['arg1', 'arg2'] };
      const result = await httpService.sendCommand('/execute', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_TEST_CONFIG.http.baseUrl}/execute`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData),
        })
      );

      expect(result).toEqual({
        success: true,
        data: { result: 'success' },
        status: 200,
      });
    });

    it('should handle different endpoint paths correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpService.sendCommand('/commands/terminal', { cmd: 'ls' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_TEST_CONFIG.http.baseUrl}/commands/terminal`,
        expect.any(Object)
      );

      await httpService.sendCommand('/claude/chat', { message: 'hello' });
      expect(mockFetch).toHaveBeenCalledWith(
        `${DEFAULT_TEST_CONFIG.http.baseUrl}/claude/chat`,
        expect.any(Object)
      );
    });

    it('should handle different data types in request body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // String data
      await httpService.sendCommand('/test', 'string data');
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toBe('string data');

      // Number data
      await httpService.sendCommand('/test', 42);
      expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toBe(42);

      // Complex object
      const complexData = {
        nested: { array: [1, 2, 3] },
        bool: true,
        null: null,
      };
      await httpService.sendCommand('/test', complexData);
      expect(JSON.parse(mockFetch.mock.calls[2][1].body)).toEqual(complexData);
    });
  });

  describe('Response Handling', () => {
    it('should parse JSON responses correctly', async () => {
      const responseData = {
        status: 'success',
        data: { id: 123, message: 'Command executed' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(responseData),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpService.sendCommand('/test', {});
      
      expect(result.data).toEqual(responseData);
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should handle different HTTP status codes', async () => {
      const testCases = [
        { status: 200, ok: true, expected: true },
        { status: 201, ok: true, expected: true },
        { status: 204, ok: true, expected: true },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          ok: testCase.ok,
          status: testCase.status,
          json: vi.fn().mockResolvedValue({ status: 'ok' }),
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await httpService.sendCommand('/test', {});
        expect(result.success).toBe(testCase.expected);
        expect(result.status).toBe(testCase.status);
      }
    });

    it('should handle empty responses gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        json: vi.fn().mockResolvedValue(null),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await httpService.sendCommand('/test', {});
      expect(result.data).toBeNull();
      expect(result.success).toBe(true);
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(httpService.sendCommand('/test', {}))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(httpService.sendCommand('/test', {}))
        .rejects.toThrow('Network error');
    });

    it('should handle HTTP error status codes', async () => {
      const errorCases = [
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 404, statusText: 'Not Found' },
        { status: 500, statusText: 'Internal Server Error' },
      ];

      for (const errorCase of errorCases) {
        const mockResponse = {
          ok: false,
          status: errorCase.status,
          statusText: errorCase.statusText,
        };
        mockFetch.mockResolvedValueOnce(mockResponse);

        await expect(httpService.sendCommand('/test', {}))
          .rejects.toThrow(`HTTP ${errorCase.status}: ${errorCase.statusText}`);
      }
    });

    it('should handle request timeout', async () => {
      // Mock a slow response that exceeds timeout
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(resolve, DEFAULT_TEST_CONFIG.http.timeout + 1000)
        )
      );

      await expect(httpService.sendCommand('/test', {}))
        .rejects.toThrow('Request timeout');
    });

    it('should handle request cancellation', async () => {
      mockFetch.mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new Error('Request was cancelled'));
          });
          setTimeout(resolve, 1000); // Slow request
        });
      });

      const commandPromise = httpService.sendCommand('/test', {});
      
      // Cancel the request
      setTimeout(() => httpService.cancel(), 100);

      await expect(commandPromise).rejects.toThrow('Request was cancelled');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableErrors = [
        new Error('Request timeout'),
        new Error('Network error'),
        { ok: false, status: 500, statusText: 'Internal Server Error' },
        { ok: false, status: 502, statusText: 'Bad Gateway' },
        { ok: false, status: 503, statusText: 'Service Unavailable' },
      ];

      for (const error of retryableErrors) {
        mockFetch.mockClear();
        
        if (error instanceof Error) {
          mockFetch
            .mockRejectedValueOnce(error)
            .mockResolvedValue({
              ok: true,
              status: 200,
              json: vi.fn().mockResolvedValue({ success: true }),
            });
        } else {
          mockFetch
            .mockResolvedValueOnce(error)
            .mockResolvedValue({
              ok: true,
              status: 200,
              json: vi.fn().mockResolvedValue({ success: true }),
            });
        }

        const result = await httpService.sendCommand('/test', {});
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
        expect(result.success).toBe(true);
      }
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableErrors = [
        { ok: false, status: 400, statusText: 'Bad Request' },
        { ok: false, status: 401, statusText: 'Unauthorized' },
        { ok: false, status: 404, statusText: 'Not Found' },
      ];

      for (const error of nonRetryableErrors) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValue(error);

        await expect(httpService.sendCommand('/test', {}))
          .rejects.toThrow();
        
        expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
      }
    });

    it('should respect maximum retry count', async () => {
      const error = new Error('Request timeout');
      mockFetch.mockRejectedValue(error);

      await expect(httpService.sendCommand('/test', {}))
        .rejects.toThrow('Request timeout');

      expect(mockFetch).toHaveBeenCalledTimes(DEFAULT_TEST_CONFIG.http.retries);
    });

    it('should implement exponential backoff', async () => {
      const startTime = Date.now();
      const error = new Error('Request timeout');
      
      mockFetch.mockRejectedValue(error);

      await expect(httpService.sendCommand('/test', {}))
        .rejects.toThrow();

      const elapsed = Date.now() - startTime;
      
      // Should wait at least: 1s + 2s = 3s for 2 retries with exponential backoff
      const expectedMinTime = 1000 + 2000; // 3 seconds
      expect(elapsed).toBeGreaterThan(expectedMinTime - 100); // Allow small tolerance
    });
  });

  describe('Performance Tests', () => {
    it('should complete successful requests within timeout', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const startTime = performance.now();
      await httpService.sendCommand('/test', {});
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(DEFAULT_TEST_CONFIG.http.timeout);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        httpService.sendCommand(`/test/${i}`, { id: i })
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentRequests);
      const elapsed = performance.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(elapsed).toBeLessThan(DEFAULT_TEST_CONFIG.http.timeout * 2); // Should be much faster than sequential
    });

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        data: 'x'.repeat(1024 * 1024), // 1MB payload
        metadata: { size: 1024 * 1024 },
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ received: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const startTime = performance.now();
      const result = await httpService.sendCommand('/upload', largePayload);
      const elapsed = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(5000); // Should handle large payload within 5 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined/null data gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      // Test undefined
      await httpService.sendCommand('/test', undefined);
      expect(mockFetch.mock.calls[0][1].body).toBe('null'); // JSON.stringify(undefined) = undefined, but fetch should handle it

      // Test null
      await httpService.sendCommand('/test', null);
      expect(mockFetch.mock.calls[1][1].body).toBe('null');
    });

    it('should handle circular JSON references', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      await expect(httpService.sendCommand('/test', circularObject))
        .rejects.toThrow(); // Should throw on JSON.stringify circular reference
    });

    it('should handle very long URLs', async () => {
      const longEndpoint = '/test/' + 'a'.repeat(2000);
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpService.sendCommand(longEndpoint, {});
      
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain(longEndpoint);
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        unicode: '🚀 Unicode test',
        html: '<script>alert("xss")</script>',
        quotes: 'He said "Hello"',
        backslash: 'C:\\path\\to\\file',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await httpService.sendCommand('/test', specialData);
      
      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sentBody).toEqual(specialData);
    });
  });
});