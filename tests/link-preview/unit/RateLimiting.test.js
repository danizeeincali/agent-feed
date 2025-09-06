/**
 * London School TDD Unit Tests for Rate Limiting
 * Focus: Rate limiting behavior, backoff strategies, and request coordination
 */

import { jest } from '@jest/globals';
import { LinkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { 
  TEST_CONSTANTS, 
  MOCK_RESPONSES, 
  createSwarmMock, 
  verifySwarmContract,
  measureExecutionTime 
} from '../setup.js';

describe('Rate Limiting - London School TDD', () => {
  let linkPreviewService;
  let mockRateLimiter;
  let mockBackoffService;
  let mockRequestQueue;

  beforeEach(() => {
    // Create swarm mocks for rate limiting dependencies
    mockRateLimiter = createSwarmMock('RateLimiter', {
      checkLimit: jest.fn(),
      incrementCounter: jest.fn(),
      getRemainingQuota: jest.fn(),
      reset: jest.fn()
    });

    mockBackoffService = createSwarmMock('BackoffService', {
      calculateDelay: jest.fn(),
      shouldRetry: jest.fn(),
      recordFailure: jest.fn(),
      recordSuccess: jest.fn()
    });

    mockRequestQueue = createSwarmMock('RequestQueue', {
      enqueue: jest.fn(),
      dequeue: jest.fn(),
      size: jest.fn(),
      clear: jest.fn()
    });

    global.fetch = jest.fn();
    
    linkPreviewService = new LinkPreviewService();
    linkPreviewService.rateLimiter = mockRateLimiter;
    linkPreviewService.backoffService = mockBackoffService;
    linkPreviewService.requestQueue = mockRequestQueue;
  });

  describe('Contract Definition: Rate Limiting Coordination', () => {
    it('should define correct collaboration contracts for rate limiting', () => {
      expect(mockRateLimiter._contractDefinition.methods).toContain('checkLimit');
      expect(mockRateLimiter._contractDefinition.methods).toContain('incrementCounter');
      expect(mockBackoffService._contractDefinition.methods).toContain('calculateDelay');
      expect(mockRequestQueue._contractDefinition.methods).toContain('enqueue');
    });
  });

  describe('Request Rate Limiting Behavior', () => {
    it('should check rate limits before making external requests', async () => {
      // Arrange - Rate limit check passes
      const url = TEST_CONSTANTS.GENERIC_URL;
      
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true, remainingQuota: 95 });
      mockRateLimiter.incrementCounter.mockResolvedValue(true);
      
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      // Mock database to simulate cache miss
      linkPreviewService.databaseService = createSwarmMock('DatabaseService', {
        getCachedLinkPreview: jest.fn().mockResolvedValue(null),
        cacheLinkPreview: jest.fn().mockResolvedValue(true)
      });

      // Act
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify rate limiting workflow
      verifySwarmContract(mockRateLimiter, [
        { method: 'checkLimit', calls: [[url]] },
        { method: 'incrementCounter', calls: [[url]] }
      ]);

      expect(global.fetch).toHaveBeenCalledWith(url, expect.any(Object));
      expect(result).toBeDefined();
    });

    it('should reject requests when rate limit is exceeded', async () => {
      // Arrange - Rate limit exceeded
      const url = TEST_CONSTANTS.GENERIC_URL;
      
      mockRateLimiter.checkLimit.mockResolvedValue({ 
        allowed: false, 
        remainingQuota: 0,
        resetTime: Date.now() + 60000 
      });

      // Act
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify rate limit enforcement
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(url);
      expect(mockRateLimiter.incrementCounter).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();

      // Should return rate limit error response
      expect(result).toMatchObject({
        title: expect.any(String),
        description: 'Unable to fetch preview',
        error: expect.stringMatching(/rate limit|quota/i)
      });
    });

    it('should implement per-domain rate limiting', async () => {
      // Arrange - Different domains with separate limits
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2', 
        'https://different.com/page1',
        'https://youtube.com/watch?v=123'
      ];

      mockRateLimiter.checkLimit
        .mockResolvedValueOnce({ allowed: true, remainingQuota: 49 }) // example.com - 1st
        .mockResolvedValueOnce({ allowed: true, remainingQuota: 48 }) // example.com - 2nd
        .mockResolvedValueOnce({ allowed: true, remainingQuota: 99 }) // different.com - 1st
        .mockResolvedValueOnce({ allowed: false, remainingQuota: 0 }); // youtube.com - blocked

      mockRateLimiter.incrementCounter.mockResolvedValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      linkPreviewService.databaseService = createSwarmMock('DatabaseService', {
        getCachedLinkPreview: jest.fn().mockResolvedValue(null),
        cacheLinkPreview: jest.fn().mockResolvedValue(true)
      });

      // Act
      const results = await Promise.all(
        urls.map(url => linkPreviewService.getLinkPreview(url))
      );

      // Assert - Verify per-domain limiting
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(4);
      
      // First 3 should succeed, last should be rate limited
      expect(results[0]).not.toHaveProperty('error');
      expect(results[1]).not.toHaveProperty('error');
      expect(results[2]).not.toHaveProperty('error');
      expect(results[3]).toMatchObject({
        error: expect.stringMatching(/rate limit|quota/i)
      });
    });
  });

  describe('Exponential Backoff and Retry Logic', () => {
    it('should implement exponential backoff for failed requests', async () => {
      // Arrange - Request failure sequence
      const url = TEST_CONSTANTS.GENERIC_URL;
      const attempt = 1;
      
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true, remainingQuota: 50 });
      mockRateLimiter.incrementCounter.mockResolvedValue(true);
      
      mockBackoffService.shouldRetry.mockReturnValue(true);
      mockBackoffService.calculateDelay.mockReturnValue(1000); // 1 second backoff
      mockBackoffService.recordFailure.mockReturnValue(true);

      // First request fails
      global.fetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
          headers: { get: () => 'text/html' }
        });

      linkPreviewService.databaseService = createSwarmMock('DatabaseService', {
        getCachedLinkPreview: jest.fn().mockResolvedValue(null),
        cacheLinkPreview: jest.fn().mockResolvedValue(true)
      });

      // Mock retry mechanism
      const originalGetLinkPreview = linkPreviewService.getLinkPreview.bind(linkPreviewService);
      linkPreviewService.getLinkPreview = jest.fn().mockImplementation(async (url, retryCount = 0) => {
        try {
          return await originalGetLinkPreview(url);
        } catch (error) {
          if (mockBackoffService.shouldRetry(retryCount)) {
            mockBackoffService.recordFailure(url);
            const delay = mockBackoffService.calculateDelay(retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
            return linkPreviewService.getLinkPreview(url, retryCount + 1);
          }
          throw error;
        }
      });

      // Act
      const { result, executionTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(url)
      );

      // Assert - Verify backoff behavior
      expect(mockBackoffService.shouldRetry).toHaveBeenCalled();
      expect(mockBackoffService.calculateDelay).toHaveBeenCalledWith(0);
      expect(mockBackoffService.recordFailure).toHaveBeenCalledWith(url);
      expect(executionTime).toBeGreaterThan(1000); // Should include backoff delay
    });

    it('should give up after maximum retry attempts', async () => {
      // Arrange - Persistent failure scenario
      const url = TEST_CONSTANTS.GENERIC_URL;
      const maxRetries = 3;
      
      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true, remainingQuota: 50 });
      mockBackoffService.shouldRetry
        .mockReturnValueOnce(true)  // Retry 1
        .mockReturnValueOnce(true)  // Retry 2
        .mockReturnValueOnce(true)  // Retry 3
        .mockReturnValueOnce(false); // Give up
      
      mockBackoffService.calculateDelay
        .mockReturnValueOnce(1000)  // 1s
        .mockReturnValueOnce(2000)  // 2s
        .mockReturnValueOnce(4000); // 4s

      global.fetch.mockRejectedValue(new Error('Persistent network error'));

      // Act
      const result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify retry limit enforcement
      expect(mockBackoffService.shouldRetry).toHaveBeenCalledTimes(4);
      expect(result).toMatchObject({
        error: expect.stringContaining('network error')
      });
    });
  });

  describe('Request Queuing and Throttling', () => {
    it('should queue requests when rate limits are approached', async () => {
      // Arrange - Near rate limit scenario
      const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/page${i}`);
      
      mockRateLimiter.checkLimit
        .mockResolvedValueOnce({ allowed: true, remainingQuota: 2 })
        .mockResolvedValueOnce({ allowed: true, remainingQuota: 1 })
        .mockResolvedValueOnce({ allowed: false, remainingQuota: 0, queuePosition: 1 })
        .mockResolvedValueOnce({ allowed: false, remainingQuota: 0, queuePosition: 2 })
        .mockResolvedValueOnce({ allowed: false, remainingQuota: 0, queuePosition: 3 });

      mockRequestQueue.enqueue.mockImplementation((request) => {
        return Promise.resolve({ queued: true, position: request.queuePosition });
      });

      mockRequestQueue.size.mockReturnValue(3);

      // Act
      const promises = urls.map(url => linkPreviewService.getLinkPreview(url));
      const results = await Promise.allSettled(promises);

      // Assert - Verify queueing behavior
      expect(mockRequestQueue.enqueue).toHaveBeenCalledTimes(3); // Last 3 requests queued
      expect(mockRequestQueue.size).toHaveBeenCalled();
      
      // First 2 should succeed immediately, others should be queued
      expect(results.slice(0, 2).every(r => r.status === 'fulfilled')).toBe(true);
    });

    it('should process queued requests when quota becomes available', async () => {
      // Arrange - Queue processing simulation
      const queuedUrls = ['https://example.com/queued1', 'https://example.com/queued2'];
      
      mockRequestQueue.dequeue
        .mockResolvedValueOnce({ url: queuedUrls[0], timestamp: Date.now() })
        .mockResolvedValueOnce({ url: queuedUrls[1], timestamp: Date.now() })
        .mockResolvedValueOnce(null); // Queue empty

      mockRateLimiter.checkLimit.mockResolvedValue({ allowed: true, remainingQuota: 10 });
      mockRateLimiter.getRemainingQuota.mockResolvedValue(10);

      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      // Mock queue processor
      const processQueue = async () => {
        const processed = [];
        let request;
        while ((request = await mockRequestQueue.dequeue()) !== null) {
          const result = await linkPreviewService.fetchLinkPreview(request.url);
          processed.push({ url: request.url, result });
        }
        return processed;
      };

      // Act
      const processed = await processQueue();

      // Assert - Verify queue processing
      expect(mockRequestQueue.dequeue).toHaveBeenCalledTimes(3); // 2 items + empty check
      expect(processed).toHaveLength(2);
      processed.forEach(({ url, result }) => {
        expect(queuedUrls).toContain(url);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Platform-Specific Rate Limiting', () => {
    it('should apply stricter limits for social media platforms', async () => {
      // Arrange - Different platforms with different limits
      const platformUrls = [
        { url: 'https://linkedin.com/posts/user_post', platform: 'linkedin', limit: 10 },
        { url: 'https://twitter.com/user/status/123', platform: 'twitter', limit: 5 },
        { url: 'https://example.com/page', platform: 'generic', limit: 100 }
      ];

      platformUrls.forEach(({ url, platform, limit }, index) => {
        mockRateLimiter.checkLimit.mockResolvedValueOnce({
          allowed: true,
          remainingQuota: limit - 1,
          platform,
          limit
        });
      });

      mockRateLimiter.incrementCounter.mockResolvedValue(true);

      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      linkPreviewService.databaseService = createSwarmMock('DatabaseService', {
        getCachedLinkPreview: jest.fn().mockResolvedValue(null),
        cacheLinkPreview: jest.fn().mockResolvedValue(true)
      });

      // Act
      const results = await Promise.all(
        platformUrls.map(({ url }) => linkPreviewService.getLinkPreview(url))
      );

      // Assert - Verify platform-specific limiting
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(3);
      
      platformUrls.forEach(({ url, platform }, index) => {
        expect(mockRateLimiter.checkLimit).toHaveBeenNthCalledWith(index + 1, url);
      });

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
      });
    });
  });

  describe('Rate Limiting Recovery and Health', () => {
    it('should reset rate limits on quota renewal', async () => {
      // Arrange - Quota reset scenario
      const url = TEST_CONSTANTS.GENERIC_URL;
      const resetTime = Date.now() + 60000; // 1 minute from now
      
      // First check: quota exhausted
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remainingQuota: 0,
        resetTime
      });

      // Simulate time advancement and quota reset
      mockRateLimiter.reset.mockResolvedValue({ 
        success: true, 
        newQuota: 100,
        resetTime: Date.now() + 3600000 // Next reset in 1 hour
      });

      // After reset: quota available
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: true,
        remainingQuota: 99
      });

      // Act - Simulate quota reset and retry
      let result = await linkPreviewService.getLinkPreview(url);
      
      // Trigger quota reset
      await mockRateLimiter.reset();
      
      // Retry request
      mockRateLimiter.incrementCounter.mockResolvedValue(true);
      global.fetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(MOCK_RESPONSES.GENERIC_HTML),
        headers: { get: () => 'text/html' }
      });

      linkPreviewService.databaseService = createSwarmMock('DatabaseService', {
        getCachedLinkPreview: jest.fn().mockResolvedValue(null),
        cacheLinkPreview: jest.fn().mockResolvedValue(true)
      });

      result = await linkPreviewService.getLinkPreview(url);

      // Assert - Verify quota reset behavior
      expect(mockRateLimiter.reset).toHaveBeenCalled();
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(2);
      expect(result).not.toHaveProperty('error');
    });

    it('should monitor rate limiting health metrics', () => {
      // Arrange - Rate limiting metrics collection
      const metrics = {
        totalRequests: 100,
        rateLimitedRequests: 15,
        averageWaitTime: 2500,
        quotaUtilization: 0.75,
        resetFrequency: 'hourly'
      };

      mockRateLimiter.getRemainingQuota.mockResolvedValue(25);

      // Act - Collect metrics
      const healthMetrics = {
        rateLimitedPercentage: metrics.rateLimitedRequests / metrics.totalRequests,
        averageQuotaUtilization: metrics.quotaUtilization,
        systemHealth: metrics.rateLimitedPercentage < 0.2 ? 'healthy' : 'degraded'
      };

      // Assert - Verify health monitoring
      expect(healthMetrics.rateLimitedPercentage).toBe(0.15);
      expect(healthMetrics.systemHealth).toBe('healthy');
      expect(mockRateLimiter.getRemainingQuota).toBeDefined();
    });
  });
});